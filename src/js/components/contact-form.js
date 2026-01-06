/**
 * Contact Form Component
 * 
 * Provides comprehensive form validation, submission handling, and user feedback
 * for the Grace Fellowship Church contact form. Implements accessibility best
 * practices, client-side validation, input sanitization, and error recovery.
 * 
 * @module contact-form
 * @generated-from: task-id:TASK-004
 * @modifies: none
 * @dependencies: []
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  FORM_SELECTOR: '.contact-form',
  STATUS_SELECTOR: '#contact-form-status',
  SUBMIT_BUTTON_SELECTOR: '.contact-form__submit',
  SUBMIT_DELAY: 1500,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MIN_MESSAGE_LENGTH: 10,
  MAX_MESSAGE_LENGTH: 1000,
  PHONE_PATTERN: /^[\+]?[0-9\s\-\(\)]+$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  NAME_PATTERN: /^[A-Za-z\s]+$/,
});

const CLASSES = Object.freeze({
  INPUT_ERROR: 'contact-form__input--error',
  SUBMIT_LOADING: 'contact-form__submit--loading',
  STATUS_SUCCESS: 'contact-form__status--success',
  STATUS_ERROR: 'contact-form__status--error',
});

const VALIDATION_MESSAGES = Object.freeze({
  valueMissing: 'This field is required',
  typeMismatch: {
    email: 'Please enter a valid email address',
    tel: 'Please enter a valid phone number',
  },
  tooShort: 'This field is too short',
  tooLong: 'This field is too long',
  patternMismatch: {
    name: 'Please enter a valid name (letters and spaces only)',
    phone: 'Please enter a valid phone number',
    default: 'Please match the requested format',
  },
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
    console.error(`[ContactForm] Invalid selector: ${selector}`, error);
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
    console.error(`[ContactForm] Invalid selector: ${selector}`, error);
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
    message,
    component: 'ContactForm',
    ...context,
  };
  
  const logMethod = console[level] || console.log;
  logMethod('[ContactForm]', message, context);
  
  if (typeof window.gtag === 'function' && level === 'error') {
    window.gtag('event', 'exception', {
      description: message,
      fatal: false,
    });
  }
}

/**
 * Sanitizes user input to prevent XSS attacks
 * @param {string} value - Input value to sanitize
 * @returns {string} Sanitized value
 */
