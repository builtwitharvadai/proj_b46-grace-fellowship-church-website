/**
 * Testimonials Carousel Component
 * 
 * Provides interactive testimonials carousel with:
 * - Auto-rotation with configurable interval
 * - Manual navigation (prev/next buttons)
 * - Indicator dots for direct navigation
 * - Pause on hover/focus
 * - Keyboard navigation (arrow keys)
 * - Touch/swipe support for mobile
 * - Accessibility announcements for screen readers
 * - Reduced motion support
 * 
 * @module components/testimonials
 * @requires none - vanilla JavaScript implementation
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  AUTO_ROTATE_INTERVAL: 7000,
  SWIPE_THRESHOLD: 50,
  TRANSITION_DURATION: 500,
  KEYBOARD_ENABLED: true,
  TOUCH_ENABLED: true,
  ANNOUNCEMENT_DELAY: 100,
});

const SELECTORS = Object.freeze({
  CAROUSEL: '.testimonials__carousel',
  TRACK: '.testimonials__track',
  PREV_BUTTON: '.testimonials__button--prev',
  NEXT_BUTTON: '.testimonials__button--next',
  INDICATORS: '.testimonials__indicators',
  INDICATOR: '.testimonials__indicator',
  CARDS: '.testimonial-card',
});

const CLASSES = Object.freeze({
  TRANSITIONING: 'testimonials__track--transitioning',
});

const ARIA = Object.freeze({
  LIVE_REGION: 'aria-live',
  SELECTED: 'aria-selected',
  DISABLED: 'disabled',
  LABEL: 'aria-label',
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
    console.error('[Testimonials] Invalid selector:', selector, error);
    return null;
  }
}

/**
 * Safely queries multiple DOM elements
 * @param {string} selector - CSS selector
 * @param {Element} context - Context element
 * @returns {NodeList} NodeList of elements
 */
function querySelectorAll(selector, context = document) {
  try {
    return context.querySelectorAll(selector);
  } catch (error) {
    console.error('[Testimonials] Invalid selector:', selector, error);
    return [];
  }
}

/**
 * Checks if user prefers reduced motion
 * @returns {boolean} True if reduced motion preferred
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Clamps a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Announces message to screen readers
 * @param {string} message - Message to announce
 * @param {Element} liveRegion - Live region element
 */
function announceToScreenReader(message, liveRegion) {
  if (!liveRegion) {
    return;
  }

  // Clear previous announcement
  liveRegion.textContent = '';

  // Delay to ensure screen reader picks up change
  setTimeout(() => {
    liveRegion.textContent = message;
  }, CONFIG.ANNOUNCEMENT_DELAY);
}

