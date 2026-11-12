/**
 * Diálogos del cascarón: ajustes de accesibilidad, conexión y datos, y recorrido guiado.
 * Cada función abre el diálogo y lo mantiene al día mientras está abierto.
 *
 * Reciben el contexto del cascarón:
 *   { perfil, alumno, red, store, vista(), salida(), leerRed(), pendientes(), irAPaso(paso, i, total) }
 */
import { attr, delegar, html, renderConFoco } from '../ui/dom.js';
import { MARCA } from '../marca.js';
import {
  alCambiarPreferencias,
  guardarPreferencias,
  leerPreferencias,
  restablecerPreferencias,
} from '../services/preferencias.js';
import { cargarPaquete } from '../data/paquete.js';
import { ic, interruptor, segmentado } from './componentes.js';
import { abrirDialogo } from './dialogo.js';
import { pasosDelRecorrido } from './recorrido.js';
import { voz } from './voz.js';

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/* ------------------------------------------------------------------ */
/* Ajustes de accesibilidad                                            */
/* ------------------------------------------------------------------ */

const TAMANOS = [
  { valor: 'md', texto: 'Normal' },
  { valor: 'lg', texto: 'Grande' },
  { valor: 'xl', texto: 'Muy grande' },
  { valor: 'xxl', texto: 'Enorme' },
];
const TEMAS = [
  { valor: 'sistema', texto: 'Del sistema' },
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
  { valor: 'contraste', texto: 'Alto contraste' },
];

function htmlAccesibilidad(p) {
  const hayVoz = voz.soportada();
  return html`<div class="stack" id="a11y-panel">
    ${segmentado({ nombre: 'pref-tamano', clave: 'tamano', leyenda: 'Tamaño del texto', cambio: 'pref', valor: p.tamano, opciones: TAMANOS })}
    ${segmentado({ nombre: 'pref-tema', clave: 'tema', leyenda: 'Colores', cambio: 'pref', valor: p.tema, opciones: TEMAS })}
    <div class="switch-list">
      ${interruptor({
        id: 'pref-espaciado',
        clave: 'espaciado',
        cambio: 'pref',
        etiqueta: 'Espaciado de texto amplio',
        ayuda: 'Más espacio entre letras, palabras y líneas. Ayuda a la lectura.',
        marcado: p.espaciado,
      })}
      ${interruptor({
        id: 'pref-movimiento',
        clave: 'movimiento',
        cambio: 'pref',
        etiqueta: 'Reducir movimiento',
        ayuda: 'Quita animaciones y desplazamientos suaves.',
        marcado: p.movimiento === 'reducido',
      })}
      ${interruptor({
        id: 'pref-simple',
        clave: 'simple',
        cambio: 'pref',
        etiqueta: 'Navegación simplificada',
        ayuda: 'Muestra solo lo esencial de cada pantalla.',
        marcado: p.simple,
      })}
      ${interruptor({
        id: 'pref-voz',
        clave: 'voz',
        cambio: 'pref',
        etiqueta: 'Lectura en voz alta',
        ayuda: hayVoz ? 'Agrega botones «Escuchar» y «Leer página».' : 'Tu navegador no permite esta función.',
        marcado: p.voz && hayVoz,
        deshabilitado: !hayVoz,
      })}
    </div>
    <p class="muted small">Los ajustes se guardan en este equipo y se aplican al momento.</p>
    <div class="dialog__actions">
      <button type="button" class="btn btn--ghost" data-act="restablecer" data-foco="restablecer">${ic('reset', 18)}Restablecer ajustes</button>
      <button type="button" class="btn btn--primary" data-cerrar>Listo</button>
    </div>
  </div>`;
}

/**
 * Ajustes de accesibilidad: todos los del prototipo sobre las preferencias unificadas.
 * Cada cambio se guarda y se aplica al momento (js/services/preferencias.js).
 */
