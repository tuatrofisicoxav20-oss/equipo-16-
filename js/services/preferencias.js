/**
 * Preferencias de accesibilidad: tamaño de texto, alto contraste, movimiento y voz.
 *
 * Se guardan en localStorage 'tecu:prefs' y se aplican en <html> según el contrato CSS:
 * html[data-texto="grande"|"muy-grande"], html.alto-contraste, html.reducir-movimiento.
 * El script en línea de index.html lee la misma clave antes de pintar (sin parpadeo).
 *
 * Avisos: en el mismo documento con un evento 'tecu:prefs' en `window`; en otras
 * pestañas e iframes con el evento 'storage'. Si localStorage falla, se usan los
 * valores por defecto y nada truena.
 */

const CLAVE = 'tecu:prefs';
const EVENTO_LOCAL = 'tecu:prefs';
const TEXTOS = ['normal', 'grande', 'muy-grande'];
const MOVIMIENTOS = ['auto', 'reducido'];

/**
 * @typedef {{ texto: 'normal'|'grande'|'muy-grande', contraste: boolean,
 *   movimiento: 'auto'|'reducido', voz: boolean }} Preferencias
 */

/** Valores iniciales (congelado: cópialo con { ...PREFS_POR_DEFECTO }). */
export const PREFS_POR_DEFECTO = Object.freeze({ texto: 'normal', contraste: false, movimiento: 'auto', voz: false });

const VALIDOS = {
  texto: (v) => TEXTOS.includes(v),
  contraste: (v) => typeof v === 'boolean',
  movimiento: (v) => MOVIMIENTOS.includes(v),
  voz: (v) => typeof v === 'boolean',
};

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function localStorageSeguro() {
  try {
    const s = globalThis.localStorage;
    return s && typeof s.getItem === 'function' ? s : null;
  } catch {
    return null;
  }
}

const ventanaDelNavegador = () => (typeof window === 'undefined' ? null : window);
const resolverAlmacen = (almacenamiento) => (almacenamiento === undefined ? localStorageSeguro() : almacenamiento);

function parsear(texto) {
  try {
    return texto == null ? null : JSON.parse(texto);
  } catch {
    return null;
  }
}

/**
 * Mezcla `prefs` sobre `base`; cada valor inválido se queda con el de `base`
 * (o el de fábrica). Conserva claves extra para no perder ajustes nuevos.
 */
function normalizar(prefs, base = PREFS_POR_DEFECTO) {
  const limpio = { ...base, ...(esObjeto(prefs) ? prefs : {}) };
  for (const [clave, valido] of Object.entries(VALIDOS)) {
    if (!valido(limpio[clave])) limpio[clave] = valido(base[clave]) ? base[clave] : PREFS_POR_DEFECTO[clave];
  }
  return limpio;
}

function eventoCon(tipo, detail) {
  if (typeof CustomEvent === 'function') return new CustomEvent(tipo, { detail });
  const evento = new Event(tipo);
  evento.detail = detail;
  return evento;
}

/** Llama `fn(prefs)` con UN solo argumento (main.js pasa aplicarPreferencias directo). */
function entregar(fn, prefs) {
  try {
    fn(prefs);
  } catch (error) {
    console.error('[tecu]', error);
  }
}

/**
 * Lee 'tecu:prefs'. Si no hay, está dañada o el navegador bloquea el almacenamiento,
 * devuelve los valores por defecto.
 * @param {{ almacenamiento?: Storage|null }} [opciones]
 * @returns {Preferencias}
 */
export function leerPreferencias({ almacenamiento } = {}) {
  const almacen = resolverAlmacen(almacenamiento);
  let guardadas = null;
  try {
    guardadas = parsear(almacen ? almacen.getItem(CLAVE) : null);
  } catch {
    guardadas = null;
  }
  return normalizar(guardadas);
}

/**
 * Aplica las preferencias en <html> (contrato CSS). 'normal' quita data-texto.
 * @param {Preferencias} prefs
 * @param {Document} [doc=document]
 */
export function aplicarPreferencias(prefs, doc = globalThis.document) {
  const html = doc?.documentElement;
  if (!html) return;
  const p = normalizar(prefs);
  if (p.texto === 'normal') html.removeAttribute('data-texto');
  else html.setAttribute('data-texto', p.texto);
  html.classList.toggle('alto-contraste', p.contraste);
  html.classList.toggle('reducir-movimiento', p.movimiento === 'reducido');
}

/**
 * Mezcla los cambios con lo guardado, los guarda, los aplica y avisa a esta
 * página (alCambiarPreferencias) y a las otras pestañas/iframes (evento 'storage').
 * Los valores inválidos se ignoran.
 * @param {Partial<Preferencias>} parciales
 * @param {{ almacenamiento?: Storage|null, doc?: Document, ventana?: EventTarget|null }} [opciones]
 * @returns {Preferencias} las preferencias completas ya aplicadas
 */
export function guardarPreferencias(parciales, { almacenamiento, doc, ventana } = {}) {
  const almacen = resolverAlmacen(almacenamiento);
  const prefs = normalizar(parciales, leerPreferencias({ almacenamiento: almacen }));
  try {
    almacen?.setItem(CLAVE, JSON.stringify(prefs));
  } catch (error) {
    console.warn('[tecu] No se pudieron guardar las preferencias:', error?.name || error);
  }
  aplicarPreferencias(prefs, doc);
  const win = ventana === undefined ? ventanaDelNavegador() : ventana;
  win?.dispatchEvent(eventoCon(EVENTO_LOCAL, prefs));
  return prefs;
}

/**
 * Escucha cambios de preferencias hechos en esta página o en otras pestañas/iframes.
 * Llama `fn(prefs)` (un solo argumento) con las preferencias completas.
 * @param {(prefs: Preferencias) => void} fn
 * @param {{ ventana?: EventTarget|null }} [opciones] por defecto `window`
 * @returns {() => void} deja de escuchar
 */
export function alCambiarPreferencias(fn, { ventana } = {}) {
  const win = ventana === undefined ? ventanaDelNavegador() : ventana;
  if (!win || typeof fn !== 'function') return () => {};
  const alLocal = (evento) => entregar(fn, normalizar(evento.detail));
  const alStorage = (evento) => {
    if (evento.key === CLAVE || evento.key === null) entregar(fn, normalizar(parsear(evento.newValue)));
  };
  win.addEventListener(EVENTO_LOCAL, alLocal);
  win.addEventListener('storage', alStorage);
  return () => {
    win.removeEventListener(EVENTO_LOCAL, alLocal);
    win.removeEventListener('storage', alStorage);
  };
}
