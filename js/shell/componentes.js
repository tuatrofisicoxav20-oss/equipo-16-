/**
 * Piezas de interfaz del prototipo «Estudiando Ando» (referencia/estudiando-ando/js/components.js)
 * pasadas a módulos ES. Cada función devuelve html`` seguro, con el MARCADO y las CLASES del
 * prototipo (styles.css las trae todas), y no guarda estado.
 *
 * Las usa el cascarón (js/shell/) y la página «Acerca»; las vistas del estudiante y del
 * docente pueden importarlas para sus pantallas nuevas:
 *   ic · tecuCara · encabezadoPagina · tarjeta · insignia · segmentado · interruptor ·
 *   ciclo · estadoVacio
 */
import { attr, crudo, html } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { tecuSVG } from '../ui/tecu.js';

/* ------------------------------------------------------------------ */
/* Iconos                                                              */
/* ------------------------------------------------------------------ */

/**
 * Icono decorativo de js/ui/iconos.js (trae los del prototipo con sus mismos nombres:
 * 'home', 'wifi-off', 'access'…); su significado siempre va acompañado de texto visible
 * o accesible. El tamaño se da en px de diseño, como en el prototipo, y se fija en rem:
 * crece con la preferencia de tamaño de texto, pero no depende del tamaño de letra del
 * contenedor (así los iconos de la navegación miden lo mismo que en el prototipo).
 * @param {string} nombre
 * @param {number} [tamano=20]
 */
export function ic(nombre, tamano = 20) {
  return crudo(String(icono(nombre, { tamano })).replace(/--icono:([\d.]+)em/, '--icono:$1rem'));
}

/* ------------------------------------------------------------------ */
/* Tecu                                                                */
/* ------------------------------------------------------------------ */

/** Tecu en versión cara, para la marca del encabezado (decorativo: el nombre va al lado). */
export function tecuCara(tamano = 30) {
  try {
    return crudo(tecuSVG({ estado: 'normal', tamano, decorativo: true, cara: true }));
  } catch {
    return crudo('');
  }
}

/** Tecu de cuerpo entero, decorativo, en uno de sus estados. */
export function tecu(estado = 'normal', tamano = 72) {
  try {
    return crudo(tecuSVG({ estado, tamano, decorativo: true }));
  } catch {
    return crudo('');
  }
}

/* ------------------------------------------------------------------ */
/* Estructura de página                                                */
/* ------------------------------------------------------------------ */

/**
 * Encabezado de pantalla con el único <h1> (id="page-title", que el cascarón enfoca
 * al cambiar de pantalla).
 * @param {{ titulo: unknown, entrada?: unknown, acciones?: unknown,
 *   volver?: { href: string, texto: string } | null, antetitulo?: unknown }} opciones
 */
export function encabezadoPagina({ titulo, entrada = '', acciones = '', volver = null, antetitulo = '' }) {
  return html`<header class="page-head">
    ${volver ? html`<a class="back-link" href="${volver.href}">${ic('left', 18)}${volver.texto}</a>` : ''}
    <div class="page-head__row">
      <div class="page-head__text">
        ${antetitulo ? html`<p class="eyebrow">${antetitulo}</p>` : ''}
        <h1 id="page-title" tabindex="-1">${titulo}</h1>
        ${entrada ? html`<p class="lead">${entrada}</p>` : ''}
      </div>
      ${acciones ? html`<div class="page-head__actions">${acciones}</div>` : ''}
    </div>
  </header>`;
}

/**
 * Tarjeta con encabezado opcional. Con `id`, la sección queda nombrada por su título.
 * @param {{ id?: string, titulo?: unknown, icono?: string, aparte?: unknown, cuerpo: unknown,
 *   tono?: ''|'brand'|'accent'|'warn'|'ok', nivel?: 2|3, clase?: string }} opciones
 */
export function tarjeta({ id = '', titulo = '', icono = '', aparte = '', cuerpo, tono = '', nivel = 2, clase = '' }) {
  const idTitulo = id ? `${id}-t` : '';
  const interior = html`${icono ? ic(icono, 20) : ''}<span>${titulo}</span>`;
  const idAttr = attr('id', Boolean(idTitulo), idTitulo);
  const cabeza = titulo
    ? html`<div class="card__head">
        ${nivel === 3
          ? html`<h3 class="card__title"${idAttr}>${interior}</h3>`
          : html`<h2 class="card__title"${idAttr}>${interior}</h2>`}${aparte}
      </div>`
    : '';
  const clases = `card${tono ? ` card--${tono}` : ''}${clase ? ` ${clase}` : ''}`;
  return html`<section class="${clases}"${attr('aria-labelledby', Boolean(idTitulo && titulo), idTitulo)}>${cabeza}${cuerpo}</section>`;
}

