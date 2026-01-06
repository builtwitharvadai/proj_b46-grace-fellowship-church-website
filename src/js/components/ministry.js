/**
 * Ministry Page Component
 * 
 * Handles dynamic content loading and interactions for ministry pages including:
 * - Loading ministry data from JSON files
 * - Rendering leadership profiles with progressive image loading
 * - Displaying meeting schedules (regular and special events)
 * - Managing photo gallery with lightbox functionality
 * - Progressive enhancement for better performance
 * - Testimonials carousel integration for women's ministry
 * - Multi-ministry support (youth, women's, men's, children's, outreach)
 * - Impact metrics visualization for outreach ministry
 * - Volunteer opportunity handling for outreach ministry
 * 
 * @module components/ministry
 * @generated-from: task-id:TASK-010,TASK-011
 * @modifies: ministry.js
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
  TESTIMONIALS_TRACK: '#testimonials-track',
  TESTIMONIALS_INDICATORS: '.testimonials__indicators',
  TESTIMONIALS_PREV: '.testimonials__button--prev',
  TESTIMONIALS_NEXT: '.testimonials__button--next',
  IMPACT_METRICS_CONTAINER: '[data-impact-metrics]',
  IMPACT_METRIC_NUMBER: '[data-metric-number]',
  IMPACT_STORIES_GRID: '[data-impact-stories]',
  VOLUNTEER_OPPORTUNITIES_GRID: '[data-volunteer-opportunities]',
  DONATION_NEEDS_GRID: '[data-donation-needs]',
});

const CLASSES = Object.freeze({
  IMAGE_LOADING: 'image-loading',
  IMAGE_LOADED: 'image-loaded',
  IMAGE_ERROR: 'image-error',
  CARD_SKELETON: 'card-skeleton',
  MODAL_OPEN: 'modal--open',
});

const MINISTRY_TYPES = Object.freeze({
  YOUTH: 'youth',
  WOMENS: 'womens',
  MENS: 'mens',
  CHILDRENS: 'childrens',
  OUTREACH: 'outreach',
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
  testimonialsState: {
    currentIndex: 0,
    totalTestimonials: 0,
    autoRotateTimer: null,
    isPaused: false,
  },
  currentMinistryType: null,
  impactMetricsAnimated: new Set(),
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

/**
 * Detects ministry type from current page URL
 * @returns {string} Ministry type identifier
 */
function detectMinistryType() {
  const path = window.location.pathname;
  const filename = path.substring(path.lastIndexOf('/') + 1);
  
  if (filename.includes('youth')) {
    return MINISTRY_TYPES.YOUTH;
  }
  if (filename.includes('womens') || filename.includes('women')) {
    return MINISTRY_TYPES.WOMENS;
  }
  if (filename.includes('mens') || filename.includes('men')) {
    return MINISTRY_TYPES.MENS;
  }
  if (filename.includes('childrens') || filename.includes('children')) {
    return MINISTRY_TYPES.CHILDRENS;
  }
  if (filename.includes('outreach')) {
    return MINISTRY_TYPES.OUTREACH;
  }
  
  return MINISTRY_TYPES.YOUTH;
}

/**
 * Formats a number with locale-specific formatting
 * @param {number} value - Number to format
 * @returns {string} Formatted number string
 */
