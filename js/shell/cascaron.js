/**
 * Cascarón: la página alrededor de cada pantalla, con el marcado del prototipo de interfaz.
 *
 *   encabezado (marca con Tecu, estado de conexión, «Leer página», accesibilidad)
 *   barra «Demostración» (vista, perfil, estudiante, conexión, recorrido, acerca, reiniciar)
 *   navegación por perfil (pestañas abajo en el celular, barra lateral en escritorio)
 *   <main id="contenido" tabindex="-1">  ← aquí dibuja la vista
 *   pie
 *
 * Es dueño del enrutador por hash, del diálogo de accesibilidad, del panel de conexión,
 * del recorrido guiado, del reinicio y del control «Vista». Las vistas solo dibujan su
 * pantalla dentro de <main> (contrato anfitrión ↔ huésped de docs/UNIFICACION.md):
 *
 *   montarCascaron(raiz, { perfil, alumno, embebido, compacto, crearVista }) → { anfitrion, vista(), destruir() }
 *
 *   crearVista({ alumno, embebido, anfitrion })   // estudiante
 *   crearVista({ compacto, anfitrion })            // docente
 *     → Vista = { rutas, montar(ruta, params, contenedor), desmontar(), insignias(), control(mensaje), destruir() }
 *       opcional: describirPendiente(evento) → { tipo, detalle } para la cola del panel de conexión
 *
 *   anfitrion = { ir(ruta), rutaActual(), actualizar(), titulo(texto), abrirAccesibilidad(),
 *     abrirConexion(), red, store,
 *     // además del contrato:
 *     abrirRecorrido(), urlPara({ perfil, alumno, ruta }), perfil, alumno, embebido, compacto }
 *
 * El cascarón NO importa las vistas (ellas pueden importarlo para montarEstudiante /
 * montarDocente): recibe `crearVista` como parámetro. «Acerca» (#/acerca) la monta él.
 *
 * Mensajes de control (postMessage del mismo origen, { tecu: 'control', cmd, … }): los
 * escucha el cascarón y se los pasa a vista.control(mensaje). Las vistas no deben
 * escuchar `message` por su cuenta (se ejecutaría dos veces); los { tecu: 'estado' } los
 * sigue mandando la vista.
 */
import { anunciar, attr, aviso, confirmar, delegar, html, renderConFoco } from '../ui/dom.js';
import { MARCA } from '../marca.js';
import { crearRed } from '../services/red.js';
import { crearStore, reiniciarTodo } from '../data/store.js';
import { alCambiarPreferencias, guardarPreferencias, leerPreferencias } from '../services/preferencias.js';
import {
  INICIO,
  NAV,
  PERFILES,
  RUTA_ACERCA,
  clasificarRuta,
  leerHash,
  leerIdentidad,
  limpiarAlumno,
  textoInsignia,
  urlDe,
} from './rutas.js';
import { encabezadoPagina, estadoVacio, ic, interruptor, segmentado, tecuCara } from './componentes.js';
import { cerrarDialogo } from './dialogo.js';
import { abrirAccesibilidad, abrirConexion, abrirRecorrido, infoRed } from './paneles.js';
import {
  EN_MARCO,
  TEXTO_VISTA,
  ajustarEscritorio,
  alCambiarPantalla,
  aplicarViewport,
  controlVista,
  htmlEscenario,
  htmlIntroEscenario,
  modoDeVista,
  nombreEscenario,
  tituloEscenario,
} from './dispositivo.js';
import { conectarVoz, voz } from './voz.js';

/** sessionStorage: ¿la barra de demostración quedó abierta? (se conserva al cambiar de perfil) */
const CLAVE_DEMO = 'tecu:ui:demo';
/** sessionStorage: lo que falta hacer después de recargar (sembrar, avisar, devolver el foco). */
const CLAVE_PENDIENTE = 'tecu:ui:pendiente';

/** Estudiantes de ejemplo de la barra de demostración. */
const ALUMNOS_EJEMPLO = [
  { valor: 'ana', texto: 'Ana', detalle: 'se le van los signos al pasar términos' },
  { valor: 'luis', texto: 'Luis', detalle: 'resta en lugar de dividir' },
  { valor: 'invitado', texto: 'Invitado', detalle: 'empieza de cero' },
];
/** Quiénes tienen guion para sembrar datos de ejemplo (js/data/guiones.js). */
const CON_GUION = ['ana', 'luis'];

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/* ------------------------------------------------------------------ */
/* Memoria de la pestaña (sessionStorage)                              */
/* ------------------------------------------------------------------ */

function leerSesion(clave) {
  try {
    const valor = window.sessionStorage.getItem(clave);
    return valor == null ? null : JSON.parse(valor);
  } catch {
    return null;
  }
}

function guardarSesion(clave, valor) {
  try {
    if (valor === null) window.sessionStorage.removeItem(clave);
    else window.sessionStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento de sesión: solo se pierde la comodidad */
  }
}

const anchoParaDemo = () => {
  try {
    return window.matchMedia('(min-width: 48em)').matches;
  } catch {
    return false;
  }
};

/** Lleva el foco a un elemento (o selector) aunque no sea enfocable de por sí. */
function enfocar(destino, { desplazar = false } = {}) {
  const el = typeof destino === 'string' ? document.querySelector(destino) : destino;
  if (!el) return false;
  if (!el.matches('a[href], button, input, select, textarea, [tabindex]')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: !desplazar });
  return document.activeElement === el;
}

/* ------------------------------------------------------------------ */
/* Cascarón                                                            */
/* ------------------------------------------------------------------ */

