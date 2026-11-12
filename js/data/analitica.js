/**
 * Analítica del panel docente (fase 4).
 *
 * Convierte los eventos del grupo (simulado + "servidor") en lo que el docente
 * necesita para decidir esta semana:
 *   - resumirAlumnos(): un resumen por estudiante (estado, errores, ruta, ficha).
 *   - resumirGrupo(): indicadores y lo que más se repite en el grupo.
 *   - aQuienLlamar(): a quién llamar, por qué y qué retomar en 15 minutos.
 *   - gruposDeRefuerzo(): equipos por error dominante, con actividad y cuadernillo.
 *
 * Módulo puro y determinista (sin DOM; con el mismo `ahora`, el mismo resultado).
 * Tolera eventos desordenados, duplicados por id, con campos faltantes o de tipos
 * desconocidos: nunca lanza por datos raros y no modifica lo que recibe.
 */
import { PRIORIDAD, TIPOS, analizarProcedimiento, bonito } from '../core/engine.js';
import { construirRuta, resumirDiagnostico } from '../core/ruta.js';
import { explicarError, nombreError, rellenar, sugerenciaLlamada } from '../core/textos.js';

/** Días completos sin actividad a partir de los cuales un estudiante está inactivo. */
export const DIAS_INACTIVO = 7;
/** Comprobaciones sin ayuda falladas (sin ninguna aprobada) para considerar atorado a un estudiante. */
export const COMPROBACIONES_ATORADO = 2;
/** Errores del tipo dominante en la ruta, sin avanzar de actividad, para considerar atorado a un estudiante. */
export const ERRORES_ATORADO = 4;
/** Motivos de «a quién llamar», del más urgente al menos urgente. */
export const MOTIVOS = Object.freeze(['atorado', 'por_revisar', 'inactivo', 'sin_diagnostico']);

const DIA_MS = 24 * 60 * 60 * 1000;
const TOTAL_DIAGNOSTICO = 4;
const SEMILLA_REFUERZO = 'tecu-refuerzo';
const NC = TIPOS.NO_CLASIFICADO;

/** Tipos de evento del contrato de store.js; los demás se ignoran. */
const TIPOS_EVENTO = new Set([
  'diagnostico', 'ruta', 'pregunta', 'visual', 'practica', 'solucion', 'comprobacion', 'dominio', 'duda', 'libre',
]);
/** Actividades que solo existen cuando el estudiante ya tiene ruta. */
const DE_RUTA = new Set(['pregunta', 'visual', 'practica', 'solucion', 'comprobacion', 'dominio']);
/** Eventos con un procedimiento escrito (ejercicio + renglones) que el motor revisó. */
const CON_PROCEDIMIENTO = new Set(['diagnostico', 'practica', 'comprobacion', 'libre']);
const TIPOS_ERROR = new Set(Object.values(TIPOS));

/** Nombres de los celulares en vivo de la demostración. */
const NOMBRES_EN_VIVO = new Map([
  ['ana', 'Ana'],
  ['luis', 'Luis'],
  ['invitado', 'Invitado (QR)'],
]);

/** Gravedad para ordenar la lista de estudiantes (menor = más urgente). «Por revisar» no es un estado. */
const GRAVEDAD = { atorado: 0, por_revisar: 1, inactivo: 2, sin_actividad: 3, diagnostico: 4, en_ruta: 5, dominado: 6 };

/** Dónde va el estudiante dentro de su ruta, para los textos del docente. */
const LUGAR = {
  pregunta: 'la pregunta de Tecu',
  visual: 'la balanza',
  practica: 'la práctica',
  comprobacion: 'la comprobación sin ayuda',
};

/**
 * Respaldo por si el paquete no trae `llamadas` (el paquete actual sí las trae).
 * Mismas claves que `pack.llamadas`: {dias} y {tema}.
 */
const LLAMADAS_RESPALDO = {
  inactivo:
    'No ha entrado en {dias} días. Pregúntale si tiene celular o datos esta semana; si no, dale el cuadernillo impreso de {tema}.',
  sin_diagnostico:
    'Todavía no hace el diagnóstico. En 15 minutos pueden resolver juntos en papel las ecuaciones del diagnóstico y escribirlas después en la app.',
};

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const comoTexto = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
/** Entero ≥ 0 (lo que no es número cuenta como 0). */
const conteo = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};
/** Tipo de error dentro del catálogo; lo desconocido queda como NO_CLASIFICADO. */
const tipoError = (tipo) => (TIPOS_ERROR.has(tipo) ? tipo : NC);
const rangoTipo = (tipo) => {
  const i = PRIORIDAD.indexOf(tipo);
  return i < 0 ? PRIORIDAD.length : i;
};
const intl = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
const porNombre = (a, b) => intl.compare(a.nombre, b.nombre) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/** Milisegundos de una fecha (Date, número o texto ISO); `porDefecto` si no se entiende. */
function aMs(valor, porDefecto = null) {
  let t = NaN;
  if (valor instanceof Date) t = valor.getTime();
  else if (typeof valor === 'number') t = valor;
  else if (typeof valor === 'string' && valor.trim()) t = Date.parse(valor);
  return Number.isFinite(t) ? t : porDefecto;
}

/** Días completos entre dos instantes (0 si `desde` quedó en el futuro); null si no hay fecha. */
const diasEntre = (desde, hasta) => (desde === null ? null : Math.max(0, Math.floor((hasta - desde) / DIA_MS)));

function copiaPlana(valor) {
  try {
    return valor === undefined ? null : JSON.parse(JSON.stringify(valor));
  } catch {
    return null;
  }
}

/** Renglones como textos, en su posición (el número de renglón del error depende de ella). */
const renglonesDe = (ev) => (Array.isArray(ev.renglones) ? ev.renglones.map(comoTexto) : []);

