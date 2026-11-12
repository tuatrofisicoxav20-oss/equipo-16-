/**
 * Modo presentación (?vista=pitch): el escenario que se proyecta frente al jurado.
 *
 * Qué se ve (pensado para 1366×768 y 1920×1080, sin scroll):
 *   - Arriba, el guion: los 6 pasos de GUIDE (js/data/guiones.js), cada uno a 1 clic, y
 *     debajo la nota del paso para quien presenta. A la derecha, «Modo libre», «QR para el
 *     jurado» (si existe js/ui/qr.js), «Reiniciar demo» y la ayuda de atajos.
 *   - «Reproducir a Ana», «Reproducir a Luis» y el interruptor «Modo avión», que refleja el
 *     estado REAL de los dos teléfonos (lo que ellos mismos reportan).
 *   - El escenario: dos teléfonos con las vistas reales del estudiante en iframes
 *     (?alumno=ana&embebido=1 y ?alumno=luis&embebido=1, 360×740 escalados para caber
 *     completos), con su nombre y un chip de estado debajo (pantalla, conexión y pendientes),
 *     y a la derecha el panel docente real (?vista=docente&compacto=1). Todo está vivo: las
 *     vistas se comunican entre sí por localStorage + BroadcastChannel, como en la vida real.
 *
 * Comunicación con las vistas (postMessage, solo del mismo origen):
 *   enviar(destino, mensaje)               → { ...mensaje, tecu: 'control' } al iframe de ese destino
 *                                            ('ana' | 'luis' | 'docente'); espera a que la vista
 *                                            haya avisado que está lista. Promise<boolean>.
 *   esperarEstado(destino, predicado, ms)  → el último { tecu: 'estado' } de ese destino que cumpla
 *                                            el predicado (también el que ya llegó), o null si se
 *                                            acaba el tiempo. Nunca rechaza.
 * Cada mensaje { tecu: 'estado' } se valida con event.origin y event.source (solo los tres iframes
 * de esta vista). Qué hacer en cada paso lo decide js/data/escenas.js (crearDirector).
 *
 * Patrón de la app: state + funciones que pintan cada zona + delegación con data-act. Los
 * iframes se crean una sola vez (repintarlos los recargaría).
 *
 *   montarPitch(raiz) → Promise<{ destruir() }>
 */
import { anunciar, attr, aviso, bool, confirmar, crudo, delegar, esperar, html, renderConFoco } from '../ui/dom.js';
import { icono } from '../ui/iconos.js';
import { tecuSVG } from '../ui/tecu.js';
import { GUIDE, GUIONES } from '../data/guiones.js';
import { cargarPaquete } from '../data/paquete.js';
import { reiniciarTodo } from '../data/store.js';

/* ------------------------------------------------------------------ */
/* Constantes                                                          */
/* ------------------------------------------------------------------ */

const ALUMNOS = Object.freeze(['ana', 'luis']);
/** Tamaño real (CSS) de la pantalla de cada teléfono; el marco la escala para que quepa completa. */
const CELULAR = Object.freeze({ ancho: 360, alto: 740 });
/** Ancho de diseño del panel docente: se escala para llenar su marco (se ve igual en 1366 que en 1920). */
const ANCHO_PANEL = 760;
const ESCALA_CELULAR = Object.freeze({ min: 0.35, max: 1.25 });
const ESCALA_PANEL = Object.freeze({ min: 0.75, max: 1.5 });
/** Los teléfonos nunca ocupan más de esta fracción del ancho del escenario: el panel también se tiene que leer. */
const FRACCION_CELULARES = 0.6;

/** Cuánto se espera a que una vista avise que está lista antes de mandarle algo de todos modos. */
const MS_LISTO = 15000;
const MS_ESPERA = 30000;
/** Tras cambiar el modo avión, cuánto se espera a que los teléfonos lo confirmen. */
const MS_CONFIRMAR_RED = 3000;
/** Tras reiniciar, cuánto se espera a que cada vista confirme que volvió al inicio (si no, se recarga). */
const MS_CONFIRMAR_REINICIO = 3000;
/** Un segundo clic en el mismo «Reproducir» antes de esto se ignora (doble clic sin querer). */
const MS_DOBLE_CLIC = 1200;

const URL_CONTEXTO = new URL('../../packs/contexto.json', import.meta.url).href;

const ACTIVIDADES = Object.freeze({
  pregunta: 'Pregunta',
  visual: 'Balanza',
  practica: 'Práctica',
  comprobacion: 'Comprobación',
});

/* ------------------------------------------------------------------ */
/* Utilidades puras                                                    */
/* ------------------------------------------------------------------ */

const ico = (nombre) => crudo(icono(nombre));
const limitar = (n, min, max) => Math.min(max, Math.max(min, n));
const nombreDe = (alumno) => GUIONES[alumno]?.nombre || alumno;
const pausaReal = (ms) => new Promise((listo) => setTimeout(listo, ms));

/** Dirección de una vista de la app en la misma carpeta que esta página (sirve en una subcarpeta). */
function urlVista(parametros) {
  return `${location.pathname}?${new URLSearchParams(parametros)}`;
}

/** Importa un módulo de la fase 5 sin que su ausencia tumbe el escenario. */
async function importar(cargar, ruta, { opcional = false } = {}) {
  try {
    return await cargar();
  } catch (error) {
    if (!opcional) console.error(`[tecu] No se pudo cargar ${ruta}: el modo presentación sigue sin esa parte.`, error);
    return null;
  }
}

/** packs/contexto.json (la estadística de «El problema»). Sin él, la diapositiva avisa al presentador. */
async function cargarContexto() {
  try {
    const respuesta = await fetch(URL_CONTEXTO);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    return await respuesta.json();
  } catch (error) {
    console.error('[tecu] No se pudo leer packs/contexto.json', error);
    return { estadisticas: [] };
  }
}

