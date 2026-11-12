/**
 * Grupo simulado del panel docente (fase 4): 28 estudiantes ficticios de 1.º de
 * secundaria con lo que hicieron en los últimos 14 días.
 *
 * - Se genera EN MEMORIA y no se guarda: "Reiniciar demo" (reiniciarTodo) nunca lo
 *   duplica ni lo borra. El panel lo genera una vez por sesión, con `ahora` fijo.
 * - Determinista: misma semilla y mismo `ahora` ⇒ mismos alumnos y eventos (no usa
 *   Math.random ni Date.now por dentro). Ids fijos: 'sim-01'…'sim-28', 'sim-01-e001'…
 * - Coherente con el motor: los procedimientos los escribe engine.js
 *   (procedimientoConError para los errores, pasosSolucion para los correctos) y se
 *   vuelven a diagnosticar con analizarProcedimiento([ejercicio, ...renglones]), igual
 *   que la vista del estudiante. La ruta sale de construirRuta(tipo, 'sim-NN:TIPO',
 *   ecuacionesDelDiagnostico): la misma semilla que usaría su celular.
 * - Los eventos tienen el esquema de store.js (sincronizado: true) y los mismos campos
 *   que registra js/views/estudiante.js para cada tipo.
 * - Quien empezó el diagnóstico tiene primero el evento 'rapido' (las preguntas de opción
 *   múltiple, una por habilidad): sus respuestas son coherentes con su perfil y salen de un
 *   generador aparte, así que agregarlo no cambió nada del resto de su historia.
 *
 * Módulo puro: sin DOM ni almacenamiento.
 */
import {
  TIPOS,
  TIPOS_DIAGNOSTICABLES,
  analizarProcedimiento,
  ecuacion,
  pasosSolucion,
  procedimientoConError,
} from '../core/engine.js';
import { construirRuta, otraComprobacion, resumirDiagnostico } from '../core/ruta.js';
import { createRng } from '../core/rng.js';
import { preguntaOrientadora, respuestaTecu } from '../core/textos.js';
import { habilidadesDe } from './habilidades.js';

/* ------------------------------------------------------------------ */
/* Constantes públicas                                                 */
/* ------------------------------------------------------------------ */

/** Semilla del grupo de la demostración (1.º A, Veracruz). */
export const SEMILLA_GRUPO = 'tecu-1A-veracruz';

/**
 * 28 nombres comunes en México (nombre + inicial del apellido). Sin Ana ni Luis:
 * ellos son los estudiantes en vivo del pitch. NOMBRES_GRUPO[i] es 'sim-(i+1)'.
 */
export const NOMBRES_GRUPO = Object.freeze([
  'Sofía M.', 'Diego R.', 'Ximena H.', 'Santiago G.', 'Valeria C.', 'Emiliano T.', 'Camila P.',
  'Mateo S.', 'Regina F.', 'Leonardo V.', 'Itzel R.', 'Iker D.', 'Fernanda L.', 'Ángel J.',
  'Xóchitl A.', 'Jesús M.', 'Renata O.', 'Gael B.', 'Guadalupe C.', 'Sebastián N.', 'Dulce E.',
  'Kevin H.', 'Montserrat Q.', 'Uriel P.', 'Daniela V.', 'Brayan C.', 'Jimena G.', 'Josué Z.',
]);

/**
 * Peso (en %) de cada tipo como error dominante. Se reparte con cuotas (mayor
 * residuo) entre quienes hicieron el diagnóstico; con el paquete actual, 26 de 28
 * quedan así: 8 signos, 5 inversa, 4 términos, 3 un solo lado, 3 negativos,
 * 2 cuentas y 1 sin clasificar.
 */
export const PESOS_ERRORES = Object.freeze({
  [TIPOS.SIGNO_TRANSPOSICION]: 30,
  [TIPOS.INVERSA_EQUIVOCADA]: 20,
  [TIPOS.TERMINOS_NO_SEMEJANTES]: 15,
  [TIPOS.UN_SOLO_LADO]: 12,
  [TIPOS.SIGNO_NEGATIVO]: 10,
  [TIPOS.ARITMETICA]: 10,
  [TIPOS.NO_CLASIFICADO]: 3,
});

/* ------------------------------------------------------------------ */
/* Perfiles y ritmo                                                    */
/* ------------------------------------------------------------------ */

/**
 * [estado, etapa, cuántos] — suman 28. El estado es el que debe deducir la analítica.
 * Etapas: nada · parcial (1–3 ejercicios del diagnóstico) · pregunta (tiene ruta, sin
 * empezarla) · visual (contestó la pregunta) · practica (hizo la balanza y 0–2
 * prácticas) · comprobacion (falló 1) · atorado (falló 2–3) · dominado (aprobó).
 */
const PLAZAS = [
  ['sin_actividad', 'nada', 2],
  ['diagnostico', 'parcial', 3],
  ['en_ruta', 'pregunta', 2],
  ['en_ruta', 'visual', 2],
  ['en_ruta', 'practica', 5],
  ['en_ruta', 'comprobacion', 2],
  ['atorado', 'atorado', 3],
  ['dominado', 'dominado', 5],
  ['inactivo', 'parcial', 1],
  ['inactivo', 'pregunta', 1],
  ['inactivo', 'visual', 1],
  ['inactivo', 'practica', 1],
];

/** Comprobaciones sin ayuda falladas según la etapa ([mínimo, máximo]). */
const FALLAS = { comprobacion: [1, 1], atorado: [2, 3], dominado: [0, 1] };

/** Cuánta ayuda pide cada perfil por ejercicio de práctica. */
const AYUDA = {
  bajo: { falla: 0.15, pistas: [0, 0, 0, 1], solucion: 0, pregunta: [[1, 8], [2, 2]] },
  medio: { falla: 0.3, pistas: [0, 1, 1, 2], solucion: 0.08, pregunta: [[1, 6], [2, 4]] },
  alto: { falla: 0.5, pistas: [1, 2, 3, 3], solucion: 0.3, pregunta: [[1, 4], [2, 4], [3, 2]] },
};

/**
 * Diagnóstico rápido: probabilidad de acertar cada pregunta según el perfil.
 * `suya`: la pregunta de la habilidad de su error dominante; `procedimiento`: las otras
 * habilidades con errores asociados (`sinClasificar` si su error no se pudo clasificar);
 * `planteo`: las que no dependen del procedimiento (leer, plantear), que bajan `pendiente`
 * por cada lugar que ocupan en el tema (plantear cuesta más que leer).
 */
