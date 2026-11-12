/**
 * Diapositiva «El problema» del modo presentación (paso 1 del guion, ?vista=pitch).
 *
 *   mostrarDiapositiva(contenedor, { contexto, onCerrar }) → { cerrar(), elemento, faltaFuente }
 *
 * Qué muestra (para leerse a distancia en el proyector):
 *   - La estadística de packs/contexto.json, la ÚNICA permitida: aquí no se escribe ningún dato.
 *     El porcentaje del texto va enorme («Solo» · «25.4 %» · «de las escuelas…») y la fuente debajo.
 *     Si el archivo trae más estadísticas, van abajo en chico, cada una con su fuente.
 *   - Tecu atento, señalando la cifra, y la frase del producto: «Tecu Aprende funciona sin internet y
 *     le dice al docente en qué se equivocó cada quien».
 *   - Botón «Continuar» (1 clic). Escape hace lo mismo.
 *
 * Fuente vacía: el público NO ve «fuente pendiente» ni nada parecido. Solo aparece, en la esquina de
 * arriba a la derecha, un recuadro discreto con la clase .solo-presentador («Falta la fuente: llénala en
 * packs/contexto.json antes de presentar») y un console.warn. Con la fuente llena, el recuadro no existe.
 *
 * Cómo se monta:
 *   - Se dibuja ENCIMA de lo que ya tenga el contenedor (los teléfonos y el panel siguen vivos debajo,
 *     pero quedan `inert` mientras tanto para que el foco no se esconda detrás). Si el contenedor es
 *     position: static, se vuelve relative mientras dura la diapositiva. Todo se mide con el tamaño del
 *     contenedor (container queries, css/diapositiva.css): la cifra se ve igual de grande en 1366×768
 *     que en 1920×1080, y en un contenedor angosto todo se apila.
 *   - Al abrir, el foco va al título (enfocarTitulo). «Continuar» y Escape la cierran, devuelven el foco a
 *     donde estaba y llaman a onCerrar({ motivo: 'continuar' | 'escape' }).
 *   - cerrar() la quita SIN llamar a onCerrar: es para cuando la vista cambia de paso por su cuenta, así
 *     un cambio de paso nunca dispara otro. Se puede llamar varias veces.
 *   - Escape no la cierra si hay un diálogo modal abierto (primero se cierra ese) ni si el foco está en un
 *     campo de texto fuera de ella.
 *   - Una sola por contenedor: si se vuelve a llamar, la anterior se quita (sin onCerrar).
 *   - Entra con una animación sutil (aparece y sube un poco); con movimiento reducido no se mueve nada.
 */
import { GUIDE } from '../data/guiones.js';
import { html, crudo, delegar, enfocarTitulo } from './dom.js';
import { icono } from './iconos.js';
import { tecuSVG } from './tecu.js';
import { esCampoDeTexto, hayDialogoModal } from './atajos.js';

const TITULO = GUIDE.find((p) => p.id === 'problema')?.titulo || 'El problema';
const ARCHIVO = 'packs/contexto.json';
const PORCENTAJE = /(\d+(?:[.,]\d+)?)\s*%/;
const NBSP = ' ';

let contador = 0;
/** contenedor → diapositiva abierta en él */
const abiertas = new WeakMap();

/* ------------------------------------------------------------------ */
/* Datos                                                               */
/* ------------------------------------------------------------------ */

/** Quita espacios y un «Fuente:» repetido al inicio (por si lo copiaron con todo y etiqueta). */
function limpiarFuente(fuente) {
  return typeof fuente === 'string' ? fuente.trim().replace(/^fuente\s*:\s*/i, '').trim() : '';
}

/** Estadísticas que se pueden mostrar (las que traen texto), en el orden del archivo. */
function leerEstadisticas(contexto) {
  const lista = Array.isArray(contexto?.estadisticas) ? contexto.estadisticas : [];
  return lista
    .filter((e) => e && typeof e.texto === 'string' && e.texto.trim())
    .map((e, i) => ({ id: String(e.id || `estadistica-${i + 1}`), texto: e.texto.trim(), fuente: limpiarFuente(e.fuente) }));
}

/** «Solo 25.4 % de las…» → { antes: 'Solo', numero: '25.4', despues: 'de las…' }; null si no hay porcentaje. */
function partirCifra(texto) {
  const m = PORCENTAJE.exec(texto);
  if (!m) return null;
  return { antes: texto.slice(0, m.index).trim(), numero: m[1], despues: texto.slice(m.index + m[0].length).trim() };
}

