/**
 * Service worker (sw.js).
 *
 * 1. La app debe funcionar en modo avión: todo archivo que use la app tiene que
 *    estar en PRECACHE. Falla si alguien agrega un archivo y olvida sw.js.
 * 2. VERSION debe cambiar cuando cambia la app: si no, los celulares que ya
 *    tienen Tecu nunca reciben los cambios. VERSION termina con la huella del
 *    contenido de PRECACHE; esta prueba dice el valor correcto.
 * 3. Comportamiento: se corre sw.js en un entorno falso de service worker
 *    (cachés, red y ventanas simuladas) para revisar instalación, actualización,
 *    respuestas y mensajes sin abrir un navegador. La prueba con navegador real
 *    está en tests/e2e/actualizacion.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const sw = readFileSync(join(RAIZ, 'sw.js'), 'utf8');
const bloque = sw.match(/const PRECACHE = \[([\s\S]*?)\];/);
const PRECACHE = bloque ? [...bloque[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
const VERSION = (sw.match(/const VERSION = '([^']+)';/) || [])[1] || '';

function archivos(dir, filtro) {
  const ruta = join(RAIZ, dir);
  if (!existsSync(ruta)) return [];
  return readdirSync(ruta).flatMap((nombre) => {
    const completo = join(ruta, nombre);
    if (statSync(completo).isDirectory()) return archivos(relative(RAIZ, completo), filtro);
    return filtro(nombre) ? [relative(RAIZ, completo).split('\\').join('/')] : [];
  });
}

const DE_LA_APP = [
  'index.html',
  'manifest.webmanifest',
  'styles.css',
  ...archivos('css', (n) => n.endsWith('.css')),
  ...archivos('js', (n) => n.endsWith('.js')),
  ...archivos('packs', (n) => n.endsWith('.json')),
  ...archivos('fonts', (n) => n.endsWith('.woff2')),
  ...archivos('icons', (n) => /\.(png|svg)$/.test(n)),
];

test('PRECACHE se puede leer de sw.js', () => {
  assert.ok(PRECACHE.length > 20, 'no encontré la lista PRECACHE en sw.js');
  assert.ok(PRECACHE.includes('./') && PRECACHE.includes('index.html'));
  assert.equal(new Set(PRECACHE).size, PRECACHE.length, 'hay rutas repetidas en PRECACHE');
  assert.deepEqual(PRECACHE.filter((r) => r.startsWith('/') || r.includes('://')), [], 'PRECACHE usa rutas relativas (GitHub Pages: subcarpeta)');
});

test('todo archivo de la app está en PRECACHE (si no, se rompe el modo avión)', () => {
  const faltan = DE_LA_APP.filter((f) => !PRECACHE.includes(f));
  assert.deepEqual(faltan, [], `Agrega a PRECACHE en sw.js: ${faltan.join(', ')}`);
});

/**
 * Archivos que otro agente está por crear: se registran en PRECACHE desde
 * antes para no olvidarlos. Mientras no existan van aquí; quítalos en cuanto
 * existan. Esta lista debe quedar VACÍA al terminar el proyecto.
 */
const EN_CONSTRUCCION = new Set([]);

test('cada entrada de PRECACHE existe en el proyecto', (t) => {
  const inexistentes = PRECACHE.filter((f) => f !== './' && !existsSync(join(RAIZ, f)));
  const inesperadas = inexistentes.filter((f) => !EN_CONSTRUCCION.has(f));
  assert.deepEqual(inesperadas, [], `En PRECACHE pero no existen: ${inesperadas.join(', ')}`);
  if (inexistentes.length) t.diagnostic(`Aún en construcción: ${inexistentes.join(', ')}`);
  const yaExisten = [...EN_CONSTRUCCION].filter((f) => existsSync(join(RAIZ, f)));
  if (yaExisten.length) t.diagnostic(`Ya existen, quítalos de EN_CONSTRUCCION: ${yaExisten.join(', ')}`);
});

