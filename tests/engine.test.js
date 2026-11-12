import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  TIPOS,
  TIPOS_DIAGNOSTICABLES,
  analizarProcedimiento,
  parsearRenglon,
  resolver,
  ecuacion,
  pasosSolucion,
  generarEjercicio,
  procedimientoConError,
  PLAN_EJERCICIOS,
  revelaSolucion,
  cercano,
  fmtEcuacion,
} from '../js/core/engine.js';
import { Fr } from '../js/core/fraction.js';
import { createRng } from '../js/core/rng.js';

const diag = (...lineas) => analizarProcedimiento(lineas);
const sol = (texto) => {
  const r = parsearRenglon(texto);
  assert.ok(r.ok, `no parsea: ${texto} (${r.error?.mensaje})`);
  const s = resolver(r.eq);
  return s.tipo === 'unica' ? s.valor.toString() : s.tipo;
};

describe('Casos del pitch', () => {
  test('Ana: 3x + 5 = 20 → 3x = 25 → x = 25/3 es SIGNO_TRANSPOSICION en el renglón 2', () => {
    const r = diag('3x + 5 = 20', '3x = 25', 'x = 25/3');
    assert.equal(r.estado, 'error');
    assert.equal(r.error.tipo, TIPOS.SIGNO_TRANSPOSICION);
    assert.equal(r.error.renglon, 2);
    assert.equal(r.error.detalle.terminoSinSigno, '5');
  });

  test('Luis: 3x + 5 = 20 → 3x = 15 → x = 12 es INVERSA_EQUIVOCADA en el renglón 3', () => {
    const r = diag('3x + 5 = 20', '3x = 15', 'x = 12');
    assert.equal(r.estado, 'error');
    assert.equal(r.error.tipo, TIPOS.INVERSA_EQUIVOCADA);
    assert.equal(r.error.renglon, 3);
    assert.equal(r.error.detalle.variante, 'resta');
  });

  test('Ana y Luis llegan a diagnósticos distintos con el mismo ejercicio', () => {
    const ana = diag('3x + 5 = 20', '3x = 25', 'x = 25/3');
    const luis = diag('3x + 5 = 20', '3x = 15', 'x = 12');
    assert.notEqual(ana.error.tipo, luis.error.tipo);
    assert.notEqual(ana.error.renglon, luis.error.renglon);
  });
});

describe('Parser', () => {
  const casos = [
    ['3x + 5 = 20', '5'],
    ['3x+5=20', '5'],
    ['3*x + 5 = 20', '5'],
    ['3·x + 5 = 20', '5'],
    ['x/2 = 7', '14'],
    ['x / 2 + 1 = 4', '6'],
    ['2/3x = 4', '6'],
    ['3x/4 = 6', '8'],
    ['0.5x = 3', '6'],
    ['0,5x = 3', '6'],
    ['1.25x = 5', '4'],
    ['-2x = 8', '-4'],
    ['−2x = 8', '-4'],
    ['–2x + 3 = 11', '-4'],
    ['5x + 2 = 2x + 14', '4'],
    ['20 = 3x + 5', '5'],
    ['2(x + 3) = 14', '4'],
    ['-(x - 4) = 1', '3'],
    ['3 x = 1 5', '5'],
    ['X + 1 = 3', '2'],
    ['12 ÷ 4 = x', '3'],
    ['3 × x = 12', '4'],
    ['x + x = 10', '5'],
    ['7x = 3', '3/7'],
  ];
  for (const [texto, esperado] of casos) {
    test(`«${texto}» → x = ${esperado}`, () => assert.equal(sol(texto), esperado));
  }

  const errores = [
    ['3x + 5', 'sin_igual'],
    ['3x + 5 =', 'lado_vacio'],
    ['= 20', 'lado_vacio'],
    ['3y + 5 = 20', 'letra'],
    ['x^2 = 4', 'no_lineal'],
    ['x² = 4', 'no_lineal'],
    ['x * x = 4', 'no_lineal'],
    ['4/x = 2', 'div_x'],
    ['x/0 = 2', 'div_cero'],
    ['2(x + 3 = 14', 'parentesis'],
    ['2x + 3) = 14', 'parentesis'],
    ['3x + = 20', 'sintaxis'],
    ['3x # 5 = 20', 'simbolo'],
    ['1.2.3x = 4', 'numero'],
    ['', 'vacio'],
  ];
  for (const [texto, codigo] of errores) {
    test(`«${texto}» no se acepta (${codigo})`, () => {
      const r = parsearRenglon(texto);
      assert.equal(r.ok, false);
      assert.equal(r.error.codigo, codigo);
      assert.ok(r.error.mensaje.length > 10, 'el mensaje debe explicar qué hacer');
    });
  }

  test('ecuaciones sin solución única', () => {
    assert.equal(sol('x + 1 = x + 2'), 'ninguna');
    assert.equal(sol('2x + 2 = 2(x + 1)'), 'todas');
    assert.equal(diag('x + 1 = x + 2').estado, 'sin_solucion_unica');
  });

  test('cadena de igualdades: la ecuación efectiva es la última', () => {
    const r = parsearRenglon('x = 15/3 = 5');
    assert.ok(r.ok);
    assert.equal(r.cadena, null);
    assert.equal(resolver(r.eq).valor.toString(), '5');
  });

  test('fracciones exactas, sin errores de redondeo', () => {
    assert.equal(sol('3x = 25'), '25/3');
    assert.equal(sol('0.1x + 0.2 = 0.3'), '1');
  });
});

