/**
 * Accessibility Utilities Module
 * 
 * Provides comprehensive accessibility support including:
 * - Keyboard navigation management
 * - Focus trap implementation
 * - ARIA live region updates
 * - Skip links functionality
 * - Screen reader announcements
 * - Focus management utilities
 * 
 * @module accessibility
 * @generated-from: task-id:TASK-006
 * @modifies: none
 * @dependencies: []
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  FOCUSABLE_ELEMENTS: [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable]',
    '[tabindex]:not([tabindex^="-"])',
  ].join(','),
  LIVE_REGION_DELAY: 100,
  FOCUS_VISIBLE_CLASS: 'focus-visible',
  SKIP_LINK_TARGET_OFFSET: 0,
  ANNOUNCEMENT_TIMEOUT: 5000,
});

const ARIA_LIVE_LEVELS = Object.freeze({
  POLITE: 'polite',
  ASSERTIVE: 'assertive',
  OFF: 'off',
});

const SELECTORS = Object.freeze({
  SKIP_LINK: '.skip-link',
  LIVE_REGION: '[role="status"], [role="alert"], [aria-live]',
  MAIN_CONTENT: 'main, [role="main"]',
  NAVIGATION: 'nav, [role="navigation"]',
});

// ============================================================================
// LIVE REGION MANAGEMENT
// ============================================================================

/**
 * Creates or retrieves an ARIA live region for announcements
 * @param {string} level - ARIA live level (polite, assertive)
 * @returns {HTMLElement} Live region element
 */
function getOrCreateLiveRegion(level = ARIA_LIVE_LEVELS.POLITE) {
  const existingRegion = document.querySelector(`[aria-live="${level}"][data-gfc-live-region]`);
  
  if (existingRegion) {
    return existingRegion;
  }
  
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', level === ARIA_LIVE_LEVELS.ASSERTIVE ? 'alert' : 'status');
  liveRegion.setAttribute('aria-live', level);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.setAttribute('data-gfc-live-region', 'true');
  liveRegion.className = 'sr-only';
  
  // Visually hidden but accessible to screen readers
  Object.assign(liveRegion.style, {
    position: 'absolute',
    left: '-10000px',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
  });
  
  document.body.appendChild(liveRegion);
  
  return liveRegion;
}

/**
 * Announces a message to screen readers via ARIA live region
 * @param {string} message - Message to announce
 * @param {string} level - ARIA live level (polite, assertive)
 * @param {number} timeout - Auto-clear timeout in milliseconds
 */
function announce(message, level = ARIA_LIVE_LEVELS.POLITE, timeout = CONFIG.ANNOUNCEMENT_TIMEOUT) {
  if (!message || typeof message !== 'string') {
    console.warn('[GFC A11y] Invalid announcement message:', message);
    return;
  }
  
  try {
    const liveRegion = getOrCreateLiveRegion(level);
    
    // Clear existing content
    liveRegion.textContent = '';
    
    // Use setTimeout to ensure screen readers detect the change
    setTimeout(() => {
      liveRegion.textContent = message;
      
      // Auto-clear after timeout
      if (timeout > 0) {
        setTimeout(() => {
          if (liveRegion.textContent === message) {
            liveRegion.textContent = '';
          }
        }, timeout);
      }
    }, CONFIG.LIVE_REGION_DELAY);
    
    console.log('[GFC A11y] Announced:', message, { level });
  } catch (error) {
    console.error('[GFC A11y] Announcement failed:', error.message);
  }
}

/**
 * Announces a polite message (non-interrupting)
 * @param {string} message - Message to announce
 */
function announcePolite(message) {
  announce(message, ARIA_LIVE_LEVELS.POLITE);
}

/**
 * Announces an assertive message (interrupting)
 * @param {string} message - Message to announce
 */
function announceAssertive(message) {
  announce(message, ARIA_LIVE_LEVELS.ASSERTIVE);
}

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

/**
 * Gets all focusable elements within a container
 * @param {Element} container - Container element
 * @returns {Element[]} Array of focusable elements
 */
function getFocusableElements(container = document) {
  try {
    const elements = Array.from(container.querySelectorAll(CONFIG.FOCUSABLE_ELEMENTS));
    
    // Filter out elements that are not visible or have negative tabindex
    return elements.filter((element) => {
      const style = window.getComputedStyle(element);
      const isVisible = style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       element.offsetParent !== null;
      const tabIndex = parseInt(element.getAttribute('tabindex') || '0', 10);
      
      return isVisible && tabIndex >= 0;
    });
  } catch (error) {
    console.error('[GFC A11y] Error getting focusable elements:', error.message);
    return [];
  }
}

