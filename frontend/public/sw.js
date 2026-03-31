const CACHE_NAME = 'nirbhay-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Map tile cache
const TILE_CACHE_NAME = 'nirbhay-tiles-v1';
const MAX_TILE_CACHE_SIZE = 100;

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== TILE_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle map tiles
  if (url.hostname.includes('basemaps.cartocdn.com') || 
      url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            // Limit cache size
            const keys = await cache.keys();
            if (keys.length >= MAX_TILE_CACHE_SIZE) {
              await cache.delete(keys[0]);
            }
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // Return cached version or placeholder
          return cachedResponse || new Response('Tile not available', { status: 404 });
        }
      })
    );
    return;
  }

  // Handle API requests - network first
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // Handle static assets - cache first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Background sync for offline route requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-routes') {
    event.waitUntil(syncPendingRoutes());
  }
});

async function syncPendingRoutes() {
  // Handle any pending route requests when back online
  console.log('Syncing pending routes...');
}
