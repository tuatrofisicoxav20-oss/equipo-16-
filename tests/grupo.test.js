/**
 * Grupo simulado del panel docente (js/data/grupo.js): 28 estudiantes ficticios cuyos
 * procedimientos escribe el motor y que se vuelven a diagnosticar igual.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generarGrupo, SEMILLA_GRUPO, NOMBRES_GRUPO, PESOS_ERRORES } from '../js/data/grupo.js';
import { TIPOS, analizarProcedimiento, ecuacion, pasosSolucion, procedimientoConError } from '../js/core/engine.js';
import { construirRuta, resumirDiagnostico } from '../js/core/ruta.js';
import { respuestaTecu } from '../js/core/textos.js';

const pack = JSON.parse(readFileSync(new URL('../packs/ecuaciones-1.json', import.meta.url), 'utf8'));
const AHORA = Date.parse('2026-11-12T18:30:00Z'); // 12:30 en Veracruz
const DIA = 24 * 60 * 60 * 1000;
const DIAGNOSTICO = pack.diagnostico.map((d) => d.ecuacion);

// Primera generación del archivo, con el motor en frío (para la prueba de rendimiento).
const inicio = performance.now();
const GRUPO = generarGrupo({ ahora: AHORA, pack });
const MS_EN_FRIO = performance.now() - inicio;

const SEMILLAS = [SEMILLA_GRUPO, 'otra-escuela', 'semilla-7', 42];
const grupos = new Map([[SEMILLA_GRUPO, GRUPO]]);
/** Grupo de una semilla (memorizado: cada uno tarda unas decenas de ms). */
function grupoDe(semilla) {
  if (!grupos.has(semilla)) grupos.set(semilla, generarGrupo({ semilla, ahora: AHORA, pack }));
  return grupos.get(semilla);
}

const TIPOS_EVENTO = ['diagnostico', 'practica', 'comprobacion', 'pregunta', 'visual', 'ruta', 'dominio', 'duda', 'solucion', 'libre'];
const RESULTADOS = ['correcto', 'error', 'incompleto', 'sin_entender'];
const CAMPOS_ERROR = ['tipo', 'renglon', 'variante', 'texto', 'anterior', 'confianza', 'detalle'];

/** @returns {Map<string, object[]>} eventos de cada alumno, en el orden del arreglo */
function porAlumno(grupo) {
  const mapa = new Map(grupo.alumnos.map((a) => [a.id, []]));
  for (const evento of grupo.eventos) mapa.get(evento.alumno).push(evento);
  return mapa;
}

/** Estado con las definiciones del panel docente (lo que deduce la analítica de los eventos). */
function estadoDe(eventos, ahora = AHORA) {
  if (!eventos.length) return 'sin_actividad';
  const comprobaciones = eventos.filter((e) => e.tipo === 'comprobacion');
  if (eventos.some((e) => e.tipo === 'dominio')) return 'dominado';
  if (comprobaciones.filter((e) => !e.aprobado).length >= 2 && !comprobaciones.some((e) => e.aprobado)) return 'atorado';
  if (ahora - Date.parse(eventos.at(-1).fecha) >= 8 * DIA) return 'inactivo';
  if (eventos.some((e) => e.tipo === 'ruta')) return 'en_ruta';
  return 'diagnostico';
}

const analizar = (e) => analizarProcedimiento([e.ejercicio, ...e.renglones]);
const diagnosticos = (eventos) => eventos.filter((e) => e.tipo === 'diagnostico');
const resumenDe = (eventos) => resumirDiagnostico(diagnosticos(eventos).map((e) => ({ analisis: analizar(e) })));

function contar(valores) {
  const conteo = {};
  for (const v of valores) conteo[v] = (conteo[v] || 0) + 1;
  return conteo;
}

