/**
 * Aritmética racional exacta para el motor de ecuaciones.
 *
 * Usamos fracciones (numerador/denominador enteros) en lugar de números de
 * punto flotante para que 25/3 siga siendo 25/3 y no 8.333333333333334.
 * Es la única forma de comparar renglones del estudiante sin falsos errores.
 *
 * Garantía: cada operación da el resultado exacto o lanza RangeError
 * ('Número demasiado grande'). Nunca devuelve un número redondeado en silencio.
 *
 * Módulo puro: sin DOM, se puede probar con `node --test`.
 */

const seguro = Number.isSafeInteger;

/** Máximo común divisor (siempre positivo). Sin desestructurar: es el ciclo más caliente del motor. */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const r = a % b;
    a = b;
    b = r;
  }
  return a || 1;
}

/** Producto exacto o RangeError (un producto mayor que 2^53 ya viene redondeado). */
function mulExacto(a, b) {
  const p = a * b;
  if (!seguro(p)) throw new RangeError('Número demasiado grande');
  return p;
}

/** an/ad + bn/bd con el mínimo común múltiplo: productos más chicos, sin redondeos. */
function sumaReducida(an, ad, bn, bd) {
  const g = gcd(ad, bd);
  const bdg = bd / g;
  return new Fr(mulExacto(an, bdg) + mulExacto(bn, ad / g), mulExacto(ad, bdg));
}

/** (an/ad)·(bn/bd) simplificando en cruz antes de multiplicar. */
function productoReducido(an, ad, bn, bd) {
  const g1 = gcd(an, bd);
  const g2 = gcd(bn, ad);
  return new Fr(mulExacto(an / g1, bn / g2), mulExacto(ad / g2, bd / g1));
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

  // Camino rápido: si los productos caben en enteros seguros (lo normal en
  // secundaria) se usan tal cual; si no, se simplifica antes de multiplicar.
  // La suma de dos enteros seguros es exacta o se sale del rango (y el
  // constructor la rechaza), así que tampoco hay redondeo silencioso.

  add(o) {
    o = Fr.from(o);
    if (this.d === o.d) return new Fr(this.n + o.n, this.d);
    const a = this.n * o.d;
    const b = o.n * this.d;
    const d = this.d * o.d;
    if (seguro(a) && seguro(b) && seguro(d)) return new Fr(a + b, d);
    return sumaReducida(this.n, this.d, o.n, o.d);
  }

  sub(o) {
    o = Fr.from(o);
    if (this.d === o.d) return new Fr(this.n - o.n, this.d);
    const a = this.n * o.d;
    const b = o.n * this.d;
    const d = this.d * o.d;
    if (seguro(a) && seguro(b) && seguro(d)) return new Fr(a - b, d);
    return sumaReducida(this.n, this.d, -o.n, o.d);
  }

  mul(o) {
    o = Fr.from(o);
    const n = this.n * o.n;
    const d = this.d * o.d;
    if (seguro(n) && seguro(d)) return new Fr(n, d);
    return productoReducido(this.n, this.d, o.n, o.d);
  }

  div(o) {
    o = Fr.from(o);
    if (o.n === 0) throw new RangeError('División entre cero');
    const n = this.n * o.d;
    const d = this.d * o.n;
    if (seguro(n) && seguro(d)) return new Fr(n, d);
    return productoReducido(this.n, this.d, o.d, o.n);
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

  /** −1, 0 o 1. Exacto aunque los productos cruzados no quepan en 2^53. */
  cmp(o) {
    o = Fr.from(o);
    const a = this.n * o.d;
    const b = o.n * this.d;
    if (seguro(a) && seguro(b)) return Math.sign(a - b);
    const dif = BigInt(this.n) * BigInt(o.d) - BigInt(o.n) * BigInt(this.d);
    return dif > 0n ? 1 : dif < 0n ? -1 : 0;
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
