/**
 * Rutas y navegación del cascarón (puro: sin DOM, se puede probar con node).
 *
 * La identidad va en la URL (?vista=docente, ?alumno=ana) y la pantalla en el hash,
 * como en el prototipo de interfaz: «#/inicio», «#/alumnos/ana», «#/acerca».
 * Ver docs/UNIFICACION.md → «Identidad por URL y rutas».
 */

/** Perfiles que tienen cascarón (el modo presentación va a página completa, sin él). */
export const PERFILES = Object.freeze(['estudiante', 'docente']);

/** Ruta que comparten los dos perfiles. */
export const RUTA_ACERCA = '/acerca';

/**
 * Pantallas de cada perfil: a qué pestaña de la navegación pertenecen y su título
 * (el de la pestaña del navegador; la vista puede cambiarlo con anfitrion.titulo()).
 */
export const RUTAS = Object.freeze({
  estudiante: Object.freeze({
    '/inicio': { nav: 'inicio', titulo: 'Inicio' },
    '/aprender': { nav: 'aprender', titulo: 'Aprender' },
    '/diagnostico': { nav: 'aprender', titulo: 'Diagnóstico' },
    '/tutor': { nav: 'tutor', titulo: 'Tu tutor' },
    '/comprobar': { nav: 'aprender', titulo: 'Comprueba lo aprendido' },
    '/progreso': { nav: 'progreso', titulo: 'Mi progreso' },
    '/descargas': { nav: 'descargas', titulo: 'Descargas y modo sin internet' },
  }),
  docente: Object.freeze({
    '/grupo': { nav: 'grupo', titulo: 'Grupo' },
    '/alertas': { nav: 'alertas', titulo: 'Alertas' },
    '/alumnos': { nav: 'alumnos', titulo: 'Seguimiento individual' },
    '/planeacion': { nav: 'planeacion', titulo: 'Planeación' },
    '/datos': { nav: 'datos', titulo: 'Conexión y datos' },
  }),
});

/** Pantalla inicial de cada perfil. */
export const INICIO = Object.freeze({ estudiante: '/inicio', docente: '/grupo' });

/**
 * Navegación principal (mismo orden y nombres que el prototipo de interfaz):
 * pestañas abajo en el celular, barra lateral en escritorio.
 * `icono` usa los nombres del prototipo (js/shell/componentes.js los resuelve).
 */
export const NAV = Object.freeze({
  estudiante: Object.freeze([
    { id: 'inicio', ruta: '/inicio', icono: 'home', texto: 'Inicio' },
    { id: 'aprender', ruta: '/aprender', icono: 'book', texto: 'Aprender' },
    { id: 'tutor', ruta: '/tutor', icono: 'chat', texto: 'Tutor' },
    { id: 'progreso', ruta: '/progreso', icono: 'chart', texto: 'Progreso' },
    { id: 'descargas', ruta: '/descargas', icono: 'download', texto: 'Descargas' },
  ]),
  docente: Object.freeze([
    { id: 'grupo', ruta: '/grupo', icono: 'grid', texto: 'Grupo' },
    { id: 'alertas', ruta: '/alertas', icono: 'flag', texto: 'Alertas' },
    { id: 'alumnos', ruta: '/alumnos', icono: 'users', texto: 'Alumnos' },
    { id: 'planeacion', ruta: '/planeacion', icono: 'calendar', texto: 'Planear' },
    { id: 'datos', ruta: '/datos', icono: 'shield', texto: 'Datos' },
  ]),
});

/** Cómo se lee el contador de cada pestaña: [singular, plural]. */
export const TEXTO_INSIGNIA = Object.freeze({
  alertas: ['por revisar', 'por revisar'],
  inicio: ['mensaje nuevo', 'mensajes nuevos'],
  tutor: ['respuesta nueva', 'respuestas nuevas'],
  descargas: ['pendiente', 'pendientes'],
});
const INSIGNIA_GENERICA = ['aviso', 'avisos'];

/** "3 por revisar", "1 mensaje nuevo"… para lectores de pantalla. */
export function textoInsignia(idNav, n) {
  const [uno, varios] = TEXTO_INSIGNIA[idNav] || INSIGNIA_GENERICA;
  return `${n} ${n === 1 ? uno : varios}`;
}

const esPerfil = (perfil) => PERFILES.includes(perfil);

/** El otro perfil (para enlaces que cruzan de módulo). */
export const otroPerfil = (perfil) => (perfil === 'docente' ? 'estudiante' : 'docente');

