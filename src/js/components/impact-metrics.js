/**
 * Impact Metrics Component
 * 
 * Provides animated counters and data visualization for community impact metrics.
 * Features:
 * - Animated number counters with easing
 * - Progress bar animations
 * - Intersection Observer for scroll-triggered animations
 * - Data loading from JSON
 * - Accessibility support with ARIA attributes
 * - Performance optimized with RAF and debouncing
 * 
 * @module components/impact-metrics
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  ANIMATION_DURATION: 2000,
  ANIMATION_EASING: 'easeOutQuart',
  INTERSECTION_THRESHOLD: 0.2,
  INTERSECTION_ROOT_MARGIN: '0px 0px -100px 0px',
  NUMBER_FORMAT_LOCALE: 'en-US',
  DEBOUNCE_DELAY: 100,
  RAF_THROTTLE: 16,
});

const SELECTORS = Object.freeze({
  METRICS_CONTAINER: '[data-impact-metrics]',
  METRIC_CARD: '[data-metric-card]',
  METRIC_NUMBER: '[data-metric-number]',
  METRIC_PROGRESS: '[data-metric-progress]',
  METRIC_PROGRESS_FILL: '[data-metric-progress-fill]',
});

const ATTRIBUTES = Object.freeze({
  TARGET_VALUE: 'data-target-value',
  ANIMATED: 'data-animated',
  PROGRESS_TARGET: 'data-progress-target',
  SUFFIX: 'data-suffix',
  PREFIX: 'data-prefix',
});

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

const EASING_FUNCTIONS = Object.freeze({
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats a number with locale-specific formatting
 * @param {number} value - Number to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number string
 */
function formatNumber(value, options = {}) {
  try {
    const formatter = new Intl.NumberFormat(CONFIG.NUMBER_FORMAT_LOCALE, {
      maximumFractionDigits: options.decimals || 0,
      minimumFractionDigits: options.decimals || 0,
      ...options,
    });
    return formatter.format(value);
  } catch (error) {
    console.error('[Impact Metrics] Number formatting failed:', error);
    return String(Math.round(value));
  }
}

/**
 * Parses a numeric value from string or number
 * @param {string|number} value - Value to parse
 * @returns {number} Parsed number or 0 if invalid
 */
function parseNumericValue(value) {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}

/**
 * Safely queries a single DOM element
 * @param {string} selector - CSS selector
 * @param {Element} context - Context element
 * @returns {Element|null} Found element or null
 */
function querySelector(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.error('[Impact Metrics] Invalid selector:', selector, error);
    return null;
  }
}

/**
 * Safely queries multiple DOM elements
 * @param {string} selector - CSS selector
 * @param {Element} context - Context element
 * @returns {NodeList} NodeList of found elements
 */
function querySelectorAll(selector, context = document) {
  try {
    return context.querySelectorAll(selector);
  } catch (error) {
    console.error('[Impact Metrics] Invalid selector:', selector, error);
    return document.createDocumentFragment().childNodes;
  }
}

/**
 * Logs structured messages with context
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
function log(level, message, context = {}) {
  const logMethod = console[level] || console.log;
  logMethod('[Impact Metrics]', message, context);
}

// ============================================================================
// ANIMATION ENGINE
// ============================================================================

/**
 * Animates a number counter from start to end value
 * @param {Element} element - Target element
 * @param {number} startValue - Starting value
 * @param {number} endValue - Ending value
 * @param {number} duration - Animation duration in ms
 * @param {Function} onUpdate - Callback for each frame
 * @returns {Object} Animation controller with cancel method
 */
