/**
 * Modo libre del jurado (modo presentación, fase 5).
 *
 * Un juez escribe SU ecuación y SU procedimiento con un error, con el teclado de
 * la computadora, y ve en el proyector cómo lo diagnostica el motor determinista
 * (core/engine.js): en qué renglón cambió la solución, qué tipo de error es y
 * cómo se lo explicaría Tecu al estudiante y al docente. Si ninguna regla lo
 * explica, lo dice con honestidad (NO_CLASIFICADO): nunca inventa un diagnóstico.
 *
 *   abrirModoLibre({ pack, onCerrar, onRevisar }) → { cerrar() }
 *   validarEcuacionLibre(texto) → { ok: true, ecuacion } | { ok: false, mensaje }
 *
 * Paso 1: la ecuación, con ejemplos de un clic. Se valida con parsearRenglon y
 * analizarProcedimiento: no pasa lo que el motor no entiende (con su mensaje), lo
 * que no tiene x, lo que tiene más de un =, lo que no tiene solución única (con el
 * mensaje del motor) ni lo que ya tiene la x sola.
 * Paso 2: el cuaderno de siempre (js/ui/cuaderno.js) en modo 'libre', con
 * validación en vivo y sin pistas, y a su lado el diagnóstico en grande: el
 * renglón roto resaltado, el tipo de error con su nombre, la explicación para el
 * estudiante y, aparte y discreta, la técnica para el docente.
 *
 * Accesibilidad: <dialog> modal; el foco va al título al abrir y regresa a lo que
 * lo abrió al cerrar (Escape o «Cerrar»). Todo funciona con teclado: Enter usa la
 * ecuación o agrega el renglón; Ctrl + Enter revisa desde cualquier parte del
 * paso 2. Mientras el diálogo modal está abierto lo de fuera queda inerte, también
 * #anuncios y #alertas (las regiones aria-live de anunciar()): por eso el diálogo
 * trae las suyas y repite ahí lo que se anuncia (los mensajes del cuaderno y el
 * resumen del diagnóstico).
 *
 * Las teclas que se presionan dentro del diálogo no salen de él: así los atajos
 * del presentador (A, L, M, R…) no se disparan mientras el juez escribe.
 *
 * Estilos: css/libre.css (lo carga main.js en ?vista=pitch), sobre styles.css,
 * css/cuaderno.css y css/tecu.css. Página de prueba: docs/demo-libre.html.
 */
import { analizarProcedimiento, bonito, normalizar, parsearRenglon, TIPOS } from '../core/engine.js';
import { explicarError, nombreError } from '../core/textos.js';
import { html, crudo, anunciar, delegar, movimientoReducido } from './dom.js';
import { icono, hayIcono } from './iconos.js';
import { tecuSVG } from './tecu.js';
import { montarCuaderno, htmlEcuacion, leerEcuacion } from './cuaderno.js';

/** Ejemplos de un clic (con el signo menos tipográfico, como se ven en el cuaderno). */
export const EJEMPLOS_LIBRE = Object.freeze(['3x + 5 = 20', '−2x + 3 = 11', 'x/4 − 1 = 2']);

/** Ideas para el juez: qué error intentar, sin dar la solución. */
const IDEAS = Object.freeze([
  'Prueba a pasar un número al otro lado del = sin cambiarle el signo.',
  'Prueba a restar en vez de dividir para quitar el número que multiplica a la x.',
  'Prueba a juntar una x con un número, como si fueran lo mismo.',
  'Prueba a hacer una operación solo de un lado del =.',
  'Prueba a equivocarte en una cuenta o en el signo al dividir entre un negativo.',
  'O inventa un error raro: si Tecu no lo reconoce, te lo dice.',
]);

const EJEMPLO = '3x + 5 = 20';
const MAX_LARGO = 120; // lo mismo que acepta un renglón del cuaderno
const DOS_COLUMNAS = '(min-width: 60rem)'; // igual que css/libre.css

/** Solo para que los id no choquen si se abre varias veces. */
let contador = 0;
/** Instancia abierta (una a la vez). */
let abierto = null;

/* ------------------------------------------------------------------ */
/* Validar la ecuación del juez (puro, sin DOM)                        */
/* ------------------------------------------------------------------ */

/**
 * ¿Sirve esta ecuación para el modo libre? Usa los mensajes del motor cuando el
 * problema es de escritura (parsearRenglon) o de solución (analizarProcedimiento).
 * La ecuación que regresa ya viene con el formato de pantalla ("3x+5=20." → "3x + 5 = 20").
 *
 * @param {string} texto lo que escribió el juez
 * @returns {{ok: true, ecuacion: string} | {ok: false, mensaje: string}}
 */
