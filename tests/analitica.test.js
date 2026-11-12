import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TIPOS, analizarProcedimiento, ecuacion, pasosSolucion, procedimientoConError } from '../js/core/engine.js';
import { construirRuta } from '../js/core/ruta.js';
import { createRng } from '../js/core/rng.js';
import { explicarError, sugerenciaLlamada } from '../js/core/textos.js';
import {
  COMPROBACIONES_ATORADO,
  DIAS_INACTIVO,
  ERRORES_ATORADO,
  MOTIVOS,
  aQuienLlamar,
  gruposDeRefuerzo,
  resumirAlumnos,
  resumirGrupo,
} from '../js/data/analitica.js';

const pack = JSON.parse(readFileSync(new URL('../packs/ecuaciones-1.json', import.meta.url), 'utf8'));

const AHORA = Date.parse('2026-11-12T15:00:00.000Z');
const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const { SIGNO_TRANSPOSICION: SIGNO, INVERSA_EQUIVOCADA: INVERSA, TERMINOS_NO_SEMEJANTES: TERMINOS, NO_CLASIFICADO: NC } = TIPOS;
const DIAG = pack.diagnostico.map((d) => d.ecuacion);
/** Ejercicios de una ruta de Signos (los mismos que da construirRuta(SIGNO, 'x')). */
const PRACTICA = ['x + 3 = 10', '8x − 4 = 20', '4x + 6 = 2x + 18'];
const COMPROBACION = ['9x + 2 = 8x + 4', '5x + 3 = 2x + 15'];
const ESTADOS = ['sin_actividad', 'diagnostico', 'en_ruta', 'atorado', 'dominado', 'inactivo'];

