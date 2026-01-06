/**
 * Offline Functionality and Cache Management Utilities
 * 
 * Provides comprehensive offline detection, cache management, user notifications,
 * and background sync capabilities for form submissions when connection returns.
 * 
 * @module offline
 * @generated-from: task-id:TASK-013
 * @modifies: none (new file)
 * @dependencies: []
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  OFFLINE_CHECK_INTERVAL: 30000, // 30 seconds
  ONLINE_CHECK_TIMEOUT: 5000, // 5 seconds
  NOTIFICATION_DURATION: 5000, // 5 seconds
  SYNC_RETRY_DELAY: 2000, // 2 seconds
  MAX_SYNC_RETRIES: 3,
  STORAGE_KEY_PREFIX: 'gfc_offline_',
  PING_URL: '/favicon.ico',
});

const STORAGE_KEYS = Object.freeze({
  PENDING_FORMS: `${CONFIG.STORAGE_KEY_PREFIX}pending_forms`,
  OFFLINE_STATE: `${CONFIG.STORAGE_KEY_PREFIX}state`,
  SYNC_QUEUE: `${CONFIG.STORAGE_KEY_PREFIX}sync_queue`,
});

const NOTIFICATION_TYPES = Object.freeze({
  OFFLINE: 'offline',
  ONLINE: 'online',
  SYNCING: 'syncing',
  SYNC_SUCCESS: 'sync-success',
  SYNC_ERROR: 'sync-error',
});

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let offlineState = {
  isOffline: !navigator.onLine,
  lastCheck: Date.now(),
  notificationElement: null,
  checkInterval: null,
  syncInProgress: false,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Logs structured messages with context
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
function log(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    module: 'offline',
    ...context,
  };

  if (level === 'error') {
    console.error('[Offline]', message, context);
  } else if (level === 'warn') {
    console.warn('[Offline]', message, context);
  } else {
    console.log('[Offline]', message, context);
  }
}

/**
 * Safely parses JSON with error handling
 * @param {string} json - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed value or default
 */
function safeJSONParse(json, defaultValue = null) {
  try {
    return JSON.parse(json);
  } catch (error) {
    log('warn', 'JSON parse failed', { error: error.message });
    return defaultValue;
  }
}

/**
 * Safely stringifies JSON with error handling
 * @param {*} value - Value to stringify
 * @param {string} defaultValue - Default value if stringification fails
 * @returns {string} JSON string or default
 */
function safeJSONStringify(value, defaultValue = '{}') {
  try {
    return JSON.stringify(value);
  } catch (error) {
    log('warn', 'JSON stringify failed', { error: error.message });
    return defaultValue;
  }
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

/**
 * Retrieves data from localStorage with error handling
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if retrieval fails
 * @returns {*} Retrieved value or default
 */
function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return safeJSONParse(item, defaultValue);
  } catch (error) {
    log('error', 'Failed to get storage item', { key, error: error.message });
    return defaultValue;
  }
}

/**
 * Stores data in localStorage with error handling
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} Success status
 */
function setStorageItem(key, value) {
  try {
    const serialized = safeJSONStringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    log('error', 'Failed to set storage item', { key, error: error.message });
    return false;
  }
}

/**
 * Removes data from localStorage with error handling
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    log('error', 'Failed to remove storage item', { key, error: error.message });
    return false;
  }
}

// ============================================================================
// OFFLINE DETECTION
// ============================================================================

/**
 * Checks if browser is truly online by pinging server
 * @returns {Promise<boolean>} True if online
 */
async function checkOnlineStatus() {
  if (!navigator.onLine) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.ONLINE_CHECK_TIMEOUT);

    const response = await fetch(CONFIG.PING_URL, {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    log('warn', 'Online check failed', { error: error.message });
    return false;
  }
}

/**
 * Updates offline state and triggers notifications
 * @param {boolean} isOffline - New offline state
 */
