/**
 * Registro del service worker, versiones nuevas y estado sin conexión.
 *
 * Flujo de una versión nueva (ver el comentario de sw.js):
 *   1. El navegador revisa sw.js en cada visita (y aquí, al volver la red o al
 *      regresar a la app después de un rato). Si cambió, la versión nueva se
 *      descarga completa en segundo plano y ESPERA.
 *   2. vigilarActualizaciones() avisa con onDisponible; la página muestra
 *      "Hay una versión nueva de Tecu" (js/ui/actualizacion.js).
 *   3. Solo si la persona toca "Actualizar": aplicarActualizacion() manda
 *      'skipWaiting', espera 'controllerchange' y recarga. Nunca se recarga sola.
 *   4. Si otra ventana actualizó primero, esta sigue funcionando con sus archivos
 *      y recibe onOtraVentana (para ofrecer "Actualizar" = recargar).
 */

/** Cada cuánto, como mínimo, se pregunta por una versión nueva sin recargar. */
const REVISAR_CADA_MS = 60 * 60 * 1000;

/** Esta página pidió la actualización (solo entonces se recarga en controllerchange). */
let actualizacionPedida = false;
let recargando = false;

/**
 * Registra sw.js (el de la carpeta de la app, aunque la página esté en otra
 * ruta). No hace nada si el navegador no lo soporta o si la página no está en un
 * contexto seguro (https o localhost).
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;
  try {
    const url = new URL('../../sw.js', import.meta.url);
    // updateViaCache 'none': revisar si hay versión nueva nunca usa la caché HTTP
    // (GitHub Pages manda sw.js con max-age=600).
    const registro = await navigator.serviceWorker.register(url.href, {
      scope: new URL('./', url).href,
      updateViaCache: 'none',
    });
    // Completa lo que faltó guardar y suelta la caché de la versión anterior.
    navigator.serviceWorker.controller?.postMessage({ tipo: 'mantenimiento' });
    return registro;
  } catch (error) {
    console.warn('No se pudo registrar el service worker:', error);
    return null;
  }
}

/**
 * Avisa cuando hay una versión nueva lista (esperando) o cuando otra ventana ya
 * activó una. La primera instalación no avisa: no hay nada que actualizar.
 * @param {ServiceWorkerRegistration} registro
 * @param {{
 *   onDisponible?: (esperando: ServiceWorker) => void,
 *   onOtraVentana?: () => void,
 *   revisarCada?: number,
 * }} [opciones]
 * @returns {() => void} quita los listeners
 */
export function vigilarActualizaciones(registro, { onDisponible = () => {}, onOtraVentana = () => {}, revisarCada = REVISAR_CADA_MS } = {}) {
  const sw = navigator.serviceWorker;
  if (!registro || !sw) return () => {};
  // Sin controlador al cargar = primera visita: el primer controllerchange es la
  // primera instalación tomando la página, no una actualización.
  let controlada = Boolean(sw.controller);

  const avisarSiEspera = () => {
    if (registro.waiting && sw.controller) onDisponible(registro.waiting);
  };
  const seguirInstalacion = () => {
    const nuevo = registro.installing;
    if (!nuevo) return;
    nuevo.addEventListener('statechange', () => {
      if (nuevo.state === 'installed') avisarSiEspera();
    });
  };
  const alCambiarControlador = () => {
    if (!controlada) {
      controlada = true;
      return;
    }
    if (!actualizacionPedida) onOtraVentana();
  };

  // La visita misma ya revisó sw.js… salvo que se haya abierto sin red.
  let ultimaRevision = navigator.onLine === false ? 0 : Date.now();
  const revisar = (minimo) => {
    if (navigator.onLine === false || Date.now() - ultimaRevision < minimo) return;
    ultimaRevision = Date.now();
    registro.update().catch(() => {}); // sin red o servidor caído: se reintenta después
  };
  const alVolverRed = () => revisar(10 * 1000);
  const alVolverVisible = () => {
    if (document.visibilityState === 'visible') revisar(revisarCada);
  };

  registro.addEventListener('updatefound', seguirInstalacion);
  sw.addEventListener('controllerchange', alCambiarControlador);
  window.addEventListener('online', alVolverRed);
  document.addEventListener('visibilitychange', alVolverVisible);
  seguirInstalacion(); // ya se estaba instalando al cargar
  avisarSiEspera(); // ya había una esperando de una visita anterior

  return () => {
    registro.removeEventListener('updatefound', seguirInstalacion);
    sw.removeEventListener('controllerchange', alCambiarControlador);
    window.removeEventListener('online', alVolverRed);
    document.removeEventListener('visibilitychange', alVolverVisible);
  };
}

/**
 * Activa la versión que espera y recarga esta página (solo cuando la persona lo
 * pidió). Si otra ventana ya la activó, basta recargar.
 * @param {ServiceWorkerRegistration} registro
 * @param {{ recargar?: () => void, espera?: number }} [opciones]
 *   espera: respaldo por si el cambio de controlador nunca llega
 * @returns {Promise<void>} se resuelve justo antes de recargar
 */
export function aplicarActualizacion(registro, { recargar = () => location.reload(), espera = 8000 } = {}) {
  actualizacionPedida = true;
  return new Promise((listo) => {
    const recargarUnaVez = () => {
      if (recargando) return;
      recargando = true;
      listo();
      recargar();
    };
    const esperando = registro?.waiting;
    if (!esperando || !navigator.serviceWorker) {
      recargarUnaVez();
      return;
    }
    navigator.serviceWorker.addEventListener('controllerchange', recargarUnaVez, { once: true });
    setTimeout(recargarUnaVez, espera);
    esperando.postMessage({ tipo: 'skipWaiting' });
  });
}

/**
 * Pregunta al service worker qué tiene guardado.
 * @returns {Promise<{
 *   version: string, archivos: number, bytes: number,
 *   total: number, faltantes: string[], completo: boolean
 * }|null>} archivos/total: guardados de los que necesita la app; faltantes: los que
 *   no se pudieron guardar (se reintentan en cada visita con internet)
 */
export async function estadoSinConexion({ espera = 3000 } = {}) {
  if (!('serviceWorker' in navigator)) return null;
  // ready nunca se resuelve si no hay service worker (http, navegación privada…).
  const sinRegistro = new Promise((listo) => setTimeout(() => listo(null), espera));
  const registro = await Promise.race([navigator.serviceWorker.ready, sinRegistro]).catch(() => null);
  const sw = registro?.active;
  if (!sw) return null;
  return new Promise((resolver) => {
    const canal = new MessageChannel();
    const limite = setTimeout(() => resolver(null), espera);
    canal.port1.onmessage = (e) => {
      clearTimeout(limite);
      resolver(e.data?.tipo === 'estado-cache' ? e.data : null);
    };
    sw.postMessage({ tipo: 'estado-cache' }, [canal.port2]);
  });
}
