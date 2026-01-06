/**
 * Navigation Component
 * 
 * Provides comprehensive navigation functionality including:
 * - Mobile menu toggle with hamburger animation
 * - Active page detection and highlighting
 * - Keyboard navigation support (Tab, Enter, Escape)
 * - Smooth scrolling for anchor links
 * - Accessible ARIA attributes management
 * - Outside click detection for mobile menu
 * - Viewport resize handling
 * 
 * @module components/navigation
 * @generated-from: task-id:TASK-005
 * @modifies: none
 * @dependencies: []
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  MOBILE_BREAKPOINT: 768,
  ESCAPE_KEY: 'Escape',
  ENTER_KEY: 'Enter',
  SPACE_KEY: ' ',
  DEBOUNCE_DELAY: 150,
  SCROLL_OFFSET: 80,
  SCROLL_BEHAVIOR: 'smooth',
});

const SELECTORS = Object.freeze({
  NAV: '.nav',
  NAV_TOGGLE: '.nav__toggle',
  NAV_MENU: '.nav__menu',
  NAV_LINKS: '.nav__link',
  BODY: 'body',
});

const CLASSES = Object.freeze({
  MENU_OPEN: 'nav__menu--open',
  NO_SCROLL: 'no-scroll',
  ACTIVE_LINK: 'nav__link--active',
});

const ARIA = Object.freeze({
  EXPANDED: 'aria-expanded',
  HIDDEN: 'aria-hidden',
  CURRENT: 'aria-current',
});

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  isMenuOpen: false,
  isMobileViewport: false,
  activeLink: null,
  resizeObserver: null,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely queries a single DOM element
 * @param {string} selector - CSS selector
 * @param {Document|Element} context - Query context
 * @returns {Element|null} Found element or null
 */
function querySelector(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.error('[Navigation] Invalid selector:', selector, error);
    return null;
  }
}

/**
 * Safely queries multiple DOM elements
 * @param {string} selector - CSS selector
 * @param {Document|Element} context - Query context
 * @returns {NodeList} NodeList of elements
 */
function querySelectorAll(selector, context = document) {
  try {
    return context.querySelectorAll(selector);
  } catch (error) {
    console.error('[Navigation] Invalid selector:', selector, error);
    return document.createDocumentFragment().childNodes;
  }
}

/**
 * Creates debounced version of function
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
 * Checks if current viewport is mobile
 * @returns {boolean} True if mobile viewport
 */
function isMobileViewport() {
  return window.innerWidth < CONFIG.MOBILE_BREAKPOINT;
}

/**
 * Logs structured navigation events
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
function log(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    component: 'navigation',
    message,
    ...context,
  };
  
  const logMethod = console[level] || console.log;
  logMethod('[Navigation]', message, context);
  
  // Analytics integration point
  if (typeof window.gtag === 'function') {
    if (level === 'error') {
      window.gtag('event', 'exception', {
        description: `Navigation: ${message}`,
        fatal: false,
      });
    } else if (context.action) {
      window.gtag('event', context.action, {
        event_category: 'navigation',
        event_label: message,
      });
    }
  }
}

// ============================================================================
// MOBILE MENU FUNCTIONALITY
// ============================================================================

/**
 * Opens mobile menu with proper state management
 */
function openMobileMenu() {
  const navMenu = querySelector(SELECTORS.NAV_MENU);
  const navToggle = querySelector(SELECTORS.NAV_TOGGLE);
  const body = querySelector(SELECTORS.BODY);
  
  if (!navMenu || !navToggle) {
    log('warn', 'Mobile menu elements not found');
    return;
  }
  
  // Update state
  state.isMenuOpen = true;
  
  // Update DOM
  navMenu.classList.add(CLASSES.MENU_OPEN);
  navMenu.setAttribute(ARIA.HIDDEN, 'false');
  navToggle.setAttribute(ARIA.EXPANDED, 'true');
  
  // Prevent body scroll on mobile
  if (body) {
    body.classList.add(CLASSES.NO_SCROLL);
  }
  
  // Focus first menu item for accessibility
  const firstLink = querySelector(SELECTORS.NAV_LINKS, navMenu);
  if (firstLink) {
    firstLink.focus();
  }
  
  log('info', 'Mobile menu opened', { action: 'menu_open' });
}

/**
 * Closes mobile menu with proper state management
 */
function closeMobileMenu() {
  const navMenu = querySelector(SELECTORS.NAV_MENU);
  const navToggle = querySelector(SELECTORS.NAV_TOGGLE);
  const body = querySelector(SELECTORS.BODY);
  
  if (!navMenu || !navToggle) {
    return;
  }
  
  // Update state
  state.isMenuOpen = false;
  
  // Update DOM
  navMenu.classList.remove(CLASSES.MENU_OPEN);
  navMenu.setAttribute(ARIA.HIDDEN, 'true');
  navToggle.setAttribute(ARIA.EXPANDED, 'false');
  
  // Restore body scroll
  if (body) {
    body.classList.remove(CLASSES.NO_SCROLL);
  }
  
  // Return focus to toggle button
  navToggle.focus();
  
  log('info', 'Mobile menu closed', { action: 'menu_close' });
}

