/**
 * Aviso "Hay una versión nueva de Tecu" (fase 3: actualización del service worker).
 *
 * No bloquea: no es un diálogo, no toma el foco y nunca recarga solo. Aparece
 * abajo, sobre la barra de navegación, y se anuncia con anunciar(). La persona
 * decide: "Actualizar" (su avance ya está guardado en el celular) o "Ahora no"
 * (la versión nueva se usará la próxima vez que abra Tecu). Solo aparece en la
 * ventana principal: dentro de los iframes del modo presentación avisa el pitch.
 *
 *   montarAvisoActualizacion(registro) → { destruir() } | null
 *   crearAvisoActualizacion({ onActualizar, onDespues, contenedor })
 *     → { elemento, mostrar(tipo), ocultar(), destruir() }   tipo: 'disponible' | 'otra-ventana'
 */
import { anunciar, bool, crudo, delegar, html, renderConFoco } from './dom.js';
import { icono } from './iconos.js';
import { aplicarActualizacion, vigilarActualizaciones } from '../services/sw-registro.js';

export const TEXTOS_ACTUALIZACION = Object.freeze({
  disponible: {
    titulo: 'Hay una versión nueva de Tecu',
    detalle: 'Tu avance está guardado. Actualiza cuando termines lo que estás haciendo.',
    anuncio: 'Hay una versión nueva de Tecu. Tu avance está guardado: actualiza cuando termines.',
    despues: 'Está bien. Tecu usará la versión nueva la próxima vez que lo abras.',
  },
  'otra-ventana': {
    titulo: 'Tecu se actualizó en otra ventana',
    detalle: 'Actualiza esta también para seguir con la versión nueva. Tu avance está guardado.',
    anuncio: 'Tecu se actualizó en otra ventana. Actualiza esta cuando termines; tu avance está guardado.',
    despues: 'Está bien. Cuando recargues, Tecu usará la versión nueva.',
  },
});

/** Estilos del aviso (usa los tokens de styles.css; se agregan una sola vez). */
const ESTILOS = `
.actualizacion {
  position: fixed;
  z-index: 55; /* sobre las barras fijas (20), debajo de los avisos breves (60) */
  right: var(--espacio-4);
  bottom: calc(var(--avisos-abajo) + env(safe-area-inset-bottom, 0px));
  left: var(--espacio-4);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--espacio-2) var(--espacio-3);
  max-width: 30rem;
  margin-inline: auto;
  padding: var(--espacio-3) var(--espacio-4);
  border: var(--borde-control) solid var(--color-primario);
  border-radius: var(--radio-grande);
  background: var(--color-superficie);
  color: var(--color-texto);
  box-shadow: var(--sombra-grande);
  animation: ui-aviso-entra 0.28s var(--curva);
}
.actualizacion[hidden] { display: none; }
.actualizacion__icono { display: flex; flex: none; color: var(--color-primario); }
.actualizacion__texto { flex: 1 1 12rem; min-width: 0; }
.actualizacion__titulo { margin: 0; font-size: var(--texto-base); font-weight: 800; line-height: 1.3; }
.actualizacion__detalle { margin: var(--espacio-1) 0 0; color: var(--color-texto-sec); font-size: var(--texto-chico); line-height: 1.35; }
.actualizacion__acciones { display: flex; flex: 1 1 auto; flex-wrap: wrap; justify-content: flex-end; gap: var(--espacio-2); }
/* Celular acostado o zoom grande: no tapa media pantalla (va al final de la página, como las barras). */
@media (max-height: 28rem) {
  .actualizacion { position: static; max-width: none; margin: var(--espacio-4); box-shadow: var(--sombra); animation: none; }
}
`;

function asegurarEstilos() {
  if (document.getElementById('estilos-actualizacion')) return;
  const estilo = document.createElement('style');
  estilo.id = 'estilos-actualizacion';
  estilo.textContent = ESTILOS;
  document.head.appendChild(estilo);
}

/**
 * Crea el aviso (oculto hasta mostrar()).
 * @param {{ onActualizar?: () => void, onDespues?: () => void, contenedor?: HTMLElement }} [opciones]
 */
