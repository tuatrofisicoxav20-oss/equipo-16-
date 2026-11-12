/**
 * Dominio por habilidad, racha y minutos de estudio (unificación con el prototipo de interfaz).
 *
 * El tema tiene 5 habilidades (`pack.habilidades`, o el respaldo acordado de abajo). Con los
 * eventos de UN estudiante se calcula, para cada una, un valor de 0 a 100 o `null` si todavía
 * no hay evidencia. Lo usan «Mis habilidades» (estudiante) y el mapa del grupo (docente).
 *
 * REGLA DE DOMINIO (simple y explicable; es la misma que exporta `REGLA_DOMINIO` para mostrarla):
 *   1. Evidencia a favor (+) o en contra (−) de cada habilidad:
 *        · cada error clasificado en un procedimiento (diagnóstico, práctica, comprobación, modo
 *          libre): −1 para la habilidad de ese tipo de error (lo que no se pudo clasificar no cuenta);
 *        · cada procedimiento correcto: +1 para las habilidades de procedimiento (las que tienen
 *          errores asociados); con pistas vale ½ y, si pidió ver la solución, no cuenta;
 *        · cada respuesta del diagnóstico rápido (evento 'rapido'): ±½ (una pregunta de opción
 *          múltiple vale la mitad que un procedimiento escrito);
 *        · la comprobación sin ayuda aprobada vale por tres (+3).
 *   2. Lo reciente pesa más: en cada habilidad, la evidencia más nueva cuenta completa y cada
 *      una de las anteriores cuenta el 80 % de la que le sigue (1, 0.8, 0.64…).
 *   3. valor = 100 × (a favor + ½) ÷ (a favor + en contra + 1), redondeado. El «½ y 1» evita que
 *      un solo dato dé 0 o 100: un procedimiento correcto son 75; un error, 25.
 *   4. Si lo más reciente es una comprobación sin ayuda aprobada, el valor no baja de 70: lo que
 *      se demuestra sin ayuda queda como dominado hasta que aparezca un error nuevo.
 *   5. Niveles: ≥ 70 Dominado · ≥ 45 En progreso · < 45 Necesita apoyo · sin evidencia, Sin datos.
 *
 * Módulo puro y determinista: sin DOM ni almacenamiento. Tolera eventos desordenados, repetidos
 * por id, de tipos desconocidos o con campos faltantes: nunca lanza y no modifica lo que recibe.
 */
import { TIPOS } from '../core/engine.js';

/* ------------------------------------------------------------------ */
/* Constantes públicas                                                 */
/* ------------------------------------------------------------------ */

/**
 * Habilidades del tema si el paquete todavía no trae `habilidades` (respaldo acordado).
 * `errores`: tipos de error del motor que cuentan en contra de la habilidad.
 */
export const HABILIDADES_RESPALDO = Object.freeze(
  [
    { id: 'leer', nombre: 'Interpretar el enunciado', corto: 'Leer', errores: [] },
    {
      id: 'inversas',
      nombre: 'Operaciones inversas',
      corto: 'Inversas',
      errores: [TIPOS.SIGNO_TRANSPOSICION, TIPOS.INVERSA_EQUIVOCADA, TIPOS.UN_SOLO_LADO],
    },
    {
      id: 'despejar',
      nombre: 'Despejar la incógnita',
      corto: 'Despejar',
      errores: [TIPOS.TERMINOS_NO_SEMEJANTES, TIPOS.SIGNO_NEGATIVO],
    },
    { id: 'comprobar', nombre: 'Comprobar la solución', corto: 'Comprobar', errores: [TIPOS.ARITMETICA] },
    { id: 'plantear', nombre: 'Plantear problemas', corto: 'Plantear', errores: [] },
  ].map((h) => Object.freeze({ ...h, errores: Object.freeze(h.errores) })),
);

/** Niveles de dominio, del más alto al más bajo (`min`: valor mínimo; null = sin datos). */
export const NIVELES = Object.freeze([
  Object.freeze({ id: 'ok', etiqueta: 'Dominado', min: 70 }),
  Object.freeze({ id: 'mid', etiqueta: 'En progreso', min: 45 }),
  Object.freeze({ id: 'low', etiqueta: 'Necesita apoyo', min: 0 }),
  Object.freeze({ id: 'none', etiqueta: 'Sin datos', min: null }),
]);

