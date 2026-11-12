/**
 * La app publicada en una SUBCARPETA, como la sirve GitHub Pages
 * (https://<usuario>.github.io/equipo-16-/). En localhost:8080 la app vive en
 * la raíz y una ruta absoluta (/js/…) funciona por casualidad; aquí no.
 *
 * Comprueba, dentro de /equipo-16-/:
 *   - cargan las vistas: estudiante (?alumno=ana), panel docente (?vista=docente)
 *     y modo presentación (?vista=pitch, si ya existe js/views/pitch.js);
 *   - el service worker se registra con el alcance de la subcarpeta y guarda
 *     solo archivos de la subcarpeta;
 *   - Chrome la considera instalable (CDP: Page.getInstallabilityErrors) y el
 *     manifiesto, sus íconos, sus atajos y los metadatos de iOS apuntan dentro
 *     de la subcarpeta;
 *   - en modo avión recarga, abre el panel y la app instalada (start_url), y el
 *     paquete y los íconos salen de la caché;
 *   - el QR de "Escanea y pruébalo" (js/ui/qr.js) apunta a la subcarpeta y se lee
 *     con jsQR desde una captura de pantalla real;
 *   - ninguna solicitud se sale de la subcarpeta (rutas absolutas /…) ni falla.
 *
 * Usa el Chromium completo de Playwright con un perfil normal: en incógnito
 * (newContext) y en el "headless shell" Chrome no revisa la instalabilidad.
 *
 * Uso: node tests/e2e/subruta.mjs              (como GitHub Pages)
 *      node tests/e2e/subruta.mjs --cloudflare (además …/index.html → …/ con 308,
 *                                               como las "URL bonitas" de Cloudflare Pages)
 */
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esperarTitulo } from './utilidades.mjs';
import { levantarSubruta } from '../../scripts/servir-subruta.mjs';

const require = createRequire(import.meta.url);
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

