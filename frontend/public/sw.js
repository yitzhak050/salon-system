// Service Worker for Salon Community PWA
const CACHE_NAME = 'salon-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_AUTH_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});

// Network-first strategy; NEVER cache API calls or authenticated requests
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/users') ||
    url.pathname.startsWith('/shifts') ||
    url.pathname.startsWith('/reports') ||
    url.pathname.startsWith('/notifications') ||
    url.pathname.startsWith('/checklist') ||
    url.pathname.startsWith('/settings') ||
    event.request.headers.get('Authorization')
  ) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