/* ------------------------------------------------------------------ */
/* Eventos                                                             */
/* ------------------------------------------------------------------ */

/** Orden cronológico; los eventos sin fecha válida van primero, en el orden en que llegaron. */
function cronologico(a, b) {
  if (a.t !== b.t) {
    if (a.t === null) return -1;
    if (b.t === null) return 1;
    return a.t - b.t;
  }
  return a.i - b.i;
}

/**
 * Eventos reconocidos agrupados por alumno, sin duplicados y en orden cronológico.
 * Mismo id repetido: se queda la última versión que llega (como en el "servidor").
 * Se descartan los que no son objetos, no traen alumno o tienen un tipo desconocido.
 * @returns {Map<string, {ev: object, t: number|null, i: number}[]>}
 */
function agruparPorAlumno(eventos) {
  const unicos = new Map();
  (Array.isArray(eventos) ? eventos : []).forEach((ev, i) => {
    if (!esObjeto(ev) || !TIPOS_EVENTO.has(ev.tipo)) return;
    const alumno = comoTexto(ev.alumno);
    if (!alumno) return;
    const id = comoTexto(ev.id);
    unicos.set(id ? `id:${id}` : `#${i}`, { ev, alumno, t: aMs(ev.fecha), i });
  });
  const grupos = new Map();
  for (const item of unicos.values()) {
    if (!grupos.has(item.alumno)) grupos.set(item.alumno, []);
    grupos.get(item.alumno).push(item);
  }
  for (const lista of grupos.values()) lista.sort(cronologico);
  return grupos;
}

/** Vuelve a diagnosticar un procedimiento con el motor (solo para eventos que no traen su error). */
function rediagnosticar(ev) {
  const ejercicio = comoTexto(ev.ejercicio);
  if (!ejercicio) return null;
  try {
    const an = analizarProcedimiento([ejercicio, ...renglonesDe(ev)]);
    if (an.estado !== 'error' || !an.error) return null;
    const e = an.error;
    return {
      tipo: tipoError(e.tipo),
      renglon: e.renglon,
      variante: e.detalle?.variante ?? null,
      texto: e.texto,
      anterior: e.anterior,
      confianza: e.confianza,
      detalle: copiaPlana(e.detalle),
    };
  } catch {
    return null;
  }
}

/**
 * Error de un evento con su tipo dentro del catálogo. Conserva todos sus campos
 * (incluido `detalle`, que necesita explicarError). null si el evento no trae error.
 */
function errorDe(ev) {
  if (esObjeto(ev.error)) {
    const tipo = tipoError(ev.error.tipo);
    return tipo === ev.error.tipo ? ev.error : { ...ev.error, tipo };
  }
  if (ev.resultado !== 'error') return null;
  // El motor marcó error pero el evento no dice cuál (dato incompleto): se vuelve a diagnosticar.
  return (
    rediagnosticar(ev) ?? {
      tipo: NC,
      renglon: null,
      variante: null,
      texto: '',
      anterior: '',
      confianza: 'baja',
      detalle: null,
    }
  );
}

/** ¿El procedimiento del evento salió mal? (con error, incompleto, sin entender o comprobación no aprobada) */
const fallo = (ev, error) =>
  Boolean(error) || (typeof ev.resultado === 'string' && ev.resultado !== 'correcto') || ev.aprobado === false;

/**
 * Error dominante: el que más se repite. Como en la ruta, los errores clasificados
 * van antes que NO_CLASIFICADO; en un empate gana el de la ruta asignada, luego el
 * que apareció primero y luego el orden de PRIORIDAD del motor.
 */
function dominanteDe(conteos, primeraVez, preferido) {
  const tipos = Object.keys(conteos).filter((t) => conteos[t] > 0);
  const clasificados = tipos.filter((t) => t !== NC);
  const candidatos = clasificados.length ? clasificados : tipos;
  candidatos.sort(
    (a, b) =>
      conteos[b] - conteos[a] ||
      (b === preferido) - (a === preferido) ||
      primeraVez[a] - primeraVez[b] ||
      rangoTipo(a) - rangoTipo(b),
  );
  return candidatos[0] ?? null;
}

/** Ruta que el motor asigna con el diagnóstico (mismo criterio que la vista del estudiante). */
function rutaDelDiagnostico(items) {
  const r = resumirDiagnostico(
    items.map(({ ev, error }) => ({
      analisis: error ? { estado: 'error', error } : { estado: ev.resultado === 'correcto' ? 'correcto' : 'incompleto' },
    })),
  );
  return r.dominante ?? (r.correctos === r.total ? null : NC);
}

/* ------------------------------------------------------------------ */
/* Resumen por estudiante                                              */
/* ------------------------------------------------------------------ */

/**
 * @typedef {'sin_actividad'|'diagnostico'|'en_ruta'|'atorado'|'dominado'|'inactivo'} EstadoAlumno
 */

/**
 * @typedef {object} Procedimiento
 * @property {string} ejercicio ecuación tal como se guardó en el evento
 * @property {string[]} renglones renglones del estudiante (sin el enunciado), en su posición
 * @property {object|null} error error del evento tal cual (con `detalle`, para explicarError(error, pack, 'docente'))
 * @property {string|null} resultado 'correcto' | 'error' | 'incompleto' | 'sin_entender'
 * @property {string} tipoEvento 'diagnostico' | 'practica' | 'comprobacion' | 'libre'
 * @property {string|null} fecha
 */

