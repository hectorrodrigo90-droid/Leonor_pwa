// Leonor 2.0 – Service Worker
// Estrategia: Network-first para API, Cache-first para assets

const CACHE_NAME = 'leonor-v2.0';
const CACHE_ASSETS = [
  '/',
  '/leonor_index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// ── INSTALL: cachear assets estáticos ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_ASSETS).catch(() => {
        // Si algún asset no existe, continuar sin error
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpiar cachés viejos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API de Gemini: siempre Network (nunca cachear)
  if (url.hostname.includes('generativelanguage.googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Google Fonts: cache-first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return r;
      }))
    );
    return;
  }

  // Assets locales: Network-first con fallback a cache
  event.respondWith(
    fetch(event.request)
      .then(r => {
        if (!r || r.status !== 200 || r.type === 'opaque') return r;
        const clone = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return r;
      })
      .catch(() => caches.match(event.request).then(cached => {
        if (cached) return cached;
        // Fallback offline
        if (event.request.mode === 'navigate') {
          return caches.match('/leonor_index.html');
        }
        return new Response('Offline', { status: 503 });
      }))
  );
});
