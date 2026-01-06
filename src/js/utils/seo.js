/**
 * SEO Utility Functions
 * 
 * Provides comprehensive SEO functionality including:
 * - Dynamic meta tag generation and management
 * - Structured data (JSON-LD) generation for Organization and Event schemas
 * - Open Graph and Twitter Card meta tags
 * - Canonical URL management
 * - Breadcrumb structured data
 * - SEO-optimized content sanitization
 * 
 * @module seo
 * @generated-from: task-id:TASK-014
 * @modifies: none
 * @dependencies: none
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = Object.freeze({
  SITE_NAME: 'Grace Fellowship Church',
  SITE_URL: 'https://gracefellowship.church',
  DEFAULT_DESCRIPTION: 'Join Grace Fellowship Church for worship, community, and spiritual growth. Discover our ministries, events, and ways to connect.',
  DEFAULT_IMAGE: '/images/church-hero.jpg',
  DEFAULT_IMAGE_ALT: 'Grace Fellowship Church building',
  TWITTER_HANDLE: '@gracefellowship',
  FACEBOOK_APP_ID: '',
  MAX_DESCRIPTION_LENGTH: 160,
  MAX_TITLE_LENGTH: 60,
  ORGANIZATION_TYPE: 'Church',
  ORGANIZATION_LOGO: '/images/logo.png',
  ORGANIZATION_ADDRESS: {
    streetAddress: '123 Faith Street',
    addressLocality: 'Springfield',
    addressRegion: 'IL',
    postalCode: '62701',
    addressCountry: 'US',
  },
  ORGANIZATION_CONTACT: {
    telephone: '+1-555-123-4567',
    email: 'info@gracefellowship.church',
  },
});

const MINISTRY_META = Object.freeze({
  childrens: {
    title: 'Children\'s Ministry',
    description: 'Nurturing young hearts with Bible stories, activities, and age-appropriate worship for children from nursery through elementary.',
    keywords: 'children ministry, kids church, Sunday school, youth programs',
    image: '/images/ministries/childrens.jpg',
  },
  youth: {
    title: 'Youth Ministry',
    description: 'Empowering teens through dynamic worship, biblical teaching, and community service opportunities for middle and high school students.',
    keywords: 'youth ministry, teen church, youth group, student ministry',
    image: '/images/ministries/youth.jpg',
  },
  mens: {
    title: 'Men\'s Ministry',
    description: 'Building strong Christian men through fellowship, Bible study, and accountability in a supportive brotherhood.',
    keywords: 'men ministry, men\'s group, Christian men, men\'s fellowship',
    image: '/images/ministries/mens.jpg',
  },
  womens: {
    title: 'Women\'s Ministry',
    description: 'Connecting women in faith through Bible studies, prayer groups, and community outreach programs.',
    keywords: 'women ministry, women\'s group, Christian women, women\'s fellowship',
    image: '/images/ministries/womens.jpg',
  },
  outreach: {
    title: 'Community Outreach',
    description: 'Serving our community with compassion through food banks, homeless ministry, and local mission projects.',
    keywords: 'community outreach, mission, service, charity, volunteer',
    image: '/images/ministries/outreach.jpg',
  },
});

const PAGE_META = Object.freeze({
  home: {
    title: 'Welcome Home',
    description: 'Experience authentic worship and genuine community at Grace Fellowship Church. Join us for Sunday services and discover your place.',
    keywords: 'church, worship, community, faith, Christian church',
  },
  about: {
    title: 'About Us',
    description: 'Learn about Grace Fellowship Church\'s mission, beliefs, history, and pastoral team dedicated to serving our community.',
    keywords: 'about church, church history, beliefs, mission, pastoral staff',
  },
  events: {
    title: 'Events & Calendar',
    description: 'Stay connected with upcoming worship services, special events, community gatherings, and ministry activities at Grace Fellowship.',
    keywords: 'church events, calendar, worship services, activities, gatherings',
  },
  contact: {
    title: 'Contact Us',
    description: 'Get in touch with Grace Fellowship Church. Find our location, service times, contact information, and directions.',
    keywords: 'contact church, location, directions, service times, phone',
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitizes text content for SEO meta tags
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string} Sanitized text
 */
function sanitizeText(text, maxLength = null) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = sanitized;
  sanitized = textarea.value;
  
  // Remove extra whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Truncate if needed
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3).trim() + '...';
  }
  
  return sanitized;
}

/**
 * Generates absolute URL from relative path
 * @param {string} path - Relative or absolute path
 * @returns {string} Absolute URL
 */
