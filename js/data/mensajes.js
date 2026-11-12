/**
 * Retroalimentación del docente al estudiante (sin servidor real).
 *
 * - Lo que el docente envía CON conexión se guarda en la clave compartida
 *   'tecu:servidor:mensajes' (el "servidor": lo entregado, lo que ve el estudiante).
 * - Lo que escribe SIN conexión queda en su bandeja de salida ('tecu:docente:mensajes',
 *   estado 'en_cola') y el estudiante no lo ve hasta `vaciarCola()`, cuando vuelve la red.
 * - Las otras pestañas e iframes del mismo origen se enteran sin recargar por
 *   BroadcastChannel('tecu-sync') y por el evento 'storage' (respaldo si no hay canal); las
 *   demás instancias del mismo documento, por un evento en `window`.
 * - `reiniciarTodo()` de store.js borra todas las claves 'tecu:' (también estas) y avisa
 *   { tipo: 'reinicio' } por el mismo canal: los suscriptores se enteran.
 *
 * Todo acceso al almacenamiento está protegido: si localStorage falla o no existe se usa
 * memoria y la app sigue funcionando (solo que los mensajes no cruzan de pestaña).
 *
 * También exporta `crearEstadoGuardado()`: la pieza de «estado guardado en este equipo» que
 * comparten alertas.js y planeacion.js.
 */
import { crearAlmacenMemoria } from './store.js';

/** Mensajes entregados (lo que ven los estudiantes). */
export const CLAVE_MENSAJES = 'tecu:servidor:mensajes';
/** Bandeja de salida del docente: lo que escribió sin conexión y aún no se envía. */
export const CLAVE_SALIDA = 'tecu:docente:mensajes';
/** Destinatario «todo el grupo»: lo recibe cualquier estudiante. */
export const PARA_GRUPO = 'grupo';
/** Largo máximo del texto que se guarda (el formulario puede pedir menos). */
export const MAX_TEXTO = 600;

const NOMBRE_CANAL = 'tecu-sync';
/** Evento en `window` para avisar a otras instancias del mismo documento. */
const EVENTO_LOCAL = 'tecu:guardado';

/**
 * @typedef {object} Mensaje
 * @property {string} id
 * @property {string|string[]} para id del estudiante, lista de ids (un equipo) o PARA_GRUPO
 * @property {string} texto
 * @property {string} fecha ISO: cuándo lo escribió el docente
 * @property {'enviado'|'en_cola'} estado
 * @property {boolean|string[]} ejercicios ¿lleva ejercicios de refuerzo? (true/false o la lista de ecuaciones)
 * @property {boolean} leido en `para(alumno)`: si ese estudiante ya lo leyó; en `bandeja()`: si alguien lo leyó
 * @property {string|null} entregado ISO: cuándo se entregó (null mientras está en cola)
 * @property {string} etiqueta nombre para mostrar del destinatario cuando es un equipo ('' si no se dio)
 * @property {string[]} leidoPor ids de quienes ya lo leyeron
 */

/**
 * @typedef {object} OpcionesGuardado
 * @property {Storage|null} [almacenamiento] por defecto localStorage; null = solo memoria
 * @property {BroadcastChannel|null} [canal] por defecto uno nuevo 'tecu-sync'; null = sin canal
 * @property {EventTarget|null} [ventana] por defecto window (eventos 'storage'); null = ninguna
 */

/* ------------------------------------------------------------------ */
/* Almacenamiento seguro y avisos                                      */
/* ------------------------------------------------------------------ */

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const comoTexto = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');

function localStorageSeguro() {
  try {
    const s = globalThis.localStorage;
    return s && typeof s.getItem === 'function' ? s : null;
  } catch {
    return null;
  }
}

/** `undefined` ⇒ localStorage; si no existe, o con null, memoria (nunca devuelve null). */
const resolverAlmacen = (almacenamiento) =>
  (almacenamiento === undefined ? localStorageSeguro() : almacenamiento) ?? crearAlmacenMemoria();