/** Lo que la vista del estudiante guarda en `error` (errorEvento + detalle). */
function errorEsperado(analisis) {
  if (analisis.estado !== 'error') return null;
  const e = analisis.error;
  return {
    tipo: e.tipo,
    renglon: e.renglon,
    variante: e.detalle?.variante ?? null,
    texto: e.texto,
    anterior: e.anterior,
    confianza: e.confianza,
    detalle: JSON.parse(JSON.stringify(e.detalle ?? null)),
  };
}

describe('Alumnos', () => {
  test('son 28, con ids sim-01…sim-28 y nombres únicos (los de NOMBRES_GRUPO)', () => {
    const { alumnos } = GRUPO;
    assert.equal(alumnos.length, 28);
    assert.deepEqual(
      alumnos.map((a) => a.id),
      Array.from({ length: 28 }, (_, i) => `sim-${String(i + 1).padStart(2, '0')}`),
    );
    assert.equal(new Set(alumnos.map((a) => a.nombre)).size, 28);
    assert.deepEqual(alumnos.map((a) => a.nombre), [...NOMBRES_GRUPO]);
    for (const a of alumnos) assert.deepEqual(Object.keys(a).sort(), ['id', 'nombre', 'simulado'].sort());
    assert.ok(alumnos.every((a) => a.simulado === true));
  });

  test('nombres comunes con inicial del apellido, sin Ana ni Luis (son los del pitch)', () => {
    assert.equal(NOMBRES_GRUPO.length, 28);
    const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (const nombre of NOMBRES_GRUPO) {
      assert.match(nombre, /^\p{Lu}\p{Ll}+ \p{Lu}\.$/u, nombre);
      assert.doesNotMatch(sinAcentos(nombre), /ana|luis/, nombre);
    }
    assert.equal(new Set(NOMBRES_GRUPO.map((n) => n.split(' ')[0])).size, 28, 'nombres de pila repetidos');
  });
});

describe('Determinismo', () => {
  test('misma semilla y mismo ahora ⇒ exactamente el mismo grupo', () => {
    assert.deepEqual(generarGrupo({ semilla: SEMILLA_GRUPO, ahora: AHORA, pack }), GRUPO);
  });

  test('ahora como Date o como texto ISO da lo mismo que en milisegundos', () => {
    assert.deepEqual(generarGrupo({ ahora: new Date(AHORA), pack }), GRUPO);
    assert.deepEqual(generarGrupo({ ahora: new Date(AHORA).toISOString(), pack }), GRUPO);
  });

  test('otra semilla ⇒ otros perfiles, mismos alumnos y mismas cuotas', () => {
    const otro = grupoDe('otra-escuela');
    assert.deepEqual(otro.alumnos, GRUPO.alumnos);
    assert.notDeepEqual(otro.eventos, GRUPO.eventos);
    const estados = (g) => contar([...porAlumno(g).values()].map((ev) => estadoDe(ev)));
    assert.deepEqual(estados(otro), estados(GRUPO));
  });

  test('no usa Math.random ni Date.now por dentro', () => {
    const { random } = Math;
    const { now } = Date;
    Math.random = () => assert.fail('usó Math.random');
    Date.now = () => assert.fail('usó Date.now');
    try {
      assert.deepEqual(generarGrupo({ ahora: AHORA, pack }), GRUPO);
    } finally {
      Math.random = random;
      Date.now = now;
    }
  });

  test('no modifica el paquete (el panel lo comparte)', () => {
    const copia = JSON.parse(JSON.stringify(pack));
    generarGrupo({ semilla: 'otra-escuela', ahora: AHORA, pack });
    assert.deepEqual(pack, copia);
  });

  test('sin paquete o con una fecha inválida lanza un TypeError claro', () => {
    assert.throws(() => generarGrupo({ ahora: AHORA }), TypeError);
    assert.throws(() => generarGrupo({ ahora: AHORA, pack: {} }), TypeError);
    assert.throws(() => generarGrupo({ ahora: 'ayer', pack }), TypeError);
    assert.throws(() => generarGrupo({ ahora: null, pack }), TypeError);
  });
});

