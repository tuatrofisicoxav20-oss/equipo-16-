/**
 * Regresiones encontradas por los revisores independientes de la fase 1.
 * Cada prueba fija un comportamiento que antes estaba mal.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analizarProcedimiento as A, revelaSolucion, bonito, TIPOS, parsearRenglon } from '../js/core/engine.js';
import { preguntaOrientadora, pistasPara, explicarError } from '../js/core/textos.js';
import { Fr } from '../js/core/fraction.js';

const pack = JSON.parse(readFileSync(new URL('../packs/ecuaciones-1.json', import.meta.url), 'utf8'));

describe('Diagnósticos que antes eran falsos o faltaban', () => {
  test('varios términos pasan sin cambiar signo (ejercicio 3 del diagnóstico)', () => {
    for (const lineas of [
      ['5x + 2 = 2x + 14', '5x + 2x = 14 + 2', '7x = 16', 'x = 16/7'],
      ['2x + 3 = x + 7', '2x + x = 7 + 3'],
      ['2x + 3 + 4 = 15', '2x = 15 + 3 + 4'],
    ]) {
      const r = A(lineas);
      assert.equal(r.error.tipo, TIPOS.SIGNO_TRANSPOSICION, lineas.join(' → '));
      assert.equal(r.error.detalle.variante, 'varios_sin_cambio_signo');
      assert.equal(r.error.renglon, 2);
    }
  });

  test('una respuesta lejana no se atribuye a un error de cuenta', () => {
    for (const v of [1, 2, 3, 7, 8, 9]) {
      assert.equal(A(['3x = 15', `x = ${v}`]).error.tipo, TIPOS.NO_CLASIFICADO, `x = ${v}`);
    }
    for (const v of [4, 6]) assert.equal(A(['3x = 15', `x = ${v}`]).error.tipo, TIPOS.ARITMETICA, `x = ${v}`);
    assert.equal(A(['3x + 5 = 20', 'x = 0']).error.tipo, TIPOS.NO_CLASIFICADO);
  });

  test('quitar un ±1 de un lado es UN_SOLO_LADO, no "dividiste entre 1"', () => {
    for (const lineas of [['x + 1 = 5', 'x = 5'], ['3x + 1 = 10', '3x = 10'], ['3x - 1 = 8', '3x = 8']]) {
      assert.equal(A(lineas).error.tipo, TIPOS.UN_SOLO_LADO, lineas.join(' → '));
    }
  });

  test('explicaciones con varios términos no dejan huecos', () => {
    const r = A(['5x + 2 = 2x + 14', '5x + 2x = 14 + 2']);
    for (const audiencia of ['alumno', 'docente']) {
      const t = explicarError(r.error, pack, audiencia);
      assert.ok(!/[{}]/.test(t), t);
      assert.match(t, /2x/);
    }
  });
});

describe('Robustez (nunca lanzar en la interfaz)', () => {
  test('números enormes no lanzan excepción', () => {
    for (const lineas of [
      ['99999999x = 99999998', 'x = 2'],
      ['x/999999999 = 999999999', 'x = 1'],
      ['0.000000001x = 1', 'x = 5'],
      ['2x + 100000000 = 300000000', 'x = 5'],
    ]) {
      assert.doesNotThrow(() => A(lineas), lineas.join(' → '));
    }
    assert.doesNotThrow(() => pistasPara('99999999x = 99999998', ['x = 2'], pack));
  });

  test('revelaSolucion responde sí o no, aun con x²', () => {
    assert.equal(revelaSolucion('No es x², es 2x', 5, ['3x + 5 = 20']), false);
    assert.equal(revelaSolucion('hola', 5, ['x^2 = 4']), false);
  });

  test('un renglón ilegible más abajo no oculta un error anterior', () => {
    const r = A(['3x + 5 = 20', '3x = 25', 'x = ?']);
    assert.equal(r.estado, 'error');
    assert.equal(r.error.tipo, TIPOS.SIGNO_TRANSPOSICION);
  });
});

describe('Escritura y mensajes', () => {
  test('la cuenta de una cadena conserva los números completos', () => {
    assert.equal(A(['3x + 12 = 30', '3x = 30 - 12 = 17']).error.detalle.cuenta, '30 − 12');
    assert.equal(A(['3x + 25 = 40', '40 - 25 = 14']).error.detalle.cuenta, '40 − 25');
  });

  test('una aproximación al final de la cadena es correcta', () => {
    assert.equal(A(['7x = 3', 'x = 3/7 = 0.43']).estado, 'correcto');
  });

  test('si el estudiante escribió decimales, el número se muestra en decimales', () => {
    const r = A(['x + 1.25 = 2.75', 'x = 2.75 - 1.25 = 1.75']);
    assert.equal(r.error.tipo, TIPOS.ARITMETICA);
    assert.equal(r.error.detalle.escrito, '1.75');
  });

  test('la x como signo de "por" se rechaza con un mensaje claro', () => {
    const r = parsearRenglon('3 x 5 + 5 = 20');
    assert.equal(r.ok, false);
    assert.equal(r.error.codigo, 'x_numero');
  });

  test('bonito() escribe los negativos sin espacio', () => {
    assert.equal(bonito('3x = -5'), '3x = −5');
    assert.equal(bonito('x + -3 = 2'), 'x + −3 = 2');
    assert.equal(bonito('3x-5=20'), '3x − 5 = 20');
  });

  test('la tercera opción de la pregunta de cuentas es un valor real', () => {
    for (const lineas of [['3x + 2x = 10', '3x + 2x = 6x = 10'], ['3x + 5 = 20', '3x = 14'], ['3x = 15', 'x = 6']]) {
      const r = A(lineas);
      const q = preguntaOrientadora(r.error.tipo, { error: r.error, ejercicio: 1 }, pack);
      const textos = q.opciones.map((o) => o.texto);
      assert.equal(new Set(textos).size, 3, textos.join(' | '));
      assert.ok(textos.every((t) => !/0$/.test(t) || /^\d*0$/.test(t)), textos.join(' | '));
    }
  });
});

describe('Filtro de la IA: casos que se escapaban', () => {
  const casos = [
    ['El valor de x: 5', 5, ['3x + 5 = 20'], true],
    ['Prueba con 5, 6 y 7', 6, ['2x + 3 = 15'], true],
    ['x ≈ 8.33', new Fr(25, 3), ['3x = 25'], true],
    ['15 entre 3 da 5', 5, ['3x + 5 = 20', '3x = 15'], true],
    ['Resta 5 en los dos lados, ¿qué da 20 − 5?', 5, ['3x + 5 = 20', '3x = 15'], false],
  ];
  for (const [texto, solucion, contexto, esperado] of casos) {
    test(`«${texto}» → ${esperado ? 'revela' : 'no revela'}`, () => {
      assert.equal(revelaSolucion(texto, solucion, contexto), esperado);
    });
  }
});
