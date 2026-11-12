/**
 * Regresiones del motor encontradas por los revisores independientes al cerrar la fase 1
 * (adversarial, pedagógico y de calidad) y por el barrido de cierre.
 *
 * Cada caso fija un diagnóstico que antes era falso: explicaciones que citaban términos que el
 * estudiante nunca movió (el camino "fantasma"), cuentas que no existen, empates decididos como
 * si fueran certezas o deslices de copia leídos como cuentas mal hechas.
 *
 * Al final, una propiedad sobre muchos procedimientos generados: la explicación para el alumno
 * solo cita números que se ven en su renglón o en el anterior, con tres excepciones documentadas.
 *
 * Las aserciones usan el diagnóstico del motor (tipo, variante, detalle), no la redacción de
 * textos.js, para no romperse cuando cambie el contenido. La propiedad sí lee los textos.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TIPOS,
  TIPOS_DIAGNOSTICABLES,
  PLAN_EJERCICIOS,
  analizarProcedimiento,
  bonito,
  candidatos,
  despeje,
  ecuacion,
  fmtEcuacion,
  forma,
  generarEjercicio,
  parsearRenglon,
  pasosSolucion,
  procedimientoConError,
  revelaSolucion,
} from '../js/core/engine.js';
import { explicarError } from '../js/core/textos.js';
import { createRng } from '../js/core/rng.js';
import { Fr } from '../js/core/fraction.js';

const pack = JSON.parse(readFileSync(new URL('../packs/ecuaciones-1.json', import.meta.url), 'utf8'));

/** El error del procedimiento (o null si no hay). */
const error = (...lineas) => analizarProcedimiento(lineas).error ?? null;
const tipo = (...lineas) => error(...lineas)?.tipo ?? analizarProcedimiento(lineas).estado;

describe('Camino fantasma (F1): las explicaciones no citan términos que el estudiante no movió', () => {
  test('un despeje con el valor equivocado es un error de cuenta, no "el 15 cambió de lado"', () => {
    for (const [lineas, cuenta] of [
      [['3x = 15', 'x = −5'], '15 ÷ 3'],
      [['x + 4 = 10', 'x = −6'], '10 − 4'],
      [['x − 3 = −7', 'x = 4'], '−7 + 3'],
      [['x + 1 = 2', 'x = 0'], '2 − 1'],
    ]) {
      const e = error(...lineas);
      assert.equal(e.tipo, TIPOS.ARITMETICA, lineas.join(' → '));
      assert.equal(e.detalle.cuenta, cuenta, lineas.join(' → '));
    }
  });

  test('sin una regla que lo explique con lo escrito, no se inventa una con números que no existen', () => {
    for (const lineas of [
      ['3x + 5 = 20', 'x = −12'],
      ['3x = 1', 'x = 2'],
      ['−2x + 3 = 11', '−2x = 8', 'x = −6'],
      ['3x = 15', 'x = 0'],
      ['5x + 2 = 2x + 14', '3x = 12', 'x = −4'],
    ]) {
      assert.ok([TIPOS.NO_CLASIFICADO, TIPOS.ARITMETICA].includes(tipo(...lineas)), `${lineas.join(' → ')}: ${tipo(...lineas)}`);
    }
  });

  test('2x = −10 − 1 → 2x = 11 es la cuenta −10 − 1, no "el 2x cambió de lado" (A6, también en las rutas)', () => {
    const e = error('2x = −10 − 1', '2x = 11');
    assert.equal(e.tipo, TIPOS.ARITMETICA);
    assert.equal(e.detalle.cuenta, '−10 − 1');
    const ruta = error('−4x + 12 = −8', '−4x = −8 − 12', '−4x = 20');
    assert.equal(ruta.tipo, TIPOS.ARITMETICA);
    assert.equal(ruta.renglon, 3);
  });

  test('quien sí pasa la x al otro lado sin cambiarle el signo sigue siendo SIGNO_TRANSPOSICION', () => {
    assert.equal(tipo('3x + 5 = 20', '5 + 20 = −3x'), TIPOS.SIGNO_TRANSPOSICION);
    assert.equal(tipo('x + 4 = 10', '4 − 10 = x'), TIPOS.SIGNO_TRANSPOSICION);
  });

  test('Ana y Luis no cambian', () => {
    const ana = error('3x + 5 = 20', '3x = 25', 'x = 25/3');
    assert.equal(ana.tipo, TIPOS.SIGNO_TRANSPOSICION);
    assert.equal(ana.renglon, 2);
    const luis = error('3x + 5 = 20', '3x = 15', 'x = 12');
    assert.equal(luis.tipo, TIPOS.INVERSA_EQUIVOCADA);
    assert.equal(luis.renglon, 3);
  });
});

