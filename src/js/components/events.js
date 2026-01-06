/**
 * Events Page Component
 * 
 * Provides comprehensive event management functionality including:
 * - Dynamic event loading from JSON data source
 * - Category and date range filtering
 * - Full-text search across event properties
 * - Multiple calendar views (grid, month, week, day)
 * - Event detail modal with calendar export
 * - Progressive image loading with error handling
 * - Nigerian timezone (WAT) support
 * - Responsive design with accessibility features
 * 
 * @module components/events
 * @generated-from: task-id:TASK-007
 * @modifies: none
 * @dependencies: [lazy-loading]
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { observeImages } from '../utils/lazy-loading.js';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  DATA_URL: '/data/events.json',
  TIMEZONE: 'Africa/Lagos',
  DEBOUNCE_DELAY: 300,
  IMAGE_LOADING_DELAY: 100,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
});

const SELECTORS = Object.freeze({
  SEARCH_INPUT: '#event-search',
  CATEGORY_FILTERS: 'input[name="category"]',
  DATE_FROM: '#date-from',
  DATE_TO: '#date-to',
  VIEW_BUTTONS: '.events__view-btn',
  EVENTS_LIST: '#events-list',
  EVENTS_COUNT: '#events-count',
  LOADING: '.events__loading',
  ERROR: '.events__error',
  ERROR_MESSAGE: '.events__error-message',
  RETRY_BUTTON: '.events__retry-btn',
  EMPTY_STATE: '.events__empty',
  CLEAR_FILTERS: '.events__clear-filters-btn',
  VIEW_CONTENTS: '[data-view-content]',
  MODAL: '#event-modal',
  MODAL_TITLE: '#modal-title',
  MODAL_IMAGE: '#modal-image',
  MODAL_DATE: '#modal-date',
  MODAL_TIME: '#modal-time',
  MODAL_CATEGORY: '#modal-category',
  MODAL_DESCRIPTION: '#modal-description',
  MODAL_LOCATION: '#modal-location',
  ADD_GOOGLE_CALENDAR: '#add-google-calendar',
  DOWNLOAD_ICAL: '#download-ical',
  CALENDAR_MONTH_TITLE: '#calendar-month-title',
  CALENDAR_MONTH_GRID: '#calendar-month-grid',
  CALENDAR_WEEK_TITLE: '#calendar-week-title',
  CALENDAR_WEEK_GRID: '#calendar-week-grid',
  CALENDAR_DAY_TITLE: '#calendar-day-title',
  CALENDAR_DAY_GRID: '#calendar-day-grid',
  CALENDAR_NAV_BUTTONS: '.calendar__nav-btn',
});

const CATEGORY_LABELS = Object.freeze({
  worship: 'Worship',
  youth: 'Youth',
  conference: 'Conference',
  'bible-study': 'Bible Study',
  fellowship: 'Fellowship',
  children: 'Children',
  community: 'Community',
});

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  events: [],
  filteredEvents: [],
  currentView: 'grid',
  currentDate: new Date(),
  filters: {
    category: 'all',
    dateFrom: null,
    dateTo: null,
    searchQuery: '',
  },
  cache: {
    data: null,
    timestamp: null,
  },
  selectedEvent: null,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely queries a single DOM element
 * @param {string} selector - CSS selector
 * @returns {Element|null} Found element or null
 */
function querySelector(selector) {
  try {
    return document.querySelector(selector);
  } catch (error) {
    console.error(`[Events] Invalid selector: ${selector}`, error);
    return null;
  }
}

/**
 * Safely queries multiple DOM elements
 * @param {string} selector - CSS selector
 * @returns {NodeList} NodeList of found elements
 */
function querySelectorAll(selector) {
  try {
    return document.querySelectorAll(selector);
  } catch (error) {
    console.error(`[Events] Invalid selector: ${selector}`, error);
    return document.createDocumentFragment().childNodes;
  }
}

/**
 * Creates a debounced version of a function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay) {
  let timeoutId = null;
  
  return function debounced(...args) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      timeoutId = null;
      func.apply(this, args);
    }, delay);
  };
}

/**
 * Formats date in Nigerian timezone
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
function formatDate(date, options = {}) {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-NG', {
      timeZone: CONFIG.TIMEZONE,
      ...options,
    }).format(dateObj);
  } catch (error) {
    console.error('[Events] Date formatting error', { date, error: error.message });
    return String(date);
  }
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
    component: 'events',
    message,
    ...context,
  };
  
  const logMethod = console[level] || console.log;
  logMethod('[Events]', message, context);
}

// ============================================================================
// DATA LOADING & CACHING
// ============================================================================

/**
 * Checks if cached data is still valid
 * @returns {boolean} True if cache is valid
 */
