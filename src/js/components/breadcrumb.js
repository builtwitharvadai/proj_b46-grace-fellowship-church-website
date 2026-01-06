/**
 * Breadcrumb Navigation Component
 * 
 * Provides dynamic breadcrumb navigation with:
 * - Automatic path generation from URL
 * - Page hierarchy detection
 * - Full accessibility support (ARIA, keyboard navigation)
 * - Responsive breadcrumb display
 * - Structured data for SEO
 * 
 * @module components/breadcrumb
 * @generated-from: task-id:TASK-014
 * @modifies: none
 * @dependencies: none
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  CONTAINER_SELECTOR: '.breadcrumb__container',
  SEPARATOR: '/',
  SEPARATOR_ARIA_LABEL: 'breadcrumb separator',
  HOME_LABEL: 'Home',
  HOME_PATH: '/',
  MAX_MOBILE_ITEMS: 2,
  MOBILE_BREAKPOINT: 640,
});

const ARIA_ATTRIBUTES = Object.freeze({
  NAV_LABEL: 'Breadcrumb',
  CURRENT_PAGE: 'page',
});

// Page title mappings for better breadcrumb labels
const PAGE_TITLES = Object.freeze({
  'index.html': 'Home',
  'about.html': 'About Us',
  'contact.html': 'Contact',
  'events.html': 'Events',
  'childrens.html': "Children's Ministry",
  'youth.html': 'Youth Ministry',
  'mens.html': "Men's Ministry",
  'womens.html': "Women's Ministry",
  'outreach.html': 'Outreach Ministry',
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
    component: 'breadcrumb',
    message,
    ...context,
  };
  
  const logMethod = console[level] || console.log;
  logMethod('[GFC:Breadcrumb]', message, context);
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
 * Sanitizes text content for safe HTML insertion
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeText(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Converts URL path segment to readable title
 * @param {string} segment - URL path segment
 * @returns {string} Readable title
 */
function segmentToTitle(segment) {
  if (!segment) {
    return '';
  }
  
  // Remove file extension
  const withoutExt = segment.replace(/\.(html|htm|php)$/i, '');
  
  // Check for predefined title
  const fileName = segment.toLowerCase();
  if (PAGE_TITLES[fileName]) {
    return PAGE_TITLES[fileName];
  }
  
  // Convert kebab-case or snake_case to Title Case
  return withoutExt
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Checks if current viewport is mobile
 * @returns {boolean} True if mobile viewport
 */
function isMobileViewport() {
  return window.innerWidth < CONFIG.MOBILE_BREAKPOINT;
}

// ============================================================================
// BREADCRUMB PATH GENERATION
// ============================================================================

/**
 * Parses current URL to generate breadcrumb path items
 * @returns {Array<{label: string, url: string, isCurrent: boolean}>} Breadcrumb items
 */
function generateBreadcrumbPath() {
  try {
    const path = window.location.pathname;
    const segments = path.split('/').filter(segment => segment.length > 0);
    
    // Always start with home
    const breadcrumbs = [{
      label: CONFIG.HOME_LABEL,
      url: CONFIG.HOME_PATH,
      isCurrent: segments.length === 0,
    }];
    
    // Build breadcrumb items from path segments
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      
      breadcrumbs.push({
        label: segmentToTitle(segment),
        url: currentPath,
        isCurrent: isLast,
      });
    });
    
    log('info', 'Breadcrumb path generated', { 
      itemCount: breadcrumbs.length,
      path,
    });
    
    return breadcrumbs;
  } catch (error) {
    log('error', 'Failed to generate breadcrumb path', { 
      error: error.message,
      stack: error.stack,
    });
    
    // Fallback to home only
    return [{
      label: CONFIG.HOME_LABEL,
      url: CONFIG.HOME_PATH,
      isCurrent: true,
    }];
  }
}

/**
 * Filters breadcrumb items for mobile display
 * @param {Array} items - Full breadcrumb items
 * @returns {Array} Filtered items for mobile
 */
function filterForMobile(items) {
  if (items.length <= CONFIG.MAX_MOBILE_ITEMS) {
    return items;
  }
  
  // Show first and last items only
  return [
    items[0],
    {
      label: '...',
      url: '#',
      isCurrent: false,
      isEllipsis: true,
    },
    items[items.length - 1],
  ];
}

// ============================================================================
// BREADCRUMB HTML GENERATION
// ============================================================================

/**
 * Creates breadcrumb separator element
 * @returns {string} Separator HTML
 */
function createSeparator() {
  return `<span class="breadcrumb__separator" aria-hidden="true"></span>`;
}

/**
 * Creates breadcrumb item HTML
 * @param {Object} item - Breadcrumb item data
 * @param {number} index - Item index
 * @param {number} total - Total items count
 * @returns {string} Item HTML
 */
