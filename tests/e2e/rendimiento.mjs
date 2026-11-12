/**
 * Rendimiento en gama baja (fase 3): lo que vive un cel barato con datos lentos.
 *
 *   1. Primera visita a /?alumno=ana con "3G normal" y "3G lenta", CPU ×4 y ×6,
 *      tal como la sirve el servidor local (sin compresión) y como la serviría
 *      GitHub Pages (gzip, ETag con 304, max-age=600).
 *   2. Segunda visita en modo avión con CPU ×6 (la sirve el service worker).
 *   3. Interacción con CPU ×6: agregar un renglón, «Revisar», pasar de ejercicio,
 *      montar la balanza y abrir el chat; y la reproducción completa del diagnóstico.
 *   4. Panel docente con CPU ×4: hasta ver el mapa (genera el grupo simulado de 28)
 *      y la actualización en vivo cuando un celular sincroniza.
 *   5. Memoria (JS heap) al terminar la ruta completa.
 *
 * Cada medición se repite (3 veces por defecto) y se reporta la MEDIANA. La prueba
 * sale con código 1 si alguna mediana rompe el PRESUPUESTO. Los límites dejan
 * margen (≥ 1.5× sobre lo medido) para no dar falsos positivos en una máquina
 * ocupada. Números de referencia y recomendaciones: docs/RENDIMIENTO.md.
 *
 * Uso:
 *   node tests/e2e/rendimiento.mjs                    # todo, 3 corridas (≈ 12 min)
 *   node tests/e2e/rendimiento.mjs --corridas=1       # una corrida (≈ 5 min)
 *   node tests/e2e/rendimiento.mjs --solo=interaccion,panel
 *   node tests/e2e/rendimiento.mjs --json=resultados.json
 * Bloques de --solo: primera, segunda, interaccion, reproduccion, panel.
 *
 * Cómo se mide:
 *   - Red: CDP Network.emulateNetworkConditions en la página Y en el service worker.
 *     La sesión CDP de la página no limita lo que descarga el service worker, así que
 *     se abre una conexión CDP propia al navegador (--remote-debugging-port) que se
 *     adjunta a cada service worker. Sin WebSocket (Node < 22) el service worker no
 *     se limita y "lista sin internet" sale optimista (se avisa).
 *   - CPU: CDP Emulation.setCPUThrottlingRate (×4 ≈ gama media, ×6 ≈ gama baja).
 *   - Tiempos de carga: desde el inicio de la navegación (performance.now()).
 *     "Interactivo" = «¡Hola, Ana!» pintado y 1 s seguido sin tareas largas (≥ 50 ms)
 *     después (un TTI simplificado).
 *   - Interacciones: desde el evento que dispara la acción (timeStamp del click o
 *     del keydown, como INP) hasta el cuadro siguiente ya pintado con el resultado.
 *   - Bytes: los que salen del servidor por solicitud (cabeceras + cuerpo).
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { writeFileSync } from 'node:fs';
import { cpus, loadavg } from 'node:os';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { crearServidor } from '../../server.js';

const require = createRequire(import.meta.url);

/* ------------------------------------------------------------------ */
/* Configuración                                                        */
/* ------------------------------------------------------------------ */

const ARGS = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [clave, valor = 'true'] = a.replace(/^--/, '').split('=');
    return [clave, valor];
  }),
);
const CORRIDAS = Math.max(1, Number(ARGS.corridas) || 3);
const BLOQUES = ARGS.solo ? new Set(ARGS.solo.split(',')) : null;
const toca = (bloque) => !BLOQUES || BLOQUES.has(bloque);

/** "3G normal" = el perfil "Regular 3G" de DevTools; "3G lenta" = 400 kb/s con 400 ms. */
const REDES = {
  '3G normal': { latency: 100, downloadThroughput: (750 * 1024) / 8, uploadThroughput: (250 * 1024) / 8 },
  '3G lenta': { latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 },
};

/**
 * Primeras visitas que se miden. `swListo`: además espera a que el service worker
 * termine de guardar la app ("lista sin internet"); depende de la red, no del CPU,
 * así que solo se espera con CPU ×4 (ahorra minutos).
 */
const PRIMERAS = [
  { red: '3G normal', cpu: 4, pages: false, swListo: true },
  { red: '3G normal', cpu: 6, pages: false, swListo: false },
  { red: '3G lenta', cpu: 4, pages: false, swListo: true },
  { red: '3G lenta', cpu: 6, pages: false, swListo: false },
  { red: '3G normal', cpu: 4, pages: true, swListo: true },
  { red: '3G lenta', cpu: 6, pages: true, swListo: false },
];

/** Cómo se sirve la app en cada medición de primera visita. */
const MODOS = { crudo: 'servidor local (sin compresión)', pages: 'como GitHub Pages (gzip)' };

