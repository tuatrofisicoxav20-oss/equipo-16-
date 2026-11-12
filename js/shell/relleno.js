/**
 * Vistas de relleno para desarrollar y probar el cascarón sin las vistas reales.
 *
 * Cumplen el contrato anfitrión ↔ huésped (docs/UNIFICACION.md) con TODAS las rutas del
 * perfil, pero sus pantallas solo dicen qué irá ahí y dejan probar el anfitrión: navegar,
 * abrir diálogos, contadores de la navegación, la cola de pendientes y los mensajes de
 * control. Se usan con ?cascaron=relleno (o ?cascaron=1 mientras la vista real no exporte
 * crearVista…) y en docs/demo-cascaron.html. No forman parte de la app que ve el público.
 */
import { delegar, html } from '../ui/dom.js';
import { NAV, RUTAS } from './rutas.js';
import { encabezadoPagina, ic, insignia, tarjeta } from './componentes.js';

/** Qué mostrará cada pantalla en la app unificada (resumen del mapa de pantallas). */
const QUE_IRA = {
  '/inicio': 'El saludo de Tecu con lo que toca hoy, la ruta personalizada, «Comprueba lo aprendido», el mensaje de tu maestra y la semana.',
  '/aprender': 'La lección de la ruta en cuatro formatos (paso a paso, balanza, ejemplo cotidiano, escuchar) y sus actividades.',
  '/diagnostico': 'Las preguntas rápidas y las ecuaciones renglón por renglón con el cuaderno.',
  '/tutor': 'El ejercicio en curso con Tecu: pistas en escalera, otra forma de explicarlo y dudas escritas.',
  '/comprobar': 'La comprobación sin ayuda: Tecu dormido, sin pistas ni chat.',
  '/progreso': 'El dominio por habilidad, la racha, las pistas usadas y los tipos de error.',
  '/descargas': 'El paquete descargado con su peso real y lo que guarda el modo sin internet.',
  '/grupo': 'Los indicadores del grupo, lo que más se repite y el mapa de aprendizaje en vivo.',
  '/alertas': 'Las sugerencias automáticas por revisar, revisadas y descartadas.',
  '/alumnos': 'La lista del grupo y el detalle de cada estudiante con su procedimiento.',
  '/planeacion': 'Los contenidos a reforzar, las agrupaciones y los cuadernillos.',
  '/datos': 'Qué se ve con y sin internet, la privacidad y el estado de la sincronización.',
};

/**
 * Vista de relleno de un perfil.
 * @param {{ perfil: 'estudiante'|'docente', anfitrion: object }} opciones
 */
