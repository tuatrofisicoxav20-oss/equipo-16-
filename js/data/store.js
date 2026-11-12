/**
 * Datos del celular y "servidor" simulado (sin servidor real).
 *
 * - El celular guarda sus eventos en localStorage con la bandera `sincronizado`.
 * - `sincronizar()` los copia uno por uno, sin duplicar, a 'tecu:servidor:eventos',
 *   que es lo que lee el panel docente.
 * - Las otras pestañas e iframes del mismo origen se enteran por
 *   BroadcastChannel('tecu-sync') y por el evento 'storage' (respaldo si no hay canal).
 *
 * Todo acceso al almacenamiento está protegido: si localStorage falla (modo privado,
 * cuota llena, JSON dañado) se usan valores por defecto y la app sigue funcionando.
 */

const PREFIJO = 'tecu:';
const CLAVE_PREFS = 'tecu:prefs';
const CLAVE_SERVIDOR = 'tecu:servidor:eventos';
/** Buzón de un solo uso para avisar a otras pestañas cuando no hay BroadcastChannel. */
const CLAVE_BUZON = 'tecu:servidor:aviso';
const NOMBRE_CANAL = 'tecu-sync';
/** Evento en `window` para avisar a otras instancias del mismo documento. */
const EVENTO_LOCAL = 'tecu:dispositivo';
const PAUSA_POR_DEFECTO = 150;

/**
 * @typedef {'diagnostico'|'practica'|'comprobacion'|'pregunta'|'visual'|'ruta'|'dominio'|'duda'|'solucion'|'libre'} TipoEvento
 */

/**
 * @typedef {{
 *   id: string, alumno: string, fecha: string, sincronizado: boolean,
 *   tipo: TipoEvento,
 *   ejercicio?: string, renglones?: string[],
 *   resultado?: 'correcto'|'error'|'incompleto'|'sin_entender',
 *   error?: { tipo, renglon, variante, texto, anterior, confianza } | null,
 *   pistasUsadas?: number, pidioSolucion?: boolean, aprobado?: boolean,
 *   ruta?: string, datos?: object
 * }} Evento
 */

/**
 * @typedef {{ id: string, texto: string, fecha: string, respuesta: string|null,
 *   fechaRespuesta: string|null, pendiente: boolean }} Duda
 */

/**
 * Lo que recibe `store.suscribir(fn)`.
 * tipo: 'registro' | 'progreso' | 'duda' | 'sincronizado' | 'reinicio' | 'externo' (otra pestaña).
 * @typedef {{ tipo: string, alumno: string, pendientes: number,
 *   evento?: Evento, duda?: Duda, clave?: string|null }} Cambio
 */

/**
 * Lo que recibe `escucharServidor(fn)`:
 * { tipo: 'sync', alumno, n } | { tipo: 'reinicio' } | { tipo: 'cambio', origen: 'storage' }.
 * @typedef {{ tipo: string, alumno?: string, n?: number, origen?: string }} MensajeServidor
 */

/**
 * @typedef {object} OpcionesStore
 * @property {Storage|null} [almacenamiento] por defecto localStorage; null = solo memoria
 * @property {BroadcastChannel|null} [canal] canal para avisar; por defecto uno nuevo 'tecu-sync'; null = sin canal
 * @property {number} [pausaMs=150] pausa entre eventos al sincronizar (0 en pruebas)
 * @property {EventTarget|null} [ventana] por defecto window (eventos 'storage')
 */

// ---------------------------------------------------------------------------
// Acceso seguro al almacenamiento

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** localStorage si se puede usar; null si el navegador lo bloquea o no existe. */
function localStorageSeguro() {
  try {
    const s = globalThis.localStorage;
    return s && typeof s.getItem === 'function' ? s : null;
  } catch {
    return null;
  }
}

const ventanaDelNavegador = () => (typeof window === 'undefined' ? null : window);

/** `undefined` => localStorage; cualquier otro valor (incluido null) se respeta. */
const resolverAlmacen = (almacenamiento) => (almacenamiento === undefined ? localStorageSeguro() : almacenamiento);

function parsear(texto) {
  try {
    return texto == null ? null : JSON.parse(texto);
  } catch {
    return null;
  }
}

function leer(almacen, clave) {
  try {
    return parsear(almacen ? almacen.getItem(clave) : null);
  } catch {
    return null;
  }
}

