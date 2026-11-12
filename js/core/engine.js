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

/**
 * Convierte un texto escrito por el estudiante a formato de pantalla (− en vez de -).
 * Acepta también el − tipográfico (U+2212) y los demás guiones que entiende normalizar():
 * "3x−5=20" queda "3x − 5 = 20" igual que "3x-5=20". Aplicarla dos veces no cambia nada.
 * Los "=" repetidos se juntan ("3x == 25" → "3x = 25"), igual que en normalizar(): el motor
 * los lee como uno solo y así se citan.
 */
export function bonito(texto) {
  return String(texto ?? '')
    .replace(/[−‐-―﹣˗➖]/g, '-')
    .replace(/=(?:\s*=)+/g, '=')
    .replace(/\s*([=+])\s*/g, ' $1 ')
    .replace(/([\dxX)\]])\s*-\s*/g, `$1 ${MENOS} `) // resta: después de número, x o paréntesis
    .replace(/-\s*/g, MENOS) // signo de un negativo: −3 (sin espacio)
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
  // Sin ejemplo numérico: «x = 5» era justo la respuesta del primer ejercicio del diagnóstico.
  letra: (c) => `Escribiste «${c}». Usa solo números, signos y la letra x, sin palabras ni unidades.`,
  x_numero: (frag) =>
    `En «${frag}» hay un número justo después de la x. Para multiplicar usa · o paréntesis, como 3·5 o 3(5); si es la incógnita, el número va antes: 2x.`,
  largo: () => 'Ese renglón es muy largo. Escribe la ecuación con menos términos.',
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
  if (/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]|\^|\*\*/.test(s)) throw new ParseError('no_lineal');
  s = s.replace(/(\d)\s*([¼½¾⅐-⅞])/g, '($1+$2)'); // número mixto: 2½ → (2+½)
  s = s.normalize('NFKC');
  s = s.replace(/[\p{Cf}\p{Mn}\p{Me}]/gu, ''); // invisibles: ZWSP, LRM, U+00AD, selector de emoji, tecla 3️⃣
  s = s.replace(/[−‐-―﹣˗➖]/g, '-');
  s = s.replace(/[×✕✖⋅·•∙∗]/g, '*');
  s = s.replace(/[÷⁄∕➗]/g, '/');
  // Número mixto escolar: "8 1/3" es 8 + 1/3 (sin esto se leía 81/3). Solo con una fracción propia
  // (1/3, no 4/2) y sin tocar "3 x = 1 5" ni "1/2 1/2".
  s = s.replace(/(?<![\d.,/])(\d+)\s+([1-9]\d*)\s*\/\s*(\d+)(?![\d.,])/g, (m, entero, n, d) =>
    Number(n) < Number(d) ? `(${entero}+${n}/${d})` : m,
  );
  s = s.replace(/[[{]/g, '(').replace(/[\]}]/g, ')'); // corchetes y llaves como paréntesis
  s = s.replace(/≈/g, '='); // x ≈ 8.33 (la aproximación ya se valida aparte)
  s = s.replace(/X/g, 'x');
  // En México la coma separa miles: 1,000 = mil. "2,5" y "0,125" siguen siendo decimales.
  s = s.replace(/(?<![\d.,])([1-9]\d{0,2})((?:,\d{3})+)(?![\d.,])/g, (_, a, b) => a + b.replace(/,/g, ''));
  s = s.replace(/(\d)\s*,\s*(?=\d)/g, '$1.');
  s = s.replace(/([\dx)])\s*:\s*(?=[\dx(+-])/g, '$1/');
  s = s.replace(/\s+/g, '');
  // Al final del renglón: punto de oración ("15 = 3x."), el ";" o la "," que pone el
  // autocorrector del celular y la palomita de la comprobación ("x = 5 ✓").
  s = s.replace(/[.;,✓✔✅☑]+$/, '');
  s = s.replace(/={2,}/g, '=');
  return s;
}

/** ≈ 30 términos: de sobra para 1.º de secundaria y evita que un renglón pegado congele el celular. */
const MAX_TOKENS = 60;

/**
 * Lo que el estudiante escribió con letras, para citarlo completo («no se», «cm», «cinco») y no
 * solo su primera letra: la primera palabra que no es la x y las palabras que le siguen.
 */
function palabrasEscritas(crudo) {
  const texto = String(crudo ?? '').normalize('NFKC');
  const palabras = [...texto.matchAll(/[\p{L}\p{M}]+/gu)];
  const k = palabras.findIndex((m) => /[^xX]/.test(m[0]));
  if (k < 0) return null;
  const fin = (m) => m.index + m[0].length;
  let u = k;
  while (u + 1 < palabras.length && /^\s+$/.test(texto.slice(fin(palabras[u]), palabras[u + 1].index)) && /[^xX]/.test(palabras[u + 1][0])) u++;
  const cita = texto.slice(palabras[k].index, fin(palabras[u])).replace(/\s+/g, ' ');
  return cita.length > 30 ? `${cita.slice(0, 29)}…` : cita;
}

function tokenizar(s, crudo = s) {
  const out = [];
  for (let i = 0; i < s.length; ) {
    const c = s[i];
    if ((c >= '0' && c <= '9') || c === '.') {
      let j = i;
      while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.')) j++;
      let text = s.slice(i, j);
      // "2x3", "3 x 5", "x2": la x usada como "por" (o un x² sin superíndice).
      if (out.length && out[out.length - 1].t === 'x') throw new ParseError('x_numero', bonito(s.slice(Math.max(0, i - 2), j)));
      // 8.333333333333334 (calculadora): recorta los decimales que no caben; se valida como aproximación.
      const partes = text.split('.');
      if (partes.length === 2 && partes[0].length <= 9 && partes[0].length + partes[1].length > 15) {
        text = `${partes[0]}.${partes[1].slice(0, 15 - partes[0].length)}`;
      }
      let v;
      try {
        v = Fr.fromDecimalString(text);
      } catch (e) {
        throw new ParseError(e instanceof RangeError ? 'grande' : 'numero', text);
      }
      const dec = text.includes('.') ? text.split('.')[1].length : 0;
      out.push({ t: 'num', v, i, f: j, dec });
      i = j;
    } else if (c === 'x') {
      out.push({ t: 'x', i, f: i + 1 });
      i++;
    } else if ('+-*/()='.includes(c)) {
      out.push({ t: c, i, f: i + 1 });
      i++;
    } else {
      const cp = String.fromCodePoint(s.codePointAt(i)); // emoji completo, no medio par sustituto
      if (/\p{L}/u.test(cp)) throw new ParseError('letra', palabrasEscritas(crudo) ?? cp);
      throw new ParseError('simbolo', cp);
    }
    if (out.length > MAX_TOKENS) throw new ParseError('largo');
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
    const s = this.src;
    let a = tok ? Math.max(0, tok.i - 2) : Math.max(0, s.length - 6);
    let b = tok ? Math.min(s.length, tok.i + 4) : s.length;
    while (a > 0 && /[\d.]/.test(s[a - 1])) a--; // no cortar números a la mitad
    while (b < s.length && /[\d.]/.test(s[b])) b++;
    return bonito(s.slice(a, b)); // con −, · y espacios, como lo ve el alumno
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
    const tokens = tokenizar(src, raw);
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
        decimales: toks.reduce((m, t) => Math.max(m, t.dec || 0), 0),
        texto: src.slice(desde, ultimo.f), // .f = fin del token (los números pueden tener varias cifras)
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
        if (formasIguales(izq.form, der.form)) continue;
        // "x = 3/7 = 0.43": una aproximación al final de la cadena no es un error de cuenta.
        if (tipo === 'num' && aproxima(izq.form.b, der.form.b, der.decimales)) continue;
        errores.push({ tipo, izq, der });
      }
    };
    revisar(xPrimero ? bloqueX : [...bloqueX].reverse(), 'x');
    revisar(xPrimero ? bloqueN : [...bloqueN].reverse(), 'num');

    const xAdj = xPrimero ? bloqueX[bloqueX.length - 1] : bloqueX[0];
    const xLejos = xPrimero ? bloqueX[0] : bloqueX[bloqueX.length - 1];
    const nAdj = xPrimero ? bloqueN[0] : bloqueN[bloqueN.length - 1];
    const nLejos = xPrimero ? bloqueN[bloqueN.length - 1] : bloqueN[0];
    const orden = (xp, np) => (xPrimero ? { L: xp.terms, R: np.terms } : { L: np.terms, R: xp.terms });
    // "3x = 15 = 15/3 = 5": siguió despejando en el mismo renglón; no es un error de cuenta.
    const coef = xAdj.form.a;
    if (!coef.isZero() && !coef.eq(1) && errores.some((e) => e.tipo === 'num' && e.der.form.b.mul(coef).eq(e.izq.form.b))) {
      throw new ParseError('cadena');
    }

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