/**
 * Toggles mobile menu state
 */
function toggleMobileMenu() {
  if (state.isMenuOpen) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

/**
 * Handles click on mobile menu toggle button
 * @param {Event} event - Click event
 */
function handleToggleClick(event) {
  event.preventDefault();
  event.stopPropagation();
  toggleMobileMenu();
}

/**
 * Handles clicks outside mobile menu to close it
 * @param {Event} event - Click event
 */
function handleOutsideClick(event) {
  if (!state.isMenuOpen || !state.isMobileViewport) {
    return;
  }
  
  const navMenu = querySelector(SELECTORS.NAV_MENU);
  const navToggle = querySelector(SELECTORS.NAV_TOGGLE);
  
  if (!navMenu) {
    return;
  }
  
  const isClickInsideMenu = navMenu.contains(event.target);
  const isClickOnToggle = navToggle && navToggle.contains(event.target);
  
  if (!isClickInsideMenu && !isClickOnToggle) {
    closeMobileMenu();
  }
}

/**
 * Handles keyboard navigation in mobile menu
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleMenuKeydown(event) {
  if (!state.isMenuOpen) {
    return;
  }
  
  if (event.key === CONFIG.ESCAPE_KEY) {
    event.preventDefault();
    closeMobileMenu();
  }
}

/**
 * Handles navigation link clicks in mobile menu
 * @param {Event} event - Click event
 */
function handleLinkClick(_event) {
  if (state.isMobileViewport && state.isMenuOpen) {
    // Close menu after short delay to allow navigation
    setTimeout(() => {
      closeMobileMenu();
    }, 100);
  }
}

// ============================================================================
// ACTIVE PAGE DETECTION
// ============================================================================

/**
 * Determines active navigation link based on current page
 * @returns {Element|null} Active link element
 */
function detectActivePage() {
  const navLinks = querySelectorAll(SELECTORS.NAV_LINKS);
  const currentPath = window.location.pathname;
  const currentHash = window.location.hash;
  
  let activeLink = null;
  let exactMatch = false;
  
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) {
      return;
    }
    
    // Check for exact path match
    if (href === currentPath || href === `${currentPath}${currentHash}`) {
      activeLink = link;
      exactMatch = true;
      return;
    }
    
    // Check for path prefix match (only if no exact match yet)
    if (!exactMatch && currentPath.startsWith(href) && href !== '/') {
      activeLink = link;
    }
    
    // Check for hash match on same page
    if (href.startsWith('#') && href === currentHash) {
      activeLink = link;
      exactMatch = true;
    }
  });
  
  return activeLink;
}

/**
 * Updates active link styling and ARIA attributes
 * @param {Element|null} newActiveLink - New active link element
 */
function updateActiveLink(newActiveLink) {
  const navLinks = querySelectorAll(SELECTORS.NAV_LINKS);
  
  // Remove active state from all links
  navLinks.forEach((link) => {
    link.classList.remove(CLASSES.ACTIVE_LINK);
    link.removeAttribute(ARIA.CURRENT);
  });
  
  // Add active state to new link
  if (newActiveLink) {
    newActiveLink.classList.add(CLASSES.ACTIVE_LINK);
    newActiveLink.setAttribute(ARIA.CURRENT, 'page');
    state.activeLink = newActiveLink;
    
    const href = newActiveLink.getAttribute('href');
    log('info', 'Active page updated', { 
      href,
      action: 'page_active',
    });
  }
}

/**
 * Detects and updates active page on navigation
 */
function handlePageChange() {
  const activeLink = detectActivePage();
  updateActiveLink(activeLink);
}

// ============================================================================
// SMOOTH SCROLLING
// ============================================================================

/**
 * Handles smooth scrolling for anchor links
 * @param {Event} event - Click event
 */
function handleSmoothScroll(event) {
  const link = event.currentTarget;
  const href = link.getAttribute('href');
  
  // Only handle hash links on same page
  if (!href || !href.startsWith('#')) {
    return;
  }
  
  const targetId = href.substring(1);
  const targetElement = document.getElementById(targetId);
  
  if (!targetElement) {
    log('warn', 'Scroll target not found', { targetId });
    return;
  }
  
  event.preventDefault();
  
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
    
    // Update active link
    updateActiveLink(link);
    
    log('info', 'Smooth scroll completed', { 
      targetId,
      action: 'smooth_scroll',
    });
  } catch (error) {
    log('error', 'Smooth scroll failed', { 
      targetId, 
      error: error.message,
    });
    // Fallback to default behavior
    targetElement.scrollIntoView();
  }
}

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

