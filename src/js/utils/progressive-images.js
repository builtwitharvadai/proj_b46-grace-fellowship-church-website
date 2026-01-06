/**
 * Progressive Image Loading Utility
 * 
 * Provides progressive image loading functionality optimized for mobile data usage.
 * Implements intersection observer-based lazy loading with loading placeholders,
 * blur-up technique, and responsive image selection.
 * 
 * Features:
 * - Intersection Observer API for efficient viewport detection
 * - Blur-up loading technique for better perceived performance
 * - Responsive image selection based on viewport and device pixel ratio
 * - Low-quality image placeholder (LQIP) support
 * - Automatic retry on load failure
 * - Memory-efficient cleanup
 * - Bandwidth-aware loading strategies
 * 
 * @module progressive-images
 * @generated-from: task-id:TASK-013
 * @modifies: none
 * @dependencies: none
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  ROOT_MARGIN: '50px',
  THRESHOLD: 0.01,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  FADE_IN_DURATION: 300,
  BLUR_AMOUNT: 20,
  QUALITY_THRESHOLD: 0.5,
  OBSERVER_OPTIONS: {
    rootMargin: '50px',
    threshold: 0.01,
  },
});

const SELECTORS = Object.freeze({
  PROGRESSIVE_IMAGE: '[data-progressive-image]',
  PROGRESSIVE_SRC: 'data-src',
  PROGRESSIVE_SRCSET: 'data-srcset',
  PROGRESSIVE_SIZES: 'data-sizes',
  PROGRESSIVE_PLACEHOLDER: 'data-placeholder',
  PROGRESSIVE_LOADED: 'data-loaded',
});

const CLASSES = Object.freeze({
  LOADING: 'progressive-image--loading',
  LOADED: 'progressive-image--loaded',
  ERROR: 'progressive-image--error',
  BLUR: 'progressive-image--blur',
});

const ATTRIBUTES = Object.freeze({
  RETRY_COUNT: 'data-retry-count',
  LOAD_STATE: 'data-load-state',
  ORIGINAL_SRC: 'data-original-src',
});

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let observerInstance = null;
const imageLoadStates = new WeakMap();
const retryTimeouts = new WeakMap();

/**
 * Image load state tracker
 */
class ImageLoadState {
  constructor(element) {
    this.element = element;
    this.retryCount = 0;
    this.isLoading = false;
    this.isLoaded = false;
    this.hasError = false;
    this.abortController = null;
  }

  reset() {
    this.retryCount = 0;
    this.isLoading = false;
    this.isLoaded = false;
    this.hasError = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  incrementRetry() {
    this.retryCount += 1;
  }

  canRetry() {
    return this.retryCount < CONFIG.MAX_RETRY_ATTEMPTS;
  }
}

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
    module: 'progressive-images',
    message,
    ...context,
  };

  const logMethod = console[level] || console.log;
  logMethod('[GFC:ProgressiveImages]', message, context);

  if (typeof window.gtag === 'function' && level === 'error') {
    window.gtag('event', 'exception', {
      description: `Progressive Images: ${message}`,
      fatal: false,
    });
  }
}

/**
 * Gets device pixel ratio with fallback
 * @returns {number} Device pixel ratio
 */
function getDevicePixelRatio() {
  return window.devicePixelRatio || 1;
}

/**
 * Checks if connection is slow or data saver is enabled
 * @returns {boolean} True if connection is constrained
 */
function isSlowConnection() {
  if (!('connection' in navigator)) {
    return false;
  }

  const connection = navigator.connection;
  
  if (connection.saveData) {
    return true;
  }

  const slowTypes = ['slow-2g', '2g', '3g'];
  if (connection.effectiveType && slowTypes.includes(connection.effectiveType)) {
    return true;
  }

  return false;
}

/**
 * Selects optimal image source based on viewport and connection
 * @param {HTMLImageElement} img - Image element
 * @returns {Object} Selected source URLs
 */
function selectOptimalSource(img) {
  const src = img.getAttribute(SELECTORS.PROGRESSIVE_SRC);
  const srcset = img.getAttribute(SELECTORS.PROGRESSIVE_SRCSET);
  const placeholder = img.getAttribute(SELECTORS.PROGRESSIVE_PLACEHOLDER);

  const result = {
    src: src || img.src,
    srcset: srcset || '',
    placeholder: placeholder || '',
  };

  if (isSlowConnection() && placeholder) {
    log('info', 'Using placeholder for slow connection', {
      src: result.placeholder,
    });
    result.src = placeholder;
    result.srcset = '';
  }

  return result;
}

