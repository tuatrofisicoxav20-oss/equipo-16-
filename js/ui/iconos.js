/**
 * Iconos SVG en línea de Tecu Aprende (dibujo propio, sin dependencias).
 *
 * - Trazo de 2 px en una cuadrícula de 24×24, puntas redondeadas y `currentColor`:
 *   el icono toma el color del texto que lo rodea (y del modo alto contraste).
 * - Sin `etiqueta` es decorativo (`aria-hidden="true"`): acompáñalo siempre de texto.
 *   Con `etiqueta` es una imagen con nombre (`role="img"` + `aria-label`).
 * - El tamaño se da en px de diseño (24 = 1.5em): crece con el tamaño de letra y con
 *   las preferencias de texto. Algunos componentes (barra inferior, chips) fijan el suyo.
 *
 * Uso: html`<button class="boton">${crudo(icono('check'))} Listo</button>`
 */

const PUNTO = 'fill="currentColor" stroke="none"';

/** Trazos de cada icono (contenido del <svg>). */
const ICONOS = {
  // Navegación y secciones
  inicio: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5"/>',
  aprender: '<path d="m2 9.5 10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.7 2.7 3.5 6 3.5s6-1.8 6-3.5v-4.5"/><path d="M22 9.5V15"/>',
  tecu: '<path d="M5 4.5 8.5 7h7L19 4.5V13a7 7 0 0 1-14 0z"/><circle cx="9.5" cy="11.5" r="2"/><circle cx="14.5" cy="11.5" r="2"/><path d="m11 15 1 1.5 1-1.5"/>',
  descargas: '<rect x="3" y="4" width="18" height="4.5" rx="1"/><path d="M4.5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V8.5"/><path d="M12 11.5v6"/><path d="m9.5 15 2.5 2.5 2.5-2.5"/>',
  ajustes: '<path d="M4 6.5h8M16 6.5h4M4 12h3M11 12h9M4 17.5h10M18 17.5h2"/><circle cx="14" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="16" cy="17.5" r="2"/>',
  menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
  siguiente: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  atras: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  arriba: '<path d="m6 15 6-6 6 6"/>',
  abajo: '<path d="m6 9 6 6 6-6"/>',
  cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',

  // Conexión y datos
  wifi: `<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/><path d="M8.8 15.8a4.6 4.6 0 0 1 6.4 0"/><circle cx="12" cy="19.5" r="1.25" ${PUNTO}/>`,
  'sin-wifi': `<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/><path d="M8.8 15.8a4.6 4.6 0 0 1 6.4 0"/><circle cx="12" cy="19.5" r="1.25" ${PUNTO}/><path d="m3 3 18 18"/>`,
  sincronizar: '<path d="M20 11.5A8 8 0 0 0 5.6 7.2"/><path d="M4.5 3.5v4h4"/><path d="M4 12.5a8 8 0 0 0 14.4 4.3"/><path d="M19.5 20.5v-4h-4"/>',
  nube: '<path d="M7 19a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4.75 4.75 0 0 1-.5 9.5z"/>',
  descargar: '<path d="M12 3.5v11.5"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 16v2.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V16"/>',
  paquete: '<path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="M3.5 7.5 12 12l8.5-4.5"/><path d="M12 12v9"/>',
  avion: '<path d="M12 2.5c.9 0 1.5.8 1.5 1.8V9l7.5 4.5V16l-7.5-2.3v4.5l2.3 1.8v2L12 20.8 8.2 22v-2l2.3-1.8v-4.5L3 16v-2.5L10.5 9V4.3c0-1 .6-1.8 1.5-1.8z"/>',
  celular: '<rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M11 18.5h2"/>',

  // Estados y avisos
  check: '<path d="m4.5 12.5 5 5 10-10"/>',
  exito: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  alerta: `<path d="M10.3 4.3 2.7 17.5a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4"/><circle cx="12" cy="17" r="1.1" ${PUNTO}/>`,
  error: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  info: `<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.75" r="1.1" ${PUNTO}/>`,
  pregunta: `<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.8"/><circle cx="12" cy="17" r="1.1" ${PUNTO}/>`,
  pista: '<path d="M9 17.5c0-1.6-.8-2.5-1.9-3.6a6 6 0 1 1 9.8 0c-1.1 1.1-1.9 2-1.9 3.6z"/><path d="M9.5 20.5h5"/>',
  estrella: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  trofeo: '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6h-3v1a3.5 3.5 0 0 0 3.3 3.5M16.5 6h3v1a3.5 3.5 0 0 1-3.3 3.5"/><path d="M12 13.5v3.5"/><path d="M8 20.5h8M9.5 20.5V17h5v3.5"/>',
  candado: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5v-3a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',

  // Acciones
  ojo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  lapiz: '<path d="M4 20h4L19.5 8.5a2.83 2.83 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  borrar: '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="m6 7 1 13h10l1-13"/><path d="M10 11v5.5M14 11v5.5"/>',
  deshacer: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  enviar: '<path d="M21 3 3 10.5l7 3 3 7z"/><path d="M21 3 10 13.5"/>',
  imprimir: '<path d="M7 8V3.5h10V8"/><path d="M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 13h10v7.5H7z"/>',
  reproducir: '<path d="M7 4.5v15l12-7.5z"/>',
  pausa: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  reiniciar: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  buscar: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  llamar: '<path d="M8.5 3.5H5.2a1.7 1.7 0 0 0-1.7 1.8 15.5 15.5 0 0 0 15.2 15.2 1.7 1.7 0 0 0 1.8-1.7v-3.3l-4-1.5-2 2a11 11 0 0 1-5.5-5.5l2-2z"/>',
  chat: '<path d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v9a1.5 1.5 0 0 1-1.5 1.5h-8L6.5 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5z"/>',

  // Personas y aula
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5a8 8 0 0 1 16 0"/>',
  grupo: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6"/><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  libro: '<path d="M12 6.5C10.3 5 7.8 4.5 3.5 4.5v14c4.3 0 6.8.5 8.5 2 1.7-1.5 4.2-2 8.5-2v-14c-4.3 0-6.8.5-8.5 2z"/><path d="M12 6.5v14"/>',
  balanza: '<path d="M12 4v16M8 20h8M4.5 7h15"/><path d="m4.5 7-3 6.5h6zM19.5 7l-3 6.5h6z"/><path d="M1.5 13.5a3 3 0 0 0 6 0M16.5 13.5a3 3 0 0 0 6 0"/>',
  proyector: '<path d="M3 4.5h18"/><path d="M4.5 4.5v10h15v-10"/><path d="M12 14.5V18"/><path d="m8 21.5 4-3.5 4 3.5"/>',
  grafica: '<path d="M4 20.5h16"/><rect x="5.5" y="12" width="3" height="5.5" rx=".5"/><rect x="10.5" y="6.5" width="3" height="11" rx=".5"/><rect x="15.5" y="9.5" width="3" height="8" rx=".5"/>',

  // Preferencias
  voz: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/>',
  silencio: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
  contraste: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  texto: '<path d="M3 19 8 5.5 13 19"/><path d="M4.8 14.5h6.4"/><path d="m14.5 19 3.3-8.5L21 19"/><path d="M15.6 16.2h4.3"/>',

  // Tipos de error del paquete (packs/*.json → errores.*.icono)
  signo: '<path d="M12 4.5v8M8 8.5h8M8 18h8"/>',
  inversa: `<path d="m4 4.5 5 5M9 4.5l-5 5"/><path d="M14.5 17h6"/><circle cx="17.5" cy="14" r="1" ${PUNTO}/><circle cx="17.5" cy="20" r="1" ${PUNTO}/><path d="M12.5 7h4a3 3 0 0 1 3 3v.5"/><path d="m17.5 8.5 2 2 2-2"/>`,
  cuenta: `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7h7"/><circle cx="9" cy="11.5" r="1" ${PUNTO}/><circle cx="12" cy="11.5" r="1" ${PUNTO}/><circle cx="15" cy="11.5" r="1" ${PUNTO}/><circle cx="9" cy="15" r="1" ${PUNTO}/><circle cx="12" cy="15" r="1" ${PUNTO}/><circle cx="15" cy="15" r="1" ${PUNTO}/><path d="M8.5 18h7"/>`,
  terminos: '<rect x="3.5" y="4" width="7" height="7" rx="1.5"/><rect x="13.5" y="4" width="7" height="7" rx="1.5"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/>',
  equilibrio: '<path d="M12 5v15M8 20h8M4 10l16-4"/><path d="m4 10-2 5h4zM20 6l-2 5h4z"/><path d="M2 15a2 2 0 0 0 4 0M18 11a2 2 0 0 0 4 0"/>',
  negativo: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
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
    `<svg class="icono icono--${clase}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ` +
    `width="${t}" height="${t}" style="--icono:${+(t / 16).toFixed(4)}em" fill="none" stroke="currentColor" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false" ${accesible}>${trazo}</svg>`
  );
}
