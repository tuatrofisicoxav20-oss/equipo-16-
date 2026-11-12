/**
 * Punto de entrada: elige la vista según ?vista= y aplica preferencias.
 *   ?vista=estudiante (por defecto) &alumno=ana|luis|...  &embebido=1
 *   ?vista=docente
 *   ?vista=pitch
 *   ?reiniciar=1  (respaldo de emergencia: deja la demo en estado inicial)
 */
import { leerPreferencias, aplicarPreferencias, alCambiarPreferencias } from './services/preferencias.js';

const params = new URLSearchParams(location.search);
const vista = params.get('vista') || 'estudiante';
const raiz = document.getElementById('app');

aplicarPreferencias(leerPreferencias());
alCambiarPreferencias(aplicarPreferencias);

/**
 * Mide las barras fijas (superior e inferior) y publica su alto real en CSS.
 * styles.css usa --alto-barra-medida y --alto-nav-medida en scroll-padding
 * para que el elemento enfocado nunca quede tapado (WCAG 2.4.11).
 */
function medirBarras() {
  if (!('ResizeObserver' in window)) return;
  const html = document.documentElement;
  const publicar = () => {
    const barra = raiz.querySelector('.barra-superior');
    const nav = raiz.querySelector('.nav-inferior');
    html.style.setProperty('--alto-barra-medida', `${barra ? barra.getBoundingClientRect().height : 0}px`);
    html.style.setProperty('--alto-nav-medida', `${nav ? nav.getBoundingClientRect().height : 0}px`);
  };
  const observador = new ResizeObserver(publicar);
  let barraActual = null;
  let navActual = null;
  const vigilar = () => {
    const barra = raiz.querySelector('.barra-superior');
    const nav = raiz.querySelector('.nav-inferior');
    if (barra === barraActual && nav === navActual) return; // mismas barras: nada que hacer
    barraActual = barra;
    navActual = nav;
    observador.disconnect();
    if (barra) observador.observe(barra);
    if (nav) observador.observe(nav);
    publicar();
  };
  // Las vistas re-renderizan: si cambian las barras, se vuelven a medir.
  new MutationObserver(vigilar).observe(raiz, { childList: true, subtree: true });
  vigilar();
}

/**
 * Hojas de estilo propias de cada vista. Las del estudiante ya vienen en
 * index.html (es la vista del celular y deben estar desde el primer pintado);
 * las del panel y del pitch se cargan solo cuando se abren esas vistas.
 */
const ESTILOS_POR_VISTA = {
  docente: ['css/docente.css', 'css/ficha.css', 'css/impresion.css'],
  pitch: ['css/pitch.css', 'css/libre.css', 'css/diapositiva.css'],
};

function cargarEstilos(rutas = []) {
  return Promise.all(
    rutas.map(
      (href) =>
        new Promise((listo) => {
          if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return listo();
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          link.onload = listo;
          link.onerror = listo; // sin la hoja la vista sigue funcionando con styles.css
          document.head.appendChild(link);
        }),
    ),
  );
}

async function iniciar() {
  await cargarEstilos(ESTILOS_POR_VISTA[vista]);
  if (params.has('reiniciar')) {
    const { reiniciarTodo } = await import('./data/store.js');
    reiniciarTodo();
    params.delete('reiniciar');
    history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
  }

  if (vista === 'docente') {
    const { montarDocente } = await import('./views/docente.js');
    await montarDocente(raiz, { compacto: params.has('compacto') });
  } else if (vista === 'pitch') {
    const { montarPitch } = await import('./views/pitch.js');
    await montarPitch(raiz);
  } else {
    const { montarEstudiante } = await import('./views/estudiante.js');
    const alumno = (params.get('alumno') || 'invitado').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'invitado';
    await montarEstudiante(raiz, { alumno, embebido: params.has('embebido') });
  }
  medirBarras();
  // Guarda la app en el celular para que funcione en modo avión (no bloquea la carga).
  import('./services/sw-registro.js').then((m) => m.registrarServiceWorker());
}

iniciar().catch((error) => {
  console.error(error);
  raiz.innerHTML =
    '<div class="pantalla pila" role="alert"><h1 class="titulo-1">Algo salió mal</h1>' +
    '<p>Recarga la página. Si sigue fallando, abre la vista con <code>?reiniciar=1</code>.</p></div>';
});
