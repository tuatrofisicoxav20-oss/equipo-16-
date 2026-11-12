import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import vm from 'node:vm';
import {
  PREFS_POR_DEFECTO,
  leerPreferencias,
  guardarPreferencias,
  aplicarPreferencias,
  alCambiarPreferencias,
} from '../js/services/preferencias.js';
import { crearRed } from '../js/services/red.js';
import { cargarPaquete, formatearKB } from '../js/data/paquete.js';
import { reiniciarTodo } from '../js/data/store.js';

// ---------------------------------------------------------------------------
// Falsos inyectables (nada de globals del navegador)

function crearStorage(datos = new Map(), alCambiar = () => {}) {
  return {
    get length() {
      return datos.size;
    },
    key: (i) => [...datos.keys()][i] ?? null,
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem(clave, valor) {
      const anterior = datos.has(clave) ? datos.get(clave) : null;
      datos.set(clave, String(valor));
      if (anterior !== String(valor)) alCambiar({ key: clave, oldValue: anterior, newValue: String(valor) });
    },
    removeItem(clave) {
      if (!datos.has(clave)) return;
      const anterior = datos.get(clave);
      datos.delete(clave);
      alCambiar({ key: clave, oldValue: anterior, newValue: null });
    },
    clear() {
      datos.clear();
      alCambiar({ key: null, oldValue: null, newValue: null });
    },
  };
}

/** Pestañas del mismo origen: localStorage compartido; 'storage' solo llega a las otras. */
function crearNavegador() {
  const datos = new Map();
  const pestanas = [];
  function abrirPestana({ enLinea = true } = {}) {
    const ventana = new EventTarget();
    ventana.navigator = { onLine: enLinea };
    const pestana = { ventana, documento: crearDocumento() };
    pestana.almacenamiento = crearStorage(datos, (cambio) => {
      for (const otra of pestanas) {
        if (otra === pestana) continue;
        setTimeout(() => {
          const evento = new Event('storage');
          Object.assign(evento, cambio, { storageArea: otra.almacenamiento });
          otra.ventana.dispatchEvent(evento);
        }, 0);
      }
    });
    pestanas.push(pestana);
    return pestana;
  }
  return { datos, abrirPestana };
}

/** `document` mínimo: atributos y classList de <html>. */
function crearDocumento() {
  const atributos = new Map();
  const clases = new Set();
  const documentElement = {
    setAttribute: (nombre, valor) => atributos.set(nombre, String(valor)),
    removeAttribute: (nombre) => atributos.delete(nombre),
    getAttribute: (nombre) => atributos.get(nombre) ?? null,
    hasAttribute: (nombre) => atributos.has(nombre),
    classList: {
      add: (...c) => c.forEach((x) => clases.add(x)),
      remove: (...c) => c.forEach((x) => clases.delete(x)),
      contains: (c) => clases.has(c),
      toggle(c, forzar) {
        const poner = forzar === undefined ? !clases.has(c) : Boolean(forzar);
        if (poner) clases.add(c);
        else clases.delete(c);
        return poner;
      },
    },
  };
  return {
    documentElement,
    /** Foto de lo que importa para el CSS. */
    estado: () => ({ texto: atributos.get('data-texto') ?? null, clases: [...clases].sort() }),
  };
}

const tick = (ms = 5) => new Promise((resolver) => setTimeout(resolver, ms));

const roto = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
  removeItem() {
    throw new Error('SecurityError');
  },
};

function silenciar(metodo, fn) {
  const original = console[metodo];
  console[metodo] = () => {};
  try {
    return fn();
  } finally {
    console[metodo] = original;
  }
}

// ---------------------------------------------------------------------------

