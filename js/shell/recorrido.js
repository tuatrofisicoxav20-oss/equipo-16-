/**
 * Recorrido guiado de la demostración (puro: sin DOM).
 *
 * Cada paso lleva a una pantalla con el perfil, el estudiante y la conexión adecuados y,
 * si hace falta, siembra datos de ejemplo (la vista los crea con el motor y los guiones):
 *   { titulo, detalle, perfil: 'estudiante'|'docente', alumno?, sinInternet, ruta, sembrar? }
 * `sembrar`: 'diagnostico' | 'ruta' | 'practica' (ver docs/UNIFICACION.md → { cmd: 'sembrar' }).
 *
 * Los pasos salen de `pack.recorrido` (packs/ecuaciones-1.json). RESPALDO LOCAL: mientras
 * el paquete no traiga esa sección, se usan los pasos del prototipo adaptados a Ana y Luis.
 */
import { PERFILES, clasificarRuta, leerHash, limpiarAlumno } from './rutas.js';

export const NIVELES_SIEMBRA = Object.freeze(['diagnostico', 'ruta', 'practica']);

/** Pasos del prototipo de interfaz, adaptados a Ana y Luis. */
export const RECORRIDO_RESPALDO = Object.freeze([
  { titulo: 'Diagnóstico y ruta personalizada', detalle: 'Ana · con internet', perfil: 'estudiante', alumno: 'ana', sinInternet: false, ruta: '/inicio', sembrar: 'ruta' },
  { titulo: 'Otro error, otra ruta', detalle: 'Luis · con internet', perfil: 'estudiante', alumno: 'luis', sinInternet: false, ruta: '/inicio', sembrar: 'ruta' },
  { titulo: 'Diagnóstico renglón por renglón', detalle: 'Invitado · empieza de cero', perfil: 'estudiante', alumno: 'invitado', sinInternet: false, ruta: '/diagnostico', sembrar: null },
  { titulo: 'Tutor que guía sin dar respuestas', detalle: 'Preguntas y pistas en escalera', perfil: 'estudiante', alumno: 'ana', sinInternet: false, ruta: '/tutor', sembrar: 'ruta' },
  { titulo: 'Sin internet: la lección sigue', detalle: 'Las pistas funcionan; las dudas esperan', perfil: 'estudiante', alumno: 'ana', sinInternet: true, ruta: '/tutor', sembrar: 'ruta' },
  { titulo: 'Comprobar lo aprendido sin ayuda', detalle: 'Distingue apoyo de dominio', perfil: 'estudiante', alumno: 'ana', sinInternet: false, ruta: '/comprobar', sembrar: 'practica' },
  { titulo: 'Mapa de aprendizaje del grupo', detalle: 'Docente · con internet', perfil: 'docente', sinInternet: false, ruta: '/grupo', sembrar: null },
  { titulo: 'Alertas para revisar', detalle: 'Sugerencias, no diagnósticos', perfil: 'docente', sinInternet: false, ruta: '/alertas', sembrar: null },
  { titulo: 'Seguimiento individual', detalle: 'El renglón donde se rompió el procedimiento', perfil: 'docente', sinInternet: false, ruta: '/alumnos', sembrar: null },
  { titulo: 'Planear la clase', detalle: 'Con base en necesidades reales', perfil: 'docente', sinInternet: false, ruta: '/planeacion', sembrar: null },
]);

/**
 * Deja un paso con la forma esperada, o null si no sirve (sin título, perfil o ruta válidos).
 * Acepta la ruta con o sin «#» y con parámetro («/alumnos/ana»).
 */
export function normalizarPaso(paso) {
  if (!paso || typeof paso !== 'object') return null;
  const titulo = String(paso.titulo ?? '').trim();
  const perfil = PERFILES.includes(paso.perfil) ? paso.perfil : null;
  const hash = String(paso.ruta ?? '').replace(/^#?\/?/, '#/');
  const leida = leerHash(hash);
  if (!titulo || !perfil || !leida) return null;
  const clase = clasificarRuta(perfil, leida.ruta);
  if (clase.tipo !== 'propia') return null;
  return {
    titulo,
    detalle: String(paso.detalle ?? '').trim(),
    perfil,
    alumno: perfil === 'estudiante' ? limpiarAlumno(paso.alumno) : paso.alumno ? limpiarAlumno(paso.alumno) : null,
    sinInternet: Boolean(paso.sinInternet),
    ruta: hash.slice(1),
    sembrar: NIVELES_SIEMBRA.includes(paso.sembrar) ? paso.sembrar : null,
  };
}

/**
 * Pasos del recorrido: los del paquete si existen y son válidos; si no, el respaldo local.
 * @param {object|null} pack paquete de contenido (packs/ecuaciones-1.json)
 */
export function pasosDelRecorrido(pack) {
  const delPaquete = Array.isArray(pack?.recorrido) ? pack.recorrido.map(normalizarPaso).filter(Boolean) : [];
  return delPaquete.length ? delPaquete : RECORRIDO_RESPALDO.map(normalizarPaso).filter(Boolean);
}