const CEL = { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const LAPTOP = { viewport: { width: 1280, height: 800 } };

/** Lo que escribe Ana en el diagnóstico (el mismo guion que avion.mjs y panel-en-vivo.mjs). */
const GUION_ANA = [['3x = 25', 'x = 25/3'], ['x/4 = 3', 'x = 12'], ['5x + 2x = 14 − 2', '7x = 12', 'x = 12/7'], ['−2x = 14', 'x = −7']];

/** Ventana sin tareas largas que define "interactivo". */
const VENTANA_QUIETA = 1000;

/**
 * PRESUPUESTO para la demo. Se compara contra la MEDIANA de las corridas.
 * `medido`: referencia de docs/RENDIMIENTO.md (máquina tranquila, Xeon 2.1 GHz de 4 núcleos),
 * solo para el reporte. El límite deja margen para máquinas ocupadas o más lentas.
 */
const PRESUPUESTO = [
  { clave: 'primera|3G normal|x4|pages|interactivo', limite: 6000, unidad: 'ms', texto: 'Primera visita, 3G normal, CPU ×4, como GitHub Pages: interactivo' },
  { clave: 'primera|3G normal|x4|crudo|interactivo', limite: 11000, unidad: 'ms', texto: 'Primera visita, 3G normal, CPU ×4, servidor local sin compresión: interactivo' },
  { clave: 'primera|3G lenta|x6|pages|interactivo', limite: 12000, unidad: 'ms', texto: 'Primera visita, 3G lenta, CPU ×6, como GitHub Pages: interactivo' },
  { clave: 'primera|3G normal|x4|pages|listaSinInternet', limite: 15000, unidad: 'ms', texto: 'Primera visita, 3G normal, como GitHub Pages: lista para usarse sin internet' },
  { clave: 'peso|pages|hastaInteractivoKB', limite: 260, unidad: 'KB', texto: 'Peso hasta interactivo, como GitHub Pages' },
  { clave: 'peso|pages|totalKB', limite: 560, unidad: 'KB', texto: 'Peso total de la primera visita con el precache, como GitHub Pages' },
  { clave: 'peso|crudo|totalKB', limite: 1700, unidad: 'KB', texto: 'Peso total de la primera visita con el precache, sin compresión' },
  { clave: 'segunda|avion|x6|interactivo', limite: 3000, unidad: 'ms', texto: 'Segunda visita en modo avión, CPU ×6: interactivo' },
  { clave: 'interaccion|x6|agregar', limite: 150, unidad: 'ms', texto: 'Agregar un renglón (Enter), CPU ×6' },
  { clave: 'interaccion|x6|revisar', limite: 200, unidad: 'ms', texto: '«Revisar» hasta ver el diagnóstico, CPU ×6 (peor de los 4 ejercicios)' },
  { clave: 'interaccion|x6|siguiente', limite: 300, unidad: 'ms', texto: '«Siguiente ejercicio» hasta el cuaderno nuevo, CPU ×6' },
  { clave: 'interaccion|x6|balanza', limite: 400, unidad: 'ms', texto: 'Montar la balanza, CPU ×6' },
  { clave: 'interaccion|x6|chat', limite: 300, unidad: 'ms', texto: 'Abrir el chat con Tecu, CPU ×6' },
  { clave: 'reproduccion|x6|tareaMasLarga', limite: 250, unidad: 'ms', texto: 'Diagnóstico completo reproducido, CPU ×6: tarea más larga' },
  { clave: 'panel|x4|mapa', limite: 5000, unidad: 'ms', texto: 'Panel docente, CPU ×4: hasta ver el mapa' },
  { clave: 'panel|x4|enVivo', limite: 1500, unidad: 'ms', texto: 'Panel docente, CPU ×4: Ana aparece después de sincronizar' },
  { clave: 'memoria|heapFinMB', limite: 20, unidad: 'MB', texto: 'JS heap al terminar la ruta' },
];

/* ------------------------------------------------------------------ */
/* Utilidades                                                           */
/* ------------------------------------------------------------------ */

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function mediana(valores) {
  const v = valores.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

const maximo = (valores) => (valores.length ? Math.max(...valores) : 0);

function fmt(valor, unidad) {
  if (!Number.isFinite(valor)) return '—';
  if (unidad === 'ms') return valor >= 1000 ? `${(valor / 1000).toFixed(2)} s` : `${Math.round(valor)} ms`;
  if (unidad === 'KB' || unidad === 'MB') return `${valor.toFixed(1)} ${unidad}`;
  return String(Math.round(valor));
}

function tipoDeArchivo(ruta) {
  if (ruta.startsWith('/icons/')) return 'íconos';
  if (ruta.startsWith('/packs/')) return 'paquete';
  if (ruta.endsWith('.woff2')) return 'fuente';
  if (ruta.endsWith('.css')) return 'CSS';
  if (ruta === '/sw.js') return 'service worker';
  if (ruta.endsWith('.js')) return 'JS';
  return 'HTML y manifest';
}

async function puertoLibre() {
  const s = createServer();
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const { port } = s.address();
  await new Promise((r) => s.close(r));
  return port;
}

/* ------------------------------------------------------------------ */
/* Servidor con conteo de bytes (y gzip opcional, como GitHub Pages)   */
/* ------------------------------------------------------------------ */

const COMPRIMIBLE = /text\/|javascript|json|svg|manifest/;

/**
 * El servidor de la app (server.js) con un registro de cada respuesta:
 * { ruta, cuerpo (bytes del cuerpo), total (cabeceras + cuerpo), sw (la pidió el service worker), estado }.
 * Con pages=true se porta como GitHub Pages: gzip en lo comprimible, ETag con
 * respuesta 304 si no cambió y Cache-Control: max-age=600.
 */
async function levantarServidorMedido({ pages = false } = {}) {
  const servidor = crearServidor();
  const registro = [];
  servidor.prependListener('request', (req, res) => {
    const enSocket = req.socket.bytesWritten;
    const entrada = {
      ruta: (req.url || '/').split('?')[0],
      cuerpo: 0,
      total: 0,
      estado: 0,
      sw: req.headers['service-worker'] === 'script' || /\/sw\.js$/.test(req.headers.referer || ''),
    };
    const writeHead = res.writeHead;
    const end = res.end;
    let pendiente = null;
    res.writeHead = function (estado, cabeceras) {
      pendiente = { estado, cabeceras: { ...(cabeceras || {}) } };
      return this;
    };
    res.end = function (cuerpo, ...resto) {
      if (pendiente) {
        let { estado, cabeceras } = pendiente;
        pendiente = null;
        if (pages && estado === 200 && cuerpo) {
          const etiqueta = `W/"${createHash('sha1').update(cuerpo).digest('hex').slice(0, 16)}"`;
          cabeceras['Cache-Control'] = 'max-age=600';
          cabeceras.ETag = etiqueta;
          if (req.headers['if-none-match'] === etiqueta) {
            estado = 304;
            cuerpo = undefined;
            delete cabeceras['Content-Length'];
          } else if (/\bgzip\b/.test(req.headers['accept-encoding'] || '') && COMPRIMIBLE.test(cabeceras['Content-Type'] || '')) {
            cuerpo = gzipSync(cuerpo);
            cabeceras['Content-Encoding'] = 'gzip';
            cabeceras['Content-Length'] = cuerpo.length;
            cabeceras.Vary = 'Accept-Encoding';
          }
        }
        entrada.estado = estado;
        entrada.cuerpo = Number(cabeceras['Content-Length']) || 0;
        writeHead.call(this, estado, cabeceras);
      }
      return end.call(this, cuerpo, ...resto);
    };
    res.on('finish', () => {
      entrada.total = Math.max(req.socket.bytesWritten - enSocket, entrada.cuerpo);
      registro.push(entrada);
    });
  });
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  return {
    url: `http://127.0.0.1:${servidor.address().port}`,
    registro,
    limpiar: () => registro.splice(0),
    cerrar: () => new Promise((r) => servidor.close(r)),
  };
}

/* ------------------------------------------------------------------ */
/* Navegador (y red del service worker con una conexión CDP propia)    */
/* ------------------------------------------------------------------ */

/**
 * Se adjunta a cada service worker que nace (protocolo "flatten", que la sesión de
 * Playwright no expone) y le aplica la red de `control.red` antes de que arranque.
 */
async function controlarServiceWorkers(puerto) {
  if (typeof WebSocket !== 'function') throw new Error('Node sin WebSocket');
  let info = null;
  for (let i = 0; i < 20 && !info; i++) {
    info = await fetch(`http://127.0.0.1:${puerto}/json/version`)
      .then((r) => r.json())
      .catch(() => null);
    if (!info) await espera(150);
  }
  if (!info) throw new Error('el navegador no abrió el puerto de depuración');
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((ok, mal) => {
    ws.onopen = ok;
    ws.onerror = () => mal(new Error('no se pudo conectar por CDP'));
  });
  let id = 0;
  const pendientes = new Map();
  const enviar = (method, params = {}, sessionId) =>
    new Promise((ok, mal) => {
      id += 1;
      pendientes.set(id, { ok, mal });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  const control = { red: null, adjuntos: 0, cerrar: () => ws.close() };
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id) {
      const p = pendientes.get(msg.id);
      pendientes.delete(msg.id);
      if (p) (msg.error ? p.mal(new Error(msg.error.message)) : p.ok(msg.result));
      return;
    }
    if (msg.method !== 'Target.attachedToTarget') return;
    const { sessionId, waitingForDebugger } = msg.params;
    control.adjuntos += 1;
    const red = control.red;
    (async () => {
      try {
        if (red) {
          await enviar('Network.enable', {}, sessionId);
          await enviar('Network.emulateNetworkConditions', { offline: false, ...red }, sessionId);
        }
      } catch {
        /* el service worker ya terminó */
      } finally {
        if (waitingForDebugger) enviar('Runtime.runIfWaitingForDebugger', {}, sessionId).catch(() => {});
      }
    })();
  };
  await enviar('Target.setAutoAttach', {
    autoAttach: true,
    waitForDebuggerOnStart: true,
    flatten: true,
    filter: [{ type: 'service_worker', exclude: false }, { exclude: true }],
  });
  return control;
}

async function abrirNavegadorMedible() {
  const { chromium } = require('playwright');
  const puerto = await puertoLibre();
  const navegador = await chromium.launch({ args: [`--remote-debugging-port=${puerto}`] });
  let sw = null;
  try {
    sw = await controlarServiceWorkers(puerto);
  } catch (error) {
    console.warn(`⚠ El service worker no se limitará (${error.message}): "lista sin internet" saldrá optimista.`);
  }
  return {
    navegador,
    redDelServiceWorker: (red) => {
      if (sw) sw.red = red;
    },
    cerrar: async () => {
      sw?.cerrar();
      await navegador.close();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Instrumentación dentro de la página (se inyecta antes que la app)   */
/* ------------------------------------------------------------------ */

function instrumentar() {
  const P = (window.__rend = { marcas: {}, largas: [], eventos: [], storage: [], vigilados: [], ultimaMutacion: 0, renders: 0 });
  const observar = (tipo, fn, extra = {}) => {
    try {
      new PerformanceObserver((lista) => lista.getEntries().forEach(fn)).observe({ type: tipo, buffered: true, ...extra });
    } catch {
      /* no disponible */
    }
  };
  observar('longtask', (e) => P.largas.push({ inicio: e.startTime, duracion: e.duration }));
  observar('event', (e) => P.eventos.push({ nombre: e.name, inicio: e.startTime, duracion: e.duration }), { durationThreshold: 16 });

  /** Llama a fn(t) cuando el cuadro con los cambios actuales ya se pintó. */
  P.despuesDePintar = (fn) =>
    requestAnimationFrame(() => {
      const canal = new MessageChannel();
      canal.port1.onmessage = () => fn(performance.now());
      canal.port2.postMessage(null);
    });

  const aFuncion = (fuente) => new Function(`return (${fuente})`)();

  function revisarMedicion() {
    const m = P.medicion;
    if (!m || m.inicio == null) return;
    for (let i = m.pendientes.length - 1; i >= 0; i--) {
      const [nombre, predicado] = m.pendientes[i];
      let cumple = false;
      try {
        cumple = Boolean(predicado());
      } catch {
        cumple = false;
      }
      if (!cumple) continue;
      m.pendientes.splice(i, 1);
      const marca = (m.marcas[nombre] = { dom: performance.now(), pintado: null });
      P.despuesDePintar((t) => {
        marca.pintado = t;
        if (!m.pendientes.length && Object.values(m.marcas).every((x) => x.pintado != null)) {
          m.completa = true;
          m.quitar();
        }
      });
    }
  }

  function revisar() {
    P.ultimaMutacion = performance.now();
    const tabla = document.querySelector('table');
    if (tabla && tabla !== P.tabla) {
      P.tabla = tabla;
      P.renders += 1;
    }
    for (let i = P.vigilados.length - 1; i >= 0; i--) {
      const [nombre, predicado] = P.vigilados[i];
      let cumple = false;
      try {
        cumple = Boolean(predicado());
      } catch {
        cumple = false;
      }
      if (!cumple) continue;
      P.vigilados.splice(i, 1);
      P.marcas[nombre] = performance.now();
      P.despuesDePintar((t) => {
        P.marcas[`${nombre}Pintado`] = t;
      });
    }
    revisarMedicion();
  }
  new MutationObserver(revisar).observe(document, { childList: true, subtree: true, characterData: true, attributes: true });

  /** Registra cuándo se cumple por primera vez `fuente` (y cuándo se pintó: `${nombre}Pintado`). */
  P.vigilar = (nombre, fuente) => {
    P.vigilados.push([nombre, aFuncion(fuente)]);
    revisar();
  };

  /** Prepara la medición de una interacción: empieza con el siguiente evento de entrada. */
  P.preparar = (fuentes) => {
    P.medicion?.quitar?.();
    const control = new AbortController();
    const m = { inicio: null, marcas: {}, completa: false, pendientes: Object.entries(fuentes).map(([k, f]) => [k, aFuncion(f)]) };
    for (const [nombre, predicado] of m.pendientes) {
      if (predicado()) throw new Error(`«${nombre}» ya se cumplía antes de la acción`);
    }
    // Empieza con el evento que dispara la acción (click o keydown), como INP:
    // no cuenta el tiempo que el dedo está apoyado antes de soltar.
    const alEntrar = (e) => {
      if (m.inicio != null) return;
      m.inicio = e.timeStamp;
      queueMicrotask(revisarMedicion);
    };
    for (const tipo of ['keydown', 'click']) {
      addEventListener(tipo, alEntrar, { capture: true, signal: control.signal });
    }
    m.quitar = () => control.abort();
    P.medicion = m;
  };

  P.resultado = () => {
    const m = P.medicion;
    const salida = {};
    let fin = m.inicio;
    for (const [nombre, v] of Object.entries(m.marcas)) {
      salida[nombre] = v.pintado - m.inicio;
      salida[`${nombre}DOM`] = v.dom - m.inicio;
      fin = Math.max(fin, v.pintado);
    }
    const eventos = P.eventos.filter((e) => e.inicio >= m.inicio - 1 && e.inicio <= fin);
    salida.inp = eventos.length ? Math.max(...eventos.map((e) => e.duracion)) : 0;
    salida.tareasLargas = P.largas.filter((l) => l.inicio + l.duracion >= m.inicio && l.inicio <= fin).map((l) => l.duracion);
    return salida;
  };

  addEventListener(
    'storage',
    (e) => {
      if (e.key === 'tecu:servidor:eventos') P.storage.push(performance.now());
    },
    true,
  );
  try {
    navigator.serviceWorker?.ready.then(() => {
      P.marcas.swListo = performance.now();
    });
  } catch {
    /* documento sin service worker (about:blank) */
  }
  if (/vista=docente/.test(location.search)) {
    P.vigilar('mapa', "() => document.querySelectorAll('table tbody tr').length >= 28");
  } else if (!/vista=/.test(location.search)) {
    P.vigilar('hola', "() => /¡Hola,/.test(document.querySelector('h1')?.textContent || '')");
  }
}

/** Todo lo de la carga: marcas, tareas largas, pintado y Resource Timing. */
function recolectarCarga() {
  const P = window.__rend;
  const pintura = {};
  for (const e of performance.getEntriesByType('paint')) pintura[e.name] = e.startTime;
  const n = performance.getEntriesByType('navigation')[0];
  return {
    marcas: P.marcas,
    largas: P.largas,
    pintura,
    nav: n ? { url: n.name, transfer: n.transferSize, fin: n.responseEnd, sw: n.workerStart > 0 } : null,
    recursos: performance
      .getEntriesByType('resource')
      .map((r) => ({ url: r.name, transfer: r.transferSize, fin: r.responseEnd, sw: r.workerStart > 0 })),
  };
}

/** TTI simplificado: desde `desde`, se extiende con cada tarea larga que empiece antes de `ventana` ms de calma. */
function calcularInteractivo(desde, largas, ventana = VENTANA_QUIETA) {
  let t = desde;
  for (const l of [...largas].sort((a, b) => a.inicio - b.inicio)) {
    const fin = l.inicio + l.duracion;
    if (fin <= t) continue;
    if (l.inicio <= t + ventana) t = fin;
    else break;
  }
  return t;
}

async function esperarMarca(p, nombre, ms = 60000) {
  const h = await p.waitForFunction((n) => window.__rend?.marcas?.[n], nombre, { timeout: ms, polling: 100 });
  return h.jsonValue();
}

/** Espera a que pase la ventana de calma después de `desde` (para calcular "interactivo"). */
async function esperarQuietud(p, desde = 'holaPintado', ms = 60000) {
  await p.waitForFunction(
    ([marca, ventana]) => {
      const P = window.__rend;
      let t = P.marcas[marca];
      if (!t) return false;
      for (const l of [...P.largas].sort((a, b) => a.inicio - b.inicio)) {
        const fin = l.inicio + l.duracion;
        if (fin <= t) continue;
        if (l.inicio <= t + ventana) t = fin;
        else break;
      }
      return performance.now() >= t + ventana;
    },
    [desde, VENTANA_QUIETA],
    { timeout: ms, polling: 200 },
  );
}

/** Espera a que la página se quede quieta (sin cambios en el DOM ni tareas largas) `ms` milisegundos. */
async function esperarCalma(p, ms = 700, max = 15000) {
  await p
    .waitForFunction(
      (v) => {
        const P = window.__rend;
        const ultimaLarga = P.largas.reduce((m, l) => Math.max(m, l.inicio + l.duracion), 0);
        return performance.now() - Math.max(P.ultimaMutacion, ultimaLarga) >= v;
      },
      ms,
      { timeout: max, polling: 100 },
    )
    .catch(() => {});
}

/**
 * Mide una interacción: desde el evento de entrada hasta que cada predicado se cumple
 * y ese cuadro ya está pintado. Los predicados son funciones (en texto) para la página.
 */
async function medirInteraccion(p, accion, predicados, ms = 30000) {
  const fuentes = Object.fromEntries(Object.entries(predicados).map(([k, f]) => [k, String(f)]));
  await p.evaluate((f) => window.__rend.preparar(f), fuentes);
  await accion();
  await p.waitForFunction(() => window.__rend.medicion?.completa, null, { timeout: ms, polling: 50 });
  await p.waitForTimeout(150); // Event Timing entrega sus entradas después de pintar
  return p.evaluate(() => window.__rend.resultado());
}

async function metricasCDP(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
}

async function memoria(cdp) {
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  const heap = await cdp.send('Runtime.getHeapUsage');
  const m = await metricasCDP(cdp);
  return {
    heapMB: heap.usedSize / 1048576,
    heapTotalMB: heap.totalSize / 1048576,
    nodos: m.Nodes,
    escuchas: m.JSEventListeners,
  };
}

async function nuevaPagina(nav, opciones) {
  const ctx = await nav.navegador.newContext(opciones);
  await ctx.addInitScript(instrumentar);
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  return { ctx, p, cdp, errores };
}

/** Abre la vista de Ana sin limitar nada y espera a que el service worker la guarde. */
async function abrirAnaLista(p, servidor) {
  await p.goto(`${servidor.url}/?alumno=ana`);
  await esperarMarca(p, 'holaPintado', 60000);
  await esperarMarca(p, 'swListo', 60000);
  await esperarCalma(p);
}

/* ------------------------------------------------------------------ */
/* 1. Primera visita                                                    */
/* ------------------------------------------------------------------ */

async function primeraVisita(nav, servidor, { red, cpu, swListo }) {
  servidor.limpiar();
  nav.redDelServiceWorker(REDES[red]);
  const { ctx, p, cdp, errores } = await nuevaPagina(nav, CEL);
  try {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...REDES[red] });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await p.goto(`${servidor.url}/?alumno=ana`, { waitUntil: 'commit', timeout: 120000 });
    await esperarMarca(p, 'holaPintado', 180000);
    await esperarQuietud(p);
    if (swListo) await esperarMarca(p, 'swListo', 300000);
    const d = await p.evaluate(recolectarCarga);
    const interactivo = calcularInteractivo(d.marcas.holaPintado, d.largas);
    const hasta = [d.nav, ...d.recursos].filter((r) => r && r.fin <= interactivo);
    const pagina = servidor.registro.filter((r) => !r.sw);
    const delSW = servidor.registro.filter((r) => r.sw);
    const kb = (lista, campo = 'total') => lista.reduce((s, r) => s + (r[campo] || 0), 0) / 1024;
    return {
      primerPintado: d.pintura['first-contentful-paint'],
      hola: d.marcas.holaPintado,
      interactivo,
      listaSinInternet: swListo ? d.marcas.swListo : NaN,
      hastaInteractivoKB: hasta.reduce((s, r) => s + (r.transfer || 0), 0) / 1024,
      solicitudesHastaInteractivo: hasta.length,
      paginaKB: kb(pagina),
      solicitudesPagina: pagina.length,
      serviceWorkerKB: swListo ? kb(delSW) : NaN,
      solicitudesServiceWorker: swListo ? delSW.length : NaN,
      totalKB: swListo ? kb(servidor.registro) : NaN,
      solicitudesTotal: swListo ? servidor.registro.length : NaN,
      tareaMasLarga: maximo(d.largas.filter((l) => l.inicio <= interactivo).map((l) => l.duracion)),
      archivos: servidor.registro.map((r) => ({ ruta: r.ruta, kb: r.cuerpo / 1024, sw: r.sw })),
      errores,
    };
  } finally {
    nav.redDelServiceWorker(null);
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ */
/* 2. Segunda visita en modo avión                                      */
/* ------------------------------------------------------------------ */

async function segundaVisita(nav, servidor, { cpu = 6 } = {}) {
  const { ctx, p, errores } = await nuevaPagina(nav, CEL);
  try {
    await abrirAnaLista(p, servidor);
    await p.waitForFunction(() => navigator.serviceWorker.controller != null, null, { timeout: 30000 });
    await p.close();
    await ctx.setOffline(true);
    // Un "reabrir la app" de verdad: pestaña nueva, sin red, CPU lenta.
    const p2 = await ctx.newPage();
    p2.on('pageerror', (e) => errores.push(e.message));
    const cdp2 = await ctx.newCDPSession(p2);
    await cdp2.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    const antes = servidor.registro.length;
    await p2.goto(`${servidor.url}/?alumno=ana`, { waitUntil: 'commit' });
    await esperarMarca(p2, 'holaPintado', 60000);
    await esperarQuietud(p2);
    const d = await p2.evaluate(recolectarCarga);
    return {
      primerPintado: d.pintura['first-contentful-paint'],
      hola: d.marcas.holaPintado,
      interactivo: calcularInteractivo(d.marcas.holaPintado, d.largas),
      solicitudes: d.recursos.length + 1,
      desdeServiceWorker: d.recursos.filter((r) => r.sw).length + (d.nav?.sw ? 1 : 0),
      alServidor: servidor.registro.length - antes,
      tareaMasLarga: maximo(d.largas.map((l) => l.duracion)),
      errores,
    };
  } finally {
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ */
/* 3. Interacción con CPU ×6                                            */
/* ------------------------------------------------------------------ */

const clic = (p, selector) => () => p.locator(selector).first().click();

async function interaccion(nav, servidor, { cpu = 6 } = {}) {
  const { ctx, p, cdp, errores } = await nuevaPagina(nav, CEL);
  try {
    await abrirAnaLista(p, servidor);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await esperarCalma(p);
    const r = { agregar: [], revisar: [], siguiente: [], inp: [] };
    r.empezar = await medirInteraccion(p, clic(p, '[data-act="aprender"]'), {
      cuaderno: "() => !!document.querySelector('.cuaderno__campo')",
    });
    for (let i = 0; i < GUION_ANA.length; i++) {
      await esperarCalma(p);
      const campo = p.locator('.cuaderno__campo').first();
      for (const renglon of GUION_ANA[i]) {
        await campo.fill(renglon);
        const n = await p.locator('.cuaderno__renglon').count();
        const m = await medirInteraccion(p, () => campo.press('Enter'), {
          renglon: `() => document.querySelectorAll('.cuaderno__renglon').length > ${n}`,
        });
        r.agregar.push(m.renglon);
        r.inp.push(m.inp);
      }
      await esperarCalma(p);
      const rv = await medirInteraccion(p, clic(p, '[data-act="revisar"]'), {
        diagnostico: "() => !!document.querySelector('.cuaderno__resultado .diagnostico')",
        listo: '() => !!document.querySelector(\'[data-act="siguienteDiag"]\')',
      });
      r.revisar.push(rv);
      r.inp.push(rv.inp);
      await esperarCalma(p);
      const ultimo = i === GUION_ANA.length - 1;
      const sg = await medirInteraccion(
        p,
        clic(p, '[data-act="siguienteDiag"]'),
        ultimo
          ? { listo: "() => /resultado/i.test(document.querySelector('h1')?.textContent || '')" }
          : { listo: "() => !!document.querySelector('.cuaderno__campo') && !document.querySelector('.cuaderno__renglon')" },
      );
      if (ultimo) r.resultado = sg.listo;
      else r.siguiente.push(sg.listo);
      r.inp.push(sg.inp);
    }
    await esperarCalma(p);
    r.empezarRuta = (
      await medirInteraccion(p, clic(p, '[data-act="empezarRuta"]'), {
        listo: '() => !!document.querySelector(\'[data-act="elegirOpcion"]\')',
      })
    ).listo;
    // Elige opciones hasta acertar (no se mide: depende de cuál sea la correcta).
    for (let k = 0; k < 6 && !(await p.locator('[data-act="siguienteActividad"]').count()); k++) {
      await p.locator('[data-act="elegirOpcion"]:not([aria-disabled="true"])').first().click();
      await esperarCalma(p, 300);
    }
    await esperarCalma(p);
    const bz = await medirInteraccion(p, clic(p, '[data-act="siguienteActividad"]'), {
      balanza: "() => !!document.querySelector('.balanza__svg, .balanza--aviso')",
    });
    r.balanza = bz.balanza;
    r.inp.push(bz.inp);
    await esperarCalma(p);
    const ch = await medirInteraccion(
      p,
      () => p.locator('.nav-inferior').getByRole('button', { name: /tecu/i }).first().click(),
      { chat: "() => /Pregúntale a Tecu/.test(document.querySelector('h1')?.textContent || '')" },
    );
    r.chat = ch.chat;
    r.inp.push(ch.inp);
    return {
      empezar: r.empezar.cuaderno,
      agregar: maximo(r.agregar),
      revisarDiagnostico: maximo(r.revisar.map((x) => x.diagnostico)),
      revisar: maximo(r.revisar.map((x) => x.listo)),
      revisarPrimero: r.revisar[0]?.listo,
      revisarSiguientes: maximo(r.revisar.slice(1).map((x) => x.listo)),
      revisarPorEjercicio: r.revisar.map((x) => Math.round(x.listo)),
      siguiente: maximo(r.siguiente),
      verResultado: r.resultado,
      empezarRuta: r.empezarRuta,
      balanza: r.balanza,
      chat: r.chat,
      inp: maximo(r.inp),
      errores,
    };
  } finally {
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ */
/* 3b. Diagnóstico completo reproducido + ruta completa + memoria       */
/* ------------------------------------------------------------------ */

function leerProgreso(p) {
  return p.evaluate(() => {
    try {
      const prog = JSON.parse(localStorage.getItem('tecu:dispositivo:ana:progreso') || 'null');
      return {
        dominado: Boolean(prog?.dominado),
        firma: JSON.stringify([prog?.dominado, prog?.ruta?.actividad, prog?.ruta?.practica?.indice, prog?.ruta?.empezada]),
      };
    } catch {
      return { dominado: false, firma: '' };
    }
  });
}

/**
 * Completa la ruta con la API de control (avanzarRuta), una actividad a la vez.
 * Entre comando y comando espera 2.6 s de calma: la vista hace pausas de lectura
 * de 2.2 s dentro de cada actividad y no conviene encolar el siguiente antes.
 */
async function completarRuta(p, maxPasos = 10) {
  for (let i = 0; i < maxPasos; i++) {
    const antes = await leerProgreso(p);
    if (antes.dominado) return true;
    await p.evaluate(() => window.postMessage({ tecu: 'control', cmd: 'avanzarRuta' }, location.origin));
    await p
      .waitForFunction(
        (firma) => {
          try {
            const prog = JSON.parse(localStorage.getItem('tecu:dispositivo:ana:progreso') || 'null');
            const ahora = JSON.stringify([prog?.dominado, prog?.ruta?.actividad, prog?.ruta?.practica?.indice, prog?.ruta?.empezada]);
            return ahora !== firma;
          } catch {
            return false;
          }
        },
        antes.firma,
        { timeout: 90000, polling: 250 },
      )
      .catch(() => {});
    await esperarCalma(p, 2600, 120000);
  }
  return (await leerProgreso(p)).dominado;
}

async function reproduccion(nav, servidor, { cpu = 6 } = {}) {
  const { ctx, p, cdp, errores } = await nuevaPagina(nav, { ...CEL, reducedMotion: 'no-preference' });
  try {
    await abrirAnaLista(p, servidor);
    await cdp.send('Performance.enable');
    const memInicio = await memoria(cdp);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await esperarCalma(p);
    const antes = await metricasCDP(cdp);
    const t0 = await p.evaluate(() => {
      window.__rend.vigilar('resultado', "() => /resultado/i.test(document.querySelector('h1')?.textContent || '')");
      return performance.now();
    });
    await p.evaluate(
      (items) => window.postMessage({ tecu: 'control', cmd: 'reproducirDiagnostico', items, rapido: true }, location.origin),
      GUION_ANA,
    );
    await esperarMarca(p, 'resultadoPintado', 240000);
    const despues = await metricasCDP(cdp);
    const d = await p.evaluate(() => ({ fin: window.__rend.marcas.resultadoPintado, largas: window.__rend.largas }));
    const largas = d.largas.filter((l) => l.inicio >= t0 && l.inicio <= d.fin).map((l) => l.duracion);
    const diagnostico = {
      duracion: d.fin - t0,
      cpuOcupado: (despues.TaskDuration - antes.TaskDuration) * 1000,
      script: (despues.ScriptDuration - antes.ScriptDuration) * 1000,
      tareaMasLarga: maximo(largas),
      tareasLargas: largas.length,
    };
    const dominado = await completarRuta(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const memFin = await memoria(cdp);
    return { diagnostico, dominado, memInicio, memFin, errores };
  } finally {
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ */
/* 4. Panel docente con CPU ×4                                          */
/* ------------------------------------------------------------------ */

async function panelDocente(nav, servidor, { cpu = 4 } = {}) {
  const { ctx, p, cdp, errores } = await nuevaPagina(nav, LAPTOP);
  try {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await p.goto(`${servidor.url}/?vista=docente`, { waitUntil: 'commit' });
    const mapa = await esperarMarca(p, 'mapaPintado', 120000);
    await esperarCalma(p, 1000);
    const largasCarga = await p.evaluate(() => window.__rend.largas.map((l) => l.duracion));
    // Desglose: generar el grupo y la analítica, por separado (mismo CPU ×4).
    const desglose = await p.evaluate(async () => {
      try {
        const { cargarPaquete } = await import('/js/data/paquete.js');
        const { generarGrupo } = await import('/js/data/grupo.js');
        const A = await import('/js/data/analitica.js');
        const { pack } = await cargarPaquete();
        const ahora = Date.now();
        const t0 = performance.now();
        const grupo = generarGrupo({ pack, ahora });
        const t1 = performance.now();
        const resumenes = A.resumirAlumnos(grupo.eventos, { ahora });
        const t2 = performance.now();
        A.resumirGrupo(resumenes);
        A.aQuienLlamar(resumenes, pack, { ahora });
        A.gruposDeRefuerzo(resumenes, pack);
        const t3 = performance.now();
        return { generarGrupo: t1 - t0, resumirAlumnos: t2 - t1, llamarYRefuerzo: t3 - t2, eventos: grupo.eventos.length };
      } catch (error) {
        return { error: String(error) };
      }
    });
    await esperarCalma(p, 500);

    // En vivo: un celular (sin limitar) hace el diagnóstico y sincroniza solo.
    const cel = await ctx.newPage();
    cel.on('pageerror', (e) => errores.push(`celular: ${e.message}`));
    await cel.setViewportSize({ width: 360, height: 740 });
    await cel.goto(`${servidor.url}/?alumno=ana`);
    await esperarMarca(cel, 'holaPintado', 60000);
    await esperarCalma(p, 500);
    const t0 = await p.evaluate(() => {
      window.__rend.vigilar('ana', "() => [...document.querySelectorAll('table tbody tr')].some((tr) => /\\bAna\\b/.test(tr.textContent))");
      window.__rend.renders = 0;
      return performance.now();
    });
    await cel.evaluate(
      (items) => window.postMessage({ tecu: 'control', cmd: 'reproducirDiagnostico', items, rapido: true }, location.origin),
      GUION_ANA,
    );
    await esperarMarca(p, 'anaPintado', 120000);
    await cel.waitForFunction(() => /resultado/i.test(document.querySelector('h1')?.textContent || ''), null, { timeout: 120000 });
    await espera(2500); // última sincronización (0.7 s) + agrupación del panel
    await esperarCalma(p, 1000);
    const d = await p.evaluate(() => ({ storage: window.__rend.storage, marcas: window.__rend.marcas, largas: window.__rend.largas, renders: window.__rend.renders }));
    const primera = d.storage.find((t) => t >= t0);
    const durante = d.largas.filter((l) => l.inicio >= (primera ?? t0)).map((l) => l.duracion);
    return {
      mapa,
      tareaMasLargaCarga: maximo(largasCarga),
      desglose,
      enVivo: primera != null ? d.marcas.anaPintado - primera : NaN,
      rendersDuranteSync: d.renders,
      actualizacionMasLarga: maximo(durante),
      tiempoOcupadoDuranteSync: durante.reduce((s, x) => s + x, 0),
      errores,
    };
  } finally {
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ */
/* Corrida                                                              */
/* ------------------------------------------------------------------ */

/** Corre `fn` N veces; guarda cada resultado (o el error) para sacar medianas. */
async function repetir(nombre, n, fn) {
  const corridas = [];
  for (let i = 0; i < n; i++) {
    const inicio = Date.now();
    try {
      corridas.push(await fn(i));
      console.log(`  ✓ ${nombre} (${i + 1}/${n}) en ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
    } catch (error) {
      corridas.push({ error: error.message.split('\n')[0] });
      console.log(`  ✗ ${nombre} (${i + 1}/${n}): ${error.message.split('\n')[0]}`);
    }
  }
  return corridas;
}

const medianaDe = (corridas, campo) => mediana(corridas.map((c) => c?.[campo]));

function pesoPorTipo(archivos) {
  const tipos = {};
  for (const a of archivos) {
    const t = tipoDeArchivo(a.ruta);
    tipos[t] ??= { pagina: 0, sw: 0 };
    tipos[t][a.sw ? 'sw' : 'pagina'] += a.kb;
  }
  return tipos;
}

async function principal() {
  const inicio = Date.now();
  const nav = await abrirNavegadorMedible();
  const crudo = await levantarServidorMedido();
  const pages = await levantarServidorMedido({ pages: true });
  const valores = {}; // clave del presupuesto → mediana
  const detalle = { corridas: CORRIDAS, maquina: { cpu: cpus()[0]?.model, nucleos: cpus().length, carga: loadavg() }, chromium: nav.navegador.version() };
  const todosLosErrores = [];
  console.log(`Chromium ${detalle.chromium} · ${detalle.maquina.nucleos} núcleos (${detalle.maquina.cpu}) · carga ${loadavg().map((x) => x.toFixed(1)).join(' ')}`);
  console.log(`Corridas por medición: ${CORRIDAS}\n`);
  try {
    if (toca('primera')) {
      detalle.primera = {};
      for (const conf of PRIMERAS) {
        const modo = conf.pages ? 'pages' : 'crudo';
        const nombre = `Primera visita · ${conf.red} · CPU ×${conf.cpu} · ${MODOS[conf.pages ? 'pages' : 'crudo']}`;
        const corridas = await repetir(nombre, CORRIDAS, () => primeraVisita(nav, conf.pages ? pages : crudo, conf));
        const clave = `primera|${conf.red}|x${conf.cpu}|${modo}`;
        detalle.primera[clave] = corridas;
        for (const campo of ['primerPintado', 'hola', 'interactivo', 'listaSinInternet', 'hastaInteractivoKB', 'solicitudesHastaInteractivo', 'totalKB', 'solicitudesTotal', 'serviceWorkerKB', 'paginaKB', 'tareaMasLarga']) {
          valores[`${clave}|${campo}`] = medianaDe(corridas, campo);
        }
        if (conf.swListo && conf.red === '3G normal') {
          valores[`peso|${modo}|hastaInteractivoKB`] = valores[`${clave}|hastaInteractivoKB`];
          valores[`peso|${modo}|totalKB`] = valores[`${clave}|totalKB`];
          const muestra = corridas.find((c) => c?.archivos);
          if (muestra) detalle[`pesoPorTipo|${modo}`] = pesoPorTipo(muestra.archivos);
        }
        corridas.forEach((c) => c?.errores?.length && todosLosErrores.push(...c.errores));
      }
    }
    if (toca('segunda')) {
      const corridas = await repetir('Segunda visita · modo avión · CPU ×6', CORRIDAS, () => segundaVisita(nav, crudo));
      detalle.segunda = corridas;
      for (const campo of ['primerPintado', 'hola', 'interactivo', 'alServidor', 'desdeServiceWorker', 'solicitudes']) {
        valores[`segunda|avion|x6|${campo}`] = medianaDe(corridas, campo);
      }
      corridas.forEach((c) => c?.errores?.length && todosLosErrores.push(...c.errores));
    }
    if (toca('interaccion')) {
      const corridas = await repetir('Interacción · CPU ×6', CORRIDAS, () => interaccion(nav, crudo));
      detalle.interaccion = corridas;
      for (const campo of ['empezar', 'agregar', 'revisarDiagnostico', 'revisar', 'revisarPrimero', 'revisarSiguientes', 'siguiente', 'verResultado', 'empezarRuta', 'balanza', 'chat', 'inp']) {
        valores[`interaccion|x6|${campo}`] = medianaDe(corridas, campo);
      }
      corridas.forEach((c) => c?.errores?.length && todosLosErrores.push(...c.errores));
    }
    if (toca('reproduccion')) {
      const corridas = await repetir('Diagnóstico reproducido + ruta completa · CPU ×6', CORRIDAS, () => reproduccion(nav, crudo));
      detalle.reproduccion = corridas;
      for (const campo of ['duracion', 'cpuOcupado', 'script', 'tareaMasLarga', 'tareasLargas']) {
        valores[`reproduccion|x6|${campo}`] = mediana(corridas.map((c) => c?.diagnostico?.[campo]));
      }
      valores['memoria|heapInicioMB'] = mediana(corridas.map((c) => c?.memInicio?.heapMB));
      valores['memoria|heapFinMB'] = mediana(corridas.map((c) => c?.memFin?.heapMB));
      valores['memoria|nodosFin'] = mediana(corridas.map((c) => c?.memFin?.nodos));
      valores['memoria|escuchasFin'] = mediana(corridas.map((c) => c?.memFin?.escuchas));
      valores['memoria|escuchasInicio'] = mediana(corridas.map((c) => c?.memInicio?.escuchas));
      valores['memoria|rutaCompleta'] = corridas.filter((c) => c?.dominado).length;
      corridas.forEach((c) => c?.errores?.length && todosLosErrores.push(...c.errores));
    }
    if (toca('panel')) {
      const corridas = await repetir('Panel docente · CPU ×4', CORRIDAS, () => panelDocente(nav, crudo));
      detalle.panel = corridas;
      for (const campo of ['mapa', 'tareaMasLargaCarga', 'enVivo', 'rendersDuranteSync', 'actualizacionMasLarga', 'tiempoOcupadoDuranteSync']) {
        valores[`panel|x4|${campo}`] = medianaDe(corridas, campo);
      }
      for (const campo of ['generarGrupo', 'resumirAlumnos', 'llamarYRefuerzo']) {
        valores[`panel|x4|${campo}`] = mediana(corridas.map((c) => c?.desglose?.[campo]));
      }
      corridas.forEach((c) => c?.errores?.length && todosLosErrores.push(...c.errores));
    }
  } finally {
    await nav.cerrar();
    await crudo.cerrar();
    await pages.cerrar();
  }

  imprimirReporte(valores, detalle);
  const fallas = revisarPresupuesto(valores);
  if (todosLosErrores.length) {
    console.log(`\n✗ Errores de JavaScript en la página: ${[...new Set(todosLosErrores)].join(' | ')}`);
    fallas.push('errores de JavaScript');
  }
  if (ARGS.json) {
    writeFileSync(ARGS.json, JSON.stringify({ valores, detalle, fallas }, null, 2));
    console.log(`\nResultados completos en ${ARGS.json}`);
  }
  console.log(`\nDuración de la auditoría: ${((Date.now() - inicio) / 60000).toFixed(1)} min`);
  console.log(fallas.length ? `\n✗ ${fallas.length} punto(s) fuera del presupuesto.` : '\n✓ Todo dentro del presupuesto.');
  process.exitCode = fallas.length ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/* Reporte                                                              */
/* ------------------------------------------------------------------ */

function imprimirReporte(v, detalle) {
  const fila = (texto, clave, unidad) => {
    if (!(clave in v)) return;
    console.log(`| ${texto} | ${fmt(v[clave], unidad)} |`);
  };
  console.log(`\n## Resultados (mediana de ${CORRIDAS})\n`);
  if (toca('primera')) {
    console.log('| Primera visita (/?alumno=ana) | Primer pintado | «¡Hola, Ana!» | Interactivo | Lista sin internet | Hasta interactivo | Total con precache |');
    console.log('|---|---|---|---|---|---|---|');
    for (const conf of PRIMERAS) {
      const c = `primera|${conf.red}|x${conf.cpu}|${conf.pages ? 'pages' : 'crudo'}`;
      const total = Number.isFinite(v[`${c}|totalKB`]) ? `${fmt(v[`${c}|totalKB`], 'KB')} · ${v[`${c}|solicitudesTotal`]} sol.` : '—';
      console.log(
        `| ${conf.red} · CPU ×${conf.cpu} · ${MODOS[conf.pages ? 'pages' : 'crudo']} | ${fmt(v[`${c}|primerPintado`], 'ms')} | ${fmt(v[`${c}|hola`], 'ms')} | ` +
          `${fmt(v[`${c}|interactivo`], 'ms')} | ${fmt(v[`${c}|listaSinInternet`], 'ms')} | ` +
          `${fmt(v[`${c}|hastaInteractivoKB`], 'KB')} · ${v[`${c}|solicitudesHastaInteractivo`]} sol. | ${total} |`,
      );
    }
    for (const modo of ['crudo', 'pages']) {
      const tipos = detalle[`pesoPorTipo|${modo}`];
      if (!tipos) continue;
      console.log(`\nPeso por tipo, primera visita (${MODOS[modo]}):\n`);
      console.log('| Tipo | Página | Precache del service worker |\n|---|---|---|');
      for (const [tipo, kb] of Object.entries(tipos).sort((a, b) => b[1].pagina + b[1].sw - (a[1].pagina + a[1].sw))) {
        console.log(`| ${tipo} | ${fmt(kb.pagina, 'KB')} | ${fmt(kb.sw, 'KB')} |`);
      }
    }
  }
  console.log('\n| Medición | Mediana |\n|---|---|');
  fila('Segunda visita, modo avión, CPU ×6: primer pintado', 'segunda|avion|x6|primerPintado', 'ms');
  fila('Segunda visita, modo avión, CPU ×6: interactivo', 'segunda|avion|x6|interactivo', 'ms');
  fila('Segunda visita: solicitudes que llegaron al servidor', 'segunda|avion|x6|alServidor');
  fila('Empezar (inicio → cuaderno), CPU ×6', 'interaccion|x6|empezar', 'ms');
  fila('Agregar renglón (Enter), CPU ×6, peor', 'interaccion|x6|agregar', 'ms');
  fila('Revisar → diagnóstico pintado, CPU ×6, peor de 4', 'interaccion|x6|revisarDiagnostico', 'ms');
  fila('Revisar → pantalla lista, CPU ×6, peor de 4', 'interaccion|x6|revisar', 'ms');
  fila('… el primer Revisar (código aún "frío")', 'interaccion|x6|revisarPrimero', 'ms');
  fila('… los siguientes (peor de 3)', 'interaccion|x6|revisarSiguientes', 'ms');
  fila('Siguiente ejercicio, CPU ×6, peor', 'interaccion|x6|siguiente', 'ms');
  fila('Ver mi resultado, CPU ×6', 'interaccion|x6|verResultado', 'ms');
  fila('Empezar mi ruta, CPU ×6', 'interaccion|x6|empezarRuta', 'ms');
  fila('Montar la balanza, CPU ×6', 'interaccion|x6|balanza', 'ms');
  fila('Abrir el chat, CPU ×6', 'interaccion|x6|chat', 'ms');
  fila('INP (peor evento de las interacciones), CPU ×6', 'interaccion|x6|inp', 'ms');
  fila('Diagnóstico reproducido (rápido, con animación), CPU ×6: duración', 'reproduccion|x6|duracion', 'ms');
  fila('… hilo principal ocupado', 'reproduccion|x6|cpuOcupado', 'ms');
  fila('… tarea más larga', 'reproduccion|x6|tareaMasLarga', 'ms');
  fila('Panel docente, CPU ×4: hasta ver el mapa', 'panel|x4|mapa', 'ms');
  fila('… generar el grupo simulado (28)', 'panel|x4|generarGrupo', 'ms');
  fila('… resumirAlumnos del grupo', 'panel|x4|resumirAlumnos', 'ms');
  fila('… a quién llamar + grupos de refuerzo', 'panel|x4|llamarYRefuerzo', 'ms');
  fila('… tarea más larga de la carga', 'panel|x4|tareaMasLargaCarga', 'ms');
  fila('Panel en vivo: Ana aparece tras la 1.ª subida', 'panel|x4|enVivo', 'ms');
  fila('… repintados del panel durante el diagnóstico de Ana', 'panel|x4|rendersDuranteSync');
  fila('… actualización más larga', 'panel|x4|actualizacionMasLarga', 'ms');
  fila('JS heap al abrir (tras GC)', 'memoria|heapInicioMB', 'MB');
  fila('JS heap al terminar la ruta (tras GC)', 'memoria|heapFinMB', 'MB');
  fila('Nodos del DOM al terminar la ruta', 'memoria|nodosFin');
  fila('Escuchas de eventos al abrir', 'memoria|escuchasInicio');
  fila('Escuchas de eventos al terminar la ruta', 'memoria|escuchasFin');
}

function revisarPresupuesto(v) {
  const fallas = [];
  console.log('\n## Presupuesto\n');
  console.log('| Medición | Mediana | Límite | Estado |\n|---|---|---|---|');
  for (const p of PRESUPUESTO) {
    if (!(p.clave in v)) continue; // bloque no corrido (--solo)
    const valor = v[p.clave];
    const ok = Number.isFinite(valor) && valor <= p.limite;
    if (!ok) fallas.push(p.texto);
    console.log(`| ${p.texto} | ${fmt(valor, p.unidad)} | ${fmt(p.limite, p.unidad)} | ${ok ? 'ok' : Number.isFinite(valor) ? 'FUERA' : 'NO SE PUDO MEDIR'} |`);
  }
  return fallas;
}

principal().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
