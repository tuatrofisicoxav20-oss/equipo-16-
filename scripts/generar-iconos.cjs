/**
 * Genera los íconos PNG de la PWA a partir de icons/icono.svg (Tecu).
 * Uso (solo para desarrollo; requiere Playwright): node scripts/generar-iconos.cjs
 *   icons/icono-192.png, icons/icono-512.png  → propósito "any"
 *   icons/icono-maskable-512.png              → propósito "maskable" (Tecu dentro de la zona segura del 80 %)
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const svg = fs.readFileSync(path.join(RAIZ, 'icons/icono.svg'), 'utf8');
const FONDO = '#0b5d7a';

const pagina = (tam, maskable) => `<!doctype html><html><head><style>
  html,body{margin:0;width:${tam}px;height:${tam}px;overflow:hidden;background:${maskable ? FONDO : 'transparent'}}
  .c{width:${tam}px;height:${tam}px;display:grid;place-items:center}
  .c svg{width:${maskable ? Math.round(tam * 0.8) : tam}px;height:${maskable ? Math.round(tam * 0.8) : tam}px}
</style></head><body><div class="c">${svg}</div></body></html>`;

(async () => {
  const navegador = await chromium.launch();
  const salidas = [
    ['icons/icono-192.png', 192, false],
    ['icons/icono-512.png', 512, false],
    ['icons/icono-maskable-512.png', 512, true],
  ];
  for (const [archivo, tam, maskable] of salidas) {
    const p = await navegador.newPage({ viewport: { width: tam, height: tam }, deviceScaleFactor: 1 });
    await p.setContent(pagina(tam, maskable));
    await p.screenshot({ path: path.join(RAIZ, archivo), omitBackground: !maskable });
    await p.close();
    console.log('✓', archivo);
  }
  await navegador.close();
})();