function updateOfflineState(isOffline) {
  const previousState = offlineState.isOffline;
  offlineState.isOffline = isOffline;
  offlineState.lastCheck = Date.now();

  // Store state for persistence
  setStorageItem(STORAGE_KEYS.OFFLINE_STATE, {
    isOffline,
    timestamp: offlineState.lastCheck,
  });

  // Trigger notifications on state change
  if (previousState !== isOffline) {
    if (isOffline) {
      showNotification(NOTIFICATION_TYPES.OFFLINE, 'You are currently offline');
      log('info', 'Connection lost - now offline');
    } else {
      showNotification(NOTIFICATION_TYPES.ONLINE, 'Connection restored');
      log('info', 'Connection restored - now online');
      
      // Trigger background sync when coming online
      triggerBackgroundSync();
    }

    // Dispatch custom event for other components
    dispatchOfflineEvent(isOffline);
  }
}

/**
 * Dispatches custom offline state change event
 * @param {boolean} isOffline - Current offline state
 */
function dispatchOfflineEvent(isOffline) {
  try {
    const event = new CustomEvent('offlineStateChange', {
      detail: {
        isOffline,
        timestamp: Date.now(),
      },
    });
    window.dispatchEvent(event);
  } catch (error) {
    log('error', 'Failed to dispatch offline event', { error: error.message });
  }
}

/**
 * Starts periodic offline status checking
 */
function startOfflineMonitoring() {
  if (offlineState.checkInterval) {
    return;
  }

  log('info', 'Starting offline monitoring');

  // Initial check
  checkOnlineStatus().then(updateOfflineState);

  // Periodic checks
  offlineState.checkInterval = setInterval(async () => {
    const isOnline = await checkOnlineStatus();
    updateOfflineState(!isOnline);
  }, CONFIG.OFFLINE_CHECK_INTERVAL);

  // Listen to browser online/offline events
  window.addEventListener('online', handleOnlineEvent);
  window.addEventListener('offline', handleOfflineEvent);
}

/**
 * Stops offline status checking
 */
function stopOfflineMonitoring() {
  if (offlineState.checkInterval) {
    clearInterval(offlineState.checkInterval);
    offlineState.checkInterval = null;
  }

  window.removeEventListener('online', handleOnlineEvent);
  window.removeEventListener('offline', handleOfflineEvent);

  log('info', 'Stopped offline monitoring');
}

/**
 * Handles browser online event
 */
function handleOnlineEvent() {
  log('info', 'Browser online event detected');
  checkOnlineStatus().then((isOnline) => updateOfflineState(!isOnline));
}

/**
 * Handles browser offline event
 */
function handleOfflineEvent() {
  log('info', 'Browser offline event detected');
  updateOfflineState(true);
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

/**
 * Creates notification element if it doesn't exist
 * @returns {HTMLElement} Notification element
 */
function createNotificationElement() {
  if (offlineState.notificationElement) {
    return offlineState.notificationElement;
  }

  const notification = document.createElement('div');
  notification.className = 'offline-notification';
  notification.setAttribute('role', 'status');
  notification.setAttribute('aria-live', 'polite');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    opacity: 0;
    transform: translateY(-20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: none;
  `;

  document.body.appendChild(notification);
  offlineState.notificationElement = notification;

  return notification;
}

/**
 * Shows notification to user
 * @param {string} type - Notification type
 * @param {string} message - Notification message
 * @param {number} duration - Display duration in milliseconds
 */
function showNotification(type, message, duration = CONFIG.NOTIFICATION_DURATION) {
  const notification = createNotificationElement();

  // Set notification style based on type
  const styles = {
    [NOTIFICATION_TYPES.OFFLINE]: {
      background: '#ef4444',
      color: '#ffffff',
    },
    [NOTIFICATION_TYPES.ONLINE]: {
      background: '#10b981',
      color: '#ffffff',
    },
    [NOTIFICATION_TYPES.SYNCING]: {
      background: '#3b82f6',
      color: '#ffffff',
    },
    [NOTIFICATION_TYPES.SYNC_SUCCESS]: {
      background: '#10b981',
      color: '#ffffff',
    },
    [NOTIFICATION_TYPES.SYNC_ERROR]: {
      background: '#f59e0b',
      color: '#ffffff',
    },
  };

  const style = styles[type] || styles[NOTIFICATION_TYPES.OFFLINE];
  notification.style.background = style.background;
  notification.style.color = style.color;
  notification.textContent = message;

  // Show notification
  requestAnimationFrame(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
    notification.style.pointerEvents = 'auto';
  });

  // Hide after duration
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    notification.style.pointerEvents = 'none';
  }, duration);

  log('info', 'Notification shown', { type, message });
}

// ============================================================================
// FORM QUEUE MANAGEMENT
// ============================================================================

/**
 * Adds form submission to queue for later sync
 * @param {Object} formData - Form data to queue
 * @returns {boolean} Success status
 */
function queueFormSubmission(formData) {
  try {
    const queue = getStorageItem(STORAGE_KEYS.SYNC_QUEUE, []);
    
    const queueItem = {
      id: `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      data: formData,
      retries: 0,
    };

    queue.push(queueItem);
    setStorageItem(STORAGE_KEYS.SYNC_QUEUE, queue);

    log('info', 'Form submission queued', { id: queueItem.id });
    showNotification(
      NOTIFICATION_TYPES.OFFLINE,
      'Form saved. Will submit when connection is restored.'
    );

    return true;
  } catch (error) {
    log('error', 'Failed to queue form submission', { error: error.message });
    return false;
  }
}

