/**
 * Tecu, el tecolote tutor, dibujado como SVG en línea: el tecolote verde azulado
 * con birrete del prototipo de interfaz, con los estados que necesita la app.
 *
 * - Sin dependencias ni imágenes externas: el dibujo es un texto SVG que se
 *   inserta con crudo(tecuSVG(...)) o innerHTML. Pesa unos pocos KB.
 * - Los colores van en el propio SVG (se ve bien aunque no cargue el CSS y en los
 *   tres temas: el birrete lleva un filo claro para no perderse sobre fondos
 *   oscuros). Las animaciones viven en css/tecu.css y se apagan con movimiento reducido.
 * - Dos encuadres: cuerpo completo (lienzo de 120 × 138) y `cara: true` (solo la
 *   cabeza, casi cuadrada: para la marca del encabezado y los globos del chat).
 *
 * Estados:
 *   normal     ojos abiertos; parpadea cada ~4 s
 *   feliz      ojos en arco ^^, alas arriba y una chispa
 *   pensando   mira hacia arriba a un lado, cejas de concentración y un "?"
 *   dormido    ojos cerrados y "Z z" («Tecu se duerme, este lo resuelves tú»)
 *   atento     ojos muy abiertos, cejas levantadas y un ala que señala (después de
 *              un error; amable, no regañón)
 *   sin-senal  insignia de teléfono: funciona con lo que ya está en el celular
 */
import { MARCA } from '../marca.js';

/** Estados válidos de Tecu, en el orden en que se presentan. */
export const ESTADOS_TECU = Object.freeze(['normal', 'feliz', 'pensando', 'dormido', 'atento', 'sin-senal']);

/** Cómo se describe cada estado en la etiqueta accesible. */
const DESCRIPCION = Object.freeze({
  normal: '',
  feliz: 'feliz',
  pensando: 'pensando',
  dormido: 'dormido',
  atento: 'atento',
  'sin-senal': 'sin señal de internet',
});

const ETIQUETA_BASE = `${MARCA.tutor}, el tecolote`;

/** Paleta propia de la mascota (ilustración, no tema de la interfaz). Solo colores hex. */
const C = Object.freeze({
  tinta: '#0B2F45',
  banda: '#0F3D5A',
  filo: '#8FD4F5',
  cuerpo: '#1F9C8C',
  ala: '#157A6E',
  panza: '#E1F3F0',
  blanco: '#FFFFFF',
  oro: '#F2B134',
  oroSombra: '#D8921A',
});

/** Lienzo de cada encuadre: [minX, minY, ancho, alto]. */
const LIENZO = Object.freeze({ cuerpo: [0, 0, 120, 138], cara: [14, 6, 92, 90] });

let instancias = 0;

