/**
 * «Acerca del proyecto» (#/acerca, para los dos perfiles): planteamiento del problema con
 * sus estadísticas y fuente, propuesta con enlaces a las pantallas reales, fundamento
 * pedagógico con el ciclo, validación e impacto, accesibilidad y usabilidad, y las fuentes.
 *
 * Es la página «Acerca» del prototipo de interfaz (referencia/estudiando-ando/js/about.js)
 * con su mismo marcado. Los números y las referencias NO están aquí: se leen de
 * packs/contexto.json (acerca.estadisticas, acerca.pedagogia, acerca.fuentes) y el ciclo,
 * de packs/ecuaciones-1.json (pack.ciclo).
 *
 * La monta el cascarón (js/shell/cascaron.js) como una vista más:
 *   crearVistaAcerca({ anfitrion, perfil }) → { rutas: ['/acerca'], montar, desmontar, … }
 */
import { delegar, html, movimientoReducido } from '../ui/dom.js';
import { MARCA } from '../marca.js';
import { cargarPaquete } from '../data/paquete.js';
import { ciclo, encabezadoPagina, ic, tarjeta } from '../shell/componentes.js';

const URL_CONTEXTO = (() => {
  try {
    return new URL('../../packs/contexto.json', import.meta.url).href;
  } catch {
    return 'packs/contexto.json';
  }
})();

/** Respaldo local del ciclo pedagógico mientras el paquete no traiga `ciclo`. */
const CICLO_RESPALDO = ['Diagnosticar', 'Identificar dificultades', 'Adaptar', 'Acompañar', 'Comprobar', 'Reajustar'];

/** Funciones de cada módulo y la pantalla real donde se ven: [texto, ruta]. */
const FUNCIONES = {
  estudiante: [
    ['Contenidos según nivel y plan de estudios', '/aprender'],
    ['Diagnóstico renglón por renglón', '/diagnostico'],
    ['Rutas de aprendizaje personalizadas', '/inicio'],
    ['Tutor que guía sin entregar respuestas', '/tutor'],
    ['Diferentes formas de estudiar', '/aprender'],
    ['Detección de errores y refuerzo inmediato', '/tutor'],
    ['Seguimiento del progreso y autonomía', '/progreso'],
    ['Comprobación sin ayuda', '/comprobar'],
    ['Retroalimentación del docente', '/inicio'],
    ['Funciona sin internet, en celulares sencillos', '/descargas'],
  ],
  docente: [
    ['Seguimiento individual', '/alumnos'],
    ['Identificación temprana de dificultades', '/alertas'],
    ['Panel del grupo y mapa de aprendizaje', '/grupo'],
    ['Retroalimentación personalizada', '/alumnos'],
    ['Planeación con base en necesidades reales', '/planeacion'],
    ['Seguimiento de las intervenciones', '/planeacion'],
    ['Supervisión y control docente', '/datos'],
  ],
};

const SECCIONES = [
  ['ab-problema', 'Planteamiento del problema'],
  ['ab-propuesta', 'Propuesta de solución'],
  ['ab-pedagogia', 'Fundamento pedagógico'],
  ['ab-impacto', 'Validación e impacto esperado'],
  ['ab-accesibilidad', 'Accesibilidad y usabilidad'],
  ['ab-fuentes', 'Fuentes'],
];

const lista = (valor) => (Array.isArray(valor) ? valor.filter((x) => x && typeof x === 'object') : []);

