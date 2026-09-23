const CACHE_NAME = 'launchpad-mobile-v4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/mobile.css',
  './js/app.js',
  './js/websocket.js',
  './js/lighting-engine.js',
  './js/pad-grid.js',
  './js/haptics.js',
  './js/wakelock.js',
  './assets/icon.png',
  './assets/logo.png',
  './assets/favicon.ico',
  './fonts/BuilderSans-Regular-400.otf',
  './fonts/BuilderSans-SemiBold-600.otf',
  './fonts/BuilderSans-Bold-700.otf',
  './fonts/BuilderMono-Regular-400.otf',
  './fonts/BuilderMono-Bold-700.otf'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache partial failure:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/') || event.request.url.startsWith('ws')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