/** Lo que solo debe ver quien presenta (HTML) y lo mismo para la consola. */
function pendientes(contexto, estadisticas) {
  const archivo = html`<code>${ARCHIVO}</code>`;
  if (!contexto || typeof contexto !== 'object') {
    return [{ nota: html`No se pudo leer ${archivo}: la diapositiva va sin la estadística.`, consola: `No llegó ${ARCHIVO}: la diapositiva «${TITULO}» va sin estadística.` }];
  }
  if (!estadisticas.length) {
    return [{ nota: html`${archivo} no trae ninguna estadística con texto.`, consola: `${ARCHIVO} no trae estadísticas: la diapositiva «${TITULO}» va sin cifra.` }];
  }
  const sinFuente = estadisticas.filter((e) => !e.fuente);
  if (!sinFuente.length) return [];
  const nota =
    sinFuente.length === 1
      ? html`Falta la fuente: llénala en ${archivo} antes de presentar.`
      : html`Faltan ${sinFuente.length} fuentes: llénalas en ${archivo} antes de presentar.`;
  const ids = sinFuente.map((e) => `«${e.id}»`).join(', ');
  return [{ nota, consola: `Falta la fuente de ${ids}: llénala en ${ARCHIVO} (campo "fuente") antes de presentar.` }];
}

/* ------------------------------------------------------------------ */
/* HTML                                                                */
/* ------------------------------------------------------------------ */

/** Resalta la palabra «internet» (lo que falta en las escuelas) sin cambiar el texto. */
function conEnfasis(texto, palabra = 'internet') {
  const i = texto.toLowerCase().lastIndexOf(palabra);
  if (i < 0) return texto;
  const fin = i + palabra.length;
  return html`${texto.slice(0, i)}<strong class="diapositiva__enfasis">${texto.slice(i, fin)}</strong>${texto.slice(fin)}`;
}

function htmlFuente(fuente) {
  return fuente ? html`<p class="diapositiva__fuente"><span class="diapositiva__fuente-etiqueta">Fuente:</span> ${fuente}</p>` : '';
}

function htmlPrincipal(e) {
  const partes = partirCifra(e.texto);
  const dato = partes
    ? html`<p class="diapositiva__dato">
        ${partes.antes ? html`<span class="diapositiva__antes">${partes.antes}</span>` : ''}
        <span class="diapositiva__cifra">${partes.numero}<span class="diapositiva__unidad">${NBSP}%</span></span>
        ${partes.despues ? html`<span class="diapositiva__despues">${conEnfasis(partes.despues)}</span>` : ''}
      </p>`
    : html`<p class="diapositiva__dato"><span class="diapositiva__despues">${conEnfasis(e.texto)}</span></p>`;
  return html`${dato}${htmlFuente(e.fuente)}`;
}

function htmlNota(id, avisos) {
  if (!avisos.length) return '';
  return html`
    <div class="diapositiva__nota solo-presentador" role="note" aria-labelledby="${id}-nota">
      <p class="diapositiva__nota-titulo" id="${id}-nota">${crudo(icono('alerta'))}<span>Nota para quien presenta</span></p>
      ${avisos.map((a) => html`<p>${a.nota}</p>`)}
    </div>`;
}