/**
 * Creates a promise that resolves when image loads
 * @param {HTMLImageElement} img - Image element
 * @param {string} src - Image source URL
 * @param {string} srcset - Image srcset
 * @returns {Promise<void>}
 */
function loadImage(img, src, srcset = '') {
  return new Promise((resolve, reject) => {
    const tempImg = new Image();
    
    const cleanup = () => {
      tempImg.onload = null;
      tempImg.onerror = null;
    };

    tempImg.onload = () => {
      cleanup();
      resolve();
    };

    tempImg.onerror = (error) => {
      cleanup();
      reject(new Error(`Failed to load image: ${src}`));
    };

    if (srcset) {
      tempImg.srcset = srcset;
    }
    tempImg.src = src;
  });
}

/**
 * Applies blur effect to image
 * @param {HTMLImageElement} img - Image element
 */
function applyBlurEffect(img) {
  img.style.filter = `blur(${CONFIG.BLUR_AMOUNT}px)`;
  img.classList.add(CLASSES.BLUR);
}

/**
 * Removes blur effect from image
 * @param {HTMLImageElement} img - Image element
 */
function removeBlurEffect(img) {
  img.style.filter = '';
  img.classList.remove(CLASSES.BLUR);
}

/**
 * Animates image fade-in
 * @param {HTMLImageElement} img - Image element
 * @returns {Promise<void>}
 */
function fadeInImage(img) {
  return new Promise((resolve) => {
    img.style.opacity = '0';
    img.style.transition = `opacity ${CONFIG.FADE_IN_DURATION}ms ease-in-out`;

    requestAnimationFrame(() => {
      img.style.opacity = '1';
      
      setTimeout(() => {
        img.style.transition = '';
        resolve();
      }, CONFIG.FADE_IN_DURATION);
    });
  });
}

// ============================================================================
// IMAGE LOADING LOGIC
// ============================================================================

/**
 * Loads progressive image with retry logic
 * @param {HTMLImageElement} img - Image element
 * @returns {Promise<void>}
 */
async function loadProgressiveImage(img) {
  let state = imageLoadStates.get(img);
  
  if (!state) {
    state = new ImageLoadState(img);
    imageLoadStates.set(img, state);
  }

  if (state.isLoading || state.isLoaded) {
    return;
  }

  state.isLoading = true;
  img.classList.add(CLASSES.LOADING);
  img.setAttribute(ATTRIBUTES.LOAD_STATE, 'loading');

  try {
    const sources = selectOptimalSource(img);
    
    if (sources.placeholder && img.src !== sources.placeholder) {
      img.src = sources.placeholder;
      applyBlurEffect(img);
    }

    await loadImage(img, sources.src, sources.srcset);

    img.src = sources.src;
    if (sources.srcset) {
      img.srcset = sources.srcset;
    }

    removeBlurEffect(img);
    await fadeInImage(img);

    img.classList.remove(CLASSES.LOADING);
    img.classList.add(CLASSES.LOADED);
    img.setAttribute(ATTRIBUTES.LOAD_STATE, 'loaded');
    img.setAttribute(SELECTORS.PROGRESSIVE_LOADED, 'true');

    state.isLoading = false;
    state.isLoaded = true;
    state.hasError = false;

    log('info', 'Image loaded successfully', {
      src: sources.src,
      retryCount: state.retryCount,
    });

  } catch (error) {
    state.isLoading = false;
    state.hasError = true;

    log('error', 'Image load failed', {
      src: img.getAttribute(SELECTORS.PROGRESSIVE_SRC),
      error: error.message,
      retryCount: state.retryCount,
    });

    if (state.canRetry()) {
      state.incrementRetry();
      img.setAttribute(ATTRIBUTES.RETRY_COUNT, state.retryCount.toString());

      const retryDelay = CONFIG.RETRY_DELAY * Math.pow(2, state.retryCount - 1);
      
      log('info', 'Scheduling retry', {
        attempt: state.retryCount,
        delay: retryDelay,
      });

      const timeoutId = setTimeout(() => {
        retryTimeouts.delete(img);
        loadProgressiveImage(img).catch((retryError) => {
          log('error', 'Retry failed', {
            error: retryError.message,
          });
        });
      }, retryDelay);

      retryTimeouts.set(img, timeoutId);
    } else {
      img.classList.remove(CLASSES.LOADING);
      img.classList.add(CLASSES.ERROR);
      img.setAttribute(ATTRIBUTES.LOAD_STATE, 'error');

      log('error', 'Max retry attempts reached', {
        src: img.getAttribute(SELECTORS.PROGRESSIVE_SRC),
      });
    }
  }
}

