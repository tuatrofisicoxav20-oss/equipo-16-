/**
 * Pruebas adicionales (revisión independiente de QA).
 *
 * Cierran huecos de cobertura de engine.test.js y textos.test.js:
 * parser (casos límite y códigos de error), validación por paso, variantes de
 * las reglas que no tenían prueba, pasos de solución, generador de ejercicios,
 * fracciones exactas, generador con semilla y ruta adaptativa. Incluye
 * propiedades que se revisan sobre cientos de ejercicios generados.
 *
 * Solo fijan comportamiento correcto: lo que parece un error del motor se
 * reporta aparte y aquí no se prueba.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TIPOS,
  TIPOS_DIAGNOSTICABLES,
  PRIORIDAD,
  PLAN_EJERCICIOS,
  ParseError,
  analizarProcedimiento,
  bonito,
  candidatos,
  cercano,
  clasificar,
  despeje,
  ecuacion,
  fmtEcuacion,
  fmtLado,
  fmtNum,
  fmtTerminoConSigno,
  fmtTerminoSinSigno,
  forma,
  generarEjercicio,
  mismaSolucion,
  normalizar,
  parsearRenglon,
  pasosSolucion,
  procedimientoConError,
  resolver,
  revelaSolucion,
  siguientePaso,
} from '../js/core/engine.js';
import { Fr } from '../js/core/fraction.js';
import { createRng, hashString } from '../js/core/rng.js';
import { ACTIVIDADES, construirRuta, otraComprobacion, resumirDiagnostico } from '../js/core/ruta.js';
import {
  datosError,
  explicarError,
  nombreError,
  pistasPara,
  preguntaOrientadora,
  rellenar,
  sugerenciaLlamada,
} from '../js/core/textos.js';
import { GUIONES } from '../js/data/guiones.js';

const pack = JSON.parse(readFileSync(new URL('../packs/ecuaciones-1.json', import.meta.url), 'utf8'));

/* ------------------------------------------------------------------ */
/* Utilidades de las pruebas                                           */
/* ------------------------------------------------------------------ */

const diag = (...lineas) => analizarProcedimiento(lineas);

/** Solución de un renglón como texto ("5", "25/3", "ninguna", "todas"). */
const sol = (texto) => {
  const r = parsearRenglon(texto);
  assert.ok(r.ok, `no parsea: ${texto} (${r.error?.mensaje})`);
  const s = resolver(r.eq);
  return s.tipo === 'unica' ? s.valor.toString() : s.tipo;
};

const mcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};

/** Forma reducida: denominador positivo, sin factores comunes y sin −0. */
const normalizada = (f) => f.d > 0 && mcd(f.n, f.d) === 1 && !Object.is(f.n, -0);

const sinHuecos = (t) => assert.ok(!/[{}]/.test(t) && !/undefined|null|NaN/.test(t), `texto con huecos: «${t}»`);

/** Fracción aleatoria pequeña (a veces entera, a veces negativa). */
const fraccion = (rng) => (rng.chance(0.5) ? new Fr(rng.int(-30, 30)) : new Fr(rng.int(-30, 30), rng.int(1, 12)));

/** Oráculo independiente: número (1-based) del primer renglón que deja de conservar la solución. */
const primerRenglonQueCambia = (lineas) => {
  const s0 = resolver(ecuacion(lineas[0]));
  for (let i = 1; i < lineas.length; i++) {
    const r = parsearRenglon(lineas[i]);
    if (!r.ok) return null;
    if (r.tipo === 'numerica' ? !r.verdadera : !mismaSolucion(resolver(r.eq), s0)) return i + 1;
  }
  return null;
};

/** Todos los ejercicios generados de un tipo y nivel, con semilla fija. */
const generados = (tipo, nivel, n, semilla = 'extra') => {
  const rng = createRng(`${semilla}-${tipo}-${nivel}`);
  return Array.from({ length: n }, () => generarEjercicio(tipo, nivel, rng));
};

/* ------------------------------------------------------------------ */
/* Casos del pitch                                                     */
/* ------------------------------------------------------------------ */

describe('Casos del pitch (detalle completo)', () => {
  test('Ana: el error queda en el renglón 2, con el término, el lado y los renglones marcados', () => {
    const r = diag('3x + 5 = 20', '3x = 25', 'x = 25/3');
    assert.equal(r.estado, 'error');
    assert.equal(r.solucion.toString(), '5');
    assert.equal(r.respuesta, null);
    assert.equal(r.error.renglon, 2);
    assert.equal(r.error.texto, '3x = 25');
    assert.equal(r.error.anterior, '3x + 5 = 20');
    assert.equal(r.error.tipo, TIPOS.SIGNO_TRANSPOSICION);
    assert.equal(r.error.confianza, 'alta');
    assert.deepEqual(r.error.alternativas, []);
    assert.deepEqual(
      {
        variante: r.error.detalle.variante,
        termino: r.error.detalle.termino,
        quedo: r.error.detalle.quedo,
        debioQuedar: r.error.detalle.debioQuedar,
        lado: r.error.detalle.lado,
        otroLado: r.error.detalle.otroLado,
        signoOriginal: r.error.detalle.signoOriginal,
        esX: r.error.detalle.esX,
      },
      {
        variante: 'sin_cambio_signo',
        termino: '+5',
        quedo: '+5',
        debioQuedar: '−5',
        lado: 'izquierdo',
        otroLado: 'derecho',
        signoOriginal: 'suma',
        esX: false,
      },
    );
    assert.equal(r.renglones[0].valido, true);
    assert.equal(r.renglones[1].valido, false);
    assert.equal(r.renglones[2].despuesDelError, true, 'el renglón 3 se marca como posterior al error');
  });

  test('Luis: el error queda en el renglón 3 (resta en vez de dividir) y los renglones 1 y 2 son válidos', () => {
    const r = diag('3x + 5 = 20', '3x = 15', 'x = 12');
    assert.equal(r.estado, 'error');
    assert.equal(r.error.renglon, 3);
    assert.equal(r.error.texto, 'x = 12');
    assert.equal(r.error.anterior, '3x = 15');
    assert.equal(r.error.tipo, TIPOS.INVERSA_EQUIVOCADA);
    assert.equal(r.error.confianza, 'alta');
    const { coef, coefNum, b, correcto, escrito } = r.error.detalle;
    assert.deepEqual({ coef, coefNum, b, correcto, escrito }, { coef: '3x', coefNum: '3', b: '15', correcto: '5', escrito: '12' });
    assert.deepEqual(
      r.renglones.map((x) => x.valido),
      [true, true, false],
    );
  });

  test('el diagnóstico de Ana y Luis no depende de cómo escriben (espacios, ×, ·, signo menos)', () => {
    for (const lineas of [
      ['3x+5=20', '3x=25', 'x=25/3'],
      ['3 x + 5 = 20', '3 × x = 25', 'x = 25 ÷ 3'],
      ['3*x + 5 = 20', '3·x = 25', 'x = 25/3'],
    ]) {
      const r = diag(...lineas);
      assert.equal(r.error.tipo, TIPOS.SIGNO_TRANSPOSICION, lineas.join(' → '));
      assert.equal(r.error.renglon, 2, lineas.join(' → '));
    }
    for (const lineas of [
      ['3x+5=20', '3x=15', 'x=12'],
      ['3 x + 5 = 20', '3 × x = 15', 'x = 12'],
      ['20 = 3x + 5', '15 = 3x', '12 = x'],
    ]) {
      const r = diag(...lineas);
      assert.equal(r.error.tipo, TIPOS.INVERSA_EQUIVOCADA, lineas.join(' → '));
      assert.equal(r.error.renglon, 3, lineas.join(' → '));
    }
  });

  // Complementa tests/guiones.test.js (que fija el error dominante): aquí se fija
  // lo que promete el encabezado de js/data/guiones.js, "3 de 4 con su error (uno bien)".
  test('guion completo del pitch: 3 de 4 con su error, 1 bien, y rutas distintas', () => {
    const esperado = { ana: TIPOS.SIGNO_TRANSPOSICION, luis: TIPOS.INVERSA_EQUIVOCADA };
    const rutas = {};
    for (const [id, guion] of Object.entries(GUIONES)) {
      assert.equal(guion.items.length, pack.diagnostico.length, id);
      const resultados = guion.items.map((items, i) => ({
        analisis: analizarProcedimiento([pack.diagnostico[i].ecuacion, ...items]),
      }));
      const resumen = resumirDiagnostico(resultados);
      assert.deepEqual(resumen.conteo, { [esperado[id]]: 3 }, id);
      assert.equal(resumen.correctos, 1, id);
      assert.equal(resumen.total, 4, id);
      for (const { analisis } of resultados) {
        if (analisis.estado === 'error') assert.equal(analisis.error.confianza, 'alta', id);
      }
      rutas[id] = construirRuta(resumen.dominante, id);
    }
    assert.notDeepEqual(rutas.ana.practica, rutas.luis.practica);
  });
});

/* ------------------------------------------------------------------ */
/* Parser                                                              */
/* ------------------------------------------------------------------ */