test('el manifiesto apunta a íconos que existen', () => {
  const manifiesto = JSON.parse(readFileSync(join(RAIZ, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifiesto.lang, 'es-MX');
  for (const icono of manifiesto.icons) assert.ok(existsSync(join(RAIZ, icono.src)), icono.src);
  assert.ok(manifiesto.icons.some((i) => i.purpose === 'maskable'));
});

/* ------------------------------------------------------- VERSION ↔ contenido */

const TEXTO = /\.(js|css|html|json|webmanifest|svg|txt|md)$/i;

/**
 * Huella (sha-256, 8 caracteres) del contenido de PRECACHE: rutas en orden
 * alfabético y el contenido de cada archivo (los de texto con fin de línea \n,
 * para que dé igual en Windows). './' es el mismo index.html.
 */
function huellaDeContenido(raiz = RAIZ, lista = PRECACHE) {
  const hash = createHash('sha256');
  for (const ruta of [...new Set(lista.filter((r) => r !== './'))].sort()) {
    const archivo = join(raiz, ruta);
    hash.update(`${ruta}\0`);
    if (!existsSync(archivo)) hash.update('(no existe)');
    else if (TEXTO.test(ruta)) hash.update(readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n'));
    else hash.update(readFileSync(archivo));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 8);
}

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test('VERSION corresponde al contenido de PRECACHE (si cambias archivos de la app, cambia VERSION)', () => {
  const huella = huellaDeContenido();
  const sugerida = `tecu-${hoy()}-${huella}`;
  assert.match(VERSION, /^tecu-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/, `VERSION debe verse así (fecha y huella): '${sugerida}'`);
  assert.equal(
    VERSION.slice(-8),
    huella,
    [
      `Cambiaron archivos de la app y VERSION sigue en '${VERSION}'.`,
      'Sin cambiar VERSION, los celulares que ya tienen Tecu nunca reciben esos cambios.',
      `Para publicar, en sw.js pon:  const VERSION = '${sugerida}';`,
      '(Lo cambia quien publica: el dueño de sw.js o el integrador. Mientras desarrollas, esta prueba',
      'falla en cuanto cambias un archivo de la app; es el recordatorio, no un error tuyo.)',
    ].join('\n'),
  );
});

test('la huella cambia si cambia un archivo, si se agrega uno o si aparece uno que no existía', () => {
  const base = huellaDeContenido(RAIZ, ['index.html', 'styles.css']);
  assert.notEqual(huellaDeContenido(RAIZ, ['index.html', 'styles.css', 'js/main.js']), base);
  assert.notEqual(huellaDeContenido(RAIZ, ['index.html', 'styles.css', 'js/no-existe.js']), base);
  assert.equal(huellaDeContenido(RAIZ, ['styles.css', 'index.html', './']), base, 'el orden y ./ no importan');
});

/* ------------------------------------------- entorno falso de service worker */

const ORIGEN = 'https://tecu.example';
const CARPETA = '/equipo-16-/';
const APP = `${ORIGEN}${CARPETA}`;
const TIPOS = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  webmanifest: 'application/manifest+json; charset=utf-8',
  png: 'image/png',
  svg: 'image/svg+xml',
  woff2: 'font/woff2',
};
const V1 = 'tecu-2026-01-01-11111111';
const V2 = 'tecu-2026-02-02-22222222';
const V3 = 'tecu-2026-03-03-33333333';
const cacheDe = (version, carpeta = CARPETA) => `tecu-app-${version}@${carpeta}`;
const codigoDe = (version) => sw.replace(/const VERSION = '[^']+';/, `const VERSION = '${version}';`);

/** Respuesta de red como la da el navegador para el mismo origen (type 'basic'). */
function respuesta(cuerpo, { status = 200, tipo = 'text/plain', redirigida = false } = {}) {
  const r = new Response(cuerpo, { status, headers: { 'content-type': tipo } });
  Object.defineProperty(r, 'type', { value: 'basic' });
  if (redirigida) Object.defineProperty(r, 'redirected', { value: true });
  return r;
}

/** CacheStorage en memoria con lo que usa sw.js (caches.match con cacheName no crea la caché). */
function crearCaches() {
  const cajas = new Map();
  const clave = (pedido, sinBusqueda = false) => {
    const url = new URL(typeof pedido === 'string' ? pedido : pedido.url);
    if (sinBusqueda) url.search = '';
    return url.href;
  };
  const leer = (g) => new Response(g.cuerpo.slice(0), { status: g.status, headers: g.encabezados });
  const caja = (entradas) => ({
    async match(pedido, opciones = {}) {
      const buscada = clave(pedido, opciones.ignoreSearch);
      for (const [k, v] of entradas) if (clave(k, opciones.ignoreSearch) === buscada) return leer(v);
      return undefined;
    },
    async put(pedido, resp) {
      if (resp.status === 206) throw new TypeError('una respuesta 206 no se puede guardar');
      const cuerpo = await resp.arrayBuffer();
      entradas.set(clave(pedido), { cuerpo, status: resp.status, encabezados: [...resp.headers], redirigida: resp.redirected });
    },
    async keys() {
      return [...entradas.keys()].map((url) => ({ url }));
    },
    async delete(pedido) {
      return entradas.delete(clave(pedido));
    },
  });
  return {
    cajas,
    async open(nombre) {
      if (!cajas.has(nombre)) cajas.set(nombre, new Map());
      return caja(cajas.get(nombre));
    },
    async keys() {
      return [...cajas.keys()];
    },
    async has(nombre) {
      return cajas.has(nombre);
    },
    async delete(nombre) {
      return cajas.delete(nombre);
    },
    async match(pedido, opciones = {}) {
      for (const nombre of opciones.cacheName ? [opciones.cacheName] : [...cajas.keys()]) {
        if (!cajas.has(nombre)) continue;
        const r = await caja(cajas.get(nombre)).match(pedido, opciones);
        if (r) return r;
      }
      return undefined;
    },
    /** Texto guardado de una ruta de la app en una caché (o null). */
    async texto(nombre, ruta) {
      const r = await this.match(new URL(ruta, APP).href, { cacheName: nombre });
      return r ? r.text() : null;
    },
  };
}

/**
 * "Servidor": cada archivo de PRECACHE con un contenido que dice su versión.
 * Cambios: { ruta: { status, tipo, cuerpo, red: true, redirigida: true } }.
 */
function servidorDe(version, cambios = {}) {
  const archivos = { 'sw.js': { cuerpo: codigoDe(version), tipo: TIPOS.js } };
  for (const ruta of PRECACHE) {
    if (ruta === './') continue;
    archivos[ruta] = { cuerpo: `${ruta} · ${version}`, tipo: TIPOS[ruta.split('.').pop()] || 'application/octet-stream' };
  }
  return Object.assign(archivos, cambios);
}

/**
 * Carga sw.js (con otra VERSION) en un contexto aislado, como lo haría el navegador.
 * @returns entorno con despachar(tipo, datos), pedidos, estado (servidor, enLinea, clientes…)
 */
function cargarSW({ version = V1, caches = crearCaches(), activo = false, servidor = servidorDe(version), clientes = [] } = {}) {
  const oyentes = {};
  const pedidos = [];
  const estado = { servidor, enLinea: true, clientes, saltoEspera: false, reclamado: false, actualizaciones: 0 };
  const ruta = (url) => (url.pathname.startsWith(CARPETA) ? url.pathname.slice(CARPETA.length) || 'index.html' : null);
  const fetchFalso = async (entrada, opciones = {}) => {
    const url = new URL(typeof entrada === 'string' ? entrada : entrada.url);
    pedidos.push({ ruta: ruta(url) ?? url.href, busqueda: url.search, cache: opciones.cache || entrada.cache || 'default' });
    if (!estado.enLinea) throw new TypeError('Failed to fetch');
    const def = url.origin === ORIGEN && ruta(url) ? estado.servidor[ruta(url)] : null;
    if (!def) return respuesta('<h1>404</h1>', { status: 404, tipo: TIPOS.html });
    if (def.red) throw new TypeError('Failed to fetch');
    return respuesta(def.cuerpo ?? 'Error', { status: def.status ?? 200, tipo: def.tipo, redirigida: def.redirigida });
  };
  const self = {
    location: new URL('sw.js', APP),
    registration: {
      active: activo ? { state: 'activated' } : null,
      scope: APP,
      update: async () => {
        estado.actualizaciones++;
      },
    },
    navigator: {
      get onLine() {
        return estado.enLinea;
      },
    },
    clients: {
      matchAll: async () => estado.clientes.map((id) => ({ id })),
      get: async (id) => (estado.clientes.includes(id) ? { id } : undefined),
      claim: async () => {
        estado.reclamado = true;
      },
    },
    addEventListener: (tipo, fn) => {
      oyentes[tipo] = fn;
    },
    skipWaiting: async () => {
      estado.saltoEspera = true;
    },
  };
  const contexto = vm.createContext({
    self,
    caches,
    fetch: fetchFalso,
    Request,
    Response,
    Headers,
    URL,
    AbortController,
    // Las esperas (reintentos y límites de tiempo) se acortan para que la prueba sea rápida.
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 5)),
    clearTimeout,
    console,
  });
  vm.runInContext(codigoDe(version), contexto, { filename: 'sw.js' });

  /** Despacha un evento y espera sus waitUntil (rechaza si alguno falla, como install). */
  async function despachar(tipo, datos = {}) {
    const pendientes = [];
    let respondio = null;
    oyentes[tipo]({
      ...datos,
      waitUntil: (p) => pendientes.push(Promise.resolve(p)),
      respondWith: (p) => {
        respondio = Promise.resolve(p);
      },
    });
    const resp = respondio ? await respondio : undefined;
    await Promise.all(pendientes);
    return resp;
  }
  const pedir = (url, { modo = 'cors', metodo = 'GET', clientId = '' } = {}) =>
    despachar('fetch', { request: { url: new URL(url, APP).href, method: metodo, mode: modo, cache: 'default' }, clientId });
  const mensaje = async (data) => {
    let recibido = null;
    // structuredClone: como postMessage, y deja el objeto en este contexto (no en el del vm).
    await despachar('message', { data, ports: [{ postMessage: (m) => (recibido = structuredClone(m)) }] });
    return recibido;
  };
  return { despachar, pedir, mensaje, pedidos, estado, caches };
}

