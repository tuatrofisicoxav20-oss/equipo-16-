/**
 * Auditoría WCAG 2.2 A/AA con axe-core en cada pantalla, en modo normal y con
 * alto contraste. Sale con código 1 si hay violaciones.
 *
 * Uso: node tests/e2e/accesibilidad.mjs
 */
import { levantarServidor, abrirNavegador, auditarAxe, esperarTitulo } from './utilidades.mjs';

const GUION_ANA = [['3x = 25', 'x = 25/3'], ['x/4 = 3', 'x = 12'], ['5x + 2x = 14 − 2', '7x = 12', 'x = 12/7'], ['−2x = 14', 'x = −7']];

const controlar = (p, datos) => p.evaluate((d) => window.postMessage({ tecu: 'control', ...d }, location.origin), datos);
const nav = (p, nombre) => p.locator('.nav-inferior').getByRole('button', { name: nombre }).click();

/** Pantallas a auditar: [nombre, cómo llegar]. */
const PANTALLAS = [
  ['Inicio', async () => {}],
  ['Diagnóstico', async (p) => { await p.getByRole('button', { name: /empezar|continuar/i }).first().click(); await esperarTitulo(p, /ejercicio|diagn/i); }],
  ['Resultado del diagnóstico', async (p) => { await controlar(p, { cmd: 'reproducirDiagnostico', items: GUION_ANA, rapido: true }); await esperarTitulo(p, /resultado/i, 60000); }],
  ['Ruta: pregunta de Tecu', async (p) => { await controlar(p, { cmd: 'reproducirDiagnostico', items: GUION_ANA, rapido: true }); await esperarTitulo(p, /resultado/i, 60000); await p.getByRole('button', { name: /empezar mi ruta/i }).click(); await p.waitForTimeout(500); }],
  ['Ruta: balanza', async (p) => { await controlar(p, { cmd: 'reproducirDiagnostico', items: GUION_ANA, rapido: true }); await esperarTitulo(p, /resultado/i, 60000); await p.getByRole('button', { name: /empezar mi ruta/i }).click(); await controlar(p, { cmd: 'avanzarRuta' }); await p.waitForTimeout(1500); }],
  ['Chat con Tecu', async (p) => { await nav(p, /tecu/i); await p.waitForTimeout(300); }],
  ['Descargas', async (p) => { await nav(p, /descargas/i); await p.getByText(/KB/).first().waitFor(); }],
  ['Ajustes', async (p) => { await nav(p, /ajustes/i); await p.waitForTimeout(300); }],
];

async function correr() {
  const servidor = await levantarServidor();
  const navegador = await abrirNavegador();
  let total = 0;
  try {
    for (const contraste of [false, true]) {
      for (const [nombre, llegar] of PANTALLAS) {
        const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
        const p = await ctx.newPage();
        await p.goto(`${servidor.url}/?alumno=a11y&reiniciar=1`);
        if (contraste) await p.evaluate(() => localStorage.setItem('tecu:prefs', JSON.stringify({ contraste: true })));
        await p.goto(`${servidor.url}/?alumno=a11y`);
        await esperarTitulo(p, /hola/i);
        let violaciones;
        try {
          await llegar(p);
          violaciones = await auditarAxe(p);
        } catch (error) {
          violaciones = [{ id: 'no-se-pudo-llegar', impacto: 'n/a', ayuda: error.message.split('\n')[0], nodos: [] }];
        }
        total += violaciones.length;
        const etiqueta = `${nombre}${contraste ? ' (alto contraste)' : ''}`;
        if (!violaciones.length) console.log(`✓ ${etiqueta}: 0 violaciones`);
        else {
          console.log(`✗ ${etiqueta}: ${violaciones.length} violaciones`);
          for (const v of violaciones) console.log(`    - [${v.impacto}] ${v.id}: ${v.ayuda} → ${v.nodos.join(' | ')}`);
        }
        await ctx.close();
      }
    }
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
  console.log(`\nTotal de violaciones: ${total}`);
  process.exitCode = total ? 1 : 0;
}

correr();
