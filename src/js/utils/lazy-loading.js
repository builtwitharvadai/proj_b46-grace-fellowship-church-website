/**
 * Lazy Loading Utility
 * 
 * Implements Intersection Observer API for efficient image lazy loading with:
 * - Progressive image loading as user scrolls
 * - Fallback support for older browsers
 * - Loading placeholder handling
 * - Performance optimization with configurable thresholds
 * - Comprehensive error handling and logging
 * - Memory leak prevention
 * 
 * @module lazy-loading
 * @generated-from: task-id:TASK-006
 * @modifies: none
 * @dependencies: []
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  ROOT_MARGIN: '50px',
  THRESHOLD: 0.01,
  LOADING_CLASS: 'lazy-loading',
  LOADED_CLASS: 'lazy-loaded',
  ERROR_CLASS: 'lazy-error',
  DATA_SRC_ATTR: 'data-src',
  DATA_SRCSET_ATTR: 'data-srcset',
  DATA_SIZES_ATTR: 'data-sizes',
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  PERFORMANCE_MARK_PREFIX: 'gfc-lazy',
});

const SELECTORS = Object.freeze({
  LAZY_IMAGE: 'img[data-src]',
  LAZY_PICTURE_SOURCE: 'source[data-srcset]',
});

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let observerInstance = null;
let loadedImages = new WeakSet();
let retryAttempts = new WeakMap();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
    module: 'lazy-loading',
    ...context,
  };
  
  const logMethod = console[level] || console.log;
  logMethod('[GFC Lazy Loading]', message, context);
  
  // Send to analytics if available
  if (typeof window.gtag === 'function' && level === 'error') {
    window.gtag('event', 'exception', {
      description: `Lazy Loading: ${message}`,
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
 * @returns {number|null} Duration in milliseconds or null
 */
function performanceMeasure(name, startMark, endMark) {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      const fullStartMark = `${CONFIG.PERFORMANCE_MARK_PREFIX}:${startMark}`;
      const fullEndMark = `${CONFIG.PERFORMANCE_MARK_PREFIX}:${endMark}`;
      performance.measure(name, fullStartMark, fullEndMark);
      
      const measure = performance.getEntriesByName(name)[0];
      if (measure) {
        const duration = measure.duration;
        log('info', 'Performance measure', {
          name,
          duration: duration.toFixed(2),
        });
        return duration;
      }
    } catch (error) {
      // Silently fail if performance API not available
    }
  }
  return null;
}

/**
 * Checks if Intersection Observer is supported
 * @returns {boolean} True if supported
 */
function isIntersectionObserverSupported() {
  return (
    'IntersectionObserver' in window &&
    'IntersectionObserverEntry' in window &&
    'intersectionRatio' in window.IntersectionObserverEntry.prototype
  );
}

/**
 * Delays execution for specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// IMAGE LOADING FUNCTIONALITY
// ============================================================================

/**
 * Loads an image with retry logic
 * @param {HTMLImageElement} img - Image element to load
 * @param {number} attempt - Current attempt number
 * @returns {Promise<void>}
 */
