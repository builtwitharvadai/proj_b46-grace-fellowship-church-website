/**
 * Google Analytics 4 Integration and Event Tracking
 * 
 * Provides comprehensive GA4 integration with custom event tracking,
 * page view monitoring, conversion goal setup, and privacy compliance.
 * 
 * Features:
 * - GA4 initialization with gtag.js
 * - Custom event tracking with structured data
 * - Page view tracking with metadata
 * - Conversion goal tracking
 * - Privacy-compliant data collection
 * - Error handling and logging
 * - Offline event queuing
 * - Performance monitoring
 * 
 * @module analytics
 * @generated-from: task-id:TASK-013
 * @modifies: none
 * @dependencies: none
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  GA_MEASUREMENT_ID: 'G-XXXXXXXXXX', // Replace with actual GA4 measurement ID
  QUEUE_STORAGE_KEY: 'gfc_analytics_queue',
  MAX_QUEUE_SIZE: 50,
  QUEUE_FLUSH_INTERVAL: 30000, // 30 seconds
  EVENT_TIMEOUT: 5000,
  DEBUG_MODE: false,
  PRIVACY_MODE: true,
  ANONYMIZE_IP: true,
  COOKIE_FLAGS: 'SameSite=Strict; Secure',
});

const EVENT_CATEGORIES = Object.freeze({
  ENGAGEMENT: 'engagement',
  CONVERSION: 'conversion',
  NAVIGATION: 'navigation',
  FORM: 'form',
  MINISTRY: 'ministry',
  MEDIA: 'media',
  ERROR: 'error',
});

const CONVERSION_EVENTS = Object.freeze({
  NEWSLETTER_SIGNUP: 'newsletter_signup',
  CONTACT_FORM_SUBMIT: 'contact_form_submit',
  VOLUNTEER_SIGNUP: 'volunteer_signup',
  EVENT_REGISTRATION: 'event_registration',
  DONATION_INITIATED: 'donation_initiated',
});

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let analyticsState = {
  initialized: false,
  consentGiven: false,
  queue: [],
  flushTimer: null,
  isOnline: navigator.onLine,
  sessionId: null,
  pageLoadTime: Date.now(),
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates a unique session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

/**
 * Safely retrieves data from localStorage
 * @param {string} key - Storage key
 * @returns {any} Parsed data or null
 */
function getFromStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    log('error', 'Failed to read from localStorage', { key, error: error.message });
    return null;
  }
}

/**
 * Safely stores data in localStorage
 * @param {string} key - Storage key
 * @param {any} value - Data to store
 * @returns {boolean} Success status
 */
function setToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    log('error', 'Failed to write to localStorage', { key, error: error.message });
    return false;
  }
}

/**
 * Logs structured messages with context
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} context - Additional context data
 */
function log(level, message, context = {}) {
  if (!CONFIG.DEBUG_MODE && level === 'info') {
    return;
  }

  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    module: 'analytics',
    message,
    ...context,
  };

  const logMethod = console[level] || console.log;
  logMethod('[GFC Analytics]', message, context);
}

/**
 * Sanitizes event parameters for privacy compliance
 * @param {Object} params - Event parameters
 * @returns {Object} Sanitized parameters
 */
function sanitizeParams(params) {
  if (!params || typeof params !== 'object') {
    return {};
  }

  const sanitized = { ...params };

  // Remove potentially sensitive data
  const sensitiveKeys = ['email', 'phone', 'password', 'ssn', 'credit_card'];
  sensitiveKeys.forEach((key) => {
    if (key in sanitized) {
      delete sanitized[key];
    }
  });

  // Truncate long strings
  Object.keys(sanitized).forEach((key) => {
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 100) {
      sanitized[key] = sanitized[key].substring(0, 100) + '...';
    }
  });

  return sanitized;
}

/**
 * Checks if gtag is available
 * @returns {boolean} True if gtag is loaded
 */
function isGtagAvailable() {
  return typeof window.gtag === 'function';
}

// ============================================================================
// GTAG INITIALIZATION
// ============================================================================

/**
 * Loads Google Analytics gtag.js script
 * @returns {Promise<void>}
 */