/** Instala y activa una versión (como la primera visita o tras tocar "Actualizar"). */
async function instalarYActivar(opciones) {
  const entorno = cargarSW(opciones);
  await entorno.despachar('install');
  await entorno.despachar('activate');
  return entorno;
}

const urlsDeLaApp = PRECACHE.map((r) => new URL(r, APP).href).sort();

/* ------------------------------------------------------------- instalación */

test('primera instalación: guarda todo PRECACHE dentro de la carpeta de la app y pregunta al servidor (no-cache)', async () => {
  const sw1 = cargarSW();
  await sw1.despachar('install');
  const guardadas = (await (await sw1.caches.open(cacheDe(V1))).keys()).map((r) => r.url).sort();
  assert.deepEqual(guardadas, urlsDeLaApp);
  assert.ok(sw1.pedidos.length >= PRECACHE.length && sw1.pedidos.every((p) => p.cache === 'no-cache'), 'cada descarga usa cache: no-cache');
  assert.equal(sw1.estado.saltoEspera, false, 'install nunca se salta la espera por su cuenta');
});

test('primera instalación con mala señal: se instala igual, no guarda errores y reporta faltantes', async () => {
  const sw1 = cargarSW({
    servidor: servidorDe(V1, {
      'packs/contexto.json': { status: 500 },
      'css/tecu.css': { red: true },
      'js/ui/cola.js': { status: 404 },
      'js/ui/libre.js': { cuerpo: '<!doctype html><title>Tecu</title>', tipo: TIPOS.html }, // hosting que responde la página a todo
    }),
  });
  await sw1.despachar('install');
  await sw1.despachar('activate');
  const malas = ['css/tecu.css', 'js/ui/cola.js', 'js/ui/libre.js', 'packs/contexto.json'];
  for (const ruta of malas) assert.equal(await sw1.caches.texto(cacheDe(V1), ruta), null, `no debe guardar ${ruta}`);
  const intentos = (ruta) => sw1.pedidos.filter((p) => p.ruta === ruta).length;
  assert.equal(intentos('packs/contexto.json'), 3, 'un error del servidor se reintenta');
  assert.equal(intentos('css/tecu.css'), 3, 'sin red se reintenta');
  assert.equal(intentos('js/ui/cola.js'), 1, 'un 404 no se reintenta');

  const estado = await sw1.mensaje({ tipo: 'estado-cache' });
  assert.equal(estado.version, V1);
  assert.equal(estado.total, PRECACHE.length - 1);
  assert.equal(estado.archivos, estado.total - malas.length);
  assert.deepEqual([...estado.faltantes].sort(), malas);
  assert.equal(estado.completo, false);
});