async function loadImageWithRetry(img, attempt = 1) {
  const src = img.getAttribute(CONFIG.DATA_SRC_ATTR);
  const srcset = img.getAttribute(CONFIG.DATA_SRCSET_ATTR);
  const sizes = img.getAttribute(CONFIG.DATA_SIZES_ATTR);
  
  if (!src && !srcset) {
    log('warn', 'No data-src or data-srcset attribute found', {
      element: img.outerHTML.substring(0, 100),
    });
    return;
  }
  
  try {
    performanceMark(`load-start-${src || srcset}`);
    
    // Create a promise that resolves when image loads
    await new Promise((resolve, reject) => {
      const tempImg = new Image();
      
      const handleLoad = () => {
        cleanup();
        resolve();
      };
      
      const handleError = () => {
        cleanup();
        reject(new Error(`Failed to load image: ${src || srcset}`));
      };
      
      const cleanup = () => {
        tempImg.removeEventListener('load', handleLoad);
        tempImg.removeEventListener('error', handleError);
      };
      
      tempImg.addEventListener('load', handleLoad);
      tempImg.addEventListener('error', handleError);
      
      // Set srcset first if available (responsive images)
      if (srcset) {
        tempImg.srcset = srcset;
        if (sizes) {
          tempImg.sizes = sizes;
        }
      }
      
      // Set src last to trigger load
      if (src) {
        tempImg.src = src;
      }
    });
    
    // Apply loaded attributes to actual image
    if (srcset) {
      img.srcset = srcset;
      if (sizes) {
        img.sizes = sizes;
      }
    }
    if (src) {
      img.src = src;
    }
    
    // Remove data attributes
    img.removeAttribute(CONFIG.DATA_SRC_ATTR);
    img.removeAttribute(CONFIG.DATA_SRCSET_ATTR);
    img.removeAttribute(CONFIG.DATA_SIZES_ATTR);
    
    // Update classes
    img.classList.remove(CONFIG.LOADING_CLASS);
    img.classList.add(CONFIG.LOADED_CLASS);
    
    // Mark as loaded
    loadedImages.add(img);
    
    performanceMark(`load-end-${src || srcset}`);
    performanceMeasure(
      `image-load-${src || srcset}`,
      `load-start-${src || srcset}`,
      `load-end-${src || srcset}`
    );
    
    log('info', 'Image loaded successfully', {
      src: src || srcset,
      attempt,
    });
  } catch (error) {
    if (attempt < CONFIG.RETRY_ATTEMPTS) {
      log('warn', 'Image load failed, retrying', {
        src: src || srcset,
        attempt,
        error: error.message,
      });
      
      await delay(CONFIG.RETRY_DELAY * attempt);
      return loadImageWithRetry(img, attempt + 1);
    } else {
      log('error', 'Image load failed after retries', {
        src: src || srcset,
        attempts: CONFIG.RETRY_ATTEMPTS,
        error: error.message,
      });
      
      img.classList.remove(CONFIG.LOADING_CLASS);
      img.classList.add(CONFIG.ERROR_CLASS);
      
      // Set alt text as fallback content
      if (!img.alt) {
        img.alt = 'Image failed to load';
      }
      
      throw error;
    }
  }
}

/**
 * Handles intersection observer callback
 * @param {IntersectionObserverEntry[]} entries - Observed entries
 * @param {IntersectionObserver} observer - Observer instance
 */
function handleIntersection(entries, observer) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const img = entry.target;
      
      // Skip if already loaded
      if (loadedImages.has(img)) {
        observer.unobserve(img);
        return;
      }
      
      // Add loading class
      img.classList.add(CONFIG.LOADING_CLASS);
      
      // Load image
      loadImageWithRetry(img)
        .then(() => {
          observer.unobserve(img);
        })
        .catch((error) => {
          // Error already logged in loadImageWithRetry
          observer.unobserve(img);
        });
    }
  });
}

/**
 * Creates and configures Intersection Observer
 * @returns {IntersectionObserver} Configured observer instance
 */
function createObserver() {
  const options = {
    root: null,
    rootMargin: CONFIG.ROOT_MARGIN,
    threshold: CONFIG.THRESHOLD,
  };
  
  try {
    const observer = new IntersectionObserver(handleIntersection, options);
    log('info', 'Intersection Observer created', options);
    return observer;
  } catch (error) {
    log('error', 'Failed to create Intersection Observer', {
      error: error.message,
    });
    throw error;
  }
}

// ============================================================================
// FALLBACK IMPLEMENTATION
// ============================================================================

/**
 * Fallback lazy loading for browsers without Intersection Observer
 * Uses scroll and resize events with debouncing
 */
function initFallbackLazyLoading() {
  log('info', 'Using fallback lazy loading implementation');
  
  let ticking = false;
  
  /**
   * Checks if element is in viewport
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if in viewport
   */
  function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    const verticalInView = rect.top <= windowHeight && rect.bottom >= 0;
    const horizontalInView = rect.left <= windowWidth && rect.right >= 0;
    
    return verticalInView && horizontalInView;
  }
  
  /**
   * Loads images that are in viewport
   */
  function loadVisibleImages() {
    const images = document.querySelectorAll(SELECTORS.LAZY_IMAGE);
    
    images.forEach((img) => {
      if (loadedImages.has(img)) {
        return;
      }
      
      if (isInViewport(img)) {
        img.classList.add(CONFIG.LOADING_CLASS);
        loadImageWithRetry(img).catch(() => {
          // Error already logged
        });
      }
    });
    
    ticking = false;
  }
  
  /**
   * Request animation frame wrapper for scroll handler
   */
  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(loadVisibleImages);
      ticking = true;
    }
  }
  
  // Initial load
  loadVisibleImages();
  
  // Add event listeners
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick, { passive: true });
  
  log('info', 'Fallback lazy loading initialized');
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initializes lazy loading for all images with data-src attribute
 * @returns {Object} API object with control methods
 */
