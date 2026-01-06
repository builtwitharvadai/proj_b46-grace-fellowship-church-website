/**
 * Main JavaScript Entry Point
 * 
 * Provides core functionality for Grace Fellowship Church website including:
 * - DOM initialization and readiness handling
 * - Smooth scroll navigation
 * - Mobile menu toggle
 * - Utility functions for common operations
 * - Performance monitoring
 * 
 * @module main
 * @generated-from: task-id:TASK-001
 * @modifies: none
 * @dependencies: []
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  SCROLL_OFFSET: 80,
  SCROLL_BEHAVIOR: 'smooth',
  MOBILE_BREAKPOINT: 768,
  DEBOUNCE_DELAY: 150,
  PERFORMANCE_MARK_PREFIX: 'gfc',
});

const SELECTORS = Object.freeze({
  NAV_LINKS: '.nav__link',
  SKIP_LINK: '.skip-link',
  MOBILE_MENU_TOGGLE: '.nav__mobile-toggle',
  NAV_MENU: '.nav__menu',
  BODY: 'body',
});

const CLASSES = Object.freeze({
  MENU_OPEN: 'nav__menu--open',
  NO_SCROLL: 'no-scroll',
  ACTIVE_LINK: 'nav__link--active',
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely queries a single DOM element with error handling
 * @param {string} selector - CSS selector
 * @param {Document|Element} context - Context to query within
 * @returns {Element|null} Found element or null
 */
function querySelector(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.error(`[GFC] Invalid selector: ${selector}`, error);
    return null;
  }
}

/**
 * Safely queries multiple DOM elements with error handling
 * @param {string} selector - CSS selector
 * @param {Document|Element} context - Context to query within
 * @returns {NodeList} NodeList of found elements (empty if error)
 */
function querySelectorAll(selector, context = document) {
  try {
    return context.querySelectorAll(selector);
  } catch (error) {
    console.error(`[GFC] Invalid selector: ${selector}`, error);
    return document.createDocumentFragment().childNodes;
  }
}

/**
 * Creates a debounced version of a function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay) {
  let timeoutId = null;
  
  return function debounced(...args) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      timeoutId = null;
      func.apply(this, args);
    }, delay);
  };
}

/**
 * Checks if device is mobile based on viewport width
 * @returns {boolean} True if mobile viewport
 */
function isMobileViewport() {
  return window.innerWidth < CONFIG.MOBILE_BREAKPOINT;
}

/**
 * Logs structured messages with context
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} context - Additional context data
 */
function log(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    message,
    ...context,
  };
  
  const logMethod = console[level] || console.log;
  logMethod('[GFC]', message, context);
  
  // In production, this could send to analytics/monitoring service
  if (typeof window.gtag === 'function' && level === 'error') {
    window.gtag('event', 'exception', {
      description: message,
      fatal: false,
    });
  }
}

// ============================================================================
// NAVIGATION FUNCTIONALITY
// ============================================================================

/**
 * Handles smooth scrolling to anchor links
 * @param {Event} event - Click event
 */
function handleSmoothScroll(event) {
  const link = event.currentTarget;
  const href = link.getAttribute('href');
  
  // Only handle hash links
  if (!href || !href.startsWith('#')) {
    return;
  }
  
  event.preventDefault();
  
  const targetId = href.substring(1);
  const targetElement = document.getElementById(targetId);
  
  if (!targetElement) {
    log('warn', 'Scroll target not found', { targetId });
    return;
  }
  
  try {
    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = targetPosition - CONFIG.SCROLL_OFFSET;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: CONFIG.SCROLL_BEHAVIOR,
    });
    
    // Update URL without triggering scroll
    if (history.pushState) {
      history.pushState(null, '', href);
    }
    
    // Set focus for accessibility
    targetElement.setAttribute('tabindex', '-1');
    targetElement.focus({ preventScroll: true });
    
    log('info', 'Smooth scroll completed', { targetId });
  } catch (error) {
    log('error', 'Smooth scroll failed', { targetId, error: error.message });
    // Fallback to default behavior
    targetElement.scrollIntoView();
  }
}

/**
 * Updates active navigation link based on scroll position
 */
function updateActiveNavLink() {
  const navLinks = querySelectorAll(SELECTORS.NAV_LINKS);
  const scrollPosition = window.pageYOffset + CONFIG.SCROLL_OFFSET + 50;
  
  let activeSection = null;
  
  // Find the current section
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) {
      return;
    }
    
    const sectionId = href.substring(1);
    const section = document.getElementById(sectionId);
    
    if (section) {
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
        activeSection = link;
      }
    }
  });
  
  // Update active class
  navLinks.forEach((link) => {
    if (link === activeSection) {
      link.classList.add(CLASSES.ACTIVE_LINK);
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove(CLASSES.ACTIVE_LINK);
      link.removeAttribute('aria-current');
    }
  });
}

/**
 * Initializes navigation functionality
 */
