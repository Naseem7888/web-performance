/**
 * WHY Q Service Worker
 * Handles caching strategy, offline support, and asset versioning
 */

const CACHE_NAME = 'why-q-v1';
const ASSET_PATH = '/';

// Assets to cache on install
const ASSETS_TO_CACHE = [
  ASSET_PATH,
  ASSET_PATH + 'index.html',
  ASSET_PATH + 'css/site.min.css',
  ASSET_PATH + 'js/site.min.js'
];

/**
 * Install event - cache essential assets
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching essential assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((error) => {
      console.error('[Service Worker] Cache failed:', error);
    })
  );
  
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

/**
 * Fetch event - implement caching strategy
 * - Network first for HTML (pages)
 * - Cache first for assets (CSS, JS, images)
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Strategy 1: Network first for HTML documents (navigate mode)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful HTML responses
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          // Return cached version if offline
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[Service Worker] Serving from cache:', request.url);
              return cachedResponse;
            }
            // If no cache available, show offline page (optional)
            return caches.match(new Request(ASSET_PATH + 'index.html'));
          });
        })
    );
    return;
  }

  // Strategy 2: Cache first for assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[Service Worker] Serving from cache:', request.url);
        return cachedResponse;
      }

      // Asset not in cache, fetch from network
      return fetch(request).then((response) => {
        // Cache successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clonedResponse);
        });
        
        console.log('[Service Worker] Cached asset:', request.url);
        return response;
      }).catch((error) => {
        console.error('[Service Worker] Fetch failed:', request.url, error);
        // Return cached version if available
        return caches.match(request);
      });
    })
  );
});

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] Loaded');
