/**
 * Service Worker for Grace Fellowship Church Website
 * Implements offline-first caching strategy with progressive enhancement
 * 
 * @generated-from: task-id:TASK-013
 * @modifies: none (new file)
 * @dependencies: []
 */

const CACHE_VERSION = 'gfc-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Cache size limits
const MAX_DYNAMIC_CACHE_SIZE = 50;
const MAX_IMAGE_CACHE_SIZE = 100;

// Critical static assets for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/contact.html',
  '/css/main.css',
  '/js/main.js',
  '/js/utils/accessibility.js',
  '/js/components/navigation.js',
  '/offline.html'
];

// Dynamic content patterns (network-first strategy)
const DYNAMIC_PATTERNS = [
  /\/api\//,
  /\/data\//,
  /\.json$/
];

// Image patterns (cache-first with fallback)
const IMAGE_PATTERNS = [
  /\.jpg$/,
  /\.jpeg$/,
  /\.png$/,
  /\.gif$/,
  /\.webp$/,
  /\.svg$/
];

/**
 * Logs structured messages with context
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
function log(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    service: 'service-worker',
    ...context
  };
  
  if (level === 'error') {
    console.error('[SW]', message, context);
  } else if (level === 'warn') {
    console.warn('[SW]', message, context);
  } else {
    console.log('[SW]', message, context);
  }
}

/**
 * Limits cache size by removing oldest entries
 * @param {string} cacheName - Name of cache to limit
 * @param {number} maxSize - Maximum number of items
 */
async function limitCacheSize(cacheName, maxSize) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxSize) {
      const deleteCount = keys.length - maxSize;
      log('info', 'Limiting cache size', { 
        cacheName, 
        currentSize: keys.length, 
        maxSize,
        deleteCount 
      });
      
      // Delete oldest entries
      await Promise.all(
        keys.slice(0, deleteCount).map(key => cache.delete(key))
      );
    }
  } catch (error) {
    log('error', 'Failed to limit cache size', { 
      cacheName, 
      error: error.message 
    });
  }
}

/**
 * Determines caching strategy based on request URL
 * @param {Request} request - Fetch request
 * @returns {string} Strategy name
 */
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  // Check for dynamic content patterns
  if (DYNAMIC_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return 'network-first';
  }
  
  // Check for image patterns
  if (IMAGE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return 'cache-first-image';
  }
  
  // Check for static assets
  if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset))) {
    return 'cache-first-static';
  }
  
  // Default to network-first for HTML pages
  if (request.destination === 'document') {
    return 'network-first';
  }
  
  return 'cache-first-static';
}

