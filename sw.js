// Service worker mínimo: hace que la página se pueda instalar como app.
// Siempre va primero a la red (nunca sirve versiones viejas); guarda copia de lo que descarga
// y sólo la usa si no hay conexión.
const CACHE = 'eh-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then((res) => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r).then((m) => m || caches.match(r, { ignoreSearch: true })))
  );
});
