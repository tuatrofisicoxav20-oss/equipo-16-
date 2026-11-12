/**
 * Service worker de Tecu Aprende: la app y el paquete de contenido quedan
 * guardados en el celular para funcionar en modo avión después de la primera
 * visita, y las versiones nuevas llegan sin interrumpir a nadie.
 *
 * Cómo funciona
 *   - install: descarga todo lo de PRECACHE a una caché propia de esta VERSION
 *     (con `cache: 'no-cache'`: siempre pregunta al servidor, pero si un archivo
 *     no cambió el servidor responde 304 y no se descarga dos veces).
 *       · Primera instalación: guarda todo lo que pueda y se activa sola (no hay
 *         nada que actualizar). Lo que falle aparece en `faltantes` de
 *         'estado-cache' y se reintenta en cada visita.
 *       · Actualización: se instala completa o no se instala. Si falla la red, o
 *         falta un archivo que la versión actual sí tiene, se cancela (la versión
 *         actual sigue completa) y el navegador la reintenta en la siguiente
 *         visita. Ya instalada, ESPERA: la página muestra "Hay una versión nueva
 *         de Tecu" (js/ui/actualizacion.js) y solo cuando la persona toca
 *         "Actualizar" llega el mensaje 'skipWaiting'. Si nadie lo toca, se activa
 *         sola la próxima vez que se abra Tecu (con todas sus ventanas cerradas).
 *   - fetch: los archivos de la app salen de la caché de SU versión, nunca de la
 *     red mientras estén guardados: en una misma sesión no se mezclan archivos de
 *     dos versiones. La navegación a la app (./?vista=docente, ./?alumno=ana…)
 *     recibe el index.html guardado. Si la página pide un archivo con ?algo=
 *     ("Actualizar paquete"), va primero a la red sin guardarlo y se busca una
 *     versión nueva. /api/* y lo que no es de la app van directo a la red.
 *   - activate: borra las cachés de versiones viejas de ESTA carpeta (otra app del
 *     mismo dominio, p. ej. otro repositorio en GitHub Pages, no se toca). Si otra
 *     ventana sigue abierta con la versión anterior, esa ventana sigue recibiendo
 *     sus archivos hasta que recargue; luego esa caché se borra.
 *   - message: 'skipWaiting', 'mantenimiento' (completar faltantes y soltar la
 *     caché anterior) y 'estado-cache' → { version, archivos, bytes, total,
 *     faltantes, completo }.
 *
 * Todas las rutas son relativas a la carpeta de este archivo: funciona igual en
 * http://localhost:8080/ que en https://<usuario>.github.io/equipo-16-/.
 *
 * CÓMO PUBLICAR UNA VERSIÓN NUEVA
 *   1. Si agregaste un archivo a la app, agrégalo a PRECACHE (tests/sw.test.js
 *      revisa que la lista esté completa).
 *   2. Cambia VERSION. Es lo ÚNICO que hace que los celulares que ya tienen Tecu
 *      descarguen los cambios: si cambias archivos y no VERSION, esos celulares
 *      siguen con la versión anterior. VERSION termina con la huella del
 *      contenido de PRECACHE: corre `node --test tests/sw.test.js` y copia el
 *      valor que te pide la prueba "VERSION corresponde al contenido" (falla si
 *      se te olvida).
 *   3. Publica sw.js junto con los demás archivos (en el mismo push).
 */
