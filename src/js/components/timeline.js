/**
 * Timeline Interactive Component
 * 
 * Provides interactive functionality and animations for the church history timeline:
 * - Intersection Observer for reveal effects on scroll
 * - Smooth scrolling between timeline events
 * - Progressive enhancement with fallbacks
 * - Performance-optimized animations
 * - Accessibility-first implementation
 * 
 * @module components/timeline
 * @generated-from: task-id:TASK-003
 * @modifies: none
 * @dependencies: []
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  INTERSECTION_THRESHOLD: 0.2,
  INTERSECTION_ROOT_MARGIN: '0px 0px -100px 0px',
  ANIMATION_DELAY_INCREMENT: 100,
  SCROLL_BEHAVIOR: 'smooth',
  SCROLL_OFFSET: 100,
  REVEAL_CLASS: 'timeline__item--revealed',
  ACTIVE_CLASS: 'timeline__item--active',
  PERFORMANCE_MARK_PREFIX: 'timeline',
});

const SELECTORS = Object.freeze({
  TIMELINE_CONTAINER: '.timeline',
  TIMELINE_ITEMS: '.timeline__item',
  TIMELINE_YEAR: '.timeline__year',
});

const ANIMATION_STATES = Object.freeze({
  IDLE: 'idle',
  REVEALING: 'revealing',
  REVEALED: 'revealed',
});

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  observer: null,
  items: [],
  animationState: ANIMATION_STATES.IDLE,
  revealedCount: 0,
};

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
    console.error(`[Timeline] Invalid selector: ${selector}`, error);
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
    console.error(`[Timeline] Invalid selector: ${selector}`, error);
    return document.createDocumentFragment().childNodes;
  }
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
    component: 'timeline',
    message,
    ...context,
  };
  
  const logMethod = console[level] || console.log;
  logMethod('[Timeline]', message, context);
  
  if (typeof window.gtag === 'function' && level === 'error') {
    window.gtag('event', 'exception', {
      description: `Timeline: ${message}`,
      fatal: false,
    });
  }
}

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

/**
 * Checks if browser supports Intersection Observer
 * @returns {boolean} True if supported
 */
function supportsIntersectionObserver() {
  return (
    typeof window !== 'undefined' &&
    'IntersectionObserver' in window &&
    'IntersectionObserverEntry' in window &&
    'intersectionRatio' in window.IntersectionObserverEntry.prototype
  );
}

/**
 * Checks if user prefers reduced motion
 * @returns {boolean} True if reduced motion preferred
 */
function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

// ============================================================================
// INTERSECTION OBSERVER FUNCTIONALITY
// ============================================================================

/**
 * Handles intersection observer callback
 * @param {IntersectionObserverEntry[]} entries - Observed entries
 */
function handleIntersection(entries) {
  if (state.animationState === ANIMATION_STATES.REVEALING) {
    return;
  }
  
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      revealTimelineItem(entry.target);
    }
  });
}

/**
 * Reveals a timeline item with animation
 * @param {Element} item - Timeline item element
 */
function revealTimelineItem(item) {
  if (item.classList.contains(CONFIG.REVEAL_CLASS)) {
    return;
  }
  
  try {
    state.animationState = ANIMATION_STATES.REVEALING;
    
    const delay = prefersReducedMotion() 
      ? 0 
      : state.revealedCount * CONFIG.ANIMATION_DELAY_INCREMENT;
    
    setTimeout(() => {
      item.classList.add(CONFIG.REVEAL_CLASS);
      state.revealedCount++;
      state.animationState = ANIMATION_STATES.IDLE;
      
      log('info', 'Timeline item revealed', {
        itemIndex: state.revealedCount,
        delay,
      });
    }, delay);
  } catch (error) {
    log('error', 'Failed to reveal timeline item', {
      error: error.message,
    });
    state.animationState = ANIMATION_STATES.IDLE;
  }
}

/**
 * Initializes intersection observer for timeline items
 */
function initIntersectionObserver() {
  if (!supportsIntersectionObserver()) {
    log('warn', 'Intersection Observer not supported - using fallback');
    fallbackRevealAll();
    return;
  }
  
  try {
    const options = {
      root: null,
      rootMargin: CONFIG.INTERSECTION_ROOT_MARGIN,
      threshold: CONFIG.INTERSECTION_THRESHOLD,
    };
    
    state.observer = new IntersectionObserver(handleIntersection, options);
    
    state.items.forEach((item) => {
      state.observer.observe(item);
    });
    
    log('info', 'Intersection Observer initialized', {
      itemCount: state.items.length,
      threshold: CONFIG.INTERSECTION_THRESHOLD,
    });
  } catch (error) {
    log('error', 'Failed to initialize Intersection Observer', {
      error: error.message,
    });
    fallbackRevealAll();
  }
}