const RAPIDO = { suya: 0.25, procedimiento: 0.8, sinClasificar: 0.6, planteo: 0.7, pendiente: 0.05 };
/** Quien ya domina el tema acierta un poco más; quien está atorado, un poco menos. */
const AJUSTE_RAPIDO = { dominado: 0.1, atorado: -0.15 };

/** Dudas que escriben a Tecu, por error; {campo} sale de su propio error del diagnóstico. */
const DUDAS = {
  [TIPOS.SIGNO_TRANSPOSICION]: [
    '¿por qué el {termino} pasa {verbo}?',
    'por que cambia el signo cuando paso un numero al otro lado',
    '¿siempre que algo está sumando pasa restando?',
  ],
  [TIPOS.INVERSA_EQUIVOCADA]: [
    '¿el {coef} que está pegado a la x se resta o se divide?',
    'no entiendo cuando se divide y cuando se resta',
    '¿cuándo tengo que dividir?',
  ],
  [TIPOS.TERMINOS_NO_SEMEJANTES]: [
    '¿puedo sumar la x con los números?',
    'por que no puedo juntar las x con los numeros',
    '¿cómo junto las x?',
  ],
  [TIPOS.UN_SOLO_LADO]: [
    '¿tengo que hacer lo mismo en los dos lados?',
    'si quito el {termino} de un lado por que tambien del otro',
    'no entiendo lo de la balanza',
  ],
  [TIPOS.SIGNO_NEGATIVO]: [
    '¿{b} entre {coefSigno} da positivo o negativo?',
    'me confundo con los signos negativos',
    '¿menos por menos da más?',
  ],
  [TIPOS.ARITMETICA]: [
    '¿cómo sé si mi resultado está bien?',
    'como compruebo mi respuesta',
    '¿cómo compruebo si mi resta está bien?',
  ],
  [TIPOS.NO_CLASIFICADO]: ['no entiendo nada de esto', 'no sé cómo empezar', '¿qué es la x?'],
};
const DUDAS_GENERALES = [
  '¿qué es la x?',
  'dime cuánto vale x',
  'no le entiendo a este tema',
  '¿para qué sirven las ecuaciones?',
];

/* ------------------------------------------------------------------ */
/* Calendario                                                          */
/* ------------------------------------------------------------------ */

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
/** Veracruz usa la hora del centro de México (UTC−6, sin horario de verano desde 2022). */
const DESFASE_LOCAL = -6 * HORA;
/** Todo cae en los últimos 14 días: la sesión más antigua es de hace 13 días (calendario local). */
const DIA_MAS_ANTIGUO = 13;
/** Días atrás de la sesión más reciente: activos en los últimos 4 días; inactivos hace 9–12 (≥ 8 días). */
const RECIENTE = { activo: [0, 4], inactivo: [9, 12] };
/** Una sesión dura a lo más ~50 min; lo que sigue va en otra. */
const MAX_SESION_S = 50 * 60;
/** Una sesión de hoy termina al menos 10 min antes de `ahora`. */
const MARGEN_MIN = 10;
/** Cuándo se usa la app (minutos desde la medianoche local; `hasta` = último inicio). */
const FRANJAS = [
  { desde: 8 * 60 + 10, hasta: 12 * 60 + 20, peso: 5 }, // en clase
  { desde: 15 * 60 + 30, hasta: 17 * 60 + 40, peso: 3 }, // tarea en la tarde
  { desde: 19 * 60, hasta: 20 * 60 + 45, peso: 2 }, // en la noche
];

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Genera el grupo simulado (en memoria: no lo guardes en localStorage).
 *
 * Estados que se pueden deducir de los eventos: 2 sin actividad, 3 con el diagnóstico
 * a medias, 11 en ruta (pregunta, balanza, práctica o 1 comprobación fallada),
 * 3 atorados (≥ 2 comprobaciones falladas, ninguna aprobada), 5 dominados
 * (comprobación aprobada + 'dominio') y 4 inactivos (última actividad hace 8–14 días).
 * Hay 2 con un renglón NO_CLASIFICADO ("por revisar"): uno como error dominante y otro
 * como error secundario.
 *
 * Los 26 que empezaron el diagnóstico tienen, como primer evento, el del diagnóstico rápido:
 * `{ tipo: 'rapido', datos: { respuestas: [{ id, habilidad, elegida, correcta }], aciertos, total } }`
 * (`correcta`: si acertó; `elegida`: índice de la opción, o null si el paquete no trae las
 * preguntas). La analítica del panel (resumirAlumnos) lo ignora: los estados no cambian.
 *
 * @param {object} opciones
 * @param {string|number} [opciones.semilla=SEMILLA_GRUPO]
 * @param {number|Date|string} [opciones.ahora=Date.now()] momento de referencia (todo cae en los 14 días anteriores)
 * @param {object} opciones.pack paquete de contenido (diagnóstico, preguntas, rutas y respuestas de Tecu)
 * @returns {{ alumnos: { id: string, nombre: string, simulado: true }[], eventos: object[] }}
 *   `eventos`: esquema Evento de store.js, en orden cronológico (y, por lo tanto, por alumno)
 */
export function generarGrupo({ semilla = SEMILLA_GRUPO, ahora = Date.now(), pack } = {}) {
  const ctx = crearContexto(semilla, ahora, pack);
  const perfiles = asignarPerfiles(ctx);
  const eventos = perfiles.flatMap((perfil) => eventosDe(ctx, perfil));
  eventos.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.id < b.id ? -1 : 1));
  return { alumnos: perfiles.map(({ id, nombre }) => ({ id, nombre, simulado: true })), eventos };
}

/* ------------------------------------------------------------------ */
/* Contexto y motor (con memoria: el diagnóstico es igual para todos)   */
/* ------------------------------------------------------------------ */

