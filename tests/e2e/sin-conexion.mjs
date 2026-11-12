/**
 * QA adversarial del modo sin conexión (fase 3): la cola, las dudas a Tecu y el
 * panel docente cuando no hay internet, con las vistas reales en Chromium.
 *
 * Escenarios (cada uno en un contexto nuevo: almacenamiento y service worker limpios):
 *   1. Dudas a Tecu sin conexión (red real apagada y simulador de la app): se guardan
 *      pendientes, se contestan solas al volver la red y el panel las ve con su respuesta.
 *      Incluye cerrar la app sin red y volver a abrirla con red.
 *   2. Recarga en modo avión a la mitad de una práctica: el cuaderno y el avance siguen ahí.
 *   3. La cola sobrevive recargas sin red y se vacía UNA sola vez (ids sin duplicar), también
 *      con dos pestañas del mismo alumno.
 *   4. Panel docente en modo avión después de una primera visita: carga desde la caché.
 *   5. Simulador "Sin internet" (sin apagar la red real) = modo avión real para la cola y
 *      las dudas; el chip lo dice claramente.
 *   6. Ana y Luis en dos pestañas: cada quien con su cola; el panel ve a los dos sin mezclar.
 *   7. Sin BroadcastChannel: el panel igual se actualiza (evento 'storage').
 *   8. Almacenamiento lleno o bloqueado: la app no se rompe y lo dice de forma amable.
 *
 * Estudiante a 360×740 y panel a 1280×800.
 * Uso: node tests/e2e/sin-conexion.mjs          (todos)
 *      node tests/e2e/sin-conexion.mjs 1 6      (solo esos escenarios)
 * Sale con código 1 si falla cualquier verificación.
 */
import { levantarServidor, abrirNavegador, esperarTitulo } from './utilidades.mjs';

const CEL = { width: 360, height: 740 };
const ESCRITORIO = { width: 1280, height: 800 };
const LIMITE_ESCENARIO = 180000;

/** Lo que escriben Ana y Luis en el diagnóstico (los guiones del modo presentación). */
const GUIONES = {
  ana: [['3x = 25', 'x = 25/3'], ['x/4 = 3', 'x = 12'], ['5x + 2x = 14 − 2', '7x = 12', 'x = 12/7'], ['−2x = 14', 'x = −7']],
  luis: [['3x = 15', 'x = 12'], ['x/4 = 3', 'x = 3/4'], ['3x = 12', 'x = 9'], ['−2x = 8', 'x = −4']],
};
/** El motor encuentra este error 3 veces en cada guion (y ningún otro). */
const ERROR_DE = { ana: 'SIGNO_TRANSPOSICION', luis: 'INVERSA_EQUIVOCADA' };
const DUDAS = {
  ana: ['¿Por qué el 5 pasa restando?', '¿Qué es la x?'],
  luis: ['¿Cuándo tengo que dividir?', '¿Cómo sé si mi respuesta está bien?'],
};
/** Un mensaje amable de que el cel no pudo guardar (lleno o bloqueado). */
const RE_NO_GUARDA = /no (se )?pud[eo]( [a-záéíóúñ]+){0,3} guardar|no (se )?(puede|pudo) guardar|no hay espacio|sin espacio|espacio (en|de) tu cel|almacenamiento|memoria (de|del) (tu )?cel|no se (va a )?guarda/i;

/* ------------------------------------------------------------------ */
/* Resultados                                                          */
/* ------------------------------------------------------------------ */

const resultados = [];

