/**
 * Preferencias de la persona: accesibilidad (colores, tamaño de texto, espaciado,
 * movimiento, navegación simplificada, lectura en voz alta), uso de datos (ahorro,
 * solo Wi-Fi) y vista de la demostración (dispositivo).
 *
 * Modelo (docs/UNIFICACION.md → «Preferencias unificadas»):
 *   tema         sistema | claro | oscuro | contraste
 *   tamano       md | lg | xl | xxl
 *   espaciado    boolean (espaciado de texto amplio, WCAG 1.4.12)
 *   movimiento   auto | reducido
 *   simple       boolean (navegación simplificada)
 *   voz          boolean (botones «Escuchar» y «Leer página»)
 *   ahorro       boolean   ·   soloWifi  boolean   ·   dispositivo  auto | movil | escritorio
 *
 * Compatibilidad con el modelo anterior ({ texto, contraste, movimiento, voz }):
 * - Al leer se agregan dos campos DERIVADOS para el código que ya existía:
 *   `texto` (normal | grande | muy-grande, sale de `tamano`) y `contraste`
 *   (boolean, sale de `tema`). Cambiarlos en el objeto no hace nada: se cambian
 *   con guardarPreferencias(), que acepta los dos vocabularios
 *   ({ texto: 'grande' } = { tamano: 'lg' }; { contraste: true } = { tema: 'contraste' }).
 * - Lo guardado con el modelo anterior se interpreta al leer (no hace falta migrar a mano).
 * - Se guardan también los dos derivados, para que una versión anterior de la app
 *   que siga abierta en otra pestaña (o el script en línea anterior) lea lo mismo.
 *
 * Se guardan en localStorage 'tecu:prefs' y se aplican en <html> con los atributos
 * del sistema de diseño unificado Y con los de antes, para que todo el CSS responda:
 *   data-theme (system|light|dark|contrast) · data-text (md|lg|xl|xxl) ·
 *   data-spacing (wide|normal) · data-motion (system|reduce) · data-simple (on|off) ·
 *   meta[name=theme-color] · html.alto-contraste · html.reducir-movimiento ·
 *   data-texto (grande | muy-grande; sin atributo en tamaño normal).
 * El script en línea de index.html lee la misma clave y hace lo mismo antes de pintar.
 *
 * Avisos: en el mismo documento con un evento 'tecu:prefs' en `window`; en otras
 * pestañas e iframes con el evento 'storage'. Si localStorage falla, se usan los
 * valores por defecto, la sesión recuerda lo que se elija y nada truena.
 */

const CLAVE = 'tecu:prefs';
const EVENTO_LOCAL = 'tecu:prefs';

const TEMAS = ['sistema', 'claro', 'oscuro', 'contraste'];
const TAMANOS = ['md', 'lg', 'xl', 'xxl'];
const MOVIMIENTOS = ['auto', 'reducido'];
const DISPOSITIVOS = ['auto', 'movil', 'escritorio'];
const TEXTOS = ['normal', 'grande', 'muy-grande'];

/** Vocabulario anterior ↔ nuevo. */
const TEXTO_DE_TAMANO = { md: 'normal', lg: 'grande', xl: 'muy-grande', xxl: 'muy-grande' };
const TAMANO_DE_TEXTO = { normal: 'md', grande: 'lg', 'muy-grande': 'xl' };

/** Valor de html[data-theme] para cada tema. */
const TEMA_CSS = { sistema: 'system', claro: 'light', oscuro: 'dark', contraste: 'contrast' };

/** Color de la barra del navegador (igual que la barra superior de la app). */
const COLOR_DE_TEMA = { claro: '#0B2F45', oscuro: '#08141A' };

/**
 * @typedef {{
 *   tema: 'sistema'|'claro'|'oscuro'|'contraste', tamano: 'md'|'lg'|'xl'|'xxl', espaciado: boolean,
 *   movimiento: 'auto'|'reducido', simple: boolean, voz: boolean, ahorro: boolean, soloWifi: boolean,
 *   dispositivo: 'auto'|'movil'|'escritorio',
 *   texto: 'normal'|'grande'|'muy-grande', contraste: boolean,
 * }} Preferencias  (`texto` y `contraste` son derivados)
 */

/** Valores iniciales (congelado: cópialo con { ...PREFS_POR_DEFECTO }). No incluye los derivados. */
export const PREFS_POR_DEFECTO = Object.freeze({
  tema: 'sistema',
  tamano: 'md',
  espaciado: false,
  movimiento: 'auto',
  simple: false,
  voz: false,
  ahorro: true,
  soloWifi: true,
  dispositivo: 'auto',
});