function crearContexto(semilla, ahora, pack) {
  if (!Array.isArray(pack?.diagnostico) || !pack.diagnostico.length) {
    throw new TypeError('generarGrupo: falta el paquete de contenido (pack con su diagnóstico).');
  }
  const diagnostico = pack.diagnostico.map((d, i) => ({ id: d.id ?? `d${i + 1}`, ecuacion: String(d.ecuacion) }));
  const habilidades = habilidadesDe(pack);
  return {
    semilla: String(semilla),
    ahora: aMilisegundos(ahora),
    pack,
    diagnostico,
    ecuaciones: diagnostico.map((d) => d.ecuacion),
    habilidades,
    rapidas: preguntasRapidas(pack, habilidades),
    procedimientos: new Map(),
    analisis: new Map(),
  };
}

/**
 * Preguntas del diagnóstico rápido: las del paquete (`diagnosticoRapido`) o, si aún no las
 * trae, una por habilidad en el orden del tema (sin opciones: `elegida` queda en null).
 * @returns {{ id: string, habilidad: string|null, opciones: number, correcta: number|null }[]}
 */
function preguntasRapidas(pack, habilidades) {
  const ids = new Set(habilidades.map((h) => h.id));
  const propias = Array.isArray(pack.diagnosticoRapido) ? pack.diagnosticoRapido.filter((q) => q && typeof q === 'object') : [];
  if (!propias.length) return habilidades.map((h, i) => ({ id: `r${i + 1}`, habilidad: h.id, opciones: 0, correcta: null }));
  return propias.map((q, i) => {
    const porIndice = Number.isInteger(q.habilidad) ? habilidades[q.habilidad]?.id : null;
    return {
      id: String(q.id ?? `r${i + 1}`),
      habilidad: ids.has(q.habilidad) ? q.habilidad : porIndice ?? habilidades[i]?.id ?? null,
      opciones: Array.isArray(q.opciones) ? q.opciones.length : 0,
      correcta: Number.isInteger(q.correcta) ? q.correcta : null,
    };
  });
}

function aMilisegundos(ahora) {
  let t = NaN;
  if (ahora instanceof Date) t = ahora.getTime();
  else if (typeof ahora === 'string') t = Date.parse(ahora);
  else if (typeof ahora === 'number') t = ahora;
  if (!Number.isFinite(t)) throw new TypeError('generarGrupo: «ahora» debe ser una fecha válida.');
  return Math.floor(t);
}

/** Renglones (sin el enunciado) que escribe el motor con el error `tipo`; null si no aplica. */
function escribirConError(ctx, ejercicio, tipo) {
  const clave = `${tipo}|${ejercicio}`;
  if (!ctx.procedimientos.has(clave)) {
    ctx.procedimientos.set(clave, procedimientoConError(ejercicio, tipo)?.slice(1) ?? null);
  }
  return ctx.procedimientos.get(clave);
}

/** Renglones del procedimiento correcto: los pasos canónicos del motor. */
function escribirBien(ctx, ejercicio) {
  const clave = `bien|${ejercicio}`;
  if (!ctx.procedimientos.has(clave)) {
    ctx.procedimientos.set(clave, pasosSolucion(ecuacion(ejercicio)).map((paso) => paso.texto));
  }
  return ctx.procedimientos.get(clave);
}

/** analizarProcedimiento([ejercicio, ...renglones]), como la vista del estudiante. */
function analizar(ctx, ejercicio, renglones) {
  const lineas = [ejercicio, ...renglones];
  const clave = lineas.join('\n');
  if (!ctx.analisis.has(clave)) ctx.analisis.set(clave, analizarProcedimiento(lineas));
  return ctx.analisis.get(clave);
}

/** Índices de los ejercicios del diagnóstico donde el motor sabe escribir el error `tipo`. */
function aplicables(ctx, tipo) {
  return ctx.ecuaciones.flatMap((ejercicio, i) => (escribirConError(ctx, ejercicio, tipo) ? [i] : []));
}

/* ------------------------------------------------------------------ */
/* Perfiles: estado, error dominante y "por revisar"                    */
/* ------------------------------------------------------------------ */

/**
 * @typedef {{ id: string, nombre: string, estado: string, etapa: string,
 *   tipo: string|null, ncSecundario: boolean }} Perfil
 */

/** @returns {Perfil[]} */
function asignarPerfiles(ctx) {
  const rng = createRng(`${ctx.semilla}:perfiles`);
  const plazas = rng.shuffle(PLAZAS.flatMap(([estado, etapa, n]) => Array.from({ length: n }, () => ({ estado, etapa }))));
  const perfiles = NOMBRES_GRUPO.map((nombre, i) => ({
    id: `sim-${String(i + 1).padStart(2, '0')}`,
    nombre,
    ...plazas[i],
    tipo: null,
    ncSecundario: false,
  }));
  asignarErrores(ctx, rng, perfiles);
  marcarNcSecundario(ctx, rng, perfiles);
  return perfiles;
}

/** Reparte los errores dominantes por cuotas; los más restringidos escogen primero. */
function asignarErrores(ctx, rng, perfiles) {
  const conDiagnostico = rng.shuffle(perfiles.filter((p) => p.etapa !== 'nada'));
  const pesos = Object.entries(PESOS_ERRORES).filter(([tipo]) => aplicables(ctx, tipo).length);
  const holgura = new Map(pesos.map(([tipo]) => [tipo, conDiagnostico.filter((p) => compatible(ctx, p, tipo)).length]));
  const orden = cuotas(pesos, conDiagnostico.length)
    .map((tipo, i) => ({ tipo, i }))
    .sort((a, b) => holgura.get(a.tipo) - holgura.get(b.tipo) || a.i - b.i);
  for (const { tipo } of orden) {
    const libre = conDiagnostico.find((p) => !p.tipo && compatible(ctx, p, tipo)) ?? conDiagnostico.find((p) => !p.tipo);
    libre.tipo = tipo;
  }
}

/** Reparte `n` lugares según los pesos (mayor residuo, en enteros; empates: el orden de la lista). */
function cuotas(pesos, n) {
  const total = pesos.reduce((suma, [, peso]) => suma + peso, 0);
  const filas = pesos.map(([tipo, peso], i) => ({
    tipo,
    i,
    lugares: Math.floor((n * peso) / total),
    resto: (n * peso) % total,
  }));
  let faltan = n - filas.reduce((suma, f) => suma + f.lugares, 0);
  for (const fila of [...filas].sort((a, b) => b.resto - a.resto || a.i - b.i)) {
    if (faltan-- > 0) fila.lugares += 1;
  }
  return filas.flatMap((f) => Array(f.lugares).fill(f.tipo));
}

