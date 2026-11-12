/**
 * js/ui/qr.js: el código QR se prueba DE VERDAD, decodificándolo con un lector
 * independiente (jsQR, dependencia de desarrollo) a partir de la matriz y a
 * partir del SVG que se muestra en pantalla. Además: la capacidad de cada
 * versión contra la tabla de la norma (modo byte, corrección M), la versión más
 * chica, las 8 máscaras, la estructura fija (buscadores, sincronía, formato y
 * versión) y las utilidades para el QR del modo presentación.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codificarQR, qrSVG, capacidadBytes, urlParaInvitado, esDireccionPublica, VERSION_MAXIMA } from '../js/ui/qr.js';

let jsQR = null;
try {
  jsQR = (await import('jsqr')).default;
} catch {
  /* sin dependencias de desarrollo: las pruebas que decodifican se omiten (npm install) */
}
const SIN_LECTOR = jsQR ? false : 'falta jsqr: corre npm install para decodificar los QR';

/** ISO/IEC 18004, tabla 7: bytes que caben en modo byte con corrección M, versiones 1 a 40. */
const CAPACIDAD_NORMA = [
  14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666,
  711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331,
];

/** Imagen RGBA (blanco y negro) de una matriz de módulos, con margen claro. */
function rasterizar(modulos, { escala = 4, margen = 4 } = {}) {
  const n = modulos.length;
  const lado = (n + margen * 2) * escala;
  const px = new Uint8ClampedArray(lado * lado * 4).fill(255);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!modulos[y][x]) continue;
      for (let dy = 0; dy < escala; dy++) {
        for (let dx = 0; dx < escala; dx++) {
          const i = (((y + margen) * escala + dy) * lado + (x + margen) * escala + dx) * 4;
          px[i] = px[i + 1] = px[i + 2] = 0;
        }
      }
    }
  }
  return { px, lado };
}

function leer(modulos, opciones) {
  const { px, lado } = rasterizar(modulos, { escala: modulos.length > 100 ? 3 : 4, ...opciones });
  return jsQR(px, lado, lado, { inversionAttempts: 'dontInvert' });
}

/**
 * Convierte el SVG de qrSVG() en una matriz de módulos leyendo su <path>
 * (rectángulos "M x y h w v1 h-w z") y su viewBox: lo mismo que pinta el navegador.
 */
function matrizDelSVG(svg) {
  const caja = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  assert.ok(caja && caja[1] === caja[2], 'viewBox cuadrado');
  const lado = Number(caja[1]);
  const matriz = Array.from({ length: lado }, () => new Array(lado).fill(false));
  const trazo = svg.match(/<path d="([^"]*)"/)[1];
  const piezas = [...trazo.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)];
  assert.equal(piezas.map((p) => p[0]).join(''), trazo, 'el trazo solo tiene rectángulos de un módulo de alto');
  for (const [, x, y, ancho, regreso] of piezas) {
    assert.equal(ancho, regreso);
    for (let i = 0; i < Number(ancho); i++) matriz[Number(y)][Number(x) + i] = true;
  }
  return matriz;
}

const bytesUTF8 = (texto) => [...new TextEncoder().encode(texto)];

/** Texto de exactamente `n` bytes con forma de dirección. */
function direccionDeLargo(n) {
  const base = 'https://tecu.example/equipo-16-/?alumno=invitado&r=';
  return n <= base.length ? base.slice(0, n) : base + 'x'.repeat(n - base.length);
}

const DIRECCIONES = [
  'https://usuario.github.io/equipo-16-/?alumno=invitado',
  'https://tecu-aprende.netlify.app/?alumno=invitado',
  'https://tecu-aprende.pages.dev/?alumno=invitado',
  'http://192.168.1.20:8080/?alumno=ana',
  'https://usuario.github.io/equipo-16-/?vista=docente',
  'https://una-organizacion-con-nombre-largo.github.io/equipo-16-/?alumno=invitado&fuente=qr-del-pitch&evento=veracruz-tech-week',
  'https://usuario.github.io/equipo-16-/?alumno=invitado&nota=ecuaci%C3%B3n%20con%20acento',
];

test('la capacidad de cada versión coincide con la tabla de la norma (modo byte, nivel M)', () => {
  assert.equal(VERSION_MAXIMA, 40);
  for (let v = 1; v <= 40; v++) assert.equal(capacidadBytes(v), CAPACIDAD_NORMA[v - 1], `versión ${v}`);
  assert.throws(() => capacidadBytes(0), RangeError);
  assert.throws(() => capacidadBytes(41), RangeError);
});

test('direcciones reales del pitch: se leen con un lector independiente', { skip: SIN_LECTOR }, () => {
  for (const url of DIRECCIONES) {
    const qr = codificarQR(url);
    const leido = leer(qr.modulos);
    assert.ok(leido, `no se pudo leer el QR de ${url}`);
    assert.equal(leido.data, url);
    assert.deepEqual(leido.binaryData, bytesUTF8(url));
    assert.equal(leido.version, qr.version);
    assert.equal(qr.tamano, qr.version * 4 + 17);
  }
});

