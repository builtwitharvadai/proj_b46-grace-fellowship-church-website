/**
 * Ministry Page Component
 * 
 * Handles dynamic content loading and interactions for ministry pages including:
 * - Loading ministry data from JSON files
 * - Rendering leadership profiles with progressive image loading
 * - Displaying meeting schedules (regular and special events)
 * - Managing photo gallery with lightbox functionality
 * - Progressive enhancement for better performance
 * 
 * @module components/ministry
 * @generated-from: task-id:TASK-008
 * @modifies: none
 * @dependencies: [lazy-loading]
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  DATA_PATH: '/data/ministries/',
  IMAGE_LOAD_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CACHE_DURATION: 300000, // 5 minutes
  INTERSECTION_THRESHOLD: 0.1,
  INTERSECTION_ROOT_MARGIN: '50px',
});

const SELECTORS = Object.freeze({
  LEADERSHIP_GRID: '.youth-leadership__grid',
  SCHEDULE_GRID: '.youth-schedule__grid',
  SPECIAL_EVENTS_GRID: '.youth-schedule__special-grid',
  GALLERY_GRID: '.youth-gallery__grid',
  GALLERY_MODAL: '#gallery-modal',
  MODAL_IMAGE: '#modal-image',
  MODAL_CAPTION: '#modal-title',
  GALLERY_BUTTONS: '[data-gallery-index]',
  MODAL_CLOSE: '[data-modal-close]',
  MODAL_PREV: '[data-modal-prev]',
  MODAL_NEXT: '[data-modal-next]',
  LEADER_CARD: '.leader-card',
  SCHEDULE_CARD: '.schedule-card',
  SPECIAL_EVENT_CARD: '.special-event-card',
  GALLERY_ITEM: '.gallery-item',
});

const CLASSES = Object.freeze({
  IMAGE_LOADING: 'image-loading',
  IMAGE_LOADED: 'image-loaded',
  IMAGE_ERROR: 'image-error',
  CARD_SKELETON: 'card-skeleton',
  MODAL_OPEN: 'modal--open',
});

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  ministryData: null,
  currentGalleryIndex: 0,
  imageCache: new Map(),
  loadingImages: new Set(),
  intersectionObserver: null,
  dataCache: new Map(),
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
    console.error('[Ministry] Invalid selector:', selector, error);
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
    console.error('[Ministry] Invalid selector:', selector, error);
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
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    component: 'ministry',
    message,
    ...context,
  };

  const logMethod = console[level] || console.log;
  logMethod('[Ministry]', message, context);

  if (typeof window.gtag === 'function' && level === 'error') {
    window.gtag('event', 'exception', {
      description: message,
      fatal: false,
    });
  }
}

/**
 * Creates a delay promise
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sanitizes HTML to prevent XSS
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Escapes HTML entities
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Fetches ministry data with retry logic
 * @param {string} ministryName - Name of ministry
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Object>} Ministry data
 */
async function fetchMinistryData(ministryName, attempt = 1) {
  const cacheKey = `ministry:${ministryName}`;
  const cached = state.dataCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
    log('info', 'Using cached ministry data', { ministryName });
    return cached.data;
  }

  const url = `${CONFIG.DATA_PATH}${ministryName}.json`;

  try {
    log('info', 'Fetching ministry data', { ministryName, attempt, url });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format received');
    }

    state.dataCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    log('info', 'Ministry data loaded successfully', { ministryName });
    return data;
  } catch (error) {
    log('error', 'Failed to fetch ministry data', {
      ministryName,
      attempt,
      error: error.message,
    });

    if (attempt < CONFIG.RETRY_ATTEMPTS) {
      await delay(CONFIG.RETRY_DELAY * attempt);
      return fetchMinistryData(ministryName, attempt + 1);
    }

    throw new Error(`Failed to load ministry data after ${CONFIG.RETRY_ATTEMPTS} attempts: ${error.message}`);
  }
}

// ============================================================================
// IMAGE LOADING
// ============================================================================

/**
 * Preloads an image with timeout
 * @param {string} url - Image URL
 * @returns {Promise<HTMLImageElement>} Loaded image
 */
function preloadImage(url) {
  if (state.imageCache.has(url)) {
    return Promise.resolve(state.imageCache.get(url));
  }

  if (state.loadingImages.has(url)) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (state.imageCache.has(url)) {
          clearInterval(checkInterval);
          resolve(state.imageCache.get(url));
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Image load timeout'));
      }, CONFIG.IMAGE_LOAD_TIMEOUT);
    });
  }

  state.loadingImages.add(url);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const timeoutId = setTimeout(() => {
      img.src = '';
      state.loadingImages.delete(url);
      reject(new Error(`Image load timeout: ${url}`));
    }, CONFIG.IMAGE_LOAD_TIMEOUT);

    img.onload = () => {
      clearTimeout(timeoutId);
      state.imageCache.set(url, img);
      state.loadingImages.delete(url);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      state.loadingImages.delete(url);
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });
}

