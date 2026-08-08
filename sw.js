// Service Worker de la app "Nota de entrega de equipo — 1bot".
// Su único trabajo es cachear la página para que abra sin conexión.
// No cachea nada de Google/ClickUp — esas peticiones siempre van directo
// a la red y simplemente fallan en silencio si no hay internet (la app
// las reintenta sola cuando vuelve la conexión).

var CACHE_NAME = 'nota-entrega-1bot-v1';
var APP_SHELL = ['./', './index.html'];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        APP_SHELL.map(function (url) {
          return cache.add(url).catch(function () {
            /* alguna de las dos rutas puede no existir según cómo la subiste — no pasa nada */
          });
        })
      );
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  // Solo controla peticiones a este mismo sitio (la app en sí).
  // Todo lo externo (Google, ClickUp, fuentes, etc.) va directo a la red.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var networkFetch = fetch(req)
        .then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
          }
          return res;
        })
        .catch(function () { return cached; });
      // Responde de inmediato con la copia guardada si existe (rápido y
      // funciona sin conexión), y de paso actualiza el caché en segundo plano.
      return cached || networkFetch;
    })
  );
});