test('una dirección de hasta 120 caracteres cabe en la versión 7 o menor (45 × 45 módulos)', { skip: SIN_LECTOR }, () => {
  const url = direccionDeLargo(120);
  assert.equal(url.length, 120);
  const qr = codificarQR(url);
  assert.equal(qr.version, 7);
  assert.equal(qr.tamano, 45);
  assert.equal(leer(qr.modulos).data, url);
  assert.equal(codificarQR('https://usuario.github.io/equipo-16-/?alumno=invitado').version, 4);
});

test('usa la versión más chica donde cabe (1 a 40) y cada una se lee', { skip: SIN_LECTOR }, () => {
  for (let v = 1; v <= 40; v++) {
    const justo = direccionDeLargo(CAPACIDAD_NORMA[v - 1]);
    const qr = codificarQR(justo);
    assert.equal(qr.version, v, `${justo.length} bytes → versión ${v}`);
    const leido = leer(qr.modulos);
    assert.ok(leido, `no se pudo leer la versión ${v}`);
    assert.equal(leido.data, justo, `versión ${v}`);
    assert.equal(leido.version, v);
    if (v < 40) assert.equal(codificarQR(direccionDeLargo(justo.length + 1)).version, v + 1, `un byte más → versión ${v + 1}`);
  }
});

test('texto con acentos y ñ: se guarda en UTF-8 y se lee igual', { skip: SIN_LECTOR }, () => {
  const texto = 'Tecu: ¡Aprende ecuaciones! Año 2026, Veracruz (niños y niñas) → 3x + 5 = 20';
  const qr = codificarQR(texto);
  const leido = leer(qr.modulos);
  assert.deepEqual(leido.binaryData, bytesUTF8(texto));
  assert.equal(leido.data, texto);
});

test('las 8 máscaras producen códigos legibles; la automática es determinista', { skip: SIN_LECTOR }, () => {
  const url = DIRECCIONES[0];
  for (let mascara = 0; mascara < 8; mascara++) {
    const qr = codificarQR(url, { mascara });
    assert.equal(qr.mascara, mascara);
    assert.equal(leer(qr.modulos)?.data, url, `máscara ${mascara}`);
  }
  const a = codificarQR(url);
  const b = codificarQR(url);
  assert.ok(Number.isInteger(a.mascara) && a.mascara >= 0 && a.mascara <= 7);
  assert.deepEqual(a, b);
  assert.throws(() => codificarQR(url, { mascara: 8 }), RangeError);
});

test('estructura fija: buscadores, separadores, sincronía, módulo oscuro, formato y versión', () => {
  for (const url of [DIRECCIONES[0], direccionDeLargo(120), direccionDeLargo(400)]) {
    const { modulos: m, tamano: n, version, mascara } = codificarQR(url);
    const buscador = (x0, y0) => {
      for (let dy = 0; dy < 7; dy++) {
        for (let dx = 0; dx < 7; dx++) {
          const d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
          assert.equal(m[y0 + dy][x0 + dx], d !== 2, `buscador en (${x0}, ${y0})`);
        }
      }
    };
    buscador(0, 0);
    buscador(n - 7, 0);
    buscador(0, n - 7);
    for (let i = 0; i < 8; i++) {
      assert.equal(m[7][i] || m[i][7] || m[7][n - 1 - i] || m[i][n - 8] || m[n - 8][i] || m[n - 1 - i][7], false, 'separadores claros');
    }
    for (let i = 8; i < n - 8; i++) {
      assert.equal(m[6][i], i % 2 === 0, 'sincronía horizontal');
      assert.equal(m[i][6], i % 2 === 0, 'sincronía vertical');
    }
    assert.equal(m[n - 8][8], true, 'módulo oscuro');

    // Las dos copias del formato dicen lo mismo: nivel M (00) y la máscara usada.
    const bit = (x, y) => (m[y][x] ? 1 : 0);
    let copia1 = 0;
    let copia2 = 0;
    const pos1 = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
    pos1.forEach(([x, y], i) => (copia1 |= bit(x, y) << i));
    for (let i = 0; i < 8; i++) copia2 |= bit(n - 1 - i, 8) << i;
    for (let i = 8; i < 15; i++) copia2 |= bit(8, n - 15 + i) << i;
    assert.equal(copia1, copia2, 'las dos copias del formato coinciden');
    const formato = (copia1 ^ 0x5412) >>> 10;
    assert.equal(formato >>> 3, 0b00, 'nivel de corrección M');
    assert.equal(formato & 7, mascara, 'máscara anotada en el formato');

    if (version >= 7) {
      let abajo = 0;
      let derecha = 0;
      for (let i = 0; i < 18; i++) {
        const a = n - 11 + (i % 3);
        const b = Math.floor(i / 3);
        abajo |= bit(b, a) << i;
        derecha |= bit(a, b) << i;
      }
      assert.equal(abajo, derecha, 'las dos copias de la versión coinciden');
      assert.equal(abajo >>> 12, version, 'versión anotada');
    }
  }
});

