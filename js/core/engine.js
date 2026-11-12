/**
 * Motor de diagnóstico de Tecu Aprende — ecuaciones lineales con una incógnita.
 *
 * Todo es determinista y corre en el dispositivo: no necesita internet ni un
 * modelo de lenguaje. El flujo es:
 *
 *   1. parsearRenglon(): convierte "3x + 5 = 20" en términos con fracciones exactas.
 *   2. analizarProcedimiento(): valida renglón por renglón. El primer renglón
 *      que cambia la solución de la ecuación original es donde está el error.
 *   3. clasificar(): aplica al renglón anterior cada error típico ("mal-rules")
 *      y revisa cuál reproduce lo que escribió el estudiante. Si ninguna regla lo
 *      explica, lo dice tal cual (NO_CLASIFICADO). Nunca inventa un diagnóstico.
 *
 * Módulo puro (sin DOM). Las explicaciones para personas viven en el paquete
 * de contenido (packs/ecuaciones-1.json) y se llenan en textos.js.
 */
import { Fr } from './fraction.js';

/* ------------------------------------------------------------------ */
/* Catálogo                                                            */
/* ------------------------------------------------------------------ */

export const TIPOS = Object.freeze({
  SIGNO_TRANSPOSICION: 'SIGNO_TRANSPOSICION',
  INVERSA_EQUIVOCADA: 'INVERSA_EQUIVOCADA',
  ARITMETICA: 'ARITMETICA',
  TERMINOS_NO_SEMEJANTES: 'TERMINOS_NO_SEMEJANTES',
  UN_SOLO_LADO: 'UN_SOLO_LADO',
  SIGNO_NEGATIVO: 'SIGNO_NEGATIVO',
  NO_CLASIFICADO: 'NO_CLASIFICADO',
});

/** Orden de preferencia cuando dos reglas explican igual de bien un renglón. */
export const PRIORIDAD = [
  TIPOS.SIGNO_TRANSPOSICION,
  TIPOS.INVERSA_EQUIVOCADA,
  TIPOS.SIGNO_NEGATIVO,
  TIPOS.TERMINOS_NO_SEMEJANTES,
  TIPOS.UN_SOLO_LADO,
  TIPOS.ARITMETICA,
  TIPOS.NO_CLASIFICADO,
];

/** Errores que el motor sabe diagnosticar (todos menos NO_CLASIFICADO). */
export const TIPOS_DIAGNOSTICABLES = PRIORIDAD.filter((t) => t !== TIPOS.NO_CLASIFICADO);

const MENOS = '−';
const LADO_NOMBRE = { L: 'izquierdo', R: 'derecho' };
const otroLado = (lado) => (lado === 'L' ? 'R' : 'L');

/* ------------------------------------------------------------------ */
/* Formato para mostrar                                                */
/* ------------------------------------------------------------------ */

/** Número con signo menos tipográfico: −4, 25/3 */
export function fmtNum(fr) {
  return Fr.from(fr).toDisplay();
}

function fmtCoefX(c) {
  if (c.eq(1)) return 'x';
  if (c.eq(-1)) return `${MENOS}x`;
  if (c.isInt()) return `${c.toDisplay()}x`;
  const p = Math.abs(c.n);
  const s = c.n < 0 ? MENOS : '';
  return p === 1 ? `${s}x/${c.d}` : `${s}${p}x/${c.d}`;
}

function fmtTerminoAbs(t) {
  return t.x ? fmtCoefX(t.c.abs()) : fmtNum(t.c.abs());
}

/** "+5", "−4", "+2x", "−x/3" */
export function fmtTerminoConSigno(t) {
  return `${t.c.isNeg() ? MENOS : '+'}${fmtTerminoAbs(t)}`;
}

/** "5", "4", "2x" (sin signo) */
export function fmtTerminoSinSigno(t) {
  return fmtTerminoAbs(t);
}

export function fmtLado(terms) {
  if (!terms.length) return '0';
  return terms
    .map((t, i) => {
      const cuerpo = fmtTerminoAbs(t);
      if (i === 0) return t.c.isNeg() ? `${MENOS}${cuerpo}` : cuerpo;
      return t.c.isNeg() ? ` ${MENOS} ${cuerpo}` : ` + ${cuerpo}`;
    })
    .join('');
}

export function fmtEcuacion(eq) {
  return `${fmtLado(eq.L)} = ${fmtLado(eq.R)}`;
}