const VERSION = 'tecu-2026-11-12-1c2aaff2';

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'styles.css',
  'css/balanza.css',
  'css/cascaron.css',
  'css/cola.css',
  'css/cuaderno.css',
  'css/diapositiva.css',
  'css/docente.css',
  'css/estudiante.css',
  'css/ficha.css',
  'css/impresion.css',
  'css/libre.css',
  'css/pitch.css',
  'css/tecu.css',
  'fonts/atkinson-hyperlegible-latin-400-italic.woff2',
  'fonts/atkinson-hyperlegible-latin-400-normal.woff2',
  'fonts/atkinson-hyperlegible-latin-700-normal.woff2',
  'icons/icono-192.png',
  'icons/icono-512.png',
  'icons/icono-maskable-512.png',
  'icons/icono.svg',
  'packs/contexto.json',
  'packs/ecuaciones-1.json',
  'js/core/engine.js',
  'js/core/fraction.js',
  'js/core/rng.js',
  'js/core/ruta.js',
  'js/core/textos.js',
  'js/data/alertas.js',
  'js/data/analitica.js',
  'js/data/escenas.js',
  'js/data/grupo.js',
  'js/data/guiones.js',
  'js/data/habilidades.js',
  'js/data/mensajes.js',
  'js/data/paquete.js',
  'js/data/planeacion.js',
  'js/data/store.js',
  'js/main.js',
  'js/marca.js',
  'js/services/preferencias.js',
  'js/services/red.js',
  'js/services/sw-registro.js',
  'js/shell/cascaron.js',
  'js/shell/componentes.js',
  'js/shell/dialogo.js',
  'js/shell/dispositivo.js',
  'js/shell/paneles.js',
  'js/shell/recorrido.js',
  'js/shell/relleno.js',
  'js/shell/rutas.js',
  'js/shell/voz.js',
  'js/ui/actualizacion.js',
  'js/ui/atajos.js',
  'js/ui/balanza.js',
  'js/ui/cola.js',
  'js/ui/cuadernillo.js',
  'js/ui/cuaderno.js',
  'js/ui/diapositiva.js',
  'js/ui/dom.js',
  'js/ui/ficha.js',
  'js/ui/iconos.js',
  'js/ui/libre.js',
  'js/ui/qr.js',
  'js/ui/tecu.js',
  'js/views/acerca.js',
  'js/views/docente.js',
  'js/views/estudiante.js',
  'js/views/pitch.js',
];

/** Carpeta de la app ('/' en local, '/equipo-16-/' en GitHub Pages). */
const BASE = new URL('./', self.location.href);
const ALCANCE = BASE.pathname;
/** Cachés de ESTA carpeta: 'tecu-app-<VERSION>@<carpeta>' (el prefijo lo usan las pruebas). */
const CACHE = `tecu-app-${VERSION}@${ALCANCE}`;
/** Qué caché está activa y qué ventanas siguen con la anterior (sobrevive a que el SW se duerma). */
const CACHE_META = `tecu-meta@${ALCANCE}`;
const CLAVE_META = new URL('__tecu-meta__', BASE).href;

const absoluta = (ruta) => new URL(ruta, BASE).href;
const INDEX = absoluta('index.html');
const RAIZ_APP = absoluta('./');
const DE_LA_APP = new Set(PRECACHE.map(absoluta));
/** Navegación con ?vista= o ?alumno=: misma página. Vary no importa: es el mismo archivo. */
const BUSQUEDA = { ignoreSearch: true, ignoreVary: true };
/** Para leer la VERSION del sw.js publicado (sin coincidir consigo misma). */
const PATRON_VERSION = new RegExp("const VERSION = '([\\w.-]+)';");

const esDeEstaApp = (nombre) => nombre.startsWith('tecu-app-') && nombre.endsWith(`@${ALCANCE}`);
/** Nombres de antes de separar por carpeta ('tecu-app-tecu-2026-11-12-a'). */
const esDeAntes = (nombre) => nombre.startsWith('tecu-app-') && !nombre.includes('@');
const pausa = (ms) => new Promise((listo) => setTimeout(listo, ms));

/* ------------------------------------------------------------------ install */

self.addEventListener('install', (evento) => {
  evento.waitUntil(instalar());
});

async function instalar() {
  memoMeta = null; // lectura fresca: otra versión pudo cambiarla
  const actualizando = Boolean(self.registration.active);
  const anterior = actualizando ? await nombreCacheActiva() : null;
  const cache = await caches.open(CACHE);
  const fallas = await guardar(cache, PRECACHE);
  // Primera instalación: se activa sola con lo que haya (no hay nada que
  // actualizar); lo que falte se completa en las siguientes visitas.
  if (!actualizando) return;
  const graves = [];
  for (const falla of fallas) {
    const laTeniamos = anterior && (await caches.match(absoluta(falla.ruta), { ...BUSQUEDA, cacheName: anterior }));
    if (falla.reintentable || laTeniamos) graves.push(`${falla.ruta} (${falla.motivo})`);
  }
  if (graves.length) {
    // Rechazar la instalación deja la versión actual completa y funcionando; el
    // navegador vuelve a intentar en la siguiente visita (y solo descarga lo que
    // falte: lo ya guardado de esta VERSION se conserva).
    throw new Error(`Tecu ${VERSION} no se instaló; se reintenta en la siguiente visita. Falló: ${graves.join(', ')}`);
  }
}