describe('Validación por paso', () => {
  test('procedimiento correcto', () => {
    const r = diag('3x + 5 = 20', '3x = 20 - 5', '3x = 15', 'x = 15/3', 'x = 5');
    assert.equal(r.estado, 'correcto');
    assert.equal(r.respuesta.toString(), '5');
    assert.ok(r.renglones.every((x) => x.valido));
  });

  test('otra estrategia válida también es correcta (dividir todo primero)', () => {
    assert.equal(diag('3x + 6 = 21', 'x + 2 = 7', 'x = 5').estado, 'correcto');
  });

  test('saltarse pasos es válido si conserva la solución', () => {
    assert.equal(diag('5x + 2 = 2x + 14', 'x = 4').estado, 'correcto');
  });

  test('cadena correcta en un renglón', () => {
    assert.equal(diag('3x + 5 = 20', '3x = 20 − 5 = 15', 'x = 15/3 = 5').estado, 'correcto');
  });

  test('procedimiento sin terminar', () => {
    const r = diag('3x + 5 = 20', '3x = 15');
    assert.equal(r.estado, 'incompleto');
    assert.equal(r.siguiente.tipo, 'dividir');
  });

  test('renglón que no se entiende: dice cuál y por qué', () => {
    const r = diag('3x + 5 = 20', '3x = ', 'x = 5');
    assert.equal(r.estado, 'sin_entender');
    assert.equal(r.renglon, 2);
  });

  test('cuenta auxiliar correcta sin x se acepta', () => {
    assert.equal(diag('3x + 5 = 20', '20 − 5 = 15', '3x = 15', 'x = 5').estado, 'correcto');
  });

  test('respuesta decimal redondeada se acepta como aproximación', () => {
    assert.equal(diag('7x = 3', 'x = 0.43').estado, 'correcto');
    assert.equal(diag('7x = 3', 'x = 0.5').estado, 'error');
  });

  test('el primer renglón que cambia la solución es el del error', () => {
    const r = diag('2x + 4 = 10', '2x = 6', '2x = 8', 'x = 4');
    assert.equal(r.error.renglon, 3);
  });
});

