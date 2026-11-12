/**
 * Utilidades de DOM compartidas por todas las vistas.
 * Pensadas para el patrón state + render() + data-act y para accesibilidad.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto para insertarlo en HTML. */
export function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

class HtmlConfiable {
  constructor(valor) {
    this.valor = String(valor ?? '');
  }

  toString() {
    return this.valor;
  }
}

/** Marca HTML ya armado (o SVG propio) para que html`` no lo escape. */
export function crudo(valor) {
  return valor instanceof HtmlConfiable ? valor : new HtmlConfiable(valor);
}

function convertir(valor) {
  if (valor === null || valor === undefined || valor === false) return '';
  if (valor instanceof HtmlConfiable) return valor.valor;
  if (Array.isArray(valor)) return valor.map(convertir).join('');
  return esc(valor);
}

/**
 * Plantilla segura: escapa todo lo interpolado salvo crudo(...) y otros html``.
 * Los arreglos se concatenan (útil para listas).
 * @returns {HtmlConfiable}
 */
export function html(partes, ...valores) {
  let out = partes[0];
  valores.forEach((v, i) => {
    out += convertir(v) + partes[i + 1];
  });
  return new HtmlConfiable(out);
}

/** Atributo booleano o vacío: ${attr('disabled', cond)} */
export function attr(nombre, condicion, valor = '') {
  if (!condicion) return crudo('');
  return crudo(valor === '' ? ` ${nombre}` : ` ${nombre}="${esc(valor)}"`);
}

let ultimoAnuncio = 0;

/** Lee un mensaje con el lector de pantalla (región aria-live). */
export function anunciar(mensaje, { urgente = false } = {}) {
  const region = document.getElementById(urgente ? 'alertas' : 'anuncios');
  if (!region || !mensaje) return;
  // Vaciar y volver a llenar asegura que se lea aunque el texto se repita.
  region.textContent = '';
  const id = ++ultimoAnuncio;
  setTimeout(() => {
    if (id === ultimoAnuncio) region.textContent = mensaje;
  }, 60);
}

/** Aviso visual breve (toast) que también se anuncia. */
export function aviso(mensaje, { tipo = 'info', duracion = 3500 } = {}) {
  anunciar(mensaje, { urgente: tipo === 'error' });
  const cont = document.getElementById('avisos');
  if (!cont) return;
  const el = document.createElement('div');
  el.className = `aviso aviso--${tipo}`;
  el.textContent = mensaje;
  cont.appendChild(el);
  setTimeout(() => {
    el.classList.add('aviso--saliendo');
    setTimeout(() => el.remove(), 400);
  }, duracion);
}

/** Lleva el foco al título de la pantalla para que el lector de pantalla la anuncie. */
export function enfocarTitulo(raiz = document) {
  const titulo = raiz.querySelector('[data-titulo]') || raiz.querySelector('h1, h2');
  if (!titulo) return;
  if (!titulo.hasAttribute('tabindex')) titulo.setAttribute('tabindex', '-1');
  titulo.focus({ preventScroll: false });
}

/**
 * Delegación de eventos: un clic en [data-act="x"] llama acciones.x(elemento, evento).
 * @returns {() => void} función para quitar el listener
 */
export function delegar(raiz, acciones) {
  const manejador = (evento) => {
    const el = evento.target.closest('[data-act]');
    if (!el || !raiz.contains(el)) return;
    if (el.matches('[aria-disabled="true"], :disabled')) return;
    const fn = acciones[el.dataset.act];
    if (typeof fn === 'function') {
      evento.preventDefault();
      fn(el, evento);
    }
  };
  raiz.addEventListener('click', manejador);
  return () => raiz.removeEventListener('click', manejador);
}

/**
 * Reemplaza el contenido de `raiz` y devuelve el foco al elemento que tenga el
 * mismo [data-foco] (o id) que el que estaba enfocado. Evita que el foco
 * "salte al inicio" con cada render.
 */
export function renderConFoco(raiz, contenido) {
  const activo = document.activeElement;
  const clave = activo && raiz.contains(activo) ? activo.dataset?.foco || (activo.id ? `#${activo.id}` : null) : null;
  const seleccion = activo && 'selectionStart' in activo ? [activo.selectionStart, activo.selectionEnd] : null;
  raiz.innerHTML = String(contenido);
  if (!clave) return;
  const nuevo = clave.startsWith('#') ? raiz.querySelector(clave) : raiz.querySelector(`[data-foco="${CSS.escape(clave)}"]`);
  if (nuevo) {
    nuevo.focus({ preventScroll: true });
    if (seleccion && 'setSelectionRange' in nuevo) {
      try {
        nuevo.setSelectionRange(...seleccion);
      } catch {
        /* algunos tipos de input no lo permiten */
      }
    }
  }
}

/**
 * Diálogo de confirmación accesible con <dialog> (atrapa el foco, Escape cancela).
 * @returns {Promise<boolean>}
 */
export function confirmar({ titulo, mensaje, aceptar = 'Sí', cancelar = 'Cancelar', peligro = false }) {
  return new Promise((resolver) => {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'dialogo';
    dialogo.setAttribute('aria-labelledby', 'dialogo-titulo');
    dialogo.setAttribute('aria-describedby', 'dialogo-mensaje');
    dialogo.innerHTML = String(html`
      <form method="dialog" class="pila">
        <h2 id="dialogo-titulo" class="titulo-2">${titulo}</h2>
        <p id="dialogo-mensaje">${mensaje}</p>
        <div class="fila fila--fin">
          <button class="boton boton--secundario" value="no" type="submit">${cancelar}</button>
          <button class="boton ${peligro ? 'boton--peligro' : 'boton--primario'}" value="si" type="submit">${aceptar}</button>
        </div>
      </form>`);
    const previo = document.activeElement;
    document.body.appendChild(dialogo);
    dialogo.addEventListener('close', () => {
      const ok = dialogo.returnValue === 'si';
      dialogo.remove();
      if (previo && typeof previo.focus === 'function') previo.focus();
      resolver(ok);
    });
    if (typeof dialogo.showModal === 'function') {
      dialogo.showModal();
      dialogo.querySelector('button[value="no"]').focus();
    } else {
      // Navegadores muy viejos: confirm() nativo como respaldo.
      dialogo.remove();
      resolver(window.confirm(`${titulo}\n\n${mensaje}`));
    }
  });
}

/** ¿El usuario pidió menos movimiento (sistema o ajuste de la app)? */
export function movimientoReducido() {
  return (
    document.documentElement.classList.contains('reducir-movimiento') ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/** Pausa (respeta movimiento reducido acortando la espera). */
export function esperar(ms) {
  return new Promise((r) => setTimeout(r, movimientoReducido() ? Math.min(ms, 30) : ms));
}