const sinHuecos = (t) => {
  assert.equal(typeof t, 'string');
  assert.ok(t.length > 0, 'texto vacío');
  assert.ok(!/[{}]/.test(t) && !/undefined|null|NaN|\[object/.test(t), `texto con huecos: «${t}»`);
};
const errorEvento = (e) =>
  e
    ? {
        tipo: e.tipo,
        renglon: e.renglon,
        variante: e.detalle?.variante ?? null,
        texto: e.texto,
        anterior: e.anterior,
        confianza: e.confianza,
        detalle: JSON.parse(JSON.stringify(e.detalle ?? null)),
      }
    : null;

/**
 * Procedimiento como lo registra la vista del estudiante. Con `tipo`, lo escribe el motor
 * con ese error (o se usan `renglones` propios); sin `tipo`, la solución correcta.
 */
function procedimiento(ejercicio, tipo = null, renglones = null) {
  let lineas = renglones;
  if (!lineas && tipo) {
    const conError = procedimientoConError(ejercicio, tipo);
    assert.ok(conError, `el motor no pudo escribir ${tipo} en ${ejercicio}`);
    lineas = conError.slice(1);
  }
  if (!lineas) lineas = pasosSolucion(ecuacion(ejercicio)).map((p) => p.texto);
  const an = analizarProcedimiento([ejercicio, ...lineas]);
  if (tipo) assert.equal(an.error?.tipo, tipo, `${ejercicio}: se esperaba ${tipo}`);
  else assert.equal(an.estado, 'correcto', `${ejercicio}: se esperaba un procedimiento correcto`);
  const resultado = ['correcto', 'error', 'incompleto'].includes(an.estado) ? an.estado : 'sin_entender';
  return { ejercicio, renglones: lineas, resultado, error: errorEvento(an.estado === 'error' ? an.error : null) };
}

/**
 * Historial de un estudiante con fechas deterministas: empieza `dias` antes de AHORA y cada
 * evento va 10 minutos después del anterior. `en(d)` pone el reloj d días antes de AHORA.
 */
function estudiante(id, dias = 3) {
  let hace = dias * DIA;
  let n = 0;
  let practica = 0;
  const eventos = [];
  const e = {
    id,
    eventos,
    en(d) {
      hace = d * DIA;
      return e;
    },
    ev(tipo, extra = {}) {
      n += 1;
      eventos.push({
        id: `${id}-e${String(n).padStart(3, '0')}`,
        alumno: id,
        tipo,
        fecha: new Date(AHORA - hace).toISOString(),
        sincronizado: true,
        ...extra,
      });
      hace -= 10 * MINUTO;
      return e;
    },
    diagnostico(tipos) {
      tipos.forEach((t, i) =>
        e.ev('diagnostico', { ...procedimiento(DIAG[i], t), datos: { numero: i + 1, id: `d${i + 1}`, sinTerminar: false } }),
      );
      return e;
    },
    ruta(tipo) {
      return e.ev('ruta', { ruta: tipo, datos: { total: 4, sinErrores: tipo === null } });
    },
    pregunta(tipo) {
      return e.ev('pregunta', { ruta: tipo, aprobado: true, datos: { intentos: 1 } });
    },
    visual(tipo) {
      return e.ev('visual', { ruta: tipo, aprobado: true, datos: { omitida: false } });
    },
    practica(tipo, ejercicio, tipoError = null, extra = {}) {
      const p = procedimiento(ejercicio, tipoError, extra.renglones ?? null);
      e.ev('practica', { ruta: tipo, ...p, pistasUsadas: 0, pidioSolucion: false, datos: { numero: practica + 1 }, ...extra });
      if (p.resultado === 'correcto') practica += 1;
      return e;
    },
    practicas(tipo) {
      PRACTICA.forEach((ej) => e.practica(tipo, ej));
      return e;
    },
    comprobacion(tipo, ejercicio, tipoError = null) {
      const p = procedimiento(ejercicio, tipoError);
      return e.ev('comprobacion', { ruta: tipo, ...p, aprobado: p.resultado === 'correcto', pistasUsadas: 0, pidioSolucion: false });
    },
    dominio(tipo, ejercicio) {
      return e.ev('dominio', { ruta: tipo, ejercicio, aprobado: true, datos: { intentos: 1 } });
    },
    duda(dudaId, extra = {}) {
      return e.ev('duda', { datos: { dudaId, texto: '¿Por qué cambia el signo?', respondida: false, respuesta: null, ...extra } });
    },
  };
  return e;
}

/** Diagnóstico con 3 errores del tipo (uno bien) y la ruta asignada. */
const conRuta = (id, dias = 3, tipo = SIGNO) => estudiante(id, dias).diagnostico([tipo, null, tipo, tipo]).ruta(tipo);
/** Hizo la pregunta, la balanza y las 3 prácticas: le toca la comprobación sin ayuda. */
const listoParaComprobar = (id, dias = 3, tipo = SIGNO) => conRuta(id, dias, tipo).pregunta(tipo).visual(tipo).practicas(tipo);
/** Falló 2 comprobaciones sin ayuda con el error de signos. */
const atorado = (id, dias = 3) =>
  listoParaComprobar(id, dias).comprobacion(SIGNO, COMPROBACION[0], SIGNO).comprobacion(SIGNO, COMPROBACION[1], SIGNO);

const resumir = (eventos, opciones = {}) => resumirAlumnos(eventos, { ahora: AHORA, ...opciones });
const uno = (e, opciones) => {
  const lista = resumir(e.eventos, opciones);
  assert.equal(lista.length, 1);
  return lista[0];
};
const porId = (lista) => new Map(lista.map((r) => [r.id, r]));

describe('resumirAlumnos: estados', () => {
  test('sin_actividad: está en la lista del grupo pero no tiene eventos', () => {
    const [r] = resumir([], { nombres: { 'sim-01': 'Sofía M.' } });
    assert.equal(r.id, 'sim-01');
    assert.equal(r.nombre, 'Sofía M.');
    assert.equal(r.estado, 'sin_actividad');
    assert.equal(r.ultimaActividad, null);
    assert.equal(r.diasSinActividad, null);
    assert.equal(r.ultimoProcedimiento, null);
    assert.equal(r.errorDominante, null);
    assert.deepEqual(r.conteoErrores, {});
    assert.deepEqual(r.eventos, []);
    assert.deepEqual(r.comprobaciones, { intentos: 0, aprobadas: 0, falladas: 0 });
  });

  test('sin_actividad: solo escribió dudas (todavía no empieza el diagnóstico)', () => {
    const r = uno(estudiante('sim-01', 1).duda('d-1'));
    assert.equal(r.estado, 'sin_actividad');
    assert.equal(r.dudas.length, 1);
    assert.equal(r.diasSinActividad, 1);
  });

  test('diagnostico: lo empezó y no lo ha terminado', () => {
    const r = uno(estudiante('sim-01', 1).diagnostico([SIGNO, null]));
    assert.equal(r.estado, 'diagnostico');
    assert.deepEqual(r.diagnostico, { hechos: 2, total: 4, terminado: false });
    assert.equal(r.ruta, null);
    assert.equal(r.actividad, null);
  });

  test('en_ruta: terminó el diagnóstico y la actividad avanza con la ruta', () => {
    const e = conRuta('sim-01', 2);
    let r = uno(e);
    assert.equal(r.estado, 'en_ruta');
    assert.equal(r.ruta, SIGNO);
    assert.equal(r.actividad, 'pregunta');
    assert.equal(r.diagnostico.terminado, true);
    e.pregunta(SIGNO);
    assert.equal(uno(e).actividad, 'visual');
    e.visual(SIGNO);
    assert.equal(uno(e).actividad, 'practica');
    e.practicas(SIGNO);
    r = uno(e);
    assert.equal(r.actividad, 'comprobacion');
    assert.equal(r.estado, 'en_ruta');
  });

  test('en_ruta sin evento de ruta: con los 4 del diagnóstico basta y la ruta es la del motor', () => {
    const r = uno(estudiante('sim-01', 1).diagnostico([INVERSA, null, INVERSA, INVERSA]));
    assert.equal(r.estado, 'en_ruta');
    assert.equal(r.ruta, INVERSA);
    assert.equal(r.actividad, null);
  });

  test('en_ruta con la ruta general (diagnóstico sin errores): ruta null y le toca la comprobación', () => {
    const r = uno(estudiante('sim-01', 1).diagnostico([null, null, null, null]).ruta(null));
    assert.equal(r.estado, 'en_ruta');
    assert.equal(r.ruta, null);
    assert.equal(r.actividad, 'comprobacion');
    assert.equal(r.errorDominante, null);
  });

  test('dominado: por el evento dominio o por una comprobación aprobada', () => {
    const conDominio = listoParaComprobar('sim-01').comprobacion(SIGNO, COMPROBACION[0]).dominio(SIGNO, COMPROBACION[0]);
    const soloComprobacion = listoParaComprobar('sim-02').comprobacion(SIGNO, COMPROBACION[0]);
    const lista = porId(resumir([...conDominio.eventos, ...soloComprobacion.eventos]));
    assert.equal(lista.get('sim-01').estado, 'dominado');
    assert.equal(lista.get('sim-02').estado, 'dominado');
    assert.deepEqual(lista.get('sim-02').comprobaciones, { intentos: 1, aprobadas: 1, falladas: 0 });
  });

  test(`atorado: ${COMPROBACIONES_ATORADO} comprobaciones falladas sin ninguna aprobada; con 1 todavía no`, () => {
    const e = listoParaComprobar('sim-01').comprobacion(SIGNO, COMPROBACION[0], SIGNO);
    let r = uno(e);
    assert.equal(r.estado, 'en_ruta');
    assert.deepEqual(r.comprobaciones, { intentos: 1, aprobadas: 0, falladas: 1 });
    e.comprobacion(SIGNO, COMPROBACION[1], SIGNO);
    r = uno(e);
    assert.equal(r.estado, 'atorado');
    assert.deepEqual(r.comprobaciones, { intentos: 2, aprobadas: 0, falladas: 2 });
  });

  test('atorado: si después aprueba una comprobación, ya domina el tema', () => {
    const e = atorado('sim-01').comprobacion(SIGNO, '7x + 1 = 6x + 5').dominio(SIGNO, '7x + 1 = 6x + 5');
    const r = uno(e);
    assert.equal(r.estado, 'dominado');
    assert.deepEqual(r.comprobaciones, { intentos: 3, aprobadas: 1, falladas: 2 });
  });

  test(`atorado: ${ERRORES_ATORADO} errores del tipo dominante sin avanzar de actividad; con 3, o si avanzó, no`, () => {
    const repetir = (id, n) => {
      const e = conRuta(id).pregunta(SIGNO).visual(SIGNO);
      for (let i = 0; i < n; i++) e.practica(SIGNO, PRACTICA[0], SIGNO);
      return e;
    };
    const cuatro = repetir('sim-01', 4);
    const tres = repetir('sim-02', 3);
    const avanzo = repetir('sim-03', 2).practica(SIGNO, PRACTICA[0]).practica(SIGNO, PRACTICA[1], SIGNO).practica(SIGNO, PRACTICA[1], SIGNO);
    const lista = porId(resumir([...cuatro.eventos, ...tres.eventos, ...avanzo.eventos]));
    assert.equal(lista.get('sim-01').estado, 'atorado');
    assert.equal(lista.get('sim-01').erroresSinAvanzar, 4);
    assert.equal(lista.get('sim-01').actividad, 'practica');
    assert.equal(lista.get('sim-02').estado, 'en_ruta');
    assert.equal(lista.get('sim-02').erroresSinAvanzar, 3);
    assert.equal(lista.get('sim-03').estado, 'en_ruta');
    assert.equal(lista.get('sim-03').erroresSinAvanzar, 2);
    assert.equal(lista.get('sim-03').conteoErrores[SIGNO], 3 + 4);
  });

  test('los errores del diagnóstico no cuentan como «sin avanzar»', () => {
    const r = uno(estudiante('sim-01').diagnostico([SIGNO, SIGNO, SIGNO, SIGNO]).ruta(SIGNO));
    assert.equal(r.conteoErrores[SIGNO], 4);
    assert.equal(r.erroresSinAvanzar, 0);
    assert.equal(r.estado, 'en_ruta');
  });

  test(`inactivo: ${DIAS_INACTIVO} días completos sí; 6 días y 23 horas todavía no`, () => {
    const siete = conRuta('sim-01', 10).en(7).pregunta(SIGNO);
    const casi = conRuta('sim-02', 10).en(6 + 23 / 24).pregunta(SIGNO);
    const lista = porId(resumir([...siete.eventos, ...casi.eventos]));
    assert.equal(lista.get('sim-01').diasSinActividad, 7);
    assert.equal(lista.get('sim-01').estado, 'inactivo');
    assert.equal(lista.get('sim-02').diasSinActividad, 6);
    assert.equal(lista.get('sim-02').estado, 'en_ruta');
    assert.equal(lista.get('sim-01').ultimaActividad, new Date(AHORA - 7 * DIA).toISOString());
  });

  test('inactivo también si dejó el diagnóstico a medias o solo escribió dudas hace más de una semana', () => {
    const diag = estudiante('sim-01', 9).diagnostico([SIGNO]);
    const dudas = estudiante('sim-02', 12).duda('d-1');
    const lista = porId(resumir([...diag.eventos, ...dudas.eventos]));
    assert.equal(lista.get('sim-01').estado, 'inactivo');
    assert.equal(lista.get('sim-02').estado, 'inactivo');
  });

  test('dominado gana a inactivo; atorado también gana a inactivo', () => {
    const domino = listoParaComprobar('sim-01', 12).comprobacion(SIGNO, COMPROBACION[0]).dominio(SIGNO, COMPROBACION[0]);
    const atoro = atorado('sim-02', 12);
    const lista = porId(resumir([...domino.eventos, ...atoro.eventos]));
    assert.ok(lista.get('sim-01').diasSinActividad >= DIAS_INACTIVO);
    assert.equal(lista.get('sim-01').estado, 'dominado');
    assert.ok(lista.get('sim-02').diasSinActividad >= DIAS_INACTIVO);
    assert.equal(lista.get('sim-02').estado, 'atorado');
  });

  test('si borró su progreso y empezó otra vez, cuenta el intento actual (el historial se conserva)', () => {
    const e = listoParaComprobar('ana', 5).comprobacion(SIGNO, COMPROBACION[0]).dominio(SIGNO, COMPROBACION[0]);
    const antes = e.eventos.length;
    e.en(1).diagnostico([INVERSA, INVERSA]);
    const r = uno(e);
    assert.equal(r.estado, 'diagnostico');
    assert.equal(r.reinicios, 1);
    assert.deepEqual(r.diagnostico, { hechos: 2, total: 4, terminado: false });
    assert.deepEqual(r.conteoErrores, { [INVERSA]: 2 });
    assert.equal(r.errorDominante, INVERSA);
    assert.equal(r.comprobaciones.intentos, 0);
    assert.equal(r.eventos.length, antes + 2);
  });
});

describe('resumirAlumnos: conteos y ficha', () => {
  test('conteoErrores, error dominante (los clasificados antes que NO_CLASIFICADO) y porRevisar', () => {
    const e = estudiante('sim-01')
      .ev('diagnostico', { ...procedimiento(DIAG[0], NC, ['3x = 15', 'x = 99']), datos: { numero: 1 } })
      .ev('diagnostico', { ...procedimiento(DIAG[1], NC, ['x/4 = 3', 'x = 99']), datos: { numero: 2 } })
      .ev('diagnostico', { ...procedimiento(DIAG[2], SIGNO), datos: { numero: 3 } });
    const r = uno(e);
    assert.deepEqual(r.conteoErrores, { [NC]: 2, [SIGNO]: 1 });
    assert.equal(r.errorDominante, SIGNO);
    assert.equal(r.porRevisar, 2);

    const soloRevisar = uno(estudiante('sim-02').ev('diagnostico', { ...procedimiento(DIAG[0], NC, ['x = 99']), datos: { numero: 1 } }));
    assert.equal(soloRevisar.errorDominante, NC);
  });

  test('error dominante: en un empate gana el de su ruta', () => {
    const e = estudiante('sim-01').diagnostico([SIGNO, null, INVERSA, null]).ruta(INVERSA);
    const r = uno(e);
    assert.deepEqual(r.conteoErrores, { [SIGNO]: 1, [INVERSA]: 1 });
    assert.equal(r.errorDominante, INVERSA);
  });

  test('pistas: el máximo de cada ejercicio (el cuaderno manda el acumulado); soluciones sin duplicar', () => {
    const e = conRuta('sim-01').pregunta(SIGNO).visual(SIGNO)
      .practica(SIGNO, PRACTICA[0], SIGNO, { pistasUsadas: 1 })
      .ev('solucion', { ruta: SIGNO, ejercicio: PRACTICA[0], pidioSolucion: true, pistasUsadas: 2 })
      .practica(SIGNO, PRACTICA[0], null, { pistasUsadas: 2, pidioSolucion: true })
      .practica(SIGNO, PRACTICA[1], null, { pistasUsadas: 1 });
    const r = uno(e);
    assert.equal(r.pistasUsadas, 3);
    assert.equal(r.solucionesPedidas, 1);
  });

  test('ultimoProcedimiento: el más reciente con error, con su detalle para explicarError()', () => {
    const e = conRuta('sim-01').pregunta(SIGNO).visual(SIGNO).practica(SIGNO, PRACTICA[0], SIGNO).practica(SIGNO, PRACTICA[0]);
    const r = uno(e);
    const esperado = procedimiento(PRACTICA[0], SIGNO);
    assert.equal(r.ultimoProcedimiento.ejercicio, PRACTICA[0]);
    assert.deepEqual(r.ultimoProcedimiento.renglones, esperado.renglones);
    assert.equal(r.ultimoProcedimiento.tipoEvento, 'practica');
    assert.equal(r.ultimoProcedimiento.resultado, 'error');
    assert.deepEqual(r.ultimoProcedimiento.error, esperado.error);
    assert.ok(r.ultimoProcedimiento.error.detalle?.variante, 'conserva detalle');
    const texto = explicarError(r.ultimoProcedimiento.error, pack, 'docente');
    sinHuecos(texto);
    assert.ok(texto.length > 20);

    const sinErrores = uno(estudiante('sim-02').diagnostico([null, null]));
    assert.equal(sinErrores.ultimoProcedimiento.ejercicio, DIAG[1]);
    assert.equal(sinErrores.ultimoProcedimiento.error, null);
    assert.equal(sinErrores.ultimoProcedimiento.resultado, 'correcto');
  });

  test('dudas: una por duda (la versión más reciente) y en orden', () => {
    const e = estudiante('sim-01', 2)
      .duda('d-1')
      .duda('d-1', { respondida: true, respuesta: 'Porque haces lo mismo en los dos lados.' })
      .duda('d-2', { texto: 'No le entiendo a la balanza' });
    const r = uno(e);
    assert.equal(r.dudas.length, 2);
    assert.equal(r.dudas[0].datos.dudaId, 'd-1');
    assert.equal(r.dudas[0].datos.respondida, true);
    assert.equal(r.dudas[1].datos.dudaId, 'd-2');
  });
});

describe('resumirAlumnos: nombres y orden', () => {
  test('nombres del grupo (objeto, Map o lista), Ana, Luis, Invitado (QR) y respaldo', () => {
    const eventos = ['ana', 'luis', 'invitado', 'pedro', 'sim-09', 'sim-01'].flatMap((id) => estudiante(id, 1).duda(`d-${id}`).eventos);
    for (const nombres of [{ 'sim-01': 'Sofía M.' }, new Map([['sim-01', 'Sofía M.']]), [{ id: 'sim-01', nombre: 'Sofía M.' }]]) {
      const lista = porId(resumir(eventos, { nombres }));
      assert.equal(lista.get('ana').nombre, 'Ana');
      assert.equal(lista.get('luis').nombre, 'Luis');
      assert.equal(lista.get('invitado').nombre, 'Invitado (QR)');
      assert.equal(lista.get('pedro').nombre, 'Pedro');
      assert.equal(lista.get('sim-09').nombre, 'Estudiante 09');
      assert.equal(lista.get('sim-01').nombre, 'Sofía M.');
    }
    const lista = porId(resumir(eventos));
    assert.equal(lista.get('ana').enVivo, true);
    assert.equal(lista.get('ana').simulado, false);
    assert.equal(lista.get('sim-01').enVivo, false);
    assert.equal(lista.get('sim-01').simulado, true);
  });

  test('orden: en vivo primero; luego atorado, por revisar, inactivo, sin actividad, diagnóstico, en ruta y dominado', () => {
    const eventos = [
      ...conRuta('luis', 1, INVERSA).eventos,
      ...atorado('ana', 2).eventos,
      ...listoParaComprobar('sim-01').comprobacion(SIGNO, COMPROBACION[0]).eventos,
      ...atorado('sim-02').eventos,
      ...conRuta('sim-03').practica(SIGNO, PRACTICA[0], NC, { renglones: ['x = 99'] }).eventos,
      ...conRuta('sim-04', 9).eventos,
      ...estudiante('sim-06', 1).diagnostico([SIGNO]).eventos,
      ...conRuta('sim-07', 1).eventos,
    ];
    const nombres = { 'sim-01': 'Abril', 'sim-02': 'Bruno', 'sim-03': 'Carla', 'sim-04': 'Darío', 'sim-05': 'Elena', 'sim-06': 'Fer', 'sim-07': 'Gael' };
    const lista = resumir(eventos, { nombres });
    assert.deepEqual(
      lista.map((r) => `${r.id}:${r.estado}`),
      [
        'ana:atorado',
        'luis:en_ruta',
        'sim-02:atorado',
        'sim-03:en_ruta',
        'sim-04:inactivo',
        'sim-05:sin_actividad',
        'sim-06:diagnostico',
        'sim-07:en_ruta',
        'sim-01:dominado',
      ],
    );
    assert.equal(lista.find((r) => r.id === 'sim-03').porRevisar, 1);
  });
});

describe('resumirAlumnos: robustez', () => {
  const base = () => [
    ...atorado('sim-01').eventos,
    ...conRuta('sim-02', 9, INVERSA).eventos,
    ...estudiante('sim-03', 1).diagnostico([SIGNO, null]).duda('d-1').eventos,
    ...listoParaComprobar('ana', 2).comprobacion(SIGNO, COMPROBACION[0]).dominio(SIGNO, COMPROBACION[0]).eventos,
  ];

  test('los duplicados por id cuentan una sola vez', () => {
    const eventos = base();
    const una = resumir(eventos);
    const dos = resumir([...eventos, ...eventos.map((e) => ({ ...e }))]);
    assert.equal(JSON.stringify(dos), JSON.stringify(una));
    assert.equal(dos.find((r) => r.id === 'sim-01').comprobaciones.intentos, 2);
  });

  test('el orden de llegada no importa', () => {
    const eventos = base();
    const esperado = JSON.stringify(resumir(eventos));
    assert.equal(JSON.stringify(resumir([...eventos].reverse())), esperado);
    assert.equal(JSON.stringify(resumir(createRng('barajar').shuffle(eventos))), esperado);
  });

  test('eventos raros, campos faltantes o tipos desconocidos no tumban nada', () => {
    const raros = [
      null,
      undefined,
      42,
      'texto',
      [],
      {},
      { alumno: '', tipo: 'practica' },
      { alumno: 'fantasma', tipo: 'desconocido', fecha: new Date(AHORA).toISOString() },
      { alumno: 'sim-01', tipo: 'practica', fecha: 'ayer', renglones: 'no', error: 'feo', pistasUsadas: 'muchas', datos: 7 },
      { alumno: 'sim-01', tipo: 'diagnostico', ejercicio: 3, error: { tipo: 'INVENTADO' }, datos: { numero: 'uno' } },
      { alumno: 'sim-01', tipo: 'comprobacion', resultado: 'error' },
      { alumno: 'sim-01', tipo: 'ruta', ruta: 42, datos: null },
      { alumno: 'sim-01', tipo: 'practica', pistasUsadas: -3, pidioSolucion: 'sí', renglones: [null, 5, 'x = 1'] },
      { alumno: 7, tipo: 'duda', fecha: new Date(AHORA - DIA).toISOString(), datos: { dudaId: null } },
    ];
    const lista = porId(resumir(raros, { nombres: 'no es tabla' }));
    assert.deepEqual([...lista.keys()].sort(), ['7', 'sim-01']);
    const r = lista.get('sim-01');
    assert.ok(ESTADOS.includes(r.estado));
    assert.equal(r.conteoErrores[NC], 2);
    assert.equal(r.ultimaActividad, null);
    assert.equal(r.diasSinActividad, null);
    assert.equal(r.pistasUsadas, 0);
    assert.equal(lista.get('7').dudas.length, 1);

    for (const entrada of [undefined, null, 'x', 5, {}]) assert.deepEqual(resumirAlumnos(entrada, null), []);
    const todos = resumir([...base(), ...raros]);
    assert.doesNotThrow(() => resumirGrupo(todos));
    assert.doesNotThrow(() => aQuienLlamar(todos, pack, { ahora: AHORA }));
    assert.doesNotThrow(() => gruposDeRefuerzo(todos, pack, { semilla: 's' }));
    for (const entrada of [undefined, null, 'x', [null, 3, {}]]) {
      assert.equal(resumirGrupo(entrada).total, entrada?.length === 3 ? 1 : 0);
      assert.ok(Array.isArray(aQuienLlamar(entrada, pack)));
      assert.deepEqual(gruposDeRefuerzo(entrada, pack), []);
    }
  });

  test('un error marcado sin decir cuál se vuelve a diagnosticar con el motor', () => {
    const { error, ...sinError } = procedimiento(PRACTICA[1], SIGNO);
    assert.ok(error);
    const r = uno(conRuta('sim-01').ev('practica', { ruta: SIGNO, ...sinError }));
    assert.equal(r.conteoErrores[SIGNO], 3 + 1);
    assert.equal(r.ultimoProcedimiento.error.tipo, SIGNO);
  });

  test('no modifica los eventos que recibe', () => {
    const eventos = base();
    const copia = JSON.stringify(eventos);
    const resumenes = resumir(eventos);
    resumirGrupo(resumenes);
    aQuienLlamar(resumenes, pack, { ahora: AHORA });
    gruposDeRefuerzo(resumenes, pack, { semilla: 's' });
    assert.equal(JSON.stringify(eventos), copia);
  });

  test('rendimiento: 30 estudiantes con ~40 eventos cada uno en menos de 20 ms', () => {
    const diag = DIAG.map((d, i) => procedimiento(d, i === 1 ? null : SIGNO));
    const mal = procedimiento(PRACTICA[0], SIGNO);
    const bien = PRACTICA.map((p) => procedimiento(p));
    const comprobacion = procedimiento(COMPROBACION[0], SIGNO);
    const eventos = [];
    const nombres = {};
    for (let k = 1; k <= 30; k++) {
      const id = `sim-${String(k).padStart(2, '0')}`;
      nombres[id] = `Estudiante ${k}`;
      let hace = 13 * DIA - k * HORA;
      const ev = (tipo, extra) => {
        eventos.push({ id: `${id}-e${eventos.length}`, alumno: id, tipo, fecha: new Date(AHORA - hace).toISOString(), sincronizado: true, ...extra });
        hace -= (k % 4 === 0 ? 4 * HORA : 15 * MINUTO);
      };
      diag.forEach((p, i) => ev('diagnostico', { ...p, datos: { numero: i + 1 } }));
      ev('ruta', { ruta: SIGNO, datos: { total: 4 } });
      ev('pregunta', { ruta: SIGNO, aprobado: true });
      ev('visual', { ruta: SIGNO, aprobado: true });
      for (let i = 0; i < 28; i++) {
        const p = i % 3 === 0 ? mal : bien[i % 3];
        ev('practica', { ruta: SIGNO, ...p, pistasUsadas: i % 4, pidioSolucion: i % 9 === 0, datos: { numero: 1 + (i % 3) } });
      }
      ev('solucion', { ruta: SIGNO, ejercicio: PRACTICA[0], pidioSolucion: true, pistasUsadas: 3 });
      ev('comprobacion', { ruta: SIGNO, ...comprobacion, aprobado: false });
      if (k % 3) ev('comprobacion', { ruta: SIGNO, ...comprobacion, aprobado: false });
      ev('duda', { datos: { dudaId: `${id}-d1`, texto: 'No entiendo', respondida: false } });
    }
    assert.ok(eventos.length >= 30 * 38, `${eventos.length} eventos`);
    const panel = () => {
      const resumenes = resumirAlumnos(eventos, { ahora: AHORA, nombres });
      resumirGrupo(resumenes);
      aQuienLlamar(resumenes, pack, { ahora: AHORA });
      gruposDeRefuerzo(resumenes, pack, { semilla: 's' });
      return resumenes;
    };
    panel();
    panel(); // calentar
    const tiempos = [];
    for (let i = 0; i < 7; i++) {
      const t0 = performance.now();
      panel();
      tiempos.push(performance.now() - t0);
    }
    tiempos.sort((a, b) => a - b);
    const mediana = tiempos[3];
    assert.ok(mediana < 20, `el panel tardó ${mediana.toFixed(1)} ms (mediana)`);
  });
});

describe('resumirGrupo', () => {
  test('indicadores: total, activos de la semana (6 vs 7 días), dominados y por revisar', () => {
    const eventos = [
      ...conRuta('sim-01', 10).en(6 + 23 / 24).pregunta(SIGNO).eventos, // activo (6 días)
      ...conRuta('sim-02', 10).en(7).pregunta(SIGNO).eventos, // inactivo (7 días)
      ...listoParaComprobar('sim-03', 2).comprobacion(SIGNO, COMPROBACION[0]).eventos, // dominado
      ...conRuta('sim-04', 1).practica(SIGNO, PRACTICA[0], NC, { renglones: ['x = 99'] }).eventos, // por revisar
      ...listoParaComprobar('sim-05', 2)
        .practica(SIGNO, PRACTICA[0], NC, { renglones: ['x = 99'] })
        .comprobacion(SIGNO, COMPROBACION[0]).eventos, // dominó: ya no está por revisar
    ];
    const g = resumirGrupo(resumir(eventos, { nombres: { 'sim-06': 'Sin entrar' } }));
    assert.equal(g.total, 6);
    assert.equal(g.activosSemana, 4);
    assert.equal(g.dominados, 2);
    assert.equal(g.porRevisar, 1);
    assert.equal(g.erroresPorRevisar, 1);
    assert.deepEqual(g.porEstado, { sin_actividad: 1, diagnostico: 0, en_ruta: 2, atorado: 0, dominado: 2, inactivo: 1 });
  });

  test('lo que más se repite: estudiantes con ese error dominante y veces en todo el grupo, sin NO_CLASIFICADO', () => {
    const eventos = [
      ...conRuta('sim-01', 2, SIGNO).eventos, // SIGNO ×3
      ...conRuta('sim-02', 2, SIGNO).eventos, // SIGNO ×3
      ...conRuta('sim-03', 2, INVERSA).practica(INVERSA, '4x = 20', INVERSA).eventos, // INVERSA ×4
      ...estudiante('sim-04', 2).diagnostico([SIGNO, null, INVERSA, INVERSA]).eventos, // INVERSA ×2, SIGNO ×1
      ...estudiante('sim-05', 2).ev('diagnostico', { ...procedimiento(DIAG[0], NC, ['x = 99']), datos: { numero: 1 } }).eventos,
    ];
    const g = resumirGrupo(resumir(eventos));
    assert.deepEqual(g.masRepetidos, [
      { tipo: INVERSA, alumnos: 2, ocurrencias: 6 },
      { tipo: SIGNO, alumnos: 2, ocurrencias: 7 },
    ].sort((a, b) => b.alumnos - a.alumnos || b.ocurrencias - a.ocurrencias));
    assert.equal(g.masRepetidos[0].tipo, SIGNO, 'en un empate de estudiantes gana el que más veces apareció');
    assert.ok(!g.masRepetidos.some((m) => m.tipo === NC));
  });
});

describe('aQuienLlamar', () => {
  const clase = () => {
    const eventos = [
      ...conRuta('sim-01', 2).eventos, // va bien: no se llama
      ...atorado('sim-02').eventos,
      ...conRuta('sim-03', 2).practica(SIGNO, PRACTICA[0], NC, { renglones: ['x = 99'] }).eventos,
      ...conRuta('sim-04', 12, INVERSA).pregunta(INVERSA).visual(INVERSA).en(9).practica(INVERSA, '4x = 20', INVERSA).eventos,
      ...listoParaComprobar('sim-06', 2).comprobacion(SIGNO, COMPROBACION[0]).eventos, // dominó: no se llama
    ];
    const nombres = { 'sim-01': 'Abril', 'sim-02': 'Bruno', 'sim-03': 'Carla', 'sim-04': 'Darío', 'sim-05': 'Elena', 'sim-06': 'Fer' };
    return resumir(eventos, { nombres });
  };

  test('prioridad: atorado > por revisar > inactivo > sin diagnóstico; quien domina o va bien no aparece', () => {
    const lista = aQuienLlamar(clase(), pack, { ahora: AHORA });
    assert.deepEqual(
      lista.map((l) => [l.alumno.id, l.motivo, l.prioridad]),
      [
        ['sim-02', 'atorado', 1],
        ['sim-03', 'por_revisar', 2],
        ['sim-04', 'inactivo', 3],
        ['sim-05', 'sin_diagnostico', 4],
      ],
    );
    assert.deepEqual(MOTIVOS, ['atorado', 'por_revisar', 'inactivo', 'sin_diagnostico']);
  });

  test('el detalle dice el porqué en una línea', () => {
    const [atoro, revisar, inactivo, sinDiag] = aQuienLlamar(clase(), pack, { ahora: AHORA });
    assert.equal(atoro.detalle, 'Falló 2 veces la comprobación sin ayuda de Signos');
    assert.equal(revisar.detalle, `Tecu no pudo clasificar su error en ${PRACTICA[0]}`);
    assert.equal(inactivo.detalle, 'No entra desde hace 9 días; se quedó en la práctica (ruta de Inversa)');
    assert.equal(sinDiag.detalle, 'No ha empezado el diagnóstico');
    for (const l of [atoro, revisar, inactivo, sinDiag]) assert.ok(!l.detalle.includes('\n'));
  });

  test('cada sugerencia es texto completo con un ejercicio concreto', () => {
    const lista = aQuienLlamar(clase(), pack, { ahora: AHORA });
    for (const l of lista) {
      sinHuecos(l.detalle);
      sinHuecos(l.sugerencia);
      assert.equal(analizarProcedimiento([l.ejercicio]).estado, 'incompleto', `«${l.ejercicio}» no es un ejercicio`);
      assert.ok(l.sugerencia.includes(l.ejercicio), `la sugerencia no trae el ejercicio: «${l.sugerencia}»`);
    }
    const [atoro, revisar, inactivo, sinDiag] = lista;
    // Atorado: su última comprobación fallada, con la sugerencia del paquete para su error.
    assert.equal(atoro.ejercicio, COMPROBACION[1]);
    assert.equal(atoro.tipo, SIGNO);
    assert.equal(atoro.sugerencia, sugerenciaLlamada(SIGNO, COMPROBACION[1], pack));
    sinHuecos(atoro.explicacion);
    // Por revisar: el ejercicio que Tecu no pudo clasificar.
    assert.equal(revisar.sugerencia, sugerenciaLlamada(NC, PRACTICA[0], pack));
    // Inactivo: el texto del paquete y el último ejercicio que no le salió.
    assert.ok(inactivo.sugerencia.startsWith('No ha entrado en 9 días.'), inactivo.sugerencia);
    assert.ok(inactivo.sugerencia.includes('cuadernillo impreso de ecuaciones lineales'), inactivo.sugerencia);
    assert.equal(inactivo.ejercicio, '4x = 20');
    // Sin diagnóstico: el texto del paquete y el primer ejercicio del diagnóstico.
    assert.ok(sinDiag.sugerencia.startsWith(pack.llamadas.sin_diagnostico), sinDiag.sugerencia);
    assert.equal(sinDiag.ejercicio, DIAG[0]);
  });

  test('sin pack.llamadas usa un respaldo local claro', () => {
    const { llamadas, ...sinLlamadas } = pack;
    assert.ok(llamadas);
    const lista = aQuienLlamar(clase(), sinLlamadas, { ahora: AHORA });
    for (const l of lista) {
      sinHuecos(l.sugerencia);
      assert.ok(l.sugerencia.includes(l.ejercicio));
    }
    assert.ok(lista.find((l) => l.motivo === 'inactivo').sugerencia.startsWith('No ha entrado en 9 días.'));
  });

  test('max limita la lista (6 por omisión) y la prioridad va de 1 a n', () => {
    const eventos = [];
    for (let k = 1; k <= 9; k++) eventos.push(...atorado(`sim-0${k}`).eventos);
    const resumenes = resumir(eventos);
    const seis = aQuienLlamar(resumenes, pack, { ahora: AHORA });
    assert.equal(seis.length, 6);
    assert.deepEqual(seis.map((l) => l.prioridad), [1, 2, 3, 4, 5, 6]);
    assert.equal(aQuienLlamar(resumenes, pack, { ahora: AHORA, max: 2 }).length, 2);
    assert.equal(aQuienLlamar(resumenes, pack, { max: Infinity }).length, 9);
    assert.equal(aQuienLlamar(resumenes, pack, { max: 0 }).length, 0);
  });

  test('atorado por errores repetidos y atorado que además dejó de entrar', () => {
    const repite = conRuta('sim-01').pregunta(SIGNO).visual(SIGNO);
    for (let i = 0; i < 4; i++) repite.practica(SIGNO, PRACTICA[0], SIGNO);
    const ausente = atorado('sim-02', 10);
    const lista = aQuienLlamar(resumir([...repite.eventos, ...ausente.eventos]), pack, { ahora: AHORA });
    const porAlumno = new Map(lista.map((l) => [l.alumno.id, l]));
    assert.equal(porAlumno.get('sim-01').detalle, 'Lleva 4 errores de Signos sin avanzar en la práctica');
    assert.equal(porAlumno.get('sim-01').ejercicio, PRACTICA[0]);
    assert.match(porAlumno.get('sim-02').detalle, /^Falló 2 veces la comprobación sin ayuda de Signos; no entra desde hace \d+ días$/);
  });

  test('con otro «ahora» recalcula los días sin entrar', () => {
    const resumenes = resumir(conRuta('sim-01', 2).eventos);
    assert.equal(aQuienLlamar(resumenes, pack, { ahora: AHORA }).length, 0);
    const despues = aQuienLlamar(resumenes, pack, { ahora: AHORA + 8 * DIA });
    assert.equal(despues.length, 1);
    assert.equal(despues[0].motivo, 'inactivo');
    assert.equal(despues[0].detalle, 'No entra desde hace 9 días; se quedó en la pregunta de Tecu (ruta de Signos)');
  });
});

describe('gruposDeRefuerzo', () => {
  const clase = () =>
    resumir(
      [
        ...conRuta('sim-01', 2, SIGNO).eventos,
        ...atorado('sim-02').eventos,
        ...conRuta('sim-03', 9, SIGNO).eventos, // inactivo: también recibe el cuadernillo
        ...conRuta('sim-04', 2, INVERSA).eventos,
        ...conRuta('sim-05', 2, INVERSA).eventos,
        ...conRuta('sim-06', 2, TERMINOS).eventos, // solo uno: no forma grupo
        ...listoParaComprobar('sim-07', 2, SIGNO).comprobacion(SIGNO, COMPROBACION[0]).eventos, // ya domina
      ],
      { nombres: { 'sim-01': 'Zoe', 'sim-02': 'Ana Sofía', 'sim-03': 'Mateo', 'sim-04': 'Íker', 'sim-05': 'Emma', 'sim-06': 'Leo', 'sim-07': 'Ian' } },
    );

  test('agrupa por error dominante (mínimo 2), del más grande al más chico, sin quien ya domina', () => {
    const grupos = gruposDeRefuerzo(clase(), pack, { semilla: 'semana-46' });
    assert.deepEqual(
      grupos.map((g) => [g.tipo, g.alumnos.map((a) => a.nombre)]),
      [
        [SIGNO, ['Ana Sofía', 'Mateo', 'Zoe']],
        [INVERSA, ['Emma', 'Íker']],
      ],
    );
  });

  test('nombre y actividad del paquete; 3 ejercicios de niveles 1 a 3 de construirRuta(tipo, semilla + tipo)', () => {
    const grupos = gruposDeRefuerzo(clase(), pack, { semilla: 'semana-46' });
    for (const g of grupos) {
      assert.equal(g.nombre, pack.errores[g.tipo].nombre);
      assert.equal(g.actividad, pack.errores[g.tipo].actividadGrupo);
      sinHuecos(g.actividad);
      assert.deepEqual(g.ejercicios.map((e) => e.nivel), [1, 2, 3]);
      const plan = construirRuta(g.tipo, `semana-46${g.tipo}`, DIAG);
      assert.deepEqual(g.ejercicios.map((e) => e.ecuacion), plan.practica.map((e) => e.ecuacion));
      for (const e of g.ejercicios) {
        assert.equal(analizarProcedimiento([e.ecuacion, `x = ${e.solucion}`]).estado, 'correcto', e.ecuacion);
        assert.ok(!DIAG.includes(e.ecuacion), 'no repite el diagnóstico');
      }
    }
  });

  test('misma semilla, mismos ejercicios; otra semilla, otro cuadernillo', () => {
    const resumenes = clase();
    const a = gruposDeRefuerzo(resumenes, pack, { semilla: 'semana-46' });
    const b = gruposDeRefuerzo(resumenes, pack, { semilla: 'semana-46' });
    const c = gruposDeRefuerzo(resumenes, pack, { semilla: 'semana-47' });
    const ejercicios = (gs) => gs.flatMap((g) => g.ejercicios.map((e) => e.ecuacion));
    assert.deepEqual(ejercicios(a), ejercicios(b));
    assert.notDeepEqual(ejercicios(a), ejercicios(c));
  });
});