/** Cuánto vale cada evidencia (ver la regla de arriba). */
export const PESOS = Object.freeze({ rapido: 0.5, error: 1, procedimiento: 1, conPistas: 0.5, comprobacion: 3 });

/** Lo reciente pesa más: cada evidencia cuenta esta fracción de la que le sigue en el tiempo. */
export const OLVIDO = 0.8;

/** Valor mínimo cuando lo más reciente de una habilidad es una comprobación sin ayuda aprobada. */
export const PISO_COMPROBACION = 70;

/** La regla en palabras, para explicarla en pantalla («¿Cómo se calcula?»). */
export const REGLA_DOMINIO = Object.freeze([
  'Cada error que se pudo clasificar cuenta en contra de la habilidad de ese error. Cada procedimiento correcto cuenta a favor; con pistas vale la mitad y, si se pidió ver la solución, no cuenta.',
  'Cada respuesta del diagnóstico rápido vale la mitad que un procedimiento escrito: a favor si fue correcta y en contra si no.',
  'La comprobación sin ayuda aprobada vale por tres y deja la habilidad en 70 % o más mientras no aparezca un error nuevo.',
  'Lo reciente pesa más: cada dato cuenta un poco menos (80 %) que el dato que le sigue.',
  'Con un solo dato nunca se llega a 0 % ni a 100 %. De 70 % en adelante es «Dominado»; de 45 % a 69 %, «En progreso»; menos de 45 %, «Necesita apoyo».',
]);

const DIA_MS = 24 * 60 * 60 * 1000;
const MINUTO_MS = 60 * 1000;
/** Más de esta pausa entre dos registros se considera otro rato de estudio. */
const PAUSA_MAX_MS = 30 * MINUTO_MS;
/** Cada rato de estudio cuenta al menos esto (también un registro suelto). */
const MINIMO_SESION_MS = MINUTO_MS;
const MAX_DIAS = 60;
/** Eventos con un procedimiento escrito que el motor revisó. */
const CON_PROCEDIMIENTO = new Set(['diagnostico', 'practica', 'comprobacion', 'libre']);
const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const comoTexto = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const esValor = (v) => typeof v === 'number' && Number.isFinite(v);

/** Milisegundos de una fecha (Date, número o texto ISO); `porDefecto` si no se entiende. */
function aMs(valor, porDefecto = null) {
  let t = NaN;
  if (valor instanceof Date) t = valor.getTime();
  else if (typeof valor === 'number') t = valor;
  else if (typeof valor === 'string' && valor.trim()) t = Date.parse(valor);
  return Number.isFinite(t) ? t : porDefecto;
}

/** Orden cronológico; lo que no tiene fecha válida va primero, en el orden en que llegó. */
function cronologico(a, b) {
  if (a.t !== b.t) {
    if (a.t === null) return -1;
    if (b.t === null) return 1;
    return a.t - b.t;
  }
  return a.i - b.i;
}

/**
 * Eventos (objetos) sin repetidos por id —gana la última versión, como en el "servidor"— y en
 * orden cronológico. Con `alumno`, solo los suyos.
 * @returns {{ ev: object, t: number|null, i: number }[]}
 */
function ordenar(eventos, alumno) {
  const filtro = comoTexto(alumno);
  const unicos = new Map();
  (Array.isArray(eventos) ? eventos : []).forEach((ev, i) => {
    if (!esObjeto(ev) || (filtro && comoTexto(ev.alumno) !== filtro)) return;
    const id = comoTexto(ev.id);
    unicos.set(id ? `id:${id}` : `#${i}`, { ev, t: aMs(ev.fecha), i });
  });
  return [...unicos.values()].sort(cronologico);
}

/** Desfase del reloj local respecto a UTC, en minutos (−360 en Veracruz). */
function desfaseLocal(desfaseMin, ahora) {
  if (esValor(desfaseMin)) return desfaseMin;
  return -new Date(ahora).getTimezoneOffset() || 0;
}

/** Número de día del calendario local (días completos desde 1970). */
const diaLocal = (t, desfaseMin) => Math.floor((t + desfaseMin * MINUTO_MS) / DIA_MS);

