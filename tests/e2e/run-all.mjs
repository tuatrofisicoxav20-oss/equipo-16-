/**
 * Corre todas las pruebas de extremo a extremo y resume el resultado.
 * Uso: npm run e2e
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PRUEBAS = [
  ['Modo avión y sincronización', 'avion.mjs'],
  ['Presupuesto de 5 clics', 'clics.mjs'],
  ['Accesibilidad (axe, WCAG 2.2 AA)', 'accesibilidad.mjs'],
];

let fallas = 0;
for (const [nombre, archivo] of PRUEBAS) {
  console.log(`\n=== ${nombre} ===`);
  const r = spawnSync(process.execPath, [fileURLToPath(new URL(archivo, import.meta.url))], { stdio: 'inherit' });
  if (r.status !== 0) fallas++;
}
console.log(fallas ? `\n${fallas} prueba(s) de extremo a extremo con fallas.` : '\nTodas las pruebas de extremo a extremo pasaron.');
process.exitCode = fallas ? 1 : 0;
