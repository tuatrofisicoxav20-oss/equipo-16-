/**
 * Director del modo presentación (fase 5): qué hacer en cada paso del guion GUIDE.
 *
 * Es puro: no toca el DOM ni el almacenamiento. Habla con las vistas reales (los dos
 * teléfonos y el panel docente, en iframes) solo con lo que le pasa js/views/pitch.js:
 *
 *   enviar(destino, mensaje)           destino 'ana' | 'luis' | 'docente'; mensaje sin `tecu`
 *   esperarEstado(destino, pred, ms)   se resuelve cuando el último { tecu: 'estado' } de ese
 *                                      destino cumple `pred` (o se rinde a los `ms`)
 *   esperar(ms)                        pausa cosmética (respeta movimiento reducido)
 *   avisar(texto)                      nota visible solo para el presentador
 *
 * Cómo se porta (la historia completa está en docs/GUION-DEMO.md):
 * - Espera por estado, no por reloj. Cada orden se confirma con el estado que manda la
 *   vista; los números de TIEMPOS son límites, no pausas. Mientras la vista siga
 *   cambiando se le tiene paciencia; si se queda quieta TIEMPOS.quieto, se avisa.
 * - Idempotente. Cada paso lleva la escena a su estado final desde donde esté: tocar el
 *   mismo paso mientras corre devuelve la misma promesa, y tocarlo ya terminado no repite
 *   nada (para volver a ver escribir a Ana o a Luis está reproducir(), teclas A y L).
 * - Tolerante al desorden. Si falta algo (por ejemplo, el diagnóstico antes de las
 *   rutas), lo prepara y se lo dice al presentador con avisar().
 * - Cancelable. Un paso nuevo cancela al anterior: el anterior ya no manda nada y su
 *   promesa se resuelve con { cancelado: true }. Las órdenes que van juntas (reiniciar +
 *   reproducirDiagnostico) salen juntas, así que cancelar nunca deja un teléfono a medias.
 *   Lo que un paso cancelado dejó corriendo en un teléfono (una reproducción, un avance de
 *   la ruta) lo hereda el siguiente: espera a que termine en lugar de repetirlo.
 * - Nunca rechaza: toda promesa se resuelve con un Resultado.
 *
 * Detalles de las vistas que se aprovechan (docs/ARQUITECTURA.md, "comportamiento real"):
 * reiniciar, irA y simularRed se aplican al recibirse; reproducirDiagnostico y avanzarRuta
 * van en la cola del teléfono, una tras otra. reiniciar no toca la red simulada.
 */
import { GUIONES } from './guiones.js';

/**
 * @typedef {{ accion: string, ok: boolean, cancelado: boolean, avisos: string[] }} Resultado
 *   ok: la escena quedó lista sin problemas · cancelado: otra acción la reemplazó ·
 *   avisos: las notas que se le mostraron al presentador durante la acción.
 */

/** Los dos teléfonos del escenario (las claves de GUIONES). */
export const ALUMNOS = Object.freeze(['ana', 'luis']);

/**
 * Límites de espera en ms. No son pausas: cada espera termina en cuanto llega el estado.
 * Medidos con las vistas reales (diagnóstico rápido ≈ 16 s, entrar a la ruta ≈ 3 s,
 * balanza ≈ 5 s, práctica completa ≈ 12 s) y con holgura para una laptop lenta.
 */
export const TIEMPOS = Object.freeze({
  /** Un teléfono que aún está cargando manda su primer estado. */
  arranque: 10000,
  /** Leer el último estado del panel docente. */
  sondeo: 2500,
  /** Órdenes inmediatas (reiniciar, irA, simularRed) que se reflejan en el estado. */
  confirmar: 5000,
  /** Sin ningún cambio de estado durante este tiempo, la vista se atoró. */
  quieto: 15000,
  /** Los 4 ejercicios del diagnóstico, escritos con animación, hasta "Tu resultado". */
  diagnostico: 75000,
  /** Cada avanzarRuta, según la actividad a la que llega. */
  avance: Object.freeze({ visual: 20000, practica: 25000, comprobacion: 45000 }),
  /** Después de volver la red, la cola llega a 0. */
  sincronizar: 25000,
  /** El panel docente muestra lo que acaba de llegar. */
  panel: 6000,
  /** Pausa cosmética: que se vea "Sin internet" antes de seguir resolviendo. */
  antesDeAvanzar: 1200,
  /** Pausa cosmética: que se vea "A quién llamar" antes de abrir la ficha. */
  antesDeFicha: 2500,
});

/** Actividad a la que llega cada avanzarRuta (completa la actual y pasa a la siguiente). */
const SIGUIENTE = Object.freeze({
  'sin-empezar': 'visual',
  pregunta: 'visual',
  visual: 'practica',
  practica: 'comprobacion',
});

/** Avances de la ruta en modo avión: los suficientes para que la cola crezca a la vista. */
const AVANCES_SIN_RED = 2;