/**
 * Logs structured messages with context
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
function log(level, message, context = {}) {
  const logMethod = console[level] || console.log;
  logMethod('[Testimonials]', message, context);
}

// ============================================================================
// TESTIMONIALS CAROUSEL CLASS
// ============================================================================

class TestimonialsCarousel {
  /**
   * Creates a new testimonials carousel instance
   * @param {Element} carouselElement - Carousel container element
   */
  constructor(carouselElement) {
    if (!carouselElement) {
      throw new Error('Carousel element is required');
    }

    this.carousel = carouselElement;
    this.track = querySelector(SELECTORS.TRACK, this.carousel);
    this.prevButton = querySelector(SELECTORS.PREV_BUTTON, this.carousel);
    this.nextButton = querySelector(SELECTORS.NEXT_BUTTON, this.carousel);
    this.indicatorsContainer = querySelector(SELECTORS.INDICATORS, this.carousel);
    this.cards = Array.from(querySelectorAll(SELECTORS.CARDS, this.track));

    // State
    this.currentIndex = 0;
    this.totalSlides = this.cards.length;
    this.autoRotateTimer = null;
    this.isTransitioning = false;
    this.isPaused = false;

    // Touch state
    this.touchStartX = 0;
    this.touchEndX = 0;

    // Validate required elements
    this.validateElements();

    // Initialize
    this.init();
  }

  /**
   * Validates that all required elements exist
   * @throws {Error} If required elements are missing
   */
  validateElements() {
    if (!this.track) {
      throw new Error('Carousel track element not found');
    }

    if (this.cards.length === 0) {
      throw new Error('No testimonial cards found');
    }

    if (!this.prevButton || !this.nextButton) {
      log('warn', 'Navigation buttons not found - navigation disabled');
    }

    if (!this.indicatorsContainer) {
      log('warn', 'Indicators container not found - indicators disabled');
    }
  }

  /**
   * Initializes the carousel
   */
  init() {
    try {
      log('info', 'Initializing testimonials carousel', {
        totalSlides: this.totalSlides,
      });

      // Set initial state
      this.updateCarousel(false);

      // Bind event listeners
      this.bindEvents();

      // Start auto-rotation
      this.startAutoRotate();

      log('info', 'Testimonials carousel initialized successfully');
    } catch (error) {
      log('error', 'Failed to initialize carousel', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Binds all event listeners
   */
  bindEvents() {
    // Navigation buttons
    if (this.prevButton) {
      this.prevButton.addEventListener('click', () => this.goToPrevious());
    }

    if (this.nextButton) {
      this.nextButton.addEventListener('click', () => this.goToNext());
    }

    // Indicator dots
    if (this.indicatorsContainer) {
      const indicators = querySelectorAll(SELECTORS.INDICATOR, this.indicatorsContainer);
      indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => this.goToSlide(index));
      });
    }

    // Pause on hover/focus
    this.carousel.addEventListener('mouseenter', () => this.pause());
    this.carousel.addEventListener('mouseleave', () => this.resume());
    this.carousel.addEventListener('focusin', () => this.pause());
    this.carousel.addEventListener('focusout', () => this.resume());

    // Keyboard navigation
    if (CONFIG.KEYBOARD_ENABLED) {
      this.carousel.addEventListener('keydown', (event) => this.handleKeyboard(event));
    }

    // Touch/swipe support
    if (CONFIG.TOUCH_ENABLED) {
      this.carousel.addEventListener('touchstart', (event) => this.handleTouchStart(event), {
        passive: true,
      });
      this.carousel.addEventListener('touchend', (event) => this.handleTouchEnd(event), {
        passive: true,
      });
    }

    // Visibility change (pause when tab hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  /**
   * Handles keyboard navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyboard(event) {
    if (this.isTransitioning) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.goToPrevious();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.goToNext();
        break;
      case 'Home':
        event.preventDefault();
        this.goToSlide(0);
        break;
      case 'End':
        event.preventDefault();
        this.goToSlide(this.totalSlides - 1);
        break;
      default:
        break;
    }
  }

  /**
   * Handles touch start event
   * @param {TouchEvent} event - Touch event
   */
  handleTouchStart(event) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  /**
   * Handles touch end event
   * @param {TouchEvent} event - Touch event
   */
  handleTouchEnd(event) {
    this.touchEndX = event.changedTouches[0].screenX;
    this.handleSwipe();
  }

  /**
   * Processes swipe gesture
   */
  handleSwipe() {
    const swipeDistance = this.touchStartX - this.touchEndX;

    if (Math.abs(swipeDistance) < CONFIG.SWIPE_THRESHOLD) {
      return;
    }

    if (swipeDistance > 0) {
      // Swipe left - go to next
      this.goToNext();
    } else {
      // Swipe right - go to previous
      this.goToPrevious();
    }
  }

  /**
   * Goes to the previous slide
   */
  goToPrevious() {
    if (this.isTransitioning || this.currentIndex === 0) {
      return;
    }

    this.goToSlide(this.currentIndex - 1);
  }

  /**
   * Goes to the next slide
   */
  goToNext() {
    if (this.isTransitioning || this.currentIndex === this.totalSlides - 1) {
      return;
    }

    this.goToSlide(this.currentIndex + 1);
  }

  /**
   * Goes to a specific slide
   * @param {number} index - Target slide index
   */
  goToSlide(index) {
    if (this.isTransitioning) {
      return;
    }

    const targetIndex = clamp(index, 0, this.totalSlides - 1);

    if (targetIndex === this.currentIndex) {
      return;
    }

    this.currentIndex = targetIndex;
    this.updateCarousel(true);
    this.restartAutoRotate();
  }

  /**
   * Updates carousel position and UI state
   * @param {boolean} animate - Whether to animate the transition
   */
  updateCarousel(animate = true) {
    if (!this.track) {
      return;
    }

    // Set transitioning state
    if (animate && !prefersReducedMotion()) {
      this.isTransitioning = true;
      this.track.classList.add(CLASSES.TRANSITIONING);
    }

    // Update track position
    const translateX = -this.currentIndex * 100;
    this.track.style.transform = `translateX(${translateX}%)`;

    // Update buttons
    this.updateButtons();

    // Update indicators
    this.updateIndicators();

    // Announce to screen readers
    this.announceCurrentSlide();

    // Clear transitioning state after animation
    if (animate && !prefersReducedMotion()) {
      setTimeout(() => {
        this.isTransitioning = false;
        this.track.classList.remove(CLASSES.TRANSITIONING);
      }, CONFIG.TRANSITION_DURATION);
    }
  }

  /**
   * Updates navigation button states
   */
  updateButtons() {
    if (!this.prevButton || !this.nextButton) {
      return;
    }

    // Previous button
    if (this.currentIndex === 0) {
      this.prevButton.setAttribute(ARIA.DISABLED, 'true');
      this.prevButton.disabled = true;
    } else {
      this.prevButton.removeAttribute(ARIA.DISABLED);
      this.prevButton.disabled = false;
    }

    // Next button
    if (this.currentIndex === this.totalSlides - 1) {
      this.nextButton.setAttribute(ARIA.DISABLED, 'true');
      this.nextButton.disabled = true;
    } else {
      this.nextButton.removeAttribute(ARIA.DISABLED);
      this.nextButton.disabled = false;
    }
  }

  /**
   * Updates indicator dot states
   */
  updateIndicators() {
    if (!this.indicatorsContainer) {
      return;
    }

    const indicators = querySelectorAll(SELECTORS.INDICATOR, this.indicatorsContainer);

    indicators.forEach((indicator, index) => {
      if (index === this.currentIndex) {
        indicator.setAttribute(ARIA.SELECTED, 'true');
      } else {
        indicator.setAttribute(ARIA.SELECTED, 'false');
      }
    });
  }

  /**
   * Announces current slide to screen readers
   */
  announceCurrentSlide() {
    const currentCard = this.cards[this.currentIndex];
    if (!currentCard) {
      return;
    }

    const name = querySelector('.testimonial-card__name', currentCard)?.textContent || '';
    const role = querySelector('.testimonial-card__role', currentCard)?.textContent || '';

    const message = `Testimonial ${this.currentIndex + 1} of ${this.totalSlides}: ${name}, ${role}`;

    announceToScreenReader(message, this.carousel);
  }

  /**
   * Starts auto-rotation
   */
  startAutoRotate() {
    if (this.autoRotateTimer) {
      return;
    }

    this.autoRotateTimer = setInterval(() => {
      if (!this.isPaused && !this.isTransitioning) {
        // Loop back to start if at end
        if (this.currentIndex === this.totalSlides - 1) {
          this.goToSlide(0);
        } else {
          this.goToNext();
        }
      }
    }, CONFIG.AUTO_ROTATE_INTERVAL);

    log('info', 'Auto-rotation started');
  }

  /**
   * Stops auto-rotation
   */
  stopAutoRotate() {
    if (this.autoRotateTimer) {
      clearInterval(this.autoRotateTimer);
      this.autoRotateTimer = null;
      log('info', 'Auto-rotation stopped');
    }
  }

  /**
   * Restarts auto-rotation
   */
  restartAutoRotate() {
    this.stopAutoRotate();
    this.startAutoRotate();
  }

  /**
   * Pauses carousel (stops auto-rotation)
   */
  pause() {
    this.isPaused = true;
    log('info', 'Carousel paused');
  }

  /**
   * Resumes carousel (restarts auto-rotation)
   */
  resume() {
    this.isPaused = false;
    log('info', 'Carousel resumed');
  }

  /**
   * Destroys the carousel and cleans up resources
   */
  destroy() {
    this.stopAutoRotate();

    // Remove event listeners
    if (this.prevButton) {
      this.prevButton.replaceWith(this.prevButton.cloneNode(true));
    }

    if (this.nextButton) {
      this.nextButton.replaceWith(this.nextButton.cloneNode(true));
    }

    if (this.indicatorsContainer) {
      this.indicatorsContainer.replaceWith(this.indicatorsContainer.cloneNode(true));
    }

    log('info', 'Carousel destroyed');
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes all testimonials carousels on the page
 */
function initTestimonialsCarousels() {
  const carousels = querySelectorAll(SELECTORS.CAROUSEL);

  if (carousels.length === 0) {
    log('info', 'No testimonials carousels found on page');
    return;
  }

  const instances = [];

  carousels.forEach((carousel, index) => {
    try {
      const instance = new TestimonialsCarousel(carousel);
      instances.push(instance);
      log('info', 'Carousel initialized', { index });
    } catch (error) {
      log('error', 'Failed to initialize carousel', {
        index,
        error: error.message,
        stack: error.stack,
      });
    }
  });

  return instances;
}

/**
 * Handles DOM ready state
 */
function handleDOMReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTestimonialsCarousels);
  } else {
    initTestimonialsCarousels();
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

// Auto-initialize on page load
handleDOMReady();

// Export for manual initialization if needed
export { TestimonialsCarousel, initTestimonialsCarousels };