function formatNumber(value) {
  try {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  } catch (error) {
    log('error', 'Number formatting failed', { error: error.message });
    return String(Math.round(value));
  }
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
    img.dataset.src = leader.photo || leader.image;

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
    img.dataset.src = item.thumbnail || item.image || item.src;
    img.dataset.fullSrc = item.url || item.image || item.src;

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

/**
 * Renders testimonials carousel
 * @param {Array} testimonials - Array of testimonial objects
 * @param {Element} trackContainer - Track container element
 * @param {Element} indicatorsContainer - Indicators container element
 */
function renderTestimonials(testimonials, trackContainer, indicatorsContainer) {
  if (!trackContainer || !Array.isArray(testimonials) || testimonials.length === 0) {
    log('warn', 'Cannot render testimonials - invalid data or container');
    return;
  }

  const fragment = document.createDocumentFragment();

  testimonials.forEach((testimonial, index) => {
    const article = document.createElement('article');
    article.className = 'testimonial-card';
    article.setAttribute('role', 'tabpanel');
    article.setAttribute('id', `testimonial-${index}`);
    article.setAttribute('aria-labelledby', `indicator-${index}`);

    const content = document.createElement('div');
    content.className = 'testimonial-card__content';

    const img = document.createElement('img');
    img.className = 'testimonial-card__image';
    img.alt = escapeHTML(testimonial.name);
    img.loading = 'lazy';
    img.width = 120;
    img.height = 120;
    img.dataset.src = testimonial.image;

    const textContent = document.createElement('div');

    const quote = document.createElement('blockquote');
    quote.className = 'testimonial-card__quote';
    quote.textContent = `"${testimonial.quote}"`;

    const name = document.createElement('p');
    name.className = 'testimonial-card__name';
    name.textContent = testimonial.name;

    const role = document.createElement('p');
    role.className = 'testimonial-card__role';
    role.textContent = testimonial.role;

    textContent.appendChild(quote);
    textContent.appendChild(name);
    textContent.appendChild(role);

    content.appendChild(img);
    content.appendChild(textContent);
    article.appendChild(content);
    fragment.appendChild(article);
  });

  trackContainer.innerHTML = '';
  trackContainer.appendChild(fragment);

  if (indicatorsContainer) {
    const indicatorsFragment = document.createDocumentFragment();

    testimonials.forEach((_testimonial, index) => {
      const button = document.createElement('button');
      button.className = 'testimonials__indicator';
      button.setAttribute('role', 'tab');
      button.setAttribute('id', `indicator-${index}`);
      button.setAttribute('aria-controls', `testimonial-${index}`);
      button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      button.setAttribute('aria-label', `Go to testimonial ${index + 1}`);

      indicatorsFragment.appendChild(button);
    });

    indicatorsContainer.innerHTML = '';
    indicatorsContainer.appendChild(indicatorsFragment);
  }

  setupImageObserver(trackContainer);

  state.testimonialsState.totalTestimonials = testimonials.length;
  state.testimonialsState.currentIndex = 0;

  log('info', 'Testimonials rendered', { count: testimonials.length });
}

// ============================================================================
// OUTREACH-SPECIFIC RENDERING
// ============================================================================

/**
 * Renders impact metrics with animated counters
 * @param {Object} impactMetrics - Impact metrics data
 * @param {Element} container - Container element
 */
function renderImpactMetrics(impactMetrics, container) {
  if (!container || !impactMetrics || !Array.isArray(impactMetrics.metrics)) {
    log('warn', 'Cannot render impact metrics - invalid data or container');
    return;
  }

  const fragment = document.createDocumentFragment();

  impactMetrics.metrics.forEach((metric) => {
    const article = document.createElement('article');
    article.className = 'schedule-card';
    article.setAttribute('data-metric-card', '');

    const number = document.createElement('h3');
    number.className = 'schedule-card__name';
    number.setAttribute('data-metric-number', '');
    number.setAttribute('data-target-value', metric.value);
    number.textContent = '0';

    const category = document.createElement('p');
    category.className = 'schedule-card__time';
    category.innerHTML = `<strong>${escapeHTML(metric.category)}</strong>`;

    const description = document.createElement('p');
    description.className = 'schedule-card__description';
    description.textContent = metric.description;

    article.appendChild(number);
    article.appendChild(category);
    article.appendChild(description);
    fragment.appendChild(article);
  });

  container.innerHTML = '';
  container.appendChild(fragment);

  setupImpactMetricsObserver(container);

  log('info', 'Impact metrics rendered', { count: impactMetrics.metrics.length });
}

/**
 * Renders impact stories
 * @param {Array} stories - Array of impact story objects
 * @param {Element} container - Container element
 */
function renderImpactStories(stories, container) {
  if (!container || !Array.isArray(stories) || stories.length === 0) {
    log('warn', 'Cannot render impact stories - invalid data or container');
    return;
  }

  const fragment = document.createDocumentFragment();

  stories.forEach((story) => {
    const article = document.createElement('article');
    article.className = 'leader-card';

    const content = document.createElement('div');
    content.className = 'leader-card__content';

    const title = document.createElement('h3');
    title.className = 'leader-card__name';
    title.textContent = story.title;

    const excerpt = document.createElement('p');
    excerpt.className = 'leader-card__bio';
    excerpt.textContent = story.excerpt;

    content.appendChild(title);
    content.appendChild(excerpt);
    article.appendChild(content);
    fragment.appendChild(article);
  });

  container.innerHTML = '';
  container.appendChild(fragment);

  log('info', 'Impact stories rendered', { count: stories.length });
}

/**
 * Renders volunteer opportunities
 * @param {Array} opportunities - Array of volunteer opportunity objects
 * @param {Element} container - Container element
 */
function renderVolunteerOpportunities(opportunities, container) {
  if (!container || !Array.isArray(opportunities) || opportunities.length === 0) {
    log('warn', 'Cannot render volunteer opportunities - invalid data or container');
    return;
  }

  const fragment = document.createDocumentFragment();

  opportunities.forEach((opportunity) => {
    const article = document.createElement('article');
    article.className = 'schedule-card';
    article.setAttribute('data-opportunity-card', '');
    article.setAttribute('data-opportunity-id', opportunity.id);

    const title = document.createElement('h3');
    title.className = 'schedule-card__name';
    title.textContent = opportunity.title;

    const details = document.createElement('div');
    details.className = 'schedule-card__details';

    const timeCommitment = document.createElement('p');
    timeCommitment.className = 'schedule-card__time';
    timeCommitment.innerHTML = `<strong>Time Commitment:</strong> ${escapeHTML(opportunity.timeCommitment)}`;

    details.appendChild(timeCommitment);

    const description = document.createElement('p');
    description.className = 'schedule-card__description';
    description.textContent = opportunity.description;

    article.appendChild(title);
    article.appendChild(details);
    article.appendChild(description);
    fragment.appendChild(article);
  });

  container.innerHTML = '';
  container.appendChild(fragment);

  log('info', 'Volunteer opportunities rendered', { count: opportunities.length });
}

/**
 * Renders donation needs
 * @param {Object} donationNeeds - Donation needs data
 * @param {Element} container - Container element
 */
function renderDonationNeeds(donationNeeds, container) {
  if (!container || !donationNeeds || !Array.isArray(donationNeeds.categories)) {
    log('warn', 'Cannot render donation needs - invalid data or container');
    return;
  }

  const fragment = document.createDocumentFragment();

  donationNeeds.categories.forEach((category) => {
    const article = document.createElement('article');
    article.className = 'leader-card';

    const content = document.createElement('div');
    content.className = 'leader-card__content';

    const name = document.createElement('h3');
    name.className = 'leader-card__name';
    name.textContent = category.name;

    const description = document.createElement('p');
    description.className = 'leader-card__bio';

    if (category.items && Array.isArray(category.items)) {
      description.textContent = category.items.join(', ');
    } else if (category.description) {
      description.textContent = category.description;
    }

    const location = document.createElement('p');
    location.className = 'leader-card__role';

    if (category.dropOffLocation) {
      location.textContent = `Drop-off: ${category.dropOffLocation}, ${category.dropOffHours}`;
    } else if (category.contact) {
      const contactLink = document.createElement('a');
      contactLink.className = 'leader-card__email';
      contactLink.href = `mailto:${category.contact}`;
      contactLink.textContent = category.contact;
      location.appendChild(contactLink);
    }

    content.appendChild(name);
    content.appendChild(description);
    if (location.textContent || location.children.length > 0) {
      content.appendChild(location);
    }

    article.appendChild(content);
    fragment.appendChild(article);
  });

  container.innerHTML = '';
  container.appendChild(fragment);

  log('info', 'Donation needs rendered', { count: donationNeeds.categories.length });
}

// ============================================================================
// TESTIMONIALS CAROUSEL
// ============================================================================

/**
 * Initializes testimonials carousel functionality
 */
function initTestimonialsCarousel() {
  const track = querySelector(SELECTORS.TESTIMONIALS_TRACK);
  const prevButton = querySelector(SELECTORS.TESTIMONIALS_PREV);
  const nextButton = querySelector(SELECTORS.TESTIMONIALS_NEXT);
  const indicatorsContainer = querySelector(SELECTORS.TESTIMONIALS_INDICATORS);

  if (!track) {
    log('info', 'Testimonials carousel not found on page');
    return;
  }

  const indicators = querySelectorAll('.testimonials__indicator', indicatorsContainer);

  function updateCarousel() {
    const { currentIndex, totalTestimonials } = state.testimonialsState;

    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    if (prevButton) {
      prevButton.disabled = currentIndex === 0;
    }

    if (nextButton) {
      nextButton.disabled = currentIndex === totalTestimonials - 1;
    }

    indicators.forEach((indicator, index) => {
      indicator.setAttribute('aria-selected', index === currentIndex ? 'true' : 'false');
    });

    log('info', 'Testimonials carousel updated', { currentIndex });
  }

  function goToSlide(index) {
    const { totalTestimonials } = state.testimonialsState;

    if (index < 0 || index >= totalTestimonials) {
      return;
    }

    state.testimonialsState.currentIndex = index;
    updateCarousel();
    restartAutoRotate();
  }

  function goToPrevious() {
    const { currentIndex } = state.testimonialsState;

    if (currentIndex > 0) {
      goToSlide(currentIndex - 1);
    }
  }

  function goToNext() {
    const { currentIndex, totalTestimonials } = state.testimonialsState;

    if (currentIndex < totalTestimonials - 1) {
      goToSlide(currentIndex + 1);
    }
  }

  function startAutoRotate() {
    if (state.testimonialsState.autoRotateTimer) {
      return;
    }

    state.testimonialsState.autoRotateTimer = setInterval(() => {
      if (!state.testimonialsState.isPaused) {
        const { currentIndex, totalTestimonials } = state.testimonialsState;

        if (currentIndex === totalTestimonials - 1) {
          goToSlide(0);
        } else {
          goToNext();
        }
      }
    }, 7000);

    log('info', 'Testimonials auto-rotation started');
  }

  function stopAutoRotate() {
    if (state.testimonialsState.autoRotateTimer) {
      clearInterval(state.testimonialsState.autoRotateTimer);
      state.testimonialsState.autoRotateTimer = null;
      log('info', 'Testimonials auto-rotation stopped');
    }
  }

  function restartAutoRotate() {
    stopAutoRotate();
    startAutoRotate();
  }

  function pause() {
    state.testimonialsState.isPaused = true;
  }

  function resume() {
    state.testimonialsState.isPaused = false;
  }

  if (prevButton) {
    prevButton.addEventListener('click', goToPrevious);
  }

  if (nextButton) {
    nextButton.addEventListener('click', goToNext);
  }

  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => goToSlide(index));
  });

  const carousel = track.closest('.testimonials__carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', pause);
    carousel.addEventListener('mouseleave', resume);
  }

  updateCarousel();
  startAutoRotate();

  log('info', 'Testimonials carousel initialized');
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

  modalImage.src = image.url || image.image || image.src;
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