describe('Parser: escrituras adicionales que se aceptan', () => {
  const casos = [
    // signos dobles y unarios
    ['x + -3 = 5', '8'],
    ['x - -3 = 5', '2'],
    ['x+-+-3=5', '2'],
    ['3*-x = 6', '-2'],
    ['3*+x = 6', '2'],
    ['-(-x) = 4', '4'],
    ['x/-2 = 3', '-6'],
    // decimales y fracciones con signo
    ['-0.5x = 2', '-4'],
    ['.5x = 1', '2'],
    ['5.x = 10', '2'],
    ['-1/2 + x = 3', '7/2'],
    ['x = -1/2', '-1/2'],
    ['x + 1,5 = 3', '3/2'],
    ['½x = 3', '6'],
    // x en ambos lados, divisiones y paréntesis
    ['x/2 + x/3 = 5', '6'],
    ['(x)/2 = 3', '6'],
    ['x/(2/3) = 3', '2'],
    ['3(x) = 6', '2'],
    ['2·(x+1) = 8', '3'],
    ['2(3(x+1)) = 12', '1'],
    ['x = x/2 + 3', '6'],
    // otros símbolos de operación y de igualdad
    ['x:2 = 3', '6'],
    ['12 : 4 = x', '3'],
    ['x ÷ 2 = 4', '8'],
    ['x ⁄ 2 = 4', '8'],
    ['3 ✕ x = 9', '3'],
    ['x﹣1 = 2', '3'],
    ['x‐1 = 2', '3'],
    ['x == 5', '5'],
    // espacios y caracteres de ancho completo (teclados de celular)
    ['  x=5 ', '5'],
    ['３x＋５＝２０', '5'],
    // cadena con la x al final
    ['15 = 20 - 5 = 3x', '5'],
  ];
  for (const [texto, esperado] of casos) {
    test(`«${texto}» → x = ${esperado}`, () => assert.equal(sol(texto), esperado));
  }

  test('solución cero y ecuaciones sin solución única se distinguen', () => {
    assert.equal(sol('x = 0'), '0');
    assert.equal(sol('3x + 5 = 5'), '0');
    assert.equal(sol('0x = 5'), 'ninguna');
    assert.equal(sol('x - x = 0'), 'todas');
  });
});

describe('Parser: renglones que no se aceptan, con su código', () => {
  const errores = [
    ['3x* = 6', 'sintaxis'],
    ['3x = /2', 'sintaxis'],
    ['*x = 3', 'sintaxis'],
    ['2(x+ = 5', 'parentesis'],
    ['() = 2', 'parentesis'],
    ['2*) = 3', 'parentesis'],
    ['x = 3 = x', 'cadena'],
    ['x + 1 = x + 1 = 2x', 'cadena'],
    ['12345678901234567x = 1', 'grande'],
    ['1234567890123456 = x', 'grande'],
    ['99999999999x * 99999999 = 1', 'grande'],
    ['2x = 3/(1-1)', 'div_cero'],
    ['(x+1)(x+1) = 4', 'no_lineal'],
    ['x³ = 8', 'no_lineal'],
    ['x = π', 'letra'],
    ['a + 3 = 5', 'letra'],
    ['x = 3 ;', 'simbolo'],
    ['x', 'sin_igual'],
    ['=', 'lado_vacio'],
    ['==', 'lado_vacio'],
    ['   ', 'vacio'],
  ];
  for (const [texto, codigo] of errores) {
    test(`«${texto}» no se acepta (${codigo})`, () => {
      const r = parsearRenglon(texto);
      assert.equal(r.ok, false);
      assert.equal(r.error.codigo, codigo);
      sinHuecos(r.error.mensaje);
      assert.ok(r.error.mensaje.length > 10, 'el mensaje debe explicar qué hacer');
    });
  }

  test('null y undefined se tratan como renglón vacío (no truenan)', () => {
    assert.equal(parsearRenglon(null).error.codigo, 'vacio');
    assert.equal(parsearRenglon(undefined).error.codigo, 'vacio');
  });

  test('ecuacion() lanza un Error que nombra el renglón y explica el problema', () => {
    assert.throws(() => ecuacion('3x + = 20'), (e) => e instanceof Error && /3x \+ = 20/.test(e.message) && /Revisa/.test(e.message));
    assert.throws(() => ecuacion('3x + 5'), /Falta el signo =/);
  });

  test('ParseError con un código desconocido usa el mensaje genérico de sintaxis', () => {
    const e = new ParseError('codigo_inexistente', 'abc');
    assert.ok(e instanceof Error);
    assert.equal(e.codigo, 'codigo_inexistente');
    assert.match(e.message, /abc/);
  });
});

describe('Parser: normalización y forma del resultado', () => {
  test('normalizar unifica signos, operadores, coma decimal, mayúsculas y espacios', () => {
    assert.equal(normalizar('3 × X − 2 = 0,5'), '3*x-2=0.5');
    assert.equal(normalizar('12 : 4 = x'), '12/4=x');
    assert.equal(normalizar('x ÷ 2 == 4'), 'x/2=4');
    assert.equal(normalizar('２x · 3'), '2x*3');
    assert.equal(normalizar(null), '');
  });

  test('normalizar rechaza potencias antes de parsear', () => {
    for (const t of ['x^2 = 4', 'x² = 4', 'x³ = 8', 'x⁴ = 16']) {
      assert.throws(() => normalizar(t), (e) => e instanceof ParseError && e.codigo === 'no_lineal', t);
    }
  });

  test('distingue renglones con x de cuentas numéricas y dice si la cuenta es verdadera', () => {
    assert.equal(parsearRenglon('3x = 15').tipo, 'ecuacion');
    assert.deepEqual(
      [parsearRenglon('20 - 5 = 15').tipo, parsearRenglon('20 - 5 = 15').verdadera],
      ['numerica', true],
    );
    assert.equal(parsearRenglon('20 - 5 = 14').verdadera, false);
    assert.equal(parsearRenglon('1.5 = 1.50').verdadera, true);
  });

  test('cadena numérica de tres partes: verdadera solo si todas valen lo mismo', () => {
    const bien = parsearRenglon('20 - 5 = 15 = 15');
    assert.equal(bien.tipo, 'numerica');
    assert.equal(bien.verdadera, true);
    const mal = parsearRenglon('20 - 5 = 15 = 16');
    assert.equal(mal.tipo, 'numerica');
    assert.equal(mal.verdadera, false);
  });

  test('cadena con la x al final: ecuación efectiva e inicial correctas, sin errores de cadena', () => {
    const r = parsearRenglon('15 = 20 - 5 = 3x');
    assert.equal(r.cadena, null);
    assert.equal(fmtEcuacion(r.eq), '15 = 3x');
    assert.equal(fmtEcuacion(r.eqInicial), '20 − 5 = 3x');
  });

  test('cadena con una cuenta mal hecha: registra el error y la ecuación que el estudiante cree', () => {
    const r = parsearRenglon('3x = 20 - 5 = 14');
    assert.equal(r.cadena.length, 1);
    assert.equal(r.cadena[0].tipo, 'num');
    assert.equal(fmtEcuacion(r.eq), '3x = 14');
    assert.equal(fmtEcuacion(r.eqInicial), '3x = 20 − 5');
    const rx = parsearRenglon('3x + 2x = 6x = 10');
    assert.equal(rx.cadena[0].tipo, 'x');
  });

  test('cuenta los decimales escritos (para aceptar aproximaciones)', () => {
    assert.equal(parsearRenglon('x = 0.43').decimales, 2);
    assert.equal(parsearRenglon('0.5x = 1.125').decimales, 3);
    assert.equal(parsearRenglon('3x = 15').decimales, 0);
  });

  test('propiedad: fmtEcuacion y parsearRenglon son inversos (fracciones, decimales, negativos, x en ambos lados)', () => {
    const rng = createRng('ida-y-vuelta-formato');
    const vector = (eq) => {
      const L = forma(eq.L);
      const R = forma(eq.R);
      return [L.a, L.b, R.a, R.b].map(String).join(' ');
    };
    let probadas = 0;
    for (let i = 0; i < 1500; i++) {
      const lado = (n, px) =>
        Array.from({ length: n }, () => ({ c: fraccion(rng), x: rng.chance(px) })).filter((t) => !t.c.isZero());
      const eq = { L: lado(rng.int(1, 3), 0.6), R: lado(rng.int(1, 3), 0.4) };
      if (!eq.L.length || !eq.R.length) continue;
      const texto = fmtEcuacion(eq);
      const r = parsearRenglon(texto);
      assert.ok(r.ok, `no parsea su propio formato: ${texto}`);
      assert.equal(vector(r.eq), vector(eq), texto);
      assert.equal(fmtEcuacion(r.eq), texto, 'el formato es estable');
      probadas++;
    }
    assert.ok(probadas > 1000);
  });
});

/* ------------------------------------------------------------------ */
/* Validación por paso                                                 */
/* ------------------------------------------------------------------ */

