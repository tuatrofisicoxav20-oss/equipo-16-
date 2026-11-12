/**
 * Ruta adaptativa: a partir del diagnóstico decide qué error trabajar y
 * genera los ejercicios de la mini-ruta. Puro y determinista (con semilla).
 */
import { TIPOS, PRIORIDAD, generarEjercicio, bonito } from './engine.js';
import { createRng, hashString } from './rng.js';

/** Las 4 actividades de cada mini-ruta, en orden. */
export const ACTIVIDADES = ['pregunta', 'visual', 'practica', 'comprobacion'];

/**
 * Resume los 4 ejercicios del diagnóstico.
 * @param {{analisis: {estado: string, error?: {tipo: string}}}[]} resultados
 * @returns {{conteo: Record<string, number>, dominante: string|null, correctos: number, total: number}}
 */
export function resumirDiagnostico(resultados) {
  const conteo = {};
  const primeraVez = {};
  let correctos = 0;
  (resultados || []).forEach((r, i) => {
    const a = r?.analisis;
    if (!a) return; // ejercicio sin análisis (saltado o sin terminar): no cuenta como error
    if (a.estado === 'correcto') correctos++;
    if (a.estado === 'error' && a.error) {
      const t = a.error.tipo;
      conteo[t] = (conteo[t] || 0) + 1;
      if (primeraVez[t] === undefined) primeraVez[t] = i;
    }
  });
  const tipos = Object.keys(conteo);
  const clasificados = tipos.filter((t) => t !== TIPOS.NO_CLASIFICADO);
  const pool = clasificados.length ? clasificados : tipos;
  pool.sort(
    (a, b) =>
      conteo[b] - conteo[a] || primeraVez[a] - primeraVez[b] || PRIORIDAD.indexOf(a) - PRIORIDAD.indexOf(b),
  );
  return { conteo, dominante: pool[0] || null, correctos, total: (resultados || []).length };
}

/**
 * Ejercicios de la mini-ruta: 3 de práctica progresiva (niveles 1→3) y uno
 * para la comprobación sin ayuda. Misma semilla => mismos ejercicios.
 * @param {string} tipo uno de TIPOS
 * @param {string|number} semilla
 * @param {Iterable<string>} [evitar] ecuaciones ya vistas (arreglo o Set)
 */
export function construirRuta(tipo, semilla, evitar = []) {
  const rng = createRng(semilla); // createRng ya convierte los textos con hashString
  const usados = new Set([...evitar].map(bonito));
  const practica = [1, 2, 3].map((nivel) => {
    const e = generarEjercicio(tipo, nivel, rng, usados);
    usados.add(e.ecuacion);
    return e;
  });
  const comprobacion = generarEjercicio(tipo, 3, rng, usados);
  return { tipo, practica, comprobacion };
}

/**
 * Otro ejercicio para reintentar la comprobación sin repetir los anteriores.
 * @param {Iterable<string>} [usados] ecuaciones ya vistas (arreglo o Set)
 */
export function otraComprobacion(tipo, semilla, usados = []) {
  const lista = [...usados];
  const rng = createRng(hashString(`${semilla}:${lista.length}`));
  return generarEjercicio(tipo, 3, rng, lista.map(bonito)); // misma normalización que construirRuta
}