/* ------------------------------------------------------------------ */
/* Habilidades del paquete                                             */
/* ------------------------------------------------------------------ */

/**
 * @typedef {{ id: string, nombre: string, corto: string, errores: string[] }} Habilidad
 */

function normalizarHabilidad(h) {
  const id = esObjeto(h) ? comoTexto(h.id) : '';
  if (!id) return null;
  const respaldo = HABILIDADES_RESPALDO.find((r) => r.id === id);
  const nombre = comoTexto(h.nombre) || respaldo?.nombre || id;
  const errores = Array.isArray(h.errores) ? h.errores.map(comoTexto).filter(Boolean) : [...(respaldo?.errores ?? [])];
  return { id, nombre, corto: comoTexto(h.corto) || respaldo?.corto || nombre, errores };
}

/**
 * Habilidades del tema: `pack.habilidades` si existe; si no, el respaldo acordado.
 * Siempre devuelve copias (se pueden modificar sin afectar al paquete).
 * @param {object} [pack]
 * @returns {Habilidad[]}
 */
export function habilidadesDe(pack) {
  const propias = esObjeto(pack) && Array.isArray(pack.habilidades) ? pack.habilidades : [];
  const vistas = new Set();
  const lista = [];
  for (const h of propias.map(normalizarHabilidad)) {
    if (!h || vistas.has(h.id)) continue;
    vistas.add(h.id);
    lista.push(h);
  }
  return lista.length ? lista : HABILIDADES_RESPALDO.map((h) => ({ ...h, errores: [...h.errores] }));
}

/**
 * Habilidad a la que afecta un tipo de error (p. ej. SIGNO_TRANSPOSICION → 'inversas').
 * @param {string} tipo tipo de error del motor
 * @param {object} [pack]
 * @returns {string|null} id de la habilidad; null si el error no tiene habilidad (NO_CLASIFICADO)
 */
export function habilidadDeError(tipo, pack) {
  const buscado = comoTexto(tipo);
  if (!buscado) return null;
  return habilidadesDe(pack).find((h) => h.errores.includes(buscado))?.id ?? null;
}

/**
 * Nivel de un valor de dominio.
 * @param {number|null} valor 0–100, o null si no hay datos
 * @returns {{ id: 'ok'|'mid'|'low'|'none', etiqueta: string }}
 */
export function nivelDe(valor) {
  const nivel = !esValor(valor) ? NIVELES[3] : valor >= 70 ? NIVELES[0] : valor >= 45 ? NIVELES[1] : NIVELES[2];
  return { id: nivel.id, etiqueta: nivel.etiqueta };
}

/* ------------------------------------------------------------------ */
/* Evidencias                                                          */
/* ------------------------------------------------------------------ */

/**
 * Contexto de un cálculo: habilidades, las de procedimiento y las preguntas rápidas del paquete.
 */
function crearContexto(pack) {
  const habilidades = habilidadesDe(pack);
  const rapidas = esObjeto(pack) && Array.isArray(pack.diagnosticoRapido) ? pack.diagnosticoRapido.filter(esObjeto) : [];
  const errores = esObjeto(pack) && esObjeto(pack.errores) ? pack.errores : {};
  const deError = new Map();
  for (const h of habilidades) for (const tipo of h.errores) if (!deError.has(tipo)) deError.set(tipo, h.id);
  return {
    habilidades,
    ids: new Set(habilidades.map((h) => h.id)),
    deProcedimiento: habilidades.filter((h) => h.errores.length).map((h) => h.id),
    deError,
    rapidas,
    rapidaPorId: new Map(rapidas.map((q) => [comoTexto(q.id), q])),
    nombreError: (tipo) => comoTexto(errores[tipo]?.nombre) || tipo.toLowerCase().replace(/_/g, ' '),
  };
}

/** Id de habilidad a partir de su id o de su posición (0–4, como en el prototipo de interfaz). */
function idHabilidad(valor, ctx) {
  if (typeof valor === 'string') return ctx.ids.has(valor.trim()) ? valor.trim() : null;
  return Number.isInteger(valor) && ctx.habilidades[valor] ? ctx.habilidades[valor].id : null;
}