/**
 * ¿Puede este perfil tener `tipo` como error dominante? NO_CLASIFICADO va con alguien
 * en ruta que no hace comprobaciones (el motor no lo escribe en ellas); quien dejó el
 * diagnóstico a medias necesita su error en alguno de los primeros ejercicios.
 */
function compatible(ctx, perfil, tipo) {
  const donde = aplicables(ctx, tipo);
  if (!donde.length) return false;
  if (tipo === TIPOS.NO_CLASIFICADO) return perfil.estado === 'en_ruta' && perfil.etapa !== 'comprobacion';
  return perfil.etapa !== 'parcial' || donde.some((i) => i < ctx.ecuaciones.length - 1);
}

/** Alguien más en ruta tendrá un renglón que el motor no clasifica (el docente lo ve "por revisar"). */
function marcarNcSecundario(ctx, rng, perfiles) {
  const candidatos = perfiles.filter(
    (p) => p.estado === 'en_ruta' && p.tipo && p.tipo !== TIPOS.NO_CLASIFICADO && lugaresNc(ctx, p.tipo).length,
  );
  if (candidatos.length) rng.pick(candidatos).ncSecundario = true;
}

/** Ejercicios donde cabe el renglón sin clasificar dejando ≥ 2 para el error dominante. */
function lugaresNc(ctx, tipo) {
  const donde = aplicables(ctx, tipo);
  return aplicables(ctx, TIPOS.NO_CLASIFICADO).filter((r) => donde.filter((i) => i !== r).length >= 2);
}

/* ------------------------------------------------------------------ */
/* Historia de cada estudiante (pasos sin fecha)                        */
/* ------------------------------------------------------------------ */

/** @param {Perfil} perfil */
function eventosDe(ctx, perfil) {
  if (perfil.etapa === 'nada') return [];
  const rng = createRng(`${ctx.semilla}:${perfil.id}`);
  const pasos = historia(ctx, perfil, rng);
  anteponerRapido(ctx, perfil, pasos);
  return fechar(ctx, perfil, pasos, rng);
}

/* ---------- Diagnóstico rápido (primer evento, con su propio azar) ---------- */

/**
 * Pone el diagnóstico rápido al inicio de la primera sesión, justo antes del primer ejercicio.
 * Dura 0 segundos en la bitácora y no usa el generador de la historia: las fechas y los
 * renglones de todo lo demás quedan idénticos a como eran sin él.
 */
function anteponerRapido(ctx, perfil, pasos) {
  if (!pasos.length) return;
  pasos[0].sesionNueva = false;
  pasos.unshift({ evento: eventoRapido(ctx, perfil), segundos: 0, sesionNueva: true, chat: false, pegado: false });
}

function eventoRapido(ctx, perfil) {
  const rng = createRng(`${ctx.semilla}:${perfil.id}:rapido`);
  const respuestas = ctx.rapidas.map((pregunta) => responderRapida(ctx, perfil, pregunta, rng));
  return {
    tipo: 'rapido',
    datos: { respuestas, aciertos: respuestas.filter((r) => r.correcta).length, total: respuestas.length },
  };
}

/** Una respuesta: acierta según su perfil; si falla, elige al azar una de las otras opciones. */
function responderRapida(ctx, perfil, pregunta, rng) {
  const correcta = rng.chance(probabilidadDeAcertar(ctx, perfil, pregunta.habilidad));
  let elegida = null;
  if (pregunta.correcta !== null && pregunta.opciones > 1) {
    const otras = [...Array(pregunta.opciones).keys()].filter((i) => i !== pregunta.correcta);
    elegida = correcta ? pregunta.correcta : rng.pick(otras);
  }
  return { id: pregunta.id, habilidad: pregunta.habilidad, elegida, correcta };
}

/** Coherente con el perfil: falla sobre todo la pregunta de la habilidad de su error dominante. */
function probabilidadDeAcertar(ctx, perfil, habilidad) {
  const lugar = ctx.habilidades.findIndex((h) => h.id === habilidad);
  const errores = ctx.habilidades[lugar]?.errores ?? [];
  let p = RAPIDO.planteo - RAPIDO.pendiente * Math.max(lugar, 0);
  if (errores.includes(perfil.tipo)) p = RAPIDO.suya;
  else if (errores.length) p = perfil.tipo === TIPOS.NO_CLASIFICADO ? RAPIDO.sinClasificar : RAPIDO.procedimiento;
  return Math.min(0.95, Math.max(0.05, p + (AJUSTE_RAPIDO[perfil.estado] ?? 0)));
}

function historia(ctx, perfil, rng) {
  const bitacora = crearBitacora();
  const apoyo = elegirApoyo(rng, perfil.estado);
  const items = diagnosticar(ctx, perfil, rng, apoyo);
  const conRuta = perfil.etapa !== 'parcial';
  items.forEach((item, i) => {
    // Del último ejercicio pasa directo a "Ver mi resultado" (la ruta): ahí no escribe dudas.
    const chat = !conRuta || i < items.length - 1;
    bitacora.agregar(eventoDiagnostico(ctx, item, i), rng.int(120, 330), { chat });
  });
  if (conRuta) {
    const ruta = asignarRuta(ctx, perfil, items);
    bitacora.agregar(eventoRuta(ctx, ruta), rng.int(15, 45), { pegado: true });
    recorrerRuta(ctx, perfil, ruta, bitacora, rng, apoyo);
  }
  agregarDudas(ctx, perfil, bitacora.pasos, rng);
  partirSesionesLargas(bitacora.pasos);
  return bitacora.pasos;
}

/**
 * Lista de pasos (eventos todavía sin fecha). `segundos`: cuánto después del paso
 * anterior ocurre; `chat`: después de este paso se le puede escribir a Tecu;
 * `pegado`: va en la misma sesión que el anterior.
 */
function crearBitacora() {
  const pasos = [];
  let cortar = false;
  return {
    pasos,
    /** El siguiente paso empieza otra sesión (otro rato u otro día). */
    corte() {
      cortar = true;
    },
    agregar(evento, segundos, { chat = true, pegado = false } = {}) {
      pasos.push({ evento, segundos, sesionNueva: !pasos.length || (cortar && !pegado), chat, pegado });
      cortar = cortar && pegado;
    },
  };
}

