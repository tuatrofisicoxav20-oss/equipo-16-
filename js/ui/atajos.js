/**
 * Atajos de teclado para quien presenta (modo pitch, ?vista=pitch).
 *
 *   Tecla     Qué hace                                                 Llama a
 *   1 … 6     Ir a ese paso del guion (GUIDE de js/data/guiones.js):   paso(n, id)
 *               1 El problema · 2 Ana y Luis · 3 Rutas distintas ·
 *               4 Modo avión · 5 Sincronización · 6 Panel docente
 *   A         Reproducir a Ana                                         ana()
 *   L         Reproducir a Luis                                        luis()
 *   M         Modo avión (los dos teléfonos sin internet / con él)     avion()
 *   F         Modo libre (un juez escribe su propia ecuación)          libre()
 *   R         Reiniciar la demo: antes pide confirmación con           reiniciar()
 *             confirmar() y solo reinicia si dicen que sí
 *   ? (o ¿)   Abrir o cerrar la ayuda: <dialog> con la tabla de atajos  mostrarAyuda(), y avisa con ayuda()
 *   Esc       Cierra la ayuda (y la diapositiva «El problema», que escucha su propio Esc)
 *
 * Las letras valen en mayúscula o minúscula. Un atajo NO se dispara:
 *   - con Ctrl, Alt (también AltGr) o Cmd/Meta: no chocan con los atajos del navegador;
 *   - si la tecla se queda apretada (repetición) o se está escribiendo con un IME;
 *   - con el foco en un campo de texto: input de texto, textarea, select, contenteditable o
 *     role=textbox|searchbox|combobox|spinbutton (ahí cada tecla es lo que se escribe);
 *   - con el foco dentro de un iframe: los teléfonos y el panel reciben sus propias teclas;
 *   - con un diálogo modal abierto (confirmación, modo libre, ficha): con la ayuda abierta solo ? la cierra;
 *   - si otro código ya atendió la tecla (evento.defaultPrevented).
 * Cada atajo anuncia lo que hizo con anunciar() de dom.js (región aria-live), para quien presenta
 * con lector de pantalla. Si una acción devuelve un texto (o una promesa que termina en texto), se
 * anuncia ese texto en lugar del mensaje de siempre; útil para «Modo avión: teléfonos sin internet».
 *
 *   instalarAtajos({ paso, ana, luis, avion, libre, reiniciar, ayuda }) → { quitar(), mostrarAyuda() }
 *
 * Todas las acciones son opcionales: la tecla de una acción que no llegó no hace nada y no aparece
 * en la ayuda. Hay una sola instalación a la vez: instalar otra vez quita la anterior.
 */
import { GUIDE } from '../data/guiones.js';
import { html, crudo, anunciar, confirmar } from './dom.js';
import { icono } from './iconos.js';

/** Pasos del guion que se alcanzan con los números (1 a 9 como máximo). */
const PASOS = Object.freeze(GUIDE.slice(0, 9).map((p, i) => Object.freeze({ n: i + 1, id: p.id, titulo: p.titulo })));

/** Letras de la demo, en el orden en que aparecen en la ayuda. */
const LETRAS = Object.freeze([
  { tecla: 'a', accion: 'ana', ayuda: 'Reproducir a Ana', anuncio: 'Reproduciendo a Ana.' },
  { tecla: 'l', accion: 'luis', ayuda: 'Reproducir a Luis', anuncio: 'Reproduciendo a Luis.' },
  { tecla: 'm', accion: 'avion', ayuda: 'Modo avión: quitar o devolver el internet a los teléfonos', anuncio: 'Cambiando el modo avión de los teléfonos.' },
  { tecla: 'f', accion: 'libre', ayuda: 'Modo libre: un juez escribe su propia ecuación', anuncio: 'Abriendo el modo libre.' },
  { tecla: 'r', accion: 'reiniciar', ayuda: 'Reiniciar la demo (pide confirmación)', anuncio: 'Reiniciando la demo.' },
]);