export function validarEcuacionLibre(texto) {
  try {
    return validar(String(texto ?? '').trim());
  } catch (error) {
    // El motor nunca debería fallar aquí; si pasa, un mensaje claro y no una pantalla congelada.
    console.error(error);
    return { ok: false, mensaje: `Tecu no pudo leer esa ecuación. Prueba con otra, como ${EJEMPLO}.` };
  }
}

function validar(escrito) {
  if (!escrito) return { ok: false, mensaje: `Escribe una ecuación, por ejemplo ${EJEMPLO}.` };
  if (escrito.length > MAX_LARGO) {
    return { ok: false, mensaje: `Esa ecuación es muy larga. Escribe una más corta, como ${EJEMPLO}.` };
  }

  const lectura = parsearRenglon(escrito);
  if (!lectura.ok) return { ok: false, mensaje: lectura.error.mensaje };
  if (lectura.tipo !== 'ecuacion') {
    return { ok: false, mensaje: `Falta la x. Escribe una ecuación con x, por ejemplo ${EJEMPLO}.` };
  }

  // Formato de pantalla; si por algo no se pudiera leer igual, se queda como la escribió.
  let ecuacion = escrito;
  try {
    const limpia = bonito(normalizar(escrito));
    if (parsearRenglon(limpia).ok) ecuacion = limpia;
  } catch {
    /* se queda como la escribió */
  }
  if ((ecuacion.match(/=/g) || []).length > 1) {
    return { ok: false, mensaje: `Escribe la ecuación con un solo signo =, por ejemplo ${EJEMPLO}.` };
  }

  const analisis = analizarProcedimiento([ecuacion]);
  if (analisis.estado === 'sin_solucion_unica') {
    return { ok: false, mensaje: `${analisis.mensaje} Escribe una con una sola solución, por ejemplo ${EJEMPLO}.` };
  }
  if (analisis.estado === 'correcto') {
    return { ok: false, mensaje: `Esa ecuación ya tiene la x sola: no hay nada que resolver. Escribe una como ${EJEMPLO}.` };
  }
  if (analisis.estado !== 'incompleto') {
    return { ok: false, mensaje: analisis.mensaje || `Tecu no entiende esa ecuación. Prueba con otra, como ${EJEMPLO}.` };
  }
  return { ok: true, ecuacion };
}

/* ------------------------------------------------------------------ */
/* Diagnóstico → lo que se muestra (puro, sin DOM)                     */
/* ------------------------------------------------------------------ */

const minuscula = (s) => (s ? s[0].toLowerCase() + s.slice(1) : s);

function valorEncontrado(analisis) {
  const r = analisis.respuesta;
  if (!r) return 'la respuesta';
  const ultima = [...(analisis.renglones || [])].reverse().find((f) => f.valido && f.tipo === 'ecuacion');
  if (ultima?.nota === 'aproximado') return `x ≈ ${String(r.toNumber()).replace('-', '−')}`;
  return `x = ${r.toDisplay()}`;
}

/** El renglón del que salió el renglón roto (el último que conservaba la solución). */
function renglonAnterior(analisis, error) {
  const previos = (analisis.renglones || []).filter((r) => r.n < error.renglon).reverse();
  const fila = previos.find((r) => r.texto === error.anterior && r.tipo === 'ecuacion') || previos.find((r) => r.texto === error.anterior);
  return fila ? { n: fila.n, texto: fila.texto } : { n: 1, texto: error.anterior };
}