describe('Estados del grupo (deducidos de los eventos)', () => {
  for (const semilla of SEMILLAS) {
    test(`semilla ${JSON.stringify(semilla)}: cubre todos los estados con los mínimos pedidos`, () => {
      const estados = contar([...porAlumno(grupoDe(semilla)).values()].map((ev) => estadoDe(ev)));
      assert.ok(estados.dominado >= 3, `dominados: ${estados.dominado}`);
      assert.ok(estados.atorado >= 3, `atorados: ${estados.atorado}`);
      assert.ok(estados.inactivo >= 3, `inactivos: ${estados.inactivo}`);
      assert.ok(estados.sin_actividad >= 2, `sin diagnóstico: ${estados.sin_actividad}`);
      assert.ok(estados.en_ruta >= 5, `en ruta: ${estados.en_ruta}`);
      assert.ok(estados.diagnostico >= 1, `diagnóstico a medias: ${estados.diagnostico}`);
      // El reparto planeado: 2 sin actividad, 3 a medias, 11 en ruta, 3 atorados, 5 dominados, 4 inactivos.
      assert.deepEqual(estados, { sin_actividad: 2, diagnostico: 3, en_ruta: 11, atorado: 3, dominado: 5, inactivo: 4 });
    });
  }

  test('1 o 2 estudiantes tienen un renglón NO_CLASIFICADO (el docente los ve "por revisar")', () => {
    for (const semilla of SEMILLAS) {
      const conNc = [...porAlumno(grupoDe(semilla)).values()].filter((ev) => ev.some((e) => e.error?.tipo === TIPOS.NO_CLASIFICADO));
      assert.ok(conNc.length >= 1 && conNc.length <= 2, `semilla ${semilla}: ${conNc.length}`);
      // Están activos (no inactivos), para que aparezcan en "a quién llamar".
      for (const ev of conNc) assert.notEqual(estadoDe(ev), 'inactivo');
    }
  });

  test('sin diagnóstico = sin eventos; a medias = 1 a 3 ejercicios y sin ruta', () => {
    for (const eventos of porAlumno(GRUPO).values()) {
      const estado = estadoDe(eventos);
      const n = diagnosticos(eventos).length;
      if (estado === 'sin_actividad') assert.equal(eventos.length, 0);
      if (!eventos.some((e) => e.tipo === 'ruta')) assert.ok(n <= 3, `${n} ejercicios y sin ruta`);
      if (estado === 'diagnostico') assert.ok(n >= 1 && n <= 3);
    }
  });

  test('atorados: ≥ 2 comprobaciones falladas sin ayuda y ninguna aprobada; dominados: aprobada + dominio', () => {
    for (const [id, eventos] of porAlumno(GRUPO)) {
      const estado = estadoDe(eventos);
      const comprobaciones = eventos.filter((e) => e.tipo === 'comprobacion');
      const dominio = eventos.filter((e) => e.tipo === 'dominio');
      if (estado === 'atorado') {
        assert.ok(comprobaciones.length >= 2 && comprobaciones.every((c) => !c.aprobado), id);
        assert.ok(comprobaciones.every((c) => c.resultado !== 'correcto'), id);
      }
      if (estado === 'dominado') {
        assert.equal(dominio.length, 1, id);
        const aprobada = comprobaciones.at(-1);
        assert.equal(aprobada.aprobado, true, id);
        assert.equal(dominio[0].ejercicio, aprobada.ejercicio);
        assert.equal(dominio[0].datos.intentos, comprobaciones.length);
        assert.equal(eventos[eventos.indexOf(dominio[0]) - 1], aprobada, `${id}: el dominio sigue a la comprobación`);
        const despues = eventos.slice(eventos.indexOf(dominio[0]) + 1);
        assert.ok(despues.every((e) => e.tipo === 'duda'), `${id}: después del dominio solo puede escribirle a Tecu`);
        assert.ok(Date.parse(dominio[0].fecha) > Date.parse(aprobada.fecha));
      } else {
        assert.equal(dominio.length, 0, id);
        assert.ok(comprobaciones.every((c) => !c.aprobado), id);
      }
    }
  });

  test('inactivos: última actividad hace 8–14 días; los demás, en los últimos 7 días', () => {
    for (const [id, eventos] of porAlumno(GRUPO)) {
      if (!eventos.length) continue;
      const dias = (AHORA - Date.parse(eventos.at(-1).fecha)) / DIA;
      if (estadoDe(eventos) === 'inactivo') assert.ok(dias >= 8 && dias <= 14, `${id}: ${dias}`);
      else assert.ok(dias < 7, `${id}: ${dias} días sin actividad`);
    }
  });
});

