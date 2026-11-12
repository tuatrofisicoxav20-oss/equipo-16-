/**
 * Ensayo general del modo presentación (?vista=pitch), como frente al jurado.
 *
 * A 1366×768 y a 1920×1080 (proyector), en la MISMA página y SIN recargar, el pitch
 * se da tres veces seguidas:
 *   Vuelta 1 · botones: los 6 pasos del guion con sus botones (con un doble clic sin
 *              querer en el paso 2), el modo libre con su botón y «Reiniciar demo».
 *   Vuelta 2 · atajos: 1–6, F (modo libre), ? (ayuda) y R con su confirmación, todo
 *              con el teclado.
 *   Vuelta 3 · atajos de la demo: A y L (reproducir, con doble toque de A), 3, 4,
 *              M (vuelve la red: la cola se vacía), 6 y R.
 * En cada paso revisa DENTRO de los iframes lo que debe ver el jurado (diagnósticos de
 * Ana = signos y de Luis = inversa, rutas distintas, pendientes > 0 sin red y 0 al
 * volver, Ana «En vivo» en el panel sin recargarlo, la ficha de Ana abierta) y mide
 * cuánto tarda. Después de cada «Reiniciar demo» exige el estado inicial: sin eventos,
 * sin pendientes, red normal, panel sin Ana ni Luis. Además: modo libre con un error
 * de signos y uno raro (NO_CLASIFICADO), axe (WCAG 2.2 AA) en la vista pitch, que nada
 * se salga de la pantalla, y CERO errores de JavaScript en las 4 páginas (pitch + 3 iframes).
 *
 * Uso: node tests/e2e/pitch.mjs            (las dos resoluciones; tarda unos 6 minutos)
 *      node tests/e2e/pitch.mjs --1366     (solo 1366×768)   · --1920 (solo 1920×1080)
 *      node tests/e2e/pitch.mjs --capturas=<carpeta>          (una captura por paso)
 * Resultados y bugs encontrados: docs/ENSAYO-PITCH.md
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { levantarServidor, abrirNavegador, auditarAxe } from './utilidades.mjs';
import { GUIDE } from '../../js/data/guiones.js';

const AXE = readFileSync(fileURLToPath(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url)), 'utf8');
const ETIQUETAS_AXE = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const RESOLUCIONES = [
  { nombre: '1366×768', width: 1366, height: 768 },
  { nombre: '1920×1080', width: 1920, height: 1080 },
].filter((r) => {
  const solo = process.argv.find((a) => /^--\d{4}$/.test(a));
  return !solo || solo === `--${r.width}`;
});
const CAPTURAS = (process.argv.find((a) => a.startsWith('--capturas=')) || '').slice('--capturas='.length) || null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

/** Límites de espera por paso (no son pausas: cada espera termina en cuanto se cumple). */
const LIMITE = { problema: 8000, diagnostico: 90000, rutas: 45000, avion: 90000, sincronizacion: 45000, panel: 30000, reinicio: 20000 };
/** Error del jurado (signos) y uno raro que ninguna regla explica (NO_CLASIFICADO). */
const JURADO = [
  { nombre: 'error de signos', ecuacion: '2x + 3 = 11', renglones: ['2x = 11 + 3', 'x = 7'], estado: 'error', espera: /signo al cambiar de lado/i },
  { nombre: 'error raro (NO_CLASIFICADO)', ecuacion: '3x + 5 = 20', renglones: ['x = 99'], estado: 'no_clasificado', espera: /no reconoce este error/i },
];

const limpio = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const pausa = (ms) => new Promise((listo) => setTimeout(listo, ms));
const seg = (ms) => (ms / 1000).toFixed(1);

/* ------------------------------------------------------------------ */
/* Observación                                                         */
/* ------------------------------------------------------------------ */

/**
 * Se inyecta antes de que cargue la app: en la página del pitch guarda el último
 * { tecu: 'estado' } de cada iframe (lo mismo que recibe pitch.js); en cada iframe deja
 * una marca para saber si alguien lo recargó.
 */
function espia() {
  if (window.top !== window) {
    window.__marcaEnsayo = Math.random();
    return;
  }
  const espia = { estados: {}, n: 0 };
  window.__ensayo = espia;
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object' || d.tecu !== 'estado') return;
    const marco = [...document.querySelectorAll('iframe')].find((f) => f.contentWindow === e.source);
    const src = marco ? marco.getAttribute('src') || '' : '';
    const clave = /vista=docente/.test(src) ? 'docente' : (src.match(/alumno=([a-z0-9-]+)/) || [])[1] || 'otro';
    espia.estados[clave] = d;
    espia.n += 1;
  });
}

const marco = (p, re) => p.frames().find((f) => re.test(f.url()));
const marcos = (p) => ({ ana: marco(p, /alumno=ana/), luis: marco(p, /alumno=luis/), docente: marco(p, /vista=docente/) });

async function texto(lugar, selector) {
  if (!lugar) return '';
  return limpio(await lugar.locator(selector).first().innerText({ timeout: 1500 }).catch(() => ''));
}

