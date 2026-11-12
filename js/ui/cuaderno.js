/**
 * Cuaderno de renglones de Tecu Aprende.
 *
 * El estudiante escribe su procedimiento renglón por renglón (una ecuación por
 * renglón). El motor determinista (core/engine.js) dice en qué renglón cambió
 * la solución y qué error típico lo explica; core/textos.js lo pone en palabras.
 *
 * Patrón de la app: `state` + funciones que pintan cada región + delegación con
 * data-act. Escribir en la entrada NO repinta nada (no se pierde el foco ni se
 * cierra el teclado del celular); solo las acciones (agregar, editar, borrar,
 * revisar, pista, solución) repintan su región.
 *
 * Lo que no se entiende (falta el =, un símbolo raro…) no entra al cuaderno:
 * se queda en la entrada con el mensaje del motor (aria-invalid + aria-describedby)
 * para corregirlo ahí mismo, sin volver a escribirlo. Aplica en todos los modos:
 * es validar lo que se escribe, no una ayuda.
 *
 * Estructura: .cuaderno-panel (raíz) > título, instrucción, .cuaderno (la hoja
 * rayada del kit: enunciado, renglones y entrada), botones, diagnóstico, pistas
 * y solución. Cada cuaderno guarda su propio estado: puede haber varios por página.
 */
import { analizarProcedimiento, bonito, parsearRenglon, TIPOS } from '../core/engine.js';
import { explicarError, pistasPara } from '../core/textos.js';
import { html, crudo, anunciar, confirmar, delegar, renderConFoco, movimientoReducido } from './dom.js';
import { icono } from './iconos.js';

const MAX_PISTAS = 3;
const MAX_LARGO = 120;

/** Solo para que los id no choquen si hay varios cuadernos en la página. */
let contador = 0;

/** Icono decorativo del kit (el texto de al lado siempre dice lo mismo). Punto único para cambiarlos. */
function ico(nombre, tamano) {
  return crudo(icono(nombre, tamano ? { tamano } : undefined));
}

/* ------------------------------------------------------------------ */
/* Formato de las ecuaciones                                           */
/* ------------------------------------------------------------------ */

/** Teclas rápidas: lo que insertan, lo que se ve, su nombre accesible y cómo se dice. */
const TECLAS = [
  { texto: 'x', etiqueta: 'x', nombre: 'Escribir x', hablado: 'equis' },
  { texto: '+', etiqueta: '+', nombre: 'Escribir más', hablado: 'más' },
  { texto: '-', etiqueta: '−', nombre: 'Escribir menos', hablado: 'menos' },
  { texto: '=', etiqueta: '=', nombre: 'Escribir igual', hablado: 'igual' },
  { texto: '/', etiqueta: '÷', nombre: 'Escribir entre (dividir)', hablado: 'entre' },
  { texto: '(', etiqueta: '(', nombre: 'Escribir abre paréntesis', hablado: 'abre paréntesis' },
  { texto: ')', etiqueta: ')', nombre: 'Escribir cierra paréntesis', hablado: 'cierra paréntesis' },
  { texto: '·', etiqueta: '·', nombre: 'Escribir por (multiplicar)', hablado: 'por' },
];

/**
 * Formato de pantalla: bonito() del motor. Antes se pasa a guion el − tipográfico
 * (el que llega del paquete o de un teclado) para que también quede espaciado.
 */
function formatear(texto) {
  return bonito(
    String(texto ?? '')
      .replace(/[−‐-―﹣]/g, '-')
      .replace(/X/g, 'x'),
  );
}