function animateNumber(element, startValue, endValue, duration, onUpdate) {
  let startTime = null;
  let rafId = null;
  let cancelled = false;

  const easingFn = EASING_FUNCTIONS[CONFIG.ANIMATION_EASING] || EASING_FUNCTIONS.easeOutQuart;

  function animate(currentTime) {
    if (cancelled) {
      return;
    }

    if (!startTime) {
      startTime = currentTime;
    }

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easingFn(progress);
    const currentValue = startValue + (endValue - startValue) * easedProgress;

    if (onUpdate) {
      onUpdate(currentValue, progress);
    }

    if (progress < 1) {
      rafId = requestAnimationFrame(animate);
    } else {
      element.setAttribute(ATTRIBUTES.ANIMATED, 'true');
      log('info', 'Counter animation completed', { endValue });
    }
  }

  rafId = requestAnimationFrame(animate);

  return {
    cancel: () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
}

/**
 * Animates a progress bar from 0 to target percentage
 * @param {Element} element - Progress fill element
 * @param {number} targetPercent - Target percentage (0-100)
 * @param {number} duration - Animation duration in ms
 * @returns {Object} Animation controller with cancel method
 */
function animateProgress(element, targetPercent, duration) {
  const clampedTarget = Math.max(0, Math.min(100, targetPercent));
  
  return animateNumber(element, 0, clampedTarget, duration, (currentValue) => {
    element.style.width = `${currentValue}%`;
    element.setAttribute('aria-valuenow', Math.round(currentValue));
  });
}

// ============================================================================
// COUNTER COMPONENT
// ============================================================================

class MetricCounter {
  constructor(element) {
    this.element = element;
    this.targetValue = parseNumericValue(element.getAttribute(ATTRIBUTES.TARGET_VALUE));
    this.prefix = element.getAttribute(ATTRIBUTES.PREFIX) || '';
    this.suffix = element.getAttribute(ATTRIBUTES.SUFFIX) || '';
    this.isAnimated = element.getAttribute(ATTRIBUTES.ANIMATED) === 'true';
    this.animation = null;
  }

  /**
   * Starts the counter animation
   */
  animate() {
    if (this.isAnimated) {
      log('info', 'Counter already animated, skipping', { value: this.targetValue });
      return;
    }

    const startValue = 0;
    const duration = CONFIG.ANIMATION_DURATION;

    this.animation = animateNumber(
      this.element,
      startValue,
      this.targetValue,
      duration,
      (currentValue) => {
        const formattedValue = formatNumber(currentValue);
        this.element.textContent = `${this.prefix}${formattedValue}${this.suffix}`;
      }
    );

    log('info', 'Counter animation started', { 
      target: this.targetValue,
      duration,
    });
  }

  /**
   * Cancels the counter animation
   */
  cancel() {
    if (this.animation) {
      this.animation.cancel();
      this.animation = null;
    }
  }

  /**
   * Resets the counter to initial state
   */
  reset() {
    this.cancel();
    this.element.textContent = `${this.prefix}0${this.suffix}`;
    this.element.removeAttribute(ATTRIBUTES.ANIMATED);
    this.isAnimated = false;
  }
}

// ============================================================================
// PROGRESS BAR COMPONENT
// ============================================================================

class MetricProgress {
  constructor(element) {
    this.element = element;
    this.fillElement = querySelector(SELECTORS.METRIC_PROGRESS_FILL, element);
    this.targetPercent = parseNumericValue(element.getAttribute(ATTRIBUTES.PROGRESS_TARGET));
    this.isAnimated = element.getAttribute(ATTRIBUTES.ANIMATED) === 'true';
    this.animation = null;

    if (this.fillElement) {
      this.fillElement.setAttribute('role', 'progressbar');
      this.fillElement.setAttribute('aria-valuemin', '0');
      this.fillElement.setAttribute('aria-valuemax', '100');
      this.fillElement.setAttribute('aria-valuenow', '0');
    }
  }

  /**
   * Starts the progress bar animation
   */
  animate() {
    if (this.isAnimated || !this.fillElement) {
      return;
    }

    const duration = CONFIG.ANIMATION_DURATION;

    this.animation = animateProgress(
      this.fillElement,
      this.targetPercent,
      duration
    );

    this.element.setAttribute(ATTRIBUTES.ANIMATED, 'true');
    this.isAnimated = true;

    log('info', 'Progress animation started', { 
      target: this.targetPercent,
      duration,
    });
  }

  /**
   * Cancels the progress bar animation
   */
  cancel() {
    if (this.animation) {
      this.animation.cancel();
      this.animation = null;
    }
  }

  /**
   * Resets the progress bar to initial state
   */
  reset() {
    this.cancel();
    if (this.fillElement) {
      this.fillElement.style.width = '0%';
      this.fillElement.setAttribute('aria-valuenow', '0');
    }
    this.element.removeAttribute(ATTRIBUTES.ANIMATED);
    this.isAnimated = false;
  }
}

// ============================================================================
// INTERSECTION OBSERVER
// ============================================================================

class MetricsObserver {
  constructor(onIntersect) {
    this.onIntersect = onIntersect;
    this.observer = null;
    this.observedElements = new Set();
  }

  /**
   * Initializes the intersection observer
   */
  init() {
    if (!('IntersectionObserver' in window)) {
      log('warn', 'IntersectionObserver not supported, triggering animations immediately');
      this.onIntersect(Array.from(this.observedElements));
      return;
    }

    const options = {
      threshold: CONFIG.INTERSECTION_THRESHOLD,
      rootMargin: CONFIG.INTERSECTION_ROOT_MARGIN,
    };

    this.observer = new IntersectionObserver((entries) => {
      const intersectingElements = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target);

      if (intersectingElements.length > 0) {
        this.onIntersect(intersectingElements);
      }
    }, options);

    log('info', 'Intersection observer initialized', options);
  }

  /**
   * Observes an element for intersection
   * @param {Element} element - Element to observe
   */
  observe(element) {
    if (!element) {
      return;
    }

    this.observedElements.add(element);

    if (this.observer) {
      this.observer.observe(element);
    }
  }

  /**
   * Stops observing an element
   * @param {Element} element - Element to unobserve
   */
  unobserve(element) {
    if (!element) {
      return;
    }

    this.observedElements.delete(element);

    if (this.observer) {
      this.observer.unobserve(element);
    }
  }

  /**
   * Disconnects the observer and cleans up
   */
  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.observedElements.clear();
  }
}

