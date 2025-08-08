// LivyFlow Service Worker
const CACHE_NAME = 'livyflow-v1.0.0';
const OFFLINE_URL = '/';

// Resources to cache immediately
const PRECACHE_URLS = [
  '/',
  '/app/dashboard',
  '/login',
  '/signup',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/favicon.svg',
  '/site.webmanifest'
];

// API endpoints to cache with network-first strategy
const API_CACHE_PATTERNS = [
  /\/api\/transactions/,
  /\/api\/budgets/,
  /\/api\/accounts/,
  /\/api\/insights/
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('LivyFlow Service Worker installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Precaching app shell resources');
        return cache.addAll(PRECACHE_URLS.map(url => new Request(url, {cache: 'reload'})));
      })
      .then(() => {
        console.log('Service Worker installation complete');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('LivyFlow Service Worker activating');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests with network-first strategy
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle app shell with cache-first strategy
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Default: network-first for everything else
  event.respondWith(networkFirstStrategy(request));
});

// Network-first strategy for API calls and dynamic content
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for API requests
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'This data is not available offline' 
        }), 
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then((response) => {
      if (response.ok) {
        const cache = caches.open(CACHE_NAME);
        cache.then(c => c.put(request, response));
      }
    }).catch(() => {}); // Silent fail for background updates
    
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Navigation handler for app shell
async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful navigation responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Navigation failed, serving cached version');
    
    // Try to serve cached version of the same page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to cached root page for SPA
    const fallbackResponse = await caches.match(OFFLINE_URL);
    if (fallbackResponse) {
      return fallbackResponse;
    }
    
    // Ultimate fallback
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>LivyFlow - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
              text-align: center; 
              padding: 2rem; 
              background: #f8fafc; 
            }
            .container { 
              max-width: 400px; 
              margin: 0 auto; 
              background: white; 
              padding: 2rem; 
              border-radius: 12px; 
              box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
            }
            .icon { 
              font-size: 3rem; 
              margin-bottom: 1rem; 
            }
            h1 { 
              color: #374151; 
              margin-bottom: 0.5rem; 
            }
            p { 
              color: #6b7280; 
              margin-bottom: 1.5rem; 
            }
            button {
              background: #10b981;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 8px;
              font-weight: 500;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🐷</div>
            <h1>You're Offline</h1>
            <p>LivyFlow needs an internet connection to load new content. Your cached data is still available.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Background sync for when connectivity is restored
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
  
  if (event.tag === 'sync-budgets') {
    event.waitUntil(syncBudgets());
  }
});

// Sync functions for background sync
async function syncTransactions() {
  console.log('Syncing transactions in background');
  try {
    // This would typically sync pending transactions from IndexedDB
    const response = await fetch('/api/transactions/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log('Transactions synced successfully');
      // Notify clients that sync completed
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'TRANSACTIONS_SYNCED' });
      });
    }
  } catch (error) {
    console.error('Failed to sync transactions:', error);
  }
}

async function syncBudgets() {
  console.log('Syncing budgets in background');
  try {
    const response = await fetch('/api/budgets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log('Budgets synced successfully');
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'BUDGETS_SYNCED' });
      });
    }
  } catch (error) {
    console.error('Failed to sync budgets:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: 'You have new financial insights available!',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Dashboard',
        icon: '/favicon-32x32.png'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/favicon-32x32.png'
      }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      options.body = payload.body || options.body;
      options.title = payload.title || 'LivyFlow';
    } catch (error) {
      console.error('Failed to parse push payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification('LivyFlow', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/app/dashboard')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('LivyFlow Service Worker loaded');