/** Versión hablada para lectores de pantalla ("25/3" se leería "25 barra 3"). */
function paraLector(texto) {
  return formatear(texto)
    .replace(/x/g, ' equis ')
    .replace(/=/g, ' igual a ')
    .replace(/\+/g, ' más ')
    .replace(/−/g, ' menos ')
    .replace(/[/÷]/g, ' entre ')
    .replace(/[·×]/g, ' por ')
    .replace(/\(/g, ' abre paréntesis ')
    .replace(/\)/g, ' cierra paréntesis ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ecuación para la vista. Cada lado es un bloque: si no cabe en una línea se
 * parte antes de un "=" ("5x + 2" / "= 2x + 14"), luego entre términos y nunca a
 * mitad de un número. Al lector de pantalla va la versión hablada.
 */
function htmlMath(texto) {
  const lados = formatear(texto)
    .split(' = ')
    .map((lado, i) => html`<span class="cuaderno__lado">${i ? `= ${lado}` : lado}</span>`);
  return html`<span class="math cuaderno__texto" aria-hidden="true">${lados.map((l, i) => (i ? html` ${l}` : l))}</span><span class="solo-lector">${paraLector(texto)}</span>`;
}

/**
 * Para vistas de solo lectura que quieran verse igual que el cuaderno:
 * formatearEcuacion('x=-4') → 'x = −4'; leerEcuacion('x = 25/3') → 'equis igual a 25 entre 3';
 * htmlEcuacion(texto) → HTML seguro (lados que se parten antes del "=" + versión hablada).
 */
export { formatear as formatearEcuacion, paraLector as leerEcuacion, htmlMath as htmlEcuacion };

const minuscula = (s) => (s ? s[0].toLowerCase() + s.slice(1) : s);

/* ------------------------------------------------------------------ */
/* Marcas por renglón y textos del diagnóstico                         */
/* ------------------------------------------------------------------ */

const NEUTRA = Object.freeze({ estado: 'neutro', texto: '' });

/**
 * Estado visible de cada renglón del estudiante según el análisis del motor.
 * El icono (✓, ✗ o círculo punteado) lo pinta el kit en el margen según data-estado;
 * aquí va el texto, para que nada dependa solo del color.
 * @returns {Array<{estado: 'ok'|'error'|'despues'|'neutro', texto: string}>}
 */
function marcasDe(analisis, cuantos) {
  const filas = analisis?.renglones || [];
  // El primer renglón del análisis es el enunciado; si no cuadra, no marcamos.
  if (filas.length !== cuantos + 1) return Array.from({ length: cuantos }, () => NEUTRA);
  const errorEn = analisis.estado === 'error' ? analisis.error.renglon : null;
  return filas.slice(1).map((r) => {
    if (r.ok === false) return { estado: 'error', texto: `Tecu no entiende este renglón: ${r.error.mensaje}` };
    if (r.despuesDelError) return { estado: 'despues', texto: `Revisa antes el renglón ${errorEn}` };
    if (r.valido === false) {
      return { estado: 'error', texto: r.tipo === 'numerica' ? 'Los dos lados no valen lo mismo' : 'Aquí cambió la solución' };
    }
    if (r.valido === true) {
      const texto = { calculo: 'Cuenta correcta', aproximado: 'Conserva la solución (redondeada)' }[r.nota] || 'Conserva la solución';
      return { estado: 'ok', texto };
    }
    return NEUTRA;
  });
}

/** Qué falta, sin revelar la respuesta (según el siguiente paso canónico). */
const FALTA = {
  transponer_constante: 'Te falta pasar los números sueltos al otro lado del =.',
  transponer_x: 'Te falta juntar todas las x en un mismo lado del =.',
  reducir: 'Te falta juntar los términos semejantes: x con x y números con números.',
  dividir: 'Te falta quitar el número que multiplica a la x.',
  multiplicar: 'Te falta quitar el número que divide a la x.',
  cambiar_signo: 'Ya casi: te falta que quede x, no −x.',
};

function valorEncontrado(analisis) {
  const r = analisis.respuesta;
  if (!r) return 'la respuesta';
  const ultima = [...analisis.renglones].reverse().find((f) => f.valido && f.tipo === 'ecuacion');
  if (ultima?.nota === 'aproximado') return `x ≈ ${String(r.toNumber()).replace('-', '−')}`;
  return `x = ${r.toDisplay()}`;
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

/**
 * @typedef {{
 *   analisis: object,          // lo que devuelve analizarProcedimiento([ejercicio, ...renglones])
 *   renglones: string[],       // renglones del estudiante, tal como los escribió
 *   pistasUsadas: number,
 *   pidioSolucion: boolean,
 * }} ResultadoCuaderno
 */

/**
 * Monta el cuaderno de renglones dentro de `contenedor` (reemplaza su contenido).
 *
 * @param {HTMLElement} contenedor
 * @param {{
 *   ejercicio: string,                 // '3x + 5 = 20' (se muestra como renglón 1)
 *   modo?: 'diagnostico'|'practica'|'comprobacion'|'libre',
 *   pack: object,                      // packs/ecuaciones-1.json
 *   ayudas?: boolean,                  // pistas y "Ver solución" (por omisión: práctica y libre)
 *   validarEnVivo?: boolean,           // ✓/⚠ al agregar cada renglón (por omisión: práctica y libre)
 *   nivelTitulo?: number,              // nivel del encabezado "Tu procedimiento" (2 por omisión)
 *   onRevisar?: (resultado: ResultadoCuaderno) => void,
 *   onPista?: (nivel: number) => void,
 *   onSolucion?: () => void,
 * }} opciones
 * @returns {{
 *   escribirRenglon: (texto: string, op?: {animado?: boolean, msPorLetra?: number}) => Promise<boolean>,
 *   revisar: () => ResultadoCuaderno|null|Promise<ResultadoCuaderno|null>,
 *   renglones: () => string[],
 *   enfocar: () => void,
 *   destruir: () => void,
 * }}
 */
export function montarCuaderno(contenedor, opciones = {}) {
  if (!contenedor) throw new TypeError('montarCuaderno: falta el contenedor.');
  const ejercicio = String(opciones.ejercicio ?? '').trim();
  if (!ejercicio) throw new TypeError('montarCuaderno: falta el ejercicio.');

  const modo = opciones.modo || 'practica';
  const pack = opciones.pack || null;
  const porModo = modo === 'practica' || modo === 'libre';
  const ayudas = Boolean(opciones.ayudas ?? porModo) && Boolean(pack);
  const enVivo = Boolean(opciones.validarEnVivo ?? porModo);
  const nivel = Math.min(5, Math.max(1, Math.round(Number(opciones.nivelTitulo) || 2)));
  const sub = nivel + 1;
  const id = `cuaderno-${++contador}`;
  const ids = {
    titulo: `${id}-titulo`,
    instruccion: `${id}-instruccion`,
    entrada: `${id}-entrada`,
    error: `${id}-error`,
    pistas: `${id}-pistas`,
    solucion: `${id}-solucion`,
  };
  const teclaMod = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '') ? 'Cmd' : 'Ctrl';

  const state = {
    renglones: [],
    editando: null, // índice del renglón que se edita
    borradorGuardado: '', // lo que había en la entrada antes de editar
    errorEntrada: null,
    marcas: null, // marcas por renglón (en vivo o de la última revisión)
    nuevo: null, // índice del renglón recién agregado (para resaltarlo)
    diagnostico: null, // { info, desactualizado }
    pistas: [],
    pistasUsadas: 0,
    solucion: null,
    pidioSolucion: false,
    confirmando: false,
    escribiendo: false,
  };
  let destruido = false;
  let pendientes = 0; // escribirRenglon en cola
  let cola = Promise.resolve();

  /* ---------------- Esqueleto (se pinta una sola vez) ---------------- */

  const raiz = document.createElement('section');
  raiz.className = 'cuaderno-panel';
  raiz.dataset.modo = modo;
  raiz.setAttribute('aria-labelledby', ids.titulo);
  raiz.innerHTML = String(html`
    <h${nivel} class="cuaderno__titulo titulo-3" id="${ids.titulo}">Tu procedimiento<span class="solo-lector"> para ${paraLector(ejercicio)}</span></h${nivel}>
    <p class="cuaderno__instruccion texto-sec" id="${ids.instruccion}">Escribe un paso por renglón, como en tu cuaderno.<span class="cuaderno__atajos"> Enter agrega el renglón; ${teclaMod} + Enter revisa.</span></p>
    <div class="cuaderno">
      <div class="cuaderno__enunciado">
        <p class="cuaderno__enunciado-texto">
          <span class="cuaderno__etiqueta">Ecuación<span class="solo-lector"> (renglón 1):</span></span>
          <span class="cuaderno__fila">
            <span class="cuaderno__num" aria-hidden="true">1</span>
            <span class="cuaderno__contenido">${htmlMath(ejercicio)}</span>
          </span>
        </p>
      </div>
      <ol class="cuaderno__renglones" role="list" data-region="renglones" hidden></ol>
      <form class="cuaderno__escritura" data-region="escritura" novalidate autocomplete="off">
        <div class="cuaderno__escritura-cabeza">
          <label class="cuaderno__etiqueta-entrada" for="${ids.entrada}" data-ref="etiqueta">Renglón 2</label>
          <button type="button" class="boton boton--fantasma cuaderno__cancelar" data-act="cancelar" hidden>Cancelar</button>
        </div>
        <div class="cuaderno__entrada">
          <input id="${ids.entrada}" class="cuaderno__campo math" type="text" inputmode="decimal"
            autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next"
            maxlength="${MAX_LARGO}" aria-describedby="${ids.instruccion}">
          <button type="submit" class="boton boton--secundario cuaderno__enviar" data-ref="enviar" data-mantener-foco></button>
        </div>
        <p class="cuaderno__error-entrada" id="${ids.error}" data-ref="error" hidden></p>
        <div class="teclas-rapidas" role="toolbar" aria-label="Teclas rápidas" aria-controls="${ids.entrada}" data-ref="teclas">
          ${TECLAS.map(
            (t, i) =>
              html`<button type="button" class="tecla math" data-act="tecla" data-texto="${t.texto}" data-mantener-foco tabindex="${i === 0 ? 0 : -1}" aria-label="${t.nombre}">${t.etiqueta}</button>`,
          )}
        </div>
      </form>
    </div>
    <div class="cuaderno__botones" data-region="acciones"></div>
    <div class="cuaderno__resultado" data-region="diagnostico"></div>
    <div class="cuaderno__ayudas" data-region="pistas"></div>
    <div class="cuaderno__ayudas" data-region="solucion"></div>
  `);
  contenedor.innerHTML = '';
  contenedor.appendChild(raiz);

  const $ = (sel) => raiz.querySelector(sel);
  const lista = $('[data-region="renglones"]');
  const form = $('[data-region="escritura"]');
  const entrada = $(`#${ids.entrada}`);
  const etiqueta = $('[data-ref="etiqueta"]');
  const botonEnviar = $('[data-ref="enviar"]');
  const botonCancelar = $('[data-act="cancelar"]');
  const errorEl = $('[data-ref="error"]');
  const barra = $('[data-ref="teclas"]');
  const accionesEl = $('[data-region="acciones"]');
  const diagnosticoEl = $('[data-region="diagnostico"]');
  const pistasEl = $('[data-region="pistas"]');
  const solucionEl = $('[data-region="solucion"]');

  /* ---------------- Pintado por región ---------------- */

  function pintarRenglones() {
    const marcas = state.marcas && state.marcas.length === state.renglones.length ? state.marcas : null;
    lista.hidden = state.renglones.length === 0;
    renderConFoco(
      lista,
      html`${state.renglones.map((texto, i) => htmlRenglon(texto, i, marcas ? marcas[i] : NEUTRA))}`,
    );
    state.nuevo = null;
  }

  function htmlRenglon(texto, i, marca) {
    const n = i + 2;
    const editando = state.editando === i;
    const idEstado = `${id}-estado-${i}`;
    const estado = editando
      ? html`<span class="cuaderno__estado" id="${idEstado}">${ico('lapiz', 18)}<span>Lo estás editando</span></span>`
      : marca.texto
        ? html`<span class="cuaderno__estado" id="${idEstado}">${marca.texto}</span>`
        : '';
    const describe = estado ? crudo(` aria-describedby="${idEstado}"`) : '';
    const clases = ['cuaderno__renglon', editando && 'cuaderno__renglon--editando', state.nuevo === i && 'cuaderno__renglon--nuevo']
      .filter(Boolean)
      .join(' ');
    return html`
      <li class="${clases}" data-estado="${marca.estado}" data-i="${i}">
        <div class="cuaderno__fila">
          <span class="cuaderno__num" aria-hidden="true">${n}</span>
          <div class="cuaderno__contenido"><span class="solo-lector">Renglón ${n}: </span>${htmlMath(texto)}</div>
          ${estado}
          <div class="cuaderno__acciones-renglon">
            <button type="button" class="boton boton--fantasma boton--icono cuaderno__accion" data-act="editar" data-i="${i}" data-foco="editar-${i}"${describe}>
              ${ico('lapiz')}<span class="cuaderno__accion-texto">Editar<span class="solo-lector"> renglón ${n}</span></span>
            </button>
            <button type="button" class="boton boton--fantasma boton--icono cuaderno__accion" data-act="borrar" data-i="${i}" data-foco="borrar-${i}">
              ${ico('borrar')}<span class="cuaderno__accion-texto">Borrar<span class="solo-lector"> renglón ${n}</span></span>
            </button>
          </div>
        </div>
      </li>`;
  }

  /** La entrada no se repinta (conserva texto, cursor y teclado): solo se ajusta. */
  function pintarEntrada() {
    const editando = state.editando !== null;
    const n = (editando ? state.editando : state.renglones.length) + 2;
    etiqueta.textContent = editando ? `Editando renglón ${n}` : `Renglón ${n}`;
    botonEnviar.innerHTML = String(
      editando ? html`${ico('check')}<span>Guardar</span>` : html`${ico('enviar')}<span>Agregar</span>`,
    );
    botonCancelar.hidden = !editando;
    form.dataset.editando = String(editando);
  }

  function pintarAcciones() {
    const agotadas = state.pistasUsadas >= MAX_PISTAS;
    renderConFoco(
      accionesEl,
      html`
        <button type="button" class="boton boton--primario boton--bloque" data-act="revisar" data-foco="revisar">${ico('check')}<span>Revisar</span></button>
        ${ayudas
          ? html`<div class="cuaderno__botones-ayuda">
              <button type="button" class="boton boton--secundario" data-act="pista" data-foco="pista"${agotadas ? crudo(' aria-disabled="true"') : ''}>
                ${ico('pista')}<span>${agotadas ? `Ya usaste las ${MAX_PISTAS} pistas` : `Pista (${state.pistasUsadas + 1} de ${MAX_PISTAS})`}</span>
              </button>
              ${state.solucion
                ? ''
                : html`<button type="button" class="boton boton--fantasma" data-act="solucion" data-foco="ver-solucion">${ico('ojo')}<span>Ver solución</span></button>`}
            </div>`
          : ''}`,
    );
  }

  function pintarDiagnostico() {
    const d = state.diagnostico;
    if (!d) {
      renderConFoco(diagnosticoEl, '');
      return;
    }
    const { info } = d;
    renderConFoco(
      diagnosticoEl,
      html`
        <div class="diagnostico diagnostico--${info.variante}" data-estado="${info.estado}"${d.desactualizado ? crudo(' data-desactualizado="true"') : ''}>
          <h${sub} class="diagnostico__titulo titulo-3">${ico(info.icono)}<span>${info.titulo}</span></h${sub}>
          ${info.parrafos.map((p) => html`<p class="diagnostico__texto">${p}</p>`)}
          ${d.desactualizado
            ? html`<p class="diagnostico__nota">${ico('lapiz', 20)}<span>Cambiaste tu procedimiento. Toca «Revisar» para ver cómo va ahora.</span></p>`
            : ''}
        </div>`,
    );
  }

  function pintarPistas() {
    if (!state.pistas.length) {
      renderConFoco(pistasEl, '');
      return;
    }
    renderConFoco(
      pistasEl,
      html`
        <h${sub} class="cuaderno__subtitulo titulo-3" id="${ids.pistas}">Pistas de Tecu</h${sub}>
        <ol class="pistas" role="list" aria-labelledby="${ids.pistas}">
          ${state.pistas.map(
            (p, i) => html`<li class="pista"><strong class="pista__nivel">Pista ${i + 1} de ${MAX_PISTAS}</strong> <span class="pista__texto">${p}</span></li>`,
          )}
        </ol>`,
    );
  }

  function pintarSolucion() {
    if (!state.solucion) {
      renderConFoco(solucionEl, '');
      return;
    }
    renderConFoco(
      solucionEl,
      html`
        <div class="cuaderno__solucion">
          <h${sub} class="cuaderno__subtitulo titulo-3" id="${ids.solucion}" tabindex="-1" data-foco="solucion">${ico('ojo')}<span>Solución paso a paso</span></h${sub}>
          <ol class="cuaderno__pasos" role="list" aria-labelledby="${ids.solucion}">
            ${state.solucion.map(
              (paso, i) => html`<li class="cuaderno__paso"><span class="cuaderno__num" aria-hidden="true">${i + 1}</span><span class="cuaderno__contenido"><span class="solo-lector">Paso ${i + 1}: </span>${htmlMath(paso)}</span></li>`,
            )}
          </ol>
          <p class="texto-sec">Compárala con tu procedimiento, renglón por renglón.</p>
        </div>`,
    );
  }

  /* ---------------- Entrada: errores de escritura ---------------- */

  function mostrarErrorEntrada(mensaje, { avisar = true } = {}) {
    state.errorEntrada = mensaje;
    errorEl.innerHTML = String(html`${ico('alerta', 20)}<span>${mensaje}</span>`);
    errorEl.hidden = false;
    entrada.setAttribute('aria-invalid', 'true');
    entrada.setAttribute('aria-describedby', `${ids.error} ${ids.instruccion}`);
    if (avisar) anunciar(mensaje);
  }

  function limpiarErrorEntrada() {
    if (state.errorEntrada === null) return;
    state.errorEntrada = null;
    errorEl.hidden = true;
    errorEl.textContent = '';
    entrada.removeAttribute('aria-invalid');
    entrada.setAttribute('aria-describedby', ids.instruccion);
  }

  /* ---------------- Cambios en los renglones ---------------- */

  function analizar() {
    return analizarProcedimiento([ejercicio, ...state.renglones]);
  }

  /** Recalcula marcas (en vivo) o las quita (venían de una revisión que ya no vale). */
  function alCambiarRenglones() {
    state.marcas = enVivo && state.renglones.length ? marcasDe(analizar(), state.renglones.length) : null;
    if (state.diagnostico && !state.diagnostico.desactualizado) {
      state.diagnostico.desactualizado = true;
      pintarDiagnostico();
    }
  }

  /**
   * Agrega lo que hay en la entrada como renglón nuevo, o guarda la edición.
   * @returns {boolean} true si se agregó o guardó
   */
  function enviar({ enfocar = true, avisar = true } = {}) {
    const texto = entrada.value.trim();
    const editado = state.editando;
    const n = (editado ?? state.renglones.length) + 2;
    if (!texto) {
      mostrarErrorEntrada(
        editado !== null
          ? `El renglón ${n} quedó vacío. Escribe una ecuación o toca «Cancelar».`
          : `Escribe una ecuación en el renglón ${n} antes de agregarlo.`,
        { avisar },
      );
      return false;
    }
    const lectura = parsearRenglon(texto);
    if (!lectura.ok) {
      mostrarErrorEntrada(lectura.error.mensaje, { avisar });
      return false;
    }

    if (editado !== null) {
      state.renglones[editado] = texto;
      state.editando = null;
      entrada.value = state.borradorGuardado;
      state.borradorGuardado = '';
    } else {
      state.renglones.push(texto);
      entrada.value = '';
    }
    const indice = editado ?? state.renglones.length - 1;
    limpiarErrorEntrada();
    alCambiarRenglones();
    state.nuevo = indice;
    pintarRenglones();
    pintarEntrada();
    if (enfocar) entrada.focus();
    if (typeof entrada.scrollIntoView === 'function') entrada.scrollIntoView({ block: 'nearest' });

    if (avisar) {
      const marca = state.marcas?.[indice];
      const verbo = editado !== null ? 'actualizado' : 'agregado';
      anunciar(`Renglón ${n} ${verbo}: ${paraLector(texto)}.${marca?.texto ? ` ${marca.texto}.` : ''}`);
    }
    return true;
  }

  function editar(i) {
    if (state.escribiendo || i < 0 || i >= state.renglones.length) return;
    if (state.editando === null) state.borradorGuardado = entrada.value;
    state.editando = i;
    entrada.value = state.renglones[i];
    limpiarErrorEntrada();
    pintarRenglones();
    pintarEntrada();
    entrada.focus();
    anunciar(`Editando el renglón ${i + 2}. Cambia lo que necesites y toca «Guardar».`);
  }

  function cancelarEdicion({ enfocar = true, avisar = true } = {}) {
    const i = state.editando;
    if (i === null) return;
    state.editando = null;
    entrada.value = state.borradorGuardado;
    state.borradorGuardado = '';
    limpiarErrorEntrada();
    pintarRenglones();
    pintarEntrada();
    if (enfocar) (lista.querySelector(`[data-foco="editar-${i}"]`) || entrada).focus();
    if (avisar) anunciar(`El renglón ${i + 2} se quedó como estaba.`);
  }

  function borrar(i) {
    if (state.escribiendo || i < 0 || i >= state.renglones.length) return;
    state.renglones.splice(i, 1);
    if (state.editando === i) {
      state.editando = null;
      entrada.value = state.borradorGuardado;
      state.borradorGuardado = '';
      limpiarErrorEntrada();
    } else if (state.editando !== null && state.editando > i) {
      state.editando -= 1;
    }
    alCambiarRenglones();
    pintarRenglones(); // si el foco estaba en "Borrar", pasa al "Borrar" del renglón que ocupó su lugar
    pintarEntrada();
    const destino =
      lista.querySelector(`[data-foco="borrar-${i}"]`) || lista.querySelector(`[data-foco="borrar-${i - 1}"]`) || entrada;
    if (document.activeElement !== destino) destino.focus();
    const quedan = state.renglones.length;
    anunciar(
      `Borraste el renglón ${i + 2}. ${quedan ? `Quedan ${quedan} ${quedan === 1 ? 'renglón' : 'renglones'} tuyos.` : 'Ya no hay renglones tuyos.'}`,
    );
  }

  /* ---------------- Teclas rápidas ---------------- */

  /** Inserta en la posición del cursor sin perder el foco (ni el teclado del celular). */
  function insertar(texto, desdePuntero) {
    if (entrada.readOnly || state.escribiendo) return;
    const largo = entrada.value.length;
    const ini = entrada.selectionStart ?? largo;
    const fin = entrada.selectionEnd ?? largo;
    if (largo - (fin - ini) + texto.length > MAX_LARGO) return;
    entrada.setRangeText(texto, ini, fin, 'end');
    limpiarErrorEntrada();
    if (document.activeElement !== entrada) {
      // Con el dedo o el ratón se sigue escribiendo en la entrada; con teclado o
      // lector de pantalla el foco se queda en la tecla y se dice qué se escribió.
      if (desdePuntero) entrada.focus();
      else anunciar(`${TECLAS.find((t) => t.texto === texto)?.hablado ?? texto}. Llevas: ${paraLector(entrada.value)}.`);
    }
  }

  /** Barra de herramientas con un solo tope de tabulador: flechas, Inicio y Fin. */
  function moverseEnTeclas(evento) {
    const teclas = [...barra.querySelectorAll('.tecla')];
    const i = teclas.indexOf(document.activeElement);
    if (i < 0) return;
    let destino;
    if (evento.key === 'ArrowRight') destino = i + 1;
    else if (evento.key === 'ArrowLeft') destino = i - 1;
    else if (evento.key === 'Home') destino = 0;
    else if (evento.key === 'End') destino = teclas.length - 1;
    else return;
    evento.preventDefault();
    const j = (destino + teclas.length) % teclas.length;
    teclas.forEach((t, k) => {
      t.tabIndex = k === j ? 0 : -1;
    });
    teclas[j].focus();
  }

  /* ---------------- Revisar ---------------- */

  function describir(analisis) {
    const { estado } = analisis;
    if (estado === 'correcto') {
      return {
        estado,
        variante: 'ok',
        icono: 'exito',
        titulo: '¡Lo lograste!',
        parrafos: [`Llegaste a ${valorEncontrado(analisis)} y cada renglón conserva la solución.`],
      };
    }
    if (estado === 'incompleto') {
      const parrafos = ['Cada renglón conserva la solución, pero todavía no dejas la x sola.'];
      parrafos.push(FALTA[analisis.siguiente?.tipo] || 'Te falta dejar la x sola de un lado del =.');
      if (ayudas) parrafos.push('Si te atoras, pide una pista.');
      return { estado, variante: 'revisar', icono: 'lapiz', titulo: 'Vas bien', parrafos };
    }
    if (estado === 'error') {
      const e = analisis.error;
      let texto = pack ? explicarError(e, pack, 'alumno') : `En el renglón ${e.renglon} la ecuación cambió de solución.`;
      if (e.tipo !== TIPOS.NO_CLASIFICADO && e.confianza !== 'alta') texto = `Parece que ${minuscula(texto)}`;
      const parrafos = [texto];
      if (ayudas) parrafos.push('Corrige ese renglón con «Editar» o pide una pista.');
      return { estado, tipo: e.tipo, variante: 'error', icono: 'alerta', titulo: `Revisa el renglón ${e.renglon}`, parrafos };
    }
    if (estado === 'sin_entender' && analisis.renglon > 1) {
      return {
        estado,
        variante: 'revisar',
        icono: 'pregunta',
        titulo: `Tecu no entiende el renglón ${analisis.renglon}`,
        parrafos: [analisis.mensaje, 'Corrígelo con «Editar» y vuelve a revisar.'],
      };
    }
    return {
      estado,
      variante: 'revisar',
      icono: 'pregunta',
      titulo: 'Tecu no pudo revisar esto',
      parrafos: [analisis.mensaje || 'Revisa la ecuación del ejercicio.'],
    };
  }

  function mostrarAviso(info) {
    state.diagnostico = { info, desactualizado: false };
    pintarDiagnostico();
    anunciar(`${info.titulo}. ${info.parrafos.join(' ')}`);
    mostrar(diagnosticoEl.firstElementChild);
  }

  /**
   * Revisa el procedimiento (lo mismo que el botón "Revisar"): si hay algo en la
   * entrada lo agrega primero, analiza, marca los renglones, muestra la caja de
   * diagnóstico, lo anuncia y llama onRevisar.
   * Devuelve null (sin llamar onRevisar) si no hay renglones o si lo escrito en
   * la entrada no se entiende; en ese caso dice qué corregir.
   * Si hay renglones escribiéndose con escribirRenglon, espera a que terminen.
   */
  function revisar() {
    if (destruido) return null;
    if (pendientes > 0) return cola.then(() => revisar());

    if (state.editando !== null || entrada.value.trim()) {
      const n = (state.editando ?? state.renglones.length) + 2;
      if (!enviar({ enfocar: false, avisar: false })) {
        mostrarAviso({
          estado: 'sin_entender',
          variante: 'revisar',
          icono: 'pregunta',
          titulo: `Tecu no entiende el renglón ${n}`,
          parrafos: [state.errorEntrada, 'Corrígelo en la entrada y vuelve a tocar «Revisar».'],
        });
        entrada.focus();
        return null;
      }
    }
    if (!state.renglones.length) {
      mostrarAviso({
        estado: 'vacio',
        variante: 'revisar',
        icono: 'lapiz',
        titulo: 'Todavía no hay pasos',
        parrafos: ['Escribe tu primer paso en el renglón 2 y luego toca «Revisar».'],
      });
      entrada.focus();
      return null;
    }

    const analisis = analizar();
    state.marcas = marcasDe(analisis, state.renglones.length);
    pintarRenglones();
    mostrarAviso(describir(analisis));
    const resultado = {
      analisis,
      renglones: [...state.renglones],
      pistasUsadas: state.pistasUsadas,
      pidioSolucion: state.pidioSolucion,
    };
    llamar(opciones.onRevisar, resultado);
    return resultado;
  }

  /* ---------------- Pistas y solución ---------------- */

  function calcularAyuda() {
    const legibles = state.renglones.filter((r) => parsearRenglon(r).ok);
    try {
      return pistasPara(ejercicio, legibles, pack);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  function pedirPista() {
    if (!ayudas || state.pistasUsadas >= MAX_PISTAS) return;
    const ayuda = calcularAyuda();
    if (!ayuda?.pistas?.length) {
      anunciar('Tecu no tiene pistas para esta ecuación.');
      return;
    }
    const n = state.pistasUsadas + 1;
    const texto = ayuda.pistas[n - 1] || ayuda.pistas[ayuda.pistas.length - 1];
    state.pistas.push(texto);
    state.pistasUsadas = n;
    pintarPistas();
    pintarAcciones();
    anunciar(`Pista ${n} de ${MAX_PISTAS}: ${texto}`);
    mostrar(pistasEl.querySelector('.pista:last-child'));
    llamar(opciones.onPista, n);
  }

  async function verSolucion() {
    if (!ayudas || state.solucion || state.confirmando) return;
    state.confirmando = true;
    const quedanPistas = state.pistasUsadas < MAX_PISTAS;
    const ok = await confirmar({
      titulo: '¿Quieres ver la solución?',
      mensaje: quedanPistas ? 'Se guardará que la pediste. ¿Probaste con una pista?' : 'Se guardará que la pediste.',
      aceptar: 'Sí, ver solución',
      cancelar: 'Cancelar',
    });
    state.confirmando = false;
    if (!ok || destruido) return;
    const ayuda = calcularAyuda();
    if (!ayuda?.solucion?.length) {
      anunciar('Tecu no puede mostrar la solución de esta ecuación.');
      return;
    }
    state.solucion = ayuda.solucion;
    state.pidioSolucion = true;
    pintarSolucion();
    pintarAcciones();
    const titulo = solucionEl.querySelector('[data-foco="solucion"]');
    if (titulo) {
      titulo.focus({ preventScroll: true });
      mostrar(solucionEl.firstElementChild);
    }
    llamar(opciones.onSolucion);
  }

  /* ---------------- Escribir letra por letra (modo presentación) ---------------- */

  const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

  async function escribir(texto, animado, msPorLetra) {
    if (destruido) return false;
    if (state.editando !== null) cancelarEdicion({ enfocar: false, avisar: false });
    entrada.value = '';
    limpiarErrorEntrada();
    if (animado && msPorLetra > 0 && !movimientoReducido()) {
      state.escribiendo = true;
      entrada.readOnly = true;
      raiz.classList.add('cuaderno-panel--escribiendo');
      try {
        for (const letra of Array.from(texto)) {
          if (destruido) return false;
          entrada.value += letra;
          await pausa(msPorLetra);
        }
      } finally {
        state.escribiendo = false;
        entrada.readOnly = false;
        raiz.classList.remove('cuaderno-panel--escribiendo');
      }
      if (destruido) return false;
    } else {
      entrada.value = texto;
    }
    return enviar({ enfocar: false });
  }

  /**
   * Escribe `texto` en la entrada letra por letra (de golpe con movimiento
   * reducido) y lo agrega como renglón. Las llamadas se encadenan solas.
   * @returns {Promise<boolean>} true si el renglón se agregó
   */
  function escribirRenglon(texto, { animado = true, msPorLetra = 60 } = {}) {
    pendientes += 1;
    const tarea = cola.then(() => escribir(String(texto ?? ''), animado, Number(msPorLetra) || 0));
    cola = tarea
      .catch((error) => console.error(error))
      .finally(() => {
        pendientes -= 1;
      });
    return tarea;
  }

  /* ---------------- Utilidades ---------------- */

  function llamar(fn, ...args) {
    if (typeof fn !== 'function') return;
    try {
      fn(...args);
    } catch (error) {
      console.error(error);
    }
  }

  function mostrar(el) {
    if (!el || typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({ block: 'nearest', behavior: movimientoReducido() ? 'auto' : 'smooth' });
  }

  /* ---------------- Eventos ---------------- */

  const escuchas = [];
  function escuchar(el, tipo, fn) {
    el.addEventListener(tipo, fn);
    escuchas.push(() => el.removeEventListener(tipo, fn));
  }

  escuchas.push(
    delegar(raiz, {
      tecla: (el, evento) => insertar(el.dataset.texto, evento.detail > 0),
      editar: (el) => editar(Number(el.dataset.i)),
      borrar: (el) => borrar(Number(el.dataset.i)),
      cancelar: () => cancelarEdicion(),
      revisar: () => revisar(),
      pista: () => pedirPista(),
      solucion: () => verSolucion(),
    }),
  );

  escuchar(form, 'submit', (evento) => {
    evento.preventDefault();
    if (!state.escribiendo) enviar();
  });

  // Escribir solo limpia el mensaje de error: nunca repinta.
  escuchar(entrada, 'input', () => limpiarErrorEntrada());

  // Las teclas rápidas y "Agregar" no le quitan el foco a la entrada (el teclado
  // del celular no se cierra ni se pierde el cursor).
  escuchar(raiz, 'mousedown', (evento) => {
    if (document.activeElement === entrada && evento.target.closest?.('[data-mantener-foco]')) evento.preventDefault();
  });

  escuchar(barra, 'keydown', moverseEnTeclas);

  escuchar(raiz, 'keydown', (evento) => {
    if (evento.isComposing) return;
    if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
      evento.preventDefault();
      revisar();
    } else if (evento.key === 'Escape' && evento.target === entrada && state.editando !== null) {
      evento.preventDefault();
      cancelarEdicion();
    }
  });

  /* ---------------- Inicio ---------------- */

  pintarRenglones();
  pintarEntrada();
  pintarAcciones();

  function destruir() {
    if (destruido) return;
    destruido = true;
    escuchas.splice(0).forEach((quitar) => quitar());
    raiz.remove();
  }

  return {
    escribirRenglon,
    revisar,
    renglones: () => [...state.renglones],
    enfocar: () => entrada.focus(),
    destruir,
  };
}