/**
 * Handles progressive image loading
 * @param {HTMLImageElement} imgElement - Image element
 * @param {string} src - Image source URL
 */
async function loadImageProgressive(imgElement, src) {
  if (!imgElement || !src) {
    return;
  }

  imgElement.classList.add(CLASSES.IMAGE_LOADING);

  try {
    await preloadImage(src);
    imgElement.src = src;
    imgElement.classList.remove(CLASSES.IMAGE_LOADING);
    imgElement.classList.add(CLASSES.IMAGE_LOADED);
    log('info', 'Image loaded successfully', { src });
  } catch (error) {
    imgElement.classList.remove(CLASSES.IMAGE_LOADING);
    imgElement.classList.add(CLASSES.IMAGE_ERROR);
    log('error', 'Image load failed', { src, error: error.message });
  }
}

// ============================================================================
// RENDERING FUNCTIONS
// ============================================================================

/**
 * Renders leadership profiles
 * @param {Array} leaders - Array of leader objects
 * @param {Element} container - Container element
 */
function renderLeadership(leaders, container) {
  if (!container || !Array.isArray(leaders) || leaders.length === 0) {
    log('warn', 'Cannot render leadership - invalid data or container');
    return;
  }

  const fragment = document.createDocumentFragment();

  leaders.forEach((leader) => {
    const article = document.createElement('article');
    article.className = 'leader-card';
    article.setAttribute('data-leader-id', leader.id);

    const img = document.createElement('img');
    img.className = 'leader-card__image';
    img.alt = escapeHTML(`${leader.name}, ${leader.role}`);
    img.loading = 'lazy';
    img.width = 400;
    img.height = 400;
    img.dataset.src = leader.photo;

    const content = document.createElement('div');
    content.className = 'leader-card__content';

    const name = document.createElement('h3');
    name.className = 'leader-card__name';
    name.textContent = leader.name;

    const role = document.createElement('p');
    role.className = 'leader-card__role';
    role.textContent = leader.role;

    const bio = document.createElement('p');
    bio.className = 'leader-card__bio';
    bio.textContent = leader.bio;

    const email = document.createElement('a');
    email.className = 'leader-card__email';
    email.href = `mailto:${leader.email}`;
    email.textContent = leader.email;

    content.appendChild(name);
    content.appendChild(role);
    content.appendChild(bio);
    content.appendChild(email);

    article.appendChild(img);
    article.appendChild(content);
    fragment.appendChild(article);
  });

  container.innerHTML = '';
  container.appendChild(fragment);

  setupImageObserver(container);

  log('info', 'Leadership profiles rendered', { count: leaders.length });
}

/**
 * Renders regular schedule
 * @param {Array} schedule - Array of schedule items
 * @param {Element} container - Container element
 */
function renderSchedule(schedule, container) {
  if (!container || !Array.isArray(schedule) || schedule.length === 0) {
    log('warn', 'Cannot render schedule - invalid data or container');
    return;
  }

  const fragment = document.createDocumentFragment();

  schedule.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'schedule-card';
    article.setAttribute('data-schedule-id', item.id);

    const name = document.createElement('h3');
    name.className = 'schedule-card__name';
    name.textContent = item.name;

    const details = document.createElement('div');
    details.className = 'schedule-card__details';

    const time = document.createElement('p');
    time.className = 'schedule-card__time';
    time.innerHTML = `<strong>${escapeHTML(item.day)}</strong> | ${escapeHTML(item.time)}`;

    const location = document.createElement('p');
    location.className = 'schedule-card__location';
    location.textContent = item.location;

    details.appendChild(time);
    details.appendChild(location);

    const description = document.createElement('p');
    description.className = 'schedule-card__description';
    description.textContent = item.description;

    article.appendChild(name);
    article.appendChild(details);
    article.appendChild(description);
    fragment.appendChild(article);
  });

  container.innerHTML = '';
  container.appendChild(fragment);

  log('info', 'Schedule rendered', { count: schedule.length });
}

/**
 * Renders special events
 * @param {Array} events - Array of special event objects
 * @param {Element} container - Container element
 */