describe('Preferencias', () => {
  test('PREFS_POR_DEFECTO coincide con el contrato y no se puede modificar', () => {
    assert.deepEqual(PREFS_POR_DEFECTO, { texto: 'normal', contraste: false, movimiento: 'auto', voz: false });
    assert.ok(Object.isFrozen(PREFS_POR_DEFECTO));
  });

  test('leerPreferencias da los valores por defecto si no hay nada, si el JSON está dañado o si el almacenamiento truena', () => {
    assert.deepEqual(leerPreferencias({ almacenamiento: crearStorage() }), PREFS_POR_DEFECTO);
    const danado = crearStorage();
    danado.setItem('tecu:prefs', '{roto');
    assert.deepEqual(leerPreferencias({ almacenamiento: danado }), PREFS_POR_DEFECTO);
    const lista = crearStorage();
    lista.setItem('tecu:prefs', '[1,2]');
    assert.deepEqual(leerPreferencias({ almacenamiento: lista }), PREFS_POR_DEFECTO);
    assert.deepEqual(leerPreferencias({ almacenamiento: roto }), PREFS_POR_DEFECTO);
    assert.deepEqual(leerPreferencias({ almacenamiento: null }), PREFS_POR_DEFECTO);
    assert.deepEqual(leerPreferencias(), PREFS_POR_DEFECTO, 'sin localStorage (Node)');
  });

  test('leerPreferencias corrige valores inválidos y conserva claves extra', () => {
    const almacenamiento = crearStorage();
    almacenamiento.setItem('tecu:prefs', JSON.stringify({ texto: 'enorme', contraste: 'si', movimiento: 'reducido', voz: true, tema: 'x' }));
    assert.deepEqual(leerPreferencias({ almacenamiento }), {
      texto: 'normal',
      contraste: false,
      movimiento: 'reducido',
      voz: true,
      tema: 'x',
    });
  });

  test('aplicarPreferencias pone data-texto y las clases en <html>; "normal" quita el atributo', () => {
    const doc = crearDocumento();
    aplicarPreferencias({ texto: 'grande', contraste: true, movimiento: 'reducido', voz: false }, doc);
    assert.deepEqual(doc.estado(), { texto: 'grande', clases: ['alto-contraste', 'reducir-movimiento'] });
    aplicarPreferencias({ texto: 'muy-grande', contraste: false, movimiento: 'auto', voz: false }, doc);
    assert.deepEqual(doc.estado(), { texto: 'muy-grande', clases: [] });
    aplicarPreferencias(PREFS_POR_DEFECTO, doc);
    assert.deepEqual(doc.estado(), { texto: null, clases: [] });
    assert.doesNotThrow(() => aplicarPreferencias(PREFS_POR_DEFECTO), 'sin document (Node) no hace nada');
    assert.doesNotThrow(() => aplicarPreferencias(null, doc));
  });

  test('guardarPreferencias mezcla, guarda, aplica, avisa en la misma página y devuelve las prefs completas', () => {
    const almacenamiento = crearStorage();
    const doc = crearDocumento();
    const ventana = new EventTarget();
    const avisos = [];
    alCambiarPreferencias((p) => avisos.push(p), { ventana });

    guardarPreferencias({ texto: 'grande' }, { almacenamiento, doc, ventana });
    const prefs = guardarPreferencias({ contraste: true }, { almacenamiento, doc, ventana });

    const esperado = { texto: 'grande', contraste: true, movimiento: 'auto', voz: false };
    assert.deepEqual(prefs, esperado);
    assert.deepEqual(JSON.parse(almacenamiento.getItem('tecu:prefs')), esperado);
    assert.deepEqual(doc.estado(), { texto: 'grande', clases: ['alto-contraste'] });
    assert.deepEqual(avisos, [{ ...esperado, contraste: false }, esperado]);
  });

  test('guardarPreferencias ignora valores inválidos (se queda lo que había)', () => {
    const almacenamiento = crearStorage();
    guardarPreferencias({ texto: 'muy-grande', movimiento: 'reducido' }, { almacenamiento, doc: null, ventana: null });
    const prefs = guardarPreferencias({ texto: 'gigante', movimiento: 3, voz: 'si' }, { almacenamiento, doc: null, ventana: null });
    assert.deepEqual(prefs, { texto: 'muy-grande', contraste: false, movimiento: 'reducido', voz: false });
  });

  test('si no se puede guardar, igual aplica y avisa (la sesión sigue con el ajuste)', () => {
    const doc = crearDocumento();
    const ventana = new EventTarget();
    const avisos = [];
    alCambiarPreferencias((p) => avisos.push(p.texto), { ventana });
    const prefs = silenciar('warn', () => guardarPreferencias({ texto: 'grande' }, { almacenamiento: roto, doc, ventana }));
    assert.equal(prefs.texto, 'grande');
    assert.equal(doc.estado().texto, 'grande');
    assert.deepEqual(avisos, ['grande']);
  });

  test('alCambiarPreferencias oye a otras pestañas/iframes (storage) y llama fn con UN solo argumento', async () => {
    const navegador = crearNavegador();
    const panel = navegador.abrirPestana();
    const iframe = navegador.abrirPestana();
    const llamadas = [];
    // Igual que main.js: alCambiarPreferencias(aplicarPreferencias) → el 2.º argumento sería `doc`.
    const quitar = alCambiarPreferencias((...args) => llamadas.push(args), { ventana: iframe.ventana });

    guardarPreferencias({ texto: 'muy-grande', movimiento: 'reducido' }, { almacenamiento: panel.almacenamiento, doc: panel.documento, ventana: panel.ventana });
    panel.almacenamiento.setItem('tecu:otra', '1');
    await tick();

    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].length, 1);
    assert.deepEqual(llamadas[0][0], { texto: 'muy-grande', contraste: false, movimiento: 'reducido', voz: false });

    panel.almacenamiento.clear();
    await tick();
    assert.deepEqual(llamadas[1], [PREFS_POR_DEFECTO]);

    quitar();
    guardarPreferencias({ contraste: true }, { almacenamiento: panel.almacenamiento, doc: null, ventana: panel.ventana });
    await tick();
    assert.equal(llamadas.length, 2);
  });

  test('un listener que truena no rompe a guardarPreferencias', () => {
    const ventana = new EventTarget();
    alCambiarPreferencias(() => {
      throw new Error('vista rota');
    }, { ventana });
    assert.doesNotThrow(() =>
      silenciar('error', () => guardarPreferencias({ voz: true }, { almacenamiento: crearStorage(), doc: null, ventana })),
    );
  });

  test('alCambiarPreferencias sin ventana devuelve una función que no hace nada', () => {
    const quitar = alCambiarPreferencias(() => {}, { ventana: null });
    assert.equal(typeof quitar, 'function');
    assert.doesNotThrow(quitar);
  });

  test('lo que guarda el módulo lo aplica igual el script en línea de index.html (sin parpadeo)', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    assert.ok(script && script.includes('tecu:prefs'), 'no encontré el script en línea que lee tecu:prefs');

    const combinaciones = [];
    for (const texto of ['normal', 'grande', 'muy-grande']) {
      for (const contraste of [false, true]) {
        for (const movimiento of ['auto', 'reducido']) combinaciones.push({ texto, contraste, movimiento });
      }
    }
    for (const prefs of combinaciones) {
      const almacenamiento = crearStorage();
      const conModulo = crearDocumento();
      guardarPreferencias(prefs, { almacenamiento, doc: conModulo, ventana: null });
      const alCargar = crearDocumento();
      vm.runInNewContext(script, { localStorage: almacenamiento, document: alCargar });
      assert.deepEqual(alCargar.estado(), conModulo.estado(), JSON.stringify(prefs));
    }
  });
});