/**
 * Sets up intersection observer for impact metrics animation
 * @param {Element} container - Container to observe metrics in
 */
function setupImpactMetricsObserver(container) {
  if (!container) {
    return;
  }

  const metricsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const metricCard = entry.target;
          const numberElement = querySelector(SELECTORS.IMPACT_METRIC_NUMBER, metricCard);

          if (numberElement && !state.impactMetricsAnimated.has(numberElement)) {
            animateMetricCounter(numberElement);
            state.impactMetricsAnimated.add(numberElement);
            metricsObserver.unobserve(metricCard);
          }
        }
      });
    },
    {
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px',
    }
  );

  const metricCards = querySelectorAll('[data-metric-card]', container);
  metricCards.forEach((card) => {
    metricsObserver.observe(card);
  });

  log('info', 'Impact metrics observer setup', { metricCount: metricCards.length });
}

/**
 * Animates a metric counter from 0 to target value
 * @param {Element} element - Counter element
 */
function animateMetricCounter(element) {
  const targetValue = parseInt(element.getAttribute('data-target-value'), 10);

  if (isNaN(targetValue)) {
    log('warn', 'Invalid target value for metric counter');
    return;
  }

  const duration = 2000;
  const startTime = performance.now();

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutQuart(progress);
    const currentValue = Math.round(targetValue * easedProgress);

    element.textContent = formatNumber(currentValue);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      element.textContent = formatNumber(targetValue);
      log('info', 'Metric counter animation completed', { targetValue });
    }
  }

  requestAnimationFrame(animate);
}

