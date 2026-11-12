/**
 * Cuadernillo imprimible de Tecu Aprende (panel docente).
 *
 * Solo 1 de cada 4 escuelas tiene internet y no todos los estudiantes tienen
 * celular. Con 1 clic el docente imprime, para quien no tiene celular, LOS MISMOS
 * EJERCICIOS de la ruta, con renglones para escribir el procedimiento paso por
 * paso y, en hoja aparte, la clave con los pasos y el error a vigilar.
 *
 * Sin PDF ni dependencias: imprimirCuadernillo() agrega al final de <body> una
 * sección .solo-impresion (en pantalla no se ve), marca <html> con
 * .imprimiendo-cuadernillo para que css/impresion.css oculte la app entera al
 * imprimir, llama window.print() y quita todo en 'afterprint'.
 *
 * Hojas (tamaño carta). Cada estudiante recibe 1 hoja por las dos caras con la
 * ruta normal (4 ejercicios):
 *   hoja 1    encabezado (Nombre, Grupo, Fecha), "Antes de empezar" (meta de la
 *             ruta, balanza en blanco y negro, regla de oro) y el ejercicio 1
 *   hoja 2…   hasta 3 ejercicios por hoja
 *   clave     al final y en hoja aparte, solo para el docente
 * Si `alumnos` trae nombres, sale un juego por estudiante con su nombre impreso.
 *
 * Armar el HTML es puro (sin DOM): htmlCuadernillo() y prepararCuadernillo() se
 * pueden probar en Node.
 */
import {
  TIPOS,
  analizarProcedimiento,
  ecuacion,
  fmtNum,
  pasosSolucion,
  procedimientoConError,
  resolver,
} from '../core/engine.js';
import { construirRuta } from '../core/ruta.js';
import { explicarError } from '../core/textos.js';
import { anunciar, crudo, esc, html } from './dom.js';
import { formatearEcuacion, htmlEcuacion, leerEcuacion } from './cuaderno.js';
import { tecuSVG } from './tecu.js';

/** Clase de <html> mientras hay un cuadernillo armado: al imprimir solo sale él. */
export const CLASE_IMPRIMIENDO = 'imprimiendo-cuadernillo';

const REGLA_DE_ORO = 'Lo que haces de un lado del =, lo haces del otro.';
/** Ejercicios por hoja a partir de la hoja 2 (la 1 lleva la portada y el ejercicio 1). */
const POR_HOJA = 3;
const RENGLONES = Object.freeze({ min: 6, max: 8 });

/* ------------------------------------------------------------------ */
/* Datos                                                               */
/* ------------------------------------------------------------------ */

/**
 * @typedef {{ ecuacion: string, nivel?: number, comprobacion?: boolean }} EjercicioEntrada
 *
 * @typedef {{
 *   titulo?: string,                  // p. ej. el nombre del grupo de refuerzo; va en la clave
 *   alumnos?: Array<string|{nombre?: string}>,   // nombres (o ResumenAlumno): un juego por estudiante
 *   tipo?: string,                    // error de la ruta (TIPOS de engine.js)
 *   ejercicios?: Array<string|EjercicioEntrada> | {practica: EjercicioEntrada[], comprobacion?: EjercicioEntrada},
 *   semilla?: string,                 // solo si no vienen ejercicios: construirRuta(tipo, semilla)
 * }} OpcionesCuadernillo
 */

/** Nombres impresos: acepta textos o resúmenes de alumno ({ nombre }). */
function nombresDe(alumnos) {
  return (Array.isArray(alumnos) ? alumnos : [])
    .map((a) => String((typeof a === 'string' ? a : a?.nombre) ?? '').trim())
    .filter(Boolean);
}

/**
 * Ejercicios tal como llegan: un arreglo, o una ruta de construirRuta() (práctica
 * más la comprobación sin ayuda). Si no llega ninguno, se genera la ruta del tipo
 * con la misma regla que la app (evitando las ecuaciones del diagnóstico).
 */
