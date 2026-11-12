/**
 * Generador pseudoaleatorio con semilla (mulberry32).
 *
 * Misma semilla => misma secuencia. Lo usamos para que el grupo simulado y
 * los ejercicios generados sean idénticos en cada ensayo de la presentación.
 */

/** @param {number|string} seed */
export function createRng(seed) {
  let a = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    /** Real en [0, 1) */
    next,
    /** Entero en [min, max] (ambos incluidos) */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** Elemento al azar de un arreglo */
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    /** Elige según pesos: pickWeighted([['a', 3], ['b', 1]]) */
    pickWeighted(entries) {
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [value, w] of entries) {
        r -= w;
        if (r < 0) return value;
      }
      return entries[entries.length - 1][0];
    },
    /** true con probabilidad p */
    chance(p) {
      return next() < p;
    },
    /** Copia barajada (Fisher-Yates) */
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

/** Hash FNV-1a de 32 bits para convertir textos en semillas. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
