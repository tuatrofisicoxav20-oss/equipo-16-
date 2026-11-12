/**
 * Panel docente de Tecu Aprende (?vista=docente).
 *
 * Lo que ve la maestra o el maestro, en orden de lectura:
 *   1. Encabezado: grupo, tema, indicador "En vivo" con la hora de la última
 *      sincronización y una nota discreta: el grupo es simulado para la demostración.
 *   2. Lo que más se repite en el grupo, con la actividad para toda la clase.
 *   3. Indicadores: activos esta semana, temas dominados y errores por revisar.
 *   4. A quién llamar esta semana, con una sugerencia de 15 minutos.
 *   5. Mapa de dificultades: tabla estudiantes × tipo de error (número + intensidad).
 *   6. Grupos de refuerzo, cada uno con su cuadernillo para imprimir.
 *
 * Datos: el grupo simulado (js/data/grupo.js), generado una sola vez por sesión
 * en memoria, más lo que los celulares ya sincronizaron (eventosServidor()).
 * Se actualiza solo con escucharServidor() (BroadcastChannel + localStorage):
 * vuelve a leer, recalcula con js/data/analitica.js y repinta conservando foco
 * y scroll, resalta lo que cambió y lo anuncia ("Ana sincronizó 4 actividades").
 *
 * Patrón de la app: `state` + render() + delegación con data-act.
 *
 * Modo presentación (iframe del mismo origen), mensajes postMessage:
 *   recibe  { tecu: 'control', cmd: 'abrirFicha', alumno: 'ana' }
 *           { tecu: 'control', cmd: 'cerrarFicha' }
 *           { tecu: 'control', cmd: 'enfocar', seccion: 'repetido'|'llamar'|'mapa'|'grupos' }
 *   envía   { tecu: 'estado', vista: 'docente', alumnosEnVivo: string[], ultimaSincronizacion: string|null }
 *           a window.parent después de cada actualización.
 */
import { html, crudo, esc, attr, aviso, anunciar, delegar, renderConFoco, movimientoReducido } from '../ui/dom.js';
import { icono, hayIcono } from '../ui/iconos.js';
import { tecuSVG } from '../ui/tecu.js';
import { htmlEcuacion } from '../ui/cuaderno.js';
import { eventosServidor, escucharServidor } from '../data/store.js';
import { cargarPaquete } from '../data/paquete.js';
import { sugerenciaLlamada, sugerenciaPorMotivo } from '../core/textos.js';
import { generarGrupo } from '../data/grupo.js';
import { resumirAlumnos, resumirGrupo, aQuienLlamar, gruposDeRefuerzo } from '../data/analitica.js';

/* ------------------------------------------------------------------ */
/* Constantes                                                          */
/* ------------------------------------------------------------------ */

const GRUPO = '1.º A';
const MATERIA = 'Matemáticas';
const TITULO = `Panel docente · ${GRUPO} · ${MATERIA}`;
/** La misma semilla del grupo simulado: los cuadernillos salen iguales en cada ensayo. */
const SEMILLA_REFUERZO = 'tecu-1A-veracruz';
const MAX_LLAMADAS = 6;
const MAX_LLAMADAS_COMPACTO = 3;
/** Cuánto dura el resaltado de lo que cambió (y la marca "Actualizado"). */
const MS_RESALTE = 6000;
const MS_PRESENTAR = 2600;
/** Agrupa los avisos que llegan seguidos (un celular sube sus eventos uno por uno). */
const MS_AGRUPAR = 120;
/** Sin aviso de BroadcastChannel ('sync'), se anuncia tras este silencio. */
const MS_SILENCIO = 1500;

/** Nombres de los celulares en vivo (docs/ARQUITECTURA.md, decisiones de la fase 4). */
const NOMBRES_EN_VIVO = { ana: 'Ana', luis: 'Luis', invitado: 'Invitado (QR)' };

/** Secciones: navegación del panel y destinos del modo presentación ('enfocar'). */
const SECCIONES = [
  { clave: 'repetido', corto: 'Lo que más se repite' },
  { clave: 'llamar', corto: 'A quién llamar' },
  { clave: 'mapa', corto: 'Mapa de dificultades' },
  { clave: 'grupos', corto: 'Grupos de refuerzo' },
];
const CLAVES_SECCION = new Set(SECCIONES.map((s) => s.clave));

/** Estado de cada estudiante (resumirAlumnos). Textos neutros en género. */
const ESTADOS = {
  atorado: { texto: 'Se atoró', corto: 'Se atoró', clase: 'chip--error', icono: 'alerta', orden: 0 },
  inactivo: { texto: 'Sin entrar', corto: 'Sin entrar', clase: 'chip--alerta', icono: 'reloj', orden: 1 },
  sin_actividad: { texto: 'Sin empezar', corto: 'Sin empezar', clase: 'chip--neutro', icono: 'usuario', orden: 2 },
  diagnostico: { texto: 'En diagnóstico', corto: 'Diagnóstico', clase: 'chip--info', icono: 'lapiz', orden: 3 },
  en_ruta: { texto: 'En su ruta', corto: 'En ruta', clase: 'chip--info', icono: 'aprender', orden: 4 },
  dominado: { texto: 'Dominó el tema', corto: 'Dominó', clase: 'chip--exito', icono: 'trofeo', orden: 5 },
};

/** Motivo de cada llamada (aQuienLlamar). */
const MOTIVOS = {
  atorado: { texto: 'Se atoró', clase: 'chip--error', icono: 'alerta' },
  por_revisar: { texto: 'Error por revisar', clase: 'chip--info', icono: 'pregunta' },
  inactivo: { texto: 'No ha entrado', clase: 'chip--alerta', icono: 'reloj' },
  sin_diagnostico: { texto: 'Sin diagnóstico', clase: 'chip--neutro', icono: 'lapiz' },
};

/** Respaldo por si el paquete no trae pack.llamadas (lo normal es que sí). */
const RESPALDO_LLAMADA = {
  inactivo: 'Pregúntale si tiene celular o datos esta semana; si no, dale el cuadernillo impreso.',
  sin_diagnostico: 'Resuelvan juntos en papel las 4 ecuaciones del diagnóstico y que después las escriba en la app.',
};

/** Intensidad de cada celda del mapa: 0, 1, 2–3, 4 o más. */
const NIVELES = [
  { nivel: 1, texto: '1 vez' },
  { nivel: 2, texto: '2 o 3 veces' },
  { nivel: 3, texto: '4 o más' },
];
const nivelDe = (n) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3);

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