/**
 * @typedef {object} ResumenAlumno
 * @property {string} id
 * @property {string} nombre
 * @property {boolean} simulado id que empieza con 'sim-'
 * @property {boolean} enVivo celular real (no simulado)
 * @property {EstadoAlumno} estado ver resumirAlumnos()
 * @property {Record<string, number>} conteoErrores errores por tipo (los tipos desconocidos cuentan como NO_CLASIFICADO)
 * @property {string|null} errorDominante
 * @property {string|null} ruta tipo de la ruta asignada; null si aún no tiene ruta o si su ruta es la
 *   general (diagnóstico sin errores: en ese caso `actividad` no es null)
 * @property {string|null} ultimaActividad fecha ISO del evento más reciente
 * @property {number|null} diasSinActividad días completos desde `ultimaActividad` (null si no hay)
 * @property {number} pistasUsadas pistas que vio (por ejercicio cuenta el máximo: el cuaderno manda el acumulado)
 * @property {number} solucionesPedidas ejercicios en los que pidió ver la solución
 * @property {{intentos: number, aprobadas: number, falladas: number}} comprobaciones comprobaciones sin ayuda
 * @property {Procedimiento|null} ultimoProcedimiento el más reciente con error; si nunca se equivocó, el más reciente
 * @property {object[]} dudas eventos 'duda' (una por duda, de la más antigua a la más reciente)
 * @property {number} porRevisar errores que Tecu no pudo clasificar (NO_CLASIFICADO)
 * @property {object[]} eventos todos sus eventos reconocidos, sin duplicados, en orden cronológico
 * @property {'pregunta'|'visual'|'practica'|'comprobacion'|null} actividad actividad actual de la ruta
 * @property {{hechos: number, total: number, terminado: boolean}} diagnostico
 * @property {number} erroresSinAvanzar errores del tipo dominante en la ruta desde su último avance
 * @property {number} reinicios veces que borró su progreso y volvió a empezar el diagnóstico
 */

/** Nombres por id: acepta { id: nombre }, un Map o una lista [{ id, nombre }] (como generarGrupo().alumnos). */
function tablaNombres(nombres) {
  const tabla = new Map();
  const agregar = (id, nombre) => {
    const clave = comoTexto(id);
    if (clave) tabla.set(clave, comoTexto(nombre));
  };
  if (nombres instanceof Map) for (const [id, nombre] of nombres) agregar(id, nombre);
  else if (Array.isArray(nombres)) for (const a of nombres) esObjeto(a) && agregar(a.id, a.nombre);
  else if (esObjeto(nombres)) for (const [id, nombre] of Object.entries(nombres)) agregar(id, nombre);
  return tabla;
}

function nombrePorOmision(id) {
  if (NOMBRES_EN_VIVO.has(id)) return NOMBRES_EN_VIVO.get(id);
  const sim = /^sim-(.+)$/.exec(id);
  if (sim) return `Estudiante ${sim[1]}`;
  return id[0].toUpperCase() + id.slice(1);
}

/** Clave de un ejercicio del diagnóstico (su número, o su ecuación si no lo trae). */
function claveDiagnostico(ev, datos, k) {
  if (datos.numero !== undefined && datos.numero !== null && Number.isFinite(Number(datos.numero))) return `n:${Number(datos.numero)}`;
  const ejercicio = comoTexto(ev.ejercicio);
  return ejercicio ? `e:${bonito(ejercicio)}` : `k:${k}`;
}

/**
 * Inicio del intento actual: si el estudiante borró su progreso y empezó otra vez
 * (un nuevo ejercicio 1 del diagnóstico después de otros eventos del flujo), su
 * estado se calcula con lo que hizo desde ahí. El historial (`eventos`) conserva todo.
 */
function inicioDelIntento(items) {
  let inicio = 0;
  let reinicios = 0;
  let vistoFlujo = false;
  items.forEach(({ ev }, k) => {
    const datos = esObjeto(ev.datos) ? ev.datos : {};
    if (ev.tipo === 'diagnostico' && Number(datos.numero) === 1 && vistoFlujo) {
      inicio = k;
      reinicios += 1;
    }
    if (ev.tipo !== 'duda' && ev.tipo !== 'libre') vistoFlujo = true;
  });
  return { inicio, reinicios };
}

