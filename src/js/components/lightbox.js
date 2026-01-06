/**
 * Lightbox Gallery Component
 * 
 * Production-ready lightbox implementation for viewing ministry photos with:
 * - Image display with navigation between images
 * - Keyboard controls (Arrow keys, Escape)
 * - Touch/swipe support for mobile devices
 * - Accessibility features (ARIA labels, focus management)
 * - Performance optimizations (lazy loading, event delegation)
 * - Error handling and recovery
 * 
 * @module components/lightbox
 * @generated-from: task-id:TASK-008
 * @modifies: none
 * @dependencies: none
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  SWIPE_THRESHOLD: 50,
  SWIPE_VELOCITY_THRESHOLD: 0.3,
  ANIMATION_DURATION: 300,
  PRELOAD_ADJACENT_IMAGES: true,
  KEYBOARD_ENABLED: true,
  TOUCH_ENABLED: true,
  FOCUS_TRAP_ENABLED: true,
});

const SELECTORS = Object.freeze({
  MODAL: '#gallery-modal',
  MODAL_IMAGE: '#modal-image',
  MODAL_CAPTION: '#modal-title',
  MODAL_CLOSE: '[data-modal-close]',
  MODAL_PREV: '[data-modal-prev]',
  MODAL_NEXT: '[data-modal-next]',
  GALLERY_BUTTONS: '[data-gallery-index]',
  MODAL_CONTENT: '.modal__content',
});

const KEYS = Object.freeze({
  ESCAPE: 'Escape',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
});

const CLASSES = Object.freeze({
  LOADING: 'modal__image--loading',
  ERROR: 'modal__image--error',
});

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

class LightboxState {
  constructor() {
    this.currentIndex = 0;
    this.images = [];
    this.isOpen = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.preloadedImages = new Map();
    this.focusedElementBeforeOpen = null;
  }

  setImages(images) {
    this.images = images;
  }

  setCurrentIndex(index) {
    if (index >= 0 && index < this.images.length) {
      this.currentIndex = index;
      return true;
    }
    return false;
  }

  getCurrentImage() {
    return this.images[this.currentIndex] || null;
  }

  getNextIndex() {
    return (this.currentIndex + 1) % this.images.length;
  }

  getPrevIndex() {
    return (this.currentIndex - 1 + this.images.length) % this.images.length;
  }

  setOpen(isOpen) {
    this.isOpen = isOpen;
  }

  setTouchStart(x, y, time) {
    this.touchStartX = x;
    this.touchStartY = y;
    this.touchStartTime = time;
  }

  getTouchDelta(x, y) {
    return {
      deltaX: x - this.touchStartX,
      deltaY: y - this.touchStartY,
    };
  }

  getTouchVelocity(x, time) {
    const deltaX = x - this.touchStartX;
    const deltaTime = time - this.touchStartTime;
    return deltaTime > 0 ? Math.abs(deltaX / deltaTime) : 0;
  }

  addPreloadedImage(url, img) {
    this.preloadedImages.set(url, img);
  }

  getPreloadedImage(url) {
    return this.preloadedImages.get(url);
  }

  saveFocusedElement(element) {
    this.focusedElementBeforeOpen = element;
  }

  restoreFocus() {
    if (this.focusedElementBeforeOpen && typeof this.focusedElementBeforeOpen.focus === 'function') {
      try {
        this.focusedElementBeforeOpen.focus();
      } catch (error) {
        console.warn('[Lightbox] Failed to restore focus', error);
      }
    }
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
    component: 'lightbox',
    message,
    ...context,
  };

  const logMethod = console[level] || console.log;
  logMethod('[Lightbox]', message, context);
}

/**
 * Safely queries a single DOM element
 * @param {string} selector - CSS selector
 * @param {Document|Element} context - Context to query within
 * @returns {Element|null} Found element or null
 */
function querySelector(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    log('error', 'Invalid selector', { selector, error: error.message });
    return null;
  }
}

/**
 * Safely queries multiple DOM elements
 * @param {string} selector - CSS selector
 * @param {Document|Element} context - Context to query within
 * @returns {NodeList} NodeList of found elements
 */
function querySelectorAll(selector, context = document) {
  try {
    return context.querySelectorAll(selector);
  } catch (error) {
    log('error', 'Invalid selector', { selector, error: error.message });
    return document.createDocumentFragment().childNodes;
  }
}

/**
 * Preloads an image
 * @param {string} url - Image URL
 * @returns {Promise<HTMLImageElement>} Promise resolving to loaded image
 */