/**
 * Monta el cascarón en `raiz` y, dentro, la vista del perfil.
 * Se resuelve cuando la primera pantalla ya está dibujada.
 * @param {HTMLElement} raiz normalmente #app
 * @param {{ perfil?: 'estudiante'|'docente', alumno?: string, embebido?: boolean, compacto?: boolean,
 *   crearVista: (opciones: object) => Promise<object>|object }} opciones
 */
export async function montarCascaron(raiz, { perfil = 'estudiante', alumno = 'invitado', embebido = false, compacto = false, crearVista } = {}) {
  const yo = PERFILES.includes(perfil) ? perfil : 'estudiante';
  const quien = limpiarAlumno(alumno);
  /** Dentro del modo presentación no hay barra de demostración ni pie. */
  const sinDemo = Boolean(embebido || compacto);
  const identidad = `${yo}:${yo === 'estudiante' ? quien : ''}`;

  const red = crearRed(yo === 'docente' ? 'docente' : quien);
  const store = yo === 'estudiante' ? crearStore(quien) : null;

  const leerRed = () => ({ enLinea: Boolean(red.enLinea()), real: Boolean(red.real()), simulada: Boolean(red.simuladaSinInternet()) });
  const contarEnStore = () => {
    try {
      return store ? store.pendientes().length : 0;
    } catch {
      return 0;
    }
  };

  const demoGuardada = leerSesion(CLAVE_DEMO);
  const estado = {
    prefs: leerPreferencias(),
    red: leerRed(),
    /** Lo que muestra la cola del estudiante (js/ui/cola.js): { pendientes, sincronizando, … }. */
    cola: { pendientes: contarEnStore(), sincronizando: false },
    /** Pantalla actual: { ruta, params, ancla, clase } */
    ruta: null,
    /** 'app' | 'phone' | 'desktop' | null (todavía sin dibujar) */
    modo: null,
    demoAbierta: typeof demoGuardada === 'boolean' ? demoGuardada : anchoParaDemo(),
    vista: null,
    errorVista: null,
  };

  /** Partes fijas de la página en modo app: { encabezado, demo, nav, main, pie }. */
  let regiones = null;
  const pintado = { chip: '', leer: '', demo: '', nav: '' };
  /** Lo montado en <main>: { desmontar() }. */
  let pantalla = null;
  let vistaAcerca = null;
  let creandoVista = null;
  const controlEnEspera = [];
  let colaOculta = null;
  let mensajes = null;
  let observadorEscenario = null;
  const limpieza = [];
  let destruido = false;

  /* ---------------- Datos derivados ---------------- */

  const enSalida = () => {
    try {
      return mensajes ? mensajes.enCola().length : 0;
    } catch {
      return 0;
    }
  };
  /** Pendientes de sincronizar: actividades del estudiante o mensajes del docente. */
  const pendientes = () => (store ? Number(estado.cola.pendientes) || 0 : enSalida());

  const urlPara = ({ perfil: p, alumno: a, ruta } = {}) =>
    urlDe({ consulta: location.search, camino: location.pathname, perfil: p, alumno: a, ruta });

  /* ---------------- Encabezado ---------------- */

  function htmlChip() {
    const info = infoRed(estado.red);
    const n = pendientes();
    const subiendo = Boolean(estado.cola.sincronizando) && estado.red.enLinea;
    return {
      clase: `chip chip--${info.tono}`,
      interior: String(html`${ic(subiendo ? 'sync' : info.icono, 18)}<span>${subiendo ? 'Sincronizando…' : info.texto}</span>${n
          ? html`<b class="chip__n">${n}<span class="chip__palabra"> ${n === 1 ? 'pendiente' : 'pendientes'}</span></b>`
          : ''}<span class="sr-only">${info.simulado ? ' (simulado)' : ''}. Abrir conexión y datos</span>`),
    };
  }

  function htmlLeer() {
    const hablando = voz.hablando();
    return {
      presionado: hablando,
      interior: String(html`${ic(hablando ? 'stop' : 'volume', 20)}<span class="hide-sm">${hablando ? 'Detener lectura' : 'Leer página'}</span
        ><span class="sr-only show-sm">${hablando ? 'Detener lectura' : 'Leer página en voz alta'}</span>`),
    };
  }

  /** Arma el encabezado una vez; después solo se actualizan el chip y «Leer página» en su lugar. */
  function construirEncabezado() {
    regiones.encabezado.innerHTML = String(html`<a class="brand" href="#${INICIO[yo]}">
        <span class="brand__mark">${tecuCara(30)}</span>
        <span class="brand__text">${MARCA.nombre}<span class="brand__sub">${yo === 'docente' ? 'Módulo docente' : 'Módulo del estudiante'}</span></span>
      </a>
      <div class="topbar__actions">
        <button type="button" data-act="conexion" data-foco="conexion" aria-haspopup="dialog"></button>
        <button type="button" class="btn btn--ghost-inverse btn--icon-label" data-act="leer" data-foco="leer" hidden></button>
        <button type="button" class="btn btn--ghost-inverse btn--icon-label" data-act="accesibilidad" data-foco="accesibilidad" aria-haspopup="dialog">
          ${ic('access', 20)}<span class="hide-sm">Accesibilidad</span><span class="sr-only show-sm">Accesibilidad</span>
        </button>
      </div>`);
    pintado.chip = '';
    pintado.leer = '';
    pintarEncabezado();
  }

  function pintarEncabezado() {
    if (!regiones) return;
    const chip = regiones.encabezado.querySelector('[data-act="conexion"]');
    const leer = regiones.encabezado.querySelector('[data-act="leer"]');
    if (!chip || !leer) return;
    const c = htmlChip();
    if (pintado.chip !== c.clase + c.interior) {
      pintado.chip = c.clase + c.interior;
      chip.className = c.clase;
      chip.innerHTML = c.interior;
    }
    const conVoz = Boolean(estado.prefs.voz) && voz.soportada();
    const l = htmlLeer();
    const firma = `${conVoz}|${l.presionado}`;
    if (pintado.leer !== firma) {
      pintado.leer = firma;
      const teniaFoco = document.activeElement === leer;
      leer.hidden = !conVoz;
      leer.setAttribute('aria-pressed', l.presionado ? 'true' : 'false');
      leer.innerHTML = l.interior;
      if (teniaFoco && !conVoz) enfocar(regiones.encabezado.querySelector('[data-act="accesibilidad"]'));
    }
  }

  /* ---------------- Barra «Demostración» ---------------- */

  function opcionesAlumno() {
    const lista = ALUMNOS_EJEMPLO.map(({ valor, texto }) => ({ valor, texto }));
    if (!lista.some((o) => o.valor === quien)) lista.push({ valor: quien, texto: quien });
    return lista;
  }

  function descripcionAlumno() {
    const ejemplo = ALUMNOS_EJEMPLO.find((a) => a.valor === quien);
    return ejemplo ? `${ejemplo.texto}: ${ejemplo.detalle}.` : `«${quien}»: estudiante de este dispositivo.`;
  }

  function htmlDemo() {
    const p = estado.prefs;
    return html`<details class="demo"${attr('open', estado.demoAbierta)}>
      <summary class="demo__summary">
        ${ic('compass', 18)}<span>Demostración</span><span class="demo__hint">Cambia la vista, el perfil, el estudiante o la conexión</span>${ic('down', 18)}
      </summary>
      <div class="demo__body">
        <span class="sr-only" id="demo-cambia">Al elegir una opción, la página cambia de inmediato.</span>
        ${controlVista(p.dispositivo, 'demo-cambia')}
        ${segmentado({
          nombre: 'demo-perfil',
          leyenda: 'Perfil',
          cambio: 'perfil',
          valor: yo,
          descritoPor: 'demo-cambia',
          opciones: [
            { valor: 'estudiante', texto: 'Estudiante', icono: 'user' },
            { valor: 'docente', texto: 'Docente', icono: 'users' },
          ],
        })}
        ${yo === 'estudiante'
          ? html`<div class="demo__alumno">
              ${segmentado({
                nombre: 'demo-alumno',
                leyenda: 'Estudiante de ejemplo',
                cambio: 'alumno',
                valor: quien,
                descritoPor: 'demo-alumno-h demo-cambia',
                opciones: opcionesAlumno(),
              })}
              <p class="field__hint" id="demo-alumno-h">${descripcionAlumno()}</p>
            </div>`
          : ''}
        ${interruptor({ id: 'demo-sin-internet', etiqueta: 'Simular sin internet', marcado: estado.red.simulada, cambio: 'sin-internet' })}
        <div class="cluster cluster--tight">
          ${yo === 'estudiante' && CON_GUION.includes(quien)
            ? html`<button type="button" class="btn btn--secondary btn--sm" data-act="sembrar" data-foco="sembrar">${ic('spark', 16)}Ver con datos de ejemplo</button>`
            : ''}
          <button type="button" class="btn btn--secondary btn--sm" data-act="recorrido" data-foco="recorrido" aria-haspopup="dialog">
            ${ic('route', 16)}Recorrido guiado
          </button>
          <a class="btn btn--ghost btn--sm" href="#${RUTA_ACERCA}">${ic('info', 16)}Acerca del proyecto</a>
          <a class="btn btn--ghost btn--sm" href="${location.pathname}?vista=pitch"${attr('target', EN_MARCO, '_top')}>${ic('proyector', 16)}Modo presentación</a>
          <button type="button" class="btn btn--ghost btn--sm" data-act="reiniciar" data-foco="reiniciar" aria-haspopup="dialog">${ic('reset', 16)}Reiniciar</button>
        </div>
      </div>
    </details>`;
  }

  function pintarDemo() {
    if (!regiones?.demo) return;
    const nuevo = String(htmlDemo());
    if (nuevo === pintado.demo) return;
    pintado.demo = nuevo;
    renderConFoco(regiones.demo, nuevo);
  }

  /* ---------------- Navegación y pie ---------------- */

  function leerInsignias() {
    const salida = {};
    try {
      const crudas = estado.vista?.insignias?.() || {};
      for (const [id, valor] of Object.entries(crudas)) {
        const n = Math.max(0, Math.floor(Number(valor && typeof valor === 'object' ? valor.n : valor) || 0));
        if (n) salida[id] = { n, texto: valor && typeof valor === 'object' && valor.texto ? String(valor.texto) : textoInsignia(id, n) };
      }
    } catch (error) {
      console.error('[tecu]', error);
    }
    return salida;
  }

  function htmlNav() {
    const actual = estado.ruta?.clase?.nav || null;
    const insignias = leerInsignias();
    return html`<ul class="nav__list">
      ${NAV[yo].map((it) => {
        const insignia = insignias[it.id];
        return html`<li>
          <a class="nav__link" href="#${it.ruta}"${attr('aria-current', actual === it.id, 'page')}>
            <span class="nav__icon">${ic(it.icono, 24)}${insignia ? html`<span class="nav__badge" aria-hidden="true">${insignia.n > 99 ? '99+' : insignia.n}</span>` : ''}</span>
            <span class="nav__label">${it.texto}${insignia ? html`<span class="sr-only"> (${insignia.texto})</span>` : ''}</span>
          </a>
        </li>`;
      })}
    </ul>`;
  }

  function pintarNav() {
    if (!regiones) return;
    const nuevo = String(htmlNav());
    if (nuevo === pintado.nav) return;
    pintado.nav = nuevo;
    renderConFoco(regiones.nav, nuevo);
  }

  function pintarPie() {
    if (!regiones?.pie) return;
    regiones.pie.innerHTML = String(html`<p>${MARCA.nombre} · prototipo del ${MARCA.equipo} · Veracruz Tech Week, Reto 5</p>
      <ul class="footer__links">
        <li><a class="link" href="#${RUTA_ACERCA}">Acerca del proyecto</a></li>
        <li><button type="button" class="link-btn" data-act="accesibilidad" data-foco="pie-accesibilidad" aria-haspopup="dialog">Ajustes de accesibilidad</button></li>
        <li><button type="button" class="link-btn" data-act="recorrido" data-foco="pie-recorrido" aria-haspopup="dialog">Recorrido guiado</button></li>
      </ul>`);
  }

  /** Redibuja lo que cambió del encabezado, la barra de demostración y la navegación. */
  function actualizar() {
    pintarEncabezado();
    pintarDemo();
    pintarNav();
  }

  /* ---------------- Diálogos y acciones ---------------- */

  const oyentesEstado = new Set();
  const avisarEstado = () => oyentesEstado.forEach((fn) => fn());

  async function sincronizarAhora() {
    if (!red.enLinea()) return 0;
    try {
      if (store) return Number(await store.sincronizar()) || 0;
      if (mensajes) return Number(mensajes.vaciarCola()) || 0;
    } catch (error) {
      console.error('[tecu]', error);
    }
    return 0;
  }

  const contexto = {
    perfil: yo,
    alumno: quien,
    red,
    store,
    vista: () => estado.vista,
    leerRed: () => estado.red,
    pendientes,
    sincronizarAhora,
    /** Avisa cuando cambian la conexión o los pendientes (para el panel abierto). */
    alCambiarEstado(fn) {
      oyentesEstado.add(fn);
      return () => oyentesEstado.delete(fn);
    },
    irAPaso,
  };

  const abrirPanelAccesibilidad = () => abrirAccesibilidad();
  const abrirPanelConexion = () => abrirConexion(contexto);
  const abrirPanelRecorrido = () => abrirRecorrido(contexto);

  function leerPagina() {
    if (voz.hablando()) voz.detener();
    else if (!voz.leer(document.getElementById('contenido')?.innerText || '')) aviso('Tu navegador no permite la lectura en voz alta.', { tipo: 'alerta' });
  }

  /** Lo que el cascarón debe hacer después de recargar (cambio de perfil, de estudiante o reinicio). */
  const dejarPendiente = (pendiente, para = identidad) => guardarSesion(CLAVE_PENDIENTE, { ...pendiente, para });

  async function reiniciar() {
    const ok = await confirmar({
      titulo: '¿Reiniciar la demostración?',
      mensaje: 'Se borrarán las respuestas, mensajes y cambios guardados en este navegador. Tus ajustes de accesibilidad se conservan.',
      aceptar: 'Reiniciar',
      cancelar: 'Cancelar',
      peligro: true,
    });
    if (!ok) return;
    reiniciarTodo();
    dejarPendiente({ aviso: 'Demostración reiniciada.', tipo: 'exito' });
    history.replaceState(null, '', urlPara({ ruta: INICIO[yo] }));
    location.reload();
  }

  /** Entrega un mensaje de control a la vista (o lo guarda hasta que exista). */
  async function entregarControl(mensaje) {
    if (!estado.vista) {
      controlEnEspera.push(mensaje);
      return;
    }
    try {
      await estado.vista.control?.(mensaje);
    } catch (error) {
      console.error('[tecu] La vista no pudo atender el mensaje de control', error);
    }
  }

  /** «Ver con datos de ejemplo»: la vista crea eventos reales con el motor y el guion. */
  async function sembrar(hasta = 'ruta') {
    await entregarControl({ tecu: 'control', cmd: 'sembrar', hasta });
    actualizar();
    await navegar({ silencio: true });
    const ejemplo = ALUMNOS_EJEMPLO.find((a) => a.valor === quien);
    aviso(`Datos de ejemplo de ${ejemplo ? ejemplo.texto : quien} listos.`, { tipo: 'exito' });
  }

  /**
   * Un paso del recorrido: pone la conexión, cambia de perfil o estudiante (recargando, porque
   * la identidad va en la URL), siembra datos si el paso lo pide y abre la pantalla.
   */
  async function irAPaso(paso, i, total) {
    const destinoPerfil = paso.perfil;
    const destinoAlumno = destinoPerfil === 'estudiante' ? paso.alumno || quien : quien;
    const texto = `Recorrido, paso ${i + 1} de ${total}: ${paso.titulo}.`;
    const mismaIdentidad = destinoPerfil === yo && (yo === 'docente' || destinoAlumno === quien);
    if (mismaIdentidad) {
      red.simular(Boolean(paso.sinInternet));
      if (paso.sembrar) await entregarControl({ tecu: 'control', cmd: 'sembrar', hasta: paso.sembrar });
      actualizar();
      if (location.hash === `#${paso.ruta}`) await navegar();
      else location.hash = paso.ruta;
      aviso(texto, { duracion: 4000 });
      return;
    }
    // Otro perfil u otro estudiante: su conexión se deja lista antes de ir.
    crearRed(destinoPerfil === 'docente' ? 'docente' : destinoAlumno).simular(Boolean(paso.sinInternet));
    dejarPendiente({ sembrar: paso.sembrar || null, aviso: texto }, `${destinoPerfil}:${destinoPerfil === 'estudiante' ? destinoAlumno : ''}`);
    location.assign(urlPara({ perfil: destinoPerfil, alumno: destinoAlumno, ruta: paso.ruta }));
  }

  const acciones = {
    conexion: abrirPanelConexion,
    accesibilidad: abrirPanelAccesibilidad,
    recorrido: abrirPanelRecorrido,
    leer: leerPagina,
    reiniciar,
    sembrar: () => sembrar('ruta'),
  };

  /** Cambios de los controles de la barra de demostración y del escenario. */
  function alCambiarControl(evento) {
    const el = evento.target.closest?.('[data-cambio]');
    if (!el) return;
    switch (el.dataset.cambio) {
      case 'dispositivo':
        estado.demoAbierta = true; // el control sigue a la vista después de cambiar
        guardarSesion(CLAVE_DEMO, true);
        guardarPreferencias({ dispositivo: el.value });
        break;
      case 'perfil':
        if (el.value === yo) break;
        dejarPendiente({ foco: el.id }, `${el.value}:${el.value === 'estudiante' ? quien : ''}`);
        location.assign(urlPara({ perfil: el.value, ruta: INICIO[el.value] || INICIO.estudiante }));
        break;
      case 'alumno': {
        const otro = limpiarAlumno(el.value);
        if (otro === quien) break;
        const ejemplo = ALUMNOS_EJEMPLO.find((a) => a.valor === otro);
        dejarPendiente({ foco: el.id, anuncio: `Ahora ves la cuenta de ${ejemplo ? ejemplo.texto : otro}.` }, `estudiante:${otro}`);
        location.assign(urlPara({ alumno: otro, ruta: location.hash.startsWith('#/') ? location.hash : INICIO.estudiante }));
        break;
      }
      case 'sin-internet':
        red.simular(el.checked);
        break;
      default:
        break;
    }
  }

  /* ---------------- Pantallas del cascarón ---------------- */

  function pantallaCargando() {
    regiones.main.innerHTML = '<p class="cargando" role="status">Abriendo…</p>';
  }

  function pantalla404() {
    regiones.main.innerHTML = String(html`${encabezadoPagina({ titulo: 'No encontramos esta página' })}
    ${estadoVacio({
      titulo: 'La dirección no existe o cambió',
      texto: 'Puedes volver al inicio o usar el menú de navegación.',
      accion: html`<a class="btn btn--primary" href="#${INICIO[yo]}">${ic('home', 18)}Ir al inicio</a>`,
    })}`);
  }

  function pantallaPendiente(titulo) {
    regiones.main.innerHTML = String(html`${encabezadoPagina({ titulo })}
    ${estadoVacio({
      titulo: 'Esta pantalla todavía no está lista',
      texto: 'Estamos terminando de unir esta parte de la app. Mientras tanto puedes usar las demás desde el menú.',
      accion: html`<a class="btn btn--primary" href="#${INICIO[yo]}">${ic('home', 18)}Ir al inicio</a>`,
    })}`);
  }

  function pantallaError(mensaje) {
    regiones.main.innerHTML = String(html`${encabezadoPagina({ titulo: 'Algo salió mal' })}
      <div class="note note--warn" role="alert">
        ${ic('alert', 20)}
        <div>
          <p>${mensaje}</p>
        </div>
      </div>
      <p class="cluster">
        <button type="button" class="btn btn--primary" data-reintentar>${ic('reset', 18)}Volver a intentar</button>
        <a class="btn btn--secondary" href="#${INICIO[yo]}">${ic('home', 18)}Ir al inicio</a>
      </p>`);
    regiones.main.querySelector('[data-reintentar]')?.addEventListener('click', () => location.reload());
  }

  async function montarAcerca(contenedor) {
    if (!vistaAcerca) {
      const { crearVistaAcerca } = await import('../views/acerca.js');
      vistaAcerca = await crearVistaAcerca({ anfitrion, perfil: yo });
    }
    await vistaAcerca.montar(RUTA_ACERCA, {}, contenedor);
    return { desmontar: () => vistaAcerca.desmontar() };
  }

  function desmontarPantalla() {
    const anterior = pantalla;
    pantalla = null;
    if (!anterior) return;
    try {
      anterior.desmontar?.();
    } catch (error) {
      console.error('[tecu]', error);
    }
  }

  /* ---------------- Enrutador ---------------- */

  let turno = 0;
  let fila = Promise.resolve();
  /** Título que la vista pidió con anfitrion.titulo() mientras se montaba. */
  let tituloPedido = null;
  let montando = false;

  /**
   * Muestra la pantalla del hash actual. Las navegaciones van en fila: si llegan varias
   * mientras una vista termina de montar, solo se dibuja la última.
   * @param {{ primera?: boolean, silencio?: boolean }} [opciones] primera/silencio: no mueve el foco ni anuncia
   */
  function navegar(opciones = {}) {
    const mio = ++turno;
    fila = fila
      .then(() => (mio === turno && estado.modo === 'app' && !destruido ? mostrarRuta(opciones) : null))
      .catch((error) => console.error('[tecu]', error));
    return fila;
  }

  function ponerTitulo(texto) {
    document.title = `${texto} · ${MARCA.nombre}`;
  }

  async function mostrarRuta({ primera = false, silencio = false } = {}) {
    const leida = leerHash(location.hash) || { ruta: INICIO[yo], params: {}, ancla: '' };
    const clase = clasificarRuta(yo, leida.ruta);
    const laAtiende = Boolean(estado.vista?.rutas.includes(leida.ruta));

    // Pantalla del otro perfil: la identidad va en la URL, así que se cambia de módulo.
    if (clase.tipo === 'ajena' && !laAtiende) {
      location.replace(urlPara({ perfil: clase.perfil, ruta: location.hash }));
      return;
    }

    voz.detener();
    cerrarDialogo();
    desmontarPantalla();
    const main = regiones.main;
    main.innerHTML = '';
    estado.ruta = { ...leida, clase };
    tituloPedido = null;
    let titulo = clase.titulo;

    montando = true;
    try {
      if (leida.ruta === RUTA_ACERCA) {
        pantalla = await montarAcerca(main);
      } else if (laAtiende) {
        const vista = estado.vista;
        pantalla = { desmontar: () => vista.desmontar?.() };
        await vista.montar(leida.ruta, leida.params, main);
      } else if (!estado.vista) {
        titulo = 'Algo salió mal';
        pantallaError(
          yo === 'docente'
            ? 'No se pudo abrir el panel. Revisa tu conexión y vuelve a intentarlo.'
            : `No pude abrir tus lecciones. ${MARCA.nombre} necesita abrirse una vez con internet para guardarlas en este dispositivo.`,
        );
      } else if (clase.tipo === 'propia') {
        pantallaPendiente(clase.titulo);
      } else {
        pantalla404();
      }
    } catch (error) {
      console.error('[tecu] No se pudo mostrar la pantalla', leida.ruta, error);
      desmontarPantalla();
      titulo = 'Algo salió mal';
      pantallaError('No se pudo mostrar esta pantalla. Vuelve a intentarlo o regresa al inicio.');
    } finally {
      montando = false;
    }

    titulo = tituloPedido || titulo || main.querySelector('h1')?.textContent?.trim() || MARCA.nombre;
    ponerTitulo(titulo);
    pintarNav();
    pintarEncabezado();
    avisarAlMarcoPadre();

    if (leida.ancla) {
      const destino = document.getElementById(leida.ancla);
      if (destino && main.contains(destino)) {
        enfocar(destino);
        destino.scrollIntoView({ block: 'start' });
        return;
      }
    }
    if (primera || silencio) return;
    window.scrollTo(0, 0);
    if (!enfocar(main.querySelector('#page-title') || main.querySelector('h1'))) enfocar(main);
    anunciar(titulo);
  }

  /* ---------------- Anfitrión (lo que usan las vistas) ---------------- */

  const anfitrion = {
    /** Navega a una pantalla: '/tutor', '/alumnos/ana'. Si ya está ahí, la vuelve a dibujar. */
    ir(ruta) {
      const destino = `#${String(ruta || INICIO[yo]).replace(/^#/, '')}`;
      if (location.hash === destino) navegar();
      else location.hash = destino;
    },
    rutaActual: () => ({ ruta: estado.ruta?.ruta ?? null, params: { ...(estado.ruta?.params || {}) } }),
    actualizar,
    /** Título de la pestaña del navegador y anuncio para el lector de pantalla. */
    titulo(texto) {
      const limpio = String(texto ?? '').trim();
      if (!limpio) return;
      if (montando) {
        tituloPedido = limpio; // el enrutador lo pone (y lo anuncia) al terminar de montar
        return;
      }
      ponerTitulo(limpio);
      anunciar(limpio);
    },
    abrirAccesibilidad: abrirPanelAccesibilidad,
    abrirConexion: abrirPanelConexion,
    abrirRecorrido: abrirPanelRecorrido,
    red,
    store,
    urlPara,
    perfil: yo,
    alumno: quien,
    embebido: Boolean(embebido),
    compacto: Boolean(compacto),
  };

  /* ---------------- Vista ---------------- */

  function asegurarVista() {
    if (!creandoVista) {
      creandoVista = (async () => {
        try {
          if (typeof crearVista !== 'function') throw new Error('montarCascaron necesita crearVista');
          const opciones = yo === 'docente' ? { compacto: Boolean(compacto), anfitrion } : { alumno: quien, embebido: Boolean(embebido), anfitrion };
          const vista = await crearVista(opciones);
          if (!vista || typeof vista.montar !== 'function') throw new Error('La vista no cumple el contrato (falta montar)');
          if (!Array.isArray(vista.rutas)) vista.rutas = [];
          estado.vista = vista;
          for (const mensaje of controlEnEspera.splice(0)) await entregarControl(mensaje);
        } catch (error) {
          console.error('[tecu] No se pudo crear la vista', error);
          estado.errorVista = error;
        }
      })();
    }
    return creandoVista;
  }

  /* ---------------- Servicios del modo app ---------------- */

  /** La cola (oculta) mantiene vivo al coordinador que sincroniza solo y da el conteo que se ve. */
  function encenderCola() {
    if (!store || colaOculta) return;
    import('../ui/cola.js')
      .then(({ montarCola }) => {
        if (destruido || colaOculta || estado.modo !== 'app') return;
        colaOculta = montarCola(document.createElement('div'), {
          store,
          red,
          compacta: true,
          onCambio: (e) => {
            estado.cola = e;
            pintarEncabezado();
            avisarEstado();
          },
        });
        estado.cola = colaOculta.estado();
        pintarEncabezado();
      })
      .catch((error) => console.error('[tecu] No se pudo preparar la cola de sincronización', error));
  }

  function apagarCola() {
    colaOculta?.destruir();
    colaOculta = null;
  }

  /** Bandeja de salida del docente (js/data/mensajes.js), si el módulo ya existe. */
  function encenderMensajes() {
    if (yo !== 'docente' || mensajes) return;
    import('../data/mensajes.js')
      .then((modulo) => {
        if (destruido || typeof modulo.crearMensajes !== 'function') return;
        mensajes = modulo.crearMensajes();
        const quitar = mensajes.suscribir?.(() => {
          pintarEncabezado();
          avisarEstado();
        });
        if (typeof quitar === 'function') limpieza.push(quitar);
        pintarEncabezado();
      })
      .catch(() => {
        /* el módulo de mensajes todavía no existe: el docente no tiene pendientes que mostrar */
      });
  }

  /* ---------------- Modo app ---------------- */

  function construirApp() {
    raiz.className = `cascaron${embebido ? ' cascaron--embebido' : ''}${compacto ? ' cascaron--compacto' : ''}`;
    raiz.dataset.perfil = yo;
    raiz.innerHTML = String(html`<header class="topbar" role="banner"></header>
      ${sinDemo ? '' : html`<section class="cascaron__demo" aria-label="Controles de la demostración"></section>`}
      <div class="layout" data-role="${yo === 'docente' ? 'teacher' : 'student'}">
        <nav class="nav" aria-label="Principal"></nav>
        <main id="contenido" class="main" tabindex="-1"></main>
      </div>
      ${sinDemo ? '' : html`<footer class="footer"></footer>`}`);
    regiones = {
      encabezado: raiz.querySelector('.topbar'),
      demo: raiz.querySelector('.cascaron__demo'),
      nav: raiz.querySelector('.nav'),
      main: raiz.querySelector('#contenido'),
      pie: raiz.querySelector('.footer'),
    };
    pintado.demo = '';
    pintado.nav = '';
    // Lo de <main> es de la vista: el cascarón solo escucha sus propias partes.
    for (const region of [regiones.encabezado, regiones.demo, regiones.pie]) {
      if (region) delegar(region, acciones);
    }
    if (regiones.demo) {
      regiones.demo.addEventListener('change', alCambiarControl);
      // 'toggle' no burbujea: se escucha en captura para recordar si la barra quedó abierta.
      regiones.demo.addEventListener(
        'toggle',
        (evento) => {
          if (!evento.target.matches?.('.demo')) return;
          estado.demoAbierta = evento.target.open;
          guardarSesion(CLAVE_DEMO, estado.demoAbierta);
        },
        true,
      );
    }
    construirEncabezado();
    pintarDemo();
    pintarNav();
    pintarPie();
    pantallaCargando();
  }

  /** Lo que quedó pendiente antes de recargar: sembrar, avisar, devolver el foco. */
  function tomarPendiente() {
    const pendiente = leerSesion(CLAVE_PENDIENTE);
    if (!pendiente || typeof pendiente !== 'object' || pendiente.para !== identidad) return null;
    guardarSesion(CLAVE_PENDIENTE, null);
    return pendiente;
  }

  async function mostrarApp() {
    construirApp();
    encenderCola();
    encenderMensajes();
    await asegurarVista();
    if (destruido || estado.modo !== 'app') return;
    const pendiente = tomarPendiente();
    if (pendiente?.sembrar) await entregarControl({ tecu: 'control', cmd: 'sembrar', hasta: pendiente.sembrar });
    await navegar({ primera: true });
    if (!pendiente) return;
    if (pendiente.foco) enfocar(document.getElementById(String(pendiente.foco)));
    if (pendiente.aviso) aviso(String(pendiente.aviso), { tipo: pendiente.tipo || 'info', duracion: 4000 });
    if (pendiente.anuncio) anunciar(String(pendiente.anuncio));
  }

  /* ---------------- Escenario (vista móvil o de escritorio con marco) ---------------- */

  const marco = () => document.getElementById('device-frame');

  function mostrarEscenario(modo) {
    desmontarPantalla();
    apagarCola();
    cerrarDialogo();
    regiones = null;
    raiz.className = 'cascaron cascaron--escenario';
    raiz.innerHTML = String(htmlEscenario(modo, { dispositivo: estado.prefs.dispositivo, src: `${location.pathname}${location.search}${location.hash}` }));
    document.title = `${tituloEscenario(modo)} · ${MARCA.nombre}`;
    delegar(raiz.querySelector('.topbar'), acciones);
    raiz.querySelector('.stage__intro').addEventListener('change', alCambiarControl);
    observadorEscenario?.disconnect();
    if (modo === 'desktop') {
      if ('ResizeObserver' in window) {
        observadorEscenario = new ResizeObserver(() => ajustarEscritorio(raiz));
        observadorEscenario.observe(raiz.querySelector('.device'));
      }
      ajustarEscritorio(raiz);
    }
  }

  /** Dentro del marco: avisa la pantalla actual para que la página de afuera conserve la dirección. */
  function avisarAlMarcoPadre() {
    if (!EN_MARCO) return;
    try {
      window.parent.postMessage({ tecu: 'marco', tipo: 'ruta', consulta: location.search, hash: location.hash, titulo: document.title }, location.origin);
    } catch {
      /* sin acceso a la página de afuera: no pasa nada */
    }
  }

  const identidadDeLaUrl = () => {
    const id = leerIdentidad(location.search);
    return `${id.perfil}:${id.perfil === 'estudiante' ? id.alumno : ''}`;
  };

  /**
   * Dibuja la página según el control «Vista» y el tamaño de la pantalla.
   * @param {{ primera?: boolean, enfocarControl?: boolean }} [opciones]
   */
  async function aplicarModo({ primera = false, enfocarControl = false } = {}) {
    const dispositivo = estado.prefs.dispositivo;
    const modo = modoDeVista(dispositivo);
    document.documentElement.dataset.view = modo;
    aplicarViewport(dispositivo);
    const cambio = modo !== estado.modo;
    if (cambio) {
      estado.modo = modo;
      if (modo === 'app') {
        // Dentro del marco se pudo cambiar de perfil o de estudiante: esta página debe ser esa persona.
        if (!primera && identidadDeLaUrl() !== identidad) {
          dejarPendiente({ foco: `demo-vista-${dispositivo}` }, identidadDeLaUrl());
          location.reload();
          return;
        }
        // Cambiar de vista no es cambiar de pantalla: el foco se queda en el control «Vista».
        await mostrarApp();
      } else {
        mostrarEscenario(modo);
      }
    } else if (modo !== 'app') {
      // Mismo marco: solo se actualiza el texto; el iframe no se recarga.
      const intro = document.getElementById('stage-intro');
      if (intro) renderConFoco(intro, htmlIntroEscenario(modo, dispositivo));
    } else {
      pintarDemo();
    }
    if (enfocarControl) {
      const control = document.getElementById(`demo-vista-${dispositivo}`);
      if (control && !raiz.contains(document.activeElement)) control.focus({ preventScroll: true });
      if (cambio && modo === 'app') window.scrollTo(0, 0);
    }
  }

  /* ---------------- Suscripciones ---------------- */

  function alCambiarRed() {
    const antes = estado.red.enLinea;
    estado.red = leerRed();
    if (estado.modo !== 'app') return;
    pintarEncabezado();
    pintarDemo();
    avisarEstado();
    if (antes && !estado.red.enLinea) {
      aviso('Sin internet. Sigues trabajando con lo guardado en este dispositivo.', { tipo: 'alerta' });
    } else if (!antes && estado.red.enLinea) {
      aviso('Conexión recuperada.', { tipo: 'exito' });
      // La bandeja de salida del docente se envía sola al volver la conexión.
      if (mensajes && enSalida()) {
        sincronizarAhora().then((n) => {
          if (n) aviso(`Se ${n === 1 ? 'envió' : 'enviaron'} ${plural(n, 'mensaje que estaba', 'mensajes que estaban')} en espera.`, { tipo: 'exito' });
          pintarEncabezado();
          avisarEstado();
        });
      }
    }
  }

  function alCambiarPrefs(prefs) {
    const antes = estado.prefs;
    estado.prefs = prefs && typeof prefs === 'object' ? prefs : leerPreferencias();
    if (antes.voz && !estado.prefs.voz) voz.detener();
    if (estado.prefs.dispositivo !== antes.dispositivo) {
      aplicarModo({ enfocarControl: true });
      anunciar(TEXTO_VISTA[estado.prefs.dispositivo] || '');
    }
    pintarEncabezado();
    pintarDemo();
  }

  function alCambiarHash() {
    if (!location.hash.startsWith('#/')) return; // un ancla suelta (#contenido) no es una pantalla
    if (estado.modo === 'app') {
      navegar();
      return;
    }
    // La dirección cambió fuera del marco (a mano, o con «Atrás»): el marco la sigue.
    try {
      marco()?.contentWindow?.postMessage({ tecu: 'marco', tipo: 'ir', hash: location.hash }, location.origin);
    } catch {
      /* el marco todavía no carga */
    }
  }

  function alMensaje(evento) {
    if (evento.origin !== location.origin) return;
    const d = evento.data;
    if (!d || typeof d !== 'object') return;
    if (d.tecu === 'control') {
      if (estado.modo === 'app') entregarControl(d);
      return;
    }
    if (d.tecu !== 'marco' || typeof d.hash !== 'string' || !d.hash.startsWith('#/') || d.hash.length > 200) return;
    if (d.tipo === 'ruta') {
      // Del marco hacia afuera: se conserva la dirección (perfil, estudiante y pantalla).
      const iframe = marco();
      if (!iframe || evento.source !== iframe.contentWindow) return;
      const consulta = typeof d.consulta === 'string' && d.consulta.length <= 300 && (d.consulta === '' || d.consulta.startsWith('?')) ? d.consulta : location.search;
      history.replaceState(null, '', `${location.pathname}${consulta}${d.hash}`);
      if (typeof d.titulo === 'string') document.title = `${d.titulo.slice(0, 120)} (${nombreEscenario(estado.modo)})`;
    } else if (d.tipo === 'ir' && EN_MARCO && evento.source === window.parent && location.hash !== d.hash) {
      location.hash = d.hash;
    }
  }

  /** «Saltar al contenido»: enfoca <main> sin tocar el hash (que es la ruta). */
  function alClicDocumento(evento) {
    const enlace = evento.target.closest?.('.skip-link, .saltar');
    if (!enlace) return;
    evento.preventDefault();
    enfocar('#contenido', { desplazar: true });
  }

  const escuchar = (objetivo, tipo, fn, opciones) => {
    objetivo.addEventListener(tipo, fn, opciones);
    limpieza.push(() => objetivo.removeEventListener(tipo, fn, opciones));
  };

  escuchar(window, 'hashchange', alCambiarHash);
  escuchar(window, 'message', alMensaje);
  escuchar(document, 'click', alClicDocumento);
  limpieza.push(red.suscribir(alCambiarRed));
  limpieza.push(alCambiarPreferencias(alCambiarPrefs));
  limpieza.push(alCambiarPantalla(() => aplicarModo()));
  limpieza.push(voz.alCambiar(() => pintarEncabezado()));
  if (store) {
    limpieza.push(
      store.suscribir(() => {
        // Mientras la cola no esté lista, el conteo sale directo del store.
        if (!colaOculta) estado.cola = { ...estado.cola, pendientes: contarEnStore() };
        pintarEncabezado();
        avisarEstado();
      }),
    );
  }

  /* ---------------- Arranque ---------------- */

  if (!location.hash.startsWith('#/')) history.replaceState(null, '', `${location.pathname}${location.search}#${INICIO[yo]}`);
  conectarVoz().then(() => pintarEncabezado());
  await aplicarModo({ primera: true });

  return {
    anfitrion,
    vista: () => estado.vista,
    destruir() {
      if (destruido) return;
      destruido = true;
      desmontarPantalla();
      cerrarDialogo();
      apagarCola();
      observadorEscenario?.disconnect();
      limpieza.splice(0).forEach((fn) => {
        try {
          fn?.();
        } catch {
          /* ya no escuchaba */
        }
      });
      try {
        vistaAcerca?.destruir?.();
        estado.vista?.destruir?.();
      } catch (error) {
        console.error('[tecu]', error);
      }
      raiz.innerHTML = '';
    },
  };
}