test('actualización: si falla la red no se instala (la actual sigue completa); al reintentar solo baja lo que faltó', async () => {
  const caches = crearCaches();
  await instalarYActivar({ caches });
  const v2 = cargarSW({ version: V2, caches, activo: true, servidor: servidorDe(V2, { 'css/tecu.css': { red: true } }) });
  await assert.rejects(v2.despachar('install'), /css\/tecu\.css/);
  assert.equal((await (await caches.open(cacheDe(V1))).keys()).length, PRECACHE.length, 'la versión actual sigue completa');
  assert.equal(await caches.texto(cacheDe(V1), 'js/ui/dom.js'), `js/ui/dom.js · ${V1}`);

  // Siguiente visita: el navegador vuelve a instalar la misma versión nueva.
  const otraVez = cargarSW({ version: V2, caches, activo: true, servidor: servidorDe(V2) });
  await otraVez.despachar('install');
  assert.deepEqual(
    otraVez.pedidos.map((p) => p.ruta),
    ['css/tecu.css'],
    'lo ya guardado de esta versión no se vuelve a descargar',
  );
});

test('actualización: tolera un 404 de algo que tampoco existía antes, no de algo que la versión actual sí tiene', async () => {
  const caches = crearCaches();
  await instalarYActivar({ caches, servidor: servidorDe(V1, { 'js/ui/cola.js': { status: 404 } }) });
  const v2 = cargarSW({ version: V2, caches, activo: true, servidor: servidorDe(V2, { 'js/ui/cola.js': { status: 404 } }) });
  await v2.despachar('install'); // "en construcción": tampoco estaba en la versión actual
  const v3 = cargarSW({ version: V3, caches, activo: true, servidor: servidorDe(V3, { 'js/ui/dom.js': { status: 404 } }) });
  await assert.rejects(v3.despachar('install'), /js\/ui\/dom\.js/);
});

