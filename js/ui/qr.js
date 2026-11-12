/**
 * Código QR en SVG, hecho aquí mismo: sin dependencias, sin servicios externos
 * y sin red (funciona en modo avión). Lo usa el modo presentación para mostrar
 * "Escanea y pruébalo".
 *
 * Sigue la norma ISO/IEC 18004: modo byte (texto en UTF-8), corrección de
 * errores nivel M (se puede leer aunque ~15 % esté dañado o tapado), la
 * versión más chica donde quepa el texto (1 a 40; una dirección de hasta 122
 * caracteres cabe en la versión 7) y la máscara con menor penalización.
 *
 *   import { qrSVG, urlParaInvitado, esDireccionPublica } from './qr.js';
 *   const url = urlParaInvitado();            // https://<usuario>.github.io/equipo-16-/?alumno=invitado
 *   contenedor.innerHTML = qrSVG(url, { etiqueta: 'Código QR para abrir Tecu en tu celular' });
 *   if (!esDireccionPublica(url)) {  … avisar al presentador: ese QR no abre en otro celular … }
 *
 * No toca el DOM: también corre en Node (node --test tests/qr.test.js).
 */

/** Versión más grande del estándar (177 × 177 módulos). */
export const VERSION_MAXIMA = 40;

/** Palabras de corrección por bloque, nivel M, para cada versión (el índice es la versión). */
const ECC_POR_BLOQUE = [
  0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26,
  26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
];

/** Número de bloques de corrección, nivel M, para cada versión. */
const BLOQUES = [
  0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16,
  17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
];

/** Bits del nivel M en la información de formato (L = 01, M = 00, Q = 11, H = 10). */
const NIVEL_M = 0b00;

/** Penalizaciones de la norma para elegir la máscara. */
const PENA = { racha: 3, bloque: 3, buscador: 40, balance: 10 };

/** Las 8 máscaras: (x = columna, y = renglón) → ¿se invierte el módulo? */
const MASCARAS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/* ------------------------------------------------------------------ */
/* Capacidad                                                           */
/* ------------------------------------------------------------------ */

/** Módulos disponibles para datos y corrección (sin patrones fijos ni formato/versión). */
function modulosDeDatos(version) {
  let n = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const alineaciones = Math.floor(version / 7) + 2;
    n -= (25 * alineaciones - 10) * alineaciones - 55;
    if (version >= 7) n -= 36;
  }
  return n;
}

/** Palabras (bytes) de datos, ya sin las de corrección. */
function palabrasDeDatos(version) {
  return Math.floor(modulosDeDatos(version) / 8) - ECC_POR_BLOQUE[version] * BLOQUES[version];
}

/** Bits del contador de caracteres en modo byte. */
function bitsDelConteo(version) {
  return version < 10 ? 8 : 16;
}

/**
 * Cuántos bytes caben en una versión (modo byte, corrección M).
 * @param {number} version 1 a 40
 * @returns {number} p. ej. 14 en la versión 1, 122 en la 7, 2331 en la 40
 */
export function capacidadBytes(version) {
  if (!Number.isInteger(version) || version < 1 || version > VERSION_MAXIMA) {
    throw new RangeError(`Versión de QR inválida: ${version} (va de 1 a ${VERSION_MAXIMA}).`);
  }
  return Math.floor((palabrasDeDatos(version) * 8 - 4 - bitsDelConteo(version)) / 8);
}

/* ------------------------------------------------------------------ */
/* Datos y corrección de errores (Reed-Solomon en GF(256))             */
/* ------------------------------------------------------------------ */

/** Producto en GF(2⁸) con el polinomio x⁸ + x⁴ + x³ + x² + 1 (0x11D). */
function productoGF(a, b) {
  let r = 0;
  for (let i = 7; i >= 0; i--) {
    r = (r << 1) ^ ((r >>> 7) * 0x11d);
    r ^= ((b >>> i) & 1) * a;
  }
  return r;
}

/** Coeficientes del polinomio generador de grado `grado` (sin el 1 principal). */
function generadorRS(grado) {
  const coef = new Array(grado).fill(0);
  coef[grado - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grado; i++) {
    // Multiplica por (x − αⁱ).
    for (let j = 0; j < grado; j++) {
      coef[j] = productoGF(coef[j], raiz);
      if (j + 1 < grado) coef[j] ^= coef[j + 1];
    }
    raiz = productoGF(raiz, 0x02);
  }
  return coef;
}

/** Residuo de dividir los datos entre el generador: las palabras de corrección. */
function correccionRS(datos, generador) {
  const resto = new Array(generador.length).fill(0);
  for (const byte of datos) {
    const factor = byte ^ resto.shift();
    resto.push(0);
    for (let i = 0; i < generador.length; i++) resto[i] ^= productoGF(generador[i], factor);
  }
  return resto;
}