function init() {
  performanceMark('lazy-init-start');
  
  try {
    log('info', 'Initializing lazy loading');
    
    // Check for Intersection Observer support
    if (!isIntersectionObserverSupported()) {
      log('warn', 'Intersection Observer not supported, using fallback');
      initFallbackLazyLoading();
      performanceMark('lazy-init-end');
      performanceMeasure('lazy-init-time', 'lazy-init-start', 'lazy-init-end');
      return { destroy: () => {} };
    }
    
    // Create observer
    observerInstance = createObserver();
    
    // Observe all lazy images
    const images = document.querySelectorAll(SELECTORS.LAZY_IMAGE);
    
    if (images.length === 0) {
      log('info', 'No lazy images found');
      performanceMark('lazy-init-end');
      performanceMeasure('lazy-init-time', 'lazy-init-start', 'lazy-init-end');
      return { destroy: () => {} };
    }
    
    images.forEach((img) => {
      observerInstance.observe(img);
    });
    
    log('info', 'Lazy loading initialized', {
      imageCount: images.length,
    });
    
    performanceMark('lazy-init-end');
    performanceMeasure('lazy-init-time', 'lazy-init-start', 'lazy-init-end');
    
    // Return API for controlling lazy loading
    return {
      /**
       * Destroys the observer and cleans up
       */
      destroy() {
        if (observerInstance) {
          observerInstance.disconnect();
          observerInstance = null;
          log('info', 'Lazy loading destroyed');
        }
      },
      
      /**
       * Observes additional images
       * @param {HTMLElement|NodeList|Array} elements - Elements to observe
       */
      observe(elements) {
        if (!observerInstance) {
          log('warn', 'Observer not initialized');
          return;
        }
        
        const elementsArray = elements instanceof NodeList || Array.isArray(elements)
          ? Array.from(elements)
          : [elements];
        
        elementsArray.forEach((element) => {
          if (element instanceof HTMLImageElement && !loadedImages.has(element)) {
            observerInstance.observe(element);
          }
        });
        
        log('info', 'Observing additional images', {
          count: elementsArray.length,
        });
      },
      
      /**
       * Unobserves images
       * @param {HTMLElement|NodeList|Array} elements - Elements to unobserve
       */
      unobserve(elements) {
        if (!observerInstance) {
          log('warn', 'Observer not initialized');
          return;
        }
        
        const elementsArray = elements instanceof NodeList || Array.isArray(elements)
          ? Array.from(elements)
          : [elements];
        
        elementsArray.forEach((element) => {
          if (element instanceof HTMLImageElement) {
            observerInstance.unobserve(element);
          }
        });
        
        log('info', 'Unobserving images', {
          count: elementsArray.length,
        });
      },
      
      /**
       * Forces load of specific images
       * @param {HTMLElement|NodeList|Array} elements - Elements to load
       * @returns {Promise<void[]>}
       */
      async loadNow(elements) {
        const elementsArray = elements instanceof NodeList || Array.isArray(elements)
          ? Array.from(elements)
          : [elements];
        
        const loadPromises = elementsArray
          .filter((element) => element instanceof HTMLImageElement && !loadedImages.has(element))
          .map((img) => {
            img.classList.add(CONFIG.LOADING_CLASS);
            return loadImageWithRetry(img);
          });
        
        return Promise.allSettled(loadPromises);
      },
    };
  } catch (error) {
    log('error', 'Lazy loading initialization failed', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Auto-initializes lazy loading when DOM is ready
 */
function autoInit() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  init,
  autoInit,
  isIntersectionObserverSupported,
  CONFIG,
};

// Auto-initialize if not being imported as module
if (typeof module === 'undefined' || !module.exports) {
  autoInit();
}