function createBreadcrumbItem(item, index, total) {
  const { label, url, isCurrent, isEllipsis } = item;
  const sanitizedLabel = sanitizeText(label);
  const isLast = index === total - 1;
  
  // Ellipsis item (mobile only)
  if (isEllipsis) {
    return `
      <li class="breadcrumb__item">
        <span class="breadcrumb__current" aria-hidden="true">${sanitizedLabel}</span>
      </li>
    `;
  }
  
  // Current page (non-interactive)
  if (isCurrent) {
    return `
      <li class="breadcrumb__item">
        <span class="breadcrumb__current" aria-current="${ARIA_ATTRIBUTES.CURRENT_PAGE}">
          ${sanitizedLabel}
        </span>
      </li>
    `;
  }
  
  // Regular link
  return `
    <li class="breadcrumb__item">
      <a href="${url}" class="breadcrumb__link">
        ${sanitizedLabel}
      </a>
      ${!isLast ? createSeparator() : ''}
    </li>
  `;
}

/**
 * Generates complete breadcrumb HTML
 * @param {Array} items - Breadcrumb items
 * @returns {string} Complete breadcrumb HTML
 */
function generateBreadcrumbHTML(items) {
  const displayItems = isMobileViewport() ? filterForMobile(items) : items;
  
  const itemsHTML = displayItems
    .map((item, index) => createBreadcrumbItem(item, index, displayItems.length))
    .join('');
  
  return `
    <nav class="breadcrumb" aria-label="${ARIA_ATTRIBUTES.NAV_LABEL}">
      <div class="breadcrumb__container">
        <ol class="breadcrumb__list">
          ${itemsHTML}
        </ol>
      </div>
    </nav>
  `;
}

// ============================================================================
// STRUCTURED DATA GENERATION
// ============================================================================

/**
 * Generates JSON-LD structured data for breadcrumbs
 * @param {Array} items - Breadcrumb items
 * @returns {Object} Structured data object
 */
function generateStructuredData(items) {
  const itemListElements = items
    .filter(item => !item.isEllipsis)
    .map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `${window.location.origin}${item.url}`,
    }));
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itemListElements,
  };
}

/**
 * Injects structured data into page head
 * @param {Object} structuredData - Structured data object
 */
function injectStructuredData(structuredData) {
  try {
    // Remove existing breadcrumb structured data
    const existingScript = document.querySelector('script[type="application/ld+json"][data-breadcrumb]');
    if (existingScript) {
      existingScript.remove();
    }
    
    // Create new script element
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-breadcrumb', 'true');
    script.textContent = JSON.stringify(structuredData, null, 2);
    
    document.head.appendChild(script);
    
    log('info', 'Structured data injected', { 
      itemCount: structuredData.itemListElement.length,
    });
  } catch (error) {
    log('error', 'Failed to inject structured data', { 
      error: error.message,
      stack: error.stack,
    });
  }
}

// ============================================================================
// BREADCRUMB RENDERING
// ============================================================================

/**
 * Renders breadcrumb navigation into container
 * @param {Element} container - Container element
 */
function renderBreadcrumb(container) {
  if (!container) {
    log('warn', 'Breadcrumb container not found');
    return;
  }
  
  try {
    // Generate breadcrumb path
    const items = generateBreadcrumbPath();
    
    // Generate and inject HTML
    const html = generateBreadcrumbHTML(items);
    container.innerHTML = html;
    
    // Generate and inject structured data
    const structuredData = generateStructuredData(items);
    injectStructuredData(structuredData);
    
    log('info', 'Breadcrumb rendered successfully', { 
      itemCount: items.length,
    });
  } catch (error) {
    log('error', 'Failed to render breadcrumb', { 
      error: error.message,
      stack: error.stack,
    });
    
    // Render fallback breadcrumb
    container.innerHTML = `
      <nav class="breadcrumb" aria-label="${ARIA_ATTRIBUTES.NAV_LABEL}">
        <div class="breadcrumb__container">
          <ol class="breadcrumb__list">
            <li class="breadcrumb__item">
              <a href="${CONFIG.HOME_PATH}" class="breadcrumb__link">
                ${CONFIG.HOME_LABEL}
              </a>
            </li>
          </ol>
        </div>
      </nav>
    `;
  }
}

/**
 * Updates breadcrumb on viewport resize
 */
function handleResize() {
  const container = querySelector(CONFIG.CONTAINER_SELECTOR);
  if (container && container.parentElement) {
    renderBreadcrumb(container.parentElement);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes breadcrumb navigation component
 */
function init() {
  try {
    log('info', 'Initializing breadcrumb component');
    
    // Find breadcrumb container
    const container = querySelector(CONFIG.CONTAINER_SELECTOR);
    
    if (!container) {
      log('info', 'Breadcrumb container not found - component not needed on this page');
      return;
    }
    
    // Initial render
    renderBreadcrumb(container.parentElement);
    
    // Handle responsive updates
    let resizeTimeout = null;
    window.addEventListener('resize', () => {
      if (resizeTimeout !== null) {
        clearTimeout(resizeTimeout);
      }
      
      resizeTimeout = setTimeout(() => {
        resizeTimeout = null;
        handleResize();
      }, 150);
    }, { passive: true });
    
    log('info', 'Breadcrumb component initialized successfully');
  } catch (error) {
    log('error', 'Breadcrumb initialization failed', { 
      error: error.message,
      stack: error.stack,
    });
  }
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  init,
  generateBreadcrumbPath,
  generateBreadcrumbHTML,
  generateStructuredData,
  renderBreadcrumb,
};