test('qrSVG: el SVG que se pinta se lee y es accesible', { skip: SIN_LECTOR }, () => {
  for (const url of DIRECCIONES) {
    const svg = qrSVG(url);
    const { tamano } = codificarQR(url);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /);
    assert.match(svg, /<\/svg>$/);
    assert.ok(svg.includes(`viewBox="0 0 ${tamano + 8} ${tamano + 8}"`), 'margen de 4 módulos por lado');
    assert.match(svg, /shape-rendering="crispEdges"/);
    assert.match(svg, /role="img" aria-label="Código QR: [^"]+"/);
    const matriz = matrizDelSVG(svg);
    const leido = leer(matriz, { margen: 0 });
    assert.equal(leido?.data, url, `SVG de ${url}`);
  }
});

test('qrSVG: opciones (etiqueta, decorativo, tamaño, colores, margen) y escape de caracteres', () => {
  const url = 'https://ejemplo.github.io/equipo-16-/?alumno=invitado&a="b"<c>';
  const svg = qrSVG(url, { etiqueta: 'Escanea y prueba Tecu', tamano: 240, oscuro: '#15252d', claro: '#fffdf6', margen: 2 });
  assert.match(svg, /aria-label="Escanea y prueba Tecu"/);
  assert.match(svg, /width="240" height="240"/);
  assert.match(svg, /<rect width="(\d+)" height="\1" fill="#fffdf6"\/>/);
  assert.match(svg, /<path d="[^"]+" fill="#15252d"\/>/);
  const { tamano } = codificarQR(url);
  assert.ok(svg.includes(`viewBox="0 0 ${tamano + 4} ${tamano + 4}"`));
  const porDefecto = qrSVG(url);
  assert.ok(porDefecto.includes('aria-label="Código QR: https://ejemplo.github.io/equipo-16-/?alumno=invitado&amp;a=&quot;b&quot;&lt;c&gt;"'));
  assert.ok(!/<c>|"b"/.test(porDefecto.replace(/<\/?(svg|rect|path)\b[^>]*>/g, '')), 'nada sin escapar');
  const decorativo = qrSVG(url, { decorativo: true });
  assert.match(decorativo, /aria-hidden="true"/);
  assert.doesNotMatch(decorativo, /role="img"|aria-label/);
});

test('texto demasiado largo: error claro (no un QR roto)', () => {
  assert.equal(codificarQR('x'.repeat(2331)).version, 40);
  assert.throws(() => codificarQR('x'.repeat(2332)), { name: 'RangeError', message: /demasiado largo.*2332 bytes/ });
  assert.equal(codificarQR('').version, 1);
});

test('urlParaInvitado: misma carpeta de la app, sin la vista ni otros parámetros', () => {
  assert.equal(urlParaInvitado('https://usuario.github.io/equipo-16-/?vista=pitch#paso-3'), 'https://usuario.github.io/equipo-16-/?alumno=invitado');
  assert.equal(urlParaInvitado('https://usuario.github.io/equipo-16-/index.html?vista=pitch'), 'https://usuario.github.io/equipo-16-/?alumno=invitado');
  assert.equal(urlParaInvitado('https://tecu-aprende.netlify.app/?vista=pitch&x=1'), 'https://tecu-aprende.netlify.app/?alumno=invitado');
  assert.equal(urlParaInvitado('http://localhost:8080/?vista=pitch', { alumno: 'luis' }), 'http://localhost:8080/?alumno=luis');
});

test('esDireccionPublica: solo https y fuera de la red local', () => {
  for (const ok of ['https://usuario.github.io/equipo-16-/?alumno=invitado', 'https://tecu-aprende.netlify.app/', 'https://tecu.pages.dev/']) {
    assert.equal(esDireccionPublica(ok), true, ok);
  }
  for (const no of [
    'http://usuario.github.io/equipo-16-/',
    'http://localhost:8080/?alumno=invitado',
    'https://localhost:8443/',
    'http://127.0.0.1:8080/',
    'https://192.168.1.20:8080/',
    'https://10.0.0.5/',
    'https://172.20.1.1/',
    'https://[::1]:8080/',
    'https://mi-compu.local/',
    'no es una dirección',
  ]) {
    assert.equal(esDireccionPublica(no), false, no);
  }
});

test('el QR del modo presentación (dirección pública de invitado) se lee desde el SVG', { skip: SIN_LECTOR }, () => {
  const url = urlParaInvitado('https://usuario.github.io/equipo-16-/?vista=pitch');
  assert.ok(esDireccionPublica(url));
  const leido = leer(matrizDelSVG(qrSVG(url, { etiqueta: 'Escanea y prueba Tecu en tu celular' })), { margen: 0 });
  assert.equal(leido?.data, url);
});