/** Holgura del respaldo propio, por si esperarEstado() o esperar() no respetan su límite. */
const HOLGURA = 1500;

/** Tope de vueltas al esperar con avance (una vista que cambia sin parar no nos atora). */
const MAX_VUELTAS = 300;

const PANTALLAS_CON_RUTA = new Set(['resultado', 'ruta', 'dominado']);
const CAMPOS_FIRMA = ['pantalla', 'ejercicio', 'actividad', 'ruta', 'pendientes', 'enLinea', 'sincronizando', 'dominado'];

/* ------------------------------------------------------------------ */
/* Textos para el presentador                                          */
/* ------------------------------------------------------------------ */

const nombreDe = (alumno) => GUIONES[alumno]?.nombre || String(alumno);
const teclaDe = (alumno) => nombreDe(alumno).charAt(0).toUpperCase();

/** ['ana', 'luis'] → "Ana y Luis" */
function enLista(alumnos) {
  const nombres = alumnos.map(nombreDe);
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0] || '';
}

const plural = (lista, uno, varios) => (lista.length > 1 ? varios : uno);
const porMotivo = (motivo) => (motivo === 'quieto' ? 'se detuvo' : 'tardó demasiado');

const TEXTOS = {
  sinRespuesta: (alumno) =>
    `El teléfono de ${nombreDe(alumno)} no responde. Recarga la página (F5); si sigue igual, usa el plan B del guion.`,
  panelSinRespuesta: 'El panel docente no responde. Recarga la página (F5); si sigue igual, usa el plan B del guion.',
  noConfirmo: (alumno, que) =>
    `${nombreDe(alumno)} no confirmó ${que} a tiempo. Toca el paso otra vez; si sigue igual, toca R para reiniciar.`,
  diagnosticoPrimero: (lista) => `Falta el diagnóstico de ${enLista(lista)}: lo hago primero (tarda unos segundos).`,
  diagnosticoSinRed: (lista) =>
    `${enLista(lista)} no ${plural(lista, 'tenía', 'tenían')} diagnóstico: lo hago ya sin internet y la cola crece igual.`,
  yaDiagnosticados: (lista) =>
    `${enLista(lista)} ya ${plural(lista, 'tenía', 'tenían')} su diagnóstico: muestro el resultado. ` +
    `Para que ${plural(lista, 'vuelva', 'vuelvan')} a escribir, toca ${lista.map(teclaDe).join(' o ')}.`,
  diagnosticoFallo: (alumno, motivo) =>
    `El diagnóstico de ${nombreDe(alumno)} ${porMotivo(motivo)}. Toca ${teclaDe(alumno)} para repetirlo o R para reiniciar.`,
  avanceFallo: (alumno, motivo) =>
    `La ruta de ${nombreDe(alumno)} ${porMotivo(motivo)}. Toca el paso otra vez o R para reiniciar.`,
  colaNoCrece: (alumno) =>
    `La ruta de ${nombreDe(alumno)} ya llegó a la comprobación: su cola no crece. Para repetir la escena desde cero, toca R.`,
  sinRedReal: (alumno) =>
    `${nombreDe(alumno)} sigue sin internet porque la computadora no tiene red. ` +
    'Conéctala a cualquier wifi o al hotspot de un celular (no necesita datos).',
  sincronizacionFallo: (alumno, motivo) =>
    `La cola de ${nombreDe(alumno)} ${porMotivo(motivo)} al vaciarse. Toca 5 otra vez; si sigue igual, recarga la página (F5).`,
  nadaPendiente: 'No había nada pendiente: para ver la cola vaciarse, primero toca 4 (modo avión).',
  panelSinConfirmar: 'El panel docente no confirmó los datos nuevos. Si no los ves, recarga la página (F5).',
  regresaSenal: 'Ana tenía su avance guardado sin internet: regreso la señal para que llegue al panel.',
  anaSinDatos: 'Ana todavía no tiene nada en el panel: empieza por el paso 2 (Ana y Luis).',
  anaNoLlega: 'Ana todavía no aparece en el panel: su ficha se abre cuando llegue su avance (toca 6 otra vez).',
  pasoDesconocido: (id) => `No conozco el paso «${id}».`,
  alumnoDesconocido: 'Solo puedo reproducir a Ana o a Luis.',
  falloInterno: 'Algo falló al preparar la escena. Toca el paso otra vez o usa el plan B del guion.',
};

/* ------------------------------------------------------------------ */
/* Lectura de estados (a prueba de estados raros)                      */
/* ------------------------------------------------------------------ */

const esEstado = (e) => Boolean(e) && typeof e === 'object' && !Array.isArray(e);

/** ¿Este estado es de ese destino? (descarta lo que no viene de esa vista) */
function esDe(destino, e) {
  if (!esEstado(e)) return false;
  if (destino === 'docente') return e.vista === 'docente' || (e.vista === undefined && Array.isArray(e.alumnosEnVivo));
  if (e.vista === 'docente') return false;
  return e.alumno === undefined || e.alumno === null || String(e.alumno) === destino;
}