function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    const timeout = setTimeout(() => {
      img.src = '';
      reject(new Error('Image preload timeout'));
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });
}

/**
 * Gets focusable elements within a container
 * @param {Element} container - Container element
 * @returns {Element[]} Array of focusable elements
 */
function getFocusableElements(container) {
  if (!container) return [];

  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(container.querySelectorAll(focusableSelectors));
}

// ============================================================================
// LIGHTBOX CLASS
// ============================================================================

class Lightbox {
  constructor() {
    this.state = new LightboxState();
    this.elements = {};
    this.boundHandlers = {};
    this.initialized = false;
  }

  /**
   * Initializes the lightbox component
   * @param {Array} images - Array of image objects with url, caption, and alt
   * @returns {boolean} Success status
   */
  init(images) {
    try {
      if (this.initialized) {
        log('warn', 'Lightbox already initialized');
        return false;
      }

      if (!Array.isArray(images) || images.length === 0) {
        log('error', 'Invalid images array', { images });
        return false;
      }

      this.state.setImages(images);
      this.cacheElements();
      
      if (!this.validateElements()) {
        log('error', 'Required elements not found');
        return false;
      }

      this.bindEvents();
      this.initialized = true;

      log('info', 'Lightbox initialized', { imageCount: images.length });
      return true;
    } catch (error) {
      log('error', 'Initialization failed', { error: error.message, stack: error.stack });
      return false;
    }
  }

  /**
   * Caches DOM element references
   */
  cacheElements() {
    this.elements = {
      modal: querySelector(SELECTORS.MODAL),
      modalImage: querySelector(SELECTORS.MODAL_IMAGE),
      modalCaption: querySelector(SELECTORS.MODAL_CAPTION),
      modalContent: querySelector(SELECTORS.MODAL_CONTENT),
      closeButtons: querySelectorAll(SELECTORS.MODAL_CLOSE),
      prevButton: querySelector(SELECTORS.MODAL_PREV),
      nextButton: querySelector(SELECTORS.MODAL_NEXT),
      galleryButtons: querySelectorAll(SELECTORS.GALLERY_BUTTONS),
    };
  }

  /**
   * Validates that required elements exist
   * @returns {boolean} Validation result
   */
  validateElements() {
    const required = ['modal', 'modalImage', 'modalCaption', 'prevButton', 'nextButton'];
    
    for (const key of required) {
      if (!this.elements[key]) {
        log('error', 'Required element missing', { element: key });
        return false;
      }
    }

    return true;
  }

  /**
   * Binds event handlers
   */
  bindEvents() {
    // Gallery button clicks
    this.elements.galleryButtons.forEach((button) => {
      button.addEventListener('click', this.handleGalleryClick.bind(this));
    });

    // Close button clicks
    this.elements.closeButtons.forEach((button) => {
      button.addEventListener('click', this.close.bind(this));
    });

    // Navigation buttons
    this.elements.prevButton.addEventListener('click', this.showPrev.bind(this));
    this.elements.nextButton.addEventListener('click', this.showNext.bind(this));

    // Keyboard navigation
    if (CONFIG.KEYBOARD_ENABLED) {
      this.boundHandlers.keydown = this.handleKeydown.bind(this);
      document.addEventListener('keydown', this.boundHandlers.keydown);
    }

    // Touch/swipe support
    if (CONFIG.TOUCH_ENABLED && this.elements.modalContent) {
      this.boundHandlers.touchstart = this.handleTouchStart.bind(this);
      this.boundHandlers.touchmove = this.handleTouchMove.bind(this);
      this.boundHandlers.touchend = this.handleTouchEnd.bind(this);

      this.elements.modalContent.addEventListener('touchstart', this.boundHandlers.touchstart, { passive: true });
      this.elements.modalContent.addEventListener('touchmove', this.boundHandlers.touchmove, { passive: true });
      this.elements.modalContent.addEventListener('touchend', this.boundHandlers.touchend, { passive: true });
    }

    log('info', 'Event handlers bound');
  }

  /**
   * Handles gallery button clicks
   * @param {Event} event - Click event
   */
  handleGalleryClick(event) {
    const button = event.currentTarget;
    const index = parseInt(button.getAttribute('data-gallery-index'), 10);

    if (isNaN(index)) {
      log('error', 'Invalid gallery index', { index });
      return;
    }

    this.open(index);
  }

