/**
 * Vista del estudiante: todo el recorrido de una o un estudiante en su cel.
 *
 * Pantallas (state.pantalla): inicio · diagnostico · resultado · ruta · dominado ·
 * tecu (chat) · descargas · ajustes.
 *
 * Patrón heredado de la maqueta: `state` + `render()` + delegación con data-act.
 * El cuaderno y la balanza son componentes montados: mientras la pantalla siga en
 * el mismo ejercicio, su nodo se conserva entre renders (no se pierde lo escrito).
 *
 * Todo funciona sin internet: el diagnóstico corre en el cel (js/core/engine.js) y
 * cada evento se guarda en el dispositivo (store) hasta que hay conexión.
 *
 * API de control para el modo pitch (postMessage del mismo origen):
 *   { tecu: 'control', cmd: 'reproducirDiagnostico', items: string[][], rapido?: boolean }
 *   { tecu: 'control', cmd: 'reproducirPractica' }   // resuelve bien el ejercicio de práctica actual
 *   { tecu: 'control', cmd: 'avanzarRuta' }          // completa bien la actividad actual y avanza
 *   { tecu: 'control', cmd: 'simularRed', sinInternet: boolean }
 *   { tecu: 'control', cmd: 'irA', pantalla: string }
 *   { tecu: 'control', cmd: 'reiniciar' }
 * Después de cada render responde a window.parent con
 *   { tecu: 'estado', alumno, pantalla, pendientes, ruta, actividad, enLinea, dominado, ejercicio }.
 */
import { TIPOS, analizarProcedimiento, bonito, ecuacion, pasosSolucion } from '../core/engine.js';
import { explicarError, nombreError, pistasPara, preguntaOrientadora, rellenar, respuestaTecu } from '../core/textos.js';
import { ACTIVIDADES, construirRuta, otraComprobacion, resumirDiagnostico } from '../core/ruta.js';
import {
  anunciar,
  attr,
  aviso,
  confirmar,
  crudo,
  delegar,
  enfocarTitulo,
  html,
  movimientoReducido,
  renderConFoco,
} from '../ui/dom.js';
import { tecuSVG } from '../ui/tecu.js';
import { montarBalanza } from '../ui/balanza.js';
import { montarCuaderno } from '../ui/cuaderno.js';
import * as Iconos from '../ui/iconos.js';
import { crearStore } from '../data/store.js';
import * as Paquete from '../data/paquete.js';
import { alCambiarPreferencias, guardarPreferencias, leerPreferencias } from '../services/preferencias.js';
import { crearRed } from '../services/red.js';

/* ------------------------------------------------------------------ */
/* Constantes                                                          */
/* ------------------------------------------------------------------ */

const NOMBRES = { ana: 'Ana', luis: 'Luis' };

const PANTALLAS = ['inicio', 'diagnostico', 'resultado', 'ruta', 'dominado', 'tecu', 'descargas', 'ajustes'];
const DE_APRENDER = new Set(['diagnostico', 'resultado', 'ruta', 'dominado']);

const NAV = [
  { id: 'inicio', texto: 'Inicio', icono: 'inicio' },
  { id: 'aprender', texto: 'Aprender', icono: 'aprender' },
  { id: 'tecu', texto: 'Tecu', icono: 'tecu' },
  { id: 'descargas', texto: 'Descargas', icono: 'descargas' },
  { id: 'ajustes', texto: 'Ajustes', icono: 'ajustes' },
];

const ACTIVIDAD = {
  pregunta: { nombre: 'Pregunta de Tecu', corto: 'Pregunta', icono: 'tecu' },
  visual: { nombre: 'Balanza', corto: 'Balanza', icono: 'equilibrio' },
  practica: { nombre: 'Práctica con pistas', corto: 'Práctica', icono: 'aprender' },
  comprobacion: { nombre: 'Comprobación sin ayuda', corto: 'Comprobación', icono: 'estrella' },
};

const TAMANOS_TEXTO = [
  { valor: 'normal', texto: 'Normal' },
  { valor: 'grande', texto: 'Grande' },
  { valor: 'muy-grande', texto: 'Muy grande' },
];

/** Preguntas rápidas para el chat (se ajustan a la ruta del estudiante). */
const SUGERENCIA_POR_ERROR = {
  SIGNO_TRANSPOSICION: '¿Por qué cambia el signo cuando pasa al otro lado?',
  INVERSA_EQUIVOCADA: '¿Cuándo tengo que dividir?',
  ARITMETICA: '¿Cómo sé si mi respuesta está bien?',
  TERMINOS_NO_SEMEJANTES: '¿Puedo juntar la x con los números?',
  UN_SOLO_LADO: '¿Por qué hago lo mismo en los dos lados?',
  SIGNO_NEGATIVO: '¿Qué hago con los números negativos?',
};
const SUGERENCIAS_BASE = ['¿Qué es la x?', '¿Cómo sé si mi respuesta está bien?', '¿Cuándo tengo que dividir?'];

/** Cómo se describe la balanza de cada ruta en la tarjeta del resultado. */
const BALANZA_POR_MODO = {
  quitar: 'quita pesas de los dos platillos',
  repartir: 'reparte las pesas en grupos iguales',
  separar: 'junta cajas con cajas y pesas con pesas',
  comprobar: 'busca el valor que deja la balanza derecha',
};

const PASOS_TOTALES = 8; // 4 ejercicios de diagnóstico + 4 actividades de la ruta
const MAX_CHAT = 60;
const VERSION_PROGRESO = 1;

/** Iconos de respaldo (trazos 24×24) por si js/ui/iconos.js no tiene alguno. */
const ICONOS_RESPALDO = {
  inicio: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  aprender: '<path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2z"/><path d="M22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>',
  tecu: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/>',
  descargas: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/>',
  ajustes:
    '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/><path d="M8.8 16a5 5 0 0 1 6.4 0"/><path d="M12 19.5h.01"/>',
  'sin-wifi':
    '<path d="M3 3l18 18"/><path d="M8.8 16a5 5 0 0 1 6.4 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 5-2.4"/><path d="M2.5 9a14 14 0 0 1 4.6-2.9"/><path d="M12 19.5h.01"/>',
  sincronizar:
    '<path d="M20 11a8 8 0 0 0-14.3-4.7L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.7L20 16"/><path d="M20 20v-4h-4"/>',
  candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  estrella: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  atras: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  enviar: '<path d="M4 12l16-8-6 16-2.5-5.5z"/><path d="M11.5 12.5L20 4"/>',
  refrescar: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/>',
  basura: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  alerta: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  dormido: '<path d="M4 7h6l-6 7h6"/><path d="M13 13h5l-5 6h5"/><path d="M15 3.5h4l-4 4h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  signo: '<path d="M4 12h7M7.5 8.5v7"/><path d="M14 12h6"/>',
  inversa: '<path d="M5 12h14"/><path d="M12 6.5h.01M12 17.5h.01"/>',
  cuenta:
    '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  terminos: '<rect x="3" y="8" width="8" height="8" rx="1"/><circle cx="17" cy="12" r="4"/>',
  equilibrio: '<path d="M12 4v16M7 20h10M4 7h16"/><path d="M4 7l-2.5 6h5zM20 7l-2.5 6h5z"/>',
  negativo: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
  pregunta: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4V14"/><path d="M12 17h.01"/>',
  punto: '<circle cx="12" cy="12" r="3"/>',
};

/* ------------------------------------------------------------------ */
/* Utilidades puras                                                    */
/* ------------------------------------------------------------------ */

/** Icono decorativo (lo acompaña siempre un texto). Usa iconos.js y, si no lo tiene, el respaldo. */
function ico(nombre, clase = '') {
  let svg = '';
  try {
    const r = typeof Iconos.icono === 'function' ? Iconos.icono(nombre) : '';
    const s = r === null || r === undefined ? '' : String(r);
    if (s.includes('<svg')) svg = s;
  } catch {
    svg = '';
  }
  if (!svg) {
    const trazos = ICONOS_RESPALDO[nombre] || ICONOS_RESPALDO.punto;
    svg =
      '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" ' +
      `stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${trazos}</svg>`;
  }
  return crudo(`<span class="est-ico${clase ? ` ${clase}` : ''}" aria-hidden="true">${svg}</span>`);
}

/** Tecu en SVG (si el módulo falla, no rompe la pantalla). */
function tecu(estado, tamano, { etiqueta, decorativo = false } = {}) {
  try {
    const opciones = { estado, tamano, decorativo };
    if (etiqueta) opciones.etiqueta = etiqueta;
    return crudo(tecuSVG(opciones));
  } catch (error) {
    console.error(error);
    return crudo('');
  }
}