function resumirUno(id, items, nombre, ahora, totalPorOmision) {
  let ultima = null;
  for (const { t } of items) if (t !== null && (ultima === null || t > ultima)) ultima = t;

  const dudasPorId = new Map();
  for (const { ev } of items) {
    if (ev.tipo !== 'duda') continue;
    const dudaId = esObjeto(ev.datos) ? comoTexto(ev.datos.dudaId) : '';
    dudasPorId.set(dudaId ? `d:${dudaId}` : `e:${dudasPorId.size}`, ev); // misma duda: la versión más reciente
  }

  const { inicio, reinicios } = inicioDelIntento(items);
  const conteoErrores = {};
  const primeraVez = {};
  let desdeAvance = {};
  const diagnostico = new Map();
  const pistas = new Map();
  const soluciones = new Set();
  const comprobaciones = { intentos: 0, aprobadas: 0, falladas: 0 };
  let ruta = null;
  let rutaConocida = false;
  let tieneRuta = false;
  let totalDiagnostico = totalPorOmision;
  let actividad = null;
  let practicasBien = 0;
  let dominado = false;
  let ultimoConError = null;
  let ultimoCualquiera = null;

  for (let k = inicio; k < items.length; k++) {
    const { ev } = items[k];
    const tipo = ev.tipo;
    if (tipo === 'duda') continue;
    const datos = esObjeto(ev.datos) ? ev.datos : {};
    const ejercicio = comoTexto(ev.ejercicio);

    // Pistas: el cuaderno manda el total acumulado del ejercicio, así que se toma el máximo.
    const p = conteo(ev.pistasUsadas);
    const pidioSolucion = tipo === 'solucion' || ev.pidioSolucion === true;
    if (p || pidioSolucion) {
      const clave = ejercicio ? bonito(ejercicio) : `#${k}`;
      if (p) pistas.set(clave, Math.max(pistas.get(clave) || 0, p));
      if (pidioSolucion) soluciones.add(clave);
    }

    if ((tipo === 'ruta' || DE_RUTA.has(tipo)) && (typeof ev.ruta === 'string' || ev.ruta === null)) {
      ruta = ev.ruta ? tipoError(ev.ruta) : null;
      rutaConocida = true;
    }
    if (DE_RUTA.has(tipo)) tieneRuta = true;

    let error = null;
    if (CON_PROCEDIMIENTO.has(tipo)) {
      error = errorDe(ev);
      if (error) {
        conteoErrores[error.tipo] = (conteoErrores[error.tipo] || 0) + 1;
        if (primeraVez[error.tipo] === undefined) primeraVez[error.tipo] = k;
        if (tipo === 'practica' || tipo === 'comprobacion') desdeAvance[error.tipo] = (desdeAvance[error.tipo] || 0) + 1;
      }
      if (ejercicio) {
        ultimoCualquiera = { ev, error, ejercicio };
        if (error) ultimoConError = ultimoCualquiera;
      }
    }

    // Avance en la ruta: cada paso logrado reinicia la cuenta de errores "sin avanzar".
    if (tipo === 'diagnostico') {
      diagnostico.set(claveDiagnostico(ev, datos, k), { ev, error });
    } else if (tipo === 'ruta') {
      tieneRuta = true;
      if (conteo(datos.total)) totalDiagnostico = conteo(datos.total);
      actividad = ev.ruta === null || datos.sinErrores === true ? 'comprobacion' : 'pregunta';
      desdeAvance = {};
    } else if (tipo === 'pregunta') {
      if (ev.aprobado !== false) {
        actividad = 'visual';
        desdeAvance = {};
      } else actividad = 'pregunta';
    } else if (tipo === 'visual') {
      if (ev.aprobado !== false) {
        actividad = 'practica';
        desdeAvance = {};
      } else actividad = 'visual';
    } else if (tipo === 'practica') {
      actividad = 'practica';
      if (ev.resultado === 'correcto') {
        practicasBien += 1;
        const numero = Number(datos.numero);
        const terminoPracticas = Number.isFinite(numero) && numero > 0 ? numero >= 3 : practicasBien >= 3;
        if (datos.extra === true || terminoPracticas) actividad = 'comprobacion';
        desdeAvance = {};
      }
    } else if (tipo === 'solucion') {
      actividad = 'practica';
    } else if (tipo === 'comprobacion') {
      actividad = 'comprobacion';
      comprobaciones.intentos += 1;
      const aprobada = ev.aprobado === true || (ev.aprobado === undefined && ev.resultado === 'correcto');
      if (aprobada) {
        comprobaciones.aprobadas += 1;
        dominado = true;
        desdeAvance = {};
      } else comprobaciones.falladas += 1;
    } else if (tipo === 'dominio') {
      actividad = 'comprobacion';
      dominado = true;
      desdeAvance = {};
    }
  }

  const hechos = diagnostico.size;
  const terminado = tieneRuta || hechos >= totalDiagnostico;
  // Terminó el diagnóstico pero la ruta aún no llega (o el evento no la trae): la del motor.
  if (!rutaConocida && terminado && hechos) ruta = rutaDelDiagnostico([...diagnostico.values()]);

  const errorDominante = dominanteDe(conteoErrores, primeraVez, ruta);
  const erroresSinAvanzar = errorDominante ? desdeAvance[errorDominante] || 0 : 0;
  const diasSinActividad = diasEntre(ultima, ahora);

  let estado;
  if (dominado) estado = 'dominado';
  else if (
    (comprobaciones.falladas >= COMPROBACIONES_ATORADO && comprobaciones.aprobadas === 0) ||
    erroresSinAvanzar >= ERRORES_ATORADO
  ) estado = 'atorado';
  else if (diasSinActividad !== null && diasSinActividad >= DIAS_INACTIVO) estado = 'inactivo';
  else if (terminado) estado = 'en_ruta';
  else if (hechos > 0) estado = 'diagnostico';
  else estado = 'sin_actividad';

  let pistasUsadas = 0;
  for (const n of pistas.values()) pistasUsadas += n;
  const simulado = id.startsWith('sim-');

  return {
    id,
    nombre,
    simulado,
    enVivo: !simulado,
    estado,
    conteoErrores,
    errorDominante,
    ruta,
    ultimaActividad: ultima === null ? null : new Date(ultima).toISOString(),
    diasSinActividad,
    pistasUsadas,
    solucionesPedidas: soluciones.size,
    comprobaciones,
    ultimoProcedimiento: procedimientoDe(ultimoConError ?? ultimoCualquiera),
    dudas: [...dudasPorId.values()],
    porRevisar: conteoErrores[NC] || 0,
    eventos: items.map(({ ev }) => ev),
    actividad: tieneRuta ? actividad : null,
    diagnostico: { hechos, total: totalDiagnostico, terminado },
    erroresSinAvanzar,
    reinicios,
  };
}

/** Procedimiento para la ficha (solo se arma el que se muestra). */
function procedimientoDe(ref) {
  if (!ref) return null;
  const { ev, error, ejercicio } = ref;
  return {
    ejercicio,
    renglones: renglonesDe(ev),
    error,
    resultado: typeof ev.resultado === 'string' ? ev.resultado : null,
    tipoEvento: ev.tipo,
    fecha: typeof ev.fecha === 'string' ? ev.fecha : null,
  };
}