function renderSpecialEvents(events, container) {
  if (!container || !Array.isArray(events) || events.length === 0) {
    log('warn', 'Cannot render special events - invalid data or container');
    return;
  }

  const fragment = document.createDocumentFragment();

  events.forEach((event) => {
    const article = document.createElement('article');
    article.className = 'special-event-card';
    article.setAttribute('data-event-id', event.id);

    const name = document.createElement('h4');
    name.className = 'special-event-card__name';
    name.textContent = event.name;

    const date = document.createElement('p');
    date.className = 'special-event-card__date';
    date.textContent = event.date;

    const location = document.createElement('p');
    location.className = 'special-event-card__location';
    location.textContent = event.location;

    const description = document.createElement('p');
    description.className = 'special-event-card__description';
    description.textContent = event.description;

    article.appendChild(name);
    article.appendChild(date);
    article.appendChild(location);
    article.appendChild(description);
    fragment.appendChild(article);
  });

  container.innerHTML = '';
  container.appendChild(fragment);

  log('info', 'Special events rendered', { count: events.length });
}

/**
 * Renders photo gallery
 * @param {Array} gallery - Array of gallery image objects
 * @param {Element} container - Container element
 */
function renderGallery(gallery, container) {
  if (!container || !Array.isArray(gallery) || gallery.length === 0) {
    log('warn', 'Cannot render gallery - invalid data or container');
    return;
  }

  const fragment = document.createDocumentFragment();

  gallery.forEach((item, index) => {
    const article = document.createElement('article');
    article.className = 'gallery-item';
    article.setAttribute('role', 'listitem');

    const button = document.createElement('button');
    button.className = 'gallery-item__button';
    button.setAttribute('data-gallery-index', index);
    button.setAttribute('aria-label', `View photo: ${escapeHTML(item.caption)}`);

    const img = document.createElement('img');
    img.className = 'gallery-item__image';
    img.alt = escapeHTML(item.alt);
    img.loading = 'lazy';
    img.width = 400;
    img.height = 300;
    img.dataset.src = item.thumbnail;
    img.dataset.fullSrc = item.url;

    const caption = document.createElement('span');
    caption.className = 'gallery-item__caption';
    caption.textContent = item.caption;

    button.appendChild(img);
    button.appendChild(caption);
    article.appendChild(button);
    fragment.appendChild(article);
  });

  container.innerHTML = '';
  container.appendChild(fragment);

  setupImageObserver(container);
  setupGalleryHandlers();

  log('info', 'Gallery rendered', { count: gallery.length });
}

// ============================================================================
// GALLERY LIGHTBOX
// ============================================================================

/**
 * Opens gallery modal at specific index
 * @param {number} index - Gallery image index
 */
function openGalleryModal(index) {
  if (!state.ministryData || !state.ministryData.gallery) {
    log('error', 'Cannot open gallery - no data loaded');
    return;
  }

  const modal = querySelector(SELECTORS.GALLERY_MODAL);
  const modalImage = querySelector(SELECTORS.MODAL_IMAGE);
  const modalCaption = querySelector(SELECTORS.MODAL_CAPTION);

  if (!modal || !modalImage || !modalCaption) {
    log('error', 'Gallery modal elements not found');
    return;
  }

  state.currentGalleryIndex = index;
  updateGalleryModal();

  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add(CLASSES.MODAL_OPEN);
  document.body.style.overflow = 'hidden';

  modalImage.focus();

  log('info', 'Gallery modal opened', { index });
}

/**
 * Closes gallery modal
 */
function closeGalleryModal() {
  const modal = querySelector(SELECTORS.GALLERY_MODAL);

  if (!modal) {
    return;
  }

  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove(CLASSES.MODAL_OPEN);
  document.body.style.overflow = '';

  log('info', 'Gallery modal closed');
}

/**
 * Updates gallery modal content
 */
function updateGalleryModal() {
  if (!state.ministryData || !state.ministryData.gallery) {
    return;
  }

  const modalImage = querySelector(SELECTORS.MODAL_IMAGE);
  const modalCaption = querySelector(SELECTORS.MODAL_CAPTION);

  if (!modalImage || !modalCaption) {
    return;
  }

  const image = state.ministryData.gallery[state.currentGalleryIndex];

  if (!image) {
    log('error', 'Invalid gallery index', { index: state.currentGalleryIndex });
    return;
  }

  modalImage.src = image.url;
  modalImage.alt = escapeHTML(image.alt);
  modalCaption.textContent = image.caption;

  log('info', 'Gallery modal updated', { index: state.currentGalleryIndex });
}

/**
 * Shows previous gallery image
 */