/**
 * Pasa términos al otro lado.
 * modo: correcto | sin_cambio_signo | solo_un_lado | opera_un_lado | inversa_div | inversa_mul
 */
function transponer(eq, ops) {
  const quitar = { L: new Set(), R: new Set() };
  // opera_un_lado: la operación se hizo solo del otro lado y el término sigue en el suyo.
  for (const op of ops) if (op.modo !== 'opera_un_lado') quitar[op.lado].add(op.i);
  const nuevo = {
    L: eq.L.filter((_, i) => !quitar.L.has(i)).map((t) => ({ ...t })),
    R: eq.R.filter((_, i) => !quitar.R.has(i)).map((t) => ({ ...t })),
  };
  let inversa = null;
  for (const op of ops) {
    const destino = otroLado(op.lado);
    if (op.modo === 'correcto' || op.modo === 'opera_un_lado') nuevo[destino].push({ c: op.t.c.neg(), x: op.t.x });
    else if (op.modo === 'sin_cambio_signo') nuevo[destino].push({ c: op.t.c, x: op.t.x });
    else if (op.modo === 'inversa_div' || op.modo === 'inversa_mul') inversa = { op, destino };
    // solo_un_lado: el término desaparece y no llega al otro lado
  }
  if (inversa) {
    const { op, destino } = inversa;
    const f = forma(nuevo[destino]);
    if (!f.a.isZero()) return null;
    // Con 0 del otro lado, "lo pasó dividiendo" o "multiplicando" da 0: no se distingue de
    // quitarlo de un lado (−4x + 12 = 0 → −4x = 0). Con ±1, "lo pasó multiplicando" deja el
    // mismo número (5x − 9 = 1 → 5x = 9): lo más probable es que solo olvidó el 1.
    if (f.b.isZero()) return null;
    if (op.modo === 'inversa_mul' && f.b.abs().eq(1)) return null;
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
    terminoConArticulo: conArticulo(t), // "el 5", "el 2x", "la x": para plantillas que no digan "el x"
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
    case 'opera_un_lado':
      // 3x + 5 = 20 → 3x + 5 = 20 − 5 (el método de la balanza hecho de un solo lado). Aquí
      // `lado` es donde SÍ se hizo la operación y `otroLado` donde faltó: ahí sigue el término.
      return {
        tipo: TIPOS.UN_SOLO_LADO,
        detalle: {
          variante: 'opera_un_lado',
          ...base,
          lado: base.otroLado,
          otroLado: base.lado,
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

/** "el 5", "el 2x", pero "la x" (la incógnita sola, aunque tenga signo menos). */
function conArticulo(t) {
  const texto = fmtTerminoSinSigno(t);
  return texto === 'x' ? 'la x' : `el ${texto}`;
}

/** El mismo error en varios términos a la vez (todos sin cambiar signo, o todos quitados de un lado). */
function malDeVarios(modo, T) {
  const lista = T.map((w) => conArticulo(w.t));
  const terminos = `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
  const base = { ...detalleTermino(T[0].t, T[0].lado), terminos, cantidad: T.length };
  if (modo === 'sin_cambio_signo') {
    return {
      tipo: TIPOS.SIGNO_TRANSPOSICION,
      detalle: {
        variante: 'varios_sin_cambio_signo',
        ...base,
        quedo: T.map((w) => fmtTerminoConSigno(w.t)).join(', '),
        debioQuedar: T.map((w) => fmtTerminoConSigno({ c: w.t.c.neg(), x: w.t.x })).join(', '),
      },
    };
  }
  return { tipo: TIPOS.UN_SOLO_LADO, detalle: { variante: 'varios_quita_de_un_lado', ...base } };
}

/** TERMINOS_NO_SEMEJANTES: junta x con números en un mismo lado. */
function fusiones(eq, lados = ['L', 'R']) {
  const out = [];
  for (const lado of lados) {
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

/**
 * x.op(y), o null si el resultado no cabe en enteros seguros. Así una regla de
 * error con números enormes (8+ cifras) se descarta en lugar de anular el análisis.
 */
function opSegura(x, op, y) {
  try {
    return x[op](y);
  } catch (e) {
    if (e instanceof RangeError) return null;
    throw e;
  }
}

/** Número dentro de una cuenta: los negativos y las fracciones van entre paréntesis («8 ÷ (−2)», «4 ÷ (2/3)»). */
function fmtOperando(fr, { primero = false } = {}) {
  if (!fr.isInt() || (fr.isNeg() && !primero)) return `(${fmtNum(fr)})`;
  return fmtNum(fr);
}

/**
 * Paso de división (o multiplicación) final, correcto y con sus errores típicos.
 * Los candidatos con error salen marcados `final`: describen el último paso
 * ("dividiste solo los números", "restaste el 3") y no sirven para explicar un
 * despeje que el estudiante terminó de otra forma (nivel 2 de clasificar) ni un
 * renglón donde la x quedó en varios términos (5x − 4x = 14 − 2: ver xReducida).
 * Heredan `fantasma` del renglón del que salen (ver candidatos()).
 */
function divisiones(base) {
  const d = formaDespejable(base.eq);
  if (!d) return [];
  const { a, b, ladoX } = d;
  if (a.eq(1)) return [];
  const correcto = b.div(a);
  const ops = base.ops + 1;
  const fantasma = Boolean(base.fantasma);
  const out = [
    {
      eq: xIgual(correcto, ladoX),
      mal: base.mal,
      ops,
      fantasma,
      final: false,
      cuenta:
        Math.abs(a.n) === 1 && !a.isInt()
          ? `${fmtOperando(b, { primero: true })} · ${fmtOperando(new Fr(a.d * Math.sign(a.n)))}`
          : `${fmtOperando(b, { primero: true })} ÷ ${fmtOperando(a)}`,
    },
  ];
  if (base.mal) return out;

  const comun = { coef: fmtCoefX(a), coefNum: fmtNum(a), b: fmtNum(b), correcto: fmtNum(correcto) };
  const variantes = [];
  // Con −x el coeficiente (−1) no está escrito: "restó el −1" o "sumó el −1" solo dice que la
  // respuesta se pasó por uno. Es una explicación posible, nunca segura (`incierto` ⇒ confianza media).
  const sinCoeficienteEscrito = a.eq(-1);
  if (a.isInt()) {
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'resta', opSegura(b, 'sub', a), sinCoeficienteEscrito]);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'suma', opSegura(b, 'add', a), sinCoeficienteEscrito]);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'multiplica', opSegura(b, 'mul', a)]);
    if (!b.isZero()) variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'invierte', opSegura(a, 'div', b)]);
  } else if (Math.abs(a.n) === 1) {
    const q = new Fr(a.d * Math.sign(a.n));
    comun.divisor = fmtNum(q);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'divide', opSegura(b, 'div', q)]);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'resta', opSegura(b, 'sub', q)]);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'suma', opSegura(b, 'add', q)]);
  } else {
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'multiplica', opSegura(b, 'mul', a)]);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'resta', opSegura(b, 'sub', a)]);
    variantes.push([TIPOS.INVERSA_EQUIVOCADA, 'suma', opSegura(b, 'add', a)]);
  }
  const conNegativos = a.isNeg() || b.isNeg();
  if (conNegativos) variantes.push([TIPOS.SIGNO_NEGATIVO, 'pierde_signo', correcto.neg()]);
  variantes.push([TIPOS.UN_SOLO_LADO, 'divide_solo_x', b]);

  for (const [tipo, variante, valor, incierto = false] of variantes) {
    if (!valor || valor.eq(correcto)) continue;
    // −2x = −4 → x = −2: con negativos, "el resultado con el signo cambiado" es perder el
    // signo (SIGNO_NEGATIVO), no "restaste el −2" (b − a coincide con −b/a por casualidad).
    if (tipo === TIPOS.INVERSA_EQUIVOCADA && conNegativos && valor.eq(correcto.neg())) continue;
    out.push({
      eq: xIgual(valor, ladoX),
      mal: { tipo, detalle: { variante, ...comun, escrito: fmtNum(valor) } },
      ops,
      fantasma,
      final: true,
      incierto,
    });
  }
  // Divide (o multiplica) solo el lado de los números: 3x = 15 -> 3x = 5
  // (el número que queda es el mismo `correcto`, b/a: no hace falta recalcularlo).
  // Con −x no aplica: "dividir entre −1 solo el número" es cambiarle el signo, y eso es el
  // desliz de cuenta más común (12 − x = 5 → −x = 7 es 5 − 12 mal hecho), no dividir un lado.
  if (!correcto.eq(b) && !a.eq(-1)) {
    const X = [{ c: a, x: true }];
    const N = [{ c: correcto, x: false }];
    out.push({
      eq: ladoX === 'L' ? { L: X, R: N } : { L: N, R: X },
      mal: { tipo: TIPOS.UN_SOLO_LADO, detalle: { variante: 'divide_solo_numero', ...comun, escrito: fmtNum(correcto) } },
      ops,
      fantasma,
      final: true,
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
      fantasma,
      final: true,
    });
  }
  return out;
}

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

/** Ejecuta fn(); si la aritmética exacta se desborda (RangeError), devuelve `siFalla`. */
function sinDesborde(fn, siFalla = null) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof RangeError) return siFalla;
    throw e;
  }
}

const tieneX = (terms) => terms.some((t) => t.x && !t.c.isZero());

/**
 * Todos los renglones que un estudiante podría escribir a partir de `eq`
 * siguiendo la estrategia escolar (pasar términos, reducir, dividir), con a lo
 * más un error típico en el camino. Cada candidato trae su error (o null).
 * Las variantes cuya aritmética no cabe en enteros seguros se omiten.
 *
 * `fantasma`: el renglón sale de pasar términos hacia el lado donde no había
 * ninguna x (3x = 15 → −15 = −3x, x + 4 = 10 → 4 − 10 = x) o, con x en los dos
 * lados, de juntar las x a contracorriente: en el lado que el camino escolar no
 * elige, donde el coeficiente queda negativo (5x + 2 = 2x + 14 → −12 = −3x). Es un
 * camino legítimo (5 + 20 = −3x), pero sus reglas de error citan términos que el
 * estudiante no movió y coeficientes que no existen ("el −3 que multiplica a la
 * x"); clasificar() solo lo acepta si el estudiante escribió el renglón tal cual.
 * `final`: error del último paso (dividir); ver divisiones().
 * `literal`: la regla describe términos que deben seguir a la vista (opera_un_lado:
 * "el 5 sigue en el lado izquierdo"); no explica un despeje ni una respuesta x = v.
 * `mezcla`: junta términos que no estaban del mismo lado en el renglón anterior.
 * @returns {{eq: object, mal: {tipo: string, detalle: object}|null, ops: number, fantasma: boolean, final: boolean, literal?: boolean, mezcla?: boolean, cuenta?: string}[]}
 */
export function candidatos(eq) {
  const out = [];
  const inicios = [{ eq, mal: null, ops: 0 }, ...sinDesborde(() => fusiones(eq), []).map((f) => ({ ...f, ops: 1 }))];
  for (const ini of inicios) {
    const xEnLosDos = tieneX(ini.eq.L) && tieneX(ini.eq.R);
    const ladoEscolar = xEnLosDos ? sinDesborde(() => elegirLadoX(ini.eq), 'L') : null;
    for (const ladoX of ['L', 'R']) {
      const haciaVacio = !tieneX(ini.eq[ladoX]) && tieneX(ini.eq[otroLado(ladoX)]);
      const contracorriente = xEnLosDos && ladoX !== ladoEscolar;
      const W = fueraDeLugar(ini.eq, ladoX);
      if (!ini.mal) {
        // Hacer la operación de un solo lado y dejar el término donde estaba (3x + 5 = 20 − 5):
        // una operación por renglón, como en la balanza, así que solo con un término.
        for (const w of W) {
          const Q = sinDesborde(() => transponer(ini.eq, [{ ...w, modo: 'opera_un_lado' }]));
          if (Q) out.push({ eq: Q, mal: malDeTransposicion('opera_un_lado', w), ops: 1, fantasma: haciaVacio, final: false, literal: true });
        }
      }
      for (const mask of mascaras(W.length)) {
        if (mask === 0 && ladoX === 'R') continue; // ya se generó con ladoX = L
        const T = W.filter((_, k) => mask & (1 << k));
        const fantasma = T.length > 0 && (haciaVacio || (contracorriente && T.some((w) => w.t.x)));
        const variantes = [{ ops: T.map((w) => ({ ...w, modo: 'correcto' })), mal: ini.mal }];
        if (!ini.mal) {
          T.forEach((w, k) => {
            for (const modo of MODOS_MAL) {
              // Dividir o multiplicar entre 1 no se distingue de quitarlo de un lado.
              if (modo.startsWith('inversa') && (w.t.x || w.t.c.abs().eq(1))) continue;
              variantes.push({
                ops: T.map((v, j) => ({ ...v, modo: j === k ? modo : 'correcto' })),
                mal: malDeTransposicion(modo, w),
              });
            }
          });
          // El mismo error en todos los términos que pasa (un error sistemático,
          // como 5x + 2 = 2x + 14 → 5x + 2x = 14 + 2).
          if (T.length >= 2) {
            for (const modo of ['sin_cambio_signo', 'solo_un_lado']) {
              variantes.push({ ops: T.map((v) => ({ ...v, modo })), mal: malDeVarios(modo, T) });
            }
          }
        }
        for (const v of variantes) {
          try {
            const Q = transponer(ini.eq, v.ops);
            if (!Q) continue;
            const base = { eq: Q, mal: v.mal, ops: ini.ops + T.length, fantasma, final: false };
            out.push(base, ...divisiones(base));
            if (!base.mal) {
              // Después de pasar términos, solo tiene sentido juntar del lado de las x.
              for (const f of fusiones(Q, [ladoX])) {
                const fb = { eq: f.eq, mal: f.mal, ops: base.ops + 1, fantasma, final: false, mezcla: T.length > 0 };
                out.push(fb, ...divisiones(fb));
              }
            }
          } catch (e) {
            if (!(e instanceof RangeError)) throw e; // números enormes: se descarta solo esta variante
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

/** ¿El renglón del estudiante (vector vS) es el candidato? Uno fantasma solo vale escrito tal cual, sin voltear. */
function esElCandidato(vS, c) {
  return c.fantasma ? vS.every((x, i) => x.eq(c.vector[i])) : coinciden(vS, c.vector);
}

/** Los términos (distintos de cero) de un lado que son x, o los que son números. */
const terminosDe = (lado, esX) => lado.filter((t) => t.x === esX && !t.c.isZero());

/**
 * ¿Un error del último paso (`final`: dividir) puede explicar lo escrito? Solo si la x
 * quedó en un solo término por lado: 5x − 4x = 14 − 2 da lo mismo que x = 12, pero ahí
 * nadie dividió nada. Los números sí pueden quedar sin calcular (x = 15 − 3 es restar el 3).
 */
const xReducida = (eq) => terminosDe(eq.L, true).length <= 1 && terminosDe(eq.R, true).length <= 1;

/**
 * Un lado sin los pares de términos semejantes opuestos que el estudiante dejó escritos
 * (+5 − 5, +2x − 2x). Es la notación de la balanza («3x + 5 − 5 = 20 − 5»): ahí el 5 ya se
 * quitó de ese lado, aunque siga a la vista.
 */
function sinOpuestos(terms) {
  const resto = [];
  for (const t of terms) {
    if (t.c.isZero()) continue;
    const k = resto.findIndex((u) => u.x === t.x && u.c.eq(t.c.neg()));
    if (k >= 0) resto.splice(k, 1);
    else resto.push(t);
  }
  return resto;
}

/** El renglón del estudiante como se compara con los candidatos: sin los pares opuestos de cada lado. */
const sinParesOpuestos = (eq) => ({ L: sinOpuestos(eq.L), R: sinOpuestos(eq.R) });

/**
 * ¿El candidato explica lo escrito sin juntar términos que el estudiante dejó separados?
 * Puede haber hecho cuentas que el candidato deja pendientes (5 − 20 → −15), pero si
 * escribió −5x + 16x no juntó 2x + 14 − 5x en 11x, aunque los dos renglones den 2 = 11x.
 * Se revisa en la orientación en que coinciden los vectores (volteado solo si no es fantasma).
 * `visto` es el renglón del estudiante sin sus pares opuestos (ver sinOpuestos).
 */
function sinJuntarDeMas(visto, c, vS) {
  const cabe = (s, k) => [true, false].every((esX) => terminosDe(s, esX).length <= terminosDe(k, esX).length);
  const v = c.vector;
  if (vS.every((x, i) => x.eq(v[i])) && cabe(visto.L, c.eq.L) && cabe(visto.R, c.eq.R)) return true;
  return !c.fantasma && vS.every((x, i) => x.eq(v[(i + 2) % 4])) && cabe(visto.L, c.eq.R) && cabe(visto.R, c.eq.L);
}

/** ¿Los dos lados tienen los mismos términos, sin importar el orden? */
function mismosTerminos(a, b) {
  const resto = b.filter((t) => !t.c.isZero());
  for (const t of a) {
    if (t.c.isZero()) continue;
    const k = resto.findIndex((u) => u.x === t.x && u.c.eq(t.c));
    if (k < 0) return false;
    resto.splice(k, 1);
  }
  return resto.length === 0;
}

/**
 * ¿El estudiante escribió el renglón del candidato término a término (y no solo algo
 * con las mismas sumas)? «2 = −5x + 16x» es el candidato que junta 2x + 14 en 16x,
 * no el que junta 2x + 14 − 5x en 11x, aunque los dos den 2 = 11x.
 */
function escritoTalCual(visto, c) {
  if (mismosTerminos(visto.L, c.eq.L) && mismosTerminos(visto.R, c.eq.R)) return true;
  return !c.fantasma && mismosTerminos(visto.L, c.eq.R) && mismosTerminos(visto.R, c.eq.L);
}

/**
 * ¿El número escrito parece un desliz de cuenta del número correcto?
 * Solo se aceptan deslices plausibles; si no, el motor prefiere decir
 * "no reconozco este error" antes que inventar uno.
 *   - Por uno: 15 → 14.
 *   - Signo: 5 → −5.
 *   - Con números de 2 cifras o más: diferencia de 2 (42 → 44), un solo
 *     dígito distinto (42 → 48) o dígitos volteados (15 → 51).
 * Solo entre enteros: con fracciones no hay "desliz" reconocible.
 */
export function cercano(r, w) {
  if (r.eq(w) || !r.isInt() || !w.isInt()) return false;
  const d = Math.abs(r.n - w.n);
  if (d === 1) return true;
  if (r.n !== 0 && r.n === -w.n) return true;
  const a = String(Math.abs(r.n));
  const b = String(Math.abs(w.n));
  if (a.length < 2 && b.length < 2) return false;
  if (d === 2) return true;
  if (Math.sign(r.n) === Math.sign(w.n) && a.length === b.length) {
    let distintos = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) distintos++;
    if (distintos === 1) return true;
    if ([...a].sort().join('') === [...b].sort().join('')) return true;
  }
  return false;
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

/**
 * El único término que cambió al copiar un lado con la cuenta sin hacer
 * (20 − 5 → 21 − 5 da {antes: 20, despues: 21}), o null si cambió más de uno.
 */
function terminoCambiado(delCandidato, delEstudiante) {
  if (delCandidato.length !== delEstudiante.length) return null;
  const resto = [...delEstudiante];
  const sinPareja = [];
  for (const t of delCandidato) {
    const k = resto.findIndex((u) => u.c.eq(t.c));
    if (k >= 0) resto.splice(k, 1);
    else sinPareja.push(t);
  }
  return sinPareja.length === 1 ? { antes: sinPareja[0].c, despues: resto[0].c } : null;
}

/**
 * ¿Lo escrito es un renglón correcto con un solo número (o coeficiente) equivocado?
 * `previa` es el renglón anterior: lo que el estudiante copió de ahí tal cual no puede ser
 * un error de cuenta ni de copia.
 */
function buscarAritmetica(vS, correctos, escrita, previa) {
  for (const cand of correctos) {
    const vC = cand.vector;
    // Un candidato fantasma (−15 = −3x) no se compara volteado: citaría números que el estudiante no escribió.
    for (const orden of cand.fantasma ? [vC] : [vC, [vC[2], vC[3], vC[0], vC[1]]]) {
      const difs = [];
      for (let i = 0; i < 4; i++) if (!orden[i].eq(vS[i])) difs.push(i);
      if (difs.length !== 1) continue;
      const i = difs[0];
      const esX = i % 2 === 0;
      const lado = escrita[i < 2 ? 'L' : 'R'];
      const suyos = terminosDe(lado, esX);
      // x + 4 = 10 → 10 = 4, x/4 − 1 = 2 → x/4 = 1: un término desapareció de un lado que sigue
      // teniendo otros. No hay ningún 0 escrito que revisar ("escribiste 0" sería falso); sí
      // cuentan el 0 escrito como lado completo (0 = 5) y los términos que suman 0 (x = 1 − 1).
      if (vS[i].isZero() && !suyos.length && lado.some((t) => !t.c.isZero())) continue;
      // índice real dentro del candidato (por si estaba volteado)
      const iCand = orden === vC ? i : (i + 2) % 4;
      // El lado del renglón anterior del que sale ese lado del estudiante.
      const ladoPrevio = previa[iCand < 2 ? 'L' : 'R'];
      // 2x + 1 − 1 = 9: el 9 es el lado derecho del renglón anterior, copiado tal cual. Ahí el
      // estudiante no hizo ninguna cuenta ("9 − 1 no da 9" sería falso) ni copió mal.
      if (mismosTerminos(lado, ladoPrevio)) continue;
      const delAnterior = terminosDe(ladoPrevio, esX);
      const yaEstaba = (c) => delAnterior.some((t) => t.c.eq(c));
      let esperado = orden[i];
      let escrito = vS[i];
      let cuenta = null;
      let seguro = true;
      if (suyos.length >= 2) {
        // 3x = 21 − 5: dejó la cuenta sin hacer, así que no la hizo mal ("20 − 5 no da 16" sería
        // falso). Lo que cambió es un término al copiarlo (el 20 se volvió 21).
        const par = terminoCambiado(terminosDe(cand.eq[iCand < 2 ? 'L' : 'R'], esX), suyos);
        if (!par || !cercano(par.antes, par.despues)) continue;
        // "Ese término no sale del renglón anterior" sería falso si ahí está, del mismo lado.
        if (yaEstaba(par.despues)) continue;
        ({ antes: esperado, despues: escrito } = par);
      } else {
        cuenta = cuentaDe(cand, iCand);
        if (!cercano(orden[i], vS[i])) {
          // 3x = 20 − 5 → 3x = 20: el renglón anterior dejó una cuenta pendiente y lo único que
          // cambió es su resultado. No es un desliz cercano (quizá olvidó hacerla), pero
          // "20 − 5 no da 20" es cierto; por eso se dice, con confianza media.
          if (cand.ops !== 0 || !cuenta) continue;
          seguro = false;
        }
        if (!cuenta) {
          // 3x + 5 = 20 → 3x + 5 = 25: sin ninguna cuenta a la vista, un cambio igual al término del
          // otro lado (el 5) es pasarlo sin quitarlo, no un error al copiar.
          const otro = vS[(i + 2) % 4];
          if (!otro.isZero() && orden[i].sub(vS[i]).abs().eq(otro.abs())) continue;
          // 12 − x = 5 → −x = 12 − 5: el −x sí sale del renglón anterior (está en ese lado).
          if (suyos.length === 1 && yaEstaba(suyos[0].c)) continue;
          // 2x + 3 = 9 → x + 3 = 9: quitar el coeficiente no es un desliz al copiarlo (es
          // dividir un solo término); lo mismo da si era 2x o 7x.
          if (esX && vS[i].abs().eq(1) && !orden[i].abs().eq(1)) continue;
        }
      }
      return {
        tipo: TIPOS.ARITMETICA,
        detalle: {
          variante: cuenta ? 'cuenta' : 'copia',
          cuenta,
          esperado: fmtNum(esperado),
          escrito: fmtNum(escrito),
          esperadoValor: esperado.toString(),
          escritoValor: escrito.toString(),
          esX,
          componente: NOMBRE_COMPONENTE[i],
        },
        confianza: cand.ops >= 2 || !seguro ? 'media' : 'alta',
        ops: cand.ops,
      };
    }
  }
  return null;
}

/**
 * El candidato que mejor explica el renglón: menos pasos; a igualdad, el que coincide término
 * a término con lo escrito (`esLiteral`) y luego el de mayor prioridad.
 * `dudoso`: otra regla de OTRO tipo lo explica con los mismos pasos e igual de literal
 * (la prioridad decidió, no la evidencia), o la regla elegida es solo una posibilidad.
 */
function elegir(lista, esLiteral = () => false) {
  const lit = new Map(lista.map((c) => [c, esLiteral(c) ? 0 : 1]));
  const orden = [...lista].sort(
    (p, q) => p.ops - q.ops || lit.get(p) - lit.get(q) || PRIORIDAD.indexOf(p.mal.tipo) - PRIORIDAD.indexOf(q.mal.tipo),
  );
  const mejor = orden[0];
  const alternativas = [...new Set(orden.map((c) => c.mal.tipo))].filter((t) => t !== mejor.mal.tipo);
  const empate = orden.some((c) => c.ops === mejor.ops && lit.get(c) === lit.get(mejor) && c.mal.tipo !== mejor.mal.tipo);
  // Copia: los candidatos viven en la memoria de clasificar() y no se deben poder modificar desde fuera.
  // `dudoso`: la prioridad decidió un empate, o la regla misma es solo una posibilidad (`incierto`).
  return { tipo: mejor.mal.tipo, detalle: { ...mejor.mal.detalle }, ops: mejor.ops, alternativas, dudoso: empate || Boolean(mejor.incierto) };
}

/**
 * Candidatos de `previa` con su vector, ya separados (los correctos ordenados
 * por pasos). Se memorizan porque el mismo renglón previo se clasifica muchas
 * veces: procedimientoConError() prueba varias líneas desde el mismo renglón y
 * el grupo simulado repite los 4 ejercicios del diagnóstico (196 llamadas, 12
 * renglones distintos). Solo lectura. Las ecuaciones largas no se guardan: cada
 * candidato ocupa ~1.5 KB y una de 30 términos genera más de 4000.
 */
const MEMO_CANDIDATOS_MAX = 16;
const MEMO_CANDIDATOS_POR_ENTRADA = 250;
const memoCandidatos = new Map();

const llaveLado = (ts) => ts.map((t) => `${t.x ? 'x' : ''}${t.c.n}/${t.c.d}`).join(' ');

function candidatosClasificables(previa) {
  const llave = `${llaveLado(previa.L)}=${llaveLado(previa.R)}`;
  let memo = memoCandidatos.get(llave);
  if (memo) return memo;
  const conError = [];
  const correctos = [];
  for (const c of candidatos(previa)) {
    const v = sinDesborde(() => vector(c.eq));
    if (!v) continue;
    c.vector = v;
    (c.mal ? conError : correctos).push(c);
  }
  correctos.sort((p, q) => p.ops - q.ops);
  // Para los despejes ("x = 5") se usan solo los caminos no fantasma (ver candidatos()).
  const sinFantasma = (lista) => lista.filter((c) => !c.fantasma);
  memo = { conError, correctos, conErrorDespeje: sinFantasma(conError), correctosDespeje: sinFantasma(correctos) };
  if (conError.length + correctos.length <= MEMO_CANDIDATOS_POR_ENTRADA) {
    if (memoCandidatos.size >= MEMO_CANDIDATOS_MAX) memoCandidatos.delete(memoCandidatos.keys().next().value);
    memoCandidatos.set(llave, memo);
  }
  return memo;
}

const noClasificado = (tipos = []) => ({
  tipo: TIPOS.NO_CLASIFICADO,
  detalle: { variante: 'desconocido', posibles: tipos },
  confianza: 'baja',
  alternativas: tipos,
});

/**
 * Con más términos que esto en el renglón previo, clasificar() no busca la regla:
 * los candidatos crecen como n³ (27 términos fuera de lugar ≈ 1.5 s en un celular
 * de gama baja) y ningún ejercicio de 1.º de secundaria se ve así. Responde
 * NO_CLASIFICADO: el error sí se señala en su renglón, solo no se explica.
 */
const MAX_TERMINOS_CLASIFICAR = 16;

/**
 * Explica cómo se pasó de `previa` (correcta) a `escrita` (que cambió la solución).
 * Nunca lanza por números enormes: en ese caso responde NO_CLASIFICADO.
 * @returns {{tipo: string, detalle: object, confianza: 'alta'|'media'|'baja', alternativas: string[], ops?: number}}
 */
export function clasificar(previa, escrita) {
  if (previa.L.length + previa.R.length > MAX_TERMINOS_CLASIFICAR) return noClasificado();
  return sinDesborde(() => clasificarExacto(previa, escrita), null) ?? noClasificado();
}

/** Resultado de elegir() sin la marca interna de duda. */
function sinMarcas({ dudoso, ...elegido }) {
  return elegido;
}

/**
 * ¿Lo único que cambió respecto al renglón anterior es el valor del lado de los números (el
 * que no tiene x)? 3x = 20 − 5 → 3x = 20: ahí el estudiante hizo, mal o a medias, la cuenta
 * pendiente; no "quitó el 5 de un solo lado".
 */
function soloCambianNumeros(previa, vS) {
  const vP = vector(previa);
  const distintos = [0, 1, 2, 3].filter((i) => !vP[i].eq(vS[i]));
  if (distintos.length !== 1 || distintos[0] % 2 === 0) return false;
  const lado = previa[distintos[0] < 2 ? 'L' : 'R'];
  // Con un solo número de ese lado no había cuenta pendiente: 3x + 5 = 20 → 3x + 5 = 0 sí es
  // quitar el 20 de un lado.
  return !tieneX(lado) && terminosDe(lado, false).length >= 2;
}

function clasificarExacto(previa, escrita) {
  const vS = vector(escrita);
  const memo = candidatosClasificables(previa);
  // Un despeje ("x = 5") nunca se explica con un renglón fantasma: el estudiante no escribió −15 = −3x.
  // Tampoco un renglón donde solo cambió el lado de los números (ver soloCambianNumeros).
  const esDespeje = despeje(escrita) !== null;
  const sinFantasmas = esDespeje || soloCambianNumeros(previa, vS);
  const conError = sinFantasmas ? memo.conErrorDespeje : memo.conError;
  const correctos = sinFantasmas ? memo.correctosDespeje : memo.correctos;
  const visto = sinParesOpuestos(escrita);

  // Coincidencias exactas. Se descartan las que juntan términos que el estudiante dejó separados
  // (no explican lo que escribió, solo dan las mismas sumas). Los errores del último paso
  // (dividir) siempre dan el número ya calculado y el estudiante puede dejar la cuenta escrita
  // (x = 15 − 3 es restar el 3), así que a ellos solo se les pide que la x haya quedado reducida.
  // Las reglas `literal` hablan de un término que sigue a la vista: no explican un despeje.
  const exactos = conError.filter(
    (c) => !(c.literal && esDespeje) && esElCandidato(vS, c) && (c.final ? xReducida(visto) : sinJuntarDeMas(visto, c, vS)),
  );
  if (exactos.length) {
    // A igualdad de pasos, gana el que coincide término a término con lo escrito.
    const elegido = elegir(exactos, (c) => escritoTalCual(visto, c));
    // Una explicación que necesita 3 operaciones seguidas es posible, no segura; tampoco
    // cuando otra regla, de otro tipo, explica el renglón con los mismos pasos.
    return { ...sinMarcas(elegido), confianza: elegido.ops >= 3 || elegido.dudoso ? 'media' : 'alta' };
  }

  const arit = buscarAritmetica(vS, correctos, escrita, previa);
  if (arit) return { ...arit, alternativas: [] };

  // Nivel 2: el estudiante ya escribió "x = valor" y ese valor es el que da un
  // candidato con error (cometió el error y resolvió el resto de memoria).
  // Solo aplica a renglones despejados: en otros casos una coincidencia
  // numérica podría inventar un diagnóstico. Los errores del último paso
  // (`final`) no cuentan: "dividiste solo los números y la x se quedó igual"
  // contradice un renglón donde la x sí quedó sola; tampoco las reglas `literal`.
  let tipos = [];
  if (esDespeje) {
    const solS = resolver(escrita);
    const equivalentes = conError.filter((c) => {
      if (c.final || c.literal) return false;
      if (c.sol === undefined) c.sol = sinDesborde(() => resolver(c.eq)); // también se memoriza
      return c.sol !== null && mismaSolucion(c.sol, solS);
    });
    tipos = [...new Set(equivalentes.map((c) => c.mal.tipo))];
    if (tipos.length === 1) return { ...sinMarcas(elegir(equivalentes)), confianza: 'media' };
  }

  return noClasificado(tipos);
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
      esperadoValor: (tipo === 'x' ? izq.form.a : izq.form.b).toString(),
      escritoValor: (tipo === 'x' ? der.form.a : der.form.b).toString(),
      esX: tipo === 'x',
    },
    confianza: 'alta',
    alternativas: [],
  };
}

/**
 * ¿El renglón sin x es el anterior con la x borrada (cada lado suma sus coeficientes y sus
 * números)? Ahí no hay una cuenta que revisar: se perdió la incógnita.
 */
function sinLaX(previa, numerica) {
  return sinDesborde(() => {
    const [aL, bL, aR, bR] = vector(previa);
    const [, nL, , nR] = vector(numerica);
    const L = aL.add(bL);
    const R = aR.add(bR);
    return (nL.eq(L) && nR.eq(R)) || (nL.eq(R) && nR.eq(L));
  }, false);
}

/** ¿La parte de un renglón muestra una operación (20 − 5, 3(8.33), 15/3) y no solo un número? */
const muestraCuenta = (parte) => parte.terms.length >= 2 || /[*/()]/.test(parte.texto);

/**
 * Renglón sin x y falso, que ninguna regla explica: una cuenta mal hecha.
 * Devuelve null si no hay ninguna cuenta a la vista ("15 = 3", "1 = 2"):
 * ahí no hay qué revisar y el motor no lo inventa.
 */
function aritmeticaNumerica(info) {
  const [A, B] = [info.partes[0], info.partes[info.partes.length - 1]];
  if (!muestraCuenta(A) && !muestraCuenta(B)) return null;
  // La cuenta es el lado que muestra la operación (30 = 3(8.33) también), y si no, el de más términos.
  const peso = (p) => (muestraCuenta(p) ? 100 : 0) + p.terms.length;
  const calculo = peso(A) >= peso(B) ? A : B;
  const resultado = calculo === A ? B : A;
  return {
    tipo: TIPOS.ARITMETICA,
    detalle: {
      variante: 'cuenta',
      cuenta: bonito(calculo.texto),
      esperado: fmtNum(calculo.form.b),
      escrito: fmtNum(resultado.form.b),
      esperadoValor: calculo.form.b.toString(),
      escritoValor: resultado.form.b.toString(),
      esX: false,
    },
    confianza: 'alta',
    alternativas: [],
  };
}

/**
 * ¿`escrito` (con `decimales` cifras decimales) es `real` bien redondeado o truncado?
 * 3/7 ≈ 0.43 o 0.42 sí; 0.5 no.
 */
function aproxima(real, escrito, decimales) {
  if (!decimales || real.isInt() || real.eq(escrito)) return false;
  const paso = 10 ** -decimales;
  const r = real.toNumber();
  const e = escrito.toNumber();
  const redondeado = Math.abs(e - r) <= paso / 2 + 1e-12;
  const truncado = Math.sign(e) === Math.sign(r) && Math.abs(e) <= Math.abs(r) && Math.abs(r) < Math.abs(e) + paso;
  return redondeado || truncado;
}

/**
 * Si el estudiante escribió decimales, mostramos su número en decimales
 * ("0.5", no "1/2"): así se reconoce en la explicación.
 */
function mostrarComoDecimal(detalle, decimales) {
  if (!detalle?.escritoValor) return;
  const [n, d = '1'] = detalle.escritoValor.split('/');
  const valor = Number(n) / Number(d);
  if (!Number.isFinite(valor) || Number.isInteger(valor)) return;
  const texto = String(Number(valor.toFixed(decimales)));
  detalle.escrito = valor < 0 ? `\u2212${texto.slice(1)}` : texto;
}

function esAproximacion(sol0, info) {
  if (sol0.tipo !== 'unica' || !info.decimales) return false;
  const v = despeje(info.eq);
  return v !== null && aproxima(sol0.valor, v, info.decimales);
}

/**
 * Renglón numérico que solo es falso por un redondeo, no por una cuenta mal hecha:
 *   - "25/3 = 8.33": cada igualdad es exacta o una parte es la otra bien redondeada;
 *   - "3(8.33) = 25" después de "x ≈ 8.33": la comprobación con el valor redondeado.
 *     Cada igualdad puede diferir a lo más lo que mueve ese redondeo: la suma de los
 *     coeficientes de x del enunciado (en valor absoluto) por |8.33 − 25/3|.
 */
function cuadraConRedondeo(r, previa, eq0, sol) {
  const partes = r.partes;
  const pares = partes.slice(1).map((q, i) => [partes[i], q]);
  const redondeo = ([p, q]) => p.form.b.eq(q.form.b) || aproxima(p.form.b, q.form.b, q.decimales) || aproxima(q.form.b, p.form.b, p.decimales);
  if (pares.every(redondeo)) return true;
  if (previa.nota !== 'aproximado') return false;
  const aprox = despeje(previa.eq);
  if (aprox === null) return false;
  return sinDesborde(() => {
    const coefX = [...eq0.L, ...eq0.R].filter((t) => t.x).reduce((s, t) => s.add(t.c.abs()), Fr.ZERO);
    const tolerancia = aprox.sub(sol).abs().mul(coefX.cmp(Fr.ONE) < 0 ? Fr.ONE : coefX);
    const cerca = (u, v) => u.sub(v).abs().cmp(tolerancia) <= 0;
    const valores = partes.map((p) => p.form.b);
    return pares.every(([p, q]) => cerca(p.form.b, q.form.b)) && cerca(valores[0], valores[valores.length - 1]);
  }, false);
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
  const avance = { renglon: 1, info: [] };
  try {
    return analizarSinRed(renglones, avance);
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
    // Números enormes (p. ej. 99999999x = 1/99999999): mensaje claro, en el renglón donde ocurrió.
    return { estado: 'sin_entender', renglon: avance.renglon, mensaje: MENSAJES.grande(), renglones: avance.info };
  }
}

/** clasificar() con red: si la aritmética exacta se desborda, lo dice tal cual (no inventa). */
function clasificarSeguro(previa, escrita) {
  try {
    return clasificar(previa, escrita);
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
    return { tipo: TIPOS.NO_CLASIFICADO, detalle: { variante: 'desconocido', posibles: [] }, confianza: 'baja', alternativas: [] };
  }
}

function analizarSinRed(renglones, avance = { renglon: 1, info: [] }) {
  // Conserva el número de renglón original aunque haya renglones vacíos en medio.
  // Un texto suelto se toma como sus renglones (uno por línea); cualquier otra cosa, como nada escrito.
  const lista = Array.isArray(renglones) ? renglones : typeof renglones === 'string' ? renglones.split(/\r?\n/) : [];
  const textos = lista.map((r, idx) => ({ n: idx + 1, texto: String(r ?? '').trim() })).filter((r) => r.texto);
  if (!textos.length) return { estado: 'vacio', renglones: [] };

  const info = textos.map(({ n, texto }) => ({ n, texto, ...parsearRenglon(texto) }));
  avance.info = info;
  avance.renglon = info[0].n;
  // Se reporta el PRIMER problema en orden de lectura: un renglón ilegible más
  // abajo no debe ocultar un error que el estudiante cometió antes.
  const sinEntender = (r) => ({ estado: 'sin_entender', renglon: r.n, mensaje: r.error.mensaje, renglones: info });
  if (!info[0].ok) return sinEntender(info[0]);
  const primero = info[0];
  if (primero.tipo !== 'ecuacion') {
    return {
      estado: 'sin_entender',
      renglon: 1,
      mensaje: 'El primer renglón debe ser la ecuación, con su x.',
      renglones: info,
    };
  }
  if (primero.cadena) {
    // "3x + 5 = 20 = 25": el enunciado se contradice; no hay una ecuación que resolver.
    return { estado: 'sin_entender', renglon: primero.n, mensaje: 'Revisa la ecuación: sus igualdades no coinciden entre sí.', renglones: info };
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
    avance.renglon = r.n;
    let diag = null;
    if (!r.ok) return sinEntender(r);

    if (r.tipo === 'numerica') {
      if (r.verdadera) {
        r.valido = true;
        r.nota = 'calculo';
        continue;
      }
      if (cuadraConRedondeo(r, previa, primero.eq, sol0.valor)) {
        r.valido = true;
        r.nota = 'calculo';
        r.redondeo = true; // la cuenta está bien con el valor redondeado (3(8.33) = 25)
        continue;
      }
      // Un renglón sin x y falso: o vino de un error típico (8 = 20) o es una cuenta mal hecha
      // (si no hay ninguna operación a la vista, como "15 = 3", queda sin clasificar).
      const c = clasificarSeguro(previa.eq, r.eq);
      if (c.tipo !== TIPOS.NO_CLASIFICADO) diag = c;
      // 3x + 5 = 20 → 3 + 5 = 20: es el renglón anterior sin la x, no una cuenta mal hecha
      // ("el paso va bien, revisa la cuenta: 3 + 5 no da 20" felicitaría justo el error).
      else if (sinLaX(previa.eq, r.eq)) diag = noClasificado([TIPOS.TERMINOS_NO_SEMEJANTES]);
      else diag = aritmeticaNumerica(r) || c;
    } else if (r.cadena) {
      const solIni = resolver(r.eqInicial);
      diag = mismaSolucion(sol0, solIni) ? aritmeticaDeCadena(r.cadena[0]) : clasificarSeguro(previa.eq, r.eqInicial);
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
      diag = clasificarSeguro(previa.eq, r.eq);
    }

    r.valido = false;
    for (let j = i + 1; j < info.length; j++) info[j].despuesDelError = true;
    if (r.decimales) mostrarComoDecimal(diag.detalle, r.decimales);
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
 * el texto del renglón y la ecuación resultante. Lista vacía si no hay solución
 * única o si los números no caben en la aritmética exacta.
 */
export function pasosSolucion(eqInicial) {
  if (!Array.isArray(eqInicial?.L) || !Array.isArray(eqInicial?.R)) return []; // no es una ecuación del motor
  return sinDesborde(() => pasosExactos(eqInicial), []);
}

function pasosExactos(eqInicial) {
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
  // Un nivel que no es un número (undefined, 'x') se toma como 1: antes tronaba con FORMAS[undefined].
  const n = Math.round(Number(nivel));
  const formaId = plan[Math.min(Math.max(Number.isFinite(n) ? n : 1, 1), 3) - 1];
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

/** Un número no debe ser parte de otro: ni dígitos, ni fracción, ni decimal (5 en 15, 5/3, 5.5 o 5,5). */
const INICIO = '(?<![\\d/]|\\d[.,])';
const FIN = '(?![\\d/]|[.,]\\d)';

const PALABRAS_NUMERO = {
  0: 'cero', 1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete',
  8: 'ocho', 9: 'nueve', 10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce',
  15: 'quince', 16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve', 20: 'veinte',
};

/**
 * Normaliza texto en lenguaje natural (no ecuaciones): unifica signos y
 * espacios, pero NO convierte ":" en división ni "," en punto decimal, para
 * que "El valor de x: 5" o "prueba con 5, 6 y 7" se lean como texto. Nunca lanza.
 */
function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFKC')
    .replace(/[\p{Cf}]/gu, '')
    .replace(/[\u2212\u2010-\u2015\uFE63˗➖]/g, '-')
    .replace(/[×✕✖⋅·•∙∗]/g, '*')
    .replace(/[÷⁄∕➗]/g, '/')
    .replace(/[≈≅]/g, '=')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const escaparRegex = (v) => v.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');

/**
 * ¿El texto revela el valor de x? Detecta "x = 5", "x vale 5", "el valor de
 * x: 5", "la respuesta es 5", "x es cinco", o el número suelto cuando no
 * aparece ni en el ejercicio ni en lo que escribió el estudiante. Se usa para
 * descartar respuestas de la IA. Nunca lanza: ante la duda, devuelve true.
 */
export function revelaSolucion(texto, solucion, contexto = []) {
  let s;
  try {
    s = Fr.from(solucion);
  } catch {
    return true;
  }
  const t = normalizarTexto(texto);
  const compacto = t.replace(/\s+/g, '');
  // "en el renglón 2", "renglones 2 y 3": son números de renglón, no valores de x.
  const sinRenglones = t.replace(/rengl[oó]n(?:es)?\s+\d+(?:\s*(?:,|y|e|al|a|-)\s*\d+)*/g, 'renglón');
  const valores = [s.toString()];
  if (!s.isInt()) {
    valores.push(String(Math.round(s.toNumber() * 100) / 100), String(Math.round(s.toNumber() * 10) / 10));
  }

  for (const v of valores) {
    const esc = escaparRegex(v);
    if (new RegExp(`x[=:]${esc}${FIN}`).test(compacto)) return true;
    const frase = '(?:x\\s*(?:vale|es igual a|es|da)|valor de (?:la )?x(?:\\s*(?:es|:))?|resultado(?:\\s*es|:)|respuesta(?:\\s*es|:)|soluci[oó]n(?:\\s*es|:)|da)';
    if (new RegExp(`${frase}\\s*${esc}${FIN}`).test(t)) return true;
  }
  if (s.isInt() && Math.abs(s.n) <= 20) {
    const palabra = PALABRAS_NUMERO[Math.abs(s.n)];
    const enContexto = contexto.some((c) => new RegExp(`\\b${palabra}\\b`).test(normalizarTexto(c)));
    if (!enContexto && new RegExp(`(?:x\\s*(?:vale|es|=|:)|resultado es|respuesta es)\\s*(?:menos\\s+)?${palabra}\\b`).test(t)) return true;
  }
  // Número suelto igual a la solución que no estaba en el ejercicio ni en los renglones.
  const numerosContexto = new Set();
  for (const c of contexto) {
    let linea;
    try {
      linea = normalizar(String(c));
    } catch {
      linea = normalizarTexto(c);
    }
    for (const m of linea.matchAll(/\d+(?:[.,]\d+)?(?:\/\d+)?/g)) numerosContexto.add(m[0].replace(',', '.'));
  }
  const absTxt = s.abs().toString();
  if (!numerosContexto.has(absTxt)) {
    if (new RegExp(`${INICIO}${escaparRegex(absTxt)}${FIN}`).test(sinRenglones)) return true;
  }
  return false;
}
