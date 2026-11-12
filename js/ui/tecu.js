/**
 * Tecu, el tecolote tutor de Tecu Aprende, dibujado como SVG en línea.
 *
 * - Sin dependencias ni imágenes externas: el dibujo es un texto SVG que se
 *   inserta con crudo(tecuSVG(...)) o innerHTML. Pesa unos pocos KB.
 * - Los colores van en el propio SVG (se ve bien aunque no cargue el CSS);
 *   las animaciones viven en css/tecu.css y se apagan con movimiento reducido.
 * - Se lee bien a 40 px (silueta, ojos grandes, paliacate rojo) y a 160 px
 *   (plumas de la panza, puntos del paliacate, brillos de los ojos).
 *
 * Estados:
 *   normal     parpadea cada ~4 s
 *   feliz      ojos en arco ^^ y alas arriba
 *   pensando   pupilas arriba a un lado y un "?" pequeño
 *   dormido    ojos cerrados y "Z z" ("Tecu se duerme, este lo resuelves tú")
 *   atento     cejas levantadas (después de un error; amable, no regañón)
 *   sin-senal  insignia de nube tachada (sin internet)
 */

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

const ETIQUETA_BASE = 'Tecu, el tecolote';

/** Paleta propia de la mascota (ilustración, no tema de la interfaz). */
const C = Object.freeze({
  contorno: '#3b2210',
  cafe: '#a0652f',
  cafeClaro: '#b8783c',
  cafeOscuro: '#74461f',
  panza: '#f0d19c',
  pluma: '#c38c4f',
  disco: '#f7e6c4',
  iris: '#ffc73a',
  pupila: '#24140a',
  pico: '#f39a2e',
  picoSombra: '#a95a12',
  paliacate: '#d62f3c',
  paliacateOscuro: '#8c1623',
  mejilla: '#f28b82',
  blanco: '#ffffff',
  tinta: '#21456b',
  nube: '#5f6f80',
  tache: '#c62828',
});

const OJOS = [
  { x: 44, y: 50 },
  { x: 76, y: 50 },
];

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

function sombra() {
  return `<ellipse cx="60" cy="114" rx="30" ry="3.6" fill="#000" opacity=".13"/>`;
}

function patas() {
  const pata = (x) =>
    [-5.2, 0, 5.2]
      .map(
        (d, i) =>
          `<ellipse cx="${x + d}" cy="${i === 1 ? 110.6 : 109.6}" rx="3" ry="4.2" fill="${C.pico}" stroke="${C.picoSombra}" stroke-width="1.3"/>`,
      )
      .join('');
  return `<g class="tecu__patas">${pata(47)}${pata(73)}</g>`;
}

/** Cuerpo y cabeza en una sola silueta, con penachos (orejas de plumas). */
function cuerpo() {
  const silueta =
    'M60 22 C67 22 73 21.5 79 19.5 L84.5 11 L87.5 16 L95.5 5.5 ' +
    'C98.5 15 99.5 24 98.2 32 C106 46 106.5 77 99 93 ' +
    'C91.5 106 77 111 60 111 C43 111 28.5 106 21 93 ' +
    'C13.5 77 14 46 21.8 32 C20.5 24 21.5 15 24.5 5.5 ' +
    'L32.5 16 L35.5 11 L41 19.5 C47 21.5 53 22 60 22 Z';
  // Brillo suave en la coronilla para dar volumen.
  const brillo = 'M36 30 C44 24.5 76 24.5 84 30 C76 28.5 44 28.5 36 30 Z';
  return (
    `<path d="${silueta}" fill="${C.cafe}" stroke="${C.contorno}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="${brillo}" fill="${C.cafeClaro}" opacity=".9"/>`
  );
}

function panza() {
  const marcas = [
    [38, 90],
    [82, 90],
    [45, 100],
    [60, 104],
    [75, 100],
  ]
    .map(([x, y]) => `<path d="M${x - 3.6} ${y} Q${x} ${y + 3.8} ${x + 3.6} ${y}"/>`)
    .join('');
  return (
    `<ellipse cx="60" cy="88" rx="27" ry="21" fill="${C.panza}"/>` +
    `<g fill="none" stroke="${C.pluma}" stroke-width="1.7" stroke-linecap="round">${marcas}</g>`
  );
}