describe('Red', () => {
  const redEn = (pestana, alumno = 'ana', extra = {}) =>
    crearRed(alumno, { almacenamiento: pestana.almacenamiento, ventana: pestana.ventana, ...extra });

  test('por defecto: en línea, real y sin simulación', () => {
    const red = redEn(crearNavegador().abrirPestana());
    assert.equal(red.enLinea(), true);
    assert.equal(red.real(), true);
    assert.equal(red.simuladaSinInternet(), false);
    assert.deepEqual(red.estado(), { enLinea: true, real: true, simulada: false });
  });

  test('enLinea() = navigator.onLine && !simulada', () => {
    for (const onLine of [true, false]) {
      for (const simulada of [true, false]) {
        const pestana = crearNavegador().abrirPestana({ enLinea: onLine });
        const red = redEn(pestana);
        red.simular(simulada);
        assert.equal(red.enLinea(), onLine && !simulada, `onLine=${onLine} simulada=${simulada}`);
        assert.equal(red.real(), onLine);
        assert.equal(red.simuladaSinInternet(), simulada);
      }
    }
  });

  test('simular guarda en tecu:red:<alumno> y cada teléfono tiene su propio interruptor', () => {
    const navegador = crearNavegador();
    const pestana = navegador.abrirPestana();
    const ana = redEn(pestana, 'ana');
    const luis = redEn(pestana, 'luis');
    ana.simular(true);
    assert.equal(navegador.datos.get('tecu:red:ana'), 'true');
    assert.equal(ana.enLinea(), false);
    assert.equal(luis.enLinea(), true);
    assert.equal(redEn(navegador.abrirPestana(), 'ana').simuladaSinInternet(), true, 'otra pestaña lee el mismo interruptor');
    ana.simular(false);
    assert.equal(navegador.datos.get('tecu:red:ana'), 'false');
    assert.equal(ana.enLinea(), true);
  });

  test('suscribir avisa con { enLinea, real, simulada } ante online/offline reales', () => {
    const pestana = crearNavegador().abrirPestana();
    const red = redEn(pestana);
    const estados = [];
    red.suscribir((e) => estados.push(e));
    pestana.ventana.navigator.onLine = false;
    pestana.ventana.dispatchEvent(new Event('offline'));
    pestana.ventana.navigator.onLine = true;
    pestana.ventana.dispatchEvent(new Event('online'));
    assert.deepEqual(estados, [
      { enLinea: false, real: false, simulada: false },
      { enLinea: true, real: true, simulada: false },
    ]);
  });

  test('suscribir avisa cuando se mueve el interruptor en esta página (misma u otra instancia)', () => {
    const pestana = crearNavegador().abrirPestana();
    const red = redEn(pestana, 'ana');
    const otraDeAna = redEn(pestana, 'ana');
    const deLuis = redEn(pestana, 'luis');
    const estados = [];
    red.suscribir((e) => estados.push(['ana', e.simulada]));
    deLuis.suscribir((e) => estados.push(['luis', e.simulada]));
    red.simular(true);
    otraDeAna.simular(false);
    assert.deepEqual(estados, [
      ['ana', true],
      ['ana', false],
    ]);
  });

  test('suscribir avisa cuando otra pestaña/iframe mueve el interruptor (storage) y quitar deja de avisar', async () => {
    const navegador = crearNavegador();
    const celular = navegador.abrirPestana();
    const presentacion = navegador.abrirPestana();
    const estados = [];
    const quitar = redEn(celular, 'ana').suscribir((e) => estados.push(e));

    redEn(presentacion, 'luis').simular(true);
    redEn(presentacion, 'ana').simular(true);
    await tick();
    assert.deepEqual(estados, [{ enLinea: false, real: true, simulada: true }]);

    quitar();
    redEn(presentacion, 'ana').simular(false);
    celular.ventana.dispatchEvent(new Event('offline'));
    await tick();
    assert.equal(estados.length, 1);
  });

  test('reiniciarTodo() en otra pestaña regresa el teléfono a "con internet"', async () => {
    const navegador = crearNavegador();
    const celular = navegador.abrirPestana();
    const presentacion = navegador.abrirPestana();
    const red = redEn(celular, 'ana');
    red.simular(true);
    const estados = [];
    red.suscribir((e) => estados.push(e.enLinea));
    reiniciarTodo({ almacenamiento: presentacion.almacenamiento, canal: null });
    await tick();
    assert.equal(red.enLinea(), true);
    assert.ok(estados.includes(true));
  });

  test('si el almacenamiento falla, el interruptor sigue funcionando en esta instancia', () => {
    const ventana = new EventTarget();
    ventana.navigator = { onLine: true };
    const red = crearRed('ana', { almacenamiento: roto, ventana });
    const estados = [];
    red.suscribir((e) => estados.push(e.simulada));
    red.simular(true);
    assert.equal(red.simuladaSinInternet(), true);
    assert.equal(red.enLinea(), false);
    red.simular(false);
    assert.equal(red.enLinea(), true);
    assert.deepEqual(estados, [true, false]);
  });

  test('sin window ni localStorage (Node puro) responde con valores seguros', () => {
    const red = crearRed('ana');
    assert.equal(red.real(), true);
    const estados = [];
    const quitar = red.suscribir((e) => estados.push(e.simulada));
    red.simular(true);
    assert.equal(red.enLinea(), false);
    assert.deepEqual(estados, [true]);
    quitar();
  });

  test('un suscriptor que truena no rompe simular()', () => {
    const red = redEn(crearNavegador().abrirPestana());
    red.suscribir(() => {
      throw new Error('vista rota');
    });
    assert.doesNotThrow(() => silenciar('error', () => red.simular(true)));
    assert.equal(red.simuladaSinInternet(), true);
  });
});