/** Entradas de PRECACHE (sw.js) que aún no existen: su 404 es "en construcción", no una ruta rota. */
function precacheEnConstruccion() {
  const sw = readFileSync(join(RAIZ, 'sw.js'), 'utf8');
  const bloque = sw.match(/const PRECACHE = \[([\s\S]*?)\];/);
  const lista = bloque ? [...bloque[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
  return new Set(lista.filter((f) => f !== './' && !existsSync(join(RAIZ, f))));
}

/** Perfil normal (no incógnito) del Chromium completo; si no está, el de siempre. */
async function abrirPerfil(dir) {
  const { chromium } = require('playwright');
  const opciones = { viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' };
  try {
    return { ctx: await chromium.launchPersistentContext(dir, { ...opciones, channel: 'chromium' }), completo: true };
  } catch {
    return { ctx: await chromium.launchPersistentContext(dir, opciones), completo: false };
  }
}

/** Descarga desde la página (pasa por el service worker) y lee tamaño y tipo de color si es PNG. */
function revisarArchivos(pagina, urls) {
  return pagina.evaluate(
    (lista) =>
      Promise.all(
        lista.map(async (url) => {
          try {
            const r = await fetch(url);
            const b = new Uint8Array(await r.arrayBuffer());
            const png = b.length > 26 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
            const dv = new DataView(b.buffer);
            return {
              url,
              estado: r.status,
              tipo: r.headers.get('content-type') || '',
              bytes: b.length,
              ancho: png ? dv.getUint32(16) : null,
              alto: png ? dv.getUint32(20) : null,
              color: png ? b[25] : null, // 2 = RGB (opaco), 6 = RGBA
            };
          } catch (e) {
            return { url, estado: 0, error: String(e) };
          }
        }),
      ),
    urls,
  );
}

/** Entradas de PRECACHE en sw.js. */
function precache() {
  const sw = readFileSync(join(RAIZ, 'sw.js'), 'utf8');
  const bloque = sw.match(/const PRECACHE = \[([\s\S]*?)\];/);
  return bloque ? [...bloque[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
}

/**
 * Pinta el QR de invitado con js/ui/qr.js (importado desde la subcarpeta), toma una
 * captura de pantalla y la lee con jsQR dentro de la página: lo mismo que haría un celular.
 */
async function leerQRDePantalla(pagina, lado = 233) {
  const datos = await pagina.evaluate(async (tam) => {
    const { qrSVG, urlParaInvitado, esDireccionPublica } = await import(new URL('js/ui/qr.js', location.href).href);
    const url = urlParaInvitado();
    const caja = document.createElement('div');
    caja.id = 'qr-prueba';
    caja.style.cssText = `position:fixed;top:0;left:0;z-index:99999;width:${tam}px;height:${tam}px;background:#fff`;
    caja.innerHTML = qrSVG(url, { etiqueta: 'Escanea y prueba Tecu en tu celular' });
    caja.firstElementChild.style.cssText = 'display:block;width:100%;height:100%';
    document.body.append(caja);
    return { url, publica: esDireccionPublica(url) };
  }, lado);
  const captura = await pagina.locator('#qr-prueba').screenshot();
  await pagina.addScriptTag({ path: require.resolve('jsqr') });
  const leido = await pagina.evaluate(async (base64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const lienzo = document.createElement('canvas');
    lienzo.width = img.naturalWidth;
    lienzo.height = img.naturalHeight;
    const g = lienzo.getContext('2d');
    g.drawImage(img, 0, 0);
    const { data, width, height } = g.getImageData(0, 0, lienzo.width, lienzo.height);
    const leer = typeof window.jsQR === 'function' ? window.jsQR : window.jsQR.default;
    document.getElementById('qr-prueba')?.remove();
    const r = leer(data, width, height);
    return r ? { texto: r.data, version: r.version } : null;
  }, captura.toString('base64'));
  return { ...datos, leido };
}

async function esperarPanel(pagina) {
  await pagina.locator('table tbody tr').first().waitFor({ timeout: 30000 });
  return pagina.locator('table tbody tr').count();
}

const COMO_CLOUDFLARE = process.argv.includes('--cloudflare');

async function correr() {
  const srv = await levantarSubruta({ redirigirIndex: COMO_CLOUDFLARE });
  const app = srv.url; // http://127.0.0.1:PUERTO/equipo-16-/
  if (COMO_CLOUDFLARE) console.log('(imitando Cloudflare Pages: …/index.html redirige a …/)');
  const perfil = mkdtempSync(join(tmpdir(), 'tecu-subruta-'));
  const { ctx, completo } = await abrirPerfil(perfil);
  const fallas = [];
  const verificar = (cond, msg) => {
    console.log(`${cond ? '✓' : '✗'} ${msg}`);
    if (!cond) fallas.push(msg);
  };
  const nota = (msg) => console.log(`– ${msg}`);
  const errores = [];
  try {
    const p = ctx.pages()[0] || (await ctx.newPage());
    p.on('pageerror', (e) => errores.push({ texto: e.message, url: '' }));
    p.on('console', (m) => {
      if (m.type() === 'error') errores.push({ texto: `consola: ${m.text()}`, url: m.location()?.url || '' });
    });
    /** Navega; si el navegador no puede abrir la página, lo anota como falla en vez de romper la prueba. */
    const ir = async (url) => {
      try {
        await p.goto(url);
        return true;
      } catch (e) {
        verificar(false, `abrir ${url.replace(srv.origen, '')}: ${String(e.message).split('\n')[0]}`);
        return false;
      }
    };

    // 1. Primera visita, con red: estudiante.
    await ir(`${app}?alumno=ana&reiniciar=1`);
    verificar(/hola/i.test(await esperarTitulo(p, /hola/i)), `estudiante (?alumno=ana) carga en ${srv.base}`);
    const registro = await p.evaluate(async () => {
      const r = await navigator.serviceWorker.ready;
      return { alcance: r.scope, script: r.active?.scriptURL };
    });
    verificar(
      registro.alcance === app && registro.script === `${app}sw.js`,
      `service worker registrado con alcance ${new URL(registro.alcance).pathname} (${new URL(registro.script || app).pathname})`,
    );

    // 2. Lo que guardó el service worker: todo dentro de la subcarpeta.
    const cache = await p.evaluate(async () => {
      const urls = [];
      for (const nombre of (await caches.keys()).filter((n) => n.startsWith('tecu-app-'))) {
        for (const req of await (await caches.open(nombre)).keys()) urls.push(req.url);
      }
      const { estadoSinConexion } = await import(new URL('js/services/sw-registro.js', location.href).href);
      return { urls, estado: await estadoSinConexion() };
    });
    const fueraDeCache = cache.urls.filter((u) => !u.startsWith(app));
    verificar(
      cache.urls.length >= 30 && fueraDeCache.length === 0,
      `el service worker guardó ${cache.urls.length} archivos (${Math.round((cache.estado?.bytes || 0) / 1024)} KB), todos dentro de la subcarpeta${fueraDeCache.length ? `; fuera: ${fueraDeCache.join(', ')}` : ''}`,
    );

    // 3. Manifiesto, instalabilidad, íconos y atajos (CDP).
    const cdp = await ctx.newCDPSession(p);
    const manifiesto = await cdp.send('Page.getAppManifest');
    verificar(
      manifiesto.url === `${app}manifest.webmanifest` && manifiesto.errors.length === 0,
      `manifiesto en ${new URL(manifiesto.url || app).pathname} sin errores${manifiesto.errors.length ? `: ${manifiesto.errors.map((e) => e.message).join(' | ')}` : ''}`,
    );
    const m = JSON.parse(manifiesto.data || '{}');
    const resolver = (ruta) => new URL(ruta, manifiesto.url).href;
    verificar(resolver(m.scope || './') === app, `scope = ${new URL(resolver(m.scope || './')).pathname}`);
    verificar(resolver(m.start_url || '.').startsWith(app), `start_url dentro de la subcarpeta (${new URL(resolver(m.start_url || '.')).pathname}${new URL(resolver(m.start_url || '.')).search})`);
    if (completo) {
      const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
      verificar(
        installabilityErrors.length === 0,
        `Chrome la considera instalable${installabilityErrors.length ? `; errores: ${installabilityErrors.map((e) => e.errorId).join(', ')}` : ''}`,
      );
      const { appId } = await cdp.send('Page.getAppId').catch(() => ({}));
      if (appId) nota(`identidad de la app para Chrome (id): ${appId}`);
    } else {
      nota('instalabilidad sin revisar: falta el Chromium completo de Playwright (npx playwright install chromium)');
    }

    const iconosManifiesto = (m.icons || []).map((i) => ({ ...i, url: resolver(i.src) }));
    const atajos = (m.shortcuts || []).map((a) => ({ ...a, url: resolver(a.url) }));
    const iconosAtajos = atajos.flatMap((a) => (a.icons || []).map((i) => ({ ...i, url: resolver(i.src) })));
    const todos = [...iconosManifiesto, ...iconosAtajos];
    const revisados = await revisarArchivos(p, [...new Set(todos.map((i) => i.url))]);
    const malos = todos.filter((i) => {
      const r = revisados.find((x) => x.url === i.url);
      if (!r || r.estado !== 200 || !i.url.startsWith(app) || !/^image\//.test(r.tipo)) return true;
      if (r.ancho == null || !i.sizes || i.sizes === 'any') return false;
      return !i.sizes.split(/\s+/).includes(`${r.ancho}x${r.alto}`);
    });
    verificar(
      iconosManifiesto.length >= 3 && malos.length === 0,
      `${iconosManifiesto.length} íconos del manifiesto y ${iconosAtajos.length} de atajos cargan con su tamaño declarado${malos.length ? `; con problemas: ${malos.map((i) => i.src).join(', ')}` : ''}`,
    );
    verificar(
      iconosManifiesto.some((i) => i.purpose === 'maskable') && iconosManifiesto.some((i) => i.sizes === '512x512') && iconosManifiesto.some((i) => i.sizes === '192x192'),
      'íconos de 192 y 512 px, y uno "maskable" para Android',
    );
    verificar(
      atajos.length >= 2 && atajos.every((a) => a.url.startsWith(app)),
      `atajos dentro de la subcarpeta: ${atajos.map((a) => `"${a.name}" → ${new URL(a.url).search || '/'}`).join(' · ')}`,
    );

    const ios = await p.evaluate(() => {
      const meta = (n) => document.querySelector(`meta[name="${n}"]`)?.content || '';
      return {
        capaz: meta('apple-mobile-web-app-capable'),
        titulo: meta('apple-mobile-web-app-title'),
        barra: meta('apple-mobile-web-app-status-bar-style'),
        tema: meta('theme-color'),
        icono: document.querySelector('link[rel="apple-touch-icon"]')?.href || '',
        manifiesto: document.querySelector('link[rel="manifest"]')?.href || '',
      };
    });
    const [iconoIOS] = await revisarArchivos(p, [ios.icono || app]);
    verificar(
      ios.capaz === 'yes' && ios.titulo && ios.barra && ios.tema === m.theme_color && ios.manifiesto === manifiesto.url,
      `metadatos de iOS y Android: apple-mobile-web-app-capable, título "${ios.titulo}", barra "${ios.barra}", theme-color ${ios.tema}`,
    );
    verificar(
      ios.icono.startsWith(app) && iconoIOS.estado === 200 && iconoIOS.color === 2,
      `apple-touch-icon carga y es opaco (iOS pinta de negro lo transparente): ${ios.icono.slice(app.length)}`,
    );

    // 4. El QR de "Escanea y pruébalo" que mostrará el modo presentación.
    if (existsSync(join(RAIZ, 'node_modules/jsqr'))) {
      const qr = await leerQRDePantalla(p);
      verificar(
        qr.url === `${app}?alumno=invitado` && qr.leido?.texto === qr.url,
        `el QR de invitado (js/ui/qr.js) apunta a la subcarpeta y se lee desde la pantalla: ${qr.leido?.texto} (versión ${qr.leido?.version})`,
      );
      verificar(!qr.publica, 'esDireccionPublica() avisa que una dirección local no sirve para el celular del jurado');
    } else {
      nota('QR: falta jsqr (npm install) para leerlo desde la pantalla');
    }

    // 5. Las otras vistas, con red.
    const filas = (await ir(`${app}?vista=docente`)) ? await esperarPanel(p) : 0;
    verificar(filas >= 28, `panel docente (?vista=docente) carga con el grupo (${filas} filas)`);
    for (const atajo of atajos) {
      const abrio = await ir(atajo.url);
      const ok = abrio && (/docente/.test(atajo.url) ? (await esperarPanel(p)) >= 28 : /hola/i.test(await esperarTitulo(p, /hola/i)));
      verificar(ok, `el atajo "${atajo.name}" abre su vista`);
    }
    const pitch = join(RAIZ, 'js/views/pitch.js');
    const pitchListo = existsSync(pitch) && /export\s+(async\s+)?function\s+montarPitch\b/.test(readFileSync(pitch, 'utf8'));
    if (pitchListo) {
      await p.setViewportSize({ width: 1366, height: 768 });
      await ir(`${app}?vista=pitch`);
      await p.waitForFunction(() => !document.querySelector('#app > .cargando'), null, { timeout: 30000 });
      await p.waitForTimeout(3000); // los teléfonos y el panel del escenario cargan en iframes
      const texto = await p.locator('#app').innerText();
      const marcos = p.frames().filter((f) => f !== p.mainFrame()).map((f) => f.url()).filter((u) => u && u !== 'about:blank');
      verificar(
        !/algo salió mal/i.test(texto) && marcos.every((u) => u.startsWith(app)),
        `modo presentación (?vista=pitch) carga; ${marcos.length} iframe(s) dentro de la subcarpeta`,
      );
      await p.setViewportSize({ width: 360, height: 740 });
    } else {
      nota('modo presentación: js/views/pitch.js aún no exporta montarPitch (en construcción; se omite)');
    }

    // 6. Modo avión.
    await ctx.setOffline(true);
    const llegadasAntes = srv.total;
    const titulo = async (url) => ((await ir(url)) ? esperarTitulo(p, /hola/i).catch(() => '') : '');
    verificar(/hola/i.test(await titulo(`${app}?alumno=ana`)), 'sin red: la vista del estudiante recarga desde la caché');
    verificar(/hola/i.test(await titulo(resolver(m.start_url || '.'))), 'sin red: abre la app instalada (start_url)');
    verificar((await ir(`${app}?vista=docente`)) && (await esperarPanel(p).catch(() => 0)) >= 28, 'sin red: el panel docente carga');
    const sinRed = await revisarArchivos(p, [`${app}packs/ecuaciones-1.json`, ...iconosManifiesto.map((i) => i.url)]);
    const paquete = await p.evaluate(async (url) => {
      try {
        const pack = await (await fetch(url)).json();
        return Boolean(pack && pack.tecu && pack.errores);
      } catch {
        return false;
      }
    }, `${app}packs/ecuaciones-1.json`);
    verificar(
      paquete && sinRed.every((r) => r.estado === 200),
      `sin red: el paquete (${Math.round(sinRed[0].bytes / 1024)} KB) y ${sinRed.length - 1} íconos salen de la caché`,
    );
    if (precache().includes('js/ui/qr.js')) {
      const qrSinRed = await p.evaluate(async () => {
        try {
          const { qrSVG } = await import(new URL('js/ui/qr.js', location.href).href);
          return qrSVG('https://ejemplo.org/').startsWith('<svg');
        } catch {
          return false;
        }
      });
      verificar(qrSinRed, 'sin red: el generador de QR (js/ui/qr.js) sale de la caché');
    } else {
      nota('pendiente en sw.js: agregar js/ui/qr.js a PRECACHE para que el QR del pitch funcione en modo avión');
    }
    verificar(srv.total === llegadasAntes, `sin red: ninguna solicitud llegó al servidor (${srv.total - llegadasAntes})`);
    await ctx.setOffline(false);

    // 7. Sin la diagonal final GitHub Pages redirige a la carpeta: las rutas relativas siguen sirviendo.
    const sinDiagonal = await titulo(`${srv.origen}${srv.base.slice(0, -1)}?alumno=ana`);
    verificar(p.url() === `${app}?alumno=ana` && /hola/i.test(sinDiagonal), `sin diagonal final (${srv.base.slice(0, -1)}) redirige y carga`);

    // 8. Ninguna solicitud se salió de la subcarpeta ni falló.
    verificar(
      srv.fuera.length === 0,
      `ninguna solicitud a rutas absolutas fuera de ${srv.base}${srv.fuera.length ? `: ${srv.fuera.map((s) => `${s.ruta}${s.desde ? ` (desde ${s.desde})` : ''}`).join(', ')}` : ''}`,
    );
    const enConstruccion = precacheEnConstruccion();
    const archivo = (s) => decodeURIComponent(s.ruta.slice(srv.base.length).split('?')[0]);
    const rotas = srv.fallidas.filter((s) => !enConstruccion.has(archivo(s)));
    const pendientes = [...new Set(srv.fallidas.filter((s) => enConstruccion.has(archivo(s))).map(archivo))];
    verificar(rotas.length === 0, `ninguna solicitud dentro de la subcarpeta falló${rotas.length ? `: ${rotas.map((s) => `${s.estado} ${s.ruta}`).join(', ')}` : ''}`);
    if (pendientes.length) nota(`404 esperados (en PRECACHE pero aún no existen): ${pendientes.join(', ')}`);
    const deConstruccion = (e) => [...enConstruccion].some((f) => e.url.endsWith(`/${f}`) || e.texto.includes(f));
    const reales = errores.filter((e) => !deConstruccion(e));
    const pendientesJS = errores.length - reales.length;
    if (pendientesJS) nota(`${pendientesJS} aviso(s) de consola por módulos en construcción (los de arriba)`);
    verificar(reales.length === 0, `sin errores de JavaScript${reales.length ? `: ${reales.map((e) => e.texto).join(' | ')}` : ''}`);
  } finally {
    await ctx.close();
    await srv.cerrar();
    rmSync(perfil, { recursive: true, force: true });
  }
  process.exitCode = fallas.length ? 1 : 0;
}

correr().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