/** Segmento en modo byte + terminador + relleno hasta llenar la versión. */
function palabrasConDatos(bytes, version) {
  const capacidad = palabrasDeDatos(version) * 8;
  const bits = [];
  const agregar = (valor, cuantos) => {
    for (let i = cuantos - 1; i >= 0; i--) bits.push((valor >>> i) & 1);
  };
  agregar(0b0100, 4); // modo byte
  agregar(bytes.length, bitsDelConteo(version));
  for (const b of bytes) agregar(b, 8);
  agregar(0, Math.min(4, capacidad - bits.length)); // terminador
  agregar(0, (8 - (bits.length % 8)) % 8); // completa el último byte
  const palabras = [];
  for (let i = 0; i < bits.length; i += 8) {
    palabras.push(bits.slice(i, i + 8).reduce((acum, bit) => (acum << 1) | bit, 0));
  }
  for (let relleno = 0xec; palabras.length < capacidad / 8; relleno ^= 0xec ^ 0x11) palabras.push(relleno);
  return palabras;
}

/** Divide en bloques, calcula la corrección de cada uno e intercala todo. */
function intercalar(datos, version) {
  const numBloques = BLOQUES[version];
  const largoEcc = ECC_POR_BLOQUE[version];
  const total = Math.floor(modulosDeDatos(version) / 8);
  const cortos = numBloques - (total % numBloques);
  const largoCorto = Math.floor(total / numBloques); // datos + corrección de un bloque corto
  const generador = generadorRS(largoEcc);
  const bloques = [];
  for (let i = 0, k = 0; i < numBloques; i++) {
    const n = largoCorto - largoEcc + (i < cortos ? 0 : 1);
    const dat = datos.slice(k, k + n);
    k += n;
    bloques.push({ dat, ecc: correccionRS(dat, generador) });
  }
  const salida = [];
  for (let i = 0; i <= largoCorto - largoEcc; i++) {
    for (const b of bloques) if (i < b.dat.length) salida.push(b.dat[i]);
  }
  for (let i = 0; i < largoEcc; i++) for (const b of bloques) salida.push(b.ecc[i]);
  return salida;
}

/* ------------------------------------------------------------------ */
/* Matriz                                                              */
/* ------------------------------------------------------------------ */

/** Centros de los patrones de alineación (en x y en y). */
function posicionesAlineacion(version) {
  if (version === 1) return [];
  const n = version * 4 + 17;
  const cuantas = Math.floor(version / 7) + 2;
  const paso = Math.floor((version * 8 + cuantas * 3 + 5) / (cuantas * 4 - 4)) * 2;
  const posiciones = [6];
  for (let p = n - 7; posiciones.length < cuantas; p -= paso) posiciones.splice(1, 0, p);
  return posiciones;
}

function crearMatriz(version) {
  const n = version * 4 + 17;
  const modulos = Array.from({ length: n }, () => new Array(n).fill(false));
  const fijo = Array.from({ length: n }, () => new Array(n).fill(false));
  const poner = (x, y, oscuro) => {
    modulos[y][x] = oscuro;
    fijo[y][x] = true;
  };

  // Patrones de sincronía (renglón y columna 6).
  for (let i = 0; i < n; i++) {
    poner(6, i, i % 2 === 0);
    poner(i, 6, i % 2 === 0);
  }
  // Tres buscadores de 7 × 7 con su separador claro.
  for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        poner(x, y, d !== 2 && d !== 4);
      }
    }
  }
  // Patrones de alineación de 5 × 5 (menos los que chocan con los buscadores).
  const pos = posicionesAlineacion(version);
  const ultima = pos.length - 1;
  pos.forEach((px, i) => {
    pos.forEach((py, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === ultima) || (i === ultima && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) poner(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    });
  });
  dibujarFormato(poner, n, 0); // reserva el lugar; se redibuja con la máscara elegida
  dibujarVersion(poner, n, version);
  return { n, modulos, fijo, poner };
}