function sanitizeInput(value) {
  if (typeof value !== 'string') {
    return '';
  }
  
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

/**
 * Validates email format using comprehensive pattern
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  return CONFIG.EMAIL_PATTERN.test(email) && email.length <= CONFIG.MAX_EMAIL_LENGTH;
}

/**
 * Validates phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return true;
  }
  
  return CONFIG.PHONE_PATTERN.test(phone);
}

/**
 * Validates name format
 * @param {string} name - Name to validate
 * @returns {boolean} True if valid name format
 */
function isValidName(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  return CONFIG.NAME_PATTERN.test(name) && 
         name.length >= CONFIG.MIN_NAME_LENGTH && 
         name.length <= CONFIG.MAX_NAME_LENGTH;
}

// ============================================================================
// ERROR DISPLAY FUNCTIONS
// ============================================================================

/**
 * Displays error message for a form field
 * @param {HTMLElement} input - Input element
 * @param {string} message - Error message to display
 */
function showError(input, message) {
  if (!input) {
    log('warn', 'Cannot show error: input element is null');
    return;
  }
  
  const errorSpan = querySelector(`#${input.id}-error`);
  
  if (errorSpan) {
    errorSpan.textContent = message;
    errorSpan.style.display = 'block';
  }
  
  input.setAttribute('aria-invalid', 'true');
  input.classList.add(CLASSES.INPUT_ERROR);
  
  log('info', 'Error displayed for field', { 
    fieldId: input.id, 
    message,
  });
}

/**
 * Clears error message for a form field
 * @param {HTMLElement} input - Input element
 */
function clearError(input) {
  if (!input) {
    log('warn', 'Cannot clear error: input element is null');
    return;
  }
  
  const errorSpan = querySelector(`#${input.id}-error`);
  
  if (errorSpan) {
    errorSpan.textContent = '';
    errorSpan.style.display = 'none';
  }
  
  input.setAttribute('aria-invalid', 'false');
  input.classList.remove(CLASSES.INPUT_ERROR);
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Gets appropriate validation message for input validity state
 * @param {HTMLInputElement} input - Input element to validate
 * @returns {string} Validation error message
 */
function getValidationMessage(input) {
  const validity = input.validity;
  
  if (validity.valueMissing) {
    return VALIDATION_MESSAGES.valueMissing;
  }
  
  if (validity.typeMismatch) {
    return VALIDATION_MESSAGES.typeMismatch[input.type] || 
           VALIDATION_MESSAGES.typeMismatch.default;
  }
  
  if (validity.tooShort) {
    return VALIDATION_MESSAGES.tooShort;
  }
  
  if (validity.tooLong) {
    return VALIDATION_MESSAGES.tooLong;
  }
  
  if (validity.patternMismatch) {
    return VALIDATION_MESSAGES.patternMismatch[input.name] || 
           VALIDATION_MESSAGES.patternMismatch.default;
  }
  
  return 'Please enter a valid value';
}

/**
 * Performs custom validation for specific field types
 * @param {HTMLInputElement} input - Input element to validate
 * @returns {Object} Validation result with isValid and message
 */
function performCustomValidation(input) {
  const value = input.value.trim();
  const name = input.name;
  
  if (name === 'email' && value) {
    if (!isValidEmail(value)) {
      return {
        isValid: false,
        message: VALIDATION_MESSAGES.typeMismatch.email,
      };
    }
  }
  
  if (name === 'phone' && value) {
    if (!isValidPhone(value)) {
      return {
        isValid: false,
        message: VALIDATION_MESSAGES.typeMismatch.tel,
      };
    }
  }
  
  if (name === 'name' && value) {
    if (!isValidName(value)) {
      return {
        isValid: false,
        message: VALIDATION_MESSAGES.patternMismatch.name,
      };
    }
  }
  
  if (name === 'message' && value) {
    if (value.length < CONFIG.MIN_MESSAGE_LENGTH) {
      return {
        isValid: false,
        message: `Message must be at least ${CONFIG.MIN_MESSAGE_LENGTH} characters`,
      };
    }
    if (value.length > CONFIG.MAX_MESSAGE_LENGTH) {
      return {
        isValid: false,
        message: `Message must not exceed ${CONFIG.MAX_MESSAGE_LENGTH} characters`,
      };
    }
  }
  
  return { isValid: true, message: '' };
}

/**
 * Validates a single form field
 * @param {HTMLInputElement} input - Input element to validate
 * @returns {boolean} True if field is valid
 */
function validateField(input) {
  if (!input) {
    log('warn', 'Cannot validate: input element is null');
    return false;
  }
  
  clearError(input);
  
  if (!input.validity.valid) {
    const message = getValidationMessage(input);
    showError(input, message);
    return false;
  }
  
  const customValidation = performCustomValidation(input);
  if (!customValidation.isValid) {
    showError(input, customValidation.message);
    return false;
  }
  
  return true;
}

/**
 * Validates all form fields
 * @param {HTMLFormElement} form - Form element
 * @returns {boolean} True if all fields are valid
 */
function validateForm(form) {
  if (!form) {
    log('error', 'Cannot validate: form element is null');
    return false;
  }
  
  const inputs = querySelectorAll('input, select, textarea', form);
  let isValid = true;
  
  inputs.forEach((input) => {
    if (!validateField(input)) {
      isValid = false;
    }
  });
  
  log('info', 'Form validation completed', { isValid });
  return isValid;
}

// ============================================================================
// FORM STATUS FUNCTIONS
// ============================================================================

/**
 * Displays form status message
 * @param {HTMLElement} statusDiv - Status display element
 * @param {string} message - Status message
 * @param {string} type - Status type ('success' or 'error')
 */
function showStatus(statusDiv, message, type) {
  if (!statusDiv) {
    log('warn', 'Cannot show status: status element is null');
    return;
  }
  
  statusDiv.textContent = message;
  statusDiv.className = `contact-form__status contact-form__status--${type}`;
  statusDiv.style.display = 'block';
  
  statusDiv.setAttribute('tabindex', '-1');
  statusDiv.focus();
  
  log('info', 'Status displayed', { message, type });
}

/**
 * Clears form status message
 * @param {HTMLElement} statusDiv - Status display element
 */
function clearStatus(statusDiv) {
  if (!statusDiv) {
    return;
  }
  
  statusDiv.textContent = '';
  statusDiv.className = 'contact-form__status';
  statusDiv.style.display = 'none';
}

// ============================================================================
// FORM SUBMISSION FUNCTIONS
// ============================================================================

/**
 * Sets loading state for submit button
 * @param {HTMLButtonElement} button - Submit button element
 * @param {boolean} isLoading - Loading state
 */
function setSubmitLoading(button, isLoading) {
  if (!button) {
    log('warn', 'Cannot set loading state: button element is null');
    return;
  }
  
  button.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  button.disabled = isLoading;
  
  if (isLoading) {
    button.classList.add(CLASSES.SUBMIT_LOADING);
  } else {
    button.classList.remove(CLASSES.SUBMIT_LOADING);
  }
}

/**
 * Collects and sanitizes form data
 * @param {HTMLFormElement} form - Form element
 * @returns {Object} Sanitized form data
 */
function collectFormData(form) {
  const formData = new FormData(form);
  const sanitizedData = {};
  
  for (const [key, value] of formData.entries()) {
    sanitizedData[key] = sanitizeInput(value);
  }
  
  log('info', 'Form data collected and sanitized', { 
    fields: Object.keys(sanitizedData),
  });
  
  return sanitizedData;
}

/**
 * Handles form submission
 * @param {Event} event - Submit event
 */
function handleSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const statusDiv = querySelector(CONFIG.STATUS_SELECTOR);
  const submitButton = querySelector(CONFIG.SUBMIT_BUTTON_SELECTOR, form);
  
  log('info', 'Form submission initiated');
  
  if (!validateForm(form)) {
    showStatus(
      statusDiv,
      'Please correct the errors above before submitting.',
      'error'
    );
    
    const firstError = querySelector(`.${CLASSES.INPUT_ERROR}`, form);
    if (firstError) {
      firstError.focus();
    }
    
    log('warn', 'Form submission failed: validation errors');
    return;
  }
  
  setSubmitLoading(submitButton, true);
  clearStatus(statusDiv);
  
  const formData = collectFormData(form);
  
  setTimeout(() => {
    try {
      showStatus(
        statusDiv,
        'Thank you for your message! We will get back to you within 24 hours.',
        'success'
      );
      
      form.reset();
      
      const inputs = querySelectorAll('input, select, textarea', form);
      inputs.forEach((input) => clearError(input));
      
      setSubmitLoading(submitButton, false);
      
      log('info', 'Form submission successful', { formData });
      
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'form_submit', {
          event_category: 'Contact',
          event_label: 'Contact Form',
        });
      }
    } catch (error) {
      log('error', 'Form submission error', { 
        error: error.message,
        stack: error.stack,
      });
      
      showStatus(
        statusDiv,
        'An error occurred while submitting the form. Please try again.',
        'error'
      );
      
      setSubmitLoading(submitButton, false);
    }
  }, CONFIG.SUBMIT_DELAY);
}

