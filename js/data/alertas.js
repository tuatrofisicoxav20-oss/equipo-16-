/**
 * Alertas de reforzamiento del panel docente: SUGERENCIAS automáticas, nunca diagnósticos.
 *
 * - `generarAlertas()` (puro): convierte «a quién llamar» (atorado, por revisar, inactivo, sin
 *   diagnóstico) y el error que más se repite en el grupo en tarjetas con lo observado, el
 *   porqué y qué retomar en 15 minutos. Los ids son estables: la misma situación da el mismo
 *   id en cada recálculo, así lo que el docente ya revisó no vuelve a aparecer como nuevo.
 * - `crearEstadoAlertas()`: lo que el docente hizo con cada alerta (revisarla, descartarla,
 *   editar la sugerencia), guardado en este equipo ('tecu:docente:alertas').
 *
 * Todo sale de reglas fijas sobre los eventos reales: no interviene ningún modelo de lenguaje.
 */
import { MARCA } from '../marca.js';
import { COMPROBACIONES_ATORADO, DIAS_INACTIVO, ERRORES_ATORADO, aQuienLlamar } from './analitica.js';
import { habilidadDeError } from './habilidades.js';
import { crearEstadoGuardado } from './mensajes.js';

/** Clave de localStorage con el estado de las alertas del docente. */
export const CLAVE_ALERTAS = 'tecu:docente:alertas';
/** Etiqueta que acompaña a cada alerta en pantalla. */
export const ETIQUETA_ALERTA = 'Sugerencia automática · no es un diagnóstico';
/** Estados de una alerta, en el orden de las pestañas. */
export const ESTADOS_ALERTA = Object.freeze(['nueva', 'revisada', 'descartada']);
/** Motivo de la alerta de grupo (los de estudiante son los de «a quién llamar»). */
export const MOTIVO_GRUPO = 'error_repetido';
/** Máximo de alertas de estudiante por omisión (van primero las más urgentes). */
export const MAX_ALERTAS = 12;
/** Largo máximo de una sugerencia editada. */
export const MAX_SUGERENCIA = 400;

const NO_CLASIFICADO = 'NO_CLASIFICADO';
const NOMBRES_A_LA_VISTA = 3;

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const comoTexto = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
const conteo = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
const conPunto = (texto) => (/[.!?…»]$/.test(texto) ? texto : `${texto}.`);
const infoError = (pack, tipo) => (esObjeto(pack) && esObjeto(pack.errores) && esObjeto(pack.errores[tipo]) ? pack.errores[tipo] : null);

/* ------------------------------------------------------------------ */
/* Generar alertas                                                     */
/* ------------------------------------------------------------------ */

/**
 * @typedef {object} Alerta
 * @property {string} id estable: 'al-<alumno>-<motivo>' o 'al-grupo-<TIPO>'
 * @property {'estudiante'|'grupo'} ambito
 * @property {string|null} alumnoId null en las de grupo
 * @property {string} quien nombre del estudiante o del grupo
 * @property {string|null} tipo tipo de error que se retoma (null si no aplica)
 * @property {'atorado'|'por_revisar'|'inactivo'|'sin_diagnostico'|'error_repetido'} motivo
 * @property {string} texto lo observado, en una oración
 * @property {string} sugerencia qué retomar en 15 minutos (el docente puede editarla)
 * @property {string} explicacion por qué aparece la alerta (la regla) y, si se conoce, qué hizo el estudiante
 * @property {string} titulo encabezado corto de la tarjeta
 * @property {string|null} habilidad id de la habilidad afectada por ese error (null si no aplica)
 * @property {string} ejercicio ejercicio concreto de la sugerencia ('' en las de grupo)
 * @property {string[]} alumnos ids de los estudiantes a los que se refiere (para retroalimentar)
 * @property {string} etiqueta ETIQUETA_ALERTA
 * @property {number} prioridad 1 = la primera de la lista
 */

/** Por qué aparece cada alerta: la regla, con los mismos umbrales de analitica.js. */
const PORQUE = {
  atorado: `Aparece cuando alguien falla ${COMPROBACIONES_ATORADO} veces o más la comprobación sin ayuda sin aprobarla, o junta ${ERRORES_ATORADO} errores del mismo tipo sin avanzar en su ruta.`,
  por_revisar: `Aparece cuando ${MARCA.tutor} encuentra el renglón donde cambió la solución, pero ninguna regla del catálogo explica el error: conviene que lo veas tú.`,
  inactivo: `Aparece cuando pasan ${DIAS_INACTIVO} días o más sin actividad registrada. Puede ser falta de celular o de datos, no de interés.`,
  sin_diagnostico: `Aparece cuando todavía no hay ningún ejercicio del diagnóstico registrado. Sin diagnóstico, ${MARCA.tutor} no puede armarle una ruta.`,
  error_repetido:
    'Aparece porque es el error principal de más estudiantes. Sale de revisar renglón por renglón lo que escribió cada quien.',
};

