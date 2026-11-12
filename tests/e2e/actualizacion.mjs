/**
 * Actualización del service worker de punta a punta, en Chromium y con la app
 * en una subcarpeta como en GitHub Pages (/equipo-16-/, todo con max-age=600):
 *
 *   1. v1, primera visita: el service worker se instala solo y toma la página,
 *      sin aviso (no hay nada que actualizar).
 *   2. Se publica v2: al recargar la página SIGUE en v1 (también un módulo que
 *      se carga tarde: no se mezclan versiones) y aparece el aviso "Hay una
 *      versión nueva de Tecu": no toma el foco, se anuncia, botones de 44 px,
 *      sin violaciones de axe. "Ahora no" lo oculta; recargar NO aplica v2.
 *   3. Dos ventanas: en una se toca "Actualizar" y carga v2. La otra no se
 *      recarga sola: avisa "Tecu se actualizó en otra ventana" y sigue con
 *      archivos de v1 hasta que la persona toca "Actualizar". Luego la caché de
 *      v1 se borra.
 *   4. Modo avión con v2: recarga y funciona.
 *   5. v3 con un archivo que da 500: no se instala ni avisa (v2 sigue completa).
 *      En la siguiente visita, ya sin falla, se instala bajando solo lo que
 *      faltó, avisa y "Actualizar" carga v3.
 *   6. Primera visita con un archivo que falla: la app queda instalada, el
 *      archivo aparece en `faltantes` y se completa en la siguiente visita.
 *
 * Uso: node tests/e2e/actualizacion.mjs
 */
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirNavegador, esperarTitulo } from './utilidades.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CARPETA = '/equipo-16-/';
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
const AXE = fileURLToPath(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url));

/** Copia la app con su VERSION y marcas para saber qué versión se ve. */
function copiarApp(destino, marca) {
  for (const f of ['index.html', 'manifest.webmanifest', 'styles.css', 'sw.js']) cpSync(join(RAIZ, f), join(destino, f));
  for (const d of ['css', 'js', 'packs', 'fonts', 'icons']) cpSync(join(RAIZ, d), join(destino, d), { recursive: true });
  const editar = (ruta, cambio) => writeFileSync(join(destino, ruta), cambio(readFileSync(join(destino, ruta), 'utf8')));
  editar('sw.js', (s) => s.replace(/const VERSION = '[^']+';/, `const VERSION = 'tecu-prueba-${marca}';`));
  editar('index.html', (s) => s.replace('</head>', `  <meta name="tecu-prueba" content="${marca}">\n</head>`));
  // cuadernillo.js no lo carga la vista del estudiante: sirve para ver qué versión llega "tarde".
  editar('js/ui/cuadernillo.js', (s) => `${s}\nexport const MARCA_PRUEBA = '${marca}';\n`);
  return destino;
}

/** Servidor como GitHub Pages: subcarpeta, 301 sin diagonal, max-age=600 y ETag (304). */
async function levantarServidor() {
  const estado = { raiz: null, fallas: new Map(), pedidos: [] };
  const servidor = createServer((req, res) => {
    const ruta = (req.url || '/').split('?')[0];
    estado.pedidos.push(ruta);
    if (ruta === CARPETA.slice(0, -1)) return res.writeHead(301, { Location: CARPETA }).end();
    if (!ruta.startsWith(CARPETA)) return res.writeHead(404, { 'Content-Type': TIPOS['.html'] }).end('<h1>404</h1>');
    let rel = decodeURIComponent(ruta.slice(CARPETA.length));
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const falla = estado.fallas.get(rel);
    if (falla) return res.writeHead(falla, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Falla simulada');
    const archivo = normalize(join(estado.raiz, rel));
    if (!archivo.startsWith(estado.raiz + sep) || !existsSync(archivo) || !statSync(archivo).isFile()) {
      return res.writeHead(404, { 'Content-Type': TIPOS['.html'] }).end('<h1>404</h1>');
    }
    const cuerpo = readFileSync(archivo);
    const etag = `"${createHash('sha1').update(cuerpo).digest('hex').slice(0, 16)}"`;
    const encabezados = { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'max-age=600', ETag: etag };
    if (req.headers['if-none-match'] === etag) return res.writeHead(304, encabezados).end();
    res.writeHead(200, { ...encabezados, 'Content-Length': cuerpo.length }).end(req.method === 'HEAD' ? undefined : cuerpo);
  });
  await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo));
  const { port } = servidor.address();
  return {
    app: `http://127.0.0.1:${port}${CARPETA}`,
    publicar: (raiz) => {
      estado.raiz = normalize(raiz);
    },
    fallar: (rel, status) => estado.fallas.set(rel, status),
    sinFallas: () => estado.fallas.clear(),
    pedidos: estado.pedidos,
    cerrar: () =>
      new Promise((listo) => {
        servidor.closeAllConnections?.();
        servidor.close(listo);
      }),
  };
}

