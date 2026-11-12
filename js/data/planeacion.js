/**
 * Planeación de la próxima clase a partir de lo que el grupo necesita de verdad.
 *
 * - `sugerirPlan()` (puro): contenidos que conviene reforzar, con minutos y el detalle real
 *   (cuántos estudiantes, qué error, qué actividad). Otra `semilla` da otra propuesta para las
 *   mismas necesidades: cambia el formato de cada actividad y sus minutos. Sin modelo de lenguaje.
 * - `crearEstadoPlan()`: lo que el docente eligió para su clase ('tecu:docente:plan').
 * - `intervenciones()` (puro): antes y después REALES por estudiante: proporción de
 *   procedimientos correctos antes y después de empezar su ruta o de recibir retroalimentación.
 */
import { bonito } from '../core/engine.js';
import { hashString } from '../core/rng.js';
import { construirRuta } from '../core/ruta.js';
import { MARCA } from '../marca.js';
import { habilidadDeError } from './habilidades.js';
import { crearEstadoGuardado } from './mensajes.js';

/** Clave de localStorage con el plan del docente. */
export const CLAVE_PLAN = 'tecu:docente:plan';
/** Formatos de actividad que se alternan entre propuestas. */
export const FORMATOS_PLAN = Object.freeze(['pizarron', 'equipos', 'ejemplo']);
/** Minutos de cada formato. */
export const MINUTOS_PLAN = Object.freeze({ pizarron: 15, equipos: 20, ejemplo: 10, extra: 10 });
/** Errores distintos que entran en una propuesta (los que más se repiten). */
export const MAX_CONTENIDOS = 3;
/** Procedimientos necesarios de cada lado para comparar antes y después. */
export const MINIMO_PROCEDIMIENTOS = 2;

const NO_CLASIFICADO = 'NO_CLASIFICADO';
const DIA_MS = 24 * 60 * 60 * 1000;
const MINUTO_MS = 60 * 1000;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CON_PROCEDIMIENTO = new Set(['diagnostico', 'practica', 'comprobacion', 'libre']);
const LARGO_CITA = 60;

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const comoTexto = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
const conteo = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const conPunto = (texto) => (/[.!?…»]$/.test(texto) ? texto : `${texto}.`);
const infoError = (pack, tipo) => (esObjeto(pack) && esObjeto(pack.errores) && esObjeto(pack.errores[tipo]) ? pack.errores[tipo] : null);

/** «a», «a y b», «a, b y c». */
const enLista = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

function aMs(valor, porDefecto = null) {
  let t = NaN;
  if (valor instanceof Date) t = valor.getTime();
  else if (typeof valor === 'number') t = valor;
  else if (typeof valor === 'string' && valor.trim()) t = Date.parse(valor);
  return Number.isFinite(t) ? t : porDefecto;
}

/* ------------------------------------------------------------------ */
/* Plan sugerido                                                       */
/* ------------------------------------------------------------------ */

/**
 * @typedef {object} ContenidoPlan
 * @property {string} id estable por contenido: 'plan-<TIPO>', 'plan-diagnostico', 'plan-revisar', 'plan-extension'
 * @property {string} titulo
 * @property {number} minutos
 * @property {string} detalle cuántos estudiantes, qué error y qué hacer
 * @property {string|null} tipo tipo de error que se refuerza (null en los que no son de un error)
 * @property {'error'|'diagnostico'|'revision'|'extension'} clase
 * @property {'pizarron'|'equipos'|'ejemplo'|'extra'} formato
 * @property {number} estudiantes a cuántos se refiere
 * @property {string|null} habilidad id de la habilidad afectada por ese error
 * @property {string[]} ejercicios ecuaciones de la actividad (solo en el formato 'equipos')
 */

/** Número entero ≥ 0 a partir de la semilla: 0, 1, 2… tal cual; los textos, con su hash. */
function numeroDeSemilla(semilla) {
  if (typeof semilla === 'number' && Number.isFinite(semilla)) return Math.abs(Math.floor(semilla));
  const texto = comoTexto(semilla);
  if (!texto) return 0;
  return /^\d{1,9}$/.test(texto) ? Number(texto) : hashString(texto);
}