/**
 * ¿Acertó una pregunta rápida? `correcta` puede ser booleano (acertó o no) o el índice de la
 * opción correcta (se compara con `elegida`); si falta, se consulta la pregunta del paquete.
 * @returns {boolean|null} null si no se puede saber
 */
function aciertoDe(respuesta, pregunta) {
  if (typeof respuesta.correcta === 'boolean') return respuesta.correcta;
  if (!Number.isInteger(respuesta.elegida)) return null;
  if (Number.isInteger(respuesta.correcta)) return respuesta.elegida === respuesta.correcta;
  return Number.isInteger(pregunta?.correcta) ? respuesta.elegida === pregunta.correcta : null;
}

/** Evidencias de un evento 'rapido': una por respuesta que se pueda atribuir a una habilidad. */
function evidenciasRapido(ev, ctx) {
  const respuestas = esObjeto(ev.datos) && Array.isArray(ev.datos.respuestas) ? ev.datos.respuestas : [];
  return respuestas.flatMap((cruda, i) => {
    const r = Number.isInteger(cruda) ? { elegida: cruda } : cruda;
    if (!esObjeto(r)) return [];
    const pregunta = ctx.rapidaPorId.get(comoTexto(r.id)) ?? (comoTexto(r.id) ? null : ctx.rapidas[i]) ?? null;
    const habilidad = idHabilidad(r.habilidad, ctx) ?? idHabilidad(pregunta?.habilidad, ctx);
    const acierto = aciertoDe(r, pregunta);
    if (!habilidad || acierto === null) return [];
    return [{ habilidad, clase: 'rapido', tipo: null, aFavor: acierto, peso: PESOS.rapido }];
  });
}

/** Entero ≥ 0 (lo que no es número cuenta como 0). */
const conteo = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);

/** Evidencias de un procedimiento revisado por el motor (ver la regla al inicio del archivo). */
function evidenciasProcedimiento(ev, ctx) {
  const tipoError = esObjeto(ev.error) ? comoTexto(ev.error.tipo) : '';
  if (tipoError) {
    const habilidad = ctx.deError.get(tipoError);
    return habilidad ? [{ habilidad, clase: 'error', tipo: tipoError, aFavor: false, peso: PESOS.error }] : [];
  }
  if (ev.resultado !== 'correcto' || ev.pidioSolucion === true) return [];
  let clase = 'procedimiento';
  let peso = PESOS.procedimiento;
  if (ev.tipo === 'comprobacion') {
    if (ev.aprobado === false) return [];
    clase = 'comprobacion';
    peso = PESOS.comprobacion;
  } else if (conteo(ev.pistasUsadas) > 0) {
    clase = 'con_pistas';
    peso = PESOS.conPistas;
  }
  return ctx.deProcedimiento.map((habilidad) => ({ habilidad, clase, tipo: null, aFavor: true, peso }));
}

/**
 * Evidencias por habilidad, en orden cronológico.
 * @returns {Map<string, { clase: string, tipo: string|null, aFavor: boolean, peso: number, t: number|null }[]>}
 */
function reunirEvidencias(ordenados, ctx) {
  const porHabilidad = new Map(ctx.habilidades.map((h) => [h.id, []]));
  for (const { ev, t } of ordenados) {
    let nuevas = [];
    if (ev.tipo === 'rapido') nuevas = evidenciasRapido(ev, ctx);
    else if (CON_PROCEDIMIENTO.has(ev.tipo)) nuevas = evidenciasProcedimiento(ev, ctx);
    for (const { habilidad, ...evidencia } of nuevas) porHabilidad.get(habilidad).push({ ...evidencia, t });
  }
  return porHabilidad;
}

/** Peso real de cada evidencia, de la más nueva a la más antigua: cada anterior, OLVIDO veces la siguiente. */
function conRecencia(evidencias) {
  let factor = 1;
  const pesadas = [];
  for (let i = evidencias.length - 1; i >= 0; i--) {
    pesadas.push({ ...evidencias[i], efectivo: evidencias[i].peso * factor });
    factor *= OLVIDO;
  }
  return pesadas;
}

/**
 * valor = 100 × (a favor + ½) ÷ (a favor + en contra + 1); null si no hay evidencia.
 * `pesadas` va de la más nueva a la más antigua: si la más nueva es una comprobación sin ayuda
 * aprobada, el valor no baja de PISO_COMPROBACION.
 */
