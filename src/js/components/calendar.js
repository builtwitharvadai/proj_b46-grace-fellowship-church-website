/**
 * Calendar Component
 * 
 * Provides calendar view functionality for displaying events in month, week, and day formats.
 * Handles date navigation, view switching, event positioning, and Nigerian timezone (WAT) support.
 * 
 * @module components/calendar
 * @generated-from: task-id:TASK-007
 * @modifies: none
 * @dependencies: none
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  TIMEZONE: 'Africa/Lagos', // Nigerian timezone (WAT)
  LOCALE: 'en-NG',
  FIRST_DAY_OF_WEEK: 0, // Sunday
  HOURS_START: 0,
  HOURS_END: 24,
  HOUR_HEIGHT: 60, // pixels per hour in day/week view
  EVENT_MIN_HEIGHT: 30, // minimum event height in pixels
  WEEK_DAYS: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  MONTH_NAMES: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
});

const SELECTORS = Object.freeze({
  MONTH_GRID: '#calendar-month-grid',
  MONTH_TITLE: '#calendar-month-title',
  WEEK_GRID: '#calendar-week-grid',
  WEEK_TITLE: '#calendar-week-title',
  DAY_GRID: '#calendar-day-grid',
  DAY_TITLE: '#calendar-day-title',
  NAV_PREV: '[data-nav="prev"]',
  NAV_NEXT: '[data-nav="next"]',
});

const CLASSES = Object.freeze({
  CALENDAR_DAY: 'calendar__day',
  CALENDAR_DAY_HEADER: 'calendar__day-header',
  CALENDAR_DAY_NUMBER: 'calendar__day-number',
  CALENDAR_DAY_EVENTS: 'calendar__day-events',
  CALENDAR_EVENT: 'calendar__event',
  CALENDAR_EVENT_TIME: 'calendar__event-time',
  CALENDAR_EVENT_TITLE: 'calendar__event-title',
  DAY_OTHER_MONTH: 'calendar__day--other-month',
  DAY_TODAY: 'calendar__day--today',
  DAY_HAS_EVENTS: 'calendar__day--has-events',
  WEEK_HOUR: 'calendar__hour',
  WEEK_HOUR_LABEL: 'calendar__hour-label',
  WEEK_DAY_COLUMN: 'calendar__day-column',
  WEEK_EVENT: 'calendar__week-event',
});

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  currentDate: null,
  currentView: 'month',
  events: [],
  eventHandlers: new Map(),
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a date in Nigerian timezone (WAT)
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {Date} Date object in WAT timezone
 */
function createWATDate(dateInput) {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    // Convert to WAT timezone
    const watString = date.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE });
    return new Date(watString);
  } catch (error) {
    console.error('[Calendar] Error creating WAT date:', error);
    return new Date();
  }
}

/**
 * Formats date for display
 * @param {Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
function formatDate(date, options = {}) {
  try {
    return new Intl.DateTimeFormat(CONFIG.LOCALE, {
      timeZone: CONFIG.TIMEZONE,
      ...options,
    }).format(date);
  } catch (error) {
    console.error('[Calendar] Error formatting date:', error);
    return date.toLocaleDateString();
  }
}

/**
 * Gets the start of day in WAT
 * @param {Date} date - Input date
 * @returns {Date} Start of day
 */
