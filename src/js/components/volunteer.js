/**
 * Volunteer Signup Component
 * 
 * Provides volunteer signup functionality including:
 * - Form validation and submission
 * - Opportunity filtering
 * - Contact information display
 * - Integration with church contact systems
 * 
 * @module components/volunteer
 * @generated-from: task-id:TASK-011
 * @modifies: none
 * @dependencies: [outreach.json]
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  DATA_URL: '/data/ministries/outreach.json',
  FORM_SUBMIT_DELAY: 1500,
  VALIDATION_DEBOUNCE: 300,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[\d\s\-\(\)]+$/,
});

const SELECTORS = Object.freeze({
  VOLUNTEER_FORM: '[data-volunteer-form]',
  OPPORTUNITY_SELECT: '[data-opportunity-select]',
  OPPORTUNITY_CARDS: '[data-opportunity-cards]',
  OPPORTUNITY_FILTER: '[data-opportunity-filter]',
  CONTACT_INFO: '[data-volunteer-contact]',
  FORM_FIELDS: {
    NAME: '[name="volunteer-name"]',
    EMAIL: '[name="volunteer-email"]',
    PHONE: '[name="volunteer-phone"]',
    OPPORTUNITY: '[name="volunteer-opportunity"]',
    MESSAGE: '[name="volunteer-message"]',
    AVAILABILITY: '[name="volunteer-availability"]',
  },
});

const MESSAGES = Object.freeze({
  SUCCESS: 'Thank you for your interest in volunteering! We will contact you soon.',
  ERROR: 'There was an error submitting your form. Please try again or contact us directly.',
  VALIDATION: {
    NAME_REQUIRED: 'Please enter your full name',
    NAME_MIN_LENGTH: 'Name must be at least 2 characters',
    EMAIL_REQUIRED: 'Please enter your email address',
    EMAIL_INVALID: 'Please enter a valid email address',
    PHONE_INVALID: 'Please enter a valid phone number',
    OPPORTUNITY_REQUIRED: 'Please select a volunteer opportunity',
    MESSAGE_MAX_LENGTH: 'Message must be less than 1000 characters',
  },
});

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  opportunities: [],
  selectedOpportunity: null,
  isSubmitting: false,
  validationErrors: new Map(),
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
    console.error('[Volunteer] Invalid selector:', selector, error);
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
    console.error('[Volunteer] Invalid selector:', selector, error);
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
    component: 'volunteer',
    message,
    ...context,
  };
  
  const logMethod = console[level] || console.log;
  logMethod('[Volunteer]', message, context);
}

/**
 * Sanitizes user input to prevent XSS
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetches volunteer opportunities data
 * @returns {Promise<Object>} Volunteer data
 */
