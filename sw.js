/**
 * Service worker de Tecu Aprende: la app y el paquete de contenido quedan
 * guardados en el celular para funcionar en modo avión después de la primera
 * visita.
 *
 * Estrategia:
 *   - install: guarda (precache) todo lo de PRECACHE.
 *   - archivos de la app y paquetes: se sirven desde la caché al instante y se
 *     actualizan en segundo plano (stale-while-revalidate), así una versión
 *     nueva llega en la siguiente recarga sin dejar de funcionar sin red.
 *   - navegación (?vista=docente, ?alumno=ana…): siempre el index.html guardado.
 *   - /api/*: nunca pasa por la caché (la IA opcional necesita red).
 *
 * Si agregas un archivo a la app, agrégalo a PRECACHE: tests/sw.test.js
 * revisa que la lista esté completa.
 */
const VERSION = 'tecu-2026-11-12-a';
const CACHE = `tecu-app-${VERSION}`;

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'styles.css',
  'css/tecu.css',
  'css/balanza.css',
  'css/cuaderno.css',
  'css/estudiante.css',
  'css/docente.css',
  'css/ficha.css',
  'css/impresion.css',
  'css/pitch.css',
  'fonts/nunito-latin-wght-normal.woff2',
  'icons/icono.svg',
  'icons/icono-192.png',
  'icons/icono-512.png',
  'icons/icono-maskable-512.png',
  'packs/ecuaciones-1.json',
  'packs/contexto.json',
  'js/main.js',
  'js/core/engine.js',
  'js/core/fraction.js',
  'js/core/rng.js',
  'js/core/ruta.js',
  'js/core/textos.js',
  'js/data/guiones.js',
  'js/data/paquete.js',
  'js/data/store.js',
  'js/data/grupo.js',
  'js/data/analitica.js',
  'js/services/preferencias.js',
  'js/services/red.js',
  'js/services/sw-registro.js',
  'js/ui/balanza.js',
  'js/ui/cuaderno.js',
  'js/ui/dom.js',
  'js/ui/iconos.js',
  'js/ui/tecu.js',
  'js/ui/ficha.js',
  'js/ui/cuadernillo.js',
  'js/views/estudiante.js',
  'js/views/docente.js',
  'js/views/pitch.js',
  'js/data/escenas.js',
  'js/ui/atajos.js',
  'js/ui/diapositiva.js',
  'js/ui/libre.js',
  'js/ui/actualizacion.js',
  'js/ui/cola.js',
  'css/diapositiva.css',
  'css/libre.css',
  'css/cola.css',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Uno por uno: si un archivo opcional aún no existe (p. ej. una vista en
      // construcción), el resto igual queda guardado.
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const resp = await fetch(new Request(url, { cache: 'reload' }));
            if (resp.ok) await cache.put(url, resp);
          } catch {
            /* sin red durante la instalación: se reintenta en la próxima visita */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((n) => n.startsWith('tecu-app-') && n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/** Sirve desde caché y actualiza en segundo plano. */
async function cacheYActualiza(evento, clave) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(clave, { ignoreSearch: true });
  const deRed = fetch(evento.request)
    .then((resp) => {
      if (resp && resp.ok && resp.type === 'basic') cache.put(clave, resp.clone());
      return resp;
    })
    .catch(() => null);
  if (guardada) {
    evento.waitUntil(deRed);
    return guardada;
  }
  const resp = await deRed;
  return resp || new Response('Sin conexión y sin copia guardada de este archivo.', { status: 504, statusText: 'Sin conexión' });
}

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return; // la IA y cualquier API van directo a la red

  if (request.mode === 'navigate') {
    // Cualquier vista (?vista=docente, ?alumno=ana) usa el mismo index.html.
    evento.respondWith(cacheYActualiza(evento, new URL('index.html', self.registration.scope).href));
    return;
  }
  evento.respondWith(cacheYActualiza(evento, request));
});

/** La página puede preguntar qué tan lista está la app para usarse sin red. */
self.addEventListener('message', async (evento) => {
  if (evento.data?.tipo !== 'estado-cache') return;
  const cache = await caches.open(CACHE);
  const claves = await cache.keys();
  let bytes = 0;
  for (const clave of claves) {
    const resp = await cache.match(clave);
    if (resp) bytes += (await resp.clone().arrayBuffer()).byteLength;
  }
  const respuesta = { tipo: 'estado-cache', version: VERSION, archivos: claves.length, bytes };
  if (evento.ports?.[0]) evento.ports[0].postMessage(respuesta);
  else evento.source?.postMessage(respuesta);
});