describe('Paquete de contenido', () => {
  const RUTA = new URL('../packs/ecuaciones-1.json', import.meta.url);

  function fetchDesdeDisco(contador = { n: 0 }) {
    return async (url) => {
      contador.n++;
      return new Response(readFileSync(RUTA), { status: 200, headers: { 'content-type': 'application/json' } });
    };
  }

  test('cargarPaquete devuelve el pack y su peso REAL en bytes (el del archivo)', async () => {
    const { pack, bytes, kb } = await cargarPaquete('prueba/real.json', { fetch: fetchDesdeDisco() });
    const tamano = statSync(RUTA).size;
    assert.equal(pack.id, 'ecuaciones-1');
    assert.equal(bytes, tamano);
    assert.equal(kb, Math.round((tamano / 1024) * 10) / 10);
    assert.equal(formatearKB(bytes), `${kb.toFixed(1)} KB`);
  });

  test('sin url usa packs/ecuaciones-1.json de la app (relativo al módulo, no a la página)', async () => {
    const pedidas = [];
    const { pack, bytes } = await cargarPaquete(undefined, {
      fetch: async (url) => {
        pedidas.push(url);
        return new Response(readFileSync(new URL(url)));
      },
    });
    assert.equal(pedidas.length, 1);
    assert.equal(pedidas[0], RUTA.href);
    assert.equal(pack.id, 'ecuaciones-1');
    assert.equal(bytes, statSync(RUTA).size);
  });

  test('cuenta bytes, no caracteres (acentos en UTF-8)', async () => {
    const texto = JSON.stringify({ id: 'x', tema: 'Ecuación con ñ y π' });
    const { bytes, pack } = await cargarPaquete('prueba/utf8.json', { fetch: async () => new Response(texto) });
    assert.equal(bytes, Buffer.byteLength(texto, 'utf8'));
    assert.ok(bytes > texto.length);
    assert.equal(pack.tema, 'Ecuación con ñ y π');
  });

  test('usa la caché en memoria: no vuelve a descargar (ni con llamadas simultáneas)', async () => {
    const contador = { n: 0 };
    const traer = fetchDesdeDisco(contador);
    const [a, b] = await Promise.all([
      cargarPaquete('prueba/cache.json', { fetch: traer }),
      cargarPaquete('prueba/cache.json', { fetch: traer }),
    ]);
    const c = await cargarPaquete('prueba/cache.json', { fetch: traer });
    assert.equal(contador.n, 1);
    assert.equal(a.pack, b.pack);
    assert.equal(a.pack, c.pack);
  });

  test('si falla, rechaza, no queda en caché y se puede reintentar', async () => {
    let intento = 0;
    const traer = async () => {
      intento++;
      if (intento === 1) return new Response('no hay', { status: 404 });
      if (intento === 2) throw new TypeError('Failed to fetch');
      if (intento === 3) return new Response('{roto');
      return new Response('{"id":"ok"}');
    };
    await assert.rejects(cargarPaquete('prueba/falla.json', { fetch: traer }), /404/);
    await assert.rejects(cargarPaquete('prueba/falla.json', { fetch: traer }), /Failed to fetch/);
    await assert.rejects(cargarPaquete('prueba/falla.json', { fetch: traer }), SyntaxError);
    const { pack } = await cargarPaquete('prueba/falla.json', { fetch: traer });
    assert.equal(pack.id, 'ok');
  });

  test('formatearKB usa es-MX, KB de 1024 bytes y un decimal', () => {
    assert.equal(formatearKB(14541), '14.2 KB');
    assert.equal(formatearKB(1024), '1.0 KB');
    assert.equal(formatearKB(512), '0.5 KB');
    assert.equal(formatearKB(1264435), '1,234.8 KB');
    assert.equal(formatearKB(0), '0.0 KB');
    for (const raro of [-5, Number.NaN, undefined, null, 'abc']) assert.equal(formatearKB(raro), '0.0 KB');
  });
});