/** Dominio de una dirección, sin «www.» (texto del enlace de cada fuente). */
function dominio(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Solo se enlazan direcciones http(s) (los datos vienen de un JSON, no del código). */
const esEnlace = (url) => /^https?:\/\//i.test(String(url || ''));

/**
 * @param {{ anfitrion: object, perfil: 'estudiante'|'docente' }} opciones
 */
export async function crearVistaAcerca({ anfitrion, perfil = 'estudiante' } = {}) {
  let quitar = () => {};

  /** Enlace a una pantalla real; si es del otro módulo, la dirección cambia de perfil. */
  function listaDeFunciones(modulo) {
    const otro = modulo !== perfil;
    return html`<ul class="feature-list">
      ${FUNCIONES[modulo].map(
        ([texto, ruta]) =>
          html`<li>
            <a class="feature-link" href="${otro ? anfitrion.urlPara({ perfil: modulo, ruta }) : `#${ruta}`}"
              >${ic('right', 16)}<span>${texto}</span
              ><span class="sr-only"> (${otro ? `abre el módulo ${modulo === 'docente' ? 'docente' : 'del estudiante'}` : 'ver en la demostración'})</span></a
            >
          </li>`,
      )}
    </ul>`;
  }

  function htmlPagina({ contexto, pasosDelCiclo }) {
    const acerca = contexto?.acerca || {};
    const estadisticas = lista(acerca.estadisticas);
    const pedagogia = lista(acerca.pedagogia);
    const fuentes = lista(acerca.fuentes);
    const sinDatos = html`<div class="note note--warn" role="status">
      ${ic('alert', 20)}
      <div>
        <p>No se pudieron cargar las estadísticas y las fuentes. Revisa tu conexión y vuelve a intentarlo.</p>
        <p><button type="button" class="btn btn--secondary btn--sm" data-act="reintentar">${ic('reset', 16)}Volver a intentar</button></p>
      </div>
    </div>`;

    return html`${encabezadoPagina({
        antetitulo: `${MARCA.equipo} · Propuesta`,
        titulo: `Acerca de ${MARCA.nombre}`,
        entrada:
          'Una plataforma de aprendizaje adaptativo, alineada con los planes y programas de estudio oficiales de México, que acompaña al estudiante sin pensar por él, funciona sin internet en celulares sencillos y ayuda al docente a detectar dificultades a tiempo.',
      })}

      <nav class="card toc" aria-labelledby="toc-t">
        <h2 class="card__title" id="toc-t">En esta página</h2>
        <ol>
          ${SECCIONES.map(([id, texto]) => html`<li><a class="link" href="#${id}" data-act="saltar" data-id="${id}">${texto}</a></li>`)}
        </ol>
      </nav>

      <section class="section" id="ab-problema" aria-labelledby="ab-problema-t" tabindex="-1">
        <h2 id="ab-problema-t">Planteamiento del problema</h2>
        <p class="prose">
          En México, el desafío no es solo dar acceso a contenidos, sino lograr que los estudiantes comprendan, desarrollen y
          apliquen lo que aprenden. Tener herramientas que dan respuestas no garantiza la comprensión, y los docentes pueden
          tardar semanas en identificar a quién le cuesta un tema.
        </p>
        ${estadisticas.length
          ? html`<ul class="stats" role="list">
              ${estadisticas.map(
                (e) =>
                  html`<li class="stat">
                    <p class="stat__value">${e.valor}</p>
                    <p class="stat__text">${e.texto}</p>
                    <p class="stat__src">Fuente: ${e.fuente}</p>
                  </li>`,
              )}
            </ul>`
          : sinDatos}
        <div class="note note--brand">
          ${ic('target', 22)}
          <p>
            <strong>Problema central:</strong> dar acompañamiento educativo accesible y adaptado a las dificultades de cada
            estudiante, que le permita comprender, ganar autonomía y seguir aprendiendo con conectividad limitada; y fortalecer
            al docente para identificar dificultades a tiempo y retroalimentar de forma personalizada, sin sustituir su labor.
          </p>
        </div>
      </section>

      <section class="section" id="ab-propuesta" aria-labelledby="ab-propuesta-t" tabindex="-1">
        <h2 id="ab-propuesta-t">Propuesta de solución</h2>
        <p class="prose">
          Una plataforma móvil y web que, con un diagnóstico que revisa el procedimiento renglón por renglón, identifica los
          conocimientos previos y el tipo de error de cada estudiante, y adapta explicaciones, actividades y apoyos.
          ${MARCA.tutor}, el tutor, no entrega respuestas: orienta con preguntas, pistas progresivas, ejemplos y
          retroalimentación. El diagnóstico lo calcula un motor que corre en el propio celular, sin internet; la inteligencia
          artificial generativa es una capa opcional y todo funciona sin ella. Elige una función para verla funcionando.
        </p>
        <div class="grid grid--2">
          ${tarjeta({ id: 'ab-mod-s', titulo: 'Módulo del estudiante', icono: 'user', nivel: 3, cuerpo: listaDeFunciones('estudiante') })}
          ${tarjeta({ id: 'ab-mod-t', titulo: 'Módulo docente', icono: 'users', nivel: 3, cuerpo: listaDeFunciones('docente') })}
        </div>
      </section>

      <section class="section" id="ab-pedagogia" aria-labelledby="ab-pedagogia-t" tabindex="-1">
        <h2 id="ab-pedagogia-t">Fundamento pedagógico</h2>
        <p class="prose">
          Un modelo de aprendizaje adaptativo basado en el dominio y la evaluación formativa. Los resultados alimentan al
          mismo tiempo el módulo del estudiante y el docente.
        </p>
        ${ciclo(pasosDelCiclo, -1)}
        ${pedagogia.length
          ? html`<dl class="defs">
              ${pedagogia.map(
                (p) =>
                  html`<div>
                    <dt>${p.titulo}</dt>
                    <dd>${p.texto}</dd>
                  </div>`,
              )}
            </dl>`
          : ''}
      </section>

      <section class="section" id="ab-impacto" aria-labelledby="ab-impacto-t" tabindex="-1">
        <h2 id="ab-impacto-t">Validación e impacto esperado</h2>
        <ul class="list-icons prose">
          <li>
            ${ic('target', 18)}<span
              >Evaluaciones antes y después del aprendizaje, y ejercicios resueltos <strong>sin ayuda</strong>, para medir
              comprensión y autonomía, no solo actividades completadas.</span
            >
          </li>
          <li>
            ${ic('clock', 18)}<span
              >Tiempo entre la aparición de dificultades recurrentes y su identificación por el docente, y utilidad de las
              alertas.</span
            >
          </li>
          <li>
            ${ic('trend', 18)}<span
              >Evolución de los estudiantes después de recibir apoyo, y si las rutas permiten que quienes parten de distintos
              conocimientos alcancen los objetivos.</span
            >
          </li>
          <li>
            ${ic('grid', 18)}<span
              >Cuando sea viable, comparación entre una experiencia adaptativa y una secuencia uniforme, antes de ampliar a
              otras asignaturas, niveles y regiones.</span
            >
          </li>
        </ul>
      </section>

      <section class="section" id="ab-accesibilidad" aria-labelledby="ab-accesibilidad-t" tabindex="-1">
        <h2 id="ab-accesibilidad-t">Accesibilidad y usabilidad</h2>
        <p class="prose">
          Este prototipo se diseñó para cumplir las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.2, nivel AA, y los
          10 principios de usabilidad de Jakob Nielsen.
        </p>
        <div class="grid grid--2">
          ${tarjeta({
            id: 'ab-wcag',
            titulo: 'WCAG 2.2 AA',
            icono: 'access',
            nivel: 3,
            cuerpo: html`<ul class="list-icons">
              ${[
                'Contraste mínimo de 4.5:1 en texto y 3:1 en controles, en temas claro, oscuro y alto contraste.',
                'Todo funciona con teclado, con foco visible y sin que las barras fijas lo oculten.',
                'Estructura semántica: puntos de referencia, encabezados en orden y tablas con encabezados.',
                'El color nunca es la única señal: cada estado lleva texto o icono.',
                'Texto ampliable hasta 150 % y espaciado ajustable sin perder contenido; adaptable desde 320 px.',
                'Formularios con etiquetas visibles, ayudas y errores que explican cómo corregir.',
                'Mensajes de estado anunciados a lectores de pantalla y avisos que no interrumpen.',
                'Controles de al menos 44 × 44 px y respeto por «reducir movimiento».',
              ].map((texto) => html`<li>${ic('check', 18)}<span>${texto}</span></li>`)}
            </ul>`,
          })}
          ${tarjeta({
            id: 'ab-nielsen',
            titulo: 'Heurísticas de Nielsen',
            icono: 'compass',
            nivel: 3,
            cuerpo: html`<ol class="steps">
              ${[
                ['Visibilidad del estado', 'conexión, sincronización y guardado siempre visibles.'],
                ['Lenguaje del mundo real', 'español claro y ejemplos cotidianos.'],
                ['Control y libertad', 'deshacer, cancelar, restaurar y volver atrás con el navegador.'],
                ['Consistencia', 'la misma navegación y los mismos patrones en todas las pantallas.'],
                ['Prevención de errores', 'las acciones no disponibles explican por qué.'],
                ['Reconocer antes que recordar', 'iconos con texto y ruta de aprendizaje visible.'],
                ['Flexibilidad', 'varias formas de estudiar y ajustes de accesibilidad.'],
                ['Diseño minimalista', 'modo de navegación simplificada.'],
                ['Recuperarse de errores', 'mensajes junto al campo, con la solución.'],
                ['Ayuda', 'recorrido guiado y esta página de documentación.'],
              ].map(([nombre, texto]) => html`<li><strong>${nombre}:</strong> ${texto}</li>`)}
            </ol>`,
          })}
        </div>
      </section>

      <section class="section" id="ab-fuentes" aria-labelledby="ab-fuentes-t" tabindex="-1">
        <h2 id="ab-fuentes-t">Fuentes</h2>
        ${fuentes.length
          ? html`<ol class="sources">
              ${fuentes.map(
                (f) =>
                  html`<li>
                    ${f.referencia}
                    ${esEnlace(f.url)
                      ? html`<a class="link" href="${f.url}" target="_blank" rel="noopener noreferrer"
                          >${dominio(f.url)}${ic('external', 14)}<span class="sr-only"> (se abre en una pestaña nueva)</span></a
                        >`
                      : ''}
                  </li>`,
              )}
            </ol>`
          : estadisticas.length
            ? sinDatos
            : html`<p class="muted">Las fuentes aparecerán aquí cuando se puedan cargar.</p>`}
        <p class="muted small">
          El grupo que ve el módulo docente es un grupo simulado para la demostración. Lo que resuelve quien usa la app en
          este dispositivo sí se registra y se revisa de verdad, con el motor de diagnóstico.
        </p>
      </section>`;
  }

  async function cargarDatos() {
    const [contexto, paquete] = await Promise.all([
      cargarPaquete(URL_CONTEXTO).then(
        (r) => r.pack,
        (error) => {
          console.warn('[tecu] No se pudo cargar packs/contexto.json:', error?.message || error);
          return null;
        },
      ),
      cargarPaquete().then(
        (r) => r.pack,
        () => null,
      ),
    ]);
    const delPaquete = Array.isArray(paquete?.ciclo)
      ? paquete.ciclo.map((paso) => String(typeof paso === 'string' ? paso : paso?.nombre || paso?.titulo || '').trim()).filter(Boolean)
      : [];
    return { contexto, pasosDelCiclo: delPaquete.length ? delPaquete : CICLO_RESPALDO };
  }

  async function montar(_ruta, _params, contenedor) {
    quitar();
    contenedor.innerHTML = String(htmlPagina(await cargarDatos()));
    quitar = delegar(contenedor, {
      /** Saltos dentro de la página sin tocar el hash (que es la ruta). */
      saltar(el) {
        const destino = document.getElementById(el.dataset.id);
        if (!destino) return;
        destino.scrollIntoView({ behavior: movimientoReducido() ? 'auto' : 'smooth', block: 'start' });
        destino.focus({ preventScroll: true });
      },
      reintentar: () => anfitrion.ir('/acerca'),
    });
  }

  return {
    rutas: ['/acerca'],
    montar,
    desmontar() {
      quitar();
      quitar = () => {};
    },
    insignias: () => ({}),
    control() {},
    destruir() {
      quitar();
    },
  };
}
