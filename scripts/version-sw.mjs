/**
 * Deja sw.js listo para publicar: iguala la lista PRECACHE a los archivos de la
 * app que hay en disco y pone la VERSION que corresponde a su contenido (la
 * misma huella que revisa tests/sw.test.js). Úsalo antes de publicar:
 *
 *   npm run version
 *
 * Sin cambiar VERSION, los celulares que ya tienen la app guardada nunca
 * reciben los cambios.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const rutaSw = join(RAIZ, 'sw.js');
let sw = readFileSync(rutaSw, 'utf8');

/** Archivos de la app tal como están en disco (lo mismo que exige tests/sw.test.js). */
function archivos(dir, filtro) {
  const ruta = join(RAIZ, dir);
  if (!existsSync(ruta)) return [];
  return readdirSync(ruta).flatMap((nombre) => {
    const completo = join(ruta, nombre);
    if (statSync(completo).isDirectory()) return archivos(relative(RAIZ, completo), filtro);
    return filtro(nombre) ? [relative(RAIZ, completo).split('\\').join('/')] : [];
  });
}
const EN_DISCO = [
  'index.html',
  'manifest.webmanifest',
  'styles.css',
  ...archivos('css', (n) => n.endsWith('.css')),
  ...archivos('fonts', (n) => n.endsWith('.woff2')),
  ...archivos('icons', (n) => /\.(png|svg)$/.test(n)),
  ...archivos('packs', (n) => n.endsWith('.json')),
  ...archivos('js', (n) => n.endsWith('.js')),
];

// 1) La lista PRECACHE se iguala a lo que hay en disco (agrega lo nuevo, quita lo borrado).
const bloque = sw.match(/const PRECACHE = \[([\s\S]*?)\];/);
const anterior = bloque ? [...bloque[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
const PRECACHE = ['./', ...EN_DISCO];
const agregados = PRECACHE.filter((f) => !anterior.includes(f));
const quitados = anterior.filter((f) => !PRECACHE.includes(f));
if (agregados.length || quitados.length) {
  sw = sw.replace(/const PRECACHE = \[[\s\S]*?\];/, `const PRECACHE = [\n${PRECACHE.map((f) => `  '${f}',`).join('\n')}\n];`);
  if (agregados.length) console.log(`PRECACHE + ${agregados.join(', ')}`);
  if (quitados.length) console.log(`PRECACHE − ${quitados.join(', ')}`);
}
const TEXTO = /\.(js|css|html|json|webmanifest|svg|txt|md)$/i;

const hash = createHash('sha256');
for (const ruta of [...new Set(PRECACHE.filter((r) => r !== './'))].sort()) {
  const archivo = join(RAIZ, ruta);
  hash.update(`${ruta}\0`);
  if (!existsSync(archivo)) hash.update('(no existe)');
  else if (TEXTO.test(ruta)) hash.update(readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n'));
  else hash.update(readFileSync(archivo));
  hash.update('\0');
}
const huella = hash.digest('hex').slice(0, 8);
const d = new Date();
const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const actual = (sw.match(/const VERSION = '([^']+)';/) || [])[1] || '';

// 2) VERSION con la huella del contenido.
if (actual.endsWith(huella)) {
  console.log(`VERSION ya está al día: ${actual}`);
} else {
  const nueva = `tecu-${fecha}-${huella}`;
  sw = sw.replace(/const VERSION = '[^']+';/, `const VERSION = '${nueva}';`);
  console.log(`VERSION: ${actual} → ${nueva}`);
}
writeFileSync(rutaSw, sw);