function elegirApoyo(rng, estado) {
  if (estado === 'atorado') return 'alto';
  if (estado === 'dominado') return rng.pickWeighted([['bajo', 3], ['medio', 2]]);
  return rng.pickWeighted([['bajo', 2], ['medio', 3], ['alto', 2]]);
}

/* ---------- Diagnóstico ---------- */

/**
 * Ejercicios del diagnóstico que hizo: su error en 2–3 de ellos (donde el motor lo sabe
 * escribir), los demás bien; a veces un error secundario o uno sin terminar.
 * @returns {{ id: string, ejercicio: string, renglones: string[], sinTerminar: boolean }[]}
 */
function diagnosticar(ctx, perfil, rng, apoyo) {
  const total = ctx.ecuaciones.length;
  const donde = aplicables(ctx, perfil.tipo);
  const hechos = perfil.etapa === 'parcial' ? cuantosHizo(rng, donde, total) : total;
  const nc = perfil.ncSecundario ? rng.pick(lugaresNc(ctx, perfil.tipo)) ?? -1 : -1;
  const posibles = donde.filter((i) => i < hechos && i !== nc);
  const cuantos = Math.min(posibles.length, hechos === total ? rng.int(2, 3) : rng.int(1, 2));
  const conError = new Set(rng.shuffle(posibles).slice(0, cuantos));
  const libres = [...Array(hechos).keys()].filter((i) => !conError.has(i) && i !== nc);
  // El secundario aparece una sola vez y su error dominante ≥ 2: no le gana. Con NO_CLASIFICADO
  // no hay secundario: resumirDiagnostico prefiere cualquier error clasificado.
  const puedeOtro = cuantos >= 2 && nc < 0 && perfil.tipo !== TIPOS.NO_CLASIFICADO;
  const otro = puedeOtro && rng.chance(0.3) ? errorSecundario(ctx, perfil.tipo, libres, rng) : null;
  const rendido = apoyo === 'alto' && rng.chance(0.25) ? rng.pick(libres.filter((i) => i !== otro?.i)) : undefined;

  return ctx.diagnostico.slice(0, hechos).map((d, i) => {
    let renglones = escribirBien(ctx, d.ecuacion);
    let sinTerminar = false;
    if (conError.has(i)) renglones = escribirConError(ctx, d.ecuacion, perfil.tipo);
    else if (i === nc) renglones = escribirConError(ctx, d.ecuacion, TIPOS.NO_CLASIFICADO);
    else if (i === otro?.i) renglones = escribirConError(ctx, d.ecuacion, otro.tipo);
    else if (i === rendido && renglones.length > 1) {
      renglones = renglones.slice(0, 1); // tocó "No sé cómo seguir" después del primer paso
      sinTerminar = true;
    }
    return { id: d.id, ejercicio: d.ecuacion, renglones, sinTerminar };
  });
}

/** Quien dejó el diagnóstico a medias hizo 1–3 ejercicios, con al menos uno donde aparece su error. */
function cuantosHizo(rng, donde, total) {
  const primero = donde.find((i) => i < total - 1);
  return rng.int(primero === undefined ? 1 : primero + 1, total - 1);
}

/** Un error de otro tipo (clasificado) en uno de los ejercicios que le salieron bien. */
function errorSecundario(ctx, dominante, libres, rng) {
  const otros = TIPOS_DIAGNOSTICABLES.filter((tipo) => tipo !== dominante);
  const opciones = libres.flatMap((i) =>
    otros.filter((tipo) => escribirConError(ctx, ctx.ecuaciones[i], tipo)).map((tipo) => ({ i, tipo })),
  );
  return opciones.length ? rng.pick(opciones) : null;
}

/* ---------- Ruta (igual que asignarRuta() de la vista del estudiante) ---------- */

function asignarRuta(ctx, perfil, items) {
  const analisis = items.map((item) => analizar(ctx, item.ejercicio, item.renglones));
  const resumen = resumirDiagnostico(analisis.map((a) => ({ analisis: a })));
  const tipo = resumen.dominante ?? (resumen.correctos === resumen.total ? null : TIPOS.NO_CLASIFICADO);
  const semilla = `${perfil.id}:${tipo ?? 'GENERAL'}`;
  const plan = construirRuta(tipo ?? TIPOS.NO_CLASIFICADO, semilla, ctx.ecuaciones);
  const primero = analisis.findIndex((a) => a.estado === 'error' && a.error.tipo === tipo);
  return {
    tipo,
    semilla,
    resumen,
    delAlumno: primero >= 0 ? { error: analisis[primero].error, ejercicio: primero + 1 } : null,
    practica: plan.practica.map((e) => ({ ecuacion: e.ecuacion, nivel: e.nivel })),
    comprobacion: { ecuacion: plan.comprobacion.ecuacion, usados: [plan.comprobacion.ecuacion] },
  };
}

function recorrerRuta(ctx, perfil, ruta, bitacora, rng, apoyo) {
  if (ruta.tipo === null || perfil.etapa === 'pregunta') return;
  if (rng.chance(0.4)) bitacora.corte();
  bitacora.agregar(eventoPregunta(ctx, ruta, rng, apoyo), rng.int(60, 180));
  if (perfil.etapa === 'visual') return;
  bitacora.agregar(eventoVisual(ctx, ruta, rng), rng.int(120, 300));
  if (rng.chance(0.5)) bitacora.corte();
  const enPractica = perfil.etapa === 'practica';
  const hechas = enPractica ? rng.int(0, perfil.estado === 'inactivo' ? 1 : 2) : ruta.practica.length;
  ruta.practica.slice(0, hechas).forEach((ej, i) => practicar(ctx, ruta, bitacora, rng, apoyo, ej, i + 1));
  if (!enPractica) comprobar(ctx, perfil, ruta, bitacora, rng, apoyo);
  else if (rng.chance(0.45)) intentoEnCurso(ctx, ruta, bitacora, rng, apoyo, hechas);
}