/** Icono decorativo del kit (el texto de al lado dice lo mismo). */
const ico = (nombre, opciones) => crudo(icono(nombre, opciones));

const plural = (n, uno, varios = `${uno}s`) => `${n} ${n === 1 ? uno : varios}`;

/** Un número de alumnos: viene como número o como lista, según la analítica. */
const cuantos = (valor) => (Array.isArray(valor) ? valor.length : Math.max(0, Number(valor) || 0));

/** id de un alumno que puede venir como ResumenAlumno, { id } o texto. */
const idDe = (a) => (a && typeof a === 'object' ? (a.id ?? a.alumno ?? null) : (a ?? null));

const porcentaje = (n, total) => (total > 0 ? Math.round((100 * n) / total) : 0);

const totalErrores = (r) => Object.values(r?.conteoErrores || {}).reduce((s, n) => s + (Number(n) || 0), 0);

const capitalizar = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** «Ana», «Ana y Luis», «Ana, Luis y Sofía M.» */
function enLista(textos) {
  try {
    return new Intl.ListFormat('es-MX', { style: 'long', type: 'conjunction' }).format(textos);
  } catch {
    return textos.length < 2 ? textos.join('') : `${textos.slice(0, -1).join(', ')} y ${textos[textos.length - 1]}`;
  }
}

function hora(fecha) {
  try {
    return fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  } catch {
    return fecha.toTimeString().slice(0, 8);
  }
}

function fechaDeHoy() {
  try {
    return capitalizar(new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }));
  } catch {
    return '';
  }
}

/** Nombre para un celular en vivo: ana → Ana, invitado → Invitado (QR), juez-2 → Juez 2. */
function nombreEnVivo(id) {
  if (NOMBRES_EN_VIVO[id]) return NOMBRES_EN_VIVO[id];
  const limpio = String(id).replace(/[-_]+/g, ' ').trim();
  return limpio ? capitalizar(limpio) : 'Estudiante';
}

/** Lo que el panel puede leer del "servidor" (nunca lanza). */
function leerServidor() {
  try {
    return eventosServidor().filter((e) => e && typeof e === 'object' && e.id && e.alumno);
  } catch {
    return [];
  }
}

/** Huella de cada evento sincronizado: detecta eventos nuevos y cambiados (p. ej. una duda contestada). */
function huellas(eventos) {
  const mapa = new Map();
  for (const e of eventos) {
    let texto;
    try {
      texto = JSON.stringify(e);
    } catch {
      texto = String(e.id);
    }
    mapa.set(e.id, { alumno: String(e.alumno), texto });
  }
  return mapa;
}

/** Grupo simulado: uno por sesión (la página), con `ahora` fijo al generarlo. */
let grupoDeLaSesion = null;

function grupoSimulado(pack) {
  if (!grupoDeLaSesion) {
    const ahora = Date.now();
    const grupo = generarGrupo({ ahora, pack });
    grupoDeLaSesion = {
      alumnos: Array.isArray(grupo?.alumnos) ? grupo.alumnos : [],
      eventos: Array.isArray(grupo?.eventos) ? grupo.eventos : [],
      ahora,
    };
  }
  return grupoDeLaSesion;
}

/* ------------------------------------------------------------------ */
/* Vista                                                               */
/* ------------------------------------------------------------------ */

/**
 * Monta el panel docente en `raiz`.
 * @param {HTMLElement} raiz
 * @param {{ compacto?: boolean }} [opciones] compacto: versión densa para el iframe del modo presentación
 * @returns {Promise<{ destruir: () => void }>}
 */