/** Tecu con su burbuja de diálogo. */
function tecuDice(estado, contenido, { tamano = 64, clase = '' } = {}) {
  return html`<div class="est-tecu-dice${clase ? ` ${clase}` : ''}">
    <div class="est-tecu-dice__tecu">${tecu(estado, tamano, { decorativo: true })}</div>
    <div class="burbuja burbuja--tecu est-tecu-dice__burbuja">
      <span class="solo-lector">Tecu dice: </span>${contenido}
    </div>
  </div>`;
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const pausa = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
const idMensaje = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function analizar(ejercicio, renglones) {
  return analizarProcedimiento([ejercicio, ...(renglones || [])]);
}

/** Estado del motor → campo `resultado` del evento. */
function resultadoEvento(estado) {
  if (estado === 'correcto' || estado === 'error' || estado === 'incompleto') return estado;
  return 'sin_entender';
}

/** Error del motor → forma corta del contrato de eventos. */
function errorEvento(analisis) {
  const e = analisis?.estado === 'error' ? analisis.error : null;
  if (!e) return null;
  return {
    tipo: e.tipo,
    renglon: e.renglon,
    variante: e.detalle?.variante ?? null,
    texto: e.texto,
    anterior: e.anterior,
    confianza: e.confianza,
  };
}

/** Copia apta para JSON (quita funciones, nodos y ciclos). */
function copiaPlana(valor) {
  try {
    return valor === undefined ? null : JSON.parse(JSON.stringify(valor));
  } catch {
    return null;
  }
}

function diagnosticoNuevo() {
  return { items: [], pendienteSiguiente: false, remontar: 0 };
}

function progresoNuevo() {
  return {
    v: VERSION_PROGRESO,
    pantalla: 'inicio',
    diagnostico: diagnosticoNuevo(),
    ruta: null,
    dominado: false,
    chat: [],
    borrador: null,
  };
}

/** Valida lo que viene del almacenamiento: si algo no cuadra, empieza limpio. */
function normalizarProgreso(p, totalDiag) {
  if (!p || typeof p !== 'object' || p.v !== VERSION_PROGRESO) return progresoNuevo();
  const base = progresoNuevo();
  const d = p.diagnostico && Array.isArray(p.diagnostico.items) ? p.diagnostico : base.diagnostico;
  const items = d.items
    .filter((it) => it && typeof it.ejercicio === 'string' && Array.isArray(it.renglones))
    .slice(0, totalDiag);
  const diagnostico = {
    items,
    pendienteSiguiente: Boolean(d.pendienteSiguiente) && items.length > 0,
    remontar: Number(d.remontar) || 0,
  };
  let ruta = p.ruta && typeof p.ruta === 'object' ? p.ruta : null;
  const rutaValida =
    ruta &&
    ACTIVIDADES.includes(ruta.actividad) &&
    Array.isArray(ruta.practica?.ejercicios) &&
    ruta.practica.ejercicios.length > 0 &&
    typeof ruta.comprobacion?.ecuacion === 'string';
  if (!rutaValida) ruta = null;
  return {
    ...base,
    pantalla: PANTALLAS.includes(p.pantalla) ? p.pantalla : 'inicio',
    diagnostico,
    ruta,
    dominado: Boolean(p.dominado) && Boolean(ruta),
    chat: Array.isArray(p.chat) ? p.chat.filter((m) => m && typeof m.texto === 'string').slice(-MAX_CHAT) : [],
    borrador: p.borrador && Array.isArray(p.borrador.renglones) ? p.borrador : null,
  };
}

/* ------------------------------------------------------------------ */
/* Vista                                                               */
/* ------------------------------------------------------------------ */

/**
 * Monta la vista del estudiante en `raiz`.
 * @param {HTMLElement} raiz
 * @param {{alumno?: string, nombre?: string, embebido?: boolean}} [opciones]
 * @returns {Promise<void>}
 */
export async function montarEstudiante(raiz, { alumno = 'invitado', nombre, embebido = false } = {}) {
  const nombreVisible = nombre || NOMBRES[alumno] || 'Invitado';
  raiz.className = embebido ? 'app app--estudiante app--embebido' : 'app app--estudiante';
  raiz.innerHTML = '<p class="cargando" role="status">Abriendo tus lecciones…</p>';

  const store = crearStore(alumno);
  const red = crearRed(alumno);

  let pack;
  let paqueteInfo;
  try {
    const cargado = await Paquete.cargarPaquete();
    pack = cargado.pack;
    paqueteInfo = { bytes: cargado.bytes, kb: cargado.kb, version: pack?.version || '' };
  } catch (error) {
    console.error(error);
    raiz.innerHTML = String(html`<main id="contenido" class="contenido" tabindex="-1">
      <div class="pantalla pila est-error-carga" role="alert">
        <h1 class="titulo-1">No pude abrir tus lecciones</h1>
        <p>Tecu necesita abrirse una vez con internet para guardar las lecciones en tu cel.
          Revisa tu conexión y vuelve a intentarlo.</p>
        <button type="button" class="boton boton--primario" data-recargar>Volver a intentar</button>
      </div>
    </main>`);
    raiz.querySelector('[data-recargar]')?.addEventListener('click', () => location.reload());
    return;
  }

  const totalDiag = pack.diagnostico.length;
  const ecuacionesDiag = pack.diagnostico.map((d) => d.ecuacion);

  const guardadoInicial = leerProgresoGuardado();
  let prog = normalizarProgreso(guardadoInicial, totalDiag);
  /** ¿Este cel ya guardó progreso? (para distinguir un reinicio hecho desde otra pestaña) */
  let progresoGuardado = guardadoInicial != null;

  const state = {
    pantalla: 'inicio',
    red: leerRed(),
    sync: null, // { i, total } mientras se sincroniza
    prefs: leerPreferencias(),
    paquete: paqueteInfo,
    actualizando: false,
    mensaje: null, // { clave, texto }: renglón que no se entendió, junto al cuaderno
    repaso: null, // 'pregunta' | 'visual' cuando repasa una actividad ya hecha
    repasoCompleto: false,
    balanzaConInstruccion: false,
    balanzaConCierre: false,
    abrirPendientes: false,
    borradorChat: '',
    reproduciendo: false,
  };

  /** Componente montado (cuaderno o balanza) que sobrevive a los renders. */
  let montado = null;
  let generacion = 0; // cambia para cancelar una reproducción del modo pitch
  let ultimaClave = null;
  let ultimaPantalla = null;
  let primerRender = true;
  const cacheAnalisis = new Map();

  /* ---------------- Esqueleto ---------------- */

  raiz.innerHTML = String(html`
    <header class="barra-superior est-barra"></header>
    <main id="contenido" class="contenido est-contenido" tabindex="-1"></main>
    <nav class="nav-inferior est-nav" aria-label="Principal"></nav>`);
  const barra = raiz.querySelector('.barra-superior');
  const contenido = raiz.querySelector('#contenido');
  const nav = raiz.querySelector('.nav-inferior');
  let htmlBarraPrevio = '';
  let htmlNavPrevio = '';

  /* ---------------- Datos derivados ---------------- */

  function leerProgresoGuardado() {
    try {
      return store.progreso();
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  function leerRed() {
    return { enLinea: Boolean(red.enLinea()), real: Boolean(red.real()), simulada: Boolean(red.simuladaSinInternet()) };
  }

  function contarPendientes() {
    try {
      return store.pendientes().length;
    } catch {
      return 0;
    }
  }

  function dudasPendientes() {
    try {
      return (store.dudas() || []).filter((d) => d && d.pendiente);
    } catch {
      return [];
    }
  }

  function analisisDe(ejercicio, renglones) {
    const clave = JSON.stringify([ejercicio, renglones || []]);
    if (!cacheAnalisis.has(clave)) cacheAnalisis.set(clave, analizar(ejercicio, renglones));
    return cacheAnalisis.get(clave);
  }

  const diag = () => prog.diagnostico;

  function indiceDiag() {
    const d = diag();
    return Math.min(d.pendienteSiguiente ? d.items.length - 1 : d.items.length, totalDiag - 1);
  }

  function diagnosticoTerminado() {
    const d = diag();
    return d.items.length >= totalDiag && !d.pendienteSiguiente;
  }

  /** Tecu se duerme durante la comprobación: el chat queda bloqueado. */
  function chatBloqueado() {
    const r = prog.ruta;
    return Boolean(r && r.empezada && r.actividad === 'comprobacion' && !prog.dominado);
  }

  function destinoAprender() {
    if (prog.dominado) return 'dominado';
    if (prog.ruta) return prog.ruta.empezada ? 'ruta' : 'resultado';
    if (diagnosticoTerminado()) return 'resultado';
    return 'diagnostico';
  }

  function pasosHechos() {
    if (prog.dominado) return PASOS_TOTALES;
    const d = diag();
    let n = d.items.length;
    const r = prog.ruta;
    if (r && r.empezada) n += r.tipo === null ? 3 : ACTIVIDADES.indexOf(r.actividad);
    return Math.min(n, PASOS_TOTALES);
  }

  function infoRuta(tipo) {
    if (tipo === null) {
      return {
        tono: 'verde',
        nombreCorto: 'Comprobación final',
        nombre: 'Comprobación final',
        titulo: 'Demuestra lo que sabes',
        meta: 'Resolver una ecuación sin ayuda.',
        icono: 'estrella',
        visual: null,
      };
    }
    const e = pack.errores[tipo] || pack.errores[TIPOS.NO_CLASIFICADO];
    return {
      tono: e.tono || 'gris',
      nombreCorto: e.nombreCorto,
      nombre: e.nombre,
      titulo: e.ruta.titulo,
      meta: e.ruta.meta,
      icono: e.icono || 'pregunta',
      visual: e.ruta.visual,
    };
  }

  function resumenDiagnostico() {
    return resumirDiagnostico(diag().items.map((it) => ({ analisis: analisisDe(it.ejercicio, it.renglones) })));
  }

  /** El primer error del diagnóstico que es del tipo de la ruta (para que Tecu lo cite). */
  function primerErrorDe(tipo) {
    const items = diag().items;
    for (let i = 0; i < items.length; i++) {
      const a = analisisDe(items[i].ejercicio, items[i].renglones);
      if (a.estado === 'error' && a.error.tipo === tipo) return { error: a.error, ejercicio: i + 1 };
    }
    return null;
  }

  function preguntaDeRuta() {
    const tipo = prog.ruta?.tipo || TIPOS.NO_CLASIFICADO;
    return preguntaOrientadora(tipo, primerErrorDe(tipo), pack);
  }

  function ecuacionesUsadas() {
    const r = prog.ruta;
    const usadas = [...ecuacionesDiag];
    if (r) {
      usadas.push(...r.practica.ejercicios.map((e) => e.ecuacion));
      usadas.push(...(r.comprobacion.usados || []), r.comprobacion.ecuacion);
    }
    return [...new Set(usadas)];
  }

  /* ---------------- Persistencia y eventos ---------------- */

  function guardar() {
    prog.chat = prog.chat.slice(-MAX_CHAT);
    try {
      store.guardarProgreso(prog);
      progresoGuardado = true;
    } catch (error) {
      console.error(error);
    }
  }

  let nuevosDuranteSync = false;

  function registrar(parcial) {
    let evento = null;
    try {
      evento = store.registrar(parcial);
    } catch (error) {
      console.error(error);
    }
    if (sincronizando) nuevosDuranteSync = true;
    renderBarra();
    if (state.red.enLinea) programarSync(false);
    return evento;
  }

  /* ---------------- Conexión y sincronización ---------------- */

  let temporizadorSync = null;
  let sincronizando = false;
  let fallosSync = 0;

  function programarSync(avisar, espera = 700) {
    clearTimeout(temporizadorSync);
    temporizadorSync = setTimeout(() => sincronizar({ avisar }), espera);
  }

  async function sincronizar({ avisar = true } = {}) {
    if (sincronizando || !red.enLinea()) return;
    const total = contarPendientes();
    if (!total) return;
    sincronizando = true;
    nuevosDuranteSync = false;
    state.sync = { i: 0, total };
    renderBarra();
    if (avisar) anunciar(`Sincronizando ${plural(total, 'actividad', 'actividades')}…`);
    let fallo = false;
    try {
      const enviados = await store.sincronizar({
        onPaso: (i, t) => {
          state.sync = { i: Number(i) || 0, total: Number(t) || total };
          renderBarra();
        },
      });
      fallosSync = 0;
      if (avisar && enviados !== 0) aviso('Listo, tu maestra o maestro ya ve tu avance.', { tipo: 'exito' });
    } catch (error) {
      console.error(error);
      fallo = true;
      fallosSync += 1;
      if (avisar) aviso('No se pudo enviar tu avance. Sigue guardado en tu cel y lo intento de nuevo.', { tipo: 'alerta' });
    } finally {
      sincronizando = false;
      state.sync = null;
      renderBarra();
      if (state.pantalla === 'inicio') render();
      if (red.enLinea() && contarPendientes()) {
        if (fallo && fallosSync <= 3) programarSync(false, 4000 * fallosSync);
        else if (!fallo && nuevosDuranteSync) programarSync(false);
      }
    }
  }

  /** Lee el servicio de red y reacciona a los cambios (idempotente). */
  function alCambiarRed() {
    const nuevo = leerRed();
    const antes = state.red;
    if (nuevo.enLinea === antes.enLinea && nuevo.real === antes.real && nuevo.simulada === antes.simulada) return;
    state.red = nuevo;
    renderBarra();
    if (['tecu', 'descargas', 'inicio'].includes(state.pantalla)) render();
    if (!antes.enLinea && nuevo.enLinea) {
      fallosSync = 0;
      sincronizar({ avisar: true });
      contestarDudasPendientes();
    } else if (antes.enLinea && !nuevo.enLinea) {
      aviso('Sin internet. Todo lo que hagas se guarda en tu cel.', { tipo: 'info' });
    }
    notificarPadre();
  }

  function cambiarRed(sinInternet) {
    try {
      red.simular(Boolean(sinInternet));
    } catch (error) {
      console.error(error);
    }
    alCambiarRed();
  }

  /* ---------------- Dudas para Tecu ---------------- */

  function contestarDudasPendientes() {
    if (!red.enLinea()) return;
    const pendientes = dudasPendientes();
    if (!pendientes.length) return;
    const n = pendientes.length;
    prog.chat.push({
      id: idMensaje(),
      de: 'tecu',
      texto: rellenar(pack.tecu.dudaContestada, { n, dudas: n === 1 ? 'duda' : 'dudas' }),
    });
    for (const d of pendientes) {
      const respuesta = respuestaTecu(d.texto, pack);
      try {
        store.contestarDuda(d.id, respuesta);
      } catch (error) {
        console.error(error);
      }
      prog.chat.forEach((m) => {
        if (m.dudaId === d.id) m.pendiente = false;
      });
      prog.chat.push({ id: idMensaje(), de: 'tecu', texto: respuesta, sobre: d.texto });
    }
    guardar();
    aviso(n === 1 ? 'Tecu respondió tu duda' : `Tecu respondió tus ${n} dudas`, { tipo: 'exito' });
    if (state.pantalla === 'tecu') {
      render();
      bajarChat();
    }
  }

  function enviarDuda(texto) {
    const limpio = String(texto || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);
    if (chatBloqueado()) return;
    if (!limpio) {
      anunciar('Escribe tu duda antes de enviarla.');
      contenido.querySelector('#est-chat-entrada')?.focus();
      return;
    }
    const mensaje = { id: idMensaje(), de: 'alumno', texto: limpio };
    prog.chat.push(mensaje);
    if (red.enLinea()) {
      const respuesta = respuestaTecu(limpio, pack);
      prog.chat.push({ id: idMensaje(), de: 'tecu', texto: respuesta });
      registrar({ tipo: 'duda', datos: { texto: limpio, respondida: true } });
      anunciar(`Tecu dice: ${respuesta}`);
    } else {
      let duda = null;
      try {
        duda = store.agregarDuda(limpio);
      } catch (error) {
        console.error(error);
      }
      mensaje.dudaId = duda?.id || null;
      mensaje.pendiente = true;
      prog.chat.push({ id: idMensaje(), de: 'tecu', texto: pack.tecu.sinConexionDuda, reloj: true, dudaId: mensaje.dudaId });
      registrar({ tipo: 'duda', datos: { texto: limpio, respondida: false, dudaId: mensaje.dudaId } });
      anunciar(pack.tecu.sinConexionDuda);
    }
    state.borradorChat = '';
    guardar();
    render();
    bajarChat();
    if (puedeEnfocar()) contenido.querySelector('#est-chat-entrada')?.focus({ preventScroll: true });
  }

  function bajarChat() {
    const ultimo = contenido.querySelector('.est-chat__lista > li:last-child');
    if (ultimo) desplazarA(ultimo, 'final');
  }

  /* ---------------- Navegación ---------------- */

  function resolverPantalla(destino) {
    let p = destino === 'aprender' ? destinoAprender() : destino;
    if (!PANTALLAS.includes(p)) return null;
    if (p === 'diagnostico' && diagnosticoTerminado()) p = destinoAprender();
    if (p === 'resultado' && !prog.ruta && !diagnosticoTerminado()) p = destinoAprender();
    if (p === 'ruta' && !prog.ruta) p = destinoAprender();
    if (p === 'dominado' && !prog.dominado) p = destinoAprender();
    return p;
  }

  /** Navegación pedida por la persona: cancela una reproducción en curso. */
  function ir(destino) {
    if (state.reproduciendo) generacion += 1;
    irInterno(destino);
  }

  function irInterno(destino) {
    const p = resolverPantalla(destino);
    if (!p) return;
    if (p === 'resultado' && !prog.ruta) asignarRuta();
    if (p === 'ruta' && prog.ruta && !prog.ruta.empezada) prog.ruta.empezada = true;
    if (p !== state.pantalla) {
      state.repaso = null;
      state.mensaje = null;
    }
    state.pantalla = p;
    prog.pantalla = p;
    guardar();
    render();
  }

  /* ---------------- Render ---------------- */

  const puedeEnfocar = () => !embebido || document.hasFocus();

  /** Desplaza solo esta ventana (en el pitch no mueve la página que contiene el iframe). */
  function desplazarA(el, donde = 'inicio') {
    if (!el) return;
    const caja = el.getBoundingClientRect();
    const arriba = barra.getBoundingClientRect().height + 8;
    const abajo = nav.getBoundingClientRect().height + 8;
    let y = window.scrollY;
    if (donde === 'final') y += caja.bottom - (window.innerHeight - abajo);
    else y += caja.top - arriba;
    window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
  }

  function enfocar(selector) {
    const el = contenido.querySelector(selector);
    if (!el) return;
    if (puedeEnfocar()) el.focus();
    else desplazarA(el);
  }

  function destruirMontado({ conservarBorrador = true } = {}) {
    if (!montado) return;
    const m = montado;
    montado = null;
    if (conservarBorrador) guardarBorrador(m);
    m.destruido = true;
    try {
      m.instancia?.destruir?.();
    } catch (error) {
      console.error(error);
    }
  }

  function guardarBorrador(m = montado) {
    if (!m || m.tipo !== 'cuaderno' || m.sinBorrador || m.destruido) return;
    let renglones = [];
    try {
      renglones = (m.instancia?.renglones?.() || []).map(String).filter((t) => t.trim());
    } catch {
      renglones = [];
    }
    if (renglones.length) prog.borrador = { clave: m.clave, renglones };
    else if (prog.borrador?.clave === m.clave) prog.borrador = null;
  }

  const VISTAS = {
    inicio: vistaInicio,
    diagnostico: vistaDiagnostico,
    resultado: vistaResultado,
    ruta: vistaRuta,
    dominado: vistaDominado,
    tecu: vistaChat,
    descargas: vistaDescargas,
    ajustes: vistaAjustes,
  };

  function render() {
    const vista = VISTAS[state.pantalla]();
    const claveFoco = `${state.pantalla}|${vista.clave || ''}`;

    // ¿Se conserva el componente montado? Solo si la pantalla sigue en el mismo ejercicio.
    let hostPrevio = null;
    let focoPrevio = null;
    if (montado) {
      if (vista.montaje && vista.montaje.clave === montado.clave) {
        hostPrevio = montado.host;
        if (hostPrevio.contains(document.activeElement)) focoPrevio = document.activeElement;
        hostPrevio.remove();
      } else {
        destruirMontado();
      }
    }

    renderConFoco(contenido, vista.html);

    if (vista.montaje) {
      const lugar = contenido.querySelector('[data-montaje]');
      if (!lugar) {
        if (hostPrevio) destruirMontado();
      } else if (hostPrevio) {
        lugar.replaceWith(hostPrevio);
        if (focoPrevio && document.contains(focoPrevio)) focoPrevio.focus({ preventScroll: true });
      } else {
        montado = vista.montaje.crear(lugar);
      }
    }
    vista.despues?.();

    renderNav();
    renderBarra();

    if (claveFoco !== ultimaClave) {
      const cambioPantalla = state.pantalla !== ultimaPantalla;
      ultimaClave = claveFoco;
      ultimaPantalla = state.pantalla;
      if (!primerRender) {
        if (cambioPantalla) window.scrollTo({ top: 0, behavior: 'auto' });
        if (puedeEnfocar()) enfocarTitulo(contenido);
        else if (!cambioPantalla) desplazarA(contenido.querySelector('[data-titulo]'));
      }
    }
    primerRender = false;
    notificarPadre();
  }

  function renderBarra() {
    const nuevo = String(htmlBarra());
    if (nuevo !== htmlBarraPrevio) {
      htmlBarraPrevio = nuevo;
      renderConFoco(barra, nuevo);
    }
    notificarPadre();
  }

  function renderNav() {
    const nuevo = String(htmlNav());
    if (nuevo === htmlNavPrevio) return;
    htmlNavPrevio = nuevo;
    renderConFoco(nav, nuevo);
  }

  let ultimoEstadoPadre = '';

  function notificarPadre() {
    if (window.parent === window) return;
    const r = prog.ruta;
    const mensaje = {
      tecu: 'estado',
      alumno,
      pantalla: state.pantalla,
      pendientes: contarPendientes(),
      ruta: r ? r.tipo : null,
      actividad: r?.empezada ? r.actividad : null,
      enLinea: state.red.enLinea,
      dominado: prog.dominado,
      ejercicio: state.pantalla === 'diagnostico' ? indiceDiag() + 1 : null,
      sincronizando: Boolean(state.sync),
    };
    const firma = JSON.stringify(mensaje);
    if (firma === ultimoEstadoPadre) return;
    ultimoEstadoPadre = firma;
    try {
      window.parent.postMessage(mensaje, location.origin);
    } catch (error) {
      console.error(error);
    }
  }

  /* ---------------- Barra superior y navegación ---------------- */

  function htmlBarra() {
    const n = contarPendientes();
    const { enLinea, real } = state.red;
    const estadoTecu = !enLinea ? 'sin-senal' : chatBloqueado() ? 'dormido' : 'normal';
    let insignia;
    if (state.sync) {
      const total = state.sync.total || n;
      const i = Math.min(Math.max(state.sync.i, 1), total);
      insignia = html`<span class="est-pendientes" data-estado="sincronizando">
        ${ico('sincronizar', 'est-girando')}<span>Sincronizando ${i} de ${total}…</span></span>`;
    } else {
      const texto = `${n} ${n === 1 ? 'pendiente' : 'pendientes'}`;
      const etiqueta = n ? `${texto} de sincronizar. Ver cuáles` : `${texto}: todo tu avance está sincronizado`;
      insignia = html`<button type="button" class="est-pendientes" data-estado="${n ? 'pendientes' : 'al-dia'}"
        data-act="verPendientes" data-foco="pendientes" aria-label="${etiqueta}">
        ${ico(n ? 'reloj' : 'check')}<span>${texto}</span></button>`;
    }
    return html`
      <div class="est-barra__fila">
        <span class="est-barra__tecu">${tecu(estadoTecu, 36, { decorativo: true })}</span>
        <p class="est-barra__titulo">
          <span class="est-barra__app">Tecu Aprende</span>
          <span class="est-barra__alumno">${nombreVisible}</span>
        </p>
        ${insignia}
      </div>
      <div class="segmentado est-conexion" role="group" aria-label="Conexión a internet">
        <button type="button" data-act="red" data-sin="no" data-foco="red-con" aria-pressed="${enLinea}"
          ${attr('aria-disabled', !real, 'true')} ${attr('aria-describedby', !real, 'est-sin-senal')}
          ${attr('data-explica', !real, 'Tu cel no tiene señal en este momento. En cuanto vuelva, Tecu envía tu avance.')}>
          ${ico('wifi')}<span>Con internet</span></button>
        <button type="button" data-act="red" data-sin="si" data-foco="red-sin" aria-pressed="${!enLinea}">
          ${ico('sin-wifi')}<span>Sin internet</span></button>
      </div>
      ${!real
        ? html`<p class="est-barra__nota" id="est-sin-senal">${ico('alerta')}<span>Tu cel no tiene señal ahora. Todo se guarda aquí.</span></p>`
        : ''}`;
  }

  function htmlNav() {
    const activo = DE_APRENDER.has(state.pantalla) ? 'aprender' : state.pantalla;
    const bloqueado = chatBloqueado();
    return html`${NAV.map((item) => {
      const dormido = item.id === 'tecu' && bloqueado;
      return html`<button type="button" class="nav-inferior__item est-nav__item" data-act="ir" data-pantalla="${item.id}"
        data-foco="nav-${item.id}" ${attr('aria-current', activo === item.id, 'page')}
        ${attr('aria-disabled', dormido, 'true')} ${attr('aria-describedby', dormido, 'est-tecu-dormido')}
        ${attr('data-explica', dormido, 'Tecu está dormido mientras resuelves la comprobación. Cuando termines, vuelve a despertar.')}>
        ${ico(dormido ? 'dormido' : item.icono)}<span class="est-nav__texto">${item.texto}</span>
      </button>`;
    })}
    ${bloqueado ? html`<span id="est-tecu-dormido" class="solo-lector">Tecu está dormido durante la comprobación.</span>` : ''}`;
  }

  /* ---------------- Pantalla: inicio ---------------- */

  function describirEtapa() {
    if (prog.dominado) return { texto: '¡Tema dominado! Lo resolviste sin ayuda.', boton: 'Ver mi logro' };
    const r = prog.ruta;
    if (r && r.empezada) {
      if (r.tipo === null) return { texto: 'Te falta la comprobación final.', boton: 'Continuar' };
      const k = ACTIVIDADES.indexOf(r.actividad);
      return {
        texto: `Ruta «${infoRuta(r.tipo).nombreCorto}» · Paso ${k + 1} de 4: ${ACTIVIDAD[r.actividad].nombre}`,
        boton: 'Continuar',
      };
    }
    if (r) {
      return {
        texto: r.tipo === null ? '¡Tu diagnóstico salió muy bien!' : `Tu ruta está lista: «${infoRuta(r.tipo).nombreCorto}».`,
        boton: 'Continuar',
      };
    }
    if (!diag().items.length) {
      return { texto: 'Empieza con 4 ejercicios para que Tecu sepa cómo ayudarte.', boton: 'Empezar' };
    }
    return { texto: `Diagnóstico: vas en el ejercicio ${indiceDiag() + 1} de ${totalDiag}.`, boton: 'Continuar' };
  }

  function describirEvento(e) {
    const ej = e.ejercicio ? bonito(e.ejercicio) : '';
    switch (e.tipo) {
      case 'diagnostico':
        return `Diagnóstico: ${ej}`;
      case 'ruta':
        return `Tu ruta: ${e.ruta ? nombreError(e.ruta, pack, true) : 'comprobación final'}`;
      case 'pregunta':
        return 'Pregunta de Tecu';
      case 'visual':
        return 'Actividad con la balanza';
      case 'practica':
        return `Práctica: ${ej}`;
      case 'solucion':
        return `Solución vista: ${ej}`;
      case 'comprobacion':
        return `Comprobación: ${ej}`;
      case 'dominio':
        return 'Tema dominado';
      case 'duda':
        return 'Duda para Tecu';
      default:
        return 'Actividad';
    }
  }

  function avisoPendientes(n) {
    const abierto = state.abrirPendientes || Boolean(contenido.querySelector('.est-aviso-pendientes details')?.open);
    let lista = [];
    try {
      lista = store.pendientes();
    } catch {
      lista = [];
    }
    const visibles = lista.slice(-8).reverse();
    const resto = lista.length - visibles.length;
    return html`<section class="est-aviso-pendientes" id="est-aviso-pendientes" tabindex="-1" aria-labelledby="est-pend-titulo">
      <span class="est-aviso-pendientes__icono">${ico('reloj')}</span>
      <div class="est-aviso-pendientes__cuerpo">
        <h2 class="titulo-3" id="est-pend-titulo">${n} ${n === 1 ? 'actividad guardada' : 'actividades guardadas'} en tu cel,
          pendientes de sincronizar</h2>
        <p class="texto-sec">${state.red.enLinea
          ? 'Ya hay internet: se están enviando a tu maestra o maestro.'
          : 'Se envían solas en cuanto haya internet. No se pierde nada.'}</p>
        <details class="est-detalles" ${attr('open', abierto)}>
          <summary>Ver cuáles</summary>
          <ul class="est-lista-pendientes">
            ${visibles.map((e) => html`<li>${describirEvento(e)}</li>`)}
            ${resto > 0 ? html`<li>y ${plural(resto, 'más', 'más')}</li>` : ''}
          </ul>
        </details>
      </div>
    </section>`;
  }

  function vistaInicio() {
    const n = contarPendientes();
    const hechos = pasosHechos();
    const etapa = describirEtapa();
    const materias = Array.isArray(pack.materias) ? pack.materias : [];
    const actual = materias.find((m) => m.disponible) || { nombre: pack.materia, tema: 'Ecuaciones lineales' };
    const proximas = materias.filter((m) => !m.disponible);
    const dudas = dudasPendientes().length;
    state.pendientesMostrados = n;
    return {
      clave: 'inicio',
      html: html`<div class="pantalla pila est-inicio">
        <h1 class="titulo-1" data-titulo>¡Hola, ${nombreVisible}!</h1>
        ${tecuDice(state.red.enLinea ? 'normal' : 'sin-senal', html`<p>${pack.tecu.saludo}</p>`, { tamano: 76 })}
        ${n ? avisoPendientes(n) : ''}
        ${dudas
          ? html`<p class="est-nota">${ico('reloj')}<span>${dudas === 1 ? 'Tienes 1 duda' : `Tienes ${dudas} dudas`}
              esperando señal. Tecu te contesta en cuanto haya internet.</span></p>`
          : ''}
        <section class="tarjeta tarjeta--destacada pila est-materia-actual" aria-labelledby="est-materia-titulo">
          <p class="est-sobretitulo">${pack.grado}</p>
          <h2 class="titulo-2" id="est-materia-titulo">${actual.nombre} · ${actual.tema}</h2>
          <p class="est-etapa">${etapa.texto}</p>
          <div class="barra-progreso est-progreso">
            <progress max="${PASOS_TOTALES}" value="${hechos}" aria-labelledby="est-progreso-texto"></progress>
            <span id="est-progreso-texto" class="texto-sec">Tu avance: ${hechos} de ${PASOS_TOTALES} pasos</span>
          </div>
          <button type="button" class="boton boton--primario boton--bloque" data-act="aprender" data-foco="continuar">
            <span>${etapa.boton}</span>${ico('flecha')}</button>
        </section>
        ${proximas.length
          ? html`<section class="pila est-otras" aria-labelledby="est-otras-titulo">
              <h2 class="titulo-3" id="est-otras-titulo">Otras materias</h2>
              <ul class="est-materias">
                ${proximas.map(
                  (m) => html`<li><button type="button" class="est-materia" aria-disabled="true"
                    data-explica="${m.nombre} llegará en un paquete nuevo. Por ahora puedes aprender ecuaciones.">
                    <span class="est-materia__nombre">${m.nombre}</span>
                    <span class="chip chip--neutro">${ico('reloj')}Próximamente</span></button></li>`,
                )}
              </ul>
            </section>`
          : ''}
      </div>`,
      despues: () => {
        state.abrirPendientes = false;
      },
    };
  }

  /* ---------------- Cuaderno montado ---------------- */

  function montarCuadernoEn(host, { clave, ejercicio, modo, alRevisar }) {
    const conAyudas = modo === 'practica';
    const m = { tipo: 'cuaderno', clave, host, ejercicio, modo, instancia: null, recibidas: 0, alRevisar, destruido: false };
    try {
      m.instancia = montarCuaderno(host, {
        ejercicio,
        modo,
        pack,
        ayudas: conAyudas,
        validarEnVivo: conAyudas,
        onRevisar: (resultado) => {
          m.recibidas += 1;
          setTimeout(() => {
            if (!m.destruido) alRevisar(resultado, m);
          }, 0);
        },
        onPista: (nivel) => {
          m.pistas = Math.max(m.pistas || 0, Number(nivel) || 0);
        },
        onSolucion: () => setTimeout(() => alPedirSolucion(m), 0),
      });
    } catch (error) {
      console.error(error);
      host.innerHTML = String(html`<p class="vacio">No pude abrir el cuaderno. Recarga la página para intentarlo de nuevo.</p>`);
    }
    // Si se había quedado a medias (navegó a otra pantalla o recargó), recupera lo escrito.
    const borrador = prog.borrador;
    if (m.instancia && borrador?.clave === clave && borrador.renglones.length) {
      m.restaurando = (async () => {
        for (const texto of borrador.renglones) {
          if (m.destruido) return;
          try {
            await m.instancia.escribirRenglon(texto, { animado: false });
          } catch (error) {
            console.error(error);
          }
        }
      })();
    }
    return m;
  }

  function renglonesDe(resultado, m) {
    let renglones = Array.isArray(resultado?.renglones) ? resultado.renglones : null;
    if (!renglones) {
      try {
        renglones = m?.instancia?.renglones?.() || [];
      } catch {
        renglones = [];
      }
    }
    return renglones.map((t) => String(t ?? '').trim()).filter(Boolean);
  }

  /** Revisa el cuaderno montado como si se tocara «Revisar» (modo pitch). */
  async function revisarMontado(m = montado) {
    if (!m?.instancia?.revisar) return null;
    const antes = m.recibidas;
    let resultado = null;
    try {
      resultado = await m.instancia.revisar();
    } catch (error) {
      console.error(error);
    }
    await pausa(0);
    if (m.recibidas === antes && !m.destruido) m.alRevisar(resultado || { renglones: renglonesDe(null, m) }, m);
    await pausa(30);
    return resultado;
  }

  function textoSinEntender(analisis) {
    if (analisis.estado === 'vacio') return 'Escribe al menos un renglón antes de revisar.';
    const donde = analisis.renglon ? `el renglón ${analisis.renglon}` : 'un renglón';
    return `No entendí ${donde}: ${analisis.mensaje || 'revisa cómo está escrito.'} Corrígelo y vuelve a revisar.`;
  }

  function avisarEscritura(clave, analisis) {
    const texto = textoSinEntender(analisis);
    state.mensaje = { clave, texto };
    render();
    anunciar(texto, { urgente: true });
  }

  function mensajeEscritura(clave) {
    if (state.mensaje?.clave !== clave) return '';
    return html`<p class="est-mensaje" data-estado="alerta">${ico('alerta')}<span>${state.mensaje.texto}</span></p>`;
  }

  /** Texto de Tecu después de revisar un procedimiento. */
  function retroRevision(analisis, contexto, ejercicio) {
    if (analisis.estado === 'correcto') {
      return {
        estado: 'ok',
        tecu: 'feliz',
        icono: 'check',
        titulo: '¡Correcto!',
        texto:
          contexto === 'diagnostico'
            ? pack.tecu.diagnosticoBien
            : 'Llegaste a la respuesta y cada renglón conserva la solución. ¡Muy bien!',
      };
    }
    if (analisis.estado === 'error') {
      const explicacion = explicarError(analisis.error, pack, 'alumno');
      return {
        estado: analisis.error.tipo === TIPOS.NO_CLASIFICADO ? 'revisar' : 'error',
        tecu: 'atento',
        icono: 'alerta',
        titulo: contexto === 'comprobacion' ? 'Todavía no' : `Revisa el renglón ${analisis.error.renglon}`,
        texto:
          contexto === 'practica'
            ? `${explicacion} Corrige desde ese renglón y vuelve a revisar.`
            : contexto === 'comprobacion'
              ? `${pack.tecu.noDominado} ${explicacion}`
              : explicacion,
      };
    }
    if (analisis.estado === 'incompleto') {
      let texto = 'Vas bien, pero todavía no dejas la x sola.';
      if (contexto === 'practica' && ejercicio) {
        try {
          const ultimo = analisis.renglones.slice(1).map((r) => r.texto);
          texto += ` ${pistasPara(ejercicio, ultimo, pack).pistas[0]}`;
        } catch {
          texto += ' Si te atoras, toca «Pista».';
        }
      } else if (contexto === 'diagnostico') {
        texto += ' No pasa nada: lo trabajamos en tu ruta.';
      } else if (contexto === 'comprobacion') {
        texto = `${pack.tecu.noDominado} Te faltó terminar: la x todavía no está sola.`;
      }
      return { estado: 'revisar', tecu: 'atento', icono: 'info', titulo: 'Te faltó terminar', texto };
    }
    return { estado: 'revisar', tecu: 'pensando', icono: 'info', titulo: 'No entendí un renglón', texto: textoSinEntender(analisis) };
  }

  function cajaRetro(retro, { titular = true } = {}) {
    return html`<section class="diagnostico diagnostico--${retro.estado} est-retro" data-estado="${retro.estado}"
      aria-labelledby="est-retro-titulo">
      ${tecuDice(
        retro.tecu,
        html`<h2 class="titulo-3 est-retro__titulo" id="est-retro-titulo" ${attr('data-titulo', titular)}>
            ${ico(retro.icono)}<span>${retro.titulo}</span></h2>
          <p>${retro.texto}</p>`,
        { tamano: 64 },
      )}
    </section>`;
  }

  /** Procedimiento ya revisado, de solo lectura, con el renglón del error señalado. */
  function vistaProcedimiento(analisis, titulo = 'Tu procedimiento') {
    const filas = analisis.renglones || [];
    const nError = analisis.estado === 'error' ? analisis.error.renglon : analisis.estado === 'sin_entender' ? analisis.renglon : null;
    return html`<figure class="est-proc">
      <figcaption class="est-proc__titulo">${titulo}</figcaption>
      <ol class="est-proc__lista">
        ${filas.map((r, k) => {
          const n = k + 1;
          if (k === 0) {
            return html`<li class="est-proc__renglon" data-estado="enunciado">
              <span class="est-proc__n"><span class="solo-lector">Renglón </span>${n}</span>
              <span class="math est-proc__texto">${bonito(r.texto)}</span>
              <span class="est-proc__marca">Ejercicio</span></li>`;
          }
          let estado = 'neutro';
          let marca = '';
          if (n === nError) {
            estado = 'error';
            marca = html`${ico('alerta')}<span>${analisis.estado === 'sin_entender' ? 'No lo entendí' : 'Aquí cambió'}</span>`;
          } else if (r.despuesDelError) {
            estado = 'despues';
            marca = html`<span class="solo-lector">Después del error</span>`;
          } else if (r.valido) {
            estado = 'ok';
            marca = html`${ico('check')}<span class="solo-lector">Bien</span>`;
          }
          return html`<li class="est-proc__renglon" data-estado="${estado}">
            <span class="est-proc__n"><span class="solo-lector">Renglón </span>${n}</span>
            <span class="math est-proc__texto">${bonito(r.texto)}</span>
            <span class="est-proc__marca">${marca}</span></li>`;
        })}
      </ol>
    </figure>`;
  }

  /* ---------------- Pantalla: diagnóstico ---------------- */

  function vistaDiagnostico() {
    const d = diag();
    const i = indiceDiag();
    const n = i + 1;
    const ej = pack.diagnostico[i];
    const revisado = d.pendienteSiguiente ? d.items[i] : null;
    const claveMontaje = `diag:${i}:${d.remontar}`;
    const encabezado = html`<div class="est-encabezado">
      <p class="est-sobretitulo">Diagnóstico · ${pack.materia}</p>
      <h1 class="titulo-1" ${attr('data-titulo', !revisado)}>Ejercicio ${n} de ${totalDiag}</h1>
      <div class="barra-progreso est-progreso">
        <progress max="${totalDiag}" value="${n}" aria-label="Ejercicio ${n} de ${totalDiag}"></progress>
      </div>
    </div>`;

    if (revisado) {
      const analisis = analisisDe(revisado.ejercicio, revisado.renglones);
      const ultimo = n >= totalDiag;
      return {
        clave: `revisado:${i}`,
        html: html`<div class="pantalla pila est-diag">
          ${encabezado}
          ${vistaProcedimiento(analisis)}
          ${cajaRetro(retroRevision(analisis, 'diagnostico'))}
          <p class="texto-sec est-guardado">${ico('check')}<span>Guardado en tu cel.</span></p>
          <button type="button" class="boton boton--primario boton--bloque" data-act="siguienteDiag" data-foco="siguiente">
            <span>${ultimo ? 'Ver mi resultado' : 'Siguiente ejercicio'}</span>${ico('flecha')}</button>
        </div>`,
      };
    }

    const intro = i === 0 ? pack.tecu.diagnosticoIntro : pack.tecu.diagnosticoSiguiente;
    return {
      clave: `ejercicio:${i}`,
      html: html`<div class="pantalla pila est-diag">
        ${encabezado}
        ${tecuDice(i === 0 ? 'normal' : 'feliz', html`<p>${intro}</p>`, { tamano: 56, clase: 'est-tecu-dice--compacto' })}
        ${mensajeEscritura(claveMontaje)}
        <div class="est-montaje est-montaje--cuaderno" data-montaje="${claveMontaje}"></div>
        <button type="button" class="boton boton--fantasma boton--bloque est-no-se" data-act="diagNoSe">No sé cómo seguir</button>
      </div>`,
      montaje: {
        clave: claveMontaje,
        crear: (host) =>
          montarCuadernoEn(host, { clave: claveMontaje, ejercicio: ej.ecuacion, modo: 'diagnostico', alRevisar: procesarDiagnostico }),
      },
    };
  }

  function procesarDiagnostico(resultado, m, { rendirse = false } = {}) {
    const d = diag();
    if (d.pendienteSiguiente || d.items.length >= totalDiag) return;
    const i = d.items.length;
    const clave = `diag:${i}:${d.remontar}`;
    if (m && m.clave !== clave) return;
    const ej = pack.diagnostico[i];
    const renglones = renglonesDe(resultado, m);
    const analisis = analisisDe(ej.ecuacion, renglones);
    if (!rendirse && (analisis.estado === 'vacio' || analisis.estado === 'sin_entender')) {
      avisarEscritura(clave, analisis);
      return;
    }
    d.items.push({ id: ej.id, ejercicio: ej.ecuacion, renglones });
    d.pendienteSiguiente = true;
    if (m) m.sinBorrador = true;
    if (prog.borrador?.clave === clave) prog.borrador = null;
    state.mensaje = null;
    registrar({
      tipo: 'diagnostico',
      ejercicio: ej.ecuacion,
      renglones,
      resultado: resultadoEvento(analisis.estado),
      error: errorEvento(analisis),
      datos: { numero: i + 1, id: ej.id, sinTerminar: rendirse },
    });
    guardar();
    render();
    const retro = retroRevision(analisis, 'diagnostico');
    anunciar(`${retro.titulo}. ${retro.texto}`);
  }

  function siguienteDiag() {
    const d = diag();
    if (!d.pendienteSiguiente) return;
    d.pendienteSiguiente = false;
    state.mensaje = null;
    if (d.items.length >= totalDiag) {
      asignarRuta();
      irInterno('resultado');
      return;
    }
    guardar();
    render();
  }

  /* ---------------- Ruta asignada ---------------- */

  function asignarRuta() {
    if (prog.ruta) return prog.ruta;
    const resumen = resumenDiagnostico();
    const tipo = resumen.dominante ?? (resumen.correctos === resumen.total ? null : TIPOS.NO_CLASIFICADO);
    const tipoEjercicios = tipo ?? TIPOS.NO_CLASIFICADO;
    const semilla = `${alumno}:${tipo ?? 'GENERAL'}`;
    const plan = construirRuta(tipoEjercicios, semilla, ecuacionesDiag);
    prog.ruta = {
      tipo,
      semilla,
      empezada: false,
      actividad: tipo === null ? 'comprobacion' : 'pregunta',
      pregunta: { elegidas: [], resuelta: false },
      visual: { completa: false },
      practica: {
        ejercicios: plan.practica.map((e) => ({ ecuacion: e.ecuacion, nivel: e.nivel })),
        indice: 0,
        revisado: null,
        revisiones: 0,
        remontar: 0,
        solucionVista: null,
      },
      comprobacion: { ecuacion: plan.comprobacion.ecuacion, usados: [plan.comprobacion.ecuacion], intentos: 0, fallo: null, remontar: 0 },
    };
    registrar({
      tipo: 'ruta',
      ruta: tipo,
      datos: {
        conteo: resumen.conteo,
        correctos: resumen.correctos,
        total: resumen.total,
        titulo: infoRuta(tipo).titulo,
        sinErrores: tipo === null,
        ejercicios: prog.ruta.practica.ejercicios.map((e) => e.ecuacion),
      },
    });
    guardar();
    return prog.ruta;
  }

  /* ---------------- Pantalla: resultado ---------------- */

  function vistaResultado() {
    const r = prog.ruta || asignarRuta();
    const resumen = resumenDiagnostico();
    const info = infoRuta(r.tipo);
    const tipos = Object.keys(resumen.conteo).sort((a, b) => resumen.conteo[b] - resumen.conteo[a]);
    const sinTerminar = diag().items.filter((it) => {
      const e = analisisDe(it.ejercicio, it.renglones).estado;
      return e !== 'correcto' && e !== 'error';
    }).length;
    const sinErrores = r.tipo === null;
    const soloRevisar = r.tipo === TIPOS.NO_CLASIFICADO;

    let mensaje;
    if (sinErrores) {
      mensaje = `¡Resolviste los ${resumen.total} sin errores! Solo falta una comprobación sin ayuda para demostrar que dominas el tema.`;
    } else if (soloRevisar) {
      mensaje =
        'Revisé tus ejercicios y encontré dónde cambió la solución, pero no reconocí el error. ' +
        'Se lo marqué a tu maestra o maestro para que lo revisen juntos. Mientras, te preparé una ruta general.';
    } else {
      mensaje = `Resolviste ${resumen.correctos} de ${resumen.total} sin errores. Ya sé en qué te puedo ayudar: ${
        tipos.length === 1 && resumen.conteo[tipos[0]] > 1 ? 'el error se repite, así que vamos directo a él.' : 'empecemos por lo que más se repitió.'
      }`;
    }

    const ejercicios = diag().items.map((it, k) => {
      const a = analisisDe(it.ejercicio, it.renglones);
      let estado;
      if (a.estado === 'correcto') estado = html`${ico('check')}<span>Correcto</span>`;
      else if (a.estado === 'error') {
        estado = html`${ico('alerta')}<span>${nombreError(a.error.tipo, pack, true)} · renglón ${a.error.renglon}</span>`;
      } else estado = html`${ico('info')}<span>Sin terminar</span>`;
      return html`<li data-estado="${a.estado}"><span class="est-resumen__n">${k + 1}.</span>
        <span class="math">${bonito(it.ejercicio)}</span><span class="est-resumen__estado">${estado}</span></li>`;
    });

    return {
      clave: 'resultado',
      html: html`<div class="pantalla pila est-resultado">
        <h1 class="titulo-1" data-titulo>Tu resultado</h1>
        ${tecuDice(sinErrores ? 'feliz' : 'pensando', html`<p>${mensaje}</p>`, { tamano: 64 })}
        ${tipos.length || sinTerminar
          ? html`<section class="pila est-hallazgos" aria-labelledby="est-hallazgos-titulo">
              <h2 class="titulo-3" id="est-hallazgos-titulo">Lo que encontré</h2>
              <ul class="est-chips">
                ${tipos.map((t) => {
                  const e = pack.errores[t] || {};
                  return html`<li class="chip chip--${t === TIPOS.NO_CLASIFICADO ? 'neutro' : 'error'} est-chip-error" data-tono="${e.tono || 'gris'}">
                    ${ico(e.icono || 'alerta')}<span>${nombreError(t, pack)}</span>
                    <strong class="est-chip__n">${plural(resumen.conteo[t], 'vez', 'veces')}</strong></li>`;
                })}
                ${sinTerminar
                  ? html`<li class="chip chip--neutro est-chip-error">${ico('info')}<span>Sin terminar</span>
                      <strong class="est-chip__n">${plural(sinTerminar, 'vez', 'veces')}</strong></li>`
                  : ''}
              </ul>
            </section>`
          : ''}
        ${soloRevisar
          ? html`<p class="est-nota" data-estado="info">${ico('info')}<span>Tu maestra o maestro revisará tu procedimiento contigo.</span></p>`
          : ''}
        <section class="tarjeta tarjeta--tono pila est-ruta-tarjeta" data-tono="${info.tono}" aria-labelledby="est-ruta-titulo">
          <p class="est-ruta-tarjeta__etiqueta">${ico(info.icono)}<span>${sinErrores ? 'Siguiente paso' : `Tu ruta · ${info.nombreCorto}`}</span></p>
          <h2 class="titulo-2" id="est-ruta-titulo">${info.titulo}</h2>
          <p><strong>Meta:</strong> ${info.meta}</p>
          ${sinErrores
            ? html`<ol class="est-actividades"><li>${ico(ACTIVIDAD.comprobacion.icono)}<span>${ACTIVIDAD.comprobacion.nombre}</span></li></ol>`
            : html`<ol class="est-actividades">
                <li>${ico(ACTIVIDAD.pregunta.icono)}<span>${ACTIVIDAD.pregunta.nombre}</span></li>
                <li>${ico(ACTIVIDAD.visual.icono)}<span>Balanza: ${BALANZA_POR_MODO[info.visual?.modo] || 'encuentra el equilibrio'}</span></li>
                <li>${ico(ACTIVIDAD.practica.icono)}<span>Práctica: ${r.practica.ejercicios.length} ejercicios con pistas</span></li>
                <li>${ico(ACTIVIDAD.comprobacion.icono)}<span>${ACTIVIDAD.comprobacion.nombre}</span></li>
              </ol>`}
          <button type="button" class="boton boton--primario boton--bloque" data-act="empezarRuta" data-foco="empezar-ruta">
            <span>${r.empezada ? 'Continuar mi ruta' : sinErrores ? 'Ir a la comprobación' : 'Empezar mi ruta'}</span>${ico('flecha')}</button>
        </section>
        <details class="est-detalles est-resumen">
          <summary>Ver mis ${resumen.total} ejercicios</summary>
          <ol class="est-resumen__lista">${ejercicios}</ol>
        </details>
      </div>`,
    };
  }

  /* ---------------- Pantalla: ruta ---------------- */

  function pasosRuta(r, viendo) {
    const actual = ACTIVIDADES.indexOf(r.actividad);
    const enComprobacion = r.actividad === 'comprobacion';
    return html`<ol class="pasos est-pasos" aria-label="Pasos de tu ruta">
      ${ACTIVIDADES.map((a, k) => {
        const estado = k < actual ? 'hecho' : k === actual ? 'actual' : 'pendiente';
        const repasable = estado === 'hecho' && (a === 'pregunta' || a === 'visual') && !enComprobacion;
        const textoEstado = estado === 'hecho' ? 'hecho' : estado === 'actual' ? 'paso actual' : 'pendiente';
        const cuerpo = html`<span class="est-pasos__marca" aria-hidden="true">${estado === 'hecho' ? ico('check') : k + 1}</span>
          <span class="est-pasos__nombre">${ACTIVIDAD[a].corto}</span>
          <span class="solo-lector">: ${textoEstado}</span>`;
        return html`<li data-estado="${estado}" ${attr('aria-current', estado === 'actual', 'step')} ${attr('data-viendo', viendo === a)}>
          ${repasable
            ? html`<button type="button" class="est-pasos__boton" data-act="repasar" data-actividad="${a}" data-foco="paso-${a}"
                aria-label="${ACTIVIDAD[a].nombre}: hecho. Repasar">${cuerpo}</button>`
            : cuerpo}
        </li>`;
      })}
    </ol>`;
  }

  function vistaRuta() {
    const r = prog.ruta;
    const info = infoRuta(r.tipo);
    const viendo = state.repaso || r.actividad;
    const cuerpo =
      viendo === 'pregunta'
        ? actividadPregunta(r)
        : viendo === 'visual'
          ? actividadVisual(r, info)
          : viendo === 'practica'
            ? actividadPractica(r)
            : actividadComprobacion(r);
    const enComprobacion = r.actividad === 'comprobacion';
    return {
      clave: `${viendo}:${cuerpo.clave}`,
      montaje: cuerpo.montaje,
      despues: cuerpo.despues,
      html: html`<div class="pantalla pila est-ruta" data-tono="${info.tono}" data-actividad="${viendo}">
        <header class="tarjeta tarjeta--tono est-ruta__cabeza" data-tono="${info.tono}">
          <p class="est-ruta__etiqueta">${ico(info.icono)}<span>${r.tipo === null ? info.nombre : `Tu ruta · ${info.nombreCorto}`}</span></p>
          <h1 class="titulo-2 est-ruta__titulo">${info.titulo}</h1>
          ${!enComprobacion
            ? html`<button type="button" class="boton boton--fantasma boton--chico est-ruta__diag" data-act="ir" data-pantalla="resultado">
                Ver mi diagnóstico</button>`
            : ''}
        </header>
        ${r.tipo !== null ? pasosRuta(r, viendo) : ''}
        ${state.repaso
          ? html`<p class="est-nota est-repaso">${ico('info')}<span>Estás repasando «${ACTIVIDAD[state.repaso].nombre}».</span>
              <button type="button" class="boton boton--secundario boton--chico" data-act="salirRepaso">Volver a mi paso</button></p>`
          : ''}
        <section class="est-actividad pila" aria-labelledby="est-act-titulo">${cuerpo.html}</section>
      </div>`,
    };
  }

  function sobretitulo(r, actividad) {
    if (r.tipo === null) return '';
    return html`<p class="est-sobretitulo">Paso ${ACTIVIDADES.indexOf(actividad) + 1} de 4</p>`;
  }

  /* a) Pregunta orientadora */

  function actividadPregunta(r) {
    const q = preguntaDeRuta();
    const p = r.pregunta;
    const repaso = state.repaso === 'pregunta';
    const ultima = q.opciones.find((o) => o.id === p.elegidas[p.elegidas.length - 1]);
    return {
      clave: 'pregunta',
      html: html`
        ${sobretitulo(r, 'pregunta')}
        <h2 class="titulo-2" id="est-act-titulo" data-titulo>${ACTIVIDAD.pregunta.nombre}</h2>
        ${tecuDice(p.resuelta ? 'feliz' : 'pensando', html`<p>${q.texto}</p>`, { tamano: 64 })}
        <div class="opciones est-opciones" role="group" aria-label="Elige una respuesta">
          ${q.opciones.map((o) => {
            const elegida = p.elegidas.includes(o.id);
            const clase = elegida ? (o.correcta ? 'opcion--correcta' : 'opcion--incorrecta') : '';
            return html`<button type="button" class="opcion ${clase}" data-act="opcion" data-id="${o.id}" data-foco="opcion-${o.id}"
              ${attr('aria-disabled', elegida || p.resuelta, 'true')}>
              <span class="est-opcion__marca" aria-hidden="true">${elegida ? ico(o.correcta ? 'check' : 'cerrar') : ''}</span>
              <span class="est-opcion__texto">${o.texto}</span>
              ${elegida ? html`<span class="est-opcion__estado">${o.correcta ? 'Correcta' : 'No es esta'}</span>` : ''}
            </button>`;
          })}
        </div>
        ${ultima
          ? html`<p class="est-retro-opcion" data-estado="${ultima.correcta ? 'ok' : 'error'}">
              ${ico(ultima.correcta ? 'check' : 'info')}<span>${ultima.retro}</span></p>`
          : ''}
        ${p.resuelta && !repaso
          ? html`<button type="button" class="boton boton--primario boton--bloque" data-act="siguienteActividad" data-foco="siguiente">
              <span>Siguiente: la balanza</span>${ico('flecha')}</button>`
          : ''}`,
    };
  }

  function elegirOpcion(id) {
    const r = prog.ruta;
    if (!r || r.pregunta.resuelta) return;
    const q = preguntaDeRuta();
    const o = q.opciones.find((x) => x.id === id);
    if (!o || r.pregunta.elegidas.includes(o.id)) return;
    r.pregunta.elegidas.push(o.id);
    if (o.correcta) {
      r.pregunta.resuelta = true;
      registrar({
        tipo: 'pregunta',
        ruta: r.tipo,
        aprobado: true,
        datos: {
          intentos: r.pregunta.elegidas.length,
          elegidas: [...r.pregunta.elegidas],
          opcion: o.texto,
          basadaEnAlumno: Boolean(q.basadaEnAlumno),
        },
      });
    }
    guardar();
    render();
    anunciar(`${o.correcta ? 'Correcto.' : 'No es esa.'} ${o.retro}`);
    if (o.correcta) enfocar('[data-foco="siguiente"]');
  }

  /* b) Balanza */

  function actividadVisual(r, info) {
    const v = info.visual || pack.errores[TIPOS.NO_CLASIFICADO].ruta.visual;
    const repaso = state.repaso === 'visual';
    const clave = `balanza:${r.tipo}:${repaso ? 'repaso' : 'ruta'}`;
    const completa = repaso ? state.repasoCompleto : r.visual.completa;
    const cierre = state.balanzaConCierre ? 'La balanza quedó en equilibrio.' : v.cierre;
    return {
      clave: completa ? 'completa' : 'activa',
      html: html`
        ${sobretitulo(r, 'visual')}
        <h2 class="titulo-2" id="est-act-titulo" ${attr('data-titulo', !completa)}>${ACTIVIDAD.visual.nombre}</h2>
        <div class="burbuja burbuja--tecu est-instruccion" data-region="instruccion" ${attr('hidden', state.balanzaConInstruccion)}>
          <span class="solo-lector">Tecu dice: </span><p>${v.instruccion}</p></div>
        <div class="est-montaje est-balanza" data-tono="${info.tono}" data-modo="${v.modo}" data-montaje="${clave}"></div>
        ${completa
          ? html`${cajaRetro({ estado: 'ok', tecu: 'feliz', icono: 'check', titulo: '¡Lo lograste!', texto: cierre })}
              ${repaso
                ? html`<button type="button" class="boton boton--primario boton--bloque" data-act="salirRepaso" data-foco="siguiente">
                    <span>Volver a mi paso</span>${ico('flecha')}</button>`
                : html`<button type="button" class="boton boton--primario boton--bloque" data-act="siguienteActividad" data-foco="siguiente">
                    <span>Siguiente: práctica</span>${ico('flecha')}</button>`}`
          : ''}`,
      montaje: { clave, crear: (host) => montarBalanzaEn(host, clave, v) },
    };
  }

  function montarBalanzaEn(host, clave, v) {
    const m = { tipo: 'balanza', clave, host, instancia: null, destruido: false, visual: v };
    try {
      m.instancia = montarBalanza(host, {
        modo: v.modo,
        ecuacion: v.ecuacion,
        unLado: Boolean(v.unLado),
        textos: { instruccion: v.instruccion, cierre: v.cierre },
        onCompletar: (resumen) =>
          setTimeout(() => {
            if (!m.destruido) completarVisual(m, resumen);
          }, 0),
        onCambio: () => {},
      });
    } catch (error) {
      console.error(error);
      m.fallo = true;
      host.innerHTML = String(html`<div class="vacio pila">
        <p>No pude mostrar la balanza en este cel.</p>
        <button type="button" class="boton boton--secundario" data-act="saltarVisual">Seguir sin la balanza</button>
      </div>`);
    }
    // Si la balanza ya muestra la instrucción, no la repetimos arriba.
    const muestra = Boolean(v.instruccion) && host.textContent.includes(v.instruccion.slice(0, 40));
    state.balanzaConInstruccion = muestra;
    const nodo = contenido.querySelector('[data-region="instruccion"]');
    if (nodo) nodo.hidden = muestra;
    return m;
  }

  function completarVisual(m, resumen, { automatico = false } = {}) {
    const r = prog.ruta;
    if (!r) return;
    const v = m?.visual || infoRuta(r.tipo).visual;
    if (m?.host && v?.cierre) state.balanzaConCierre = m.host.textContent.includes(v.cierre.slice(0, 40));
    if (m?.clave?.endsWith(':repaso')) {
      state.repasoCompleto = true;
      render();
      anunciar('¡Lo lograste! La balanza quedó en equilibrio.');
      return;
    }
    if (r.actividad !== 'visual' || r.visual.completa) return;
    r.visual.completa = true;
    registrar({
      tipo: 'visual',
      ruta: r.tipo,
      aprobado: true,
      datos: { modo: v?.modo, ecuacion: v?.ecuacion, resumen: copiaPlana(resumen), automatico, omitida: Boolean(m?.fallo) },
    });
    guardar();
    render();
    anunciar(`¡Lo lograste! ${state.balanzaConCierre ? '' : v?.cierre || ''}`);
    enfocar('[data-foco="siguiente"]');
  }

  /* c) Práctica con pistas */

  function actividadPractica(r) {
    const p = r.practica;
    const ej = p.ejercicios[p.indice];
    const extra = p.indice >= 3;
    const claveMontaje = `practica:${p.indice}:${ej.ecuacion}:${p.remontar}`;
    const analisis = p.revisado ? analisisDe(ej.ecuacion, p.revisado.renglones) : null;
    const correcto = analisis?.estado === 'correcto';
    const ultima = p.indice + 1 >= p.ejercicios.length;
    const titulo = extra ? `Práctica extra · Nivel ${ej.nivel}` : `Práctica ${p.indice + 1} de 3 · Nivel ${ej.nivel}`;
    return {
      clave: `${p.indice}:${correcto ? 'bien' : 'escribiendo'}`,
      html: html`
        ${sobretitulo(r, 'practica')}
        <h2 class="titulo-2" id="est-act-titulo" data-titulo>${titulo}</h2>
        ${!correcto
          ? html`<p class="texto-sec est-ayuda">${ico('info')}<span>Escribe un paso por renglón. Si te atoras, toca «Pista»:
              cada una te acerca un paso, sin darte la respuesta.</span></p>`
          : ''}
        ${mensajeEscritura(claveMontaje)}
        <div class="est-montaje est-montaje--cuaderno" data-montaje="${claveMontaje}"></div>
        ${analisis ? cajaRetro(retroRevision(analisis, 'practica', ej.ecuacion), { titular: false }) : ''}
        ${correcto
          ? html`<button type="button" class="boton boton--primario boton--bloque" data-act="siguientePractica" data-foco="siguiente">
              <span>${ultima ? 'Ir a la comprobación' : 'Siguiente práctica'}</span>${ico('flecha')}</button>`
          : ''}`,
      montaje: {
        clave: claveMontaje,
        crear: (host) =>
          montarCuadernoEn(host, { clave: claveMontaje, ejercicio: ej.ecuacion, modo: 'practica', alRevisar: procesarPractica }),
      },
    };
  }

  function procesarPractica(resultado, m) {
    const r = prog.ruta;
    if (!r || r.actividad !== 'practica') return;
    const p = r.practica;
    const ej = p.ejercicios[p.indice];
    const clave = `practica:${p.indice}:${ej.ecuacion}:${p.remontar}`;
    if (m && m.clave !== clave) return;
    const renglones = renglonesDe(resultado, m);
    const analisis = analisisDe(ej.ecuacion, renglones);
    if (analisis.estado === 'vacio' || analisis.estado === 'sin_entender') {
      avisarEscritura(clave, analisis);
      return;
    }
    state.mensaje = null;
    const pistasUsadas = Math.max(Number(resultado?.pistasUsadas) || 0, m?.pistas || 0);
    const pidioSolucion = Boolean(resultado?.pidioSolucion) || p.solucionVista === p.indice;
    registrar({
      tipo: 'practica',
      ruta: r.tipo,
      ejercicio: ej.ecuacion,
      renglones,
      resultado: resultadoEvento(analisis.estado),
      error: errorEvento(analisis),
      pistasUsadas,
      pidioSolucion,
      datos: { nivel: ej.nivel, numero: p.indice + 1, extra: p.indice >= 3 },
    });
    p.revisado = { renglones, estado: analisis.estado };
    p.revisiones += 1;
    guardar();
    render();
    const retro = retroRevision(analisis, 'practica', ej.ecuacion);
    anunciar(`${retro.titulo}. ${retro.texto}`);
    if (analisis.estado === 'correcto') enfocar('[data-foco="siguiente"]');
  }

  function alPedirSolucion(m) {
    const r = prog.ruta;
    if (!r || r.actividad !== 'practica' || m.destruido) return;
    const p = r.practica;
    const ej = p.ejercicios[p.indice];
    if (p.solucionVista === p.indice) return;
    p.solucionVista = p.indice;
    registrar({
      tipo: 'solucion',
      ruta: r.tipo,
      ejercicio: ej.ecuacion,
      pidioSolucion: true,
      pistasUsadas: m.pistas || 0,
      datos: { nivel: ej.nivel, numero: p.indice + 1 },
    });
    guardar();
  }

  function siguientePractica() {
    const r = prog.ruta;
    if (!r || r.actividad !== 'practica') return;
    const p = r.practica;
    if (p.revisado?.estado !== 'correcto') return;
    p.revisado = null;
    p.solucionVista = null;
    if (prog.borrador?.clave?.startsWith('practica:')) prog.borrador = null;
    if (p.indice + 1 < p.ejercicios.length) {
      p.indice += 1;
    } else {
      r.actividad = 'comprobacion';
      r.comprobacion.fallo = null;
      aviso(pack.tecu.dormido, { tipo: 'info' });
    }
    guardar();
    render();
  }

  /* d) Comprobación sin ayuda */

  function actividadComprobacion(r) {
    const c = r.comprobacion;
    const claveMontaje = `comprobacion:${c.ecuacion}:${c.remontar || 0}`;
    if (c.fallo) {
      const analisis = analisisDe(c.ecuacion, c.fallo.renglones);
      return {
        clave: `fallo:${c.intentos}`,
        html: html`
          ${sobretitulo(r, 'comprobacion')}
          <h2 class="titulo-2" id="est-act-titulo">${ACTIVIDAD.comprobacion.nombre}</h2>
          ${vistaProcedimiento(analisis)}
          ${cajaRetro(retroRevision(analisis, 'comprobacion'))}
          <div class="pila est-dos-opciones" role="group" aria-label="¿Qué quieres hacer?">
            <button type="button" class="boton boton--primario boton--bloque" data-act="practicarOtro" data-foco="practicar-otro">
              ${ico('aprender')}<span>Practicar uno más con pistas</span></button>
            <button type="button" class="boton boton--secundario boton--bloque" data-act="otraComprobacion" data-foco="otra-comprobacion">
              ${ico('estrella')}<span>Intentar otro sin ayuda</span></button>
          </div>`,
      };
    }
    return {
      clave: `${c.ecuacion}:${c.remontar || 0}`,
      html: html`
        ${sobretitulo(r, 'comprobacion')}
        <h2 class="titulo-2" id="est-act-titulo" data-titulo>${ACTIVIDAD.comprobacion.nombre}${c.intentos ? ` · Intento ${c.intentos + 1}` : ''}</h2>
        ${tecuDice('dormido', html`<p>${pack.tecu.dormido}</p>`, { tamano: 64, clase: 'est-tecu-dice--dormido' })}
        <p class="texto-sec est-ayuda">${ico('candado')}<span>Sin pistas ni chat con Tecu. Tómate tu tiempo: no hay límite.</span></p>
        ${mensajeEscritura(claveMontaje)}
        <div class="est-montaje est-montaje--cuaderno" data-montaje="${claveMontaje}"></div>`,
      montaje: {
        clave: claveMontaje,
        crear: (host) =>
          montarCuadernoEn(host, { clave: claveMontaje, ejercicio: c.ecuacion, modo: 'comprobacion', alRevisar: procesarComprobacion }),
      },
    };
  }

  function procesarComprobacion(resultado, m) {
    const r = prog.ruta;
    if (!r || r.actividad !== 'comprobacion' || prog.dominado) return;
    const c = r.comprobacion;
    if (c.fallo) return;
    const clave = `comprobacion:${c.ecuacion}:${c.remontar || 0}`;
    if (m && m.clave !== clave) return;
    const renglones = renglonesDe(resultado, m);
    const analisis = analisisDe(c.ecuacion, renglones);
    if (analisis.estado === 'vacio' || analisis.estado === 'sin_entender') {
      avisarEscritura(clave, analisis);
      return;
    }
    state.mensaje = null;
    if (m) m.sinBorrador = true;
    if (prog.borrador?.clave === clave) prog.borrador = null;
    c.intentos += 1;
    const aprobado = analisis.estado === 'correcto';
    registrar({
      tipo: 'comprobacion',
      ruta: r.tipo,
      ejercicio: c.ecuacion,
      renglones,
      resultado: resultadoEvento(analisis.estado),
      error: errorEvento(analisis),
      aprobado,
      pistasUsadas: 0,
      pidioSolucion: false,
      datos: { intento: c.intentos },
    });
    if (aprobado) {
      registrar({ tipo: 'dominio', ruta: r.tipo, ejercicio: c.ecuacion, aprobado: true, datos: { intentos: c.intentos } });
      prog.dominado = true;
      irInterno('dominado');
      anunciar(pack.tecu.dominado);
      return;
    }
    c.fallo = { renglones, estado: analisis.estado };
    guardar();
    render();
    const retro = retroRevision(analisis, 'comprobacion');
    anunciar(`${retro.titulo}. ${retro.texto}`);
  }

  function nuevaComprobacion() {
    const r = prog.ruta;
    const c = r.comprobacion;
    const otra = otraComprobacion(r.tipo ?? TIPOS.NO_CLASIFICADO, r.semilla, ecuacionesUsadas());
    c.ecuacion = otra.ecuacion;
    c.usados = [...new Set([...(c.usados || []), otra.ecuacion])];
    c.fallo = null;
  }

  function practicarOtro() {
    const r = prog.ruta;
    if (!r) return;
    const extra = otraComprobacion(r.tipo ?? TIPOS.NO_CLASIFICADO, `${r.semilla}:extra`, ecuacionesUsadas());
    r.practica.ejercicios.push({ ecuacion: extra.ecuacion, nivel: extra.nivel });
    r.practica.indice = r.practica.ejercicios.length - 1;
    r.practica.revisado = null;
    r.practica.solucionVista = null;
    nuevaComprobacion();
    r.actividad = 'practica';
    guardar();
    render();
    aviso(pack.tecu.despierto, { tipo: 'info' });
  }

  function intentarOtraComprobacion() {
    const r = prog.ruta;
    if (!r) return;
    nuevaComprobacion();
    guardar();
    render();
    anunciar(pack.tecu.dormido);
  }

  /* ---------------- Pantalla: dominado ---------------- */

  function vistaDominado() {
    const r = prog.ruta;
    const info = infoRuta(r?.tipo ?? null);
    const intentos = r?.comprobacion?.intentos || 1;
    return {
      clave: 'dominado',
      html: html`<div class="pantalla pila est-dominado">
        <div class="est-celebra" aria-hidden="true">
          <span class="est-celebra__luz"></span>
          ${tecu('feliz', 150, { decorativo: true })}
          <span class="est-confeti"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
        </div>
        <h1 class="titulo-1" data-titulo>¡Lo lograste, ${nombreVisible}!</h1>
        <p class="insignia est-insignia-dominado">${ico('estrella')}<span>Tema dominado</span></p>
        ${tecuDice('feliz', html`<p>${pack.tecu.dominado}</p>`, { tamano: 48 })}
        <dl class="est-datos">
          <div><dt>Tema</dt><dd>Ecuaciones lineales</dd></div>
          <div><dt>Ruta</dt><dd>${r?.tipo === null ? 'Comprobación directa' : info.nombreCorto}</dd></div>
          <div><dt>Comprobación</dt><dd>Sin ayuda, ${intentos === 1 ? 'al primer intento' : `en el intento ${intentos}`}</dd></div>
        </dl>
        <button type="button" class="boton boton--primario boton--bloque" data-act="ir" data-pantalla="inicio" data-foco="volver-inicio">
          ${ico('inicio')}<span>Volver al inicio</span></button>
      </div>`,
    };
  }

  /* ---------------- Pantalla: chat con Tecu ---------------- */

  function vistaChat() {
    if (chatBloqueado()) {
      return {
        clave: 'bloqueado',
        html: html`<div class="pantalla pila est-chat est-chat--bloqueado">
          <h1 class="titulo-1" data-titulo>Tecu está dormido</h1>
          ${tecuDice('dormido', html`<p>${pack.tecu.dormido}</p>`, { tamano: 96, clase: 'est-tecu-dice--dormido' })}
          <p class="est-nota">${ico('candado')}<span>Durante la comprobación no hay chat ni pistas. Cuando la termines, Tecu despierta
            y puedes preguntarle lo que quieras.</span></p>
          <button type="button" class="boton boton--primario boton--bloque" data-act="aprender" data-foco="volver-comprobacion">
            <span>Volver a la comprobación</span>${ico('flecha')}</button>
        </div>`,
      };
    }
    const tipo = prog.ruta?.tipo;
    const sugerencias = [...new Set([SUGERENCIA_POR_ERROR[tipo], ...SUGERENCIAS_BASE].filter(Boolean))].slice(0, 3);
    const enLinea = state.red.enLinea;
    return {
      clave: 'chat',
      html: html`<div class="pantalla pila est-chat">
        <h1 class="titulo-1" data-titulo>Pregúntale a Tecu</h1>
        ${!enLinea
          ? html`<p class="est-nota" data-estado="alerta">${ico('sin-wifi')}<span>Sin internet: guardo tus dudas en tu cel y te
              contesto en cuanto vuelva la señal.</span></p>`
          : ''}
        <ol class="est-chat__lista" aria-label="Conversación con Tecu">
          <li class="est-chat__msg est-chat__msg--tecu">
            <span class="est-chat__avatar">${tecu('normal', 36, { decorativo: true })}</span>
            <p class="burbuja burbuja--tecu"><span class="solo-lector">Tecu: </span>¿Tienes una duda de ecuaciones? Escríbela como
              te salga. Te contesto sin decirte la respuesta del ejercicio.</p>
          </li>
          ${prog.chat.map((m) =>
            m.de === 'alumno'
              ? html`<li class="est-chat__msg est-chat__msg--alumno">
                  <p class="burbuja burbuja--alumno"><span class="solo-lector">Tú: </span>${m.texto}</p>
                  ${m.pendiente ? html`<span class="est-chat__estado">${ico('reloj')}<span>Esperando señal</span></span>` : ''}
                </li>`
              : html`<li class="est-chat__msg est-chat__msg--tecu">
                  <span class="est-chat__avatar">${tecu(m.reloj ? 'sin-senal' : 'normal', 36, { decorativo: true })}</span>
                  <p class="burbuja burbuja--tecu ${m.reloj ? 'est-burbuja--guardada' : ''}"><span class="solo-lector">Tecu: </span>
                    ${m.reloj ? ico('reloj') : ''}${m.sobre ? html`<span class="est-chat__sobre">Sobre «${m.sobre}»:</span>` : ''}${m.texto}</p>
                </li>`,
          )}
        </ol>
        <div class="est-sugerencias" role="group" aria-label="Preguntas rápidas">
          ${sugerencias.map(
            (s, k) => html`<button type="button" class="chip chip--info est-sugerencia" data-act="sugerencia" data-texto="${s}"
              data-foco="sugerencia-${k}">${s}</button>`,
          )}
        </div>
        <form class="est-chat__form" data-form="chat" novalidate>
          <label class="est-chat__etiqueta" for="est-chat-entrada">Escribe tu duda</label>
          <div class="est-chat__fila">
            <input id="est-chat-entrada" class="est-chat__entrada" type="text" name="duda" autocomplete="off" maxlength="300"
              enterkeyhint="send" data-foco="chat-entrada" value="${state.borradorChat}" placeholder="Por ejemplo: ¿por qué se divide?">
            <button type="submit" class="boton boton--primario est-chat__enviar">${ico('enviar')}<span>Enviar</span></button>
          </div>
        </form>
      </div>`,
    };
  }

  /* ---------------- Pantalla: descargas ---------------- */

  function pesoPaquete() {
    const { bytes, kb } = state.paquete;
    try {
      if (typeof Paquete.formatearKB === 'function' && Number.isFinite(Number(bytes))) return Paquete.formatearKB(Number(bytes));
    } catch {
      /* usa kb */
    }
    if (typeof kb === 'number') return `${kb.toLocaleString('es-MX', { maximumFractionDigits: 1 })} KB`;
    return kb ? String(kb) : '';
  }

  function vistaDescargas() {
    const proximas = (pack.materias || []).filter((m) => !m.disponible);
    const enLinea = state.red.enLinea;
    return {
      clave: 'descargas',
      html: html`<div class="pantalla pila est-descargas">
        <h1 class="titulo-1" data-titulo>Descargas</h1>
        <p class="texto-sec">Lo que está guardado en tu cel para aprender sin internet.</p>
        <article class="tarjeta pila est-paquete" aria-labelledby="est-paquete-titulo">
          <h2 class="titulo-3" id="est-paquete-titulo">Ecuaciones lineales · ${pack.grado}</h2>
          <dl class="est-datos">
            <div><dt>Peso</dt><dd class="est-peso">${pesoPaquete()}</dd></div>
            <div><dt>Estado</dt><dd class="est-guardado">${ico('check')}<span>Guardado en tu cel</span></dd></div>
            <div><dt>Versión</dt><dd>${state.paquete.version}</dd></div>
            <div><dt>Incluye</dt><dd>${totalDiag} ejercicios de diagnóstico, ${Object.keys(pack.errores).length} rutas,
              pistas y respuestas de Tecu</dd></div>
          </dl>
          <button type="button" class="boton boton--secundario boton--bloque" data-act="actualizarPaquete" data-foco="actualizar"
            ${attr('aria-disabled', !enLinea || state.actualizando, 'true')}
            ${attr('data-explica', !enLinea, 'Necesitas internet para actualizar. Tu paquete guardado sigue funcionando.')}>
            ${ico(state.actualizando ? 'sincronizar' : 'refrescar', state.actualizando ? 'est-girando' : '')}
            <span>${state.actualizando ? 'Buscando actualización…' : 'Actualizar paquete'}</span></button>
          ${!enLinea ? html`<p class="texto-sec">Para actualizar necesitas internet. Mientras, todo funciona con lo guardado.</p>` : ''}
        </article>
        ${proximas.length
          ? html`<section class="pila" aria-labelledby="est-proximas-titulo">
              <h2 class="titulo-3" id="est-proximas-titulo">Otras materias</h2>
              <ul class="est-materias">
                ${proximas.map(
                  (m) => html`<li><button type="button" class="est-materia" aria-disabled="true"
                    data-explica="${m.nombre} llegará en un paquete nuevo.">
                    <span class="est-materia__nombre">${m.nombre}</span>
                    <span class="chip chip--neutro">${ico('reloj')}Próximamente</span></button></li>`,
                )}
              </ul>
            </section>`
          : ''}
      </div>`,
    };
  }

  async function actualizarPaquete() {
    if (state.actualizando) return;
    if (!red.enLinea()) {
      aviso('Necesitas internet para actualizar. Tu paquete guardado sigue funcionando.', { tipo: 'alerta' });
      return;
    }
    state.actualizando = true;
    render();
    try {
      const nuevo = await Paquete.cargarPaquete();
      const antes = state.paquete.version;
      state.paquete = { bytes: nuevo.bytes, kb: nuevo.kb, version: nuevo.pack?.version || antes };
      aviso(
        antes === state.paquete.version ? `Ya tienes la versión más reciente (${pesoPaquete()}).` : 'Paquete actualizado.',
        { tipo: 'exito' },
      );
    } catch (error) {
      console.error(error);
      aviso('No se pudo actualizar. Tu paquete guardado sigue funcionando.', { tipo: 'error' });
    } finally {
      state.actualizando = false;
      if (state.pantalla === 'descargas') render();
    }
  }

  /* ---------------- Pantalla: ajustes ---------------- */

  function vistaAjustes() {
    const p = state.prefs || {};
    const contraste = Boolean(p.contraste);
    const reducido = p.movimiento === 'reducido';
    const sistemaReduce = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    return {
      clave: 'ajustes',
      html: html`<div class="pantalla pila est-ajustes">
        <h1 class="titulo-1" data-titulo>Ajustes</h1>
        <section class="tarjeta pila" aria-labelledby="est-aj-texto">
          <h2 class="titulo-3" id="est-aj-texto">Tamaño de texto</h2>
          <div class="segmentado est-segmentado-texto" role="group" aria-labelledby="est-aj-texto">
            ${TAMANOS_TEXTO.map(
              (t) => html`<button type="button" data-act="texto" data-valor="${t.valor}" data-foco="texto-${t.valor}"
                aria-pressed="${(p.texto || 'normal') === t.valor}"><span class="est-muestra-texto" data-tam="${t.valor}"
                aria-hidden="true">Aa</span><span>${t.texto}</span></button>`,
            )}
          </div>
          <p class="texto-sec">Así se ve una ecuación: <span class="math">3x + 5 = 20</span></p>
        </section>
        <section class="tarjeta pila" aria-labelledby="est-aj-ver">
          <h2 class="titulo-3" id="est-aj-ver">Para ver mejor</h2>
          <div class="est-ajuste">
            <div class="est-ajuste__texto">
              <label class="est-ajuste__nombre" for="est-sw-contraste">Alto contraste</label>
              <p class="texto-sec" id="est-sw-contraste-desc">Colores más fuertes para leer con sol o con poca luz.</p>
            </div>
            <span class="est-ajuste__estado" aria-hidden="true">${contraste ? 'Sí' : 'No'}</span>
            <button type="button" class="interruptor" role="switch" id="est-sw-contraste" aria-checked="${contraste}"
              aria-describedby="est-sw-contraste-desc" data-act="contraste" data-foco="contraste"></button>
          </div>
          <div class="est-ajuste">
            <div class="est-ajuste__texto">
              <label class="est-ajuste__nombre" for="est-sw-movimiento">Reducir movimiento</label>
              <p class="texto-sec" id="est-sw-movimiento-desc">${sistemaReduce && !reducido
                ? 'Tu cel ya pide menos movimiento; aquí lo puedes dejar fijo.'
                : 'Quita animaciones, como la celebración de Tecu.'}</p>
            </div>
            <span class="est-ajuste__estado" aria-hidden="true">${reducido ? 'Sí' : 'No'}</span>
            <button type="button" class="interruptor" role="switch" id="est-sw-movimiento" aria-checked="${reducido}"
              aria-describedby="est-sw-movimiento-desc" data-act="movimiento" data-foco="movimiento"></button>
          </div>
        </section>
        <section class="tarjeta pila est-zona-peligro" aria-labelledby="est-aj-progreso">
          <h2 class="titulo-3" id="est-aj-progreso">Tu progreso</h2>
          <p class="texto-sec">Tu avance se guarda en este cel${nombreVisible !== 'Invitado' ? `, a nombre de ${nombreVisible}` : ''}.</p>
          <button type="button" class="boton boton--peligro boton--bloque" data-act="borrarProgreso" data-foco="borrar">
            ${ico('basura')}<span>Borrar mi progreso</span></button>
        </section>
      </div>`,
    };
  }

  function aplicarPrefs(parciales, mensaje) {
    let prefs = null;
    try {
      prefs = guardarPreferencias(parciales);
    } catch (error) {
      console.error(error);
    }
    state.prefs = prefs && typeof prefs === 'object' ? prefs : leerPreferencias();
    render();
    renderBarra();
    anunciar(mensaje);
  }

  async function borrarProgreso() {
    const n = contarPendientes();
    const ok = await confirmar({
      titulo: '¿Borrar tu progreso?',
      mensaje:
        `Se borra tu avance en este cel: diagnóstico, ruta y dudas${
          n ? `, y ${plural(n, 'actividad que aún no llega', 'actividades que aún no llegan')} a tu maestra o maestro` : ''
        }. No se puede deshacer.`,
      aceptar: 'Sí, borrar',
      cancelar: 'No, conservar',
      peligro: true,
    });
    if (!ok) return;
    reiniciar();
    aviso('Listo. Tu progreso se borró; puedes empezar de nuevo.', { tipo: 'info' });
  }

  /** Deja a este estudiante como recién llegado (no toca la conexión simulada). */
  function reiniciar() {
    generacion += 1;
    destruirMontado({ conservarBorrador: false });
    clearTimeout(temporizadorSync);
    try {
      store.reiniciar();
    } catch (error) {
      console.error(error);
    }
    prog = progresoNuevo();
    progresoGuardado = false;
    cacheAnalisis.clear();
    Object.assign(state, {
      pantalla: 'inicio',
      mensaje: null,
      repaso: null,
      repasoCompleto: false,
      borradorChat: '',
      abrirPendientes: false,
      sync: null,
    });
    ultimaClave = null;
    render();
  }

  /* ---------------- Acciones (data-act) ---------------- */

  const acciones = {
    ir: (el) => ir(el.dataset.pantalla),
    aprender: () => ir('aprender'),
    red: (el) => cambiarRed(el.dataset.sin === 'si'),
    verPendientes: () => {
      const n = contarPendientes();
      if (!n) {
        aviso('Todo tu avance ya llegó a tu maestra o maestro.', { tipo: 'exito' });
        return;
      }
      state.abrirPendientes = true;
      ir('inicio');
      enfocar('#est-aviso-pendientes');
    },
    siguienteDiag: () => siguienteDiag(),
    diagNoSe: async () => {
      const ok = await confirmar({
        titulo: '¿Pasamos al siguiente?',
        mensaje: 'Tecu guarda lo que llevas para saber cómo ayudarte. No pasa nada si no lo terminaste.',
        aceptar: 'Sí, pasar',
        cancelar: 'Seguir intentando',
      });
      if (!ok || !montado || montado.tipo !== 'cuaderno') return;
      procesarDiagnostico({ renglones: renglonesDe(null, montado) }, montado, { rendirse: true });
    },
    empezarRuta: () => {
      const r = prog.ruta || asignarRuta();
      r.empezada = true;
      guardar();
      ir('ruta');
    },
    opcion: (el) => elegirOpcion(el.dataset.id),
    siguienteActividad: () => siguienteActividad(),
    siguientePractica: () => siguientePractica(),
    saltarVisual: () => completarVisual(montado?.tipo === 'balanza' ? montado : null, null),
    practicarOtro: () => practicarOtro(),
    otraComprobacion: () => intentarOtraComprobacion(),
    repasar: (el) => {
      const a = el.dataset.actividad;
      if (!['pregunta', 'visual'].includes(a) || prog.ruta?.actividad === 'comprobacion') return;
      state.repaso = a;
      state.repasoCompleto = false;
      render();
    },
    salirRepaso: () => {
      state.repaso = null;
      render();
    },
    sugerencia: (el) => enviarDuda(el.dataset.texto),
    actualizarPaquete: () => actualizarPaquete(),
    texto: (el) => {
      const t = TAMANOS_TEXTO.find((x) => x.valor === el.dataset.valor) || TAMANOS_TEXTO[0];
      aplicarPrefs({ texto: t.valor }, `Tamaño de texto: ${t.texto}.`);
    },
    contraste: () => {
      const activar = !state.prefs?.contraste;
      aplicarPrefs({ contraste: activar }, activar ? 'Alto contraste activado.' : 'Alto contraste desactivado.');
    },
    movimiento: () => {
      const reducir = state.prefs?.movimiento !== 'reducido';
      aplicarPrefs({ movimiento: reducir ? 'reducido' : 'auto' }, reducir ? 'Movimiento reducido.' : 'Movimiento normal.');
    },
    borrarProgreso: () => borrarProgreso(),
  };

  function siguienteActividad() {
    const r = prog.ruta;
    if (!r) return;
    if (state.repaso) {
      state.repaso = null;
      render();
      return;
    }
    if (r.actividad === 'pregunta' && r.pregunta.resuelta) r.actividad = 'visual';
    else if (r.actividad === 'visual' && r.visual.completa) r.actividad = 'practica';
    else return;
    guardar();
    render();
  }

  delegar(raiz, acciones);

  // Los controles con aria-disabled no hacen nada, pero explican por qué.
  raiz.addEventListener('click', (evento) => {
    const el = evento.target.closest('[aria-disabled="true"][data-explica]');
    if (el && raiz.contains(el)) aviso(el.dataset.explica, { tipo: 'info' });
  });

  raiz.addEventListener('submit', (evento) => {
    const form = evento.target.closest('[data-form="chat"]');
    if (!form) return;
    evento.preventDefault();
    enviarDuda(form.querySelector('#est-chat-entrada')?.value);
  });

  // Escribir no provoca render(): solo se guarda en silencio.
  raiz.addEventListener('input', (evento) => {
    if (evento.target.id === 'est-chat-entrada') state.borradorChat = evento.target.value;
  });

  /* ---------------- Modo pitch: API de control ---------------- */

  function tiempos(rapido = false) {
    const reducido = movimientoReducido();
    return {
      animado: !reducido,
      msPorLetra: rapido ? 22 : 60,
      entreRenglones: rapido ? 160 : 450,
      antesDeRevisar: rapido ? 300 : 800,
      lectura: rapido ? 1600 : 3800,
      antes: rapido ? 300 : 700,
    };
  }

  async function escribirRenglones(m, renglones, gen, rapido) {
    const t = tiempos(rapido);
    if (m.restaurando) await m.restaurando;
    for (const texto of renglones) {
      if (gen !== generacion || m.destruido) return false;
      try {
        await m.instancia.escribirRenglon(String(texto), { animado: t.animado, msPorLetra: t.msPorLetra });
      } catch (error) {
        console.error(error);
        return false;
      }
      await pausa(t.entreRenglones);
    }
    if (gen !== generacion || m.destruido) return false;
    await pausa(t.antesDeRevisar);
    return gen === generacion && !m.destruido;
  }

  /** Cuaderno vacío para el ejercicio actual (si ya tenía renglones, lo vuelve a montar). */
  function cuadernoLimpio() {
    let m = montado;
    if (!m || m.tipo !== 'cuaderno' || !m.instancia) return null;
    let escritos = [];
    try {
      escritos = m.instancia.renglones() || [];
    } catch {
      escritos = [];
    }
    if (!escritos.length) return m;
    const r = prog.ruta;
    if (state.pantalla === 'diagnostico') diag().remontar += 1;
    else if (r?.actividad === 'practica') r.practica.remontar += 1;
    else if (r?.actividad === 'comprobacion') r.comprobacion.remontar = (r.comprobacion.remontar || 0) + 1;
    destruirMontado({ conservarBorrador: false });
    prog.borrador = null;
    render();
    m = montado;
    return m?.tipo === 'cuaderno' && m.instancia ? m : null;
  }

  /** Escribe la solución correcta del ejercicio montado y la revisa. */
  async function resolverMontado(gen, rapido) {
    const m = cuadernoLimpio();
    if (!m) return false;
    const pasos = pasosSolucion(ecuacion(m.ejercicio)).map((p) => p.texto);
    const ok = await escribirRenglones(m, pasos, gen, rapido);
    if (!ok) return false;
    await revisarMontado(m);
    return gen === generacion;
  }

  async function reproducirDiagnostico(items, rapido, gen) {
    // Empieza el diagnóstico desde el ejercicio 1 (los eventos ya registrados se conservan).
    destruirMontado({ conservarBorrador: false });
    prog.diagnostico = diagnosticoNuevo();
    prog.ruta = null;
    prog.dominado = false;
    prog.borrador = null;
    state.mensaje = null;
    irInterno('diagnostico');
    const total = Math.min(items.length, totalDiag);
    for (let i = 0; i < total; i++) {
      if (gen !== generacion) return;
      if (state.pantalla !== 'diagnostico') irInterno('diagnostico');
      const veloz = rapido && i > 0;
      const m = cuadernoLimpio();
      if (!m) return;
      const renglones = Array.isArray(items[i]) ? items[i] : [];
      if (!(await escribirRenglones(m, renglones, gen, veloz))) return;
      if (renglones.length) await revisarMontado(m);
      else procesarDiagnostico({ renglones: [] }, m, { rendirse: true });
      if (gen !== generacion) return;
      if (!diag().pendienteSiguiente) return; // el motor no entendió algún renglón
      await pausa(tiempos(veloz).lectura);
      if (gen !== generacion) return;
      siguienteDiag();
    }
  }

  async function reproducirPractica(gen) {
    const r = prog.ruta;
    if (!r || r.actividad !== 'practica' || prog.dominado) return;
    if (r.practica.revisado?.estado === 'correcto') return;
    state.repaso = null;
    if (state.pantalla !== 'ruta') irInterno('ruta');
    await resolverMontado(gen, false);
  }

  async function avanzarRuta(gen) {
    const r = prog.ruta;
    if (!r || prog.dominado) return;
    if (!r.empezada) r.empezada = true;
    state.repaso = null;
    if (state.pantalla !== 'ruta') irInterno('ruta');
    const t = { ...tiempos(true), lectura: 2200 };
    const vivo = () => gen === generacion && prog.ruta === r;

    if (r.actividad === 'pregunta') {
      await pausa(t.antes);
      if (!vivo()) return;
      const correcta = preguntaDeRuta().opciones.find((o) => o.correcta);
      if (correcta) elegirOpcion(correcta.id);
      await pausa(t.lectura);
      if (!vivo()) return;
      siguienteActividad();
      return;
    }

    if (r.actividad === 'visual') {
      await pausa(t.antes);
      const m = montado;
      if (!r.visual.completa && m?.tipo === 'balanza' && typeof m.instancia?.resolver === 'function') {
        try {
          await m.instancia.resolver();
        } catch (error) {
          console.error(error);
        }
        await pausa(60);
      }
      if (!vivo()) return;
      if (!r.visual.completa) completarVisual(m?.tipo === 'balanza' ? m : null, null, { automatico: true });
      await pausa(t.lectura);
      if (!vivo()) return;
      siguienteActividad();
      return;
    }

    if (r.actividad === 'practica') {
      let k = 0;
      while (vivo() && r.actividad === 'practica') {
        if (r.practica.revisado?.estado !== 'correcto') {
          if (!(await resolverMontado(gen, true))) return;
          if (r.practica.revisado?.estado !== 'correcto') return;
          await pausa(t.lectura);
          if (!vivo()) return;
        }
        siguientePractica();
        k += 1;
      }
      return;
    }

    if (r.actividad === 'comprobacion') {
      if (r.comprobacion.fallo) {
        intentarOtraComprobacion();
        await pausa(t.antes);
      }
      if (!vivo()) return;
      await resolverMontado(gen, true);
    }
  }

  let colaControl = Promise.resolve();

  function encolar(tarea) {
    colaControl = colaControl
      .then(async () => {
        const gen = generacion;
        state.reproduciendo = true;
        try {
          await tarea(gen);
        } finally {
          state.reproduciendo = false;
          notificarPadre();
        }
      })
      .catch((error) => console.error(error));
  }

  window.addEventListener('message', (evento) => {
    if (evento.origin !== location.origin) return;
    const d = evento.data;
    if (!d || typeof d !== 'object' || d.tecu !== 'control') return;
    switch (d.cmd) {
      case 'reproducirDiagnostico': {
        const items = Array.isArray(d.items) ? d.items.map((x) => (Array.isArray(x) ? x.map(String) : [])) : [];
        encolar((gen) => reproducirDiagnostico(items, Boolean(d.rapido), gen));
        break;
      }
      case 'reproducirPractica':
        encolar((gen) => reproducirPractica(gen));
        break;
      case 'avanzarRuta':
        encolar((gen) => avanzarRuta(gen));
        break;
      case 'simularRed':
        cambiarRed(Boolean(d.sinInternet));
        break;
      case 'irA':
        if (state.reproduciendo) generacion += 1;
        irInterno(String(d.pantalla || ''));
        break;
      case 'reiniciar':
        reiniciar();
        break;
      default:
        break;
    }
    ultimoEstadoPadre = '';
    notificarPadre();
  });

  /* ---------------- Suscripciones ---------------- */

  try {
    red.suscribir(() => alCambiarRed());
  } catch (error) {
    console.error(error);
  }
  window.addEventListener('online', alCambiarRed);
  window.addEventListener('offline', alCambiarRed);

  try {
    store.suscribir?.(() => {
      renderBarra();
      // ¿Alguien reinició la demo desde otra pestaña? Entonces empezamos de cero aquí también.
      if (progresoGuardado && !state.reproduciendo && leerProgresoGuardado() == null) {
        destruirMontado({ conservarBorrador: false });
        prog = progresoNuevo();
        progresoGuardado = false;
        cacheAnalisis.clear();
        state.pantalla = 'inicio';
        state.repaso = null;
        state.mensaje = null;
        render();
      } else if (state.pantalla === 'inicio' && !state.sync && contarPendientes() !== state.pendientesMostrados) {
        render();
      }
    });
  } catch (error) {
    console.error(error);
  }

  try {
    alCambiarPreferencias((prefs) => {
      state.prefs = prefs && typeof prefs === 'object' ? prefs : leerPreferencias();
      if (state.pantalla === 'ajustes') render();
    });
  } catch (error) {
    console.error(error);
  }

  // Guarda lo escrito a medias si se cierra o se esconde la app.
  const guardarAlSalir = () => {
    guardarBorrador();
    guardar();
  };
  window.addEventListener('pagehide', guardarAlSalir);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') guardarAlSalir();
  });

  // La barra y la navegación son fijas: el foco nunca debe quedar tapado (WCAG 2.4.11).
  const ajustarMargenes = () => {
    const raizDoc = document.documentElement;
    raizDoc.style.scrollPaddingTop = `${Math.ceil(barra.getBoundingClientRect().height) + 8}px`;
    raizDoc.style.scrollPaddingBottom = `${Math.ceil(nav.getBoundingClientRect().height) + 8}px`;
  };
  if (typeof ResizeObserver === 'function') {
    const observador = new ResizeObserver(ajustarMargenes);
    observador.observe(barra);
    observador.observe(nav);
  }

  /* ---------------- Arranque ---------------- */

  if (diagnosticoTerminado() && !prog.ruta) asignarRuta();
  state.pantalla = resolverPantalla(prog.pantalla) || 'inicio';
  render();
  ajustarMargenes();

  if (red.enLinea()) {
    if (contarPendientes()) programarSync(true, 900);
    contestarDudasPendientes();
  }
}