describe('Reglas de error (mal-rules)', () => {
  const casos = [
    // [renglones, tipo, renglón, variante]
    [['3x + 5 = 20', '3x = 25'], TIPOS.SIGNO_TRANSPOSICION, 2, 'sin_cambio_signo'],
    [['3x - 4 = 11', '3x = 7', 'x = 7/3'], TIPOS.SIGNO_TRANSPOSICION, 2, 'sin_cambio_signo'],
    [['5x = 2x + 12', '7x = 12'], TIPOS.SIGNO_TRANSPOSICION, 2, 'sin_cambio_signo'],
    [['5x + 2 = 2x + 14', '5x + 2x = 14 - 2'], TIPOS.SIGNO_TRANSPOSICION, 2, 'sin_cambio_signo'],
    [['3x + 5 = 20', 'x = 25/3'], TIPOS.SIGNO_TRANSPOSICION, 2, 'sin_cambio_signo'],
    [['3x = 15', 'x = 12'], TIPOS.INVERSA_EQUIVOCADA, 2, 'resta'],
    [['3x = 15', 'x = 45'], TIPOS.INVERSA_EQUIVOCADA, 2, 'multiplica'],
    [['3x = 15', 'x = 3/15'], TIPOS.INVERSA_EQUIVOCADA, 2, 'invierte'],
    [['x/4 = 3', 'x = 3/4'], TIPOS.INVERSA_EQUIVOCADA, 2, 'divide'],
    [['-2x = 8', 'x = 10'], TIPOS.INVERSA_EQUIVOCADA, 2, 'resta'],
    [['3x + 5 = 20', '3x = 4'], TIPOS.INVERSA_EQUIVOCADA, 2, 'aditivo_divide'],
    [['3x + 5 = 20', '3x = 14'], TIPOS.ARITMETICA, 2, 'cuenta'],
    [['3x + 5 = 20', '3x = 20 - 5 = 14'], TIPOS.ARITMETICA, 2, 'cadena'],
    [['3x + 5 = 20', '20 - 5 = 14'], TIPOS.ARITMETICA, 2, 'cuenta'],
    [['3x = 15', 'x = 6'], TIPOS.ARITMETICA, 2, 'cuenta'],
    [['3x + 5 = 20', '3x + 5 = 21'], TIPOS.ARITMETICA, 2, 'copia'],
    [['3x + 5 = 20', '8x = 20'], TIPOS.TERMINOS_NO_SEMEJANTES, 2, 'todo_a_x'],
    [['2x + 3 + 4 = 15', '5x + 4 = 15'], TIPOS.TERMINOS_NO_SEMEJANTES, 2, 'par_a_x'],
    [['3x + 5 = 20', '8 = 20'], TIPOS.TERMINOS_NO_SEMEJANTES, 2, 'todo_a_numero'],
    [['3x + 5 = 20', '3x = 20'], TIPOS.UN_SOLO_LADO, 2, 'quita_de_un_lado'],
    [['5x = 2x + 12', '5x = 12'], TIPOS.UN_SOLO_LADO, 2, 'quita_de_un_lado'],
    [['3x = 15', 'x = 15'], TIPOS.UN_SOLO_LADO, 2, 'divide_solo_x'],
    [['3x = 15', '3x = 5'], TIPOS.UN_SOLO_LADO, 2, 'divide_solo_numero'],
    [['-2x = 8', 'x = 4'], TIPOS.SIGNO_NEGATIVO, 2, 'pierde_signo'],
    [['-2x + 3 = 11', '-2x = 8', 'x = 4'], TIPOS.SIGNO_NEGATIVO, 3, 'pierde_signo'],
    [['-x = 5', 'x = 5'], TIPOS.SIGNO_NEGATIVO, 2, 'pierde_signo'],
    [['2x = -8', 'x = 4'], TIPOS.SIGNO_NEGATIVO, 2, 'pierde_signo'],
    [['-2x = 8', '2x = 8'], TIPOS.SIGNO_NEGATIVO, 2, 'quita_signo_coef'],
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

  test('NO_CLASIFICADO: lo dice tal cual y no inventa', () => {
    for (const lineas of [
      ['3x + 5 = 20', 'x + 5 = 20/3'],
      ['3x + 5 = 20', 'x = 100'],
      ['2x + 4 = 10', '6x = 10 + 4'],
    ]) {
      const r = diag(...lineas);
      assert.equal(r.estado, 'error', lineas.join(' → '));
      assert.equal(r.error.tipo, TIPOS.NO_CLASIFICADO, lineas.join(' → '));
      assert.equal(r.error.confianza, 'baja');
    }
  });

  test('cercano(): solo deslices de cuenta plausibles', () => {
    assert.ok(cercano(Fr.from(15), Fr.from(14)));
    assert.ok(cercano(Fr.from(42), Fr.from(48)));
    assert.ok(cercano(Fr.from(15), Fr.from(51)));
    assert.ok(!cercano(Fr.from(15), Fr.from(4)));
    assert.ok(!cercano(Fr.from(15), Fr.from(15)));
  });
});

describe('Pasos de solución', () => {
  test('pasos canónicos llegan a la respuesta', () => {
    for (const [texto, x] of [
      ['3x + 5 = 20', '5'],
      ['5x + 2 = 2x + 14', '4'],
      ['−2x + 3 = 11', '-4'],
      ['x/4 − 1 = 2', '12'],
      ['2x + 5 = 4x − 3', '4'],
      ['−x = 5', '-5'],
      ['3x = 25', '25/3'],
    ]) {
      const pasos = pasosSolucion(ecuacion(texto));
      assert.ok(pasos.length >= 1, texto);
      const ultimo = pasos[pasos.length - 1];
      assert.equal(resolver(ultimo.eq).valor.toString(), x, texto);
      // Cada paso conserva la solución
      const r = analizarProcedimiento([texto, ...pasos.map((p) => p.texto)]);
      assert.equal(r.estado, 'correcto', `${texto}: ${pasos.map((p) => p.texto).join(' | ')}`);
    }
  });
});

describe('Generador de ejercicios', () => {
  test('solución entera, se puede parsear y coincide con lo declarado', () => {
    for (const tipo of Object.keys(PLAN_EJERCICIOS)) {
      for (const nivel of [1, 2, 3]) {
        const rng = createRng(`${tipo}-${nivel}`);
        for (let i = 0; i < 60; i++) {
          const e = generarEjercicio(tipo, nivel, rng);
          assert.ok(Number.isInteger(e.solucion), e.ecuacion);
          assert.equal(sol(e.ecuacion), String(e.solucion), `${tipo} ${nivel}: ${e.ecuacion}`);
        }
      }
    }
  });

  test('misma semilla, mismos ejercicios', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 10; i++) {
      assert.equal(generarEjercicio('SIGNO_TRANSPOSICION', 2, a).ecuacion, generarEjercicio('SIGNO_TRANSPOSICION', 2, b).ecuacion);
    }
  });

  test('evita ejercicios ya usados', () => {
    const rng = createRng(1);
    const usados = new Set();
    for (let i = 0; i < 15; i++) {
      const e = generarEjercicio('INVERSA_EQUIVOCADA', 1, rng, usados);
      assert.ok(!usados.has(e.ecuacion));
      usados.add(e.ecuacion);
    }
  });
});

