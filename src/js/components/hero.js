/**
 * Hero Section Component
 * 
 * Provides hero section functionality including:
 * - Lazy loading of hero background images
 * - Smooth scrolling for call-to-action buttons
 * - Responsive image handling with srcset
 * - Intersection Observer for performance optimization
 * - Error handling and fallback mechanisms
 * 
 * @module components/hero
 * @generated-from: task-id:TASK-002
 * @modifies: none
 * @dependencies: [main.js]
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  LAZY_LOAD_ROOT_MARGIN: '50px',
  LAZY_LOAD_THRESHOLD: 0.01,
  IMAGE_LOAD_TIMEOUT: 10000,
  SCROLL_OFFSET: 80,
  SCROLL_BEHAVIOR: 'smooth',
  UNSPLASH_BASE_URL: 'https://images.unsplash.com',
  HERO_IMAGE_ID: 'photo-1438232992991-995b7058bbb3',
  IMAGE_QUALITY: 80,
  PERFORMANCE_MARK_PREFIX: 'gfc-hero',
});

const SELECTORS = Object.freeze({
  HERO_SECTION: '.hero',
  HERO_CONTAINER: '.hero__container',
  HERO_CTA_BUTTONS: '.hero__button',
  HERO_PRIMARY_BUTTON: '.hero__button--primary',
  HERO_SECONDARY_BUTTON: '.hero__button--secondary',
});

const CLASSES = Object.freeze({
  HERO_LOADED: 'hero--loaded',
  HERO_ERROR: 'hero--error',
  HERO_LOADING: 'hero--loading',
});

const BREAKPOINTS = Object.freeze({
  MOBILE: 320,
  TABLET: 768,
  DESKTOP: 1024,
  LARGE_DESKTOP: 1920,
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
    logError('Invalid selector', { selector, error: error.message });
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
    logError('Invalid selector', { selector, error: error.message });
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
    component: 'hero',
    message,
    ...context,
  };
  
  const logMethod = console[level] || console.log;
  logMethod('[GFC:Hero]', message, context);
  
  if (typeof window.gtag === 'function' && level === 'error') {
    window.gtag('event', 'exception', {
      description: `Hero: ${message}`,
      fatal: false,
    });
  }
}

/**
 * Convenience logging functions
 */
const logInfo = (message, context) => log('info', message, context);
const logWarn = (message, context) => log('warn', message, context);
const logError = (message, context) => log('error', message, context);

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
        logInfo('Performance measure', {
          name,
          duration: measure.duration.toFixed(2),
        });
        return measure.duration;
      }
    } catch (error) {
      // Silently fail if performance API not available
    }
  }
  return null;
}

// ============================================================================
// IMAGE HANDLING
// ============================================================================

/**
 * Generates responsive image URLs for different screen sizes
 * @param {string} imageId - Unsplash image ID
 * @returns {Object} Object containing URLs for different sizes
 */
function generateResponsiveImageUrls(imageId) {
  const baseUrl = `${CONFIG.UNSPLASH_BASE_URL}/${imageId}`;
  const quality = `q=${CONFIG.IMAGE_QUALITY}`;
  const format = 'auto=format';
  const fit = 'fit=crop';
  
  return {
    mobile: `${baseUrl}?w=${BREAKPOINTS.MOBILE}&${quality}&${format}&${fit}`,
    tablet: `${baseUrl}?w=${BREAKPOINTS.TABLET}&${quality}&${format}&${fit}`,
    desktop: `${baseUrl}?w=${BREAKPOINTS.DESKTOP}&${quality}&${format}&${fit}`,
    largeDesktop: `${baseUrl}?w=${BREAKPOINTS.LARGE_DESKTOP}&${quality}&${format}&${fit}`,
    fallback: `${baseUrl}?w=${BREAKPOINTS.DESKTOP}&${quality}&${format}&${fit}`,
  };
}

/**
 * Gets the appropriate image URL based on current viewport width
 * @param {Object} urls - Object containing URLs for different sizes
 * @returns {string} Appropriate image URL
 */
