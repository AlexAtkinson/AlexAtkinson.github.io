/* Service Worker: basic caching strategies

   - Precaches core assets on install.
   - Network-first for navigations (HTML) with cache fallback.
   - Stale-while-revalidate for CSS/JS.
   - Cache-first for images (including avatars) with simple LRU trimming.

   Note: For best results also configure server `Cache-Control` headers (long max-age
   for immutable assets and short for HTML). This SW provides offline/resilience
   behavior when headers can't be set (e.g., GitHub Pages).
*/

const CACHE_VERSION = 'v1::' + (new Date()).toISOString().split('T')[0];
const PRECACHE = CACHE_VERSION + '::precache';
const RUNTIME = CACHE_VERSION + '::runtime';
const IMAGES = CACHE_VERSION + '::images';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/assets/theme.css',
  '/assets/theme.js'
];

// Simple cache trimming: keep only `maxItems` entries in the given cache
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  const removeCount = keys.length - maxItems;
  for (let i = 0; i < removeCount; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', event => {
  // Clean up old caches
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => {
      if (![PRECACHE, RUNTIME, IMAGES].includes(k)) return caches.delete(k);
    }));
    self.clients.claim();
  })());
});

// Helper: fetch from network with timeout
async function networkFetch(request, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(request, {signal: controller.signal});
    clearTimeout(timer);
    return response;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests (skip analytics, CDNs unless you want them cached)
  if (url.origin !== location.origin) return;

  // Navigation requests -> network-first, fallback to cache
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
    event.respondWith((async () => {
      try {
        const response = await networkFetch(req, 7000);
        // update cache
        const cache = await caches.open(RUNTIME);
        cache.put(req, response.clone());
        return response;
      } catch (err) {
        const cache = await caches.match(req) || await caches.match('/index.html');
        return cache || new Response('Offline', {status: 503, statusText: 'Offline'});
      }
    })());
    return;
  }

  // CSS/JS: stale-while-revalidate
  if (req.destination === 'style' || req.destination === 'script' || req.url.endsWith('.css') || req.url.endsWith('.js')) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME);
      const cached = await cache.match(req);
      const networkPromise = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      return cached || (await networkPromise) || new Response('', {status: 504});
    })());
    return;
  }

  // Images: cache-first, then network, keep limited entries
  if (req.destination === 'image' || req.url.match(/\.(png|jpg|jpeg|webp|gif)$/)) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGES);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const response = await fetch(req);
        if (response && response.ok) {
          cache.put(req, response.clone());
          // keep only 60 images
          trimCache(IMAGES, 60);
        }
        return response;
      } catch (e) {
        return new Response('', {status: 504});
      }
    })());
    return;
  }

  // Default: try cache, then network
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const response = await fetch(req);
      return response;
    } catch (e) {
      return new Response('', {status: 504});
    }
  })());
});

/* End of service worker */