describe('Errores: los escribe el motor y se vuelven a diagnosticar igual', () => {
  test('el error dominante sigue los pesos (cuotas entre los 26 con diagnóstico)', () => {
    const total = Object.values(PESOS_ERRORES).reduce((a, b) => a + b, 0);
    for (const semilla of SEMILLAS) {
      const dominantes = [...porAlumno(grupoDe(semilla)).values()].map((ev) => resumenDe(ev).dominante).filter(Boolean);
      assert.equal(dominantes.length, 26, `semilla ${semilla}`);
      const conteo = contar(dominantes);
      for (const [tipo, peso] of Object.entries(PESOS_ERRORES)) {
        const esperado = (26 * peso) / total;
        assert.ok(Math.abs((conteo[tipo] || 0) - esperado) < 1, `${tipo}: ${conteo[tipo]} vs ${esperado.toFixed(1)}`);
      }
      assert.deepEqual(conteo, {
        SIGNO_TRANSPOSICION: 8,
        INVERSA_EQUIVOCADA: 5,
        TERMINOS_NO_SEMEJANTES: 4,
        UN_SOLO_LADO: 3,
        SIGNO_NEGATIVO: 3,
        ARITMETICA: 2,
        NO_CLASIFICADO: 1,
      });
    }
  });

  test('cada evento con renglones se vuelve a diagnosticar igual con analizarProcedimiento', () => {
    for (const semilla of SEMILLAS.slice(0, 2)) {
      const conRenglones = grupoDe(semilla).eventos.filter((e) => e.renglones);
      assert.ok(conRenglones.length > 100);
      for (const e of conRenglones) {
        const analisis = analizar(e);
        const resultado = RESULTADOS.includes(analisis.estado) ? analisis.estado : 'sin_entender';
        assert.equal(e.resultado, resultado, `${e.id}: ${e.ejercicio} → ${e.renglones.join(' | ')}`);
        assert.deepEqual(e.error, errorEsperado(analisis), e.id);
      }
    }
  });

  test('los procedimientos del diagnóstico son de procedimientoConError o de pasosSolucion', () => {
    const bien = (ej) => pasosSolucion(ecuacion(ej)).map((p) => p.texto);
    for (const e of GRUPO.eventos.filter((x) => x.tipo === 'diagnostico')) {
      if (e.error) assert.deepEqual(e.renglones, procedimientoConError(e.ejercicio, e.error.tipo).slice(1), e.id);
      else if (e.datos.sinTerminar) assert.deepEqual(e.renglones, bien(e.ejercicio).slice(0, 1), e.id);
      else assert.deepEqual(e.renglones, bien(e.ejercicio), e.id);
    }
  });

  test('en el diagnóstico completo, su error aparece en 2–3 ejercicios (donde el motor sabe escribirlo)', () => {
    const aplica = (tipo) => DIAGNOSTICO.filter((ej) => procedimientoConError(ej, tipo)).length;
    for (const [id, eventos] of porAlumno(GRUPO)) {
      const diag = diagnosticos(eventos);
      if (diag.length !== DIAGNOSTICO.length) continue;
      const { dominante, conteo } = resumenDe(eventos);
      const minimo = Math.min(2, aplica(dominante));
      assert.ok(conteo[dominante] >= minimo && conteo[dominante] <= 3, `${id}: ${JSON.stringify(conteo)}`);
      assert.deepEqual(diag.map((e) => e.datos.numero), [1, 2, 3, 4]);
      assert.deepEqual(diag.map((e) => e.ejercicio), DIAGNOSTICO);
    }
  });

  test('las prácticas y comprobaciones falladas tienen el mismo error de su ruta', () => {
    for (const e of GRUPO.eventos.filter((x) => (x.tipo === 'practica' || x.tipo === 'comprobacion') && x.error)) {
      assert.equal(e.error.tipo, e.ruta, e.id);
    }
  });
});