/** Ejercicios del equipo de refuerzo de ese error; si no hay equipo, tres nuevos del motor. */
function ejerciciosDe(tipo, grupos, pack, n) {
  const equipo = grupos.find((g) => g.tipo === tipo);
  const propios = Array.isArray(equipo?.ejercicios) ? equipo.ejercicios.map((e) => comoTexto(esObjeto(e) ? e.ecuacion : e)).filter(Boolean) : [];
  if (propios.length) return propios.map(bonito);
  try {
    const evitar = esObjeto(pack) && Array.isArray(pack.diagnostico) ? pack.diagnostico.map((d) => comoTexto(d?.ecuacion)).filter(Boolean) : [];
    return construirRuta(tipo, `plan:${n}:${tipo}`, evitar).practica.map((e) => bonito(e.ecuacion));
  } catch {
    return [];
  }
}

/** Qué hacer en clase según el formato; null si al paquete le falta lo necesario para ese formato. */
function actividadDe(formato, info, ejercicios) {
  if (formato === 'equipos') {
    return ejercicios.length ? `Trabajo en equipos con ${plural(ejercicios.length, 'ejercicio', 'ejercicios')} del cuadernillo: ${enLista(ejercicios)}.` : null;
  }
  if (formato === 'ejemplo') {
    const visual = esObjeto(info?.ruta?.visual) ? info.ruta.visual : {};
    const ecuacion = comoTexto(visual.ecuacion) || comoTexto(info?.ruta?.ejemplo);
    if (!ecuacion) return null;
    return `Ejemplo guiado en el pizarrón: resuelvan juntos ${bonito(ecuacion)}.${comoTexto(visual.cierre) ? ` ${conPunto(comoTexto(visual.cierre))}` : ''}`;
  }
  const actividad = comoTexto(info?.actividadGrupo);
  return actividad ? `Con todo el grupo. ${conPunto(actividad)}` : null;
}

const ACTIVIDAD_RESPALDO = 'Retomen en el pizarrón un ejercicio con este error y que el grupo encuentre el renglón donde cambia la solución.';

/** Contenido para reforzar un error del grupo, con el formato que le toca en esta propuesta. */
function contenidoDeError(repetido, i, n, grupos, pack) {
  const tipo = repetido.tipo;
  const info = infoError(pack, tipo);
  const ejercicios = ejerciciosDe(tipo, grupos, pack, n);
  // Si al paquete le falta lo de un formato, se usa el siguiente.
  let formato = FORMATOS_PLAN[(n + i) % FORMATOS_PLAN.length];
  let actividad = actividadDe(formato, info, ejercicios);
  for (let k = 1; !actividad && k < FORMATOS_PLAN.length; k++) {
    formato = FORMATOS_PLAN[(n + i + k) % FORMATOS_PLAN.length];
    actividad = actividadDe(formato, info, ejercicios);
  }
  const cuantos = conteo(repetido.alumnos);
  const veces = conteo(repetido.ocurrencias);
  const quienes = cuantos === 1 ? '1 estudiante lo tiene' : `${cuantos} estudiantes lo tienen`;
  return {
    id: `plan-${tipo}`,
    titulo: comoTexto(info?.nombre) || tipo,
    minutos: MINUTOS_PLAN[formato],
    detalle: `${quienes} como su error más frecuente${veces ? ` (${veces === 1 ? '1 vez' : `${veces} veces`} en el grupo)` : ''}. ${actividad || ACTIVIDAD_RESPALDO}`,
    tipo,
    clase: 'error',
    formato,
    estudiantes: cuantos,
    habilidad: habilidadDeError(tipo, pack),
    ejercicios: formato === 'equipos' ? ejercicios : [],
  };
}

function contenidoExtra(id, clase, titulo, estudiantes, detalle, tipo = null) {
  return { id, titulo, minutos: MINUTOS_PLAN.extra, detalle, tipo, clase, formato: 'extra', estudiantes, habilidad: null, ejercicios: [] };
}