function isCacheValid() {
  if (!state.cache.data || !state.cache.timestamp) {
    return false;
  }
  
  const age = Date.now() - state.cache.timestamp;
  return age < CONFIG.CACHE_DURATION;
}

/**
 * Fetches events data with retry logic
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Array>} Events data
 */
async function fetchEventsWithRetry(attempt = 1) {
  try {
    const response = await fetch(CONFIG.DATA_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format: expected array');
    }
    
    return data;
  } catch (error) {
    if (attempt < CONFIG.RETRY_ATTEMPTS) {
      log('warn', `Fetch attempt ${attempt} failed, retrying...`, {
        error: error.message,
        nextAttempt: attempt + 1,
      });
      
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
      return fetchEventsWithRetry(attempt + 1);
    }
    
    throw error;
  }
}

/**
 * Loads events data from JSON file
 * @returns {Promise<Array>} Events data
 */
async function loadEvents() {
  // Check cache first
  if (isCacheValid()) {
    log('info', 'Using cached events data');
    return state.cache.data;
  }
  
  showLoading(true);
  hideError();
  
  try {
    const data = await fetchEventsWithRetry();
    
    // Validate and normalize event data
    const normalizedEvents = data.map(event => ({
      ...event,
      date: new Date(event.date),
      time: event.time || '00:00',
      endTime: event.endTime || event.time || '00:00',
    }));
    
    // Update cache
    state.cache.data = normalizedEvents;
    state.cache.timestamp = Date.now();
    
    log('info', 'Events loaded successfully', { count: normalizedEvents.length });
    
    return normalizedEvents;
  } catch (error) {
    log('error', 'Failed to load events', { error: error.message });
    showError('Failed to load events. Please check your connection and try again.');
    throw error;
  } finally {
    showLoading(false);
  }
}

// ============================================================================
// UI STATE MANAGEMENT
// ============================================================================

/**
 * Shows or hides loading indicator
 * @param {boolean} show - Whether to show loading
 */
function showLoading(show) {
  const loading = querySelector(SELECTORS.LOADING);
  if (loading) {
    loading.style.display = show ? 'flex' : 'none';
  }
}

/**
 * Shows error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  const errorContainer = querySelector(SELECTORS.ERROR);
  const errorMessage = querySelector(SELECTORS.ERROR_MESSAGE);
  
  if (errorContainer && errorMessage) {
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
  }
}

/**
 * Hides error message
 */
function hideError() {
  const errorContainer = querySelector(SELECTORS.ERROR);
  if (errorContainer) {
    errorContainer.style.display = 'none';
  }
}

/**
 * Shows or hides empty state
 * @param {boolean} show - Whether to show empty state
 */
function showEmptyState(show) {
  const emptyState = querySelector(SELECTORS.EMPTY_STATE);
  if (emptyState) {
    emptyState.style.display = show ? 'block' : 'none';
  }
}

/**
 * Updates event count display
 * @param {number} count - Number of events
 */
function updateEventCount(count) {
  const countElement = querySelector(SELECTORS.EVENTS_COUNT);
  if (countElement) {
    countElement.textContent = count;
  }
}

// ============================================================================
// FILTERING & SEARCH
// ============================================================================

/**
 * Filters events based on current filter state
 * @param {Array} events - Events to filter
 * @returns {Array} Filtered events
 */
function filterEvents(events) {
  let filtered = [...events];
  
  // Category filter
  if (state.filters.category !== 'all') {
    filtered = filtered.filter(event => event.category === state.filters.category);
  }
  
  // Date range filter
  if (state.filters.dateFrom) {
    const fromDate = new Date(state.filters.dateFrom);
    filtered = filtered.filter(event => event.date >= fromDate);
  }
  
  if (state.filters.dateTo) {
    const toDate = new Date(state.filters.dateTo);
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter(event => event.date <= toDate);
  }
  
  // Search filter
  if (state.filters.searchQuery) {
    const query = state.filters.searchQuery.toLowerCase();
    filtered = filtered.filter(event => {
      const searchableText = [
        event.title,
        event.description,
        event.category,
        event.location,
        event.organizer,
      ].join(' ').toLowerCase();
      
      return searchableText.includes(query);
    });
  }
  
  // Sort by date
  filtered.sort((a, b) => a.date - b.date);
  
  return filtered;
}

