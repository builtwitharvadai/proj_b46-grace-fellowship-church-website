/**
 * Date Utility Functions for Nigerian Timezone (WAT)
 * 
 * Provides comprehensive date manipulation, timezone conversion, formatting,
 * and comparison utilities for the Grace Fellowship Church events system.
 * All dates are handled in West Africa Time (WAT, UTC+1).
 * 
 * @module date-utils
 * @generated-from: task-id:TASK-007
 * @modifies: none
 * @dependencies: none
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  WAT_OFFSET_HOURS: 1,
  WAT_OFFSET_MS: 3600000, // 1 hour in milliseconds
  TIMEZONE_NAME: 'Africa/Lagos',
  MILLISECONDS_PER_DAY: 86400000,
  MILLISECONDS_PER_HOUR: 3600000,
  MILLISECONDS_PER_MINUTE: 60000,
});

const MONTH_NAMES = Object.freeze([
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]);

const MONTH_NAMES_SHORT = Object.freeze([
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]);

const DAY_NAMES = Object.freeze([
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]);

const DAY_NAMES_SHORT = Object.freeze([
  'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
]);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates if a value is a valid Date object
 * @param {*} date - Value to validate
 * @returns {boolean} True if valid Date object
 */
function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Safely parses a date from various input formats
 * @param {Date|string|number} input - Date input
 * @returns {Date|null} Parsed Date object or null if invalid
 */
function parseDate(input) {
  if (input instanceof Date) {
    return isValidDate(input) ? input : null;
  }
  
  if (typeof input === 'string' || typeof input === 'number') {
    const date = new Date(input);
    return isValidDate(date) ? date : null;
  }
  
  return null;
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
    message,
    module: 'date-utils',
    ...context,
  };
  
  const logMethod = console[level] || console.log;
  logMethod('[GFC:DateUtils]', message, context);
}

// ============================================================================
// TIMEZONE CONVERSION
// ============================================================================

/**
 * Converts a Date to West Africa Time (WAT, UTC+1)
 * @param {Date|string|number} input - Date to convert
 * @returns {Date|null} Date adjusted to WAT or null if invalid
 */
function toWAT(input) {
  const date = parseDate(input);
  
  if (!date) {
    log('warn', 'Invalid date input for WAT conversion', { input });
    return null;
  }
  
  try {
    // Get UTC time
    const utcTime = date.getTime();
    
    // Add WAT offset (UTC+1)
    const watTime = utcTime + CONFIG.WAT_OFFSET_MS;
    
    return new Date(watTime);
  } catch (error) {
    log('error', 'WAT conversion failed', { 
      input, 
      error: error.message 
    });
    return null;
  }
}

/**
 * Gets the current date and time in WAT
 * @returns {Date} Current date in WAT
 */
function nowInWAT() {
  return toWAT(new Date());
}

/**
 * Converts a WAT date to UTC
 * @param {Date|string|number} input - WAT date to convert
 * @returns {Date|null} Date adjusted to UTC or null if invalid
 */