describe('Validación por paso: casos límite', () => {
  test('sin renglones, null o solo espacios ⇒ vacío', () => {
    assert.equal(analizarProcedimiento([]).estado, 'vacio');
    assert.equal(analizarProcedimiento(null).estado, 'vacio');
    assert.equal(analizarProcedimiento(undefined).estado, 'vacio');
    assert.equal(analizarProcedimiento(['', '   ', null]).estado, 'vacio');
  });

  test('los renglones en blanco se ignoran', () => {
    const r = diag('3x + 5 = 20', '', '3x = 15', '   ', 'x = 5');
    assert.equal(r.estado, 'correcto');
    assert.equal(r.renglones.length, 3);
  });

  test('si el primer renglón no tiene x, lo dice (no intenta diagnosticar)', () => {
    for (const lineas of [['20 = 5', 'x = 3'], ['20 - 5 = 15', '3x = 15']]) {
      const r = diag(...lineas);
      assert.equal(r.estado, 'sin_entender');
      assert.equal(r.renglon, 1);
      assert.match(r.mensaje, /primer renglón/);
    }
  });

  test('ecuación que se cumple con cualquier x: mensaje distinto al de "sin solución"', () => {
    const todas = diag('2x + 2 = 2(x + 1)');
    const ninguna = diag('x + 1 = x + 2');
    assert.equal(todas.estado, 'sin_solucion_unica');
    assert.match(todas.mensaje, /cualquier valor/);
    assert.match(ninguna.mensaje, /no tiene solución/);
  });

  test('renglón ilegible: dice cuál es (el primero ilegible) y por qué', () => {
    const r = diag('3x + 5 = 20', '3x = 15', 'x = ?', 'x = $');
    assert.equal(r.estado, 'sin_entender');
    assert.equal(r.renglon, 3);
    assert.match(r.mensaje, /«\?»/);
  });

  test('el error se queda en el primer renglón que cambia la solución aunque luego se corrija o haya más errores', () => {
    const corrigio = diag('3x + 5 = 20', '3x = 25', '3x = 15', 'x = 5');
    assert.equal(corrigio.estado, 'error');
    assert.equal(corrigio.error.renglon, 2);
    const otroError = diag('3x + 5 = 20', '3x = 25', 'x = 25/3', 'x = 8');
    assert.equal(otroError.error.renglon, 2);
    assert.equal(otroError.error.tipo, TIPOS.SIGNO_TRANSPOSICION);
    assert.ok(otroError.renglones.slice(2).every((r) => r.despuesDelError));
  });

  test('comprobar sustituyendo (renglón numérico verdadero) no quita la respuesta', () => {
    const r = diag('3x + 5 = 20', 'x = 5', '3(5) + 5 = 20');
    assert.equal(r.estado, 'correcto');
    assert.equal(r.respuesta.toString(), '5');
    assert.equal(r.renglones[2].nota, 'calculo');
  });

  test('comprobación con una cuenta mal hecha ⇒ ARITMETICA en ese renglón', () => {
    const r = diag('3x + 5 = 20', 'x = 5', '3(5) + 5 = 21');
    assert.equal(r.estado, 'error');
    assert.equal(r.error.renglon, 3);
    assert.equal(r.error.tipo, TIPOS.ARITMETICA);
    assert.equal(r.error.detalle.esperado, '20');
    assert.equal(r.error.detalle.escrito, '21');
  });

  test('transformaciones válidas distintas a las de la escuela no se marcan como error', () => {
    for (const lineas of [
      ['3x + 5 = 20', '6x + 10 = 40', '6x = 30', 'x = 5'],
      ['3x + 5 = 20', '3x + 5 - 5 = 20 - 5', '3x = 15', 'x = 5'],
      ['3x + 5 = 20', '-3x - 5 = -20', '-3x = -15', 'x = 5'],
      ['3x + 5 = 20', '20 = 3x + 5', '15 = 3x', '5 = x'],
      ['3x + 5 = 20', 'x = 15/3'],
      ['3x + 5 = 20', '3x = 15', 'x = 5.0'],
      ['x/4 − 1 = 2', 'x − 4 = 8', 'x = 12'],
    ]) {
      const r = diag(...lineas);
      assert.equal(r.estado, 'correcto', lineas.join(' → '));
      assert.equal(r.respuesta.toString(), lineas[0].startsWith('x/4') ? '12' : '5', lineas.join(' → '));
    }
  });

  test('incompleto: no hay respuesta y propone el siguiente paso canónico', () => {
    const soloEnunciado = diag('3x + 5 = 20');
    assert.equal(soloEnunciado.estado, 'incompleto');
    assert.equal(soloEnunciado.respuesta, null);
    assert.equal(soloEnunciado.siguiente.tipo, 'transponer_constante');
    assert.equal(diag('3x + 5 = 20', '3x = 20 - 5').siguiente.tipo, 'reducir');
    assert.equal(diag('3x + 5 = 20', '20 - 5 = 15').estado, 'incompleto');
    assert.equal(diag('3x + 5 = 20', 'x = 5').siguiente, null);
  });

  test('aproximaciones: se aceptan redondeo y truncamiento con el signo correcto', () => {
    for (const lineas of [
      ['7x = 3', 'x = 0.4'],
      ['7x = 3', 'x = 0.42'],
      ['7x = -3', 'x = -0.43'],
      ['7x = -3', 'x = -0.42'],
      ['7x = 3', 'x = 3/7', 'x = 0.43'],
    ]) {
      const r = diag(...lineas);
      assert.equal(r.estado, 'correcto', lineas.join(' → '));
      assert.equal(r.renglones[r.renglones.length - 1].nota, 'aproximado', lineas.join(' → '));
    }
    for (const lineas of [
      ['7x = -3', 'x = 0.43'],
      ['7x = 3', 'x = 0.44'],
      ['7x = 3', '7x = 3.01'],
      ['3x = 15', 'x = 5.1'],
    ]) {
      assert.equal(diag(...lineas).estado, 'error', lineas.join(' → '));
    }
  });

  test('propiedad: si se altera un renglón de una solución correcta, el error es justo ese renglón', () => {
    const rng = createRng('primer-renglon');
    let probados = 0;
    for (const tipo of Object.keys(PLAN_EJERCICIOS)) {
      for (const nivel of [1, 2, 3]) {
        for (const e of generados(tipo, nivel, 6, 'altera')) {
          const pasos = pasosSolucion(ecuacion(e.ecuacion));
          const k = rng.int(0, pasos.length - 1);
          const delta = rng.pick([1, -1, 2, -3]);
          const malo = { L: pasos[k].eq.L, R: [...pasos[k].eq.R, { c: new Fr(delta), x: false }] };
          const lineas = [
            e.ecuacion,
            ...pasos.slice(0, k).map((p) => p.texto),
            fmtEcuacion(malo),
            ...pasosSolucion(malo).map((p) => p.texto),
          ];
          const r = analizarProcedimiento(lineas);
          const msg = lineas.join(' | ');
          assert.equal(r.estado, 'error', msg);
          assert.equal(r.error.renglon, k + 2, msg);
          assert.ok(r.renglones.slice(0, k + 1).every((x) => x.valido === true), msg);
          assert.ok(r.renglones.slice(k + 2).every((x) => x.despuesDelError === true), msg);
          probados++;
        }
      }
    }
    assert.ok(probados >= 100);
  });

  test('propiedad: multiplicar, sumar lo mismo en ambos lados o voltear nunca se marca como error', () => {
    const rng = createRng('transformaciones-validas');
    for (const tipo of Object.keys(PLAN_EJERCICIOS)) {
      for (const nivel of [1, 2, 3]) {
        for (const e of generados(tipo, nivel, 5, 'validas')) {
          const eq = ecuacion(e.ecuacion);
          let k = fraccion(rng);
          if (k.isZero()) k = new Fr(-2);
          const t = { c: new Fr(rng.int(1, 9)), x: rng.chance(0.5) };
          const escalar = (ts) => ts.map((x) => ({ c: x.c.mul(k), x: x.x }));
          for (const otra of [
            { L: escalar(eq.L), R: escalar(eq.R) },
            { L: [...eq.L, t], R: [...eq.R, t] },
            { L: eq.R, R: eq.L },
          ]) {
            const linea = fmtEcuacion(otra);
            const r = diag(e.ecuacion, linea);
            assert.ok(['incompleto', 'correcto'].includes(r.estado), `${e.ecuacion} → ${linea}: ${r.estado}`);
            assert.equal(r.renglones[1].valido, true, `${e.ecuacion} → ${linea}`);
          }
        }
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Reglas de error                                                     */
/* ------------------------------------------------------------------ */

describe('Reglas de error: variantes y posiciones sin prueba previa', () => {
  const casos = [
    // [renglones, tipo, renglón, variante]
    [['3x = 15', 'x = 18'], TIPOS.INVERSA_EQUIVOCADA, 2, 'suma'],
    [['3x + 5 = 20', '3x = 100'], TIPOS.INVERSA_EQUIVOCADA, 2, 'aditivo_multiplica'],
    [['2x + 3 = x + 7', '2x - x = 7/3'], TIPOS.INVERSA_EQUIVOCADA, 2, 'aditivo_divide'],
    [['x/4 = 3', 'x = -1'], TIPOS.INVERSA_EQUIVOCADA, 2, 'resta'],
    [['x/4 = 3', 'x = 7'], TIPOS.INVERSA_EQUIVOCADA, 2, 'suma'],
    [['2x/3 = 4', 'x = 8/3'], TIPOS.INVERSA_EQUIVOCADA, 2, 'multiplica'],
    [['2x/3 = 4', 'x = 10/3'], TIPOS.INVERSA_EQUIVOCADA, 2, 'resta'],
    [['2x/3 = 4', 'x = 14/3'], TIPOS.INVERSA_EQUIVOCADA, 2, 'suma'],
    [['2x/3 = 4', 'x = 4'], TIPOS.UN_SOLO_LADO, 2, 'divide_solo_x'],
    [['x/4 − 1 = 2', 'x/4 = 3', 'x = 3/4'], TIPOS.INVERSA_EQUIVOCADA, 3, 'divide'],
    [['20 = 3x + 5', '25 = 3x'], TIPOS.SIGNO_TRANSPOSICION, 2, 'sin_cambio_signo'],
    [['x/4 − 1 = 2', 'x/4 = 1'], TIPOS.SIGNO_TRANSPOSICION, 2, 'sin_cambio_signo'],
    [['−2x + 3 = 11', '−2x = 14'], TIPOS.SIGNO_TRANSPOSICION, 2, 'sin_cambio_signo'],
    [['5x + 2 = 2x + 14', '5x - 2x = 14 + 2'], TIPOS.SIGNO_TRANSPOSICION, 2, 'sin_cambio_signo'],
    [['3x - 4 = 11', '3x = 11'], TIPOS.UN_SOLO_LADO, 2, 'quita_de_un_lado'],
    [['3x + 2x = 10', '6x = 10'], TIPOS.ARITMETICA, 2, 'cuenta'],
    [['3x + 2x = 10', '3x + 2x = 6x = 10'], TIPOS.ARITMETICA, 2, 'cadena'],
    [['3x + 5 = 20', '14 = 3x'], TIPOS.ARITMETICA, 2, 'cuenta'],
    [['3x + 5 = 20', '14 = 20 - 5'], TIPOS.ARITMETICA, 2, 'cuenta'],
    [['3x + 5 = 20', '20 - 5 = 15 = 16'], TIPOS.ARITMETICA, 2, 'cuenta'],
    [['3x + 5 = 20', 'x = 5', 'x = 6'], TIPOS.ARITMETICA, 3, 'copia'],
    [['-3x = -12', 'x = -4'], TIPOS.SIGNO_NEGATIVO, 2, 'pierde_signo'],
    [['-3x = -12', '3x = -12'], TIPOS.SIGNO_NEGATIVO, 2, 'quita_signo_coef'],
    [['-x/2 = 3', 'x = 6'], TIPOS.SIGNO_NEGATIVO, 2, 'pierde_signo'],
    [['x/2 = -3', 'x = 6'], TIPOS.SIGNO_NEGATIVO, 2, 'pierde_signo'],
    [['3x + 5 = 20', '-3x = -15', 'x = -5'], TIPOS.SIGNO_NEGATIVO, 3, 'pierde_signo'],
    [['x + 1 + 2 + 3 + 4 + 5 = 20', 'x = 20 - 1 - 2 - 3 - 4 + 5'], TIPOS.SIGNO_TRANSPOSICION, 2, 'sin_cambio_signo'],
  ];
  for (const [lineas, tipo, renglon, variante] of casos) {
    test(`${lineas.join(' → ')}  ⇒  ${tipo} (${variante})`, () => {
      const r = diag(...lineas);
      assert.equal(r.estado, 'error');
      assert.equal(r.error.tipo, tipo);
      assert.equal(r.error.renglon, renglon);
      assert.equal(r.error.detalle.variante, variante);
    });
  }

  test('SIGNO_TRANSPOSICION con la x a la derecha: el término estaba del lado derecho', () => {
    const d = diag('20 = 3x + 5', '25 = 3x').error.detalle;
    assert.equal(d.lado, 'derecho');
    assert.equal(d.otroLado, 'izquierdo');
    assert.equal(d.debioQuedar, '−5');
  });

  test('UN_SOLO_LADO dice qué operación faltó del otro lado', () => {
    assert.equal(diag('3x - 4 = 11', '3x = 11').error.detalle.operacion, 'sumar 4');
    assert.equal(diag('3x + 5 = 20', '3x = 20').error.detalle.operacion, 'restar 5');
  });

  test('TERMINOS_NO_SEMEJANTES describe qué se juntó y qué quedó', () => {
    const d = diag('3x + 5 = 20', '8x = 20').error.detalle;
    assert.equal(d.lado, 'izquierdo');
    assert.equal(d.ladoCompleto, '3x + 5');
    assert.equal(d.resultado, '8x');
  });

  test('INVERSA con coeficiente fraccionario guarda el divisor', () => {
    const d = diag('x/4 = 3', 'x = 3/4').error.detalle;
    assert.equal(d.coefNum, '1/4');
    assert.equal(d.divisor, '4');
    assert.equal(d.correcto, '12');
  });

  test('ARITMETICA: dice qué cuenta revisar, qué esperaba y qué componente cambió', () => {
    const conX = diag('3x + 2x = 10', '6x = 10').error;
    assert.deepEqual(
      { cuenta: conX.detalle.cuenta, esperado: conX.detalle.esperado, escrito: conX.detalle.escrito, esX: conX.detalle.esX, componente: conX.detalle.componente },
      { cuenta: '3 + 2', esperado: '5', escrito: '6', esX: true, componente: 'xIzq' },
    );
    const volteado = diag('3x + 5 = 20', '14 = 3x').error.detalle;
    assert.equal(volteado.cuenta, '20 − 5');
    assert.equal(volteado.componente, 'numIzq');
    const cadenaX = diag('3x + 2x = 10', '3x + 2x = 6x = 10').error.detalle;
    assert.deepEqual([cadenaX.esperado, cadenaX.escrito, cadenaX.esX], ['5x', '6x', true]);
    const numerica = diag('3x + 5 = 20', '14 = 20 - 5').error.detalle;
    assert.deepEqual([numerica.cuenta, numerica.esperado, numerica.escrito], ['20 − 5', '15', '14']);
  });

  test('ARITMETICA tras saltarse pasos baja la confianza a "media"', () => {
    const directo = diag('3x = 15', 'x = 6').error;
    const saltando = diag('3x + 5 = 20', 'x = 6').error;
    assert.equal(directo.tipo, TIPOS.ARITMETICA);
    assert.equal(directo.confianza, 'alta');
    assert.equal(saltando.tipo, TIPOS.ARITMETICA);
    assert.equal(saltando.confianza, 'media');
  });

  test('cuando dos reglas explican el renglón, gana la de mayor prioridad y la otra queda como alternativa', () => {
    // Antes se probaba con x/2 = −3 → x = 6, pero ahí la alternativa SIGNO_TRANSPOSICION solo
    // salía del camino "fantasma" (−3 = −x/2: "el −3 cambió de lado", un término que el alumno
    // nunca movió); el motor ya no lo usa para explicar un despeje. El sustituto sugerido por la
    // revisión (−2x + 3 = 11 → x = 4) tampoco tiene alternativa sin ese camino. Este sí es un
    // empate real: −2x = 6 (el 6 no cambió de signo) y −2x = −6 → x = −3 (se perdió el signo al
    // dividir) llegan a x = −3 con los mismos pasos; gana la prioridad y la confianza baja a media.
    const e = diag('−2x + 6 = 0', 'x = −3').error;
    assert.equal(e.tipo, TIPOS.SIGNO_TRANSPOSICION);
    assert.ok(e.alternativas.includes(TIPOS.SIGNO_NEGATIVO));
    assert.ok(!e.alternativas.includes(e.tipo));
    assert.equal(e.confianza, 'media');
    // x/2 = −3 → x = 6 sigue siendo SIGNO_NEGATIVO, ahora sin alternativas inventadas.
    assert.deepEqual(diag('x/2 = -3', 'x = 6').error.alternativas, []);
  });

  test('NO_CLASIFICADO: confianza baja, sin alternativas inventadas, con la lista de posibles', () => {
    const e = diag('3x + 5 = 20', 'x = 100').error;
    assert.equal(e.tipo, TIPOS.NO_CLASIFICADO);
    assert.equal(e.detalle.variante, 'desconocido');
    assert.ok(Array.isArray(e.detalle.posibles));
    assert.deepEqual(e.alternativas, e.detalle.posibles);
  });

  test('propiedad: una respuesta absurda nunca recibe un diagnóstico de catálogo', () => {
    for (const tipo of Object.keys(PLAN_EJERCICIOS)) {
      for (const nivel of [1, 2, 3]) {
        for (const e of generados(tipo, nivel, 4, 'absurda')) {
          const r = diag(e.ecuacion, 'x = 100003/7');
          assert.equal(r.estado, 'error', e.ecuacion);
          assert.equal(r.error.tipo, TIPOS.NO_CLASIFICADO, e.ecuacion);
          assert.equal(r.error.confianza, 'baja', e.ecuacion);
        }
      }
    }
  });

  test('clasificar() se puede usar directo y devuelve tipo, detalle, confianza y alternativas', () => {
    const c = clasificar(ecuacion('3x + 5 = 20'), ecuacion('3x = 25'));
    assert.equal(c.tipo, TIPOS.SIGNO_TRANSPOSICION);
    assert.equal(c.confianza, 'alta');
    assert.ok(Array.isArray(c.alternativas));
    assert.equal(c.detalle.variante, 'sin_cambio_signo');
  });

  test('propiedad: todo candidato sin error conserva la solución y todo error es de catálogo', () => {
    const rng = createRng('candidatos');
    for (let i = 0; i < 60; i++) {
      const eq = {
        L: [{ c: new Fr(rng.int(1, 9)), x: true }, { c: new Fr(rng.int(-9, 9) || 4), x: false }],
        R: rng.chance(0.5)
          ? [{ c: new Fr(rng.int(-20, 20) || 7), x: false }]
          : [{ c: new Fr(rng.int(-9, 9) || 1), x: true }, { c: new Fr(rng.int(-20, 20) || 7), x: false }],
      };
      const s0 = resolver(eq);
      if (s0.tipo !== 'unica') continue;
      const todos = candidatos(eq);
      assert.ok(todos.some((c) => !c.mal), fmtEcuacion(eq));
      for (const c of todos) {
        if (!c.mal) assert.ok(mismaSolucion(resolver(c.eq), s0), `${fmtEcuacion(eq)} → ${fmtEcuacion(c.eq)}`);
        else assert.ok(TIPOS_DIAGNOSTICABLES.includes(c.mal.tipo), c.mal.tipo);
      }
    }
  });

  test('con muchos términos (poda de combinaciones) sigue diagnosticando y responde rápido', () => {
    const inicio = performance.now();
    const bien = diag('x + 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 = 2x + 9', 'x = 27');
    const mal = diag('x + 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 = 2x + 9', 'x + 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 = 2x + 10');
    const ms = performance.now() - inicio;
    assert.equal(bien.estado, 'correcto');
    assert.equal(mal.estado, 'error');
    assert.equal(mal.error.tipo, TIPOS.ARITMETICA);
    assert.ok(ms < 1500, `tardó ${ms.toFixed(0)} ms`);
  });

  test('ida y vuelta: el error del procedimiento generado está en el primer renglón que cambia la solución', () => {
    let probados = 0;
    for (const tipo of [...TIPOS_DIAGNOSTICABLES, TIPOS.NO_CLASIFICADO]) {
      for (const nivel of [1, 2, 3]) {
        for (const e of generados(tipo, nivel, 6, 'primer')) {
          const lineas = procedimientoConError(e.ecuacion, tipo);
          if (!lineas) continue;
          const r = analizarProcedimiento(lineas);
          assert.equal(r.error.renglon, primerRenglonQueCambia(lineas), lineas.join(' | '));
          assert.equal(r.error.anterior, lineas[r.error.renglon - 2], lineas.join(' | '));
          probados++;
        }
      }
    }
    assert.ok(probados >= 90, `solo ${probados}`);
  });

  test('procedimientoConError devuelve null cuando el error no aplica', () => {
    assert.equal(procedimientoConError('x + 1 = x + 2', TIPOS.SIGNO_TRANSPOSICION), null);
    assert.equal(procedimientoConError('x = 5', TIPOS.ARITMETICA), null);
    assert.equal(procedimientoConError('3x + 3x = 18', TIPOS.TERMINOS_NO_SEMEJANTES), null);
    assert.equal(procedimientoConError('3x + 5 = 20', 'TIPO_QUE_NO_EXISTE'), null);
    assert.equal(procedimientoConError('x + 5 = 20', TIPOS.NO_CLASIFICADO), null);
    // Antes aquí se exigía null para procedimientoConError('x + 1 = 2', ARITMETICA): el desliz
    // x = 2 − 1 → x = 2 se diagnosticaba por el camino "fantasma" (1 − 2 = −x) como otro error
    // del catálogo. Sin ese camino es un error de cuenta legítimo y el procedimiento generado se
    // vuelve a diagnosticar como ARITMETICA.
    const chico = procedimientoConError('x + 1 = 2', TIPOS.ARITMETICA);
    assert.deepEqual(chico, ['x + 1 = 2', 'x = 2 − 1', 'x = 2']);
    assert.equal(analizarProcedimiento(chico).error.tipo, TIPOS.ARITMETICA);
  });

  test('procedimientoConError: sin división final, la inversa equivocada se comete al pasar el número', () => {
    const lineas = procedimientoConError('2x + 3 = x + 7', TIPOS.INVERSA_EQUIVOCADA);
    assert.equal(lineas[1], '2x − x = 7/3');
    const r = analizarProcedimiento(lineas);
    assert.equal(r.error.tipo, TIPOS.INVERSA_EQUIVOCADA);
    assert.equal(r.error.detalle.variante, 'aditivo_divide');
    assert.equal(r.error.renglon, 2);
  });

  test('cercano(): signo perdido, dígitos volteados y diferencias mínimas sí; fracciones lejanas no', () => {
    assert.ok(cercano(Fr.from(7), Fr.from(-7)));
    assert.ok(cercano(Fr.from(48), Fr.from(84)));
    assert.ok(cercano(Fr.from(1000), Fr.from(1001)));
    assert.ok(!cercano(new Fr(100, 3), new Fr(50, 3)));
    assert.ok(!cercano(new Fr(25, 3), new Fr(25, 3)));
  });

  test('procedimientoConError con la x a la derecha empieza con el enunciado tal como se ve', () => {
    const lineas = procedimientoConError('20 = 3x + 5', TIPOS.SIGNO_TRANSPOSICION);
    assert.equal(lineas[0], '20 = 3x + 5');
    const r = analizarProcedimiento(lineas);
    assert.equal(r.error.tipo, TIPOS.SIGNO_TRANSPOSICION);
  });
});

/* ------------------------------------------------------------------ */
/* Pasos de solución                                                   */
/* ------------------------------------------------------------------ */

describe('Pasos de solución: formato y propiedades', () => {
  const textos = (t) => pasosSolucion(ecuacion(t)).map((p) => [p.tipo, p.texto]);

  test('coeficiente negativo, fraccionario y −1 tienen su paso propio', () => {
    assert.deepEqual(textos('-x/2 = 3'), [['multiplicar', 'x = 3 · (−2)'], ['calcular', 'x = −6']]);
    assert.deepEqual(textos('x/2 = -3'), [['multiplicar', 'x = −3 · 2'], ['calcular', 'x = −6']]);
    assert.deepEqual(textos('2x/3 = 4'), [['dividir', 'x = 4/(2/3)'], ['calcular', 'x = 6']]);
    assert.deepEqual(textos('-2x = 8'), [['dividir', 'x = 8/(−2)'], ['calcular', 'x = −4']]);
    assert.deepEqual(textos('−x = 5'), [['cambiar_signo', 'x = −5']]);
  });

  test('la x se deja siempre a la izquierda, del lado con más x', () => {
    assert.deepEqual(textos('20 = 3x + 5')[0], ['transponer_constante', '3x = 20 − 5']);
    assert.deepEqual(textos('2x + 5 = 4x − 3')[0], ['transponer_constante', '4x − 2x = 5 + 3']);
    assert.deepEqual(textos('5x = 2x + 12')[0], ['transponer_x', '5x − 2x = 12']);
    assert.deepEqual(textos('x = 2 + 3'), [['reducir', 'x = 5']]);
    assert.deepEqual(textos('3x + 5 = 5').map((p) => p[1]), ['3x = 5 − 5', '3x = 0', 'x = 0/3', 'x = 0']);
  });

  test('ya resuelta o sin solución única ⇒ no hay pasos', () => {
    assert.deepEqual(pasosSolucion(ecuacion('x = 5')), []);
    assert.deepEqual(pasosSolucion(ecuacion('5 = x')), []);
    assert.deepEqual(pasosSolucion(ecuacion('x + 1 = x + 2')), []);
    assert.deepEqual(pasosSolucion(ecuacion('2x = 2x')), []);
    assert.equal(siguientePaso(ecuacion('x = 5')), null);
  });

  test('no modifica la ecuación que recibe', () => {
    const eq = ecuacion('5x + 2 = 2x + 14');
    const antes = fmtEcuacion(eq);
    pasosSolucion(eq);
    assert.equal(fmtEcuacion(eq), antes);
  });

  test('propiedad: en todo ejercicio generado los pasos son válidos, llegan a la solución declarada y tienen pista', () => {
    const conocidos = ['transponer_constante', 'transponer_x', 'reducir', 'dividir', 'multiplicar', 'cambiar_signo', 'calcular'];
    let probados = 0;
    for (const tipo of Object.keys(PLAN_EJERCICIOS)) {
      for (const nivel of [1, 2, 3]) {
        for (const e of generados(tipo, nivel, 40, 'pasos')) {
          const pasos = pasosSolucion(ecuacion(e.ecuacion));
          const lineas = [e.ecuacion, ...pasos.map((p) => p.texto)];
          const r = analizarProcedimiento(lineas);
          assert.equal(r.estado, 'correcto', lineas.join(' | '));
          assert.ok(r.renglones.every((x) => x.valido), lineas.join(' | '));
          assert.equal(r.respuesta.toString(), String(e.solucion), lineas.join(' | '));
          assert.equal(pasos[pasos.length - 1].texto, `x = ${fmtNum(e.solucion)}`);
          for (let i = 0; i < pasos.length; i++) {
            assert.ok(conocidos.includes(pasos[i].tipo), pasos[i].tipo);
            if (i > 0) assert.notEqual(pasos[i].texto, pasos[i - 1].texto, 'paso repetido');
          }
          assert.ok(pack.pistas[pasos[0].tipo], `sin pista para ${pasos[0].tipo}`);
          probados++;
        }
      }
    }
    assert.equal(probados, 7 * 3 * 40);
  });

  test('propiedad: con ecuaciones aleatorias (fracciones, decimales, x en ambos lados) los pasos también son válidos', () => {
    const rng = createRng('pasos-aleatorios');
    let probados = 0;
    for (let i = 0; i < 600; i++) {
      const lado = (n, px) =>
        Array.from({ length: n }, () => ({ c: fraccion(rng), x: rng.chance(px) })).filter((t) => !t.c.isZero());
      const eq = { L: lado(rng.int(1, 3), 0.6), R: lado(rng.int(1, 3), 0.4) };
      if (!eq.L.length || !eq.R.length) continue;
      const s0 = resolver(eq);
      if (s0.tipo !== 'unica') continue;
      const texto = fmtEcuacion(eq);
      const pasos = pasosSolucion(eq);
      const r = analizarProcedimiento([texto, ...pasos.map((p) => p.texto)]);
      assert.equal(r.estado, 'correcto', `${texto}: ${pasos.map((p) => p.texto).join(' | ')}`);
      assert.ok(r.respuesta.eq(s0.valor), texto);
      probados++;
    }
    assert.ok(probados > 300);
  });
});

/* ------------------------------------------------------------------ */
/* Generador de ejercicios                                             */
/* ------------------------------------------------------------------ */

describe('Generador de ejercicios: propiedades', () => {
  test('cada tipo y nivel usa la forma de su plan y conserva tipo y nivel', () => {
    for (const [tipo, plan] of Object.entries(PLAN_EJERCICIOS)) {
      assert.equal(plan.length, 3, tipo);
      for (const nivel of [1, 2, 3]) {
        for (const e of generados(tipo, nivel, 10, 'plan')) {
          assert.equal(e.forma, plan[nivel - 1]);
          assert.equal(e.tipo, tipo);
          assert.equal(e.nivel, nivel);
        }
      }
    }
  });

  test('hay plan para cada tipo del catálogo', () => {
    assert.deepEqual(Object.keys(PLAN_EJERCICIOS).sort(), Object.values(TIPOS).sort());
  });

  test('nivel fuera de rango se acota a 1..3 y un tipo desconocido usa el plan general', () => {
    const rng = createRng('acota');
    assert.equal(generarEjercicio(TIPOS.SIGNO_NEGATIVO, 0, rng).forma, PLAN_EJERCICIOS.SIGNO_NEGATIVO[0]);
    assert.equal(generarEjercicio(TIPOS.SIGNO_NEGATIVO, -4, rng).forma, PLAN_EJERCICIOS.SIGNO_NEGATIVO[0]);
    assert.equal(generarEjercicio(TIPOS.SIGNO_NEGATIVO, 9, rng).forma, PLAN_EJERCICIOS.SIGNO_NEGATIVO[2]);
    const raro = generarEjercicio('TIPO_QUE_NO_EXISTE', 2, rng);
    assert.equal(raro.forma, PLAN_EJERCICIOS.NO_CLASIFICADO[1]);
    assert.ok(Number.isInteger(raro.solucion));
  });

  test('texto listo para pantalla: un solo =, signo − tipográfico y bonito() no lo cambia', () => {
    for (const tipo of Object.keys(PLAN_EJERCICIOS)) {
      for (const nivel of [1, 2, 3]) {
        for (const e of generados(tipo, nivel, 30, 'texto')) {
          assert.equal(e.ecuacion.split('=').length, 2, e.ecuacion);
          assert.ok(!e.ecuacion.includes('-'), `usa guion ASCII: ${e.ecuacion}`);
          assert.equal(bonito(e.ecuacion), e.ecuacion);
        }
      }
    }
  });

  test('cada forma pone a prueba lo que promete (signos, tamaños y solución distinta de cero)', () => {
    for (const nivel of [1, 2, 3]) {
      for (const e of generados(TIPOS.SIGNO_NEGATIVO, nivel, 40, 'forma')) {
        const eq = ecuacion(e.ecuacion);
        assert.ok(forma(eq.L).a.isNeg(), `la x debe tener coeficiente negativo: ${e.ecuacion}`);
        assert.notEqual(e.solucion, 0, e.ecuacion);
      }
    }
    for (const e of generados(TIPOS.SIGNO_TRANSPOSICION, 2, 60, 'forma')) {
      const eq = ecuacion(e.ecuacion);
      assert.ok(forma(eq.L).b.isNeg(), `ax − b: ${e.ecuacion}`);
      assert.ok(forma(eq.R).b.cmp(0) > 0, `c positivo: ${e.ecuacion}`);
    }
    for (const nivel of [1, 2, 3]) {
      for (const e of generados(TIPOS.TERMINOS_NO_SEMEJANTES, nivel, 30, 'forma')) {
        const eq = ecuacion(e.ecuacion);
        assert.ok(eq.L.filter((t) => t.x).length + eq.R.filter((t) => t.x).length >= 2, `dos términos con x: ${e.ecuacion}`);
      }
    }
    for (const e of generados(TIPOS.INVERSA_EQUIVOCADA, 2, 30, 'forma')) {
      const a = forma(ecuacion(e.ecuacion).L).a;
      assert.ok(!a.isInt() && a.n === 1, `x/a: ${e.ecuacion}`);
    }
    for (const e of generados(TIPOS.ARITMETICA, 2, 30, 'forma')) {
      assert.ok(e.solucion >= 6 && forma(ecuacion(e.ecuacion).L).b.cmp(10) > 0, `nivel 2 con números grandes: ${e.ecuacion}`);
    }
  });

  test('misma semilla ⇒ misma secuencia en todos los tipos y niveles; otra semilla ⇒ otra secuencia', () => {
    for (const tipo of Object.keys(PLAN_EJERCICIOS)) {
      for (const nivel of [1, 2, 3]) {
        const a = generados(tipo, nivel, 12, 'semilla').map((e) => e.ecuacion);
        const b = generados(tipo, nivel, 12, 'semilla').map((e) => e.ecuacion);
        const c = generados(tipo, nivel, 12, 'otra-semilla').map((e) => e.ecuacion);
        assert.deepEqual(a, b, `${tipo} ${nivel}`);
        assert.notDeepEqual(a, c, `${tipo} ${nivel}`);
      }
    }
  });

  test('evitar acepta un arreglo además de un Set', () => {
    const rng = createRng('evitar-arreglo');
    const usados = [];
    for (let i = 0; i < 12; i++) {
      const e = generarEjercicio(TIPOS.SIGNO_TRANSPOSICION, 1, rng, usados);
      assert.ok(!usados.includes(e.ecuacion), e.ecuacion);
      usados.push(e.ecuacion);
    }
  });

  test('si ya se usaron todos los ejercicios posibles, igual devuelve uno válido (no se cuelga ni da null)', () => {
    const rng = createRng('agotar');
    const usados = new Set();
    for (let i = 0; i < 300 && usados.size < 18; i++) usados.add(generarEjercicio(TIPOS.SIGNO_NEGATIVO, 1, rng, usados).ecuacion);
    assert.equal(usados.size, 18, '−x = b con x de −9 a 9 sin el cero');
    const e = generarEjercicio(TIPOS.SIGNO_NEGATIVO, 1, rng, usados);
    assert.ok(e);
    assert.ok(usados.has(e.ecuacion));
    assert.equal(sol(e.ecuacion), String(e.solucion));
  });

  test('propiedad: cada tipo admite su error en los niveles pensados para él', () => {
    const noAplica = new Set(['TERMINOS_NO_SEMEJANTES:1', 'NO_CLASIFICADO:3']);
    for (const tipo of Object.keys(PLAN_EJERCICIOS)) {
      for (const nivel of [1, 2, 3]) {
        if (noAplica.has(`${tipo}:${nivel}`)) continue;
        for (const e of generados(tipo, nivel, 12, 'admite')) {
          const lineas = procedimientoConError(e.ecuacion, tipo);
          assert.ok(lineas, `${tipo} nivel ${nivel} no admite el error en ${e.ecuacion}`);
          const r = analizarProcedimiento(lineas);
          assert.equal(r.error.tipo, tipo, lineas.join(' | '));
        }
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Fracciones exactas                                                  */
/* ------------------------------------------------------------------ */

describe('Fracciones (Fr)', () => {
  test('propiedad: siempre queda normalizada (denominador positivo, sin factor común, sin −0)', () => {
    const rng = createRng('fr-normaliza');
    for (let i = 0; i < 3000; i++) {
      const n = rng.int(-500, 500);
      let d = rng.int(-500, 500);
      if (d === 0) d = 7;
      const f = new Fr(n, d);
      assert.ok(normalizada(f), `${n}/${d} → ${f.n}/${f.d}`);
      assert.ok(f.n * d === n * f.d, `${n}/${d} cambió de valor`);
    }
    assert.ok(!Object.is(new Fr(0, -5).n, -0));
    assert.deepEqual([new Fr(0, -5).n, new Fr(0, -5).d], [0, 1]);
    assert.deepEqual([new Fr(3, -6).n, new Fr(3, -6).d], [-1, 2]);
    assert.ok(new Fr(-3, -6).eq(new Fr(1, 2)));
    assert.ok(!Object.is(Fr.from(-0).n, -0));
  });

  test('propiedad: los resultados de las operaciones también quedan normalizados y son exactos', () => {
    const rng = createRng('fr-operaciones');
    for (let i = 0; i < 1500; i++) {
      const a = fraccion(rng);
      const b = fraccion(rng);
      const c = fraccion(rng);
      for (const r of [a.add(b), a.sub(b), a.mul(b), a.neg(), a.abs()]) assert.ok(normalizada(r));
      assert.ok(a.add(b).eq(b.add(a)), 'suma conmutativa');
      assert.ok(a.mul(b).eq(b.mul(a)), 'producto conmutativo');
      assert.ok(a.add(b).sub(b).eq(a), 'restar deshace sumar');
      assert.ok(a.mul(b.add(c)).eq(a.mul(b).add(a.mul(c))), 'distributiva');
      assert.ok(a.neg().neg().eq(a));
      assert.ok(a.sub(a).isZero());
      if (!b.isZero()) {
        assert.ok(normalizada(a.div(b)));
        assert.ok(a.mul(b).div(b).eq(a), 'dividir deshace multiplicar');
        assert.ok(b.inv().inv().eq(b));
        assert.ok(b.mul(b.inv()).eq(Fr.ONE));
      }
      assert.equal(a.cmp(b), Math.sign(a.toNumber() - b.toNumber()) || 0);
      assert.equal(a.cmp(b), -b.cmp(a) || 0);
    }
  });

  test('aritmética exacta donde el punto flotante falla', () => {
    assert.ok(Fr.from('0.1').add('0.2').eq('0.3'));
    assert.ok(new Fr(1, 3).mul(3).eq(1));
    assert.equal(new Fr(25, 3).toString(), '25/3');
  });

  test('Fr.from acepta enteros, decimales, textos y otro Fr', () => {
    const casos = [
      [7, '7'],
      [0.25, '1/4'],
      [-2.5, '-5/2'],
      ['2.25', '9/4'],
      ['-0.5', '-1/2'],
      ['.5', '1/2'],
      ['5.', '5'],
      ['+3', '3'],
      [' 7 ', '7'],
      ['007', '7'],
    ];
    for (const [entrada, esperado] of casos) assert.equal(Fr.from(entrada).toString(), esperado, String(entrada));
    const f = new Fr(2, 3);
    assert.equal(Fr.from(f), f);
  });

  test('entradas inválidas lanzan el error adecuado', () => {
    assert.throws(() => new Fr(1.5), TypeError);
    assert.throws(() => new Fr(1, 0.5), TypeError);
    assert.throws(() => new Fr(1, 0), RangeError);
    assert.throws(() => new Fr(2 ** 53, 1), RangeError);
    assert.throws(() => new Fr(1, 2 ** 53), RangeError);
    assert.throws(() => Fr.from(null), TypeError);
    assert.throws(() => Fr.from({}), TypeError);
    for (const t of ['', '.', 'abc', '1e5', '1.2.3', '--1', '1/2']) assert.throws(() => Fr.fromDecimalString(t), SyntaxError, t);
    assert.throws(() => Fr.fromDecimalString('1234567890123456'), RangeError);
    assert.throws(() => Fr.from(3).div(0), RangeError);
    assert.throws(() => Fr.ZERO.inv(), RangeError);
  });

  test('formato: ASCII para pruebas y signo − tipográfico para pantalla', () => {
    assert.equal(new Fr(-4).toString(), '-4');
    assert.equal(new Fr(-4).toDisplay(), '−4');
    assert.equal(new Fr(-1, 2).toDisplay(), '−1/2');
    assert.equal(new Fr(25, 3).toDisplay(), '25/3');
    assert.equal(Fr.ZERO.toDisplay(), '0');
    assert.equal(new Fr(-7, 2).toNumber(), -3.5);
  });

  test('predicados y constantes', () => {
    assert.ok(Fr.ZERO.isZero() && Fr.ZERO.isInt() && !Fr.ZERO.isNeg());
    assert.ok(Fr.ONE.eq(1));
    assert.ok(new Fr(-1, 3).isNeg() && !new Fr(-1, 3).isInt());
    assert.ok(new Fr(-1, 3).abs().eq(new Fr(1, 3)));
    assert.ok(new Fr(6, 3).isInt());
  });

  test('es inmutable', () => {
    const f = new Fr(1, 2);
    assert.ok(Object.isFrozen(f));
    assert.throws(() => {
      f.n = 5;
    }, TypeError);
    assert.equal(f.n, 1);
  });
});

/* ------------------------------------------------------------------ */
/* Generador con semilla                                               */
/* ------------------------------------------------------------------ */

describe('Generador pseudoaleatorio (rng)', () => {
  test('misma semilla ⇒ misma secuencia; una semilla de texto equivale a su hash', () => {
    const a = createRng('ana');
    const b = createRng('ana');
    const c = createRng(hashString('ana'));
    for (let i = 0; i < 50; i++) {
      const x = a.next();
      assert.equal(x, b.next());
      assert.equal(x, c.next());
    }
    const d = createRng(42);
    const e = createRng(43);
    assert.notEqual(d.next(), e.next());
  });

  test('hashString es FNV-1a de 32 bits', () => {
    assert.equal(hashString(''), 0x811c9dc5);
    assert.equal(hashString('a'), 0xe40c292c);
    assert.notEqual(hashString('ana'), hashString('luis'));
  });

  test('next() queda en [0, 1) e int() respeta los extremos (y los alcanza)', () => {
    const rng = createRng(7);
    const vistos = new Set();
    for (let i = 0; i < 3000; i++) {
      const x = rng.next();
      assert.ok(x >= 0 && x < 1);
      const k = rng.int(-3, 3);
      assert.ok(Number.isInteger(k) && k >= -3 && k <= 3);
      vistos.add(k);
    }
    assert.equal(vistos.size, 7);
    assert.equal(rng.int(5, 5), 5);
  });

  test('pick, pickWeighted, chance y shuffle', () => {
    const rng = createRng('utilidades');
    const arr = ['a', 'b', 'c'];
    const elegidos = new Set();
    for (let i = 0; i < 300; i++) {
      elegidos.add(rng.pick(arr));
      assert.notEqual(rng.pickWeighted([['nunca', 0], ['si', 1], ['tampoco', 0]]), 'nunca');
      assert.notEqual(rng.pickWeighted([['x', 1], ['nunca', 0], ['y', 1]]), 'nunca');
      assert.equal(rng.chance(0), false);
      assert.equal(rng.chance(1), true);
    }
    assert.deepEqual([...elegidos].sort(), arr);
    assert.equal(rng.pickWeighted([['a', 0], ['b', 0]]), 'b', 'con todos los pesos en cero no truena: da el último');
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const copia = original.slice();
    const barajado = rng.shuffle(original);
    assert.deepEqual(original, copia, 'no modifica el arreglo original');
    assert.deepEqual([...barajado].sort((x, y) => x - y), original);
    assert.deepEqual(createRng(9).shuffle(original), createRng(9).shuffle(original));
  });
});

/* ------------------------------------------------------------------ */
/* Ruta adaptativa                                                     */
/* ------------------------------------------------------------------ */

describe('Ruta adaptativa: casos adicionales', () => {
  const err = (tipo) => ({ analisis: { estado: 'error', error: { tipo } } });

  test('las cuatro actividades van en orden', () => {
    assert.deepEqual(ACTIVIDADES, ['pregunta', 'visual', 'practica', 'comprobacion']);
  });

  test('empate en el conteo: gana el error que apareció primero', () => {
    assert.equal(resumirDiagnostico([err(TIPOS.SIGNO_NEGATIVO), err(TIPOS.ARITMETICA)]).dominante, TIPOS.SIGNO_NEGATIVO);
    assert.equal(resumirDiagnostico([err(TIPOS.ARITMETICA), err(TIPOS.SIGNO_NEGATIVO)]).dominante, TIPOS.ARITMETICA);
  });

  test('solo errores no clasificados ⇒ la ruta es la general; sin resultados ⇒ ninguna', () => {
    const r = resumirDiagnostico([err(TIPOS.NO_CLASIFICADO), { analisis: { estado: 'incompleto' } }]);
    assert.equal(r.dominante, TIPOS.NO_CLASIFICADO);
    assert.equal(r.correctos, 0);
    assert.deepEqual(resumirDiagnostico([]), { conteo: {}, dominante: null, correctos: 0, total: 0 });
  });

  test('construirRuta: semilla numérica o de texto, niveles 1-2-3 + comprobación de nivel 3, todo del tipo pedido', () => {
    for (const tipo of Object.values(TIPOS)) {
      const ruta = construirRuta(tipo, 'semilla-ruta');
      assert.deepEqual(ruta, construirRuta(tipo, hashString('semilla-ruta')), tipo);
      assert.equal(ruta.tipo, tipo);
      assert.deepEqual(ruta.practica.map((e) => e.nivel), [1, 2, 3]);
      assert.equal(ruta.comprobacion.nivel, 3);
      const todos = [...ruta.practica, ruta.comprobacion];
      assert.ok(todos.every((e) => e.tipo === tipo));
      assert.equal(new Set(todos.map((e) => e.ecuacion)).size, 4, tipo);
    }
  });

  test('construirRuta evita los ejercicios dados aunque estén escritos con guion y sin espacios', () => {
    const base = construirRuta(TIPOS.SIGNO_TRANSPOSICION, 'evitar');
    const elegido = base.practica[1].ecuacion; // forma ax − b = c
    const escrito = elegido.replace(/−/g, '-').replace(/\s+/g, '');
    const ruta = construirRuta(TIPOS.SIGNO_TRANSPOSICION, 'evitar', [escrito]);
    const todos = [...ruta.practica, ruta.comprobacion].map((e) => e.ecuacion);
    assert.ok(!todos.includes(elegido), `${elegido} no se evitó`);
  });

  test('otraComprobacion: determinista, nivel 3, del tipo pedido y distinta de las usadas', () => {
    const usados = ['3x = 15'];
    const a = otraComprobacion(TIPOS.INVERSA_EQUIVOCADA, 'luis', usados);
    assert.deepEqual(a, otraComprobacion(TIPOS.INVERSA_EQUIVOCADA, 'luis', usados));
    assert.equal(a.nivel, 3);
    assert.equal(a.tipo, TIPOS.INVERSA_EQUIVOCADA);
    let previos = [];
    for (let i = 0; i < 6; i++) {
      const e = otraComprobacion(TIPOS.SIGNO_TRANSPOSICION, 'reintentos', previos);
      assert.ok(!previos.includes(e.ecuacion), e.ecuacion);
      assert.equal(sol(e.ecuacion), String(e.solucion));
      previos = [...previos, e.ecuacion];
    }
  });
});

/* ------------------------------------------------------------------ */
/* Textos (ramas sin cubrir)                                           */
/* ------------------------------------------------------------------ */

describe('Textos: ramas sin prueba previa', () => {
  const pregunta = (lineas, ejercicio = 3) => {
    const a = analizarProcedimiento(lineas);
    return { a, q: preguntaOrientadora(a.error.tipo, { error: a.error, ejercicio }, pack) };
  };
  const revisarOpciones = (q) => {
    sinHuecos(q.texto);
    assert.equal(q.opciones.length, 3);
    assert.equal(q.opciones.filter((o) => o.correcta).length, 1);
    assert.equal(new Set(q.opciones.map((o) => o.texto)).size, 3);
    for (const o of q.opciones) {
      sinHuecos(o.texto);
      sinHuecos(o.retro);
    }
    return q.opciones.find((o) => o.correcta);
  };

  test('nombreError: nombre largo, corto y el código si no hay nombre', () => {
    for (const tipo of Object.values(TIPOS)) {
      assert.equal(nombreError(tipo, pack), pack.errores[tipo].nombre);
      assert.equal(nombreError(tipo, pack, true), pack.errores[tipo].nombreCorto);
    }
    assert.equal(nombreError('TIPO_QUE_NO_EXISTE', pack), 'TIPO_QUE_NO_EXISTE');
  });

  test('explicarError: tipo desconocido ⇒ texto de NO_CLASIFICADO; variante o audiencia desconocidas ⇒ la primera del alumno', () => {
    const noClasificado = { tipo: TIPOS.NO_CLASIFICADO, renglon: 2, detalle: { variante: 'desconocido', posibles: [] } };
    assert.equal(
      explicarError({ tipo: 'TIPO_QUE_NO_EXISTE', renglon: 2, detalle: { variante: 'desconocido' } }, pack),
      explicarError(noClasificado, pack),
    );
    const ana = analizarProcedimiento(['3x + 5 = 20', '3x = 25']).error;
    const rara = { ...ana, detalle: { ...ana.detalle, variante: 'variante_rara' } };
    assert.equal(explicarError(rara, pack, 'audiencia_rara'), explicarError(ana, pack, 'alumno'));
  });

  test('sugerenciaLlamada con tipo desconocido usa el texto general', () => {
    const t = sugerenciaLlamada('TIPO_QUE_NO_EXISTE', '2x - 7 = 9', pack);
    assert.equal(t, sugerenciaLlamada(TIPOS.NO_CLASIFICADO, '2x - 7 = 9', pack));
    sinHuecos(t);
  });

  test('datosError deriva verbos, operación inversa y coeficiente sin signo', () => {
    const d = datosError({ renglon: 4, detalle: { signoOriginal: 'resta', coefNum: '−3' } });
    assert.equal(d.renglon, 4);
    assert.deepEqual(
      [d.verbo, d.verboInverso, d.inversa, d.inversaCap, d.signoInverso, d.signoMismo],
      ['restando', 'sumando', 'sumar', 'Sumar', '+', '−'],
    );
    assert.equal(d.coefNumAbs, '3');
    assert.equal(d.coefNumParentesis, '(−3)');
    assert.equal(datosError({ detalle: { coefNum: '4' } }).coefNumParentesis, '4');
    assert.deepEqual(datosError(), {});
  });

  test('rellenar: sin plantilla da vacío y conserva 0 y false', () => {
    assert.equal(rellenar(null), '');
    assert.equal(rellenar('{a} y {b}', { a: 0, b: false }), '0 y false');
  });

  test('pistasPara con el ejercicio ya resuelto: pistas para comprobar, sin paso siguiente', () => {
    const r = pistasPara('3x + 5 = 20', ['3x = 15', 'x = 5'], pack);
    assert.equal(r.paso, null);
    assert.equal(r.error, null);
    assert.equal(r.pistas.length, 3);
    r.pistas.forEach(sinHuecos);
    assert.match(r.pistas[1], /[Ss]ustituye/);
    assert.equal(r.solucion[r.solucion.length - 1], 'x = 5');
  });

  test('pistasPara sigue el avance: reducir, pasar x y sin renglones (null)', () => {
    const reducir = pistasPara('3x + 5 = 20', ['3x = 20 - 5'], pack);
    assert.equal(reducir.paso, 'reducir');
    reducir.pistas.forEach(sinHuecos);
    assert.ok(reducir.pistas.some((p) => /▢/.test(p)), 'una pista deja huecos para las cuentas');
    const equis = pistasPara('5x = 2x + 12', [], pack);
    assert.equal(equis.paso, 'transponer_x');
    assert.ok(equis.pistas.some((p) => /2x/.test(p)), equis.pistas.join(' | '));
    assert.deepEqual(pistasPara('3x + 5 = 20', null, pack), pistasPara('3x + 5 = 20', [], pack));
  });

  test('pistasPara después de un error parte del último renglón válido', () => {
    const luis = pistasPara('3x + 5 = 20', ['3x = 15', 'x = 12'], pack);
    assert.equal(luis.error.tipo, TIPOS.INVERSA_EQUIVOCADA);
    assert.equal(luis.paso, 'dividir');
    for (const p of luis.pistas) {
      sinHuecos(p);
      assert.ok(!revelaSolucion(p, 5, ['3x + 5 = 20', '3x = 15', 'x = 12']), p);
    }
  });

  test('pregunta orientadora ARITMETICA (cuenta): la correcta es el resultado esperado y hay un distractor distinto', () => {
    const { q } = pregunta(['3x + 5 = 20', '3x = 16']);
    assert.ok(q.basadaEnAlumno);
    const correcta = revisarOpciones(q);
    assert.equal(correcta.texto, '15');
    const otras = q.opciones.filter((o) => !o.correcta).map((o) => o.texto);
    assert.ok(otras.includes('16'), 'una opción es lo que escribió el estudiante');
    const distractor = otras.find((t) => t !== '16');
    assert.ok(Number.isInteger(Number(distractor.replace('−', '-'))), `distractor no numérico: ${distractor}`);
  });

  test('pregunta orientadora ARITMETICA (copia): usa las opciones de copiado', () => {
    const { a, q } = pregunta(['3x + 5 = 20', '3x + 5 = 21']);
    assert.equal(a.error.detalle.variante, 'copia');
    revisarOpciones(q);
    assert.match(q.texto, /3x \+ 5 = 21/);
  });

  test('pregunta orientadora INVERSA (divide y aditivo) y UN_SOLO_LADO (divide)', () => {
    const divide = pregunta(['x/4 = 3', 'x = 3/4']);
    assert.match(revisarOpciones(divide.q).texto, /4/);
    assert.match(divide.q.texto, /x = 3\/4/);
    const aditivo = pregunta(['3x + 5 = 20', '3x = 4']);
    assert.match(revisarOpciones(aditivo.q).texto, /5/);
    const soloX = pregunta(['3x = 15', 'x = 15']);
    assert.match(revisarOpciones(soloX.q).texto, /3/);
    for (const { q } of [divide, aditivo, soloX]) assert.ok(q.basadaEnAlumno);
  });

  test('pregunta orientadora SIGNO_NEGATIVO: la opción correcta depende del signo del resultado', () => {
    assert.equal(revisarOpciones(pregunta(['−2x = 8', 'x = 4']).q).texto, 'Negativo');
    assert.equal(revisarOpciones(pregunta(['−2x = −8', 'x = −4']).q).texto, 'Positivo');
  });

  test('si el error del alumno es de otro tipo, la pregunta usa el ejemplo del paquete', () => {
    const luis = analizarProcedimiento(['3x + 5 = 20', '3x = 15', 'x = 12']);
    const q = preguntaOrientadora(TIPOS.SIGNO_TRANSPOSICION, { error: luis.error, ejercicio: 1 }, pack);
    assert.equal(q.basadaEnAlumno, false);
    revisarOpciones(q);
    assert.ok(!q.texto.includes('x = 12'));
  });
});

/* ------------------------------------------------------------------ */
/* Formato y filtro de salida                                          */
/* ------------------------------------------------------------------ */

describe('Formato: casos adicionales', () => {
  test('términos con y sin signo', () => {
    const t = (c, x) => ({ c, x });
    assert.equal(fmtTerminoConSigno(t(new Fr(2), true)), '+2x');
    assert.equal(fmtTerminoConSigno(t(new Fr(1), true)), '+x');
    assert.equal(fmtTerminoConSigno(t(new Fr(-1), true)), '−x');
    assert.equal(fmtTerminoConSigno(t(new Fr(-1, 3), true)), '−x/3');
    assert.equal(fmtTerminoConSigno(t(new Fr(2, 3), true)), '+2x/3');
    assert.equal(fmtTerminoConSigno(t(new Fr(-5), false)), '−5');
    assert.equal(fmtTerminoSinSigno(t(new Fr(-5, 2), false)), '5/2');
    assert.equal(fmtTerminoSinSigno(t(new Fr(-3), true)), '3x');
  });

  test('lado vacío, números y ecuaciones con fracciones y decimales', () => {
    assert.equal(fmtLado([]), '0');
    assert.equal(fmtNum(-4), '−4');
    assert.equal(fmtNum('2.5'), '5/2');
    assert.equal(fmtNum(new Fr(0)), '0');
    assert.equal(fmtEcuacion(ecuacion('0.5x - 1/3 = -2')), 'x/2 − 1/3 = −2');
    assert.equal(fmtEcuacion(ecuacion('-x + 2x/3 = 1')), '−x + 2x/3 = 1');
  });

  test('bonito: espacios uniformes, − tipográfico y · para multiplicar', () => {
    assert.equal(bonito('3x - 5 = 20'), '3x − 5 = 20');
    assert.equal(bonito('  3x+5   =20 '), '3x + 5 = 20');
    assert.equal(bonito('-x = 5'), '−x = 5');
    assert.equal(bonito('3*x=6'), '3·x = 6');
    assert.equal(bonito(null), '');
    assert.equal(bonito(undefined), '');
  });

  test('despeje reconoce "x = valor" de cualquier lado y nada más', () => {
    assert.equal(despeje(ecuacion('x = 5')).toString(), '5');
    assert.equal(despeje(ecuacion('5 = x')).toString(), '5');
    assert.equal(despeje(ecuacion('x = -1/2')).toString(), '-1/2');
    assert.equal(despeje(ecuacion('2x = 10')), null);
    assert.equal(despeje(ecuacion('x = 2 + 3')), null);
    assert.equal(despeje(ecuacion('x + 1 = 6')), null);
  });

  test('prioridad: el catálogo completo, con NO_CLASIFICADO al final', () => {
    assert.deepEqual([...PRIORIDAD].sort(), Object.values(TIPOS).sort());
    assert.equal(PRIORIDAD[PRIORIDAD.length - 1], TIPOS.NO_CLASIFICADO);
    assert.ok(!TIPOS_DIAGNOSTICABLES.includes(TIPOS.NO_CLASIFICADO));
  });
});

describe('Filtro de salida para la IA: casos adicionales', () => {
  test('detecta la solución escrita como decimal, como cero o con palabras en negativo', () => {
    assert.ok(revelaSolucion('Te queda x = 8.33', new Fr(25, 3), ['3x = 25']));
    assert.ok(revelaSolucion('Entonces x = 0', 0, ['3x + 5 = 5']));
    assert.ok(revelaSolucion('Así que x vale menos cuatro', -4, ['−2x = 8']));
    assert.ok(revelaSolucion('La solución es 12', 12, ['x/4 = 3']));
  });

  test('no confunde la solución con números que la contienen', () => {
    const contexto = ['2x = 10'];
    assert.ok(!revelaSolucion('Piensa en 15 y en 25', 5, contexto));
    assert.ok(!revelaSolucion('La mitad de 5.5 es otra cosa', 5, contexto));
    assert.ok(!revelaSolucion('Mira la fracción 5/3', 5, contexto));
  });
});