describe('Cuentas que no existen (F2, F6), signos (F4), último paso (F5) y empates', () => {
  test('"15 = 3" o "1 = 2" no muestran ninguna cuenta: no se clasifican como ARITMETICA (F2)', () => {
    assert.equal(tipo('3x + 5 = 20', '15 = 3'), TIPOS.NO_CLASIFICADO);
    assert.equal(tipo('3x + 5 = 20', '1 = 2'), TIPOS.NO_CLASIFICADO);
  });

  test('sumar el término del otro lado sin quitarlo no es "el 20 se volvió 25" (F6)', () => {
    assert.equal(tipo('3x + 5 = 20', '3x + 5 = 25'), TIPOS.NO_CLASIFICADO);
    assert.equal(tipo('2x + 4 = 14', '2x + 4 = 18'), TIPOS.NO_CLASIFICADO);
  });

  test('−2x = −4 → x = −2 es perder el signo, igual que −3x = −6 → x = −2 (F4)', () => {
    for (const lineas of [['−2x = −4', 'x = −2'], ['−3x = −6', 'x = −2']]) {
      const e = error(...lineas);
      assert.equal(e.tipo, TIPOS.SIGNO_NEGATIVO, lineas.join(' → '));
      assert.equal(e.detalle.variante, 'pierde_signo');
    }
  });

  test('"dividiste solo los números y la x se quedó igual" no explica un renglón con la x sola (F5)', () => {
    for (const lineas of [['3x + 5 = 20', 'x = 5/3'], ['−2x + 3 = 11', 'x = 2']]) {
      const e = error(...lineas);
      assert.ok(!(e.tipo === TIPOS.UN_SOLO_LADO && e.detalle.variante === 'divide_solo_numero'), lineas.join(' → '));
    }
  });

  test('si dos reglas de distinto tipo empatan en pasos, la confianza baja a media (hallazgos 9 y 10)', () => {
    const a = error('5x + 2 = 2x + 14', '5x = 14');
    assert.equal(a.tipo, TIPOS.TERMINOS_NO_SEMEJANTES);
    assert.equal(a.confianza, 'media');
    assert.ok(a.alternativas.includes(TIPOS.UN_SOLO_LADO));
    const b = error('2x + 2 = 8', 'x = 2');
    assert.equal(b.tipo, TIPOS.INVERSA_EQUIVOCADA);
    assert.equal(b.confianza, 'media');
    assert.ok(b.alternativas.includes(TIPOS.TERMINOS_NO_SEMEJANTES));
  });
});

describe('Lectura de lo escrito (F3, F7)', () => {
  test('la comprobación con el valor redondeado es válida: 3(8.33) = 25 después de x = 8.33 (F3)', () => {
    const r = analizarProcedimiento(['3x = 25', 'x = 8.33', '3(8.33) = 25']);
    assert.equal(r.estado, 'correcto');
    assert.equal(r.renglones[2].valido, true);
  });

  test('los números mixtos se leen como en la escuela: 8 1/3 es 25/3, no 81/3 (F7)', () => {
    assert.equal(fmtEcuacion(parsearRenglon('x = 8 1/3').eq), 'x = 25/3');
    assert.equal(fmtEcuacion(parsearRenglon('x = 2 1/2').eq), 'x = 5/2');
    assert.equal(analizarProcedimiento(['3x = 25', 'x = 8 1/3']).estado, 'correcto');
    assert.equal(analizarProcedimiento(['2x = 5', 'x = 2 1/2']).estado, 'correcto');
    // Espacios dentro de un número entero no forman un número mixto.
    assert.equal(fmtEcuacion(parsearRenglon('3 x = 1 5').eq), '3x = 15');
    assert.equal(fmtEcuacion(parsearRenglon('x = 4/2').eq), 'x = 2');
  });
});