function htmlDiapositiva({ id, nivel, estadisticas, avisos }) {
  const [principal, ...demas] = estadisticas;
  const abre = crudo(`<h${nivel} class="diapositiva__titulo" id="${id}-titulo" tabindex="-1" data-titulo>`);
  const cierra = crudo(`</h${nivel}>`);
  return html`
    <div class="diapositiva__lienzo">
      <div class="diapositiva__cabeza">
        ${abre}${crudo(icono('sin-wifi'))}<span>${TITULO}</span>${cierra}
        ${htmlNota(id, avisos)}
      </div>
      <div class="diapositiva__problema">
        ${principal ? htmlPrincipal(principal) : ''}
        ${demas.length
          ? html`<ul class="diapositiva__mas">${demas.map((e) => html`<li><p>${e.texto}</p>${htmlFuente(e.fuente)}</li>`)}</ul>`
          : ''}
      </div>
      <div class="diapositiva__solucion">
        <div class="diapositiva__tecu">${crudo(tecuSVG({ estado: 'atento', tamano: '100%', decorativo: true }))}</div>
        <p class="diapositiva__producto">
          <strong class="diapositiva__marca">Tecu Aprende</strong> funciona <strong>sin internet</strong> y le dice
          al docente <strong>en qué se equivocó cada quien</strong>.
        </p>
        <button type="button" class="boton boton--primario diapositiva__continuar" data-act="continuar">
          <span>Continuar</span>${crudo(icono('siguiente'))}
        </button>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Ciclo de vida                                                       */
/* ------------------------------------------------------------------ */

function devolverFoco(previo) {
  if (!previo || !previo.isConnected || typeof previo.focus !== 'function') return;
  if (previo.closest('[inert]')) return;
  previo.focus({ preventScroll: true });
}

/** Quita la diapositiva y deja el contenedor como estaba. No llama a onCerrar. */
function desmontar(inst) {
  if (inst.cerrada) return;
  inst.cerrada = true;
  const { contenedor, elemento } = inst;
  const activo = document.activeElement;
  const teniaFoco = !activo || activo === document.body || elemento.contains(activo);
  inst.quitar.forEach((fn) => fn());
  inst.inertes.forEach((el) => el.removeAttribute('inert'));
  contenedor.classList.remove(...inst.clases);
  elemento.remove();
  if (abiertas.get(contenedor) === inst) abiertas.delete(contenedor);
  if (teniaFoco) devolverFoco(inst.previo);
}

function cerrarPor(inst, motivo) {
  if (inst.cerrada) return;
  desmontar(inst);
  if (motivo === 'programa' || !inst.onCerrar) return;
  try {
    inst.onCerrar({ motivo });
  } catch (error) {
    console.error(error);
  }
}

/**
 * Muestra la diapositiva «El problema» encima del escenario.
 *
 * @param {Element} contenedor zona del escenario que va a tapar (lo que tenga se queda, inerte, debajo)
 * @param {{
 *   contexto?: { estadisticas?: Array<{ id?: string, texto: string, valor?: number, fuente?: string }> } | null,
 *   onCerrar?: (info: { motivo: 'continuar' | 'escape' }) => void,  // al cerrarla quien presenta
 *   enfocar?: boolean,      // true (por omisión): el foco va al título al abrir
 *   nivelTitulo?: number,   // 2 por omisión
 * }} [opciones] contexto = packs/contexto.json ya leído
 * @returns {{ cerrar: () => void, elemento: HTMLElement|null, faltaFuente: boolean }}
 *   faltaFuente: true si a quien presenta se le avisó algo (fuente vacía o archivo sin estadística)
 */
export function mostrarDiapositiva(contenedor, opciones = {}) {
  if (!contenedor || contenedor.nodeType !== 1) {
    console.error('[diapositiva] mostrarDiapositiva necesita un elemento contenedor.');
    return { cerrar() {}, elemento: null, faltaFuente: false };
  }
  const { contexto = null, onCerrar = null, enfocar = true, nivelTitulo = 2 } = opciones || {};
  abiertas.get(contenedor)?.api.cerrar();

  const estadisticas = leerEstadisticas(contexto);
  const avisos = pendientes(contexto, estadisticas);
  avisos.forEach((a) => console.warn(`[Tecu Aprende] ${a.consola}`));

  const id = `diapositiva-${++contador}`;
  const nivel = Number.isInteger(nivelTitulo) && nivelTitulo >= 1 && nivelTitulo <= 6 ? nivelTitulo : 2;
  const elemento = document.createElement('section');
  elemento.className = 'diapositiva';
  elemento.id = id;
  elemento.setAttribute('aria-labelledby', `${id}-titulo`);
  elemento.innerHTML = String(htmlDiapositiva({ id, nivel, estadisticas, avisos }));

  const activo = document.activeElement;
  const inst = {
    contenedor,
    elemento,
    onCerrar: typeof onCerrar === 'function' ? onCerrar : null,
    previo: activo && activo !== document.body && activo !== document.documentElement ? activo : null,
    clases: ['diapositiva-anfitrion'],
    inertes: [],
    quitar: [],
    cerrada: false,
    api: null,
  };

  if (getComputedStyle(contenedor).position === 'static') inst.clases.push('diapositiva-anfitrion--relativo');
  contenedor.classList.add(...inst.clases);
  // Lo que queda debajo no se puede enfocar ni tocar mientras la diapositiva lo tapa (WCAG 2.4.11).
  for (const hijo of Array.from(contenedor.children)) {
    if (hijo.hasAttribute('inert')) continue;
    hijo.setAttribute('inert', '');
    inst.inertes.push(hijo);
  }
  contenedor.appendChild(elemento);

  inst.quitar.push(delegar(elemento, { continuar: () => cerrarPor(inst, 'continuar') }));

  const alTeclear = (evento) => {
    if (evento.key !== 'Escape' && evento.key !== 'Esc') return;
    if (!elemento.isConnected) return desmontar(inst); // la vista la quitó del DOM
    if (evento.defaultPrevented || evento.isComposing || evento.ctrlKey || evento.altKey || evento.metaKey) return;
    if (hayDialogoModal()) return; // Escape es de ese diálogo
    const objetivo = (typeof evento.composedPath === 'function' && evento.composedPath()[0]) || evento.target;
    if (esCampoDeTexto(objetivo) && !elemento.contains(objetivo)) return;
    evento.preventDefault();
    cerrarPor(inst, 'escape');
  };
  document.addEventListener('keydown', alTeclear);
  inst.quitar.push(() => document.removeEventListener('keydown', alTeclear));

  // Si la vista repinta el contenedor y se lleva la diapositiva, se limpia sola.
  if (typeof MutationObserver === 'function') {
    const vigia = new MutationObserver(() => {
      if (!elemento.isConnected) desmontar(inst);
    });
    vigia.observe(contenedor, { childList: true });
    inst.quitar.push(() => vigia.disconnect());
  }

  inst.api = {
    /** Quita la diapositiva sin llamar a onCerrar (la vista cambió de paso). */
    cerrar: () => cerrarPor(inst, 'programa'),
    elemento,
    faltaFuente: avisos.length > 0,
  };
  abiertas.set(contenedor, inst);
  if (enfocar) enfocarTitulo(elemento);
  return inst.api;
}