function getImageUrlForViewport(urls) {
  const width = window.innerWidth;
  
  if (width >= BREAKPOINTS.LARGE_DESKTOP) {
    return urls.largeDesktop;
  }
  if (width >= BREAKPOINTS.DESKTOP) {
    return urls.desktop;
  }
  if (width >= BREAKPOINTS.TABLET) {
    return urls.tablet;
  }
  return urls.mobile;
}

/**
 * Preloads an image with timeout and error handling
 * @param {string} url - Image URL to preload
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<HTMLImageElement>} Promise resolving to loaded image
 */
function preloadImage(url, timeout = CONFIG.IMAGE_LOAD_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let timeoutId = null;
    
    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      img.onload = null;
      img.onerror = null;
    };
    
    img.onload = () => {
      cleanup();
      resolve(img);
    };
    
    img.onerror = () => {
      cleanup();
      reject(new Error(`Failed to load image: ${url}`));
    };
    
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Image load timeout: ${url}`));
    }, timeout);
    
    img.src = url;
  });
}

/**
 * Applies background image to hero section with error handling
 * @param {Element} heroSection - Hero section element
 * @param {string} imageUrl - Image URL to apply
 * @returns {Promise<void>}
 */
async function applyHeroBackgroundImage(heroSection, imageUrl) {
  if (!heroSection) {
    throw new Error('Hero section element not found');
  }
  
  performanceMark('image-load-start');
  
  try {
    await preloadImage(imageUrl);
    
    heroSection.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${imageUrl}')`;
    heroSection.classList.remove(CLASSES.HERO_LOADING, CLASSES.HERO_ERROR);
    heroSection.classList.add(CLASSES.HERO_LOADED);
    
    performanceMark('image-load-end');
    performanceMeasure('hero-image-load', 'image-load-start', 'image-load-end');
    
    logInfo('Hero background image loaded successfully', { imageUrl });
  } catch (error) {
    heroSection.classList.remove(CLASSES.HERO_LOADING);
    heroSection.classList.add(CLASSES.HERO_ERROR);
    
    logError('Failed to load hero background image', {
      imageUrl,
      error: error.message,
    });
    
    throw error;
  }
}

// ============================================================================
// LAZY LOADING
// ============================================================================

/**
 * Creates an Intersection Observer for lazy loading
 * @param {Function} callback - Callback function when element intersects
 * @returns {IntersectionObserver|null} Intersection Observer instance or null
 */
function createLazyLoadObserver(callback) {
  if (!('IntersectionObserver' in window)) {
    logWarn('IntersectionObserver not supported, loading immediately');
    return null;
  }
  
  try {
    const options = {
      root: null,
      rootMargin: CONFIG.LAZY_LOAD_ROOT_MARGIN,
      threshold: CONFIG.LAZY_LOAD_THRESHOLD,
    };
    
    return new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, options);
  } catch (error) {
    logError('Failed to create IntersectionObserver', { error: error.message });
    return null;
  }
}

/**
 * Initializes lazy loading for hero section
 * @param {Element} heroSection - Hero section element
 */
function initLazyLoading(heroSection) {
  if (!heroSection) {
    logWarn('Hero section not found for lazy loading');
    return;
  }
  
  heroSection.classList.add(CLASSES.HERO_LOADING);
  
  const imageUrls = generateResponsiveImageUrls(CONFIG.HERO_IMAGE_ID);
  const imageUrl = getImageUrlForViewport(imageUrls);
  
  const observer = createLazyLoadObserver(async (element) => {
    try {
      await applyHeroBackgroundImage(element, imageUrl);
    } catch (error) {
      logError('Lazy loading failed, attempting fallback', { error: error.message });
      
      try {
        await applyHeroBackgroundImage(element, imageUrls.fallback);
      } catch (fallbackError) {
        logError('Fallback image loading failed', { error: fallbackError.message });
      }
    }
  });
  
  if (observer) {
    observer.observe(heroSection);
    logInfo('Lazy loading initialized for hero section');
  } else {
    applyHeroBackgroundImage(heroSection, imageUrl).catch((error) => {
      logError('Immediate image loading failed', { error: error.message });
    });
  }
}

