/**
 * Iconos SVG en línea (sin dependencias). Un solo juego para toda la app:
 *
 * - Los del prototipo de interfaz, con sus mismos nombres en inglés y sus mismos
 *   trazos (home, book, chat, download…): son los que usan las pantallas con el
 *   marcado del sistema de diseño unificado.
 * - Los nombres en español que ya usaban los componentes (inicio, libro, alerta…)
 *   siguen existiendo: los que significan lo mismo que uno de arriba son un alias
 *   (mismo dibujo); los demás conservan el suyo.
 *
 * Mismo estilo para todos: trazo de 2 px en una cuadrícula de 24×24, puntas
 * redondeadas y `currentColor` (el icono toma el color del texto que lo rodea,
 * también en tema oscuro y en alto contraste).
 *
 * - Sin `etiqueta` es decorativo (`aria-hidden="true"`): acompáñalo siempre de texto.
 *   Con `etiqueta` es una imagen con nombre (`role="img"` + `aria-label`).
 * - El tamaño se da en px de diseño (24 = 1.5em): crece con el tamaño de letra y con
 *   las preferencias de texto. Algunos componentes (barra inferior, chips) fijan el suyo.
 * - Lleva las clases `ic` (la del sistema de diseño unificado) e `icono icono--<nombre>`.
 *
 * Uso: html`<button class="btn">${crudo(icono('check', { tamano: 18 }))} Listo</button>`
 */

const PUNTO = 'fill="currentColor" stroke="none"';

/** Iconos del prototipo de interfaz (trazos copiados tal cual). */
const DEL_PROTOTIPO = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z"/><path d="M20 17v4H6.5A2.5 2.5 0 0 1 4 18.5"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
  download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a5 5 0 0 1 5 5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  wifi: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M2 9a14 14 0 0 1 20 0"/><circle cx="12" cy="19.2" r=".6"/>',
  'wifi-off': '<path d="m3 3 18 18"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 3-2"/><path d="M19 12.5a10 10 0 0 0-3-2"/><circle cx="12" cy="19.2" r=".6"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  play: '<path d="M7 4v16l13-8Z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  send: '<path d="m22 2-11 11"/><path d="M22 2 15 22l-4-9-9-4Z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3Z"/>',
  flame: '<path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-10Z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
  monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4Z"/><path d="M10 21h4"/>',
  chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14-4L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14 4l2-2"/><path d="M20 20v-5h-5"/>',
  shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6Z"/><path d="m9 12 2 2 4-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  alert: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 17v4"/><path d="M17 19h4"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-15 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
  pen: '<path d="M4 20l1-4L17 4l3 3L8 19Z"/><path d="m14 7 3 3"/>',
  landmark: '<path d="M3 21h18"/><path d="M5 21V10"/><path d="M10 21V10"/><path d="M14 21V10"/><path d="M19 21V10"/><path d="m2 10 10-6 10 6Z"/>',
  access: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5 12 10l7-1.5"/><path d="M12 10v4.5"/><path d="m9 21 3-6.5 3 6.5"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17h.01"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};

/** Nombres en español que significan lo mismo que un icono del prototipo: mismo dibujo. */
const ALIAS = {
  inicio: 'home',
  libro: 'book',
  descargar: 'download',
  usuario: 'user',
  grupo: 'users',
  calendario: 'calendar',
  ojo: 'eye',
  borrar: 'trash',
  'sin-wifi': 'wifi-off',
  cerrar: 'x',
  reproducir: 'play',
  candado: 'lock',
  enviar: 'send',
  pista: 'bulb',
  estrella: 'star',
  celular: 'phone',
  abajo: 'down',
  buscar: 'search',
  grafica: 'chart',
  reloj: 'clock',
  sincronizar: 'sync',
  alerta: 'alert',
  cuenta: 'calc',
  lapiz: 'pen',
  voz: 'volume',
  pregunta: 'help',
  reiniciar: 'reset',
  mas: 'plus',
};