test('una respuesta que llegó por redirección se guarda limpia (sirve para navegar en Safari y Chrome)', async () => {
  const caches = crearCaches();
  await instalarYActivar({ caches, servidor: servidorDe(V1, { 'index.html': { cuerpo: '<!doctype html>', tipo: TIPOS.html, redirigida: true } }) });
  const guardada = caches.cajas.get(cacheDe(V1)).get(`${APP}index.html`);
  assert.equal(guardada.redirigida, false);
});

/* ------------------------------------------------------------------- fetch */

test('fetch: la app sale de la caché aunque no haya red; ?vista= y ?alumno= reciben index.html', async () => {
  const sw1 = await instalarYActivar();
  sw1.estado.enLinea = false;
  assert.equal(await (await sw1.pedir('js/ui/dom.js')).text(), `js/ui/dom.js · ${V1}`);
  assert.equal(await (await sw1.pedir('./?vista=docente', { modo: 'navigate' })).text(), `index.html · ${V1}`);
  assert.equal(await (await sw1.pedir('index.html?alumno=ana&embebido=1', { modo: 'navigate' })).text(), `index.html · ${V1}`);
  assert.equal(sw1.pedidos.filter((p) => p.ruta !== 'sw.js' && p.cache !== 'no-cache').length, 0, 'ni un pedido a la red');
});

