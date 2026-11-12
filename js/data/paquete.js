/**
 * Carga del paquete de contenido (JSON) con su peso REAL en bytes, para poder
 * decir con honestidad cuánto ocupa en el celular ("26.8 KB").
 *
 * El resultado se guarda en memoria por URL: la segunda llamada no vuelve a
 * descargar (y dos llamadas al mismo tiempo comparten la misma descarga).
 * Sin internet, la respuesta la da el service worker desde su caché.
 */

/** 'packs/ecuaciones-1.json' de la raíz de la app, sin importar en qué ruta esté la página. */
function urlPorDefecto() {
  try {
    return new URL('../../packs/ecuaciones-1.json', import.meta.url).href;
  } catch {
    return 'packs/ecuaciones-1.json';
  }
}

const URL_POR_DEFECTO = urlPorDefecto();

/** Única excepción a "sin estado global": url absoluta → Promise<{ pack, bytes, kb }>. */
const cache = new Map();

/** Resuelve como fetch() (contra la página) para que la caché no descargue dos veces. */
function absoluta(url) {
  try {
    return new URL(String(url), globalThis.document?.baseURI ?? globalThis.location?.href).href;
  } catch {
    return String(url);
  }
}

function crearFormato() {
  try {
    return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  } catch {
    return { format: (n) => n.toFixed(1) };
  }
}

const FORMATO_KB = crearFormato();

/**
 * Peso en KB (1 KB = 1024 bytes) con un decimal, en formato es-MX.
 * @param {number} bytes
 * @returns {string} p. ej. '14.2 KB' o '1,234.5 KB'
 */
export function formatearKB(bytes) {
  const n = Number(bytes);
  const kb = Number.isFinite(n) && n > 0 ? n / 1024 : 0;
  return `${FORMATO_KB.format(kb)} KB`;
}

async function descargar(url, traer) {
  const respuesta = await traer(url);
  if (!respuesta || !respuesta.ok) {
    throw new Error(`No se pudo cargar el paquete ${url} (HTTP ${respuesta?.status ?? '?'})`);
  }
  const buffer = await respuesta.arrayBuffer();
  const bytes = buffer.byteLength;
  const pack = JSON.parse(new TextDecoder('utf-8').decode(buffer));
  return { pack, bytes, kb: Math.round(bytes / 102.4) / 10 };
}

/**
 * Descarga (o toma de la caché en memoria) un paquete de contenido.
 * `bytes` son los bytes reales de la respuesta; `kb` = bytes / 1024 con un decimal.
 * Si falla, la promesa se rechaza y no queda en caché (se puede reintentar).
 * No modifiques `pack`: es el mismo objeto para todos.
 * @param {string} [url='packs/ecuaciones-1.json'] relativa a la página (como fetch);
 *   la de por defecto siempre apunta a la carpeta packs/ de la app
 * @param {{ fetch?: (url: string) => Promise<Response> }} [opciones] para pruebas
 * @returns {Promise<{ pack: object, bytes: number, kb: number }>}
 */
export function cargarPaquete(url = URL_POR_DEFECTO, { fetch: traer = (u) => globalThis.fetch(u) } = {}) {
  const clave = absoluta(url);
  if (!cache.has(clave)) {
    const promesa = descargar(clave, traer);
    cache.set(clave, promesa);
    promesa.catch(() => cache.delete(clave));
  }
  return cache.get(clave);
}