function escAttr(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ------------------------------------------------------------------ */
/* Partes del dibujo                                                    */
/* ------------------------------------------------------------------ */

function patas() {
  return (
    `<g class="tecu__patas" fill="${C.oro}">` +
    '<ellipse cx="46" cy="134" rx="13" ry="3.4"/><ellipse cx="74" cy="134" rx="13" ry="3.4"/>' +
    '</g>'
  );
}

function cuerpo() {
  return `<path d="M60 22c-22 0-38 16-38 40v22c0 21 15 36 38 36s38-15 38-36V62c0-24-16-40-38-40Z" fill="${C.cuerpo}"/>`;
}

const ALA_ABAJO = 'M25 74c-9 10-8 30 5 42 3-15 3-30-5-42Z';
/** Ala levantada (feliz): sube pegada a la cabeza y termina en punta redonda. */
const ALA_ARRIBA = 'M27 88C15 84 6.5 66 7 47c.2-5.6 6.4-6.6 8.2-1.4C18.6 56 22.4 66 27.5 72Z';
/** Ala que señala hacia afuera (atento): «mira, aquí». */
const ALA_SENALA = 'M27 90C14 90 4.5 80 2.6 66.5c-.7-4.6 4.6-6.6 7.4-2.8C14.6 70 20.6 74.6 27.5 76Z';

/** Refleja un trazo respecto al eje vertical x = 60 (el ala derecha es el espejo de la izquierda). */
function alaDe(lado, trazo) {
  const espejo = lado === 'der' ? ' transform="matrix(-1 0 0 1 120 0)"' : '';
  return `<g class="tecu__ala tecu__ala--${lado}"><path d="${trazo}" fill="${C.ala}"${espejo}/></g>`;
}

function alas(estado, cara) {
  if (!cara && estado === 'feliz') return alaDe('izq', ALA_ARRIBA) + alaDe('der', ALA_ARRIBA);
  if (!cara && estado === 'atento') return alaDe('izq', ALA_ABAJO) + alaDe('der', ALA_SENALA);
  return alaDe('izq', ALA_ABAJO) + alaDe('der', ALA_ABAJO);
}

function panza() {
  return (
    `<ellipse cx="60" cy="100" rx="24" ry="27" fill="${C.panza}"/>` +
    `<path d="M47 90q4.5 4 9 0M64 90q4.5 4 9 0M55 104q5 4.5 10 0M45 112q4.5 4 9 0M66 112q4.5 4 9 0" ` +
    `stroke="${C.cuerpo}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
  );
}

const OJOS = [44, 76];

function ojosAbiertos({ dx = 0, dy = 1, r = 7 } = {}) {
  return OJOS.map(
    (x) =>
      `<circle cx="${x + dx}" cy="${59 + dy}" r="${r}" fill="${C.tinta}"/>` +
      `<circle cx="${x + dx + 2.6}" cy="${59 + dy - 2.6}" r="2.4" fill="${C.blanco}"/>`,
  ).join('');
}

function ojos(estado) {
  const trazo = `fill="none" stroke="${C.tinta}" stroke-linecap="round"`;
  if (estado === 'feliz') {
    return `<g class="tecu__ojos" ${trazo} stroke-width="3.6"><path d="M37 63q7-10 14 0M69 63q7-10 14 0"/></g>`;
  }
  if (estado === 'dormido') {
    return `<g class="tecu__ojos" ${trazo} stroke-width="3.4"><path d="M36.5 59q7.5 8 15 0M68.5 59q7.5 8 15 0"/></g>`;
  }
  const mirada = { pensando: { dx: -3, dy: -3 }, atento: { dy: 0.5, r: 7.8 } }[estado];
  return `<g class="tecu__ojos">${ojosAbiertos(mirada)}</g>`;
}

function cejas(estado) {
  const trazo = `class="tecu__cejas" fill="none" stroke="${C.tinta}" stroke-width="3" stroke-linecap="round"`;
  if (estado === 'pensando') return `<g ${trazo}><path d="M33 44l15 3M87 44l-15 3"/></g>`;
  if (estado === 'atento') return `<g ${trazo}><path d="M29.5 50.5q5.5-6.5 13.5-5.5M90.5 50.5q-5.5-6.5-13.5-5.5"/></g>`;
  return '';
}

function cara(estado) {
  return (
    `<g class="tecu__cara">` +
    `<circle cx="44" cy="59" r="17.5" fill="${C.blanco}"/><circle cx="76" cy="59" r="17.5" fill="${C.blanco}"/>` +
    ojos(estado) +
    cejas(estado) +
    `<path d="M54 67l6 11 6-11Z" fill="${C.oro}" stroke="${C.oroSombra}" stroke-width="1" stroke-linejoin="round"/>` +
    `</g>`
  );
}

/** Birrete con borla. El filo claro lo separa de los fondos oscuros (barra, héroe, tema oscuro). */
function birrete() {
  const tabla = 'M28 27 60 12l32 15-32 15Z';
  return (
    `<g class="tecu__birrete">` +
    `<path d="${tabla}" fill="none" stroke="${C.filo}" stroke-width="2.6" stroke-linejoin="round" stroke-opacity=".7"/>` +
    `<path d="${tabla}" fill="${C.tinta}"/>` +
    `<path d="M44 35v9c9 6 23 6 32 0v-9" fill="${C.banda}"/>` +
    `<g class="tecu__borla"><path d="M92 27v16" stroke="${C.oro}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<circle cx="92" cy="45" r="3.6" fill="${C.oro}"/></g>` +
    `</g>`
  );
}

/* ------------------------------------------------------------------ */
/* Extras por estado                                                    */
/* ------------------------------------------------------------------ */

/** Trazo con borde claro debajo: se lee sobre fondo claro y sobre fondo oscuro. */
function rotulo(d, grosor) {
  return (
    `<path d="${d}" stroke="${C.blanco}" stroke-width="${grosor + 3}"/>` +
    `<path d="${d}" stroke="${C.tinta}" stroke-width="${grosor}"/>`
  );
}

function chispa(cara) {
  const estrella = 'M100 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z';
  return (
    `<g class="tecu__chispa" fill="${C.oro}"${cara ? ' transform="translate(-3 -6)"' : ''}>` +
    `<path d="${estrella}"/>` +
    (cara ? '' : '<path d="M17 14l1.2 3.6 3.6 1.2-3.6 1.2-1.2 3.6-1.2-3.6-3.6-1.2 3.6-1.2Z"/>') +
    `</g>`
  );
}

function duda() {
  return (
    `<g class="tecu__duda" fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    rotulo('M12.5 21.5a5.5 5.5 0 1 1 8.2 4.8c-1.6 1-2.7 2-2.7 4.2M18 36.2v.1', 3) +
    `</g>`
  );
}

function zetas() {
  return (
    `<g class="tecu__zetas" fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    `<g class="tecu__z tecu__z--1">${rotulo('M88.5 14h8l-8 9.5h8', 2.6)}</g>` +
    `<g class="tecu__z tecu__z--2">${rotulo('M99.5 7.5h5l-5 6h5', 2)}</g>` +
    `</g>`
  );
}

/** Insignia «en este celular» (sin señal): un teléfono dentro de un círculo. */
function insignia(cara) {
  const [x, y, r, escala] = cara ? [94, 82, 12, 0.57] : [95, 112, 15, 0.71];
  return (
    `<g class="tecu__insignia">` +
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.blanco}" stroke="${C.tinta}" stroke-width="2.4"/>` +
    `<g transform="translate(${+(x - 12 * escala).toFixed(1)} ${+(y - 12 * escala).toFixed(1)}) scale(${escala})" ` +
    `fill="none" stroke="${C.tinta}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">` +
    `<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></g>` +
    `</g>`
  );
}

