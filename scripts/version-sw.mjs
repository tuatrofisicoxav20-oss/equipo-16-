/**
 * Pone en sw.js la VERSION que corresponde al contenido actual de la app
 * (misma huella que revisa tests/sw.test.js). Úsalo antes de publicar:
 *
 *   npm run version
 *
 * Sin cambiar VERSION, los celulares que ya tienen la app guardada nunca
 * reciben los cambios.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const rutaSw = join(RAIZ, 'sw.js');
const sw = readFileSync(rutaSw, 'utf8');
const bloque = sw.match(/const PRECACHE = \[([\s\S]*?)\];/);
const PRECACHE = bloque ? [...bloque[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
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

if (actual.endsWith(huella)) {
  console.log(`VERSION ya está al día: ${actual}`);
} else {
  const nueva = `tecu-${fecha}-${huella}`;
  writeFileSync(rutaSw, sw.replace(/const VERSION = '[^']+';/, `const VERSION = '${nueva}';`));
  console.log(`VERSION: ${actual} → ${nueva}`);
}