function describirError(analisis, pack) {
  const e = analisis.error;
  const noClasificado = e.tipo === TIPOS.NO_CLASIFICADO;
  const info = pack?.errores?.[e.tipo] || null;
  const anterior = renglonAnterior(analisis, e);
  const fila = (analisis.renglones || []).find((r) => r.n === e.renglon);
  const renglones = [
    { n: anterior.n, texto: anterior.texto, estado: anterior.n === 1 ? 'neutro' : 'ok', nota: anterior.n === 1 ? 'Ecuación' : 'Conserva la solución' },
    { n: e.renglon, texto: e.texto, estado: 'error', nota: fila?.tipo === 'numerica' ? 'Los dos lados no valen lo mismo' : 'Aquí cambió la solución' },
  ];

  let alumno = pack ? explicarError(e, pack, 'alumno') : '';
  if (alumno && !noClasificado && e.confianza !== 'alta') alumno = `Parece que ${minuscula(alumno)}`;
  const docente = pack ? explicarError(e, pack, 'docente') : '';
  const nombre = pack ? nombreError(e.tipo, pack) : noClasificado ? 'Sin clasificar' : '';
  const tipo = nombre
    ? { nombre, icono: info?.icono && hayIcono(info.icono) ? info.icono : noClasificado ? 'pregunta' : 'alerta', tono: info?.tono || 'gris' }
    : null;
  const alternativas = pack ? (e.alternativas || []).filter((t) => t !== e.tipo).map((t) => nombreError(t, pack)) : [];
  const confianza = { alta: 'alta', media: 'media', baja: 'baja' }[e.confianza] || null;
  const dondeLeido = `en el renglón ${e.renglon}, ${leerEcuacion(e.texto)}`;
  const comun = { renglones, tipo, alumno, docente, parrafos: [] };

  if (noClasificado) {
    return {
      ...comun,
      estado: 'no_clasificado',
      variante: 'revisar',
      icono: 'pregunta',
      tecu: 'pensando',
      titulo: 'Tecu no reconoce este error',
      subtitulo: 'Lo marcaría para que lo revise el docente.',
      detalle: `Sabe que en el renglón ${e.renglon} cambió la solución, pero ninguna de sus reglas lo explica: no inventa un diagnóstico.`,
      confianza: null,
      alternativas: [],
      voz: `Tecu no reconoce este error: lo marcaría para que lo revise el docente. Sabe dónde está: ${dondeLeido}, la solución cambió; pero ninguna de sus reglas lo explica y no inventa un diagnóstico.`,
    };
  }
  return {
    ...comun,
    estado: 'error',
    variante: 'error',
    icono: 'alerta',
    tecu: 'atento',
    titulo: `Error en el renglón ${e.renglon}`,
    subtitulo: '',
    detalle: pack ? '' : 'No se cargó el paquete de contenido: Tecu sabe dónde está el error, pero aquí no puede nombrarlo ni explicarlo.',
    confianza,
    alternativas,
    voz: `Diagnóstico de Tecu: error ${dondeLeido}.${tipo ? ` Tipo de error: ${tipo.nombre}.` : ''} ${alumno}`.trim(),
  };
}

/**
 * Modelo de vista del resultado de analizarProcedimiento (lo que llega en onRevisar).
 * @returns {{estado: string, variante: 'error'|'revisar'|'ok', icono: string, tecu: string, titulo: string,
 *   subtitulo: string, detalle: string, renglones: object[], tipo: object|null, alumno: string,
 *   docente: string, confianza: string|null, alternativas: string[], parrafos: string[], voz: string}}
 */
function describirAnalisis(analisis, pack) {
  const base = { subtitulo: '', detalle: '', renglones: [], tipo: null, alumno: '', docente: '', confianza: null, alternativas: [], parrafos: [] };
  const estado = analisis?.estado;
  if (estado === 'error' && analisis.error) return describirError(analisis, pack);
  if (estado === 'correcto') {
    const valor = valorEncontrado(analisis);
    return {
      ...base,
      estado,
      variante: 'ok',
      icono: 'exito',
      tecu: 'feliz',
      titulo: '¡Procedimiento correcto!',
      parrafos: [
        `Llegaste a ${valor} y cada renglón conserva la solución.`,
        'Para ver el diagnóstico, equivócate a propósito: cambia un renglón con «Editar» o prueba otra ecuación.',
      ],
      voz: `¡Procedimiento correcto! Llegaste a ${valor} y cada renglón conserva la solución.`,
    };
  }
  if (estado === 'incompleto') {
    return {
      ...base,
      estado,
      variante: 'revisar',
      icono: 'lapiz',
      tecu: 'normal',
      titulo: 'Vas bien: falta dejar la x sola',
      parrafos: [
        'Cada renglón conserva la solución, pero todavía no queda la x sola.',
        'Sigue escribiendo renglones, o equivócate a propósito para ver el diagnóstico.',
      ],
      voz: 'Vas bien: cada renglón conserva la solución, pero todavía no queda la x sola.',
    };
  }
  const titulo = analisis?.renglon > 1 ? `Tecu no pudo revisar el renglón ${analisis.renglon}` : 'Tecu no pudo revisar esto';
  const mensaje = analisis?.mensaje || 'Revisa lo que escribiste.';
  return {
    ...base,
    estado: 'sin_entender',
    variante: 'revisar',
    icono: 'pregunta',
    tecu: 'pensando',
    titulo,
    parrafos: [mensaje, 'Corrígelo con «Editar» y vuelve a revisar.'],
    voz: `${titulo}. ${mensaje}`,
  };
}

