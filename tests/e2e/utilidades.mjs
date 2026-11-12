/**
 * Utilidades para las pruebas de extremo a extremo (Playwright).
 *
 * Requisitos para correrlas fuera de este entorno:
 *   npm i -D playwright && npx playwright install chromium
 * Se corren con: npm run e2e
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crearServidor } from '../../server.js';

const require = createRequire(import.meta.url);

/** Levanta el servidor de la app en un puerto libre. */
export async function levantarServidor() {
  const servidor = crearServidor();
  await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo));
  const { port } = servidor.address();
  return { url: `http://127.0.0.1:${port}`, cerrar: () => new Promise((r) => servidor.close(r)) };
}

/** Abre Chromium (el de Playwright). */
export async function abrirNavegador() {
  const { chromium } = require('playwright');
  return chromium.launch();
}

/**
 * Contador de clics: toda interacción de la prueba pasa por clic(), así el
 * conteo es exacto. Escribir con el teclado NO cuenta como clic.
 */
export function contadorDeClics() {
  let n = 0;
  return {
    async clic(localizador) {
      await localizador.click();
      n++;
    },
    get total() {
      return n;
    },
    reiniciar() {
      n = 0;
    },
  };
}

const AXE = fileURLToPath(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url));

/** Corre axe-core (WCAG 2.0/2.1/2.2 A y AA) y devuelve las violaciones. */
export async function auditarAxe(pagina) {
  await pagina.addScriptTag({ content: readFileSync(AXE, 'utf8') });
  const resultado = await pagina.evaluate(() =>
    window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }),
  );
  return resultado.violations.map((v) => ({
    id: v.id,
    impacto: v.impact,
    ayuda: v.help,
    nodos: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
  }));
}

/** Espera a que el título principal coincida con un patrón. */
export async function esperarTitulo(pagina, patron, ms = 30000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    const t = (await pagina.locator('h1').first().textContent().catch(() => '')) || '';
    if (patron.test(t)) return t.trim();
    await pagina.waitForTimeout(200);
  }
  throw new Error(`No apareció un título que coincida con ${patron}`);
}
