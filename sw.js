// Leonor v7 — Service Worker
// Permite funcionamiento offline y caché inteligente

const CACHE = 'leonor-v7';
const ASSETS = [
  '/Leonor_index/',
  '/Leonor_index/index.html',
  '/Leonor_index/manifest.json',
];

// Instalar: cachear archivos base
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activar: limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first para assets, network-first para API
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // API de Gemini — siempre red, nunca cachear
  if (url.includes('generativelanguage.googleapis.com')) return;

  // Fuentes de Google — network first con fallback
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets propios — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('/Leonor_index/index.html'));
    })
  );
});