function getStartOfDay(date) {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

/**
 * Gets the start of week in WAT
 * @param {Date} date - Input date
 * @returns {Date} Start of week
 */
function getStartOfWeek(date) {
  const newDate = getStartOfDay(date);
  const day = newDate.getDay();
  const diff = day - CONFIG.FIRST_DAY_OF_WEEK;
  newDate.setDate(newDate.getDate() - diff);
  return newDate;
}

/**
 * Gets the start of month in WAT
 * @param {Date} date - Input date
 * @returns {Date} Start of month
 */
function getStartOfMonth(date) {
  const newDate = new Date(date);
  newDate.setDate(1);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

/**
 * Checks if two dates are the same day
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if same day
 */
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Checks if date is today
 * @param {Date} date - Date to check
 * @returns {boolean} True if today
 */
function isToday(date) {
  const today = createWATDate(new Date());
  return isSameDay(date, today);
}

/**
 * Adds days to a date
 * @param {Date} date - Input date
 * @param {number} days - Number of days to add
 * @returns {Date} New date
 */
function addDays(date, days) {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
}

/**
 * Adds months to a date
 * @param {Date} date - Input date
 * @param {number} months - Number of months to add
 * @returns {Date} New date
 */
function addMonths(date, months) {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
}

/**
 * Gets events for a specific date
 * @param {Date} date - Date to get events for
 * @returns {Array} Array of events
 */
function getEventsForDate(date) {
  return state.events.filter(event => {
    const eventDate = createWATDate(event.date);
    return isSameDay(eventDate, date);
  });
}

/**
 * Parses time string to hours and minutes
 * @param {string} timeString - Time string (HH:MM format)
 * @returns {Object} Object with hours and minutes
 */
function parseTime(timeString) {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
  } catch (error) {
    console.error('[Calendar] Error parsing time:', error);
    return { hours: 0, minutes: 0 };
  }
}

/**
 * Calculates event position in day/week view
 * @param {string} startTime - Event start time
 * @param {string} endTime - Event end time
 * @returns {Object} Position and height in pixels
 */
function calculateEventPosition(startTime, endTime) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  const durationMinutes = endMinutes - startMinutes;
  
  const top = (startMinutes / 60) * CONFIG.HOUR_HEIGHT;
  const height = Math.max((durationMinutes / 60) * CONFIG.HOUR_HEIGHT, CONFIG.EVENT_MIN_HEIGHT);
  
  return { top, height };
}

/**
 * Safely queries a DOM element
 * @param {string} selector - CSS selector
 * @returns {Element|null} Found element or null
 */
function querySelector(selector) {
  try {
    return document.querySelector(selector);
  } catch (error) {
    console.error('[Calendar] Invalid selector:', selector, error);
    return null;
  }
}

/**
 * Creates a DOM element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {Array|string} children - Child elements or text
 * @returns {HTMLElement} Created element
 */
function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('aria-') || key.startsWith('data-')) {
      element.setAttribute(key, value);
    } else {
      element[key] = value;
    }
  });
  
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });
  
  return element;
}

// ============================================================================
// MONTH VIEW
// ============================================================================

/**
 * Renders month view calendar
 * @param {Date} date - Date to render month for
 * @param {Array} events - Events to display
 */