function crearEscenario(numero, titulo) {
  const r = { numero, titulo, total: 0, fallas: [] };
  resultados.push(r);
  console.log(`\n=== ${numero}. ${titulo} ===`);
  return {
    verificar(cond, msg, detalle) {
      r.total += 1;
      console.log(`${cond ? '✓' : '✗'} ${msg}${!cond && detalle ? `\n    → ${detalle}` : ''}`);
      if (!cond) r.fallas.push(msg);
      return Boolean(cond);
    },
    nota(msg) {
      console.log(`  · ${msg}`);
    },
    abortar(error) {
      r.total += 1;
      const msg = `el escenario no se pudo completar: ${String(error?.message || error).split('\n')[0]}`;
      r.fallas.push(msg);
      console.log(`✗ ${msg}`);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const limpio = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
const duplicados = (ids) => [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
const faltantes = (esperados, ids) => esperados.filter((id) => !ids.includes(id));

async function esperarHasta(fn, { ms = 20000, paso = 150 } = {}) {
  const fin = Date.now() + ms;
  let valor;
  while (Date.now() < fin) {
    valor = await fn();
    if (valor) return valor;
    await pausa(paso);
  }
  return valor;
}

function conLimite(promesa, ms, nombre) {
  let t;
  return Promise.race([
    promesa,
    new Promise((_, rechazar) => {
      t = setTimeout(() => rechazar(new Error(`${nombre}: pasó de ${ms / 1000} s`)), ms);
    }),
  ]).finally(() => clearTimeout(t));
}

/**
 * Espía de cada página (init script): avisos visibles (#avisos), anuncios del lector
 * de pantalla (#anuncios, #alertas) y mensajes de sincronización ('tecu-sync' o buzón).
 */
function espia() {
  window.__qa = { avisos: [], anuncios: [], sync: [] };
  try {
    if (typeof BroadcastChannel === 'function') {
      new BroadcastChannel('tecu-sync').addEventListener('message', (e) => window.__qa.sync.push(e.data));
    }
  } catch {
    /* sin canal */
  }
  window.addEventListener('storage', (e) => {
    if (e.key !== 'tecu:servidor:aviso' || !e.newValue) return;
    try {
      window.__qa.sync.push(JSON.parse(e.newValue));
    } catch {
      /* mensaje dañado */
    }
  });
  const observar = () => {
    const avisos = document.getElementById('avisos');
    if (avisos) {
      new MutationObserver((ms) =>
        ms.forEach((m) =>
          m.addedNodes.forEach((n) => {
            const t = (n.textContent || '').trim();
            if (t) window.__qa.avisos.push(t);
          }),
        ),
      ).observe(avisos, { childList: true });
    }
    for (const id of ['anuncios', 'alertas']) {
      const el = document.getElementById(id);
      if (!el) continue;
      new MutationObserver(() => {
        const t = (el.textContent || '').trim();
        if (t) window.__qa.anuncios.push(t);
      }).observe(el, { childList: true, characterData: true, subtree: true });
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observar, { once: true });
  else observar();
}

const qa = (p, clave) => p.evaluate((k) => window.__qa?.[k] || [], clave);
const limpiarQa = (p) =>
  p.evaluate(() => {
    if (window.__qa) Object.assign(window.__qa, { avisos: [], anuncios: [], sync: [] });
  });

/** Contexto nuevo con el espía. `antes`: init scripts que corren antes de la app (y del espía). */
async function nuevoContexto(navegador, { antes = [] } = {}) {
  const ctx = await navegador.newContext({ reducedMotion: 'reduce' });
  for (const script of antes) await ctx.addInitScript(script);
  await ctx.addInitScript(espia);
  return { ctx, errores: [] };
}

const esperarVista = (p) => p.locator('#contenido h1').first().waitFor({ timeout: 20000 });

async function abrirCel(ctx, url, alumno, errores, { reiniciar = false } = {}) {
  const p = await ctx.newPage();
  await p.setViewportSize(CEL);
  p.on('pageerror', (e) => errores.push(`${alumno}: ${e.message}`));
  await p.goto(`${url}/?alumno=${alumno}${reiniciar ? '&reiniciar=1' : ''}`);
  await esperarVista(p);
  return p;
}

async function abrirPanel(ctx, url, errores, { reiniciar = false } = {}) {
  const p = await ctx.newPage();
  await p.setViewportSize(ESCRITORIO);
  p.on('pageerror', (e) => errores.push(`panel: ${e.message}`));
  await p.goto(`${url}/?vista=docente${reiniciar ? '&reiniciar=1' : ''}`);
  await p.locator('table tbody tr').first().waitFor({ timeout: 20000 });
  return p;
}

/** Espera a que el service worker tenga la app guardada (primera visita con red). */
async function esperarCache(p) {
  await p.evaluate(() => navigator.serviceWorker.ready);
  return esperarHasta(
    async () => {
      const e = await p.evaluate(async () => (await import('/js/services/sw-registro.js')).estadoSinConexion()).catch(() => null);
      return e && e.archivos >= 30 ? e : null;
    },
    { ms: 20000, paso: 300 },
  );
}

/** Lo que guarda el cel de un alumno y lo que ya llegó al "servidor". */
const leerCel = (p, alumno) =>
  p.evaluate(async (a) => {
    const m = await import('/js/data/store.js');
    const s = m.crearStore(a);
    return { eventos: s.eventos(), pendientes: s.pendientes().map((e) => e.id), dudas: s.dudas(), progreso: s.progreso(), servidor: m.eventosServidor() };
  }, alumno);

const controlar = (p, datos) => p.evaluate((d) => window.postMessage({ tecu: 'control', ...d }, location.origin), datos);
const texto = async (p, selector) => limpio(await p.locator(selector).first().innerText().catch(() => ''));
const irA = (p, nombre) => p.locator('.nav-inferior').getByRole('button', { name: nombre }).click();
const chipRed = (p) => p.locator('.barra-superior').getByRole('button', { name: /sin internet|con internet/i }).first();

async function hacerDiagnostico(p, alumno) {
  await controlar(p, { cmd: 'reproducirDiagnostico', items: GUIONES[alumno], rapido: true });
  await esperarTitulo(p, /resultado/i, 60000);
}

async function escribirDudas(p, textos) {
  await irA(p, /tecu/i);
  await esperarTitulo(p, /tecu/i);
  const entrada = p.getByRole('textbox', { name: /escribe tu duda/i });
  for (const t of textos) {
    await entrada.fill(t);
    await entrada.press('Enter');
    await p.waitForTimeout(120);
  }
}

/** Sin red: 'real' = modo avión del navegador; 'simulador' = interruptor de la app. */
async function quitarRed(modo, ctx, paginas) {
  if (modo === 'real') await ctx.setOffline(true);
  else for (const p of paginas) await p.locator('.barra-superior').getByRole('button', { name: /con internet/i }).click();
}

async function volverRed(modo, ctx, paginas) {
  if (modo === 'real') await ctx.setOffline(false);
  else for (const p of paginas) await p.locator('.barra-superior').getByRole('button', { name: /sin internet/i }).click();
}

/** Conteo de errores por tipo que muestra la fila del alumno en el mapa del panel. */
const filaPanel = (panel, alumno) =>
  panel.evaluate(async (a) => {
    const fila = document.querySelector(`table tbody tr[data-alumno="${a}"]`);
    if (!fila) return null;
    const pack = await (await fetch('/packs/ecuaciones-1.json')).json();
    const tipos = Object.keys(pack.errores);
    const celdas = [...fila.querySelectorAll('td.docente-celda:not(.docente-celda--total)')].map((td) => Number(td.textContent.trim()) || 0);
    const conteo = {};
    tipos.forEach((t, i) => {
      if (celdas[i]) conteo[t] = celdas[i];
    });
    return { conteo, texto: fila.innerText.replace(/\s+/g, ' ').trim() };
  }, alumno);

/** Abre la ficha del alumno, lee su texto y la cierra. */
async function leerFicha(panel, alumno) {
  await panel.locator(`table tbody tr[data-alumno="${alumno}"]`).getByRole('button').first().click();
  const dialogo = panel.locator('dialog[open]');
  await dialogo.waitFor({ timeout: 10000 });
  const t = limpio(await dialogo.innerText());
  await panel.keyboard.press('Escape');
  await dialogo.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  return t;
}

const contar = (t, re) => (t.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)) || []).length;
const resumenConteo = (c) => JSON.stringify(c || {});

/** ¿La ficha muestra estas dudas, todas contestadas por Tecu y ninguna de otro alumno? */
function verificarDudasEnFicha(esc, ficha, nombre, propias, ajenas = []) {
  const vistas = propias.filter((d) => ficha.includes(`«${d}»`));
  esc.verificar(vistas.length === propias.length, `la ficha de ${nombre} muestra sus ${propias.length} dudas (${vistas.length})`);
  esc.verificar(
    contar(ficha, /Tecu respondió/) === propias.length && !/Pendiente de respuesta/i.test(ficha),
    `en la ficha de ${nombre} cada duda trae la respuesta de Tecu`,
    `respuestas: ${contar(ficha, /Tecu respondió/)}, pendientes: ${contar(ficha, /Pendiente de respuesta/i)}`,
  );
  if (ajenas.length) {
    const mezcladas = ajenas.filter((d) => ficha.includes(`«${d}»`));
    esc.verificar(!mezcladas.length, `la ficha de ${nombre} no trae dudas de otro alumno`, mezcladas.join(' | '));
  }
}

/* ------------------------------------------------------------------ */
/* 1 y 5. Dudas y cola sin red (real o simulada)                       */
/* ------------------------------------------------------------------ */

/**
 * Diagnóstico de Ana + 2 dudas sin red; luego vuelve la red con el chat abierto.
 * Devuelve la "firma" de lo que pasó para comparar el modo avión real con el simulador.
 */
async function flujoSinRed(navegador, url, modo, esc) {
  const { ctx, errores } = await nuevoContexto(navegador);
  const firma = { modo };
  try {
    const cel = await abrirCel(ctx, url, 'ana', errores, { reiniciar: true });
    await esperarCache(cel);
    const panel = await abrirPanel(ctx, url, errores);

    await quitarRed(modo, ctx, [cel]);
    await cel.waitForTimeout(300);
    const chip = limpio(await chipRed(cel).innerText());
    esc.verificar(/sin internet/i.test(chip), `el chip dice "Sin internet" (${chip})`);

    await hacerDiagnostico(cel, 'ana');
    await cel.waitForTimeout(1500); // más que los 0.7 s del envío automático: no debe salir nada
    let d = await leerCel(cel, 'ana');
    firma.trasDiagnostico = d.pendientes.length;

    await escribirDudas(cel, DUDAS.ana);
    await cel.waitForTimeout(1200);
    d = await leerCel(cel, 'ana');
    firma.pendientes = d.pendientes.length;
    firma.servidorSinRed = d.servidor.length;
    firma.dudasPendientes = d.dudas.filter((x) => x.pendiente && x.respuesta === null).length;
    const pendientesAntes = [...d.pendientes];
    esc.verificar(
      d.dudas.length === 2 && firma.dudasPendientes === 2,
      'las 2 dudas quedan guardadas en el cel con estado pendiente (sin respuesta)',
      JSON.stringify(d.dudas.map((x) => ({ texto: x.texto, pendiente: x.pendiente, respuesta: x.respuesta }))),
    );
    esc.verificar(
      d.servidor.length === 0 && firma.pendientes === firma.trasDiagnostico + 2,
      `sin red no sale nada: ${firma.pendientes} pendientes (diagnóstico + 2 dudas) y 0 en el servidor`,
      `servidor: ${d.servidor.length}`,
    );

    const chat = await texto(cel, '#contenido');
    esc.verificar(/sin internet/i.test(await texto(cel, '.est-chat .est-nota, #contenido [data-estado="alerta"]')), 'el chat avisa que está sin internet y que guarda las dudas');
    esc.verificar(contar(chat, /esperando señal/i) === 2, `cada duda dice "Esperando señal" (${contar(chat, /esperando señal/i)})`);
    esc.verificar(contar(chat, /guardé tu duda/i) === 2, 'Tecu contesta "Guardé tu duda…" a cada una');
    esc.verificar((await qa(cel, 'anuncios')).some((t) => /guardé tu duda/i.test(t)), 'el lector de pantalla anuncia que la duda quedó guardada');

    await irA(cel, /inicio/i);
    await esperarTitulo(cel, /hola/i);
    esc.verificar(/2 dudas esperando señal/i.test(await texto(cel, '#contenido')), 'Inicio recuerda "Tienes 2 dudas esperando señal"');
    const barra = await texto(cel, '.barra-superior');
    esc.verificar(new RegExp(`\\b${firma.pendientes}\\D{0,60}pendiente`, 'i').test(barra), `la barra muestra los ${firma.pendientes} pendientes`, barra);
    esc.verificar(!(await panel.locator('tr[data-alumno="ana"]').count()), 'el panel todavía no ve a Ana (nada se sincronizó)');

    // Vuelve la red con el chat abierto.
    await irA(cel, /tecu/i);
    await esperarTitulo(cel, /tecu/i);
    await limpiarQa(cel);
    await limpiarQa(panel);
    await volverRed(modo, ctx, [cel]);
    const fin =
      (await esperarHasta(
        async () => {
          const x = await leerCel(cel, 'ana');
          return x.pendientes.length === 0 && x.dudas.every((y) => !y.pendiente) && x.servidor.length >= pendientesAntes.length ? x : null;
        },
        { ms: 25000 },
      )) || (await leerCel(cel, 'ana'));
    await cel.waitForTimeout(800);

    firma.dudasContestadas = fin.dudas.filter((x) => !x.pendiente && x.respuesta).length;
    esc.verificar(firma.dudasContestadas === 2, 'al volver la red las 2 dudas se contestan solas', JSON.stringify(fin.dudas.map((x) => x.respuesta)));
    const chatDespues = await texto(cel, '#contenido');
    esc.verificar(
      DUDAS.ana.every((t) => chatDespues.includes(`Sobre «${t}»`)) && !/esperando señal/i.test(chatDespues),
      'el chat muestra cada respuesta ("Sobre «…»") y ya no dice "Esperando señal"',
    );
    const avisos = await qa(cel, 'avisos');
    firma.avisosAlVolver = [...new Set(avisos)].sort();
    esc.verificar(avisos.some((t) => /respondió tus 2 dudas/i.test(t)), 'se avisa "Tecu respondió tus 2 dudas"', avisos.join(' | '));
    esc.verificar(avisos.some((t) => /ya ve tu avance/i.test(t)), 'se avisa que la maestra o el maestro ya ve el avance', avisos.join(' | '));

    const ids = fin.servidor.map((e) => e.id);
    firma.servidor = ids.length;
    esc.verificar(
      fin.pendientes.length === 0 && !faltantes(pendientesAntes, ids).length && !duplicados(ids).length && ids.length === pendientesAntes.length,
      `la cola se vacía: ${pendientesAntes.length} eventos en el servidor, cada id una sola vez`,
      `faltan ${faltantes(pendientesAntes, ids).length}, duplicados ${duplicados(ids).length}, en servidor ${ids.length}`,
    );
    const dudasServidor = fin.servidor.filter((e) => e.tipo === 'duda');
    esc.verificar(
      dudasServidor.length === 2 && dudasServidor.every((e) => e.datos?.respondida && e.datos?.respuesta),
      'en el servidor las 2 dudas llegan con su respuesta',
      JSON.stringify(dudasServidor.map((e) => e.datos)),
    );

    const fila = panel.locator('tr[data-alumno="ana"]');
    await fila.waitFor({ timeout: 15000 }).catch(() => {});
    const datosFila = await filaPanel(panel, 'ana');
    esc.verificar(Boolean(datosFila) && /en vivo/i.test(datosFila.texto), 'el panel (sin recargar) muestra a Ana "En vivo"', datosFila?.texto);
    esc.verificar(
      datosFila?.conteo?.[ERROR_DE.ana] === 3 && Object.keys(datosFila.conteo).length === 1,
      'la fila de Ana trae sus 3 errores de signos y nada más',
      resumenConteo(datosFila?.conteo),
    );
    if (datosFila) verificarDudasEnFicha(esc, await leerFicha(panel, 'ana'), 'Ana', DUDAS.ana);
    esc.verificar(!errores.length, `sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
  } finally {
    await ctx.close();
  }
  return firma;
}

/** Cerrar la app sin red y volver a abrirla ya con red: las dudas se contestan al abrir. */
async function cerrarYReabrir(navegador, url, esc) {
  const { ctx, errores } = await nuevoContexto(navegador);
  try {
    const cel = await abrirCel(ctx, url, 'juez', errores, { reiniciar: true });
    await esperarCache(cel);
    const panel = await abrirPanel(ctx, url, errores);
    await ctx.setOffline(true);
    const duda = '¿Puedo juntar la x con los números?';
    await escribirDudas(cel, [duda]);
    await cel.close(); // pagehide: guarda
    await ctx.setOffline(false);
    const cel2 = await abrirCel(ctx, url, 'juez', errores);
    const fin =
      (await esperarHasta(
        async () => {
          const x = await leerCel(cel2, 'juez');
          return x.pendientes.length === 0 && x.dudas.length === 1 && !x.dudas[0].pendiente && x.servidor.length ? x : null;
        },
        { ms: 15000 },
      )) || (await leerCel(cel2, 'juez'));
    esc.verificar(fin.dudas[0]?.respuesta && !fin.dudas[0]?.pendiente, 'al abrir con red, la duda escrita sin red se contesta sola');
    const avisos = await qa(cel2, 'avisos');
    esc.verificar(avisos.some((t) => /respondió tu duda/i.test(t)), 'y se avisa "Tecu respondió tu duda"', avisos.join(' | '));
    esc.verificar(fin.servidor.some((e) => e.tipo === 'duda' && e.datos?.respondida), 'la duda llega al servidor con su respuesta');
    await panel.locator('tr[data-alumno="juez"]').waitFor({ timeout: 15000 }).catch(() => {});
    const hay = await panel.locator('tr[data-alumno="juez"]').count();
    esc.verificar(hay === 1, 'el panel ve al nuevo celular ("Juez") sin recargar');
    if (hay) verificarDudasEnFicha(esc, await leerFicha(panel, 'juez'), 'Juez', [duda]);
    esc.verificar(!errores.length, `sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
  } finally {
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ */
/* 2. Recarga en modo avión a la mitad de una práctica                 */
/* ------------------------------------------------------------------ */

async function escenario2(navegador, url, esc) {
  const { ctx, errores } = await nuevoContexto(navegador);
  try {
    const p = await abrirCel(ctx, url, 'ana', errores, { reiniciar: true });
    await esperarCache(p);
    await ctx.setOffline(true);
    await hacerDiagnostico(p, 'ana');
    await p.getByRole('button', { name: /empezar mi ruta/i }).click();
    const actividad = async () => (await leerCel(p, 'ana')).progreso?.ruta?.actividad;
    await controlar(p, { cmd: 'avanzarRuta' });
    await esperarHasta(async () => (await actividad()) === 'visual', { ms: 20000 });
    await controlar(p, { cmd: 'avanzarRuta' });
    await esperarHasta(async () => (await actividad()) === 'practica', { ms: 30000 });
    await p.waitForTimeout(400);
    await controlar(p, { cmd: 'reproducirPractica' });
    await esperarHasta(async () => (await leerCel(p, 'ana')).progreso?.ruta?.practica?.revisado?.estado === 'correcto', { ms: 30000 });
    await p.getByRole('button', { name: /siguiente práctica/i }).click();
    await p.waitForTimeout(300);

    // A la mitad de la práctica 2: un renglón bien, uno mal y una pista.
    const ruta = (await leerCel(p, 'ana')).progreso.ruta;
    const ecuacion = ruta.practica.ejercicios[ruta.practica.indice].ecuacion;
    const pasos = await p.evaluate(async (e) => {
      const m = await import('/js/core/engine.js');
      return m.pasosSolucion(m.ecuacion(e)).map((x) => x.texto);
    }, ecuacion);
    const cuaderno = p.locator('.cuaderno-panel');
    const entrada = cuaderno.getByRole('textbox').first();
    await entrada.fill(pasos[0]);
    await entrada.press('Enter');
    await p.waitForTimeout(150);
    await entrada.fill('2x = 99');
    await entrada.press('Enter');
    await p.waitForTimeout(150);
    await cuaderno.getByRole('button', { name: /pista/i }).first().click();
    await p.waitForTimeout(200);
    const foto = async () => ({
      titulo: await texto(p, '#est-act-titulo'),
      renglones: (await p.locator('.cuaderno__renglones .cuaderno__renglon').allInnerTexts()).map(limpio),
      estados: await p.locator('.cuaderno__renglones .cuaderno__renglon').evaluateAll((els) => els.map((el) => el.dataset.estado)),
      pendientes: (await leerCel(p, 'ana')).pendientes,
      pasos: await texto(p, '.est-pasos'),
      chip: limpio(await chipRed(p).innerText().catch(() => '')),
    });
    const antes = await foto();
    esc.nota(`antes de recargar: "${antes.titulo}", ${antes.renglones.length} renglones, ${antes.pendientes.length} pendientes`);
    esc.verificar(antes.renglones.length === 2 && /práctica 2 de 3/i.test(antes.titulo), 'preparación: práctica 2 de 3 con 2 renglones escritos y una pista vista');

    for (const vuelta of [1, 2]) {
      await p.reload();
      await esperarVista(p);
      await p.locator('.cuaderno__renglones .cuaderno__renglon').nth(1).waitFor({ timeout: 10000 }).catch(() => {});
      const despues = await foto();
      const cual = vuelta === 1 ? 'tras recargar sin red' : 'tras una segunda recarga sin red';
      esc.verificar(despues.titulo === antes.titulo, `${cual}: sigue en "${antes.titulo}"`, despues.titulo || '(sin título: ¿no cargó la app?)');
      esc.verificar(
        JSON.stringify(despues.renglones) === JSON.stringify(antes.renglones) && JSON.stringify(despues.estados) === JSON.stringify(antes.estados),
        `${cual}: los renglones del cuaderno siguen ahí, con sus marcas (✓ y "Aquí cambió la solución")`,
        JSON.stringify(despues.renglones),
      );
      esc.verificar(JSON.stringify(despues.pendientes) === JSON.stringify(antes.pendientes), `${cual}: la cola tiene los mismos ${antes.pendientes.length} pendientes`);
      esc.verificar(despues.pasos === antes.pasos && /práctica\s*:\s*en curso/i.test(despues.pasos), `${cual}: el avance de la ruta es el mismo (Práctica en curso)`, despues.pasos);
      if (vuelta === 1) esc.verificar(/sin internet/i.test(despues.chip), 'la app recargó sin red y el chip dice "Sin internet"', despues.chip);
    }

    // La pista que ya vio debe seguir contando para el docente.
    await cuaderno.getByRole('button', { name: /^revisar/i }).first().click();
    const evento = await esperarHasta(
      async () => (await leerCel(p, 'ana')).eventos.filter((e) => e.tipo === 'practica' && e.ejercicio === ecuacion).pop(),
      { ms: 8000 },
    );
    esc.verificar(
      Number(evento?.pistasUsadas) >= 1,
      'la pista que vio antes de recargar sigue contando (el evento de práctica dice pistasUsadas ≥ 1)',
      `pistasUsadas = ${evento?.pistasUsadas}: al recargar, la vista no guarda las pistas del borrador (solo los renglones)`,
    );
    esc.verificar(!errores.length, `sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
  } finally {
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ */
/* 3. La cola sobrevive recargas y se vacía una sola vez               */
/* ------------------------------------------------------------------ */

async function escenario3(navegador, url, esc) {
  // a) Una pestaña: recargas y cierre sin red.
  {
    const { ctx, errores } = await nuevoContexto(navegador);
    try {
      let cel = await abrirCel(ctx, url, 'ana', errores, { reiniciar: true });
      await esperarCache(cel);
      const panel = await abrirPanel(ctx, url, errores);
      await ctx.setOffline(true);
      await hacerDiagnostico(cel, 'ana');
      await escribirDudas(cel, [DUDAS.ana[0]]);
      await cel.waitForTimeout(1000);
      const cola = (await leerCel(cel, 'ana')).pendientes;
      esc.nota(`cola sin red: ${cola.length} actividades`);
      for (const vuelta of [1, 2, 3]) {
        await cel.reload();
        await esperarVista(cel);
        const d = await leerCel(cel, 'ana');
        const barra = await texto(cel, '.barra-superior');
        esc.verificar(
          JSON.stringify(d.pendientes) === JSON.stringify(cola) && d.servidor.length === 0 && new RegExp(`\\b${cola.length}\\D{0,60}pendiente`, 'i').test(barra),
          `recarga ${vuelta} sin red: la misma cola (${cola.length} ids, en orden), nada en el servidor y la barra lo dice`,
          `pendientes ${d.pendientes.length}, servidor ${d.servidor.length}, barra "${barra}"`,
        );
      }
      await cel.close();
      cel = await abrirCel(ctx, url, 'ana', errores);
      esc.verificar(JSON.stringify((await leerCel(cel, 'ana')).pendientes) === JSON.stringify(cola), 'al cerrar la pestaña y abrir otra sin red, la cola sigue igual');

      await limpiarQa(panel);
      await ctx.setOffline(false);
      const fin = (await esperarHasta(async () => {
        const x = await leerCel(cel, 'ana');
        return x.pendientes.length === 0 ? x : null;
      })) || (await leerCel(cel, 'ana'));
      await panel.waitForTimeout(1500);
      const ids = fin.servidor.map((e) => e.id);
      esc.verificar(
        fin.pendientes.length === 0 && ids.length === cola.length && !faltantes(cola, ids).length && !duplicados(ids).length,
        `al volver la red se vacía: cada uno de los ${cola.length} ids llega una sola vez`,
        `servidor ${ids.length}, faltan ${faltantes(cola, ids).length}, duplicados ${duplicados(ids).length}`,
      );
      const syncs = (await qa(panel, 'sync')).filter((m) => m?.tipo === 'sync' && m.alumno === 'ana');
      const n = syncs.reduce((s, m) => s + (Number(m.n) || 0), 0);
      esc.verificar(n === cola.length, `el aviso de sincronización suma ${cola.length} (se vació una vez)`, `mensajes: ${JSON.stringify(syncs)}`);
      await cel.reload();
      await esperarVista(cel);
      await cel.waitForTimeout(2000);
      const otra = (await leerCel(cel, 'ana')).servidor.map((e) => e.id);
      esc.verificar(JSON.stringify(otra) === JSON.stringify(ids), 'recargar ya con red no vuelve a subir nada');
      esc.verificar(!errores.length, `sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
    } finally {
      await ctx.close();
    }
  }
  // b) Dos pestañas del MISMO alumno cuando vuelve la red.
  {
    const { ctx, errores } = await nuevoContexto(navegador);
    try {
      const cel = await abrirCel(ctx, url, 'ana', errores, { reiniciar: true });
      await esperarCache(cel);
      const panel = await abrirPanel(ctx, url, errores);
      await ctx.setOffline(true);
      await hacerDiagnostico(cel, 'ana');
      await escribirDudas(cel, DUDAS.ana);
      await cel.waitForTimeout(1000);
      const cola = (await leerCel(cel, 'ana')).pendientes;
      const cel2 = await abrirCel(ctx, url, 'ana', errores);
      esc.verificar(new RegExp(`\\b${cola.length}\\D{0,60}pendiente`, 'i').test(await texto(cel2, '.barra-superior')), `dos pestañas de Ana: la segunda también muestra ${cola.length} pendientes`);
      await limpiarQa(panel);
      await ctx.setOffline(false);
      await esperarHasta(async () => (await leerCel(cel, 'ana')).pendientes.length === 0);
      await panel.waitForTimeout(2500);
      const ids = (await leerCel(cel, 'ana')).servidor.map((e) => e.id);
      esc.verificar(
        ids.length === cola.length && !faltantes(cola, ids).length && !duplicados(ids).length,
        `dos pestañas de Ana: en el servidor cada id una sola vez (${ids.length} de ${cola.length})`,
        `faltan ${faltantes(cola, ids).length}, duplicados ${duplicados(ids).length}`,
      );
      const syncs = (await qa(panel, 'sync')).filter((m) => m?.tipo === 'sync' && m.alumno === 'ana');
      const n = syncs.reduce((s, m) => s + (Number(m.n) || 0), 0);
      const anunciado = (await qa(panel, 'avisos')).map((t) => /Ana sincronizó (\d+)/.exec(t)).filter(Boolean).reduce((s, m) => s + Number(m[1]), 0);
      esc.verificar(
        n === cola.length && anunciado === cola.length,
        `dos pestañas de Ana: la cola se vacía una sola vez (el panel anuncia ${cola.length} actividades)`,
        `el panel anunció ${anunciado} y los avisos 'sync' suman ${n} (${syncs.length} avisos de ${JSON.stringify(syncs.map((m) => m.n))}); cada pestaña "sube" los ${cola.length}`,
      );
      esc.verificar(!errores.length, `sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
    } finally {
      await ctx.close();
    }
  }
}

/* ------------------------------------------------------------------ */
/* 4. Panel docente en modo avión                                      */
/* ------------------------------------------------------------------ */

async function verificarPanelSinRed(esc, p, cual) {
  esc.verificar(/panel docente/i.test(await texto(p, 'h1')), `${cual}: carga el panel ("${await texto(p, 'h1')}")`);
  const filas = await p.locator('table tbody tr').count();
  esc.verificar(filas >= 28, `${cual}: el mapa muestra al grupo (${filas} filas)`);
  const hojas = await p.evaluate(() =>
    [...document.styleSheets].map((s) => {
      try {
        return { href: s.href || '', reglas: s.cssRules.length };
      } catch {
        return { href: s.href || '', reglas: 0 };
      }
    }),
  );
  const docente = hojas.find((h) => h.href.endsWith('css/docente.css'));
  esc.verificar(docente && docente.reglas > 0, `${cual}: los estilos del panel (css/docente.css) cargan desde la caché`);
}

async function escenario4(navegador, url, esc) {
  {
    const { ctx, errores } = await nuevoContexto(navegador);
    try {
      const p = await abrirPanel(ctx, url, errores, { reiniciar: true });
      const cache = await esperarCache(p);
      esc.verificar(cache?.archivos >= 30, `primera visita: el service worker guardó ${cache?.archivos} archivos`);
      await ctx.setOffline(true);
      await p.reload();
      await p.locator('table tbody tr').first().waitFor({ timeout: 20000 }).catch(() => {});
      await verificarPanelSinRed(esc, p, 'recarga sin red');
      await p.locator('table tbody tr').first().getByRole('button').first().click();
      const ficha = await p.locator('dialog[open]').waitFor({ timeout: 8000 }).then(() => true, () => false);
      esc.verificar(ficha, 'sin red se abre la ficha de un estudiante');
      if (ficha) await p.keyboard.press('Escape');
      await p.evaluate(() => {
        window.__impresiones = 0;
        window.print = () => {
          window.__impresiones += 1;
        };
      });
      await p.getByRole('button', { name: /imprimir cuadernillo/i }).first().click();
      const imprimio = await p.waitForFunction(() => window.__impresiones > 0, null, { timeout: 8000 }).then(() => true, () => false);
      esc.verificar(imprimio, 'sin red se arma el cuadernillo para imprimir');
      const q = await ctx.newPage();
      await q.setViewportSize(ESCRITORIO);
      q.on('pageerror', (e) => errores.push(`pestaña nueva: ${e.message}`));
      await q.goto(`${url}/?vista=docente`).catch(() => {});
      await q.locator('table tbody tr').first().waitFor({ timeout: 20000 }).catch(() => {});
      await verificarPanelSinRed(esc, q, 'pestaña nueva sin red');
      esc.verificar(!errores.length, `sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
    } finally {
      await ctx.close();
    }
  }
  {
    // La primera visita fue solo a la vista del estudiante (p. ej., el cel del docente con el QR).
    const { ctx, errores } = await nuevoContexto(navegador);
    try {
      const cel = await abrirCel(ctx, url, 'ana', errores, { reiniciar: true });
      await esperarCache(cel);
      await ctx.setOffline(true);
      const p = await ctx.newPage();
      await p.setViewportSize(ESCRITORIO);
      p.on('pageerror', (e) => errores.push(`panel: ${e.message}`));
      await p.goto(`${url}/?vista=docente`).catch(() => {});
      await p.locator('table tbody tr').first().waitFor({ timeout: 20000 }).catch(() => {});
      await verificarPanelSinRed(esc, p, 'primera visita solo al estudiante, panel sin red');
      esc.verificar(!errores.length, `sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
    } finally {
      await ctx.close();
    }
  }
}

/* ------------------------------------------------------------------ */
/* 5. Simulador "Sin internet"                                         */
/* ------------------------------------------------------------------ */

async function escenario5(navegador, url, esc, firmas) {
  const real = firmas.real;
  const simulada = firmas.simulador;
  if (real && simulada) {
    const campos = ['trasDiagnostico', 'pendientes', 'servidorSinRed', 'dudasPendientes', 'dudasContestadas', 'servidor'];
    const distintos = campos.filter((c) => real[c] !== simulada[c]);
    esc.verificar(!distintos.length, 'cola y dudas: el simulador da lo mismo que el modo avión real', distintos.map((c) => `${c}: real ${real[c]} vs simulador ${simulada[c]}`).join(', '));
    esc.verificar(
      JSON.stringify(real.avisosAlVolver) === JSON.stringify(simulada.avisosAlVolver),
      'al volver la red se ven los mismos avisos',
      `real ${JSON.stringify(real.avisosAlVolver)} vs simulador ${JSON.stringify(simulada.avisosAlVolver)}`,
    );
  } else {
    esc.verificar(false, 'no hay resultados del escenario 1 para comparar (real y simulador)');
  }

  const { ctx, errores } = await nuevoContexto(navegador);
  try {
    const cel = await abrirCel(ctx, url, 'ana', errores, { reiniciar: true });
    await esperarCache(cel);
    const chip = cel.locator('.barra-superior .est-red').first();
    await quitarRed('simulador', ctx, [cel]);
    await cel.waitForTimeout(200);
    const info = await chip.evaluate((el) => ({
      nombre: el.textContent.replace(/\s+/g, ' ').trim(),
      clase: el.className,
      presionado: el.getAttribute('aria-pressed'),
      titulo: el.getAttribute('title') || '',
    }));
    esc.verificar(await cel.evaluate(() => navigator.onLine), 'la red real sigue encendida (navigator.onLine)');
    esc.verificar(/^sin internet$/i.test(info.nombre) && /chip--alerta/.test(info.clase), `el chip dice "Sin internet" con estilo de alerta (${info.nombre})`);
    esc.verificar(/volver a tener internet/i.test(info.titulo), `y explica cómo volver ("${info.titulo}")`);
    esc.verificar(
      !(info.presionado === 'false' && /sin internet/i.test(info.nombre)),
      'para lector de pantalla el estado no se contradice con el texto',
      `el botón se llama "${info.nombre}" y tiene aria-pressed="${info.presionado}": se oye "Sin internet, no presionado". ` +
        'Con aria-pressed la etiqueta no debe cambiar (APG); usar nombre fijo o role="switch"',
    );

    await hacerDiagnostico(cel, 'ana');
    await cel.waitForTimeout(1500);
    const cola = (await leerCel(cel, 'ana')).pendientes;
    await cel.reload();
    await esperarVista(cel);
    esc.verificar(/sin internet/i.test(limpio(await chip.innerText())) && JSON.stringify((await leerCel(cel, 'ana')).pendientes) === JSON.stringify(cola), 'el simulador sigue activo tras recargar y la cola sigue igual');

    const luis = await abrirCel(ctx, url, 'luis', errores);
    esc.verificar(/con internet/i.test(limpio(await chipRed(luis).innerText())), 'el simulador es de cada alumno: Luis sigue "Con internet"');
    await luis.close();

    // Simulador encendido + modo avión real; vuelve la red real: debe seguir sin enviar.
    await ctx.setOffline(true);
    await cel.waitForTimeout(300);
    esc.verificar(/de verdad/i.test(limpio(await chip.innerText())), 'si además se va la red real, el chip dice que no hay señal de verdad');
    await ctx.setOffline(false);
    await cel.waitForTimeout(2500);
    const d = await leerCel(cel, 'ana');
    esc.verificar(
      d.servidor.length === 0 && JSON.stringify(d.pendientes) === JSON.stringify(cola) && /^sin internet$/i.test(limpio(await chip.innerText())),
      'al volver la red real con el simulador encendido, nada se envía y el chip sigue en "Sin internet"',
      `servidor ${d.servidor.length}, pendientes ${d.pendientes.length}`,
    );
    await volverRed('simulador', ctx, [cel]);
    const fin = (await esperarHasta(async () => {
      const x = await leerCel(cel, 'ana');
      return x.pendientes.length === 0 ? x : null;
    })) || (await leerCel(cel, 'ana'));
    const ids = fin.servidor.map((e) => e.id);
    esc.verificar(ids.length === cola.length && !faltantes(cola, ids).length && !duplicados(ids).length, 'al apagar el simulador, la cola se vacía una sola vez');
    esc.verificar(!errores.length, `sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
  } finally {
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ */
/* 6. Ana y Luis en el mismo navegador                                 */
/* ------------------------------------------------------------------ */

async function escenario6(navegador, url, esc) {
  const { ctx, errores } = await nuevoContexto(navegador);
  try {
    const panel = await abrirPanel(ctx, url, errores, { reiniciar: true });
    await esperarCache(panel);
    const tabs = { ana: await abrirCel(ctx, url, 'ana', errores), luis: await abrirCel(ctx, url, 'luis', errores) };
    await ctx.setOffline(true);
    for (const alumno of ['ana', 'luis']) {
      await hacerDiagnostico(tabs[alumno], alumno);
      await escribirDudas(tabs[alumno], DUDAS[alumno]);
    }
    await pausa(1000);
    const colas = {};
    for (const alumno of ['ana', 'luis']) {
      const otro = alumno === 'ana' ? 'luis' : 'ana';
      const d = await leerCel(tabs[alumno], alumno);
      colas[alumno] = d.pendientes;
      const nombre = alumno === 'ana' ? 'Ana' : 'Luis';
      esc.verificar(
        d.eventos.every((e) => e.alumno === alumno && e.id.startsWith(`${alumno}-`)) && d.eventos.length === d.pendientes.length,
        `${nombre}: su cola tiene ${d.pendientes.length} actividades, todas suyas`,
      );
      esc.verificar(
        d.dudas.map((x) => x.texto).join('|') === DUDAS[alumno].join('|') && !d.dudas.some((x) => DUDAS[otro].includes(x.texto)),
        `${nombre}: sus dudas están en su cel y no en el del otro`,
      );
      const barra = await texto(tabs[alumno], '.barra-superior');
      esc.verificar(
        barra.includes(nombre) && new RegExp(`\\b${d.pendientes.length}\\D{0,60}pendiente`, 'i').test(barra),
        `${nombre}: su barra muestra su nombre y sus ${d.pendientes.length} pendientes`,
        barra,
      );
    }
    esc.verificar(!(await panel.locator('tr[data-alumno="ana"], tr[data-alumno="luis"]').count()), 'sin red, el panel todavía no ve a ninguno');

    await ctx.setOffline(false); // las dos pestañas recuperan la red al mismo tiempo
    await esperarHasta(async () => (await leerCel(tabs.ana, 'ana')).pendientes.length === 0 && (await leerCel(tabs.luis, 'luis')).pendientes.length === 0, { ms: 25000 });
    await panel.waitForTimeout(2500);
    const servidor = (await leerCel(panel, 'ana')).servidor;
    const ids = servidor.map((e) => e.id);
    for (const alumno of ['ana', 'luis']) {
      const nombre = alumno === 'ana' ? 'Ana' : 'Luis';
      const faltan = faltantes(colas[alumno], ids);
      const cel = await leerCel(tabs[alumno], alumno);
      const perdidos = cel.eventos.filter((e) => faltan.includes(e.id)).map((e) => `${e.tipo}${e.ejercicio ? ` ${e.ejercicio}` : e.datos?.texto ? ` «${e.datos.texto}»` : ''}`);
      esc.verificar(
        !faltan.length && servidor.filter((e) => e.alumno === alumno).length === colas[alumno].length,
        `${nombre}: llegan al servidor sus ${colas[alumno].length} actividades`,
        faltan.length
          ? `se perdieron ${faltan.length}: ${perdidos.join(', ')}. El cel las marcó como sincronizadas (pendientes: ${cel.pendientes.length}) y no las reintenta`
          : '',
      );
    }
    esc.verificar(!duplicados(ids).length, 'en el servidor ningún id se repite');
    for (const alumno of ['ana', 'luis']) {
      const nombre = alumno === 'ana' ? 'Ana' : 'Luis';
      const otro = alumno === 'ana' ? 'luis' : 'ana';
      await panel.locator(`tr[data-alumno="${alumno}"]`).waitFor({ timeout: 15000 }).catch(() => {});
      const fila = await filaPanel(panel, alumno);
      esc.verificar(Boolean(fila) && /en vivo/i.test(fila.texto), `el panel muestra a ${nombre} "En vivo"`);
      esc.verificar(
        fila?.conteo?.[ERROR_DE[alumno]] === 3 && Object.keys(fila.conteo).length === 1,
        `la fila de ${nombre} trae solo sus 3 errores (${ERROR_DE[alumno]})`,
        resumenConteo(fila?.conteo),
      );
      if (fila) verificarDudasEnFicha(esc, await leerFicha(panel, alumno), nombre, DUDAS[alumno], DUDAS[otro]);
    }
    esc.verificar(!errores.length, `sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
  } finally {
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ */
/* 7. Sin BroadcastChannel                                             */
/* ------------------------------------------------------------------ */

async function escenario7(navegador, url, esc) {
  const sinCanal = () => {
    delete window.BroadcastChannel;
  };
  const { ctx, errores } = await nuevoContexto(navegador, { antes: [sinCanal] });
  try {
    const panel = await abrirPanel(ctx, url, errores, { reiniciar: true });
    const cel = await abrirCel(ctx, url, 'ana', errores);
    await esperarCache(cel);
    const tipos = [await panel.evaluate(() => typeof window.BroadcastChannel), await cel.evaluate(() => typeof window.BroadcastChannel)];
    esc.verificar(tipos.every((t) => t === 'undefined'), `BroadcastChannel no existe en el panel ni en el cel (${tipos.join(', ')})`);
    await panel.evaluate(() => {
      window.__sinRecargar = true;
    });
    await ctx.setOffline(true);
    await hacerDiagnostico(cel, 'ana');
    await escribirDudas(cel, [DUDAS.ana[0]]);
    await cel.waitForTimeout(800);
    const cola = (await leerCel(cel, 'ana')).pendientes;
    esc.verificar(!(await panel.locator('tr[data-alumno="ana"]').count()), 'sin red, el panel no ve a Ana');
    await limpiarQa(panel);
    await ctx.setOffline(false);
    await esperarHasta(async () => (await leerCel(cel, 'ana')).pendientes.length === 0);
    await panel.locator('tr[data-alumno="ana"]').waitFor({ timeout: 15000 }).catch(() => {});
    await panel.waitForTimeout(2000);
    const fila = await filaPanel(panel, 'ana');
    esc.verificar(Boolean(fila) && /en vivo/i.test(fila.texto) && (await panel.evaluate(() => window.__sinRecargar === true)), 'el panel muestra a Ana "En vivo" sin recargar (por el evento storage)');
    esc.verificar(fila?.conteo?.[ERROR_DE.ana] === 3, 'con sus 3 errores de signos', resumenConteo(fila?.conteo));
    const indicador = await texto(panel, '.docente-vivo, .barra-superior');
    esc.verificar(/última sincronización/i.test(indicador) && /ana/i.test(indicador), 'el indicador dice la hora de la última sincronización y que fue Ana', indicador);
    const anunciado = (await qa(panel, 'avisos')).map((t) => /Ana sincronizó (\d+)/.exec(t)).filter(Boolean).map((m) => Number(m[1]));
    esc.verificar(
      anunciado.length >= 1 && anunciado.reduce((s, n) => s + n, 0) === cola.length,
      `el panel anuncia "Ana sincronizó ${cola.length} actividades"`,
      JSON.stringify(await qa(panel, 'avisos')),
    );
    if (fila) verificarDudasEnFicha(esc, await leerFicha(panel, 'ana'), 'Ana', [DUDAS.ana[0]]);
    esc.verificar(!errores.length, `sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
  } finally {
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ */
/* 8. Almacenamiento lleno o bloqueado                                 */
/* ------------------------------------------------------------------ */

function almacenamientoLleno() {
  Storage.prototype.setItem = function setItemLleno() {
    throw new DOMException('El almacenamiento está lleno', 'QuotaExceededError');
  };
}

function almacenamientoBloqueado() {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('El navegador no deja guardar datos', 'SecurityError');
    },
  });
}

/** Lo que hace una alumna: un ejercicio del diagnóstico, una duda con red y alto contraste. */
async function usarLaApp(esc, p, cual) {
  await p.getByRole('button', { name: /empezar|continuar/i }).first().click();
  await esperarTitulo(p, /ejercicio/i);
  const entrada = p.locator('.cuaderno-panel').getByRole('textbox').first();
  await entrada.fill('3x = 15');
  await entrada.press('Enter');
  await entrada.fill('x = 5');
  await entrada.press('Enter');
  await p.locator('.cuaderno-panel').getByRole('button', { name: /^revisar/i }).first().click();
  const reviso = await p.locator('.diagnostico').first().waitFor({ timeout: 8000 }).then(() => true, () => false);
  esc.verificar(reviso, `${cual}: se puede resolver y revisar un ejercicio`);
  const pantallaEjercicio = await texto(p, '#contenido');
  const barra = await texto(p, '.barra-superior');
  await irA(p, /tecu/i);
  await esperarTitulo(p, /tecu/i);
  const chat = p.getByRole('textbox', { name: /escribe tu duda/i });
  await chat.fill('¿Qué es la x?');
  await chat.press('Enter');
  const contesto = await p.locator('.est-chat__lista .burbuja--tecu', { hasText: /número que todavía no conocemos/i }).first().waitFor({ timeout: 5000 }).then(() => true, () => false);
  esc.verificar(contesto, `${cual}: Tecu contesta en el chat`);
  await irA(p, /ajustes/i);
  await p.getByRole('switch', { name: /contraste/i }).click();
  esc.verificar(await p.evaluate(() => document.documentElement.classList.contains('alto-contraste')), `${cual}: el alto contraste se aplica en la sesión`);
  return { pantallaEjercicio, barra };
}

async function textosVisibles(p) {
  const pagina = limpio(await p.locator('body').innerText().catch(() => ''));
  return [pagina, ...(await qa(p, 'avisos')), ...(await qa(p, 'anuncios'))];
}

async function escenario8(navegador, url, esc) {
  const variantes = [
    { id: 'lleno', titulo: 'almacenamiento lleno desde el inicio (setItem lanza QuotaExceededError)', antes: [almacenamientoLleno] },
    { id: 'bloqueado', titulo: 'almacenamiento bloqueado (leer localStorage lanza SecurityError)', antes: [almacenamientoBloqueado] },
    { id: 'se-llena', titulo: 'se llena a mitad de la sesión', antes: [] },
  ];
  for (const v of variantes) {
    const { ctx, errores } = await nuevoContexto(navegador, { antes: v.antes });
    try {
      esc.nota(v.titulo);
      const p = await abrirCel(ctx, url, 'ana', errores, { reiniciar: v.id !== 'bloqueado' });
      if (v.id === 'se-llena') await p.evaluate(almacenamientoLleno);
      esc.verificar(/hola/i.test(await texto(p, '#contenido h1')), `${v.id}: la app abre en Inicio`);
      const { pantallaEjercicio, barra } = await usarLaApp(esc, p, v.id);
      const textos = await textosVisibles(p);
      esc.verificar(
        textos.some((t) => RE_NO_GUARDA.test(t)),
        `${v.id}: avisa de forma amable que no puede guardar en el cel`,
        'no hay ningún aviso (solo console.warn); la alumna cree que su avance quedó guardado',
      );
      if (v.id !== 'bloqueado') {
        esc.verificar(
          !/guardado en tu cel/i.test(pantallaEjercicio),
          `${v.id}: no dice "Guardado en tu cel" si no se pudo guardar`,
          `la pantalla dice "Guardado en tu cel." y la barra "${barra}" (el evento no se guardó y nunca llegará al panel)`,
        );
      }
      if (v.id === 'lleno') {
        await p.reload();
        const abre = await esperarVista(p).then(() => true, () => false);
        esc.verificar(abre, 'lleno: al recargar la app vuelve a abrir (sin pantalla de error)');
      }
      if (v.id === 'bloqueado') {
        const panel = await abrirPanel(ctx, url, errores).catch(() => null);
        esc.verificar(Boolean(panel) && (await panel.locator('table tbody tr').count()) >= 28, 'bloqueado: el panel docente también abre');
      }
      esc.verificar(!errores.length, `${v.id}: sin errores de JavaScript${errores.length ? `: ${errores.join(' | ')}` : ''}`);
    } catch (error) {
      esc.abortar(error);
    } finally {
      await ctx.close();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Programa                                                            */
/* ------------------------------------------------------------------ */

const ESCENARIOS = [
  [1, 'Dudas a Tecu sin conexión (red real y simulador)', async (n, url, esc, firmas) => {
    esc.nota('modo avión real (context.setOffline)');
    firmas.real = await flujoSinRed(n, url, 'real', esc);
    esc.nota('simulador "Sin internet" de la app');
    firmas.simulador = await flujoSinRed(n, url, 'simulador', esc);
    esc.nota('cerrar la app sin red y abrirla ya con red');
    await cerrarYReabrir(n, url, esc);
  }],
  [2, 'Recarga en modo avión a la mitad de una práctica', (n, url, esc) => escenario2(n, url, esc)],
  [3, 'La cola sobrevive recargas sin red y se vacía una sola vez', (n, url, esc) => escenario3(n, url, esc)],
  [4, 'Panel docente en modo avión desde la caché', (n, url, esc) => escenario4(n, url, esc)],
  [5, 'Simulador "Sin internet" igual al modo avión real', async (n, url, esc, firmas) => {
    if (!firmas.real) firmas.real = await flujoSinRed(n, url, 'real', crearEscenarioMudo());
    if (!firmas.simulador) firmas.simulador = await flujoSinRed(n, url, 'simulador', crearEscenarioMudo());
    await escenario5(n, url, esc, firmas);
  }],
  [6, 'Ana y Luis en dos pestañas del mismo navegador', (n, url, esc) => escenario6(n, url, esc)],
  [7, 'Sin BroadcastChannel: el panel se actualiza por el evento storage', (n, url, esc) => escenario7(n, url, esc)],
  [8, 'Almacenamiento lleno o bloqueado', (n, url, esc) => escenario8(n, url, esc)],
];

/** Para correr el flujo del escenario 1 solo como insumo del 5 (sin contar sus verificaciones). */
function crearEscenarioMudo() {
  return { verificar: (c) => Boolean(c), nota: () => {}, abortar: () => {} };
}

async function correr() {
  const pedidos = process.argv.slice(2).map(Number).filter(Boolean);
  const servidor = await levantarServidor();
  const navegador = await abrirNavegador();
  const firmas = {};
  try {
    for (const [numero, titulo, fn] of ESCENARIOS) {
      if (pedidos.length && !pedidos.includes(numero)) continue;
      const esc = crearEscenario(numero, titulo);
      const inicio = Date.now();
      try {
        await conLimite(fn(navegador, servidor.url, esc, firmas), LIMITE_ESCENARIO, `escenario ${numero}`);
      } catch (error) {
        esc.abortar(error);
      }
      esc.nota(`${((Date.now() - inicio) / 1000).toFixed(1)} s`);
    }
  } finally {
    await navegador.close();
    await servidor.cerrar();
  }
  console.log('\n=== Resumen: modo sin conexión ===');
  for (const r of resultados) {
    const ok = !r.fallas.length;
    console.log(`${ok ? '✓' : '✗'} ${r.numero}. ${r.titulo}: ${r.total - r.fallas.length}/${r.total}`);
    for (const f of r.fallas) console.log(`    ✗ ${f}`);
  }
  const fallas = resultados.reduce((s, r) => s + r.fallas.length, 0);
  console.log(fallas ? `\n${fallas} verificación(es) fallaron.` : '\nTodo el modo sin conexión pasó.');
  process.exitCode = fallas ? 1 : 0;
}

correr();
