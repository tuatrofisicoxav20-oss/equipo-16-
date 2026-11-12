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

async function iniciar() {
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
}

iniciar().catch((error) => {
  console.error(error);
  raiz.innerHTML =
    '<div class="pantalla pila" role="alert"><h1 class="titulo-1">Algo salió mal</h1>' +
    '<p>Recarga la página. Si sigue fallando, abre la vista con <code>?reiniciar=1</code>.</p></div>';
});
