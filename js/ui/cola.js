/**
 * Cola de sincronización visible (fase 3).
 *
 * Muestra cuántas actividades están guardadas en el cel y todavía no le llegan a la
 * maestra o maestro, y la vacía con una animación breve cuando vuelve la red: cada
 * actividad "sube a la nube" y el contador baja uno por uno, con barra de avance.
 *
 *   montarCola(contenedor, { store, red, compacta = false, describir, nivelTitulo = 2, onCambio })
 *     → { destruir(), abrirPanel(), estado() }
 *
 * - compacta: botón de una sola línea para la barra superior ("5 pendientes").
 * - tarjeta (compacta = false): "5 actividades guardadas en este cel, pendientes de
 *   sincronizar", las actividades como fichas que avanzan hacia una nube, el estado de la
 *   conexión, la barra de avance y el botón "Ver la lista".
 * - Tocar la cola (1 clic) abre un panel (<dialog>) con la lista: tipo de actividad y hora.
 *   La lista también se vacía en vivo mientras se sincroniza.
 * - describir(evento) → { tipo, detalle? } (detalle puede ser html`` ya escapado):
 *   cómo se nombra cada actividad en el panel. Por omisión, `describirEvento`.
 * - onCambio(estado): cada vez que cambia lo que se ve; estado() lo devuelve cuando sea:
 *   { pendientes, sincronizando, paso, total, enLinea, fallo }.
 *
 * UN solo lugar llama a store.sincronizar(): el coordinador de este archivo, uno por store
 * y compartido por todas las colas montadas con él (la de la barra y la de Inicio). Sube:
 *   - al volver la red, con anuncios ("Sincronizando 2 de 4…" y "Listo: …");
 *   - al montarse con red y pendientes (al abrir la app), también con anuncios;
 *   - con red, 0.7 s después de la última actividad nueva, en silencio;
 *   - si no pudo subir todo, reintenta en silencio a los 4, 8 y 12 s.
 * Los datos suben al ritmo del store; la animación los muestra a un ritmo legible (≈ 0.4 s
 * por actividad, unos 2.5 s en total como máximo). Con movimiento reducido no hay
 * animación: el contador cambia al instante y los textos son los mismos.
 */
import { anunciar, aviso, crudo, html, movimientoReducido } from './dom.js';
import { icono } from './iconos.js';

/* ------------------------------------------------------------------ */
/* Textos y tiempos                                                    */
/* ------------------------------------------------------------------ */

/** Lo que se anuncia (y se ve) al terminar de sincronizar. */
export const TEXTO_LISTO = 'Listo: tu maestra o maestro ya ve tu avance';
const TEXTO_FALLO = 'No se pudo enviar todo tu avance. Sigue guardado en tu cel y lo intento de nuevo.';

/** Esperas antes de subir (ms): al volver la red primero se ve "Con internet" y luego sube. */
const ESPERA = { alVolver: 600, alAbrir: 900, nueva: 700, reintento: 4000 };
const MAX_REINTENTOS = 3;
/** Entre dos anuncios de avance (los lectores de pantalla no alcanzan a leer más rápido). */
const ENTRE_ANUNCIOS_MS = 1000;
/** Lo que dura el vuelo de una ficha a la nube (igual que la animación cola-sube de css/cola.css). */
const VUELO_MS = 600;
/** Distancia entre fichas en rem: ancho + hueco (igual que --cola-paso en css/cola.css). */
const PASO_FICHA_REM = 2.5;

/** ms entre una actividad y la siguiente en la animación: legible y breve. */
const ritmo = (total) => Math.max(160, Math.min(420, Math.round(2500 / Math.max(1, total))));

/** Nombre e icono de cada tipo de evento del store. */
const TIPOS = {
  diagnostico: { nombre: 'Diagnóstico', icono: 'lapiz' },
  ruta: { nombre: 'Tu ruta', icono: 'aprender' },
  pregunta: { nombre: 'Pregunta de Tecu', icono: 'tecu' },
  visual: { nombre: 'Balanza', icono: 'balanza' },
  practica: { nombre: 'Práctica', icono: 'pista' },
  solucion: { nombre: 'Solución vista', icono: 'ojo' },
  comprobacion: { nombre: 'Comprobación sin ayuda', icono: 'estrella' },
  dominio: { nombre: 'Tema dominado', icono: 'trofeo' },
  duda: { nombre: 'Duda para Tecu', icono: 'chat' },
  libre: { nombre: 'Ejercicio libre', icono: 'lapiz' },
};

const iconoDe = (evento) => TIPOS[evento?.tipo]?.icono || 'reloj';

/**
 * Descripción por omisión de una actividad (la vista puede pasar una más rica).
 * @param {object} evento evento del store
 * @returns {{ tipo: string, detalle: string }}
 */