/* ------------------------------------------------------------------ */
/* HTML                                                                */
/* ------------------------------------------------------------------ */

/** Icono decorativo del kit (el texto de al lado siempre dice lo mismo). */
function ico(nombre, tamano) {
  return crudo(icono(nombre, tamano ? { tamano } : undefined));
}

function htmlPaso1(ids) {
  return html`
    <div class="libre__paso1">
      <div class="libre__intro">
        ${crudo(tecuSVG({ estado: 'normal', tamano: '4.5em', decorativo: true }))}
        <p class="libre__intro-texto">Escribe una ecuación con x. Luego resuélvela renglón por renglón y
          <strong>equivócate a propósito</strong>: Tecu dirá en qué renglón está el error y de qué tipo es,
          o reconocerá con honestidad que no lo sabe clasificar.</p>
      </div>
      <form class="libre__formulario" data-ref="formulario" novalidate autocomplete="off">
        <label class="libre__etiqueta" for="${ids.entrada}">Tu ecuación</label>
        <div class="libre__fila-entrada">
          <input id="${ids.entrada}" class="libre__campo math" type="text" maxlength="${MAX_LARGO}"
            autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go"
            aria-describedby="${ids.ayuda}">
          <button type="submit" class="boton boton--primario libre__usar"><span>Usar esta ecuación</span>${ico('siguiente')}</button>
        </div>
        <p class="libre__ayuda" id="${ids.ayuda}">Por ejemplo: <span class="math">${EJEMPLO}</span>. Usa números, x, +, −, / para dividir, paréntesis y un solo =.</p>
        <p class="libre__error" id="${ids.error}" data-ref="error" hidden></p>
      </form>
      <div class="libre__ejemplos" role="group" aria-labelledby="${ids.ejemplos}">
        <p class="libre__etiqueta" id="${ids.ejemplos}">O empieza con un ejemplo:</p>
        <ul class="libre__lista-ejemplos" role="list">
          ${EJEMPLOS_LIBRE.map(
            (ec) => html`<li><button type="button" class="boton boton--secundario libre__ejemplo math" data-act="ejemplo" data-ecuacion="${ec}">${ec}</button></li>`,
          )}
        </ul>
      </div>
    </div>`;
}

function htmlPaso2(ids) {
  return html`
    <div class="libre__paso2">
      <div class="libre__cuaderno" data-ref="cuaderno"></div>
      <section class="libre__resultado" data-region="resultado" aria-labelledby="${ids.resultado}"></section>
      <section class="libre__ideas" aria-labelledby="${ids.ideas}">
        <h3 class="libre__ideas-titulo" id="${ids.ideas}">${ico('pista')}<span>Ideas para equivocarte a propósito</span></h3>
        <ul class="libre__ideas-lista">
          ${IDEAS.map((idea) => html`<li>${idea}</li>`)}
        </ul>
      </section>
    </div>`;
}

function htmlEspera(ids, mod) {
  return html`
    <h3 class="libre__resultado-etiqueta" id="${ids.resultado}">Diagnóstico de Tecu</h3>
    <div class="libre__espera">
      ${crudo(tecuSVG({ estado: 'pensando', tamano: '4em', decorativo: true }))}
      <p>Aquí aparecerá el diagnóstico. Escribe tu procedimiento (<kbd>Enter</kbd> agrega cada renglón) y luego
        presiona «Revisar» <span class="libre__atajo">(<kbd>${mod}</kbd> + <kbd>Enter</kbd>)</span>.</p>
    </div>`;
}

function htmlMini(renglones) {
  return html`
    <ol class="cuaderno libre__mini" role="list" aria-label="Dónde cambió la solución">
      ${renglones.map(
        (r) => html`
          <li class="cuaderno__renglon libre__mini-renglon" data-estado="${r.estado}">
            <span class="cuaderno__num" aria-hidden="true">${r.n}</span>
            <span class="libre__mini-texto"><span class="solo-lector">Renglón ${r.n}: </span>${htmlEcuacion(r.texto)}</span>
            ${r.nota ? html`<span class="libre__mini-nota">${r.nota}</span>` : ''}
          </li>`,
      )}
    </ol>`;
}