// ============================================================================
// RESPONSIVE IMAGE HANDLING
// ============================================================================

/**
 * Handles viewport resize for responsive images
 * @param {Element} heroSection - Hero section element
 */
function handleResponsiveImages(heroSection) {
  if (!heroSection) {
    return;
  }
  
  let resizeTimeout = null;
  const imageUrls = generateResponsiveImageUrls(CONFIG.HERO_IMAGE_ID);
  let currentImageUrl = getImageUrlForViewport(imageUrls);
  
  const handleResize = () => {
    if (resizeTimeout !== null) {
      clearTimeout(resizeTimeout);
    }
    
    resizeTimeout = setTimeout(() => {
      const newImageUrl = getImageUrlForViewport(imageUrls);
      
      if (newImageUrl !== currentImageUrl && heroSection.classList.contains(CLASSES.HERO_LOADED)) {
        currentImageUrl = newImageUrl;
        
        applyHeroBackgroundImage(heroSection, newImageUrl).catch((error) => {
          logError('Failed to update responsive image', { error: error.message });
        });
      }
      
      resizeTimeout = null;
    }, 250);
  };
  
  window.addEventListener('resize', handleResize, { passive: true });
  
  logInfo('Responsive image handling initialized');
}

// ============================================================================
// SMOOTH SCROLLING
// ============================================================================

/**
 * Handles smooth scrolling for CTA buttons
 * @param {Event} event - Click event
 */
function handleCtaButtonClick(event) {
  const button = event.currentTarget;
  const href = button.getAttribute('href');
  
  if (!href || !href.startsWith('#')) {
    return;
  }
  
  event.preventDefault();
  
  const targetId = href.substring(1);
  const targetElement = document.getElementById(targetId);
  
  if (!targetElement) {
    logWarn('Scroll target not found', { targetId });
    return;
  }
  
  try {
    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = targetPosition - CONFIG.SCROLL_OFFSET;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: CONFIG.SCROLL_BEHAVIOR,
    });
    
    if (history.pushState) {
      history.pushState(null, '', href);
    }
    
    targetElement.setAttribute('tabindex', '-1');
    targetElement.focus({ preventScroll: true });
    
    logInfo('CTA button smooth scroll completed', { targetId });
  } catch (error) {
    logError('CTA button smooth scroll failed', { targetId, error: error.message });
    targetElement.scrollIntoView();
  }
}

/**
 * Initializes CTA button interactions
 */
function initCtaButtons() {
  const ctaButtons = querySelectorAll(SELECTORS.HERO_CTA_BUTTONS);
  
  if (ctaButtons.length === 0) {
    logWarn('No CTA buttons found in hero section');
    return;
  }
  
  ctaButtons.forEach((button) => {
    button.addEventListener('click', handleCtaButtonClick);
  });
  
  logInfo('CTA buttons initialized', { count: ctaButtons.length });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes all hero section functionality
 */
function initHero() {
  performanceMark('hero-init-start');
  
  try {
    logInfo('Initializing hero section');
    
    const heroSection = querySelector(SELECTORS.HERO_SECTION);
    
    if (!heroSection) {
      logWarn('Hero section not found in DOM');
      return;
    }
    
    initLazyLoading(heroSection);
    handleResponsiveImages(heroSection);
    initCtaButtons();
    
    performanceMark('hero-init-end');
    performanceMeasure('hero-total-init', 'hero-init-start', 'hero-init-end');
    
    logInfo('Hero section initialization complete');
  } catch (error) {
    logError('Hero section initialization failed', {
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
    document.addEventListener('DOMContentLoaded', initHero);
  } else {
    initHero();
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

handleDOMReady();

// Export for testing purposes
export {
  initHero,
  initLazyLoading,
  initCtaButtons,
  handleCtaButtonClick,
  generateResponsiveImageUrls,
  getImageUrlForViewport,
  preloadImage,
  applyHeroBackgroundImage,
};