function entradasDe(ejercicios, tipo, semilla, pack) {
  if (Array.isArray(ejercicios) && ejercicios.length) return ejercicios;
  const ruta =
    ejercicios && Array.isArray(ejercicios.practica)
      ? ejercicios
      : construirRuta(tipo, semilla || `cuadernillo:${tipo}`, (pack?.diagnostico || []).map((d) => d.ecuacion));
  return [...ruta.practica, ...(ruta.comprobacion ? [{ ...ruta.comprobacion, comprobacion: true }] : [])];
}

/**
 * El error típico de la ruta aplicado a este ejercicio, escrito por el propio
 * motor: el renglón equivocado, la explicación para el docente y a qué respuesta
 * lleva (para calificar rápido). null si el error no aparece en este ejercicio.
 */
function errorAVigilar(texto, tipo, pack, respuesta) {
  if (!tipo || tipo === TIPOS.NO_CLASIFICADO || !pack?.errores) return null;
  try {
    const renglones = procedimientoConError(texto, tipo);
    if (!renglones) return null;
    const analisis = analizarProcedimiento(renglones);
    if (analisis.estado !== 'error' || analisis.error?.tipo !== tipo) return null;
    const final = formatearEcuacion(renglones[renglones.length - 1]);
    return {
      linea: formatearEcuacion(renglones[analisis.error.renglon - 1]),
      explicacion: explicarError(analisis.error, pack, 'docente'),
      llegaA: /^x = /.test(final) && final !== respuesta ? final : null,
    };
  } catch {
    return null;
  }
}

function prepararEjercicio(entrada, tipo, pack) {
  const texto = typeof entrada === 'string' ? entrada : entrada?.ecuacion;
  let eq;
  try {
    eq = ecuacion(texto);
  } catch {
    console.warn(`Cuadernillo: se omite «${texto}» porque no es una ecuación válida.`);
    return null;
  }
  const pasos = pasosSolucion(eq).map((p) => formatearEcuacion(p.texto));
  const sol = resolver(eq);
  const respuesta =
    sol.tipo === 'unica' ? `x = ${fmtNum(sol.valor)}` : sol.tipo === 'todas' ? 'Cualquier número' : 'No tiene solución';
  const nivel = Number(entrada?.nivel);
  return {
    texto: formatearEcuacion(texto),
    nivel: nivel >= 1 && nivel <= 3 ? nivel : null,
    reto: Boolean(entrada?.comprobacion),
    pasos,
    respuesta,
    // Holgura de 2 renglones sobre los pasos canónicos (comprobar, corregir), entre 6 y 8.
    renglones: Math.min(RENGLONES.max, Math.max(RENGLONES.min, pasos.length + 2)),
    vigilar: errorAVigilar(texto, tipo, pack, respuesta),
  };
}

/** Hoja 1: el ejercicio 1 (comparte hoja con la portada). Después, de 3 en 3. */
function repartirEnHojas(ejercicios) {
  const hojas = [ejercicios.slice(0, 1)];
  for (let i = 1; i < ejercicios.length; i += POR_HOJA) hojas.push(ejercicios.slice(i, i + POR_HOJA));
  return hojas;
}

/**
 * Todo lo que se imprime, ya calculado (puro, sin DOM).
 * @param {OpcionesCuadernillo} opciones
 * @param {object} pack packs/ecuaciones-1.json
 */