/**
 * Sets focus to an element with error handling
 * @param {Element} element - Element to focus
 * @param {Object} options - Focus options
 * @returns {boolean} True if focus was successful
 */
function setFocus(element, options = {}) {
  if (!element || !(element instanceof Element)) {
    console.warn('[GFC A11y] Invalid element for focus:', element);
    return false;
  }
  
  try {
    // Ensure element is focusable
    if (!element.hasAttribute('tabindex') && !element.matches(CONFIG.FOCUSABLE_ELEMENTS)) {
      element.setAttribute('tabindex', '-1');
    }
    
    element.focus(options);
    
    // Verify focus was set
    const focusSuccessful = document.activeElement === element;
    
    if (focusSuccessful) {
      console.log('[GFC A11y] Focus set to:', element.tagName, element.className);
    } else {
      console.warn('[GFC A11y] Focus failed for:', element);
    }
    
    return focusSuccessful;
  } catch (error) {
    console.error('[GFC A11y] Error setting focus:', error.message);
    return false;
  }
}

/**
 * Moves focus to the first focusable element in a container
 * @param {Element} container - Container element
 * @returns {boolean} True if focus was successful
 */
function focusFirstElement(container = document) {
  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length === 0) {
    console.warn('[GFC A11y] No focusable elements found in container');
    return false;
  }
  
  return setFocus(focusableElements[0]);
}

/**
 * Moves focus to the last focusable element in a container
 * @param {Element} container - Container element
 * @returns {boolean} True if focus was successful
 */
function focusLastElement(container = document) {
  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length === 0) {
    console.warn('[GFC A11y] No focusable elements found in container');
    return false;
  }
  
  return setFocus(focusableElements[focusableElements.length - 1]);
}

// ============================================================================
// FOCUS TRAP IMPLEMENTATION
// ============================================================================

/**
 * Creates a focus trap within a container
 * @param {Element} container - Container to trap focus within
 * @returns {Object} Focus trap controller with activate/deactivate methods
 */
function createFocusTrap(container) {
  if (!container || !(container instanceof Element)) {
    throw new Error('[GFC A11y] Invalid container for focus trap');
  }
  
  let isActive = false;
  let previousActiveElement = null;
  
  /**
   * Handles Tab key navigation within the trap
   * @param {KeyboardEvent} event - Keyboard event
   */
  function handleTabKey(event) {
    if (!isActive || event.key !== 'Tab') {
      return;
    }
    
    const focusableElements = getFocusableElements(container);
    
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Shift + Tab on first element - wrap to last
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      setFocus(lastElement);
    }
    // Tab on last element - wrap to first
    else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      setFocus(firstElement);
    }
  }
  
  /**
   * Activates the focus trap
   */
  function activate() {
    if (isActive) {
      console.warn('[GFC A11y] Focus trap already active');
      return;
    }
    
    previousActiveElement = document.activeElement;
    isActive = true;
    
    document.addEventListener('keydown', handleTabKey);
    
    // Move focus to first element in trap
    focusFirstElement(container);
    
    console.log('[GFC A11y] Focus trap activated');
  }
  
  /**
   * Deactivates the focus trap
   */
  function deactivate() {
    if (!isActive) {
      return;
    }
    
    isActive = false;
    document.removeEventListener('keydown', handleTabKey);
    
    // Restore focus to previous element
    if (previousActiveElement && previousActiveElement instanceof Element) {
      setFocus(previousActiveElement);
    }
    
    previousActiveElement = null;
    
    console.log('[GFC A11y] Focus trap deactivated');
  }
  
  return {
    activate,
    deactivate,
    isActive: () => isActive,
  };
}

// ============================================================================
// SKIP LINKS FUNCTIONALITY
// ============================================================================

/**
 * Initializes skip link functionality
 */
function initSkipLinks() {
  const skipLinks = document.querySelectorAll(SELECTORS.SKIP_LINK);
  
  if (skipLinks.length === 0) {
    console.log('[GFC A11y] No skip links found');
    return;
  }
  
  skipLinks.forEach((skipLink) => {
    skipLink.addEventListener('click', handleSkipLinkClick);
  });
  
  console.log('[GFC A11y] Skip links initialized:', skipLinks.length);
}

/**
 * Handles skip link click events
 * @param {Event} event - Click event
 */