/** Iconos propios de esta app (no existen en el prototipo). */
const PROPIOS = {
  // Navegación y secciones
  aprender: '<path d="m2 9.5 10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.7 2.7 3.5 6 3.5s6-1.8 6-3.5v-4.5"/><path d="M22 9.5V15"/>',
  // Tecu de frente: birrete con borla, ojos grandes y pico.
  tecu: `<path d="M3 6.5 12 3l9 3.5L12 10z"/><path d="M6.5 8.8V14a5.5 5.5 0 0 0 11 0V8.8"/><circle cx="9.6" cy="13.4" r="1.2" ${PUNTO}/><circle cx="14.4" cy="13.4" r="1.2" ${PUNTO}/><path d="m11.2 16.2.8 1.1.8-1.1"/><path d="M21 6.5V10"/>`,
  descargas: '<rect x="3" y="4" width="18" height="4.5" rx="1"/><path d="M4.5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V8.5"/><path d="M12 11.5v6"/><path d="m9.5 15 2.5 2.5 2.5-2.5"/>',
  ajustes: '<path d="M4 6.5h8M16 6.5h4M4 12h3M11 12h9M4 17.5h10M18 17.5h2"/><circle cx="14" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="16" cy="17.5" r="2"/>',
  menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
  siguiente: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  atras: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  arriba: '<path d="m6 15 6-6 6 6"/>',

  // Conexión y datos
  nube: '<path d="M7 19a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4.75 4.75 0 0 1-.5 9.5z"/>',
  paquete: '<path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="M3.5 7.5 12 12l8.5-4.5"/><path d="M12 12v9"/>',
  avion: '<path d="M12 2.5c.9 0 1.5.8 1.5 1.8V9l7.5 4.5V16l-7.5-2.3v4.5l2.3 1.8v2L12 20.8 8.2 22v-2l2.3-1.8v-4.5L3 16v-2.5L10.5 9V4.3c0-1 .6-1.8 1.5-1.8z"/>',

  // Estados y avisos
  exito: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  error: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  trofeo: '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6h-3v1a3.5 3.5 0 0 0 3.3 3.5M16.5 6h3v1a3.5 3.5 0 0 1-3.3 3.5"/><path d="M12 13.5v3.5"/><path d="M8 20.5h8M9.5 20.5V17h5v3.5"/>',

  // Acciones
  deshacer: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  imprimir: '<path d="M7 8V3.5h10V8"/><path d="M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 13h10v7.5H7z"/>',
  pausa: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  menos: '<path d="M5 12h14"/>',
  llamar: '<path d="M8.5 3.5H5.2a1.7 1.7 0 0 0-1.7 1.8 15.5 15.5 0 0 0 15.2 15.2 1.7 1.7 0 0 0 1.8-1.7v-3.3l-4-1.5-2 2a11 11 0 0 1-5.5-5.5l2-2z"/>',

  // Aula
  balanza: '<path d="M12 4v16M8 20h8M4.5 7h15"/><path d="m4.5 7-3 6.5h6zM19.5 7l-3 6.5h6z"/><path d="M1.5 13.5a3 3 0 0 0 6 0M16.5 13.5a3 3 0 0 0 6 0"/>',
  proyector: '<path d="M3 4.5h18"/><path d="M4.5 4.5v10h15v-10"/><path d="M12 14.5V18"/><path d="m8 21.5 4-3.5 4 3.5"/>',

  // Preferencias
  silencio: '<path d="M4 9v6h4l5 4V5L8 9Z"/><path d="m16.5 9.5 5 5M21.5 9.5l-5 5"/>',
  contraste: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  texto: '<path d="M3 19 8 5.5 13 19"/><path d="M4.8 14.5h6.4"/><path d="m14.5 19 3.3-8.5L21 19"/><path d="M15.6 16.2h4.3"/>',

  // Tipos de error del paquete (packs/*.json → errores.*.icono)
  signo: '<path d="M12 4.5v8M8 8.5h8M8 18h8"/>',
  inversa: `<path d="m4 4.5 5 5M9 4.5l-5 5"/><path d="M14.5 17h6"/><circle cx="17.5" cy="14" r="1" ${PUNTO}/><circle cx="17.5" cy="20" r="1" ${PUNTO}/><path d="M12.5 7h4a3 3 0 0 1 3 3v.5"/><path d="m17.5 8.5 2 2 2-2"/>`,
  terminos: '<rect x="3.5" y="4" width="7" height="7" rx="1.5"/><rect x="13.5" y="4" width="7" height="7" rx="1.5"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/>',
  equilibrio: '<path d="M12 5v15M8 20h8M4 10l16-4"/><path d="m4 10-2 5h4zM20 6l-2 5h4z"/><path d="M2 15a2 2 0 0 0 4 0M18 11a2 2 0 0 0 4 0"/>',
  negativo: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
};

/** Trazos de cada icono (contenido del <svg>), por nombre. */
const ICONOS = {
  ...DEL_PROTOTIPO,
  ...Object.fromEntries(Object.entries(ALIAS).map(([nombre, original]) => [nombre, DEL_PROTOTIPO[original]])),
  ...PROPIOS,
};

/** Nombres disponibles (para la guía visual y para validar datos). */
export const NOMBRES_ICONOS = Object.freeze(Object.keys(ICONOS));

const RESPALDO = '<circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/>';
const avisados = new Set();

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapar = (texto) => String(texto).replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** ¿Existe un icono con ese nombre? */
export function hayIcono(nombre) {
  return Object.prototype.hasOwnProperty.call(ICONOS, nombre);
}

/**
 * Devuelve el SVG de un icono como texto (para html`` envuélvelo en crudo()).
 * @param {string} nombre uno de NOMBRES_ICONOS (si no existe, dibuja un círculo punteado)
 * @param {{ etiqueta?: string, tamano?: number }} [opciones]
 *   etiqueta: nombre accesible; sin ella el icono es decorativo.
 *   tamano: px de diseño (24 por defecto = 1.5em del texto que lo rodea).
 * @returns {string}
 */
export function icono(nombre, { etiqueta, tamano = 24 } = {}) {
  let trazo = ICONOS[nombre];
  if (!hayIcono(nombre)) {
    trazo = RESPALDO;
    if (!avisados.has(nombre)) {
      avisados.add(nombre);
      console.warn(`[iconos] No existe el icono "${nombre}".`);
    }
  }
  const t = Number(tamano) > 0 ? Number(tamano) : 24;
  const clase = String(nombre).replace(/[^a-z0-9-]/gi, '');
  const accesible = etiqueta ? `role="img" aria-label="${escapar(etiqueta)}"` : 'aria-hidden="true"';
  return (
    `<svg class="icono icono--${clase} ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ` +
    `width="${t}" height="${t}" style="--icono:${+(t / 16).toFixed(4)}em" fill="none" stroke="currentColor" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false" ${accesible}>${trazo}</svg>`
  );
}