const ventanaDelNavegador = () => (typeof window === 'undefined' ? null : window);

/** Texto guardado tal cual ('' si no hay o no se puede leer): sirve de firma para detectar cambios. */
function leerTexto(almacen, clave) {
  try {
    return almacen.getItem(clave) ?? '';
  } catch {
    return '';
  }
}

function leerJSON(almacen, clave) {
  try {
    const texto = almacen.getItem(clave);
    return texto == null ? null : JSON.parse(texto);
  } catch {
    return null;
  }
}

/** @returns {boolean} true si se guardó */
function escribirJSON(almacen, clave, valor) {
  try {
    almacen.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (error) {
    console.warn(`[tecu] No se pudo guardar ${clave}:`, error?.name || error);
    return false;
  }
}

function borrar(almacen, clave) {
  try {
    almacen.removeItem(clave);
  } catch {
    /* sin acceso: no hay nada que borrar */
  }
}

function llamarSeguro(fn, ...args) {
  if (typeof fn !== 'function') return;
  try {
    fn(...args);
  } catch (error) {
    console.error('[tecu]', error);
  }
}

function eventoCon(tipo, detail) {
  if (typeof CustomEvent === 'function') return new CustomEvent(tipo, { detail });
  const evento = new Event(tipo);
  evento.detail = detail;
  return evento;
}

function abrirCanal() {
  try {
    return typeof BroadcastChannel === 'function' ? new BroadcastChannel(NOMBRE_CANAL) : null;
  } catch {
    return null;
  }
}

/** Almacén, ventana y bus de avisos locales a partir de las opciones de inyección. */
function crearEntorno({ almacenamiento, canal, ventana } = {}) {
  const win = ventana === undefined ? ventanaDelNavegador() : ventana;
  return { almacen: resolverAlmacen(almacenamiento), canal, win, bus: win ?? new EventTarget() };
}

/** Avisa a las demás instancias de este documento que cambió `clave`. */
function avisarLocal(entorno, clave) {
  try {
    entorno.bus.dispatchEvent(eventoCon(EVENTO_LOCAL, { clave }));
  } catch {
    /* sin eventos: quien lea después verá el cambio */
  }
}

/** Publica en el canal (el inyectado o uno propio que se cierra enseguida). */
function publicar(entorno, mensaje) {
  const propio = entorno.canal === undefined ? abrirCanal() : null;
  try {
    (entorno.canal ?? propio)?.postMessage(mensaje);
  } catch {
    /* canal cerrado: las otras pestañas se enteran por 'storage' */
  } finally {
    propio?.close();
  }
}

/**
 * Llama a `fn({ origen })` SOLO cuando `firma()` cambió, sin importar cuántas señales lleguen
 * (aviso local, canal y 'storage' pueden anunciar el mismo cambio).
 * @returns {() => void} deja de escuchar
 */
function escuchar(entorno, claves, firma, fn) {
  let ultima = firma();
  const revisar = (origen) => {
    const nueva = firma();
    if (nueva === ultima) return;
    ultima = nueva;
    llamarSeguro(fn, { tipo: 'cambio', origen });
  };
  const alLocal = (evento) => {
    if (claves.includes(evento.detail?.clave)) revisar('local');
  };
  const alStorage = (evento) => {
    if (evento.key === null || claves.includes(evento.key)) revisar('storage');
  };
  const alCanal = () => revisar('canal');
  const propio = entorno.canal === undefined ? abrirCanal() : null;
  const bc = entorno.canal ?? propio;
  entorno.bus.addEventListener(EVENTO_LOCAL, alLocal);
  entorno.win?.addEventListener('storage', alStorage);
  bc?.addEventListener?.('message', alCanal);
  return () => {
    entorno.bus.removeEventListener(EVENTO_LOCAL, alLocal);
    entorno.win?.removeEventListener('storage', alStorage);
    bc?.removeEventListener?.('message', alCanal);
    propio?.close();
  };
}

/**
 * Un valor JSON guardado en una clave de localStorage, con avisos de cambio (esta pestaña,
 * otras pestañas y «Reiniciar demostración»). No guarda copia en memoria: siempre lee lo último.
 * Lo comparten alertas.js ('tecu:docente:alertas') y planeacion.js ('tecu:docente:plan').
 * @param {string} clave
 * @param {OpcionesGuardado} [opciones]
 * @returns {{ clave: string, leer: () => any, guardar: (valor: any) => boolean,
 *   suscribir: (fn: (cambio: { tipo: 'cambio', origen: 'local'|'storage'|'canal' }) => void) => () => void }}
 */
export function crearEstadoGuardado(clave, opciones = {}) {
  const entorno = crearEntorno(esObjeto(opciones) ? opciones : {});
  return {
    clave,
    /** @returns {any} lo guardado, o null si no hay o está dañado */
    leer: () => leerJSON(entorno.almacen, clave),
    /** Guarda (null o undefined lo borra) y avisa. */
    guardar(valor) {
      const listo = valor === null || valor === undefined ? (borrar(entorno.almacen, clave), true) : escribirJSON(entorno.almacen, clave, valor);
      avisarLocal(entorno, clave);
      return listo;
    },
    /** `fn` se llama cuando lo guardado cambia (no al suscribirse). */
    suscribir: (fn) => escuchar(entorno, [clave], () => leerTexto(entorno.almacen, clave), fn),
  };
}

/* ------------------------------------------------------------------ */
/* Mensajes                                                            */
/* ------------------------------------------------------------------ */

function aleatorio() {
  try {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  } catch {
    return Math.floor(Math.random() * 2 ** 32).toString(36);
  }
}

/** Con conexión mientras el navegador no diga lo contrario. */
function hayConexion() {
  try {
    return globalThis.navigator?.onLine !== false;
  } catch {
    return true;
  }
}

/** Un id, PARA_GRUPO o una lista de ids sin repetir ('' si no hay destinatario). */
function normalizarPara(para) {
  if (!Array.isArray(para)) return comoTexto(para);
  const ids = [...new Set(para.map(comoTexto).filter(Boolean))];
  return ids.length > 1 ? ids : ids[0] ?? '';
}

/** true/false, o la lista de ecuaciones adjuntas. */
function normalizarEjercicios(ejercicios) {
  if (!Array.isArray(ejercicios)) return Boolean(ejercicios);
  const lista = ejercicios.map(comoTexto).filter(Boolean);
  return lista.length ? lista : false;
}

const esMensaje = (m) => esObjeto(m) && Boolean(comoTexto(m.id)) && typeof m.texto === 'string';
const leerMensajes = (almacen, clave) => {
  const lista = leerJSON(almacen, clave);
  return Array.isArray(lista) ? lista.filter(esMensaje) : [];
};
const lectores = (m) => (Array.isArray(m.leidoPor) ? m.leidoPor.filter((id) => typeof id === 'string') : []);
const esPara = (m, alumno) => m.para === alumno || m.para === PARA_GRUPO || (Array.isArray(m.para) && m.para.includes(alumno));
const recientesPrimero = (a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0);

/** El mensaje como lo ven las pantallas; con `alumno`, `leido` es el suyo. */
function publico(m, alumno) {
  const leidoPor = lectores(m);
  return {
    id: m.id,
    para: Array.isArray(m.para) ? [...m.para] : m.para,
    texto: m.texto,
    fecha: m.fecha,
    estado: m.estado === 'en_cola' ? 'en_cola' : 'enviado',
    ejercicios: Array.isArray(m.ejercicios) ? [...m.ejercicios] : Boolean(m.ejercicios),
    leido: alumno ? leidoPor.includes(alumno) : leidoPor.length > 0,
    entregado: typeof m.entregado === 'string' ? m.entregado : null,
    etiqueta: comoTexto(m.etiqueta),
    leidoPor,
  };
}

/**
 * Mensajes del docente a sus estudiantes.
 *
 * Docente: `enviar()`, `bandeja()`, `enCola()` y, al volver la conexión, `vaciarCola()`.
 * Estudiante: `para(alumno)`, `noLeidos(alumno)`, `marcarLeido(id, alumno)` y `suscribir()`.
 *
 * @param {OpcionesGuardado & { reloj?: () => number }} [opciones] `reloj`: Date.now en pruebas
 */
export function crearMensajes(opciones = {}) {
  const config = esObjeto(opciones) ? opciones : {};
  const entorno = crearEntorno(config);
  const { almacen } = entorno;
  const ahora = typeof config.reloj === 'function' ? config.reloj : () => Date.now();
  let consecutivo = 0;

  const fechaISO = () => {
    const t = Number(ahora());
    return new Date(Number.isFinite(t) ? t : Date.now()).toISOString();
  };
  const nuevoId = () => `msj-${Date.now().toString(36)}-${(consecutivo++).toString(36)}${aleatorio()}`;
  const entregados = () => leerMensajes(almacen, CLAVE_MENSAJES);
  const pendientes = () => leerMensajes(almacen, CLAVE_SALIDA).map((m) => ({ ...m, estado: 'en_cola', entregado: null }));

  /** Guarda la lista (vacía = borra la clave). @returns {boolean} true si se guardó */
  function escribir(clave, lista) {
    return lista.length ? escribirJSON(almacen, clave, lista) : (borrar(almacen, clave), true);
  }

  /** Avisa del cambio a esta pestaña y a las demás (después de escribir todo). */
  function avisar(claves, accion) {
    for (const clave of claves) avisarLocal(entorno, clave);
    publicar(entorno, { tipo: 'mensajes', accion });
  }

  function guardar(clave, lista, accion) {
    if (!escribir(clave, lista)) return false;
    avisar([clave], accion);
    return true;
  }

  /**
   * Escribe un mensaje. Con conexión se entrega al instante (estado 'enviado'); sin conexión
   * queda en la bandeja de salida ('en_cola') hasta `vaciarCola()`.
   * @param {{ para: string|string[], texto: string, ejercicios?: boolean|string[], etiqueta?: string }} datos
   *   `para`: id del estudiante, lista de ids (un equipo de refuerzo) o PARA_GRUPO ('grupo')
   * @param {{ enLinea?: boolean }} [opciones] pásale `red.enLinea()`; por omisión, navigator.onLine
   * @returns {Mensaje|null} null si falta el destinatario o el texto, o si no se pudo guardar
   */
  function enviar(datos, { enLinea } = {}) {
    const para = normalizarPara(datos?.para);
    const texto = comoTexto(datos?.texto).slice(0, MAX_TEXTO);
    if (!para.length || !texto) return null;
    const conRed = enLinea === undefined ? hayConexion() : Boolean(enLinea);
    const fecha = fechaISO();
    const mensaje = {
      id: nuevoId(),
      para,
      texto,
      fecha,
      estado: conRed ? 'enviado' : 'en_cola',
      ejercicios: normalizarEjercicios(datos.ejercicios),
      entregado: conRed ? fecha : null,
      etiqueta: comoTexto(datos.etiqueta),
      leidoPor: [],
    };
    const clave = conRed ? CLAVE_MENSAJES : CLAVE_SALIDA;
    const lista = conRed ? entregados() : pendientes();
    return guardar(clave, [...lista, mensaje], mensaje.estado) ? publico(mensaje) : null;
  }

  /** @returns {Mensaje[]} todo lo que escribió el docente (enviado y en cola), lo más reciente primero */
  function bandeja() {
    const enviados = entregados();
    const ids = new Set(enviados.map((m) => m.id));
    return [...enviados, ...pendientes().filter((m) => !ids.has(m.id))].map((m) => publico(m)).sort(recientesPrimero);
  }

  /** @returns {Mensaje[]} lo que espera conexión, en el orden en que se enviará (lo más antiguo primero) */
  function enCola() {
    return pendientes().map((m) => publico(m));
  }

  /**
   * Entrega lo que estaba en cola (llámala cuando vuelva la conexión).
   * @returns {number} cuántos mensajes se entregaron (0 si no había o no se pudo guardar)
   */
  function vaciarCola() {
    const cola = pendientes();
    if (!cola.length) return 0;
    const entregado = fechaISO();
    const enviados = entregados();
    const yaEstan = new Set(enviados.map((m) => m.id));
    const nuevos = cola.filter((m) => !yaEstan.has(m.id)).map((m) => ({ ...m, estado: 'enviado', entregado }));
    if (!escribir(CLAVE_MENSAJES, [...enviados, ...nuevos])) return 0; // sin espacio: siguen en cola
    escribir(CLAVE_SALIDA, []);
    avisar([CLAVE_MENSAJES, CLAVE_SALIDA], 'entregado');
    return cola.length;
  }

  /**
   * Mensajes entregados a un estudiante (los suyos, los de su equipo y los de todo el grupo).
   * @param {string} alumno
   * @returns {Mensaje[]} lo más reciente primero; `leido` es el de ese estudiante
   */
  function para(alumno) {
    const id = comoTexto(alumno);
    if (!id) return [];
    return entregados().filter((m) => esPara(m, id)).map((m) => publico(m, id)).sort(recientesPrimero);
  }

  /** @returns {number} mensajes entregados que ese estudiante no ha leído */
  const noLeidos = (alumno) => para(alumno).filter((m) => !m.leido).length;

  /** Agrega lectores a los mensajes que cumplan `filtro`. @returns {number} cuántos cambiaron */
  function marcar(filtro, lectorDe) {
    let cambios = 0;
    const lista = entregados().map((m) => {
      const lector = filtro(m) ? lectorDe(m) : '';
      if (!lector || lectores(m).includes(lector)) return m;
      cambios += 1;
      return { ...m, leidoPor: [...lectores(m), lector] };
    });
    return cambios && guardar(CLAVE_MENSAJES, lista, 'leido') ? cambios : 0;
  }

  /**
   * El estudiante leyó un mensaje.
   * @param {string} id id del mensaje
   * @param {string} [alumno] quién lo leyó (obligatorio si el mensaje es para un equipo o para el grupo)
   * @returns {boolean} true si cambió algo
   */
  function marcarLeido(id, alumno) {
    const lector = comoTexto(alumno);
    return marcar((m) => m.id === id, (m) => lector || (typeof m.para === 'string' && m.para !== PARA_GRUPO ? m.para : '')) > 0;
  }

  /** El estudiante abrió sus mensajes: todos quedan leídos. @returns {number} cuántos eran nuevos */
  function marcarLeidos(alumno) {
    const lector = comoTexto(alumno);
    return lector ? marcar((m) => esPara(m, lector), () => lector) : 0;
  }

  /**
   * Avisa cuando cambian los mensajes: en esta pestaña y en otras pestañas o iframes, sin
   * recargar. No llama a `fn` al suscribirse. Con `alumno`, solo cuando cambian los suyos.
   * @param {(cambio: { tipo: 'cambio', origen: 'local'|'canal'|'storage' }) => void} fn vuelve a leer con para() o bandeja()
   * @param {{ alumno?: string }} [opciones]
   * @returns {() => void} deja de escuchar
   */
  function suscribir(fn, { alumno } = {}) {
    const id = comoTexto(alumno);
    const firma = id
      ? () => JSON.stringify(para(id))
      : () => `${leerTexto(almacen, CLAVE_MENSAJES)}\n${leerTexto(almacen, CLAVE_SALIDA)}`;
    return escuchar(entorno, [CLAVE_MENSAJES, CLAVE_SALIDA], firma, fn);
  }

  return { enviar, bandeja, enCola, vaciarCola, para, noLeidos, marcarLeido, marcarLeidos, suscribir };
}