export async function montarDocente(raiz, { compacto = false } = {}) {
  raiz.classList.add('app--docente');
  raiz.classList.toggle('docente-compacto', compacto);
  raiz.innerHTML = '<p class="cargando" role="status">Cargando el panel…</p>';

  const state = {
    pack: null,
    compacto,
    datos: null,
    /** { fecha: Date, alumnos: string[] } de la última sincronización recibida con el panel abierto. */
    ultimaSync: null,
    orden: ordenInicial(compacto),
    /** clave → { hasta, tipo: 'nuevo'|'presentando' } */
    resaltes: new Map(),
    /** Ficha abierta desde el panel: { id, dialogo, foco } */
    ficha: null,
    error: null,
  };

  const tecu = tecuSVG({ tamano: 36, decorativo: true });
  const hoy = fechaDeHoy();
  let huellasPrevias = new Map();
  /** alumno → actividades nuevas aún sin anunciar (detectadas al comparar). */
  const porAnunciar = new Map();
  /** alumno → n de los avisos { tipo: 'sync' } recibidos desde la última actualización. */
  const syncsRecibidos = new Map();
  const temporizadores = { agrupar: 0, silencio: 0, limpiar: 0 };
  let cargaFicha = null;
  let cargaCuadernillo = null;
  let quitarServidor = () => {};
  let destruido = false;

  const quitarDelegar = delegar(raiz, {
    ficha: (el) => abrirFichaDe(el.dataset.id, el.dataset.foco),
    imprimir: (el) => imprimirGrupo(el.dataset.tipo, el),
    ordenar: (el) => ordenarPor(el.dataset.col),
    reintentar: () => iniciar(),
  });
  window.addEventListener('message', alMensajeVentana);

  await iniciar();
  return { destruir };

  /* ---------------- Carga y cálculo ---------------- */

  async function iniciar() {
    try {
      if (!state.pack) state.pack = (await cargarPaquete()).pack;
      huellasPrevias = huellas(leerServidor());
      state.datos = calcular();
      state.error = null;
    } catch (error) {
      console.error('[tecu] No se pudo preparar el panel docente', error);
      state.error = error;
      pintarError();
      return;
    }
    render();
    quitarServidor();
    quitarServidor = escucharServidor(alAvisoDelServidor);
    // Mientras tanto, se traen los módulos de la ficha y del cuadernillo (el primer clic no espera).
    cargarFicha().catch(() => {});
    cargarCuadernillo().catch(() => {});
    avisarAlPadre();
  }

  /** Mezcla el grupo simulado con lo sincronizado y lo pasa por la analítica. */
  function calcular() {
    const pack = state.pack;
    const grupo = grupoSimulado(pack);
    const servidor = leerServidor();
    const simulados = new Set(grupo.alumnos.map((a) => String(a.id)));
    const nombres = {};
    for (const a of grupo.alumnos) nombres[a.id] = a.nombre;
    const enVivo = [];
    for (const e of servidor) {
      const id = String(e.alumno);
      if (!simulados.has(id) && !enVivo.includes(id)) {
        enVivo.push(id);
        nombres[id] = nombreEnVivo(id);
      }
    }
    // Sin duplicar por id: lo del servidor gana (es lo más reciente).
    const eventos = new Map();
    for (const e of grupo.eventos) eventos.set(e.id, e);
    for (const e of servidor) eventos.set(e.id, e);

    const ahora = Date.now();
    const vivos = new Set(enVivo);
    const resumenes = resumirAlumnos([...eventos.values()], { ahora, nombres }).map((r) => ({
      ...r,
      nombre: r.nombre || nombres[r.id] || nombreEnVivo(r.id),
      enVivo: vivos.has(String(r.id)),
      simulado: simulados.has(String(r.id)),
    }));
    const porId = new Map(resumenes.map((r) => [String(r.id), r]));
    const porNombre = new Map(resumenes.map((r) => [r.nombre, r]));
    const resumenDe = (a) => {
      const id = idDe(a);
      return porId.get(String(id)) || porNombre.get(String(id)) || null;
    };
    const llamar = (aQuienLlamar(resumenes, pack, { ahora, max: MAX_LLAMADAS }) || [])
      .map((item) => ({ ...item, resumen: resumenDe(item.alumno) }))
      .filter((item) => item.resumen);
    const refuerzo = (gruposDeRefuerzo(resumenes, pack, { semilla: SEMILLA_REFUERZO }) || []).map((g) => ({
      ...g,
      integrantes: (g.alumnos || []).map((a) => resumenDe(a) || { id: idDe(a), nombre: String(a?.nombre ?? a) }),
      ejercicios: Array.isArray(g.ejercicios) ? g.ejercicios : [],
    }));
    return {
      resumenes,
      porId,
      grupo: resumirGrupo(resumenes) || {},
      llamar,
      refuerzo,
      enVivo,
      simulados: grupo.alumnos.length,
    };
  }

  /* ---------------- En vivo ---------------- */

  function alAvisoDelServidor(mensaje) {
    if (destruido || !mensaje || typeof mensaje !== 'object') return;
    if (mensaje.tipo === 'reinicio') {
      reiniciarPanel();
      return;
    }
    if (mensaje.tipo === 'sync' && mensaje.alumno) {
      const id = String(mensaje.alumno);
      syncsRecibidos.set(id, (syncsRecibidos.get(id) || 0) + (Number(mensaje.n) || 0));
    }
    clearTimeout(temporizadores.agrupar);
    temporizadores.agrupar = setTimeout(actualizar, MS_AGRUPAR);
  }

  /** Vuelve a leer el servidor, recalcula, resalta lo que cambió y lo anuncia. */
  function actualizar() {
    if (destruido || !state.pack) return;
    const servidor = leerServidor();
    const nuevas = huellas(servidor);
    const cambiados = new Map();
    for (const [id, h] of nuevas) {
      const previa = huellasPrevias.get(id);
      if (!previa || previa.texto !== h.texto) cambiados.set(h.alumno, (cambiados.get(h.alumno) || 0) + 1);
    }
    const quitados = [...huellasPrevias.keys()].some((id) => !nuevas.has(id));
    huellasPrevias = nuevas;
    const syncs = new Map(syncsRecibidos);
    syncsRecibidos.clear();
    if (!cambiados.size && !syncs.size && !quitados) return;

    const anterior = state.datos;
    try {
      state.datos = calcular();
    } catch (error) {
      console.error('[tecu] No se pudo recalcular el panel', error);
      return;
    }
    const alumnos = [...new Set([...cambiados.keys(), ...syncs.keys()])];
    if (alumnos.length) state.ultimaSync = { fecha: new Date(), alumnos };
    resaltar(clavesCambiadas(anterior, state.datos, alumnos), 'nuevo', MS_RESALTE);
    render();
    avisarAlPadre();

    for (const [id, n] of cambiados) porAnunciar.set(id, (porAnunciar.get(id) || 0) + n);
    if (syncs.size) {
      // El celular avisó que terminó: se anuncia ya, con el número que mandó.
      const lote = new Map();
      for (const [id, n] of syncs) {
        lote.set(id, n || porAnunciar.get(id) || 0);
        porAnunciar.delete(id);
      }
      anunciarSincronizacion(lote);
    }
    clearTimeout(temporizadores.silencio);
    if (porAnunciar.size) {
      temporizadores.silencio = setTimeout(() => {
        const lote = new Map(porAnunciar);
        porAnunciar.clear();
        anunciarSincronizacion(lote);
      }, MS_SILENCIO);
    }
  }

  /** "Ana sincronizó 4 actividades y Luis, 1 actividad." */
  function anunciarSincronizacion(lote) {
    const partes = [...lote]
      .filter(([, n]) => n > 0)
      .map(([id, n], i) => {
        const nombre = state.datos?.porId.get(id)?.nombre || nombreEnVivo(id);
        const cuantas = plural(n, 'actividad', 'actividades');
        return i === 0 ? `${nombre} sincronizó ${cuantas}` : `${nombre}, ${cuantas}`;
      });
    if (partes.length) aviso(`${enLista(partes)}.`, { tipo: 'exito', duracion: 5000 });
  }

  /** Qué marcar como "Actualizado" después de un cambio. */
  function clavesCambiadas(antes, despues, alumnos) {
    const claves = alumnos.flatMap((id) => [`fila:${id}`, `llamada:${id}`]);
    if (!antes) return claves;
    const g0 = antes.grupo || {};
    const g1 = despues.grupo || {};
    if (g0.activosSemana !== g1.activosSemana || g0.total !== g1.total) claves.push('kpi:activos');
    if (g0.dominados !== g1.dominados) claves.push('kpi:dominados');
    if (g0.porRevisar !== g1.porRevisar) claves.push('kpi:revisar');
    const firma = (lista) => (lista || []).slice(0, 4).map((m) => `${m.tipo}:${cuantos(m.alumnos)}:${m.ocurrencias}`).join('|');
    if (firma(g0.masRepetidos) !== firma(g1.masRepetidos)) claves.push('repetido');
    const integrantes = (lista) => new Map(lista.map((g) => [g.tipo, g.integrantes.map((a) => a.id).join(',')]));
    const previos = integrantes(antes.refuerzo);
    for (const [tipo, ids] of integrantes(despues.refuerzo)) {
      if (previos.get(tipo) !== ids) claves.push(`grupo:${tipo}`);
    }
    return claves;
  }

  /** Aviso { tipo: 'reinicio' } (botón "Reiniciar demo"): el panel vuelve a como se abrió. */
  function reiniciarPanel() {
    clearTimeout(temporizadores.agrupar);
    clearTimeout(temporizadores.silencio);
    porAnunciar.clear();
    syncsRecibidos.clear();
    state.resaltes.clear();
    state.ultimaSync = null;
    state.orden = ordenInicial(state.compacto);
    cerrarFicha();
    huellasPrevias = huellas(leerServidor());
    try {
      state.datos = calcular();
    } catch (error) {
      console.error('[tecu] No se pudo reiniciar el panel', error);
      return;
    }
    render();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    avisarAlPadre();
    anunciar('Se reinició la demostración. El panel volvió al inicio.');
  }

  /* ---------------- Resaltado ---------------- */

  function resaltar(claves, tipo, ms) {
    const hasta = Date.now() + ms;
    for (const clave of claves) state.resaltes.set(clave, { hasta, tipo });
    programarLimpieza();
  }

  function resaltado(clave) {
    const r = state.resaltes.get(clave);
    return r && r.hasta > Date.now() ? r : null;
  }

  /** Atributos de un elemento que se puede resaltar: data-resalte + data-nuevo | data-presentando. */
  function resalte(clave) {
    const r = resaltado(clave);
    return crudo(` data-resalte="${esc(clave)}"${r ? ` data-${r.tipo}` : ''}`);
  }

  function programarLimpieza() {
    clearTimeout(temporizadores.limpiar);
    const proximo = Math.min(...[...state.resaltes.values()].map((r) => r.hasta));
    if (!Number.isFinite(proximo)) return;
    temporizadores.limpiar = setTimeout(limpiarResaltes, Math.max(50, proximo - Date.now() + 20));
  }

  /** Quita las marcas vencidas sin repintar (no mueve el foco ni el scroll). */
  function limpiarResaltes() {
    const ahora = Date.now();
    for (const [clave, r] of state.resaltes) if (r.hasta <= ahora) state.resaltes.delete(clave);
    for (const el of raiz.querySelectorAll('[data-resalte]')) {
      if (state.resaltes.has(el.dataset.resalte)) continue;
      el.removeAttribute('data-nuevo');
      el.removeAttribute('data-presentando');
      for (const marca of el.querySelectorAll(`[data-marca="${CSS.escape(el.dataset.resalte)}"]`)) marca.remove();
    }
    programarLimpieza();
  }

  /** Texto visible "Actualizado" (lo resaltado no depende solo del color). */
  function marcaNuevo(clave) {
    if (resaltado(clave)?.tipo !== 'nuevo') return '';
    return html`<span class="docente-actualizado" data-marca="${clave}">${ico('sincronizar')} Actualizado</span>`;
  }

  /* ---------------- Acciones ---------------- */

  function cargarFicha() {
    cargaFicha ??= import('../ui/ficha.js').catch((error) => {
      cargaFicha = null;
      throw error;
    });
    return cargaFicha;
  }

  function cargarCuadernillo() {
    cargaCuadernillo ??= import('../ui/cuadernillo.js').catch((error) => {
      cargaCuadernillo = null;
      throw error;
    });
    return cargaCuadernillo;
  }

  /**
   * Abre la ficha de un estudiante (diálogo modal de js/ui/ficha.js). Al cerrarla,
   * el foco vuelve al botón que la abrió aunque el panel se haya repintado mientras tanto.
   */
  async function abrirFichaDe(id, claveFoco = null) {
    const resumen = state.datos?.porId.get(String(id));
    if (!resumen) return;
    let modulo;
    try {
      modulo = await cargarFicha();
    } catch (error) {
      console.error('[tecu] No se pudo cargar la ficha', error);
      aviso('No se pudo abrir la ficha. Recarga la página e inténtalo otra vez.', { tipo: 'error' });
      return;
    }
    if (destruido) return;
    cerrarFicha();
    const antes = new Set(document.querySelectorAll('dialog'));
    modulo.abrirFicha(resumen, state.pack);
    const dialogo = [...document.querySelectorAll('dialog[open]')].find((d) => !antes.has(d)) || null;
    state.ficha = { id: resumen.id, dialogo, foco: claveFoco };
    dialogo?.addEventListener(
      'close',
      () => {
        if (state.ficha?.dialogo === dialogo) state.ficha = null;
        // Después de que la ficha regrese el foco: si su botón ya no existe (repintado), al nuevo.
        setTimeout(() => devolverFoco(claveFoco), 0);
      },
      { once: true },
    );
  }

  function devolverFoco(claveFoco) {
    if (!claveFoco || destruido) return;
    const activo = document.activeElement;
    if (activo && activo !== document.body && activo.isConnected) return;
    const destino = raiz.querySelector(`[data-foco="${CSS.escape(claveFoco)}"]`);
    destino?.focus();
  }

  function cerrarFicha() {
    const dialogo = state.ficha?.dialogo;
    state.ficha = null;
    if (dialogo?.open) dialogo.close();
  }

  async function imprimirGrupo(tipo, boton) {
    const grupo = state.datos?.refuerzo.find((g) => g.tipo === tipo);
    if (!grupo) return;
    let modulo;
    try {
      modulo = await cargarCuadernillo();
    } catch (error) {
      console.error('[tecu] No se pudo cargar el cuadernillo', error);
      aviso('No se pudo preparar el cuadernillo. Recarga la página e inténtalo otra vez.', { tipo: 'error' });
      return;
    }
    const info = infoError(tipo);
    anunciar(`Preparando el cuadernillo de ${grupo.nombre || info.nombre}.`);
    try {
      modulo.imprimirCuadernillo(
        {
          titulo: grupo.nombre || info.nombre,
          alumnos: grupo.integrantes.map((a) => a.nombre),
          tipo,
          ejercicios: grupo.ejercicios,
        },
        state.pack,
      );
    } catch (error) {
      console.error('[tecu] Falló la impresión del cuadernillo', error);
      aviso('No se pudo imprimir el cuadernillo.', { tipo: 'error' });
    }
    if (boton?.isConnected) boton.focus({ preventScroll: true });
  }

  function ordenarPor(columna) {
    if (!columna) return;
    const actual = state.orden;
    const dir =
      actual.columna === columna ? (actual.dir === 'asc' ? 'desc' : 'asc') : columna === 'nombre' || columna === 'estado' ? 'asc' : 'desc';
    state.orden = { columna, dir };
    render();
    anunciar(`Mapa ordenado por ${nombreColumna(columna)}, ${textoDireccion(columna, dir)}.`);
  }

  /* ---------------- Modo presentación (postMessage) ---------------- */

  function alMensajeVentana(evento) {
    if (destruido || evento.origin !== location.origin) return;
    const d = evento.data;
    if (!d || typeof d !== 'object' || d.tecu !== 'control') return;
    if (d.cmd === 'abrirFicha') abrirFichaDe(String(d.alumno ?? '').toLowerCase());
    else if (d.cmd === 'cerrarFicha') cerrarFicha();
    else if (d.cmd === 'enfocar') enfocarSeccion(d.seccion);
  }

  /** Lleva la vista a una sección y la resalta un momento (sin mover el foco del teclado). */
  function enfocarSeccion(clave) {
    if (!CLAVES_SECCION.has(clave)) return;
    const seccion = raiz.querySelector(`[data-seccion="${clave}"]`);
    if (!seccion) return;
    resaltar([`seccion:${clave}`], 'presentando', MS_PRESENTAR);
    seccion.setAttribute('data-presentando', '');
    seccion.scrollIntoView({ behavior: movimientoReducido() ? 'auto' : 'smooth', block: 'start' });
  }

  function avisarAlPadre() {
    if (window.parent === window || !state.datos) return;
    try {
      window.parent.postMessage(
        {
          tecu: 'estado',
          vista: 'docente',
          alumnosEnVivo: [...state.datos.enVivo],
          ultimaSincronizacion: state.ultimaSync ? state.ultimaSync.fecha.toISOString() : null,
        },
        location.origin,
      );
    } catch {
      /* sin padre del mismo origen: nada que avisar */
    }
  }

  function destruir() {
    destruido = true;
    quitarServidor();
    quitarDelegar();
    window.removeEventListener('message', alMensajeVentana);
    Object.values(temporizadores).forEach(clearTimeout);
    cerrarFicha();
  }

  /* ---------------- Pintar ---------------- */

  function render() {
    if (!state.datos) return;
    pintar(state.compacto ? vistaCompacta() : vistaCompleta());
  }

  /** Repinta conservando el foco (renderConFoco), el scroll de la página y el de la tabla. */
  function pintar(contenido) {
    const activo = document.activeElement;
    const focoAdentro = Boolean(activo && activo !== document.body && raiz.contains(activo));
    const seccionDelFoco = focoAdentro ? activo.closest('[data-seccion]')?.dataset.seccion : null;
    const x = window.scrollX;
    const y = window.scrollY;
    const tabla = raiz.querySelector('.docente-tabla');
    const tablaScroll = tabla ? [tabla.scrollLeft, tabla.scrollTop] : null;

    renderConFoco(raiz, contenido);

    const nuevaTabla = raiz.querySelector('.docente-tabla');
    if (nuevaTabla && tablaScroll) [nuevaTabla.scrollLeft, nuevaTabla.scrollTop] = tablaScroll;
    if (window.scrollX !== x || window.scrollY !== y) window.scrollTo({ left: x, top: y, behavior: 'instant' });
    if (focoAdentro && !raiz.contains(document.activeElement)) {
      // Lo enfocado ya no existe (p. ej. alguien salió de "a quién llamar"): al título de su sección.
      const destino =
        (seccionDelFoco && raiz.querySelector(`[data-seccion="${seccionDelFoco}"] h2`)) || raiz.querySelector('h1');
      if (destino) {
        destino.setAttribute('tabindex', '-1');
        destino.focus({ preventScroll: true });
      }
    }
  }

  function pintarError() {
    raiz.innerHTML = String(html`
      <main id="contenido" class="contenido docente" tabindex="-1">
        <div class="vacio docente-error" role="alert">
          ${ico('alerta')}
          <h1 class="titulo-2">No se pudo abrir el panel</h1>
          <p>Revisa que la página haya cargado completa y vuelve a intentarlo.</p>
          <button type="button" class="boton boton--primario" data-act="reintentar">${ico('reiniciar')} Reintentar</button>
        </div>
      </main>`);
  }

  function vistaCompleta() {
    return html`
      <header class="barra-superior docente-barra">
        <p class="marca docente-marca">${crudo(tecu)}<span>Tecu Aprende</span></p>
        <nav class="docente-nav" aria-label="Secciones del panel">
          <ul>
            ${SECCIONES.map((s) => html`<li><a href="#docente-${s.clave}" data-foco="nav:${s.clave}">${s.corto}</a></li>`)}
          </ul>
        </nav>
        ${indicadorEnVivo()}
      </header>
      <main id="contenido" class="contenido docente" tabindex="-1">
        ${encabezado()}
        <div class="docente-resumen">
          ${seccionRepetido()}
          ${seccionIndicadores()}
        </div>
        ${seccionLlamar()}
        ${seccionMapa()}
        ${seccionGrupos()}
      </main>`;
  }

  function vistaCompacta() {
    return html`
      <header class="barra-superior docente-barra">
        <h1 class="docente-titulo" id="docente-titulo">${TITULO}</h1>
        ${indicadorEnVivo()}
      </header>
      <main id="contenido" class="contenido docente" tabindex="-1">
        ${notaSimulado()}
        ${seccionRepetido()}
        ${seccionLlamar()}
        ${seccionMapa()}
        ${seccionGrupos()}
      </main>`;
  }

  /* ---------------- Encabezado ---------------- */

  function indicadorEnVivo() {
    const u = state.ultimaSync;
    const quienes = u ? enLista(u.alumnos.map((id) => state.datos.porId.get(id)?.nombre || nombreEnVivo(id))) : '';
    return html`
      <div class="docente-vivo">
        <span class="chip chip--exito docente-vivo__chip"><span class="docente-vivo__punto" aria-hidden="true"></span>En vivo</span>
        <span class="docente-vivo__hora">${
          u
            ? html`Última sincronización: <strong>${hora(u.fecha)}</strong>${quienes ? html` · ${quienes}` : ''}`
            : 'Esperando sincronizaciones'
        }</span>
      </div>`;
  }

  function notaSimulado() {
    const vivos = state.datos.enVivo.map((id) => state.datos.porId.get(id)?.nombre || nombreEnVivo(id));
    return html`
      <p class="docente-nota">
        ${ico('info')}
        <span>Grupo simulado para la demostración: ${state.datos.simulados} estudiantes generados + los celulares que
        sincronizan en vivo${vivos.length ? ` (ahora: ${enLista(vivos)})` : ''}.</span>
      </p>`;
  }

  function encabezado() {
    return html`
      <div class="docente-encabezado">
        <h1 class="titulo-1" id="docente-titulo">${TITULO}</h1>
        <p class="docente-tema">
          ${ico('libro')}<span><strong>${state.pack.tema || 'Ecuaciones lineales con una incógnita'}</strong>${
            hoy ? html`<span class="docente-tema__fecha"> · ${hoy}</span>` : ''
          }</span>
        </p>
        ${notaSimulado()}
      </div>`;
  }

  /* ---------------- Lo que más se repite ---------------- */

  function infoError(tipo) {
    const errores = state.pack?.errores || {};
    const e = errores[tipo] || errores.NO_CLASIFICADO || {};
    return {
      tipo,
      nombre: e.nombre || tipo,
      corto: e.nombreCorto || e.nombre || tipo,
      icono: hayIcono(e.icono) ? e.icono : 'pregunta',
      tono: e.tono || 'gris',
      resumen: e.resumen || '',
      actividadGrupo: e.actividadGrupo || '',
    };
  }

  function tiposDeError() {
    return Object.keys(state.pack?.errores || {});
  }

  /** Un renglón real del grupo con ese error (primero de los celulares en vivo). */
  function ejemploDe(tipo) {
    const resumenes = [...state.datos.resumenes].sort((a, b) => Number(b.enVivo) - Number(a.enVivo));
    for (const r of resumenes) {
      const eventos = Array.isArray(r.eventos) ? r.eventos : [];
      for (let i = eventos.length - 1; i >= 0; i--) {
        const e = eventos[i]?.error;
        if (e?.tipo === tipo && e.anterior && e.texto) return { nombre: r.nombre, anterior: e.anterior, texto: e.texto };
      }
    }
    return null;
  }

  function barraDato(valor, maximo, texto) {
    return html`
      <div class="docente-dato">
        <span class="docente-dato__barra" aria-hidden="true"><span style="width: ${porcentaje(valor, maximo)}%"></span></span>
        <span class="docente-dato__texto">${texto}</span>
      </div>`;
  }

  function seccionRepetido() {
    const g = state.datos.grupo;
    const total = Number(g.total) || state.datos.resumenes.length;
    const lista = (g.masRepetidos || []).filter((m) => m && m.tipo && cuantos(m.alumnos) > 0);
    const [primero, ...resto] = lista;
    let cuerpo;
    if (!primero) {
      cuerpo = html`<p class="vacio">${ico('exito')} Todavía no hay errores registrados en el grupo.</p>`;
    } else {
      const info = infoError(primero.tipo);
      const n = cuantos(primero.alumnos);
      const veces = Number(primero.ocurrencias) || 0;
      const ejemplo = state.compacto ? null : ejemploDe(primero.tipo);
      cuerpo = html`
        <article class="docente-principal" data-tono="${info.tono}" aria-labelledby="docente-t-principal"${resalte('repetido')}>
          <div class="docente-principal__cabeza">
            <span class="docente-principal__icono">${ico(info.icono)}</span>
            <div class="pila pila--chica">
              <h3 class="titulo-2 docente-principal__nombre" id="docente-t-principal">${info.nombre}${marcaNuevo('repetido')}</h3>
              ${state.compacto ? '' : html`<p>${info.resumen}</p>`}
            </div>
          </div>
          ${barraDato(
            n,
            total,
            html`<strong>${n} de ${total}</strong> estudiantes (${porcentaje(n, total)} %)${veces ? html` · ${plural(veces, 'vez', 'veces')} en total` : ''}`,
          )}
          ${ejemplo
            ? html`
                <p class="docente-ejemplo">
                  <span class="docente-ejemplo__etiqueta">Así se ve <span class="texto-sec">(${ejemplo.nombre})</span>:</span>
                  <span class="docente-ejemplo__renglon">${htmlEcuacion(ejemplo.anterior)}</span>
                  <span class="docente-ejemplo__flecha">${ico('siguiente')}<span class="solo-lector">, y escribió:</span></span>
                  <span class="docente-ejemplo__renglon docente-ejemplo__renglon--error">${ico('error')}${htmlEcuacion(ejemplo.texto)}</span>
                </p>`
            : ''}
          ${info.actividadGrupo
            ? html`
                <div class="docente-accion">
                  <h4 class="docente-accion__titulo">${ico('grupo')} Para toda la clase</h4>
                  <p>${info.actividadGrupo}</p>
                </div>`
            : ''}
        </article>
        ${resto.length
          ? html`
              <h3 class="titulo-3 docente-siguientes__titulo">También se repite</h3>
              <ul class="docente-siguientes">
                ${resto.slice(0, state.compacto ? 2 : 3).map((m) => {
                  const i = infoError(m.tipo);
                  const k = cuantos(m.alumnos);
                  return html`
                    <li data-tono="${i.tono}">
                      <span class="docente-siguientes__nombre">${ico(i.icono)} ${i.nombre}</span>
                      ${barraDato(k, total, html`<strong>${k}</strong> ${k === 1 ? 'estudiante' : 'estudiantes'}`)}
                    </li>`;
                })}
              </ul>`
          : ''}`;
    }
    return html`
      <section class="tarjeta docente-seccion docente-repetido" id="docente-repetido" data-seccion="repetido"
        aria-labelledby="docente-t-repetido"${resalte('seccion:repetido')}>
        <h2 class="titulo-2 docente-seccion__titulo" id="docente-t-repetido">${ico('grafica')} Lo que más se repite en el grupo</h2>
        ${cuerpo}
      </section>`;
  }

  /* ---------------- Indicadores ---------------- */

  function seccionIndicadores() {
    const g = state.datos.grupo;
    const total = Number(g.total) || state.datos.resumenes.length;
    const kpi = (clave, nombreIcono, valor, etiqueta, detalle) => html`
      <div class="tarjeta docente-kpi"${resalte(`kpi:${clave}`)}>
        <dt class="docente-kpi__etiqueta">${ico(nombreIcono)} ${etiqueta}${marcaNuevo(`kpi:${clave}`)}</dt>
        <dd class="docente-kpi__valor">${valor}</dd>
        <dd class="docente-kpi__detalle">${detalle}</dd>
      </div>`;
    return html`
      <section class="docente-indicadores" aria-labelledby="docente-t-indicadores">
        <h2 class="titulo-3 docente-indicadores__titulo" id="docente-t-indicadores">Indicadores de la semana</h2>
        <dl class="docente-kpis">
          ${kpi('activos', 'grupo', html`${cuantos(g.activosSemana)}<span class="docente-kpi__de"> de ${total}</span>`, 'Activos esta semana', 'entraron a Tecu en los últimos 7 días')}
          ${kpi('dominados', 'trofeo', cuantos(g.dominados), 'Temas dominados', 'aprobaron la comprobación sin ayuda')}
          ${kpi('revisar', 'pregunta', cuantos(g.porRevisar), 'Por revisar', 'errores que Tecu no pudo clasificar: revísalos en clase')}
        </dl>
      </section>`;
  }

  /* ---------------- A quién llamar ---------------- */

  function sugerenciaDe(item) {
    if (item.sugerencia) return item.sugerencia;
    const r = item.resumen;
    if (item.motivo === 'inactivo' || item.motivo === 'sin_diagnostico') {
      return sugerenciaPorMotivo(item.motivo, { dias: r.diasSinActividad }, state.pack) || RESPALDO_LLAMADA[item.motivo];
    }
    const ejercicio = r.ultimoProcedimiento?.ejercicio;
    return ejercicio ? sugerenciaLlamada(r.errorDominante || 'NO_CLASIFICADO', ejercicio, state.pack) : '';
  }

  function seccionLlamar() {
    const items = state.datos.llamar.slice(0, state.compacto ? MAX_LLAMADAS_COMPACTO : MAX_LLAMADAS);
    return html`
      <section class="docente-seccion" id="docente-llamar" data-seccion="llamar" aria-labelledby="docente-t-llamar"${resalte('seccion:llamar')}>
        <div class="docente-seccion__cabeza">
          <h2 class="titulo-2 docente-seccion__titulo" id="docente-t-llamar">${ico('llamar')} A quién llamar esta semana</h2>
          ${items.length ? html`<p class="docente-seccion__nota">${plural(items.length, 'estudiante')} · 15 minutos con cada quien</p>` : ''}
        </div>
        ${items.length
          ? html`<ul class="docente-llamadas">${items.map(tarjetaLlamada)}</ul>`
          : html`<p class="vacio">${ico('exito')} Esta semana nadie necesita una llamada.</p>`}
      </section>`;
  }

  function tarjetaLlamada(item) {
    const r = item.resumen;
    const motivo = MOTIVOS[item.motivo] || MOTIVOS.por_revisar;
    const sugerencia = sugerenciaDe(item);
    return html`
      <li class="tarjeta docente-llamada" data-motivo="${item.motivo}"${resalte(`llamada:${r.id}`)}>
        <div class="docente-llamada__cabeza">
          <h3 class="titulo-3 docente-llamada__nombre">${r.nombre}</h3>
          ${r.enVivo ? insigniaEnVivo() : ''}
          <span class="chip ${motivo.clase}">${ico(motivo.icono)} ${motivo.texto}</span>
          ${marcaNuevo(`llamada:${r.id}`)}
        </div>
        ${item.detalle ? html`<p class="docente-llamada__porque">${item.detalle}</p>` : ''}
        ${sugerencia
          ? html`
              <div class="docente-llamada__plan">
                <p class="docente-llamada__plan-titulo">${ico('reloj')} En 15 minutos</p>
                <p>${sugerencia}</p>
              </div>`
          : ''}
        <button type="button" class="boton boton--secundario docente-llamada__boton" data-act="ficha" data-id="${r.id}"
          data-foco="llamar:${r.id}" aria-haspopup="dialog">${ico('ojo')} Ver ficha<span class="solo-lector"> de ${r.nombre}</span></button>
      </li>`;
  }

  function insigniaEnVivo() {
    return html`<span class="insignia docente-envivo">${ico('celular', { tamano: 16 })}En vivo</span>`;
  }

  /* ---------------- Mapa de dificultades ---------------- */

  function nombreColumna(columna) {
    if (columna === 'nombre') return 'nombre';
    if (columna === 'estado') return 'estado';
    if (columna === 'total') return 'total de errores';
    return infoError(columna).nombre;
  }

  function textoDireccion(columna, dir) {
    if (columna === 'nombre') return dir === 'asc' ? 'de la A a la Z' : 'de la Z a la A';
    if (columna === 'estado') return dir === 'asc' ? 'primero quien se atoró' : 'primero quien dominó el tema';
    return dir === 'desc' ? 'de más a menos' : 'de menos a más';
  }

  /** En vivo siempre arriba; dentro de cada bloque, el orden elegido (y luego por nombre). */
  function filasOrdenadas() {
    const { columna, dir } = state.orden;
    const signo = dir === 'asc' ? 1 : -1;
    const porNombre = (a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es');
    const valor = (r) => {
      if (columna === 'total') return totalErrores(r);
      if (columna === 'estado') return ESTADOS[r.estado]?.orden ?? 9;
      return Number(r.conteoErrores?.[columna]) || 0;
    };
    return [...state.datos.resumenes].sort(
      (a, b) =>
        Number(b.enVivo) - Number(a.enVivo) ||
        (columna === 'nombre' ? signo * porNombre(a, b) : signo * (valor(a) - valor(b)) || porNombre(a, b)),
    );
  }

  function encabezadoOrdenable(columna, contenido, { tono, clase = '' } = {}) {
    const activo = state.orden.columna === columna;
    const dir = activo ? (state.orden.dir === 'asc' ? 'ascending' : 'descending') : null;
    return html`
      <th scope="col" class="docente-th ${clase}"${attr('aria-sort', Boolean(dir), dir)}${attr('data-tono', Boolean(tono), tono)}>
        <button type="button" class="docente-orden" data-act="ordenar" data-col="${columna}" data-foco="orden:${columna}">
          ${contenido}<span class="docente-orden__flecha" aria-hidden="true">${ico(
            activo && state.orden.dir === 'asc' ? 'arriba' : 'abajo',
            { tamano: 16 },
          )}</span>
        </button>
      </th>`;
  }

  function seccionMapa() {
    const tipos = tiposDeError();
    const filas = filasOrdenadas();
    const { columna, dir } = state.orden;
    return html`
      <section class="docente-seccion" id="docente-mapa" data-seccion="mapa" aria-labelledby="docente-t-mapa"${resalte('seccion:mapa')}>
        <div class="docente-seccion__cabeza">
          <h2 class="titulo-2 docente-seccion__titulo" id="docente-t-mapa">${ico('grafica')} Mapa de dificultades</h2>
          ${leyenda()}
        </div>
        <div class="tabla-desplazable docente-tabla" tabindex="0" role="region" aria-label="Mapa de dificultades (se desplaza a los lados)" data-foco="tabla">
          <table class="docente-mapa">
            <caption>
              Veces que cada estudiante cometió cada tipo de error (${plural(filas.length, 'estudiante')}; los celulares en vivo van primero).
              Ordenado por ${nombreColumna(columna)}, ${textoDireccion(columna, dir)}.
              <span class="docente-mapa__ayuda">Toca un nombre para ver su ficha o un encabezado para ordenar.</span>
            </caption>
            <thead>
              <tr>
                ${encabezadoOrdenable('nombre', html`<span>Estudiante</span>`, { clase: 'docente-th--nombre' })}
                ${encabezadoOrdenable('estado', html`<span>Estado</span>`, { clase: 'docente-th--estado' })}
                ${tipos.map((t) => {
                  const i = infoError(t);
                  return encabezadoOrdenable(t, html`${ico(i.icono)}<span>${i.corto}</span>`, { tono: i.tono, clase: 'docente-th--error' });
                })}
                ${state.compacto ? '' : encabezadoOrdenable('total', html`<span>Total</span>`, { clase: 'docente-th--total' })}
              </tr>
            </thead>
            <tbody>
              ${filas.map((r) => filaMapa(r, tipos))}
            </tbody>
          </table>
        </div>
        ${state.compacto
          ? ''
          : html`
              <details class="docente-glosario">
                <summary>Qué significa cada columna</summary>
                <dl>
                  ${tipos.map((t) => {
                    const i = infoError(t);
                    return html`<div data-tono="${i.tono}"><dt>${ico(i.icono)} ${i.corto}: ${i.nombre}</dt><dd>${i.resumen}</dd></div>`;
                  })}
                </dl>
              </details>`}
      </section>`;
  }

  function leyenda() {
    return html`
      <div class="docente-leyenda">
        <span class="docente-leyenda__titulo">Intensidad:</span>
        <ul>
          <li><span class="docente-leyenda__muestra" data-nivel="0" aria-hidden="true">0</span> sin errores</li>
          ${NIVELES.map(
            (n) => html`<li><span class="docente-leyenda__muestra" data-nivel="${n.nivel}" aria-hidden="true">${n.nivel === 3 ? '4+' : n.nivel === 2 ? '2' : '1'}</span> ${n.texto}</li>`,
          )}
        </ul>
      </div>`;
  }

  function filaMapa(r, tipos) {
    const estado = ESTADOS[r.estado] || ESTADOS.sin_actividad;
    const dias = Number(r.diasSinActividad);
    const extra = r.estado === 'inactivo' && Number.isFinite(dias) ? ` · ${plural(dias, 'día')}` : '';
    return html`
      <tr data-alumno="${r.id}"${resalte(`fila:${r.id}`)}>
        <th scope="row" class="docente-celda-nombre">
          <span class="docente-celda-nombre__contenido">
            <button type="button" class="docente-alumno" data-act="ficha" data-id="${r.id}" data-foco="mapa:${r.id}" aria-haspopup="dialog">${r.nombre}</button>
            ${r.enVivo ? insigniaEnVivo() : ''}
            ${marcaNuevo(`fila:${r.id}`)}
          </span>
        </th>
        <td class="docente-celda-estado"><span class="chip ${estado.clase}">${ico(estado.icono)} ${state.compacto ? estado.corto : estado.texto}${state.compacto ? '' : extra}</span></td>
        ${tipos.map((t) => {
          const n = Number(r.conteoErrores?.[t]) || 0;
          return html`<td class="docente-celda" data-nivel="${nivelDe(n)}" data-tono="${infoError(t).tono}">${n}</td>`;
        })}
        ${state.compacto ? '' : html`<td class="docente-celda docente-celda--total">${totalErrores(r)}</td>`}
      </tr>`;
  }

  /* ---------------- Grupos de refuerzo ---------------- */

  function seccionGrupos() {
    const grupos = state.datos.refuerzo;
    return html`
      <section class="docente-seccion" id="docente-grupos" data-seccion="grupos" aria-labelledby="docente-t-grupos"${resalte('seccion:grupos')}>
        <div class="docente-seccion__cabeza">
          <h2 class="titulo-2 docente-seccion__titulo" id="docente-t-grupos">${ico('grupo')} Grupos de refuerzo sugeridos</h2>
          ${state.compacto
            ? ''
            : html`<p class="docente-seccion__nota">Junta a quienes comparten el mismo error. El cuadernillo trae los mismos ejercicios que la app, para quien no tiene celular.</p>`}
        </div>
        ${grupos.length
          ? html`<ul class="docente-grupos">${grupos.map(tarjetaGrupo)}</ul>`
          : html`<p class="vacio">${ico('grupo')} Todavía no hay errores compartidos para formar grupos.</p>`}
      </section>`;
  }

  function tarjetaGrupo(g) {
    const info = infoError(g.tipo);
    const nombre = g.nombre || info.nombre;
    const nombres = g.integrantes.map((a) => (a.enVivo ? `${a.nombre} (en vivo)` : a.nombre));
    return html`
      <li class="tarjeta tarjeta--tono docente-grupo" data-tono="${info.tono}"${resalte(`grupo:${g.tipo}`)}>
        <div class="docente-grupo__cabeza">
          <h3 class="titulo-3 docente-grupo__titulo">${ico(info.icono)} ${nombre}</h3>
          ${marcaNuevo(`grupo:${g.tipo}`)}
        </div>
        <p class="docente-grupo__integrantes"><strong>${plural(nombres.length, 'estudiante')}:</strong> ${enLista(nombres)}</p>
        ${state.compacto
          ? ''
          : html`
              <div class="docente-grupo__bloque">
                <h4 class="docente-grupo__subtitulo">Actividad sugerida</h4>
                <p>${g.actividad || info.actividadGrupo}</p>
              </div>
              ${g.ejercicios.length
                ? html`
                    <div class="docente-grupo__bloque">
                      <h4 class="docente-grupo__subtitulo">Ejercicios del cuadernillo (${g.ejercicios.length})</h4>
                      <ol class="docente-ejercicios">
                        ${g.ejercicios.map((e) => html`<li>${htmlEcuacion(e.ecuacion ?? e)}</li>`)}
                      </ol>
                    </div>`
                : ''}`}
        <button type="button" class="boton boton--primario docente-grupo__boton" data-act="imprimir" data-tipo="${g.tipo}"
          data-foco="imprimir:${g.tipo}">${ico('imprimir')} Imprimir cuadernillo<span class="solo-lector">: ${nombre}</span></button>
      </li>`;
  }
}

/** Orden inicial del mapa: por nombre (completo) o por estado, primero quien se atoró (compacto). */
function ordenInicial(compacto) {
  return compacto ? { columna: 'estado', dir: 'asc' } : { columna: 'nombre', dir: 'asc' };
}