export function describirEvento(evento) {
  const tipo = TIPOS[evento?.tipo]?.nombre || 'Actividad';
  if (evento?.ejercicio) return { tipo, detalle: String(evento.ejercicio) };
  if (evento?.tipo === 'duda' && evento.datos?.texto) return { tipo, detalle: `«${evento.datos.texto}»` };
  return { tipo, detalle: '' };
}

function normalizarDescripcion(valor, evento) {
  if (valor && typeof valor === 'object' && 'tipo' in valor) {
    return { tipo: String(valor.tipo || describirEvento(evento).tipo), detalle: valor.detalle ?? '' };
  }
  if (typeof valor === 'string' && valor) return { tipo: valor, detalle: '' };
  return describirEvento(evento);
}

/** "10:42 p.m." si es de hoy; si no, "12 nov, 10:42 p.m.". */
function formatearHora(fecha) {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return { texto: '', iso: '' };
  let texto;
  try {
    const hora = d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
    const hoy = d.toDateString() === new Date().toDateString();
    texto = hoy ? hora : `${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}, ${hora}`;
  } catch {
    texto = d.toISOString().slice(11, 16);
  }
  return { texto, iso: d.toISOString() };
}

const actividades = (n) => (n === 1 ? '1 actividad guardada' : `${n} actividades guardadas`);
const pendientesDe = (n) => (n === 1 ? 'pendiente' : 'pendientes');

/* ------------------------------------------------------------------ */
/* Dibujos                                                             */
/* ------------------------------------------------------------------ */

const NUBE = 'M7 19a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4.75 4.75 0 0 1-.5 9.5z';
const DENTRO_DE_NUBE = {
  'sin-red': '<path d="M4 4.5l16 15"/>',
  espera: '<path d="M12 16.5v-4.75M9.75 13.75 12 11.5l2.25 2.25"/>',
  sube: '<path class="cola__flecha" d="M12 16.5v-4.75M9.75 13.75 12 11.5l2.25 2.25"/>',
  listo: '<path d="m9.25 14.25 2 2 3.75-4.25"/>',
};

/** Nube con una flecha que sube, una palomita o tachada (sin internet). Decorativa. */
function nubeSVG(variante, clase = '') {
  return (
    `<svg class="cola__nube-svg${clase ? ` ${clase}` : ''}" viewBox="0 0 24 24" width="24" height="24" fill="none" ` +
    'stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false" ' +
    `aria-hidden="true"><path class="cola__nube-borde" d="${NUBE}"/>${DENTRO_DE_NUBE[variante] || ''}</svg>`
  );
}

/*
 * Iconos de cada estado (además del texto y del borde: nada depende solo del color).
 * Botón compacto: reloj (pendientes) · nube con flecha (subiendo) · palomita (al día).
 * Cabeza de la tarjeta: cel (guardadas en este cel) · nube con flecha · palomita en círculo.
 * Renglón de estado: sin señal · reloj (ya hay red) · nube con flecha · alerta · palomita.
 */
function iconoCompacta(estado) {
  if (estado === 'sincronizando') return nubeSVG('sube', 'icono');
  return icono(estado === 'al-dia' ? 'check' : 'reloj');
}

function iconoCabeza(estado) {
  if (estado === 'sincronizando') return nubeSVG('sube', 'icono');
  return icono(estado === 'al-dia' ? 'exito' : 'celular');
}

function iconoRenglon(a) {
  const estado = estadoVisible(a);
  if (estado === 'sincronizando') return nubeSVG('sube', 'icono');
  if (estado === 'al-dia') return icono('check');
  if (!a.enLinea) return icono('sin-wifi');
  return icono(a.fallo ? 'alerta' : 'reloj');
}

/** Animaciones de un solo uso: la clase se quita al terminar, así no se repiten si el nodo se mueve. */
const animando = new WeakMap();

/** Reinicia una animación de CSS aunque la clase ya estuviera puesta. */
function reanimar(el, clase, ms = 900) {
  if (!el || movimientoReducido()) return;
  el.classList.remove(clase);
  void el.offsetWidth; // fuerza el recálculo para que la animación vuelva a empezar
  el.classList.add(clase);
  const turno = (animando.get(el) || 0) + 1;
  animando.set(el, turno);
  setTimeout(() => {
    if (animando.get(el) === turno) el.classList.remove(clase);
  }, ms);
}

/* ------------------------------------------------------------------ */
/* Coordinador: el único que llama a store.sincronizar()               */
/* ------------------------------------------------------------------ */

const coordinadores = new WeakMap();

function coordinadorDe(store, red) {
  let coord = coordinadores.get(store);
  if (!coord) {
    coord = crearCoordinador(store, red, () => {
      if (coordinadores.get(store) === coord) coordinadores.delete(store);
    });
    coordinadores.set(store, coord);
  }
  return coord;
}