function renderMonthView(date, events) {
  const container = querySelector(SELECTORS.MONTH_GRID);
  const titleElement = querySelector(SELECTORS.MONTH_TITLE);
  
  if (!container || !titleElement) {
    console.error('[Calendar] Month view containers not found');
    return;
  }
  
  // Update title
  const monthName = CONFIG.MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  titleElement.textContent = `${monthName} ${year}`;
  
  // Clear existing content
  container.innerHTML = '';
  
  // Create day headers
  const headerRow = createElement('div', { className: 'calendar__week-header', role: 'row' });
  CONFIG.WEEK_DAYS.forEach(day => {
    const header = createElement('div', {
      className: CLASSES.CALENDAR_DAY_HEADER,
      role: 'columnheader',
    }, day);
    headerRow.appendChild(header);
  });
  container.appendChild(headerRow);
  
  // Get first day of month and calculate grid start
  const firstDay = getStartOfMonth(date);
  const startDate = getStartOfWeek(firstDay);
  
  // Render 6 weeks (42 days)
  const weeksContainer = createElement('div', { className: 'calendar__weeks' });
  
  for (let week = 0; week < 6; week++) {
    const weekRow = createElement('div', { className: 'calendar__week', role: 'row' });
    
    for (let day = 0; day < 7; day++) {
      const currentDate = addDays(startDate, week * 7 + day);
      const dayEvents = getEventsForDate(currentDate);
      const isCurrentMonth = currentDate.getMonth() === date.getMonth();
      const isTodayDate = isToday(currentDate);
      
      const dayClasses = [CLASSES.CALENDAR_DAY];
      if (!isCurrentMonth) dayClasses.push(CLASSES.DAY_OTHER_MONTH);
      if (isTodayDate) dayClasses.push(CLASSES.DAY_TODAY);
      if (dayEvents.length > 0) dayClasses.push(CLASSES.DAY_HAS_EVENTS);
      
      const dayElement = createElement('div', {
        className: dayClasses.join(' '),
        role: 'gridcell',
        'aria-label': formatDate(currentDate, { dateStyle: 'full' }),
      });
      
      const dayNumber = createElement('div', {
        className: CLASSES.CALENDAR_DAY_NUMBER,
      }, currentDate.getDate().toString());
      
      dayElement.appendChild(dayNumber);
      
      // Add events
      if (dayEvents.length > 0) {
        const eventsContainer = createElement('div', {
          className: CLASSES.CALENDAR_DAY_EVENTS,
        });
        
        dayEvents.slice(0, 3).forEach(event => {
          const eventElement = createElement('button', {
            className: CLASSES.CALENDAR_EVENT,
            type: 'button',
            'aria-label': `${event.title} at ${event.time}`,
            dataset: { eventId: event.id },
          });
          
          const eventTitle = createElement('span', {
            className: CLASSES.CALENDAR_EVENT_TITLE,
          }, event.title);
          
          eventElement.appendChild(eventTitle);
          eventsContainer.appendChild(eventElement);
          
          // Store event handler
          state.eventHandlers.set(event.id, () => {
            dispatchEventClick(event);
          });
        });
        
        if (dayEvents.length > 3) {
          const moreText = createElement('div', {
            className: 'calendar__more-events',
          }, `+${dayEvents.length - 3} more`);
          eventsContainer.appendChild(moreText);
        }
        
        dayElement.appendChild(eventsContainer);
      }
      
      weekRow.appendChild(dayElement);
    }
    
    weeksContainer.appendChild(weekRow);
  }
  
  container.appendChild(weeksContainer);
  attachEventListeners(container);
}

// ============================================================================
// WEEK VIEW
// ============================================================================

/**
 * Renders week view calendar
 * @param {Date} date - Date to render week for
 * @param {Array} events - Events to display
 */
function renderWeekView(date, events) {
  const container = querySelector(SELECTORS.WEEK_GRID);
  const titleElement = querySelector(SELECTORS.WEEK_TITLE);
  
  if (!container || !titleElement) {
    console.error('[Calendar] Week view containers not found');
    return;
  }
  
  const weekStart = getStartOfWeek(date);
  const weekEnd = addDays(weekStart, 6);
  
  // Update title
  const startMonth = CONFIG.MONTH_NAMES[weekStart.getMonth()];
  const endMonth = CONFIG.MONTH_NAMES[weekEnd.getMonth()];
  const year = weekStart.getFullYear();
  
  if (startMonth === endMonth) {
    titleElement.textContent = `${startMonth} ${weekStart.getDate()}-${weekEnd.getDate()}, ${year}`;
  } else {
    titleElement.textContent = `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${year}`;
  }
  
  // Clear existing content
  container.innerHTML = '';
  
  // Create header with day names and dates
  const header = createElement('div', { className: 'calendar__week-header' });
  const timeLabel = createElement('div', { className: 'calendar__time-label' }, 'Time');
  header.appendChild(timeLabel);
  
  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(weekStart, i);
    const dayHeader = createElement('div', {
      className: CLASSES.CALENDAR_DAY_HEADER,
    });
    
    const dayName = createElement('div', {
      className: 'calendar__day-name',
    }, CONFIG.WEEK_DAYS[i]);
    
    const dayDate = createElement('div', {
      className: 'calendar__day-date',
    }, currentDate.getDate().toString());
    
    if (isToday(currentDate)) {
      dayHeader.classList.add(CLASSES.DAY_TODAY);
    }
    
    dayHeader.appendChild(dayName);
    dayHeader.appendChild(dayDate);
    header.appendChild(dayHeader);
  }
  
  container.appendChild(header);
  
  // Create time grid
  const grid = createElement('div', { className: 'calendar__week-grid' });
  
  for (let hour = CONFIG.HOURS_START; hour < CONFIG.HOURS_END; hour++) {
    const hourRow = createElement('div', { className: CLASSES.WEEK_HOUR });
    
    const hourLabel = createElement('div', {
      className: CLASSES.WEEK_HOUR_LABEL,
    }, `${hour.toString().padStart(2, '0')}:00`);
    
    hourRow.appendChild(hourLabel);
    
    for (let day = 0; day < 7; day++) {
      const dayColumn = createElement('div', {
        className: CLASSES.WEEK_DAY_COLUMN,
      });
      hourRow.appendChild(dayColumn);
    }
    
    grid.appendChild(hourRow);
  }
  
  container.appendChild(grid);
  
  // Position events
  for (let day = 0; day < 7; day++) {
    const currentDate = addDays(weekStart, day);
    const dayEvents = getEventsForDate(currentDate);
    
    dayEvents.forEach(event => {
      const position = calculateEventPosition(event.time, event.endTime || event.time);
      const eventElement = createElement('button', {
        className: CLASSES.WEEK_EVENT,
        type: 'button',
        'aria-label': `${event.title} at ${event.time}`,
        dataset: { eventId: event.id },
      });
      
      eventElement.style.top = `${position.top}px`;
      eventElement.style.height = `${position.height}px`;
      eventElement.style.left = `${(day * 14.28) + 14.28}%`;
      eventElement.style.width = '13%';
      
      const eventTime = createElement('div', {
        className: CLASSES.CALENDAR_EVENT_TIME,
      }, event.time);
      
      const eventTitle = createElement('div', {
        className: CLASSES.CALENDAR_EVENT_TITLE,
      }, event.title);
      
      eventElement.appendChild(eventTime);
      eventElement.appendChild(eventTitle);
      
      container.appendChild(eventElement);
      
      state.eventHandlers.set(event.id, () => {
        dispatchEventClick(event);
      });
    });
  }
  
  attachEventListeners(container);
}