describe('Textos que ve el estudiante (revisión pedagógica A15, C4, B4)', () => {
  test('en las cuentas, un divisor negativo o fraccionario va entre paréntesis (A15)', () => {
    assert.equal(error('−2x = 8', 'x = −5').detalle.cuenta, '8 ÷ (−2)');
    assert.equal(error('−x/3 = 2', 'x = −5').detalle.cuenta, '2 · (−3)');
    assert.equal(error('2x/3 = 4', 'x = 5').detalle.cuenta, '4 ÷ (2/3)');
    // El primer número de la cuenta no lleva paréntesis aunque sea negativo.
    assert.equal(error('x/4 = −3', 'x = −11').detalle.cuenta, '−3 · 4');
  });

  test('varios términos a la vez: «la x», no «el x» (C4)', () => {
    assert.equal(error('2x + 3 = x + 7', '2x + x = 7 + 3').detalle.terminos, 'el 3 y la x');
  });

  test('«renglón 2» no delata la solución x = 2 (B4)', () => {
    assert.equal(revelaSolucion('En el renglón 2 el 3 cambió de lado.', 2, ['x + 3 = 5']), false);
    assert.equal(revelaSolucion('Revisa los renglones 2 y 3.', 2, ['x + 3 = 5']), false);
    assert.equal(revelaSolucion('Entonces x = 2', 2, ['x + 3 = 5']), true);
  });
});

describe('Rendimiento (revisión de calidad #6)', () => {
  test('con más de 16 términos no se buscan reglas: NO_CLASIFICADO al instante', () => {
    const muchos = Array.from({ length: 20 }, (_, i) => String(i + 1)).join(' + ');
    const inicio = performance.now();
    const e = error(`x + ${muchos} = 5`, 'x = 7');
    assert.ok(performance.now() - inicio < 200);
    assert.equal(e.tipo, TIPOS.NO_CLASIFICADO);
    assert.equal(e.confianza, 'baja');
  });
});