/** Un ejercicio de práctica: a veces se equivoca primero, pide pistas o la solución; al final le sale. */
function practicar(ctx, ruta, bitacora, rng, apoyo, ej, numero) {
  const ayuda = AYUDA[apoyo];
  const pistas = rng.pick(ayuda.pistas);
  const datos = { nivel: ej.nivel, numero, extra: numero > 3 };
  const mal = rng.chance(ayuda.falla) ? escribirConError(ctx, ej.ecuacion, ruta.tipo) : null;
  if (mal) bitacora.agregar(eventoPractica(ctx, ruta, ej, mal, rng.int(0, pistas), false, datos), rng.int(150, 330));
  const pidio = rng.chance(ayuda.solucion);
  if (pidio) bitacora.agregar(eventoSolucion(ruta, ej, pistas, datos), rng.int(60, 150), { chat: false });
  const bien = eventoPractica(ctx, ruta, ej, escribirBien(ctx, ej.ecuacion), pistas, pidio, datos);
  bitacora.agregar(bien, rng.int(90, 240), { pegado: pidio });
}

/** Se quedó a la mitad de una práctica: la intentó y le salió mal. */
function intentoEnCurso(ctx, ruta, bitacora, rng, apoyo, indice) {
  const ej = ruta.practica[indice];
  const mal = ej && escribirConError(ctx, ej.ecuacion, ruta.tipo);
  if (!mal) return;
  const datos = { nivel: ej.nivel, numero: indice + 1, extra: false };
  bitacora.agregar(eventoPractica(ctx, ruta, ej, mal, rng.pick(AYUDA[apoyo].pistas), false, datos), rng.int(150, 330));
}

/** Comprobaciones sin ayuda: falla según su etapa y, si domina, aprueba y registra 'dominio'. */
function comprobar(ctx, perfil, ruta, bitacora, rng, apoyo) {
  const [minimo, maximo] = FALLAS[perfil.etapa];
  const fallas = perfil.etapa === 'dominado' ? Number(rng.chance(0.35)) : rng.int(minimo, maximo);
  if (rng.chance(0.5)) bitacora.corte();
  for (let intento = 1; intento <= fallas; intento++) {
    // Falla con el error de su ruta; si el motor no puede escribirlo ahí, la deja sin terminar.
    const ej = ruta.comprobacion.ecuacion;
    const renglones = escribirConError(ctx, ej, ruta.tipo) ?? escribirBien(ctx, ej).slice(0, 1);
    bitacora.agregar(eventoComprobacion(ctx, ruta, intento, renglones), rng.int(180, 420), { chat: false });
    despuesDeFallar(ctx, ruta, bitacora, rng, apoyo);
    if (rng.chance(0.5)) bitacora.corte();
  }
  if (perfil.etapa !== 'dominado') return;
  const aprobada = eventoComprobacion(ctx, ruta, fallas + 1, escribirBien(ctx, ruta.comprobacion.ecuacion));
  bitacora.agregar(aprobada, rng.int(180, 400), { chat: false });
  const dominio = {
    tipo: 'dominio',
    ruta: ruta.tipo,
    ejercicio: aprobada.ejercicio,
    aprobado: true,
    datos: { intentos: fallas + 1 },
  };
  bitacora.agregar(dominio, 1, { pegado: true });
}

/** Tras fallar: "Practicar uno más con pistas" (con ejercicio extra) o "Intentar otro sin ayuda". */
function despuesDeFallar(ctx, ruta, bitacora, rng, apoyo) {
  if (rng.chance(0.5)) {
    nuevaComprobacion(ctx, ruta);
    return;
  }
  const extra = otraComprobacion(ruta.tipo, `${ruta.semilla}:extra`, usadas(ctx, ruta));
  ruta.practica.push({ ecuacion: extra.ecuacion, nivel: extra.nivel });
  nuevaComprobacion(ctx, ruta);
  practicar(ctx, ruta, bitacora, rng, apoyo, ruta.practica[ruta.practica.length - 1], ruta.practica.length);
}

function nuevaComprobacion(ctx, ruta) {
  const otra = otraComprobacion(ruta.tipo, ruta.semilla, usadas(ctx, ruta));
  ruta.comprobacion.ecuacion = otra.ecuacion;
  ruta.comprobacion.usados = [...new Set([...ruta.comprobacion.usados, otra.ecuacion])];
}

/** Las ecuaciones que ya vio (como ecuacionesUsadas() de la vista). */
function usadas(ctx, ruta) {
  const { practica, comprobacion } = ruta;
  return [...new Set([...ctx.ecuaciones, ...practica.map((e) => e.ecuacion), ...comprobacion.usados, comprobacion.ecuacion])];
}

/* ---------- Eventos (mismos campos que registra js/views/estudiante.js) ---------- */

/** Estado del motor → campo `resultado` del evento. */
function resultadoEvento(estado) {
  return estado === 'correcto' || estado === 'error' || estado === 'incompleto' ? estado : 'sin_entender';
}

/** Error del motor → `error` del evento (detalle: los datos que usan las plantillas de textos.js). */
function errorEvento(analisis) {
  const e = analisis?.estado === 'error' ? analisis.error : null;
  if (!e) return null;
  return {
    tipo: e.tipo,
    renglon: e.renglon,
    variante: e.detalle?.variante ?? null,
    texto: e.texto,
    anterior: e.anterior,
    confianza: e.confianza,
    detalle: e.detalle ? JSON.parse(JSON.stringify(e.detalle)) : null,
  };
}

/** Lo que guarda la vista al revisar un cuaderno: renglones (sin el enunciado), resultado y error. */
function revisado(ctx, ejercicio, renglones) {
  const analisis = analizar(ctx, ejercicio, renglones);
  return { ejercicio, renglones: [...renglones], resultado: resultadoEvento(analisis.estado), error: errorEvento(analisis) };
}

function eventoDiagnostico(ctx, item, i) {
  return {
    tipo: 'diagnostico',
    ...revisado(ctx, item.ejercicio, item.renglones),
    datos: { numero: i + 1, id: item.id, sinTerminar: item.sinTerminar },
  };
}

function eventoRuta(ctx, ruta) {
  const info = ctx.pack.errores?.[ruta.tipo] ?? ctx.pack.errores?.[TIPOS.NO_CLASIFICADO];
  return {
    tipo: 'ruta',
    ruta: ruta.tipo,
    datos: {
      conteo: { ...ruta.resumen.conteo },
      correctos: ruta.resumen.correctos,
      total: ruta.resumen.total,
      titulo: ruta.tipo === null ? 'Demuestra lo que sabes' : info?.ruta?.titulo ?? null,
      sinErrores: ruta.tipo === null,
      ejercicios: ruta.practica.map((e) => e.ecuacion),
    },
  };
}