/** 15 bits de formato (nivel M + máscara, BCH) en sus dos copias, y el módulo oscuro fijo. */
function dibujarFormato(poner, n, mascara) {
  const datos = (NIVEL_M << 3) | mascara;
  let resto = datos;
  for (let i = 0; i < 10; i++) resto = (resto << 1) ^ ((resto >>> 9) * 0x537);
  const bits = ((datos << 10) | resto) ^ 0x5412;
  const bit = (i) => ((bits >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) poner(8, i, bit(i));
  poner(8, 7, bit(6));
  poner(8, 8, bit(7));
  poner(7, 8, bit(8));
  for (let i = 9; i < 15; i++) poner(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) poner(n - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) poner(8, n - 15 + i, bit(i));
  poner(8, n - 8, true);
}

/** 18 bits de versión (Golay) en dos bloques de 6 × 3, desde la versión 7. */
function dibujarVersion(poner, n, version) {
  if (version < 7) return;
  let resto = version;
  for (let i = 0; i < 12; i++) resto = (resto << 1) ^ ((resto >>> 11) * 0x1f25);
  const bits = (version << 12) | resto;
  for (let i = 0; i < 18; i++) {
    const oscuro = ((bits >>> i) & 1) === 1;
    const a = n - 11 + (i % 3);
    const b = Math.floor(i / 3);
    poner(a, b, oscuro);
    poner(b, a, oscuro);
  }
}

/** Coloca los bits en zigzag de dos columnas, de abajo a la derecha hacia arriba. */
function colocarDatos({ n, modulos, fijo }, palabras) {
  const totalBits = palabras.length * 8;
  let i = 0;
  for (let derecha = n - 1; derecha >= 1; derecha -= 2) {
    if (derecha === 6) derecha = 5; // la columna de sincronía no lleva datos
    const subiendo = ((derecha + 1) & 2) === 0;
    for (let vertical = 0; vertical < n; vertical++) {
      const y = subiendo ? n - 1 - vertical : vertical;
      for (let j = 0; j < 2; j++) {
        const x = derecha - j;
        if (fijo[y][x] || i >= totalBits) continue;
        modulos[y][x] = ((palabras[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
        i++;
      }
    }
  }
}

function aplicarMascara({ n, modulos, fijo }, mascara) {
  const invertir = MASCARAS[mascara];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) if (!fijo[y][x] && invertir(x, y)) modulos[y][x] = !modulos[y][x];
  }
}

/** Penalización de la norma: rachas, bloques 2 × 2, falsos buscadores y balance claro/oscuro. */
function penalizacion(m) {
  const n = m.length;
  let total = 0;
  let oscuros = 0;
  const patron = [true, false, true, true, true, false, true];
  const claros = (linea, desde, hasta) => {
    for (let i = Math.max(desde, 0); i < Math.min(hasta, n); i++) if (linea(i)) return false;
    return true;
  };
  for (let a = 0; a < n; a++) {
    for (const linea of [(i) => m[a][i], (i) => m[i][a]]) {
      let racha = 0;
      let anterior = null;
      for (let i = 0; i <= n; i++) {
        const valor = i < n ? linea(i) : null;
        if (valor === anterior) {
          racha++;
          continue;
        }
        if (racha >= 5) total += PENA.racha + (racha - 5);
        racha = 1;
        anterior = valor;
      }
      for (let b = 0; b + 6 < n; b++) {
        if (patron.every((v, k) => linea(b + k) === v) && (claros(linea, b - 4, b) || claros(linea, b + 7, b + 11))) {
          total += PENA.buscador;
        }
      }
    }
    for (let x = 0; x < n; x++) {
      if (m[a][x]) oscuros++;
      if (a < n - 1 && x < n - 1) {
        const v = m[a][x];
        if (v === m[a][x + 1] && v === m[a + 1][x] && v === m[a + 1][x + 1]) total += PENA.bloque;
      }
    }
  }
  const k = Math.ceil(Math.abs(oscuros * 20 - n * n * 10) / (n * n)) - 1;
  return total + Math.max(0, k) * PENA.balance;
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Codifica un texto (una dirección, normalmente) como código QR.
 * @param {string} texto
 * @param {{ mascara?: number, versionMinima?: number }} [opciones]
 *   mascara: 0 a 7 para forzarla (si no, se elige la de menor penalización)
 * @returns {{ version: number, tamano: number, mascara: number, modulos: boolean[][] }}
 *   modulos[y][x]: true = oscuro. `tamano` = módulos por lado, sin el margen.
 * @throws {RangeError} si el texto no cabe ni en la versión 40
 */
export function codificarQR(texto, { mascara, versionMinima = 1 } = {}) {
  if (mascara !== undefined && !(Number.isInteger(mascara) && mascara >= 0 && mascara <= 7)) {
    throw new RangeError(`Máscara inválida: ${mascara} (va de 0 a 7).`);
  }
  const bytes = Array.from(new TextEncoder().encode(String(texto ?? '')));
  let version = Math.min(Math.max(1, Math.trunc(versionMinima) || 1), VERSION_MAXIMA);
  while (version <= VERSION_MAXIMA && capacidadBytes(version) < bytes.length) version++;
  if (version > VERSION_MAXIMA) {
    throw new RangeError(
      `El texto es demasiado largo para un código QR: ${bytes.length} bytes (caben ${capacidadBytes(VERSION_MAXIMA)}).`,
    );
  }

  const matriz = crearMatriz(version);
  colocarDatos(matriz, intercalar(palabrasConDatos(bytes, version), version));

  let elegida = mascara;
  if (elegida === undefined) {
    let menor = Infinity;
    for (let k = 0; k < MASCARAS.length; k++) {
      aplicarMascara(matriz, k);
      dibujarFormato(matriz.poner, matriz.n, k);
      const pena = penalizacion(matriz.modulos);
      if (pena < menor) {
        menor = pena;
        elegida = k;
      }
      aplicarMascara(matriz, k); // deshace (la máscara es un XOR)
    }
  }
  aplicarMascara(matriz, elegida);
  dibujarFormato(matriz.poner, matriz.n, elegida);
  return { version, tamano: matriz.n, mascara: elegida, modulos: matriz.modulos };
}

function escaparXML(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * Código QR como SVG (texto), listo para insertarse en la página o guardarse en un archivo.
 * Un solo <path> con los módulos oscuros, `shape-rendering="crispEdges"` y un margen claro
 * de 4 módulos (lo pide la norma para que los lectores lo encuentren). Se escala sin perder
 * nitidez: dale el tamaño con CSS (o con `tamano`).
 *
 * @param {string} texto
 * @param {{ margen?: number, oscuro?: string, claro?: string, etiqueta?: string, decorativo?: boolean,
 *   tamano?: number|string, mascara?: number }} [opciones]
 *   etiqueta: nombre para lectores de pantalla (por defecto "Código QR: <texto>")
 *   decorativo: true si la dirección ya está escrita junto al QR (se oculta a lectores de pantalla)
 *   tamano: ancho y alto del SVG (p. ej. 240 o '12rem'); sin él, ocupa el ancho de su contenedor
 * @returns {string} `<svg …>…</svg>`
 */
export function qrSVG(texto, { margen = 4, oscuro = '#000000', claro = '#ffffff', etiqueta, decorativo = false, tamano, mascara } = {}) {
  const { modulos, tamano: n } = codificarQR(texto, { mascara });
  const m = Math.max(0, Math.trunc(margen) || 0);
  const lado = n + m * 2;
  let trazo = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; ) {
      if (!modulos[y][x]) {
        x++;
        continue;
      }
      let fin = x + 1;
      while (fin < n && modulos[y][fin]) fin++;
      trazo += `M${x + m} ${y + m}h${fin - x}v1h-${fin - x}z`;
      x = fin;
    }
  }
  const accesible = decorativo
    ? 'aria-hidden="true" focusable="false"'
    : `role="img" aria-label="${escaparXML(etiqueta || `Código QR: ${texto}`)}"`;
  const medidas = tamano != null ? ` width="${escaparXML(tamano)}" height="${escaparXML(tamano)}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}"${medidas} ${accesible} ` +
    `shape-rendering="crispEdges" class="qr"><rect width="${lado}" height="${lado}" fill="${escaparXML(claro)}"/>` +
    `<path d="${trazo}" fill="${escaparXML(oscuro)}"/></svg>`
  );
}

/**
 * Dirección para que el jurado pruebe la app como invitado, a partir de la página actual:
 * misma carpeta (sirve igual en la raíz que en la subcarpeta de GitHub Pages), sin la vista
 * ni otros parámetros. Termina en "/" antes del "?", así el QR no depende de una redirección.
 * @param {string} [base] dirección de cualquier vista de la app (por defecto, la de esta página)
 * @param {{ alumno?: string }} [opciones]
 * @returns {string} p. ej. https://usuario.github.io/equipo-16-/?alumno=invitado
 */
export function urlParaInvitado(base = globalThis.location?.href, { alumno = 'invitado' } = {}) {
  const url = new URL('./', base);
  url.search = new URLSearchParams({ alumno }).toString();
  return url.href;
}

/**
 * ¿La dirección sirve para un celular cualquiera? Solo si es https y no es local
 * (localhost, 127.x, 10.x, 192.168.x, 172.16–31.x, *.local): sin https no hay modo avión
 * y una dirección local no abre fuera de esta computadora o de esta red.
 * @param {string} direccion
 * @returns {boolean}
 */
export function esDireccionPublica(direccion) {
  let url;
  try {
    url = new URL(direccion);
  } catch {
    return false;
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const local =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^f[cd][0-9a-f]{2}:/.test(host) ||
    /^fe80:/.test(host);
  return url.protocol === 'https:' && !local;
}