describe('Lo que el estudiante escribió, término a término (barrido de cierre)', () => {
  test('si un término desaparece no hay ningún "0" que revisar; el 0 escrito sí cuenta', () => {
    // x + 4 = 10 → 10 = 4: antes decía «el 1 se volvió 0» / «escribiste 0».
    assert.equal(tipo('x + 4 = 10', '10 = 4'), TIPOS.NO_CLASIFICADO);
    // x/4 − 1 = 2 → x/4 = 1 + 1: el desliz es el 2 que se volvió 1, no un 0.
    const e = error('x/4 − 1 = 2', 'x/4 = 1 + 1');
    assert.equal(e.tipo, TIPOS.ARITMETICA);
    assert.deepEqual([e.detalle.esperado, e.detalle.escrito], ['2', '1']);
    // x + 1 = 2 → 0 = 1: aquí sí escribió un 0 donde iba la x.
    assert.equal(error('x + 1 = 2', '0 = 1').detalle.escrito, '0');
  });

  test('una cuenta escrita sin hacer (21 − 5) es un desliz al copiar un término, no una cuenta mal hecha', () => {
    const copia = error('3x + 5 = 20', '3x = 21 − 5');
    assert.equal(copia.tipo, TIPOS.ARITMETICA);
    assert.equal(copia.detalle.variante, 'copia');
    assert.deepEqual([copia.detalle.esperado, copia.detalle.escrito], ['20', '21']);
    assert.deepEqual([error('x + 1 = 2', 'x = 1 − 1').detalle.esperado, error('x + 1 = 2', 'x = 1 − 1').detalle.escrito], ['2', '1']);
    // Si sí hizo la cuenta, el error es de la cuenta.
    const cuenta = error('3x + 5 = 20', '3x = 16');
    assert.equal(cuenta.detalle.variante, 'cuenta');
    assert.equal(cuenta.detalle.cuenta, '20 − 5');
  });

  test('la resta al revés (4 − 10 en vez de 10 − 4) no es "el paso va bien, revisa la cuenta"', () => {
    for (const lineas of [['x + 4 = 10', 'x = 4 − 10'], ['3x + 5 = 20', '3x = 5 − 20']]) {
      assert.equal(tipo(...lineas), TIPOS.NO_CLASIFICADO, lineas.join(' → '));
    }
  });

  test('un error al dividir solo explica un renglón donde la x quedó en un solo término', () => {
    // 5x − 4x = 14 − 2 da lo mismo que x = 12, pero nadie dividió nada.
    assert.notEqual(tipo('5x + 2 = 2x + 14', '5x − 4x = 14 − 2'), TIPOS.UN_SOLO_LADO);
    // Con la x sola, los números pueden quedar sin calcular.
    const soloX = error('2x + 3 = 11', '1x = 11 − 3');
    assert.equal(soloX.tipo, TIPOS.UN_SOLO_LADO);
    assert.equal(soloX.detalle.variante, 'divide_solo_x');
    const resta = error('3x = 15', 'x = 15 − 3');
    assert.equal(resta.tipo, TIPOS.INVERSA_EQUIVOCADA);
    assert.equal(resta.detalle.variante, 'resta');
  });

  test('no se explica con un término que el estudiante no escribió (16x, no 11x)', () => {
    // Las tres dan las mismas sumas (2 = 11x, 14 = 5x), pero cada una juntó algo distinto.
    assert.equal(error('5x + 2 = 2x + 14', '2 = −5x + 16x').detalle.resultado, '16x');
    assert.equal(error('5x + 2 = 2x + 14', '2 = 2x + 9x').detalle.resultado, '9x');
    const e = error('5x + 2 = 2x + 14', '−2x + 7x = 14');
    assert.equal(e.detalle.resultado, '7x');
    assert.equal(e.confianza, 'alta');
    // Hacer las cuentas que el camino deja pendientes sí está permitido: 5 − 20 → −15.
    assert.equal(tipo('3x + 5 = 20', '−15 = 3x'), TIPOS.SIGNO_TRANSPOSICION);
  });
});