/** «Por revisar» para el docente: tiene errores sin clasificar y todavía no domina el tema. */
const pendienteDeRevisar = (r) => conteo(r.porRevisar) > 0 && r.estado !== 'dominado';

function gravedad(r) {
  if (r.estado !== 'atorado' && pendienteDeRevisar(r)) return GRAVEDAD.por_revisar;
  return GRAVEDAD[r.estado] ?? Object.keys(GRAVEDAD).length;
}

/**
 * Un resumen por estudiante.
 *
 * Estados (se aplica el primero que se cumple):
 *   1. `dominado`: tiene un evento 'dominio' o una comprobación sin ayuda aprobada.
 *   2. `atorado`: ≥ 2 comprobaciones sin ayuda falladas sin ninguna aprobada, o ≥ 4 errores
 *      del tipo dominante en la práctica o la comprobación sin avanzar de actividad (avanzar =
 *      asignarle la ruta, resolver la pregunta, completar la balanza o resolver bien una práctica;
 *      los errores del diagnóstico no cuentan aquí).
 *   3. `inactivo`: ≥ 7 días completos sin actividad (6 días y 23 horas todavía no cuenta).
 *   4. `en_ruta`: terminó el diagnóstico (tiene ruta, actividades de ruta o los 4 ejercicios).
 *   5. `diagnostico`: empezó el diagnóstico y no lo ha terminado.
 *   6. `sin_actividad`: no ha empezado el diagnóstico (sin eventos, o solo dudas o práctica libre).
 *
 * Si un estudiante borró su progreso y volvió a empezar, el estado y los conteos se
 * calculan con el intento actual; `eventos` guarda todo el historial y `dudas` todas sus dudas.
 *
 * Cada id de `nombres` aparece aunque no tenga eventos (estado 'sin_actividad'): pasa ahí la
 * lista del grupo. Ana, Luis e Invitado ya tienen nombre y no hace falta pasarlos.
 *
 * Orden: en vivo primero; luego por gravedad (atorado, por revisar, inactivo, sin actividad,
 * diagnóstico, en ruta, dominado) y por nombre.
 *
 * @param {object[]} eventos eventos del contrato de store.js (grupo simulado + servidor)
 * @param {{ ahora?: number|Date|string, nombres?: Record<string,string>|Map<string,string>|{id: string, nombre: string}[],
 *   totalDiagnostico?: number }} [opciones] `ahora` por omisión Date.now(); `totalDiagnostico` = 4
 * @returns {ResumenAlumno[]}
 */
export function resumirAlumnos(eventos, opciones = {}) {
  const { ahora, nombres, totalDiagnostico } = esObjeto(opciones) ? opciones : {};
  const t = aMs(ahora, Date.now());
  const total = conteo(totalDiagnostico) || TOTAL_DIAGNOSTICO;
  const tabla = tablaNombres(nombres);
  const grupos = agruparPorAlumno(eventos);
  for (const id of tabla.keys()) if (!grupos.has(id)) grupos.set(id, []);

  const resumenes = [];
  for (const [id, items] of grupos) {
    resumenes.push(resumirUno(id, items, tabla.get(id) || nombrePorOmision(id), t, total));
  }
  return resumenes.sort((a, b) => b.enVivo - a.enVivo || gravedad(a) - gravedad(b) || porNombre(a, b));
}

/* ------------------------------------------------------------------ */
/* Resumen del grupo                                                   */
/* ------------------------------------------------------------------ */

/**
 * Indicadores del grupo.
 *   - `total`: estudiantes; `activosSemana`: con actividad en los últimos 7 días;
 *     `dominados`: estado 'dominado'; `porRevisar`: estudiantes que todavía no dominan el tema
 *     y tienen al menos un error que Tecu no pudo clasificar.
 *   - `masRepetidos` (lo que más se repite en el grupo): por tipo de error, cuántos estudiantes
 *     lo tienen como dominante (`alumnos`) y cuántas veces apareció en todo el grupo
 *     (`ocurrencias`). Ordenado por estudiantes, luego por ocurrencias. No incluye
 *     NO_CLASIFICADO (no es un error que se pueda retomar en grupo: va en `porRevisar`).
 *   - Extras: `porEstado` (cuántos hay en cada estado), `enVivo` y `erroresPorRevisar` (cuántos
 *     errores sin clasificar suman esos estudiantes).
 * @param {ResumenAlumno[]} resumenes
 */
export function resumirGrupo(resumenes) {
  const lista = (Array.isArray(resumenes) ? resumenes : []).filter(esObjeto);
  const porEstado = { sin_actividad: 0, diagnostico: 0, en_ruta: 0, atorado: 0, dominado: 0, inactivo: 0 };
  const alumnos = {};
  const ocurrencias = {};
  let activosSemana = 0;
  let porRevisar = 0;
  let erroresPorRevisar = 0;
  let enVivo = 0;
  for (const r of lista) {
    if (Object.prototype.hasOwnProperty.call(porEstado, r.estado)) porEstado[r.estado] += 1;
    if (typeof r.diasSinActividad === 'number' && r.diasSinActividad < DIAS_INACTIVO) activosSemana += 1;
    if (pendienteDeRevisar(r)) {
      porRevisar += 1;
      erroresPorRevisar += conteo(r.porRevisar);
    }
    if (r.enVivo) enVivo += 1;
    const conteos = esObjeto(r.conteoErrores) ? r.conteoErrores : {};
    for (const [tipo, n] of Object.entries(conteos)) {
      if (tipo === NC || !TIPOS_ERROR.has(tipo) || !conteo(n)) continue;
      ocurrencias[tipo] = (ocurrencias[tipo] || 0) + conteo(n);
    }
    if (TIPOS_ERROR.has(r.errorDominante) && r.errorDominante !== NC) {
      alumnos[r.errorDominante] = (alumnos[r.errorDominante] || 0) + 1;
      if (ocurrencias[r.errorDominante] === undefined) ocurrencias[r.errorDominante] = 0;
    }
  }
  const masRepetidos = Object.keys(ocurrencias)
    .map((tipo) => ({ tipo, alumnos: alumnos[tipo] || 0, ocurrencias: ocurrencias[tipo] }))
    .sort((a, b) => b.alumnos - a.alumnos || b.ocurrencias - a.ocurrencias || rangoTipo(a.tipo) - rangoTipo(b.tipo));
  return {
    total: lista.length,
    activosSemana,
    dominados: porEstado.dominado,
    porRevisar,
    masRepetidos,
    porEstado,
    enVivo,
    erroresPorRevisar,
  };
}