describe('Ruta y ayudas', () => {
  test('la ruta es el error dominante y sus ejercicios salen de construirRuta(tipo, "sim-NN:tipo", diagnóstico)', () => {
    for (const [id, eventos] of porAlumno(GRUPO)) {
      const ruta = eventos.find((e) => e.tipo === 'ruta');
      if (!ruta) continue;
      const { dominante, conteo, correctos } = resumenDe(eventos);
      assert.equal(ruta.ruta, dominante, id);
      assert.deepEqual(ruta.datos.conteo, conteo);
      assert.equal(ruta.datos.correctos, correctos);
      assert.equal(ruta.datos.total, DIAGNOSTICO.length);
      assert.equal(ruta.datos.titulo, pack.errores[ruta.ruta].ruta.titulo);
      const diag = diagnosticos(eventos);
      assert.equal(eventos[eventos.indexOf(ruta) - 1], diag.at(-1), `${id}: la ruta llega justo después del diagnóstico`);
      assert.ok(diag.every((e) => eventos.indexOf(e) < eventos.indexOf(ruta)), id);
      const plan = construirRuta(ruta.ruta, `${id}:${ruta.ruta}`, DIAGNOSTICO);
      assert.deepEqual(ruta.datos.ejercicios, plan.practica.map((e) => e.ecuacion));
      for (const p of eventos.filter((e) => e.tipo === 'practica' && !e.datos.extra)) {
        assert.equal(p.ejercicio, plan.practica[p.datos.numero - 1].ecuacion, p.id);
        assert.equal(p.datos.nivel, plan.practica[p.datos.numero - 1].nivel, p.id);
      }
      const primera = eventos.find((e) => e.tipo === 'comprobacion');
      if (primera) assert.equal(primera.ejercicio, plan.comprobacion.ecuacion, id);
      assert.ok(eventos.every((e) => !e.ruta || e.ruta === ruta.ruta), `${id}: una sola ruta`);
    }
  });

  test('actividades en orden: pregunta → balanza → práctica → comprobación', () => {
    const ORDEN = { ruta: 0, pregunta: 1, visual: 2, practica: 3, solucion: 3, comprobacion: 4, dominio: 5 };
    for (const [id, eventos] of porAlumno(GRUPO)) {
      const pasos = eventos.filter((e) => e.tipo in ORDEN).map((e) => ORDEN[e.tipo]);
      const primeraComprobacion = pasos.indexOf(4);
      const antes = primeraComprobacion < 0 ? pasos : pasos.slice(0, primeraComprobacion);
      assert.deepEqual(antes, [...antes].sort((a, b) => a - b), id);
      if (primeraComprobacion >= 0) {
        const practicas = eventos.filter((e) => e.tipo === 'practica' && e.resultado === 'correcto' && !e.datos.extra);
        assert.equal(practicas.length, 3, `${id}: las 3 prácticas antes de la comprobación`);
      }
    }
  });

  test('piden pistas (0–3) y a veces la solución; la comprobación es sin ayuda', () => {
    const practicas = GRUPO.eventos.filter((e) => e.tipo === 'practica');
    assert.ok(practicas.some((e) => e.pistasUsadas > 0), 'nadie usó pistas');
    assert.ok(practicas.some((e) => e.pistasUsadas === 0), 'todos usaron pistas');
    for (const e of [...practicas, ...GRUPO.eventos.filter((x) => x.tipo === 'solucion')]) {
      assert.ok(Number.isInteger(e.pistasUsadas) && e.pistasUsadas >= 0 && e.pistasUsadas <= 3, e.id);
    }
    const conSolucion = practicas.filter((e) => e.pidioSolucion);
    assert.ok(conSolucion.length >= 1, 'nadie pidió la solución');
    const eventos = porAlumno(GRUPO);
    for (const p of conSolucion) {
      const suyos = eventos.get(p.alumno);
      const anterior = suyos[suyos.indexOf(p) - 1];
      assert.equal(anterior.tipo, 'solucion', p.id);
      assert.equal(anterior.ejercicio, p.ejercicio);
      assert.ok(anterior.pistasUsadas <= p.pistasUsadas);
      assert.equal(p.resultado, 'correcto');
    }
    for (const c of GRUPO.eventos.filter((e) => e.tipo === 'comprobacion')) {
      assert.equal(c.pistasUsadas, 0);
      assert.equal(c.pidioSolucion, false);
      assert.equal(c.aprobado, c.resultado === 'correcto');
    }
  });

  test('las pistas de un mismo ejercicio solo crecen (el intento fallido usa las de ese momento)', () => {
    for (const eventos of porAlumno(GRUPO).values()) {
      const visto = new Map();
      for (const e of eventos.filter((x) => x.tipo === 'practica' || x.tipo === 'solucion')) {
        const clave = `${e.ejercicio}#${e.datos.numero}`;
        assert.ok(e.pistasUsadas >= (visto.get(clave) ?? 0), e.id);
        visto.set(clave, e.pistasUsadas);
      }
    }
  });
});

