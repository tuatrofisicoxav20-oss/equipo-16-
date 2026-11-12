/**
 * Registro del service worker y consulta de qué tan lista está la app para
 * usarse sin internet (lo usa la pantalla de Descargas).
 */

/**
 * Registra sw.js. No hace nada si el navegador no lo soporta o si la página
 * no está en un contexto seguro (https o localhost).
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;
  try {
    const registro = await navigator.serviceWorker.register('sw.js');
    return registro;
  } catch (error) {
    console.warn('No se pudo registrar el service worker:', error);
    return null;
  }
}

/**
 * Pregunta al service worker cuántos archivos y bytes tiene guardados.
 * @returns {Promise<{version: string, archivos: number, bytes: number}|null>}
 */
export async function estadoSinConexion({ espera = 3000 } = {}) {
  if (!('serviceWorker' in navigator)) return null;
  const registro = await navigator.serviceWorker.ready.catch(() => null);
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