/**
 * Descarga y guarda cada ruta que aún no esté en `cache`, de 6 en 6 (en un
 * celular de gama baja con 3G, 50 descargas a la vez se estorban entre sí).
 * @returns {Promise<{ ruta: string, motivo: string, reintentable: boolean }[]>} las que fallaron
 */
async function guardar(cache, rutas, { intentos = 3, simultaneas = 6 } = {}) {
  const fallas = [];
  let siguiente = 0;
  const trabajar = async () => {
    while (siguiente < rutas.length) {
      const falla = await guardarUna(cache, rutas[siguiente++], intentos);
      if (falla) fallas.push(falla);
    }
  };
  await Promise.all(Array.from({ length: Math.min(simultaneas, rutas.length) }, trabajar));
  return fallas;
}

async function guardarUna(cache, ruta, intentos) {
  const url = absoluta(ruta);
  if (await cache.match(url, BUSQUEDA)) return null; // ya estaba (intento anterior de esta misma versión)
  let motivo = 'sin red';
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const resp = await traer(url, { cache: 'no-cache' });
      if (sirve(resp, url)) {
        await cache.put(url, await sinRedireccion(resp));
        return null;
      }
      motivo = `HTTP ${resp.status}`;
      // El servidor dice que no existe (o manda una página en su lugar): reintentar no ayuda.
      if (resp.status === 404 || resp.status === 410 || pareceOtraCosa(resp, url)) return { ruta, motivo, reintentable: false };
    } catch (error) {
      motivo = error && error.name === 'AbortError' ? 'tiempo agotado' : 'sin red';
    }
    if (intento < intentos) await pausa(400 * 3 ** (intento - 1)); // 0.4 s y 1.2 s
  }
  return { ruta, motivo, reintentable: true };
}

/** fetch con límite de espera para la respuesta (una red que se cuelga no traba la instalación). */
async function traer(url, opciones = {}, ms = 30000) {
  const control = typeof AbortController === 'function' ? new AbortController() : null;
  const reloj = control ? setTimeout(() => control.abort(), ms) : 0;
  try {
    return await fetch(url, control ? { ...opciones, signal: control.signal } : opciones);
  } finally {
    clearTimeout(reloj);
  }
}

/** Solo se guardan respuestas completas y propias: nunca 404, 500, 206 ni una página de error. */
function sirve(resp, url) {
  return Boolean(resp) && resp.status === 200 && resp.type === 'basic' && !pareceOtraCosa(resp, url);
}

/** Una página HTML en lugar de un .js/.css/.json (hostings que responden index.html a todo). */
function pareceOtraCosa(resp, url) {
  const esPagina = url === INDEX || url === RAIZ_APP || /\.html?$/i.test(new URL(url).pathname);
  return !esPagina && (resp.headers.get('content-type') || '').includes('text/html');
}

/** Una respuesta que llegó por redirección no sirve para contestar una navegación: se copia limpia. */
async function sinRedireccion(resp) {
  if (!resp.redirected) return resp;
  return new Response(await resp.blob(), { status: resp.status, statusText: resp.statusText, headers: resp.headers });
}

/* ----------------------------------------------------------------- activate */

self.addEventListener('activate', (evento) => {
  evento.waitUntil(activar());
});

async function activar() {
  memoMeta = null;
  const activa = await nombreCacheActiva();
  const previa = activa && activa !== CACHE ? activa : null;
  // Ventanas que ya estaban abiertas cargaron la versión anterior: siguen con
  // sus archivos hasta que recarguen (la que tocó "Actualizar" recarga enseguida).
  const abiertas = previa ? (await self.clients.matchAll({ type: 'all' })).map((cliente) => cliente.id) : [];
  const anterior = previa && abiertas.length ? previa : null;
  const nombres = await caches.keys();
  await Promise.all(
    nombres
      .filter((n) => (esDeEstaApp(n) || esDeAntes(n)) && n !== CACHE && n !== anterior)
      .map((n) => caches.delete(n)),
  );
  await guardarMeta({ activa: CACHE, anterior, clientes: anterior ? abiertas : [] });
  await self.clients.claim();
}