/**
 * @typedef {{ tipo: string, pendientes: number, sincronizando: boolean, paso: number, total: number,
 *   enLinea: boolean, fallo: boolean, lista: object[], evento?: object }} AvisoCola
 */

function crearCoordinador(store, red, soltar) {
  /** @type {Set<(aviso: AvisoCola) => void>} */
  const oyentes = new Set();
  /** Regiones aria-live de los paneles abiertos: con un <dialog> modal, lo de afuera queda inerte. */
  const voces = new Set();
  /** Tarjetas montadas (si hay una a la vista, el "Listo" no necesita aviso flotante). */
  const tarjetas = new Set();
  const quitar = [];

  let enLinea = false;
  let fase = 'reposo'; // 'reposo' | 'sincronizando'
  let paso = 0;
  let total = 0;
  let fallo = false;
  /** Subidos que la animación todavía no muestra: [{ i, total, evento }] en orden de subida. */
  let porMostrar = [];
  let mostrando = false;
  let datosListos = true;
  let subidos = 0;
  let anunciada = false;
  let pedirAnuncio = false;
  let fallos = 0;
  let ultimoAnuncio = 0;
  let temporizador = null;
  let generacion = 0;

  const leerEnLinea = () => {
    try {
      return Boolean(red?.enLinea?.());
    } catch {
      return false;
    }
  };

  const pendientes = () => {
    try {
      return store.pendientes() || [];
    } catch {
      return [];
    }
  };

  /** Lo que se ve: lo ya subido que falta animar + lo pendiente, en el orden en que sale. */
  function lista() {
    const enVuelo = porMostrar.map((p) => p.evento);
    const ids = new Set(enVuelo.map((e) => e.id));
    return [...enVuelo, ...pendientes().filter((e) => !ids.has(e.id))];
  }

  function estado(items = lista()) {
    return { pendientes: items.length, sincronizando: fase === 'sincronizando', paso, total, enLinea, fallo };
  }

  function emitir(tipo, extra = {}) {
    const items = lista();
    const datos = { ...estado(items), lista: items, ...extra, tipo };
    for (const fn of [...oyentes]) {
      try {
        fn(datos);
      } catch (error) {
        console.error('[tecu]', error);
      }
    }
  }

  /** Lee un mensaje: en el panel abierto si lo hay; si no, en #anuncios (o con aviso flotante). */
  function decir(texto, tipoAviso = null) {
    if (voces.size) {
      voces.forEach((voz) => voz(texto));
      return;
    }
    const conTarjeta = [...tarjetas].some((el) => el.isConnected);
    if (tipoAviso && !conTarjeta) aviso(texto, { tipo: tipoAviso });
    else anunciar(texto);
  }

  function programar({ conAnuncio = false, espera = ESPERA.nueva } = {}) {
    pedirAnuncio = pedirAnuncio || conAnuncio;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      temporizador = null;
      sincronizar();
    }, espera);
  }

  function cancelar() {
    clearTimeout(temporizador);
    temporizador = null;
    pedirAnuncio = false;
  }

  async function sincronizar() {
    if (fase === 'sincronizando') return;
    if (!leerEnLinea() || !pendientes().length) {
      pedirAnuncio = false;
      return;
    }
    // Una subida anterior (de antes de un reinicio) sigue corriendo: espera a que termine.
    if (store.sincronizando?.()) {
      programar({ espera: ESPERA.nueva });
      return;
    }
    const gen = generacion;
    fase = 'sincronizando';
    anunciada = pedirAnuncio;
    pedirAnuncio = false;
    datosListos = false;
    fallo = false;
    subidos = 0;
    paso = 0;
    total = pendientes().length;
    ultimoAnuncio = 0;
    emitir('inicio');
    let n = 0;
    try {
      n = await store.sincronizar({
        onPaso: (i, t, evento) => {
          if (gen !== generacion || !evento) return;
          porMostrar.push({ i: Number(i) || 0, total: Number(t) || total, evento });
          bombear(gen);
        },
      });
    } catch (error) {
      console.error('[tecu] Falló la sincronización', error);
    }
    if (gen !== generacion) return;
    subidos = Number(n) || 0;
    datosListos = true;
    if (!mostrando) terminar();
  }

  /** Muestra los pasos ya subidos uno por uno, a un ritmo que se alcanza a ver. */
  async function bombear(gen) {
    if (mostrando) return;
    mostrando = true;
    try {
      while (porMostrar.length && gen === generacion) {
        const siguiente = porMostrar.shift();
        paso = siguiente.i;
        total = Math.max(siguiente.total, paso);
        emitir('paso', { evento: siguiente.evento });
        if (anunciada) anunciarPaso();
        if (!movimientoReducido()) await new Promise((listo) => setTimeout(listo, ritmo(total)));
      }
    } finally {
      mostrando = false;
    }
    if (gen === generacion && datosListos) terminar();
  }

  function anunciarPaso() {
    const ahora = Date.now();
    if (ultimoAnuncio && ahora - ultimoAnuncio < ENTRE_ANUNCIOS_MS) return;
    ultimoAnuncio = ahora;
    decir(`Sincronizando ${Math.max(paso, 1)} de ${total}…`);
  }

  function terminar() {
    if (fase !== 'sincronizando') return;
    fase = 'reposo';
    const quedan = pendientes().length;
    fallo = subidos < total && quedan > 0;
    const conAnuncio = anunciada;
    anunciada = false;
    if (fallo) {
      fallos += 1;
      if (conAnuncio) decir(TEXTO_FALLO, 'alerta');
      emitir('fin');
      if (leerEnLinea() && fallos <= MAX_REINTENTOS) programar({ espera: ESPERA.reintento * fallos });
      return;
    }
    fallos = 0;
    paso = total;
    if (quedan) {
      // Llegaron actividades nuevas mientras subía: van en la siguiente vuelta.
      emitir('fin');
      if (leerEnLinea()) programar({ conAnuncio, espera: ESPERA.nueva });
      return;
    }
    if (conAnuncio && subidos > 0) decir(TEXTO_LISTO, 'exito');
    emitir('fin', { listo: subidos > 0 });
  }

  function alCambiarRed() {
    const ahora = leerEnLinea();
    if (ahora === enLinea) return;
    enLinea = ahora;
    if (ahora) {
      fallos = 0;
      fallo = false;
      if (pendientes().length) programar({ conAnuncio: true, espera: ESPERA.alVolver });
    } else {
      cancelar();
    }
    emitir('red');
  }

  function alCambiarStore(cambio) {
    const tipo = cambio?.tipo;
    if (tipo === 'progreso') return; // el avance de la vista no cambia la cola
    if (tipo === 'reinicio') {
      generacion += 1;
      cancelar();
      porMostrar = [];
      fase = 'reposo';
      paso = 0;
      total = 0;
      fallo = false;
      fallos = 0;
      anunciada = false;
      emitir('cambio');
      return;
    }
    if (fase === 'sincronizando') {
      // Lo que se sube lo muestra la animación; lo nuevo se agrega a la cola y sube después.
      if (tipo !== 'sincronizado') emitir('cambio');
      return;
    }
    emitir('cambio');
    if (leerEnLinea() && pendientes().length) programar({ espera: ESPERA.nueva });
  }

  function iniciar() {
    enLinea = leerEnLinea();
    try {
      if (typeof red?.suscribir === 'function') quitar.push(red.suscribir(alCambiarRed));
    } catch (error) {
      console.error('[tecu]', error);
    }
    try {
      if (typeof store.suscribir === 'function') quitar.push(store.suscribir(alCambiarStore));
    } catch (error) {
      console.error('[tecu]', error);
    }
    if (enLinea && pendientes().length) programar({ conAnuncio: true, espera: ESPERA.alAbrir });
  }

  function detener() {
    cancelar();
    for (const fn of quitar.splice(0)) {
      try {
        fn?.();
      } catch {
        /* ya no escuchaba */
      }
    }
    soltar();
  }

  return {
    estado: () => estado(),
    lista,
    /** @param {(aviso: AvisoCola) => void} fn @returns {() => void} */
    suscribir(fn) {
      oyentes.add(fn);
      if (oyentes.size === 1) iniciar();
      return () => {
        if (oyentes.delete(fn) && !oyentes.size) detener();
      };
    },
    registrarVoz(fn) {
      voces.add(fn);
      return () => voces.delete(fn);
    },
    registrarTarjeta(el) {
      tarjetas.add(el);
      return () => tarjetas.delete(el);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Textos según el estado                                              */
/* ------------------------------------------------------------------ */

const estadoVisible = (a) => (a.sincronizando ? 'sincronizando' : a.pendientes ? 'pendientes' : 'al-dia');

/** Renglón de estado (tarjeta y panel). */
function textoEstado(a) {
  if (a.sincronizando) return 'Enviando a tu maestra o maestro…';
  if (!a.pendientes) return `${TEXTO_LISTO}.`;
  if (!a.enLinea) return 'Sin internet. Se envían solas en cuanto vuelva la señal; no se pierde nada.';
  if (a.fallo) return TEXTO_FALLO;
  return 'Ya hay internet: se envían en un momento.';
}

const textoAvance = (a) => `Sincronizando ${Math.max(a.paso, 1)} de ${Math.max(a.total, 1)}…`;

function varianteNube(a) {
  if (a.sincronizando) return 'sube';
  if (!a.pendientes) return 'listo';
  return a.enLinea ? 'espera' : 'sin-red';
}

/** Barra de avance (tarjeta y panel): <progress> con su texto. */
function pintarAvance(caja, a) {
  if (!caja) return;
  caja.hidden = !a.sincronizando;
  const barra = caja.querySelector('progress');
  const texto = caja.querySelector('.cola__progreso-texto');
  if (!a.sincronizando) return;
  barra.max = Math.max(a.total, 1);
  barra.value = Math.min(a.paso, barra.max);
  texto.textContent = textoAvance(a);
}

function pintarEstado(p, a) {
  const clave = `${estadoVisible(a)}|${a.enLinea}|${a.fallo}`;
  if (p.dataset.clave !== clave) {
    p.dataset.clave = clave;
    p.querySelector('.cola__estado-icono').innerHTML = iconoRenglon(a);
  }
  p.querySelector('.cola__estado-texto').textContent = textoEstado(a);
}

/* ------------------------------------------------------------------ */
/* Versión compacta: barra superior                                    */
/* ------------------------------------------------------------------ */

function crearCompacta({ coord, describir }) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'chip cola cola--compacta';
  boton.setAttribute('aria-haspopup', 'dialog');
  boton.innerHTML =
    '<span class="cola__icono" aria-hidden="true"></span>' +
    '<span class="cola__texto"><span class="cola__n"></span> <span class="cola__palabra"></span>' +
    '<span class="solo-lector cola__lector"></span></span>' +
    '<span class="cola__linea" aria-hidden="true"><span class="cola__avance"></span></span>';
  const el = {
    icono: boton.querySelector('.cola__icono'),
    n: boton.querySelector('.cola__n'),
    palabra: boton.querySelector('.cola__palabra'),
    lector: boton.querySelector('.cola__lector'),
    avance: boton.querySelector('.cola__avance'),
  };
  let previo = { n: null, estado: null, clave: '' };

  boton.addEventListener('click', () => abrirPanel(coord, describir, boton));

  function actualizar(a) {
    const n = a.pendientes;
    const estado = estadoVisible(a);
    const clave = `${estado}|${a.enLinea}|${a.fallo}`;
    if (clave !== previo.clave) {
      boton.dataset.estado = estado;
      boton.classList.toggle('chip--alerta', estado === 'pendientes');
      boton.classList.toggle('chip--info', estado === 'sincronizando');
      boton.classList.toggle('chip--exito', estado === 'al-dia');
      el.icono.innerHTML = iconoCompacta(estado);
      boton.title =
        estado === 'al-dia'
          ? 'Todo tu avance ya llegó a tu maestra o maestro.'
          : 'Actividades guardadas en tu cel que faltan por sincronizar. Toca para ver cuáles.';
      if (estado === 'al-dia' && previo.estado === 'sincronizando') reanimar(boton, 'cola--celebra');
    }
    if (n !== previo.n) {
      el.n.textContent = String(n);
      el.palabra.textContent = pendientesDe(n);
      boton.dataset.pendientes = String(n);
      if (previo.n !== null) reanimar(el.n, 'cola__n--cambia');
    }
    el.lector.textContent = a.sincronizando
      ? ` de sincronizar. ${textoAvance(a)}`
      : n
        ? ' de sincronizar'
        : ': todo sincronizado';
    el.avance.style.setProperty('--avance', a.total ? String(Math.min(1, a.paso / a.total)) : '0');
    previo = { n, estado, clave };
  }

  return { raiz: boton, disparador: boton, actualizar, destruir: () => boton.remove() };
}

/* ------------------------------------------------------------------ */
/* Tarjeta: Inicio                                                     */
/* ------------------------------------------------------------------ */

let contador = 0;
const nuevoId = (prefijo) => `${prefijo}-${++contador}`;

function crearTarjeta({ coord, describir, nivelTitulo }) {
  const id = nuevoId('cola');
  const h = `h${Math.min(6, Math.max(2, Number(nivelTitulo) || 2))}`;
  const raiz = document.createElement('section');
  raiz.className = 'cola cola--tarjeta';
  raiz.setAttribute('aria-labelledby', `${id}-titulo`);
  raiz.innerHTML =
    '<div class="cola__cabeza"><span class="cola__icono" aria-hidden="true"></span>' +
    `<${h} class="titulo-3 cola__titulo" id="${id}-titulo"></${h}></div>` +
    '<div class="cola__escena" aria-hidden="true"><ol class="cola__fichas"></ol><span class="cola__nube"></span></div>' +
    '<p class="cola__estado"><span class="cola__estado-icono" aria-hidden="true"></span><span class="cola__estado-texto"></span></p>' +
    '<div class="barra-progreso cola__progreso" hidden>' +
    `<progress max="1" value="0" aria-labelledby="${id}-avance"></progress>` +
    `<span class="cola__progreso-texto" id="${id}-avance"></span></div>` +
    `<button type="button" class="boton boton--secundario cola__ver" aria-haspopup="dialog">${icono('ojo')}<span>Ver la lista</span></button>`;
  const el = {
    icono: raiz.querySelector('.cola__icono'),
    titulo: raiz.querySelector('.cola__titulo'),
    fichas: raiz.querySelector('.cola__fichas'),
    nube: raiz.querySelector('.cola__nube'),
    estado: raiz.querySelector('.cola__estado'),
    avance: raiz.querySelector('.cola__progreso'),
    ver: raiz.querySelector('.cola__ver'),
  };
  let previo = { n: null, estado: null, nube: null };
  let ultimo = null;
  const quitarTarjeta = coord.registrarTarjeta(raiz);
  const temporizadores = new Set();
  const despues = (fn, ms) => {
    const t = setTimeout(() => {
      temporizadores.delete(t);
      fn();
    }, ms);
    temporizadores.add(t);
  };

  el.ver.addEventListener('click', () => abrirPanel(coord, describir, el.ver));

  function pintarTitulo(n) {
    if (!n) {
      el.titulo.textContent = 'Todo sincronizado';
      return;
    }
    const numero = document.createElement('span');
    numero.className = 'cola__n';
    numero.textContent = String(n);
    const resto = actividades(n).replace(/^\d+ /, '');
    el.titulo.replaceChildren(numero, ` ${resto} en este cel, ${pendientesDe(n)} de sincronizar`);
    if (previo.n !== null && n !== previo.n) reanimar(numero, 'cola__n--cambia');
  }

  /** Coloca las fichas en su lugar (0 = la siguiente en subir, junto a la nube). */
  function pintarFichas(items) {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const paso = PASO_FICHA_REM * rem;
    const cabe = Math.max(1, Math.floor((el.fichas.clientWidth + (paso - 2.125 * rem)) / paso));
    const sobran = items.length > cabe ? items.length - (cabe - 1) : 0;
    const visibles = items.slice(0, sobran ? cabe - 1 : cabe);
    const actuales = new Map();
    for (const li of el.fichas.querySelectorAll('.cola-ficha:not(.cola-ficha--sube)')) actuales.set(li.dataset.id, li);
    visibles.forEach((evento, k) => {
      let li = actuales.get(evento.id);
      if (li) actuales.delete(evento.id);
      else {
        li = document.createElement('li');
        li.className = 'cola-ficha';
        li.dataset.id = evento.id;
        li.innerHTML = `<span class="cola-ficha__cara">${icono(iconoDe(evento))}</span>`;
        li.style.setProperty('--slot', String(k));
        el.fichas.append(li);
        reanimar(li, 'cola-ficha--llega');
      }
      li.style.setProperty('--slot', String(k));
    });
    for (const li of actuales.values()) li.remove();
    let mas = el.fichas.querySelector('.cola__mas');
    if (sobran) {
      if (!mas) {
        mas = document.createElement('li');
        mas.className = 'cola__mas';
        el.fichas.append(mas);
      }
      mas.textContent = `+${sobran}`;
      mas.style.setProperty('--slot', String(visibles.length));
    } else {
      mas?.remove();
    }
  }

  /** La ficha de la actividad que acaba de subir vuela a la nube. */
  function despegar(evento) {
    const li = el.fichas.querySelector(`.cola-ficha[data-id="${CSS.escape(String(evento?.id ?? ''))}"]`);
    if (!li) return;
    if (movimientoReducido()) {
      li.remove();
      return;
    }
    const a = li.getBoundingClientRect();
    const b = el.nube.getBoundingClientRect();
    li.style.setProperty('--dx', `${Math.round(b.left + b.width / 2 - (a.left + a.width / 2))}px`);
    li.style.setProperty('--dy', `${Math.round(b.top + b.height / 2 - (a.top + a.height / 2))}px`);
    li.classList.add('cola-ficha--sube');
    despues(() => {
      li.remove();
      reanimar(el.nube, 'cola__nube--recibe');
    }, VUELO_MS);
  }

  function actualizar(a) {
    ultimo = a;
    const estado = estadoVisible(a);
    if (a.tipo === 'paso') despegar(a.evento);
    if (estado !== previo.estado) {
      raiz.dataset.estado = estado;
      el.icono.innerHTML = iconoCabeza(estado);
    }
    raiz.dataset.red = a.enLinea ? 'con' : 'sin';
    raiz.dataset.pendientes = String(a.pendientes);
    if (a.pendientes !== previo.n || estado !== previo.estado) pintarTitulo(a.pendientes);
    const nube = varianteNube(a);
    if (nube !== previo.nube) {
      el.nube.dataset.variante = nube;
      el.nube.innerHTML = nubeSVG(nube);
    }
    pintarEstado(el.estado, a);
    pintarAvance(el.avance, a);
    pintarFichas(a.lista || []);
    if (a.tipo === 'fin' && a.listo) reanimar(raiz, 'cola--celebra');
    previo = { n: a.pendientes, estado, nube };
  }

  // Si cambia el ancho (giro del cel, letra más grande), caben más o menos fichas.
  let observador = null;
  if (typeof ResizeObserver === 'function') {
    let ancho = 0;
    observador = new ResizeObserver(() => {
      const nuevo = el.fichas.clientWidth;
      if (nuevo !== ancho && ultimo) {
        ancho = nuevo;
        pintarFichas(coord.lista());
      }
    });
    observador.observe(el.fichas);
  }

  function destruir() {
    observador?.disconnect();
    temporizadores.forEach(clearTimeout);
    temporizadores.clear();
    quitarTarjeta();
    raiz.remove();
  }

  return { raiz, disparador: el.ver, actualizar, destruir };
}

/* ------------------------------------------------------------------ */
/* Panel con la lista (1 clic desde la cola)                           */
/* ------------------------------------------------------------------ */

let panelAbierto = null;

/**
 * Abre el panel con las actividades pendientes (tipo y hora). Se actualiza en vivo y, al
 * cerrarse, devuelve el foco a quien lo abrió. Solo hay un panel a la vez.
 */
function abrirPanel(coord, describir, disparador) {
  if (panelAbierto?.isConnected) {
    panelAbierto.querySelector('[data-titulo]')?.focus();
    return panelAbierto;
  }
  const id = nuevoId('cola-panel');
  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialogo cola-panel';
  dialogo.setAttribute('aria-labelledby', `${id}-titulo`);
  dialogo.innerHTML = String(html`<div class="pila cola-panel__cuerpo">
      <div class="cola-panel__cabeza">
        <span class="cola__nube" aria-hidden="true"></span>
        <h2 class="titulo-2" id="${id}-titulo" tabindex="-1" data-titulo>Guardado en este cel</h2>
      </div>
      <p class="cola-panel__resumen"></p>
      <p class="cola__estado"><span class="cola__estado-icono" aria-hidden="true"></span><span class="cola__estado-texto"></span></p>
      <div class="barra-progreso cola__progreso" hidden>
        <progress max="1" value="0" aria-labelledby="${id}-avance"></progress>
        <span class="cola__progreso-texto" id="${id}-avance"></span>
      </div>
      <ol class="cola-panel__lista" aria-label="Actividades pendientes de sincronizar"></ol>
      <p class="cola-panel__vacio" hidden>${crudo(icono('exito'))}<span>Todo sincronizado. Tu maestra o maestro ya ve tu avance.</span></p>
      <p class="solo-lector" role="status" aria-live="polite" aria-atomic="true" data-voz></p>
      <form method="dialog" class="cola-panel__pie">
        <button type="submit" class="boton boton--primario boton--bloque" value="cerrar">Cerrar</button>
      </form>
    </div>`);
  const el = {
    nube: dialogo.querySelector('.cola__nube'),
    resumen: dialogo.querySelector('.cola-panel__resumen'),
    estado: dialogo.querySelector('.cola__estado'),
    avance: dialogo.querySelector('.cola__progreso'),
    lista: dialogo.querySelector('.cola-panel__lista'),
    vacio: dialogo.querySelector('.cola-panel__vacio'),
    voz: dialogo.querySelector('[data-voz]'),
  };
  const temporizadores = new Set();
  let ultimaVoz = 0;

  function fila(evento) {
    const d = normalizarDescripcion(describir(evento), evento);
    const hora = formatearHora(evento.fecha);
    const li = document.createElement('li');
    li.className = 'cola-panel__item';
    li.dataset.id = evento.id;
    li.innerHTML = String(html`<span class="cola-panel__icono" aria-hidden="true">${crudo(icono(iconoDe(evento)))}</span>
      <span class="cola-panel__texto"><span class="cola-panel__tipo">${d.tipo}</span>${d.detalle
        ? html`<span class="cola-panel__detalle">${d.detalle}</span>`
        : ''}</span>${hora.texto
      ? html`<span class="solo-lector">, guardada: </span><time class="cola-panel__hora" datetime="${hora.iso}">${hora.texto}</time>`
      : ''}`);
    return li;
  }

  let primeraVez = true;

  function pintarFilas(items) {
    const actuales = new Map();
    for (const li of el.lista.querySelectorAll('.cola-panel__item:not(.cola-panel__item--sube)')) actuales.set(li.dataset.id, li);
    let antes = null;
    for (const evento of items) {
      let li = actuales.get(evento.id);
      if (li) actuales.delete(evento.id);
      else {
        li = fila(evento);
        if (!primeraVez) reanimar(li, 'cola-panel__item--llega');
      }
      const lugar = antes ? antes.nextElementSibling : el.lista.firstElementChild;
      if (li !== lugar) el.lista.insertBefore(li, lugar);
      antes = li;
    }
    for (const li of actuales.values()) li.remove();
    primeraVez = false;
  }

  function despegar(evento) {
    const li = el.lista.querySelector(`.cola-panel__item[data-id="${CSS.escape(String(evento?.id ?? ''))}"]`);
    if (!li) return;
    if (movimientoReducido()) {
      li.remove();
      return;
    }
    li.style.height = `${li.offsetHeight}px`;
    li.classList.add('cola-panel__item--sube');
    requestAnimationFrame(() => {
      li.style.height = '0px';
    });
    const t = setTimeout(() => {
      temporizadores.delete(t);
      li.remove();
    }, 480);
    temporizadores.add(t);
  }

  function actualizar(a) {
    dialogo.dataset.estado = estadoVisible(a);
    if (a.tipo === 'paso') despegar(a.evento);
    const variante = varianteNube(a);
    if (el.nube.dataset.variante !== variante) {
      el.nube.dataset.variante = variante;
      el.nube.innerHTML = nubeSVG(variante);
    }
    el.resumen.textContent = a.pendientes
      ? `${actividades(a.pendientes)} en este cel, ${pendientesDe(a.pendientes)} de sincronizar.`
      : 'No hay nada pendiente.';
    pintarEstado(el.estado, a);
    pintarAvance(el.avance, a);
    pintarFilas(a.lista || []);
    el.vacio.hidden = a.pendientes > 0;
  }

  /** Región viva del panel: con el <dialog> abierto, #anuncios queda inerte. */
  function voz(texto) {
    const n = ++ultimaVoz;
    el.voz.textContent = '';
    const t = setTimeout(() => {
      temporizadores.delete(t);
      if (n === ultimaVoz) el.voz.textContent = texto;
    }, 60);
    temporizadores.add(t);
  }

  const quitarOyente = coord.suscribir((a) => actualizar(a));
  const quitarVoz = coord.registrarVoz(voz);
  actualizar({ tipo: 'panel', ...coord.estado(), lista: coord.lista() });

  dialogo.addEventListener('close', () => {
    quitarOyente();
    quitarVoz();
    temporizadores.forEach(clearTimeout);
    dialogo.remove();
    if (panelAbierto === dialogo) panelAbierto = null;
    if (disparador?.isConnected) disparador.focus();
  });
  // Tocar afuera del panel (en el fondo oscuro) también lo cierra.
  dialogo.addEventListener('click', (evento) => {
    if (evento.target !== dialogo) return;
    const r = dialogo.getBoundingClientRect();
    const dentro = evento.clientX >= r.left && evento.clientX <= r.right && evento.clientY >= r.top && evento.clientY <= r.bottom;
    if (!dentro) dialogo.close();
  });

  document.body.append(dialogo);
  panelAbierto = dialogo;
  if (typeof dialogo.showModal === 'function') dialogo.showModal();
  else dialogo.setAttribute('open', '');
  dialogo.querySelector('[data-titulo]')?.focus();
  return dialogo;
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Monta la cola de sincronización.
 * @param {HTMLElement} contenedor
 * @param {{ store: object, red: object, compacta?: boolean,
 *   describir?: (evento: object) => ({ tipo: string, detalle?: unknown } | string),
 *   nivelTitulo?: number, onCambio?: (estado: object) => void }} opciones
 * @returns {{ destruir(): void, abrirPanel(): HTMLDialogElement, estado(): object }}
 */
export function montarCola(contenedor, { store, red, compacta = false, describir, nivelTitulo = 2, onCambio } = {}) {
  if (!contenedor || !store) throw new Error('montarCola necesita un contenedor y el store del alumno');
  const coord = coordinadorDe(store, red);
  const opciones = { coord, describir: typeof describir === 'function' ? describir : describirEvento, nivelTitulo };
  const vista = compacta ? crearCompacta(opciones) : crearTarjeta(opciones);
  contenedor.append(vista.raiz);
  let vivo = true;
  const quitar = coord.suscribir((a) => {
    if (!vivo) return;
    vista.actualizar(a);
    if (typeof onCambio === 'function') {
      const { pendientes, sincronizando, paso, total, enLinea, fallo } = a;
      try {
        onCambio({ pendientes, sincronizando, paso, total, enLinea, fallo });
      } catch (error) {
        console.error('[tecu]', error);
      }
    }
  });
  vista.actualizar({ tipo: 'montaje', ...coord.estado(), lista: coord.lista() });
  return {
    destruir() {
      if (!vivo) return;
      vivo = false;
      quitar();
      vista.destruir();
    },
    abrirPanel: () => abrirPanel(coord, opciones.describir, vista.disparador),
    estado: () => coord.estado(),
  };
}