/** Paliacate rojo al cuello: banda, triángulo al frente y nudo de lado. */
function paliacate() {
  const banda = 'M27 70.5 Q60 81 93 70.5 L93.5 78 Q60 89 26.5 78 Z';
  const pico = 'M45 80.5 L75 80.5 L61.2 98.5 Q60 100 58.8 98.5 Z';
  const nudo =
    `<path d="M78.5 79 L87 89.5 L81.5 91 Z" fill="${C.paliacate}" stroke="${C.paliacateOscuro}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<path d="M78.5 79 L76.5 92 L72 89.5 Z" fill="${C.paliacate}" stroke="${C.paliacateOscuro}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<circle cx="78.5" cy="78.6" r="3.6" fill="${C.paliacate}" stroke="${C.paliacateOscuro}" stroke-width="1.4"/>`;
  const puntos = [
    [52, 84],
    [60, 84.5],
    [68, 84],
    [56, 89.5],
    [64, 89.5],
    [60, 94.5],
    [36, 76.5],
    [46, 79.6],
    [70, 79.6],
    [86, 75.6],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.25"/>`)
    .join('');
  return (
    `<g class="tecu__paliacate">` +
    `<path d="${banda}" fill="${C.paliacate}" stroke="${C.paliacateOscuro}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="${pico}" fill="${C.paliacate}" stroke="${C.paliacateOscuro}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M48.5 82.5 L71.5 82.5 L60 97" fill="none" stroke="${C.blanco}" stroke-width=".9" stroke-dasharray="1.6 1.8" opacity=".9"/>` +
    `<g fill="${C.blanco}">${puntos}</g>` +
    nudo +
    `</g>`
  );
}

const ALA_IZQ_ABAJO = 'M27 57 C15.5 62 11.5 82 18.5 99.5 C25 97.5 31 88.5 32.2 75 C32.6 66 30.5 60.5 27 57 Z';
/** Ala levantada (feliz): sale del costado y termina en tres plumas redondeadas. */
const ALA_IZQ_ARRIBA =
  'M31.5 76 C23 75.5 14.5 69 10.5 59 C8.2 53.5 6.6 47.5 7.4 42.2 ' +
  'C9.6 40.6 12.4 41.2 13.6 43.4 C14.4 40.8 17.6 40 19.6 42 ' +
  'C20.8 40.4 24 40.6 25 43.4 C26.8 49.5 29 55.5 31.8 60.5 Z';
/** Ala que señala hacia un lado (atento): "mira, aquí". */
const ALA_DER_SENALA =
  'M89.5 76.5 C97 77.5 105.5 73.5 111.5 66.5 C113.8 63.6 114.4 60.8 112.6 59.2 ' +
  'C108 59.4 102.5 60.6 97.5 62.2 C94.2 63.2 91.6 64.4 89.5 65.6 Z';

const PLUMAS_ALA = ['M20.5 84 Q24 87 27.5 84.5', 'M21.5 91 Q24.5 93.5 27 91.5'];
const PLUMAS_ALA_ARRIBA = ['M12.5 52 Q16 55 19.5 53'];
const PLUMAS_ALA_SENALA = ['M99 67.5 Q102 70.5 105 68.5'];

function espejo(d) {
  // Refleja un trazo con coordenadas absolutas respecto al eje vertical x = 60.
  return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${+(120 - Number(x)).toFixed(2)} ${y}`);
}

/** Cada ala va en su propio grupo junto con sus plumas, para que se animen juntas. */
function ala(lado, contorno, plumas) {
  const lineas = plumas.length
    ? `<g fill="none" stroke="${C.contorno}" stroke-width="1.3" stroke-linecap="round" opacity=".55">` +
      plumas.map((d) => `<path d="${d}"/>`).join('') +
      `</g>`
    : '';
  return (
    `<g class="tecu__ala tecu__ala--${lado}">` +
    `<path d="${contorno}" fill="${C.cafeOscuro}" stroke="${C.contorno}" stroke-width="2.4" stroke-linejoin="round"/>` +
    lineas +
    `</g>`
  );
}

function alas(estado) {
  if (estado === 'feliz') {
    return ala('izq', ALA_IZQ_ARRIBA, PLUMAS_ALA_ARRIBA) + ala('der', espejo(ALA_IZQ_ARRIBA), PLUMAS_ALA_ARRIBA.map(espejo));
  }
  const derecha =
    estado === 'atento'
      ? ala('der', ALA_DER_SENALA, PLUMAS_ALA_SENALA)
      : ala('der', espejo(ALA_IZQ_ABAJO), PLUMAS_ALA.map(espejo));
  return ala('izq', ALA_IZQ_ABAJO, PLUMAS_ALA) + derecha;
}

function ojoAbierto({ x, y }, { dx = 0, dy = 0, iris = 12.5, pupila = 7 }) {
  const px = x + dx;
  const py = y + dy;
  return (
    `<circle cx="${x}" cy="${y}" r="${iris}" fill="${C.iris}" stroke="${C.contorno}" stroke-width="2.2"/>` +
    `<circle cx="${px}" cy="${py}" r="${pupila}" fill="${C.pupila}"/>` +
    `<circle cx="${px + 2.5}" cy="${py - 2.7}" r="2.5" fill="${C.blanco}"/>` +
    `<circle cx="${px - 2.4}" cy="${py + 2.6}" r="1.1" fill="${C.blanco}" opacity=".85"/>`
  );
}

function ojos(estado) {
  if (estado === 'feliz') {
    const arcos = OJOS.map(({ x, y }) => `<path d="M${x - 8.5} ${y + 3} Q${x} ${y - 9} ${x + 8.5} ${y + 3}"/>`).join('');
    return `<g class="tecu__ojos" fill="none" stroke="${C.contorno}" stroke-width="3.4" stroke-linecap="round">${arcos}</g>`;
  }
  if (estado === 'dormido') {
    const arcos = OJOS.map(
      ({ x, y }) =>
        `<path d="M${x - 8.5} ${y - 0.5} Q${x} ${y + 7} ${x + 8.5} ${y - 0.5}"/>` +
        `<path d="M${x - 6} ${y + 3.6} l-2 2.4 M${x} ${y + 4.6} l0 2.8 M${x + 6} ${y + 3.6} l2 2.4" stroke-width="1.6"/>`,
    ).join('');
    return `<g class="tecu__ojos" fill="none" stroke="${C.contorno}" stroke-width="3" stroke-linecap="round">${arcos}</g>`;
  }
  const mirada = {
    normal: { dx: 0.6, dy: 0.8 },
    pensando: { dx: 3.6, dy: -4.4 },
    atento: { dx: 0, dy: 0.4, iris: 13.2, pupila: 6.2 },
    'sin-senal': { dx: 2.6, dy: 2.4 },
  }[estado] || { dx: 0, dy: 0 };
  return `<g class="tecu__ojos">${OJOS.map((o) => ojoAbierto(o, mirada)).join('')}</g>`;
}

function cejas(estado) {
  const trazo = `fill="none" stroke="${C.contorno}" stroke-width="3" stroke-linecap="round"`;
  if (estado === 'atento') {
    return (
      `<g class="tecu__cejas" ${trazo}>` +
      '<path d="M33 31.5 Q43.5 24 54 30"/><path d="M66 30 Q76.5 24 87 31.5"/>' +
      '</g>'
    );
  }
  if (estado === 'pensando') {
    return `<g class="tecu__cejas" ${trazo}><path d="M35.5 35.5 Q44 32.6 52.5 35"/><path d="M66 30.5 Q76.5 24.5 87 31"/></g>`;
  }
  return '';
}

function cara(estado) {
  const mejillas =
    estado === 'feliz' || estado === 'dormido'
      ? `<g fill="${C.mejilla}" opacity=".55"><ellipse cx="32" cy="63" rx="5.2" ry="3.2"/><ellipse cx="88" cy="63" rx="5.2" ry="3.2"/></g>`
      : '';
  const pico =
    `<path d="M54.2 59 Q60 55.6 65.8 59 Q63.8 66.4 60 71.6 Q56.2 66.4 54.2 59 Z" fill="${C.pico}" stroke="${C.picoSombra}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<path d="M57 59.6 Q60 58.2 63 59.6" fill="none" stroke="${C.blanco}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`;
  return (
    `<g class="tecu__cara">` +
    `<circle cx="44" cy="50" r="18" fill="${C.disco}"/><circle cx="76" cy="50" r="18" fill="${C.disco}"/>` +
    mejillas +
    ojos(estado) +
    cejas(estado) +
    pico +
    `</g>`
  );
}

/* ------------------------------------------------------------------ */
/* Extras por estado                                                    */
/* ------------------------------------------------------------------ */

const TEXTO_SVG = 'font-family="system-ui, -apple-system, \'Segoe UI\', Roboto, sans-serif" font-weight="800" text-anchor="middle"';

function duda() {
  return (
    `<g class="tecu__duda">` +
    `<circle cx="93" cy="34" r="2" fill="${C.blanco}" stroke="${C.contorno}" stroke-width="1.3"/>` +
    `<circle cx="98" cy="27.5" r="3" fill="${C.blanco}" stroke="${C.contorno}" stroke-width="1.4"/>` +
    `<circle cx="107" cy="15" r="10.5" fill="${C.blanco}" stroke="${C.contorno}" stroke-width="1.8"/>` +
    `<text x="107" y="20.4" font-size="15" fill="${C.tinta}" ${TEXTO_SVG}>?</text>` +
    `</g>`
  );
}

function zetas() {
  const estilo = `fill="${C.tinta}" stroke="${C.blanco}" stroke-width="3" stroke-linejoin="round" paint-order="stroke" ${TEXTO_SVG}`;
  return (
    `<g class="tecu__zetas">` +
    `<text class="tecu__z tecu__z--1" x="99" y="33" font-size="17" ${estilo}>Z</text>` +
    `<text class="tecu__z tecu__z--2" x="110" y="18" font-size="12" ${estilo}>z</text>` +
    `</g>`
  );
}

function sinSenal() {
  const nube = 'M91.6 103.4 A4.2 4.2 0 0 1 92.4 95.1 A6.2 6.2 0 0 1 104.2 93.9 A4.8 4.8 0 0 1 106.4 103.4 Z';
  return (
    `<g class="tecu__insignia">` +
    `<circle cx="99" cy="98" r="15" fill="${C.blanco}" stroke="${C.contorno}" stroke-width="2"/>` +
    `<path d="${nube}" fill="${C.nube}"/>` +
    `<path d="M89.5 108.5 L108.5 87.5" stroke="${C.blanco}" stroke-width="5.4" stroke-linecap="round"/>` +
    `<path d="M89.5 108.5 L108.5 87.5" stroke="${C.tache}" stroke-width="2.8" stroke-linecap="round"/>` +
    `</g>`
  );
}

function extras(estado) {
  if (estado === 'pensando') return duda();
  if (estado === 'dormido') return zetas();
  if (estado === 'sin-senal') return sinSenal();
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
 * @param {number|string} [opciones.tamano=96] lado en px (número) o una medida CSS ('6rem')
 * @param {string} [opciones.etiqueta] texto para el lector de pantalla. Si no se da,
 *   se usa "Tecu, el tecolote" más el estado ("Tecu, el tecolote, feliz").
 * @param {boolean} [opciones.decorativo=false] true = el lector de pantalla lo ignora
 *   (úsalo cuando el texto de al lado ya dice lo mismo).
 * @returns {string} SVG listo para insertar con crudo() o innerHTML
 */
export function tecuSVG({ estado = 'normal', tamano = 96, etiqueta, decorativo = false } = {}) {
  const e = ESTADOS_TECU.includes(estado) ? estado : 'normal';
  const id = `tecu-${++instancias}`;
  const medida =
    typeof tamano === 'number' && Number.isFinite(tamano)
      ? `width="${tamano}" height="${tamano}"`
      : `style="width:${escAttr(tamano)};height:${escAttr(tamano)}"`;
  const texto = etiqueta ?? (DESCRIPCION[e] ? `${ETIQUETA_BASE}, ${DESCRIPCION[e]}` : ETIQUETA_BASE);
  const a11y = decorativo ? 'aria-hidden="true"' : `role="img" aria-label="${escAttr(texto)}"`;
  // Cabeza ladeada en algunos estados (transform del SVG, aparte de las animaciones CSS).
  const ladeo = { pensando: 'rotate(-5 60 110)', dormido: 'rotate(4 60 110)' }[e];

  return (
    `<svg class="tecu tecu--${e}" id="${id}" viewBox="0 0 120 120" ${medida} ${a11y} focusable="false" xmlns="http://www.w3.org/2000/svg">` +
    sombra() +
    `<g class="tecu__postura"${ladeo ? ` transform="${ladeo}"` : ''}>` +
    `<g class="tecu__cuerpo">` +
    patas() +
    cuerpo() +
    panza() +
    paliacate() +
    alas(e) +
    cara(e) +
    `</g></g>` +
    extras(e) +
    `</svg>`
  );
}