/* ------------------------------------------------------------------ */
/* A quién llamar                                                      */
/* ------------------------------------------------------------------ */

const infoError = (pack, tipo) => {
  const errores = esObjeto(pack) && esObjeto(pack.errores) ? pack.errores : {};
  return esObjeto(errores[tipo]) ? errores[tipo] : null;
};

/** Nombre corto del error ("Signos"); '' si el paquete no lo tiene o si es NO_CLASIFICADO (la ruta general). */
const nombreCorto = (tipo, pack) => (tipo && tipo !== NC && infoError(pack, tipo) ? nombreError(tipo, pack, true) || '' : '');

/** Tema del paquete en minúscula inicial ("ecuaciones lineales con una incógnita"). */
function temaDe(pack) {
  const tema = esObjeto(pack) ? comoTexto(pack.tema) : '';
  return tema ? tema[0].toLowerCase() + tema.slice(1) : 'ecuaciones';
}

/** Texto de `pack.llamadas[motivo]` con sus datos (o el respaldo local si el paquete no lo trae). */
function textoLlamada(motivo, datos, pack) {
  const propia = esObjeto(pack) && esObjeto(pack.llamadas) ? comoTexto(pack.llamadas[motivo]) : '';
  return rellenar(propia || LLAMADAS_RESPALDO[motivo], datos);
}

/** Sugerencia de 15 minutos del paquete para un error y un ejercicio concreto. */
function sugerenciaDeError(tipo, ejercicio, pack) {
  const texto = infoError(pack, tipo) || infoError(pack, NC) ? sugerenciaLlamada(tipo, ejercicio, pack) : '';
  return texto || `Revisen juntos ${bonito(ejercicio)}: que explique cada renglón con sus palabras.`;
}

/**
 * Último ejercicio que le salió mal (el más reciente primero) que cumple `filtro(evento, tipoDeError)`.
 * @returns {{ejercicio: string, tipo: string|null, error: object|null}|null}
 */
function ultimoFallo(r, filtro = () => true) {
  const eventos = Array.isArray(r.eventos) ? r.eventos : [];
  for (let i = eventos.length - 1; i >= 0; i--) {
    const ev = eventos[i];
    if (!esObjeto(ev) || !CON_PROCEDIMIENTO.has(ev.tipo)) continue;
    const ejercicio = comoTexto(ev.ejercicio);
    if (!ejercicio) continue;
    const error = errorDe(ev);
    if (fallo(ev, error) && filtro(ev, error?.tipo ?? null)) return { ejercicio: bonito(ejercicio), tipo: error?.tipo ?? null, error };
  }
  return null;
}

/** Ejercicio nuevo del tipo pedido, distinto de los que ya vio el estudiante. */
function ejercicioGenerado(tipo, r) {
  const vistos = (Array.isArray(r.eventos) ? r.eventos : []).map((ev) => comoTexto(ev?.ejercicio)).filter(Boolean);
  return bonito(construirRuta(tipoError(tipo), `llamada:${r.id}:${tipo}`, vistos).practica[0].ecuacion);
}

/** Siguiente ejercicio del diagnóstico del paquete (el primero si no ha hecho ninguno). */
function ejercicioDelDiagnostico(pack, indice = 0) {
  const lista = esObjeto(pack) && Array.isArray(pack.diagnostico) ? pack.diagnostico : [];
  const ecuacion = comoTexto(lista[indice]?.ecuacion) || comoTexto(lista[0]?.ecuacion);
  return ecuacion ? bonito(ecuacion) : '';
}

/** El error y el ejercicio concreto con los que conviene retomar, según el motivo. */
function referencia(r, motivo, pack) {
  const procedimiento = esObjeto(r.ultimoProcedimiento) ? r.ultimoProcedimiento : null;
  const ejercicioPrevio = procedimiento ? bonito(comoTexto(procedimiento.ejercicio)) : '';
  if (motivo === 'por_revisar') {
    const f = ultimoFallo(r, (_ev, tipo) => tipo === NC);
    return { tipo: NC, ejercicio: f?.ejercicio || ejercicioPrevio || ejercicioGenerado(NC, r), error: f?.error ?? null, fallado: true };
  }
  if (motivo === 'atorado') {
    const f = ultimoFallo(r, (ev) => ev.tipo === 'practica' || ev.tipo === 'comprobacion') ?? ultimoFallo(r);
    const tipo = f?.tipo ?? r.errorDominante ?? r.ruta ?? NC;
    return { tipo, ejercicio: f?.ejercicio || ejercicioPrevio || ejercicioGenerado(tipo, r), error: f?.error ?? null, fallado: true };
  }
  if (motivo === 'inactivo') {
    const f = ultimoFallo(r);
    if (f) return { tipo: f.tipo ?? r.errorDominante ?? null, ejercicio: f.ejercicio, error: f.error, fallado: true };
    const diag = esObjeto(r.diagnostico) ? r.diagnostico : {};
    if (!diag.terminado) {
      const siguiente = ejercicioDelDiagnostico(pack, conteo(diag.hechos));
      if (siguiente) return { tipo: null, ejercicio: siguiente, error: null, fallado: false };
    }
    const tipo = r.errorDominante ?? r.ruta ?? NC;
    return { tipo: r.errorDominante ?? null, ejercicio: ejercicioGenerado(tipo, r), error: null, fallado: false };
  }
  return { tipo: null, ejercicio: ejercicioDelDiagnostico(pack) || ejercicioGenerado(NC, r), error: null, fallado: false };
}