/** @returns {boolean} true si se guardó */
function escribir(almacen, clave, valor) {
  if (!almacen) return false;
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
    almacen?.removeItem(clave);
  } catch {
    /* sin acceso: no hay nada que borrar */
  }
}

function leerLista(almacen, clave) {
  const valor = leer(almacen, clave);
  return Array.isArray(valor) ? valor.filter(esObjeto) : [];
}

function clavesTecu(almacen) {
  const claves = [];
  try {
    for (let i = 0; i < almacen.length; i++) {
      const clave = almacen.key(i);
      if (clave && clave.startsWith(PREFIJO)) claves.push(clave);
    }
  } catch {
    /* sin acceso: nada que listar */
  }
  return claves;
}

/**
 * Storage en memoria (misma interfaz que localStorage). Respaldo cuando el
 * navegador no deja usar localStorage, y útil en pruebas.
 * @returns {Storage}
 */
export function crearAlmacenMemoria() {
  const datos = new Map();
  return {
    get length() {
      return datos.size;
    },
    key: (i) => [...datos.keys()][i] ?? null,
    getItem: (clave) => (datos.has(String(clave)) ? datos.get(String(clave)) : null),
    setItem: (clave, valor) => {
      datos.set(String(clave), String(valor));
    },
    removeItem: (clave) => {
      datos.delete(String(clave));
    },
    clear: () => datos.clear(),
  };
}

// ---------------------------------------------------------------------------
// Utilidades

function aleatorio() {
  try {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  } catch {
    return Math.floor(Math.random() * 2 ** 32).toString(36);
  }
}

const nuevoId = (alumno) => `${alumno}-${Date.now().toString(36)}-${aleatorio()}`;

function fechaISO(valor) {
  const fecha = valor === undefined || valor === null ? new Date() : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? new Date().toISOString() : fecha.toISOString();
}