/* ------------------------------------------------- ayudantes en la página */

const marcaDe = (p) => p.evaluate(() => document.querySelector('meta[name="tecu-prueba"]')?.content || null);
const marcaTardia = (p, app) => p.evaluate(async (u) => (await import(u)).MARCA_PRUEBA, `${app}js/ui/cuadernillo.js`);
const estadoCache = (p, app) =>
  p.evaluate(async (u) => (await import(u)).estadoSinConexion({ espera: 8000 }), `${app}js/services/sw-registro.js`);
const avisoVisible = (p) => p.evaluate(() => {
  const el = document.querySelector('section.actualizacion');
  return el && !el.hidden ? { tipo: el.dataset.tipo, texto: el.innerText.replace(/\s+/g, ' ').trim() } : null;
});
const nombresCache = (p) => p.evaluate(async () => (await caches.keys()).filter((n) => n.startsWith('tecu-app-')));

async function esperarQue(fn, ms = 20000, cada = 200) {
  const fin = Date.now() + ms;
  for (;;) {
    const valor = await fn().catch(() => null);
    if (valor) return valor;
    if (Date.now() > fin) return null;
    await new Promise((r) => setTimeout(r, cada));
  }
}

/** Toca un botón del aviso y espera la recarga completa de la página. */
async function tocarYRecargar(p, nombre) {
  const recarga = p.waitForEvent('load', { timeout: 20000 });
  await p.locator('section.actualizacion').getByRole('button', { name: nombre, exact: true }).click();
  await recarga;
}

async function auditarAviso(p) {
  await p.addScriptTag({ content: readFileSync(AXE, 'utf8') });
  const r = await p.evaluate(() =>
    window.axe.run(
      { include: [['section.actualizacion']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } },
    ),
  );
  return r.violations.map((v) => `${v.id}: ${v.help}`);
}

/* ------------------------------------------------------------------ prueba */

