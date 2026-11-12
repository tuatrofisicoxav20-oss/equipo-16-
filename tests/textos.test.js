import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TIPOS,
  TIPOS_DIAGNOSTICABLES,
  analizarProcedimiento,
  procedimientoConError,
  generarEjercicio,
  revelaSolucion,
  PLAN_EJERCICIOS,
} from '../js/core/engine.js';
import {
  explicarError,
  pistasPara,
  preguntaOrientadora,
  respuestaTecu,
  sugerenciaLlamada,
  rellenar,
} from '../js/core/textos.js';
import { construirRuta, resumirDiagnostico } from '../js/core/ruta.js';
import { createRng } from '../js/core/rng.js';

const pack = JSON.parse(readFileSync(new URL('../packs/ecuaciones-1.json', import.meta.url), 'utf8'));
const sinHuecos = (t) => assert.ok(!/[{}]/.test(t) && !/undefined|null|NaN/.test(t), `texto con huecos: «${t}»`);

describe('Paquete de contenido', () => {
  test('cada tipo de error tiene nombre, ruta y textos', () => {
    for (const tipo of Object.values(TIPOS)) {
      const e = pack.errores[tipo];
      assert.ok(e, tipo);
      assert.ok(e.nombre && e.nombreCorto && e.ruta?.titulo && e.ruta?.visual?.modo && e.llamada15, tipo);
      assert.ok(pack.preguntas[tipo], `falta la pregunta de ${tipo}`);
      assert.ok(pack.pistasPorError[tipo], `faltan pistas por error para ${tipo}`);
    }
  });

  test('el diagnóstico tiene 4 ecuaciones', () => {
    assert.equal(pack.diagnostico.length, 4);
  });
});

describe('Explicaciones de errores', () => {
  test('todas las variantes que produce el motor tienen texto completo', () => {
    const vistos = new Set();
    for (const tipo of [...TIPOS_DIAGNOSTICABLES, TIPOS.NO_CLASIFICADO]) {
      for (const nivel of [1, 2, 3]) {
        const rng = createRng(`textos-${tipo}-${nivel}`);
        for (let i = 0; i < 15; i++) {
          const e = generarEjercicio(tipo, nivel, rng);
          const lineas = procedimientoConError(e.ecuacion, tipo);
          if (!lineas) continue;
          const r = analizarProcedimiento(lineas);
          for (const audiencia of ['alumno', 'docente']) {
            const t = explicarError(r.error, pack, audiencia);
            sinHuecos(t);
            assert.ok(t.length > 20);
          }
          vistos.add(`${r.error.tipo}:${r.error.detalle.variante}`);
        }
      }
    }
    assert.ok(vistos.size >= 8, [...vistos].join(', '));
  });

  test('la explicación al estudiante no revela la respuesta final', () => {
    const ana = analizarProcedimiento(['3x + 5 = 20', '3x = 25', 'x = 25/3']);
    const t = explicarError(ana.error, pack, 'alumno');
    assert.match(t, /renglón 2/);
    assert.ok(!revelaSolucion(t, 5, ['3x + 5 = 20', '3x = 25', 'x = 25/3']), t);
    const luis = analizarProcedimiento(['3x + 5 = 20', '3x = 15', 'x = 12']);
    const t2 = explicarError(luis.error, pack, 'alumno');
    assert.match(t2, /dividiendo/);
    assert.ok(!revelaSolucion(t2, 5, ['3x + 5 = 20', '3x = 15', 'x = 12']), t2);
  });
});