describe('Dudas para Tecu', () => {
  test('algunos escriben dudas; Tecu contesta con su respuesta preparada', () => {
    const dudas = GRUPO.eventos.filter((e) => e.tipo === 'duda');
    assert.ok(dudas.length >= 4, `solo ${dudas.length} dudas`);
    assert.ok(new Set(dudas.map((d) => d.alumno)).size >= 3);
    assert.equal(new Set(dudas.map((d) => d.datos.dudaId)).size, dudas.length);
    for (const d of dudas) {
      assert.deepEqual(Object.keys(d.datos).sort(), ['dudaId', 'fechaRespuesta', 'respondida', 'respuesta', 'texto']);
      assert.ok(d.datos.texto.length > 5);
      assert.equal(d.datos.respondida, true);
      assert.equal(d.datos.respuesta, respuestaTecu(d.datos.texto, pack));
      const respondida = Date.parse(d.datos.fechaRespuesta);
      assert.ok(respondida > Date.parse(d.fecha) && respondida <= AHORA, d.id);
      assert.equal(new Date(respondida).toISOString(), d.datos.fechaRespuesta);
    }
  });

  test('las dudas suenan a estudiante y citan su propio ejercicio cuando se puede', () => {
    const textos = SEMILLAS.flatMap((s) => grupoDe(s).eventos.filter((e) => e.tipo === 'duda').map((e) => e.datos.texto));
    assert.ok(textos.every((t) => !/[{}]/.test(t)), 'quedó una plantilla sin llenar');
    assert.ok(textos.some((t) => /\d/.test(t)), 'ninguna duda menciona un número de su ejercicio');
  });

  test('nadie escribe a Tecu mientras está en la comprobación sin ayuda', () => {
    for (const eventos of porAlumno(GRUPO).values()) {
      eventos.forEach((e, i) => {
        if (e.tipo === 'duda' && i > 0) assert.notEqual(eventos[i - 1].tipo, 'comprobacion', e.id);
      });
    }
  });
});