function handleSkipLinkClick(event) {
  const link = event.currentTarget;
  const href = link.getAttribute('href');
  
  if (!href || !href.startsWith('#')) {
    return;
  }
  
  event.preventDefault();
  
  const targetId = href.substring(1);
  const targetElement = document.getElementById(targetId);
  
  if (!targetElement) {
    console.warn('[GFC A11y] Skip link target not found:', targetId);
    announcePolite(`Navigation target ${targetId} not found`);
    return;
  }
  
  try {
    // Ensure target is focusable
    const originalTabIndex = targetElement.getAttribute('tabindex');
    if (!originalTabIndex) {
      targetElement.setAttribute('tabindex', '-1');
    }
    
    // Set focus to target
    setFocus(targetElement, { preventScroll: false });
    
    // Scroll target into view
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    
    // Remove temporary tabindex after focus
    if (!originalTabIndex) {
      targetElement.addEventListener('blur', function removeTempTabIndex() {
        targetElement.removeAttribute('tabindex');
        targetElement.removeEventListener('blur', removeTempTabIndex);
      });
    }
    
    const targetLabel = targetElement.getAttribute('aria-label') || 
                       targetElement.textContent.trim().substring(0, 50) ||
                       targetId;
    
    announcePolite(`Skipped to ${targetLabel}`);
    
    console.log('[GFC A11y] Skip link activated:', targetId);
  } catch (error) {
    console.error('[GFC A11y] Skip link navigation failed:', error.message);
    announceAssertive('Navigation failed. Please try again.');
  }
}

// ============================================================================
// KEYBOARD NAVIGATION HELPERS
// ============================================================================

/**
 * Creates a roving tabindex manager for a group of elements
 * @param {Element[]} elements - Elements to manage
 * @param {Object} options - Configuration options
 * @returns {Object} Roving tabindex controller
 */
function createRovingTabindex(elements, options = {}) {
  const {
    orientation = 'horizontal',
    wrap = true,
    onFocusChange = null,
  } = options;
  
  if (!Array.isArray(elements) || elements.length === 0) {
    throw new Error('[GFC A11y] Invalid elements for roving tabindex');
  }
  
  let currentIndex = 0;
  
  /**
   * Updates tabindex attributes for all elements
   */
  function updateTabindices() {
    elements.forEach((element, index) => {
      if (index === currentIndex) {
        element.setAttribute('tabindex', '0');
      } else {
        element.setAttribute('tabindex', '-1');
      }
    });
  }
  
  /**
   * Moves focus to a specific index
   * @param {number} index - Target index
   */
  function focusIndex(index) {
    if (index < 0 || index >= elements.length) {
      return;
    }
    
    currentIndex = index;
    updateTabindices();
    setFocus(elements[currentIndex]);
    
    if (typeof onFocusChange === 'function') {
      onFocusChange(currentIndex, elements[currentIndex]);
    }
  }
  
  /**
   * Handles keyboard navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  function handleKeydown(event) {
    const isHorizontal = orientation === 'horizontal';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
    
    let newIndex = currentIndex;
    
    if (event.key === nextKey) {
      event.preventDefault();
      newIndex = currentIndex + 1;
      if (newIndex >= elements.length) {
        newIndex = wrap ? 0 : elements.length - 1;
      }
    } else if (event.key === prevKey) {
      event.preventDefault();
      newIndex = currentIndex - 1;
      if (newIndex < 0) {
        newIndex = wrap ? elements.length - 1 : 0;
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      newIndex = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      newIndex = elements.length - 1;
    }
    
    if (newIndex !== currentIndex) {
      focusIndex(newIndex);
    }
  }
  
  /**
   * Initializes the roving tabindex
   */
  function init() {
    updateTabindices();
    
    elements.forEach((element, index) => {
      element.addEventListener('keydown', handleKeydown);
      element.addEventListener('focus', () => {
        currentIndex = index;
        updateTabindices();
      });
    });
  }
  
  /**
   * Destroys the roving tabindex
   */
  function destroy() {
    elements.forEach((element) => {
      element.removeEventListener('keydown', handleKeydown);
      element.setAttribute('tabindex', '0');
    });
  }
  
  init();
  
  return {
    focusIndex,
    getCurrentIndex: () => currentIndex,
    destroy,
  };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes all accessibility utilities
 */
function initAccessibility() {
  try {
    console.log('[GFC A11y] Initializing accessibility utilities');
    
    // Initialize skip links
    initSkipLinks();
    
    // Create live regions
    getOrCreateLiveRegion(ARIA_LIVE_LEVELS.POLITE);
    getOrCreateLiveRegion(ARIA_LIVE_LEVELS.ASSERTIVE);
    
    console.log('[GFC A11y] Accessibility utilities initialized');
  } catch (error) {
    console.error('[GFC A11y] Initialization failed:', error.message);
  }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccessibility);
} else {
  initAccessibility();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  announce,
  announcePolite,
  announceAssertive,
  getFocusableElements,
  setFocus,
  focusFirstElement,
  focusLastElement,
  createFocusTrap,
  createRovingTabindex,
  initAccessibility,
  initSkipLinks,
};