describe('Pistas en escalera', () => {
  test('se generan del ejercicio: mencionan sus números y no revelan x', () => {
    const { pistas, solucion } = pistasPara('3x + 5 = 20', [], pack);
    assert.equal(pistas.length, 3);
    pistas.forEach(sinHuecos);
    assert.match(pistas[0], /5/);
    assert.match(pistas[2], /20 − 5/);
    for (const p of pistas) assert.ok(!revelaSolucion(p, 5, ['3x + 5 = 20']), p);
    assert.equal(solucion[solucion.length - 1], 'x = 5');
  });

  test('cambian según el error detectado', () => {
    const conError = pistasPara('3x + 5 = 20', ['3x = 25'], pack);
    const sinError = pistasPara('3x + 5 = 20', [], pack);
    assert.notEqual(conError.pistas[0], sinError.pistas[0]);
    assert.equal(conError.error.tipo, TIPOS.SIGNO_TRANSPOSICION);
  });

  test('siguen al estudiante: después de 3x = 15 la pista es dividir', () => {
    const { pistas, paso } = pistasPara('3x + 5 = 20', ['3x = 15'], pack);
    assert.equal(paso, 'dividir');
    assert.match(pistas[1], /entre 3/);
    for (const p of pistas) assert.ok(!revelaSolucion(p, 5, ['3x + 5 = 20', '3x = 15']), p);
  });

  test('ningún ejercicio generado deja huecos ni revela la solución', () => {
    for (const tipo of Object.keys(PLAN_EJERCICIOS)) {
      for (const nivel of [1, 2, 3]) {
        const rng = createRng(`pistas-${tipo}-${nivel}`);
        for (let i = 0; i < 10; i++) {
          const e = generarEjercicio(tipo, nivel, rng);
          const { pistas } = pistasPara(e.ecuacion, [], pack);
          for (const p of pistas) {
            sinHuecos(p);
            assert.ok(!/x = \S+$/.test(p) || /▢/.test(p) || /\//.test(p) || /·/.test(p), p);
          }
        }
      }
    }
  });
});

describe('Pregunta orientadora', () => {
  test('cita el error real del estudiante (Ana)', () => {
    const ana = analizarProcedimiento(['3x + 5 = 20', '3x = 25', 'x = 25/3']);
    const q = preguntaOrientadora(TIPOS.SIGNO_TRANSPOSICION, { error: ana.error, ejercicio: 1 }, pack);
    assert.match(q.texto, /3x = 25/);
    assert.ok(q.basadaEnAlumno);
    const correcta = q.opciones.find((o) => o.correcta);
    assert.match(correcta.texto, /20 − 5/);
  });

  test('Ana y Luis reciben preguntas distintas', () => {
    const ana = analizarProcedimiento(['3x + 5 = 20', '3x = 25', 'x = 25/3']);
    const luis = analizarProcedimiento(['3x + 5 = 20', '3x = 15', 'x = 12']);
    const qa = preguntaOrientadora(ana.error.tipo, { error: ana.error, ejercicio: 1 }, pack);
    const ql = preguntaOrientadora(luis.error.tipo, { error: luis.error, ejercicio: 1 }, pack);
    assert.notEqual(qa.texto, ql.texto);
  });

  test('todas las rutas tienen exactamente una opción correcta, con o sin datos del estudiante', () => {
    for (const tipo of Object.values(TIPOS)) {
      const q = preguntaOrientadora(tipo, null, pack);
      sinHuecos(q.texto);
      assert.equal(q.opciones.filter((o) => o.correcta).length, 1, tipo);
      q.opciones.forEach((o) => {
        sinHuecos(o.texto);
        sinHuecos(o.retro);
      });
      assert.equal(new Set(q.opciones.map((o) => o.texto)).size, 3, `${tipo}: opciones repetidas`);
    }
  });
});

describe('Ruta adaptativa', () => {
  test('el error dominante decide la ruta; el no clasificado solo si no hay otro', () => {
    const r = resumirDiagnostico([
      { analisis: { estado: 'error', error: { tipo: TIPOS.NO_CLASIFICADO } } },
      { analisis: { estado: 'error', error: { tipo: TIPOS.SIGNO_TRANSPOSICION } } },
      { analisis: { estado: 'correcto' } },
      { analisis: { estado: 'error', error: { tipo: TIPOS.SIGNO_TRANSPOSICION } } },
    ]);
    assert.equal(r.dominante, TIPOS.SIGNO_TRANSPOSICION);
    assert.equal(r.correctos, 1);
    assert.equal(resumirDiagnostico([{ analisis: { estado: 'correcto' } }]).dominante, null);
  });

  test('3 ejercicios de práctica progresiva + comprobación, sin repetir', () => {
    const ruta = construirRuta(TIPOS.INVERSA_EQUIVOCADA, 'luis');
    assert.equal(ruta.practica.length, 3);
    assert.deepEqual(ruta.practica.map((e) => e.nivel), [1, 2, 3]);
    const todas = [...ruta.practica.map((e) => e.ecuacion), ruta.comprobacion.ecuacion];
    assert.equal(new Set(todas).size, 4);
    assert.deepEqual(construirRuta(TIPOS.INVERSA_EQUIVOCADA, 'luis'), ruta, 'misma semilla, misma ruta');
  });
});

describe('Respuestas preparadas', () => {
  test('responde según palabras clave y tiene respuesta por defecto', () => {
    assert.match(respuestaTecu('¿por qué el 5 pasa restando?', pack), /balanza/);
    assert.match(respuestaTecu('no entiendo nada', pack), /poquito a poco/);
    assert.equal(respuestaTecu('¿te gusta el café?', pack), pack.tecu.porDefecto);
  });

  test('sugerencia de llamada usa el ejercicio', () => {
    const t = sugerenciaLlamada(TIPOS.SIGNO_TRANSPOSICION, '2x - 7 = 9', pack);
    assert.match(t, /2x − 7 = 9/);
    sinHuecos(t);
  });

  test('rellenar quita claves sin dato', () => {
    assert.equal(rellenar('Hola {nombre} {nada}', { nombre: 'Ana' }), 'Hola Ana');
  });
});
