/**
 * Estado de la conexión del "teléfono": la real (navigator.onLine) y un
 * interruptor "Con internet / Sin internet" para proyectar la demo.
 *
 * El interruptor se guarda por alumno en 'tecu:red:<alumno>', así cada teléfono
 * del modo presentación tiene el suyo y los demás iframes/pestañas se enteran
 * por el evento 'storage'. Si localStorage falla, el interruptor sigue
 * funcionando en esta instancia (en memoria).
 */

/** Evento en `window` para avisar a otras instancias del mismo documento. */
const EVENTO_LOCAL = 'tecu:red';

/** @typedef {{ enLinea: boolean, real: boolean, simulada: boolean }} EstadoRed */

function localStorageSeguro() {
  try {
    const s = globalThis.localStorage;
    return s && typeof s.getItem === 'function' ? s : null;
  } catch {
    return null;
  }
}

const ventanaDelNavegador = () => (typeof window === 'undefined' ? null : window);

/** @returns {boolean|null} lo guardado, o null si no hay o no se puede leer */
function leerBandera(almacen, clave) {
  try {
    const valor = JSON.parse(almacen ? almacen.getItem(clave) : null);
    return typeof valor === 'boolean' ? valor : null;
  } catch {
    return null;
  }
}

/** @returns {boolean} true si se guardó */
function guardarBandera(almacen, clave, valor) {
  if (!almacen) return false;
  try {
    almacen.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

function eventoCon(tipo, detail) {
  if (typeof CustomEvent === 'function') return new CustomEvent(tipo, { detail });
  const evento = new Event(tipo);
  evento.detail = detail;
  return evento;
}

/**
 * Conexión de un alumno.
 * @param {string} alumno
 * @param {{ almacenamiento?: Storage|null, ventana?: (EventTarget & { navigator?: { onLine?: boolean } })|null }} [opciones]
 *   por defecto localStorage y `window` (online/offline/storage y navigator.onLine)
 */
export function crearRed(alumno, { almacenamiento, ventana } = {}) {
  const clave = `tecu:red:${alumno || 'invitado'}`;
  const almacen = almacenamiento === undefined ? localStorageSeguro() : almacenamiento;
  const win = ventana === undefined ? ventanaDelNavegador() : ventana;
  const bus = win ?? new EventTarget();
  /** Valor que no se pudo guardar (almacenamiento bloqueado o lleno). */
  let respaldo = null;

  /** @returns {boolean} navigator.onLine (true si el navegador no lo sabe) */
  const real = () => win?.navigator?.onLine !== false;

  /** @returns {boolean} true si el interruptor está en "Sin internet" */
  const simuladaSinInternet = () => respaldo ?? leerBandera(almacen, clave) ?? false;

  /** @returns {boolean} navigator.onLine && !simuladaSinInternet() */
  const enLinea = () => real() && !simuladaSinInternet();

  /** @returns {EstadoRed} */
  const estado = () => ({ enLinea: enLinea(), real: real(), simulada: simuladaSinInternet() });

  /**
   * Mueve el interruptor y avisa (esta página y, vía 'storage', las demás).
   * @param {boolean} sinInternet
   */
  function simular(sinInternet) {
    const valor = Boolean(sinInternet);
    respaldo = guardarBandera(almacen, clave, valor) ? null : valor;
    bus.dispatchEvent(eventoCon(EVENTO_LOCAL, { clave }));
  }

  /**
   * Avisa cuando cambia la red real (online/offline) o el interruptor de este
   * alumno (aquí o en otra pestaña/iframe). No llama a `fn` al suscribirse.
   * @param {(estado: EstadoRed) => void} fn
   * @returns {() => void} deja de escuchar
   */
  function suscribir(fn) {
    const avisar = () => {
      try {
        fn(estado());
      } catch (error) {
        console.error('[tecu]', error);
      }
    };
    const alStorage = (evento) => {
      if (evento.key === clave || evento.key === null) avisar();
    };
    const alLocal = (evento) => {
      if (evento.detail?.clave === clave) avisar();
    };
    const escuchas = [
      ['online', avisar],
      ['offline', avisar],
      ['storage', alStorage],
    ];
    for (const [tipo, manejador] of escuchas) win?.addEventListener(tipo, manejador);
    bus.addEventListener(EVENTO_LOCAL, alLocal);
    return () => {
      for (const [tipo, manejador] of escuchas) win?.removeEventListener(tipo, manejador);
      bus.removeEventListener(EVENTO_LOCAL, alLocal);
    };
  }

  return { enLinea, real, simuladaSinInternet, simular, suscribir, estado };
}