/** Copia "como quedó guardada" (sin funciones ni undefined). */
function clonar(valor) {
  try {
    return JSON.parse(JSON.stringify(valor));
  } catch {
    return { ...valor };
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

const pausa = (ms) => (ms > 0 ? new Promise((resolver) => setTimeout(resolver, ms)) : Promise.resolve());

// ---------------------------------------------------------------------------
// "Servidor" simulado y avisos entre pestañas

function abrirCanal() {
  try {
    return typeof BroadcastChannel === 'function' ? new BroadcastChannel(NOMBRE_CANAL) : null;
  } catch {
    return null;
  }
}

/** Agrega o reemplaza por `id` (nunca duplica). @returns {boolean} true si se guardó */
function agregarAlServidor(almacen, nuevos) {
  const lista = leerLista(almacen, CLAVE_SERVIDOR);
  const posicion = new Map(lista.map((evento, i) => [evento.id, i]));
  for (const evento of nuevos) {
    const i = posicion.get(evento.id);
    if (i === undefined) {
      posicion.set(evento.id, lista.length);
      lista.push(evento);
    } else {
      lista[i] = evento;
    }
  }
  return escribir(almacen, CLAVE_SERVIDOR, lista);
}

/**
 * Avisa a las otras pestañas/iframes. Con BroadcastChannel si existe; si no,
 * con un buzón en localStorage (se escribe y se borra: las demás reciben 'storage').
 */
function publicar(mensaje, { canal, almacen }) {
  const propio = canal === undefined ? abrirCanal() : null;
  const destino = canal ?? propio;
  try {
    if (destino) {
      destino.postMessage(mensaje);
      return;
    }
  } catch {
    /* canal cerrado o inválido: usamos el buzón */
  } finally {
    propio?.close();
  }
  if (escribir(almacen, CLAVE_BUZON, { ...mensaje, sello: aleatorio() })) borrar(almacen, CLAVE_BUZON);
}

function mensajeDeStorage(evento) {
  if (evento.key === CLAVE_BUZON) {
    const mensaje = parsear(evento.newValue);
    if (!esObjeto(mensaje)) return null;
    const { sello, ...limpio } = mensaje;
    return limpio;
  }
  if (evento.key === CLAVE_SERVIDOR || evento.key === null) return { tipo: 'cambio', origen: 'storage' };
  return null;
}

/**
 * Eventos que ya llegaron al "servidor" (lo que ve el panel docente).
 * @param {{ almacenamiento?: Storage|null }} [opciones]
 * @returns {Evento[]}
 */
export function eventosServidor({ almacenamiento } = {}) {
  return leerLista(resolverAlmacen(almacenamiento), CLAVE_SERVIDOR);
}

/**
 * Guarda eventos directo en el "servidor" (grupo simulado). No duplica por `id`:
 * si ya existe, lo reemplaza. A los que no traen id o fecha se les pone.
 * @param {Evento[]|Evento} eventos
 * @param {{ almacenamiento?: Storage|null }} [opciones]
 * @returns {number} cuántos se guardaron (0 si no se pudo escribir)
 */
export function guardarEnServidor(eventos, { almacenamiento } = {}) {
  const lista = (Array.isArray(eventos) ? eventos : [eventos]).filter(esObjeto).map((evento) => ({
    ...evento,
    id: evento.id ? String(evento.id) : nuevoId(evento.alumno || 'grupo'),
    fecha: fechaISO(evento.fecha),
    sincronizado: true,
  }));
  if (!lista.length) return 0;
  return agregarAlServidor(resolverAlmacen(almacenamiento), lista) ? lista.length : 0;
}

/**
 * Escucha al "servidor": `fn(mensaje)` ante cada mensaje de BroadcastChannel('tecu-sync')
 * ({ tipo: 'sync', alumno, n } o { tipo: 'reinicio' }) y ante cada cambio de
 * 'tecu:servidor:eventos' hecho en otra pestaña o iframe ({ tipo: 'cambio', origen: 'storage' }).
 * Funciona aunque no exista BroadcastChannel. Vuelve a leer con `eventosServidor()`.
 * @param {(mensaje: MensajeServidor) => void} fn
 * @param {{ canal?: BroadcastChannel|null, ventana?: EventTarget|null }} [opciones]
 *   por defecto un BroadcastChannel nuevo y `window`; null desactiva cada uno
 * @returns {() => void} deja de escuchar
 */
export function escucharServidor(fn, { canal, ventana } = {}) {
  const win = ventana === undefined ? ventanaDelNavegador() : ventana;
  const propio = canal === undefined ? abrirCanal() : null;
  const bc = canal ?? propio;
  const alMensaje = (evento) => {
    if (esObjeto(evento.data)) llamarSeguro(fn, evento.data);
  };
  const alStorage = (evento) => {
    const mensaje = mensajeDeStorage(evento);
    if (mensaje) llamarSeguro(fn, mensaje);
  };
  bc?.addEventListener('message', alMensaje);
  win?.addEventListener('storage', alStorage);
  return () => {
    bc?.removeEventListener('message', alMensaje);
    win?.removeEventListener('storage', alStorage);
    propio?.close();
  };
}

/**
 * Deja la demo en estado inicial: borra todas las claves 'tecu:' (celulares,
 * servidor, simulador de red) excepto 'tecu:prefs', y avisa { tipo: 'reinicio' }.
 * @param {{ almacenamiento?: Storage|null, canal?: BroadcastChannel|null }} [opciones]
 */
export function reiniciarTodo({ almacenamiento, canal } = {}) {
  const almacen = resolverAlmacen(almacenamiento);
  for (const clave of clavesTecu(almacen)) {
    if (clave !== CLAVE_PREFS) borrar(almacen, clave);
  }
  publicar({ tipo: 'reinicio' }, { canal, almacen });
}

// ---------------------------------------------------------------------------
// Store del celular

const clavesDe = (alumno) => ({
  prefijo: `tecu:dispositivo:${alumno}:`,
  eventos: `tecu:dispositivo:${alumno}:eventos`,
  progreso: `tecu:dispositivo:${alumno}:progreso`,
  dudas: `tecu:dispositivo:${alumno}:dudas`,
});

function crearEvento(alumno, parcial) {
  const base = esObjeto(parcial) ? parcial : {};
  return clonar({ ...base, id: nuevoId(alumno), alumno, fecha: fechaISO(base.fecha), sincronizado: false });
}

/** `datos` del evento 'duda' (lo que ve el panel docente). */
const datosDuda = (duda) => ({
  dudaId: duda.id,
  texto: duda.texto,
  respondida: duda.respuesta !== null,
  respuesta: duda.respuesta,
  fechaRespuesta: duda.fechaRespuesta,
});

const esEventoDe = (dudaId) => (evento) => evento.tipo === 'duda' && evento.datos?.dudaId === dudaId;

/**
 * Store del celular de un alumno.
 * @param {string} alumno
 * @param {OpcionesStore} [opciones]
 */
export function crearStore(alumno, { almacenamiento, canal, pausaMs = PAUSA_POR_DEFECTO, ventana } = {}) {
  const yo = String(alumno || 'invitado');
  const almacen = resolverAlmacen(almacenamiento) ?? crearAlmacenMemoria();
  const win = ventana === undefined ? ventanaDelNavegador() : ventana;
  const bus = win ?? new EventTarget();
  const claves = clavesDe(yo);
  let enCurso = null;

  /** @returns {Evento[]} todos los eventos del celular, en orden */
  const eventos = () => leerLista(almacen, claves.eventos);
  /** @returns {Evento[]} los que faltan por subir, en orden */
  const pendientes = () => eventos().filter((evento) => !evento.sincronizado);
  /** @returns {Duda[]} */
  const dudas = () => leerLista(almacen, claves.dudas);

  function avisar(cambio) {
    bus.dispatchEvent(eventoCon(EVENTO_LOCAL, { alumno: yo, cambio }));
  }

  function agregarEvento(parcial) {
    const evento = crearEvento(yo, parcial);
    escribir(almacen, claves.eventos, [...eventos(), evento]);
    return evento;
  }

  /**
   * Guarda un evento en el celular: le agrega id único, alumno, fecha ISO y
   * sincronizado:false. Avisa a los suscriptores.
   * Una duda = un evento: si es { tipo: 'duda', datos: { dudaId } } de una duda que ya
   * registró agregarDuda(), no la duplica y devuelve ese evento.
   * @param {Partial<Evento>} parcial
   * @returns {Evento}
   */
  function registrar(parcial) {
    const dudaId = parcial?.tipo === 'duda' ? parcial.datos?.dudaId : null;
    const yaRegistrada = dudaId ? eventos().find(esEventoDe(dudaId)) : null;
    if (yaRegistrada) return yaRegistrada;
    const evento = agregarEvento(parcial);
    avisar({ tipo: 'registro', evento });
    return evento;
  }

  /** @returns {object|null} el avance guardado por la vista del estudiante */
  function progreso() {
    const valor = leer(almacen, claves.progreso);
    return valor !== null && typeof valor === 'object' ? valor : null;
  }

  /** @param {object|null} obj avance del estudiante (null lo borra) */
  function guardarProgreso(obj) {
    if (obj === null || obj === undefined) borrar(almacen, claves.progreso);
    else escribir(almacen, claves.progreso, obj);
    avisar({ tipo: 'progreso' });
  }

  /**
   * Guarda una duda escrita a Tecu (pendiente de respuesta) y registra su evento
   * tipo 'duda' para subirla al sincronizar. No registres otro evento aparte.
   * @param {string} texto
   * @returns {Duda}
   */
  function agregarDuda(texto) {
    const duda = {
      id: nuevoId(yo),
      texto: String(texto ?? '').trim(),
      fecha: new Date().toISOString(),
      respuesta: null,
      fechaRespuesta: null,
      pendiente: true,
    };
    escribir(almacen, claves.dudas, [...dudas(), duda]);
    const evento = agregarEvento({ tipo: 'duda', fecha: duda.fecha, datos: datosDuda(duda) });
    avisar({ tipo: 'duda', duda, evento });
    return duda;
  }

  /** Pone la respuesta en el evento de la duda; si ya se había subido, lo vuelve a dejar pendiente. */
  function actualizarEventoDuda(duda) {
    const lista = eventos();
    const i = lista.findIndex(esEventoDe(duda.id));
    if (i < 0) {
      agregarEvento({ tipo: 'duda', fecha: duda.fecha, datos: datosDuda(duda) });
      return;
    }
    lista[i] = { ...lista[i], datos: { ...lista[i].datos, ...datosDuda(duda) }, sincronizado: false };
    escribir(almacen, claves.eventos, lista);
  }

  /**
   * Contesta una duda. La respuesta viaja al servidor en la siguiente sincronización
   * (el evento 'duda' se actualiza; en el servidor se reemplaza, no se duplica).
   * @param {string} id id de la duda
   * @param {string} respuesta
   * @returns {Duda|null} la duda actualizada (null si no existe)
   */
  function contestarDuda(id, respuesta) {
    const lista = dudas();
    const i = lista.findIndex((duda) => duda.id === id);
    if (i < 0) return null;
    const texto = respuesta === null || respuesta === undefined ? null : String(respuesta);
    const duda = {
      ...lista[i],
      respuesta: texto,
      fechaRespuesta: texto === null ? null : new Date().toISOString(),
      pendiente: texto === null,
    };
    lista[i] = duda;
    escribir(almacen, claves.dudas, lista);
    actualizarEventoDuda(duda);
    avisar({ tipo: 'duda', duda });
    return duda;
  }

  /**
   * Sube un evento: primero al servidor (sin duplicar), luego lo marca en el celular.
   * @returns {Evento|null|false} el evento subido, null si ya no existe, false si no se pudo escribir
   */
  function subirUno(id) {
    const lista = eventos();
    const i = lista.findIndex((evento) => evento.id === id);
    if (i < 0) return null;
    if (lista[i].sincronizado) return lista[i];
    const evento = { ...lista[i], sincronizado: true };
    if (!agregarAlServidor(almacen, [evento])) return false;
    lista[i] = evento;
    escribir(almacen, claves.eventos, lista);
    return evento;
  }

  async function subirPendientes(onPaso) {
    const ids = pendientes().map((evento) => evento.id);
    let n = 0;
    for (const id of ids) {
      await pausa(pausaMs);
      const evento = subirUno(id);
      if (evento === false) break; // cuota llena: lo demás queda pendiente para otro intento
      if (!evento) continue;
      n += 1;
      avisar({ tipo: 'sincronizado', evento });
      llamarSeguro(onPaso, n, ids.length, evento);
    }
    if (n > 0) publicar({ tipo: 'sync', alumno: yo, n }, { canal, almacen });
    return n;
  }

  /**
   * Sube los pendientes EN ORDEN, uno por uno, con una pausa corta entre cada uno
   * para animar la cola. Si se interrumpe y se reintenta, no duplica (por `id`).
   * Al final avisa en BroadcastChannel('tecu-sync') { tipo: 'sync', alumno, n } (si n > 0).
   * Si ya hay una sincronización en curso, devuelve la misma promesa. Nunca rechaza.
   * No revisa la red: llámala cuando haya conexión.
   * @param {{ onPaso?: (i: number, total: number, evento: Evento) => void }} [opciones]
   *   `i` va de 1 a `total` (cuántos van subidos).
   * @returns {Promise<number>} cuántos eventos se subieron
   */
  function sincronizar({ onPaso } = {}) {
    if (!enCurso) {
      enCurso = subirPendientes(onPaso)
        .catch((error) => {
          console.error('[tecu] Falló la sincronización', error);
          return 0;
        })
        .finally(() => {
          enCurso = null;
        });
    }
    return enCurso;
  }

  /** Borra solo las claves de este celular ('tecu:dispositivo:<alumno>:*'). El servidor no se toca. */
  function reiniciar() {
    for (const clave of clavesTecu(almacen)) {
      if (clave.startsWith(claves.prefijo)) borrar(almacen, clave);
    }
    avisar({ tipo: 'reinicio' });
  }

  /**
   * Avisa de cambios en este celular: los de esta pestaña y los de otras
   * pestañas/iframes (evento 'storage'). No llama a `fn` al suscribirse.
   * @param {(cambio: Cambio) => void} fn
   * @returns {() => void} deja de escuchar
   */
  function suscribir(fn) {
    const entregar = (cambio) => llamarSeguro(fn, { ...cambio, alumno: yo, pendientes: pendientes().length });
    const alLocal = (evento) => {
      if (evento.detail?.alumno === yo) entregar(evento.detail.cambio);
    };
    const alStorage = (evento) => {
      if (evento.key === null || evento.key?.startsWith(claves.prefijo)) entregar({ tipo: 'externo', clave: evento.key });
    };
    bus.addEventListener(EVENTO_LOCAL, alLocal);
    win?.addEventListener('storage', alStorage);
    return () => {
      bus.removeEventListener(EVENTO_LOCAL, alLocal);
      win?.removeEventListener('storage', alStorage);
    };
  }

  return {
    alumno: yo,
    registrar,
    eventos,
    pendientes,
    progreso,
    guardarProgreso,
    dudas,
    agregarDuda,
    contestarDuda,
    sincronizar,
    /** @returns {boolean} true mientras corre `sincronizar()` */
    sincronizando: () => enCurso !== null,
    reiniciar,
    suscribir,
  };
}