/**
 * Retrieves all queued form submissions
 * @returns {Array} Queued submissions
 */
function getQueuedSubmissions() {
  return getStorageItem(STORAGE_KEYS.SYNC_QUEUE, []);
}

/**
 * Removes submission from queue
 * @param {string} id - Submission ID
 * @returns {boolean} Success status
 */
function removeFromQueue(id) {
  try {
    const queue = getStorageItem(STORAGE_KEYS.SYNC_QUEUE, []);
    const filteredQueue = queue.filter((item) => item.id !== id);
    setStorageItem(STORAGE_KEYS.SYNC_QUEUE, filteredQueue);
    log('info', 'Removed from queue', { id });
    return true;
  } catch (error) {
    log('error', 'Failed to remove from queue', { id, error: error.message });
    return false;
  }
}

/**
 * Updates retry count for queued submission
 * @param {string} id - Submission ID
 * @returns {boolean} Success status
 */
function incrementRetryCount(id) {
  try {
    const queue = getStorageItem(STORAGE_KEYS.SYNC_QUEUE, []);
    const item = queue.find((i) => i.id === id);
    
    if (item) {
      item.retries += 1;
      setStorageItem(STORAGE_KEYS.SYNC_QUEUE, queue);
      return true;
    }
    
    return false;
  } catch (error) {
    log('error', 'Failed to increment retry count', { id, error: error.message });
    return false;
  }
}

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

/**
 * Submits a single form from the queue
 * @param {Object} queueItem - Queued form submission
 * @returns {Promise<boolean>} Success status
 */
async function submitQueuedForm(queueItem) {
  try {
    const { id, data, retries } = queueItem;

    if (retries >= CONFIG.MAX_SYNC_RETRIES) {
      log('error', 'Max retries reached for form submission', { id, retries });
      return false;
    }

    log('info', 'Attempting to submit queued form', { id, attempt: retries + 1 });

    const response = await fetch(data.url, {
      method: data.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...data.headers,
      },
      body: JSON.stringify(data.body),
    });

    if (response.ok) {
      log('info', 'Form submission successful', { id });
      removeFromQueue(id);
      return true;
    }

    log('warn', 'Form submission failed', { id, status: response.status });
    incrementRetryCount(id);
    return false;
  } catch (error) {
    log('error', 'Form submission error', { 
      id: queueItem.id, 
      error: error.message 
    });
    incrementRetryCount(queueItem.id);
    return false;
  }
}

/**
 * Processes all queued form submissions
 * @returns {Promise<Object>} Sync results
 */