const TITULOS = {
  atorado: 'Se atoró en su ruta',
  por_revisar: 'Error por revisar',
  inactivo: 'Sin actividad reciente',
  sin_diagnostico: 'Diagnóstico pendiente',
};

/** Nombre del error para personas; '' si el paquete no lo tiene o no se pudo clasificar. */
function nombreDe(tipo, pack) {
  return tipo && tipo !== NO_CLASIFICADO ? comoTexto(infoError(pack, tipo)?.nombre) : '';
}

function tituloDe(motivo, tipo, pack) {
  const nombre = motivo === 'atorado' ? nombreDe(tipo, pack) : '';
  return nombre ? `Se atoró: ${nombre[0].toLowerCase()}${nombre.slice(1)}` : TITULOS[motivo] || 'Para revisar';
}

function explicacionDe(llamada) {
  const regla = PORQUE[llamada.motivo] || '';
  const hecho = comoTexto(llamada.explicacion);
  if (!hecho) return regla;
  return llamada.motivo === 'atorado' ? `${regla} En su último intento: ${hecho}` : `${regla} ${hecho}`;
}

/** Alerta de un estudiante a partir de un elemento de aQuienLlamar(). */
function alertaDeEstudiante(llamada, pack) {
  const r = llamada.alumno;
  const tipo = comoTexto(llamada.tipo) || null;
  return {
    id: `al-${r.id}-${llamada.motivo}`,
    ambito: 'estudiante',
    alumnoId: r.id,
    quien: comoTexto(r.nombre) || r.id,
    tipo,
    motivo: llamada.motivo,
    texto: conPunto(comoTexto(llamada.detalle)),
    sugerencia: comoTexto(llamada.sugerencia),
    explicacion: explicacionDe(llamada),
    titulo: tituloDe(llamada.motivo, tipo, pack),
    habilidad: tipo ? habilidadDeError(tipo, pack) : null,
    ejercicio: comoTexto(llamada.ejercicio),
    alumnos: [r.id],
    etiqueta: ETIQUETA_ALERTA,
  };
}

/** «Sofía M.», «Sofía M. y Diego R.», «Sofía M., Diego R., Camila P. y 3 más». */
function listaDeNombres(nombres) {
  const vista = nombres.slice(0, NOMBRES_A_LA_VISTA);
  const resto = nombres.length - vista.length;
  if (resto > 0) return `${vista.join(', ')} y ${resto} más`;
  return vista.length < 2 ? vista.join('') : `${vista.slice(0, -1).join(', ')} y ${vista[vista.length - 1]}`;
}

/** Quienes tienen ese error como el más frecuente y todavía no dominan el tema. */
function equipoDe(resumenes, tipo) {
  return resumenes.filter((r) => esObjeto(r) && comoTexto(r.id) && r.errorDominante === tipo && r.estado !== 'dominado');
}

function sugerenciaDeGrupo(info, equipo) {
  const actividad =
    comoTexto(info?.actividadGrupo) ||
    'Retomen en el pizarrón un ejercicio con este error y que el grupo encuentre el renglón donde cambia la solución.';
  const nombres = equipo.map((r) => comoTexto(r.nombre) || r.id);
  const refuerzo = nombres.length >= 2 ? ` Equipo de refuerzo: ${conPunto(listaDeNombres(nombres))}` : '';
  return `Actividad de 15 minutos con todo el grupo. ${conPunto(actividad)}${refuerzo}`;
}

/**
 * Alerta del error que más se repite: el primero de `resumenGrupo.masRepetidos` si es el
 * error principal de 2 estudiantes o más. null si no hay un patrón de grupo.
 */