/**
 * Applies filters and updates display
 */
function applyFilters() {
  state.filteredEvents = filterEvents(state.events);
  updateEventCount(state.filteredEvents.length);
  
  if (state.filteredEvents.length === 0) {
    showEmptyState(true);
  } else {
    showEmptyState(false);
  }
  
  renderCurrentView();
  
  log('info', 'Filters applied', {
    total: state.events.length,
    filtered: state.filteredEvents.length,
    filters: state.filters,
  });
}

/**
 * Clears all filters
 */
function clearFilters() {
  // Reset filter state
  state.filters = {
    category: 'all',
    dateFrom: null,
    dateTo: null,
    searchQuery: '',
  };
  
  // Reset UI
  const searchInput = querySelector(SELECTORS.SEARCH_INPUT);
  if (searchInput) {
    searchInput.value = '';
  }
  
  const categoryAll = querySelector('input[name="category"][value="all"]');
  if (categoryAll) {
    categoryAll.checked = true;
  }
  
  const dateFrom = querySelector(SELECTORS.DATE_FROM);
  const dateTo = querySelector(SELECTORS.DATE_TO);
  if (dateFrom) dateFrom.value = '';
  if (dateTo) dateTo.value = '';
  
  applyFilters();
  
  log('info', 'Filters cleared');
}

// ============================================================================
// EVENT RENDERING
// ============================================================================

/**
 * Creates HTML for a single event card
 * @param {Object} event - Event data
 * @returns {string} HTML string
 */
function createEventCard(event) {
  const dateStr = formatDate(event.date, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  const categoryLabel = CATEGORY_LABELS[event.category] || event.category;
  
  return `
    <li class="events__item">
      <article class="event-card" data-event-id="${sanitizeHTML(event.id)}">
        <div class="event-card__image-container">
          <img 
            class="event-card__image lazy-load"
            data-src="${sanitizeHTML(event.image)}"
            alt="${sanitizeHTML(event.title)}"
            loading="lazy"
            decoding="async"
          >
        </div>
        <div class="event-card__content">
          <span class="event-card__category">${sanitizeHTML(categoryLabel)}</span>
          <h3 class="event-card__title">${sanitizeHTML(event.title)}</h3>
          <time class="event-card__date" datetime="${event.date.toISOString()}">
            ${dateStr}
          </time>
          <p class="event-card__time">${sanitizeHTML(event.time)} - ${sanitizeHTML(event.endTime)}</p>
          <p class="event-card__location">${sanitizeHTML(event.location)}</p>
          ${event.registrationRequired ? '<span class="event-card__badge">Registration Required</span>' : ''}
          <button 
            type="button" 
            class="event-card__btn"
            aria-label="View details for ${sanitizeHTML(event.title)}"
          >
            View Details
          </button>
        </div>
      </article>
    </li>
  `;
}

/**
 * Renders events in grid view
 */
function renderGridView() {
  const eventsList = querySelector(SELECTORS.EVENTS_LIST);
  if (!eventsList) return;
  
  if (state.filteredEvents.length === 0) {
    eventsList.innerHTML = '';
    return;
  }
  
  const html = state.filteredEvents.map(createEventCard).join('');
  eventsList.innerHTML = html;
  
  // Initialize lazy loading for images
  setTimeout(() => {
    observeImages();
  }, CONFIG.IMAGE_LOADING_DELAY);
  
  // Add click handlers to event cards
  const eventCards = querySelectorAll('.event-card');
  eventCards.forEach(card => {
    const btn = card.querySelector('.event-card__btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const eventId = card.dataset.eventId;
        const event = state.filteredEvents.find(e => e.id === eventId);
        if (event) {
          showEventModal(event);
        }
      });
    }
  });
}

/**
 * Renders events in month calendar view
 */