export function crearVistaRelleno({ perfil, anfitrion }) {
  const rutas = Object.keys(RUTAS[perfil]);
  /** Contador de ejemplo de la navegación (el docente empieza con 4 alertas, como en el prototipo). */
  let avisos = perfil === 'docente' ? 4 : 0;
  let sembrado = null;
  let quitar = () => {};
  const idNav = perfil === 'docente' ? 'alertas' : 'tutor';

  function htmlPantalla(ruta, params) {
    const info = RUTAS[perfil][ruta];
    const store = anfitrion.store;
    const pendientes = store ? store.pendientes().length : 0;
    return html`${encabezadoPagina({
        antetitulo: 'Vista de relleno',
        titulo: info.titulo,
        entrada: QUE_IRA[ruta] || '',
        volver: params.id ? { href: `#${ruta}`, texto: 'Volver a la lista' } : null,
      })}
      ${params.id ? html`<p>${insignia(`Parámetro de la ruta: ${params.id}`, 'info', 'user')}</p>` : ''}
      ${sembrado ? html`<p>${insignia(`Datos de ejemplo sembrados hasta: ${sembrado}`, 'ok', 'check')}</p>` : ''}
      <div class="grid grid--2">
        ${tarjeta({
          id: 'relleno-nav',
          titulo: 'Ir a otra pantalla',
          icono: 'route',
          cuerpo: html`<ul class="feature-list">
            ${rutas.map(
              (r) => html`<li><a class="feature-link" href="#${r}">${ic('right', 16)}<span>${RUTAS[perfil][r].titulo}</span></a></li>`,
            )}
            ${perfil === 'docente'
              ? html`<li><a class="feature-link" href="#/alumnos/ana">${ic('right', 16)}<span>Seguimiento de Ana (ruta con parámetro)</span></a></li>`
              : ''}
            <li><a class="feature-link" href="#/no-existe">${ic('right', 16)}<span>Una dirección que no existe</span></a></li>
          </ul>`,
        })}
        ${tarjeta({
          id: 'relleno-anfitrion',
          titulo: 'Probar el anfitrión',
          icono: 'compass',
          cuerpo: html`<div class="cluster">
              <button type="button" class="btn btn--secondary" data-act="accesibilidad">${ic('access', 18)}Abrir accesibilidad</button>
              <button type="button" class="btn btn--secondary" data-act="conexion">${ic('wifi', 18)}Abrir conexión</button>
              <button type="button" class="btn btn--secondary" data-act="contador">${ic('plus', 18)}Sumar un aviso a «${NAV[perfil].find((n) => n.id === idNav).texto}»</button>
              <button type="button" class="btn btn--secondary" data-act="titulo">${ic('pen', 18)}Cambiar el título de la pestaña</button>
              ${store
                ? html`<button type="button" class="btn btn--primary" data-act="registrar">${ic('check', 18)}Registrar una actividad de prueba</button>`
                : ''}
            </div>
            ${store
              ? html`<p class="muted" data-pendientes>${pendientes === 1 ? '1 actividad pendiente' : `${pendientes} actividades pendientes`} de sincronizar en este dispositivo.</p>`
              : ''}`,
        })}
      </div>`;
  }

  return {
    rutas,
    montar(ruta, params, contenedor) {
      contenedor.innerHTML = String(htmlPantalla(ruta, params));
      const quitarClics = delegar(contenedor, {
        accesibilidad: () => anfitrion.abrirAccesibilidad(),
        conexion: () => anfitrion.abrirConexion(),
        contador() {
          avisos += 1;
          anfitrion.actualizar();
        },
        titulo: () => anfitrion.titulo(`${RUTAS[perfil][ruta].titulo} (título puesto por la vista)`),
        registrar() {
          anfitrion.store.registrar({
            tipo: 'practica',
            ejercicio: '2x + 3 = 11',
            renglones: ['2x = 8', 'x = 4'],
            resultado: 'correcto',
          });
        },
      });
      const quitarStore = anfitrion.store?.suscribir(() => {
        const p = contenedor.querySelector('[data-pendientes]');
        const n = anfitrion.store.pendientes().length;
        if (p) p.textContent = `${n === 1 ? '1 actividad pendiente' : `${n} actividades pendientes`} de sincronizar en este dispositivo.`;
      });
      quitar = () => {
        quitarClics();
        quitarStore?.();
      };
    },
    desmontar() {
      quitar();
      quitar = () => {};
    },
    insignias: () => ({ [idNav]: avisos }),
    /** Mensajes de control del modo presentación y del cascarón (lo mínimo para probarlos). */
    control(mensaje) {
      switch (mensaje?.cmd) {
        case 'sembrar':
          sembrado = String(mensaje.hasta || 'ruta');
          break;
        case 'simularRed':
          anfitrion.red.simular(Boolean(mensaje.sinInternet));
          break;
        case 'irA':
          anfitrion.ir(`/${String(mensaje.pantalla || '').replace(/^\//, '')}`);
          break;
        default:
          break;
      }
    },
    destruir() {
      quitar();
    },
  };
}

/** Con la forma de crearVistaEstudiante / crearVistaDocente, para pasarlas a montarCascaron. */
export const crearVistaEstudianteRelleno = ({ anfitrion }) => crearVistaRelleno({ perfil: 'estudiante', anfitrion });
export const crearVistaDocenteRelleno = ({ anfitrion }) => crearVistaRelleno({ perfil: 'docente', anfitrion });
