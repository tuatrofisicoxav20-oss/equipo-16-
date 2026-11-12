import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TIPOS, analizarProcedimiento, bonito, revelaSolucion, procedimientoConError } from '../js/core/engine.js';
import { pistasPara } from '../js/core/textos.js';
import { resumirDiagnostico, construirRuta } from '../js/core/ruta.js';
import { Fr } from '../js/core/fraction.js';

const pack = JSON.parse(readFileSync(new URL('../packs/ecuaciones-1.json', import.meta.url), 'utf8'));

describe('Fr: exacto o RangeError, nunca redondeado', () => {
  test('productos intermedios mayores que 2^53 no se redondean en silencio', () => {
    const r = new Fr(2 ** 52 + 1, 3).sub(new Fr(2 ** 52, 3));
    assert.equal(r.toString(), '1/3');
  });
  test('no lanza si el resultado cabe aunque el producto ingenuo no', () => {
    assert.equal(new Fr(1, 94906267).add(new Fr(1, 94906267)).toString(), '2/94906267');
  });
  test('cmp es exacto con productos fuera de rango', () => {
    assert.equal(new Fr(2 ** 53 - 1, 2 ** 53 - 2).cmp(new Fr(2 ** 53 - 2, 2 ** 53 - 3)), -1);
  });
});

describe('Números enormes no tumban el análisis', () => {
  for (const lineas of [
    ['99999999x = 1/99999999'],
    ['99999999x = 99999999', 'x = 2'],
    ['3x + 99999999 = 99999998', 'x = 2'],
    ['x/3 + 48599232 = 72355701', 'x = 72355701'],
    ['5x + 439442231 = 131758334', '5x = 571200565'],
  ]) {
    test(lineas.join(' → '), () => {
      const r = analizarProcedimiento(lineas);
      assert.ok(['error', 'sin_entender'].includes(r.estado), r.estado);
      if (r.estado === 'sin_entender') assert.match(r.mensaje, /demasiado grande/);
    });
  }
  test('pistasPara con un ejercicio mal escrito o enorme no lanza', () => {
    for (const ej of ['3x + = 2', 'x + 1 = x + 2', '99999999x = 1/99999999']) {
      assert.equal(pistasPara(ej, [], pack).pistas.length, 3, ej);
    }
  });
});

describe('Textos que ve el estudiante', () => {
  test('la cuenta de una cadena conserva los números de varias cifras', () => {
    const r = analizarProcedimiento(['4x + 23 = 67', '4x = 67 - 23 = 43']);
    assert.equal(r.error.tipo, TIPOS.ARITMETICA);
    assert.equal(r.error.detalle.cuenta, '67 − 23');
  });
  test('cuenta auxiliar sin x con números de dos cifras', () => {
    const r = analizarProcedimiento(['4x + 23 = 67', '67 - 23 = 43']);
    assert.equal(r.error.detalle.cuenta, '67 − 23');
  });
  test('bonito() no separa el signo de un número negativo', () => {
    assert.equal(bonito('3x = -5'), '3x = −5');
    assert.equal(bonito('2(x - 3) = -4'), '2(x − 3) = −4');
    assert.equal(bonito('x = 3 * -2'), 'x = 3 · −2');
  });
  test('el filtro de la IA no lanza con potencias en el texto', () => {
    assert.equal(revelaSolucion('Piensa en 2^3: ¿cuánto da?', 5, ['3x + 5 = 20']), false);
    assert.equal(revelaSolucion('Aquí no hay x², x = 5', 5, ['3x + 5 = 20']), true);
  });
});

describe('Memoria de clasificar(): resultados independientes', () => {
  test('modificar un diagnóstico no altera el siguiente', () => {
    const a = analizarProcedimiento(['3x + 5 = 20', '3x = 25']);
    a.error.detalle.termino = 'alterado';
    const b = analizarProcedimiento(['3x + 5 = 20', '3x = 25']);
    assert.notEqual(b.error.detalle.termino, 'alterado');
  });
  test('el grupo simulado sigue siendo coherente (ida y vuelta) con la memoria caliente', () => {
    for (let vuelta = 0; vuelta < 2; vuelta++) {
      for (const ej of pack.diagnostico.map((d) => d.ecuacion)) {
        const lineas = procedimientoConError(ej, TIPOS.SIGNO_TRANSPOSICION);
        assert.equal(analizarProcedimiento(lineas).error.tipo, TIPOS.SIGNO_TRANSPOSICION, ej);
      }
    }
  });
});

describe('Ruta: entradas incompletas', () => {
  test('resumirDiagnostico ignora ejercicios sin análisis', () => {
    const r = resumirDiagnostico([{ analisis: { estado: 'error', error: { tipo: TIPOS.ARITMETICA } } }, {}, undefined]);
    assert.equal(r.dominante, TIPOS.ARITMETICA);
    assert.equal(r.total, 3);
  });
  test('construirRuta acepta un Set en evitar', () => {
    const ruta = construirRuta(TIPOS.SIGNO_TRANSPOSICION, 'ana', new Set(['2x + 3 = 11']));
    assert.equal(ruta.practica.length, 3);
  });
});

describe('Desborde: se reporta en su renglón', () => {
  test('un número enorme en el renglón 4 no se reporta como renglón 1', () => {
    const r = analizarProcedimiento(['3x + 5 = 20', '3x = 15', 'x = 5', '99999999x = 1/99999999']);
    assert.equal(r.estado, 'sin_entender');
    assert.equal(r.renglon, 4);
    assert.equal(r.renglones.length, 4);
  });
  test('pistas para un ejercicio sin solución única no dicen "ya tienes la x sola"', () => {
    const { pistas } = pistasPara('x + 1 = x + 2', [], pack);
    assert.match(pistas[0], /no tiene solución/);
  });
});