/** Por qué llamarle, en una línea. */
function detalleDe(r, motivo, dias, ref, pack) {
  const ausente = dias !== null && dias >= DIAS_INACTIVO ? `; no entra desde hace ${dias} días` : '';
  if (motivo === 'atorado') {
    const { falladas = 0, aprobadas = 0 } = esObjeto(r.comprobaciones) ? r.comprobaciones : {};
    if (falladas >= COMPROBACIONES_ATORADO && !aprobadas) {
      const ruta = nombreCorto(r.ruta, pack);
      return `Falló ${falladas} veces la comprobación sin ayuda${ruta ? ` de ${ruta}` : ''}${ausente}`;
    }
    const n = conteo(r.erroresSinAvanzar);
    const lugar = LUGAR[r.actividad] || 'su ruta';
    if (r.errorDominante === NC) return `Lleva ${plural(n, 'error', 'errores')} que Tecu no pudo clasificar, sin avanzar en ${lugar}${ausente}`;
    const error = nombreCorto(r.errorDominante, pack);
    return `Lleva ${plural(n, 'error', 'errores')}${error ? ` de ${error}` : ''} sin avanzar en ${lugar}${ausente}`;
  }
  if (motivo === 'por_revisar') {
    const n = conteo(r.porRevisar);
    return n > 1
      ? `Tecu no pudo clasificar ${n} de sus errores (el último, en ${ref.ejercicio})${ausente}`
      : `Tecu no pudo clasificar su error en ${ref.ejercicio}${ausente}`;
  }
  if (motivo === 'inactivo') {
    const diag = esObjeto(r.diagnostico) ? r.diagnostico : {};
    let contexto = '';
    if (r.actividad && LUGAR[r.actividad]) {
      const ruta = nombreCorto(r.ruta, pack);
      contexto = ` (iba en ${LUGAR[r.actividad]}${ruta ? ` de ${ruta}` : ''})`;
    } else if (conteo(diag.hechos) && !diag.terminado) {
      contexto = ` (dejó el diagnóstico en ${conteo(diag.hechos)} de ${conteo(diag.total) || TOTAL_DIAGNOSTICO})`;
    } else if (!conteo(diag.hechos) && !diag.terminado) {
      contexto = ' (todavía no hace el diagnóstico)';
    }
    return `No entra desde hace ${dias} días${contexto}`;
  }
  const dudas = Array.isArray(r.dudas) ? r.dudas.length : 0;
  return `No ha empezado el diagnóstico${dudas ? ` (ya le escribió ${plural(dudas, 'duda', 'dudas')} a Tecu)` : ''}`;
}

/** Qué hacer en 15 minutos, con un ejercicio concreto. */
function sugerenciaDe(motivo, dias, ref, pack) {
  if (motivo === 'atorado' || motivo === 'por_revisar') return sugerenciaDeError(ref.tipo, ref.ejercicio, pack);
  if (motivo === 'inactivo') {
    const retomar = ref.fallado
      ? `Para retomar, revisen juntos ${ref.ejercicio}, el último ejercicio que no le salió.`
      : `Para retomar, empiecen con ${ref.ejercicio}.`;
    return `${textoLlamada('inactivo', { dias, tema: temaDe(pack) }, pack)} ${retomar}`;
  }
  return `${textoLlamada('sin_diagnostico', { tema: temaDe(pack) }, pack)} Empiecen con ${ref.ejercicio}.`;
}

/** Explicación del docente para el error de referencia (solo si el evento trae `detalle`). */
function explicacionDe(error, pack) {
  if (!esObjeto(error) || !esObjeto(error.detalle) || !infoError(pack, NC)) return '';
  try {
    return explicarError(error, pack, 'docente');
  } catch {
    return '';
  }
}

function motivoDe(r, dias) {
  if (r.estado === 'dominado') return null;
  if (r.estado === 'atorado') return 'atorado';
  if (pendienteDeRevisar(r)) return 'por_revisar';
  if (dias !== null && dias >= DIAS_INACTIVO) return 'inactivo';
  if (r.estado === 'sin_actividad') return 'sin_diagnostico';
  return null;
}

/** Desempate dentro de un mismo motivo: lo más grave primero. */
function desempate(a, b) {
  const ra = a.r;
  const rb = b.r;
  if (a.motivo === 'atorado') {
    const fa = conteo(ra.comprobaciones?.falladas);
    const fb = conteo(rb.comprobaciones?.falladas);
    if (fa !== fb) return fb - fa;
    const ea = conteo(ra.erroresSinAvanzar);
    const eb = conteo(rb.erroresSinAvanzar);
    if (ea !== eb) return eb - ea;
  }
  if (a.motivo === 'por_revisar' && conteo(ra.porRevisar) !== conteo(rb.porRevisar)) {
    return conteo(rb.porRevisar) - conteo(ra.porRevisar);
  }
  if ((a.dias ?? -1) !== (b.dias ?? -1)) return (b.dias ?? -1) - (a.dias ?? -1);
  return porNombre(ra, rb);
}