/** Convierte un texto escrito por el estudiante a formato de pantalla (− en vez de -). */
export function bonito(texto) {
  return String(texto ?? '')
    .replace(/\s*([=+])\s*/g, ' $1 ')
    .replace(/(\S)\s*-\s*/g, `$1 ${MENOS} `)
    .replace(/^\s*-\s*/, MENOS)
    .replace(/\*/g, '·')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ */
/* Parser                                                              */
/* ------------------------------------------------------------------ */

const MENSAJES = {
  vacio: () => 'El renglón está vacío.',
  simbolo: (c) => `No reconozco «${c}». Usa números, x, +, −, ×, ÷, paréntesis y =.`,
  letra: (c) => `Usa la letra x para la incógnita (escribiste «${c}»).`,
  sin_igual: () => 'Falta el signo =. Cada renglón es una ecuación completa.',
  lado_vacio: () => 'Falta algo de un lado del signo =.',
  no_lineal: () => 'En este tema la x no va elevada ni multiplicada por otra x.',
  div_x: () => 'Aquí no se divide entre x: deja la x arriba, en el numerador.',
  div_cero: () => 'No se puede dividir entre cero.',
  parentesis: () => 'Revisa los paréntesis: falta abrir o cerrar uno.',
  sintaxis: (frag) => `Revisa cerca de «${frag}»: parece que falta un número o sobra un signo.`,
  numero: (t) => `El número «${t}» está mal escrito.`,
  cadena: () => 'Escribe una sola igualdad por renglón.',
  grande: () => 'Ese número es demasiado grande para este ejercicio.',
};

export class ParseError extends Error {
  constructor(codigo, dato = '') {
    super((MENSAJES[codigo] || MENSAJES.sintaxis)(dato));
    this.codigo = codigo;
  }
}

/** Unifica la escritura: signos menos tipográficos, ×, ÷, coma decimal, espacios. */
export function normalizar(raw) {
  let s = String(raw ?? '');
  if (/[²³⁴]|\^/.test(s)) throw new ParseError('no_lineal');
  s = s.normalize('NFKC');
  s = s.replace(/[−‐-―﹣]/g, '-');
  s = s.replace(/[×✕✖⋅·•∙]/g, '*');
  s = s.replace(/[÷⁄]/g, '/');
  s = s.replace(/X/g, 'x');
  s = s.replace(/(\d)\s*,\s*(?=\d)/g, '$1.');
  s = s.replace(/([\dx)])\s*:\s*(?=[\dx(+-])/g, '$1/');
  s = s.replace(/\s+/g, '');
  s = s.replace(/={2,}/g, '=');
  return s;
}

function tokenizar(s) {
  const out = [];
  for (let i = 0; i < s.length; ) {
    const c = s[i];
    if ((c >= '0' && c <= '9') || c === '.') {
      let j = i;
      while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.')) j++;
      const text = s.slice(i, j);
      let v;
      try {
        v = Fr.fromDecimalString(text);
      } catch (e) {
        throw new ParseError(e instanceof RangeError ? 'grande' : 'numero', text);
      }
      const dec = text.includes('.') ? text.split('.')[1].length : 0;
      out.push({ t: 'num', v, i, dec });
      i = j;
    } else if (c === 'x') {
      out.push({ t: 'x', i });
      i++;
    } else if ('+-*/()='.includes(c)) {
      out.push({ t: c, i });
      i++;
    } else if (/\p{L}/u.test(c)) {
      throw new ParseError('letra', c);
    } else {
      throw new ParseError('simbolo', c);
    }
  }
  return out;
}

const F0 = () => ({ a: Fr.ZERO, b: Fr.ZERO });

function escalar(f, k) {
  return { a: f.a.mul(k), b: f.b.mul(k) };
}

function sumarF(f, g) {
  return { a: f.a.add(g.a), b: f.b.add(g.b) };
}

function multF(f, g) {
  if (!f.a.isZero() && !g.a.isZero()) throw new ParseError('no_lineal');
  return { a: f.a.mul(g.b).add(g.a.mul(f.b)), b: f.b.mul(g.b) };
}

function divF(f, g) {
  if (!g.a.isZero()) throw new ParseError('div_x');
  if (g.b.isZero()) throw new ParseError('div_cero');
  return { a: f.a.div(g.b), b: f.b.div(g.b) };
}

class Parser {
  constructor(tokens, src) {
    this.ts = tokens;
    this.k = 0;
    this.src = src;
  }

  peek() {
    return this.ts[this.k];
  }

  next() {
    return this.ts[this.k++];
  }

  fragmento(tok) {
    if (!tok) return this.src.slice(-6);
    return this.src.slice(Math.max(0, tok.i - 2), tok.i + 4);
  }

  /** Lee signos unarios consecutivos ("+-", "--") y devuelve +1 o −1. */
  signos() {
    let s = 1;
    while (this.peek() && (this.peek().t === '+' || this.peek().t === '-')) {
      if (this.next().t === '-') s = -s;
    }
    return s;
  }

  /** Nivel superior de un lado: conserva los términos tal como se escribieron. */
  terminosSuperiores() {
    const terms = [];
    let primero = true;
    for (;;) {
      const tok = this.peek();
      if (!primero && !(tok && (tok.t === '+' || tok.t === '-'))) break;
      const s = this.signos();
      if (!this.peek()) throw new ParseError('sintaxis', this.fragmento(tok));
      const f = escalar(this.producto(), s);
      if (!f.a.isZero()) terms.push({ c: f.a, x: true });
      if (!f.b.isZero()) terms.push({ c: f.b, x: false });
      primero = false;
      if (!this.peek()) break;
    }
    return terms;
  }

  /** Suma dentro de paréntesis: solo importa la forma lineal. */
  suma() {
    let f = F0();
    let primero = true;
    for (;;) {
      const tok = this.peek();
      if (!primero && !(tok && (tok.t === '+' || tok.t === '-'))) break;
      const s = this.signos();
      if (!this.peek()) throw new ParseError('parentesis');
      f = sumarF(f, escalar(this.producto(), s));
      primero = false;
    }
    return f;
  }

  producto() {
    let f = this.unario();
    for (;;) {
      const p = this.peek();
      if (!p) break;
      if (p.t === '*') {
        this.next();
        f = multF(f, this.unario());
      } else if (p.t === '/') {
        this.next();
        f = divF(f, this.unario());
      } else if (p.t === 'num' || p.t === 'x' || p.t === '(') {
        f = multF(f, this.atomo()); // multiplicación implícita: 3x, 2(x+1)
      } else break;
    }
    return f;
  }

  unario() {
    const p = this.peek();
    if (p && p.t === '-') {
      this.next();
      return escalar(this.unario(), -1);
    }
    if (p && p.t === '+') {
      this.next();
      return this.unario();
    }
    return this.atomo();
  }

  atomo() {
    const p = this.next();
    if (!p) throw new ParseError('sintaxis', this.fragmento(null));
    if (p.t === 'num') return { a: Fr.ZERO, b: p.v };
    if (p.t === 'x') return { a: Fr.ONE, b: Fr.ZERO };
    if (p.t === '(') {
      const f = this.suma();
      const q = this.next();
      if (!q || q.t !== ')') throw new ParseError('parentesis');
      return f;
    }
    if (p.t === ')') throw new ParseError('parentesis');
    throw new ParseError('sintaxis', this.fragmento(p));
  }
}

export function forma(terms) {
  let a = Fr.ZERO;
  let b = Fr.ZERO;
  for (const t of terms) {
    if (t.x) a = a.add(t.c);
    else b = b.add(t.c);
  }
  return { a, b };
}

function formasIguales(f, g) {
  return f.a.eq(g.a) && f.b.eq(g.b);
}

function limpiar(terms) {
  const sinCeros = terms.filter((t) => !t.c.isZero());
  return sinCeros.length ? sinCeros : [{ c: Fr.ZERO, x: false }];
}

/**
 * Convierte un renglón en ecuación.
 * Acepta cadenas tipo "3x = 20 − 5 = 15": la ecuación efectiva es la que el
 * estudiante cree (3x = 15) y cada igualdad intermedia se revisa aparte.
 *
 * @returns {{ok: true, tipo: 'ecuacion'|'numerica', eq, eqInicial, cadena, verdadera?, decimales}
 *          | {ok: false, error: {codigo, mensaje}}}
 */
export function parsearRenglon(raw) {
  try {
    const src = normalizar(raw);
    if (!src) throw new ParseError('vacio');
    const tokens = tokenizar(src);
    const grupos = [[]];
    for (const tok of tokens) {
      if (tok.t === '=') grupos.push([]);
      else grupos[grupos.length - 1].push(tok);
    }
    if (grupos.length === 1) throw new ParseError('sin_igual');
    if (grupos.some((g) => g.length === 0)) throw new ParseError('lado_vacio');
    const decimales = tokens.reduce((m, t) => Math.max(m, t.dec || 0), 0);

    const partes = grupos.map((toks) => {
      const p = new Parser(toks, src);
      const terms = p.terminosSuperiores();
      if (p.k < toks.length) {
        const sobra = toks[p.k];
        throw new ParseError(sobra.t === ')' || sobra.t === '(' ? 'parentesis' : 'sintaxis', p.fragmento(sobra));
      }
      const desde = toks[0].i;
      const ultimo = toks[toks.length - 1];
      return {
        terms: limpiar(terms),
        form: forma(terms),
        hasX: toks.some((t) => t.t === 'x'),
        texto: src.slice(desde, ultimo.i + 1),
      };
    });

    const conX = partes.map((p) => p.hasX);

    if (partes.length === 2) {
      const [A, B] = partes;
      const eq = { L: A.terms, R: B.terms };
      if (!A.hasX && !B.hasX) {
        return {
          ok: true,
          tipo: 'numerica',
          eq,
          eqInicial: eq,
          cadena: null,
          verdadera: A.form.b.eq(B.form.b),
          partes,
          decimales,
        };
      }
      return { ok: true, tipo: 'ecuacion', eq, eqInicial: eq, cadena: null, decimales };
    }

    // Cadena de igualdades
    if (conX.every((v) => !v)) {
      const verdadera = partes.every((p) => p.form.b.eq(partes[0].form.b));
      const eq = { L: partes[0].terms, R: partes[partes.length - 1].terms };
      return { ok: true, tipo: 'numerica', eq, eqInicial: eq, cadena: null, verdadera, partes, decimales };
    }
    const k = conX.indexOf(!conX[0]);
    if (k === -1 || conX.slice(k).some((v) => v === conX[0])) throw new ParseError('cadena');
    const xPrimero = conX[0];
    const bloqueX = xPrimero ? partes.slice(0, k) : partes.slice(k);
    const bloqueN = xPrimero ? partes.slice(k) : partes.slice(0, k);

    const errores = [];
    const revisar = (bloque, tipo) => {
      for (let i = 0; i + 1 < bloque.length; i++) {
        const izq = bloque[i];
        const der = bloque[i + 1];
        if (!formasIguales(izq.form, der.form)) errores.push({ tipo, izq, der });
      }
    };
    revisar(xPrimero ? bloqueX : [...bloqueX].reverse(), 'x');
    revisar(xPrimero ? bloqueN : [...bloqueN].reverse(), 'num');

    const xAdj = xPrimero ? bloqueX[bloqueX.length - 1] : bloqueX[0];
    const xLejos = xPrimero ? bloqueX[0] : bloqueX[bloqueX.length - 1];
    const nAdj = xPrimero ? bloqueN[0] : bloqueN[bloqueN.length - 1];
    const nLejos = xPrimero ? bloqueN[bloqueN.length - 1] : bloqueN[0];
    const orden = (xp, np) => (xPrimero ? { L: xp.terms, R: np.terms } : { L: np.terms, R: xp.terms });

    return {
      ok: true,
      tipo: 'ecuacion',
      eq: orden(xAdj, nLejos),
      eqInicial: orden(xLejos, nAdj),
      cadena: errores.length ? errores : null,
      decimales,
    };
  } catch (e) {
    if (e instanceof ParseError) return { ok: false, error: { codigo: e.codigo, mensaje: e.message } };
    if (e instanceof RangeError) {
      const pe = new ParseError(/cero/.test(e.message) ? 'div_cero' : 'grande');
      return { ok: false, error: { codigo: pe.codigo, mensaje: pe.message } };
    }
    throw e;
  }
}

/** Atajo: parsea una ecuación y lanza error si no se puede. */
export function ecuacion(texto) {
  const r = parsearRenglon(texto);
  if (!r.ok) throw new Error(`Ecuación no válida «${texto}»: ${r.error.mensaje}`);
  return r.eq;
}

/* ------------------------------------------------------------------ */
/* Solución                                                            */
/* ------------------------------------------------------------------ */

export function resolver(eq) {
  const L = forma(eq.L);
  const R = forma(eq.R);
  const A = L.a.sub(R.a);
  const B = R.b.sub(L.b);
  if (!A.isZero()) return { tipo: 'unica', valor: B.div(A) };
  return B.isZero() ? { tipo: 'todas' } : { tipo: 'ninguna' };
}

export function mismaSolucion(s1, s2) {
  return s1.tipo === s2.tipo && (s1.tipo !== 'unica' || s1.valor.eq(s2.valor));
}

/** ¿El renglón ya dice "x = valor" con un solo término del otro lado? */
export function despeje(eq) {
  const prueba = (X, N) => {
    if (X.length !== 1 || N.length !== 1) return null;
    if (!X[0].x || !X[0].c.eq(1) || N[0].x) return null;
    return N[0].c;
  };
  return prueba(eq.L, eq.R) ?? prueba(eq.R, eq.L);
}

/* ------------------------------------------------------------------ */
/* Operaciones sobre ecuaciones (correctas y "mal-rules")              */
/* ------------------------------------------------------------------ */

const clonarLado = (terms) => terms.map((t) => ({ c: t.c, x: t.x }));

/** Términos que están del lado "equivocado" si queremos las x en `ladoX`. */
function fueraDeLugar(eq, ladoX) {
  const W = [];
  eq[ladoX].forEach((t, i) => {
    if (!t.x && !t.c.isZero()) W.push({ lado: ladoX, i, t });
  });
  eq[otroLado(ladoX)].forEach((t, i) => {
    if (t.x && !t.c.isZero()) W.push({ lado: otroLado(ladoX), i, t });
  });
  return W;
}

/** Pasa términos al otro lado. modo: correcto | sin_cambio_signo | solo_un_lado | inversa_div | inversa_mul */
function transponer(eq, ops) {
  const quitar = { L: new Set(), R: new Set() };
  for (const op of ops) quitar[op.lado].add(op.i);
  const nuevo = {
    L: eq.L.filter((_, i) => !quitar.L.has(i)).map((t) => ({ ...t })),
    R: eq.R.filter((_, i) => !quitar.R.has(i)).map((t) => ({ ...t })),
  };
  let inversa = null;
  for (const op of ops) {
    const destino = otroLado(op.lado);
    if (op.modo === 'correcto') nuevo[destino].push({ c: op.t.c.neg(), x: op.t.x });
    else if (op.modo === 'sin_cambio_signo') nuevo[destino].push({ c: op.t.c, x: op.t.x });
    else if (op.modo === 'inversa_div' || op.modo === 'inversa_mul') inversa = { op, destino };
    // solo_un_lado: el término desaparece y no llega al otro lado
  }
  if (inversa) {
    const { op, destino } = inversa;
    const f = forma(nuevo[destino]);
    if (!f.a.isZero()) return null;
    const k = op.t.c.abs();
    if (op.modo === 'inversa_div') nuevo[destino] = [{ c: f.b.div(k), x: false }];
    else nuevo[destino] = [{ c: f.b.mul(k), x: false }];
  }
  return { L: limpiar(nuevo.L), R: limpiar(nuevo.R) };
}

function detalleTermino(t, lado) {
  return {
    termino: fmtTerminoConSigno(t),
    terminoSinSigno: fmtTerminoSinSigno(t),
    signoOriginal: t.c.isNeg() ? 'resta' : 'suma',
    lado: LADO_NOMBRE[lado],
    otroLado: LADO_NOMBRE[otroLado(lado)],
    esX: t.x,
  };
}

function malDeTransposicion(modo, w) {
  const base = detalleTermino(w.t, w.lado);
  switch (modo) {
    case 'sin_cambio_signo':
      return {
        tipo: TIPOS.SIGNO_TRANSPOSICION,
        detalle: {
          variante: 'sin_cambio_signo',
          ...base,
          quedo: fmtTerminoConSigno(w.t),
          debioQuedar: fmtTerminoConSigno({ c: w.t.c.neg(), x: w.t.x }),
        },
      };
    case 'solo_un_lado':
      return {
        tipo: TIPOS.UN_SOLO_LADO,
        detalle: {
          variante: 'quita_de_un_lado',
          ...base,
          operacion: `${w.t.c.isNeg() ? 'sumar' : 'restar'} ${fmtTerminoSinSigno(w.t)}`,
        },
      };
    case 'inversa_div':
      return { tipo: TIPOS.INVERSA_EQUIVOCADA, detalle: { variante: 'aditivo_divide', ...base } };
    case 'inversa_mul':
      return { tipo: TIPOS.INVERSA_EQUIVOCADA, detalle: { variante: 'aditivo_multiplica', ...base } };
    default:
      return null;
  }
}

const MODOS_MAL = ['sin_cambio_signo', 'solo_un_lado', 'inversa_div', 'inversa_mul'];

/** TERMINOS_NO_SEMEJANTES: junta x con números en un mismo lado. */
function fusiones(eq) {
  const out = [];
  for (const lado of ['L', 'R']) {
    const terms = eq[lado];
    const xs = terms.map((t, i) => [t, i]).filter(([t]) => t.x && !t.c.isZero());
    const cs = terms.map((t, i) => [t, i]).filter(([t]) => !t.x && !t.c.isZero());
    if (!xs.length || !cs.length) continue;
    const total = terms.reduce((s, t) => s.add(t.c), Fr.ZERO);
    const textoOriginal = fmtLado(terms);
    const mk = (nuevos, variante, juntados) => ({
      eq: { ...eq, [lado]: limpiar(nuevos) },
      mal: {
        tipo: TIPOS.TERMINOS_NO_SEMEJANTES,
        detalle: {
          variante,
          lado: LADO_NOMBRE[lado],
          terminos: juntados,
          resultado: fmtLado(limpiar(nuevos.slice(-1))),
          ladoCompleto: textoOriginal,
        },
      },
    });
    out.push(mk([{ c: total, x: true }], 'todo_a_x', textoOriginal));
    out.push(mk([{ c: total, x: false }], 'todo_a_numero', textoOriginal));
    // Pares x + número: solo en lados cortos (en lados largos se vuelve combinatorio).
    if (terms.length > 2 && xs.length * cs.length <= 6) {
      for (const [tx, ix] of xs) {
        for (const [tc, ic] of cs) {
          const resto = terms.filter((_, i) => i !== ix && i !== ic);
          out.push(mk([...resto, { c: tx.c.add(tc.c), x: true }], 'par_a_x', fmtLado([tx, tc])));
        }
      }
    }
  }
  return out;
}

/** Si el renglón es "a·x = b", devuelve {a, b, ladoX}. */
function formaDespejable(eq) {
  const fL = forma(eq.L);
  const fR = forma(eq.R);
  if (!fL.a.isZero() && fL.b.isZero() && fR.a.isZero()) return { a: fL.a, b: fR.b, ladoX: 'L' };
  if (!fR.a.isZero() && fR.b.isZero() && fL.a.isZero()) return { a: fR.a, b: fL.b, ladoX: 'R' };
  return null;
}

function xIgual(valor, ladoX) {
  const X = [{ c: Fr.ONE, x: true }];
  const N = [{ c: valor, x: false }];
  return ladoX === 'L' ? { L: X, R: N } : { L: N, R: X };
}

/** Paso de división (o multiplicación) final, correcto y con sus errores típicos. */
function divisiones(base) {
  const d = formaDespejable(base.eq);
  if (!d) return [];
  const { a, b, ladoX } = d;
  if (a.eq(1)) return [];
  const correcto = b.div(a);
  const ops = base.ops + 1;
  const out = [
    {
      eq: xIgual(correcto, ladoX),
      mal: base.mal,
      ops,
      cuenta: Math.abs(a.n) === 1 && !a.isInt() ? `${fmtNum(b)} · ${fmtNum(new Fr(a.d * Math.sign(a.n)))}` : `${fmtNum(b)} ÷ ${fmtNum(a)}`,
    },
  ];
  if (base.mal) return out;

  const comun = { coef: fmtCoefX(a), coefNum: fmtNum(a), b: fmtNum(b), correcto: fmtNum(correcto) };
  const variantes = [];
  if (a.isInt()) {
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'resta', b.sub(a)]);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'suma', b.add(a)]);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'multiplica', b.mul(a)]);
    if (!b.isZero()) variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'invierte', a.div(b)]);
  } else if (Math.abs(a.n) === 1) {
    const q = new Fr(a.d * Math.sign(a.n));
    comun.divisor = fmtNum(q);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'divide', b.div(q)]);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'resta', b.sub(q)]);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'suma', b.add(q)]);
  } else {
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'multiplica', b.mul(a)]);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'resta', b.sub(a)]);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'suma', b.add(a)]);
  }
  if (a.isNeg() || b.isNeg()) variantes.push([TIPOS.SIGNO_NEGATIVO, 'pierde_signo', correcto.neg()]);
  variantes.push([TIPOS.UN_SOLO_LADO, 'divide_solo_x', b]);

  for (const [tipo, variante, valor] of variantes) {
    if (valor.eq(correcto)) continue;
    out.push({
      eq: xIgual(valor, ladoX),
      mal: { tipo, detalle: { variante, ...comun, escrito: fmtNum(valor) } },
      ops,
    });
  }
  // Divide (o multiplica) solo el lado de los números: 3x = 15 -> 3x = 5
  const soloNumero = b.div(a);
  if (!soloNumero.eq(b)) {
    const X = [{ c: a, x: true }];
    const N = [{ c: soloNumero, x: false }];
    out.push({
      eq: ladoX === 'L' ? { L: X, R: N } : { L: N, R: X },
      mal: { tipo: TIPOS.UN_SOLO_LADO, detalle: { variante: 'divide_solo_numero', ...comun, escrito: fmtNum(soloNumero) } },
      ops,
    });
  }
  // Quita el signo del coeficiente sin dividir: −2x = 8 -> 2x = 8
  if (a.isNeg()) {
    const X = [{ c: a.neg(), x: true }];
    const N = [{ c: b, x: false }];
    out.push({
      eq: ladoX === 'L' ? { L: X, R: N } : { L: N, R: X },
      mal: { tipo: TIPOS.SIGNO_NEGATIVO, detalle: { variante: 'quita_signo_coef', ...comun, escrito: fmtCoefX(a.neg()) } },
      ops,
    });
  }
  return out;
}