function loadGtagScript() {
  return new Promise((resolve, reject) => {
    if (isGtagAvailable()) {
      log('info', 'gtag.js already loaded');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA_MEASUREMENT_ID}`;

    script.onload = () => {
      log('info', 'gtag.js script loaded successfully');
      resolve();
    };

    script.onerror = () => {
      const error = new Error('Failed to load gtag.js script');
      log('error', 'gtag.js script load failed', { error: error.message });
      reject(error);
    };

    document.head.appendChild(script);
  });
}

/**
 * Initializes gtag with configuration
 */
function initializeGtag() {
  if (!isGtagAvailable()) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  window.gtag('js', new Date());

  const config = {
    send_page_view: false, // Manual page view tracking
    cookie_flags: CONFIG.COOKIE_FLAGS,
  };

  if (CONFIG.ANONYMIZE_IP) {
    config.anonymize_ip = true;
  }

  if (CONFIG.PRIVACY_MODE) {
    config.allow_google_signals = false;
    config.allow_ad_personalization_signals = false;
  }

  window.gtag('config', CONFIG.GA_MEASUREMENT_ID, config);

  log('info', 'gtag initialized', { measurementId: CONFIG.GA_MEASUREMENT_ID });
}

// ============================================================================
// EVENT QUEUE MANAGEMENT
// ============================================================================

/**
 * Adds event to queue for offline processing
 * @param {string} eventName - Event name
 * @param {Object} eventParams - Event parameters
 */
function queueEvent(eventName, eventParams) {
  const event = {
    name: eventName,
    params: eventParams,
    timestamp: Date.now(),
    sessionId: analyticsState.sessionId,
  };

  analyticsState.queue.push(event);

  // Limit queue size
  if (analyticsState.queue.length > CONFIG.MAX_QUEUE_SIZE) {
    analyticsState.queue.shift();
    log('warn', 'Event queue size exceeded, oldest event removed');
  }

  // Persist queue
  setToStorage(CONFIG.QUEUE_STORAGE_KEY, analyticsState.queue);

  log('info', 'Event queued', { eventName, queueSize: analyticsState.queue.length });
}

/**
 * Flushes queued events when online
 */
function flushEventQueue() {
  if (!analyticsState.isOnline || !isGtagAvailable() || analyticsState.queue.length === 0) {
    return;
  }

  log('info', 'Flushing event queue', { queueSize: analyticsState.queue.length });

  const eventsToFlush = [...analyticsState.queue];
  analyticsState.queue = [];
  setToStorage(CONFIG.QUEUE_STORAGE_KEY, []);

  eventsToFlush.forEach((event) => {
    try {
      window.gtag('event', event.name, {
        ...event.params,
        queued: true,
        queue_delay: Date.now() - event.timestamp,
      });
    } catch (error) {
      log('error', 'Failed to flush queued event', {
        eventName: event.name,
        error: error.message,
      });
    }
  });

  log('info', 'Event queue flushed', { eventCount: eventsToFlush.length });
}

/**
 * Starts periodic queue flushing
 */
function startQueueFlushing() {
  if (analyticsState.flushTimer) {
    return;
  }

  analyticsState.flushTimer = setInterval(() => {
    flushEventQueue();
  }, CONFIG.QUEUE_FLUSH_INTERVAL);

  log('info', 'Queue flushing started', { interval: CONFIG.QUEUE_FLUSH_INTERVAL });
}

/**
 * Stops periodic queue flushing
 */
function stopQueueFlushing() {
  if (analyticsState.flushTimer) {
    clearInterval(analyticsState.flushTimer);
    analyticsState.flushTimer = null;
    log('info', 'Queue flushing stopped');
  }
}

// ============================================================================
// EVENT TRACKING
// ============================================================================

/**
 * Tracks a custom event
 * @param {string} eventName - Event name
 * @param {Object} eventParams - Event parameters
 * @returns {Promise<void>}
 */
async function trackEvent(eventName, eventParams = {}) {
  if (!analyticsState.initialized) {
    log('warn', 'Analytics not initialized, event queued', { eventName });
    queueEvent(eventName, eventParams);
    return;
  }

  if (!analyticsState.consentGiven) {
    log('info', 'Consent not given, event not tracked', { eventName });
    return;
  }

  const sanitizedParams = sanitizeParams(eventParams);
  const enrichedParams = {
    ...sanitizedParams,
    session_id: analyticsState.sessionId,
    timestamp: Date.now(),
  };

  if (!analyticsState.isOnline) {
    queueEvent(eventName, enrichedParams);
    return;
  }

  try {
    if (!isGtagAvailable()) {
      throw new Error('gtag not available');
    }

    window.gtag('event', eventName, enrichedParams);
    log('info', 'Event tracked', { eventName, params: enrichedParams });
  } catch (error) {
    log('error', 'Failed to track event', {
      eventName,
      error: error.message,
    });
    queueEvent(eventName, enrichedParams);
  }
}

/**
 * Tracks a page view
 * @param {Object} pageData - Page data
 * @returns {Promise<void>}
 */
async function trackPageView(pageData = {}) {
  const pageParams = {
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname,
    page_referrer: document.referrer,
    ...pageData,
  };

  await trackEvent('page_view', pageParams);
}

/**
 * Tracks a conversion event
 * @param {string} conversionType - Conversion type from CONVERSION_EVENTS
 * @param {Object} conversionData - Conversion data
 * @returns {Promise<void>}
 */
async function trackConversion(conversionType, conversionData = {}) {
  if (!Object.values(CONVERSION_EVENTS).includes(conversionType)) {
    log('warn', 'Invalid conversion type', { conversionType });
    return;
  }

  const conversionParams = {
    event_category: EVENT_CATEGORIES.CONVERSION,
    conversion_type: conversionType,
    ...conversionData,
  };

  await trackEvent(conversionType, conversionParams);
}

/**
 * Tracks form submission
 * @param {string} formName - Form name
 * @param {Object} formData - Form data (sanitized)
 * @returns {Promise<void>}
 */
async function trackFormSubmission(formName, formData = {}) {
  const formParams = {
    event_category: EVENT_CATEGORIES.FORM,
    form_name: formName,
    ...formData,
  };

  await trackEvent('form_submit', formParams);

  // Track as conversion if applicable
  if (formName === 'newsletter') {
    await trackConversion(CONVERSION_EVENTS.NEWSLETTER_SIGNUP, { form_name: formName });
  } else if (formName === 'contact') {
    await trackConversion(CONVERSION_EVENTS.CONTACT_FORM_SUBMIT, { form_name: formName });
  } else if (formName === 'volunteer') {
    await trackConversion(CONVERSION_EVENTS.VOLUNTEER_SIGNUP, { form_name: formName });
  }
}

/**
 * Tracks user engagement
 * @param {string} engagementType - Type of engagement
 * @param {Object} engagementData - Engagement data
 * @returns {Promise<void>}
 */
async function trackEngagement(engagementType, engagementData = {}) {
  const engagementParams = {
    event_category: EVENT_CATEGORIES.ENGAGEMENT,
    engagement_type: engagementType,
    ...engagementData,
  };

  await trackEvent('user_engagement', engagementParams);
}

/**
 * Tracks ministry page interaction
 * @param {string} ministryName - Ministry name
 * @param {string} action - Action performed
 * @param {Object} actionData - Action data
 * @returns {Promise<void>}
 */
async function trackMinistryInteraction(ministryName, action, actionData = {}) {
  const ministryParams = {
    event_category: EVENT_CATEGORIES.MINISTRY,
    ministry_name: ministryName,
    action,
    ...actionData,
  };

  await trackEvent('ministry_interaction', ministryParams);
}

/**
 * Tracks media interaction
 * @param {string} mediaType - Media type (video, audio, image)
 * @param {string} action - Action (play, pause, view)
 * @param {Object} mediaData - Media data
 * @returns {Promise<void>}
 */
async function trackMediaInteraction(mediaType, action, mediaData = {}) {
  const mediaParams = {
    event_category: EVENT_CATEGORIES.MEDIA,
    media_type: mediaType,
    action,
    ...mediaData,
  };

  await trackEvent('media_interaction', mediaParams);
}

/**
 * Tracks error occurrence
 * @param {string} errorType - Error type
 * @param {Object} errorData - Error data
 * @returns {Promise<void>}
 */
async function trackError(errorType, errorData = {}) {
  const errorParams = {
    event_category: EVENT_CATEGORIES.ERROR,
    error_type: errorType,
    ...errorData,
  };

  await trackEvent('error', errorParams);
}

// ============================================================================
// CONSENT MANAGEMENT
// ============================================================================

/**
 * Sets user consent for analytics
 * @param {boolean} consent - Consent status
 */
function setConsent(consent) {
  analyticsState.consentGiven = consent;

  if (isGtagAvailable()) {
    window.gtag('consent', 'update', {
      analytics_storage: consent ? 'granted' : 'denied',
      ad_storage: 'denied', // Always deny ad storage for privacy
    });
  }

  log('info', 'Consent updated', { consent });

  if (consent) {
    flushEventQueue();
  }
}

/**
 * Checks if user has given consent
 * @returns {boolean} Consent status
 */
function hasConsent() {
  return analyticsState.consentGiven;
}

// ============================================================================
// ONLINE/OFFLINE HANDLING
// ============================================================================

/**
 * Handles online event
 */
function handleOnline() {
  analyticsState.isOnline = true;
  log('info', 'Connection restored');
  flushEventQueue();
}

/**
 * Handles offline event
 */
function handleOffline() {
  analyticsState.isOnline = false;
  log('info', 'Connection lost, events will be queued');
}

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

/**
 * Tracks page performance metrics
 */
function trackPerformance() {
  if (typeof performance === 'undefined' || !performance.timing) {
    return;
  }

  try {
    const timing = performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
    const firstPaintTime = timing.responseStart - timing.navigationStart;

    trackEvent('page_performance', {
      event_category: EVENT_CATEGORIES.ENGAGEMENT,
      load_time: loadTime,
      dom_ready_time: domReadyTime,
      first_paint_time: firstPaintTime,
    });

    log('info', 'Performance metrics tracked', {
      loadTime,
      domReadyTime,
      firstPaintTime,
    });
  } catch (error) {
    log('error', 'Failed to track performance', { error: error.message });
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes Google Analytics 4
 * @param {Object} options - Initialization options
 * @returns {Promise<void>}
 */
async function init(options = {}) {
  if (analyticsState.initialized) {
    log('warn', 'Analytics already initialized');
    return;
  }

  try {
    log('info', 'Initializing Google Analytics 4');

    // Merge options with config
    if (options.measurementId) {
      CONFIG.GA_MEASUREMENT_ID = options.measurementId;
    }
    if (typeof options.debugMode === 'boolean') {
      CONFIG.DEBUG_MODE = options.debugMode;
    }
    if (typeof options.privacyMode === 'boolean') {
      CONFIG.PRIVACY_MODE = options.privacyMode;
    }

    // Generate session ID
    analyticsState.sessionId = generateSessionId();

    // Load queued events from storage
    const queuedEvents = getFromStorage(CONFIG.QUEUE_STORAGE_KEY);
    if (queuedEvents && Array.isArray(queuedEvents)) {
      analyticsState.queue = queuedEvents;
      log('info', 'Loaded queued events', { count: queuedEvents.length });
    }

    // Load gtag script
    await loadGtagScript();

    // Initialize gtag
    initializeGtag();

    // Set up online/offline handlers
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Start queue flushing
    startQueueFlushing();

    // Track initial page view
    await trackPageView();

    // Track performance on load
    if (document.readyState === 'complete') {
      trackPerformance();
    } else {
      window.addEventListener('load', trackPerformance);
    }

    analyticsState.initialized = true;
    log('info', 'Google Analytics 4 initialized successfully');
  } catch (error) {
    log('error', 'Failed to initialize analytics', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Cleans up analytics resources
 */
function cleanup() {
  stopQueueFlushing();
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  analyticsState.initialized = false;
  log('info', 'Analytics cleanup completed');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  init,
  cleanup,
  trackEvent,
  trackPageView,
  trackConversion,
  trackFormSubmission,
  trackEngagement,
  trackMinistryInteraction,
  trackMediaInteraction,
  trackError,
  setConsent,
  hasConsent,
  CONVERSION_EVENTS,
  EVENT_CATEGORIES,
};