// ============================================================================
// DAY VIEW
// ============================================================================

/**
 * Renders day view calendar
 * @param {Date} date - Date to render
 * @param {Array} events - Events to display
 */
function renderDayView(date, events) {
  const container = querySelector(SELECTORS.DAY_GRID);
  const titleElement = querySelector(SELECTORS.DAY_TITLE);
  
  if (!container || !titleElement) {
    console.error('[Calendar] Day view containers not found');
    return;
  }
  
  // Update title
  titleElement.textContent = formatDate(date, { dateStyle: 'full' });
  
  // Clear existing content
  container.innerHTML = '';
  
  // Create time grid
  for (let hour = CONFIG.HOURS_START; hour < CONFIG.HOURS_END; hour++) {
    const hourRow = createElement('div', { className: CLASSES.WEEK_HOUR });
    
    const hourLabel = createElement('div', {
      className: CLASSES.WEEK_HOUR_LABEL,
    }, `${hour.toString().padStart(2, '0')}:00`);
    
    const hourContent = createElement('div', {
      className: 'calendar__hour-content',
    });
    
    hourRow.appendChild(hourLabel);
    hourRow.appendChild(hourContent);
    container.appendChild(hourRow);
  }
  
  // Position events
  const dayEvents = getEventsForDate(date);
  
  dayEvents.forEach(event => {
    const position = calculateEventPosition(event.time, event.endTime || event.time);
    const eventElement = createElement('button', {
      className: CLASSES.WEEK_EVENT,
      type: 'button',
      'aria-label': `${event.title} at ${event.time}`,
      dataset: { eventId: event.id },
    });
    
    eventElement.style.top = `${position.top}px`;
    eventElement.style.height = `${position.height}px`;
    eventElement.style.left = '120px';
    eventElement.style.right = '20px';
    
    const eventTime = createElement('div', {
      className: CLASSES.CALENDAR_EVENT_TIME,
    }, event.time);
    
    const eventTitle = createElement('div', {
      className: CLASSES.CALENDAR_EVENT_TITLE,
    }, event.title);
    
    eventElement.appendChild(eventTime);
    eventElement.appendChild(eventTitle);
    
    container.appendChild(eventElement);
    
    state.eventHandlers.set(event.id, () => {
      dispatchEventClick(event);
    });
  });
  
  attachEventListeners(container);
}

// ============================================================================
// EVENT HANDLING
// ============================================================================