/** Id de estudiante seguro para la URL y para las claves de almacenamiento. */
export function limpiarAlumno(valor) {
  return (
    String(valor ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '') || 'invitado'
  );
}

/**
 * Identidad a partir de la cadena de consulta.
 * @param {string|URLSearchParams} consulta p. ej. location.search
 * @returns {{ vista: 'estudiante'|'docente'|'pitch', perfil: 'estudiante'|'docente', alumno: string,
 *   embebido: boolean, compacto: boolean }}
 */
export function leerIdentidad(consulta) {
  const params = consulta instanceof URLSearchParams ? consulta : new URLSearchParams(consulta || '');
  const vista = params.get('vista') || 'estudiante';
  return {
    vista: vista === 'docente' || vista === 'pitch' ? vista : 'estudiante',
    perfil: vista === 'docente' ? 'docente' : 'estudiante',
    alumno: limpiarAlumno(params.get('alumno')),
    embebido: params.has('embebido'),
    compacto: params.has('compacto'),
  };
}

/**
 * Interpreta el hash. «#/alumnos/ana#notas» → { ruta: '/alumnos', params: { id: 'ana' }, ancla: 'notas' }.
 * Un hash que no empieza con «#/» (vacío, o un ancla suelta como «#contenido») no es una ruta: null.
 * @param {string} hash p. ej. location.hash
 * @returns {{ ruta: string, params: Record<string, string>, ancla: string } | null}
 */
export function leerHash(hash) {
  const texto = String(hash || '');
  if (!texto.startsWith('#/')) return null;
  const [camino, ancla = ''] = texto.slice(1).split('#');
  const segmentos = camino
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
  const ruta = `/${segmentos[0] || ''}`;
  const params = segmentos[1] ? { id: segmentos[1] } : {};
  return { ruta, params, ancla };
}

/** Hash de una ruta con sus parámetros: ('/alumnos', { id: 'ana' }) → '#/alumnos/ana'. */
export function hashDe(ruta, params = {}) {
  const base = String(ruta || '/').startsWith('/') ? String(ruta || '/') : `/${ruta}`;
  return `#${base}${params && params.id ? `/${encodeURIComponent(params.id)}` : ''}`;
}

/**
 * ¿Qué es esta ruta para este perfil?
 * - 'propia': pantalla del perfil (o «Acerca», que es de los dos).
 * - 'ajena': pantalla del otro perfil (el cascarón cambia de módulo).
 * - 'desconocida': no existe (404 amable), salvo que la vista diga que la atiende.
 * @returns {{ tipo: 'propia'|'ajena'|'desconocida', perfil: string|null, nav: string|null, titulo: string }}
 */
export function clasificarRuta(perfil, ruta) {
  const propio = esPerfil(perfil) ? perfil : 'estudiante';
  if (ruta === RUTA_ACERCA) return { tipo: 'propia', perfil: null, nav: null, titulo: 'Acerca del proyecto' };
  const mia = RUTAS[propio][ruta];
  if (mia) return { tipo: 'propia', perfil: propio, nav: mia.nav, titulo: mia.titulo };
  const otro = otroPerfil(propio);
  const suya = RUTAS[otro][ruta];
  if (suya) return { tipo: 'ajena', perfil: otro, nav: suya.nav, titulo: suya.titulo };
  return { tipo: 'desconocida', perfil: null, nav: null, titulo: 'Página no encontrada' };
}

/**
 * Dirección completa (consulta + hash) de una pantalla, quizá de otro perfil o estudiante.
 * Conserva los demás parámetros (por ejemplo ?cascaron=1) y quita los de un solo uso.
 * @param {{ consulta?: string, camino?: string, perfil?: string, alumno?: string, ruta?: string }} opciones
 * @returns {string} p. ej. '/app/?vista=docente&alumno=ana#/grupo'
 */
export function urlDe({ consulta = '', camino = '', perfil, alumno, ruta } = {}) {
  const params = new URLSearchParams(consulta);
  const actual = leerIdentidad(params);
  const destino = esPerfil(perfil) ? perfil : actual.perfil;
  params.delete('reiniciar');
  if (destino === 'docente') params.set('vista', 'docente');
  else params.delete('vista');
  const quien = alumno === undefined ? actual.alumno : limpiarAlumno(alumno);
  if (quien && quien !== 'invitado') params.set('alumno', quien);
  else params.delete('alumno');
  const q = params.toString();
  const pantalla = ruta || INICIO[destino];
  return `${camino}${q ? `?${q}` : ''}${pantalla.startsWith('#') ? pantalla : `#${pantalla}`}`;
}
