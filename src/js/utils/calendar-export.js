/**
 * Calendar Export Utility
 * 
 * Provides functionality for generating calendar export files and URLs:
 * - Google Calendar URL generation
 * - iCalendar (.ics) file generation
 * - Timezone handling (WAT - West Africa Time)
 * - RFC 5545 compliant formatting
 * - Error handling and validation
 * 
 * @module calendar-export
 * @generated-from: task-id:TASK-007
 * @modifies: none
 * @dependencies: none
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  TIMEZONE: 'Africa/Lagos',
  TIMEZONE_OFFSET: '+0100',
  GOOGLE_CALENDAR_BASE_URL: 'https://www.google.com/calendar/render',
  ICS_VERSION: '2.0',
  PRODID: '-//Grace Fellowship Church//Events Calendar//EN',
  CALSCALE: 'GREGORIAN',
  METHOD: 'PUBLISH',
});

const DATE_FORMAT = Object.freeze({
  ICAL_DATE: 'YYYYMMDDTHHmmss',
  ICAL_UTC: 'YYYYMMDDTHHmmssZ',
});

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
    message,
    module: 'calendar-export',
    ...context,
  };
  
  const logMethod = console[level] || console.log;
  logMethod('[GFC Calendar Export]', message, context);
}

/**
 * Validates event data structure
 * @param {Object} event - Event object to validate
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateEvent(event) {
  if (!event || typeof event !== 'object') {
    throw new Error('Event must be an object');
  }

  const requiredFields = ['title', 'date', 'time'];
  const missingFields = requiredFields.filter(field => !event[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(event.date)) {
    throw new Error(`Invalid date format: ${event.date}. Expected YYYY-MM-DD`);
  }

  // Validate time format (HH:mm)
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(event.time)) {
    throw new Error(`Invalid time format: ${event.time}. Expected HH:mm`);
  }

  return true;
}

/**
 * Pads a number with leading zeros
 * @param {number} num - Number to pad
 * @param {number} size - Desired length
 * @returns {string} Padded string
 */
function padZero(num, size = 2) {
  return String(num).padStart(size, '0');
}

/**
 * Formats a date for iCalendar format (YYYYMMDDTHHmmss)
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string
 */