describe('Fechas, ids y esquema de Evento', () => {
  // Distintas horas de "ahora" (hora de Veracruz): madrugada, antes de clase, mediodía, noche.
  const AHORAS = ['2026-11-12T06:00:00Z', '2026-11-12T14:05:00Z', '2026-11-12T18:30:00Z', '2026-11-13T04:30:00Z'];

  test('fechas ISO dentro de los últimos 14 días, estrictamente crecientes por alumno', () => {
    for (const [k, texto] of AHORAS.entries()) {
      const ahora = Date.parse(texto);
      const grupo = generarGrupo({ semilla: SEMILLAS[k], ahora, pack });
      for (const [id, eventos] of porAlumno(grupo)) {
        let previa = -Infinity;
        for (const e of eventos) {
          const t = Date.parse(e.fecha);
          assert.equal(new Date(t).toISOString(), e.fecha, e.id);
          assert.ok(t <= ahora && t >= ahora - 14 * DIA, `${e.id} ${e.fecha} (ahora ${texto})`);
          assert.ok(t > previa, `${id}: fechas fuera de orden en ${e.id}`);
          previa = t;
        }
      }
    }
  });

  test('el arreglo completo va en orden cronológico', () => {
    const fechas = GRUPO.eventos.map((e) => e.fecha);
    assert.deepEqual(fechas, [...fechas].sort());
  });

  test('se usa en horario de clase o de tarea (hora de Veracruz), nunca de madrugada', () => {
    for (const e of GRUPO.eventos) {
      const hora = new Date(Date.parse(e.fecha) - 6 * 60 * 60 * 1000).getUTCHours();
      assert.ok(hora >= 8 && hora <= 22, `${e.id}: ${hora} h`);
    }
  });

  test('ids fijos y consecutivos por alumno (sim-01-e001…), todos sincronizados', () => {
    assert.equal(new Set(GRUPO.eventos.map((e) => e.id)).size, GRUPO.eventos.length);
    for (const [id, eventos] of porAlumno(GRUPO)) {
      eventos.forEach((e, i) => assert.equal(e.id, `${id}-e${String(i + 1).padStart(3, '0')}`));
    }
    assert.ok(GRUPO.eventos.every((e) => e.sincronizado === true));
  });

  test('esquema de Evento completo (store.js) con los campos que registra la vista del estudiante', () => {
    const tiposRuta = Object.values(TIPOS);
    const esTexto = (v) => typeof v === 'string' && v.length > 0;
    const revisa = (e) => {
      assert.ok(esTexto(e.ejercicio), e.id);
      assert.ok(Array.isArray(e.renglones) && e.renglones.length > 0 && e.renglones.every(esTexto), e.id);
      assert.ok(RESULTADOS.includes(e.resultado), e.id);
      if (e.resultado === 'error') {
        assert.deepEqual(Object.keys(e.error).sort(), [...CAMPOS_ERROR].sort(), e.id);
        assert.ok(tiposRuta.includes(e.error.tipo) && Number.isInteger(e.error.renglon) && e.error.renglon >= 2, e.id);
        assert.ok(esTexto(e.error.texto) && esTexto(e.error.anterior) && esTexto(e.error.variante), e.id);
        assert.ok(['alta', 'media', 'baja'].includes(e.error.confianza), e.id);
        assert.equal(e.error.detalle.variante, e.error.variante, e.id);
      } else {
        assert.equal(e.error, null, e.id);
      }
    };
    const vistos = new Set();
    for (const e of GRUPO.eventos) {
      vistos.add(e.tipo);
      assert.ok(esTexto(e.id) && /^sim-\d{2}$/.test(e.alumno) && e.sincronizado === true, e.id);
      assert.ok(TIPOS_EVENTO.includes(e.tipo), e.tipo);
      assert.ok(e.datos && typeof e.datos === 'object', e.id);
      if (e.tipo !== 'diagnostico' && e.tipo !== 'duda') assert.ok(tiposRuta.includes(e.ruta), e.id);
      switch (e.tipo) {
        case 'diagnostico':
          revisa(e);
          assert.equal(e.ruta, undefined);
          assert.ok(Number.isInteger(e.datos.numero) && esTexto(e.datos.id) && typeof e.datos.sinTerminar === 'boolean');
          break;
        case 'ruta':
          assert.equal(typeof e.datos.conteo, 'object');
          assert.equal(e.datos.sinErrores, false);
          assert.ok(esTexto(e.datos.titulo) && e.datos.ejercicios.length === 3);
          break;
        case 'pregunta':
          assert.equal(e.aprobado, true);
          assert.ok(e.datos.intentos >= 1 && e.datos.intentos <= 3, e.id);
          assert.equal(e.datos.elegidas.length, e.datos.intentos);
          assert.ok(esTexto(e.datos.opcion) && typeof e.datos.basadaEnAlumno === 'boolean');
          break;
        case 'visual':
          assert.equal(e.aprobado, true);
          assert.ok(esTexto(e.datos.modo) && esTexto(e.datos.ecuacion) && e.datos.omitida === false);
          assert.equal(e.datos.resumen.modo, e.datos.modo);
          break;
        case 'practica':
          revisa(e);
          assert.equal(typeof e.pidioSolucion, 'boolean');
          assert.ok(Number.isInteger(e.datos.nivel) && Number.isInteger(e.datos.numero) && typeof e.datos.extra === 'boolean');
          assert.equal(e.datos.extra, e.datos.numero > 3);
          break;
        case 'solucion':
          assert.ok(esTexto(e.ejercicio) && e.pidioSolucion === true && Number.isInteger(e.datos.numero), e.id);
          break;
        case 'comprobacion':
          revisa(e);
          assert.equal(typeof e.aprobado, 'boolean');
          assert.ok(Number.isInteger(e.datos.intento) && e.datos.intento >= 1);
          break;
        case 'dominio':
          assert.ok(esTexto(e.ejercicio) && e.aprobado === true && e.datos.intentos >= 1, e.id);
          break;
        case 'duda':
          assert.ok(esTexto(e.datos.dudaId) && esTexto(e.datos.texto), e.id);
          break;
        default:
          assert.fail(`tipo inesperado ${e.tipo}`);
      }
    }
    for (const tipo of ['diagnostico', 'ruta', 'pregunta', 'visual', 'practica', 'solucion', 'comprobacion', 'dominio', 'duda']) {
      assert.ok(vistos.has(tipo), `ningún evento '${tipo}'`);
    }
  });

  test('son datos planos: sobreviven a JSON sin cambios (sin undefined ni objetos del motor)', () => {
    assert.deepEqual(JSON.parse(JSON.stringify(GRUPO)), GRUPO);
  });
});