const esBooleano = (v) => typeof v === 'boolean';
const VALIDOS = {
  tema: (v) => TEMAS.includes(v),
  tamano: (v) => TAMANOS.includes(v),
  espaciado: esBooleano,
  movimiento: (v) => MOVIMIENTOS.includes(v),
  simple: esBooleano,
  voz: esBooleano,
  ahorro: esBooleano,
  soloWifi: esBooleano,
  dispositivo: (v) => DISPOSITIVOS.includes(v),
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

/** Agrega los campos derivados del modelo anterior (siempre calculados, nunca leídos). */
function conDerivados(modelo) {
  return { ...modelo, texto: TEXTO_DE_TAMANO[modelo.tamano], contraste: modelo.tema === 'contraste' };
}

/**
 * Deja un objeto cualquiera (lo guardado, el detalle de un evento) como preferencias
 * completas y válidas. Cada valor inválido toma el de fábrica; las claves extra se
 * conservan para no perder ajustes de versiones futuras.
 *
 * Si trae `texto` o `contraste` (modelo anterior) y contradicen a `tamano` o `tema`,
 * manda el anterior: este módulo siempre los guarda coherentes, así que solo el
 * código de antes (otra pestaña con la versión vieja) pudo dejarlos distintos.
 */
function normalizar(entrada) {
  const e = esObjeto(entrada) ? entrada : {};
  const limpio = { ...e };
  for (const [clave, valido] of Object.entries(VALIDOS)) {
    limpio[clave] = valido(e[clave]) ? e[clave] : PREFS_POR_DEFECTO[clave];
  }
  if (TEXTOS.includes(e.texto) && e.texto !== TEXTO_DE_TAMANO[limpio.tamano]) limpio.tamano = TAMANO_DE_TEXTO[e.texto];
  if (esBooleano(e.contraste) && e.contraste !== (limpio.tema === 'contraste')) limpio.tema = e.contraste ? 'contraste' : 'sistema';
  return conDerivados(limpio);
}

/**
 * Aplica `parciales` sobre las preferencias `actuales` (ya normalizadas). Lo inválido
 * se ignora. Acepta los dos vocabularios; si llegan ambos para lo mismo (por ejemplo
 * { ...prefs, texto: 'grande' }), cuenta el que cambió respecto a lo actual y, si
 * cambiaron los dos, el nuevo.
 */
function mezclar(actuales, parciales) {
  const p = esObjeto(parciales) ? parciales : {};
  const mezcla = { ...actuales, ...p };
  for (const [clave, valido] of Object.entries(VALIDOS)) {
    mezcla[clave] = valido(p[clave]) ? p[clave] : actuales[clave];
  }
  if (mezcla.tamano === actuales.tamano && TEXTOS.includes(p.texto) && p.texto !== actuales.texto) {
    mezcla.tamano = TAMANO_DE_TEXTO[p.texto];
  }
  if (mezcla.tema === actuales.tema && esBooleano(p.contraste) && p.contraste !== actuales.contraste) {
    mezcla.tema = p.contraste ? 'contraste' : 'sistema';
  }
  return conDerivados(mezcla);
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

/*
 * Si el almacenamiento no existe o falla al guardar (modo privado, permisos), la sesión
 * recuerda lo último elegido: así cambiar un ajuste no regresa los demás a su valor inicial.
 */
const SIN_ALMACEN = {};
const recordado = new WeakMap();
const llaveDe = (almacen) => almacen || SIN_ALMACEN;

/**
 * Lee 'tecu:prefs'. Si no hay, está dañada o el navegador bloquea el almacenamiento,
 * devuelve los valores por defecto. Lo guardado con el modelo anterior se interpreta aquí.
 * @param {{ almacenamiento?: Storage|null }} [opciones]
 * @returns {Preferencias} el modelo completo más los derivados `texto` y `contraste`
 */
export function leerPreferencias({ almacenamiento } = {}) {
  const almacen = resolverAlmacen(almacenamiento);
  const deLaSesion = recordado.get(llaveDe(almacen));
  if (deLaSesion) return { ...deLaSesion };
  let guardadas = null;
  try {
    guardadas = parsear(almacen ? almacen.getItem(CLAVE) : null);
  } catch {
    guardadas = null;
  }
  return normalizar(guardadas);
}

function consultaOscuro(ventana) {
  try {
    return ventana && typeof ventana.matchMedia === 'function' ? ventana.matchMedia('(prefers-color-scheme: dark)') : null;
  } catch {
    return null;
  }
}

function pintarColorDeTema(doc, tema, sistemaOscuro) {
  const meta = typeof doc.querySelector === 'function' ? doc.querySelector('meta[name="theme-color"]') : null;
  if (!meta) return;
  const oscuro = tema === 'oscuro' || (tema === 'sistema' && sistemaOscuro);
  meta.setAttribute('content', oscuro ? COLOR_DE_TEMA.oscuro : COLOR_DE_TEMA.claro);
}

/** Documento → { tema, consulta }: con tema «sistema», el color de la barra sigue al sistema. */
const seguimiento = new WeakMap();

/** Recuerda el tema aplicado y devuelve si el sistema está en modo oscuro. */
function seguirSistema(doc, ventana, tema) {
  let s = seguimiento.get(doc);
  if (!s) {
    s = { tema, consulta: null };
    seguimiento.set(doc, s);
  }
  s.tema = tema;
  if (!s.consulta) {
    const consulta = consultaOscuro(ventana);
    if (consulta) {
      s.consulta = consulta;
      const alCambiar = () => pintarColorDeTema(doc, s.tema, Boolean(consulta.matches));
      if (typeof consulta.addEventListener === 'function') consulta.addEventListener('change', alCambiar);
      else if (typeof consulta.addListener === 'function') consulta.addListener(alCambiar); // Safari < 14
    }
  }
  return Boolean(s.consulta && s.consulta.matches);
}

/**
 * Aplica las preferencias en <html> (atributos del diseño unificado y los de antes)
 * y en meta[name=theme-color]. Acepta cualquiera de los dos vocabularios.
 * @param {Partial<Preferencias>} prefs
 * @param {Document|null} [doc=document]
 * @param {{ ventana?: Window|null }} [opciones] para saber si el sistema está en modo
 *   oscuro (por defecto, la ventana del documento)
 */
export function aplicarPreferencias(prefs, doc = globalThis.document, { ventana } = {}) {
  const html = doc?.documentElement;
  if (!html) return;
  const p = normalizar(prefs);
  const reducir = p.movimiento === 'reducido';

  // Sistema de diseño unificado
  html.setAttribute('data-theme', TEMA_CSS[p.tema]);
  html.setAttribute('data-text', p.tamano);
  html.setAttribute('data-spacing', p.espaciado ? 'wide' : 'normal');
  html.setAttribute('data-motion', reducir ? 'reduce' : 'system');
  html.setAttribute('data-simple', p.simple ? 'on' : 'off');

  // Contrato anterior (lo usan los componentes que ya existían)
  if (p.texto === 'normal') html.removeAttribute('data-texto');
  else html.setAttribute('data-texto', p.texto);
  html.classList.toggle('alto-contraste', p.contraste);
  html.classList.toggle('reducir-movimiento', reducir);

  const win = ventana === undefined ? doc.defaultView || ventanaDelNavegador() : ventana;
  pintarColorDeTema(doc, p.tema, seguirSistema(doc, win, p.tema));
}

/**
 * Mezcla los cambios con lo guardado, los guarda, los aplica y avisa a esta
 * página (alCambiarPreferencias) y a las otras pestañas/iframes (evento 'storage').
 * Los valores inválidos se ignoran. Acepta los dos vocabularios.
 * @param {Partial<Preferencias>} parciales
 * @param {{ almacenamiento?: Storage|null, doc?: Document|null, ventana?: EventTarget|null }} [opciones]
 * @returns {Preferencias} las preferencias completas ya aplicadas
 */
export function guardarPreferencias(parciales, { almacenamiento, doc, ventana } = {}) {
  const almacen = resolverAlmacen(almacenamiento);
  const prefs = mezclar(leerPreferencias({ almacenamiento: almacen }), parciales);
  let guardado = false;
  try {
    if (almacen) {
      almacen.setItem(CLAVE, JSON.stringify(prefs));
      guardado = true;
    }
  } catch (error) {
    console.warn('[tecu] No se pudieron guardar las preferencias:', error?.name || error);
  }
  if (guardado) recordado.delete(llaveDe(almacen));
  else recordado.set(llaveDe(almacen), { ...prefs });
  const win = ventana === undefined ? ventanaDelNavegador() : ventana;
  aplicarPreferencias(prefs, doc, win && typeof win.matchMedia === 'function' ? { ventana: win } : undefined);
  win?.dispatchEvent(eventoCon(EVENTO_LOCAL, prefs));
  return prefs;
}

/**
 * Regresa los ajustes de accesibilidad a su valor inicial (tema, tamaño, espaciado,
 * movimiento, navegación simplificada y voz). Conserva `ahorro`, `soloWifi` y
 * `dispositivo`, que no son de accesibilidad; con `{ todo: true }` también los restablece.
 * Guarda, aplica y avisa igual que guardarPreferencias().
 * @param {{ todo?: boolean, almacenamiento?: Storage|null, doc?: Document|null, ventana?: EventTarget|null }} [opciones]
 * @returns {Preferencias}
 */
export function restablecerPreferencias({ todo = false, ...opciones } = {}) {
  const { ahorro, soloWifi, dispositivo } = leerPreferencias(opciones);
  return guardarPreferencias(todo ? { ...PREFS_POR_DEFECTO } : { ...PREFS_POR_DEFECTO, ahorro, soloWifi, dispositivo }, opciones);
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