const TECLAS_AYUDA = new Set(['?', '¿']);

/**
 * Tecla de cada acción, para mostrarla junto a los botones del pitch (p. ej. en aria-keyshortcuts).
 * Es la misma que se lista en la ayuda.
 */
export const TECLAS = Object.freeze({
  pasos: Object.freeze(PASOS.map((p) => String(p.n))),
  ...Object.fromEntries(LETRAS.map((d) => [d.accion, d.tecla.toUpperCase()])),
  ayuda: '?',
});

const TIPOS_SIN_TEXTO = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']);
const ROLES_DE_TEXTO = '[role="textbox"], [role="searchbox"], [role="combobox"], [role="spinbutton"]';

/**
 * ¿En este elemento se escribe? (ahí las teclas son texto, no atajos).
 * @param {Element|null} el
 * @returns {boolean}
 */
export function esCampoDeTexto(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.isContentEditable) return true;
  const nombre = el.localName;
  if (nombre === 'textarea' || nombre === 'select') return true;
  if (nombre === 'input') return !TIPOS_SIN_TEXTO.has(String(el.type || 'text').toLowerCase());
  return typeof el.closest === 'function' && Boolean(el.closest(ROLES_DE_TEXTO));
}

/**
 * ¿Hay un <dialog> modal abierto? (lo de atrás está inerte: ningún atajo debe actuar ahí).
 * @param {Document} [doc]
 * @returns {boolean}
 */
export function hayDialogoModal(doc = document) {
  try {
    return Boolean(doc.querySelector('dialog:modal'));
  } catch {
    return Boolean(doc.querySelector('dialog[open]')); // navegadores sin :modal
  }
}

/** Elemento enfocado, entrando a shadow roots abiertos. */
function enfocadoProfundo(doc = document) {
  let el = doc.activeElement;
  while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
  return el;
}

/** ¿El foco está en un iframe (o algo que trae otro documento)? Ese documento recibe sus teclas. */
function focoEnMarco(doc = document) {
  const activo = doc.activeElement;
  return Boolean(activo && /^(iframe|frame|object|embed)$/.test(activo.localName));
}

/** Atajo que corresponde a una tecla, o null. */
function atajoDe(tecla) {
  if (TECLAS_AYUDA.has(tecla)) return { tipo: 'ayuda' };
  if (/^[1-9]$/.test(tecla)) {
    const paso = PASOS[Number(tecla) - 1];
    return paso ? { tipo: 'paso', paso } : null;
  }
  const letra = LETRAS.find((d) => d.tecla === tecla);
  return letra ? { tipo: 'letra', letra } : null;
}

const esFuncion = (fn) => typeof fn === 'function';

/**
 * Llama a una acción y anuncia lo que hizo: el texto que devuelva o, si no, `anuncio`.
 * Los errores van a la consola: un atajo nunca rompe la presentación.
 */
function llamar(fn, args, anuncio) {
  let resultado;
  try {
    resultado = fn(...args);
  } catch (error) {
    console.error(error);
    return;
  }
  anunciar(typeof resultado === 'string' && resultado.trim() ? resultado : anuncio);
  if (resultado && typeof resultado.then === 'function') {
    resultado.then(
      (final) => {
        if (typeof final === 'string' && final.trim()) anunciar(final);
      },
      (error) => console.error(error),
    );
  }
}

let contador = 0;
let instalada = null;

/* ------------------------------------------------------------------ */
/* Ayuda                                                               */
/* ------------------------------------------------------------------ */