test('fetch: con red tampoco va a la red por lo guardado (no se mezclan versiones en una sesión)', async () => {
  const sw1 = await instalarYActivar();
  sw1.estado.servidor = servidorDe(V2); // ya se publicó otra versión
  const antes = sw1.pedidos.length;
  assert.equal(await (await sw1.pedir('js/ui/cuadernillo.js')).text(), `js/ui/cuadernillo.js · ${V1}`);
  assert.equal(await (await sw1.pedir('./', { modo: 'navigate' })).text(), `index.html · ${V1}`);
  assert.equal(await sw1.caches.texto(cacheDe(V1), 'js/ui/cuadernillo.js'), `js/ui/cuadernillo.js · ${V1}`, 'la caché no se reescribe');
  assert.ok(sw1.pedidos.slice(antes).every((p) => p.ruta === 'sw.js'), 'solo se revisa sw.js (para completar faltantes)');
});

test('fetch: /api/*, POST, otras páginas, otros orígenes y otras carpetas van directo a la red', async () => {
  const sw1 = await instalarYActivar();
  assert.equal(await sw1.pedir('api/salud'), undefined);
  assert.equal(await sw1.pedir('js/ui/dom.js', { metodo: 'POST' }), undefined);
  assert.equal(await sw1.pedir('docs/estilo.html', { modo: 'navigate' }), undefined);
  assert.equal(await sw1.pedir('README.md'), undefined);
  assert.equal(await sw1.pedir('https://otro.example/equipo-16-/js/ui/dom.js'), undefined);
  assert.equal(await sw1.pedir(`${ORIGEN}/otra-app/js/ui/dom.js`), undefined);
});

test('fetch: lo que falta sin red responde 504 claro; con ?algo= va primero a la red y busca versión nueva', async () => {
  const sw1 = await instalarYActivar({ servidor: servidorDe(V1, { 'packs/contexto.json': { status: 500 } }) });
  sw1.estado.enLinea = false;
  const sinCopia = await sw1.pedir('packs/contexto.json');
  assert.equal(sinCopia.status, 504);
  assert.match(await sinCopia.text(), /Sin conexión/);

  sw1.estado.enLinea = true;
  sw1.estado.servidor = servidorDe(V2);
  const fresca = await sw1.pedir('packs/ecuaciones-1.json?actualizar=123');
  assert.equal(await fresca.text(), `packs/ecuaciones-1.json · ${V2}`, '"Actualizar paquete" ve lo publicado');
  assert.equal(await sw1.caches.texto(cacheDe(V1), 'packs/ecuaciones-1.json'), `packs/ecuaciones-1.json · ${V1}`, 'sin guardarlo');
  assert.equal(sw1.estado.actualizaciones, 1, 'y le pide al navegador buscar la versión nueva');
  sw1.estado.enLinea = false;
  assert.equal(await (await sw1.pedir('packs/ecuaciones-1.json?actualizar=456')).text(), `packs/ecuaciones-1.json · ${V1}`, 'sin red: la guardada');
});

/* ---------------------------------------------------- activate y versiones */

test('activate: borra versiones viejas de esta carpeta, respeta otras carpetas del dominio y toma el control', async () => {
  const caches = crearCaches();
  for (const nombre of [cacheDe(V1, '/otra-app/'), 'tecu-app-tecu-2026-11-12-a', 'algo-de-otra-app']) await caches.open(nombre);
  await instalarYActivar({ caches });
  const v2 = await instalarYActivar({ version: V2, caches, activo: true, servidor: servidorDe(V2) });
  const nombres = await caches.keys();
  assert.ok(nombres.includes(cacheDe(V2)));
  assert.ok(!nombres.includes(cacheDe(V1)), 'la versión vieja de esta carpeta se borra');
  assert.ok(!nombres.includes('tecu-app-tecu-2026-11-12-a'), 'la caché del esquema anterior se borra');
  assert.ok(nombres.includes(cacheDe(V1, '/otra-app/')) && nombres.includes('algo-de-otra-app'), 'lo de otra carpeta no se toca');
  assert.equal(v2.estado.reclamado, true);
});