/**
 * Fallback: reveals all items immediately without animation
 */
function fallbackRevealAll() {
  state.items.forEach((item) => {
    item.classList.add(CONFIG.REVEAL_CLASS);
  });
  
  log('info', 'Fallback reveal applied', {
    itemCount: state.items.length,
  });
}

// ============================================================================
// SMOOTH SCROLLING FUNCTIONALITY
// ============================================================================

/**
 * Scrolls smoothly to a timeline item
 * @param {Element} item - Timeline item to scroll to
 */
function scrollToTimelineItem(item) {
  if (!item) {
    log('warn', 'Cannot scroll to null item');
    return;
  }
  
  try {
    const targetPosition = item.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = targetPosition - CONFIG.SCROLL_OFFSET;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: prefersReducedMotion() ? 'auto' : CONFIG.SCROLL_BEHAVIOR,
    });
    
    setActiveTimelineItem(item);
    
    log('info', 'Scrolled to timeline item', {
      targetPosition,
      offsetPosition,
    });
  } catch (error) {
    log('error', 'Failed to scroll to timeline item', {
      error: error.message,
    });
    item.scrollIntoView();
  }
}

/**
 * Sets active state on timeline item
 * @param {Element} activeItem - Item to set as active
 */
function setActiveTimelineItem(activeItem) {
  state.items.forEach((item) => {
    if (item === activeItem) {
      item.classList.add(CONFIG.ACTIVE_CLASS);
      item.setAttribute('aria-current', 'true');
    } else {
      item.classList.remove(CONFIG.ACTIVE_CLASS);
      item.removeAttribute('aria-current');
    }
  });
}

/**
 * Handles click on timeline year for smooth scrolling
 * @param {Event} event - Click event
 */
function handleTimelineYearClick(event) {
  const yearElement = event.currentTarget;
  const timelineItem = yearElement.closest(SELECTORS.TIMELINE_ITEMS);
  
  if (timelineItem) {
    event.preventDefault();
    scrollToTimelineItem(timelineItem);
  }
}

/**
 * Initializes smooth scrolling for timeline years
 */
function initSmoothScrolling() {
  const yearElements = querySelectorAll(SELECTORS.TIMELINE_YEAR);
  
  if (yearElements.length === 0) {
    log('info', 'No timeline year elements found - skipping smooth scroll init');
    return;
  }
  
  yearElements.forEach((yearElement) => {
    yearElement.style.cursor = 'pointer';
    yearElement.setAttribute('role', 'button');
    yearElement.setAttribute('tabindex', '0');
    
    yearElement.addEventListener('click', handleTimelineYearClick);
    
    yearElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleTimelineYearClick(event);
      }
    });
  });
  
  log('info', 'Smooth scrolling initialized', {
    yearCount: yearElements.length,
  });
}

// ============================================================================
// CLEANUP FUNCTIONALITY
// ============================================================================

/**
 * Cleans up timeline component resources
 */
function cleanup() {
  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
  }
  
  const yearElements = querySelectorAll(SELECTORS.TIMELINE_YEAR);
  yearElements.forEach((yearElement) => {
    yearElement.removeEventListener('click', handleTimelineYearClick);
  });
  
  state.items = [];
  state.revealedCount = 0;
  state.animationState = ANIMATION_STATES.IDLE;
  
  log('info', 'Timeline component cleaned up');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes timeline component
 */
function init() {
  performanceMark('timeline-init-start');
  
  try {
    log('info', 'Initializing timeline component');
    
    const timelineContainer = querySelector(SELECTORS.TIMELINE_CONTAINER);
    
    if (!timelineContainer) {
      log('info', 'Timeline container not found - skipping initialization');
      return;
    }
    
    state.items = Array.from(querySelectorAll(SELECTORS.TIMELINE_ITEMS));
    
    if (state.items.length === 0) {
      log('warn', 'No timeline items found');
      return;
    }
    
    initIntersectionObserver();
    
    initSmoothScrolling();
    
    performanceMark('timeline-init-end');
    performanceMeasure('timeline-init-time', 'timeline-init-start', 'timeline-init-end');
    
    log('info', 'Timeline component initialized', {
      itemCount: state.items.length,
      observerSupported: supportsIntersectionObserver(),
      reducedMotion: prefersReducedMotion(),
    });
  } catch (error) {
    log('error', 'Timeline initialization failed', {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Handles DOM ready state
 */
function handleDOMReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

handleDOMReady();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);
}

// Export for testing purposes
export {
  init,
  cleanup,
  scrollToTimelineItem,
  revealTimelineItem,
  handleIntersection,
  supportsIntersectionObserver,
  prefersReducedMotion,
};