// ============================================================================
// MINISTRY-SPECIFIC FEATURES
// ============================================================================

/**
 * Applies ministry-specific theming and features
 * @param {string} ministryType - Type of ministry
 */
function applyMinistryTheming(ministryType) {
  const body = document.body;
  
  Object.values(MINISTRY_TYPES).forEach((type) => {
    body.classList.remove(`ministry--${type}`);
  });
  
  body.classList.add(`ministry--${ministryType}`);
  
  log('info', 'Ministry theming applied', { ministryType });
}

/**
 * Handles ministry-specific data structure variations
 * @param {Object} data - Ministry data
 * @param {string} ministryType - Type of ministry
 * @returns {Object} Normalized data structure
 */
function normalizeMinistryData(data, ministryType) {
  const normalized = { ...data };
  
  if (ministryType === MINISTRY_TYPES.CHILDRENS) {
    if (data.ageGroups && !normalized.schedule) {
      normalized.schedule = {
        regular: data.ageGroups.map((group) => ({
          id: group.name.toLowerCase().replace(/\s+/g, '-'),
          name: group.name,
          day: group.ages,
          time: data.meetingSchedule?.sunday?.time || '',
          location: group.room || '',
          description: group.description,
        })),
        special: data.specialEvents || [],
      };
    }
  }
  
  if (ministryType === MINISTRY_TYPES.MENS) {
    if (data.schedule?.regular) {
      normalized.schedule.regular = data.schedule.regular.map((item) => ({
        ...item,
        id: item.name.toLowerCase().replace(/\s+/g, '-'),
        day: item.day || item.frequency,
      }));
    }
  }

  if (ministryType === MINISTRY_TYPES.OUTREACH) {
    if (data.initiatives && !normalized.schedule) {
      normalized.schedule = {
        regular: data.initiatives.map((initiative) => ({
          id: initiative.id,
          name: initiative.name,
          day: initiative.schedule,
          time: '',
          location: initiative.location,
          description: initiative.description,
        })),
        special: [],
      };
    }

    if (data.gallery && Array.isArray(data.gallery)) {
      normalized.gallery = data.gallery.map((item) => ({
        ...item,
        image: item.src || item.image,
        url: item.src || item.url || item.image,
        thumbnail: item.src || item.thumbnail || item.image,
      }));
    }
  }
  
  return normalized;
}