// ============================================================================
// MAIN CONTROLLER
// ============================================================================

class ImpactMetrics {
  constructor(container) {
    this.container = container;
    this.counters = new Map();
    this.progressBars = new Map();
    this.observer = null;
    this.isInitialized = false;
  }

  /**
   * Initializes the impact metrics component
   */
  init() {
    if (this.isInitialized) {
      log('warn', 'Impact metrics already initialized');
      return;
    }

    try {
      this.initializeCounters();
      this.initializeProgressBars();
      this.initializeObserver();
      this.isInitialized = true;

      log('info', 'Impact metrics initialized', {
        counters: this.counters.size,
        progressBars: this.progressBars.size,
      });
    } catch (error) {
      log('error', 'Impact metrics initialization failed', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Initializes all counter elements
   */
  initializeCounters() {
    const counterElements = querySelectorAll(SELECTORS.METRIC_NUMBER, this.container);

    counterElements.forEach((element) => {
      const counter = new MetricCounter(element);
      this.counters.set(element, counter);
    });

    log('info', 'Counters initialized', { count: this.counters.size });
  }

  /**
   * Initializes all progress bar elements
   */
  initializeProgressBars() {
    const progressElements = querySelectorAll(SELECTORS.METRIC_PROGRESS, this.container);

    progressElements.forEach((element) => {
      const progress = new MetricProgress(element);
      this.progressBars.set(element, progress);
    });

    log('info', 'Progress bars initialized', { count: this.progressBars.size });
  }

  /**
   * Initializes the intersection observer
   */
  initializeObserver() {
    this.observer = new MetricsObserver((elements) => {
      this.handleIntersection(elements);
    });

    this.observer.init();

    const metricCards = querySelectorAll(SELECTORS.METRIC_CARD, this.container);
    metricCards.forEach((card) => {
      this.observer.observe(card);
    });
  }

  /**
   * Handles intersection of metric cards
   * @param {Element[]} elements - Intersecting elements
   */
  handleIntersection(elements) {
    elements.forEach((card) => {
      const counterElement = querySelector(SELECTORS.METRIC_NUMBER, card);
      const progressElement = querySelector(SELECTORS.METRIC_PROGRESS, card);

      if (counterElement) {
        const counter = this.counters.get(counterElement);
        if (counter && !counter.isAnimated) {
          counter.animate();
        }
      }

      if (progressElement) {
        const progress = this.progressBars.get(progressElement);
        if (progress && !progress.isAnimated) {
          progress.animate();
        }
      }

      if (this.observer) {
        this.observer.unobserve(card);
      }
    });
  }

  /**
   * Resets all animations
   */
  reset() {
    this.counters.forEach((counter) => counter.reset());
    this.progressBars.forEach((progress) => progress.reset());

    const metricCards = querySelectorAll(SELECTORS.METRIC_CARD, this.container);
    metricCards.forEach((card) => {
      if (this.observer) {
        this.observer.observe(card);
      }
    });

    log('info', 'Impact metrics reset');
  }

  /**
   * Destroys the component and cleans up resources
   */
  destroy() {
    this.counters.forEach((counter) => counter.cancel());
    this.progressBars.forEach((progress) => progress.cancel());

    if (this.observer) {
      this.observer.disconnect();
    }

    this.counters.clear();
    this.progressBars.clear();
    this.isInitialized = false;

    log('info', 'Impact metrics destroyed');
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes all impact metrics components on the page
 */
function initImpactMetrics() {
  const containers = querySelectorAll(SELECTORS.METRICS_CONTAINER);

  if (containers.length === 0) {
    log('info', 'No impact metrics containers found');
    return;
  }

  const instances = [];

  containers.forEach((container) => {
    try {
      const metrics = new ImpactMetrics(container);
      metrics.init();
      instances.push(metrics);
    } catch (error) {
      log('error', 'Failed to initialize impact metrics container', {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  log('info', 'All impact metrics initialized', { count: instances.length });

  return instances;
}

/**
 * Auto-initializes on DOM ready
 */
function handleDOMReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImpactMetrics);
  } else {
    initImpactMetrics();
  }
}

// Start initialization
handleDOMReady();

// Export for manual initialization if needed
export {
  ImpactMetrics,
  MetricCounter,
  MetricProgress,
  initImpactMetrics,
  animateNumber,
  animateProgress,
  formatNumber,
};