/** Quienes no han hecho o no han terminado el diagnóstico. */
function contenidoDiagnostico(resumenGrupo, pack) {
  const porEstado = esObjeto(resumenGrupo.porEstado) ? resumenGrupo.porEstado : {};
  const sinEmpezar = conteo(porEstado.sin_actividad);
  const aMedias = conteo(porEstado.diagnostico);
  if (!sinEmpezar && !aMedias) return null;
  const noEmpiezan = sinEmpezar === 1 ? '1 estudiante no lo ha empezado' : `${sinEmpezar} estudiantes no lo han empezado`;
  const loDejaron = aMedias === 1 ? 'lo dejó a medias' : 'lo dejaron a medias';
  let quienes = noEmpiezan;
  if (sinEmpezar && aMedias) quienes = `${noEmpiezan} y ${aMedias} ${loDejaron}`;
  else if (aMedias) quienes = `${plural(aMedias, 'estudiante', 'estudiantes')} ${loDejaron}`;
  const total = esObjeto(pack) && Array.isArray(pack.diagnostico) ? pack.diagnostico.length : 0;
  const ecuaciones = total ? `las ${total} ecuaciones del diagnóstico` : 'el diagnóstico';
  const detalle = `${quienes}. Dales tiempo en clase para resolver ${ecuaciones}, en la app o en papel: sin diagnóstico no hay ruta.`;
  return contenidoExtra('plan-diagnostico', 'diagnostico', 'Terminar el diagnóstico', sinEmpezar + aMedias, detalle);
}

/** Errores que no se pudieron clasificar: se revisan en clase. */
function contenidoRevision(resumenGrupo, pack) {
  const cuantos = conteo(resumenGrupo.porRevisar);
  if (!cuantos) return null;
  const errores = conteo(resumenGrupo.erroresPorRevisar);
  const actividad = comoTexto(infoError(pack, NO_CLASIFICADO)?.actividadGrupo) || 'Revisión guiada: cada estudiante explica un renglón de su procedimiento al grupo.';
  const quienes = cuantos === 1 ? '1 estudiante tiene' : `${cuantos} estudiantes tienen`;
  const detalle = `${quienes} errores que ${MARCA.tutor} no pudo clasificar${errores ? ` (${errores} en total)` : ''}. ${conPunto(actividad)}`;
  return contenidoExtra('plan-revisar', 'revision', 'Revisar procedimientos en clase', cuantos, detalle, NO_CLASIFICADO);
}

const EXTENSIONES = [
  'Que inventen un problema con palabras para una ecuación y lo intercambien con alguien más para resolverlo.',
  'Que apoyen como monitores a un equipo de refuerzo: explican, pero no escriben por los demás.',
];

/** Quienes ya dominan el tema: algo más retador. */
function contenidoExtension(resumenGrupo, n) {
  const cuantos = conteo(resumenGrupo.dominados);
  if (!cuantos) return null;
  const quienes = cuantos === 1 ? '1 estudiante ya aprobó' : `${cuantos} estudiantes ya aprobaron`;
  const detalle = `${quienes} la comprobación sin ayuda. ${EXTENSIONES[n % EXTENSIONES.length]}`;
  return contenidoExtra('plan-extension', 'extension', 'Extensión para quienes ya dominan el tema', cuantos, detalle);
}

/**
 * Propuesta para la próxima clase: los errores que más se repiten (hasta 3) y, si aplican,
 * terminar el diagnóstico, revisar lo que no se pudo clasificar y una extensión para quienes
 * ya dominan el tema. Todo con números reales del grupo.
 *
 * `semilla` permite «Generar otra propuesta»: con semillas enteras consecutivas (0, 1, 2…) el
 * formato de cada actividad rota entre pizarrón (15 min), equipos con el cuadernillo (20 min) y
 * ejemplo guiado (10 min), así que cada propuesta es distinta de la anterior; el ciclo se repite
 * cada 3. Misma semilla y mismos datos ⇒ misma propuesta.
 *
 * @param {object} resumenGrupo lo que devuelve resumirGrupo(resumenes)
 * @param {object[]} grupos lo que devuelve gruposDeRefuerzo(resumenes, pack, { semilla })
 * @param {object} pack paquete de contenido
 * @param {{ semilla?: number|string, max?: number }} [opciones] `max`: errores distintos (3)
 * @returns {ContenidoPlan[]}
 */