function getAbsoluteUrl(path) {
  if (!path) {
    return CONFIG.SITE_URL;
  }
  
  // Already absolute
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Ensure leading slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${CONFIG.SITE_URL}${normalizedPath}`;
}

/**
 * Gets current page path from window location
 * @returns {string} Current page path
 */
function getCurrentPath() {
  if (typeof window === 'undefined') {
    return '/';
  }
  return window.location.pathname;
}

/**
 * Extracts page type from path
 * @param {string} path - Page path
 * @returns {string} Page type (home, ministry, events, etc.)
 */
function getPageType(path) {
  if (!path || path === '/' || path === '/index.html') {
    return 'home';
  }
  
  const cleanPath = path.replace(/^\//, '').replace(/\.html$/, '');
  
  // Check if it's a ministry page
  const ministryPages = Object.keys(MINISTRY_META);
  if (ministryPages.includes(cleanPath)) {
    return 'ministry';
  }
  
  // Check if it's a known page
  if (PAGE_META[cleanPath]) {
    return cleanPath;
  }
  
  return 'other';
}

/**
 * Logs structured messages with context
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} context - Additional context data
 */
function log(level, message, context = {}) {
  const logMethod = console[level] || console.log;
  logMethod('[GFC SEO]', message, context);
}

// ============================================================================
// META TAG MANAGEMENT
// ============================================================================

/**
 * Sets or updates a meta tag
 * @param {string} name - Meta tag name or property
 * @param {string} content - Meta tag content
 * @param {boolean} isProperty - Whether to use property attribute instead of name
 */
function setMetaTag(name, content, isProperty = false) {
  if (!name || !content) {
    return;
  }

  const attribute = isProperty ? 'property' : 'name';
  const selector = `meta[${attribute}="${name}"]`;
  
  let metaTag = document.querySelector(selector);
  
  if (metaTag) {
    metaTag.setAttribute('content', content);
  } else {
    metaTag = document.createElement('meta');
    metaTag.setAttribute(attribute, name);
    metaTag.setAttribute('content', content);
    document.head.appendChild(metaTag);
  }
}

/**
 * Sets page title
 * @param {string} title - Page title
 */
function setTitle(title) {
  if (!title) {
    return;
  }
  
  const fullTitle = title === CONFIG.SITE_NAME 
    ? title 
    : `${title} | ${CONFIG.SITE_NAME}`;
  
  document.title = sanitizeText(fullTitle, CONFIG.MAX_TITLE_LENGTH);
}

/**
 * Sets canonical URL
 * @param {string} url - Canonical URL
 */
function setCanonicalUrl(url) {
  if (!url) {
    return;
  }

  const absoluteUrl = getAbsoluteUrl(url);
  let linkTag = document.querySelector('link[rel="canonical"]');
  
  if (linkTag) {
    linkTag.setAttribute('href', absoluteUrl);
  } else {
    linkTag = document.createElement('link');
    linkTag.setAttribute('rel', 'canonical');
    linkTag.setAttribute('href', absoluteUrl);
    document.head.appendChild(linkTag);
  }
}

/**
 * Sets basic meta tags
 * @param {Object} options - Meta tag options
 * @param {string} options.title - Page title
 * @param {string} options.description - Page description
 * @param {string} options.keywords - Page keywords
 * @param {string} options.image - Page image URL
 * @param {string} options.url - Page URL
 */
function setBasicMetaTags({ title, description, keywords, image, url }) {
  if (title) {
    setTitle(title);
  }
  
  if (description) {
    const sanitizedDescription = sanitizeText(description, CONFIG.MAX_DESCRIPTION_LENGTH);
    setMetaTag('description', sanitizedDescription);
  }
  
  if (keywords) {
    setMetaTag('keywords', keywords);
  }
  
  if (url) {
    setCanonicalUrl(url);
  }
}

/**
 * Sets Open Graph meta tags
 * @param {Object} options - Open Graph options
 * @param {string} options.title - OG title
 * @param {string} options.description - OG description
 * @param {string} options.image - OG image URL
 * @param {string} options.url - OG URL
 * @param {string} options.type - OG type (website, article, etc.)
 */
function setOpenGraphTags({ title, description, image, url, type = 'website' }) {
  setMetaTag('og:site_name', CONFIG.SITE_NAME, true);
  setMetaTag('og:type', type, true);
  
  if (title) {
    setMetaTag('og:title', sanitizeText(title), true);
  }
  
  if (description) {
    setMetaTag('og:description', sanitizeText(description, CONFIG.MAX_DESCRIPTION_LENGTH), true);
  }
  
  if (image) {
    const absoluteImage = getAbsoluteUrl(image);
    setMetaTag('og:image', absoluteImage, true);
    setMetaTag('og:image:alt', CONFIG.DEFAULT_IMAGE_ALT, true);
  }
  
  if (url) {
    setMetaTag('og:url', getAbsoluteUrl(url), true);
  }
  
  if (CONFIG.FACEBOOK_APP_ID) {
    setMetaTag('fb:app_id', CONFIG.FACEBOOK_APP_ID, true);
  }
}

/**
 * Sets Twitter Card meta tags
 * @param {Object} options - Twitter Card options
 * @param {string} options.title - Twitter title
 * @param {string} options.description - Twitter description
 * @param {string} options.image - Twitter image URL
 * @param {string} options.card - Card type (summary, summary_large_image)
 */
function setTwitterCardTags({ title, description, image, card = 'summary_large_image' }) {
  setMetaTag('twitter:card', card);
  
  if (CONFIG.TWITTER_HANDLE) {
    setMetaTag('twitter:site', CONFIG.TWITTER_HANDLE);
  }
  
  if (title) {
    setMetaTag('twitter:title', sanitizeText(title));
  }
  
  if (description) {
    setMetaTag('twitter:description', sanitizeText(description, CONFIG.MAX_DESCRIPTION_LENGTH));
  }
  
  if (image) {
    setMetaTag('twitter:image', getAbsoluteUrl(image));
    setMetaTag('twitter:image:alt', CONFIG.DEFAULT_IMAGE_ALT);
  }
}

// ============================================================================
// STRUCTURED DATA (JSON-LD)
// ============================================================================

/**
 * Generates Organization structured data
 * @returns {Object} Organization schema
 */
function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': CONFIG.ORGANIZATION_TYPE,
    name: CONFIG.SITE_NAME,
    url: CONFIG.SITE_URL,
    logo: getAbsoluteUrl(CONFIG.ORGANIZATION_LOGO),
    description: CONFIG.DEFAULT_DESCRIPTION,
    address: {
      '@type': 'PostalAddress',
      ...CONFIG.ORGANIZATION_ADDRESS,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: CONFIG.ORGANIZATION_CONTACT.telephone,
      email: CONFIG.ORGANIZATION_CONTACT.email,
      contactType: 'customer service',
    },
    sameAs: [
      // Add social media URLs here
    ],
  };
}

/**
 * Generates Event structured data
 * @param {Object} event - Event data
 * @param {string} event.name - Event name
 * @param {string} event.description - Event description
 * @param {string} event.startDate - Event start date (ISO 8601)
 * @param {string} event.endDate - Event end date (ISO 8601)
 * @param {string} event.location - Event location
 * @param {string} event.image - Event image URL
 * @returns {Object} Event schema
 */
function generateEventSchema(event) {
  if (!event || !event.name || !event.startDate) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.description || '',
    startDate: event.startDate,
    endDate: event.endDate || event.startDate,
    location: {
      '@type': 'Place',
      name: event.location || CONFIG.SITE_NAME,
      address: {
        '@type': 'PostalAddress',
        ...CONFIG.ORGANIZATION_ADDRESS,
      },
    },
    image: event.image ? getAbsoluteUrl(event.image) : getAbsoluteUrl(CONFIG.DEFAULT_IMAGE),
    organizer: {
      '@type': CONFIG.ORGANIZATION_TYPE,
      name: CONFIG.SITE_NAME,
      url: CONFIG.SITE_URL,
    },
  };
}

/**
 * Generates BreadcrumbList structured data
 * @param {Array<Object>} breadcrumbs - Breadcrumb items
 * @param {string} breadcrumbs[].name - Breadcrumb name
 * @param {string} breadcrumbs[].url - Breadcrumb URL
 * @returns {Object} BreadcrumbList schema
 */
function generateBreadcrumbSchema(breadcrumbs) {
  if (!breadcrumbs || !Array.isArray(breadcrumbs) || breadcrumbs.length === 0) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: getAbsoluteUrl(crumb.url),
    })),
  };
}

/**
 * Inserts or updates structured data script tag
 * @param {Object} schema - Schema object
 * @param {string} id - Script tag ID
 */
function insertStructuredData(schema, id) {
  if (!schema) {
    return;
  }

  const scriptId = `structured-data-${id}`;
  let scriptTag = document.getElementById(scriptId);
  
  if (scriptTag) {
    scriptTag.textContent = JSON.stringify(schema);
  } else {
    scriptTag = document.createElement('script');
    scriptTag.id = scriptId;
    scriptTag.type = 'application/ld+json';
    scriptTag.textContent = JSON.stringify(schema);
    document.head.appendChild(scriptTag);
  }
}

// ============================================================================
// PAGE-SPECIFIC SEO FUNCTIONS
// ============================================================================

/**
 * Sets SEO meta tags for ministry pages
 * @param {string} ministryKey - Ministry key (childrens, youth, etc.)
 * @param {Object} customData - Custom ministry data to override defaults
 */
function setMinistryPageMeta(ministryKey, customData = {}) {
  const ministryData = MINISTRY_META[ministryKey];
  
  if (!ministryData) {
    log('warn', 'Unknown ministry key', { ministryKey });
    return;
  }

  const meta = {
    title: customData.title || ministryData.title,
    description: customData.description || ministryData.description,
    keywords: customData.keywords || ministryData.keywords,
    image: customData.image || ministryData.image,
    url: getCurrentPath(),
  };

  setBasicMetaTags(meta);
  setOpenGraphTags(meta);
  setTwitterCardTags(meta);

  // Generate breadcrumb
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Ministries', url: '/ministries' },
    { name: meta.title, url: getCurrentPath() },
  ];
  
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);
  insertStructuredData(breadcrumbSchema, 'breadcrumb');

  log('info', 'Ministry page meta tags set', { ministryKey, title: meta.title });
}

/**
 * Sets SEO meta tags for standard pages
 * @param {string} pageKey - Page key (home, about, events, contact)
 * @param {Object} customData - Custom page data to override defaults
 */
function setPageMeta(pageKey, customData = {}) {
  const pageData = PAGE_META[pageKey];
  
  if (!pageData) {
    log('warn', 'Unknown page key', { pageKey });
    return;
  }

  const meta = {
    title: customData.title || pageData.title,
    description: customData.description || pageData.description,
    keywords: customData.keywords || pageData.keywords,
    image: customData.image || CONFIG.DEFAULT_IMAGE,
    url: getCurrentPath(),
  };

  setBasicMetaTags(meta);
  setOpenGraphTags(meta);
  setTwitterCardTags(meta);

  // Generate breadcrumb for non-home pages
  if (pageKey !== 'home') {
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: meta.title, url: getCurrentPath() },
    ];
    
    const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);
    insertStructuredData(breadcrumbSchema, 'breadcrumb');
  }

  log('info', 'Page meta tags set', { pageKey, title: meta.title });
}

/**
 * Sets SEO meta tags for events page with structured data
 * @param {Array<Object>} events - Array of event objects
 */
function setEventsPageMeta(events = []) {
  const meta = {
    title: PAGE_META.events.title,
    description: PAGE_META.events.description,
    keywords: PAGE_META.events.keywords,
    image: CONFIG.DEFAULT_IMAGE,
    url: getCurrentPath(),
  };

  setBasicMetaTags(meta);
  setOpenGraphTags(meta);
  setTwitterCardTags(meta);

  // Generate breadcrumb
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Events', url: getCurrentPath() },
  ];
  
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);
  insertStructuredData(breadcrumbSchema, 'breadcrumb');

  // Add event structured data for each event
  if (events && Array.isArray(events) && events.length > 0) {
    events.forEach((event, index) => {
      const eventSchema = generateEventSchema(event);
      if (eventSchema) {
        insertStructuredData(eventSchema, `event-${index}`);
      }
    });
    
    log('info', 'Events page meta tags set with structured data', { eventCount: events.length });
  } else {
    log('info', 'Events page meta tags set without events');
  }
}

// ============================================================================
// INITIALIZATION & AUTO-DETECTION
// ============================================================================

/**
 * Automatically detects page type and sets appropriate meta tags
 * @param {Object} options - Configuration options
 * @param {Object} options.customData - Custom data to override defaults
 * @param {Array<Object>} options.events - Events data for events page
 */
function initSEO(options = {}) {
  try {
    const path = getCurrentPath();
    const pageType = getPageType(path);
    const { customData = {}, events = [] } = options;

    // Always add organization schema
    const orgSchema = generateOrganizationSchema();
    insertStructuredData(orgSchema, 'organization');

    // Set page-specific meta tags
    if (pageType === 'ministry') {
      const ministryKey = path.replace(/^\//, '').replace(/\.html$/, '');
      setMinistryPageMeta(ministryKey, customData);
    } else if (pageType === 'events') {
      setEventsPageMeta(events);
    } else if (PAGE_META[pageType]) {
      setPageMeta(pageType, customData);
    } else {
      // Fallback for unknown pages
      setBasicMetaTags({
        title: customData.title || CONFIG.SITE_NAME,
        description: customData.description || CONFIG.DEFAULT_DESCRIPTION,
        keywords: customData.keywords || '',
        image: customData.image || CONFIG.DEFAULT_IMAGE,
        url: path,
      });
      log('info', 'Default meta tags set for unknown page', { path });
    }

    log('info', 'SEO initialization complete', { pageType, path });
  } catch (error) {
    log('error', 'SEO initialization failed', { error: error.message, stack: error.stack });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  initSEO,
  setMinistryPageMeta,
  setPageMeta,
  setEventsPageMeta,
  setBasicMetaTags,
  setOpenGraphTags,
  setTwitterCardTags,
  setTitle,
  setCanonicalUrl,
  generateOrganizationSchema,
  generateEventSchema,
  generateBreadcrumbSchema,
  insertStructuredData,
  sanitizeText,
  getAbsoluteUrl,
};