const estados = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__ensayo?.estados || {})));

/** Lo que guardó la demo (todo es del mismo origen: el pitch puede leer el localStorage). */
const almacen = (p) =>
  p.evaluate(() => {
    const leer = (k) => {
      try {
        return JSON.parse(localStorage.getItem(k));
      } catch {
        return null;
      }
    };
    const claves = Object.keys(localStorage).filter((k) => k.startsWith('tecu:') && k !== 'tecu:prefs');
    const de = (a) => {
      const ev = leer(`tecu:dispositivo:${a}:eventos`) || [];
      return {
        eventos: ev.length,
        pendientes: ev.filter((e) => !e.sincronizado).length,
        diagnostico: ev.filter((e) => e.tipo === 'diagnostico').map((e) => e.error?.tipo || e.resultado),
      };
    };
    const servidor = leer('tecu:servidor:eventos') || [];
    return {
      claves,
      ana: de('ana'),
      luis: de('luis'),
      servidor: servidor.length,
      servidorPorAlumno: servidor.reduce((m, e) => ({ ...m, [e.alumno]: (m[e.alumno] || 0) + 1 }), {}),
      red: claves.filter((k) => k.startsWith('tecu:red:')).map((k) => [k.slice(9), leer(k)]),
    };
  });

/** ¿Algún iframe se recargó? (perdió la marca que le dejó espia()) */
async function recargados(p) {
  const r = [];
  for (const [nombre, f] of Object.entries(marcos(p))) {
    const marca = f ? await f.evaluate(() => window.__marcaEnsayo).catch(() => undefined) : undefined;
    if (marca === undefined) r.push(nombre);
  }
  return r;
}

/** Repite `fn` hasta que devuelva { ok: true } o se acabe el tiempo; devuelve el último resultado. */
async function hasta(fn, ms) {
  const fin = Date.now() + ms;
  let r = { ok: false, detalle: 'sin revisar' };
  do {
    try {
      r = await fn();
    } catch (error) {
      r = { ok: false, detalle: error.message.split('\n')[0] };
    }
    if (r.ok) return r;
    await pausa(150);
  } while (Date.now() < fin);
  return r;
}

/* ------------------------------------------------------------------ */
/* Lo que debe verse en cada paso                                      */
/* ------------------------------------------------------------------ */

const chips = async (p) => ({ ana: await texto(p, '[data-zona="chips-ana"]'), luis: await texto(p, '[data-zona="chips-luis"]') });