/**
 * Attaches event listeners to calendar elements
 * @param {HTMLElement} container - Container element
 */
function attachEventListeners(container) {
  container.addEventListener('click', event => {
    const eventButton = event.target.closest('[data-event-id]');
    if (eventButton) {
      const eventId = eventButton.dataset.eventId;
      const handler = state.eventHandlers.get(eventId);
      if (handler) {
        handler();
      }
    }
  });
}

/**
 * Dispatches custom event when calendar event is clicked
 * @param {Object} event - Event data
 */
function dispatchEventClick(event) {
  const customEvent = new CustomEvent('calendar:event-click', {
    detail: { event },
    bubbles: true,
  });
  document.dispatchEvent(customEvent);
}

// ============================================================================
// NAVIGATION
// ============================================================================

/**
 * Navigates to previous period
 */
function navigatePrevious() {
  if (state.currentView === 'month') {
    state.currentDate = addMonths(state.currentDate, -1);
  } else if (state.currentView === 'week') {
    state.currentDate = addDays(state.currentDate, -7);
  } else if (state.currentView === 'day') {
    state.currentDate = addDays(state.currentDate, -1);
  }
  
  render();
}

/**
 * Navigates to next period
 */
function navigateNext() {
  if (state.currentView === 'month') {
    state.currentDate = addMonths(state.currentDate, 1);
  } else if (state.currentView === 'week') {
    state.currentDate = addDays(state.currentDate, 7);
  } else if (state.currentView === 'day') {
    state.currentDate = addDays(state.currentDate, 1);
  }
  
  render();
}

/**
 * Sets up navigation event listeners
 */
function setupNavigation() {
  document.addEventListener('click', event => {
    const navButton = event.target.closest('[data-nav]');
    if (!navButton) return;
    
    const direction = navButton.dataset.nav;
    if (direction === 'prev') {
      navigatePrevious();
    } else if (direction === 'next') {
      navigateNext();
    }
  });
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Renders the current calendar view
 */
function render() {
  if (!state.currentDate) {
    console.error('[Calendar] No current date set');
    return;
  }
  
  try {
    if (state.currentView === 'month') {
      renderMonthView(state.currentDate, state.events);
    } else if (state.currentView === 'week') {
      renderWeekView(state.currentDate, state.events);
    } else if (state.currentView === 'day') {
      renderDayView(state.currentDate, state.events);
    }
  } catch (error) {
    console.error('[Calendar] Render error:', error);
  }
}

/**
 * Sets the calendar view
 * @param {string} view - View type ('month', 'week', 'day')
 */
function setView(view) {
  if (!['month', 'week', 'day'].includes(view)) {
    console.error('[Calendar] Invalid view:', view);
    return;
  }
  
  state.currentView = view;
  render();
}

/**
 * Sets the current date
 * @param {Date|string} date - Date to set
 */
function setDate(date) {
  state.currentDate = createWATDate(date);
  render();
}

/**
 * Updates events data
 * @param {Array} events - Array of event objects
 */
function setEvents(events) {
  if (!Array.isArray(events)) {
    console.error('[Calendar] Events must be an array');
    return;
  }
  
  state.events = events;
  state.eventHandlers.clear();
  render();
}

/**
 * Initializes the calendar component
 * @param {Object} options - Initialization options
 * @param {Date|string} options.date - Initial date
 * @param {string} options.view - Initial view
 * @param {Array} options.events - Initial events
 */
function init(options = {}) {
  try {
    state.currentDate = options.date ? createWATDate(options.date) : createWATDate(new Date());
    state.currentView = options.view || 'month';
    state.events = options.events || [];
    
    setupNavigation();
    render();
    
    console.log('[Calendar] Initialized successfully');
  } catch (error) {
    console.error('[Calendar] Initialization failed:', error);
  }
}

/**
 * Destroys the calendar component and cleans up
 */
function destroy() {
  state.eventHandlers.clear();
  state.events = [];
  state.currentDate = null;
  
  console.log('[Calendar] Destroyed');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  init,
  destroy,
  render,
  setView,
  setDate,
  setEvents,
  createWATDate,
  formatDate,
};