export function sugerirPlan(resumenGrupo, grupos, pack, opciones = {}) {
  const { semilla, max } = esObjeto(opciones) ? opciones : {};
  const resumen = esObjeto(resumenGrupo) ? resumenGrupo : {};
  const equipos = (Array.isArray(grupos) ? grupos : []).filter(esObjeto);
  const n = numeroDeSemilla(semilla);
  const tope = max === undefined || max === null || Number.isNaN(Number(max)) ? MAX_CONTENIDOS : Math.max(0, Math.floor(Number(max)));
  const repetidos = (Array.isArray(resumen.masRepetidos) ? resumen.masRepetidos : [])
    .filter((r) => esObjeto(r) && comoTexto(r.tipo) && r.tipo !== NO_CLASIFICADO && conteo(r.alumnos) > 0)
    .slice(0, tope);
  return [
    ...repetidos.map((repetido, i) => contenidoDeError(repetido, i, n, equipos, pack)),
    contenidoDiagnostico(resumen, pack),
    contenidoRevision(resumen, pack),
    contenidoExtension(resumen, n),
  ].filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Estado del plan (lo que eligió el docente)                          */
/* ------------------------------------------------------------------ */

const listaDeIds = (v) => (Array.isArray(v) ? [...new Set(v.map(comoTexto).filter(Boolean))] : []);

/**
 * Plan del docente, guardado en este equipo: qué contenidos eligió y qué propuesta está viendo.
 * @param {import('./mensajes.js').OpcionesGuardado} [opciones] inyección para pruebas
 */
export function crearEstadoPlan(opciones = {}) {
  const guardado = crearEstadoGuardado(CLAVE_PLAN, opciones);

  const leer = () => {
    const valor = guardado.leer();
    return esObjeto(valor) ? valor : {};
  };
  const guardar = (cambio) => guardado.guardar({ ...leer(), ...cambio });

  /**
   * Ids de los contenidos elegidos.
   * @param {string[]} [porDefecto] lo que se considera elegido mientras el docente no haya tocado nada
   * @returns {string[]}
   */
  function elegidos(porDefecto = []) {
    const propios = leer().elegidos;
    return listaDeIds(Array.isArray(propios) ? propios : porDefecto);
  }

  /** Marca o desmarca un contenido. @returns {string[]} los elegidos que quedaron */
  function alternar(id, porDefecto = []) {
    const clave = comoTexto(id);
    const actuales = elegidos(porDefecto);
    if (!clave) return actuales;
    const nuevos = actuales.includes(clave) ? actuales.filter((x) => x !== clave) : [...actuales, clave];
    guardar({ elegidos: nuevos });
    return nuevos;
  }

  /** Reemplaza la selección completa (p. ej. al aceptar una propuesta nueva). @returns {string[]} */
  function elegir(ids) {
    const nuevos = listaDeIds(ids);
    guardar({ elegidos: nuevos });
    return nuevos;
  }

  /** @returns {number} semilla de la propuesta que se está viendo (0 la primera) */
  const semilla = () => conteo(leer().semilla);

  /** «Generar otra propuesta»: pasa a la siguiente semilla. @returns {number} la nueva semilla */
  function otraSemilla() {
    const nueva = semilla() + 1;
    guardar({ semilla: nueva });
    return nueva;
  }

  return {
    elegidos,
    alternar,
    elegir,
    /** ¿Está elegido? */
    esta: (id, porDefecto = []) => elegidos(porDefecto).includes(comoTexto(id)),
    semilla,
    otraSemilla,
    /** `fn` se llama cuando cambia el plan (aquí, en otra pestaña o al reiniciar la demostración). */
    suscribir: guardado.suscribir,
  };
}

/* ------------------------------------------------------------------ */
/* Intervenciones: antes y después                                     */
/* ------------------------------------------------------------------ */

/**
 * @typedef {object} Intervencion
 * @property {string} alumnoId
 * @property {string} nombre
 * @property {string|null} tipo tipo de error de su ruta (o su error más frecuente)
 * @property {number|null} antes % de procedimientos correctos antes; null si hay menos de 2
 * @property {number|null} despues % de procedimientos correctos después; null si hay menos de 2
 * @property {string} que qué se hizo y cuándo («Ruta «…», desde el 9 de noviembre»)
 * @property {'ruta'|'retroalimentacion'} clase
 * @property {string|null} fecha ISO: cuándo empezó la intervención
 * @property {{ bien: number, total: number }} cuentaAntes
 * @property {{ bien: number, total: number }} cuentaDespues
 * @property {number|null} cambio despues − antes (puntos); null si falta alguno
 */

/** «hoy», «ayer» o «el 9 de noviembre» (calendario local). */
function cuando(t, ahora, desfaseMin) {
  const dia = (x) => Math.floor((x + desfaseMin * MINUTO_MS) / DIA_MS);
  const dias = dia(ahora) - dia(t);
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  const local = new Date(t + desfaseMin * MINUTO_MS);
  return `el ${local.getUTCDate()} de ${MESES[local.getUTCMonth()]}`;
}

/** Procedimientos revisados de un estudiante: { t, bien, tipo }. Los que copió de la solución no cuentan. */
function procedimientosDe(resumen) {
  const eventos = Array.isArray(resumen.eventos) ? resumen.eventos : [];
  return eventos
    .filter((ev) => esObjeto(ev) && CON_PROCEDIMIENTO.has(ev.tipo) && ev.pidioSolucion !== true)
    .map((ev) => ({ t: aMs(ev.fecha), bien: ev.resultado === 'correcto' && !esObjeto(ev.error) && ev.aprobado !== false, tipo: ev.tipo }));
}

function cuenta(procedimientos) {
  return { bien: procedimientos.filter((p) => p.bien).length, total: procedimientos.length };
}

const porcentaje = ({ bien, total }, minimo) => (total >= minimo ? Math.round((100 * bien) / total) : null);

function armar(resumen, clase, fecha, antes, despues, que, minimo) {
  const cuentaAntes = cuenta(antes);
  const cuentaDespues = cuenta(despues);
  const a = porcentaje(cuentaAntes, minimo);
  const d = porcentaje(cuentaDespues, minimo);
  return {
    alumnoId: resumen.id,
    nombre: comoTexto(resumen.nombre) || resumen.id,
    tipo: comoTexto(resumen.ruta) || comoTexto(resumen.errorDominante) || null,
    antes: a,
    despues: d,
    que,
    clase,
    fecha: fecha === null ? null : new Date(fecha).toISOString(),
    cuentaAntes,
    cuentaDespues,
    cambio: a === null || d === null ? null : d - a,
  };
}

/** Su ruta: antes = el diagnóstico; después = la práctica y la comprobación desde que la recibió. */
function intervencionRuta(resumen, procedimientos, pack, ctx) {
  const eventos = Array.isArray(resumen.eventos) ? resumen.eventos : [];
  const inicio = [...eventos].reverse().find((ev) => esObjeto(ev) && ev.tipo === 'ruta');
  if (!inicio) return null;
  const t = aMs(inicio.fecha);
  const antes = procedimientos.filter((p) => p.tipo === 'diagnostico');
  const despues = procedimientos.filter((p) => (p.tipo === 'practica' || p.tipo === 'comprobacion') && (t === null || p.t === null || p.t >= t));
  const titulo = comoTexto(inicio.datos?.titulo) || comoTexto(infoError(pack, inicio.ruta)?.ruta?.titulo);
  const desde = t === null ? '' : `, desde ${cuando(t, ctx.ahora, ctx.desfaseMin)}`;
  const que = `Ruta${titulo ? ` «${titulo}»` : ' personalizada'}${desde}: del diagnóstico a la práctica y la comprobación`;
  return armar(resumen, 'ruta', t, antes, despues, que, ctx.minimo);
}

const esPara = (m, id) => m.para === id || m.para === 'grupo' || (Array.isArray(m.para) && m.para.includes(id));

/** La primera retroalimentación que recibió: antes y después de ese momento. */
function intervencionMensaje(resumen, procedimientos, mensajes, ctx) {
  const recibidos = mensajes
    .filter((m) => esPara(m, resumen.id))
    .map((m) => ({ m, t: aMs(m.entregado ?? m.fecha) }))
    .filter(({ t }) => t !== null)
    .sort((a, b) => a.t - b.t);
  if (!recibidos.length) return null;
  const { m, t } = recibidos[0];
  const fechados = procedimientos.filter((p) => p.t !== null);
  const texto = comoTexto(m.texto);
  const cita = texto.length > LARGO_CITA ? `${texto.slice(0, LARGO_CITA).trimEnd()}…` : texto;
  const dia = cuando(t, ctx.ahora, ctx.desfaseMin);
  const que = `Retroalimentación ${dia.startsWith('el ') ? `d${dia}` : `de ${dia}`}${cita ? `: «${cita}»` : ''}`;
  return armar(resumen, 'retroalimentacion', t, fechados.filter((p) => p.t < t), fechados.filter((p) => p.t >= t), que, ctx.minimo);
}

/** Mensajes entregados: acepta la lista de `bandeja()` o el objeto de crearMensajes(). */
function entregadosDe(mensajes) {
  let lista = mensajes;
  if (esObjeto(mensajes) && typeof mensajes.bandeja === 'function') {
    try {
      lista = mensajes.bandeja();
    } catch {
      lista = [];
    }
  }
  return (Array.isArray(lista) ? lista : []).filter((m) => esObjeto(m) && m.estado !== 'en_cola');
}

/**
 * ¿Funcionaron las intervenciones? Por estudiante, hasta dos comparaciones reales:
 *   - 'ruta': % de procedimientos correctos en el diagnóstico (antes) y en la práctica y la
 *     comprobación de su ruta (después);
 *   - 'retroalimentacion': % de procedimientos correctos antes y después del primer mensaje
 *     que recibió del docente (los mensajes en cola no cuentan: aún no los recibe).
 * `antes` o `despues` son null si hay menos de 2 procedimientos de ese lado (no alcanza para
 * comparar). Los procedimientos que resolvió después de ver la solución no cuentan.
 * No aparecen quienes no tienen ruta ni mensajes.
 *
 * @param {object[]} resumenes ResumenAlumno[] de resumirAlumnos() (se usan sus `eventos`)
 * @param {object[]|{ bandeja: () => object[] }} mensajes `mensajes.bandeja()` o el objeto de crearMensajes()
 * @param {{ ahora?: number|Date|string, pack?: object, desfaseMin?: number, minimo?: number }} [opciones]
 *   `pack`: para el título de la ruta si el evento no lo trae; `desfaseMin`: reloj local respecto
 *   a UTC en minutos (por omisión, el del dispositivo)
 * @returns {Intervencion[]} en el orden de `resumenes`; de cada estudiante, primero su ruta
 */
export function intervenciones(resumenes, mensajes, opciones = {}) {
  const { ahora, pack, desfaseMin, minimo } = esObjeto(opciones) ? opciones : {};
  const t = aMs(ahora, Date.now());
  const ctx = {
    ahora: t,
    desfaseMin: typeof desfaseMin === 'number' && Number.isFinite(desfaseMin) ? desfaseMin : -new Date(t).getTimezoneOffset() || 0,
    minimo: conteo(minimo) || MINIMO_PROCEDIMIENTOS,
  };
  const entregados = entregadosDe(mensajes);
  return (Array.isArray(resumenes) ? resumenes : [])
    .filter((r) => esObjeto(r) && comoTexto(r.id))
    .flatMap((r) => {
      const procedimientos = procedimientosDe(r);
      return [intervencionRuta(r, procedimientos, pack, ctx), intervencionMensaje(r, procedimientos, entregados, ctx)].filter(Boolean);
    });
}