const VERIFICAR = {
  async problema(p) {
    const visible = await p.locator('.diapositiva').first().isVisible().catch(() => false);
    const cifra = await texto(p, '.diapositiva__cifra');
    const aviso = await p.locator('.diapositiva .solo-presentador').count();
    return { ok: visible && /25\.4/.test(cifra), detalle: `diapositiva ${visible ? 'visible' : 'NO visible'}, cifra «${cifra}», aviso de fuente para quien presenta: ${aviso ? 'sí' : 'no'}` };
  },

  async diagnostico(p) {
    const m = marcos(p);
    const ta = await texto(m.ana, 'main');
    const tl = await texto(m.luis, 'main');
    const d = await almacen(p);
    const c = await chips(p);
    const okA = /tu resultado/i.test(ta) && /signo al cambiar de lado/i.test(ta) && /3 veces/.test(ta);
    const okL = /tu resultado/i.test(tl) && /operación inversa/i.test(tl) && /3 veces/.test(tl);
    const datosA = d.ana.diagnostico.filter((t) => t === 'SIGNO_TRANSPOSICION').length === 3 && d.ana.diagnostico.length === 4;
    const datosL = d.luis.diagnostico.filter((t) => t === 'INVERSA_EQUIVOCADA').length === 3 && d.luis.diagnostico.length === 4;
    const okChips = /signos/i.test(c.ana) && /inversa/i.test(c.luis);
    return {
      ok: okA && okL && datosA && datosL && okChips,
      detalle: `Ana: ${okA ? '«Signo al cambiar de lado · 3 veces»' : `«${ta.slice(0, 60)}»`} [${d.ana.diagnostico}] · Luis: ${okL ? '«Operación inversa · 3 veces»' : `«${tl.slice(0, 60)}»`} [${d.luis.diagnostico}] · chips: «${c.ana.slice(0, 30)}» / «${c.luis.slice(0, 30)}»`,
    };
  },

  async rutas(p) {
    const m = marcos(p);
    const ta = await texto(m.ana, '.est-ruta__cabeza');
    const tl = await texto(m.luis, '.est-ruta__cabeza');
    const modoA = await m.ana?.locator('.balanza[data-modo]').first().getAttribute('data-modo', { timeout: 1000 }).catch(() => null);
    const modoL = await m.luis?.locator('.balanza[data-modo]').first().getAttribute('data-modo', { timeout: 1000 }).catch(() => null);
    const okA = /signos/i.test(ta) && /lo que suma pasa restando/i.test(ta);
    const okL = /inversa/i.test(tl) && /lo que multiplica pasa dividiendo/i.test(tl);
    return {
      ok: okA && okL && modoA === 'quitar' && modoL === 'repartir',
      detalle: `Ana «${ta.slice(0, 45)}» balanza=${modoA} · Luis «${tl.slice(0, 50)}» balanza=${modoL}`,
    };
  },

  async avion(p) {
    const e = await estados(p);
    const m = marcos(p);
    const c = await chips(p);
    const barra = { ana: await texto(m.ana, '.barra-superior'), luis: await texto(m.luis, '.barra-superior') };
    const interruptor = await p.getByRole('switch', { name: /modo avión/i }).getAttribute('aria-checked').catch(() => null);
    const okTel = (a) =>
      e[a]?.enLinea === false && e[a]?.pendientes > 0 && /sin internet/i.test(barra[a]) && new RegExp(`\\b${e[a].pendientes}\\b`).test(barra[a]) && /sin internet/i.test(c[a]) && new RegExp(`${e[a].pendientes} pendiente`).test(c[a]);
    return {
      ok: okTel('ana') && okTel('luis') && interruptor === 'true',
      detalle: `pendientes Ana=${e.ana?.pendientes} Luis=${e.luis?.pendientes} · barra Ana «${barra.ana.slice(-40)}» · chips «${c.ana}» · interruptor ${interruptor}`,
      pendientes: [e.ana?.pendientes, e.luis?.pendientes],
    };
  },

  async sincronizacion(p, { antes } = {}) {
    const e = await estados(p);
    const m = marcos(p);
    const c = await chips(p);
    const barra = { ana: await texto(m.ana, '.barra-superior'), luis: await texto(m.luis, '.barra-superior') };
    const fila = await texto(m.docente?.locator('table tbody tr', { hasText: 'Ana' }), ':scope');
    const recibio = await texto(p, '[data-zona="docente"]');
    const vivos = e.docente?.alumnosEnVivo || [];
    const okTel = (a) => e[a]?.enLinea === true && e[a]?.pendientes === 0 && !e[a]?.sincronizando && /con internet/i.test(barra[a]) && /0 pendientes/.test(c[a]);
    const nueva = Boolean(e.docente?.ultimaSincronizacion) && e.docente.ultimaSincronizacion !== antes;
    return {
      ok: okTel('ana') && okTel('luis') && nueva && vivos.includes('ana') && vivos.includes('luis') && /en vivo/i.test(fila),
      detalle: `pendientes Ana=${e.ana?.pendientes} Luis=${e.luis?.pendientes} · panel: última sincronización ${nueva ? 'nueva' : 'SIN cambio'}, en vivo [${vivos}], fila de Ana «${fila.slice(0, 40)}» · «${recibio}»`,
    };
  },

  async panel(p) {
    const d = marcos(p).docente;
    const ficha = await texto(d?.locator('dialog[open]'), ':scope');
    const ok = /ficha de ana/i.test(ficha) && /signo al cambiar de lado/i.test(ficha);
    return { ok, detalle: ok ? `ficha de Ana abierta («${ficha.slice(0, 50)}…»)` : `sin ficha de Ana («${ficha.slice(0, 60)}»)` };
  },
};

/** Estado inicial: sin eventos, sin pendientes, red normal, todos en Inicio y el panel sin Ana ni Luis. */
async function verificarInicio(p) {
  const d = await almacen(p);
  const e = await estados(p);
  const m = marcos(p);
  const ta = await texto(m.ana, 'main');
  const tl = await texto(m.luis, 'main');
  const vivoFilas = await m.docente?.locator('table tbody tr', { hasText: /En vivo/ }).count().catch(() => -1);
  const fichaAbierta = await m.docente?.locator('dialog[open]').count().catch(() => -1);
  const pitch = {
    actual: await p.locator('[aria-current="step"]').count(),
    nota: await texto(p, '[data-zona="nota"]'),
    avion: await p.getByRole('switch', { name: /modo avión/i }).getAttribute('aria-checked').catch(() => null),
    dialogos: await p.locator('dialog[open]').count(),
    diapositiva: await p.locator('.diapositiva').count(),
  };
  const sinDatos = d.ana.eventos === 0 && d.luis.eventos === 0 && d.servidor === 0 && d.red.every(([, v]) => v !== true);
  const telefonos = ['ana', 'luis'].every((a) => e[a]?.pantalla === 'inicio' && e[a]?.pendientes === 0 && e[a]?.enLinea === true && !e[a]?.ruta);
  const panel = (e.docente?.alumnosEnVivo || []).length === 0 && vivoFilas === 0 && fichaAbierta === 0;
  const vista = pitch.actual === 0 && /listo para empezar/i.test(pitch.nota) && pitch.avion === 'false' && pitch.dialogos === 0 && pitch.diapositiva === 0;
  const ok = sinDatos && telefonos && panel && vista && /hola, ana/i.test(ta) && /hola, luis/i.test(tl);
  return {
    ok,
    detalle:
      `datos: ${sinDatos ? 'en cero' : JSON.stringify({ ana: d.ana.eventos, luis: d.luis.eventos, servidor: d.servidor, red: d.red })} · ` +
      `teléfonos: ${telefonos ? 'Inicio, 0 pendientes, con internet' : JSON.stringify({ ana: e.ana, luis: e.luis })} · ` +
      `panel: ${panel ? 'sin Ana ni Luis' : JSON.stringify({ vivos: e.docente?.alumnosEnVivo, vivoFilas, fichaAbierta })} · ` +
      `pitch: ${vista ? 'sin paso, red normal, sin diálogos' : JSON.stringify(pitch)}`,
  };
}