test('una ventana abierta con la versión anterior sigue con sus archivos hasta recargar; luego esa caché se borra', async () => {
  const caches = crearCaches();
  await instalarYActivar({ caches });
  // La persona tocó "Actualizar" en una ventana; otra ventana (vieja) sigue abierta.
  const v2 = await instalarYActivar({ version: V2, caches, activo: true, servidor: servidorDe(V2), clientes: ['vieja', 'la-que-actualizo'] });
  assert.equal(await (await v2.pedir('js/ui/cuadernillo.js', { clientId: 'vieja' })).text(), `js/ui/cuadernillo.js · ${V1}`);
  assert.equal(await (await v2.pedir('js/ui/cuadernillo.js', { clientId: 'nueva' })).text(), `js/ui/cuadernillo.js · ${V2}`);
  assert.equal(await (await v2.pedir('./?alumno=ana', { modo: 'navigate' })).text(), `index.html · ${V2}`, 'al recargar: versión nueva');

  v2.estado.clientes = ['nueva']; // las dos ventanas viejas ya recargaron
  await v2.mensaje({ tipo: 'mantenimiento' });
  assert.ok(!(await caches.keys()).includes(cacheDe(V1)), 'nadie usa la versión anterior: se borra');
  assert.equal(await (await v2.pedir('js/ui/cuadernillo.js', { clientId: 'vieja' })).text(), `js/ui/cuadernillo.js · ${V2}`);
});

test('el SW nuevo solo se salta la espera cuando la página se lo pide (botón "Actualizar")', async () => {
  const caches = crearCaches();
  await instalarYActivar({ caches });
  const v2 = cargarSW({ version: V2, caches, activo: true, servidor: servidorDe(V2) });
  await v2.despachar('install');
  assert.equal(v2.estado.saltoEspera, false);
  await v2.despachar('message', { data: { tipo: 'skipWaiting' } });
  assert.equal(v2.estado.saltoEspera, true);
});

/* --------------------------------------------------------------- mensajes */

test('estado-cache: versión, archivos, bytes, total, faltantes y completo', async () => {
  const sw1 = await instalarYActivar();
  const estado = await sw1.mensaje({ tipo: 'estado-cache' });
  const esperados = PRECACHE.filter((r) => r !== './');
  const bytes = esperados.reduce((suma, ruta) => suma + Buffer.byteLength(`${ruta} · ${V1}`), 0);
  assert.deepEqual(estado, { tipo: 'estado-cache', version: V1, archivos: esperados.length, bytes, total: esperados.length, faltantes: [], completo: true });
});

test('mantenimiento completa lo que faltó, solo si el sw.js publicado sigue siendo la misma VERSION', async () => {
  const sw1 = await instalarYActivar({ servidor: servidorDe(V1, { 'packs/contexto.json': { status: 500 } }) });
  // Ya se publicó otra versión: no se mezcla su archivo con esta (llegará completa con la actualización).
  sw1.estado.servidor = servidorDe(V2);
  await sw1.mensaje({ tipo: 'mantenimiento' });
  assert.equal(await sw1.caches.texto(cacheDe(V1), 'packs/contexto.json'), null);
  // El servidor sigue en esta versión: se completa.
  sw1.estado.servidor = servidorDe(V1);
  await sw1.pedir('./', { modo: 'navigate' }); // cada visita intenta completar
  assert.equal(await sw1.caches.texto(cacheDe(V1), 'packs/contexto.json'), `packs/contexto.json · ${V1}`);
  assert.equal((await sw1.mensaje({ tipo: 'estado-cache' })).completo, true);
});