export function abrirAccesibilidad() {
  let propio = false;
  let quitar = () => {};
  const dialogo = abrirDialogo({
    titulo: 'Ajustes de accesibilidad',
    cuerpo: htmlAccesibilidad(leerPreferencias()),
    alCerrar: () => quitar(),
  });

  dialogo.cuerpo.addEventListener('change', (evento) => {
    const el = evento.target.closest?.('[data-cambio="pref"]');
    if (!el) return;
    const clave = el.dataset.clave;
    let cambio;
    if (clave === 'movimiento') cambio = { movimiento: el.checked ? 'reducido' : 'auto' };
    else if (el.type === 'checkbox') cambio = { [clave]: el.checked };
    else cambio = { [clave]: el.value };
    propio = true;
    try {
      guardarPreferencias(cambio);
    } finally {
      propio = false;
    }
    if (clave === 'voz' && !el.checked) voz.detener();
    if (el.type === 'checkbox') dialogo.decir(el.checked ? 'Activado.' : 'Desactivado.');
  });

  delegar(dialogo.cuerpo, {
    restablecer() {
      propio = true;
      try {
        restablecerPreferencias();
      } finally {
        propio = false;
      }
      voz.detener();
      dialogo.actualizar(htmlAccesibilidad(leerPreferencias()));
      dialogo.decir('Ajustes de accesibilidad restablecidos.');
    },
  });

  // Otra pestaña o el marco de la vista móvil cambió los ajustes: se reflejan aquí.
  quitar = alCambiarPreferencias((prefs) => {
    if (!propio && dialogo.abierto()) dialogo.actualizar(htmlAccesibilidad(prefs));
  });
  return dialogo;
}

/* ------------------------------------------------------------------ */
/* Conexión y datos                                                    */
/* ------------------------------------------------------------------ */

/** Icono, texto y tono del estado de la conexión (lo usa también el encabezado). */
export function infoRed({ enLinea, real, simulada }) {
  if (enLinea) return { icono: 'wifi', texto: 'Con internet', tono: 'ok', simulado: false };
  return { icono: 'wifi-off', texto: 'Sin internet', tono: 'warn', simulado: Boolean(real && simulada) };
}

function htmlEstadoConexion(ctx) {
  const red = ctx.leerRed();
  const info = infoRed(red);
  const docente = ctx.perfil === 'docente';
  const explicacion = red.enLinea
    ? docente
      ? 'Ves el avance del grupo conforme se sincroniza y tus mensajes se envían al momento.'
      : 'Tu avance se guarda en este dispositivo y se envía a tu maestra o maestro en cuanto lo terminas.'
    : info.simulado
      ? 'Estás simulando la falta de internet. Todo sigue funcionando con lo guardado en este dispositivo; lo pendiente se enviará al volver.'
      : 'Este dispositivo no tiene señal. Todo sigue funcionando con lo guardado; lo pendiente se enviará solo cuando vuelva.';
  return html`<div class="banner banner--${info.tono}" role="note">
      ${ic(info.icono, 22)}
      <div>
        <p class="banner__title">${info.texto}${info.simulado ? ' (simulado)' : ''}</p>
        <p>${explicacion}</p>
      </div>
    </div>
    <dl class="dl conexion__datos">
      <div>
        <dt>Red de este dispositivo</dt>
        <dd>${red.real ? 'Con señal' : 'Sin señal'}</dd>
      </div>
      <div>
        <dt>Simulación sin internet</dt>
        <dd>${red.simulada ? 'Activada' : 'Apagada'}</dd>
      </div>
    </dl>
    ${interruptor({
      id: 'conn-sin-internet',
      cambio: 'sin-internet',
      etiqueta: 'Simular sin internet',
      ayuda: 'Para probar o proyectar cómo funciona sin conexión.',
      marcado: red.simulada,
    })}`;
}

function htmlAccionesConexion(ctx) {
  const red = ctx.leerRed();
  const n = ctx.pendientes();
  const puede = red.enLinea && n > 0;
  const ayuda = !red.enLinea
    ? 'Sin internet: lo pendiente se enviará solo cuando vuelva la conexión.'
    : n
      ? `Hay ${plural(n, 'pendiente', 'pendientes')}: se envían solos, o puedes enviarlos ahora.`
      : 'No hay nada pendiente de enviar.';
  return html`<p class="field__hint" id="conn-ayuda">${ayuda}</p>
    <div class="dialog__actions">
      <button type="button" class="btn btn--secondary" data-act="sincronizar" data-foco="sincronizar" aria-describedby="conn-ayuda"${attr('aria-disabled', !puede, 'true')}>
        ${ic('sync', 18)}Sincronizar ahora
      </button>
      <button type="button" class="btn btn--primary" data-cerrar>Listo</button>
    </div>`;
}

/** Lo pendiente del docente: mensajes en la bandeja de salida (si el módulo de mensajes existe). */
function htmlSalidaDocente(ctx) {
  const n = ctx.pendientes();
  if (!n) return html`<p class="muted">Nada pendiente.</p>`;
  return html`<ul class="list-icons">
    <li>${ic('send', 18)}<span>${plural(n, 'mensaje', 'mensajes')} para tus estudiantes, en espera de conexión.</span></li>
  </ul>`;
}