/**
 * Todos los renglones que un estudiante podría escribir a partir de `eq`
 * siguiendo la estrategia escolar (pasar términos, reducir, dividir), con a lo
 * más un error típico en el camino. Cada candidato trae su error (o null).
 */
/**
 * Subconjuntos de términos a mover. Con pocos términos probamos todos; con
 * muchos (alguien del jurado escribe 9 términos) solo los que un estudiante
 * real haría: todos a la vez, uno solo o todos menos uno. Así un celular de
 * gama baja responde en milisegundos y no en segundos.
 */
const MAX_TERMINOS_EXHAUSTIVO = 4;

function mascaras(n) {
  const todas = (1 << n) - 1;
  if (n <= MAX_TERMINOS_EXHAUSTIVO) return Array.from({ length: todas + 1 }, (_, i) => i);
  const out = new Set([0, todas]);
  for (let k = 0; k < n; k++) {
    out.add(1 << k);
    out.add(todas & ~(1 << k));
  }
  return [...out];
}

export function candidatos(eq) {
  const out = [];
  const inicios = [{ eq, mal: null, ops: 0 }, ...fusiones(eq).map((f) => ({ ...f, ops: 1 }))];
  for (const ini of inicios) {
    for (const ladoX of ['L', 'R']) {
      const W = fueraDeLugar(ini.eq, ladoX);
      for (const mask of mascaras(W.length)) {
        if (mask === 0 && ladoX === 'R') continue; // ya se generó con ladoX = L
        const T = W.filter((_, k) => mask & (1 << k));
        const variantes = [{ ops: T.map((w) => ({ ...w, modo: 'correcto' })), mal: ini.mal }];
        if (!ini.mal) {
          T.forEach((w, k) => {
            for (const modo of MODOS_MAL) {
              if (modo.startsWith('inversa') && w.t.x) continue;
              variantes.push({
                ops: T.map((v, j) => ({ ...v, modo: j === k ? modo : 'correcto' })),
                mal: malDeTransposicion(modo, w),
              });
            }
          });
        }
        for (const v of variantes) {
          const Q = transponer(ini.eq, v.ops);
          if (!Q) continue;
          const base = { eq: Q, mal: v.mal, ops: ini.ops + T.length };
          out.push(base, ...divisiones(base));
          if (!base.mal) {
            for (const f of fusiones(Q)) {
              const fb = { eq: f.eq, mal: f.mal, ops: base.ops + 1 };
              out.push(fb, ...divisiones(fb));
            }
          }
        }
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Clasificación                                                       */
/* ------------------------------------------------------------------ */

function vector(eq) {
  const L = forma(eq.L);
  const R = forma(eq.R);
  return [L.a, L.b, R.a, R.b];
}

function coinciden(v1, v2) {
  const directo = v1.every((x, i) => x.eq(v2[i]));
  if (directo) return true;
  const cruz = [v2[2], v2[3], v2[0], v2[1]];
  return v1.every((x, i) => x.eq(cruz[i]));
}

/** ¿El número escrito parece un desliz de cuenta del número correcto? */
export function cercano(r, w) {
  if (r.eq(w)) return false;
  const d = Math.abs(r.toNumber() - w.toNumber());
  if (d <= 2 + 1e-9) return true;
  if (r.isInt() && w.isInt()) {
    if (r.n === -w.n) return true; // se le fue el signo en una suma o resta
    const a = String(Math.abs(r.n));
    const b = String(Math.abs(w.n));
    if (Math.sign(r.n) === Math.sign(w.n) && a.length === b.length) {
      let distintos = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) distintos++;
      if (distintos === 1) return true; // un solo dígito distinto: 42 vs 48
      if ([...a].sort().join('') === [...b].sort().join('')) return true; // dígitos volteados: 15 vs 51
    }
  }
  return d <= 0.1 * Math.abs(r.toNumber());
}

const NOMBRE_COMPONENTE = ['xIzq', 'numIzq', 'xDer', 'numDer'];

function cuentaDe(cand, componente) {
  if (cand.cuenta && (componente === 1 || componente === 3)) return cand.cuenta;
  const lado = componente < 2 ? 'L' : 'R';
  const esX = componente % 2 === 0;
  const terms = cand.eq[lado].filter((t) => t.x === esX && !t.c.isZero());
  if (terms.length < 2) return null;
  if (esX) return fmtLado(terms.map((t) => ({ c: t.c, x: false })));
  return fmtLado(terms);
}

function buscarAritmetica(vS, correctos) {
  for (const cand of correctos) {
    const vC = cand.vector;
    for (const orden of [vC, [vC[2], vC[3], vC[0], vC[1]]]) {
      const difs = [];
      for (let i = 0; i < 4; i++) if (!orden[i].eq(vS[i])) difs.push(i);
      if (difs.length !== 1) continue;
      const i = difs[0];
      if (!cercano(orden[i], vS[i])) continue;
      // índice real dentro del candidato (por si estaba volteado)
      const iCand = orden === vC ? i : (i + 2) % 4;
      const cuenta = cuentaDe(cand, iCand);
      return {
        tipo: TIPOS.ARITMETICA,
        detalle: {
          variante: cuenta ? 'cuenta' : 'copia',
          cuenta,
          esperado: fmtNum(orden[i]),
          escrito: fmtNum(vS[i]),
          esX: i % 2 === 0,
          componente: NOMBRE_COMPONENTE[i],
        },
        confianza: cand.ops >= 2 ? 'media' : 'alta',
        ops: cand.ops,
      };
    }
  }
  return null;
}

function elegir(lista) {
  const orden = [...lista].sort(
    (p, q) => p.ops - q.ops || PRIORIDAD.indexOf(p.mal.tipo) - PRIORIDAD.indexOf(q.mal.tipo),
  );
  const mejor = orden[0];
  const alternativas = [...new Set(orden.map((c) => c.mal.tipo))].filter((t) => t !== mejor.mal.tipo);
  return { tipo: mejor.mal.tipo, detalle: mejor.mal.detalle, ops: mejor.ops, alternativas };
}

/**
 * Explica cómo se pasó de `previa` (correcta) a `escrita` (que cambió la solución).
 * @returns {{tipo, detalle, confianza: 'alta'|'media'|'baja', alternativas: string[]}}
 */
export function clasificar(previa, escrita) {
  const vS = vector(escrita);
  const todos = candidatos(previa).map((c) => ({ ...c, vector: vector(c.eq) }));

  const exactos = todos.filter((c) => c.mal && coinciden(vS, c.vector));
  if (exactos.length) return { ...elegir(exactos), confianza: 'alta' };

  const arit = buscarAritmetica(
    vS,
    todos.filter((c) => !c.mal).sort((p, q) => p.ops - q.ops),
  );
  if (arit) return { ...arit, alternativas: [] };

  // Nivel 2: el estudiante ya escribió "x = valor" y ese valor es el que da un
  // candidato con error (cometió el error y resolvió el resto de memoria).
  // Solo aplica a renglones despejados: en otros casos una coincidencia
  // numérica podría inventar un diagnóstico.
  let tipos = [];
  if (despeje(escrita) !== null) {
    const solS = resolver(escrita);
    const equivalentes = todos.filter((c) => c.mal && mismaSolucion(resolver(c.eq), solS));
    tipos = [...new Set(equivalentes.map((c) => c.mal.tipo))];
    if (tipos.length === 1) return { ...elegir(equivalentes), confianza: 'media' };
  }

  return {
    tipo: TIPOS.NO_CLASIFICADO,
    detalle: { variante: 'desconocido', posibles: tipos },
    confianza: 'baja',
    alternativas: tipos,
  };
}

function aritmeticaDeCadena(errorCadena) {
  const { tipo, izq, der } = errorCadena;
  const esperado = tipo === 'x' ? fmtCoefX(izq.form.a) : fmtNum(izq.form.b);
  const escrito = tipo === 'x' ? fmtCoefX(der.form.a) : fmtNum(der.form.b);
  return {
    tipo: TIPOS.ARITMETICA,
    detalle: {
      variante: 'cadena',
      cuenta: bonito(izq.texto),
      esperado,
      escrito,
      esX: tipo === 'x',
    },
    confianza: 'alta',
    alternativas: [],
  };
}

function aritmeticaNumerica(info) {
  const [A, B] = [info.partes[0], info.partes[info.partes.length - 1]];
  const calculo = A.terms.length >= B.terms.length ? A : B;
  const resultado = calculo === A ? B : A;
  return {
    tipo: TIPOS.ARITMETICA,
    detalle: {
      variante: 'cuenta',
      cuenta: bonito(calculo.texto),
      esperado: fmtNum(calculo.form.b),
      escrito: fmtNum(resultado.form.b),
      esX: false,
    },
    confianza: 'alta',
    alternativas: [],
  };
}

function esAproximacion(sol0, info) {
  if (sol0.tipo !== 'unica' || sol0.valor.isInt() || !info.decimales) return false;
  const v = despeje(info.eq);
  if (!v) return false;
  // Se acepta si está bien redondeado o truncado a esos decimales (3/7 ≈ 0.43 o 0.42, no 0.5).
  const paso = 10 ** -info.decimales;
  const real = sol0.valor.toNumber();
  const escrito = v.toNumber();
  const redondeado = Math.abs(escrito - real) <= paso / 2 + 1e-12;
  const truncado = Math.sign(escrito) === Math.sign(real) && Math.abs(escrito) <= Math.abs(real) && Math.abs(real) < Math.abs(escrito) + paso;
  return redondeado || truncado;
}

/**
 * Analiza un procedimiento completo (un renglón = una ecuación).
 *
 * @param {string[]} renglones el primero es la ecuación original
 * @returns {{
 *   estado: 'correcto'|'incompleto'|'error'|'sin_entender'|'vacio'|'sin_solucion_unica',
 *   solucion?: Fr, respuesta?: Fr|null, renglones: object[],
 *   error?: {renglon: number, texto: string, anterior: string, tipo: string, detalle: object, confianza: string, alternativas: string[]},
 *   mensaje?: string, renglon?: number, siguiente?: object|null
 * }}
 */
export function analizarProcedimiento(renglones) {
  const textos = (renglones || []).map((r) => String(r ?? '').trim()).filter(Boolean);
  if (!textos.length) return { estado: 'vacio', renglones: [] };

  const info = textos.map((texto, idx) => ({ n: idx + 1, texto, ...parsearRenglon(texto) }));
  const malEscrito = info.find((r) => !r.ok);
  if (malEscrito) {
    return {
      estado: 'sin_entender',
      renglon: malEscrito.n,
      mensaje: malEscrito.error.mensaje,
      renglones: info,
    };
  }
  const primero = info[0];
  if (primero.tipo !== 'ecuacion') {
    return {
      estado: 'sin_entender',
      renglon: 1,
      mensaje: 'El primer renglón debe ser la ecuación, con su x.',
      renglones: info,
    };
  }
  const sol0 = resolver(primero.eq);
  if (sol0.tipo !== 'unica') {
    return {
      estado: 'sin_solucion_unica',
      mensaje:
        sol0.tipo === 'ninguna'
          ? 'Esta ecuación no tiene solución: ningún valor de x la cumple.'
          : 'Esta ecuación se cumple con cualquier valor de x.',
      renglones: info,
    };
  }
  primero.valido = true;

  let previa = primero;
  for (let i = 1; i < info.length; i++) {
    const r = info[i];
    let diag = null;

    if (r.tipo === 'numerica') {
      if (r.verdadera) {
        r.valido = true;
        r.nota = 'calculo';
        continue;
      }
      // Un renglón sin x y falso: o vino de un error típico (8 = 20) o es una cuenta mal hecha.
      const c = clasificar(previa.eq, r.eq);
      diag = c.tipo === TIPOS.NO_CLASIFICADO ? aritmeticaNumerica(r) : c;
    } else if (r.cadena) {
      const solIni = resolver(r.eqInicial);
      diag = mismaSolucion(sol0, solIni) ? aritmeticaDeCadena(r.cadena[0]) : clasificar(previa.eq, r.eqInicial);
    } else {
      const sol = resolver(r.eq);
      if (mismaSolucion(sol0, sol)) {
        r.valido = true;
        previa = r;
        continue;
      }
      if (esAproximacion(sol0, r)) {
        r.valido = true;
        r.nota = 'aproximado';
        previa = r;
        continue;
      }
      diag = clasificar(previa.eq, r.eq);
    }

    r.valido = false;
    for (let j = i + 1; j < info.length; j++) info[j].despuesDelError = true;
    return {
      estado: 'error',
      solucion: sol0.valor,
      respuesta: null,
      renglones: info,
      error: {
        renglon: r.n,
        texto: r.texto,
        anterior: previa.texto,
        tipo: diag.tipo,
        detalle: diag.detalle,
        confianza: diag.confianza,
        alternativas: diag.alternativas || [],
      },
    };
  }

  const valor = despeje(previa.eq);
  const terminado = valor !== null && (valor.eq(sol0.valor) || previa.nota === 'aproximado');
  return {
    estado: terminado ? 'correcto' : 'incompleto',
    solucion: sol0.valor,
    respuesta: terminado ? valor : null,
    renglones: info,
    siguiente: terminado ? null : siguientePaso(previa.eq),
  };
}

/* ------------------------------------------------------------------ */
/* Solución paso a paso (para pistas y para "ver solución")            */
/* ------------------------------------------------------------------ */

function reducirLado(terms) {
  const f = forma(terms);
  const out = [];
  if (!f.a.isZero()) out.push({ c: f.a, x: true });
  if (!f.b.isZero()) out.push({ c: f.b, x: false });
  return limpiar(out);
}

/** Orienta para mostrar siempre la x a la izquierda. */
function orientar(eq, ladoX) {
  return ladoX === 'L' ? eq : { L: eq.R, R: eq.L };
}

function elegirLadoX(eq) {
  const fL = forma(eq.L);
  const fR = forma(eq.R);
  if (fL.a.isZero()) return 'R';
  if (fR.a.isZero()) return 'L';
  return fR.a.cmp(fL.a) > 0 ? 'R' : 'L';
}

/**
 * Pasos canónicos para resolver `eq`. Cada paso trae su tipo (para las pistas),
 * el texto del renglón y la ecuación resultante.
 */
export function pasosSolucion(eqInicial) {
  const pasos = [];
  let eq = { L: clonarLado(eqInicial.L), R: clonarLado(eqInicial.R) };
  if (resolver(eq).tipo !== 'unica') return pasos;
  const ladoX = elegirLadoX(eq);

  const W = fueraDeLugar(eq, ladoX);
  if (W.length) {
    const nuevo = transponer(
      eq,
      W.map((w) => ({ ...w, modo: 'correcto' })),
    );
    const vista = orientar(nuevo, ladoX);
    const constantes = W.filter((w) => !w.t.x);
    const equis = W.filter((w) => w.t.x);
    pasos.push({
      tipo: constantes.length ? 'transponer_constante' : 'transponer_x',
      movidos: W.map((w) => ({ ...detalleTermino(w.t, w.lado), c: w.t.c })),
      constantes: constantes.length,
      equis: equis.length,
      texto: fmtEcuacion(vista),
      eq: vista,
    });
    eq = vista;
  } else {
    eq = orientar(eq, ladoX);
  }
  // A partir de aquí la x está a la izquierda.
  if (eq.L.length > 1 || eq.R.length > 1) {
    const red = { L: reducirLado(eq.L), R: reducirLado(eq.R) };
    pasos.push({ tipo: 'reducir', texto: fmtEcuacion(red), eq: red, antes: fmtEcuacion(eq) });
    eq = red;
  }
  const a = forma(eq.L).a;
  const b = forma(eq.R).b;
  if (!a.eq(1)) {
    const valor = b.div(a);
    const final = xIgual(valor, 'L');
    if (a.eq(-1)) {
      pasos.push({ tipo: 'cambiar_signo', coef: fmtNum(a), b: fmtNum(b), texto: fmtEcuacion(final), eq: final });
    } else if (!a.isInt() && Math.abs(a.n) === 1) {
      const q = new Fr(a.d * Math.sign(a.n));
      pasos.push({
        tipo: 'multiplicar',
        divisor: fmtNum(q),
        b: fmtNum(b),
        texto: `x = ${fmtNum(b)} · ${q.isNeg() ? `(${fmtNum(q)})` : fmtNum(q)}`,
        eq: final,
      });
      pasos.push({ tipo: 'calcular', texto: fmtEcuacion(final), eq: final });
    } else {
      const divisor = a.isInt() ? fmtNum(a) : `(${fmtNum(a)})`;
      const intermedio = `x = ${fmtNum(b)}/${a.isNeg() || !a.isInt() ? `(${fmtNum(a)})` : divisor}`;
      pasos.push({ tipo: 'dividir', coef: fmtNum(a), b: fmtNum(b), texto: intermedio, eq: final });
      if (intermedio !== fmtEcuacion(final)) pasos.push({ tipo: 'calcular', texto: fmtEcuacion(final), eq: final });
    }
  }
  return pasos;
}

/** El siguiente paso canónico desde `eq` (o null si ya está resuelta). */
export function siguientePaso(eq) {
  const pasos = pasosSolucion(eq);
  return pasos.length ? pasos[0] : null;
}

/* ------------------------------------------------------------------ */
/* Generador de ejercicios                                             */
/* ------------------------------------------------------------------ */

const sinCero = (rng, min, max) => {
  let v = 0;
  while (v === 0) v = rng.int(min, max);
  return v;
};

/** Construye el texto de una ecuación a partir de términos [coef, esX]. */
function texto(L, R) {
  const lado = (ts) => fmtLado(ts.map(([c, x]) => ({ c: Fr.from(c), x })));
  return `${lado(L)} = ${lado(R)}`;
}

const FORMAS = {
  'x+b=c': (r) => {
    const x0 = r.int(2, 12);
    const b = r.int(2, 12);
    return { t: texto([[1, true], [b, false]], [[x0 + b, false]]), x0 };
  },
  'ax+b=c': (r) => {
    const a = r.int(2, 9);
    const x0 = r.int(2, 9);
    const b = r.int(1, 15);
    return { t: texto([[a, true], [b, false]], [[a * x0 + b, false]]), x0 };
  },
  'ax+b=c grande': (r) => {
    const a = r.int(3, 9);
    const x0 = r.int(6, 15);
    const b = r.int(11, 39);
    return { t: texto([[a, true], [b, false]], [[a * x0 + b, false]]), x0 };
  },
  'ax-b=c': (r) => {
    const a = r.int(2, 9);
    const x0 = r.int(2, 9);
    const b = r.int(1, Math.min(20, a * x0 - 1));
    return { t: texto([[a, true], [-b, false]], [[a * x0 - b, false]]), x0 };
  },
  'ax=b': (r) => {
    const a = r.int(2, 9);
    const x0 = r.int(2, 12);
    return { t: texto([[a, true]], [[a * x0, false]]), x0 };
  },
  'x/a=b': (r) => {
    const a = r.int(2, 6);
    const q = r.int(2, 9);
    return { t: texto([[new Fr(1, a), true]], [[q, false]]), x0: a * q };
  },
  'x/a+b=c': (r) => {
    const a = r.int(2, 5);
    const q = r.int(2, 6);
    const b = r.int(1, 9);
    return { t: texto([[new Fr(1, a), true], [b, false]], [[q + b, false]]), x0: a * q };
  },
  'ax+b=cx+d': (r) => {
    const a = r.int(3, 9);
    const c = r.int(1, a - 1);
    const x0 = r.int(2, 8);
    const b = r.int(1, 12);
    return { t: texto([[a, true], [b, false]], [[c, true], [(a - c) * x0 + b, false]]), x0 };
  },
  'ax+bx=c': (r) => {
    const a = r.int(2, 6);
    const b = r.int(2, 6);
    const x0 = r.int(2, 8);
    return { t: texto([[a, true], [b, true]], [[(a + b) * x0, false]]), x0 };
  },
  'ax+b+cx=d': (r) => {
    const a = r.int(2, 5);
    const c = r.int(2, 5);
    const b = r.int(1, 9);
    const x0 = r.int(2, 6);
    return { t: texto([[a, true], [b, false], [c, true]], [[(a + c) * x0 + b, false]]), x0 };
  },
  '-x=b': (r) => {
    const x0 = sinCero(r, -9, 9);
    return { t: texto([[-1, true]], [[-x0, false]]), x0 };
  },
  '-ax=b': (r) => {
    const a = r.int(2, 9);
    const x0 = sinCero(r, -9, 9);
    return { t: texto([[-a, true]], [[-a * x0, false]]), x0 };
  },
  '-ax+b=c': (r) => {
    const a = r.int(2, 6);
    const x0 = sinCero(r, -6, 6);
    const b = r.int(1, 12);
    return { t: texto([[-a, true], [b, false]], [[-a * x0 + b, false]]), x0 };
  },
};

/** Qué tipo de ecuación pone a prueba cada error, por nivel (1 a 3). */
export const PLAN_EJERCICIOS = {
  SIGNO_TRANSPOSICION: ['x+b=c', 'ax-b=c', 'ax+b=cx+d'],
  INVERSA_EQUIVOCADA: ['ax=b', 'x/a=b', 'ax+b=c'],
  ARITMETICA: ['ax+b=c', 'ax+b=c grande', '-ax+b=c'],
  TERMINOS_NO_SEMEJANTES: ['ax+bx=c', 'ax+b+cx=d', 'ax+b=cx+d'],
  UN_SOLO_LADO: ['x+b=c', 'ax+b=c', 'x/a+b=c'],
  SIGNO_NEGATIVO: ['-x=b', '-ax=b', '-ax+b=c'],
  NO_CLASIFICADO: ['ax+b=c', 'ax-b=c', 'ax+b=cx+d'],
};

/**
 * Genera un ejercicio nuevo, con solución entera, para trabajar un error.
 * @param {string} tipo uno de TIPOS
 * @param {1|2|3} nivel
 * @param {{int: Function}} rng generador con semilla (rng.js)
 * @param {Set<string>|string[]} [evitar] ecuaciones ya usadas
 */
export function generarEjercicio(tipo, nivel, rng, evitar = []) {
  const plan = PLAN_EJERCICIOS[tipo] || PLAN_EJERCICIOS.NO_CLASIFICADO;
  const formaId = plan[Math.min(Math.max(nivel, 1), 3) - 1];
  const usados = new Set(evitar);
  let ultimo = null;
  for (let intento = 0; intento < 40; intento++) {
    const { t, x0 } = FORMAS[formaId](rng);
    ultimo = { ecuacion: t, solucion: x0, tipo, nivel, forma: formaId };
    if (!usados.has(t)) return ultimo;
  }
  return ultimo;
}

/* ------------------------------------------------------------------ */
/* Procedimientos con error (para el grupo simulado y para pruebas)    */
/* ------------------------------------------------------------------ */

const PREFERENCIA_VARIANTE = {
  INVERSA_EQUIVOCADA: ['resta', 'divide', 'multiplica', 'suma', 'invierte'],
  SIGNO_NEGATIVO: ['pierde_signo', 'quita_signo_coef'],
  UN_SOLO_LADO: ['divide_solo_x', 'divide_solo_numero'],
};

/** Etapa del camino escolar donde un estudiante suele cometer cada error. */
const ETAPAS = {
  SIGNO_TRANSPOSICION: [['transponer', 'sin_cambio_signo']],
  UN_SOLO_LADO: [['transponer', 'solo_un_lado'], ['dividir']],
  INVERSA_EQUIVOCADA: [['dividir'], ['transponer', 'inversa_div']],
  SIGNO_NEGATIVO: [['dividir']],
  TERMINOS_NO_SEMEJANTES: [['fusionar']],
};

const reducida = (eq) => eq.L.length === 1 && eq.R.length === 1;

/** Renglones equivocados que salen de `eq` en una etapa concreta del camino escolar. */
function variantesEnEtapa(eq, tipo, etapa) {
  const [que, modo] = etapa;
  if (que === 'fusionar') {
    const fs = fusiones(eq);
    return [
      ...fs.filter((f) => f.mal.detalle.variante === 'todo_a_x'),
      ...fs.filter((f) => f.mal.detalle.variante === 'par_a_x'),
    ].map((f) => f.eq);
  }
  if (que === 'transponer') {
    const W = fueraDeLugar(eq, elegirLadoX(eq));
    const out = [];
    W.forEach((w, k) => {
      if (modo.startsWith('inversa') && w.t.x) return;
      const Q = transponer(
        eq,
        W.map((v, j) => ({ ...v, modo: j === k ? modo : 'correcto' })),
      );
      if (Q) out.push(Q);
    });
    return out;
  }
  // dividir: solo cuando el renglón ya está reducido (3x = 15), como lo haría un estudiante
  if (!reducida(eq)) return [];
  const pref = PREFERENCIA_VARIANTE[tipo] || [];
  const rango = (c) => {
    const i = pref.indexOf(c.mal.detalle.variante);
    return i === -1 ? 99 : i;
  };
  return divisiones({ eq, mal: null, ops: 0 })
    .filter((c) => c.mal && c.mal.tipo === tipo)
    .sort((p, q) => rango(p) - rango(q))
    .map((c) => c.eq);
}

/**
 * Escribe un procedimiento plausible que comete el error `tipo` y luego sigue
 * bien. Sirve para que el grupo simulado tenga procedimientos reales que el
 * mismo motor vuelve a diagnosticar. Devuelve null si el error no aplica.
 */
export function procedimientoConError(ecuacionTexto, tipo) {
  const eq0 = ecuacion(ecuacionTexto);
  if (resolver(eq0).tipo !== 'unica') return null;
  const inicio = [bonito(ecuacionTexto)];
  const pasos = pasosSolucion(eq0);

  const intentar = (previas, eqMala) => {
    const linea = fmtEcuacion(orientarX(eqMala));
    const prueba = analizarProcedimiento([...previas, linea]);
    if (prueba.estado !== 'error' || prueba.error.tipo !== tipo) return null;
    return [...previas, linea, ...pasosSolucion(orientarX(eqMala)).map((s) => s.texto)];
  };

  if (tipo === TIPOS.ARITMETICA) {
    const lineas = [...inicio];
    for (const paso of pasos) {
      if (paso.tipo === 'reducir' || paso.tipo === 'calcular') {
        const N = forma(paso.eq.R).b;
        for (const delta of [1, -1, 2, -2]) {
          const r = intentar(lineas, { L: paso.eq.L, R: [{ c: N.add(delta), x: false }] });
          if (r) return r;
        }
      }
      lineas.push(paso.texto);
    }
    return null;
  }

  if (tipo === TIPOS.NO_CLASIFICADO) {
    // Divide solo el término con x (error fuera del catálogo): 3x + 5 = 20 -> x + 5 = 20/3
    const fL = forma(eq0.L);
    const fR = forma(eq0.R);
    if (!fL.a.isZero() && !fL.a.eq(1) && !fL.b.isZero() && fR.a.isZero()) {
      return intentar(inicio, {
        L: [{ c: Fr.ONE, x: true }, { c: fL.b, x: false }],
        R: [{ c: fR.b.div(fL.a), x: false }],
      });
    }
    return null;
  }

  for (const etapa of ETAPAS[tipo] || []) {
    const lineas = [...inicio];
    let actual = eq0;
    for (let k = 0; k <= pasos.length; k++) {
      for (const eqMala of variantesEnEtapa(actual, tipo, etapa)) {
        const r = intentar(lineas, eqMala);
        if (r) return r;
      }
      if (k < pasos.length) {
        lineas.push(pasos[k].texto);
        actual = pasos[k].eq;
      }
    }
  }
  return null;
}

/** Si la x quedó a la derecha y la izquierda es solo número, voltea para leer mejor. */
function orientarX(eq) {
  const fL = forma(eq.L);
  const fR = forma(eq.R);
  if (fL.a.isZero() && !fR.a.isZero()) return { L: eq.R, R: eq.L };
  return eq;
}

/* ------------------------------------------------------------------ */
/* Filtro de salida (para la capa opcional de IA)                      */
/* ------------------------------------------------------------------ */

/** Un número no debe ser parte de otro: ni dígitos, ni fracción, ni decimal (5 en 15, 5/3 o 5.5). */
const INICIO = '(?<![\\d/]|\\d\\.)';
const FIN = '(?![\\d/]|\\.\\d)';

const PALABRAS_NUMERO = {
  0: 'cero', 1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete',
  8: 'ocho', 9: 'nueve', 10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce',
  15: 'quince', 16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve', 20: 'veinte',
};

/**
 * ¿El texto revela el valor de x? Detecta "x = 5", "x vale 5", "es 5", "cinco",
 * o el número suelto cuando no aparece ni en el ejercicio ni en lo que escribió
 * el estudiante. Se usa para descartar respuestas de la IA.
 */
export function revelaSolucion(texto, solucion, contexto = []) {
  const s = Fr.from(solucion);
  const t = normalizar(String(texto)).toLowerCase();
  const legible = String(texto).toLowerCase().replace(/[−–]/g, '-');
  const valorTxt = s.toString();
  const valorDecimal = s.isInt() ? null : String(Math.round(s.toNumber() * 100) / 100);
  const candidatosTxt = [valorTxt, valorDecimal].filter(Boolean);

  for (const v of candidatosTxt) {
    const esc = v.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
    if (new RegExp(`x=${esc}${FIN}`).test(t)) return true;
    if (new RegExp(`(?:vale|es igual a|da|resultado es|respuesta es|solución es|solucion es)\\s*${esc}${FIN}`).test(legible)) return true;
  }
  if (s.isInt() && Math.abs(s.n) <= 20) {
    const palabra = PALABRAS_NUMERO[Math.abs(s.n)];
    const enContexto = contexto.some((c) => new RegExp(`\\b${palabra}\\b`).test(String(c).toLowerCase()));
    if (!enContexto && new RegExp(`(?:x\\s*(?:vale|es|=)\\s*(?:menos\\s+)?)${palabra}\\b`).test(legible)) return true;
  }
  // Número suelto igual a la solución que no estaba en el ejercicio ni en los renglones.
  const numerosContexto = new Set();
  for (const c of contexto) {
    for (const m of normalizar(String(c)).matchAll(/\d+(?:\.\d+)?(?:\/\d+)?/g)) numerosContexto.add(m[0]);
  }
  const absTxt = s.abs().toString();
  if (!numerosContexto.has(absTxt)) {
    const esc = absTxt.replace(/[/]/g, '\\/');
    if (new RegExp(`${INICIO}${esc}${FIN}`).test(t)) return true;
  }
  return false;
}