function formatICalDate(date) {
  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  const seconds = padZero(date.getSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Formats a date for UTC iCalendar format (YYYYMMDDTHHmmssZ)
 * @param {Date} date - Date object to format
 * @returns {string} Formatted UTC date string
 */
function formatICalDateUTC(date) {
  const year = date.getUTCFullYear();
  const month = padZero(date.getUTCMonth() + 1);
  const day = padZero(date.getUTCDate());
  const hours = padZero(date.getUTCHours());
  const minutes = padZero(date.getUTCMinutes());
  const seconds = padZero(date.getUTCSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Parses event date and time into Date object
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {string} timeStr - Time string (HH:mm)
 * @returns {Date} Parsed date object in WAT timezone
 */
function parseEventDateTime(dateStr, timeStr) {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    // Create date in local timezone (assuming WAT)
    const date = new Date(year, month - 1, day, hours, minutes, 0);

    if (isNaN(date.getTime())) {
      throw new Error('Invalid date/time values');
    }

    return date;
  } catch (error) {
    log('error', 'Failed to parse event date/time', {
      dateStr,
      timeStr,
      error: error.message,
    });
    throw new Error(`Failed to parse date/time: ${error.message}`);
  }
}

/**
 * Calculates end date/time for event
 * @param {Date} startDate - Event start date
 * @param {string} endTime - End time string (HH:mm) or null
 * @param {number} defaultDuration - Default duration in hours
 * @returns {Date} End date object
 */
function calculateEndDate(startDate, endTime, defaultDuration = 2) {
  if (endTime) {
    try {
      const [hours, minutes] = endTime.split(':').map(Number);
      const endDate = new Date(startDate);
      endDate.setHours(hours, minutes, 0);
      
      // If end time is before start time, assume next day
      if (endDate < startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }
      
      return endDate;
    } catch (error) {
      log('warn', 'Failed to parse end time, using default duration', {
        endTime,
        error: error.message,
      });
    }
  }

  // Default: add duration to start time
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + defaultDuration);
  return endDate;
}

/**
 * Escapes special characters for iCalendar format
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeICalText(text) {
  if (!text) {
    return '';
  }

  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Folds long lines according to RFC 5545 (75 octets max)
 * @param {string} line - Line to fold
 * @returns {string} Folded line
 */
function foldLine(line) {
  const maxLength = 75;
  if (line.length <= maxLength) {
    return line;
  }

  const lines = [];
  let currentLine = line.substring(0, maxLength);
  let remaining = line.substring(maxLength);

  lines.push(currentLine);

  while (remaining.length > 0) {
    const chunk = remaining.substring(0, maxLength - 1);
    lines.push(` ${chunk}`);
    remaining = remaining.substring(maxLength - 1);
  }

  return lines.join('\r\n');
}

/**
 * Generates a unique identifier for calendar events
 * @param {string} eventId - Event ID
 * @returns {string} Unique identifier
 */
function generateUID(eventId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${eventId}-${timestamp}-${random}@gracefellowship.church`;
}

// ============================================================================
// GOOGLE CALENDAR EXPORT
// ============================================================================

/**
 * Generates Google Calendar URL for event
 * @param {Object} event - Event object
 * @param {string} event.title - Event title
 * @param {string} event.description - Event description
 * @param {string} event.date - Event date (YYYY-MM-DD)
 * @param {string} event.time - Event start time (HH:mm)
 * @param {string} event.endTime - Event end time (HH:mm)
 * @param {string} event.location - Event location
 * @returns {string} Google Calendar URL
 */
function generateGoogleCalendarUrl(event) {
  try {
    validateEvent(event);

    const startDate = parseEventDateTime(event.date, event.time);
    const endDate = calculateEndDate(startDate, event.endTime);

    // Format dates for Google Calendar (YYYYMMDDTHHmmss)
    const startDateStr = formatICalDate(startDate);
    const endDateStr = formatICalDate(endDate);

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${startDateStr}/${endDateStr}`,
      ctz: CONFIG.TIMEZONE,
    });

    if (event.description) {
      params.append('details', event.description);
    }

    if (event.location) {
      params.append('location', event.location);
    }

    const url = `${CONFIG.GOOGLE_CALENDAR_BASE_URL}?${params.toString()}`;

    log('info', 'Generated Google Calendar URL', {
      eventId: event.id,
      title: event.title,
    });

    return url;
  } catch (error) {
    log('error', 'Failed to generate Google Calendar URL', {
      eventId: event.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// ============================================================================
// ICALENDAR (.ICS) EXPORT
// ============================================================================

/**
 * Generates iCalendar (.ics) file content for event
 * @param {Object} event - Event object
 * @param {string} event.id - Event ID
 * @param {string} event.title - Event title
 * @param {string} event.description - Event description
 * @param {string} event.date - Event date (YYYY-MM-DD)
 * @param {string} event.time - Event start time (HH:mm)
 * @param {string} event.endTime - Event end time (HH:mm)
 * @param {string} event.location - Event location
 * @param {string} event.organizer - Event organizer
 * @returns {string} iCalendar file content
 */
function generateICalendar(event) {
  try {
    validateEvent(event);

    const startDate = parseEventDateTime(event.date, event.time);
    const endDate = calculateEndDate(startDate, event.endTime);
    const now = new Date();

    const uid = generateUID(event.id || 'event');
    const dtstamp = formatICalDateUTC(now);
    const dtstart = formatICalDate(startDate);
    const dtend = formatICalDate(endDate);

    const lines = [
      'BEGIN:VCALENDAR',
      `VERSION:${CONFIG.ICS_VERSION}`,
      `PRODID:${CONFIG.PRODID}`,
      `CALSCALE:${CONFIG.CALSCALE}`,
      `METHOD:${CONFIG.METHOD}`,
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=${CONFIG.TIMEZONE}:${dtstart}`,
      `DTEND;TZID=${CONFIG.TIMEZONE}:${dtend}`,
      foldLine(`SUMMARY:${escapeICalText(event.title)}`),
    ];

    if (event.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeICalText(event.description)}`));
    }

    if (event.location) {
      lines.push(foldLine(`LOCATION:${escapeICalText(event.location)}`));
    }

    if (event.organizer) {
      lines.push(foldLine(`ORGANIZER;CN=${escapeICalText(event.organizer)}:MAILTO:events@gracefellowship.church`));
    }

    lines.push(
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    );

    const icsContent = lines.join('\r\n');

    log('info', 'Generated iCalendar content', {
      eventId: event.id,
      title: event.title,
      size: icsContent.length,
    });

    return icsContent;
  } catch (error) {
    log('error', 'Failed to generate iCalendar content', {
      eventId: event.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Downloads iCalendar file to user's device
 * @param {string} icsContent - iCalendar file content
 * @param {string} filename - Filename for download
 */
function downloadICalendar(icsContent, filename = 'event.ics') {
  try {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);

    log('info', 'iCalendar file downloaded', { filename });
  } catch (error) {
    log('error', 'Failed to download iCalendar file', {
      filename,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Generates and downloads iCalendar file for event
 * @param {Object} event - Event object
 * @param {string} customFilename - Optional custom filename
 */
function exportToICalendar(event, customFilename = null) {
  try {
    const icsContent = generateICalendar(event);
    const filename = customFilename || `${event.id || 'event'}.ics`;
    downloadICalendar(icsContent, filename);
  } catch (error) {
    log('error', 'Failed to export to iCalendar', {
      eventId: event.id,
      error: error.message,
    });
    throw error;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Opens Google Calendar with event pre-filled
 * @param {Object} event - Event object
 */
function addToGoogleCalendar(event) {
  try {
    const url = generateGoogleCalendarUrl(event);
    window.open(url, '_blank', 'noopener,noreferrer');
    
    log('info', 'Opened Google Calendar', { eventId: event.id });
  } catch (error) {
    log('error', 'Failed to open Google Calendar', {
      eventId: event.id,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Downloads iCalendar file for event
 * @param {Object} event - Event object
 */
function downloadICalendarFile(event) {
  try {
    exportToICalendar(event);
  } catch (error) {
    log('error', 'Failed to download iCalendar file', {
      eventId: event.id,
      error: error.message,
    });
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  addToGoogleCalendar,
  downloadICalendarFile,
  generateGoogleCalendarUrl,
  generateICalendar,
  validateEvent,
  parseEventDateTime,
  calculateEndDate,
};