/** La pregunta de Tecu que cita su error: a veces elige una opción equivocada antes. */
function eventoPregunta(ctx, ruta, rng, apoyo) {
  let q = null;
  try {
    q = preguntaOrientadora(ruta.tipo, ruta.delAlumno, ctx.pack);
  } catch {
    q = null; // paquete sin preguntas: el evento queda sin el texto de la opción
  }
  const intentos = rng.pickWeighted(AYUDA[apoyo].pregunta);
  const buena = q?.opciones?.find((o) => o.correcta);
  const malas = rng.shuffle(q?.opciones?.filter((o) => !o.correcta) ?? []).slice(0, intentos - 1);
  const elegidas = buena ? [...malas.map((o) => o.id), buena.id] : [];
  return {
    tipo: 'pregunta',
    ruta: ruta.tipo,
    aprobado: true,
    datos: {
      intentos: buena ? elegidas.length : intentos,
      elegidas,
      opcion: buena?.texto ?? null,
      basadaEnAlumno: Boolean(q?.basadaEnAlumno),
    },
  };
}

function eventoVisual(ctx, ruta, rng) {
  const v = (ctx.pack.errores?.[ruta.tipo] ?? ctx.pack.errores?.[TIPOS.NO_CLASIFICADO])?.ruta?.visual ?? {};
  const modo = v.modo ?? null;
  const ecuacionBalanza = v.ecuacion ?? null;
  // Como el `resumen` de onCompletar de la balanza (sin los campos propios de cada modo).
  const resumen = {
    modo,
    ecuacion: ecuacionBalanza,
    acciones: rng.int(3, 12),
    intentos: rng.int(1, 3),
    ms: rng.int(40, 110) * SEGUNDO,
  };
  return {
    tipo: 'visual',
    ruta: ruta.tipo,
    aprobado: true,
    datos: { modo, ecuacion: ecuacionBalanza, resumen, omitida: false },
  };
}

function eventoPractica(ctx, ruta, ej, renglones, pistasUsadas, pidioSolucion, datos) {
  return {
    tipo: 'practica',
    ruta: ruta.tipo,
    ...revisado(ctx, ej.ecuacion, renglones),
    pistasUsadas,
    pidioSolucion,
    datos: { ...datos },
  };
}

function eventoSolucion(ruta, ej, pistasUsadas, { nivel, numero }) {
  return {
    tipo: 'solucion',
    ruta: ruta.tipo,
    ejercicio: ej.ecuacion,
    pidioSolucion: true,
    pistasUsadas,
    datos: { nivel, numero },
  };
}

function eventoComprobacion(ctx, ruta, intento, renglones) {
  const r = revisado(ctx, ruta.comprobacion.ecuacion, renglones);
  return {
    tipo: 'comprobacion',
    ruta: ruta.tipo,
    ...r,
    aprobado: r.resultado === 'correcto',
    pistasUsadas: 0,
    pidioSolucion: false,
    datos: { intento },
  };
}

/* ---------- Dudas para Tecu ---------- */

/** 1 o 2 dudas en momentos en que el chat está abierto (nunca durante la comprobación). */
function agregarDudas(ctx, perfil, pasos, rng) {
  const lugares = pasos.flatMap((paso, i) => (paso.chat ? [i] : []));
  if (!lugares.length || !rng.chance(0.45)) return;
  const textos = textosDeDuda(perfil, pasos, rng, rng.chance(0.3) ? 2 : 1);
  const posiciones = rng.shuffle(lugares).slice(0, textos.length).sort((a, b) => a - b);
  const nuevos = posiciones.map((pos, k) => [pos, pasoDuda(ctx, perfil, textos[k], k + 1, rng)]);
  for (const [pos, paso] of nuevos.reverse()) pasos.splice(pos + 1, 0, paso);
}

function textosDeDuda(perfil, pasos, rng, n) {
  const suyo = pasos.find((p) => p.evento.tipo === 'diagnostico' && p.evento.error?.tipo === perfil.tipo);
  const datos = datosDeDuda(suyo?.evento.error.detalle);
  const propias = rng.shuffle((DUDAS[perfil.tipo] ?? []).map((t) => escribirDuda(t, datos)).filter(Boolean));
  const generales = rng.shuffle(DUDAS_GENERALES);
  const textos = [];
  while (textos.length < n && (propias.length || generales.length)) {
    const fuente = propias.length && (!generales.length || rng.chance(0.75)) ? propias : generales;
    const texto = fuente.shift();
    if (!textos.includes(texto)) textos.push(texto);
  }
  return textos;
}

/** Números de su propio error, escritos como los teclea un estudiante ("-2", no "−2"). */
function datosDeDuda(detalleError) {
  const detalle = detalleError ?? {};
  const ascii = (s) => String(s).replace(/−/g, '-');
  const datos = {};
  if (detalle.terminoSinSigno && !/x/.test(detalle.terminoSinSigno)) datos.termino = detalle.terminoSinSigno;
  if (detalle.signoOriginal) datos.verbo = detalle.signoOriginal === 'suma' ? 'restando' : 'sumando';
  if (detalle.coefNum && !detalle.divisor) {
    datos.coef = ascii(detalle.coefNum).replace('-', '');
    datos.coefSigno = ascii(detalle.coefNum);
  }
  if (detalle.b) datos.b = ascii(detalle.b);
  return datos;
}

/** Llena la plantilla; null si le falta algún dato. */
function escribirDuda(plantilla, datos) {
  let completa = true;
  const texto = plantilla.replace(/\{(\w+)\}/g, (_, clave) => {
    if (datos[clave] === undefined) completa = false;
    return datos[clave] ?? '';
  });
  return completa ? texto : null;
}

