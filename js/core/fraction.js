/**
 * Aritmética racional exacta para el motor de ecuaciones.
 *
 * Usamos fracciones (numerador/denominador enteros) en lugar de números de
 * punto flotante para que 25/3 siga siendo 25/3 y no 8.333333333333334.
 * Es la única forma de comparar renglones del estudiante sin falsos errores.
 *
 * Módulo puro: sin DOM, se puede probar con `node --test`.
 */

/** Máximo común divisor (siempre positivo). */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

export class Fr {
  /**
   * @param {number} n numerador entero
   * @param {number} [d=1] denominador entero distinto de cero
   */
  constructor(n, d = 1) {
    if (!Number.isInteger(n) || !Number.isInteger(d)) {
      throw new TypeError(`Fr requiere enteros (recibió ${n}/${d})`);
    }
    if (d === 0) throw new RangeError('División entre cero');
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) {
      throw new RangeError('Número demasiado grande');
    }
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d);
    this.n = n / g + 0; // + 0 evita -0
    this.d = d / g;
    Object.freeze(this);
  }

  /** Convierte un entero, un Fr o un texto decimal ("2.5") en Fr. */
  static from(x) {
    if (x instanceof Fr) return x;
    if (typeof x === 'number') {
      if (Number.isInteger(x)) return new Fr(x, 1);
      return Fr.fromDecimalString(String(x));
    }
    if (typeof x === 'string') return Fr.fromDecimalString(x);
    throw new TypeError(`No se puede convertir ${x} en fracción`);
  }

  /** "2.25" -> 9/4 ; "-0.5" -> -1/2 ; "7" -> 7 */
  static fromDecimalString(s) {
    const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(s.trim());
    if (!m || (m[2] === '' && (m[3] === undefined || m[3] === ''))) {
      throw new SyntaxError(`Número no válido: ${s}`);
    }
    const sign = m[1] === '-' ? -1 : 1;
    const intPart = m[2] || '0';
    const decPart = m[3] || '';
    if (intPart.length + decPart.length > 15) throw new RangeError('Número demasiado grande');
    const den = 10 ** decPart.length;
    const num = Number(intPart) * den + (decPart ? Number(decPart) : 0);
    return new Fr(sign * num, den);
  }

  static get ZERO() {
    return ZERO;
  }

  static get ONE() {
    return ONE;
  }

  add(o) {
    o = Fr.from(o);
    return new Fr(this.n * o.d + o.n * this.d, this.d * o.d);
  }

  sub(o) {
    o = Fr.from(o);
    return new Fr(this.n * o.d - o.n * this.d, this.d * o.d);
  }

  mul(o) {
    o = Fr.from(o);
    return new Fr(this.n * o.n, this.d * o.d);
  }

  div(o) {
    o = Fr.from(o);
    if (o.n === 0) throw new RangeError('División entre cero');
    return new Fr(this.n * o.d, this.d * o.n);
  }

  neg() {
    return new Fr(-this.n, this.d);
  }

  abs() {
    return new Fr(Math.abs(this.n), this.d);
  }

  inv() {
    return ONE.div(this);
  }

  eq(o) {
    o = Fr.from(o);
    return this.n === o.n && this.d === o.d;
  }

  cmp(o) {
    o = Fr.from(o);
    return Math.sign(this.n * o.d - o.n * this.d);
  }

  isZero() {
    return this.n === 0;
  }

  isInt() {
    return this.d === 1;
  }

  isNeg() {
    return this.n < 0;
  }

  toNumber() {
    return this.n / this.d;
  }

  /** "25/3", "-4", "1/2" (formato ASCII, útil para pruebas y llaves). */
  toString() {
    return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`;
  }

  /**
   * Formato para mostrar en pantalla: usa el signo menos tipográfico (−),
   * que los lectores de pantalla pronuncian "menos".
   */
  toDisplay() {
    const s = this.d === 1 ? String(Math.abs(this.n)) : `${Math.abs(this.n)}/${this.d}`;
    return this.n < 0 ? `−${s}` : s;
  }
}

const ZERO = new Fr(0, 1);
const ONE = new Fr(1, 1);