/* ------------------------------------------------------------------ */
/* Accesibilidad y diseño                                              */
/* ------------------------------------------------------------------ */

/** axe en la vista pitch y, con axe también dentro de cada iframe, en lo que se ve adentro. */
async function auditarTodo(p) {
  for (const f of p.frames()) {
    if (f !== p.mainFrame()) await f.addScriptTag({ content: AXE }).catch(() => {});
  }
  await p.addScriptTag({ content: AXE });
  const r = await p.evaluate(
    (etiquetas) => window.axe.run(document, { runOnly: { type: 'tag', values: etiquetas }, iframes: true }),
    ETIQUETAS_AXE,
  );
  return r.violations.map((v) => ({ id: v.id, impacto: v.impact, ayuda: v.help, nodos: v.nodes.slice(0, 3).map((n) => n.target.join(' → ')) }));
}

/** Nada se sale de la pantalla del proyector: sin scroll, iframes y controles completos. */
async function revisarDiseno(p) {
  return p.evaluate(() => {
    const vw = innerWidth;
    const vh = innerHeight;
    const caja = (el) => el.getBoundingClientRect();
    const dentro = (b) => b.left >= -1 && b.top >= -1 && b.right <= vw + 1 && b.bottom <= vh + 1;
    const raiz = document.querySelector('.pitch');
    const fuera = [];
    for (const f of document.querySelectorAll('iframe')) if (!dentro(caja(f.parentElement))) fuera.push(`iframe ${f.dataset.marco}`);
    const controles = [...document.querySelectorAll('.pitch button')].filter((b) => b.offsetParent !== null);
    for (const b of controles) if (!dentro(caja(b))) fuera.push(`botón «${b.textContent.trim().slice(0, 20)}»`);
    const chicos = controles.filter((b) => caja(b).height < 44 || caja(b).width < 44).map((b) => `«${(b.getAttribute('aria-label') || b.textContent).trim().slice(0, 18)}» ${Math.round(caja(b).width)}×${Math.round(caja(b).height)}`);
    const nota = document.querySelector('[data-zona="nota"]');
    return {
      scrollH: document.documentElement.scrollWidth > vw,
      scrollV: document.documentElement.scrollHeight > vh,
      fuera,
      chicos,
      notaCortada: nota ? nota.scrollHeight > nota.clientHeight + 1 || nota.scrollWidth > nota.clientWidth + 1 : null,
      escalaCelular: Number(getComputedStyle(raiz).getPropertyValue('--pitch-escala')) || null,
      celular: (() => {
        const b = caja(document.querySelector('iframe[data-marco="ana"]'));
        return `${Math.round(b.width)}×${Math.round(b.height)}`;
      })(),
      panel: document.querySelector('iframe[data-marco="docente"]')?.style.transform || '',
    };
  });
}

/* ------------------------------------------------------------------ */
/* Ensayo en una resolución                                            */
/* ------------------------------------------------------------------ */