function watToUTC(input) {
  const date = parseDate(input);
  
  if (!date) {
    log('warn', 'Invalid date input for UTC conversion', { input });
    return null;
  }
  
  try {
    // Get WAT time
    const watTime = date.getTime();
    
    // Subtract WAT offset to get UTC
    const utcTime = watTime - CONFIG.WAT_OFFSET_MS;
    
    return new Date(utcTime);
  } catch (error) {
    log('error', 'UTC conversion failed', { 
      input, 
      error: error.message 
    });
    return null;
  }
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Formats a date for display in various formats
 * @param {Date|string|number} input - Date to format
 * @param {string} format - Format string (full, short, time, datetime, iso)
 * @returns {string} Formatted date string or empty string if invalid
 */
function formatDate(input, format = 'full') {
  const date = parseDate(input);
  
  if (!date) {
    log('warn', 'Invalid date input for formatting', { input, format });
    return '';
  }
  
  try {
    switch (format.toLowerCase()) {
      case 'full':
        // "Monday, January 15, 2024"
        return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
      
      case 'short':
        // "Jan 15, 2024"
        return `${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
      
      case 'time':
        // "2:30 PM"
        return formatTime(date);
      
      case 'datetime':
        // "Jan 15, 2024 at 2:30 PM"
        return `${formatDate(date, 'short')} at ${formatTime(date)}`;
      
      case 'iso':
        // ISO 8601 format
        return date.toISOString();
      
      case 'numeric':
        // "01/15/2024"
        return `${padZero(date.getMonth() + 1)}/${padZero(date.getDate())}/${date.getFullYear()}`;
      
      case 'day':
        // "Monday"
        return DAY_NAMES[date.getDay()];
      
      case 'month':
        // "January"
        return MONTH_NAMES[date.getMonth()];
      
      default:
        log('warn', 'Unknown date format requested', { format });
        return formatDate(date, 'full');
    }
  } catch (error) {
    log('error', 'Date formatting failed', { 
      input, 
      format, 
      error: error.message 
    });
    return '';
  }
}

/**
 * Formats time in 12-hour format with AM/PM
 * @param {Date|string|number} input - Date to format
 * @returns {string} Formatted time string (e.g., "2:30 PM")
 */
function formatTime(input) {
  const date = parseDate(input);
  
  if (!date) {
    return '';
  }
  
  try {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours || 12; // Convert 0 to 12
    
    return `${hours}:${padZero(minutes)} ${ampm}`;
  } catch (error) {
    log('error', 'Time formatting failed', { 
      input, 
      error: error.message 
    });
    return '';
  }
}

/**
 * Pads a number with leading zero if less than 10
 * @param {number} num - Number to pad
 * @returns {string} Padded number string
 */
function padZero(num) {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Formats a date range for display
 * @param {Date|string|number} startDate - Start date
 * @param {Date|string|number} endDate - End date
 * @returns {string} Formatted date range string
 */
function formatDateRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (!start || !end) {
    log('warn', 'Invalid date range input', { startDate, endDate });
    return '';
  }
  
  try {
    // Same day
    if (isSameDay(start, end)) {
      return `${formatDate(start, 'short')} ${formatTime(start)} - ${formatTime(end)}`;
    }
    
    // Same month
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
    }
    
    // Different months
    return `${formatDate(start, 'short')} - ${formatDate(end, 'short')}`;
  } catch (error) {
    log('error', 'Date range formatting failed', { 
      startDate, 
      endDate, 
      error: error.message 
    });
    return '';
  }
}

/**
 * Formats a relative time string (e.g., "2 days ago", "in 3 hours")
 * @param {Date|string|number} input - Date to compare
 * @param {Date|string|number} [baseDate] - Base date for comparison (defaults to now)
 * @returns {string} Relative time string
 */
function formatRelativeTime(input, baseDate = null) {
  const date = parseDate(input);
  const base = baseDate ? parseDate(baseDate) : nowInWAT();
  
  if (!date || !base) {
    log('warn', 'Invalid date input for relative time', { input, baseDate });
    return '';
  }
  
  try {
    const diffMs = date.getTime() - base.getTime();
    const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
    const isPast = diffMs < 0;
    
    // Less than a minute
    if (diffSeconds < 60) {
      return isPast ? 'just now' : 'in a moment';
    }
    
    // Minutes
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      const unit = diffMinutes === 1 ? 'minute' : 'minutes';
      return isPast ? `${diffMinutes} ${unit} ago` : `in ${diffMinutes} ${unit}`;
    }
    
    // Hours
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      const unit = diffHours === 1 ? 'hour' : 'hours';
      return isPast ? `${diffHours} ${unit} ago` : `in ${diffHours} ${unit}`;
    }
    
    // Days
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      const unit = diffDays === 1 ? 'day' : 'days';
      return isPast ? `${diffDays} ${unit} ago` : `in ${diffDays} ${unit}`;
    }
    
    // Weeks
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) {
      const unit = diffWeeks === 1 ? 'week' : 'weeks';
      return isPast ? `${diffWeeks} ${unit} ago` : `in ${diffWeeks} ${unit}`;
    }
    
    // Months
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      const unit = diffMonths === 1 ? 'month' : 'months';
      return isPast ? `${diffMonths} ${unit} ago` : `in ${diffMonths} ${unit}`;
    }
    
    // Years
    const diffYears = Math.floor(diffDays / 365);
    const unit = diffYears === 1 ? 'year' : 'years';
    return isPast ? `${diffYears} ${unit} ago` : `in ${diffYears} ${unit}`;
  } catch (error) {
    log('error', 'Relative time formatting failed', { 
      input, 
      baseDate, 
      error: error.message 
    });
    return '';
  }
}

// ============================================================================
// DATE COMPARISON
// ============================================================================

/**
 * Checks if two dates are on the same day
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {boolean} True if same day
 */
function isSameDay(date1, date2) {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  
  if (!d1 || !d2) {
    return false;
  }
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/**
 * Checks if a date is today (in WAT)
 * @param {Date|string|number} input - Date to check
 * @returns {boolean} True if today
 */
function isToday(input) {
  return isSameDay(input, nowInWAT());
}

/**
 * Checks if a date is in the past (in WAT)
 * @param {Date|string|number} input - Date to check
 * @returns {boolean} True if in the past
 */
function isPast(input) {
  const date = parseDate(input);
  const now = nowInWAT();
  
  if (!date) {
    return false;
  }
  
  return date.getTime() < now.getTime();
}

/**
 * Checks if a date is in the future (in WAT)
 * @param {Date|string|number} input - Date to check
 * @returns {boolean} True if in the future
 */
function isFuture(input) {
  const date = parseDate(input);
  const now = nowInWAT();
  
  if (!date) {
    return false;
  }
  
  return date.getTime() > now.getTime();
}

/**
 * Checks if a date falls within a date range
 * @param {Date|string|number} date - Date to check
 * @param {Date|string|number} startDate - Range start date
 * @param {Date|string|number} endDate - Range end date
 * @returns {boolean} True if date is within range (inclusive)
 */
function isInRange(date, startDate, endDate) {
  const d = parseDate(date);
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (!d || !start || !end) {
    return false;
  }
  
  const time = d.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

/**
 * Compares two dates
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2, NaN if invalid
 */
function compareDates(date1, date2) {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  
  if (!d1 || !d2) {
    return NaN;
  }
  
  const time1 = d1.getTime();
  const time2 = d2.getTime();
  
  if (time1 < time2) {
    return -1;
  }
  if (time1 > time2) {
    return 1;
  }
  return 0;
}

// ============================================================================
// DATE MANIPULATION
// ============================================================================

/**
 * Adds days to a date
 * @param {Date|string|number} input - Base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date|null} New date or null if invalid
 */
function addDays(input, days) {
  const date = parseDate(input);
  
  if (!date || typeof days !== 'number' || isNaN(days)) {
    log('warn', 'Invalid input for addDays', { input, days });
    return null;
  }
  
  try {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  } catch (error) {
    log('error', 'addDays failed', { input, days, error: error.message });
    return null;
  }
}

/**
 * Adds hours to a date
 * @param {Date|string|number} input - Base date
 * @param {number} hours - Number of hours to add (can be negative)
 * @returns {Date|null} New date or null if invalid
 */
function addHours(input, hours) {
  const date = parseDate(input);
  
  if (!date || typeof hours !== 'number' || isNaN(hours)) {
    log('warn', 'Invalid input for addHours', { input, hours });
    return null;
  }
  
  try {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  } catch (error) {
    log('error', 'addHours failed', { input, hours, error: error.message });
    return null;
  }
}

/**
 * Gets the start of day (00:00:00.000)
 * @param {Date|string|number} input - Date
 * @returns {Date|null} Start of day or null if invalid
 */
function startOfDay(input) {
  const date = parseDate(input);
  
  if (!date) {
    return null;
  }
  
  try {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  } catch (error) {
    log('error', 'startOfDay failed', { input, error: error.message });
    return null;
  }
}

/**
 * Gets the end of day (23:59:59.999)
 * @param {Date|string|number} input - Date
 * @returns {Date|null} End of day or null if invalid
 */
function endOfDay(input) {
  const date = parseDate(input);
  
  if (!date) {
    return null;
  }
  
  try {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  } catch (error) {
    log('error', 'endOfDay failed', { input, error: error.message });
    return null;
  }
}

/**
 * Gets the start of month (first day at 00:00:00.000)
 * @param {Date|string|number} input - Date
 * @returns {Date|null} Start of month or null if invalid
 */
function startOfMonth(input) {
  const date = parseDate(input);
  
  if (!date) {
    return null;
  }
  
  try {
    const result = new Date(date);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  } catch (error) {
    log('error', 'startOfMonth failed', { input, error: error.message });
    return null;
  }
}

/**
 * Gets the end of month (last day at 23:59:59.999)
 * @param {Date|string|number} input - Date
 * @returns {Date|null} End of month or null if invalid
 */
function endOfMonth(input) {
  const date = parseDate(input);
  
  if (!date) {
    return null;
  }
  
  try {
    const result = new Date(date);
    result.setMonth(result.getMonth() + 1, 0);
    result.setHours(23, 59, 59, 999);
    return result;
  } catch (error) {
    log('error', 'endOfMonth failed', { input, error: error.message });
    return null;
  }
}

/**
 * Gets the number of days in a month
 * @param {Date|string|number} input - Date in the month
 * @returns {number} Number of days in month (0 if invalid)
 */
function getDaysInMonth(input) {
  const date = parseDate(input);
  
  if (!date) {
    return 0;
  }
  
  try {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  } catch (error) {
    log('error', 'getDaysInMonth failed', { input, error: error.message });
    return 0;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Timezone conversion
  toWAT,
  nowInWAT,
  watToUTC,
  
  // Date formatting
  formatDate,
  formatTime,
  formatDateRange,
  formatRelativeTime,
  
  // Date comparison
  isSameDay,
  isToday,
  isPast,
  isFuture,
  isInRange,
  compareDates,
  
  // Date manipulation
  addDays,
  addHours,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  
  // Utilities
  isValidDate,
  parseDate,
  
  // Constants
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  DAY_NAMES,
  DAY_NAMES_SHORT,
};