async function fetchVolunteerData() {
  try {
    log('info', 'Fetching volunteer data', { url: CONFIG.DATA_URL });
    
    const response = await fetch(CONFIG.DATA_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.volunteerOpportunities || !Array.isArray(data.volunteerOpportunities)) {
      throw new Error('Invalid data structure: missing volunteerOpportunities array');
    }
    
    log('info', 'Volunteer data fetched successfully', {
      opportunityCount: data.volunteerOpportunities.length,
    });
    
    return data;
  } catch (error) {
    log('error', 'Failed to fetch volunteer data', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates a single form field
 * @param {string} fieldName - Name of the field
 * @param {string} value - Field value
 * @returns {string|null} Error message or null if valid
 */
function validateField(fieldName, value) {
  const trimmedValue = typeof value === 'string' ? value.trim() : '';
  
  switch (fieldName) {
    case 'volunteer-name':
      if (!trimmedValue) {
        return MESSAGES.VALIDATION.NAME_REQUIRED;
      }
      if (trimmedValue.length < 2) {
        return MESSAGES.VALIDATION.NAME_MIN_LENGTH;
      }
      return null;
      
    case 'volunteer-email':
      if (!trimmedValue) {
        return MESSAGES.VALIDATION.EMAIL_REQUIRED;
      }
      if (!CONFIG.EMAIL_REGEX.test(trimmedValue)) {
        return MESSAGES.VALIDATION.EMAIL_INVALID;
      }
      return null;
      
    case 'volunteer-phone':
      if (trimmedValue && !CONFIG.PHONE_REGEX.test(trimmedValue)) {
        return MESSAGES.VALIDATION.PHONE_INVALID;
      }
      return null;
      
    case 'volunteer-opportunity':
      if (!trimmedValue) {
        return MESSAGES.VALIDATION.OPPORTUNITY_REQUIRED;
      }
      return null;
      
    case 'volunteer-message':
      if (trimmedValue.length > 1000) {
        return MESSAGES.VALIDATION.MESSAGE_MAX_LENGTH;
      }
      return null;
      
    default:
      return null;
  }
}

/**
 * Validates entire form
 * @param {FormData} formData - Form data to validate
 * @returns {Map<string, string>} Map of field names to error messages
 */
function validateForm(formData) {
  const errors = new Map();
  
  const fieldsToValidate = [
    'volunteer-name',
    'volunteer-email',
    'volunteer-phone',
    'volunteer-opportunity',
    'volunteer-message',
  ];
  
  fieldsToValidate.forEach((fieldName) => {
    const value = formData.get(fieldName);
    const error = validateField(fieldName, value);
    
    if (error) {
      errors.set(fieldName, error);
    }
  });
  
  return errors;
}

/**
 * Displays validation error for a field
 * @param {HTMLElement} field - Form field element
 * @param {string} errorMessage - Error message to display
 */
function showFieldError(field, errorMessage) {
  if (!field) {
    return;
  }
  
  // Remove existing error
  clearFieldError(field);
  
  // Add error class
  field.classList.add('volunteer-form__input--error');
  field.setAttribute('aria-invalid', 'true');
  
  // Create error message element
  const errorId = `${field.name}-error`;
  const errorElement = document.createElement('span');
  errorElement.id = errorId;
  errorElement.className = 'volunteer-form__error';
  errorElement.textContent = errorMessage;
  errorElement.setAttribute('role', 'alert');
  
  // Insert error after field
  field.setAttribute('aria-describedby', errorId);
  field.parentNode.appendChild(errorElement);
}

/**
 * Clears validation error for a field
 * @param {HTMLElement} field - Form field element
 */
function clearFieldError(field) {
  if (!field) {
    return;
  }
  
  field.classList.remove('volunteer-form__input--error');
  field.removeAttribute('aria-invalid');
  
  const errorId = field.getAttribute('aria-describedby');
  if (errorId) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
      errorElement.remove();
    }
    field.removeAttribute('aria-describedby');
  }
}

/**
 * Displays all validation errors
 * @param {Map<string, string>} errors - Map of field names to error messages
 */
function displayValidationErrors(errors) {
  errors.forEach((errorMessage, fieldName) => {
    const field = querySelector(`[name="${fieldName}"]`);
    if (field) {
      showFieldError(field, errorMessage);
    }
  });
  
  // Focus first error field
  const firstErrorField = querySelector('.volunteer-form__input--error');
  if (firstErrorField) {
    firstErrorField.focus();
  }
}

/**
 * Clears all validation errors
 */
function clearAllErrors() {
  const errorFields = querySelectorAll('.volunteer-form__input--error');
  errorFields.forEach((field) => {
    clearFieldError(field);
  });
}

// ============================================================================
// FORM HANDLING
// ============================================================================

/**
 * Handles form field input with debounced validation
 * @param {Event} event - Input event
 */
const handleFieldInput = debounce((event) => {
  const field = event.target;
  const fieldName = field.name;
  const value = field.value;
  
  // Clear existing error
  clearFieldError(field);
  
  // Validate field
  const error = validateField(fieldName, value);
  
  if (error) {
    state.validationErrors.set(fieldName, error);
    showFieldError(field, error);
  } else {
    state.validationErrors.delete(fieldName);
  }
}, CONFIG.VALIDATION_DEBOUNCE);

/**
 * Handles form submission
 * @param {Event} event - Submit event
 */
async function handleFormSubmit(event) {
  event.preventDefault();
  
  if (state.isSubmitting) {
    log('warn', 'Form submission already in progress');
    return;
  }
  
  const form = event.target;
  const formData = new FormData(form);
  
  // Clear previous errors
  clearAllErrors();
  
  // Validate form
  const errors = validateForm(formData);
  
  if (errors.size > 0) {
    log('warn', 'Form validation failed', {
      errorCount: errors.size,
      fields: Array.from(errors.keys()),
    });
    displayValidationErrors(errors);
    return;
  }
  
  // Prepare submission data
  const submissionData = {
    name: sanitizeInput(formData.get('volunteer-name')),
    email: sanitizeInput(formData.get('volunteer-email')),
    phone: sanitizeInput(formData.get('volunteer-phone')),
    opportunity: sanitizeInput(formData.get('volunteer-opportunity')),
    message: sanitizeInput(formData.get('volunteer-message')),
    availability: formData.getAll('volunteer-availability').map(sanitizeInput),
    timestamp: new Date().toISOString(),
  };
  
  try {
    state.isSubmitting = true;
    
    // Disable submit button
    const submitButton = querySelector('[type="submit"]', form);
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
    }
    
    log('info', 'Submitting volunteer form', {
      opportunity: submissionData.opportunity,
    });
    
    // Simulate form submission (replace with actual API call)
    await new Promise((resolve) => setTimeout(resolve, CONFIG.FORM_SUBMIT_DELAY));
    
    // Log submission data (in production, send to server)
    console.log('[Volunteer] Form submission data:', submissionData);
    
    // Show success message
    showSuccessMessage(form);
    
    // Reset form
    form.reset();
    
    log('info', 'Volunteer form submitted successfully');
  } catch (error) {
    log('error', 'Form submission failed', {
      error: error.message,
      stack: error.stack,
    });
    
    showErrorMessage(form);
  } finally {
    state.isSubmitting = false;
    
    // Re-enable submit button
    const submitButton = querySelector('[type="submit"]', form);
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Submit Application';
    }
  }
}