/**
 * A quién llamar esta semana, en orden de prioridad (motivo más urgente primero):
 *   1. `atorado` (estado atorado),
 *   2. `por_revisar` (tiene errores que Tecu no pudo clasificar),
 *   3. `inactivo` (≥ 7 días sin entrar),
 *   4. `sin_diagnostico` (no ha empezado el diagnóstico).
 * Quien ya domina el tema no aparece. Dentro de un motivo: más comprobaciones falladas, más
 * errores repetidos o más días sin entrar primero; luego por nombre.
 *
 * Cada elemento: `alumno` (el ResumenAlumno, para abrir su ficha), `motivo`, `detalle` (el porqué
 * en una línea), `sugerencia` (qué retomar en 15 minutos con un ejercicio concreto: su último
 * ejercicio fallado vía sugerenciaLlamada(), o el texto de `pack.llamadas` más un ejercicio para
 * empezar), `prioridad` (1 = la llamada más urgente). Extras: `tipo` (error que se retoma o null),
 * `ejercicio` (el ejercicio concreto, ya con formato) y `explicacion` (explicarError del docente
 * para ese ejercicio, o '' si el evento no trae `detalle`).
 *
 * @param {ResumenAlumno[]} resumenes
 * @param {object} pack paquete de contenido
 * @param {{ ahora?: number|Date|string, max?: number }} [opciones] sin `ahora` se usan los días del resumen
 */
export function aQuienLlamar(resumenes, pack, opciones = {}) {
  const { ahora, max } = esObjeto(opciones) ? opciones : {};
  const tope = max === undefined || max === null || Number.isNaN(Number(max)) ? 6 : Math.max(0, Math.floor(Number(max)));
  const t = aMs(ahora);
  const candidatos = [];
  for (const r of Array.isArray(resumenes) ? resumenes : []) {
    if (!esObjeto(r) || !comoTexto(r.id)) continue;
    const ultima = aMs(r.ultimaActividad);
    const dias = t !== null && ultima !== null ? diasEntre(ultima, t) : typeof r.diasSinActividad === 'number' ? r.diasSinActividad : null;
    const motivo = motivoDe(r, dias);
    if (motivo) candidatos.push({ r, motivo, dias });
  }
  candidatos.sort((a, b) => MOTIVOS.indexOf(a.motivo) - MOTIVOS.indexOf(b.motivo) || desempate(a, b));
  return candidatos.slice(0, tope).map(({ r, motivo, dias }, i) => {
    const ref = referencia(r, motivo, pack);
    return {
      alumno: r,
      motivo,
      detalle: detalleDe(r, motivo, dias, ref, pack),
      sugerencia: sugerenciaDe(motivo, dias, ref, pack),
      prioridad: i + 1,
      tipo: ref.tipo,
      ejercicio: ref.ejercicio,
      explicacion: motivo === 'atorado' || motivo === 'por_revisar' ? explicacionDe(ref.error, pack) : '',
    };
  });
}

/* ------------------------------------------------------------------ */
/* Grupos de refuerzo                                                  */
/* ------------------------------------------------------------------ */

/**
 * Grupos de refuerzo: estudiantes que todavía no dominan el tema, agrupados por su error
 * dominante. Solo grupos de 2 o más; del más grande al más chico (en un empate, en el orden de
 * PRIORIDAD del motor). Los estudiantes de cada grupo van por nombre.
 *
 * Cada grupo: `tipo`, `nombre` (del paquete), `alumnos` (ResumenAlumno[]), `actividad`
 * (`actividadGrupo` del paquete) y `ejercicios`: los 3 de práctica (niveles 1, 2 y 3) de
 * construirRuta(tipo, semilla + tipo), sin repetir los del diagnóstico, para el cuadernillo.
 * Extras: `nombreCorto`, `tono` y `titulo` (de la ruta), y `solucion` en cada ejercicio (clave
 * de respuestas para el docente).
 *
 * @param {ResumenAlumno[]} resumenes
 * @param {object} pack paquete de contenido
 * @param {{ semilla?: string|number }} [opciones] misma semilla => mismos ejercicios
 */
export function gruposDeRefuerzo(resumenes, pack, opciones = {}) {
  const { semilla = SEMILLA_REFUERZO } = esObjeto(opciones) ? opciones : {};
  const porTipo = new Map();
  for (const r of Array.isArray(resumenes) ? resumenes : []) {
    if (!esObjeto(r) || !comoTexto(r.id) || r.estado === 'dominado' || !r.errorDominante) continue;
    const tipo = tipoError(r.errorDominante);
    if (!porTipo.has(tipo)) porTipo.set(tipo, []);
    porTipo.get(tipo).push(r);
  }
  const evitar = esObjeto(pack) && Array.isArray(pack.diagnostico)
    ? pack.diagnostico.map((d) => comoTexto(d?.ecuacion)).filter(Boolean)
    : [];
  return [...porTipo]
    .filter(([, alumnos]) => alumnos.length >= 2)
    .sort((a, b) => b[1].length - a[1].length || rangoTipo(a[0]) - rangoTipo(b[0]))
    .map(([tipo, alumnos]) => {
      const info = infoError(pack, tipo) || {};
      const plan = construirRuta(tipo, `${semilla}${tipo}`, evitar);
      return {
        tipo,
        nombre: comoTexto(info.nombre) || tipo,
        alumnos: [...alumnos].sort(porNombre),
        actividad: comoTexto(info.actividadGrupo),
        ejercicios: plan.practica.map((e) => ({ ecuacion: e.ecuacion, nivel: e.nivel, solucion: e.solucion })),
        nombreCorto: comoTexto(info.nombreCorto) || comoTexto(info.nombre) || tipo,
        tono: comoTexto(info.tono) || 'gris',
        titulo: comoTexto(info.ruta?.titulo),
      };
    });
}