function valorDe(pesadas) {
  if (!pesadas.length) return null;
  let favor = 0;
  let contra = 0;
  for (const e of pesadas) {
    if (e.aFavor) favor += e.efectivo;
    else contra += e.efectivo;
  }
  const valor = Math.round((100 * (favor + 0.5)) / (favor + contra + 1));
  return pesadas[0].clase === 'comprobacion' ? Math.max(valor, PISO_COMPROBACION) : valor;
}

const TEXTO_EVIDENCIA = {
  rapido: (n, aFavor) =>
    aFavor
      ? `${plural(n, 'acierto', 'aciertos')} en el diagnóstico rápido`
      : `${plural(n, 'respuesta incorrecta', 'respuestas incorrectas')} en el diagnóstico rápido`,
  error: (n, _aFavor, nombre) => `${plural(n, 'error', 'errores')} de «${nombre}»`,
  procedimiento: (n) => `${plural(n, 'procedimiento correcto', 'procedimientos correctos')} sin ayuda`,
  con_pistas: (n) => `${plural(n, 'procedimiento correcto', 'procedimientos correctos')} con pistas`,
  comprobacion: (n) => plural(n, 'comprobación sin ayuda aprobada', 'comprobaciones sin ayuda aprobadas'),
};

/**
 * Evidencias agrupadas por clase y tipo de error, de la que más pesa a la que menos.
 * @returns {Evidencia[]}
 */
function agruparEvidencias(pesadas, ctx) {
  const grupos = new Map();
  for (const e of pesadas) {
    const clave = `${e.clase}|${e.tipo ?? ''}|${e.aFavor}`;
    if (!grupos.has(clave)) grupos.set(clave, { clase: e.clase, tipo: e.tipo, aFavor: e.aFavor, veces: 0, peso: 0 });
    const g = grupos.get(clave);
    g.veces += 1;
    g.peso += e.efectivo;
  }
  return [...grupos.values()]
    .sort((a, b) => b.peso - a.peso)
    .map((g) => ({
      ...g,
      peso: Math.round(g.peso * 100) / 100,
      texto: TEXTO_EVIDENCIA[g.clase](g.veces, g.aFavor, g.tipo ? ctx.nombreError(g.tipo) : ''),
    }));
}

/* ------------------------------------------------------------------ */
/* Dominio                                                             */
/* ------------------------------------------------------------------ */

/**
 * @typedef {object} Evidencia
 * @property {'rapido'|'error'|'procedimiento'|'con_pistas'|'comprobacion'} clase
 * @property {string|null} tipo tipo de error (solo en la clase 'error')
 * @property {boolean} aFavor
 * @property {number} veces cuántas evidencias de esta clase
 * @property {number} peso lo que pesan en el valor, ya con la recencia (2 decimales)
 * @property {string} texto p. ej. «3 errores de «Signo al cambiar de lado»»
 */

/**
 * @typedef {object} DominioHabilidad
 * @property {string} id
 * @property {string} nombre
 * @property {string} corto
 * @property {number|null} valor 0–100; null si no hay evidencia
 * @property {'ok'|'mid'|'low'|'none'} nivel
 * @property {string} etiqueta 'Dominado' | 'En progreso' | 'Necesita apoyo' | 'Sin datos'
 * @property {Evidencia[]} evidencias lo que explica el valor, de lo que más pesa a lo que menos
 * @property {number} aFavor cuántas evidencias a favor (sin pesos)
 * @property {number} enContra cuántas evidencias en contra (sin pesos)
 * @property {string} detalle las evidencias en una línea («3 errores de … · 1 procedimiento correcto sin ayuda»)
 * @property {string|null} ultima fecha ISO de la evidencia más reciente
 * @property {number|null} dias días completos desde `ultima` (para «Para repasar»)
 */