function renderMonthView() {
  const grid = querySelector(SELECTORS.CALENDAR_MONTH_GRID);
  const title = querySelector(SELECTORS.CALENDAR_MONTH_TITLE);
  
  if (!grid || !title) return;
  
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  
  title.textContent = formatDate(state.currentDate, { year: 'numeric', month: 'long' });
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  let html = '<div class="calendar__weekdays">';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekdays.forEach(day => {
    html += `<div class="calendar__weekday">${day}</div>`;
  });
  html += '</div><div class="calendar__days">';
  
  // Empty cells before first day
  for (let i = 0; i < startDay; i++) {
    html += '<div class="calendar__day calendar__day--empty"></div>';
  }
  
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const eventsOnDay = state.filteredEvents.filter(event => {
      return event.date.toDateString() === date.toDateString();
    });
    
    const isToday = date.toDateString() === new Date().toDateString();
    const classes = ['calendar__day'];
    if (isToday) classes.push('calendar__day--today');
    if (eventsOnDay.length > 0) classes.push('calendar__day--has-events');
    
    html += `
      <div class="${classes.join(' ')}" data-date="${date.toISOString()}">
        <span class="calendar__day-number">${day}</span>
        ${eventsOnDay.length > 0 ? `<span class="calendar__day-count">${eventsOnDay.length}</span>` : ''}
      </div>
    `;
  }
  
  html += '</div>';
  grid.innerHTML = html;
  
  // Add click handlers
  const dayElements = grid.querySelectorAll('.calendar__day--has-events');
  dayElements.forEach(dayEl => {
    dayEl.addEventListener('click', () => {
      const dateStr = dayEl.dataset.date;
      const date = new Date(dateStr);
      state.currentDate = date;
      switchView('day');
    });
  });
}

/**
 * Renders events in week calendar view
 */