describe('Rendimiento', () => {
  /**
   * Objetivo: < 150 ms en un escritorio en reposo. Medido en reposo: ~60–75 ms la primera vez
   * (motor en frío) y ~20–40 ms las siguientes. `node --test` corre los archivos en paralelo y
   * la máquina puede estar ocupada (se vieron 220 ms en frío así), de modo que la prueba no
   * mide una sola corrida: calienta, toma la mediana de 5 y usa un límite holgado que solo
   * atrapa regresiones grandes (p. ej., perder la memoria del motor o algo cuadrático).
   */
  const OBJETIVO_EN_REPOSO_MS = 150;
  const LIMITE_MAQUINA_OCUPADA_MS = 500;

  test('genera el grupo completo rápido (mediana de 5 corridas después de calentar)', (t) => {
    generarGrupo({ ahora: AHORA, pack }); // calentamiento, además de la primera generación del archivo
    const tiempos = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      generarGrupo({ ahora: AHORA, pack });
      tiempos.push(performance.now() - t0);
    }
    const mediana = [...tiempos].sort((a, b) => a - b)[Math.floor(tiempos.length / 2)];
    t.diagnostic(
      `primera generación (motor en frío): ${MS_EN_FRIO.toFixed(1)} ms · mediana: ${mediana.toFixed(1)} ms ` +
        `[${tiempos.map((x) => x.toFixed(1)).join(', ')}] · objetivo en reposo < ${OBJETIVO_EN_REPOSO_MS} ms`,
    );
    assert.ok(mediana < LIMITE_MAQUINA_OCUPADA_MS, `mediana ${mediana.toFixed(0)} ms (límite ${LIMITE_MAQUINA_OCUPADA_MS} ms)`);
  });
});