/** Caché de la versión que está activa ahora (antes de que esta se active). */
async function nombreCacheActiva() {
  const datos = await meta();
  const nombres = await caches.keys();
  if (datos.activa && nombres.includes(datos.activa)) return datos.activa;
  const deAntes = nombres.filter(esDeAntes); // versión anterior a este esquema de nombres
  return deAntes.length === 1 ? deAntes[0] : null;
}

let memoMeta = null;

/** @returns {Promise<{ activa?: string, anterior?: string|null, clientes?: string[] }>} */
function meta() {
  if (!memoMeta) {
    memoMeta = caches
      .match(CLAVE_META, { cacheName: CACHE_META })
      .then((resp) => (resp ? resp.json() : {}))
      .catch(() => ({}));
  }
  return memoMeta;
}

async function guardarMeta(datos) {
  memoMeta = Promise.resolve(datos);
  const cache = await caches.open(CACHE_META);
  await cache.put(CLAVE_META, new Response(JSON.stringify(datos), { headers: { 'Content-Type': 'application/json' } }));
}

/* -------------------------------------------------------------------- fetch */

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET') return;
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;
  const url = new URL(request.url);
  if (url.origin !== BASE.origin || !url.pathname.startsWith(ALCANCE)) return; // no es de la app
  if (url.pathname.includes('/api/')) return; // la IA opcional y cualquier API van directo a la red
  const clave = url.origin + url.pathname;

  if (request.mode === 'navigate') {
    if (clave !== RAIZ_APP && clave !== INDEX) return; // otras páginas (docs/…) no son la app
    // Cualquier vista (?vista=docente, ?alumno=ana) usa el mismo index.html.
    evento.respondWith(responder(evento, INDEX));
    evento.waitUntil(mantenimiento());
    return;
  }
  if (!DE_LA_APP.has(clave)) return; // no está en PRECACHE: directo a la red
  if (url.search) {
    // La página pidió explícitamente lo más nuevo (p. ej. "Actualizar paquete":
    // packs/ecuaciones-1.json?actualizar=…): primero la red, sin guardarlo.
    evento.respondWith(primeroRed(evento, clave));
    evento.waitUntil(buscarVersionNueva());
    return;
  }
  evento.respondWith(responder(evento, clave));
  evento.waitUntil(soltarAnterior());
});

/** Desde la caché de la versión de esa ventana; si no está guardado, de la red (sin guardarlo). */
async function responder(evento, clave) {
  const guardada = await copiaGuardada(evento, clave);
  if (guardada) return guardada;
  try {
    // No se guarda: podría ser de una versión más nueva. Lo que falte se completa
    // en mantenimiento(), y solo si el sw.js publicado sigue siendo esta VERSION.
    return await fetch(evento.request);
  } catch {
    return sinCopia();
  }
}

/** Lo más nuevo del servidor; sin red (o con error) la copia guardada. No se guarda: no se mezclan versiones. */
async function primeroRed(evento, clave) {
  let deRed = null;
  try {
    deRed = await fetch(evento.request);
    if (deRed.ok) return deRed;
  } catch {
    /* sin red: la copia guardada */
  }
  return (await copiaGuardada(evento, clave)) || deRed || sinCopia();
}

/** La copia de la versión con que se cargó esa ventana (o la actual). */
async function copiaGuardada(evento, clave) {
  try {
    const datos = await meta();
    const fijada = datos.anterior && evento.clientId && (datos.clientes || []).includes(evento.clientId);
    return (fijada && (await buscar(datos.anterior, clave))) || (await buscar(CACHE, clave));
  } catch {
    return null; // si la caché falla, se intenta la red
  }
}