describe('Ida y vuelta: procedimiento con error → mismo diagnóstico', () => {
  for (const tipo of [...TIPOS_DIAGNOSTICABLES, TIPOS.NO_CLASIFICADO]) {
    test(tipo, () => {
      let probados = 0;
      for (const nivel of [1, 2, 3]) {
        const rng = createRng(`ida-vuelta-${tipo}-${nivel}`);
        for (let i = 0; i < 25; i++) {
          const forma = PLAN_EJERCICIOS[tipo][nivel - 1];
          // Para TERMINOS el nivel 1 (solo términos semejantes) no admite el error.
          const e = generarEjercicio(tipo, nivel, rng);
          const lineas = procedimientoConError(e.ecuacion, tipo);
          if (!lineas) continue;
          const r = analizarProcedimiento(lineas);
          assert.equal(r.estado, 'error', `${forma}: ${lineas.join(' | ')}`);
          assert.equal(r.error.tipo, tipo, `${forma}: ${lineas.join(' | ')}`);
          probados++;
        }
      }
      assert.ok(probados >= 25, `muy pocos casos aplicables para ${tipo}: ${probados}`);
    });
  }

  test('los ejercicios del diagnóstico admiten los errores principales', () => {
    const diagnostico = ['3x + 5 = 20', 'x/4 − 1 = 2', '5x + 2 = 2x + 14', '−2x + 3 = 11'];
    for (const tipo of [TIPOS.SIGNO_TRANSPOSICION, TIPOS.INVERSA_EQUIVOCADA, TIPOS.UN_SOLO_LADO, TIPOS.ARITMETICA]) {
      for (const texto of diagnostico) {
        assert.ok(procedimientoConError(texto, tipo), `${tipo} no aplica a ${texto}`);
      }
    }
  });
});

describe('Filtro de salida para la IA', () => {
  const contexto = ['3x + 5 = 20', '3x = 15'];
  test('detecta cuando se revela la solución', () => {
    assert.ok(revelaSolucion('Entonces x = 5', 5, contexto));
    assert.ok(revelaSolucion('Muy bien, x vale 5.', 5, contexto));
    assert.ok(revelaSolucion('La respuesta es 5', 5, contexto));
    assert.ok(revelaSolucion('x es cinco', 5, contexto));
    assert.ok(revelaSolucion('Piensa en 7 cajas', 7, ['3x + 5 = 26']));
    assert.ok(revelaSolucion('x = 25/3', new Fr(25, 3), ['3x = 25']));
    assert.ok(revelaSolucion('x = −4', -4, ['−2x = 8']));
  });
  test('no confunde números del ejercicio con la solución', () => {
    assert.ok(!revelaSolucion('¿Qué pasa con el 5 cuando cambia de lado?', 5, contexto));
    assert.ok(!revelaSolucion('Divide los dos lados entre 3. ¿Qué obtienes?', 5, contexto));
    assert.ok(!revelaSolucion('¿Qué operación deshace la multiplicación?', 5, contexto));
  });
});

describe('Formato', () => {
  test('fmtEcuacion usa el signo menos tipográfico', () => {
    assert.equal(fmtEcuacion(ecuacion('-2x + 3 = -11')), '−2x + 3 = −11');
    assert.equal(fmtEcuacion(ecuacion('x/4 - 1 = 2')), 'x/4 − 1 = 2');
  });
});