export function crearAvisoActualizacion({ onActualizar = () => {}, onDespues = () => {}, contenedor = document.body } = {}) {
  asegurarEstilos();
  const elemento = document.createElement('section');
  elemento.className = 'actualizacion oculto-impresion';
  elemento.setAttribute('aria-labelledby', 'actualizacion-titulo');
  elemento.hidden = true;
  let tipo = 'disponible';
  let actualizando = false;
  let antesDelAviso = null; // lo que tenía el foco antes de entrar al aviso (para regresarlo)

  const render = () => {
    const textos = TEXTOS_ACTUALIZACION[tipo];
    elemento.dataset.tipo = tipo;
    renderConFoco(
      elemento,
      html`
        <span class="actualizacion__icono">${crudo(icono('sincronizar'))}</span>
        <div class="actualizacion__texto">
          <h2 class="actualizacion__titulo" id="actualizacion-titulo">${textos.titulo}</h2>
          <p class="actualizacion__detalle">${textos.detalle}</p>
        </div>
        <div class="actualizacion__acciones">
          <button type="button" class="boton boton--fantasma" data-act="despues" data-foco="despues">Ahora no</button>
          <button type="button" class="boton boton--primario" data-act="actualizar" data-foco="actualizar"
            aria-disabled="${bool(actualizando)}" aria-busy="${bool(actualizando)}">${actualizando ? 'Actualizando…' : 'Actualizar'}</button>
        </div>`,
    );
  };

  /** Que los avisos breves y el foco con teclado no queden debajo del aviso (WCAG 2.4.11). */
  const reservarEspacio = () => {
    const raizHtml = document.documentElement;
    const avisos = document.getElementById('avisos');
    const fijo = elemento.isConnected && !elemento.hidden && getComputedStyle(elemento).position === 'fixed';
    const alto = fijo ? Math.ceil(elemento.getBoundingClientRect().height) : 0;
    if (alto) {
      raizHtml.style.setProperty(
        'scroll-padding-bottom',
        `calc(var(--avisos-abajo) + env(safe-area-inset-bottom, 0px) + ${alto}px + var(--espacio-3))`,
      );
      avisos?.style.setProperty('padding-bottom', `calc(${alto}px + var(--espacio-2))`);
    } else {
      raizHtml.style.removeProperty('scroll-padding-bottom');
      avisos?.style.removeProperty('padding-bottom');
    }
  };
  const observador = 'ResizeObserver' in window ? new ResizeObserver(reservarEspacio) : null;
  observador?.observe(elemento);
  window.addEventListener('resize', reservarEspacio);

  const alEntrarFoco = (evento) => {
    if (!elemento.contains(evento.relatedTarget)) antesDelAviso = evento.relatedTarget;
  };
  elemento.addEventListener('focusin', alEntrarFoco);

  const ocultar = () => {
    const teniaFoco = elemento.contains(document.activeElement);
    elemento.hidden = true;
    reservarEspacio();
    if (!teniaFoco) return;
    const destino =
      (antesDelAviso?.isConnected && antesDelAviso) || document.getElementById('contenido') || document.querySelector('h1');
    if (destino) {
      if (!destino.matches('a[href], button, input, select, textarea, [tabindex]')) destino.setAttribute('tabindex', '-1');
      destino.focus({ preventScroll: true });
    }
  };

  const quitarDelegacion = delegar(elemento, {
    actualizar: () => {
      if (actualizando) return;
      actualizando = true;
      render();
      anunciar('Actualizando Tecu…');
      onActualizar();
    },
    despues: () => {
      const mensaje = TEXTOS_ACTUALIZACION[tipo].despues;
      ocultar();
      anunciar(mensaje);
      onDespues(tipo);
    },
  });

  return {
    elemento,
    /** Muestra (o cambia) el aviso sin mover el foco; lo anuncia una vez por cambio. */
    mostrar(nuevo = 'disponible') {
      const siguiente = TEXTOS_ACTUALIZACION[nuevo] ? nuevo : 'disponible';
      if (!elemento.hidden && elemento.isConnected && siguiente === tipo) return;
      tipo = siguiente;
      render();
      if (!elemento.isConnected) contenedor.appendChild(elemento);
      elemento.hidden = false;
      reservarEspacio();
      anunciar(TEXTOS_ACTUALIZACION[tipo].anuncio);
    },
    ocultar,
    destruir() {
      quitarDelegacion();
      observador?.disconnect();
      window.removeEventListener('resize', reservarEspacio);
      elemento.removeEventListener('focusin', alEntrarFoco);
      ocultar();
      elemento.remove();
    },
  };
}

/**
 * Vigila el service worker y muestra el aviso cuando hace falta.
 * @param {ServiceWorkerRegistration} registro lo que devuelve registrarServiceWorker()
 * @param {{ contenedor?: HTMLElement }} [opciones]
 * @returns {{ destruir(): void } | null} null dentro de un iframe o sin service worker
 */
export function montarAvisoActualizacion(registro, { contenedor = document.body } = {}) {
  if (!registro || window.self !== window.top) return null;
  let descartada = null; // la versión que esperaba cuando la persona tocó "Ahora no"
  const aviso = crearAvisoActualizacion({
    contenedor,
    onActualizar: () => aplicarActualizacion(registro),
    onDespues: (tipo) => {
      if (tipo === 'disponible') descartada = registro.waiting;
    },
  });
  const quitar = vigilarActualizaciones(registro, {
    onDisponible: (esperando) => {
      if (esperando !== descartada) aviso.mostrar('disponible');
    },
    onOtraVentana: () => aviso.mostrar('otra-ventana'),
  });
  return {
    destruir() {
      quitar();
      aviso.destruir();
    },
  };
}