/**
 * Shows success message after form submission
 * @param {HTMLFormElement} form - Form element
 */
function showSuccessMessage(form) {
  const messageElement = document.createElement('div');
  messageElement.className = 'volunteer-form__message volunteer-form__message--success';
  messageElement.setAttribute('role', 'status');
  messageElement.setAttribute('aria-live', 'polite');
  messageElement.textContent = MESSAGES.SUCCESS;
  
  form.insertAdjacentElement('beforebegin', messageElement);
  
  // Remove message after 5 seconds
  setTimeout(() => {
    messageElement.remove();
  }, 5000);
  
  // Scroll to message
  messageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Shows error message after form submission failure
 * @param {HTMLFormElement} form - Form element
 */
function showErrorMessage(form) {
  const messageElement = document.createElement('div');
  messageElement.className = 'volunteer-form__message volunteer-form__message--error';
  messageElement.setAttribute('role', 'alert');
  messageElement.setAttribute('aria-live', 'assertive');
  messageElement.textContent = MESSAGES.ERROR;
  
  form.insertAdjacentElement('beforebegin', messageElement);
  
  // Remove message after 5 seconds
  setTimeout(() => {
    messageElement.remove();
  }, 5000);
  
  // Scroll to message
  messageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================================================
// OPPORTUNITY FILTERING
// ============================================================================

/**
 * Filters opportunity cards based on selected filter
 * @param {string} filter - Filter value ('all' or opportunity ID)
 */
function filterOpportunities(filter) {
  const cards = querySelectorAll('[data-opportunity-card]');
  
  cards.forEach((card) => {
    const opportunityId = card.getAttribute('data-opportunity-id');
    
    if (filter === 'all' || filter === opportunityId) {
      card.style.display = '';
      card.removeAttribute('aria-hidden');
    } else {
      card.style.display = 'none';
      card.setAttribute('aria-hidden', 'true');
    }
  });
  
  log('info', 'Opportunities filtered', { filter, visibleCount: getVisibleCardCount() });
}

/**
 * Gets count of visible opportunity cards
 * @returns {number} Count of visible cards
 */
function getVisibleCardCount() {
  const cards = querySelectorAll('[data-opportunity-card]');
  let count = 0;
  
  cards.forEach((card) => {
    if (card.style.display !== 'none') {
      count++;
    }
  });
  
  return count;
}

/**
 * Handles opportunity filter change
 * @param {Event} event - Change event
 */
function handleFilterChange(event) {
  const filter = event.target.value;
  filterOpportunities(filter);
}

// ============================================================================
// CONTACT INFORMATION
// ============================================================================

/**
 * Displays contact information for selected opportunity
 * @param {string} opportunityId - Opportunity ID
 */
function displayContactInfo(opportunityId) {
  const opportunity = state.opportunities.find((opp) => opp.id === opportunityId);
  
  if (!opportunity) {
    log('warn', 'Opportunity not found', { opportunityId });
    return;
  }
  
  const contactContainer = querySelector(SELECTORS.CONTACT_INFO);
  
  if (!contactContainer) {
    log('warn', 'Contact info container not found');
    return;
  }
  
  const contactHTML = `
    <div class="volunteer-contact">
      <h3 class="volunteer-contact__title">Contact Information</h3>
      <div class="volunteer-contact__item">
        <span class="volunteer-contact__icon" aria-hidden="true">✉</span>
        <a href="mailto:${opportunity.contact}" class="volunteer-contact__link">
          ${opportunity.contact}
        </a>
      </div>
      <div class="volunteer-contact__item">
        <span class="volunteer-contact__icon" aria-hidden="true">⏰</span>
        <span>${opportunity.timeCommitment}</span>
      </div>
    </div>
  `;
  
  contactContainer.innerHTML = contactHTML;
  
  log('info', 'Contact info displayed', { opportunityId });
}

/**
 * Handles opportunity selection change
 * @param {Event} event - Change event
 */
function handleOpportunityChange(event) {
  const opportunityId = event.target.value;
  
  if (opportunityId) {
    displayContactInfo(opportunityId);
    state.selectedOpportunity = opportunityId;
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes volunteer form
 * @param {Object} data - Volunteer data
 */
function initVolunteerForm(data) {
  const form = querySelector(SELECTORS.VOLUNTEER_FORM);
  
  if (!form) {
    log('info', 'Volunteer form not found - skipping form initialization');
    return;
  }
  
  // Store opportunities in state
  state.opportunities = data.volunteerOpportunities || [];
  
  // Add form submit handler
  form.addEventListener('submit', handleFormSubmit);
  
  // Add field input handlers
  Object.values(SELECTORS.FORM_FIELDS).forEach((selector) => {
    const field = querySelector(selector, form);
    if (field) {
      field.addEventListener('input', handleFieldInput);
    }
  });
  
  // Add opportunity change handler
  const opportunitySelect = querySelector(SELECTORS.FORM_FIELDS.OPPORTUNITY, form);
  if (opportunitySelect) {
    opportunitySelect.addEventListener('change', handleOpportunityChange);
  }
  
  log('info', 'Volunteer form initialized');
}

/**
 * Initializes opportunity filtering
 */
function initOpportunityFiltering() {
  const filterSelect = querySelector(SELECTORS.OPPORTUNITY_FILTER);
  
  if (!filterSelect) {
    log('info', 'Opportunity filter not found - skipping filter initialization');
    return;
  }
  
  filterSelect.addEventListener('change', handleFilterChange);
  
  log('info', 'Opportunity filtering initialized');
}

/**
 * Initializes volunteer component
 */
async function init() {
  try {
    log('info', 'Initializing volunteer component');
    
    // Fetch volunteer data
    const data = await fetchVolunteerData();
    
    // Initialize form
    initVolunteerForm(data);
    
    // Initialize filtering
    initOpportunityFiltering();
    
    log('info', 'Volunteer component initialized successfully');
  } catch (error) {
    log('error', 'Failed to initialize volunteer component', {
      error: error.message,
      stack: error.stack,
    });
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for testing
export {
  init,
  validateField,
  validateForm,
  handleFormSubmit,
  filterOpportunities,
  displayContactInfo,
};