/**
 * Handles keyboard navigation for toggle button
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleToggleKeydown(event) {
  if (event.key === CONFIG.ENTER_KEY || event.key === CONFIG.SPACE_KEY) {
    event.preventDefault();
    toggleMobileMenu();
  }
}

/**
 * Handles keyboard navigation for menu links
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleLinkKeydown(event) {
  const link = event.currentTarget;
  const href = link.getAttribute('href');
  
  if ((event.key === CONFIG.ENTER_KEY || event.key === CONFIG.SPACE_KEY) && href && href.startsWith('#')) {
    event.preventDefault();
    handleSmoothScroll(event);
  }
}

// ============================================================================
// VIEWPORT RESIZE HANDLING
// ============================================================================

/**
 * Handles viewport resize events
 */
function handleResize() {
  const wasMobile = state.isMobileViewport;
  const isMobile = isMobileViewport();
  
  state.isMobileViewport = isMobile;
  
  // Close mobile menu when switching to desktop
  if (wasMobile && !isMobile && state.isMenuOpen) {
    closeMobileMenu();
  }
  
  // Update ARIA attributes based on viewport
  const navMenu = querySelector(SELECTORS.NAV_MENU);
  if (navMenu && !isMobile) {
    navMenu.setAttribute(ARIA.HIDDEN, 'false');
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes mobile menu functionality
 */
function initMobileMenu() {
  const navToggle = querySelector(SELECTORS.NAV_TOGGLE);
  const navMenu = querySelector(SELECTORS.NAV_MENU);
  
  if (!navToggle || !navMenu) {
    log('info', 'Mobile menu elements not found - skipping mobile menu init');
    return;
  }
  
  // Set initial state
  state.isMobileViewport = isMobileViewport();
  state.isMenuOpen = false;
  
  // Set initial ARIA attributes
  navToggle.setAttribute(ARIA.EXPANDED, 'false');
  navMenu.setAttribute(ARIA.HIDDEN, state.isMobileViewport ? 'true' : 'false');
  
  // Add event listeners
  navToggle.addEventListener('click', handleToggleClick);
  navToggle.addEventListener('keydown', handleToggleKeydown);
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleMenuKeydown);
  
  // Handle viewport resize
  const debouncedResize = debounce(handleResize, CONFIG.DEBOUNCE_DELAY);
  window.addEventListener('resize', debouncedResize, { passive: true });
  
  log('info', 'Mobile menu initialized');
}

/**
 * Initializes active page detection
 */
function initActivePageDetection() {
  const navLinks = querySelectorAll(SELECTORS.NAV_LINKS);
  
  if (navLinks.length === 0) {
    log('warn', 'No navigation links found');
    return;
  }
  
  // Initial active page detection
  handlePageChange();
  
  // Listen for navigation events
  window.addEventListener('popstate', handlePageChange);
  window.addEventListener('hashchange', handlePageChange);
  
  log('info', 'Active page detection initialized', { 
    linkCount: navLinks.length,
  });
}

/**
 * Initializes smooth scrolling for anchor links
 */
function initSmoothScrolling() {
  const navLinks = querySelectorAll(SELECTORS.NAV_LINKS);
  
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    
    // Add smooth scroll handler for hash links
    if (href && href.startsWith('#')) {
      link.addEventListener('click', handleSmoothScroll);
      link.addEventListener('keydown', handleLinkKeydown);
    }
    
    // Add click handler for mobile menu closing
    link.addEventListener('click', handleLinkClick);
  });
  
  log('info', 'Smooth scrolling initialized');
}

/**
 * Initializes all navigation functionality
 */
function initNavigation() {
  try {
    log('info', 'Initializing navigation component');
    
    // Initialize mobile menu
    initMobileMenu();
    
    // Initialize active page detection
    initActivePageDetection();
    
    // Initialize smooth scrolling
    initSmoothScrolling();
    
    log('info', 'Navigation component initialized successfully');
  } catch (error) {
    log('error', 'Navigation initialization failed', { 
      error: error.message,
      stack: error.stack,
    });
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Cleans up navigation event listeners and state
 */
function cleanup() {
  const navToggle = querySelector(SELECTORS.NAV_TOGGLE);
  const navLinks = querySelectorAll(SELECTORS.NAV_LINKS);
  
  if (navToggle) {
    navToggle.removeEventListener('click', handleToggleClick);
    navToggle.removeEventListener('keydown', handleToggleKeydown);
  }
  
  navLinks.forEach((link) => {
    link.removeEventListener('click', handleSmoothScroll);
    link.removeEventListener('click', handleLinkClick);
    link.removeEventListener('keydown', handleLinkKeydown);
  });
  
  document.removeEventListener('click', handleOutsideClick);
  document.removeEventListener('keydown', handleMenuKeydown);
  window.removeEventListener('popstate', handlePageChange);
  window.removeEventListener('hashchange', handlePageChange);
  
  // Close menu if open
  if (state.isMenuOpen) {
    closeMobileMenu();
  }
  
  log('info', 'Navigation component cleaned up');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  initNavigation,
  cleanup,
  toggleMobileMenu,
  handlePageChange,
  updateActiveLink,
};