function dominioDe(habilidad, evidencias, ctx, ahora) {
  const pesadas = conRecencia(evidencias);
  const valor = valorDe(pesadas);
  const nivel = nivelDe(valor);
  const agrupadas = agruparEvidencias(pesadas, ctx);
  let ultima = null;
  for (const e of evidencias) if (e.t !== null && (ultima === null || e.t > ultima)) ultima = e.t;
  return {
    id: habilidad.id,
    nombre: habilidad.nombre,
    corto: habilidad.corto,
    valor,
    nivel: nivel.id,
    etiqueta: nivel.etiqueta,
    evidencias: agrupadas,
    aFavor: evidencias.filter((e) => e.aFavor).length,
    enContra: evidencias.filter((e) => !e.aFavor).length,
    detalle: agrupadas.map((g) => g.texto).join(' · '),
    ultima: ultima === null ? null : new Date(ultima).toISOString(),
    dias: ultima === null ? null : Math.max(0, Math.floor((ahora - ultima) / DIA_MS)),
  };
}

function dominioCon(ordenados, ctx, ahora) {
  const evidencias = reunirEvidencias(ordenados, ctx);
  return ctx.habilidades.map((h) => dominioDe(h, evidencias.get(h.id), ctx, ahora));
}

/**
 * Dominio de UN estudiante en cada habilidad del tema (ver la regla al inicio del archivo).
 * Pasa solo sus eventos (p. ej. `store.eventos()`), o todos con `alumno` para filtrarlos.
 *
 * Evento del diagnóstico rápido: `{ tipo: 'rapido', datos: { respuestas: [{ id, habilidad,
 * elegida, correcta }] } }`, con `correcta: true|false` (¿acertó?). También se acepta `correcta`
 * como índice de la opción correcta (se compara con `elegida`).
 *
 * @param {object[]} eventos eventos del contrato de store.js (más el tipo 'rapido')
 * @param {object} [pack] paquete de contenido (habilidades, nombres de los errores)
 * @param {{ ahora?: number|Date|string, alumno?: string }} [opciones] `ahora` solo afecta a `dias`
 * @returns {DominioHabilidad[]} una por habilidad, en el orden del tema
 */
export function dominioPorHabilidad(eventos, pack, opciones = {}) {
  const { ahora, alumno } = esObjeto(opciones) ? opciones : {};
  return dominioCon(ordenar(eventos, alumno), crearContexto(pack), aMs(ahora, Date.now()));
}

/** Ids de una lista de alumnos: acepta ['ana'], [{ id }] o un Map/objeto { id: nombre }. */
function idsDe(alumnos) {
  if (alumnos instanceof Map) return [...alumnos.keys()].map(comoTexto).filter(Boolean);
  if (Array.isArray(alumnos)) return alumnos.map((a) => comoTexto(esObjeto(a) ? a.id : a)).filter(Boolean);
  return esObjeto(alumnos) ? Object.keys(alumnos) : [];
}

/**
 * Dominio de cada estudiante del grupo, a partir de TODOS los eventos (grupo simulado +
 * "servidor"). Úsala para el mapa por habilidades: `resumirAlumnos()` de analitica.js no
 * conserva los eventos 'rapido' en `resumen.eventos`.
 * @param {object[]} eventos
 * @param {object} [pack]
 * @param {{ ahora?: number|Date|string, alumnos?: string[]|{id: string}[]|Map<string, any>|object }} [opciones]
 *   `alumnos`: ids que deben aparecer aunque no tengan eventos (todas sus habilidades en null)
 * @returns {Map<string, DominioHabilidad[]>} id del alumno → su dominio
 */
export function dominioPorAlumno(eventos, pack, opciones = {}) {
  const { ahora, alumnos } = esObjeto(opciones) ? opciones : {};
  const ctx = crearContexto(pack);
  const t = aMs(ahora, Date.now());
  const grupos = new Map(idsDe(alumnos).map((id) => [id, []]));
  for (const item of ordenar(eventos)) {
    const id = comoTexto(item.ev.alumno);
    if (!id) continue;
    if (!grupos.has(id)) grupos.set(id, []);
    grupos.get(id).push(item);
  }
  return new Map([...grupos].map(([id, items]) => [id, dominioCon(items, ctx, t)]));
}

/** Valores (número o null) de un dominio, tolerando entradas raras. */
const valoresDe = (dominio) => (Array.isArray(dominio) ? dominio.map((h) => (esObjeto(h) && esValor(h.valor) ? h.valor : null)) : []);