/**
 * Panel de conexión: estado real y simulado, la cola de pendientes (js/ui/cola.js) y
 * «Sincronizar ahora».
 */
export function abrirConexion(ctx) {
  const limpiar = [];
  const dialogo = abrirDialogo({
    titulo: 'Conexión y datos',
    cuerpo: html`<div class="stack" id="conn-panel">
      <div class="stack" data-zona="estado">${htmlEstadoConexion(ctx)}</div>
      <div>
        <h3 class="h-sm" id="conn-pendiente-t">Pendiente de sincronizar</h3>
        <div data-zona="cola">${ctx.store ? '' : htmlSalidaDocente(ctx)}</div>
      </div>
      <div data-zona="acciones">${htmlAccionesConexion(ctx)}</div>
    </div>`,
    alCerrar: () => limpiar.splice(0).forEach((fn) => fn()),
  });
  const zona = (nombre) => dialogo.cuerpo.querySelector(`[data-zona="${nombre}"]`);

  const repintar = () => {
    if (!dialogo.abierto()) return;
    renderConFoco(zona('estado'), htmlEstadoConexion(ctx));
    if (!ctx.store) renderConFoco(zona('cola'), htmlSalidaDocente(ctx));
    renderConFoco(zona('acciones'), htmlAccionesConexion(ctx));
  };

  // La cola del estudiante: la misma tarjeta de Inicio (comparte coordinador con el store).
  if (ctx.store) {
    import('../ui/cola.js')
      .then(({ montarCola }) => {
        if (!dialogo.abierto()) return;
        const cola = montarCola(zona('cola'), {
          store: ctx.store,
          red: ctx.red,
          nivelTitulo: 4,
          describir: (evento) => ctx.vista()?.describirPendiente?.(evento),
          onCambio: repintar,
        });
        limpiar.push(() => cola.destruir());
      })
      .catch((error) => {
        console.error('[tecu]', error);
        if (dialogo.abierto()) zona('cola').innerHTML = String(html`<p class="muted">${plural(ctx.pendientes(), 'actividad pendiente', 'actividades pendientes')}.</p>`);
      });
  }

  dialogo.cuerpo.addEventListener('change', (evento) => {
    const el = evento.target.closest?.('[data-cambio="sin-internet"]');
    if (!el) return;
    ctx.red.simular(el.checked);
    dialogo.decir(el.checked ? 'Simulación activada: sin internet.' : 'Simulación apagada.');
  });

  delegar(dialogo.cuerpo, {
    async sincronizar() {
      const n = await ctx.sincronizarAhora();
      repintar();
      dialogo.decir(n ? `Sincronizado: ${ctx.store ? plural(n, 'actividad enviada', 'actividades enviadas') : plural(n, 'mensaje enviado', 'mensajes enviados')}.` : 'Todo está sincronizado.');
    },
  });

  limpiar.push(ctx.alCambiarEstado(repintar));
  return dialogo;
}

/* ------------------------------------------------------------------ */
/* Recorrido guiado                                                    */
/* ------------------------------------------------------------------ */

function htmlRecorrido(pasos) {
  return html`<p class="muted">Cada paso te lleva a una pantalla de ${MARCA.nombre} con el perfil y la conexión adecuados.</p>
    <ol class="tour">
      ${pasos.map(
        (paso, i) =>
          html`<li>
            <button type="button" class="tour__step" data-act="paso" data-i="${i}">
              <span class="tour__n" aria-hidden="true">${i + 1}</span
              ><span><span class="tour__title">${paso.titulo}</span><span class="tour__detail">${paso.detalle}</span></span
              >${ic('right', 18)}
            </button>
          </li>`,
      )}
    </ol>`;
}

/**
 * Recorrido guiado: la lista de pasos (del paquete, o el respaldo local). Elegir uno
 * cierra el diálogo y deja al cascarón cambiar de perfil, estudiante, conexión y pantalla.
 */
export async function abrirRecorrido(ctx) {
  let pack = null;
  try {
    pack = (await cargarPaquete()).pack;
  } catch {
    pack = null; // sin paquete: los pasos de respaldo
  }
  const pasos = pasosDelRecorrido(pack);
  const dialogo = abrirDialogo({ titulo: 'Recorrido guiado', ancho: 'sm', cuerpo: htmlRecorrido(pasos) });
  delegar(dialogo.cuerpo, {
    paso(el) {
      const i = Number(el.dataset.i);
      const paso = pasos[i];
      if (!paso) return;
      dialogo.cerrar();
      ctx.irAPaso(paso, i, pasos.length);
    },
  });
  return dialogo;
}
