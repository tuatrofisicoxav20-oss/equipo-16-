/**
 * Modo avión de verdad: primera visita con red (el service worker guarda la
 * app), luego sin red se recarga, se resuelve el diagnóstico completo y se ve
 * la cola de pendientes; al volver la red la cola se vacía sola.
 *
 * Uso: node tests/e2e/avion.mjs
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
    const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const errores = [];
    p.on('pageerror', (e) => errores.push(e.message));

    await p.goto(`${servidor.url}/?alumno=ana&reiniciar=1`);
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.waitForTimeout(1500);
    const cache = await p.evaluate(async () => (await import('/js/services/sw-registro.js')).estadoSinConexion());
    verificar(cache && cache.archivos >= 30, `primera visita: el service worker guardó ${cache?.archivos} archivos (${Math.round((cache?.bytes || 0) / 1024)} KB)`);

    await ctx.setOffline(true);
    await p.reload();
    verificar(/hola/i.test(await esperarTitulo(p, /hola/i)), 'sin red: la app recarga y muestra el inicio');

    await p.evaluate((items) => window.postMessage({ tecu: 'control', cmd: 'reproducirDiagnostico', items, rapido: true }, location.origin), GUION_ANA);
    await esperarTitulo(p, /resultado/i, 60000);
    const sinRed = await p.evaluate(async () => {
      const m = await import('/js/data/store.js');
      return { pendientes: m.crearStore('ana').pendientes().length, servidor: m.eventosServidor().length };
    });
    verificar(sinRed.pendientes > 0 && sinRed.servidor === 0, `sin red: diagnóstico completo, ${sinRed.pendientes} actividades pendientes y nada en el servidor`);
    const barra = await p.locator('.barra-superior').innerText();
    verificar(new RegExp(`${sinRed.pendientes}\\s*pendiente`, 'i').test(barra.replace(/\s+/g, ' ')), 'la barra muestra la cola de pendientes');

    await ctx.setOffline(false);
    let conRed = sinRed;
    for (let i = 0; i < 40 && conRed.pendientes > 0; i++) {
      await p.waitForTimeout(250);
      conRed = await p.evaluate(async () => {
        const m = await import('/js/data/store.js');
        return { pendientes: m.crearStore('ana').pendientes().length, servidor: m.eventosServidor().length };
      });
    }
    verificar(conRed.pendientes === 0 && conRed.servidor === sinRed.pendientes, `al volver la red la cola se vacía sola (${conRed.servidor} en el servidor)`);
    verificar(errores.length === 0, `sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
    await ctx.close();
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
  process.exitCode = fallas.length ? 1 : 0;
}

correr();