async function processQueuedSubmissions() {
  const queue = getQueuedSubmissions();

  if (queue.length === 0) {
    log('info', 'No queued submissions to process');
    return { success: 0, failed: 0, total: 0 };
  }

  log('info', 'Processing queued submissions', { count: queue.length });
  showNotification(NOTIFICATION_TYPES.SYNCING, `Syncing ${queue.length} form(s)...`);

  const results = {
    success: 0,
    failed: 0,
    total: queue.length,
  };

  for (const item of queue) {
    const success = await submitQueuedForm(item);
    if (success) {
      results.success += 1;
    } else {
      results.failed += 1;
    }

    // Add delay between submissions
    await new Promise((resolve) => setTimeout(resolve, CONFIG.SYNC_RETRY_DELAY));
  }

  log('info', 'Queue processing complete', results);

  // Show result notification
  if (results.success > 0) {
    showNotification(
      NOTIFICATION_TYPES.SYNC_SUCCESS,
      `Successfully synced ${results.success} form(s)`
    );
  }

  if (results.failed > 0) {
    showNotification(
      NOTIFICATION_TYPES.SYNC_ERROR,
      `Failed to sync ${results.failed} form(s). Will retry later.`
    );
  }

  return results;
}

/**
 * Triggers background sync for queued submissions
 */
async function triggerBackgroundSync() {
  if (offlineState.syncInProgress) {
    log('info', 'Sync already in progress, skipping');
    return;
  }

  if (offlineState.isOffline) {
    log('info', 'Still offline, skipping sync');
    return;
  }

  offlineState.syncInProgress = true;

  try {
    await processQueuedSubmissions();
  } catch (error) {
    log('error', 'Background sync failed', { error: error.message });
  } finally {
    offlineState.syncInProgress = false;
  }
}

/**
 * Registers service worker sync event (if supported)
 */
function registerServiceWorkerSync() {
  if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
    log('info', 'Background Sync API not supported');
    return;
  }

  navigator.serviceWorker.ready
    .then((registration) => {
      return registration.sync.register('sync-forms');
    })
    .then(() => {
      log('info', 'Background sync registered');
    })
    .catch((error) => {
      log('error', 'Failed to register background sync', { error: error.message });
    });
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initializes offline functionality
 */
function init() {
  log('info', 'Initializing offline utilities');

  try {
    // Start monitoring
    startOfflineMonitoring();

    // Register service worker sync
    registerServiceWorkerSync();

    // Process any existing queue on startup
    if (!offlineState.isOffline) {
      setTimeout(() => triggerBackgroundSync(), 1000);
    }

    log('info', 'Offline utilities initialized');
  } catch (error) {
    log('error', 'Failed to initialize offline utilities', { 
      error: error.message,
      stack: error.stack 
    });
  }
}

/**
 * Checks if currently offline
 * @returns {boolean} True if offline
 */
function isOffline() {
  return offlineState.isOffline;
}

/**
 * Gets count of queued submissions
 * @returns {number} Queue count
 */
function getQueueCount() {
  return getQueuedSubmissions().length;
}

/**
 * Manually triggers sync (for testing or user action)
 * @returns {Promise<Object>} Sync results
 */
async function manualSync() {
  log('info', 'Manual sync triggered');
  return await triggerBackgroundSync();
}

/**
 * Clears all queued submissions
 * @returns {boolean} Success status
 */
function clearQueue() {
  try {
    setStorageItem(STORAGE_KEYS.SYNC_QUEUE, []);
    log('info', 'Queue cleared');
    return true;
  } catch (error) {
    log('error', 'Failed to clear queue', { error: error.message });
    return false;
  }
}

/**
 * Cleanup function for shutdown
 */
function cleanup() {
  stopOfflineMonitoring();
  
  if (offlineState.notificationElement) {
    offlineState.notificationElement.remove();
    offlineState.notificationElement = null;
  }

  log('info', 'Offline utilities cleaned up');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  init,
  isOffline,
  queueFormSubmission,
  getQueuedSubmissions,
  getQueueCount,
  manualSync,
  clearQueue,
  cleanup,
  checkOnlineStatus,
  showNotification,
  NOTIFICATION_TYPES,
};