function initNavigation() {
  const navLinks = querySelectorAll(SELECTORS.NAV_LINKS);
  
  if (navLinks.length === 0) {
    log('warn', 'No navigation links found');
    return;
  }
  
  // Add smooth scroll to all nav links
  navLinks.forEach((link) => {
    link.addEventListener('click', handleSmoothScroll);
  });
  
  // Handle skip link
  const skipLink = querySelector(SELECTORS.SKIP_LINK);
  if (skipLink) {
    skipLink.addEventListener('click', handleSmoothScroll);
  }
  
  // Update active link on scroll (debounced)
  const debouncedUpdateActiveLink = debounce(updateActiveNavLink, CONFIG.DEBOUNCE_DELAY);
  window.addEventListener('scroll', debouncedUpdateActiveLink, { passive: true });
  
  // Initial active link update
  updateActiveNavLink();
  
  log('info', 'Navigation initialized', { linkCount: navLinks.length });
}

// ============================================================================
// MOBILE MENU FUNCTIONALITY
// ============================================================================

/**
 * Toggles mobile menu open/closed state
 */
function toggleMobileMenu() {
  const navMenu = querySelector(SELECTORS.NAV_MENU);
  const body = querySelector(SELECTORS.BODY);
  
  if (!navMenu) {
    log('warn', 'Mobile menu element not found');
    return;
  }
  
  const isOpen = navMenu.classList.contains(CLASSES.MENU_OPEN);
  
  if (isOpen) {
    navMenu.classList.remove(CLASSES.MENU_OPEN);
    if (body) {
      body.classList.remove(CLASSES.NO_SCROLL);
    }
    log('info', 'Mobile menu closed');
  } else {
    navMenu.classList.add(CLASSES.MENU_OPEN);
    if (body) {
      body.classList.add(CLASSES.NO_SCROLL);
    }
    log('info', 'Mobile menu opened');
  }
}

/**
 * Closes mobile menu when clicking outside
 * @param {Event} event - Click event
 */
function handleOutsideClick(event) {
  const navMenu = querySelector(SELECTORS.NAV_MENU);
  const mobileToggle = querySelector(SELECTORS.MOBILE_MENU_TOGGLE);
  
  if (!navMenu || !navMenu.classList.contains(CLASSES.MENU_OPEN)) {
    return;
  }
  
  const isClickInsideMenu = navMenu.contains(event.target);
  const isClickOnToggle = mobileToggle && mobileToggle.contains(event.target);
  
  if (!isClickInsideMenu && !isClickOnToggle) {
    toggleMobileMenu();
  }
}

/**
 * Initializes mobile menu functionality
 */
function initMobileMenu() {
  const mobileToggle = querySelector(SELECTORS.MOBILE_MENU_TOGGLE);
  
  if (!mobileToggle) {
    log('info', 'Mobile menu toggle not found - skipping mobile menu init');
    return;
  }
  
  mobileToggle.addEventListener('click', toggleMobileMenu);
  document.addEventListener('click', handleOutsideClick);
  
  // Close menu on nav link click (mobile)
  const navLinks = querySelectorAll(SELECTORS.NAV_LINKS);
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (isMobileViewport()) {
        toggleMobileMenu();
      }
    });
  });
  
  log('info', 'Mobile menu initialized');
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Marks a performance timing point
 * @param {string} name - Mark name
 */
function performanceMark(name) {
  if (typeof performance !== 'undefined' && performance.mark) {
    try {
      performance.mark(`${CONFIG.PERFORMANCE_MARK_PREFIX}:${name}`);
    } catch (error) {
      // Silently fail if performance API not available
    }
  }
}

/**
 * Measures performance between two marks
 * @param {string} name - Measure name
 * @param {string} startMark - Start mark name
 * @param {string} endMark - End mark name
 */
function performanceMeasure(name, startMark, endMark) {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      const fullStartMark = `${CONFIG.PERFORMANCE_MARK_PREFIX}:${startMark}`;
      const fullEndMark = `${CONFIG.PERFORMANCE_MARK_PREFIX}:${endMark}`;
      performance.measure(name, fullStartMark, fullEndMark);
      
      const measure = performance.getEntriesByName(name)[0];
      if (measure) {
        log('info', 'Performance measure', {
          name,
          duration: measure.duration.toFixed(2),
        });
      }
    } catch (error) {
      // Silently fail if performance API not available
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes all application functionality
 */
function init() {
  performanceMark('init-start');
  
  try {
    log('info', 'Initializing Grace Fellowship Church website');
    
    // Initialize navigation
    initNavigation();
    
    // Initialize mobile menu
    initMobileMenu();
    
    performanceMark('init-end');
    performanceMeasure('total-init-time', 'init-start', 'init-end');
    
    log('info', 'Initialization complete');
  } catch (error) {
    log('error', 'Initialization failed', { error: error.message, stack: error.stack });
  }
}

/**
 * Handles DOM ready state
 */
function handleDOMReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded
    init();
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

// Start initialization
handleDOMReady();

// Export for testing purposes (if needed)
export {
  init,
  handleSmoothScroll,
  toggleMobileMenu,
  updateActiveNavLink,
  debounce,
  isMobileViewport,
  log,
};