/**
 * Cache-first strategy for static assets
 * @param {Request} request - Fetch request
 * @param {string} cacheName - Cache to use
 * @returns {Promise<Response>} Response
 */
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      log('info', 'Cache hit', { url: request.url, cache: cacheName });
      return cachedResponse;
    }
    
    log('info', 'Cache miss, fetching', { url: request.url });
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      log('info', 'Cached network response', { url: request.url });
    }
    
    return networkResponse;
  } catch (error) {
    log('error', 'Cache-first strategy failed', { 
      url: request.url, 
      error: error.message 
    });
    
    // Try to return cached version as fallback
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Network-first strategy for dynamic content
 * @param {Request} request - Fetch request
 * @param {string} cacheName - Cache to use
 * @returns {Promise<Response>} Response
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
      log('info', 'Network response cached', { url: request.url });
      
      // Limit cache size after adding
      await limitCacheSize(cacheName, MAX_DYNAMIC_CACHE_SIZE);
    }
    
    return networkResponse;
  } catch (error) {
    log('warn', 'Network failed, trying cache', { 
      url: request.url, 
      error: error.message 
    });
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      log('info', 'Serving stale cache', { url: request.url });
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      const offlineResponse = await cache.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    throw error;
  }
}

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  log('info', 'Service worker installing', { version: CACHE_VERSION });
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(STATIC_ASSETS);
        log('info', 'Static assets cached', { count: STATIC_ASSETS.length });
        
        // Skip waiting to activate immediately
        await self.skipWaiting();
      } catch (error) {
        log('error', 'Installation failed', { error: error.message });
        throw error;
      }
    })()
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  log('info', 'Service worker activating', { version: CACHE_VERSION });
  
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name.startsWith('gfc-') && !name.startsWith(CACHE_VERSION)
        );
        
        await Promise.all(
          oldCaches.map(async (cacheName) => {
            log('info', 'Deleting old cache', { cacheName });
            await caches.delete(cacheName);
          })
        );
        
        log('info', 'Old caches cleaned', { deletedCount: oldCaches.length });
        
        // Take control of all clients immediately
        await self.clients.claim();
      } catch (error) {
        log('error', 'Activation failed', { error: error.message });
        throw error;
      }
    })()
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (except for same-origin or CDN assets)
  if (url.origin !== self.location.origin && !url.hostname.includes('cdn')) {
    return;
  }
  
  const strategy = getCacheStrategy(request);
  
  event.respondWith(
    (async () => {
      try {
        switch (strategy) {
          case 'cache-first-static':
            return await cacheFirstStrategy(request, STATIC_CACHE);
          
          case 'cache-first-image':
            const imageResponse = await cacheFirstStrategy(request, IMAGE_CACHE);
            await limitCacheSize(IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE);
            return imageResponse;
          
          case 'network-first':
            return await networkFirstStrategy(request, DYNAMIC_CACHE);
          
          default:
            log('warn', 'Unknown strategy, using network', { 
              url: request.url, 
              strategy 
            });
            return await fetch(request);
        }
      } catch (error) {
        log('error', 'Fetch handler failed', { 
          url: request.url, 
          error: error.message 
        });
        
        // Return generic offline response
        return new Response(
          JSON.stringify({ 
            error: 'Offline', 
            message: 'Unable to fetch resource while offline' 
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    })()
  );
});

/**
 * Message event - handle commands from clients
 */
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (!data || !data.type) {
    return;
  }
  
  log('info', 'Message received', { type: data.type });
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    
    case 'CLEAR_CACHE':
      event.waitUntil(
        (async () => {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            log('info', 'All caches cleared');
            event.ports[0].postMessage({ success: true });
          } catch (error) {
            log('error', 'Failed to clear caches', { error: error.message });
            event.ports[0].postMessage({ success: false, error: error.message });
          }
        })()
      );
      break;
    
    case 'GET_CACHE_SIZE':
      event.waitUntil(
        (async () => {
          try {
            const cacheNames = await caches.keys();
            const sizes = await Promise.all(
              cacheNames.map(async (name) => {
                const cache = await caches.open(name);
                const keys = await cache.keys();
                return { name, size: keys.length };
              })
            );
            event.ports[0].postMessage({ success: true, sizes });
          } catch (error) {
            log('error', 'Failed to get cache sizes', { error: error.message });
            event.ports[0].postMessage({ success: false, error: error.message });
          }
        })()
      );
      break;
    
    default:
      log('warn', 'Unknown message type', { type: data.type });
  }
});

/**
 * Sync event - background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  log('info', 'Background sync triggered', { tag: event.tag });
  
  if (event.tag === 'sync-analytics') {
    event.waitUntil(
      (async () => {
        try {
          // Sync queued analytics events
          log('info', 'Syncing analytics events');
          // Implementation would integrate with analytics.js
        } catch (error) {
          log('error', 'Sync failed', { error: error.message });
          throw error;
        }
      })()
    );
  }
});

/**
 * Push event - handle push notifications (future enhancement)
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }
  
  try {
    const data = event.data.json();
    log('info', 'Push notification received', { title: data.title });
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/icon-192.png',
        badge: '/badge-72.png',
        data: data.url
      })
    );
  } catch (error) {
    log('error', 'Push notification failed', { error: error.message });
  }
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data)
    );
  }
});

log('info', 'Service worker script loaded', { version: CACHE_VERSION });