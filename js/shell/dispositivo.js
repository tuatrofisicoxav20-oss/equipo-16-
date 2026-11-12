/**
 * Control «Vista» de la demostración: automática, móvil o escritorio (igual que en el
 * prototipo de interfaz).
 *
 * - Automática: la app se adapta a la pantalla real (por defecto).
 * - Móvil en pantalla ancha: la app se muestra dentro de un marco de teléfono (un iframe
 *   de 390 px con la misma dirección), así se comporta exactamente como en un celular.
 * - Escritorio en pantalla angosta: en teléfonos y tabletas se amplía el viewport (como
 *   «ver versión de escritorio»); en una ventana angosta de computadora se muestra un
 *   escritorio de 1280 px reducido para que quepa.
 *
 * La preferencia (`dispositivo`: auto | movil | escritorio) vive en js/services/preferencias.js.
 * Dentro de un marco (el de esta vista o los del modo presentación) siempre es la app tal cual.
 */
import { html } from '../ui/dom.js';
import { MARCA } from '../marca.js';
import { ic, segmentado, tecuCara } from './componentes.js';

export const ANCHO_ESCRITORIO = 1280;

/** ¿Esta página está dentro de un iframe? */
export const EN_MARCO = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const consulta = (texto) => {
  try {
    return window.matchMedia(texto);
  } catch {
    return { matches: false, addEventListener() {}, removeEventListener() {} };
  }
};

const medios = {
  cabeTelefono: consulta('(min-width: 30em)'),
  escritorio: consulta('(min-width: 60em)'),
  tactil: consulta('(pointer: coarse)'),
};

/** Lo que se anuncia al cambiar de vista. */
export const TEXTO_VISTA = Object.freeze({
  auto: 'Vista automática: se adapta al tamaño de tu pantalla.',
  movil: 'Vista móvil activada.',
  escritorio: 'Vista de escritorio activada.',
});

/**
 * Cómo se dibuja la página: 'app' (sin marco), 'phone' (marco de teléfono) o 'desktop'
 * (escritorio reducido). Los nombres son los de las clases del prototipo (.device--phone…).
 * @param {'auto'|'movil'|'escritorio'} dispositivo
 */
export function modoDeVista(dispositivo) {
  if (EN_MARCO || dispositivo === 'auto' || !dispositivo) return 'app';
  if (dispositivo === 'movil') return medios.cabeTelefono.matches ? 'phone' : 'app';
  return medios.escritorio.matches || medios.tactil.matches ? 'app' : 'desktop';
}

/**
 * En pantallas táctiles con vista de escritorio se ensancha el viewport y se ajusta el
 * zoom para que quepa completo (se puede ampliar con los dedos).
 */
export function aplicarViewport(dispositivo) {
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  const ancho = !EN_MARCO && dispositivo === 'escritorio' && medios.tactil.matches;
  const ajuste = Math.min(1, (window.screen?.width || ANCHO_ESCRITORIO) / ANCHO_ESCRITORIO).toFixed(3);
  const contenido = ancho
    ? `width=${ANCHO_ESCRITORIO}, initial-scale=${ajuste}, viewport-fit=cover`
    : 'width=device-width, initial-scale=1, viewport-fit=cover';
  if (meta.getAttribute('content') !== contenido) meta.setAttribute('content', contenido);
}

/** Avisa cuando cambia algo de la pantalla que puede cambiar el modo (ancho, tipo de puntero, giro). */
export function alCambiarPantalla(fn) {
  const lista = Object.values(medios);
  for (const m of lista) m.addEventListener?.('change', fn);
  window.addEventListener('orientationchange', fn);
  return () => {
    for (const m of lista) m.removeEventListener?.('change', fn);
    window.removeEventListener('orientationchange', fn);
  };
}

/** El control «Vista» (no se muestra dentro de un marco). */
export function controlVista(valor) {
  if (EN_MARCO) return '';
  return segmentado({
    nombre: 'dispositivo',
    leyenda: 'Vista',
    cambio: 'dispositivo',
    valor,
    opciones: [
      { valor: 'auto', texto: 'Automática', icono: 'compass' },
      { valor: 'movil', texto: 'Móvil', icono: 'phone' },
      { valor: 'escritorio', texto: 'Escritorio', icono: 'monitor' },
    ],
  });
}

const NOMBRE = { phone: 'vista móvil', desktop: 'vista de escritorio' };
const TITULO = { phone: 'Vista móvil', desktop: 'Vista de escritorio' };

/** Título de la pestaña del navegador mientras se ve el escenario. */
export const tituloEscenario = (modo) => TITULO[modo] || '';
export const nombreEscenario = (modo) => NOMBRE[modo] || '';

/** Texto e instrucciones junto al marco (se vuelve a pintar sin recargar el iframe). */
export function htmlIntroEscenario(modo, dispositivo) {
  const telefono = modo === 'phone';
  return html`<h1 id="page-title" class="stage__title" tabindex="-1">${TITULO[modo]}</h1>
    <p>
      ${telefono
        ? `Así se ve ${MARCA.nombre} en un teléfono de 390 × 844 px. Úsala con normalidad: dentro del marco puedes navegar, responder y escribir.`
        : `Así se ve ${MARCA.nombre} en una pantalla de computadora de ${ANCHO_ESCRITORIO} px de ancho, reducida para que quepa en tu ventana.`}
    </p>
    ${controlVista(dispositivo)}
    <p class="stage__note">
      ${ic('info', 18)}<span
        >Tus respuestas y ajustes se comparten entre las vistas. Elige «Automática» para volver a la vista que
        corresponde a tu pantalla.</span
      >
    </p>`;
}

/**
 * Escenario completo: encabezado propio, instrucciones y el marco con la app.
 * @param {'phone'|'desktop'} modo
 * @param {{ dispositivo: string, src: string }} opciones `src`: dirección de la app (consulta + hash)
 */
export function htmlEscenario(modo, { dispositivo, src }) {
  return html`<div class="stage" data-stage="${modo}">
    <header class="topbar" role="banner">
      <span class="brand">
        <span class="brand__mark">${tecuCara(30)}</span>
        <span class="brand__text">${MARCA.nombre}<span class="brand__sub">Demostración · ${NOMBRE[modo]}</span></span>
      </span>
      <div class="topbar__actions">
        <button type="button" class="btn btn--ghost-inverse btn--icon-label" data-act="accesibilidad" data-foco="accesibilidad" aria-haspopup="dialog">
          ${ic('access', 20)}<span class="hide-sm">Accesibilidad</span><span class="sr-only show-sm">Accesibilidad</span>
        </button>
      </div>
    </header>
    <main id="contenido" class="stage__main" tabindex="-1">
      <div class="stage__intro" id="stage-intro">${htmlIntroEscenario(modo, dispositivo)}</div>
      <div class="device device--${modo}">
        <iframe id="device-frame" class="device__frame" src="${src}" title="${MARCA.nombre} en ${NOMBRE[modo]}"></iframe>
      </div>
    </main>
  </div>`;
}

/** Calcula la escala del escritorio reducido para que el iframe de 1280 px quepa en su caja. */
export function ajustarEscritorio(raiz) {
  const caja = raiz.querySelector('.device--desktop');
  if (caja) caja.style.setProperty('--scale', String(caja.clientWidth / ANCHO_ESCRITORIO));
}