  /**
   * Opens the lightbox at specified index
   * @param {number} index - Image index
   */
  open(index) {
    try {
      if (!this.state.setCurrentIndex(index)) {
        log('error', 'Invalid index', { index });
        return;
      }

      // Save currently focused element
      this.state.saveFocusedElement(document.activeElement);

      // Update modal state
      this.state.setOpen(true);
      this.elements.modal.setAttribute('aria-hidden', 'false');
      this.elements.modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      // Load and display image
      this.updateModalContent();

      // Preload adjacent images
      if (CONFIG.PRELOAD_ADJACENT_IMAGES) {
        this.preloadAdjacentImages();
      }

      // Set focus to modal image
      setTimeout(() => {
        if (this.elements.modalImage) {
          this.elements.modalImage.focus();
        }
      }, 100);

      log('info', 'Lightbox opened', { index });
    } catch (error) {
      log('error', 'Failed to open lightbox', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Closes the lightbox
   */
  close() {
    try {
      this.state.setOpen(false);
      this.elements.modal.setAttribute('aria-hidden', 'true');
      this.elements.modal.style.display = 'none';
      document.body.style.overflow = '';

      // Restore focus
      this.state.restoreFocus();

      log('info', 'Lightbox closed');
    } catch (error) {
      log('error', 'Failed to close lightbox', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Shows the previous image
   */
  showPrev() {
    const prevIndex = this.state.getPrevIndex();
    this.state.setCurrentIndex(prevIndex);
    this.updateModalContent();
    
    if (CONFIG.PRELOAD_ADJACENT_IMAGES) {
      this.preloadAdjacentImages();
    }

    log('info', 'Showing previous image', { index: prevIndex });
  }

  /**
   * Shows the next image
   */
  showNext() {
    const nextIndex = this.state.getNextIndex();
    this.state.setCurrentIndex(nextIndex);
    this.updateModalContent();
    
    if (CONFIG.PRELOAD_ADJACENT_IMAGES) {
      this.preloadAdjacentImages();
    }

    log('info', 'Showing next image', { index: nextIndex });
  }

  /**
   * Updates modal content with current image
   */
  async updateModalContent() {
    const image = this.state.getCurrentImage();
    
    if (!image) {
      log('error', 'No image data for current index');
      return;
    }

    try {
      // Add loading class
      this.elements.modalImage.classList.add(CLASSES.LOADING);
      this.elements.modalImage.classList.remove(CLASSES.ERROR);

      // Check if image is preloaded
      const preloadedImg = this.state.getPreloadedImage(image.url);
      
      if (preloadedImg) {
        this.displayImage(image);
      } else {
        // Load image
        await preloadImage(image.url);
        this.displayImage(image);
      }

      this.elements.modalImage.classList.remove(CLASSES.LOADING);
    } catch (error) {
      log('error', 'Failed to load image', { url: image.url, error: error.message });
      this.elements.modalImage.classList.remove(CLASSES.LOADING);
      this.elements.modalImage.classList.add(CLASSES.ERROR);
      this.elements.modalImage.alt = 'Failed to load image';
      this.elements.modalCaption.textContent = 'Image failed to load';
    }
  }

  /**
   * Displays image in modal
   * @param {Object} image - Image data object
   */
  displayImage(image) {
    this.elements.modalImage.src = image.url;
    this.elements.modalImage.alt = image.alt || '';
    this.elements.modalCaption.textContent = image.caption || '';

    // Update navigation button labels
    const currentNum = this.state.currentIndex + 1;
    const total = this.state.images.length;
    
    if (this.elements.prevButton) {
      this.elements.prevButton.setAttribute('aria-label', `Previous image (${currentNum} of ${total})`);
    }
    
    if (this.elements.nextButton) {
      this.elements.nextButton.setAttribute('aria-label', `Next image (${currentNum} of ${total})`);
    }
  }

  /**
   * Preloads adjacent images for smoother navigation
   */
  async preloadAdjacentImages() {
    const nextIndex = this.state.getNextIndex();
    const prevIndex = this.state.getPrevIndex();
    const indicesToPreload = [nextIndex, prevIndex];

    for (const index of indicesToPreload) {
      const image = this.state.images[index];
      if (image && !this.state.getPreloadedImage(image.url)) {
        try {
          const img = await preloadImage(image.url);
          this.state.addPreloadedImage(image.url, img);
          log('info', 'Image preloaded', { index, url: image.url });
        } catch (error) {
          log('warn', 'Failed to preload image', { index, url: image.url, error: error.message });
        }
      }
    }
  }

  /**
   * Handles keyboard navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeydown(event) {
    if (!this.state.isOpen) return;

    switch (event.key) {
      case KEYS.ESCAPE:
        event.preventDefault();
        this.close();
        break;

      case KEYS.ARROW_LEFT:
        event.preventDefault();
        this.showPrev();
        break;

      case KEYS.ARROW_RIGHT:
        event.preventDefault();
        this.showNext();
        break;

      case KEYS.TAB:
        if (CONFIG.FOCUS_TRAP_ENABLED) {
          this.handleFocusTrap(event);
        }
        break;

      default:
        break;
    }
  }

  /**
   * Handles focus trap within modal
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleFocusTrap(event) {
    const focusableElements = getFocusableElements(this.elements.modal);
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Handles touch start event
   * @param {TouchEvent} event - Touch event
   */
  handleTouchStart(event) {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    this.state.setTouchStart(touch.clientX, touch.clientY, Date.now());
  }

  /**
   * Handles touch move event
   * @param {TouchEvent} event - Touch event
   */
  handleTouchMove(_event) {
    // Could implement visual feedback for swipe here
  }

  /**
   * Handles touch end event
   * @param {TouchEvent} event - Touch event
   */
  handleTouchEnd(event) {
    if (event.changedTouches.length !== 1) return;

    const touch = event.changedTouches[0];
    const { deltaX, deltaY } = this.state.getTouchDelta(touch.clientX, touch.clientY);
    const velocity = this.state.getTouchVelocity(touch.clientX, Date.now());

    // Check if horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const isSignificantSwipe = Math.abs(deltaX) > CONFIG.SWIPE_THRESHOLD || 
                                 velocity > CONFIG.SWIPE_VELOCITY_THRESHOLD;

      if (isSignificantSwipe) {
        if (deltaX > 0) {
          this.showPrev();
        } else {
          this.showNext();
        }
      }
    }
  }

  /**
   * Destroys the lightbox instance
   */
  destroy() {
    try {
      // Remove event listeners
      if (this.boundHandlers.keydown) {
        document.removeEventListener('keydown', this.boundHandlers.keydown);
      }

      if (this.elements.modalContent && CONFIG.TOUCH_ENABLED) {
        this.elements.modalContent.removeEventListener('touchstart', this.boundHandlers.touchstart);
        this.elements.modalContent.removeEventListener('touchmove', this.boundHandlers.touchmove);
        this.elements.modalContent.removeEventListener('touchend', this.boundHandlers.touchend);
      }

      // Close if open
      if (this.state.isOpen) {
        this.close();
      }

      // Clear state
      this.state = new LightboxState();
      this.elements = {};
      this.boundHandlers = {};
      this.initialized = false;

      log('info', 'Lightbox destroyed');
    } catch (error) {
      log('error', 'Failed to destroy lightbox', { error: error.message, stack: error.stack });
    }
  }
}

// ============================================================================
// INITIALIZATION FUNCTION
// ============================================================================

/**
 * Initializes lightbox from inline gallery data
 * @returns {Lightbox|null} Lightbox instance or null if initialization failed
 */
function initLightbox() {
  try {
    // Extract gallery data from DOM
    const galleryButtons = querySelectorAll(SELECTORS.GALLERY_BUTTONS);
    
    if (galleryButtons.length === 0) {
      log('warn', 'No gallery buttons found');
      return null;
    }

    const images = Array.from(galleryButtons).map((button) => {
      const img = button.querySelector('img');
      const caption = button.querySelector('.gallery-item__caption');
      
      if (!img) {
        log('warn', 'Gallery button missing image', { button });
        return null;
      }

      // Get high-res URL from src, replacing dimensions
      const highResUrl = img.src.replace(/w=\d+&h=\d+/, 'w=1200&h=900');

      return {
        url: highResUrl,
        caption: caption ? caption.textContent.trim() : '',
        alt: img.alt || '',
      };
    }).filter(Boolean);

    if (images.length === 0) {
      log('error', 'No valid images found');
      return null;
    }

    const lightbox = new Lightbox();
    const success = lightbox.init(images);

    if (!success) {
      log('error', 'Lightbox initialization failed');
      return null;
    }

    return lightbox;
  } catch (error) {
    log('error', 'Failed to initialize lightbox', { error: error.message, stack: error.stack });
    return null;
  }
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

let lightboxInstance = null;

function handleDOMReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      lightboxInstance = initLightbox();
    });
  } else {
    lightboxInstance = initLightbox();
  }
}

handleDOMReady();

// ============================================================================
// EXPORTS
// ============================================================================

export { Lightbox, initLightbox, lightboxInstance };