// Leonor v15 – Service Worker
// Rutas corregidas para GitHub Pages (/Leonor_index/)

const CACHE = 'leonor-v15';
const ASSETS = [
  '/Leonor_index/',
  '/Leonor_index/index.html',
  '/Leonor_index/manifest.json',
];

// Instalar: cachear archivos base y activar inmediatamente
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activar: eliminar TODOS los caches anteriores
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys
          .filter(k => k !== CACHE)
          .map(k => {
            console.log('[Leonor SW] Eliminando cache viejo:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: estrategia por tipo de recurso
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // API Gemini - siempre red, nunca cachear
  if (url.includes('generativelanguage.googleapis.com')) return;

  // Google Drive / OAuth - siempre red
  if (url.includes('googleapis.com') || url.includes('accounts.google.com')) return;

  // Fuentes de Google - network-first con fallback a cache
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets propios - network-first para siempre tener versión reciente
  // fallback a cache si no hay red (modo offline)
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      })
      .catch(() => {
        return caches.match(e.request)
          .then(cached => cached || caches.match('/Leonor_index/index.html'));
      })
  );
});