/**
 * Initializes outreach-specific features
 * @param {Object} data - Ministry data
 */
function initOutreachFeatures(data) {
  if (!data) {
    return;
  }

  const impactMetricsContainer = querySelector(SELECTORS.IMPACT_METRICS_CONTAINER);
  if (impactMetricsContainer && data.impactMetrics) {
    renderImpactMetrics(data.impactMetrics, impactMetricsContainer);
  }

  const impactStoriesContainer = querySelector('[data-impact-stories]');
  if (impactStoriesContainer && data.impactMetrics?.stories) {
    renderImpactStories(data.impactMetrics.stories, impactStoriesContainer);
  }

  const volunteerOpportunitiesContainer = querySelector('[data-volunteer-opportunities]');
  if (volunteerOpportunitiesContainer && data.volunteerOpportunities) {
    renderVolunteerOpportunities(data.volunteerOpportunities, volunteerOpportunitiesContainer);
  }

  const donationNeedsContainer = querySelector('[data-donation-needs]');
  if (donationNeedsContainer && data.donationNeeds) {
    renderDonationNeeds(data.donationNeeds, donationNeedsContainer);
  }

  log('info', 'Outreach-specific features initialized');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes ministry page
 * @param {string} ministryName - Name of ministry to load
 */
async function initMinistryPage(ministryName = null) {
  try {
    const detectedType = ministryName || detectMinistryType();
    state.currentMinistryType = detectedType;
    
    log('info', 'Initializing ministry page', { ministryType: detectedType });

    applyMinistryTheming(detectedType);

    const data = await fetchMinistryData(detectedType);
    const normalizedData = normalizeMinistryData(data, detectedType);
    state.ministryData = normalizedData;

    const leadershipContainer = querySelector(SELECTORS.LEADERSHIP_GRID);
    if (leadershipContainer && normalizedData.leadership) {
      renderLeadership(normalizedData.leadership, leadershipContainer);
    }

    const scheduleContainer = querySelector(SELECTORS.SCHEDULE_GRID);
    if (scheduleContainer && normalizedData.schedule && normalizedData.schedule.regular) {
      renderSchedule(normalizedData.schedule.regular, scheduleContainer);
    }

    const specialEventsContainer = querySelector(SELECTORS.SPECIAL_EVENTS_GRID);
    if (specialEventsContainer && normalizedData.schedule && normalizedData.schedule.special) {
      renderSpecialEvents(normalizedData.schedule.special, specialEventsContainer);
    }

    const galleryContainer = querySelector(SELECTORS.GALLERY_GRID);
    if (galleryContainer && normalizedData.gallery) {
      renderGallery(normalizedData.gallery, galleryContainer);
    }

    const testimonialsTrack = querySelector(SELECTORS.TESTIMONIALS_TRACK);
    const testimonialsIndicators = querySelector(SELECTORS.TESTIMONIALS_INDICATORS);
    if (testimonialsTrack && normalizedData.testimonials) {
      renderTestimonials(normalizedData.testimonials, testimonialsTrack, testimonialsIndicators);
      initTestimonialsCarousel();
    }

    if (detectedType === MINISTRY_TYPES.OUTREACH) {
      initOutreachFeatures(normalizedData);
    }

    log('info', 'Ministry page initialized successfully', { ministryType: detectedType });
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

  if (state.testimonialsState.autoRotateTimer) {
    clearInterval(state.testimonialsState.autoRotateTimer);
    state.testimonialsState.autoRotateTimer = null;
  }

  state.imageCache.clear();
  state.loadingImages.clear();
  state.ministryData = null;
  state.currentGalleryIndex = 0;
  state.currentMinistryType = null;
  state.impactMetricsAnimated.clear();
  state.testimonialsState = {
    currentIndex: 0,
    totalTestimonials: 0,
    autoRotateTimer: null,
    isPaused: false,
  };

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
  renderTestimonials,
  initTestimonialsCarousel,
  openGalleryModal,
  closeGalleryModal,
  detectMinistryType,
  applyMinistryTheming,
  renderImpactMetrics,
  renderImpactStories,
  renderVolunteerOpportunities,
  renderDonationNeeds,
};