function showPreviousImage() {
  if (!state.ministryData || !state.ministryData.gallery) {
    return;
  }

  const length = state.ministryData.gallery.length;
  state.currentGalleryIndex = (state.currentGalleryIndex - 1 + length) % length;
  updateGalleryModal();
}

/**
 * Shows next gallery image
 */
function showNextImage() {
  if (!state.ministryData || !state.ministryData.gallery) {
    return;
  }

  const length = state.ministryData.gallery.length;
  state.currentGalleryIndex = (state.currentGalleryIndex + 1) % length;
  updateGalleryModal();
}

/**
 * Sets up gallery event handlers
 */
function setupGalleryHandlers() {
  const galleryButtons = querySelectorAll(SELECTORS.GALLERY_BUTTONS);
  const closeButtons = querySelectorAll(SELECTORS.MODAL_CLOSE);
  const prevButton = querySelector(SELECTORS.MODAL_PREV);
  const nextButton = querySelector(SELECTORS.MODAL_NEXT);

  galleryButtons.forEach((button) => {
    button.addEventListener('click', function handleGalleryClick() {
      const index = parseInt(this.getAttribute('data-gallery-index'), 10);
      if (!isNaN(index)) {
        openGalleryModal(index);
      }
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', closeGalleryModal);
  });

  if (prevButton) {
    prevButton.addEventListener('click', showPreviousImage);
  }

  if (nextButton) {
    nextButton.addEventListener('click', showNextImage);
  }

  document.addEventListener('keydown', function handleKeydown(e) {
    const modal = querySelector(SELECTORS.GALLERY_MODAL);
    if (!modal || modal.getAttribute('aria-hidden') === 'true') {
      return;
    }

    if (e.key === 'Escape') {
      closeGalleryModal();
    } else if (e.key === 'ArrowLeft') {
      showPreviousImage();
    } else if (e.key === 'ArrowRight') {
      showNextImage();
    }
  });

  log('info', 'Gallery handlers initialized');
}

// ============================================================================
// INTERSECTION OBSERVER
// ============================================================================

/**
 * Sets up intersection observer for lazy image loading
 * @param {Element} container - Container to observe images in
 */
function setupImageObserver(container) {
  if (!container) {
    return;
  }

  if (!state.intersectionObserver) {
    state.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;

            if (src && !img.src) {
              loadImageProgressive(img, src);
              state.intersectionObserver.unobserve(img);
            }
          }
        });
      },
      {
        threshold: CONFIG.INTERSECTION_THRESHOLD,
        rootMargin: CONFIG.INTERSECTION_ROOT_MARGIN,
      }
    );
  }

  const images = querySelectorAll('img[data-src]', container);
  images.forEach((img) => {
    state.intersectionObserver.observe(img);
  });

  log('info', 'Image observer setup', { imageCount: images.length });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes ministry page
 * @param {string} ministryName - Name of ministry to load
 */
async function initMinistryPage(ministryName = 'youth') {
  try {
    log('info', 'Initializing ministry page', { ministryName });

    const data = await fetchMinistryData(ministryName);
    state.ministryData = data;

    const leadershipContainer = querySelector(SELECTORS.LEADERSHIP_GRID);
    if (leadershipContainer && data.leadership) {
      renderLeadership(data.leadership, leadershipContainer);
    }

    const scheduleContainer = querySelector(SELECTORS.SCHEDULE_GRID);
    if (scheduleContainer && data.schedule && data.schedule.regular) {
      renderSchedule(data.schedule.regular, scheduleContainer);
    }

    const specialEventsContainer = querySelector(SELECTORS.SPECIAL_EVENTS_GRID);
    if (specialEventsContainer && data.schedule && data.schedule.special) {
      renderSpecialEvents(data.schedule.special, specialEventsContainer);
    }

    const galleryContainer = querySelector(SELECTORS.GALLERY_GRID);
    if (galleryContainer && data.gallery) {
      renderGallery(data.gallery, galleryContainer);
    }

    log('info', 'Ministry page initialized successfully', { ministryName });
  } catch (error) {
    log('error', 'Ministry page initialization failed', {
      ministryName,
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Cleans up ministry page resources
 */
function cleanup() {
  if (state.intersectionObserver) {
    state.intersectionObserver.disconnect();
    state.intersectionObserver = null;
  }

  state.imageCache.clear();
  state.loadingImages.clear();
  state.ministryData = null;
  state.currentGalleryIndex = 0;

  log('info', 'Ministry page cleanup completed');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  initMinistryPage,
  cleanup,
  renderLeadership,
  renderSchedule,
  renderSpecialEvents,
  renderGallery,
  openGalleryModal,
  closeGalleryModal,
};