function htmlAyuda(id, acciones) {
  const fila = (tecla, texto) => html`<tr><th scope="row"><kbd>${tecla}</kbd></th><td>${texto}</td></tr>`;
  const tabla = (titulo, filas) =>
    filas.length
      ? html`<table class="atajos__tabla">
          <caption>${titulo}</caption>
          <thead><tr><th scope="col">Tecla</th><th scope="col">Qué hace</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>`
      : '';
  const pasos = esFuncion(acciones.paso) ? PASOS.map((p) => fila(String(p.n), p.titulo)) : [];
  const demo = [
    ...LETRAS.filter((d) => esFuncion(acciones[d.accion])).map((d) => fila(d.tecla.toUpperCase(), d.ayuda)),
    fila('?', 'Abrir o cerrar esta ayuda'),
    fila('Esc', 'Cerrar esta ayuda o la diapositiva'),
  ];
  return html`
    <div class="atajos__marco pila">
      <h2 class="titulo-2 atajos__titulo" id="${id}-titulo" tabindex="-1" data-titulo>${crudo(icono('proyector'))}<span>Atajos de teclado</span></h2>
      <p class="atajos__intro" id="${id}-intro">
        Para quien presenta. Funcionan cuando el foco no está en un campo de texto ni dentro de los teléfonos o del
        panel: si no responden, haz clic en un espacio vacío de la página. No usan Ctrl, Alt ni Cmd.
      </p>
      <div class="atajos__tablas">
        ${tabla('Pasos del guion', pasos)}
        ${tabla('Demo', demo)}
      </div>
      <div class="fila fila--fin">
        <button type="button" class="boton boton--primario" data-act="cerrar">Cerrar</button>
      </div>
    </div>`;
}

/** Abre la ayuda (o la vuelve a enfocar si ya está abierta). */
function abrirAyuda(est) {
  if (!est.activo) return null;
  if (est.ayuda && est.ayuda.open) {
    est.ayuda.querySelector('[data-titulo]')?.focus();
    return est.ayuda;
  }
  const id = `atajos-${++contador}`;
  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialogo dialogo--ancho atajos';
  dialogo.setAttribute('aria-labelledby', `${id}-titulo`);
  dialogo.setAttribute('aria-describedby', `${id}-intro`);
  dialogo.innerHTML = String(htmlAyuda(id, est.acciones));

  const activo = document.activeElement;
  const previo = activo && activo !== document.body && activo !== document.documentElement ? activo : null;
  let empezoFuera = false;
  const fuera = (e) => {
    if (e.target !== dialogo) return false;
    const r = dialogo.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  dialogo.addEventListener('pointerdown', (e) => {
    empezoFuera = fuera(e);
  });
  dialogo.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="cerrar"]')) dialogo.close();
    else if (empezoFuera && fuera(e)) dialogo.close(); // tocar el fondo oscuro también cierra
    empezoFuera = false;
  });
  dialogo.addEventListener('close', () => {
    dialogo.remove();
    if (est.ayuda === dialogo) est.ayuda = null;
    if (previo && previo.isConnected && typeof previo.focus === 'function') previo.focus({ preventScroll: true });
  });

  document.body.appendChild(dialogo);
  est.ayuda = dialogo;
  if (typeof dialogo.showModal === 'function') dialogo.showModal();
  else dialogo.setAttribute('open', '');
  dialogo.querySelector('[data-titulo]')?.focus();

  if (esFuncion(est.acciones.ayuda) && !est.avisandoAyuda) {
    // Solo avisa (p. ej. para registrar); si la vista vuelve a llamar a mostrarAyuda() aquí, no se repite.
    est.avisandoAyuda = true;
    try {
      est.acciones.ayuda();
    } catch (error) {
      console.error(error);
    } finally {
      est.avisandoAyuda = false;
    }
  }
  return dialogo;
}

function cerrarAyuda(est) {
  const dialogo = est.ayuda;
  if (!dialogo) return;
  if (dialogo.open && typeof dialogo.close === 'function') dialogo.close(); // el evento 'close' limpia y devuelve el foco
  else {
    dialogo.remove();
    est.ayuda = null;
  }
}

/* ------------------------------------------------------------------ */
/* Reiniciar (con confirmación)                                        */
/* ------------------------------------------------------------------ */