/** Texto de un paso para anunciarlo: «Paso 2 de 6: Ana y Luis. Mismo ejercicio…». */
function textoPaso(id) {
  const i = GUIDE.findIndex((p) => p.id === id);
  if (i < 0) return '';
  return `Paso ${i + 1} de ${GUIDE.length}: ${GUIDE[i].titulo}. ${GUIDE[i].nota}`;
}

/* ------------------------------------------------------------------ */
/* Vista                                                               */
/* ------------------------------------------------------------------ */

/**
 * Monta el modo presentación en `raiz`.
 * @param {HTMLElement} raiz
 * @returns {Promise<{ destruir: () => void }>}
 */
export async function montarPitch(raiz) {
  raiz.className = 'app app--pitch pitch';
  raiz.innerHTML = '<p class="cargando" role="status">Preparando la presentación…</p>';

  const [modEscenas, modDiapositiva, modAtajos, modLibre, modQR, contexto] = await Promise.all([
    importar(() => import('../data/escenas.js'), 'js/data/escenas.js'),
    importar(() => import('../ui/diapositiva.js'), 'js/ui/diapositiva.js'),
    importar(() => import('../ui/atajos.js'), 'js/ui/atajos.js'),
    importar(() => import('../ui/libre.js'), 'js/ui/libre.js'),
    importar(() => import('../ui/qr.js'), 'js/ui/qr.js', { opcional: true }),
    cargarContexto(),
  ]);
  const hayQR = typeof modQR?.qrSVG === 'function';
  const hayAtajos = typeof modAtajos?.instalarAtajos === 'function';
  const teclas = modAtajos?.TECLAS || {};

  const state = {
    paso: null, // id de GUIDE del paso actual (null: aún no empieza)
    pasoOcupado: null, // paso que el director está preparando
    reproduciendo: { ana: 0, luis: 0 }, // marca de tiempo del último «Reproducir» en curso (0: nada)
    avionOcupado: false,
    reiniciando: false,
    avisoDirector: '',
    pack: null,
  };

  /** Los tres iframes del escenario: su dirección, su último estado y cuándo están listos. */
  const marcos = {
    ana: crearMarco('ana', urlVista({ alumno: 'ana', embebido: '1' })),
    luis: crearMarco('luis', urlVista({ alumno: 'luis', embebido: '1' })),
    docente: crearMarco('docente', urlVista({ vista: 'docente', compacto: '1' })),
  };
  /** Esperas de esperarEstado() aún sin resolver. */
  const esperas = new Set();
  let destruido = false;
  let diapositiva = null;
  let libre = null;
  let dialogoQR = null;
  let turnoPaso = 0;
  let turnoAvion = 0;
  let escalaCelular = 0;
  let cuadroAjuste = 0;

  // Se escucha ANTES de crear los iframes: así no se pierde el primer aviso de ninguna vista.
  window.addEventListener('message', alMensaje);

  /* ---------------- Esqueleto (se pinta una sola vez) ---------------- */

  raiz.innerHTML = String(html`
    <header class="pitch-cabecera">
      <div class="pitch-marca">
        ${crudo(tecuSVG({ tamano: 44, decorativo: true }))}
        <h1 class="pitch-titulo">Tecu Aprende<span class="solo-lector">:</span>
          <span class="pitch-titulo__sub">Modo presentación</span></h1>
      </div>
      <nav class="pitch-guion" aria-label="Pasos de la presentación">
        <ol class="pitch-pasos" data-zona="pasos"></ol>
      </nav>
      <div class="pitch-acciones" role="group" aria-label="Más acciones">
        <button type="button" class="boton" data-act="libre" data-foco="libre"
          ${attr('aria-keyshortcuts', Boolean(teclas.libre), teclas.libre)}>
          ${ico('lapiz')}<span>Modo libre</span>${tecla(teclas.libre)}</button>
        ${hayQR
          ? html`<button type="button" class="boton" data-act="qr" data-foco="qr" aria-label="QR para el jurado">
              ${ico('celular')}<span>QR<span class="pitch-largo"> para el jurado</span></span></button>`
          : ''}
        <button type="button" class="boton" data-act="reiniciar" data-foco="reiniciar"
          ${attr('aria-keyshortcuts', Boolean(teclas.reiniciar), teclas.reiniciar)}>
          ${ico('reiniciar')}<span>Reiniciar demo</span>${tecla(teclas.reiniciar)}</button>
        ${hayAtajos
          ? html`<button type="button" class="boton pitch-boton-ayuda" data-act="ayuda" data-foco="ayuda"
              aria-label="Atajos de teclado" aria-keyshortcuts="?" title="Atajos de teclado (?)">
              ${ico('pregunta')}<span class="pitch-largo">Atajos</span></button>`
          : ''}
      </div>
    </header>
    <main id="contenido" class="pitch-principal" tabindex="-1">
      <div class="pitch-barra">
        <section class="pitch-nota" aria-labelledby="pitch-nota-titulo">
          <h2 id="pitch-nota-titulo" class="solo-lector">Nota para quien presenta</h2>
          <p class="pitch-nota__texto" data-zona="nota"></p>
          <p class="pitch-nota__aviso" role="status" data-zona="aviso"></p>
        </section>
        <div class="pitch-controles" role="group" aria-label="Controles de la demostración">
          ${ALUMNOS.map(
            (a) => html`<button type="button" class="boton pitch-reproducir" data-act="reproducir" data-alumno="${a}"
              data-foco="reproducir-${a}" ${attr('aria-keyshortcuts', Boolean(teclas[a]), teclas[a])}>
              ${ico('reproducir')}<span>Reproducir a ${nombreDe(a)}</span>${tecla(teclas[a])}</button>`,
          )}
          <button type="button" class="interruptor pitch-avion" role="switch" aria-checked="false" data-act="avion"
            data-foco="avion" ${attr('aria-keyshortcuts', Boolean(teclas.avion), teclas.avion)}>
            ${ico('avion')}<span class="pitch-avion__texto">Modo avión<span class="pitch-avion__detalle" data-zona="avion-detalle"></span></span>${tecla(teclas.avion)}</button>
        </div>
      </div>
      <section class="pitch-escenario" aria-label="Escenario: los celulares de Ana y Luis y el panel docente" data-zona="escenario">
        <div class="pitch-celulares">
          ${ALUMNOS.map(
            (a) => html`<figure class="pitch-celular" data-alumno="${a}">
              <div class="pitch-celular__marco">
                <div class="pitch-celular__pantalla">
                  <iframe src="${marcos[a].url}" title="Celular de ${nombreDe(a)}: vista del estudiante"
                    width="${CELULAR.ancho}" height="${CELULAR.alto}" data-marco="${a}"></iframe>
                </div>
              </div>
              <figcaption class="pitch-celular__pie">
                <span class="pitch-celular__nombre">${nombreDe(a)}</span>
                <span class="pitch-celular__chips" data-zona="chips-${a}"></span>
              </figcaption>
            </figure>`,
          )}
        </div>
        <figure class="pitch-computadora">
          <figcaption class="pitch-computadora__barra">
            <span class="pitch-computadora__titulo">${ico('grafica')}<span>Computadora del docente</span></span>
            <span class="pitch-computadora__detalle" data-zona="docente"></span>
          </figcaption>
          <div class="pitch-computadora__pantalla" data-zona="panel">
            <iframe src="${marcos.docente.url}" title="Panel docente: lo que ve la maestra o el maestro"
              data-marco="docente"></iframe>
          </div>
        </figure>
      </section>
    </main>`);

  const $ = (selector) => raiz.querySelector(selector);
  const zonas = {
    pasos: $('[data-zona="pasos"]'),
    nota: $('[data-zona="nota"]'),
    aviso: $('[data-zona="aviso"]'),
    avionDetalle: $('[data-zona="avion-detalle"]'),
    escenario: $('[data-zona="escenario"]'),
    panel: $('[data-zona="panel"]'),
    docente: $('[data-zona="docente"]'),
    chips: Object.fromEntries(ALUMNOS.map((a) => [a, $(`[data-zona="chips-${a}"]`)])),
  };
  const botones = {
    avion: $('[data-act="avion"]'),
    reiniciar: $('[data-act="reiniciar"]'),
    libre: $('[data-act="libre"]'),
    qr: $('[data-act="qr"]'),
    reproducir: Object.fromEntries(ALUMNOS.map((a) => [a, $(`[data-act="reproducir"][data-alumno="${a}"]`)])),
  };
  for (const destino of Object.keys(marcos)) marcos[destino].iframe = $(`iframe[data-marco="${destino}"]`);
  const pies = [...raiz.querySelectorAll('.pitch-celular__pie')];

  renderPasos();
  renderNota();
  ALUMNOS.forEach(renderChips);
  renderAvion();
  renderDocente();

  /* ---------------- Director del guion y atajos ---------------- */

  const respaldo = directorDeRespaldo();
  const director = crearElDirector();

  const quitarDelegar = delegar(raiz, {
    paso: (el) => {
      irAPaso(el.dataset.paso);
      anunciar(textoPaso(el.dataset.paso));
    },
    reproducir: (el) => {
      const alumno = el.dataset.alumno;
      if (!ALUMNOS.includes(alumno)) return;
      if (reproducir(alumno)) anunciar(`Reproduciendo a ${nombreDe(alumno)}.`);
    },
    avion: () => alternarAvion().then(anunciar),
    libre: () => abrirLibre(),
    qr: () => abrirQR(),
    reiniciar: () => pedirReinicio(),
    ayuda: () => atajos?.mostrarAyuda?.(),
  });

  const atajos = hayAtajos
    ? modAtajos.instalarAtajos({
        // Las acciones devuelven el texto que el módulo de atajos anuncia (o una promesa de ese texto).
        paso: (n, id) => {
          const paso = GUIDE.find((p) => p.id === id) || GUIDE[Number(n) - 1];
          if (!paso) return '';
          irAPaso(paso.id);
          return textoPaso(paso.id);
        },
        ana: () => reproducir('ana') || undefined,
        luis: () => reproducir('luis') || undefined,
        avion: () => alternarAvion(),
        libre: () => {
          abrirLibre();
        },
        // El módulo de atajos ya pidió la confirmación (confirmar()) antes de llamar aquí.
        reiniciar: () => reiniciarDemo(),
      })
    : null;

  /* ---------------- Escala del escenario ---------------- */

  const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(programarAjuste) : null;
  if (observador) {
    observador.observe(zonas.escenario);
    observador.observe(zonas.panel);
    pies.forEach((pie) => observador.observe(pie));
  } else {
    window.addEventListener('resize', programarAjuste);
  }
  ajustarEscalas();

  // El paquete trae los nombres cortos y colores de cada ruta (para los chips) y lo usa el modo libre.
  obtenerPack()
    .then(() => ALUMNOS.forEach(renderChips))
    .catch(() => {});

  return { destruir };

  /* ================================================================== */
  /* Comunicación con los iframes                                       */
  /* ================================================================== */

  function crearMarco(destino, url) {
    // preparado: la vista ya mandó su primer estado (su escucha de mensajes existe).
    // cola: lo que se le mandó antes de eso, en orden; sale en cuanto avise.
    const marco = { destino, url, iframe: null, estado: null, preparado: false, listo: null, avisarListo: null, cola: [], reloj: 0 };
    reiniciarListo(marco);
    return marco;
  }

  function reiniciarListo(marco) {
    marco.estado = null;
    marco.preparado = false;
    marco.listo = new Promise((listo) => {
      marco.avisarListo = listo;
    });
  }

  /** Mensajes { tecu: 'estado' } de las vistas: solo del mismo origen y de nuestros propios iframes. */
  function alMensaje(evento) {
    if (destruido || evento.origin !== location.origin) return;
    const datos = evento.data;
    if (!datos || typeof datos !== 'object' || datos.tecu !== 'estado') return;
    const marco = Object.values(marcos).find((m) => m.iframe && evento.source && m.iframe.contentWindow === evento.source);
    if (!marco) return;
    marco.estado = datos;
    if (!marco.preparado) {
      marco.preparado = true;
      marco.avisarListo();
      vaciarCola(marco);
    }
    for (const espera of [...esperas]) {
      if (espera.destino === marco.destino && espera.cumple(datos)) espera.terminar(datos);
    }
    if (marco.destino === 'docente') renderDocente();
    else {
      renderChips(marco.destino);
      renderAvion();
    }
  }

  /**
   * Manda un comando a una vista: { ...mensaje, tecu: 'control' } (mismo origen). Si la vista ya
   * avisó que está lista, sale en ese momento; si aún carga, se forma en su cola y sale, en orden,
   * en cuanto avise (o a los MS_LISTO, por si acaso). Las órdenes seguidas llegan en el orden en
   * que se mandaron (p. ej. reiniciar y luego reproducirDiagnostico).
   * @param {'ana'|'luis'|'docente'|Array<'ana'|'luis'|'docente'>} destino
   * @param {object} mensaje p. ej. { cmd: 'simularRed', sinInternet: true }
   * @returns {boolean|Promise<boolean>} true si salió; una promesa si quedó en cola; false si no hay
   *   a quién mandárselo
   */
  function enviar(destino, mensaje = {}) {
    if (Array.isArray(destino)) {
      const r = destino.map((d) => enviar(d, mensaje));
      return r.some((x) => typeof x?.then === 'function') ? Promise.all(r).then((xs) => xs.every(Boolean)) : r.every(Boolean);
    }
    const marco = marcos[destino];
    if (!marco?.iframe || destruido) return false;
    const datos = { ...(mensaje && typeof mensaje === 'object' ? mensaje : {}), tecu: 'control' };
    if (marco.preparado && !marco.cola.length) return postear(marco, datos);
    return new Promise((resolver) => {
      marco.cola.push({ datos, resolver });
      if (!marco.reloj) marco.reloj = setTimeout(() => vaciarCola(marco), MS_LISTO);
    });
  }

  function postear(marco, datos) {
    const ventana = marco.iframe?.contentWindow;
    if (!ventana || destruido) return false;
    try {
      ventana.postMessage(datos, location.origin);
      return true;
    } catch (error) {
      console.error(`[tecu] No se pudo mandar el mensaje a ${marco.destino}`, error);
      return false;
    }
  }

  /** Manda lo que esperaba en la cola de una vista (o lo descarta si la vista se destruyó). */
  function vaciarCola(marco) {
    clearTimeout(marco.reloj);
    marco.reloj = 0;
    for (const { datos, resolver } of marco.cola.splice(0)) resolver(postear(marco, datos));
  }

  /**
   * Resuelve con el último estado de `destino` que cumpla `predicado` (también si ya lo cumple),
   * o con null si pasan `ms` milisegundos. Nunca rechaza: el guion sigue aunque una vista no conteste.
   * @param {'ana'|'luis'|'docente'} destino
   * @param {(estado: object) => boolean} [predicado]
   * @param {number} [ms=30000] Infinity: sin límite
   * @returns {Promise<object|null>}
   */
  function esperarEstado(destino, predicado = () => true, ms = MS_ESPERA) {
    const cumple = (estado) => {
      try {
        return Boolean(estado) && Boolean(predicado(estado));
      } catch (error) {
        console.error(error);
        return false;
      }
    };
    const actual = marcos[destino]?.estado;
    if (cumple(actual)) return Promise.resolve(actual);
    if (!marcos[destino] || destruido) return Promise.resolve(null);
    return new Promise((resolver) => {
      const espera = { destino, cumple, temporizador: 0 };
      espera.terminar = (valor) => {
        clearTimeout(espera.temporizador);
        esperas.delete(espera);
        resolver(valor);
      };
      const limite = ms === undefined || ms === null ? MS_ESPERA : Number(ms);
      if (Number.isFinite(limite)) espera.temporizador = setTimeout(() => espera.terminar(null), Math.max(0, limite));
      esperas.add(espera);
    });
  }

  /** Nota del director para quien presenta (región role=status: el lector de pantalla la lee sola). */
  function avisar(texto) {
    if (destruido) return;
    state.avisoDirector = texto == null ? '' : String(texto);
    renderAviso();
  }

  /** Vuelve a cargar una vista (último recurso del reinicio) y espera a que avise que está lista. */
  async function recargar(destino) {
    const marco = marcos[destino];
    if (!marco?.iframe) return;
    reiniciarListo(marco);
    if (destino === 'docente') renderDocente();
    else renderChips(destino);
    try {
      marco.iframe.contentWindow.location.replace(marco.url); // replace: no deja historial en el botón «Atrás»
    } catch {
      marco.iframe.src = marco.url;
    }
    await Promise.race([marco.listo, pausaReal(MS_LISTO)]);
  }

  /* ================================================================== */
  /* Director del guion                                                 */
  /* ================================================================== */

  function crearElDirector() {
    if (typeof modEscenas?.crearDirector === 'function') {
      try {
        const creado = modEscenas.crearDirector({ enviar, esperarEstado, esperar, avisar });
        if (creado && typeof creado === 'object') return creado;
      } catch (error) {
        console.error('[tecu] No se pudo crear el director del guion (js/data/escenas.js)', error);
      }
    }
    return respaldo;
  }

  /**
   * Lo mínimo si js/data/escenas.js no cargó: los botones siguen funcionando y los pasos solo
   * muestran su nota.
   */
  function directorDeRespaldo() {
    const modoAvion = (sinInternet) =>
      Promise.all(ALUMNOS.map((a) => enviar(a, { cmd: 'simularRed', sinInternet: Boolean(sinInternet) })));
    return {
      irAPaso: async () => {},
      async reproducir(alumno) {
        await enviar(alumno, { cmd: 'reiniciar' });
        await enviar(alumno, { cmd: 'reproducirDiagnostico', items: GUIONES[alumno]?.items || [] });
      },
      modoAvion,
      async reiniciar() {
        await Promise.all(ALUMNOS.map((a) => enviar(a, { cmd: 'reiniciar' })));
        await modoAvion(false);
        await enviar('docente', { cmd: 'cerrarFicha' });
      },
    };
  }

  /** Llama un método del director (o del respaldo si el director no lo trae). Nunca rechaza. */
  async function dirigir(metodo, ...args) {
    const fn = typeof director[metodo] === 'function' ? director[metodo] : respaldo[metodo];
    try {
      await fn.apply(director, args);
      return true;
    } catch (error) {
      console.error(`[tecu] Falló el guion (${metodo})`, error);
      if (!destruido) aviso('Esa parte del guion no respondió. Puedes seguir con los botones o reiniciar la demo.', { tipo: 'error' });
      return false;
    }
  }

  /* ================================================================== */
  /* Acciones                                                           */
  /* ================================================================== */

  /** Paso del guion: lo marca como actual, muestra su nota y deja que el director prepare la escena. */
  async function irAPaso(id) {
    if (!GUIDE.some((p) => p.id === id) || destruido) return;
    state.paso = id;
    state.avisoDirector = ''; // la nota del director era del paso anterior
    renderAviso();
    if (id === 'problema') abrirDiapositiva();
    else cerrarDiapositiva();
    const turno = ++turnoPaso;
    state.pasoOcupado = id;
    renderPasos();
    renderNota();
    await dirigir('irAPaso', id);
    if (turno === turnoPaso && !destruido) {
      state.pasoOcupado = null;
      renderPasos();
    }
  }

  /**
   * «Reproducir a Ana/Luis»: escribe su diagnóstico renglón por renglón en su teléfono.
   * @returns {Promise<void>|null} null si se ignoró (doble clic)
   */
  function reproducir(alumno) {
    const ahora = Date.now();
    if (ahora - state.reproduciendo[alumno] < MS_DOBLE_CLIC) return null;
    state.reproduciendo[alumno] = ahora;
    renderReproducir(alumno);
    return dirigir('reproducir', alumno).then(() => {
      if (state.reproduciendo[alumno] !== ahora || destruido) return; // otro clic la reemplazó
      state.reproduciendo[alumno] = 0;
      renderReproducir(alumno);
    });
  }

  /** ¿Los dos teléfonos están sin internet? (según lo que ellos mismos reportan) */
  function avionActivo() {
    return ALUMNOS.every((a) => marcos[a].estado?.enLinea === false);
  }

  /**
   * Modo avión: si algún teléfono tiene internet, se lo quita a los dos; si no, se los devuelve.
   * @returns {Promise<string>} lo que pasó, para anunciarlo
   */
  async function alternarAvion() {
    const sinInternet = !avionActivo();
    const turno = ++turnoAvion;
    state.avionOcupado = true;
    renderAvion();
    await dirigir('modoAvion', sinInternet);
    await Promise.all(ALUMNOS.map((a) => esperarEstado(a, (e) => e.enLinea === !sinInternet, MS_CONFIRMAR_RED)));
    if (turno === turnoAvion && !destruido) {
      state.avionOcupado = false;
      renderAvion();
    }
    const confirmado = sinInternet === avionActivo();
    if (sinInternet) {
      return confirmado
        ? 'Modo avión activado: Ana y Luis están sin internet. Lo que hagan se guarda en su cel.'
        : 'Pedí el modo avión, pero algún teléfono no lo confirmó. Revisa los chips de abajo.';
    }
    return confirmado
      ? 'Modo avión desactivado: los teléfonos tienen internet y sincronizan solos.'
      : 'Los teléfonos siguen sin internet. Si la computadora no tiene red, no pueden sincronizar.';
  }

  function abrirDiapositiva() {
    if (diapositiva) return;
    if (typeof modDiapositiva?.mostrarDiapositiva !== 'function') return; // sin diapositiva: queda la nota
    try {
      diapositiva = modDiapositiva.mostrarDiapositiva(zonas.escenario, {
        contexto,
        onCerrar: () => {
          diapositiva = null; // «Continuar» o Escape: el escenario vuelve a estar a la vista
        },
      });
    } catch (error) {
      console.error('[tecu] No se pudo mostrar la diapositiva', error);
      diapositiva = null;
    }
  }

  function cerrarDiapositiva() {
    const abierta = diapositiva;
    diapositiva = null;
    try {
      abierta?.cerrar?.();
    } catch (error) {
      console.error(error);
    }
  }

  async function abrirLibre() {
    if (libre || destruido) return;
    if (typeof modLibre?.abrirModoLibre !== 'function') {
      aviso('El modo libre no está disponible en esta versión.', { tipo: 'alerta' });
      return;
    }
    const reserva = { cerrar() {} };
    libre = reserva; // un segundo clic mientras carga el paquete no abre otro
    let pack = null;
    try {
      pack = await obtenerPack();
    } catch {
      pack = null; // el modo libre se las arregla sin nombres de errores
    }
    if (destruido || libre !== reserva) return; // se reinició la demo mientras tanto
    try {
      libre = modLibre.abrirModoLibre({
        pack,
        onCerrar: () => {
          libre = null;
        },
      });
    } catch (error) {
      console.error('[tecu] No se pudo abrir el modo libre', error);
      libre = null;
      aviso('No se pudo abrir el modo libre.', { tipo: 'error' });
    }
  }

  /** «QR para el jurado»: diálogo con el QR de la app como invitado. */
  function abrirQR() {
    if (!hayQR || dialogoQR || destruido) return;
    const url = `${location.origin}${location.pathname}?alumno=invitado`;
    let svg = '';
    try {
      svg = modQR.qrSVG(url, { etiqueta: 'Código QR para abrir Tecu Aprende en tu celular como invitado' });
    } catch (error) {
      console.error('[tecu] No se pudo dibujar el QR', error);
    }
    const local = typeof modQR.esDireccionPublica === 'function' && !modQR.esDireccionPublica(url);
    const dialogo = document.createElement('dialog');
    dialogo.className = 'dialogo pitch-qr';
    dialogo.setAttribute('aria-labelledby', 'pitch-qr-titulo');
    dialogo.setAttribute('aria-describedby', 'pitch-qr-instruccion');
    dialogo.innerHTML = String(html`
      <div class="pila">
        <h2 id="pitch-qr-titulo" class="titulo-2" tabindex="-1" data-titulo>Pruébalo en tu celular</h2>
        <p id="pitch-qr-instruccion">Escanea el código con la cámara. Abre Tecu como invitado: lo que resuelvas
          llega a este panel docente.</p>
        <div class="pitch-qr__codigo">${svg ? crudo(svg) : html`<p class="vacio">No se pudo dibujar el código.</p>`}</div>
        <p class="pitch-qr__url"><span class="solo-lector">Dirección: </span>${url}</p>
        ${local
          ? html`<p class="pitch-qr__aviso">${ico('alerta')}<span>Esta dirección es local: solo abre en esta
              computadora. Antes de presentar, abre la versión publicada (con https) para que el QR sirva en otros celulares.</span></p>`
          : ''}
        <form method="dialog" class="fila fila--fin">
          <button type="submit" class="boton boton--primario" value="cerrar">Cerrar</button>
        </form>
      </div>`);
    const previo = document.activeElement;
    // Tocar el fondo oscuro también cierra.
    dialogo.addEventListener('click', (evento) => {
      if (evento.target === dialogo) dialogo.close();
    });
    dialogo.addEventListener('close', () => {
      dialogo.remove();
      dialogoQR = null;
      if (previo && previo.isConnected && typeof previo.focus === 'function') previo.focus({ preventScroll: true });
    });
    document.body.appendChild(dialogo);
    dialogoQR = dialogo;
    if (typeof dialogo.showModal === 'function') dialogo.showModal();
    else dialogo.setAttribute('open', '');
    dialogo.querySelector('[data-titulo]')?.focus();
  }

  /** Botón «Reiniciar demo»: pide confirmación (el atajo R la pide en js/ui/atajos.js). */
  async function pedirReinicio() {
    if (state.reiniciando || document.querySelector('dialog[open]')) return;
    const si = await confirmar({
      titulo: '¿Reiniciar la demo?',
      mensaje:
        'Ana, Luis y el panel docente vuelven al estado inicial y los teléfonos recuperan el internet. ' +
        'Se borra lo que se hizo durante la demo (también lo de los celulares del jurado). El grupo simulado no cambia.',
      aceptar: 'Sí, reiniciar',
      cancelar: 'Cancelar',
      peligro: true,
    });
    if (!si) {
      anunciar('Reinicio cancelado.');
      return;
    }
    anunciar('Reiniciando la demo.');
    const final = await reiniciarDemo();
    if (final) anunciar(final);
  }

  /**
   * Deja todo en estado inicial (sin preguntar: quien llama ya confirmó).
   * Director (reiniciar en las tres vistas + red) → reiniciarTodo() (celulares, «servidor» y red
   * simulada) → cada vista debe reportar que volvió al inicio; la que no conteste se recarga.
   * @returns {Promise<string>} lo que pasó, para anunciarlo
   */
  async function reiniciarDemo() {
    if (state.reiniciando || destruido) return '';
    state.reiniciando = true;
    botones.reiniciar?.setAttribute('aria-busy', 'true');
    turnoPaso += 1;
    turnoAvion += 1;
    cerrarDiapositiva();
    try {
      libre?.cerrar?.();
    } catch (error) {
      console.error(error);
    }
    libre = null;
    dialogoQR?.close();
    Object.assign(state, { paso: null, pasoOcupado: null, avionOcupado: false, reproduciendo: { ana: 0, luis: 0 } });
    state.avisoDirector = '';
    renderPasos();
    renderNota();
    renderAviso();
    ALUMNOS.forEach(renderReproducir);
    renderAvion();

    await dirigir('reiniciar');
    try {
      reiniciarTodo();
    } catch (error) {
      console.error('[tecu] No se pudo limpiar el almacenamiento de la demo', error);
    }
    let recargadas = 0;
    const alInicio = (e) => e.pantalla === 'inicio' && !Number(e.pendientes) && !e.sincronizando;
    await Promise.all([
      ...ALUMNOS.map(async (a) => {
        if (await esperarEstado(a, alInicio, MS_CONFIRMAR_REINICIO)) return;
        recargadas += 1;
        await recargar(a);
        await enviar(a, { cmd: 'reiniciar' });
        await enviar(a, { cmd: 'simularRed', sinInternet: false });
      }),
      (async () => {
        const vacio = (e) => !(Array.isArray(e.alumnosEnVivo) && e.alumnosEnVivo.length);
        if (await esperarEstado('docente', vacio, MS_CONFIRMAR_REINICIO)) return;
        recargadas += 1;
        await recargar('docente');
      })(),
    ]);
    if (recargadas) console.info(`[tecu] Reinicio: se recargaron ${recargadas} vista(s) que no confirmaron.`);

    state.reiniciando = false;
    botones.reiniciar?.removeAttribute('aria-busy');
    renderAvion();
    return 'Listo: la demo volvió al inicio.';
  }

  function obtenerPack() {
    return cargarPaquete().then(({ pack }) => {
      state.pack = pack;
      return pack;
    });
  }

  /* ================================================================== */
  /* Pintar                                                             */
  /* ================================================================== */

  function indicePaso() {
    return GUIDE.findIndex((p) => p.id === state.paso);
  }

  function renderPasos() {
    const actual = indicePaso();
    renderConFoco(
      zonas.pasos,
      html`${GUIDE.map((p, i) => {
        const estado = actual < 0 || i > actual ? 'pendiente' : i < actual ? 'hecho' : 'actual';
        const ocupado = state.pasoOcupado === p.id && estado === 'actual';
        return html`<li class="pitch-paso" data-estado="${estado}">
          <button type="button" class="pitch-paso__boton" data-act="paso" data-paso="${p.id}" data-foco="paso-${p.id}"
            aria-keyshortcuts="${i + 1}" ${attr('aria-current', estado === 'actual', 'step')}
            ${attr('aria-busy', ocupado, 'true')}>
            <span class="pitch-paso__num" aria-hidden="true">${i + 1}${estado === 'hecho'
              ? html`<span class="pitch-paso__hecho">${ico('check')}</span>`
              : ''}</span>
            <span class="pitch-paso__titulo"><span class="solo-lector">Paso ${i + 1}: </span>${p.titulo}</span>${estado ===
            'hecho'
              ? html`<span class="solo-lector"> (hecho)</span>`
              : ''}
          </button>
        </li>`;
      })}`,
    );
  }

  function renderNota() {
    const i = indicePaso();
    const paso = GUIDE[i];
    zonas.nota.innerHTML = String(
      paso
        ? html`<strong class="pitch-nota__paso">Paso ${i + 1} de ${GUIDE.length} · ${paso.titulo}.</strong> ${paso.nota}`
        : html`<strong class="pitch-nota__paso">Listo para empezar.</strong> Elige un paso del guion (o presiona
            <kbd>1</kbd> a <kbd>${GUIDE.length}</kbd>). Lo que se ve son las vistas reales de la app, conectadas entre sí.`,
    );
  }

  function renderAviso() {
    const texto = state.avisoDirector;
    zonas.aviso.innerHTML = String(texto ? html`${ico('info')}<span>${texto}</span>` : '');
  }

  function renderReproducir(alumno) {
    const boton = botones.reproducir[alumno];
    if (!boton) return;
    if (state.reproduciendo[alumno]) boton.setAttribute('aria-busy', 'true');
    else boton.removeAttribute('aria-busy');
  }

  function renderAvion() {
    const boton = botones.avion;
    if (!boton) return;
    const sinRed = ALUMNOS.filter((a) => marcos[a].estado?.enLinea === false);
    const activo = sinRed.length === ALUMNOS.length;
    boton.setAttribute('aria-checked', bool(activo));
    if (state.avionOcupado) boton.setAttribute('aria-busy', 'true');
    else boton.removeAttribute('aria-busy');
    // Si solo uno está sin internet, se dice cuál (el interruptor se ve apagado).
    zonas.avionDetalle.textContent = sinRed.length && !activo ? ` (solo ${sinRed.map(nombreDe).join(' y ')})` : '';
  }

  function renderChips(alumno) {
    const zona = zonas.chips[alumno];
    if (!zona) return;
    const nuevo = String(htmlChips(marcos[alumno].estado));
    if (zona.innerHTML !== nuevo) zona.innerHTML = nuevo;
  }

  function renderDocente() {
    const e = marcos.docente.estado;
    const vivos = Array.isArray(e?.alumnosEnVivo) ? e.alumnosEnVivo : [];
    const nombres = vivos.map((id) => (ALUMNOS.includes(id) ? nombreDe(id) : id === 'invitado' ? 'invitado (QR)' : id));
    zonas.docente.innerHTML = String(
      !e
        ? html`${ico('reloj')}<span>Cargando…</span>`
        : nombres.length
          ? html`${ico('sincronizar')}<span>Ya recibió a: ${nombres.join(', ')}</span>`
          : html`${ico('nube')}<span>Esperando a los celulares</span>`,
    );
  }

  /** Chips de un teléfono: pantalla actual, conexión y pendientes (icono + texto, nunca solo color). */
  function htmlChips(e) {
    if (!e) return html`<span class="chip chip--neutro pitch-chip">${ico('reloj')}<span>Cargando…</span></span>`;
    const p = describirPantalla(e);
    const conRed = e.enLinea !== false;
    const n = Math.max(0, Number(e.pendientes) || 0);
    const pend = e.sincronizando
      ? { clase: 'chip--info', icono: 'sincronizar', texto: 'Sincronizando…' }
      : n
        ? { clase: 'chip--info', icono: 'nube', texto: `${n} ${n === 1 ? 'pendiente' : 'pendientes'}` }
        : { clase: 'chip--neutro', icono: 'check', texto: '0 pendientes' };
    return html`<span class="chip pitch-chip ${p.tono ? 'chip--tono' : 'chip--neutro'}" ${attr('data-tono', Boolean(p.tono), p.tono)}
        >${ico(p.icono)}<span>${p.texto}</span></span>
      <span class="chip pitch-chip ${conRed ? 'chip--exito' : 'chip--alerta'}">${ico(conRed ? 'wifi' : 'sin-wifi')}<span
        >${conRed ? 'Con internet' : 'Sin internet'}</span></span>
      <span class="chip pitch-chip ${pend.clase}">${ico(pend.icono)}<span>${pend.texto}</span></span>`;
  }

  /** En qué pantalla va el teléfono, en palabras (y con el nombre corto y el color de su ruta). */
  function describirPantalla(e) {
    const info = infoRuta(e.ruta);
    switch (e.pantalla) {
      case 'inicio':
        return { texto: 'Inicio', icono: 'inicio' };
      case 'diagnostico': {
        const total = state.pack?.diagnostico?.length || GUIONES.ana.items.length;
        return { texto: `Diagnóstico · ejercicio ${Number(e.ejercicio) || 1} de ${total}`, icono: 'lapiz' };
      }
      case 'resultado':
        return info
          ? { texto: `Resultado: ${info.corto}`, icono: info.icono, tono: info.tono }
          : { texto: 'Resultado del diagnóstico', icono: 'exito' };
      case 'ruta':
        return {
          texto: `Ruta${info ? ` ${info.corto}` : ''} · ${ACTIVIDADES[e.actividad] || 'inicio'}`,
          icono: info?.icono || 'aprender',
          tono: info?.tono,
        };
      case 'dominado':
        return { texto: '¡Tema dominado!', icono: 'trofeo', tono: 'verde' };
      case 'tecu':
        return { texto: 'Chat con Tecu', icono: 'chat' };
      case 'descargas':
        return { texto: 'Descargas', icono: 'descargas' };
      case 'ajustes':
        return { texto: 'Ajustes', icono: 'ajustes' };
      default:
        return { texto: String(e.pantalla || 'Sin pantalla'), icono: 'celular' };
    }
  }

  function infoRuta(tipo) {
    const error = tipo ? state.pack?.errores?.[tipo] : null;
    if (!error) return null;
    return { corto: error.nombreCorto || error.nombre || tipo, tono: error.tono || null, icono: error.icono || 'aprender' };
  }

  /** Tecla del atajo junto al texto del botón (solo en pantallas anchas; aria-keyshortcuts la anuncia). */
  function tecla(valor) {
    return valor ? html`<kbd class="pitch-tecla" aria-hidden="true">${valor}</kbd>` : '';
  }

  /* ================================================================== */
  /* Escala de los teléfonos y del panel                                */
  /* ================================================================== */

  function programarAjuste() {
    if (cuadroAjuste || destruido) return;
    cuadroAjuste = requestAnimationFrame(() => {
      cuadroAjuste = 0;
      ajustarEscalas();
    });
  }

  /** px de una propiedad personalizada (definidas en px en css/pitch.css). */
  function medida(estilo, propiedad, respaldoPx) {
    const valor = parseFloat(estilo.getPropertyValue(propiedad));
    return Number.isFinite(valor) ? valor : respaldoPx;
  }

  /**
   * Teléfonos: tan grandes como quepan completos (alto disponible menos su pie), sin pasar de
   * FRACCION_CELULARES del ancho. Panel: se escala para que su ancho de diseño llene el marco.
   */
  function ajustarEscalas() {
    if (destruido) return;
    const escenario = zonas.escenario.getBoundingClientRect();
    if (escenario.width > 0 && escenario.height > 0) {
      const estilo = getComputedStyle(raiz);
      const bisel = medida(estilo, '--pitch-bisel', 8);
      const biselV = medida(estilo, '--pitch-bisel-v', 14);
      const separacion = medida(estilo, '--pitch-separacion-celular', 8);
      const entreCelulares = parseFloat(getComputedStyle(zonas.escenario.querySelector('.pitch-celulares')).columnGap) || 16;
      const pie = Math.max(0, ...pies.map((p) => p.getBoundingClientRect().height));
      const porAlto = (escenario.height - pie - separacion - 2 * biselV) / CELULAR.alto;
      const porAncho = ((escenario.width * FRACCION_CELULARES - entreCelulares) / 2 - 2 * bisel) / CELULAR.ancho;
      const escala = limitar(Math.min(porAlto, porAncho), ESCALA_CELULAR.min, ESCALA_CELULAR.max);
      if (Math.abs(escala - escalaCelular) > 0.002) {
        escalaCelular = escala;
        raiz.style.setProperty('--pitch-escala', escala.toFixed(4));
      }
    }
    const hueco = zonas.panel.getBoundingClientRect();
    const iframe = marcos.docente.iframe;
    if (iframe && hueco.width > 0 && hueco.height > 0) {
      const escala = limitar(hueco.width / ANCHO_PANEL, ESCALA_PANEL.min, ESCALA_PANEL.max);
      iframe.style.width = `${(hueco.width / escala).toFixed(2)}px`;
      iframe.style.height = `${(hueco.height / escala).toFixed(2)}px`;
      iframe.style.transform = `scale(${escala.toFixed(4)})`;
    }
  }

  /* ================================================================== */
  /* Limpieza                                                           */
  /* ================================================================== */

  function destruir() {
    if (destruido) return;
    destruido = true;
    window.removeEventListener('message', alMensaje);
    window.removeEventListener('resize', programarAjuste);
    observador?.disconnect();
    cancelAnimationFrame(cuadroAjuste);
    quitarDelegar();
    atajos?.quitar?.();
    cerrarDiapositiva();
    try {
      libre?.cerrar?.();
    } catch (error) {
      console.error(error);
    }
    dialogoQR?.close();
    for (const espera of [...esperas]) espera.terminar(null);
    Object.values(marcos).forEach(vaciarCola); // con destruido = true, cada promesa en cola resuelve false
  }
}
