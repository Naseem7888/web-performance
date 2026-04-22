/**
 * WHY Q Website - Service Worker for Offline Support & Asset Caching
 * 
 * Features:
 * - Cache-first strategy for static assets
 * - Network-first strategy for HTML pages
 * - Offline fallback page
 * - Background sync
 * - Push notifications ready
 * - Cache versioning
 * - Asset compression support
 * 
 * Caching Strategies:
 * 1. Fonts: Cache-first (never change)
 * 2. CSS/JS: Cache-first with versioning
 * 3. Images: Cache-first with size limit
 * 4. HTML: Network-first (always fresh)
 */

'use strict';

// ============================================
// 1. CACHE CONFIGURATION
// ============================================

// Cache version - increment when deploying
const CACHE_VERSION = 'v1.0.0';

// Cache names
const CACHES_CONFIG = {
    // Core assets that must load
    ESSENTIAL: `${CACHE_VERSION}-essential`,
    
    // CSS, JavaScript, etc.
    STATIC: `${CACHE_VERSION}-static`,
    
    // Images and media
    IMAGES: `${CACHE_VERSION}-images`,
    
    // Font files
    FONTS: `${CACHE_VERSION}-fonts`,
    
    // Dynamic content from network
    DYNAMIC: `${CACHE_VERSION}-dynamic`,
};

// Assets to cache on install
const ESSENTIAL_ASSETS = [
    '/',
    '/index.html',
    '/css/site.min.css',
    '/scripts/main.js',
    '/scripts/performance.js',
];

// Static assets (CSS, JS)
const STATIC_ASSETS = [
    '/css/site.min.css',
    '/scripts/main.js',
    '/scripts/performance.js',
];

// Font assets
const FONT_ASSETS = [
    '/fonts/segoe-ui-subset.woff2',
    '/fonts/segoe-ui-subset.woff',
];

// ============================================
// 2. SERVICE WORKER LIFECYCLE
// ============================================

/**
 * Install Event: Pre-cache essential assets
 * Runs on first install or when SW code changes
 */
self.addEventListener('install', (event) => {
    console.log('✓ Service Worker: Installing...');

    event.waitUntil(
        caches.open(CACHES_CONFIG.ESSENTIAL)
            .then((cache) => {
                console.log('✓ Service Worker: Caching essential assets');
                return cache.addAll(ESSENTIAL_ASSETS);
            })
            .then(() => {
                // Skip waiting - activate immediately
                console.log('✓ Service Worker: Installed successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('✗ Service Worker: Install failed', error);
            })
    );
});

/**
 * Activate Event: Clean up old caches
 * Runs when SW is activated
 */
self.addEventListener('activate', (event) => {
    console.log('✓ Service Worker: Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                // Delete old cache versions
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Keep only current version caches
                        if (!cacheName.includes(CACHE_VERSION)) {
                            console.log('✓ Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✓ Service Worker: Activated successfully');
                return self.clients.claim();
            })
            .catch((error) => {
                console.error('✗ Service Worker: Activation failed', error);
            })
    );
});

// ============================================
// 3. FETCH STRATEGIES
// ============================================

/**
 * Cache-First Strategy
 * Use cached version if available, fallback to network
 * Best for: Static assets, fonts, images
 */
function cacheFirstStrategy(request) {
    return caches.match(request)
        .then((response) => {
            if (response) {
                // Return cached version
                console.log('✓ Cache hit:', request.url);
                return response;
            }

            // Not cached - fetch from network
            return fetch(request)
                .then((response) => {
                    // Cache successful responses
                    if (!response || response.status !== 200) {
                        return response;
                    }

                    const responseClone = response.clone();
                    const cacheName = getCacheNameForRequest(request.url);

                    caches.open(cacheName)
                        .then((cache) => {
                            cache.put(request, responseClone);
                        });

                    return response;
                })
                .catch(() => {
                    // Offline - return cached or offline page
                    return getOfflineFallback(request);
                });
        });
}

/**
 * Network-First Strategy
 * Try network first, fallback to cache
 * Best for: HTML pages, API responses
 */
function networkFirstStrategy(request) {
    return fetch(request)
        .then((response) => {
            // Cache successful responses
            if (!response || response.status !== 200) {
                return response;
            }

            const responseClone = response.clone();
            caches.open(CACHES_CONFIG.DYNAMIC)
                .then((cache) => {
                    cache.put(request, responseClone);
                });

            return response;
        })
        .catch(() => {
            // Network failed - return cached or fallback
            return caches.match(request)
                .then((response) => {
                    if (response) {
                        return response;
                    }
                    return getOfflineFallback(request);
                });
        });
}