async function correr() {
  const temporal = mkdtempSync(join(tmpdir(), 'tecu-actualizacion-'));
  const [v1, v2, v3] = ['v1', 'v2', 'v3'].map((m) => copiarApp(mkdtempSync(join(temporal, `${m}-`)), m));
  const servidor = await levantarServidor();
  const { app } = servidor;
  const navegador = await abrirNavegador();
  const fallas = [];
  const verificar = (cond, msg) => {
    console.log(`${cond ? '✓' : '✗'} ${msg}`);
    if (!cond) fallas.push(msg);
  };
  const errores = [];
  const vigilar = (p, nombre) => p.on('pageerror', (e) => errores.push(`${nombre}: ${e.message}`));

  try {
    const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });

    /* 1. Primera visita (v1) */
    servidor.publicar(v1);
    const a = await ctx.newPage();
    vigilar(a, 'ventana A');
    await a.goto(`${app}?alumno=ana`);
    await esperarTitulo(a, /hola/i);
    const controlada = await a
      .waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30000 })
      .then(() => true, () => false);
    const registro = await a.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return { alcance: r?.scope, script: r?.active?.scriptURL };
    });
    verificar(controlada && registro.alcance === app && registro.script === `${app}sw.js`, `primera visita: el service worker se activa solo y toma la página (alcance ${new URL(registro.alcance || app).pathname})`);
    const estado1 = await estadoCache(a, app);
    verificar(estado1?.version === 'tecu-prueba-v1' && estado1.completo && estado1.archivos === estado1.total, `v1 guardada completa: ${estado1?.archivos}/${estado1?.total} archivos, ${Math.round((estado1?.bytes || 0) / 1024)} KB`);
    const nombres1 = await nombresCache(a);
    verificar(nombres1.length === 1 && nombres1[0].endsWith(`@${CARPETA}`), `una sola caché, propia de la carpeta: ${nombres1.join(', ')}`);
    await a.waitForTimeout(800);
    verificar((await avisoVisible(a)) === null, 'primera instalación: no aparece ningún aviso');

    /* 2. Se publica v2 */
    servidor.publicar(v2);
    await a.reload();
    await esperarTitulo(a, /hola/i);
    const aviso2 = await esperarQue(() => avisoVisible(a), 30000);
    verificar(aviso2?.tipo === 'disponible' && /Hay una versión nueva de Tecu/.test(aviso2.texto), `con v2 publicada aparece el aviso: "${aviso2?.texto}"`);
    verificar((await marcaDe(a)) === 'v1' && (await marcaTardia(a, app)) === 'v1', 'la página sigue en v1, también un módulo que se carga tarde (sin mezclar versiones)');
    const foco = await a.evaluate(() => Boolean(document.activeElement?.closest('section.actualizacion')));
    verificar(!foco, 'el aviso no toma el foco (no interrumpe lo que se escribe)');
    const anuncio = await esperarQue(() => a.evaluate(() => (/versión nueva/i.test(document.getElementById('anuncios')?.textContent || '') ? true : null)), 3000);
    verificar(anuncio === true, 'el aviso se anuncia al lector de pantalla');
    const medidas = await a.evaluate(() => {
      const caja = (el) => el?.getBoundingClientRect();
      const botones = [...document.querySelectorAll('section.actualizacion button')].map((b) => ({ texto: b.textContent.trim(), ...caja(b).toJSON() }));
      const aviso = caja(document.querySelector('section.actualizacion'));
      const nav = caja(document.querySelector('.nav-inferior'));
      return { botones, avisoAbajo: aviso.bottom, navArriba: nav ? nav.top : innerHeight, ancho: document.documentElement.scrollWidth, vista: innerWidth };
    });
    verificar(
      medidas.botones.length === 2 && medidas.botones.every((b) => b.width >= 44 && b.height >= 44),
      `botones de al menos 44 px: ${medidas.botones.map((b) => `"${b.texto}" ${Math.round(b.width)}×${Math.round(b.height)}`).join(', ')}`,
    );
    verificar(medidas.avisoAbajo <= medidas.navArriba + 1 && medidas.ancho <= medidas.vista, 'el aviso no tapa la barra de navegación ni provoca scroll horizontal (360 px)');
    const violaciones = await auditarAviso(a);
    verificar(violaciones.length === 0, `axe (WCAG 2.2 AA) sin violaciones en el aviso${violaciones.length ? `: ${violaciones.join(' | ')}` : ''}`);

    await a.locator('section.actualizacion').getByRole('button', { name: 'Ahora no' }).click();
    const oculto = await esperarQue(async () => ((await avisoVisible(a)) === null ? true : null), 3000);
    const dijo = await esperarQue(() => a.evaluate(() => (/próxima vez/i.test(document.getElementById('anuncios')?.textContent || '') ? true : null)), 3000);
    verificar(oculto && dijo, '"Ahora no" oculta el aviso y explica que se usará la próxima vez');
    await a.reload();
    await esperarTitulo(a, /hola/i);
    const otraVez = await esperarQue(() => avisoVisible(a), 15000);
    verificar((await marcaDe(a)) === 'v1' && otraVez?.tipo === 'disponible', 'recargar no aplica la versión nueva: sigue v1 y el aviso vuelve a aparecer');

    /* 3. Dos ventanas */
    const b = await ctx.newPage();
    vigilar(b, 'ventana B');
    await b.goto(`${app}?alumno=luis`);
    await esperarTitulo(b, /hola/i);
    await esperarQue(() => avisoVisible(b), 15000);
    await b.evaluate(() => {
      window.__sinRecargar = true;
    });
    await tocarYRecargar(a, 'Actualizar');
    await esperarTitulo(a, /hola/i);
    const estado2 = await estadoCache(a, app);
    verificar((await marcaDe(a)) === 'v2' && (await marcaTardia(a, app)) === 'v2' && estado2?.version === 'tecu-prueba-v2', '"Actualizar" carga v2 completa (página, módulos y service worker)');
    await a.waitForTimeout(500);
    verificar((await avisoVisible(a)) === null, 'después de actualizar ya no hay aviso');

    const avisoB = await esperarQue(async () => {
      const av = await avisoVisible(b);
      return av?.tipo === 'otra-ventana' ? av : null;
    }, 10000);
    const sinRecargar = await b.evaluate(() => window.__sinRecargar === true).catch(() => false);
    verificar(sinRecargar && avisoB && /otra ventana/i.test(avisoB.texto), `la otra ventana NO se recarga sola y avisa: "${avisoB?.texto}"`);
    verificar((await marcaTardia(b, app)) === 'v1', 'la otra ventana sigue recibiendo archivos de v1 hasta que recargue');
    verificar((await nombresCache(b)).some((n) => n.includes('tecu-prueba-v1')), 'la caché de v1 se conserva mientras esa ventana la usa');
    await tocarYRecargar(b, 'Actualizar');
    await esperarTitulo(b, /hola/i);
    verificar((await marcaDe(b)) === 'v2', 'en la otra ventana, "Actualizar" carga v2');
    const soloV2 = await esperarQue(async () => {
      await estadoCache(b, app); // también le pide al SW soltar la caché anterior
      const n = await nombresCache(b);
      return n.length === 1 && n[0].includes('tecu-prueba-v2') ? n : null;
    }, 10000, 400);
    verificar(Boolean(soloV2), `sin ventanas en v1, su caché se borra: ${(soloV2 || (await nombresCache(b))).join(', ')}`);
    await b.close();

    /* 4. Modo avión con v2 */
    await ctx.setOffline(true);
    await a.reload();
    const titulo = await esperarTitulo(a, /hola/i).catch(() => '');
    const estadoAvion = await estadoCache(a, app);
    verificar(/hola/i.test(titulo) && (await marcaDe(a)) === 'v2' && estadoAvion?.completo, 'modo avión después de actualizar: recarga v2 completa y funciona');
    await ctx.setOffline(false);

    /* 5. Una versión que falla al descargarse */
    servidor.publicar(v3);
    servidor.fallar('css/tecu.css', 500);
    const antes = servidor.pedidos.length;
    await a.reload();
    await esperarTitulo(a, /hola/i);
    const intento = await esperarQue(() => Promise.resolve(servidor.pedidos.slice(antes).filter((r) => r.endsWith('/css/tecu.css')).length >= 3 || null), 20000);
    const quieto = await esperarQue(() => a.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return !r.installing && !r.waiting ? true : null;
    }), 15000);
    await a.waitForTimeout(500);
    const estado3 = await estadoCache(a, app);
    verificar(intento && quieto && (await avisoVisible(a)) === null && estado3?.version === 'tecu-prueba-v2' && estado3.completo, 'v3 con un archivo que da 500: se reintenta, no se instala a medias ni avisa; v2 sigue completa');

    servidor.sinFallas();
    const antes2 = servidor.pedidos.length;
    await a.reload();
    await esperarTitulo(a, /hola/i);
    const aviso3 = await esperarQue(() => avisoVisible(a), 30000);
    const bajados = servidor.pedidos.slice(antes2).filter((r) => !r.endsWith('/sw.js') && r !== CARPETA && !r.endsWith('/index.html'));
    verificar(aviso3?.tipo === 'disponible', 'siguiente visita sin falla: v3 se instala y aparece el aviso');
    verificar(bajados.every((r) => r.endsWith('/css/tecu.css')), `al reintentar solo se descargó lo que faltaba: ${[...new Set(bajados)].map((r) => r.slice(CARPETA.length)).join(', ') || '(nada)'}`);
    await tocarYRecargar(a, 'Actualizar');
    await esperarTitulo(a, /hola/i);
    verificar((await marcaDe(a)) === 'v3' && (await estadoCache(a, app))?.completo, '"Actualizar" carga v3 completa');
    await ctx.close();

    /* 6. Primera visita con un archivo que falla */
    const ctx2 = await navegador.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
    servidor.fallar('js/data/analitica.js', 500);
    const c = await ctx2.newPage();
    vigilar(c, 'celular nuevo');
    await c.goto(`${app}?alumno=invitado`);
    await esperarTitulo(c, /hola/i);
    await c.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30000 }).catch(() => {});
    const estado6 = await estadoCache(c, app);
    verificar(estado6 && !estado6.completo && estado6.faltantes.includes('js/data/analitica.js') && estado6.archivos === estado6.total - 1, `primera visita con mala señal: se instala igual y reporta faltantes (${estado6?.faltantes?.join(', ')})`);
    servidor.sinFallas();
    await c.reload();
    await esperarTitulo(c, /hola/i);
    const completo = await esperarQue(async () => ((await estadoCache(c, app))?.completo ? true : null), 15000, 500);
    verificar(completo === true, 'en la siguiente visita con internet se completa lo que faltó');
    await ctx2.close();

    verificar(errores.length === 0, `sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
  } catch (error) {
    console.error(error);
    fallas.push(String(error));
  } finally {
    await navegador.close();
    await servidor.cerrar();
    rmSync(temporal, { recursive: true, force: true });
  }
  if (fallas.length) console.log(`\n${fallas.length} verificación(es) fallaron.`);
  process.exitCode = fallas.length ? 1 : 0;
}

correr();