async function ensayar(navegador, url, res) {
  const filas = []; // { vuelta, paso, via, ms, listoMs, ok, detalle }
  const fallas = [];
  const notas = [];
  const errores = [];
  const avisosConsola = [];
  const verificar = (cond, msg) => {
    console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
    if (!cond) fallas.push(`${res.nombre}: ${msg}`);
    return cond;
  };

  const ctx = await navegador.newContext({ viewport: { width: res.width, height: res.height }, reducedMotion: 'no-preference' });
  await ctx.addInitScript(espia);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  p.on('console', (m) => {
    const donde = m.location()?.url ? ` (${m.location().url.replace(url, '')})` : '';
    if (m.type() === 'error') errores.push(`console.error${donde}: ${m.text()}`);
    else if (m.type() === 'warning') avisosConsola.push(`console.warn${donde}: ${m.text()}`);
  });
  p.on('response', (r) => {
    if (r.status() >= 400) errores.push(`HTTP ${r.status()}: ${r.url().replace(url, '')}`);
  });
  const captura = async (nombre) => {
    if (CAPTURAS) await p.screenshot({ path: join(CAPTURAS, `${res.width}-${nombre}.png`) }).catch(() => {});
  };
  const avisoDirector = () => texto(p, '[data-zona="aviso"]');
  const enfocarPitch = () =>
    p.evaluate(() => {
      const a = document.activeElement;
      if (a && a.localName === 'iframe') a.blur();
    });
  const focoEnIframe = () => p.evaluate(() => document.activeElement?.localName === 'iframe' ? document.activeElement.dataset.marco || 'iframe' : null);

  /** Corre un paso, espera a que el director termine y a que se vea lo que debe; anota el tiempo. */
  async function paso(vuelta, id, via, accion, extra = {}) {
    const i = GUIDE.findIndex((g) => g.id === id);
    const boton = p.locator(`button[data-act="paso"][data-paso="${id}"]`);
    const t0 = Date.now();
    await accion();
    if (extra.alInicio) await extra.alInicio();
    const listo = await hasta(async () => ({ ok: (await boton.getAttribute('aria-busy').catch(() => null)) !== 'true' }), LIMITE[id]);
    const listoMs = Date.now() - t0;
    const r = await hasta(() => VERIFICAR[id](p, extra), Math.max(3000, LIMITE[id] - listoMs));
    const ms = Date.now() - t0;
    const nota = await texto(p, '[data-zona="nota"]');
    const okNota = nota.includes(GUIDE[i].nota) && (await boton.getAttribute('aria-current')) === 'step';
    const aviso = await avisoDirector();
    const ok = r.ok && listo.ok && okNota;
    filas.push({ vuelta, paso: `${i + 1}. ${GUIDE[i].titulo}`, via, ms, listoMs, ok, detalle: r.detalle, aviso });
    verificar(ok, `[${seg(ms)} s] Paso ${i + 1} «${GUIDE[i].titulo}» (${via}): ${r.detalle}${okNota ? '' : ' · ✗ falta la nota del paso o aria-current'}${listo.ok ? '' : ' · ✗ el director no terminó'}${aviso ? ` · aviso al presentador: «${aviso}»` : ''}`);
    const foco = await focoEnIframe();
    if (foco) notas.push(`${res.nombre}, vuelta ${vuelta}, paso ${i + 1} (${via}): el foco del teclado quedó DENTRO del iframe «${foco}»`);
    await captura(`v${vuelta}-${id}`);
    return { ...r, ok, ms };
  }

  /** «Reiniciar demo» (botón o R) con su confirmación; espera el estado inicial. */
  async function reiniciar(vuelta, via) {
    const t0 = Date.now();
    if (via === 'botón') {
      await p.getByRole('button', { name: /reiniciar demo/i }).click();
    } else {
      await enfocarPitch();
      await p.keyboard.press('r');
    }
    const confirmacion = p.locator('dialog[open]', { hasText: /reiniciar la demo/i });
    const aparecio = await confirmacion.waitFor({ timeout: 3000 }).then(() => true, () => false);
    if (!aparecio) {
      verificar(false, `R no abrió la confirmación de «Reiniciar demo» (foco en ${(await focoEnIframe()) || 'la página'}); se usa el botón`);
      await enfocarPitch();
      await p.getByRole('button', { name: /reiniciar demo/i }).click();
      await confirmacion.waitFor({ timeout: 3000 });
    }
    if (via === 'botón') await confirmacion.getByRole('button', { name: /sí, reiniciar/i }).click();
    else {
      // El foco empieza en «Cancelar» (lo seguro); con el teclado: Tab a «Sí, reiniciar» y Enter.
      await p.keyboard.press('Tab');
      await p.keyboard.press('Enter');
    }
    const r = await hasta(() => verificarInicio(p), LIMITE.reinicio);
    const ms = Date.now() - t0;
    const rec = await recargados(p);
    filas.push({ vuelta, paso: 'Reiniciar demo', via, ms, listoMs: ms, ok: r.ok, detalle: r.detalle, aviso: '' });
    verificar(r.ok, `[${seg(ms)} s] Reiniciar demo (${via}): ${r.detalle}`);
    if (rec.length) notas.push(`${res.nombre}, vuelta ${vuelta}: «Reiniciar demo» tuvo que RECARGAR ${rec.join(', ')} (no confirmaron el reinicio a tiempo)`);
    await p.evaluate(() => {
      for (const f of document.querySelectorAll('iframe')) {
        try {
          f.contentWindow.__marcaEnsayo = Math.random();
        } catch {
          /* sin acceso */
        }
      }
    });
    await captura(`v${vuelta}-reinicio`);
    return r.ok;
  }

  /** Modo libre: el jurado escribe su ecuación y su procedimiento con el teclado. */
  async function modoLibre(vuelta, via, casos) {
    const t0 = Date.now();
    if (via === 'botón') await p.getByRole('button', { name: /^modo libre/i }).click();
    else {
      await enfocarPitch();
      await p.keyboard.press('f');
    }
    const d = p.locator('dialog.libre[open]');
    const abrio = await d.waitFor({ timeout: 5000 }).then(() => true, () => false);
    if (!verificar(abrio, `Modo libre (${via}) se abre`)) return;
    const pasoAntes = await p.locator('[aria-current="step"]').getAttribute('data-paso').catch(() => null);
    for (const caso of casos) {
      const t1 = Date.now();
      if (await d.getByRole('button', { name: /probar otra ecuación/i }).isVisible().catch(() => false)) {
        await d.getByRole('button', { name: /probar otra ecuación/i }).click();
      }
      const campo = d.getByLabel('Tu ecuación');
      await campo.fill('');
      await campo.pressSequentially(caso.ecuacion, { delay: 20 });
      await p.keyboard.press('Enter');
      for (const r of caso.renglones) {
        await d.getByLabel(/^renglón \d+$/i).pressSequentially(r, { delay: 20 });
        await p.keyboard.press('Enter');
      }
      await p.keyboard.press('Control+Enter');
      const resultado = d.locator(`[data-region="resultado"][data-estado="${caso.estado}"]`);
      const vio = await resultado.waitFor({ timeout: 5000 }).then(() => true, () => false);
      const t = vio ? limpio(await resultado.innerText()) : limpio(await d.locator('[data-region="resultado"]').innerText().catch(() => ''));
      const ok = vio && caso.espera.test(t) && /renglón 2/i.test(t);
      filas.push({ vuelta, paso: `Modo libre: ${caso.nombre}`, via, ms: Date.now() - t1, listoMs: Date.now() - t1, ok, detalle: t.slice(0, 90), aviso: '' });
      verificar(ok, `[${seg(Date.now() - t1)} s] Modo libre (${via}), ${caso.nombre}: «${t.slice(0, 110)}»`);
      await captura(`v${vuelta}-libre-${caso.estado}`);
    }
    // Los dígitos y letras que escribió el juez no dispararon atajos del presentador.
    const pasoDespues = await p.locator('[aria-current="step"]').getAttribute('data-paso').catch(() => null);
    const confirmaciones = await p.locator('dialog[open]', { hasText: /reiniciar la demo/i }).count();
    verificar(pasoAntes === pasoDespues && confirmaciones === 0, 'escribir en el modo libre no dispara atajos del presentador (1–6, R…)');
    const violaciones = await auditarAxe(p);
    verificar(!violaciones.length, `axe con el modo libre abierto: ${violaciones.length} violaciones${violaciones.length ? ` ${JSON.stringify(violaciones)}` : ''}`);
    await p.keyboard.press('Escape');
    const cerro = await d.waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false);
    verificar(cerro, `Escape cierra el modo libre (${seg(Date.now() - t0)} s en total)`);
  }

  console.log(`\n=== ${res.nombre} ===`);
  const t0 = Date.now();
  await p.goto(`${url}/?vista=pitch&reiniciar=1`);
  const cargo = await hasta(async () => {
    const e = await estados(p);
    return { ok: Boolean(e.ana && e.luis && e.docente), detalle: `estados recibidos: ${Object.keys(e)}` };
  }, 20000);
  verificar(cargo.ok, `la vista pitch y sus 3 iframes cargan y reportan su estado (${seg(Date.now() - t0)} s)`);
  if (!cargo.ok) {
    await ctx.close();
    return { res, filas, fallas, notas, errores, avisosConsola };
  }
  await pausa(800);
  const diseno = await revisarDiseno(p);
  verificar(!diseno.scrollH && !diseno.scrollV, `sin scroll en el proyector (horizontal: ${diseno.scrollH ? 'sí' : 'no'}, vertical: ${diseno.scrollV ? 'sí' : 'no'})`);
  verificar(!diseno.fuera.length, `teléfonos, panel y botones completos en pantalla${diseno.fuera.length ? `: fuera → ${diseno.fuera.join(', ')}` : ''}`);
  verificar(diseno.notaCortada === false, `la nota para quien presenta se lee completa`);
  console.log(`  · teléfonos a escala ${diseno.escalaCelular} (${diseno.celular} px), panel ${diseno.panel}; controles de menos de 44 px: ${diseno.chicos.length ? diseno.chicos.join(', ') : 'ninguno'}`);
  if (diseno.chicos.length) notas.push(`${res.nombre}: controles de menos de 44×44 px: ${diseno.chicos.join(', ')}`);
  const inicial = await verificarInicio(p);
  verificar(inicial.ok, `estado inicial: ${inicial.detalle}`);
  const axeInicio = await auditarTodo(p);
  verificar(!axeInicio.length, `axe (pitch + adentro de los 3 iframes) al inicio: ${axeInicio.length} violaciones${axeInicio.length ? ` ${JSON.stringify(axeInicio)}` : ''}`);
  await captura('inicio');

  /* ---------------- Vuelta 1: botones ---------------- */
  console.log('-- Vuelta 1: botones');
  const clic = (id) => () => p.locator(`button[data-act="paso"][data-paso="${id}"]`).click();
  await paso(1, 'problema', 'botón', clic('problema'));
  const axeDiapositiva = await auditarAxe(p);
  verificar(!axeDiapositiva.length, `axe con la diapositiva «El problema»: ${axeDiapositiva.length} violaciones${axeDiapositiva.length ? ` ${JSON.stringify(axeDiapositiva)}` : ''}`);
  // Doble clic sin querer en «Ana y Luis»: no debe reproducir dos veces.
  await paso(1, 'diagnostico', 'botón + doble clic', async () => {
    await p.locator('button[data-act="paso"][data-paso="diagnostico"]').click();
    await pausa(400);
    await p.locator('button[data-act="paso"][data-paso="diagnostico"]').click();
  });
  await paso(1, 'rutas', 'botón', clic('rutas'));
  const axeRutas = await auditarTodo(p);
  verificar(!axeRutas.length, `axe (pitch + iframes) con las rutas y la balanza: ${axeRutas.length} violaciones${axeRutas.length ? ` ${JSON.stringify(axeRutas)}` : ''}`);
  const av1 = await paso(1, 'avion', 'botón', clic('avion'));
  const antes1 = (await estados(p)).docente?.ultimaSincronizacion;
  await paso(1, 'sincronizacion', 'botón', clic('sincronizacion'), { antes: antes1 });
  let vioLlamar = false;
  await paso(1, 'panel', 'botón', clic('panel'), {
    alInicio: async () => {
      const r = await hasta(async () => {
        const visible = await marcos(p).docente.evaluate(() => {
          const s = document.querySelector('[data-seccion="llamar"]');
          if (!s) return false;
          const b = s.getBoundingClientRect();
          return b.top < innerHeight * 0.6 && b.bottom > 0;
        });
        return { ok: visible };
      }, 4000);
      vioLlamar = r.ok;
    },
  });
  verificar(vioLlamar, 'paso 6: el panel muestra «A quién llamar esta semana» antes de abrir la ficha');
  const rec1 = await recargados(p);
  verificar(!rec1.length, `nadie recargó los iframes durante el pitch (el panel se actualizó solo)${rec1.length ? `: se recargaron ${rec1}` : ''}`);
  const d1 = await almacen(p);
  verificar(d1.ana.diagnostico.length === 4 && d1.servidorPorAlumno.ana === d1.ana.eventos, `el doble clic no duplicó nada: Ana ${d1.ana.diagnostico.length} diagnósticos, ${d1.ana.eventos} eventos en el cel y ${d1.servidorPorAlumno.ana} en el servidor`);
  notas.push(`${res.nombre}: en modo avión la cola llegó a ${av1.pendientes ? av1.pendientes.join(' y ') : '?'} pendientes (Ana y Luis)`);
  await modoLibre(1, 'botón', [JURADO[0]]);
  await reiniciar(1, 'botón');

  /* ---------------- Vuelta 2: atajos 1–6 ---------------- */
  console.log('-- Vuelta 2: atajos 1–6, F, ?, R');
  const tecla = (k) => async () => {
    await enfocarPitch();
    await p.keyboard.press(k);
  };
  await paso(2, 'problema', 'tecla 1', tecla('1'));
  await paso(2, 'diagnostico', 'tecla 2', tecla('2'));
  await paso(2, 'rutas', 'tecla 3', tecla('3'));
  await paso(2, 'avion', 'tecla 4', tecla('4'));
  const antes2 = (await estados(p)).docente?.ultimaSincronizacion;
  await paso(2, 'sincronizacion', 'tecla 5', tecla('5'), { antes: antes2 });
  // Sin tocar nada más: ¿el foco sigue en la página para la siguiente tecla?
  const t6 = Date.now();
  await p.keyboard.press('6');
  const respondio6 = await hasta(async () => ({ ok: (await p.locator('button[data-paso="panel"][aria-current="step"]').count()) > 0 }), 2000);
  if (!respondio6.ok) notas.push(`${res.nombre}: la tecla 6 justo después del paso 5 no respondió (foco en ${(await focoEnIframe()) || 'la página'})`);
  await paso(2, 'panel', 'tecla 6', async () => {
    if (!respondio6.ok) await tecla('6')();
  });
  filas[filas.length - 1].ms = Date.now() - t6; // el tiempo cuenta desde la primera vez que se tocó 6
  // La ficha es un <dialog> modal DENTRO del iframe del panel: ¿R sigue funcionando sin hacer clic?
  const focoTrasFicha = await focoEnIframe();
  verificar(!focoTrasFicha, `con la ficha abierta, el foco del teclado sigue en la página del pitch (está en ${focoTrasFicha || 'la página'})`);
  await modoLibre(2, 'tecla F', [JURADO[1]]);
  await enfocarPitch();
  await p.keyboard.press('?');
  const ayuda = p.locator('dialog[open]', { hasText: /atajos de teclado/i });
  const abrioAyuda = await ayuda.waitFor({ timeout: 3000 }).then(() => true, () => false);
  const textoAyuda = abrioAyuda ? limpio(await ayuda.innerText()) : '';
  verificar(abrioAyuda && /reproducir a ana/i.test(textoAyuda) && /modo libre/i.test(textoAyuda), 'la tecla ? abre la ayuda con la lista de atajos');
  if (abrioAyuda) {
    const v = await auditarAxe(p);
    verificar(!v.length, `axe con la ayuda de atajos abierta: ${v.length} violaciones${v.length ? ` ${JSON.stringify(v)}` : ''}`);
    await p.keyboard.press('?');
    verificar(await ayuda.waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false), 'la tecla ? vuelve a cerrar la ayuda');
  }
  await reiniciar(2, 'tecla R');

  /* ---------------- Vuelta 3: A, L, 3, 4, M, 6, R ---------------- */
  console.log('-- Vuelta 3: A y L, 3, 4, M, 6, R');
  const t3 = Date.now();
  await enfocarPitch();
  await p.keyboard.press('a');
  await pausa(300);
  await p.keyboard.press('a'); // doble toque sin querer
  await p.keyboard.press('l');
  const repro = await hasta(() => VERIFICAR.diagnostico(p), LIMITE.diagnostico);
  const msRepro = Date.now() - t3;
  filas.push({ vuelta: 3, paso: 'Reproducir a Ana y a Luis', via: 'teclas A (×2) y L', ms: msRepro, listoMs: msRepro, ok: repro.ok, detalle: repro.detalle, aviso: await avisoDirector() });
  verificar(repro.ok, `[${seg(msRepro)} s] A y L reproducen los dos diagnósticos: ${repro.detalle}`);
  await pausa(1500); // que suba lo que falte antes de seguir
  const d3 = await almacen(p);
  verificar(d3.ana.diagnostico.length === 4, `el doble toque de A no repitió el diagnóstico de Ana (${d3.ana.diagnostico.length} ejercicios registrados)`);
  await paso(3, 'rutas', 'tecla 3', tecla('3'));
  await paso(3, 'avion', 'tecla 4', tecla('4'));
  const antes3 = (await estados(p)).docente?.ultimaSincronizacion;
  const tm = Date.now();
  await tecla('m')();
  const sincM = await hasta(() => VERIFICAR.sincronizacion(p, { antes: antes3 }), LIMITE.sincronizacion);
  const msM = Date.now() - tm;
  const interruptor = await p.getByRole('switch', { name: /modo avión/i }).getAttribute('aria-checked');
  filas.push({ vuelta: 3, paso: 'M: vuelve la red (sincronización)', via: 'tecla M', ms: msM, listoMs: msM, ok: sincM.ok && interruptor === 'false', detalle: sincM.detalle, aviso: await avisoDirector() });
  verificar(sincM.ok && interruptor === 'false', `[${seg(msM)} s] M devuelve la red, la cola se vacía y el panel se actualiza: ${sincM.detalle}`);
  await paso(3, 'panel', 'tecla 6', tecla('6'));
  await reiniciar(3, 'tecla R');

  const rec = await recargados(p);
  verificar(!rec.length, `tres pitches seguidos sin recargar ningún iframe${rec.length ? ` (recargados: ${rec})` : ''}`);
  await ctx.close();
  return { res, filas, fallas, notas, errores, avisosConsola };
}