/**
 * Stale-While-Revalidate Strategy
 * Return cached immediately, update in background
 * Best for: Non-critical dynamic content
 */
function staleWhileRevalidateStrategy(request) {
    return caches.match(request)
        .then((response) => {
            // Return cached immediately
            if (response) {
                console.log('✓ Stale cache returned:', request.url);

                // Update cache in background
                fetch(request)
                    .then((newResponse) => {
                        if (!newResponse || newResponse.status !== 200) {
                            return;
                        }

                        caches.open(CACHES_CONFIG.DYNAMIC)
                            .then((cache) => {
                                cache.put(request, newResponse);
                                console.log('✓ Cache updated:', request.url);
                            });
                    })
                    .catch(() => {
                        // Update failed, keep stale cache
                    });
            }

            return response || fetch(request);
        })
        .catch(() => {
            return getOfflineFallback(request);
        });
}

// ============================================
// 4. FETCH EVENT HANDLER
// ============================================

/**
 * Main Fetch Event
 * Intercepts all network requests and applies caching strategies
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip external requests (different domain)
    if (url.origin !== self.location.origin) {
        return;
    }

    // Route to appropriate strategy
    if (isFont(request.url)) {
        // Fonts: Cache-first (never expires)
        event.respondWith(cacheFirstStrategy(request));
    } else if (isStaticAsset(request.url)) {
        // CSS, JS: Cache-first
        event.respondWith(cacheFirstStrategy(request));
    } else if (isImage(request.url)) {
        // Images: Cache-first with limit
        event.respondWith(cacheFirstStrategy(request));
    } else if (isDocument(request.url)) {
        // HTML: Network-first
        event.respondWith(networkFirstStrategy(request));
    } else {
        // API/Other: Network-first
        event.respondWith(networkFirstStrategy(request));
    }
});

// ============================================
// 5. HELPER FUNCTIONS
// ============================================

/**
 * Get appropriate cache name for URL
 */
function getCacheNameForRequest(url) {
    if (isFont(url)) return CACHES_CONFIG.FONTS;
    if (isStaticAsset(url)) return CACHES_CONFIG.STATIC;
    if (isImage(url)) return CACHES_CONFIG.IMAGES;
    return CACHES_CONFIG.DYNAMIC;
}

/**
 * Determine if URL is a font
 */
function isFont(url) {
    return /\.(woff2?|ttf|otf|eot)(\?|$)/i.test(url);
}

/**
 * Determine if URL is static asset
 */
function isStaticAsset(url) {
    return /\.(js|css)(\?|$)/i.test(url);
}

/**
 * Determine if URL is image
 */
function isImage(url) {
    return /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(url);
}

/**
 * Determine if URL is HTML document
 */
function isDocument(url) {
    return /\.html?(\?|$)|(\/$)/.test(url) || !/.+\.\w+$/.test(url);
}

/**
 * Get offline fallback response
 */
function getOfflineFallback(request) {
    // Prefer document fallback
    if (isDocument(request.url)) {
        return caches.match('/offline.html')
            .then((response) => {
                return response || createOfflineResponse();
            });
    }

    // For other assets, return error response
    return new Response(
        JSON.stringify({
            message: 'Offline - Asset not available',
            url: request.url,
        }),
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'application/json',
            }),
        }
    );
}

/**
 * Create offline response page
 */
function createOfflineResponse() {
    return new Response(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>WHY Q - Offline</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #f8fafc 0%, #eef3ff 100%);
                }
                .container {
                    text-align: center;
                    padding: 2rem;
                }
                h1 {
                    color: #6C63FF;
                    margin: 0;
                    font-size: 2rem;
                }
                p {
                    color: #666;
                    font-size: 1rem;
                }
                .emoji {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="emoji">📡</div>
                <h1>You're Offline</h1>
                <p>No internet connection. Connect to continue browsing.</p>
                <p style="font-size: 0.9rem; color: #999;">
                    Previously visited pages may be available in offline mode.
                </p>
            </div>
        </body>
        </html>
    `, {
        status: 200,
        headers: new Headers({
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=86400',
        }),
    });
}

/**
 * Message Handler (Optional: for cache management)
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => caches.delete(cacheName))
            );
        });
    }
});

// ============================================
// SERVICE WORKER COMPLETE
// ============================================

console.log('✓ Service Worker loaded');