function alertaDeGrupo(resumenes, resumenGrupo, pack, grupo) {
  const primero = esObjeto(resumenGrupo) && Array.isArray(resumenGrupo.masRepetidos) ? resumenGrupo.masRepetidos[0] : null;
  const tipo = esObjeto(primero) ? comoTexto(primero.tipo) : '';
  const cuantos = conteo(primero?.alumnos);
  if (!tipo || tipo === NO_CLASIFICADO || cuantos < 2) return null;
  const info = infoError(pack, tipo);
  const nombre = comoTexto(info?.nombre) || tipo;
  const total = Math.max(conteo(resumenGrupo.total), cuantos);
  const veces = conteo(primero.ocurrencias);
  const equipo = equipoDe(resumenes, tipo);
  const resumen = comoTexto(info?.resumen);
  return {
    id: `al-grupo-${tipo}`,
    ambito: 'grupo',
    alumnoId: null,
    quien: comoTexto(grupo) ? `Grupo ${comoTexto(grupo)}` : 'Todo el grupo',
    tipo,
    motivo: MOTIVO_GRUPO,
    texto: `${cuantos} de ${total} estudiantes tienen «${nombre}» como su error más frecuente${veces ? ` (apareció ${veces} ${veces === 1 ? 'vez' : 'veces'} en el grupo)` : ''}.`,
    sugerencia: sugerenciaDeGrupo(info, equipo),
    explicacion: resumen ? `${conPunto(resumen)} ${PORQUE.error_repetido}` : PORQUE.error_repetido,
    titulo: nombre,
    habilidad: habilidadDeError(tipo, pack),
    ejercicio: '',
    alumnos: equipo.map((r) => r.id),
    etiqueta: ETIQUETA_ALERTA,
  };
}

function llamadasSeguras(resumenes, pack, opciones) {
  try {
    return aQuienLlamar(resumenes, pack, opciones);
  } catch (error) {
    console.error('[tecu] No se pudieron calcular las alertas', error);
    return [];
  }
}

/**
 * Alertas del grupo: primero la del error que más se repite (si lo hay) y luego una por
 * estudiante que conviene atender, de la más urgente a la menos urgente (atorado, por revisar,
 * inactivo, sin diagnóstico; quien ya domina el tema no aparece).
 *
 * @param {object[]} resumenes ResumenAlumno[] de resumirAlumnos()
 * @param {object} resumenGrupo lo que devuelve resumirGrupo(resumenes)
 * @param {object} pack paquete de contenido
 * @param {{ ahora?: number|Date|string, max?: number, grupo?: string }} [opciones]
 *   `max`: tope de alertas de estudiante (12); `grupo`: nombre del grupo para `quien` («1.º A»)
 * @returns {Alerta[]}
 */
export function generarAlertas(resumenes, resumenGrupo, pack, opciones = {}) {
  const { ahora, max, grupo } = esObjeto(opciones) ? opciones : {};
  const lista = Array.isArray(resumenes) ? resumenes : [];
  const tope = max === undefined || max === null || Number.isNaN(Number(max)) ? MAX_ALERTAS : Math.max(0, Math.floor(Number(max)));
  const deGrupo = alertaDeGrupo(lista, resumenGrupo, pack, grupo);
  const deEstudiantes = llamadasSeguras(lista, pack, { ahora, max: tope }).map((llamada) => alertaDeEstudiante(llamada, pack));
  return [...(deGrupo ? [deGrupo] : []), ...deEstudiantes].map((alerta, i) => ({ ...alerta, prioridad: i + 1 }));
}

/* ------------------------------------------------------------------ */
/* Estado de las alertas (lo que hizo el docente)                      */
/* ------------------------------------------------------------------ */

/**
 * @typedef {{ estado: 'nueva'|'revisada'|'descartada', sugerencia: string|null }} EstadoAlerta
 *   `sugerencia`: la que escribió el docente; null = se usa la original de la alerta
 */

const esEstado = (v) => ESTADOS_ALERTA.includes(v);

/** Registro guardado → { estado, sugerencia, previo } con valores válidos. */
function normalizar(registro) {
  const r = esObjeto(registro) ? registro : {};
  return {
    estado: esEstado(r.estado) ? r.estado : 'nueva',
    sugerencia: comoTexto(r.sugerencia) || null,
    previo: esEstado(r.previo) && r.previo !== 'descartada' ? r.previo : null,
  };
}

const esInicial = (r) => r.estado === 'nueva' && r.sugerencia === null;
const idDe = (alerta) => comoTexto(esObjeto(alerta) ? alerta.id : alerta);

/**
 * Estado de las alertas del docente, guardado en este equipo. Una alerta sin registro es
 * 'nueva' y usa su sugerencia original. Cada cambio devuelve el estado que quedó.
 *
 * @param {import('./mensajes.js').OpcionesGuardado} [opciones] inyección para pruebas
 */