function extras(estado, cara) {
  if (estado === 'feliz') return chispa(cara);
  if (estado === 'pensando') return cara ? '' : duda();
  if (estado === 'dormido') return zetas();
  if (estado === 'sin-senal') return insignia(cara);
  return '';
}

/* ------------------------------------------------------------------ */
/* API                                                                  */
/* ------------------------------------------------------------------ */

/**
 * Dibuja a Tecu.
 *
 * @param {object} [opciones]
 * @param {'normal'|'feliz'|'pensando'|'dormido'|'atento'|'sin-senal'} [opciones.estado='normal']
 * @param {number|string} [opciones.tamano=96] ancho en px (número) o una medida CSS ('6rem').
 *   El alto sale de la proporción del dibujo: 138/120 de cuerpo completo, casi cuadrado con `cara`.
 * @param {string} [opciones.etiqueta] texto para el lector de pantalla. Si no se da,
 *   se usa "Tecu, el tecolote" más el estado ("Tecu, el tecolote, feliz").
 * @param {boolean} [opciones.decorativo=false] true = el lector de pantalla lo ignora
 *   (úsalo cuando el texto de al lado ya dice lo mismo).
 * @param {boolean} [opciones.cara=false] true = solo la cabeza (marca del encabezado, chat).
 * @param {boolean} [opciones.flotar=false] true = flota despacio (héroe del inicio);
 *   se queda quieto con movimiento reducido.
 * @returns {string} SVG listo para insertar con crudo() o innerHTML
 */
export function tecuSVG({ estado = 'normal', tamano = 96, etiqueta, decorativo = false, cara: soloCara = false, flotar = false } = {}) {
  const e = ESTADOS_TECU.includes(estado) ? estado : 'normal';
  const id = `tecu-${++instancias}`;
  const lienzo = soloCara ? LIENZO.cara : LIENZO.cuerpo;
  const medida =
    typeof tamano === 'number' && Number.isFinite(tamano) && tamano > 0
      ? `width="${tamano}" height="${Math.round((tamano * lienzo[3]) / lienzo[2])}"`
      : `style="width:${escAttr(tamano)};height:auto"`;
  const texto = etiqueta ?? (DESCRIPCION[e] ? `${ETIQUETA_BASE}, ${DESCRIPCION[e]}` : ETIQUETA_BASE);
  const a11y = decorativo ? 'aria-hidden="true"' : `role="img" aria-label="${escAttr(texto)}"`;
  const clases = `tecu tecu--${e}${soloCara ? ' tecu--cara' : ''}${flotar ? ' tecu--flota' : ''}`;

  return (
    `<svg class="${clases}" id="${id}" viewBox="${lienzo.join(' ')}" ${medida} ${a11y} focusable="false" xmlns="http://www.w3.org/2000/svg">` +
    `<g class="tecu__cuerpo">` +
    patas() +
    cuerpo() +
    alas(e, soloCara) +
    panza() +
    cara(e) +
    birrete() +
    `</g>` +
    extras(e, soloCara) +
    `</svg>`
  );
}