/* ------------------------------------------------------------------ */
/* Programa                                                            */
/* ------------------------------------------------------------------ */

async function correr() {
  const servidor = await levantarServidor();
  const navegador = await abrirNavegador();
  const resultados = [];
  try {
    for (const res of RESOLUCIONES) resultados.push(await ensayar(navegador, servidor.url, res));
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }

  let fallas = 0;
  console.log('\n=== Tiempos (desde el clic o la tecla hasta que se ve lo que debe verse) ===');
  for (const { res, filas, fallas: f, notas, errores, avisosConsola } of resultados) {
    console.log(`\n${res.nombre}`);
    for (const vuelta of [1, 2, 3]) {
      const de = filas.filter((x) => x.vuelta === vuelta);
      if (!de.length) continue;
      const total = de.filter((x) => !x.paso.startsWith('Modo libre')).reduce((s, x) => s + x.ms, 0);
      console.log(`  Vuelta ${vuelta} (total sin modo libre: ${seg(total)} s)`);
      for (const x of de) console.log(`    ${x.ok ? '✓' : '✗'} ${seg(x.ms).padStart(5)} s  ${x.paso} · ${x.via}${x.aviso ? ` · aviso: «${x.aviso}»` : ''}`);
    }
    if (notas.length) console.log(`  Notas:\n${notas.map((n) => `    - ${n}`).join('\n')}`);
    if (avisosConsola.length) console.log(`  Avisos en consola (no cuentan como error):\n${[...new Set(avisosConsola)].map((n) => `    - ${n}`).join('\n')}`);
    const unicos = [...new Set(errores)];
    console.log(`  Errores de JavaScript/red en las 4 páginas: ${unicos.length}${unicos.length ? `\n${unicos.map((e) => `    - ${e}`).join('\n')}` : ''}`);
    fallas += f.length + unicos.length;
  }
  console.log(fallas ? `\n${fallas} problema(s) en el ensayo del pitch.` : '\nEl pitch pasó el ensayo general.');
  process.exitCode = fallas ? 1 : 0;
}

correr().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