/** Promedio redondeado de los valores con datos; null si ninguno tiene. */
function promedio(valores) {
  const conDatos = valores.filter(esValor);
  return conDatos.length ? Math.round(conDatos.reduce((a, b) => a + b, 0) / conDatos.length) : null;
}

/**
 * «Dominio del tema» de un estudiante: promedio de sus habilidades con datos.
 * @param {DominioHabilidad[]} dominio
 * @returns {number|null} 0–100; null si no hay datos
 */
export function dominioGeneral(dominio) {
  return promedio(valoresDe(dominio));
}

/**
 * Dominio del grupo por habilidad: promedio y cuántos hay en cada nivel
 * («9 de 28 necesitan apoyo»).
 * @param {Iterable<DominioHabilidad[]>|Map<string, DominioHabilidad[]>} dominios uno por estudiante
 *   (el Map de dominioPorAlumno() o una lista)
 * @param {object} [pack]
 * @returns {{ id: string, nombre: string, corto: string, promedio: number|null, nivel: string, etiqueta: string,
 *   total: number, conDatos: number, dominan: number, enProgreso: number, necesitanApoyo: number, sinDatos: number }[]}
 */
export function resumirDominio(dominios, pack) {
  const lista = (dominios instanceof Map ? [...dominios.values()] : Array.isArray(dominios) ? dominios : []).filter(Array.isArray);
  return habilidadesDe(pack).map((h) => {
    const valores = lista.map((d) => valoresDe(d.filter((x) => esObjeto(x) && x.id === h.id))[0] ?? null);
    const niveles = valores.map((v) => nivelDe(v).id);
    const cuantos = (id) => niveles.filter((n) => n === id).length;
    const media = promedio(valores);
    const nivel = nivelDe(media);
    return {
      id: h.id,
      nombre: h.nombre,
      corto: h.corto,
      promedio: media,
      nivel: nivel.id,
      etiqueta: nivel.etiqueta,
      total: lista.length,
      conDatos: lista.length - cuantos('none'),
      dominan: cuantos('ok'),
      enProgreso: cuantos('mid'),
      necesitanApoyo: cuantos('low'),
      sinDatos: cuantos('none'),
    };
  });
}

/**
 * Habilidad que toca reforzar hoy: la de menor valor entre las que tienen datos y aún no
 * están dominadas (< 70). Si todas las que tienen datos ya están dominadas, la primera sin
 * datos. En un empate, la primera en el orden del tema.
 * @param {DominioHabilidad[]} dominio
 * @returns {number} índice en `dominio`; −1 si todas están dominadas (o si no hay habilidades)
 */
export function habilidadActual(dominio) {
  const valores = valoresDe(dominio);
  let actual = -1;
  valores.forEach((v, i) => {
    if (v !== null && v < 70 && (actual < 0 || v < valores[actual])) actual = i;
  });
  return actual >= 0 ? actual : valores.indexOf(null);
}

/**
 * Habilidad más débil: la de menor valor entre las que tienen datos, aunque ya esté dominada
 * (para «Reforzar: …» en la lista de estudiantes).
 * @param {DominioHabilidad[]} dominio
 * @returns {number} índice; −1 si ninguna tiene datos
 */
export function habilidadMasDebil(dominio) {
  const valores = valoresDe(dominio);
  let debil = -1;
  valores.forEach((v, i) => {
    if (v !== null && (debil < 0 || v < valores[debil])) debil = i;
  });
  return debil;
}

/**
 * ¿Aparece con el filtro «solo quienes necesitan apoyo»? Sí, si alguna habilidad está en
 * «Necesita apoyo» (< 45) o si le faltan datos en 2 o más.
 * @param {DominioHabilidad[]} dominio
 * @returns {boolean}
 */
export function necesitaApoyo(dominio) {
  const valores = valoresDe(dominio);
  return valores.some((v) => v !== null && v < 45) || valores.filter((v) => v === null).length >= 2;
}

/* ------------------------------------------------------------------ */
/* Racha y minutos                                                     */
/* ------------------------------------------------------------------ */