describe('bonito() con el − tipográfico (U+2212) y otros guiones', () => {
  const casos = ['3x-5=20', '2(x-3)=-4', '-x/3 = 2', 'x = 8/(-2)', '3x - -5 = 2', 'x+-3=1', 'x = 3*-2', '-2x + 3 = 11'];

  test('escribe y espacia igual con − (U+2212), ‐, – , ﹣ o ➖ que con el guion del teclado', () => {
    assert.equal(bonito('3x−5=20'), '3x − 5 = 20');
    assert.equal(bonito('2(x−3)=−4'), '2(x − 3) = −4');
    for (const s of casos) {
      for (const guion of ['−', '‐', '–', '﹣', '➖']) {
        assert.equal(bonito(s.replaceAll('-', guion)), bonito(s), `${s} con U+${guion.codePointAt(0).toString(16)}`);
      }
    }
  });

  test('aplicarla dos veces no cambia nada (el paquete y las rutas ya traen −)', () => {
    for (const s of [...casos, ...casos.map((c) => c.replaceAll('-', '−')), '3x − 5 = 20', '−x = 5', 'x = 25/3']) {
      assert.equal(bonito(bonito(s)), bonito(s), s);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Propiedad: la explicación solo cita números que el estudiante ve     */
/* ------------------------------------------------------------------ */

/** Números de un texto en valor absoluto y forma canónica ("25/3", "8.33", "4"). «renglón 2» no cuenta. */
function numerosDe(texto) {
  const limpio = String(texto ?? '').replace(/rengl[oó]n(?:es)?\s+\d+(?:\s*(?:,|y|e|al|a|-)\s*\d+)*/gi, ' ');
  return [...limpio.matchAll(/(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+))?/g)].map((m) => {
    const n = m[1].replace(',', '.');
    const fraccion = m[2] && !n.includes('.');
    return { texto: m[0], valor: fraccion ? new Fr(Number(n), Number(m[2])).toString() : String(Number(n)) };
  });
}

/** Todos los números de un texto, y también numerador y denominador de cada fracción. */
function agregar(conjunto, texto) {
  for (const { valor } of numerosDe(texto)) {
    conjunto.add(valor);
    if (valor.includes('/')) for (const parte of valor.split('/')) conjunto.add(parte);
  }
  return conjunto;
}

const memoDerivables = new Map();
/** Números de cualquier renglón (no fantasma, con o sin error) que el motor deriva de `anterior`. */
function derivables(anterior) {
  if (!memoDerivables.has(anterior)) {
    const conjunto = new Set();
    for (const c of candidatos(ecuacion(anterior))) {
      if (c.fantasma) continue;
      agregar(conjunto, fmtEcuacion(c.eq));
      if (c.cuenta) agregar(conjunto, c.cuenta);
    }
    memoDerivables.set(anterior, conjunto);
  }
  return memoDerivables.get(anterior);
}

/**
 * Números que la explicación de `e` puede citar. Además de los del renglón anterior y los del
 * renglón del estudiante (y, en ARITMETICA, el resultado bien hecho de la cuenta), hay tres
 * excepciones, cada una con su razón:
 *   1. «−x quiere decir −1 veces x», «3 entre −1»: el 1 de una x sola (coeficiente implícito).
 *   2. Pasos saltados: si el estudiante escribió x = v directamente (9x + 13 = 85 → x = 10), la
 *      explicación habla de los renglones que hizo de memoria («72 ÷ 9 no da 10»). Se permiten los
 *      números de los renglones que el motor deriva del anterior, sin el camino fantasma.
 *   3. Operaciones escritas: el lector ya evaluó «4 · 4» o «10/(−2)», así que la explicación cita su
 *      valor («3 · 4 no da 16»). No señala cuál factor se copió mal, pero no inventa el número.
 */
function permitidos(e) {
  const base = agregar(agregar(new Set(), e.anterior), e.texto);
  if (e.tipo === TIPOS.ARITMETICA) agregar(base, e.detalle.esperado);
  const excepciones = [];
  if (/(^|[^\d)])x/.test(`${e.anterior} ${e.texto}`.replace(/\s+/g, ''))) excepciones.push(['x sola', new Set(['1'])]);
  const r = parsearRenglon(e.texto);
  if (r.ok && despeje(r.eq) !== null) excepciones.push(['pasos saltados', derivables(e.anterior)]);
  if (r.ok) {
    const lados = String(e.texto).split('=');
    const valores = new Set();
    for (const [k, lado] of [[0, r.eq.L], [lados.length - 1, r.eq.R]]) {
      if (/[·*×/÷(]/.test(lados[k] ?? '')) valores.add(forma(lado).b.abs().toString());
    }
    excepciones.push(['operación escrita', valores]);
  }
  return { base, excepciones };
}

/** null si no hay error; si no, la lista de números citados que nada justifica, y qué excepciones se usaron. */
function revisar(lineas) {
  const e = analizarProcedimiento(lineas).error;
  if (!e) return null;
  const texto = explicarError(e, pack, 'alumno');
  const { base, excepciones } = permitidos(e);
  const usadas = new Set();
  const ajenos = numerosDe(texto).filter(({ valor }) => {
    if (base.has(valor)) return false;
    const exc = excepciones.find(([, conjunto]) => conjunto.has(valor));
    if (exc) usadas.add(exc[0]);
    return !exc;
  });
  return { ajenos, usadas, detalle: `${lineas.join(' → ')}  ⇒ ${e.tipo}/${e.detalle.variante}: «${texto}» cita ${ajenos.map((n) => n.texto).join(', ')}` };
}

/** Cambia cada número de un renglón por ±1 (deslices de copia creíbles). */
function deslices(renglon) {
  const out = [];
  for (const m of renglon.matchAll(/\d+/g)) {
    const n = Number(m[0]);
    for (const w of [n + 1, n - 1]) {
      if (w >= 0) out.push(renglon.slice(0, m.index) + w + renglon.slice(m.index + m[0].length));
    }
  }
  return out;
}

describe('Propiedad: la explicación para el estudiante solo cita números que se ven', () => {
  test('en muchos procedimientos generados (errores típicos, respuestas x = v y deslices de copia)', () => {
    const violaciones = [];
    const usadas = new Set();
    const tipos = new Set();
    let conError = 0;
    for (let semilla = 0; semilla < 8; semilla++) {
      const rng = createRng(`regresiones-motor-${semilla}`);
      for (const plan of Object.keys(PLAN_EJERCICIOS)) {
        for (const nivel of [1, 2, 3]) {
          const ej = generarEjercicio(plan, nivel, rng);
          const procedimientos = [];
          for (const t of [...TIPOS_DIAGNOSTICABLES, TIPOS.NO_CLASIFICADO]) {
            const lineas = procedimientoConError(ej.ecuacion, t);
            if (lineas) procedimientos.push(lineas);
          }
          const pasos = pasosSolucion(ecuacion(ej.ecuacion)).map((p) => p.texto);
          for (let j = 0; j < 6; j++) {
            const v = rng.int(-25, 40);
            procedimientos.push([ej.ecuacion, `x = ${v}`]);
            if (pasos.length > 1) procedimientos.push([ej.ecuacion, ...pasos.slice(0, rng.int(1, pasos.length - 1)), `x = ${v}`]);
          }
          for (const [k, paso] of pasos.entries()) {
            for (const mal of deslices(paso)) procedimientos.push([ej.ecuacion, ...pasos.slice(0, k), mal]);
          }
          for (const lineas of procedimientos) {
            const r = revisar(lineas);
            if (!r) continue;
            conError++;
            tipos.add(analizarProcedimiento(lineas).error.tipo);
            for (const u of r.usadas) usadas.add(u);
            if (r.ajenos.length) violaciones.push(r.detalle);
          }
        }
      }
    }
    // La propiedad no se cumple en vacío: hay miles de errores de todos los tipos.
    assert.ok(conError > 3000, `solo ${conError} procedimientos con error`);
    for (const t of [...TIPOS_DIAGNOSTICABLES, TIPOS.NO_CLASIFICADO]) assert.ok(tipos.has(t), `ningún error de tipo ${t}`);
    assert.deepEqual(violaciones.slice(0, 10), [], `${violaciones.length} explicaciones citan números ajenos`);
    // Las excepciones 1 y 2 hacen falta de verdad (si dejan de usarse, se pueden quitar).
    assert.ok(usadas.has('x sola') && usadas.has('pasos saltados'), [...usadas].join(', '));
  });

  test('las tres excepciones, con el dato del motor que las explica', () => {
    // 1. El coeficiente implícito de −x es −1: «3 entre −1».
    const signo = error('−x = 3', 'x = 3');
    assert.equal(signo.tipo, TIPOS.SIGNO_NEGATIVO);
    assert.equal(signo.detalle.coefNum, '−1');
    // 2. Pasos saltados: 72 = 85 − 13 no está en ninguno de los dos renglones.
    const salto = error('9x + 13 = 85', 'x = 10');
    assert.equal(salto.detalle.cuenta, '72 ÷ 9');
    assert.ok(!agregar(agregar(new Set(), salto.anterior), salto.texto).has('72'));
    assert.ok(derivables(salto.anterior).has('72'));
    // 3. Operación escrita: 4 · 4 se compara por su valor, 16.
    const operacion = error('x/4 = 3', 'x = 4 · 4');
    assert.deepEqual([operacion.detalle.cuenta, operacion.detalle.escrito], ['3 · 4', '16']);
  });
});