function sinCopia() {
  return new Response('Sin conexión y sin copia guardada de este archivo.', {
    status: 504,
    statusText: 'Sin conexión',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

let ultimaBusqueda = 0;

/**
 * Si se publicó otra versión, el navegador la instala en segundo plano y la
 * página muestra "Hay una versión nueva de Tecu" (así "Actualizar paquete"
 * termina en la app nueva completa, con su paquete).
 */
async function buscarVersionNueva() {
  if (Date.now() - ultimaBusqueda < 10000) return;
  ultimaBusqueda = Date.now();
  try {
    await self.registration.update();
  } catch {
    /* sin red: se revisa en la siguiente visita */
  }
}

async function buscar(nombreCache, clave) {
  // caches.match con cacheName no crea la caché si ya se borró (caches.open sí).
  let resp = await caches.match(clave, { ...BUSQUEDA, cacheName: nombreCache });
  if (!resp && clave === INDEX) resp = await caches.match(RAIZ_APP, { ...BUSQUEDA, cacheName: nombreCache });
  return resp && resp.ok ? resp : null;
}

/* ------------------------------------------------------------ mantenimiento */

/** En cada visita: soltar la caché anterior si ya nadie la usa y completar lo que falte. */
function mantenimiento() {
  return Promise.all([soltarAnterior({ ya: true }), completarFaltantes()]);
}

let soltando = null;
let ultimaRevision = 0;

/** Borra la caché de la versión anterior cuando ya no queda ninguna ventana que la use. */
function soltarAnterior({ ya = false } = {}) {
  if (soltando) return soltando;
  if (!ya && Date.now() - ultimaRevision < 1000) return Promise.resolve();
  ultimaRevision = Date.now();
  soltando = (async () => {
    const datos = await meta();
    if (!datos.anterior) return;
    const vivas = await Promise.all((datos.clientes || []).map((id) => self.clients.get(id)));
    if (vivas.some(Boolean)) return;
    await caches.delete(datos.anterior);
    await guardarMeta({ activa: CACHE, anterior: null, clientes: [] });
  })()
    .catch(() => {})
    .finally(() => {
      soltando = null;
    });
  return soltando;
}

let completando = null;
let completa = false;

/** Reintenta lo que no se pudo guardar (p. ej. la primera visita con mala señal). */
function completarFaltantes() {
  if (completa) return Promise.resolve();
  if (!completando) {
    completando = (async () => {
      const cache = await caches.open(CACHE);
      const faltan = await faltantesEn(cache);
      if (!faltan.length) {
        completa = true;
        return;
      }
      if (self.navigator && self.navigator.onLine === false) return;
      // Solo archivos de esta misma versión: si ya se publicó otra, la
      // actualización traerá la app completa (no se mezclan versiones).
      if (!(await mismaVersionPublicada())) return;
      await guardar(cache, faltan, { intentos: 1 });
    })()
      .catch(() => {})
      .finally(() => {
        completando = null;
      });
  }
  return completando;
}

async function faltantesEn(cache) {
  const guardadas = await Promise.all(PRECACHE.map((ruta) => cache.match(absoluta(ruta), BUSQUEDA)));
  return PRECACHE.filter((_, i) => !guardadas[i]);
}

async function mismaVersionPublicada() {
  try {
    const resp = await traer(self.location.href, { cache: 'no-cache' }, 15000);
    if (!resp.ok) return false;
    const encontrada = (await resp.text()).match(PATRON_VERSION);
    return Boolean(encontrada) && encontrada[1] === VERSION;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ message */

self.addEventListener('message', (evento) => {
  const tipo = evento.data && evento.data.tipo;
  if (tipo === 'skipWaiting') {
    // Solo llega cuando la persona tocó "Actualizar" (js/ui/actualizacion.js).
    evento.waitUntil(self.skipWaiting());
  } else if (tipo === 'mantenimiento') {
    evento.waitUntil(mantenimiento());
  } else if (tipo === 'estado-cache') {
    evento.waitUntil(
      soltarAnterior({ ya: true })
        .then(estado)
        .then((respuesta) => contestar(evento, respuesta)),
    );
  }
});

/** Qué tan lista está la app para usarse sin red (pantalla de Descargas). */
async function estado() {
  const cache = await caches.open(CACHE);
  const faltantes = [];
  let archivos = 0;
  let bytes = 0;
  for (const ruta of PRECACHE) {
    if (ruta === './') continue; // es el mismo index.html: no se cuenta dos veces
    const resp = await cache.match(absoluta(ruta), BUSQUEDA);
    if (!resp) {
      faltantes.push(ruta);
      continue;
    }
    archivos += 1;
    bytes += (await resp.arrayBuffer()).byteLength;
  }
  const total = PRECACHE.length - 1;
  return { tipo: 'estado-cache', version: VERSION, archivos, bytes, total, faltantes, completo: faltantes.length === 0 };
}

function contestar(evento, respuesta) {
  if (evento.ports && evento.ports[0]) evento.ports[0].postMessage(respuesta);
  else if (evento.source) evento.source.postMessage(respuesta);
}