function htmlResultado(ids, vista, mod, desactualizado) {
  const docenteMeta = [
    vista.confianza ? `Confianza del diagnóstico: ${vista.confianza}.` : '',
    vista.alternativas.length ? `También podría ser: ${vista.alternativas.join(', ')}.` : '',
    'Lo calcula el motor en este dispositivo, sin internet ni IA.',
  ].filter(Boolean);
  return html`
    <div class="libre__resultado-cabeza">
      <div class="libre__resultado-titulos">
        <h3 class="libre__resultado-etiqueta" id="${ids.resultado}">Diagnóstico de Tecu</h3>
        <p class="libre__veredicto">${ico(vista.icono)}<span>${vista.titulo}</span></p>
        ${vista.subtitulo ? html`<p class="libre__subtitulo">${vista.subtitulo}</p>` : ''}
      </div>
      ${crudo(tecuSVG({ estado: vista.tecu, tamano: '2.75em', decorativo: true }))}
    </div>
    <p class="libre__nota-cambio" data-ref="nota-cambio"${desactualizado ? '' : crudo(' hidden')}>
      ${ico('lapiz', 20)}<span>Cambiaste el procedimiento: presiona «Revisar» <span class="libre__atajo">(<kbd>${mod}</kbd> + <kbd>Enter</kbd>)</span> para diagnosticarlo de nuevo.</span>
    </p>
    ${vista.renglones.length ? htmlMini(vista.renglones) : ''}
    ${vista.detalle ? html`<p class="libre__detalle">${vista.detalle}</p>` : ''}
    ${vista.tipo
      ? html`<p class="libre__tipo">
          <span class="libre__tipo-etiqueta">Tipo de error:</span>
          <span class="chip libre__chip" data-tono="${vista.tipo.tono}">${ico(vista.tipo.icono)}<span>${vista.tipo.nombre}</span></span>
        </p>`
      : ''}
    ${vista.alumno
      ? html`<p class="libre__explicacion libre__para"><span class="libre__para-etiqueta">Para el estudiante:</span> ${vista.alumno}</p>`
      : ''}
    ${vista.parrafos.map((p, i) => html`<p class="${i ? 'libre__texto' : 'libre__explicacion'}">${p}</p>`)}
    ${vista.docente
      ? html`<div class="libre__docente">
          <p class="libre__docente-texto"><strong>Para el docente:</strong> ${vista.docente}</p>
          <p class="libre__docente-meta">${docenteMeta.join(' ')}</p>
        </div>`
      : ''}`;
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function llamar(fn, ...args) {
  if (typeof fn !== 'function') return;
  try {
    fn(...args);
  } catch (error) {
    console.error(error);
  }
}

/**
 * Regresa el foco a lo que abrió el diálogo. Si la vista se repintó mientras tanto,
 * busca el mismo botón por id o por data-foco (como el «Modo libre» del pitch).
 */
function devolverFoco(previo) {
  if (!previo) return;
  let destino = previo.isConnected ? previo : null;
  if (!destino && typeof CSS !== 'undefined' && CSS.escape) {
    const foco = previo.dataset?.foco;
    destino =
      (previo.id && document.getElementById(previo.id)) ||
      (foco && document.querySelector(`[data-foco="${CSS.escape(foco)}"]`)) ||
      null;
  }
  if (destino && typeof destino.focus === 'function') destino.focus();
}

/**
 * Repite en `destino` (dentro del diálogo) lo que se escribe en la región aria-live
 * `id` de la página, que queda inerte mientras el diálogo modal está abierto.
 * @returns {() => void} deja de repetir
 */
function repetirRegion(id, destino) {
  const fuente = document.getElementById(id);
  if (!fuente || typeof MutationObserver !== 'function') return () => {};
  const observador = new MutationObserver(() => {
    destino.textContent = fuente.textContent;
  });
  observador.observe(fuente, { childList: true, characterData: true, subtree: true });
  return () => observador.disconnect();
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

/**
 * Abre el modo libre del jurado en un <dialog> modal grande (para proyector).
 * Si ya está abierto, no abre otro: enfoca su título y devuelve el mismo control.
 *
 * @param {{
 *   pack?: object,                                  // packs/ecuaciones-1.json (nombres y explicaciones de los errores)
 *   onCerrar?: () => void,                          // una vez, al cerrarse por cualquier vía (Escape, «Cerrar», cerrar())
 *   onRevisar?: (resultado: {ecuacion: string, analisis: object, renglones: string[]}) => void,  // opcional: cada revisión
 * }} [opciones]
 * @returns {{ cerrar: () => void }}
 */
export function abrirModoLibre({ pack = null, onCerrar = null, onRevisar = null } = {}) {
  if (abierto && !abierto.cerrado) {
    abierto.enfocarTitulo();
    return abierto.control;
  }

  const n = ++contador;
  const ids = {
    titulo: `libre-${n}-titulo`,
    paso: `libre-${n}-paso`,
    entrada: `libre-${n}-ecuacion`,
    ayuda: `libre-${n}-ayuda`,
    error: `libre-${n}-error`,
    ejemplos: `libre-${n}-ejemplos`,
    resultado: `libre-${n}-resultado`,
    ideas: `libre-${n}-ideas`,
  };
  const mod = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '') ? 'Cmd' : 'Ctrl';
  const activo = document.activeElement;
  const previo = activo && activo !== document.body && activo !== document.documentElement ? activo : null;

  const state = {
    paso: 1,
    ecuacion: '', // la que se resuelve en el paso 2 (ya validada)
    borrador: '', // lo escrito en el paso 1 (se conserva al volver con «Probar otra ecuación»)
    errorEcuacion: null,
    vista: null, // diagnóstico que se muestra (describirAnalisis) o null
    revisados: null, // renglones con los que se hizo ese diagnóstico
    desactualizado: false, // el procedimiento cambió después de revisar
  };
  let cuaderno = null;
  let observador = null;
  let escapeAtendido = false;
  const quitar = [];
  const instancia = { cerrado: false, control: null, enfocarTitulo: () => {} };

  /* ---------------- Esqueleto (se pinta una sola vez) ---------------- */

  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialogo libre';
  dialogo.setAttribute('aria-labelledby', ids.titulo);
  dialogo.innerHTML = String(html`
    <div class="libre__marco">
      <div class="libre__titulos">
        <h2 class="libre__titulo" id="${ids.titulo}" tabindex="-1" data-titulo>Modo libre: escribe tu propio error</h2>
        <p class="libre__paso" id="${ids.paso}" data-ref="paso"></p>
      </div>
      <div class="libre__cuerpo" data-region="cuerpo"></div>
      <div class="libre__acciones">
        <button type="button" class="boton boton--secundario" data-act="otra" data-ref="otra" hidden>${ico('reiniciar')}<span>Probar otra ecuación</span></button>
        <button type="button" class="boton boton--secundario libre__cerrar" data-act="cerrar">${ico('cerrar')}<span>Cerrar</span></button>
      </div>
    </div>
    <div class="solo-lector" role="status" aria-live="polite" aria-atomic="true" data-ref="voz"></div>
    <div class="solo-lector" role="alert" aria-live="assertive" aria-atomic="true" data-ref="alerta"></div>
  `);

  const $ = (sel) => dialogo.querySelector(sel);
  const titulo = $(`#${ids.titulo}`);
  const pasoEl = $('[data-ref="paso"]');
  const cuerpo = $('[data-region="cuerpo"]');
  const botonOtra = $('[data-ref="otra"]');
  const voz = $('[data-ref="voz"]');
  const alerta = $('[data-ref="alerta"]');
  let entrada = null; // campo de la ecuación (paso 1)
  let errorEl = null;

  /** Lee un mensaje con el lector de pantalla (por #anuncios, que el diálogo repite; si no hay, directo). */
  function decir(mensaje, { urgente = false } = {}) {
    if (!mensaje) return;
    if (document.getElementById(urgente ? 'alertas' : 'anuncios')) {
      anunciar(mensaje, { urgente });
      return;
    }
    const region = urgente ? alerta : voz;
    region.textContent = '';
    setTimeout(() => {
      if (!instancia.cerrado) region.textContent = mensaje;
    }, 60);
  }

  /* ---------------- Pintado ---------------- */

  function pintarCabecera() {
    pasoEl.innerHTML = String(
      state.paso === 1
        ? html`<span class="libre__paso-num">Paso 1 de 2</span> <span>Escribe tu ecuación</span>`
        : html`<span class="libre__paso-num">Paso 2 de 2</span> <span>Resuelve ${htmlEcuacion(state.ecuacion)} y equivócate a propósito</span>`,
    );
    botonOtra.hidden = state.paso !== 2;
  }

  function pintarPaso1({ enfocar = true } = {}) {
    state.paso = 1;
    state.errorEcuacion = null;
    pintarCabecera();
    cuerpo.innerHTML = String(htmlPaso1(ids));
    cuerpo.scrollTop = 0;
    entrada = cuerpo.querySelector(`#${ids.entrada}`);
    errorEl = cuerpo.querySelector('[data-ref="error"]');
    entrada.value = state.borrador;
    if (enfocar) {
      entrada.focus();
      entrada.select();
    }
  }

  function pintarPaso2() {
    state.paso = 2;
    state.vista = null;
    state.revisados = null;
    state.desactualizado = false;
    entrada = null;
    errorEl = null;
    pintarCabecera();
    cuerpo.innerHTML = String(htmlPaso2(ids));
    cuerpo.scrollTop = 0;
    pintarResultado();
    const contenedor = cuerpo.querySelector('[data-ref="cuaderno"]');
    try {
      cuaderno = montarCuaderno(contenedor, {
        ejercicio: state.ecuacion,
        modo: 'libre',
        pack,
        ayudas: false, // sin pistas ni solución: que nada distraiga del diagnóstico
        validarEnVivo: true,
        nivelTitulo: 3,
        onRevisar: alRevisar,
      });
    } catch (error) {
      console.error(error);
      contenedor.innerHTML = String(
        html`<p class="libre__error">${ico('alerta', 20)}<span>No se pudo abrir el cuaderno con esa ecuación. Usa «Probar otra ecuación».</span></p>`,
      );
      botonOtra.focus();
      return;
    }
    vigilarCambios(contenedor);
    cuaderno.enfocar();
    decir(`Ecuación lista: ${leerEcuacion(state.ecuacion)}. Escribe tu procedimiento: Enter agrega cada renglón y ${mod} más Enter lo revisa.`);
  }

  function panelResultado() {
    return cuerpo.querySelector('[data-region="resultado"]');
  }

  function pintarResultado() {
    const panel = panelResultado();
    if (!panel) return;
    const vista = state.vista;
    panel.className = vista ? `libre__resultado diagnostico diagnostico--${vista.variante}` : 'libre__resultado libre__resultado--espera';
    panel.dataset.estado = vista ? vista.estado : 'espera';
    panel.toggleAttribute('data-desactualizado', Boolean(vista && state.desactualizado));
    panel.innerHTML = String(vista ? htmlResultado(ids, vista, mod, state.desactualizado) : htmlEspera(ids, mod));
  }

  /** Marca el diagnóstico como viejo (o vigente otra vez) sin repintarlo. */
  function pintarVigencia() {
    const panel = panelResultado();
    if (!panel || !state.vista) return;
    panel.toggleAttribute('data-desactualizado', state.desactualizado);
    const nota = panel.querySelector('[data-ref="nota-cambio"]');
    if (nota) nota.hidden = !state.desactualizado;
  }

  /* ---------------- Paso 1: la ecuación ---------------- */

  function mostrarErrorEcuacion(mensaje) {
    if (!entrada || !errorEl) return;
    state.errorEcuacion = mensaje;
    errorEl.innerHTML = String(html`${ico('alerta', 20)}<span>${mensaje}</span>`);
    errorEl.hidden = false;
    entrada.setAttribute('aria-invalid', 'true');
    entrada.setAttribute('aria-describedby', `${ids.error} ${ids.ayuda}`);
    decir(mensaje);
  }

  function limpiarErrorEcuacion() {
    if (state.errorEcuacion === null || !entrada || !errorEl) return;
    state.errorEcuacion = null;
    errorEl.hidden = true;
    errorEl.textContent = '';
    entrada.removeAttribute('aria-invalid');
    entrada.setAttribute('aria-describedby', ids.ayuda);
  }

  /** @returns {boolean} true si la ecuación sirve y ya se pasó al paso 2 */
  function usarEcuacion(texto) {
    const r = validarEcuacionLibre(texto);
    if (!r.ok) {
      mostrarErrorEcuacion(r.mensaje);
      entrada?.focus();
      return false;
    }
    state.ecuacion = r.ecuacion;
    state.borrador = r.ecuacion;
    pintarPaso2();
    return true;
  }

  /* ---------------- Paso 2: el diagnóstico ---------------- */

  function alRevisar(resultado) {
    if (instancia.cerrado || !resultado) return;
    try {
      state.vista = describirAnalisis(resultado.analisis, pack);
    } catch (error) {
      console.error(error);
      state.vista = describirAnalisis({ estado: 'sin_entender', mensaje: 'Algo falló al explicar este procedimiento.' }, null);
    }
    state.revisados = [...(resultado.renglones || [])];
    state.desactualizado = false;
    pintarResultado();
    // Este anuncio reemplaza al del cuaderno (anunciar() solo lee el último).
    decir(state.vista.voz);
    const panel = panelResultado();
    const unaColumna = !window.matchMedia?.(DOS_COLUMNAS).matches;
    if (panel && unaColumna && typeof panel.scrollIntoView === 'function') {
      panel.scrollIntoView({ block: 'nearest', behavior: movimientoReducido() ? 'auto' : 'smooth' });
    }
    llamar(onRevisar, { ecuacion: state.ecuacion, analisis: resultado.analisis, renglones: [...(resultado.renglones || [])] });
  }

  /** Si el procedimiento cambia después de revisar, el diagnóstico se marca como viejo. */
  function vigilarCambios(contenedor) {
    observador?.disconnect();
    observador = null;
    if (typeof MutationObserver !== 'function') return;
    observador = new MutationObserver(() => {
      if (!cuaderno || !state.revisados) return;
      const actuales = cuaderno.renglones();
      if (!actuales.length) {
        // Borró todo su procedimiento: el diagnóstico anterior ya no dice nada.
        state.vista = null;
        state.revisados = null;
        state.desactualizado = false;
        pintarResultado();
        return;
      }
      const cambio = actuales.length !== state.revisados.length || actuales.some((r, i) => r !== state.revisados[i]);
      if (cambio === state.desactualizado) return;
      state.desactualizado = cambio;
      pintarVigencia();
    });
    observador.observe(contenedor, { childList: true, subtree: true });
  }

  function soltarCuaderno() {
    observador?.disconnect();
    observador = null;
    if (cuaderno) {
      try {
        cuaderno.destruir();
      } catch (error) {
        console.error(error);
      }
    }
    cuaderno = null;
  }

  function otraEcuacion() {
    soltarCuaderno();
    pintarPaso1();
    decir('Escribe otra ecuación o elige un ejemplo.');
  }

  /* ---------------- Abrir y cerrar ---------------- */

  function enfocarTitulo() {
    titulo.focus({ preventScroll: true });
  }

  function cerrar() {
    if (instancia.cerrado) return;
    instancia.cerrado = true;
    quitar.splice(0).forEach((fn) => fn());
    soltarCuaderno();
    if (dialogo.open) dialogo.close();
    dialogo.remove();
    if (abierto === instancia) abierto = null;
    devolverFoco(previo);
    llamar(onCerrar);
  }

  /* ---------------- Eventos ---------------- */

  function escuchar(el, tipo, fn) {
    el.addEventListener(tipo, fn);
    quitar.push(() => el.removeEventListener(tipo, fn));
  }

  quitar.push(
    delegar(dialogo, {
      cerrar: () => cerrar(),
      otra: () => otraEcuacion(),
      ejemplo: (el) => usarEcuacion(el.dataset.ecuacion),
    }),
  );

  escuchar(dialogo, 'submit', (evento) => {
    if (!evento.target.matches?.('[data-ref="formulario"]')) return; // el cuaderno atiende su propio formulario
    evento.preventDefault();
    usarEcuacion(entrada ? entrada.value : '');
  });

  // Escribir solo guarda el borrador y quita el mensaje de error: nunca repinta.
  escuchar(dialogo, 'input', (evento) => {
    if (!entrada || evento.target !== entrada) return;
    state.borrador = entrada.value;
    limpiarErrorEcuacion();
  });

  escuchar(dialogo, 'keydown', (evento) => {
    // Los atajos del presentador viven fuera del diálogo: lo que se teclea aquí no sale.
    evento.stopPropagation();
    if (evento.isComposing) return;
    if (evento.key === 'Escape' && evento.defaultPrevented) {
      // El cuaderno ya usó este Escape (cancelar la edición de un renglón): no cierra el diálogo.
      escapeAtendido = true;
      setTimeout(() => {
        escapeAtendido = false;
      }, 0);
      return;
    }
    if (evento.key !== 'Enter' || !(evento.ctrlKey || evento.metaKey) || evento.defaultPrevented) return;
    // Ctrl + Enter: en el paso 1 usa la ecuación; en el paso 2 revisa, esté donde esté el foco.
    evento.preventDefault();
    if (state.paso === 1) usarEcuacion(entrada ? entrada.value : '');
    else cuaderno?.revisar();
  });

  // Escape (o la petición de cerrar del sistema): se cierra por cerrar() para limpiar y devolver el foco.
  escuchar(dialogo, 'cancel', (evento) => {
    evento.preventDefault();
    if (escapeAtendido) {
      escapeAtendido = false;
      return;
    }
    cerrar();
  });
  escuchar(dialogo, 'close', () => cerrar());

  quitar.push(repetirRegion('anuncios', voz), repetirRegion('alertas', alerta));

  /* ---------------- Inicio ---------------- */

  instancia.enfocarTitulo = enfocarTitulo;
  instancia.control = { cerrar };
  abierto = instancia;

  document.body.appendChild(dialogo);
  pintarPaso1({ enfocar: false });
  if (typeof dialogo.showModal === 'function') dialogo.showModal();
  else dialogo.setAttribute('open', '');
  enfocarTitulo();
  return instancia.control;
}