/** Momentos (ms) con actividad hasta el final de hoy, en orden; sin repetidos por id. */
function momentos(eventos, alumno, hoy, desfaseMin) {
  return ordenar(eventos, alumno)
    .map(({ t }) => t)
    .filter((t) => t !== null && diaLocal(t, desfaseMin) <= hoy);
}

/**
 * Racha: días seguidos con actividad, terminando hoy (o ayer, si hoy todavía no entra: la
 * racha no se pierde hasta que pasa un día completo sin actividad).
 * @param {object[]} eventos eventos de un estudiante (cualquier tipo con fecha cuenta como actividad)
 * @param {{ ahora?: number|Date|string, desfaseMin?: number, alumno?: string }} [opciones]
 *   `desfaseMin`: minutos del reloj local respecto a UTC (por omisión, el del dispositivo; −360 en Veracruz)
 * @returns {number} días (0 si no hay racha)
 */
export function racha(eventos, opciones = {}) {
  const { ahora, desfaseMin, alumno } = esObjeto(opciones) ? opciones : {};
  const t = aMs(ahora, Date.now());
  const desfase = desfaseLocal(desfaseMin, t);
  const hoy = diaLocal(t, desfase);
  const dias = new Set(momentos(eventos, alumno, hoy, desfase).map((m) => diaLocal(m, desfase)));
  let dia = dias.has(hoy) ? hoy : hoy - 1;
  let seguidos = 0;
  while (dias.has(dia)) {
    seguidos += 1;
    dia -= 1;
  }
  return seguidos;
}

/**
 * Minutos de estudio de cada uno de los últimos `dias` días (el último es hoy).
 * Se suma el tiempo entre registros seguidos; una pausa de más de 30 minutos empieza otro
 * rato de estudio, y cada rato cuenta al menos 1 minuto. Es una estimación a partir de los
 * registros: no hay cronómetro.
 * @param {object[]} eventos eventos de un estudiante
 * @param {{ ahora?: number|Date|string, dias?: number, desfaseMin?: number, alumno?: string }} [opciones]
 * @returns {number[]} `dias` enteros, del día más antiguo a hoy
 */
export function minutosPorDia(eventos, opciones = {}) {
  const { ahora, dias, desfaseMin, alumno } = esObjeto(opciones) ? opciones : {};
  const t = aMs(ahora, Date.now());
  const desfase = desfaseLocal(desfaseMin, t);
  const n = Math.min(MAX_DIAS, Math.max(1, Math.floor(Number(dias)) || 7));
  const hoy = diaLocal(t, desfase);
  const ms = new Array(n).fill(0);
  let previo = null;
  for (const m of momentos(eventos, alumno, hoy, desfase)) {
    const pausa = previo === null ? Infinity : m - previo;
    const indice = n - 1 - (hoy - diaLocal(m, desfase));
    if (indice >= 0) ms[indice] += pausa <= PAUSA_MAX_MS ? pausa : MINIMO_SESION_MS;
    previo = m;
  }
  return ms.map((x) => (x > 0 ? Math.max(1, Math.round(x / MINUTO_MS)) : 0));
}

/**
 * Los días que corresponden a `minutosPorDia()` (misma longitud y orden), para rotular la gráfica.
 * @param {{ ahora?: number|Date|string, dias?: number, desfaseMin?: number }} [opciones]
 * @returns {{ fecha: string, nombre: string, corto: string, hoy: boolean }[]}
 *   `fecha` 'AAAA-MM-DD' (calendario local), `nombre` 'lunes', `corto` 'L'
 */
export function diasDeLaSemana(opciones = {}) {
  const { ahora, dias, desfaseMin } = esObjeto(opciones) ? opciones : {};
  const t = aMs(ahora, Date.now());
  const desfase = desfaseLocal(desfaseMin, t);
  const n = Math.min(MAX_DIAS, Math.max(1, Math.floor(Number(dias)) || 7));
  const hoy = diaLocal(t, desfase);
  return Array.from({ length: n }, (_, i) => {
    const dia = hoy - (n - 1 - i);
    const fecha = new Date(dia * DIA_MS); // medianoche UTC de ese día del calendario local
    const nombre = NOMBRES_DIA[fecha.getUTCDay()];
    return { fecha: fecha.toISOString().slice(0, 10), nombre, corto: nombre[0].toUpperCase(), hoy: dia === hoy };
  });
}