/** Insignia de estado: siempre con texto, nunca solo color. */
export function insignia(texto, tono = 'neutral', icono = '') {
  return html`<span class="badge badge--${tono}">${icono ? ic(icono, 14) : ''}${texto}</span>`;
}

/**
 * Ciclo pedagógico: Diagnosticar → … → Reajustar.
 * @param {string[]} pasos
 * @param {number} [actual=-1] índice del paso en curso (-1: ninguno)
 */
export function ciclo(pasos, actual = -1) {
  return html`<ol class="cycle" aria-label="Ciclo de aprendizaje adaptativo">
    ${pasos.map(
      (nombre, i) =>
        html`<li class="cycle__item${i === actual ? ' is-now' : i < actual ? ' is-done' : ''}"${attr('aria-current', i === actual, 'step')}>
          <span class="cycle__n" aria-hidden="true">${i < actual ? ic('check', 14) : i + 1}</span>${nombre}${i === actual
            ? html`<span class="sr-only"> (paso actual)</span>`
            : ''}
        </li>`,
    )}
  </ol>`;
}

/** Estado vacío (o página no encontrada) con Tecu pensando. */
export function estadoVacio({ titulo, texto, accion = '', estado = 'pensando' }) {
  return html`<div class="empty">${tecu(estado, 72)}
    <h2>${titulo}</h2>
    <p>${texto}</p>
    ${accion}
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Formularios                                                         */
/* ------------------------------------------------------------------ */

/**
 * Control segmentado accesible: grupo de radios nativos (las flechas del teclado ya
 * funcionan) con apariencia de botones. Cada radio lleva data-cambio="<cambio>" y, si se
 * da, data-clave="<clave>"; su id es "<nombre>-<valor>".
 * @param {{ nombre: string, leyenda: string, valor: string, cambio: string, clave?: string,
 *   ocultarLeyenda?: boolean, descritoPor?: string,
 *   opciones: { valor: string, texto: string, icono?: string }[] }} opciones
 */
export function segmentado({ nombre, leyenda, opciones, valor, cambio, clave = '', ocultarLeyenda = false, descritoPor = '' }) {
  return html`<fieldset class="segmented"${attr('aria-describedby', Boolean(descritoPor), descritoPor)}>
    <legend class="${ocultarLeyenda ? 'sr-only' : 'segmented__legend'}">${leyenda}</legend>
    <div class="segmented__options">
      ${opciones.map(
        (o) =>
          html`<label class="segmented__opt">
            <input type="radio" name="${nombre}" id="${nombre}-${o.valor}" value="${o.valor}" data-cambio="${cambio}"${attr('data-clave', Boolean(clave), clave)}${attr(
              'checked',
              o.valor === valor,
            )}>
            <span>${o.icono ? ic(o.icono, 18) : ''}${o.texto}</span></label
          >`,
      )}
    </div>
  </fieldset>`;
}

/**
 * Interruptor accesible (checkbox con role="switch"). El nombre accesible es solo la
 * etiqueta; la ayuda se lee como descripción (no dos veces).
 * @param {{ id: string, etiqueta: string, ayuda?: string, marcado?: boolean, cambio: string,
 *   clave?: string, deshabilitado?: boolean }} opciones
 */
export function interruptor({ id, etiqueta, ayuda = '', marcado = false, cambio, clave = '', deshabilitado = false }) {
  return html`<div class="switch">
    <label class="switch__label" for="${id}"
      ><span class="switch__text" id="${id}-t">${etiqueta}</span>${ayuda
        ? html`<span class="switch__hint" id="${id}-h">${ayuda}</span>`
        : ''}</label
    >
    <input class="switch__input" type="checkbox" role="switch" id="${id}" data-cambio="${cambio}"${attr('data-clave', Boolean(clave), clave)} aria-labelledby="${id}-t"${attr(
      'aria-describedby',
      Boolean(ayuda),
      `${id}-h`,
    )}${attr('checked', marcado)}${attr('disabled', deshabilitado)}>
  </div>`;
}