const pantallaDe = (e) => (esEstado(e) && typeof e.pantalla === 'string' ? e.pantalla : null);
const actividadDe = (e) => (esEstado(e) && typeof e.actividad === 'string' && e.actividad ? e.actividad : null);
/** Número de pendientes, o null si el estado no lo trae bien. */
const pendientesDe = (e) => (esEstado(e) && Number.isFinite(e.pendientes) && e.pendientes >= 0 ? e.pendientes : null);

/** ¿Ya terminó el diagnóstico? (tiene ruta asignada) */
function tieneRuta(e) {
  if (!esEstado(e)) return false;
  return (
    e.dominado === true ||
    (typeof e.ruta === 'string' && e.ruta !== '') ||
    actividadDe(e) !== null ||
    PANTALLAS_CON_RUTA.has(pantallaDe(e))
  );
}

/** Un teléfono recién reiniciado: en Inicio, sin ruta y sin nada guardado. */
const estaLimpio = (e) => pantallaDe(e) === 'inicio' && !tieneRuta(e) && pendientesDe(e) === 0;

/** Después de reiniciar: sin ruta, en Inicio (o ya empezando un diagnóstico nuevo). */
const recienReiniciado = (e) => !tieneRuta(e) && (pantallaDe(e) === 'inicio' || pantallaDe(e) === 'diagnostico');

const puedeAvanzar = (e) => e?.dominado !== true && actividadDe(e) !== 'comprobacion';

function enVivo(panel, alumno) {
  return esEstado(panel) && Array.isArray(panel.alumnosEnVivo) && panel.alumnosEnVivo.map(String).includes(alumno);
}

/** Lo que distingue un estado de otro (para saber si la vista sigue avanzando). */
function firma(e) {
  if (!esEstado(e)) return '';
  try {
    return JSON.stringify(CAMPOS_FIRMA.map((campo) => e[campo] ?? null));
  } catch {
    return '?';
  }
}

/* ------------------------------------------------------------------ */
/* Cancelación                                                         */
/* ------------------------------------------------------------------ */

class Cancelado extends Error {
  constructor() {
    super('Acción cancelada por otra más reciente');
    this.name = 'Cancelado';
  }
}