export function crearEstadoAlertas(opciones = {}) {
  const guardado = crearEstadoGuardado(CLAVE_ALERTAS, opciones);

  const todos = () => {
    const valor = guardado.leer();
    return esObjeto(valor) ? valor : {};
  };

  /**
   * @param {string|Alerta} id id de la alerta (o la alerta)
   * @returns {EstadoAlerta}
   */
  function estado(id) {
    const { estado: e, sugerencia } = normalizar(todos()[idDe(id)]);
    return { estado: e, sugerencia };
  }

  /** Aplica `cambio(registro)` y guarda; lo que vuelve a quedar como al inicio se borra. */
  function cambiar(id, cambio) {
    const clave = idDe(id);
    if (!clave) return estado(id);
    const registros = todos();
    const nuevo = normalizar({ ...normalizar(registros[clave]), ...cambio(normalizar(registros[clave])) });
    if (esInicial(nuevo)) delete registros[clave];
    else registros[clave] = nuevo.previo ? nuevo : { estado: nuevo.estado, sugerencia: nuevo.sugerencia };
    guardado.guardar(Object.keys(registros).length ? registros : null);
    return { estado: nuevo.estado, sugerencia: nuevo.sugerencia };
  }

  /** «Marcar como revisada». */
  const revisar = (id) => cambiar(id, () => ({ estado: 'revisada', previo: null }));

  /** «Volver a por revisar» (solo si estaba revisada). */
  const deshacerRevision = (id) => cambiar(id, (r) => (r.estado === 'revisada' ? { estado: 'nueva' } : {}));

  /** «Descartar»: recuerda cómo estaba para poder deshacerlo con `restaurar()`. */
  const descartar = (id) => cambiar(id, (r) => (r.estado === 'descartada' ? {} : { estado: 'descartada', previo: r.estado }));

  /** «Deshacer» o «Restaurar»: la alerta descartada vuelve a como estaba (nueva o revisada). */
  const restaurar = (id) => cambiar(id, (r) => (r.estado === 'descartada' ? { estado: r.previo || 'nueva', previo: null } : {}));

  /**
   * «Editar sugerencia». Un texto vacío, o igual a `original`, vuelve a la sugerencia original.
   * @param {string|Alerta} id
   * @param {string} texto
   * @param {string} [original] sugerencia original de la alerta (si pasas la alerta, se toma de ella)
   */
  function editar(id, texto, original) {
    const propia = comoTexto(texto).slice(0, MAX_SUGERENCIA);
    const base = comoTexto(original ?? (esObjeto(id) ? id.sugerencia : ''));
    return cambiar(id, () => ({ sugerencia: propia && propia !== base ? propia : null }));
  }

  /** «Usar la sugerencia original»: quita la edición del docente (el estado no cambia). */
  const reiniciar = (id) => cambiar(id, () => ({ sugerencia: null }));

  /** Sugerencia que se muestra: la editada por el docente o la original. */
  const sugerenciaDe = (alerta) => estado(alerta).sugerencia ?? comoTexto(alerta?.sugerencia);

  /**
   * Cuántas hay en cada estado (para las pestañas «Por revisar · Revisadas · Descartadas»).
   * @param {Alerta[]} alertas
   * @returns {{ nueva: number, revisada: number, descartada: number, total: number }}
   */
  function contar(alertas) {
    const registros = todos();
    const cuenta = { nueva: 0, revisada: 0, descartada: 0, total: 0 };
    for (const alerta of Array.isArray(alertas) ? alertas : []) {
      if (!idDe(alerta)) continue;
      cuenta[normalizar(registros[idDe(alerta)]).estado] += 1;
      cuenta.total += 1;
    }
    return cuenta;
  }

  /** @returns {number} alertas por revisar (contador de la navegación) */
  const pendientes = (alertas) => contar(alertas).nueva;

  /**
   * Las alertas de un estado, en su orden.
   * @param {Alerta[]} alertas
   * @param {'nueva'|'revisada'|'descartada'|'todas'} [cual='nueva']
   */
  function filtrar(alertas, cual = 'nueva') {
    const registros = todos();
    const lista = (Array.isArray(alertas) ? alertas : []).filter((a) => idDe(a));
    return esEstado(cual) ? lista.filter((a) => normalizar(registros[idDe(a)]).estado === cual) : lista;
  }

  return {
    estado,
    revisar,
    deshacerRevision,
    descartar,
    restaurar,
    editar,
    reiniciar,
    sugerenciaDe,
    contar,
    pendientes,
    filtrar,
    /** `fn` se llama cuando cambia el estado (aquí, en otra pestaña o al reiniciar la demostración). */
    suscribir: guardado.suscribir,
  };
}
