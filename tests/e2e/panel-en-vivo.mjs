/**
 * El panel docente se actualiza SOLO cuando un celular sincroniza, sin
 * servidor y sin recargar: dos páginas del mismo navegador (la vista real del
 * estudiante y la vista real del panel), comunicadas por localStorage +
 * BroadcastChannel.
 *
 * Uso: node tests/e2e/panel-en-vivo.mjs
 */
import { levantarServidor, abrirNavegador, esperarTitulo } from './utilidades.mjs';

const GUION_ANA = [['3x = 25', 'x = 25/3'], ['x/4 = 3', 'x = 12'], ['5x + 2x = 14 − 2', '7x = 12', 'x = 12/7'], ['−2x = 14', 'x = −7']];

async function correr() {
  const servidor = await levantarServidor();
  const navegador = await abrirNavegador();
  const fallas = [];
  const verificar = (cond, msg) => {
    console.log(`${cond ? '✓' : '✗'} ${msg}`);
    if (!cond) fallas.push(msg);
  };
  try {
    const ctx = await navegador.newContext({ reducedMotion: 'reduce' });
    const errores = [];
    const panel = await ctx.newPage();
    panel.on('pageerror', (e) => errores.push(`panel: ${e.message}`));
    await panel.setViewportSize({ width: 1280, height: 800 });
    await panel.goto(`${servidor.url}/?vista=docente&reiniciar=1`);
    await panel.getByRole('heading', { level: 1 }).first().waitFor();
    const filasAntes = await panel.locator('table tbody tr').count();
    verificar(filasAntes >= 28, `el panel muestra el grupo simulado (${filasAntes} filas)`);
    verificar(!(await panel.getByText('Ana', { exact: true }).count()), 'antes de sincronizar, Ana no aparece');

    const cel = await ctx.newPage();
    cel.on('pageerror', (e) => errores.push(`celular: ${e.message}`));
    await cel.setViewportSize({ width: 360, height: 740 });
    await cel.goto(`${servidor.url}/?alumno=ana`);
    await esperarTitulo(cel, /hola/i);
    await cel.evaluate((items) => window.postMessage({ tecu: 'control', cmd: 'reproducirDiagnostico', items, rapido: true }, location.origin), GUION_ANA);
    await esperarTitulo(cel, /resultado/i, 60000);

    // Sin recargar el panel: debe aparecer Ana, en vivo, con sus errores de signos.
    const filaAna = panel.locator('table tbody tr', { hasText: 'Ana' }).first();
    await filaAna.waitFor({ timeout: 15000 });
    const textoFila = (await filaAna.innerText()).replace(/\s+/g, ' ');
    verificar(/en vivo/i.test(textoFila), `la fila de Ana aparece sin recargar y dice "En vivo" (${textoFila.slice(0, 80)}…)`);
    verificar(/\b3\b/.test(textoFila), 'la fila de Ana muestra sus 3 errores de signos');
    const indicador = (await panel.locator('header, .barra-superior').first().innerText()).replace(/\s+/g, ' ');
    verificar(/ana/i.test(indicador), 'el indicador de última sincronización menciona a Ana');

    await filaAna.getByRole('button').first().click();
    const dialogo = panel.locator('dialog[open]');
    await dialogo.waitFor();
    const ficha = (await dialogo.innerText()).replace(/\s+/g, ' ');
    // La ficha muestra el error MÁS RECIENTE de Ana: ejercicio 4, renglón 2 (−2x = 14).
    verificar(/aquí cambió la solución/i.test(ficha) && /−2x = 14/.test(ficha), 'la ficha de Ana señala el renglón roto (−2x = 14) y "Aquí cambió la solución"');
    verificar(/signo al cambiar de lado/i.test(ficha) && /15 minutos/i.test(ficha), 'la ficha dice el tipo de error y qué retomar en 15 minutos');
    await panel.keyboard.press('Escape');

    verificar(errores.length === 0, `sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
    await ctx.close();
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
  process.exitCode = fallas.length ? 1 : 0;
}

correr();
