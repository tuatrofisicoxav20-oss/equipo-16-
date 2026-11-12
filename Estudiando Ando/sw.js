/* =========================================================
   Estudiando Ando · Service worker
   Guarda la aplicación en el dispositivo para usarla sin
   internet (requiere servirse por http/https, no file://).
   ========================================================= */
'use strict';

const CACHE = 'estudiando-ando-v1';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './icon.svg',
  './manifest.webmanifest',
  './js/core.js',
  './js/data.js',
  './js/components.js',
  './js/student.js',
  './js/teacher.js',
  './js/about.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Estrategia: red primero para los archivos propios (siempre la versión
   más reciente cuando hay conexión) y caché como respaldo sin internet. */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')))
  );
});