function crearToken() {
  let cancelado = false;
  let rechazar = () => {};
  const senal = new Promise((_, r) => {
    rechazar = r;
  });
  senal.catch(() => {});
  return {
    get cancelado() {
      return cancelado;
    },
    cancelar() {
      if (cancelado) return;
      cancelado = true;
      rechazar(new Cancelado());
    },
    verificar() {
      if (cancelado) throw new Cancelado();
    },
    /** La promesa, o Cancelado en cuanto cancelen (lo que pase primero). */
    carrera(promesa) {
      return Promise.race([promesa, senal]);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Director                                                            */
/* ------------------------------------------------------------------ */

/**
 * Crea el director de escenas del modo presentación.
 * @param {{
 *   enviar: (destino: string, mensaje: object) => unknown,
 *   esperarEstado: (destino: string, predicado: (estado: object) => boolean, ms: number) => Promise<unknown>,
 *   esperar?: (ms: number) => Promise<unknown>,
 *   avisar?: (texto: string) => unknown,
 * }} dependencias
 * @returns {{
 *   irAPaso: (id: string) => Promise<Resultado>,
 *   reproducir: (alumno: 'ana'|'luis') => Promise<Resultado>,
 *   modoAvion: (sinInternet?: boolean) => Promise<Resultado>,
 *   reiniciar: () => Promise<Resultado>,
 * }}
 */
export function crearDirector({ enviar, esperarEstado, esperar, avisar } = {}) {
  if (typeof enviar !== 'function' || typeof esperarEstado !== 'function') {
    throw new TypeError('crearDirector() necesita enviar(destino, mensaje) y esperarEstado(destino, predicado, ms).');
  }

  /** Último estado visto de cada destino (lo van anotando los predicados). */
  const ultimo = new Map();
  /** Lo que un teléfono está haciendo por encargo del director y aún no termina. */
  const encargos = new Map();
  /** Acciones en curso: { clave, grupo, token, promesa }. */
  const operaciones = new Set();
  /** ¿El director abrió una ficha en el panel? (se cierra al volver a otro paso) */
  let fichaAbierta = false;

  const ESCENAS = new Map([
    ['problema', async () => {}], // la vista muestra la diapositiva; nada en los teléfonos
    ['diagnostico', escenaDiagnostico],
    ['rutas', escenaRutas],
    ['avion', escenaAvion],
    ['sincronizacion', escenaSincronizacion],
    ['panel', escenaPanel],
  ]);

  /* ---------------- API ---------------- */

  /**
   * Prepara la escena de un paso de GUIDE.
   * @param {string} id problema | diagnostico | rutas | avion | sincronizacion | panel
   */
  function irAPaso(id) {
    const escena = typeof id === 'string' ? ESCENAS.get(id) : undefined;
    if (!escena) return rechazo(String(id), TEXTOS.pasoDesconocido(id));
    return lanzar({ accion: id, clave: `paso:${id}`, grupo: 'paso', cancela: () => true }, escena);
  }

  /**
   * Ana o Luis escriben otra vez su diagnóstico: reiniciar + reproducirDiagnostico con GUIONES.
   * Si su diagnóstico ya se está reproduciendo, espera a que termine en lugar de empezarlo de nuevo.
   * @param {'ana'|'luis'} alumno
   */
  function reproducir(alumno) {
    const id = typeof alumno === 'string' ? alumno.trim().toLowerCase() : '';
    if (!ALUMNOS.includes(id)) return rechazo('reproducir', TEXTOS.alumnoDesconocido);
    const clave = `reproducir:${id}`;
    return lanzar({ accion: clave, clave, grupo: 'reproducir', cancela: (op) => op.grupo === 'paso' }, async (ctx) => {
      const encargo = encargos.get(id);
      if (encargo?.tipo === 'diagnostico') {
        const r = await cumplirEncargo(ctx, id, encargo);
        if (r.ok) return;
      }
      await diagnosticar(ctx, id, { conReinicio: true });
    });
  }

  /**
   * Modo avión en los dos teléfonos (simularRed). Cancela el paso que esté corriendo.
   * @param {boolean} [sinInternet=true]
   */
  function modoAvion(sinInternet = true) {
    const sin = Boolean(sinInternet);
    const cancela = (op) => op.grupo === 'paso' || op.grupo === 'red';
    return lanzar({ accion: 'modoAvion', clave: `red:${sin}`, grupo: 'red', cancela }, async (ctx) => {
      const enviados = ALUMNOS.map((alumno) => mandar(ctx, alumno, { cmd: 'simularRed', sinInternet: sin }));
      await enParalelo(ALUMNOS, async (alumno, i) => {
        if (!enviados[i]) return sinRespuesta(ctx, alumno);
        if (await esperarQue(ctx, alumno, (e) => e.enLinea === !sin, TIEMPOS.confirmar)) return { ok: true };
        if (!ultimo.has(alumno)) return sinRespuesta(ctx, alumno);
        return sin ? noConfirmo(ctx, alumno, 'el modo avión') : sinRedReal(ctx, alumno);
      });
    });
  }

  /**
   * Deja la demo como al principio: reiniciar + simularRed(false) en los dos teléfonos y
   * cerrarFicha en el panel. Cancela todo lo que esté corriendo. (Los eventos que ya llegaron
   * al "servidor" los borra reiniciarTodo() de store.js; eso le toca a la vista del pitch.)
   */
  function reiniciar() {
    return lanzar({ accion: 'reiniciar', clave: 'reiniciar', grupo: 'reinicio', cancela: () => true }, async (ctx) => {
      const pendientes = ALUMNOS.map((alumno) => {
        const ok = mandar(ctx, alumno, { cmd: 'reiniciar' }) && mandar(ctx, alumno, { cmd: 'simularRed', sinInternet: false });
        return ok ? encargar(alumno, 'reinicio', [recienReiniciado], TIEMPOS.confirmar) : null;
      });
      mandar(ctx, 'docente', { cmd: 'cerrarFicha' });
      fichaAbierta = false;
      await enParalelo(ALUMNOS, async (alumno, i) => {
        if (!pendientes[i]) return sinRespuesta(ctx, alumno);
        const r = await cumplirEncargo(ctx, alumno, pendientes[i]);
        if (!r.ok) return noConfirmo(ctx, alumno, 'el reinicio');
        if (await esperarQue(ctx, alumno, (e) => e.enLinea === true, TIEMPOS.confirmar)) return { ok: true };
        return sinRedReal(ctx, alumno);
      });
    });
  }

  /* ---------------- Escenas de cada paso ---------------- */

  /** Ana y Luis escriben su diagnóstico al mismo tiempo, hasta "Tu resultado". */
  async function escenaDiagnostico(ctx) {
    cerrarFichaSiAbierta(ctx);
    const resultados = await enParalelo(ALUMNOS, (alumno) => mostrarDiagnostico(ctx, alumno));
    const ya = ALUMNOS.filter((_, i) => resultados[i].yaEstaba);
    if (ya.length) ctx.aviso(TEXTOS.yaDiagnosticados(ya));
  }

  async function mostrarDiagnostico(ctx, alumno) {
    const encargo = encargos.get(alumno);
    // Un avance de la ruta a medias no se espera: irA('resultado') lo interrumpe en el teléfono.
    if (encargo?.tipo === 'avance') encargos.delete(alumno);
    const continua = encargo?.tipo === 'diagnostico';
    const estado = await leer(ctx, alumno);
    if (!estado) return sinRespuesta(ctx, alumno);
    if (!tieneRuta(estado)) return diagnosticar(ctx, alumno, { conReinicio: !estaLimpio(estado) });
    const r = await mostrarPantalla(ctx, alumno, estado, 'resultado', 'su resultado');
    return r.ok ? { ...r, yaEstaba: !continua } : r;
  }

  /** Cada quien entra a su ruta y llega a la balanza (Ana quita pesas; Luis reparte). */
  async function escenaRutas(ctx) {
    cerrarFichaSiAbierta(ctx);
    const estados = await enParalelo(ALUMNOS, (alumno) => leer(ctx, alumno));
    const faltan = ALUMNOS.filter((_, i) => estados[i] && !tieneRuta(estados[i]));
    if (faltan.length) ctx.aviso(TEXTOS.diagnosticoPrimero(faltan));
    await enParalelo(ALUMNOS, (alumno, i) => entrarARuta(ctx, alumno, estados[i]));
  }

  async function entrarARuta(ctx, alumno, estado) {
    if (!estado) return sinRespuesta(ctx, alumno);
    let actual = estado;
    if (!tieneRuta(actual)) {
      const r = await diagnosticar(ctx, alumno, { conReinicio: !estaLimpio(actual) });
      if (!r.ok) return r;
      actual = r.estado;
    }
    if (actual.dominado === true) return { ok: true, estado: actual };
    const actividad = actividadDe(actual);
    // Desde "Tu resultado" o la pregunta, un avanzarRuta entra a la ruta y llega a la balanza.
    if (actividad === null || actividad === 'pregunta') return avanzar(ctx, alumno, actual);
    // Ya está en la balanza o más adelante: no se regresa, solo se muestra su ruta.
    return mostrarPantalla(ctx, alumno, actual, 'ruta', 'su ruta');
  }

  /** Sin internet la lección sigue: los dos resuelven y la cola de pendientes crece. */
  async function escenaAvion(ctx) {
    cerrarFichaSiAbierta(ctx);
    // Primero la red, para que todo lo que pase después (aun lo que ya venía en camino) se quede en el cel.
    const enviados = ALUMNOS.map((alumno) => mandar(ctx, alumno, { cmd: 'simularRed', sinInternet: true }));
    const lecturas = await enParalelo(ALUMNOS, async (alumno, i) => {
      if (!enviados[i]) return sinRespuesta(ctx, alumno);
      if (!(await esperarQue(ctx, alumno, (e) => e.enLinea === false, TIEMPOS.confirmar))) {
        return ultimo.has(alumno) ? noConfirmo(ctx, alumno, 'el modo avión') : sinRespuesta(ctx, alumno);
      }
      const estado = await leer(ctx, alumno);
      return estado ? { ok: true, estado } : sinRespuesta(ctx, alumno);
    });
    const listos = ALUMNOS.filter((_, i) => lecturas[i].ok);
    if (!listos.length) return;
    const faltan = listos.filter((alumno) => !tieneRuta(lecturas[ALUMNOS.indexOf(alumno)].estado));
    if (faltan.length) ctx.aviso(TEXTOS.diagnosticoSinRed(faltan));
    await pausa(ctx, TIEMPOS.antesDeAvanzar);
    await enParalelo(listos, (alumno) => crecerCola(ctx, alumno, lecturas[ALUMNOS.indexOf(alumno)].estado));
  }

  async function crecerCola(ctx, alumno, estado) {
    if (!tieneRuta(estado)) return diagnosticar(ctx, alumno, { conReinicio: !estaLimpio(estado) });
    let actual = estado;
    let avances = 0;
    while (avances < AVANCES_SIN_RED && puedeAvanzar(actual)) {
      const r = await avanzar(ctx, alumno, actual);
      if (!r.ok) return r;
      actual = r.estado;
      avances += 1;
    }
    if (!avances && !(pendientesDe(actual) > 0)) ctx.aviso(TEXTOS.colaNoCrece(alumno));
    return { ok: true, estado: actual };
  }

  /** Vuelve la señal: la cola se vacía sola y el panel se actualiza sin recargar. */
  async function escenaSincronizacion(ctx) {
    cerrarFichaSiAbierta(ctx);
    // Cómo estaban ANTES de volver la red (sin esperar lo que tengan a medias).
    const antes = Promise.all([leerPanel(ctx), ...ALUMNOS.map((alumno) => leer(ctx, alumno, { heredar: false }))]);
    antes.catch(() => {});
    const enviados = ALUMNOS.map((alumno) => mandar(ctx, alumno, { cmd: 'simularRed', sinInternet: false }));
    const [panel, ...estados] = await antes;
    const resultados = await enParalelo(ALUMNOS, (alumno, i) => vaciarCola(ctx, alumno, enviados[i]));
    if (!estados.some((e) => pendientesDe(e) > 0)) {
      ctx.aviso(TEXTOS.nadaPendiente);
      return;
    }
    // El panel confirma que recibió lo que estaba guardado sin internet.
    const guardado = estados.some((e, i) => e?.enLinea === false && pendientesDe(e) > 0 && resultados[i].ok);
    if (!panel || !guardado) return;
    const sinc = panel.ultimaSincronizacion;
    const llego = await esperarQue(ctx, 'docente', (d) => d.ultimaSincronizacion !== sinc, TIEMPOS.panel);
    if (!llego) ctx.aviso(TEXTOS.panelSinConfirmar);
  }

  async function vaciarCola(ctx, alumno, enviado) {
    if (!enviado) return sinRespuesta(ctx, alumno);
    if (!(await esperarQue(ctx, alumno, (e) => e.enLinea === true, TIEMPOS.confirmar))) {
      return ultimo.has(alumno) ? sinRedReal(ctx, alumno) : sinRespuesta(ctx, alumno);
    }
    const vacia = (e) => pendientesDe(e) === 0 && e.sincronizando !== true;
    const r = await esperarConAvance(ctx, alumno, vacia, Date.now() + TIEMPOS.sincronizar);
    return r.ok ? r : fallo(ctx, alumno, r.motivo, TEXTOS.sincronizacionFallo);
  }

  /** El panel resalta "A quién llamar esta semana" y abre la ficha de Ana. */
  async function escenaPanel(ctx) {
    const panel = await leerPanel(ctx);
    if (!panel) ctx.problema(TEXTOS.panelSinRespuesta);
    if (fichaAbierta) {
      mandar(ctx, 'docente', { cmd: 'cerrarFicha' });
      fichaAbierta = false;
    }
    if (!mandar(ctx, 'docente', { cmd: 'enfocar', seccion: 'llamar' })) {
      ctx.problema(TEXTOS.panelSinRespuesta);
      return;
    }
    if (panel && !enVivo(panel, 'ana')) await traerAnaAlPanel(ctx);
    await pausa(ctx, TIEMPOS.antesDeFicha);
    if (mandar(ctx, 'docente', { cmd: 'abrirFicha', alumno: 'ana' })) fichaAbierta = true;
    else ctx.problema(TEXTOS.panelSinRespuesta);
  }

  /** Ana no está en el panel: si su avance espera en el cel sin internet, se regresa la señal. */
  async function traerAnaAlPanel(ctx) {
    const ana = await leer(ctx, 'ana', { heredar: false, ms: TIEMPOS.sondeo });
    if (!ana) {
      sinRespuesta(ctx, 'ana');
      return;
    }
    if (ana.enLinea === false && pendientesDe(ana) > 0) {
      ctx.aviso(TEXTOS.regresaSenal);
      for (const alumno of ALUMNOS) mandar(ctx, alumno, { cmd: 'simularRed', sinInternet: false });
    } else if (!tieneRuta(ana) && !(pendientesDe(ana) > 0)) {
      ctx.problema(TEXTOS.anaSinDatos);
      return;
    }
    if (!(await esperarQue(ctx, 'docente', (d) => enVivo(d, 'ana'), TIEMPOS.panel))) ctx.problema(TEXTOS.anaNoLlega);
  }

  /* ---------------- Piezas de las escenas ---------------- */

  /** reiniciar (si hace falta) + reproducirDiagnostico, y espera "Tu resultado". */
  async function diagnosticar(ctx, alumno, { conReinicio }) {
    if (conReinicio && !mandar(ctx, alumno, { cmd: 'reiniciar' })) return sinRespuesta(ctx, alumno);
    const items = GUIONES[alumno].items.map((renglones) => [...renglones]);
    if (!mandar(ctx, alumno, { cmd: 'reproducirDiagnostico', items, rapido: true })) return sinRespuesta(ctx, alumno);
    // Dos fases: primero sin ruta (el reinicio ya se aplicó), luego con ruta. Así un "Tu resultado"
    // viejo, de antes del reinicio, no se confunde con el nuevo.
    const encargo = encargar(alumno, 'diagnostico', [(e) => !tieneRuta(e), tieneRuta], TIEMPOS.diagnostico);
    const r = await cumplirEncargo(ctx, alumno, encargo);
    return r.ok ? r : fallo(ctx, alumno, r.motivo, TEXTOS.diagnosticoFallo);
  }

  /** Un avanzarRuta y espera a que el teléfono llegue a la actividad siguiente. */
  async function avanzar(ctx, alumno, estado) {
    const meta = SIGUIENTE[actividadDe(estado) ?? 'sin-empezar'];
    if (!meta) return { ok: true, estado };
    if (!mandar(ctx, alumno, { cmd: 'avanzarRuta' })) return sinRespuesta(ctx, alumno);
    const llego = (e) => actividadDe(e) === meta || e.dominado === true;
    const r = await cumplirEncargo(ctx, alumno, encargar(alumno, 'avance', [llego], TIEMPOS.avance[meta]));
    return r.ok ? r : fallo(ctx, alumno, r.motivo, TEXTOS.avanceFallo);
  }

  /** Lleva el teléfono a una pantalla con irA (si no está ya ahí) y lo confirma. */
  async function mostrarPantalla(ctx, alumno, estado, pantalla, que) {
    if (pantallaDe(estado) === pantalla) return { ok: true, estado };
    if (!mandar(ctx, alumno, { cmd: 'irA', pantalla })) return sinRespuesta(ctx, alumno);
    const listo = await esperarQue(ctx, alumno, (e) => pantallaDe(e) === pantalla, TIEMPOS.confirmar);
    return listo ? { ok: true, estado: listo } : noConfirmo(ctx, alumno, que);
  }

  function cerrarFichaSiAbierta(ctx) {
    if (!fichaAbierta) return;
    mandar(ctx, 'docente', { cmd: 'cerrarFicha' });
    fichaAbierta = false;
  }

  /* ---------------- Encargos: lo que un teléfono hace por nosotros ---------------- */

  /**
   * Anota lo que el teléfono debe alcanzar (por fases) después de una orden. Si la acción
   * se cancela, el encargo se queda y la siguiente acción lo hereda (no repite la orden).
   */
  function encargar(alumno, tipo, fases, maximo) {
    const encargo = { tipo, fases, fase: 0, limite: Date.now() + maximo };
    encargos.set(alumno, encargo);
    return encargo;
  }

  async function cumplirEncargo(ctx, alumno, encargo) {
    let r = { ok: true, estado: ultimo.get(alumno) ?? null };
    for (let i = encargo.fase; i < encargo.fases.length; i++) {
      r = await esperarConAvance(ctx, alumno, encargo.fases[i], encargo.limite);
      if (!r.ok) break;
      encargo.fase = Math.max(encargo.fase, i + 1);
    }
    if (encargos.get(alumno) === encargo) encargos.delete(alumno);
    return r;
  }

  /**
   * Espera la meta con paciencia mientras la vista avance: se rinde si se queda quieta
   * TIEMPOS.quieto ('quieto') o si se pasa del límite total ('tiempo').
   */
  async function esperarConAvance(ctx, alumno, meta, limite) {
    let referencia = firma(ultimo.get(alumno));
    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      const resta = limite - Date.now();
      if (resta <= 0) break;
      const ms = Math.min(TIEMPOS.quieto, resta);
      const estado = await esperarQue(ctx, alumno, (e) => cumple(meta, e) || firma(e) !== referencia, ms);
      if (!estado) return { ok: false, motivo: ms < TIEMPOS.quieto ? 'tiempo' : 'quieto' };
      if (cumple(meta, estado)) return { ok: true, estado };
      referencia = firma(estado);
    }
    return { ok: false, motivo: 'tiempo' };
  }

  /* ---------------- Comunicación con las vistas ---------------- */

  /** Manda una orden. false si no se pudo (iframe sin cargar, error de pitch.js…). */
  function mandar(ctx, destino, mensaje) {
    ctx.token.verificar();
    try {
      const r = enviar(destino, mensaje);
      if (r && typeof r.then === 'function') r.then(null, () => {});
      return r !== false;
    } catch {
      return false;
    }
  }

  /** El último estado del teléfono (si heredar, antes espera lo que tenga a medias). */
  async function leer(ctx, alumno, { heredar = true, ms = TIEMPOS.arranque } = {}) {
    const encargo = encargos.get(alumno);
    if (heredar && encargo) await cumplirEncargo(ctx, alumno, encargo);
    return esperarQue(ctx, alumno, () => true, ms);
  }

  const leerPanel = (ctx) => esperarQue(ctx, 'docente', () => true, TIEMPOS.sondeo);

  /**
   * Espera a que el último estado del destino cumpla `meta`. Devuelve ese estado (una copia),
   * o null si se rindió. Lanza Cancelado si cancelan la acción.
   */
  async function esperarQue(ctx, destino, meta, ms) {
    ctx.token.verificar();
    let hallado = null;
    const predicado = (estado) => {
      try {
        if (!esDe(destino, estado)) return false;
        const copia = { ...estado };
        ultimo.set(destino, copia);
        if (!meta(copia)) return false;
        if (hallado === null) hallado = copia;
        return true;
      } catch {
        return false; // un estado raro nunca rompe a quien lo evalúa
      }
    };
    let espera;
    try {
      espera = esperarEstado(destino, predicado, ms);
    } catch (error) {
      espera = Promise.reject(error);
    }
    await esperarConLimite(ctx, espera, ms);
    return hallado;
  }

  /** Pausa cosmética (la de pitch.js, que respeta movimiento reducido); cancelable. */
  async function pausa(ctx, ms) {
    let espera;
    try {
      espera = typeof esperar === 'function' ? esperar(ms) : undefined;
    } catch {
      espera = undefined;
    }
    await esperarConLimite(ctx, espera, ms);
  }

  /**
   * Espera `promesa` (resuelva o falle) con un respaldo propio de `ms` + HOLGURA.
   * Solo lanza Cancelado.
   */
  async function esperarConLimite(ctx, promesa, ms) {
    const espera = Promise.resolve(promesa);
    espera.catch(() => {});
    let reloj = null;
    const respaldo = new Promise((resolver) => {
      reloj = setTimeout(resolver, Math.max(0, Number(ms) || 0) + HOLGURA);
    });
    try {
      await ctx.token.carrera(Promise.race([espera, respaldo]));
    } catch (error) {
      if (error instanceof Cancelado) throw error;
      // Se rindió o falló: quien llama decide con lo que alcanzó a ver.
    } finally {
      clearTimeout(reloj);
    }
    ctx.token.verificar();
  }

  /* ---------------- Acciones: una por grupo, cancelables ---------------- */

  /**
   * Corre una acción. Si la misma ya corre, devuelve su promesa (no la repite); si no,
   * cancela las que `cancela` indique. La promesa nunca se rechaza.
   */
  function lanzar({ accion, clave, grupo, cancela }, escena) {
    for (const op of operaciones) {
      if (op.clave === clave) return op.promesa;
    }
    for (const op of [...operaciones]) {
      if (!cancela(op)) continue;
      op.token.cancelar();
      operaciones.delete(op);
    }
    const token = crearToken();
    const ctx = crearContexto(accion, token);
    const op = { clave, grupo, token, promesa: null };
    let entregar = () => {};
    // La promesa existe antes de correr la escena: si algo la vuelve a pedir mientras arranca, la recibe.
    op.promesa = new Promise((resolver) => {
      entregar = resolver;
    });
    operaciones.add(op);
    (async () => {
      try {
        await escena(ctx);
        return resultadoDe(ctx, false);
      } catch (error) {
        if (token.cancelado) return resultadoDe(ctx, true);
        ctx.problema(TEXTOS.falloInterno);
        reportar(error);
        return resultadoDe(ctx, false);
      } finally {
        operaciones.delete(op);
        token.cancelar(); // si quedó alguna rama viva, ya no manda nada
      }
    })().then(entregar, () => entregar(resultadoDe(ctx, token.cancelado)));
    return op.promesa;
  }

  function crearContexto(accion, token) {
    const ctx = {
      accion,
      token,
      fallo: false,
      avisos: [],
      /** Nota para el presentador (una sola vez por acción; nada si ya la cancelaron). */
      aviso(texto) {
        if (token.cancelado || ctx.avisos.includes(texto)) return;
        ctx.avisos.push(texto);
        avisarSeguro(texto);
      },
      /** Como aviso(), pero la escena no quedó como se esperaba (ok: false). */
      problema(texto) {
        if (token.cancelado) return;
        ctx.fallo = true;
        ctx.aviso(texto);
      },
    };
    return ctx;
  }

  const resultadoDe = (ctx, cancelado) => ({
    accion: ctx.accion,
    ok: !cancelado && !ctx.fallo,
    cancelado,
    avisos: [...ctx.avisos],
  });

  function rechazo(accion, texto) {
    avisarSeguro(texto);
    return Promise.resolve({ accion, ok: false, cancelado: false, avisos: [texto] });
  }

  function avisarSeguro(texto) {
    if (typeof avisar !== 'function') return;
    try {
      const r = avisar(texto);
      if (r && typeof r.then === 'function') r.then(null, () => {});
    } catch {
      /* una nota que no se pudo mostrar no detiene la escena */
    }
  }

  /* ---------------- Fallas ---------------- */

  function sinRespuesta(ctx, destino) {
    ctx.problema(destino === 'docente' ? TEXTOS.panelSinRespuesta : TEXTOS.sinRespuesta(destino));
    return { ok: false, motivo: 'sin-respuesta' };
  }

  /** Falla con texto(alumno, motivo); si el teléfono nunca respondió, lo dice así. */
  function fallo(ctx, alumno, motivo, texto) {
    if (!ultimo.has(alumno)) return sinRespuesta(ctx, alumno);
    ctx.problema(texto(alumno, motivo));
    return { ok: false, motivo };
  }

  const noConfirmo = (ctx, alumno, que) => fallo(ctx, alumno, 'confirmar', () => TEXTOS.noConfirmo(alumno, que));

  function sinRedReal(ctx, alumno) {
    ctx.problema(TEXTOS.sinRedReal(alumno));
    return { ok: false, motivo: 'sin-red' };
  }

  return { irAPaso, reproducir, modoAvion, reiniciar };
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function cumple(meta, e) {
  try {
    return Boolean(meta(e));
  } catch {
    return false;
  }
}

const enParalelo = (lista, fn) => Promise.all(lista.map((x, i) => fn(x, i)));

function reportar(error) {
  try {
    globalThis.console?.error?.('[tecu] Falló una escena del modo presentación', error);
  } catch {
    /* sin consola: nada que hacer */
  }
}