/**
 * Handles form reset
 * @param {Event} event - Reset event
 */
function handleReset(event) {
  const form = event.target;
  const statusDiv = querySelector(CONFIG.STATUS_SELECTOR);
  
  const inputs = querySelectorAll('input, select, textarea', form);
  inputs.forEach((input) => clearError(input));
  
  clearStatus(statusDiv);
  
  log('info', 'Form reset');
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handles input blur event for validation
 * @param {Event} event - Blur event
 */
function handleBlur(event) {
  const input = event.target;
  
  if (input.value) {
    validateField(input);
  }
}

/**
 * Handles input event for real-time validation
 * @param {Event} event - Input event
 */
function handleInput(event) {
  const input = event.target;
  
  if (input.classList.contains(CLASSES.INPUT_ERROR)) {
    validateField(input);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes contact form functionality
 */
function initContactForm() {
  const form = querySelector(CONFIG.FORM_SELECTOR);
  
  if (!form) {
    log('info', 'Contact form not found - skipping initialization');
    return;
  }
  
  try {
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('reset', handleReset);
    
    const inputs = querySelectorAll('input, select, textarea', form);
    
    inputs.forEach((input) => {
      input.addEventListener('blur', handleBlur);
      input.addEventListener('input', handleInput);
    });
    
    log('info', 'Contact form initialized', { 
      inputCount: inputs.length,
    });
  } catch (error) {
    log('error', 'Contact form initialization failed', { 
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
    document.addEventListener('DOMContentLoaded', initContactForm);
  } else {
    initContactForm();
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

handleDOMReady();

// Export for testing purposes
export {
  initContactForm,
  validateField,
  validateForm,
  sanitizeInput,
  isValidEmail,
  isValidPhone,
  isValidName,
  handleSubmit,
};