async function pedirReinicio(est) {
  est.confirmando = true;
  try {
    const si = await confirmar({
      titulo: '¿Reiniciar la demo?',
      mensaje: 'Ana, Luis y el panel docente vuelven al estado inicial. Se borra lo que se hizo durante la demo.',
      aceptar: 'Sí, reiniciar',
      cancelar: 'Cancelar',
      peligro: true,
    });
    if (!est.activo) return; // quitaron los atajos mientras se decidía
    if (si) llamar(est.acciones.reiniciar, [], 'Reiniciando la demo.');
    else anunciar('Reinicio cancelado.');
  } catch (error) {
    console.error(error);
  } finally {
    est.confirmando = false;
  }
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Instala los atajos del presentador en el documento.
 *
 * @param {{
 *   paso?: (n: number, id: string) => any,   // 1 … 6: n del paso y su id de GUIDE ('problema', 'diagnostico', …)
 *   ana?: () => any,                         // A
 *   luis?: () => any,                        // L
 *   avion?: () => any,                       // M
 *   libre?: () => any,                       // F
 *   reiniciar?: () => any,                   // R, solo después de confirmar
 *   ayuda?: () => void,                      // aviso: se abrió la ayuda (la ayuda la dibuja este módulo)
 * }} [acciones] cada una puede devolver un texto (o una promesa de texto) para anunciar
 * @returns {{ quitar: () => void, mostrarAyuda: () => HTMLDialogElement|null }}
 */
export function instalarAtajos(acciones = {}) {
  if (instalada) instalada.api.quitar();

  const est = {
    acciones: { ...(acciones || {}) },
    activo: true,
    ayuda: null,
    avisandoAyuda: false,
    confirmando: false,
    api: null,
  };

  const alPresionar = (evento) => {
    if (!est.activo || evento.defaultPrevented || evento.repeat || evento.isComposing) return;
    if (evento.ctrlKey || evento.altKey || evento.metaKey) return;
    const tecla = typeof evento.key === 'string' && evento.key.length === 1 ? evento.key.toLowerCase() : '';
    const atajo = tecla && atajoDe(tecla);
    if (!atajo) return;
    const objetivo = (typeof evento.composedPath === 'function' && evento.composedPath()[0]) || evento.target;
    if (esCampoDeTexto(objetivo) || esCampoDeTexto(enfocadoProfundo()) || focoEnMarco()) return;

    if (hayDialogoModal()) {
      // Detrás de un diálogo modal nada responde. Con la ayuda abierta, ? (o ¿) la cierra.
      if (atajo.tipo === 'ayuda' && est.ayuda && est.ayuda.open) {
        evento.preventDefault();
        cerrarAyuda(est);
      }
      return;
    }
    if (est.confirmando) return;

    if (atajo.tipo === 'ayuda') {
      evento.preventDefault();
      abrirAyuda(est);
      return;
    }
    if (atajo.tipo === 'paso') {
      if (!esFuncion(est.acciones.paso)) return;
      evento.preventDefault();
      const { n, id, titulo } = atajo.paso;
      llamar(est.acciones.paso, [n, id], `Paso ${n} de ${PASOS.length}: ${titulo}.`);
      return;
    }
    const { accion, anuncio } = atajo.letra;
    if (!esFuncion(est.acciones[accion])) return;
    evento.preventDefault();
    if (accion === 'reiniciar') pedirReinicio(est);
    else llamar(est.acciones[accion], [], anuncio);
  };

  document.addEventListener('keydown', alPresionar);

  est.api = {
    /** Quita los atajos y cierra la ayuda si está abierta. Se puede llamar varias veces. */
    quitar() {
      if (!est.activo) return;
      est.activo = false;
      document.removeEventListener('keydown', alPresionar);
      cerrarAyuda(est);
      if (instalada === est) instalada = null;
    },
    /** Abre la ayuda con la tabla de atajos (p. ej. desde un botón «Atajos» del pitch). */
    mostrarAyuda() {
      return abrirAyuda(est);
    },
  };
  instalada = est;
  return est.api;
}