export function prepararCuadernillo({ titulo, alumnos = [], tipo, ejercicios, semilla } = {}, pack = {}) {
  const errores = pack?.errores || {};
  const primero = Array.isArray(ejercicios) ? ejercicios[0] : ejercicios;
  const tipoRuta = [tipo, primero?.tipo].find((t) => t && errores[t]) || TIPOS.NO_CLASIFICADO;
  const info = errores[tipoRuta] || {};
  const lista = entradasDe(ejercicios, tipoRuta, semilla, pack)
    .map((e) => prepararEjercicio(e, tipoRuta, pack))
    .filter(Boolean)
    .map((e, i) => ({ ...e, numero: i + 1 }));
  const nombres = nombresDe(alumnos);
  const hojas = repartirEnHojas(lista);
  return {
    titulo: String(titulo ?? '').trim() || info.nombre || 'Cuadernillo',
    tipo: tipoRuta,
    tema: [pack?.tema || 'Ecuaciones lineales', pack?.materia, pack?.grado].filter(Boolean).join(' · '),
    ruta: {
      titulo: info.ruta?.titulo || 'Ecuaciones paso a paso',
      meta: info.ruta?.meta || '',
      visual: info.ruta?.visual || null,
    },
    error: { nombre: info.nombre || '', resumen: info.resumen || '' },
    actividad: info.actividadGrupo || '',
    nombres,
    ejercicios: lista,
    hojas,
    hojasPorAlumno: hojas.length,
    totalHojas: Math.max(1, nombres.length) * hojas.length + 1,
  };
}

/* ------------------------------------------------------------------ */
/* Dibujos en blanco y negro                                           */
/* ------------------------------------------------------------------ */

/** Tecu chiquito en escala de grises (vectorial): cada color del dibujo pasa a su gris. */
function tecuEnGrises() {
  return tecuSVG({ estado: 'feliz', tamano: 72, decorativo: true }).replace(
    /#([0-9a-f]{6}|[0-9a-f]{3})\b/gi,
    (_, hex) => {
      const h = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
      const gris = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
        .toString(16)
        .padStart(2, '0');
      return `#${gris}${gris}${gris}`;
    },
  );
}

/** Geometría de la balanza impresa (unidades del viewBox, 320 de ancho). */
const B = Object.freeze({ ancho: 320, centro: 160, cx: { L: 78, R: 242 }, medio: 70, celda: 24, porFila: 5 });
const r1 = (n) => Math.round(n * 10) / 10;

/** Cajas (x) y pesas (1) de un lado, como en la balanza de la app. null si no se puede dibujar. */
function piezasDe(terminos) {
  const piezas = [];
  for (const t of terminos) {
    if (!t.c.isInt() || Math.abs(t.c.n) > 20) return null;
    for (let i = 0; i < Math.abs(t.c.n); i++) piezas.push({ caja: t.x, neg: t.c.isNeg() });
  }
  return piezas.length > 25 ? null : piezas;
}

/** Modo "quitar": tacha las pesas del lado de las cajas y las mismas del otro lado. */
function tacharQuitadas(piezas) {
  const conX = ['L', 'R'].filter((l) => piezas[l].some((p) => p.caja));
  if (conX.length !== 1) return 0;
  const lado = conX[0];
  const otro = lado === 'L' ? 'R' : 'L';
  const quitar = piezas[lado].filter((p) => !p.caja);
  const delOtro = piezas[otro];
  const sencillo = [...quitar, ...delOtro].every((p) => !p.neg) && delOtro.every((p) => !p.caja);
  if (!quitar.length || !sencillo || delOtro.length < quitar.length) return 0;
  [...quitar, ...delOtro.slice(-quitar.length)].forEach((p) => {
    p.tachada = true;
  });
  return quitar.length;
}

/** Modo "repartir": las pesas en tantos grupos iguales como cajas (si se puede dibujar así). */
function gruposDeReparto(piezas) {
  for (const lado of ['L', 'R']) {
    const otro = lado === 'L' ? 'R' : 'L';
    const cajas = piezas[lado];
    const pesas = piezas[otro];
    const limpio =
      cajas.length && pesas.length && cajas.every((p) => p.caja && !p.neg) && pesas.every((p) => !p.caja && !p.neg);
    if (limpio && cajas.length <= 5 && pesas.length % cajas.length === 0 && pesas.length / cajas.length <= 5) {
      return { lado: otro, grupos: cajas.length, porGrupo: pesas.length / cajas.length };
    }
  }
  return null;
}

