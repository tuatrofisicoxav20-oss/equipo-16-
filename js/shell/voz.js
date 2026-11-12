/**
 * Lectura en voz alta para el cascarón («Leer página» del encabezado).
 *
 *   voz.soportada() · voz.hablando() · voz.leer(texto) · voz.detener() · voz.alCambiar(fn) → quitar
 *
 * RESPALDO LOCAL: js/ui/voz.js (la lectura en voz alta compartida) todavía no existía
 * cuando se escribió el cascarón, así que aquí hay una versión mínima sobre la Web Speech
 * API del navegador (speechSynthesis), en español de México. `conectarVoz()` la sustituye
 * por la de js/ui/voz.js en cuanto ese módulo exista (ver abajo qué nombres reconoce).
 */

const sintesis = () => {
  try {
    return globalThis.speechSynthesis || null;
  } catch {
    return null;
  }
};

const oyentes = new Set();
let hablando = false;
/** Implementación en uso: el respaldo local o el adaptador de js/ui/voz.js. */
let motor = null;

function avisar() {
  for (const fn of [...oyentes]) {
    try {
      fn(voz.hablando());
    } catch (error) {
      console.error('[tecu]', error);
    }
  }
}

/** Texto plano y compacto (sin saltos dobles ni espacios de más). */
const limpiar = (texto) =>
  String(texto ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const local = {
  soportada: () => Boolean(sintesis() && globalThis.SpeechSynthesisUtterance),
  hablando: () => hablando,
  leer(texto) {
    const s = sintesis();
    const frase = limpiar(texto);
    if (!local.soportada() || !frase) return false;
    s.cancel();
    const dicho = new globalThis.SpeechSynthesisUtterance(frase);
    dicho.lang = 'es-MX';
    const voces = s.getVoices?.() || [];
    const elegida = voces.find((v) => v.lang === 'es-MX') || voces.find((v) => String(v.lang).startsWith('es'));
    if (elegida) dicho.voice = elegida;
    const alTerminar = () => {
      if (!hablando) return;
      hablando = false;
      avisar();
    };
    dicho.onend = alTerminar;
    dicho.onerror = alTerminar;
    hablando = true;
    s.speak(dicho);
    avisar();
    return true;
  },
  detener() {
    const s = sintesis();
    if (s) s.cancel();
    if (!hablando) return;
    hablando = false;
    avisar();
  },
};

motor = local;

export const voz = {
  /** ¿El navegador puede leer en voz alta? */
  soportada: () => Boolean(motor.soportada()),
  /** ¿Está leyendo ahora? */
  hablando: () => Boolean(motor.hablando()),
  /** Lee un texto (corta lo que estuviera leyendo). @returns {boolean} si empezó a leer */
  leer: (texto) => motor.leer(texto),
  detener: () => motor.detener(),
  /** Avisa cuando empieza o termina de leer: fn(hablando). */
  alCambiar(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
  },
};

/**
 * Usa js/ui/voz.js si el módulo existe y trae lo necesario. Reconoce estos nombres
 * (los del contrato de la base de interfaz): `vozDisponible()` o `hayVoz()`,
 * `leerEnVozAlta(texto, { alTerminar })` o `hablar(texto, …)`, `detenerVoz()` o `callar()`,
 * y opcionalmente `estaLeyendo()` y `alCambiarVoz(fn)`.
 * Si no existe o no coincide, se queda el respaldo local. Nunca rechaza.
 * @param {() => Promise<object>} [importar] para pruebas
 */
export async function conectarVoz(importar = () => import('../ui/voz.js')) {
  let m = null;
  try {
    m = await importar();
  } catch {
    return false; // el módulo todavía no existe: respaldo local
  }
  const disponible = m.vozDisponible || m.hayVoz;
  const leer = m.leerEnVozAlta || m.hablar;
  const detener = m.detenerVoz || m.callar;
  if (typeof leer !== 'function' || typeof detener !== 'function') return false;
  let leyendo = false;
  const fin = () => {
    if (!leyendo) return;
    leyendo = false;
    avisar();
  };
  motor = {
    soportada: () => (typeof disponible === 'function' ? Boolean(disponible()) : local.soportada()),
    hablando: () => (typeof m.estaLeyendo === 'function' ? Boolean(m.estaLeyendo()) : leyendo),
    leer(texto) {
      const frase = limpiar(texto);
      if (!frase) return false;
      leyendo = true;
      try {
        const r = leer(frase, { alTerminar: fin, onFin: fin });
        if (r && typeof r.then === 'function') r.then(fin, fin);
      } catch (error) {
        console.error('[tecu]', error);
        leyendo = false;
        return false;
      }
      avisar();
      return true;
    },
    detener() {
      try {
        detener();
      } catch (error) {
        console.error('[tecu]', error);
      }
      fin();
    },
  };
  if (typeof m.alCambiarVoz === 'function') {
    try {
      m.alCambiarVoz(() => avisar());
    } catch {
      /* sin avisos del módulo: se usan los propios */
    }
  }
  return true;
}
