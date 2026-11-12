/**
 * Balanza de platillos interactiva para ecuaciones lineales (SVG + botones).
 *
 * Cajas = x (cuadros con "x"), pesas = 1 (círculos con "1"). La balanza se
 * inclina hacia el platillo que pesa más. Todo se hace con botones o teclado
 * (sin arrastrar, WCAG 2.5.7); hay una región aria-live propia que narra cada
 * cambio y el SVG lleva un aria-label que describe lo que hay en cada platillo.
 *
 * Modos (al lograr la meta se llama onCompletar(resumen) una sola vez):
 *   quitar     quitar 1 pesa de los dos platillos hasta dejar solas las cajas.
 *              Con unLado: también "solo de este platillo" (la balanza se cae)
 *              y "Regresar la pesa".
 *   repartir   elegir tantos grupos como cajas y repartir las pesas.
 *   separar    juntar cajas con cajas y pesas con pesas (caja con pesa no se puede).
 *   comprobar  probar valores de la caja, de −10 a 10, hasta que se equilibre.
 *
 * Si la ecuación no sirve para el modo pedido (por ejemplo, tiene negativos en
 * "quitar"), se usa "comprobar", que acepta cualquier ecuación entera, y se
 * avisa en la consola.
 */
import { ecuacion as leerEcuacion } from '../core/engine.js';
import { html, crudo, esc, attr, renderConFoco, movimientoReducido, esperar } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const MENOS = '−';
const MODOS = ['quitar', 'repartir', 'separar', 'comprobar'];
const MAX_UNIDADES = 40;
const PAUSA_RESOLVER = 650;

/** Geometría del dibujo, en unidades del viewBox (340 × 240). */
const G = Object.freeze({
  px: 170, // pivote (fiel)
  py: 178,
  brazo: 92, // distancia del pivote al centro de cada platillo
  borde: 142, // altura del borde de los platillos en reposo
  celda: 26, // espacio por pieza (la pieza mide 22)
  hueco: 8, // separación entre grupos
  anchoUtil: 132,
  altoUtil: 104,
  angMax: 12,
});
const CX = { L: G.px - G.brazo, R: G.px + G.brazo };
const LADOS = ['L', 'R'];
const NOMBRE = { L: 'izquierda', R: 'derecha' };
const otro = (lado) => (lado === 'L' ? 'R' : 'L');
const ICONO_TONO = { info: 'i', exito: '✓', alerta: '!' };

const TEXTOS = {
  quitar: {
    instruccion: 'Quita pesas sueltas hasta que las cajas se queden solas en su platillo, sin que la balanza pierda el equilibrio.',
    cierre: 'Quitar lo mismo de los dos platillos mantiene el equilibrio: es lo mismo que restar el mismo número en los dos lados del =.',
  },
  repartir: {
    instruccion: 'Elige en cuántos grupos iguales repartes las pesas para que a cada caja le toque su parte.',
    cierre: 'Repartir en grupos iguales es dividir: si varias cajas iguales pesan lo mismo que unas pesas, cada caja pesa el total entre el número de cajas.',
  },
  separar: {
    instruccion: 'En el platillo hay cajas (x) y pesas revueltas. Junta lo que sí se puede juntar.',
    cierre: 'Solo se juntan cosas iguales: cajas con cajas (x con x) y pesas con pesas (números con números).',
  },
  comprobar: {
    instruccion: 'Prueba un valor para la caja. Si la balanza queda derecha, ese valor cumple la ecuación.',
    cierre: 'Si al sustituir el valor los dos lados pesan lo mismo, ese valor es la solución.',
  },
};

let instancias = 0;

/* ------------------------------------------------------------------ */
/* Texto                                                                */
/* ------------------------------------------------------------------ */

const num = (n) => (n < 0 ? `${MENOS}${Math.abs(n)}` : String(n));
const r1 = (n) => Math.round(n * 10) / 10;
const r3 = (n) => Math.round(n * 1000) / 1000;