/** Posiciones (columna, fila desde abajo) de las piezas de un platillo. */
function acomodar(piezas, reparto) {
  if (reparto) {
    const hueco = 8;
    const ancho = reparto.grupos * B.celda + (reparto.grupos - 1) * hueco;
    return piezas.map((p, i) => ({
      p,
      dx: -ancho / 2 + B.celda / 2 + Math.floor(i / reparto.porGrupo) * (B.celda + hueco),
      fila: i % reparto.porGrupo,
      grupo: Math.floor(i / reparto.porGrupo),
    }));
  }
  return piezas.map((p, i) => {
    const fila = Math.floor(i / B.porFila);
    const enFila = Math.min(B.porFila, piezas.length - fila * B.porFila);
    return { p, dx: -(enFila * B.celda) / 2 + B.celda / 2 + (i % B.porFila) * B.celda, fila };
  });
}

function piezaSVG({ p }, x, y) {
  const trazo = p.tachada ? '#6b6b6b' : '#000';
  const punteado = p.neg ? ' stroke-dasharray="3 2"' : '';
  const forma = p.caja
    ? `<rect x="-10" y="-10" width="20" height="20" rx="2.5" fill="#fff" stroke="${trazo}" stroke-width="1.6"${punteado}/>` +
      (p.neg ? '' : `<path d="M-10 -4 H10" stroke="${trazo}" stroke-width="1.1"/>`)
    : `<circle r="10" fill="#fff" stroke="${trazo}" stroke-width="1.6"${punteado}/>`;
  const etiqueta = p.caja ? (p.neg ? '−x' : 'x') : p.neg ? '−1' : '1';
  const texto = `<text y="${p.caja && !p.neg ? 6.5 : 4.4}" font-size="${p.caja && !p.neg ? 12 : 11}" fill="${trazo}">${etiqueta}</text>`;
  const tache = p.tachada
    ? '<path d="M-9 -9 L9 9 M9 -9 L-9 9" stroke="#000" stroke-width="2.4" stroke-linecap="round"/>'
    : '';
  return `<g transform="translate(${r1(x)} ${r1(y)})">${forma}${texto}${tache}</g>`;
}