/** Evento 'duda' como lo deja store.agregarDuda() + contestarDuda(); la fecha de respuesta se pone al fechar. */
function pasoDuda(ctx, perfil, texto, n, rng) {
  let respuesta = null;
  try {
    respuesta = respuestaTecu(texto, ctx.pack) ?? null;
  } catch {
    respuesta = null; // paquete sin respuestas de Tecu: la duda queda sin contestar
  }
  const sinInternet = rng.chance(0.35); // Tecu la contestó al volver la red
  return {
    evento: {
      tipo: 'duda',
      datos: { dudaId: `${perfil.id}-duda-${n}`, texto, respondida: respuesta !== null, respuesta, fechaRespuesta: null },
    },
    segundos: rng.int(40, 200),
    sesionNueva: false,
    chat: true,
    pegado: true,
    retrasoRespuesta: respuesta === null ? null : sinInternet ? rng.int(15, 240) * 60 : rng.int(2, 6),
  };
}

/* ------------------------------------------------------------------ */
/* Fechas: sesiones en horario escolar o de tarea, ids en orden         */
/* ------------------------------------------------------------------ */

/** Si una sesión pasa de ~50 min, lo que sigue va en otra (sin separar lo que va pegado). */
function partirSesionesLargas(pasos) {
  let acumulado = 0;
  for (const paso of pasos) {
    if (!paso.sesionNueva && !paso.pegado && acumulado + paso.segundos > MAX_SESION_S) paso.sesionNueva = true;
    acumulado = paso.sesionNueva ? paso.segundos : acumulado + paso.segundos;
  }
}

function agruparSesiones(pasos) {
  const sesiones = [];
  for (const paso of pasos) {
    if (paso.sesionNueva || !sesiones.length) sesiones.push([]);
    sesiones[sesiones.length - 1].push(paso);
  }
  return sesiones;
}

/** Pone fecha e id a cada paso: estrictamente crecientes y todas antes de `ahora`. */
function fechar(ctx, perfil, pasos, rng) {
  const rango = perfil.estado === 'inactivo' ? RECIENTE.inactivo : RECIENTE.activo;
  const eventos = [];
  let previo = -Infinity;
  for (const { inicio, pasos: sesion } of ubicarSesiones(ctx, rng, agruparSesiones(pasos), rango)) {
    let t = inicio;
    for (const paso of sesion) {
      t = Math.max(t + paso.segundos * SEGUNDO, previo + SEGUNDO);
      previo = t;
      eventos.push(armarEvento(ctx, perfil, paso, t, eventos.length + 1));
    }
  }
  return eventos;
}

function armarEvento(ctx, perfil, paso, t, n) {
  const evento = {
    id: `${perfil.id}-e${String(n).padStart(3, '0')}`,
    alumno: perfil.id,
    fecha: new Date(t).toISOString(),
    sincronizado: true,
    ...paso.evento,
  };
  if (paso.retrasoRespuesta != null) {
    const respondida = Math.max(t + 2 * SEGUNDO, Math.min(t + paso.retrasoRespuesta * SEGUNDO, ctx.ahora - MINUTO));
    evento.datos = { ...evento.datos, fechaRespuesta: new Date(respondida).toISOString() };
  }
  return evento;
}

/**
 * Ubica las sesiones en el calendario local: la más reciente en `[diaMin, diaMax]`
 * días atrás (hoy solo si alcanza a terminar antes de `ahora`) y las anteriores en
 * huecos al azar entre ella y hace 13 días.
 * @returns {{ inicio: number, pasos: object[] }[]} en orden cronológico
 */
function ubicarSesiones(ctx, rng, sesiones, [diaMin, diaMax]) {
  const hoy = medianocheLocal(ctx.ahora);
  const minutosHoy = Math.floor((ctx.ahora - hoy) / MINUTO);
  const ultima = sesiones[sesiones.length - 1];
  const reciente = huecoReciente(rng, rng.int(diaMin, diaMax), duracionMin(ultima), minutosHoy);
  const libres = huecosAnteriores(reciente);
  while (sesiones.length - 1 > libres.length) sesiones.splice(0, 2, sesiones[0].concat(sesiones[1]));
  const huecos = [...elegirHuecos(rng, libres, sesiones.length - 1), reciente];
  return huecos.map((hueco, i) => ({
    inicio: hoy - hueco.dia * DIA + hueco.minuto * MINUTO + rng.int(0, 59) * SEGUNDO,
    pasos: sesiones[i],
  }));
}

/** Medianoche de hoy en Veracruz, en milisegundos UTC. */
function medianocheLocal(ahora) {
  const local = ahora + DESFASE_LOCAL;
  return ahora - (((local % DIA) + DIA) % DIA);
}

const duracionMin = (sesion) => Math.ceil(sesion.reduce((suma, paso) => suma + paso.segundos, 0) / 60);
const elegirFranja = (rng, franjas) => rng.pickWeighted(franjas.map((f) => [f, f.peso]));

/** Día, franja y minuto de inicio de la sesión más reciente. */
function huecoReciente(rng, dia, minutos, minutosHoy) {
  if (dia === 0) {
    const tope = minutosHoy - MARGEN_MIN - minutos; // último inicio que termina a tiempo
    const posibles = FRANJAS.filter((f) => f.desde <= tope);
    if (posibles.length) {
      const franja = elegirFranja(rng, posibles);
      return { dia, franja, minuto: rng.int(franja.desde, Math.min(franja.hasta, tope)) };
    }
  }
  const franja = elegirFranja(rng, FRANJAS);
  return { dia: Math.max(dia, 1), franja, minuto: rng.int(franja.desde, franja.hasta) };
}

/** Franjas anteriores a la sesión más reciente, hasta hace 13 días. */
function huecosAnteriores(reciente) {
  const orden = FRANJAS.indexOf(reciente.franja);
  const libres = [];
  for (let dia = reciente.dia; dia <= DIA_MAS_ANTIGUO; dia++) {
    FRANJAS.forEach((franja, i) => {
      if (dia > reciente.dia || i < orden) libres.push({ dia, franja });
    });
  }
  return libres;
}

/** `n` huecos distintos (pesan más las horas de clase), en orden cronológico. */
function elegirHuecos(rng, libres, n) {
  const pool = [...libres];
  const elegidos = [];
  while (elegidos.length < n) {
    const hueco = rng.pickWeighted(pool.map((h) => [h, h.franja.peso]));
    pool.splice(pool.indexOf(hueco), 1);
    elegidos.push({ ...hueco, minuto: rng.int(hueco.franja.desde, hueco.franja.hasta) });
  }
  return elegidos.sort((a, b) => b.dia - a.dia || a.franja.desde - b.franja.desde);
}