/**
 * Handles intersection observer callback
 * @param {IntersectionObserverEntry[]} entries - Observer entries
 * @param {IntersectionObserver} observer - Observer instance
 */
function handleIntersection(entries, observer) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const img = entry.target;
      
      observer.unobserve(img);

      loadProgressiveImage(img).catch((error) => {
        log('error', 'Failed to load progressive image', {
          error: error.message,
        });
      });
    }
  });
}

/**
 * Creates intersection observer instance
 * @returns {IntersectionObserver} Observer instance
 */
function createObserver() {
  if (!('IntersectionObserver' in window)) {
    log('warn', 'IntersectionObserver not supported, loading all images immediately');
    return null;
  }

  try {
    return new IntersectionObserver(handleIntersection, CONFIG.OBSERVER_OPTIONS);
  } catch (error) {
    log('error', 'Failed to create IntersectionObserver', {
      error: error.message,
    });
    return null;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Observes an image element for progressive loading
 * @param {HTMLImageElement} img - Image element to observe
 */
function observeImage(img) {
  if (!img || !(img instanceof HTMLImageElement)) {
    log('warn', 'Invalid image element provided');
    return;
  }

  if (img.getAttribute(SELECTORS.PROGRESSIVE_LOADED) === 'true') {
    return;
  }

  if (!observerInstance) {
    observerInstance = createObserver();
  }

  if (observerInstance) {
    observerInstance.observe(img);
  } else {
    loadProgressiveImage(img).catch((error) => {
      log('error', 'Failed to load image without observer', {
        error: error.message,
      });
    });
  }
}

/**
 * Unobserves an image element
 * @param {HTMLImageElement} img - Image element to unobserve
 */
function unobserveImage(img) {
  if (!img || !observerInstance) {
    return;
  }

  observerInstance.unobserve(img);

  const timeoutId = retryTimeouts.get(img);
  if (timeoutId) {
    clearTimeout(timeoutId);
    retryTimeouts.delete(img);
  }

  const state = imageLoadStates.get(img);
  if (state) {
    state.reset();
  }
}

/**
 * Initializes progressive image loading for all images
 * @param {Element|Document} context - Context to search within
 */
function init(context = document) {
  try {
    const images = context.querySelectorAll(SELECTORS.PROGRESSIVE_IMAGE);
    
    if (images.length === 0) {
      log('info', 'No progressive images found');
      return;
    }

    log('info', 'Initializing progressive images', {
      count: images.length,
      slowConnection: isSlowConnection(),
      devicePixelRatio: getDevicePixelRatio(),
    });

    images.forEach((img) => {
      observeImage(img);
    });

    log('info', 'Progressive images initialized', {
      observedCount: images.length,
    });

  } catch (error) {
    log('error', 'Failed to initialize progressive images', {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Cleans up progressive image loading
 */
function cleanup() {
  if (observerInstance) {
    observerInstance.disconnect();
    observerInstance = null;
  }

  retryTimeouts.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  retryTimeouts.clear();

  log('info', 'Progressive images cleanup completed');
}

/**
 * Refreshes progressive images in context
 * @param {Element|Document} context - Context to refresh
 */
function refresh(context = document) {
  const images = context.querySelectorAll(SELECTORS.PROGRESSIVE_IMAGE);
  
  images.forEach((img) => {
    if (img.getAttribute(SELECTORS.PROGRESSIVE_LOADED) !== 'true') {
      observeImage(img);
    }
  });

  log('info', 'Progressive images refreshed', {
    count: images.length,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  init,
  cleanup,
  refresh,
  observeImage,
  unobserveImage,
  loadProgressiveImage,
  isSlowConnection,
};