function contarPiezas(piezas) {
  const cuantas = (caja, neg) => piezas.filter((p) => p.caja === caja && p.neg === neg).length;
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const partes = [
    [cuantas(true, false), 'caja', 'cajas'],
    [cuantas(true, true), 'caja con signo menos', 'cajas con signo menos'],
    [cuantas(false, false), 'pesa', 'pesas'],
    [cuantas(false, true), 'pesa con signo menos', 'pesas con signo menos'],
  ]
    .filter(([n]) => n)
    .map(([n, uno, varios]) => plural(n, uno, varios));
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}` : partes[0] || 'nada';
}

/**
 * Balanza en equilibrio (SVG en blanco y negro) para la ecuación del ejemplo de la
 * ruta: cajas = x, pesas = 1. En "quitar" se tachan las pesas que se quitan de los
 * dos platillos; en "repartir" las pesas van en grupos iguales, uno por caja.
 * @returns {{svg: string, leyenda: string}|null} null si la ecuación no se puede dibujar
 */
function balanzaSVG(texto, modo) {
  let eq;
  try {
    eq = ecuacion(texto);
  } catch {
    return null;
  }
  const piezas = { L: piezasDe(eq.L), R: piezasDe(eq.R) };
  if (!piezas.L || !piezas.R || !(piezas.L.length + piezas.R.length)) return null;
  const quitadas = modo === 'quitar' ? tacharQuitadas(piezas) : 0;
  const reparto = modo === 'repartir' ? gruposDeReparto(piezas) : null;
  const lugares = {
    L: acomodar(piezas.L, reparto?.lado === 'L' ? reparto : null),
    R: acomodar(piezas.R, reparto?.lado === 'R' ? reparto : null),
  };
  const filas = Math.max(1, ...['L', 'R'].flatMap((l) => lugares[l].map((u) => u.fila + 1)));
  const sup = 10 + filas * B.celda; // superficie de los platillos
  const viga = sup + 30;
  const alto = viga + 60;

  const platillo = (cx) =>
    `<rect x="${cx - 3}" y="${sup + 11}" width="6" height="${viga - sup - 16}"/>` +
    `<path d="M${cx - B.medio} ${sup} H${cx + B.medio} L${cx + 62} ${sup + 9} Q${cx} ${sup + 15} ${cx - 62} ${sup + 9} Z"/>`;
  const estructura =
    `<path d="M116 ${viga + 58} H204 L192 ${viga + 46} H128 Z"/>` +
    `<rect x="155" y="${viga}" width="10" height="46"/>` +
    platillo(B.cx.L) +
    platillo(B.cx.R) +
    `<rect x="${B.cx.L - 16}" y="${viga - 5}" width="${B.cx.R - B.cx.L + 32}" height="10" rx="5"/>` +
    `<circle cx="${B.centro}" cy="${viga}" r="7"/><circle cx="${B.centro}" cy="${viga}" r="2" fill="#000"/>`;

  const yDe = (fila) => sup - B.celda / 2 - fila * B.celda;
  const dibujoPiezas = ['L', 'R']
    .map((l) => lugares[l].map((u) => piezaSVG(u, B.cx[l] + u.dx, yDe(u.fila))).join(''))
    .join('');
  let grupos = '';
  if (reparto) {
    const cx = B.cx[reparto.lado];
    for (let g = 0; g < reparto.grupos; g++) {
      const xs = lugares[reparto.lado].filter((u) => u.grupo === g).map((u) => cx + u.dx);
      const x = Math.min(...xs) - 13;
      const y = yDe(reparto.porGrupo - 1) - 13;
      grupos += `<rect x="${r1(x)}" y="${r1(y)}" width="26" height="${reparto.porGrupo * B.celda + 2}" rx="8" fill="none" stroke="#000" stroke-width="1.2" stroke-dasharray="4 3"/>`;
    }
  }

  const describir = (l) => contarPiezas(piezas[l]);
  const etiqueta =
    `Balanza en equilibrio que representa ${leerEcuacion(texto)}. ` +
    `Platillo izquierdo: ${describir('L')}. Platillo derecho: ${describir('R')}.` +
    (quitadas ? ` Se tachan ${quitadas} ${quitadas === 1 ? 'pesa' : 'pesas'} en cada platillo.` : '') +
    (reparto ? ` Las pesas están repartidas en ${reparto.grupos} grupos iguales.` : '');
  const svg =
    `<svg class="cuadernillo__balanza-dibujo" viewBox="0 0 ${B.ancho} ${alto}" role="img" aria-label="${esc(etiqueta)}" focusable="false" xmlns="http://www.w3.org/2000/svg">` +
    `<g fill="#fff" stroke="#000" stroke-width="2" stroke-linejoin="round">${estructura}</g>` +
    `<g font-family="Nunito, system-ui, sans-serif" font-weight="800" text-anchor="middle">${dibujoPiezas}</g>` +
    grupos +
    `</svg>`;

  const hayNegativas = [...piezas.L, ...piezas.R].some((p) => p.neg);
  const leyenda = [
    'Cada caja es una x y cada pesa vale 1.',
    hayNegativas ? 'Una caja con signo menos resta peso.' : '',
    quitadas ? 'Lo tachado se quita de los dos platillos.' : '',
    reparto ? 'Las pesas se reparten en grupos iguales, uno por caja.' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return { svg, leyenda };
}

/* ------------------------------------------------------------------ */
/* HTML                                                                */
/* ------------------------------------------------------------------ */

function dato(etiqueta, valor = '') {
  return html`<div class="cuadernillo__dato"><dt>${etiqueta}:</dt><dd>${valor}</dd></div>`;
}

function figuraBalanza(visual) {
  const dibujo = balanzaSVG(visual.ecuacion, visual.modo);
  if (!dibujo) return '';
  return html`<figure class="cuadernillo__balanza">
    ${crudo(dibujo.svg)}
    <figcaption>
      <span class="cuadernillo__balanza-ecuacion">${htmlEcuacion(visual.ecuacion)}</span>
      <span class="cuadernillo__balanza-leyenda">${dibujo.leyenda}</span>
    </figcaption>
  </figure>`;
}

function antesDeEmpezar(d) {
  const { meta, visual } = d.ruta;
  const figura = visual?.ecuacion ? figuraBalanza(visual) : '';
  return html`<section class="cuadernillo__antes">
    <h2 class="cuadernillo__h2">Antes de empezar</h2>
    <div class="cuadernillo__antes-cuerpo${figura ? '' : ' cuadernillo__antes-cuerpo--texto'}">
      ${figura}
      <div class="cuadernillo__antes-texto">
        ${meta ? html`<p><strong>Tu meta:</strong> ${meta}</p>` : ''}
        ${visual?.cierre ? html`<p>${visual.cierre}</p>` : ''}
      </div>
    </div>
    <p class="cuadernillo__regla"><strong>Regla de oro:</strong> ${REGLA_DE_ORO}</p>
  </section>`;
}

function bloqueEjercicio(e, total) {
  const etiqueta = [e.nivel ? `Nivel ${e.nivel}` : '', e.reto ? 'Reto final' : ''].filter(Boolean).join(' · ');
  return html`<section class="cuadernillo__ejercicio">
    <div class="cuadernillo__ejercicio-cabeza">
      <h3 class="cuadernillo__ejercicio-titulo">Ejercicio ${e.numero} de ${total}</h3>
      <p class="cuadernillo__enunciado">${htmlEcuacion(e.texto)}</p>
      ${etiqueta ? html`<p class="cuadernillo__nivel">${etiqueta}</p>` : ''}
    </div>
    <ol class="cuadernillo__renglones" aria-label="Renglones para escribir tu procedimiento">
      ${Array.from({ length: e.renglones }, () => html`<li></li>`)}
    </ol>
    <div class="cuadernillo__pie">
      <p>Mi respuesta: <span class="math">x =</span> <span class="cuadernillo__hueco"></span></p>
      <p class="cuadernillo__casilla"><span class="cuadernillo__cuadro" aria-hidden="true"></span>Lo resolví sin ayuda</p>
    </div>
  </section>`;
}

function hojaPortada(d, nombre, ejercicios) {
  return html`<div class="cuadernillo__hoja">
    <header class="cuadernillo__portada">
      <span class="cuadernillo__tecu">${crudo(tecuEnGrises())}</span>
      <div>
        <p class="cuadernillo__marca">Tecu Aprende · Cuadernillo</p>
        <h1 class="cuadernillo__titulo">${d.ruta.titulo}</h1>
        <p class="cuadernillo__tema">${d.tema}</p>
      </div>
      <p class="cuadernillo__folio">Hoja 1 de ${d.hojasPorAlumno}</p>
    </header>
    <dl class="cuadernillo__datos">${dato('Nombre', nombre)}${dato('Grupo')}${dato('Fecha')}</dl>
    ${antesDeEmpezar(d)}
    ${
      ejercicios.length
        ? html`<section class="cuadernillo__ejercicios">
            <h2 class="cuadernillo__h2">Ejercicios</h2>
            <p class="cuadernillo__instrucciones">Escribe un paso en cada renglón. Al terminar, sustituye tu respuesta en la ecuación para comprobarla y, si lo resolviste sin ayuda, marca la casilla.</p>
            ${ejercicios.map((e) => bloqueEjercicio(e, d.ejercicios.length))}
          </section>`
        : ''
    }
  </div>`;
}

function hojaEjercicios(d, nombre, ejercicios, numero) {
  return html`<div class="cuadernillo__hoja">
    <p class="cuadernillo__cabeza">
      <span>Nombre: ${nombre ? html`<strong>${nombre}</strong>` : html`<span class="cuadernillo__hueco cuadernillo__hueco--nombre"></span>`}</span>
      <span>${d.ruta.titulo} · Hoja ${numero} de ${d.hojasPorAlumno}</span>
    </p>
    ${ejercicios.map((e) => bloqueEjercicio(e, d.ejercicios.length))}
  </div>`;
}

function juegoDeAlumno(d, nombre) {
  return html`<article class="cuadernillo__alumno" aria-label="${nombre ? `Cuadernillo de ${nombre}` : 'Cuadernillo'}">
    ${d.hojas.map((ejercicios, i) => (i === 0 ? hojaPortada(d, nombre, ejercicios) : hojaEjercicios(d, nombre, ejercicios, i + 1)))}
  </article>`;
}

function vigilarHTML(v) {
  return html`<p><strong class="math">«${v.linea}»</strong></p>
    <p>${v.explicacion}</p>
    ${v.llegaA ? html`<p>Con ese error llega a <span class="math">${v.llegaA}</span>.</p>` : ''}`;
}

function filaClave(e, conVigilar) {
  const etiqueta = [e.nivel ? `Nivel ${e.nivel}` : '', e.reto ? 'Reto final' : ''].filter(Boolean).join(' · ');
  return html`<tr>
    <th scope="row">
      <span class="math cuadernillo__clave-ecuacion">${e.numero}. ${e.texto}</span>
      ${etiqueta ? html`<span class="cuadernillo__clave-nivel">${etiqueta}</span>` : ''}
    </th>
    <td>${e.pasos.length ? html`<ol class="cuadernillo__pasos">${e.pasos.map((p) => html`<li class="math">${p}</li>`)}</ol>` : 'Ya está resuelta.'}</td>
    <td class="math cuadernillo__respuesta">${e.respuesta}</td>
    ${conVigilar ? html`<td>${e.vigilar ? vigilarHTML(e.vigilar) : 'Este ejercicio no da pie a ese error.'}</td>` : ''}
  </tr>`;
}

function clave(d) {
  const conVigilar = d.ejercicios.some((e) => e.vigilar);
  const estudiantes = d.nombres.length ? `${d.nombres.join(', ')} (${d.nombres.length})` : 'Sin nombres: una copia para cada quien';
  return html`<article class="cuadernillo__clave" aria-label="Clave de respuestas para el docente">
    <header class="cuadernillo__clave-cabeza">
      <p class="cuadernillo__marca">Tecu Aprende · Cuadernillo</p>
      <h1 class="cuadernillo__titulo">Clave de respuestas</h1>
      <p class="cuadernillo__sello">Solo para el docente · No repartir</p>
    </header>
    <dl class="cuadernillo__resumen">
      ${dato('Cuadernillo', d.titulo)}${dato('Ruta', `${d.ruta.titulo} · ${d.ejercicios.length} ejercicios`)}${dato('Estudiantes', estudiantes)}
    </dl>
    ${
      d.error.nombre
        ? html`<section class="cuadernillo__vigilar">
            <h2 class="cuadernillo__h2">Error a vigilar: ${d.error.nombre}</h2>
            <p>${d.error.resumen}</p>
          </section>`
        : ''
    }
    <section>
      <h2 class="cuadernillo__h2">Respuestas paso a paso</h2>
      <table class="cuadernillo__tabla">
        <thead>
          <tr>
            <th scope="col">Ejercicio</th>
            <th scope="col">Pasos de la solución</th>
            <th scope="col">Respuesta</th>
            ${conVigilar ? html`<th scope="col">Ojo si escribe…</th>` : ''}
          </tr>
        </thead>
        <tbody>${d.ejercicios.map((e) => filaClave(e, conVigilar))}</tbody>
      </table>
    </section>
    ${
      d.actividad
        ? html`<section class="cuadernillo__actividad">
            <h2 class="cuadernillo__h2">Actividad para el grupo</h2>
            <p>${d.actividad}</p>
          </section>`
        : ''
    }
  </article>`;
}

function cuerpo(d) {
  const copias = d.nombres.length ? d.nombres : [''];
  return html`${copias.map((nombre) => juegoDeAlumno(d, nombre))}${clave(d)}`;
}

/**
 * HTML del cuadernillo (lo que va dentro de la sección .cuadernillo). Puro: sirve en Node.
 * @param {OpcionesCuadernillo} opciones
 * @param {object} pack
 * @returns {string}
 */
export function htmlCuadernillo(opciones, pack) {
  return String(cuerpo(prepararCuadernillo(opciones, pack)));
}

/* ------------------------------------------------------------------ */
/* Impresión                                                           */
/* ------------------------------------------------------------------ */

/** Cuadernillo armado ahora (uno a la vez): { limpiar, temporizador }. */
let actual = null;

/** Quita el cuadernillo armado (si hay) y deja la página como estaba. */
export function quitarCuadernillo() {
  actual?.limpiar();
}

/**
 * Arma el cuadernillo y abre el diálogo de impresión del navegador (sin PDF ni
 * dependencias). Lo llama el panel docente desde la tarjeta de cada grupo de
 * refuerzo y desde la ficha de un estudiante.
 *
 * - Agrega a <body> una sección .cuadernillo.solo-impresion (en pantalla no se ve)
 *   y pone .imprimiendo-cuadernillo en <html>: al imprimir, css/impresion.css oculta
 *   la app entera. Todo se quita en 'afterprint' (o al armar otro cuadernillo).
 * - Mientras está armado, document.title dice "Cuadernillo · <ruta>" (nombre del PDF).
 * - Anuncia "Preparando cuadernillo para imprimir" al lector de pantalla.
 *
 * @param {OpcionesCuadernillo} opciones
 *   `ejercicios`: los de la ruta (arreglo de ecuaciones o de { ecuacion, nivel }, o la
 *   ruta de construirRuta()); si no vienen, se generan con construirRuta(tipo, semilla).
 *   `alumnos`: con nombres, un juego por estudiante con su nombre impreso.
 * @param {object} pack packs/ecuaciones-1.json
 * @param {{imprimir?: boolean}} [config] imprimir:false solo arma la sección (pruebas)
 * @returns {HTMLElement} la sección armada (data-hojas = páginas esperadas)
 */
export function imprimirCuadernillo(opciones = {}, pack, { imprimir = true } = {}) {
  quitarCuadernillo();
  const datos = prepararCuadernillo(opciones, pack);
  const seccion = document.createElement('section');
  seccion.className = 'cuadernillo solo-impresion';
  seccion.setAttribute('aria-label', `Cuadernillo para imprimir: ${datos.ruta.titulo}`);
  seccion.dataset.hojas = String(datos.totalHojas);
  seccion.innerHTML = String(cuerpo(datos));
  document.body.appendChild(seccion);

  const raiz = document.documentElement;
  const tituloPrevio = document.title;
  raiz.classList.add(CLASE_IMPRIMIENDO);
  document.title = `Cuadernillo · ${datos.ruta.titulo}`;

  const estado = {
    temporizador: null,
    limpiar() {
      clearTimeout(estado.temporizador);
      window.removeEventListener('afterprint', estado.limpiar);
      seccion.remove();
      raiz.classList.remove(CLASE_IMPRIMIENDO);
      document.title = tituloPrevio;
      if (actual === estado) actual = null;
    },
  };
  window.addEventListener('afterprint', estado.limpiar);
  actual = estado;

  anunciar('Preparando cuadernillo para imprimir');
  if (imprimir) {
    // Un respiro para que el lector de pantalla diga el aviso y la letra esté lista:
    // en casi todos los navegadores print() detiene la página hasta cerrar el diálogo.
    const fuentes = document.fonts?.ready ?? Promise.resolve();
    fuentes.then(() => {
      if (actual === estado) estado.temporizador = setTimeout(() => window.print(), 150);
    });
  }
  return seccion;
}