function renderWeekView() {
  const grid = querySelector(SELECTORS.CALENDAR_WEEK_GRID);
  const title = querySelector(SELECTORS.CALENDAR_WEEK_TITLE);
  
  if (!grid || !title) return;
  
  const startOfWeek = new Date(state.currentDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  
  title.textContent = `${formatDate(startOfWeek, { month: 'short', day: 'numeric' })} - ${formatDate(endOfWeek, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  
  let html = '';
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    
    const eventsOnDay = state.filteredEvents.filter(event => {
      return event.date.toDateString() === date.toDateString();
    });
    
    const isToday = date.toDateString() === new Date().toDateString();
    
    html += `
      <div class="calendar__week-day ${isToday ? 'calendar__week-day--today' : ''}">
        <div class="calendar__week-day-header">
          <span class="calendar__week-day-name">${formatDate(date, { weekday: 'short' })}</span>
          <span class="calendar__week-day-number">${date.getDate()}</span>
        </div>
        <div class="calendar__week-day-events">
          ${eventsOnDay.map(event => `
            <div class="calendar__week-event" data-event-id="${sanitizeHTML(event.id)}">
              <span class="calendar__week-event-time">${sanitizeHTML(event.time)}</span>
              <span class="calendar__week-event-title">${sanitizeHTML(event.title)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  grid.innerHTML = html;
  
  // Add click handlers
  const eventElements = grid.querySelectorAll('.calendar__week-event');
  eventElements.forEach(eventEl => {
    eventEl.addEventListener('click', () => {
      const eventId = eventEl.dataset.eventId;
      const event = state.filteredEvents.find(e => e.id === eventId);
      if (event) {
        showEventModal(event);
      }
    });
  });
}

/**
 * Renders events in day calendar view
 */
function renderDayView() {
  const grid = querySelector(SELECTORS.CALENDAR_DAY_GRID);
  const title = querySelector(SELECTORS.CALENDAR_DAY_TITLE);
  
  if (!grid || !title) return;
  
  title.textContent = formatDate(state.currentDate, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const eventsOnDay = state.filteredEvents.filter(event => {
    return event.date.toDateString() === state.currentDate.toDateString();
  });
  
  if (eventsOnDay.length === 0) {
    grid.innerHTML = '<p class="calendar__day-empty">No events scheduled for this day.</p>';
    return;
  }
  
  const html = eventsOnDay.map(event => `
    <article class="calendar__day-event" data-event-id="${sanitizeHTML(event.id)}">
      <div class="calendar__day-event-time">
        <time datetime="${event.date.toISOString()}">${sanitizeHTML(event.time)}</time>
        <span>-</span>
        <time>${sanitizeHTML(event.endTime)}</time>
      </div>
      <div class="calendar__day-event-content">
        <h3 class="calendar__day-event-title">${sanitizeHTML(event.title)}</h3>
        <p class="calendar__day-event-location">${sanitizeHTML(event.location)}</p>
        <p class="calendar__day-event-description">${sanitizeHTML(event.description)}</p>
        <button 
          type="button" 
          class="calendar__day-event-btn"
          aria-label="View details for ${sanitizeHTML(event.title)}"
        >
          View Details
        </button>
      </div>
    </article>
  `).join('');
  
  grid.innerHTML = html;
  
  // Add click handlers
  const eventElements = grid.querySelectorAll('.calendar__day-event-btn');
  eventElements.forEach(btn => {
    btn.addEventListener('click', () => {
      const article = btn.closest('.calendar__day-event');
      const eventId = article.dataset.eventId;
      const event = state.filteredEvents.find(e => e.id === eventId);
      if (event) {
        showEventModal(event);
      }
    });
  });
}

/**
 * Renders the current view
 */
function renderCurrentView() {
  // Hide all view contents
  const viewContents = querySelectorAll(SELECTORS.VIEW_CONTENTS);
  viewContents.forEach(content => {
    content.style.display = 'none';
  });
  
  // Show current view
  const currentViewContent = querySelector(`[data-view-content="${state.currentView}"]`);
  if (currentViewContent) {
    currentViewContent.style.display = 'block';
  }
  
  // Render based on view type
  switch (state.currentView) {
    case 'grid':
      renderGridView();
      break;
    case 'month':
      renderMonthView();
      break;
    case 'week':
      renderWeekView();
      break;
    case 'day':
      renderDayView();
      break;
    default:
      log('warn', 'Unknown view type', { view: state.currentView });
  }
}

// ============================================================================
// VIEW SWITCHING
// ============================================================================

/**
 * Switches to a different view
 * @param {string} view - View name (grid, month, week, day)
 */
function switchView(view) {
  state.currentView = view;
  
  // Update button states
  const viewButtons = querySelectorAll(SELECTORS.VIEW_BUTTONS);
  viewButtons.forEach(btn => {
    const btnView = btn.dataset.view;
    const isActive = btnView === view;
    
    if (isActive) {
      btn.classList.add('events__view-btn--active');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('events__view-btn--active');
      btn.setAttribute('aria-pressed', 'false');
    }
  });
  
  renderCurrentView();
  
  log('info', 'View switched', { view });
}

/**
 * Navigates calendar view (prev/next)
 * @param {string} direction - Navigation direction (prev, next)
 */
function navigateCalendar(direction) {
  const multiplier = direction === 'prev' ? -1 : 1;
  
  switch (state.currentView) {
    case 'month':
      state.currentDate.setMonth(state.currentDate.getMonth() + multiplier);
      break;
    case 'week':
      state.currentDate.setDate(state.currentDate.getDate() + (7 * multiplier));
      break;
    case 'day':
      state.currentDate.setDate(state.currentDate.getDate() + multiplier);
      break;
    default:
      return;
  }
  
  renderCurrentView();
}

// ============================================================================
// EVENT MODAL
// ============================================================================

/**
 * Shows event detail modal
 * @param {Object} event - Event data
 */
function showEventModal(event) {
  const modal = querySelector(SELECTORS.MODAL);
  if (!modal) return;
  
  state.selectedEvent = event;
  
  // Update modal content
  const title = querySelector(SELECTORS.MODAL_TITLE);
  const image = querySelector(SELECTORS.MODAL_IMAGE);
  const date = querySelector(SELECTORS.MODAL_DATE);
  const time = querySelector(SELECTORS.MODAL_TIME);
  const category = querySelector(SELECTORS.MODAL_CATEGORY);
  const description = querySelector(SELECTORS.MODAL_DESCRIPTION);
  const location = querySelector(SELECTORS.MODAL_LOCATION);
  
  if (title) title.textContent = event.title;
  if (image) {
    image.src = event.image;
    image.alt = event.title;
  }
  if (date) {
    date.textContent = formatDate(event.date, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    date.setAttribute('datetime', event.date.toISOString());
  }
  if (time) time.textContent = `${event.time} - ${event.endTime}`;
  if (category) category.textContent = CATEGORY_LABELS[event.category] || event.category;
  if (description) description.textContent = event.description;
  if (location) location.textContent = `📍 ${event.location}`;
  
  modal.showModal();
  
  log('info', 'Event modal opened', { eventId: event.id });
}

/**
 * Generates Google Calendar URL
 * @param {Object} event - Event data
 * @returns {string} Google Calendar URL
 */
function generateGoogleCalendarURL(event) {
  const startDate = new Date(event.date);
  const [startHour, startMinute] = event.time.split(':');
  startDate.setHours(parseInt(startHour, 10), parseInt(startMinute, 10));
  
  const endDate = new Date(event.date);
  const [endHour, endMinute] = event.endTime.split(':');
  endDate.setHours(parseInt(endHour, 10), parseInt(endMinute, 10));
  
  const formatGoogleDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: event.description,
    location: event.location,
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates iCal file content
 * @param {Object} event - Event data
 * @returns {string} iCal file content
 */
function generateICalContent(event) {
  const startDate = new Date(event.date);
  const [startHour, startMinute] = event.time.split(':');
  startDate.setHours(parseInt(startHour, 10), parseInt(startMinute, 10));
  
  const endDate = new Date(event.date);
  const [endHour, endMinute] = event.endTime.split(':');
  endDate.setHours(parseInt(endHour, 10), parseInt(endMinute, 10));
  
  const formatICalDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Grace Fellowship Church//Events//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@gracefellowship.church`,
    `DTSTAMP:${formatICalDate(new Date())}`,
    `DTSTART:${formatICalDate(startDate)}`,
    `DTEND:${formatICalDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Downloads iCal file
 * @param {Object} event - Event data
 */
function downloadICalFile(event) {
  const content = generateICalContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
  
  log('info', 'iCal file downloaded', { eventId: event.id });
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handles search input
 */
const handleSearch = debounce(() => {
  const searchInput = querySelector(SELECTORS.SEARCH_INPUT);
  if (!searchInput) return;
  
  state.filters.searchQuery = searchInput.value.trim();
  applyFilters();
}, CONFIG.DEBOUNCE_DELAY);

/**
 * Handles category filter change
 * @param {Event} event - Change event
 */
function handleCategoryChange(event) {
  state.filters.category = event.target.value;
  applyFilters();
}

/**
 * Handles date filter change
 */
function handleDateChange() {
  const dateFrom = querySelector(SELECTORS.DATE_FROM);
  const dateTo = querySelector(SELECTORS.DATE_TO);
  
  state.filters.dateFrom = dateFrom?.value || null;
  state.filters.dateTo = dateTo?.value || null;
  
  applyFilters();
}

/**
 * Handles retry button click
 */
async function handleRetry() {
  try {
    state.events = await loadEvents();
    applyFilters();
  } catch (error) {
    // Error already handled in loadEvents
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes event listeners
 */
function initEventListeners() {
  // Search
  const searchInput = querySelector(SELECTORS.SEARCH_INPUT);
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  // Category filters
  const categoryFilters = querySelectorAll(SELECTORS.CATEGORY_FILTERS);
  categoryFilters.forEach(filter => {
    filter.addEventListener('change', handleCategoryChange);
  });
  
  // Date filters
  const dateFrom = querySelector(SELECTORS.DATE_FROM);
  const dateTo = querySelector(SELECTORS.DATE_TO);
  if (dateFrom) dateFrom.addEventListener('change', handleDateChange);
  if (dateTo) dateTo.addEventListener('change', handleDateChange);
  
  // View buttons
  const viewButtons = querySelectorAll(SELECTORS.VIEW_BUTTONS);
  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) switchView(view);
    });
  });
  
  // Calendar navigation
  const navButtons = querySelectorAll(SELECTORS.CALENDAR_NAV_BUTTONS);
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const direction = btn.dataset.nav;
      if (direction) navigateCalendar(direction);
    });
  });
  
  // Clear filters
  const clearFiltersBtn = querySelector(SELECTORS.CLEAR_FILTERS);
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearFilters);
  }
  
  // Retry button
  const retryBtn = querySelector(SELECTORS.RETRY_BUTTON);
  if (retryBtn) {
    retryBtn.addEventListener('click', handleRetry);
  }
  
  // Modal calendar buttons
  const addGoogleBtn = querySelector(SELECTORS.ADD_GOOGLE_CALENDAR);
  const downloadICalBtn = querySelector(SELECTORS.DOWNLOAD_ICAL);
  
  if (addGoogleBtn) {
    addGoogleBtn.addEventListener('click', () => {
      if (state.selectedEvent) {
        const url = generateGoogleCalendarURL(state.selectedEvent);
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  }
  
  if (downloadICalBtn) {
    downloadICalBtn.addEventListener('click', () => {
      if (state.selectedEvent) {
        downloadICalFile(state.selectedEvent);
      }
    });
  }
  
  log('info', 'Event listeners initialized');
}

/**
 * Initializes the events page
 */
export async function init() {
  try {
    log('info', 'Initializing events page');
    
    // Load events data
    state.events = await loadEvents();
    
    // Initialize event listeners
    initEventListeners();
    
    // Apply initial filters
    applyFilters();
    
    log('info', 'Events page initialized successfully');
  } catch (error) {
    log('error', 'Events page initialization failed', {
      error: error.message,
      stack: error.stack,
    });
  }
}

// Auto-initialize if on events page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}