function contar(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`;
}

function lista(partes) {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/** [{x, c}] → "2x + 3", "−2x", "x − 1" */
function expr(terminos) {
  if (!terminos.length) return '0';
  return terminos
    .map((t, i) => {
      const abs = Math.abs(t.c);
      const cuerpo = t.x ? (abs === 1 ? 'x' : `${abs}x`) : String(abs);
      if (i === 0) return t.c < 0 ? `${MENOS}${cuerpo}` : cuerpo;
      return `${t.c < 0 ? ` ${MENOS} ` : ' + '}${cuerpo}`;
    })
    .join('');
}

/** Sustituye x = v: "2·(3) + 3", "−2·(−4)", "6 + 4" */
function sustitucion(terminos, v) {
  if (!terminos.length) return '0';
  const entre = `(${num(v)})`;
  return terminos
    .map((t, i) => {
      const abs = Math.abs(t.c);
      let cuerpo;
      if (!t.x) cuerpo = String(abs);
      else if (abs === 1) cuerpo = v < 0 ? entre : String(v);
      else cuerpo = `${abs}·${entre}`;
      if (i === 0) return t.c < 0 ? `${MENOS}${cuerpo}` : cuerpo;
      return `${t.c < 0 ? ` ${MENOS} ` : ' + '}${cuerpo}`;
    })
    .join('');
}

/* ------------------------------------------------------------------ */
/* Modelo                                                               */
/* ------------------------------------------------------------------ */

/** Lee la ecuación con el motor y la pasa a términos enteros {x, c}. */
function leerTerminos(texto) {
  const eq = leerEcuacion(texto);
  const lado = (ts) =>
    ts
      .filter((t) => !t.c.isZero())
      .map((t) => {
        if (t.c.d !== 1) throw new Error('la balanza solo dibuja números enteros');
        return { x: t.x, c: t.c.n };
      });
  return { L: lado(eq.L), R: lado(eq.R) };
}

function analizar(terminos) {
  const res = {};
  for (const lado of LADOS) {
    const ts = terminos[lado];
    const xs = ts.filter((t) => t.x);
    const ns = ts.filter((t) => !t.x);
    res[lado] = {
      a: xs.reduce((s, t) => s + t.c, 0),
      b: ns.reduce((s, t) => s + t.c, 0),
      cajas: xs.reduce((s, t) => s + Math.abs(t.c), 0),
      pesas: ns.reduce((s, t) => s + Math.abs(t.c), 0),
      positivos: ts.every((t) => t.c > 0),
    };
  }
  const A = res.L.a - res.R.a;
  const B = res.R.b - res.L.b;
  res.solucion = A === 0 ? null : { n: Math.sign(A) * B, d: Math.abs(A) };
  if (res.solucion) {
    const g = mcd(res.solucion.n, res.solucion.d);
    res.solucion = { n: res.solucion.n / g, d: res.solucion.d / g };
  }
  return res;
}

function mcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** ¿La ecuación sirve para el modo? Devuelve la configuración o null. */
function configurar(modo, an) {
  if (!an.solucion) return null;
  if (LADOS.some((l) => an[l].cajas + an[l].pesas > MAX_UNIDADES)) return null;
  const conCajas = LADOS.filter((l) => an[l].cajas > 0);
  const ladoX = conCajas.length === 1 ? conCajas[0] : null;
  const X = ladoX && an[ladoX];
  const N = ladoX && an[otro(ladoX)];
  switch (modo) {
    case 'quitar':
      if (!ladoX || !X.positivos || !N.positivos) return null;
      if (X.pesas < 1 || N.pesas < X.pesas) return null;
      return { modo, ladoX };
    case 'repartir':
      if (!ladoX || !X.positivos || !N.positivos || X.pesas !== 0 || N.pesas < 1) return null;
      if (N.pesas % X.cajas !== 0) return null;
      return { modo, ladoX };
    case 'separar':
      if (!an.L.positivos || !an.R.positivos) return null;
      return { modo, ladoX: an.L.cajas > 0 ? 'L' : 'R' };
    case 'comprobar':
      return { modo, ladoX: an.L.cajas > 0 ? 'L' : 'R' };
    default:
      return null;
  }
}

/** Grupos de piezas por platillo. En "separar" cada término es un grupo (revueltos). */
function construirLados(terminos, modo) {
  const lados = {};
  for (const lado of LADOS) {
    const cuenta = { caja: 0, pesa: 0 };
    const grupos = [];
    for (const t of terminos[lado]) {
      const tipo = t.x ? 'caja' : 'pesa';
      const signo = t.c < 0 ? -1 : 1;
      let grupo = modo === 'separar' ? null : grupos.find((g) => g.tipo === tipo && g.signo === signo);
      if (!grupo) {
        grupo = { tipo, signo, piezas: [] };
        grupos.push(grupo);
      }
      for (let i = 0; i < Math.abs(t.c); i++) {
        grupo.piezas.push({ k: `${lado}${tipo[0]}${cuenta[tipo]++}`, tipo, signo });
      }
    }
    lados[lado] = grupos;
  }
  return lados;
}

const llenos = (grupos) => grupos.filter((g) => g.piezas.length);
const terminosDe = (grupos) => llenos(grupos).map((g) => ({ x: g.tipo === 'caja', c: g.signo * g.piezas.length }));
const cuantas = (grupos, tipo) => grupos.filter((g) => g.tipo === tipo).reduce((s, g) => s + g.piezas.length, 0);
const conSigno = (grupos, tipo) =>
  grupos.filter((g) => g.tipo === tipo).reduce((s, g) => s + g.signo * g.piezas.length, 0);

/** Peso de un platillo con x = n/d, multiplicado por d para comparar con enteros. */
function peso(grupos, x) {
  return conSigno(grupos, 'caja') * x.n + conSigno(grupos, 'pesa') * x.d;
}

/* ------------------------------------------------------------------ */
/* Dibujo                                                               */
/* ------------------------------------------------------------------ */

/**
 * Recorta el espacio vacío de arriba según cuántas filas de piezas puede haber
 * (más la inclinación y las etiquetas), para que la balanza no ocupe de más.
 */
function margenSuperior(modo, an) {
  if (modo === 'repartir') return 0;
  const filas = Math.max(...LADOS.map((l) => Math.ceil((an[l].cajas + an[l].pesas) / 5)));
  const alto = Math.min(G.altoUtil, filas * G.celda) + 46;
  return Math.max(0, Math.min(60, Math.floor(G.borde - alto)));
}

function esqueletoSVG(modo, arriba) {
  const plato = (lado) => {
    const cx = CX[lado];
    return (
      `<g class="balanza__platillo balanza__platillo--${lado === 'L' ? 'izq' : 'der'}" data-lado="${lado}">` +
      `<rect class="balanza__poste" x="${cx - 3}" y="150" width="6" height="28" rx="2"/>` +
      `<path class="balanza__plato" d="M${cx - 68} ${G.borde} H${cx + 68} L${cx + 61} 150.5 Q${cx} 157 ${cx - 61} 150.5 Z"/>` +
      `<g class="balanza__marcas"></g><g class="balanza__piezas"></g>` +
      `</g>`
    );
  };
  const marcas = [-20, -10, 10, 20]
    .map((a) => {
      const rad = (a * Math.PI) / 180;
      const p = (r) => `${r1(G.px + r * Math.sin(rad))} ${r1(G.py - r * Math.cos(rad))}`;
      return `M${p(42)} L${p(47)}`;
    })
    .join(' ');
  const visor =
    modo === 'comprobar'
      ? `<g class="balanza__visor"><rect x="136" y="190" width="68" height="24" rx="7"/><text x="${G.px}" y="206.5">x = ?</text></g>`
      : '';
  return (
    `<svg class="balanza__svg" viewBox="0 ${arriba} 340 ${240 - arriba}" role="img" aria-label="Balanza" focusable="false" xmlns="${NS}">` +
    `<g class="balanza__soporte">` +
    `<path class="balanza__base" d="M124 236 H216 Q219 236 217 233.5 L205 222 H135 L123 233.5 Q121 236 124 236 Z"/>` +
    `<rect class="balanza__columna" x="164" y="${G.py}" width="12" height="46" rx="3"/>` +
    `<path class="balanza__cuadrante" d="M150.3 140.9 A42 42 0 0 1 189.7 140.9"/>` +
    `<path class="balanza__rayas" d="${marcas}"/>` +
    `<path class="balanza__centro" d="M165 128.5 H175 L170 135 Z"/>` +
    `</g>` +
    visor +
    `<g class="balanza__brazo">` +
    `<rect class="balanza__viga" x="64" y="${G.py - 5}" width="212" height="10" rx="5"/>` +
    `<path class="balanza__fiel" d="M${G.px} ${G.py} V138"/>` +
    `<circle class="balanza__pivote" cx="${G.px}" cy="${G.py}" r="6.5"/>` +
    `</g>` +
    plato('L') +
    plato('R') +
    `</svg>`
  );
}

function piezaSVG(p) {
  const neg = p.signo < 0;
  if (p.tipo === 'caja') {
    return (
      `<g class="balanza__pieza balanza__pieza--caja${neg ? ' balanza__pieza--negativa' : ''}">` +
      `<rect x="-11" y="-11" width="22" height="22" rx="4"/>` +
      (neg ? `<text y="5">${MENOS}x</text>` : `<path d="M-11 -5 H11"/><text y="7.4">x</text>`) +
      `</g>`
    );
  }
  return (
    `<g class="balanza__pieza balanza__pieza--pesa${neg ? ' balanza__pieza--negativa' : ''}">` +
    `<circle r="11"/>` +
    `<text y="4.7">${neg ? `${MENOS}1` : '1'}</text>` +
    `</g>`
  );
}

/** Ancho aproximado de una etiqueta (no se escala con las piezas). */
const anchoEtiqueta = (texto) => Math.max(20, String(texto).length * 6.6 + 12);

function etiquetaSVG(x, y, texto, clase = '') {
  const w = anchoEtiqueta(texto);
  return (
    `<g class="balanza__etiqueta${clase ? ` ${clase}` : ''}">` +
    `<rect x="${r1(x - w / 2)}" y="${r1(y - 9)}" width="${r1(w)}" height="18" rx="9"/>` +
    `<text x="${r1(x)}" y="${r1(y + 4)}">${esc(texto)}</text>` +
    `</g>`
  );
}

const ALTO_ETIQUETA = 21; // espacio fijo (sin escalar) para la etiqueta de un grupo

/**
 * Acomoda bloques de piezas sobre un platillo, en repisas que crecen hacia arriba.
 * Usa una sola repisa (se lee en orden, como la expresión) mientras la escala sea
 * al menos `minUna`; si no, la opción que deje las piezas más grandes.
 * Las etiquetas no se encogen: su espacio se reserva aparte de la escala.
 * @returns {{colocadas: {p, x, y, s}[], contornos: object[], s: number}}
 */
function acomodar(bloquesEntrada, cx, { minUna = 0.7 } = {}) {
  const C = G.celda;
  const bloques = bloquesEntrada
    .filter((b) => b.piezas.length)
    .map((b) => {
      const n = b.piezas.length;
      const cols = Math.max(1, Math.min(n, b.cols || 5));
      const filas = Math.ceil(n / cols);
      const pad = b.contorno ? 4 : 0;
      return {
        ...b,
        n,
        cols,
        filas,
        pad,
        base: cols * C + pad * 2,
        w: cols * C + pad * 2,
        h: filas * C + pad * 2,
        lbl: b.etiqueta ? ALTO_ETIQUETA : 0,
        lw: b.etiqueta ? anchoEtiqueta(b.etiqueta) + 2 : 0,
      };
    });
  if (!bloques.length) return { colocadas: [], contornos: [], s: 1 };

  const anchoDe = (rep) => rep.reduce((s, b) => s + b.w, 0) + G.hueco * (rep.length - 1);
  // Un bloque debe medir al menos lo que su etiqueta (que no se encoge) una vez escalado.
  const ajustarAnchos = (s) => bloques.forEach((b) => (b.w = Math.max(b.base, b.lw / s)));
  const altoDe = (rep) => Math.max(...rep.map((b) => b.h));
  const etiquetaDe = (rep) => Math.max(...rep.map((b) => b.lbl));
  const escala = (reps) => {
    const fijo = reps.reduce((s, r) => s + etiquetaDe(r), 0);
    const variable = reps.reduce((s, r) => s + altoDe(r), 0) + G.hueco * (reps.length - 1);
    return Math.min(1, G.anchoUtil / Math.max(...reps.map(anchoDe)), Math.max(0.3, (G.altoUtil - fijo) / variable));
  };

  const enRepisas = () => {
    const reps = [];
    let actual = [];
    for (const b of bloques) {
      if (actual.length && anchoDe([...actual, b]) > G.anchoUtil) {
        reps.push(actual);
        actual = [];
      }
      actual.push(b);
    }
    reps.push(actual);
    return reps;
  };
  const probar = (reps) => {
    let s = 1;
    for (let i = 0; i < 3; i++) {
      ajustarAnchos(s);
      s = escala(reps);
    }
    return s;
  };
  ajustarAnchos(1);
  const una = [bloques];
  const varias = enRepisas();
  const sUna = probar(una);
  const sVarias = varias.length > 1 ? probar(varias) : 0;
  const repisas = sUna >= minUna || sVarias <= sUna + 0.01 ? una : varias;
  const s = probar(repisas);

  const colocadas = [];
  const contornos = [];
  let base = G.borde;
  for (const rep of repisas) {
    let x = cx - (anchoDe(rep) * s) / 2;
    for (const b of rep) {
      const x0 = x + ((b.w - b.base) * s) / 2 + b.pad * s;
      const y0 = base - b.pad * s;
      b.piezas.forEach((p, i) => {
        const fila = Math.floor(i / b.cols);
        const enFila = Math.min(b.cols, b.n - fila * b.cols);
        const col = i % b.cols;
        const desplazar = ((b.cols - enFila) * C) / 2;
        colocadas.push({
          p,
          x: x0 + (desplazar + col * C + C / 2) * s,
          y: y0 - (fila * C + C / 2) * s,
          s,
        });
      });
      if (b.contorno || b.etiqueta) {
        const alto = b.h * s;
        const xc = x + ((b.w - b.base) * s) / 2;
        contornos.push({
          x: xc,
          y: base - alto,
          w: b.base * s,
          h: alto,
          etiqueta: b.etiqueta,
          contorno: b.contorno,
          alerta: b.alerta,
          clase: b.clase,
        });
      }
      x += (b.w + G.hueco) * s;
    }
    base -= altoDe(rep) * s + etiquetaDe(rep) + G.hueco * s;
  }
  return { colocadas, contornos, s };
}

/* ------------------------------------------------------------------ */
/* API                                                                  */
/* ------------------------------------------------------------------ */

/**
 * Monta una balanza interactiva dentro de `contenedor` (reemplaza su contenido).
 *
 * @param {HTMLElement} contenedor
 * @param {object} opciones
 * @param {'quitar'|'repartir'|'separar'|'comprobar'} [opciones.modo='quitar']
 * @param {string} [opciones.ecuacion='2x + 3 = 11'] enteros pequeños (≤ 20 unidades por platillo)
 * @param {boolean} [opciones.unLado=false] 'quitar': ofrece quitar de un solo platillo
 * @param {{instruccion?: string, cierre?: string}} [opciones.textos]
 * @param {(resumen: object) => void} [opciones.onCompletar] una vez al lograr la meta
 *   (otra vez solo después de reiniciar())
 * @param {(estado: object) => void} [opciones.onCambio] después de cada acción
 * @returns {{ destruir(): void, reiniciar(): void, resolver(): Promise<void> }}
 *   resolver() logra la meta paso a paso, como lo haría un estudiante (modo presentación).
 */
export function montarBalanza(contenedor, opciones = {}) {
  const {
    modo: modoPedido = 'quitar',
    ecuacion: texto = '2x + 3 = 11',
    unLado: unLadoPedido = false,
    textos = {},
    onCompletar,
    onCambio,
  } = opciones;
  const uid = `balanza-${++instancias}`;

  let terminos;
  let an;
  try {
    terminos = leerTerminos(texto);
    an = analizar(terminos);
  } catch (error) {
    return montarAviso(contenedor, texto, error.message);
  }
  let cfg = configurar(MODOS.includes(modoPedido) ? modoPedido : 'quitar', an);
  if (!cfg) {
    cfg = configurar('comprobar', an);
    if (!cfg) return montarAviso(contenedor, texto, 'no tiene una sola solución o es muy grande');
    console.warn(`[balanza] «${texto}» no sirve para el modo «${modoPedido}»; se usa «comprobar».`);
  }
  const { modo, ladoX } = cfg;
  const ladoN = otro(ladoX);
  const unLado = modo === 'quitar' && Boolean(unLadoPedido);
  // Los textos del paquete se usan solo si son para este modo (no si hubo que cambiarlo).
  const propios = modo === modoPedido && textos ? textos : {};
  const t = {
    instruccion: propios.instruccion || TEXTOS[modo].instruccion,
    cierre: propios.cierre || TEXTOS[modo].cierre,
  };
  const solEntera = an.solucion && an.solucion.d === 1 ? an.solucion.n : null;
  if (modo === 'comprobar' && solEntera === null) {
    console.warn(`[balanza] La solución de «${texto}» no es entera: no se podrá equilibrar con la caja.`);
  }
  const totalCajas = an[ladoX].cajas;
  const totalPesasN = an[ladoN].pesas;
  const rango =
    modo === 'repartir'
      ? { min: 1, max: Math.max(totalCajas, Math.min(totalPesasN, Math.max(totalCajas + 3, 6))) }
      : { min: Math.min(-10, solEntera ?? 0), max: Math.max(10, solEntera ?? 0) };
  const cajasNegativas = LADOS.some((l) => terminos[l].some((x) => x.x && x.c < 0));
  const pesasNegativas = LADOS.some((l) => terminos[l].some((x) => !x.x && x.c < 0));

  /* ---------- estado ---------- */

  let st;
  function estadoInicial() {
    let valor = 0;
    if (modo === 'comprobar' && solEntera === 0) valor = 1;
    let grupos = 1;
    if (modo === 'repartir' && totalCajas === 1) grupos = Math.min(2, rango.max);
    return {
      lados: construirLados(terminos, modo),
      completado: false,
      acciones: 0,
      intentos: 0,
      quitadas: 0,
      desequilibrio: null, // { grupo, pieza }: la pesa quitada de un solo platillo
      probasteUnLado: false,
      grupos,
      reparto: null,
      juntadas: 0,
      ultimaJunta: { caja: null, pesa: null },
      valor,
      probado: null,
      probados: [],
      mensaje: null,
      inicio: Date.now(),
    };
  }
  st = estadoInicial();

  /* ---------- DOM ---------- */

  contenedor.innerHTML = String(html`
    <div class="balanza balanza--${modo}" data-modo="${modo}" id="${uid}">
      <p class="balanza__instruccion">${t.instruccion}</p>
      <div class="balanza__escena">${crudo(esqueletoSVG(modo, margenSuperior(modo, an)))}</div>
      <p class="balanza__ecuacion"></p>
      <p class="balanza__detalle" hidden></p>
      ${cajasNegativas
        ? html`<p class="balanza__leyenda"><span class="balanza__muestra" aria-hidden="true">${MENOS}x</span>
            <span>Las cajas con signo ${MENOS} restan: cada una quita lo que vale x.</span></p>`
        : ''}
      ${pesasNegativas
        ? html`<p class="balanza__leyenda"><span class="balanza__muestra balanza__muestra--pesa" aria-hidden="true">${MENOS}1</span>
            <span>Las pesas con signo ${MENOS} restan 1.</span></p>`
        : ''}
      <div class="balanza__controles"></div>
      <div class="balanza__narracion" role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="balanza__cierre" hidden>
        <p class="balanza__cierre-titulo"><span aria-hidden="true">✓</span> Lo importante</p>
        <p class="balanza__cierre-texto">${t.cierre}</p>
      </div>
    </div>`);

  const raiz = contenedor.querySelector('.balanza');
  const svg = raiz.querySelector('.balanza__svg');
  const brazo = svg.querySelector('.balanza__brazo');
  const visorTexto = svg.querySelector('.balanza__visor text');
  const platos = {};
  for (const lado of LADOS) {
    const g = svg.querySelector(`.balanza__platillo[data-lado="${lado}"]`);
    platos[lado] = { g, piezas: g.querySelector('.balanza__piezas'), marcas: g.querySelector('.balanza__marcas') };
  }
  const ecuacionEl = raiz.querySelector('.balanza__ecuacion');
  const detalleEl = raiz.querySelector('.balanza__detalle');
  const controlesEl = raiz.querySelector('.balanza__controles');
  const narracionEl = raiz.querySelector('.balanza__narracion');
  const cierreEl = raiz.querySelector('.balanza__cierre');

  let vivo = true;
  let resolviendo = null;
  const timers = new Set();
  const despues = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (vivo) fn();
    }, ms);
    timers.add(id);
    return id;
  };

  /* ---------- consultas ---------- */

  const xActual = () => {
    if (modo === 'comprobar') return st.probado === null ? null : { n: st.probado, d: 1 };
    return an.solucion;
  };

  function diferencia() {
    const x = xActual();
    if (!x) return 0;
    return peso(st.lados.R, x) - peso(st.lados.L, x);
  }

  function angulo() {
    const d = diferencia();
    if (d === 0) return 0;
    const x = xActual();
    const unidades = Math.abs(d) / x.d;
    return Math.sign(d) * Math.min(G.angMax, 5 + unidades * 1.2);
  }

  const sinProbar = () => modo === 'comprobar' && st.probado === null;
  const equilibrio = () => (sinProbar() ? null : diferencia() === 0);
  const todoJunto = (tipo) => LADOS.every((l) => llenos(st.lados[l]).filter((g) => g.tipo === tipo).length <= 1);

  function metaCumplida() {
    switch (modo) {
      case 'quitar':
        return !st.desequilibrio && cuantas(st.lados[ladoX], 'pesa') === 0;
      case 'repartir':
        return Boolean(st.reparto?.ok);
      case 'separar':
        return st.juntadas > 0 && todoJunto('caja') && todoJunto('pesa');
      case 'comprobar':
        return st.probado !== null && diferencia() === 0;
      default:
        return false;
    }
  }

  function ecuacionViva() {
    const izq = expr(terminosDe(st.lados.L));
    const der = expr(terminosDe(st.lados.R));
    const rota = modo === 'quitar' && Boolean(st.desequilibrio);
    return { texto: `${izq} ${rota ? '≠' : '='} ${der}`, rota };
  }

  /* ---------- descripción accesible ---------- */

  function describirGrupo(g) {
    const n = g.piezas.length;
    const base = g.tipo === 'caja' ? contar(n, 'caja', 'cajas') : contar(n, 'pesa', 'pesas');
    return g.signo < 0 ? `${base} con signo menos` : base;
  }

  function describirLado(lado) {
    const grupos = llenos(st.lados[lado]);
    if (!grupos.length) return `${NOMBRE[lado]}: nada`;
    if (modo === 'repartir' && lado === ladoN && st.reparto) {
      const { n, porGrupo, sobran } = st.reparto;
      const total = cuantas(st.lados[lado], 'pesa');
      let txt = `${contar(total, 'pesa', 'pesas')} en ${contar(n, 'grupo', 'grupos')} de ${porGrupo}`;
      if (sobran) txt += ` y ${sobran === 1 ? 'sobra 1' : `sobran ${sobran}`}`;
      return `${NOMBRE[lado]}: ${txt}`;
    }
    const partes = grupos.map(describirGrupo);
    const revueltas = modo === 'separar' && !(todoJunto('caja') && todoJunto('pesa')) && grupos.length > 2;
    return `${NOMBRE[lado]}: ${lista(partes)}${revueltas ? ', revueltas' : ''}`;
  }

  function describir() {
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const partes = [cap(describirLado('L')), cap(describirLado('R'))];
    if (modo === 'comprobar') {
      partes.push(st.probado === null ? 'Todavía no pruebas un valor para la caja' : `Cada caja vale ${num(st.probado)}`);
    }
    if (modo === 'repartir' && st.reparto?.ok) partes.push(`Cada caja pesa ${st.reparto.porGrupo}`);
    const d = diferencia();
    if (!sinProbar()) partes.push(d === 0 ? 'En equilibrio' : `Inclinada: baja el lado ${d > 0 ? 'derecho' : 'izquierdo'}`);
    return `Balanza. ${partes.join('. ')}.`;
  }

  /* ---------- pintar el SVG ---------- */

  function bloquesDe(lado) {
    const grupos = llenos(st.lados[lado]);
    if (modo === 'repartir' && lado === ladoN && st.reparto) {
      const piezas = grupos.flatMap((g) => g.piezas);
      const { n, porGrupo, sobran } = st.reparto;
      const armar = (cols, etiquetas) => {
        const bloques = [];
        for (let i = 0; i < n; i++) {
          bloques.push({
            piezas: piezas.slice(i * porGrupo, (i + 1) * porGrupo),
            cols,
            contorno: true,
            etiqueta: etiquetas ? String(porGrupo) : '',
            clase: st.reparto.ok ? 'balanza__etiqueta--exito' : '',
          });
        }
        if (sobran) {
          bloques.push({
            piezas: piezas.slice(n * porGrupo),
            cols: Math.min(sobran, cols),
            contorno: true,
            alerta: true,
            etiqueta: etiquetas ? `sobran ${sobran}` : '',
            clase: 'balanza__etiqueta--alerta',
          });
        }
        return bloques;
      };
      // Prueba varias formas de grupo (columnas), con y sin etiquetas, y se queda
      // con la de piezas más grandes. Las etiquetas solo van si caben con holgura.
      const mejor = { true: null, false: null };
      for (const etiquetas of [true, false]) {
        for (let cols = 1; cols <= Math.min(porGrupo, 5); cols++) {
          const bloques = armar(cols, etiquetas);
          const { s } = acomodar(bloques, CX[lado], { minUna: 2 });
          if (!mejor[etiquetas] || s > mejor[etiquetas].s + 0.001) mejor[etiquetas] = { s, bloques };
        }
      }
      // Al acertar, las etiquetas ("cuánto le toca a cada caja") importan más que el tamaño.
      const minimo = st.reparto.ok ? 0.5 : 0.7;
      const conEtiquetas = mejor.true.s >= minimo || mejor.true.s >= mejor.false.s - 0.05;
      return (conEtiquetas ? mejor.true : mejor.false).bloques;
    }
    return grupos.map((g) => ({ piezas: g.piezas, cols: 5 }));
  }

  function marcasDe(lado, { colocadas, contornos }) {
    let out = '';
    for (const c of contornos) {
      if (c.contorno) {
        out += `<rect class="balanza__contorno${c.alerta ? ' balanza__contorno--alerta' : ''}" x="${r1(c.x)}" y="${r1(c.y)}" width="${r1(c.w)}" height="${r1(c.h)}" rx="7"/>`;
      }
      if (c.etiqueta) out += etiquetaSVG(c.x + c.w / 2, c.y - 11, c.etiqueta, c.clase);
    }
    if (modo === 'repartir' && lado === ladoX && st.reparto?.ok) {
      for (const { p, x, y, s } of colocadas) {
        if (p.tipo === 'caja') out += etiquetaSVG(x, y - 11 * s - 12, st.reparto.porGrupo, 'balanza__etiqueta--exito');
      }
    }
    if (modo === 'comprobar' && st.probado !== null) {
      const total = peso(st.lados[lado], { n: st.probado, d: 1 });
      out += etiquetaSVG(CX[lado] + (lado === 'L' ? -44 : 44), 167, `= ${num(total)}`, 'balanza__etiqueta--total');
    }
    return out;
  }

  function sincronizar(capa, colocadas, animar) {
    const vivos = new Map();
    for (const el of capa.children) {
      if (!el.classList.contains('balanza__item--sale')) vivos.set(el.dataset.k, el);
    }
    for (const { p, x, y, s } of colocadas) {
      let el = vivos.get(p.k);
      if (el) {
        vivos.delete(p.k);
      } else {
        el = document.createElementNS(NS, 'g');
        el.setAttribute('class', `balanza__item${animar ? ' balanza__item--entra' : ''}`);
        el.dataset.k = p.k;
        el.innerHTML = piezaSVG(p);
        if (animar) el.addEventListener('animationend', () => el.classList.remove('balanza__item--entra'), { once: true });
        capa.appendChild(el);
      }
      el.style.transform = `translate(${r1(x)}px, ${r1(y)}px) scale(${r3(s)})`;
    }
    for (const el of vivos.values()) {
      if (!animar) {
        el.remove();
        continue;
      }
      el.classList.add('balanza__item--sale');
      const quitar = () => el.remove();
      el.addEventListener('animationend', quitar, { once: true });
      despues(quitar, 1200);
    }
  }

  function pintar(animar) {
    const ang = angulo();
    const rad = (ang * Math.PI) / 180;
    const dy = G.brazo * Math.sin(rad);
    const dx = G.brazo * (1 - Math.cos(rad));
    brazo.style.transform = `rotate(${r3(ang)}deg)`;
    platos.L.g.style.transform = `translate(${r3(dx)}px, ${r3(-dy)}px)`;
    platos.R.g.style.transform = `translate(${r3(-dx)}px, ${r3(dy)}px)`;
    const eq = equilibrio();
    raiz.classList.toggle('balanza--equilibrio', eq === true);
    raiz.classList.toggle('balanza--inclinada', eq === false);
    for (const lado of LADOS) {
      const acomodo = acomodar(bloquesDe(lado), CX[lado], { minUna: modo === 'repartir' ? 2 : 0.7 });
      sincronizar(platos[lado].piezas, acomodo.colocadas, animar);
      platos[lado].marcas.innerHTML = marcasDe(lado, acomodo);
    }
    if (visorTexto) visorTexto.textContent = `x = ${st.probado === null ? '?' : num(st.probado)}`;
    svg.setAttribute('aria-label', describir());
  }

  function sacudir(claves) {
    if (movimientoReducido()) return;
    for (const k of claves) {
      const pieza = svg.querySelector(`.balanza__item[data-k="${k}"] > .balanza__pieza`);
      if (!pieza) continue;
      pieza.classList.remove('balanza__pieza--niega');
      // Forzar reflujo para que la animación vuelva a empezar.
      void pieza.getBoundingClientRect();
      pieza.classList.add('balanza__pieza--niega');
      despues(() => pieza.classList.remove('balanza__pieza--niega'), 700);
    }
  }

  /* ---------- textos y controles ---------- */

  function detalleHTML() {
    if (modo === 'quitar' && st.quitadas > 0 && !st.desequilibrio) {
      const izqX = expr(terminosDe(st.lados[ladoX]));
      const otroLado = `${totalPesasN} ${MENOS} ${st.quitadas}`;
      const eq = ladoX === 'L' ? `${izqX} = ${otroLado}` : `${otroLado} = ${izqX}`;
      return html`En tu cuaderno: <span class="math">${eq}</span>`;
    }
    if (modo === 'repartir' && st.reparto?.ok) {
      return html`En tu cuaderno: <span class="math">x = ${totalPesasN} ÷ ${totalCajas} = ${st.reparto.porGrupo}</span>`;
    }
    if (modo === 'separar') {
      const partes = [];
      if (st.ultimaJunta.caja) partes.push(html`<span class="math">${st.ultimaJunta.caja}</span>`);
      if (st.ultimaJunta.pesa) partes.push(html`<span class="math">${st.ultimaJunta.pesa}</span>`);
      return partes.length ? html`Juntaste: ${partes.map((p, i) => (i ? html` · ${p}` : p))}` : '';
    }
    if (modo === 'comprobar' && st.probado !== null) {
      const v = st.probado;
      const cuenta = (lado) => {
        const ts = terminosDe(st.lados[lado]);
        const s = sustitucion(ts, v);
        const total = num(peso(st.lados[lado], { n: v, d: 1 }));
        return s === total ? s : `${s} = ${total}`;
      };
      return html`<span class="math">Izquierda: ${cuenta('L')}</span> · <span class="math">Derecha: ${cuenta('R')}</span>`;
    }
    return '';
  }

  function ajusteHTML({ nombre, valor, menos, mas, minimo, maximo, motivoMin, motivoMax }) {
    return html`
      <div class="balanza__ajuste" role="group" aria-labelledby="${uid}-ajuste ${uid}-valor">
        <span class="balanza__ajuste-nombre" id="${uid}-ajuste">${nombre}</span>
        <span class="balanza__ajuste-control">
          <button type="button" class="boton boton--secundario boton--icono balanza__paso" data-act="menos" data-foco="menos"
            aria-label="${menos}"${attr('aria-disabled', minimo, 'true')}${attr('data-motivo', minimo, motivoMin)}>${MENOS}</button>
          <output class="balanza__ajuste-valor math" id="${uid}-valor">${valor}</output>
          <button type="button" class="boton boton--secundario boton--icono balanza__paso" data-act="mas" data-foco="mas"
            aria-label="${mas}"${attr('aria-disabled', maximo, 'true')}${attr('data-motivo', maximo, motivoMax)}>+</button>
        </span>
      </div>`;
  }

  function boton(act, texto, { primario = false, motivo = '', foco = act, sub = '' } = {}) {
    return html`<button type="button" class="boton ${primario ? 'boton--primario' : 'boton--secundario'} boton--bloque"
      data-act="${act}" data-foco="${foco}"${attr('aria-disabled', Boolean(motivo), 'true')}${attr('data-motivo', Boolean(motivo), motivo)}><span>${texto}</span>${sub
        ? html` <span class="balanza__subetiqueta">${sub}</span>`
        : ''}</button>`;
  }

  function controlesHTML() {
    if (modo === 'quitar') {
      const sinPesas = cuantas(st.lados[ladoX], 'pesa') === 0;
      const motivo = st.desequilibrio
        ? 'Primero regresa la pesa para que la balanza vuelva a estar en equilibrio.'
        : sinPesas
          ? 'Ya no hay pesas sueltas junto a las cajas.'
          : '';
      const dos = boton('quitar-dos', 'Quitar 1 pesa de los dos platillos', { primario: true, motivo });
      if (!unLado) return dos;
      const segundo = st.desequilibrio
        ? boton('regresar', 'Regresar la pesa', { primario: true, foco: 'un-lado' })
        : boton('quitar-uno', 'Quitar 1 pesa solo de este platillo', {
            foco: 'un-lado',
            sub: `(el de las cajas, a la ${NOMBRE[ladoX]})`,
            motivo: sinPesas ? 'Ya no hay pesas sueltas junto a las cajas.' : '',
          });
      return html`${dos}${segundo}`;
    }
    if (modo === 'repartir') {
      return html`${ajusteHTML({
        nombre: 'Grupos:',
        valor: st.grupos,
        menos: 'Un grupo menos',
        mas: 'Un grupo más',
        minimo: st.grupos <= rango.min,
        maximo: st.grupos >= rango.max,
        motivoMin: 'Necesitas al menos 1 grupo.',
        motivoMax: `${rango.max} grupos es lo más que puedes hacer aquí.`,
      })}${boton('repartir', 'Repartir', { primario: true })}`;
    }
    if (modo === 'separar') {
      return html`${boton('juntar-cajas', 'Juntar cajas con cajas')}${boton('juntar-pesas', 'Juntar pesas con pesas')}${boton(
        'juntar-mezcla',
        'Juntar una caja con una pesa',
      )}`;
    }
    return html`${ajusteHTML({
      nombre: 'Valor de la caja:',
      valor: num(st.valor),
      menos: 'Restar 1 al valor de la caja',
      mas: 'Sumar 1 al valor de la caja',
      minimo: st.valor <= rango.min,
      maximo: st.valor >= rango.max,
      motivoMin: `El valor más chico es ${num(rango.min)}.`,
      motivoMax: `El valor más grande es ${num(rango.max)}.`,
    })}${boton('probar', 'Probar', { primario: true })}`;
  }

  function render() {
    const eq = ecuacionViva();
    ecuacionEl.innerHTML = String(html`<span class="balanza__ecuacion-etiqueta">En la balanza</span>
      <span class="math balanza__ecuacion-texto${eq.rota ? ' balanza__ecuacion-texto--rota' : ''}">${eq.texto}</span>`);
    const detalle = String(detalleHTML());
    detalleEl.innerHTML = detalle;
    detalleEl.hidden = !detalle;
    renderConFoco(controlesEl, controlesHTML());
    cierreEl.hidden = !st.completado;
  }

  let relojNarrar = null;
  function narrar(textoMensaje, tono = 'info', oculto = '') {
    st.mensaje = { texto: textoMensaje, tono };
    narracionEl.dataset.tono = tono;
    narracionEl.textContent = '';
    clearTimeout(relojNarrar);
    timers.delete(relojNarrar);
    // Vaciar y volver a llenar asegura que se lea aunque el texto se repita.
    relojNarrar = despues(() => {
      narracionEl.innerHTML = String(html`<span class="balanza__icono-tono" aria-hidden="true">${ICONO_TONO[tono]}</span><span
          class="balanza__mensaje">${textoMensaje}</span>${oculto ? html`<span class="solo-lector"> ${oculto}</span>` : ''}`);
    }, 60);
  }

  /* ---------- acciones ---------- */

  function quitarUltimaPesa(lado) {
    const grupos = st.lados[lado].filter((g) => g.tipo === 'pesa' && g.piezas.length);
    const grupo = grupos[grupos.length - 1];
    if (!grupo) return null;
    return { grupo, pieza: grupo.piezas.pop() };
  }

  const acciones = {
    'quitar-dos'() {
      if (st.desequilibrio || !cuantas(st.lados[ladoX], 'pesa')) return;
      quitarUltimaPesa(ladoX);
      quitarUltimaPesa(ladoN);
      st.quitadas += 1;
      st.acciones += 1;
      const quedan = cuantas(st.lados[ladoX], 'pesa');
      const eq = ecuacionViva().texto;
      narrar(
        `Quitaste 1 pesa de cada platillo y la balanza sigue en equilibrio: ${eq}.` +
          (quedan ? ` Quedan ${contar(quedan, 'pesa suelta', 'pesas sueltas')} junto a las cajas.` : ''),
      );
    },
    'quitar-uno'() {
      if (!unLado || st.desequilibrio) return;
      const quitada = quitarUltimaPesa(ladoX);
      if (!quitada) return;
      st.desequilibrio = quitada;
      st.probasteUnLado = true;
      st.acciones += 1;
      narrar(
        `¡Se rompió el equilibrio! Quitaste 1 pesa solo del platillo de las cajas y ahora ese lado pesa menos. ` +
          `Los dos lados ya no valen lo mismo: ${ecuacionViva().texto}. Toca «Regresar la pesa».`,
        'alerta',
      );
    },
    regresar() {
      if (!st.desequilibrio) return;
      st.desequilibrio.grupo.piezas.push(st.desequilibrio.pieza);
      st.desequilibrio = null;
      st.acciones += 1;
      narrar(
        `Regresaste la pesa y la balanza vuelve a estar en equilibrio: ${ecuacionViva().texto}. ` +
          'Para que siga derecha, quita lo mismo de los dos platillos.',
      );
    },
    menos() {
      if (modo === 'repartir') {
        st.grupos = Math.max(rango.min, st.grupos - 1);
        narrar(`${contar(st.grupos, 'grupo', 'grupos')}.`);
      } else {
        st.valor = Math.max(rango.min, st.valor - 1);
        narrar(`Valor de la caja: ${num(st.valor)}.`);
      }
    },
    mas() {
      if (modo === 'repartir') {
        st.grupos = Math.min(rango.max, st.grupos + 1);
        narrar(`${contar(st.grupos, 'grupo', 'grupos')}.`);
      } else {
        st.valor = Math.min(rango.max, st.valor + 1);
        narrar(`Valor de la caja: ${num(st.valor)}.`);
      }
    },
    repartir() {
      const n = st.grupos;
      const W = totalPesasN;
      const porGrupo = Math.floor(W / n);
      const sobran = W % n;
      const ok = n === totalCajas && sobran === 0;
      st.reparto = { n, porGrupo, sobran, ok };
      st.intentos += 1;
      st.acciones += 1;
      if (ok) {
        if (st.completado) narrar(mensajeExito(), 'exito');
        return;
      }
      const cajas = contar(totalCajas, 'caja', 'cajas');
      let msg;
      if (sobran) {
        msg = `${W} pesas no se pueden repartir en ${n} grupos iguales: quedan ${n} grupos de ${porGrupo} y ${
          sobran === 1 ? 'sobra 1 pesa' : `sobran ${sobran} pesas`
        }.`;
        if (n !== totalCajas) msg += ` Además, hay ${cajas}, no ${n}.`;
      } else if (n < totalCajas) {
        const faltan = totalCajas - n;
        msg =
          `Hiciste ${contar(n, 'grupo', 'grupos')} de ${porGrupo}, pero hay ${cajas}: ` +
          `${faltan === 1 ? 'a una caja no le toca' : `a ${faltan} cajas no les toca`} ningún grupo.`;
      } else {
        const sobranG = n - totalCajas;
        msg =
          `Hiciste ${n} grupos de ${porGrupo}, pero solo hay ${cajas}: ` +
          `${sobranG === 1 ? 'sobra un grupo' : `sobran ${sobranG} grupos`} sin caja.`;
      }
      narrar(`${msg} Necesitas un grupo para cada caja.`, 'alerta');
    },
    'juntar-cajas'() {
      juntar('caja');
    },
    'juntar-pesas'() {
      juntar('pesa');
    },
    'juntar-mezcla'() {
      st.acciones += 1;
      const lado = llenos(st.lados[ladoX]).some((g) => g.tipo === 'pesa') ? ladoX : ladoN;
      const grupos = st.lados[lado];
      const a = cuantas(grupos, 'caja');
      const b = cuantas(grupos, 'pesa');
      const caja = grupos.find((g) => g.tipo === 'caja' && g.piezas.length)?.piezas[0];
      const pesa = grupos.find((g) => g.tipo === 'pesa' && g.piezas.length)?.piezas[0];
      sacudir([caja?.k, pesa?.k].filter(Boolean));
      const actual = expr(terminosDe(grupos));
      narrar(
        `Una caja y una pesa no se pueden juntar en una sola cosa: la caja vale x y la pesa vale 1. ` +
          `Por eso ${actual} no se convierte en ${a + b}x ni en ${a + b}. Se quedan separadas.`,
        'alerta',
      );
    },
    probar() {
      st.probado = st.valor;
      st.probados.push(st.valor);
      st.intentos += 1;
      st.acciones += 1;
      const v = st.probado;
      const izq = peso(st.lados.L, { n: v, d: 1 });
      const der = peso(st.lados.R, { n: v, d: 1 });
      if (izq === der) {
        if (st.completado) narrar(mensajeExito(), 'exito');
        return;
      }
      // ¿Hacia dónde mover x? d(v) = der − izq; cada +1 en x cambia d en −(aL − aR).
      const pendiente = conSigno(st.lados.L, 'caja') - conSigno(st.lados.R, 'caja');
      const subir = (der - izq) * pendiente > 0;
      narrar(
        `Con x = ${num(v)}, la izquierda pesa ${num(izq)} y la derecha ${num(der)}. ` +
          `La balanza baja del lado ${der > izq ? 'derecho' : 'izquierdo'}: ese lado pesa más. ` +
          `Prueba con un número ${subir ? 'mayor' : 'menor'}.`,
        'alerta',
      );
    },
  };

  function juntar(tipo) {
    st.acciones += 1;
    st.juntadas += 1;
    const nombre = tipo === 'caja' ? 'cajas' : 'pesas';
    const hechos = [];
    for (const lado of LADOS) {
      const grupos = st.lados[lado];
      const delTipo = llenos(grupos).filter((g) => g.tipo === tipo);
      if (delTipo.length < 2) continue;
      const partes = expr(delTipo.map((g) => ({ x: tipo === 'caja', c: g.signo * g.piezas.length })));
      const unido = { tipo, signo: 1, piezas: delTipo.flatMap((g) => g.piezas) };
      const primero = grupos.indexOf(delTipo[0]);
      st.lados[lado] = grupos.flatMap((g, i) => (i === primero ? [unido] : delTipo.includes(g) ? [] : [g]));
      const total = expr([{ x: tipo === 'caja', c: unido.piezas.length }]);
      hechos.push(`${partes} = ${total}`);
    }
    if (hechos.length) {
      st.ultimaJunta[tipo] = hechos.join(' · ');
      narrar(`Juntaste las ${nombre}: ${hechos.join(' y ')}. Ahora: ${ecuacionViva().texto}.`);
      return;
    }
    const enX = cuantas(st.lados[ladoX], tipo);
    narrar(
      enX
        ? `Las ${nombre} ya están juntas: ${expr([{ x: tipo === 'caja', c: enX }])}.`
        : `En el platillo de las cajas no hay ${nombre} sueltas.`,
    );
  }

  function mensajeExito() {
    const eq = ecuacionViva().texto;
    switch (modo) {
      case 'quitar':
        return `¡Listo! Quitaste ${contar(st.quitadas, 'pesa', 'pesas')} de cada platillo: las cajas se quedaron solas y la balanza sigue en equilibrio: ${eq}.`;
      case 'repartir': {
        const q = st.reparto.porGrupo;
        return `¡Eso es! ${totalPesasN} pesas en ${totalCajas} grupos iguales, uno para cada caja. A cada caja le tocan ${q}: cada caja pesa ${q}, porque ${totalPesasN} ÷ ${totalCajas} = ${q}.`;
      }
      case 'separar':
        return `¡Muy bien! Cajas con cajas y pesas con pesas: ${eq}.`;
      default: {
        const v = num(st.probado);
        return `¡Equilibrio! Con x = ${v} los dos platillos pesan ${num(peso(st.lados.L, { n: st.probado, d: 1 }))}. Ese valor cumple la ecuación.`;
      }
    }
  }

  function resumen() {
    const base = {
      modo,
      ecuacion: texto,
      final: ecuacionViva().texto,
      acciones: st.acciones,
      intentos: st.intentos,
      ms: Date.now() - st.inicio,
    };
    if (modo === 'quitar') return { ...base, quitadas: st.quitadas, probasteUnLado: st.probasteUnLado };
    if (modo === 'repartir') return { ...base, grupos: st.reparto.n, valorCaja: st.reparto.porGrupo };
    if (modo === 'separar') return { ...base, expresion: expr(terminosDe(st.lados[ladoX])) };
    return { ...base, valorCaja: st.probado, probados: [...st.probados] };
  }

  function estadoPublico(accion) {
    const conteo = (lado) => ({ cajas: conSigno(st.lados[lado], 'caja'), pesas: conSigno(st.lados[lado], 'pesa') });
    const estado = {
      modo,
      accion,
      ecuacion: ecuacionViva().texto,
      equilibrio: equilibrio(),
      completado: st.completado,
      izquierda: conteo('L'),
      derecha: conteo('R'),
    };
    if (modo === 'quitar') Object.assign(estado, { quitadas: st.quitadas, desequilibrio: Boolean(st.desequilibrio) });
    if (modo === 'repartir') Object.assign(estado, { grupos: st.grupos, reparto: st.reparto && { ...st.reparto } });
    if (modo === 'separar') Object.assign(estado, { cajasJuntas: todoJunto('caja'), pesasJuntas: todoJunto('pesa') });
    if (modo === 'comprobar') Object.assign(estado, { valor: st.valor, probado: st.probado });
    return estado;
  }

  function llamar(fn, ...args) {
    if (typeof fn !== 'function') return;
    try {
      fn(...args);
    } catch (error) {
      console.error('[balanza]', error);
    }
  }

  function actualizar(accion) {
    let completo = false;
    if (!st.completado && metaCumplida()) {
      st.completado = true;
      completo = true;
      narrar(mensajeExito(), 'exito', `Lo importante: ${t.cierre}`);
    }
    pintar(!movimientoReducido());
    render();
    llamar(onCambio, estadoPublico(accion));
    if (completo) llamar(onCompletar, resumen());
  }

  function ejecutar(act, boton) {
    if (!vivo) return;
    if (boton && boton.getAttribute('aria-disabled') === 'true') {
      narrar(boton.dataset.motivo || 'Ese botón no está disponible ahora.');
      return;
    }
    const fn = acciones[act];
    if (!fn) return;
    fn();
    actualizar(act);
  }

  function alClic(evento) {
    const boton = evento.target.closest('[data-act]');
    if (!boton || !controlesEl.contains(boton)) return;
    evento.preventDefault();
    ejecutar(boton.dataset.act, boton);
  }
  raiz.addEventListener('click', alClic);

  /* ---------- resolver paso a paso (modo presentación) ---------- */

  function siguientePaso() {
    switch (modo) {
      case 'quitar':
        return st.desequilibrio ? 'regresar' : 'quitar-dos';
      case 'repartir':
        if (st.grupos < totalCajas) return 'mas';
        if (st.grupos > totalCajas) return 'menos';
        return 'repartir';
      case 'separar':
        if (!todoJunto('caja')) return 'juntar-cajas';
        if (!todoJunto('pesa')) return 'juntar-pesas';
        return 'juntar-cajas';
      default:
        if (solEntera === null) return null;
        if (st.valor < solEntera) return 'mas';
        if (st.valor > solEntera) return 'menos';
        return 'probar';
    }
  }

  async function pulsar(act) {
    const boton = controlesEl.querySelector(`[data-act="${act}"]`);
    boton?.classList.add('balanza__boton--pulsado');
    await esperar(220);
    if (!vivo) return;
    ejecutar(act, boton);
  }

  function resolver() {
    if (!vivo || st.completado) return Promise.resolve();
    if (resolviendo) return resolviendo;
    resolviendo = (async () => {
      for (let guarda = 0; vivo && !st.completado && guarda < 80; guarda++) {
        const act = siguientePaso();
        if (!act) break;
        await pulsar(act);
        if (!st.completado) await esperar(PAUSA_RESOLVER);
      }
    })().finally(() => {
      resolviendo = null;
    });
    return resolviendo;
  }

  /* ---------- arranque ---------- */

  pintar(false);
  render();

  return {
    destruir() {
      if (!vivo) return;
      vivo = false;
      timers.forEach(clearTimeout);
      timers.clear();
      raiz.removeEventListener('click', alClic);
      contenedor.innerHTML = '';
    },
    reiniciar() {
      if (!vivo) return;
      st = estadoInicial();
      for (const lado of LADOS) platos[lado].piezas.textContent = '';
      clearTimeout(relojNarrar);
      narracionEl.textContent = '';
      delete narracionEl.dataset.tono;
      pintar(false);
      render();
      llamar(onCambio, estadoPublico('reiniciar'));
    },
    resolver,
  };
}

/** Cuando la ecuación no se puede dibujar: aviso claro y API que no hace nada. */
function montarAviso(contenedor, texto, motivo) {
  console.warn(`[balanza] No se pudo dibujar «${texto}»: ${motivo}.`);
  contenedor.innerHTML = String(html`
    <div class="balanza balanza--aviso">
      <p class="balanza__narracion" data-tono="alerta">
        <span class="balanza__icono-tono" aria-hidden="true">!</span>
        <span class="balanza__mensaje">Esta ecuación no cabe en la balanza: <span class="math">${texto}</span>.</span>
      </p>
    </div>`);
  return {
    destruir() {
      contenedor.innerHTML = '';
    },
    reiniciar() {},
    resolver: () => Promise.resolve(),
  };
}
