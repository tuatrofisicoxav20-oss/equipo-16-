/**
 * La app debe funcionar en modo avión: todo archivo que use la app tiene que
 * estar en la lista PRECACHE del service worker. Esta prueba falla si alguien
 * agrega un archivo y olvida agregarlo a sw.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const sw = readFileSync(join(RAIZ, 'sw.js'), 'utf8');
const bloque = sw.match(/const PRECACHE = \[([\s\S]*?)\];/);
const PRECACHE = bloque ? [...bloque[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];

function archivos(dir, filtro) {
  const ruta = join(RAIZ, dir);
  if (!existsSync(ruta)) return [];
  return readdirSync(ruta).flatMap((nombre) => {
    const completo = join(ruta, nombre);
    if (statSync(completo).isDirectory()) return archivos(relative(RAIZ, completo), filtro);
    return filtro(nombre) ? [relative(RAIZ, completo).split('\\').join('/')] : [];
  });
}

const DE_LA_APP = [
  'index.html',
  'manifest.webmanifest',
  'styles.css',
  ...archivos('css', (n) => n.endsWith('.css')),
  ...archivos('js', (n) => n.endsWith('.js')),
  ...archivos('packs', (n) => n.endsWith('.json')),
  ...archivos('fonts', (n) => n.endsWith('.woff2')),
  ...archivos('icons', (n) => /\.(png|svg)$/.test(n)),
];

test('PRECACHE se puede leer de sw.js', () => {
  assert.ok(PRECACHE.length > 20, 'no encontré la lista PRECACHE en sw.js');
  assert.ok(PRECACHE.includes('./') && PRECACHE.includes('index.html'));
});

test('todo archivo de la app está en PRECACHE (si no, se rompe el modo avión)', () => {
  const faltan = DE_LA_APP.filter((f) => !PRECACHE.includes(f));
  assert.deepEqual(faltan, [], `Agrega a PRECACHE en sw.js: ${faltan.join(', ')}`);
});

/**
 * Módulos de fases que se están construyendo (panel docente y modo pitch).
 * Están en PRECACHE desde ahora para no olvidarlos; esta lista debe quedar
 * VACÍA al terminar el proyecto.
 */
const EN_CONSTRUCCION = new Set([
  'css/pitch.css',
  'js/views/pitch.js',
  'css/libre.css',
  'css/diapositiva.css',
  'js/ui/cola.js',
  'js/ui/actualizacion.js',
  'js/ui/libre.js',
  'js/ui/diapositiva.js',
  'js/ui/atajos.js',
  'js/data/escenas.js',
]);

test('cada entrada de PRECACHE existe en el proyecto', (t) => {
  const inexistentes = PRECACHE.filter((f) => f !== './' && !existsSync(join(RAIZ, f)));
  const inesperadas = inexistentes.filter((f) => !EN_CONSTRUCCION.has(f));
  assert.deepEqual(inesperadas, [], `En PRECACHE pero no existen: ${inesperadas.join(', ')}`);
  if (inexistentes.length) t.diagnostic(`Aún en construcción: ${inexistentes.join(', ')}`);
});

test('el manifiesto apunta a íconos que existen', () => {
  const manifiesto = JSON.parse(readFileSync(join(RAIZ, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifiesto.lang, 'es-MX');
  for (const icono of manifiesto.icons) assert.ok(existsSync(join(RAIZ, icono.src)), icono.src);
  assert.ok(manifiesto.icons.some((i) => i.purpose === 'maskable'));
});
