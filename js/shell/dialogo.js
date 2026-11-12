/**
 * Diálogo modal del cascarón, con el marcado del prototipo (.dialog · .dialog__head ·
 * .dialog__body) sobre el elemento <dialog> nativo: atrapa el foco, se cierra con Esc,
 * con el botón «Cerrar» o tocando el fondo, y devuelve el foco a quien lo abrió.
 *
 *   abrirDialogo({ titulo, cuerpo, ancho = 'md', alCerrar }) →
 *     { elemento, cuerpo, actualizar(html), decir(texto), cerrar(), abierto() }
 *
 * - Misma firma que el `abrirDialogo` de js/ui/dom.js. Mientras dom.js no lo exporte se
 *   usa el respaldo local de este archivo (ver `construir`).
 * - `actualizar` cambia solo el cuerpo y conserva el foco en el mismo control.
 * - `decir` lee un mensaje DENTRO del diálogo: con un modal abierto lo de afuera queda
 *   inerte y las regiones aria-live de la página (#anuncios) no se escuchan.
 * - Solo hay un diálogo del cascarón a la vez: abrir otro cierra el anterior.
 * - Cualquier elemento con [data-cerrar] dentro del diálogo lo cierra.
 */
import * as Dom from '../ui/dom.js';
import { ic } from './componentes.js';

const { html, renderConFoco } = Dom;

let actual = null;
let serie = 0;

/** Primer control útil del cuerpo: el radio elegido, o el primer campo o botón. */
function primerControl(cuerpo) {
  return (
    cuerpo.querySelector('[autofocus]') ||
    cuerpo.querySelector('input[type="radio"]:checked:not(:disabled)') ||
    cuerpo.querySelector('input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), a[href]')
  );
}

/** Respaldo local: arma el <dialog> con el marcado del prototipo. */
function construir({ titulo, cuerpo, ancho }) {
  const dialogo = document.createElement('dialog');
  const idTitulo = `cascaron-dialogo-${++serie}`;
  dialogo.className = `dialog dialog--${ancho === 'sm' ? 'sm' : 'md'}`;
  dialogo.setAttribute('aria-labelledby', idTitulo);
  dialogo.innerHTML = String(html`<div class="dialog__inner">
    <header class="dialog__head">
      <h2 id="${idTitulo}" class="dialog__title">${titulo}</h2>
      <button type="button" class="icon-btn" data-cerrar aria-label="Cerrar">${ic('x', 20)}</button>
    </header>
    <div class="dialog__body">${cuerpo}</div>
  </div>`);
  return dialogo;
}

/**
 * Abre un diálogo modal.
 * @param {{ titulo: string, cuerpo: unknown, ancho?: 'sm'|'md', alCerrar?: () => void }} opciones
 */
export function abrirDialogo({ titulo, cuerpo, ancho = 'md', alCerrar } = {}) {
  cerrarDialogo();
  const previo = document.activeElement;
  const dialogo = construir({ titulo, cuerpo, ancho });
  dialogo.classList.add('dialog--cascaron');
  const cuerpoEl = dialogo.querySelector('.dialog__body') || dialogo;

  // Región de anuncios propia (ver la nota del encabezado).
  const voz = document.createElement('p');
  voz.className = 'sr-only';
  voz.setAttribute('role', 'status');
  voz.setAttribute('aria-live', 'polite');
  voz.setAttribute('aria-atomic', 'true');
  (dialogo.querySelector('.dialog__inner') || dialogo).append(voz);

  let turno = 0;
  const api = {
    elemento: dialogo,
    cuerpo: cuerpoEl,
    /** Reemplaza el cuerpo conservando el foco (por id o data-foco). */
    actualizar(nuevo) {
      renderConFoco(cuerpoEl, nuevo);
    },
    /** Lee un mensaje con el lector de pantalla desde dentro del diálogo. */
    decir(texto) {
      const mio = ++turno;
      voz.textContent = '';
      setTimeout(() => {
        if (mio === turno) voz.textContent = String(texto ?? '');
      }, 60);
    },
    cerrar() {
      if (dialogo.open) dialogo.close();
      else if (dialogo.isConnected) alCierre();
    },
    abierto: () => dialogo.isConnected && dialogo.open,
  };

  let cerrado = false;
  function alCierre() {
    if (cerrado) return;
    cerrado = true;
    dialogo.remove();
    if (actual === api) actual = null;
    try {
      alCerrar?.();
    } catch (error) {
      console.error('[tecu]', error);
    }
    if (previo && previo.isConnected && typeof previo.focus === 'function') previo.focus({ preventScroll: true });
  }

  // Tocar el fondo cierra; arrastrar una selección que termina fuera, no.
  let presionoFondo = false;
  dialogo.addEventListener('pointerdown', (evento) => {
    presionoFondo = evento.target === dialogo;
  });
  dialogo.addEventListener('click', (evento) => {
    if (evento.target.closest?.('[data-cerrar]')) dialogo.close();
    else if (evento.target === dialogo && presionoFondo) dialogo.close();
    presionoFondo = false;
  });
  dialogo.addEventListener('close', alCierre);

  document.body.append(dialogo);
  if (typeof dialogo.showModal === 'function') dialogo.showModal();
  else dialogo.setAttribute('open', ''); // navegadores muy viejos: sin modal, pero se puede usar
  (primerControl(cuerpoEl) || dialogo.querySelector('[data-cerrar]'))?.focus({ preventScroll: true });
  actual = api;
  return api;
}

/** Cierra el diálogo del cascarón que esté abierto (si hay). */
export function cerrarDialogo() {
  actual?.cerrar();
}

/** El diálogo del cascarón abierto, o null. */
export function dialogoAbierto() {
  return actual && actual.abierto() ? actual : null;
}
