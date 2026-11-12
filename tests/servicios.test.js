import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import vm from 'node:vm';
import {
  PREFS_POR_DEFECTO,
  leerPreferencias,
  guardarPreferencias,
  aplicarPreferencias,
  restablecerPreferencias,
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

/** Consulta de medios falsa: `matches` se puede cambiar y avisa a quien escucha 'change'. */
function crearConsulta(inicial = false) {
  const escuchas = new Set();
  let valor = inicial;
  return {
    get matches() {
      return valor;
    },
    addEventListener: (tipo, fn) => tipo === 'change' && escuchas.add(fn),
    removeEventListener: (tipo, fn) => escuchas.delete(fn),
    cambiar(nuevo) {
      valor = nuevo;
      for (const fn of escuchas) fn({ matches: nuevo });
    },
  };
}

/**
 * `document` mínimo: atributos, dataset y classList de <html>, y el meta theme-color.
 * `oscuro` = el sistema está en modo oscuro (prefers-color-scheme).
 */
function crearDocumento({ oscuro = false, conMeta = true } = {}) {
  const atributos = new Map();
  const clases = new Set();
  const kebab = (nombre) => `data-${String(nombre).replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
  const meta = { content: '#000000', setAttribute: (n, v) => n === 'content' && (meta.content = String(v)), getAttribute: (n) => (n === 'content' ? meta.content : null) };
  const sistema = crearConsulta(oscuro);
  const documentElement = {
    setAttribute: (nombre, valor) => atributos.set(nombre, String(valor)),
    removeAttribute: (nombre) => atributos.delete(nombre),
    getAttribute: (nombre) => atributos.get(nombre) ?? null,
    hasAttribute: (nombre) => atributos.has(nombre),
    dataset: new Proxy({}, {
      get: (_, nombre) => atributos.get(kebab(nombre)),
      set: (_, nombre, valor) => (atributos.set(kebab(nombre), String(valor)), true),
      deleteProperty: (_, nombre) => (atributos.delete(kebab(nombre)), true),
    }),
    get className() {
      return [...clases].join(' ');
    },
    set className(valor) {
      clases.clear();
      for (const c of String(valor).split(/\s+/).filter(Boolean)) clases.add(c);
    },
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
    querySelector: (selector) => (conMeta && /meta\[name=["']?theme-color["']?\]/.test(selector) ? meta : null),
    defaultView: { matchMedia: (consulta) => (/prefers-color-scheme:\s*dark/.test(consulta) ? sistema : crearConsulta(false)) },
    sistema,
    /** Foto de lo que importa para el CSS. */
    estado: () => ({
      tema: atributos.get('data-theme') ?? null,
      tamano: atributos.get('data-text') ?? null,
      espaciado: atributos.get('data-spacing') ?? null,
      movimiento: atributos.get('data-motion') ?? null,
      simple: atributos.get('data-simple') ?? null,
      texto: atributos.get('data-texto') ?? null,
      clases: [...clases].sort(),
      color: conMeta ? meta.content : null,
    }),
    /** Solo el contrato anterior (data-texto y clases). */
    anterior: () => ({ texto: atributos.get('data-texto') ?? null, clases: [...clases].sort() }),
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

/** Lo que devuelve leerPreferencias() sin nada guardado: el modelo más los dos derivados. */
const POR_DEFECTO = { ...PREFS_POR_DEFECTO, texto: 'normal', contraste: false };
const CLARO = '#0B2F45';
const OSCURO = '#08141A';

/** Un almacenamiento que siempre falla (cada prueba el suyo: el módulo recuerda la sesión por almacenamiento). */
const crearRoto = () => ({ ...roto });

/**
 * Fragmento canónico para index.html: aplica lo guardado antes del primer pintado.
 * Debe ir en <head>, después de <meta name="theme-color"> y antes de las hojas de estilo.
 */
const SCRIPT_EN_LINEA = `
    // Aplica las preferencias guardadas antes del primer pintado (sin parpadeo).
    // Hace lo mismo que aplicarPreferencias() de js/services/preferencias.js (lo comprueba tests/servicios.test.js).
    (function () {
      var h = document.documentElement, p = {};
      try { p = JSON.parse(localStorage.getItem('tecu:prefs')) || {}; } catch (e) { /* sin almacenamiento o dañado: valores por defecto */ }
      var uno = function (v, lista) { return lista.indexOf(v) >= 0 ? v : lista[0]; };
      var tema = uno(p.tema, ['sistema', 'claro', 'oscuro', 'contraste']);
      var tam = uno(p.tamano, ['md', 'lg', 'xl', 'xxl']);
      // Modelo anterior ({ texto, contraste }): si contradice al nuevo, manda el anterior.
      var texto = { md: 'normal', lg: 'grande', xl: 'muy-grande', xxl: 'muy-grande' };
      if (['normal', 'grande', 'muy-grande'].indexOf(p.texto) >= 0 && p.texto !== texto[tam]) tam = { normal: 'md', grande: 'lg' }[p.texto] || 'xl';
      if (typeof p.contraste === 'boolean' && p.contraste !== (tema === 'contraste')) tema = p.contraste ? 'contraste' : 'sistema';
      var reducir = p.movimiento === 'reducido';
      h.setAttribute('data-theme', { sistema: 'system', claro: 'light', oscuro: 'dark', contraste: 'contrast' }[tema]);
      h.setAttribute('data-text', tam);
      h.setAttribute('data-spacing', p.espaciado === true ? 'wide' : 'normal');
      h.setAttribute('data-motion', reducir ? 'reduce' : 'system');
      h.setAttribute('data-simple', p.simple === true ? 'on' : 'off');
      if (tam !== 'md') h.setAttribute('data-texto', texto[tam]);
      if (tema === 'contraste') h.classList.add('alto-contraste');
      if (reducir) h.classList.add('reducir-movimiento');
      var oscuro = tema === 'oscuro' || (tema === 'sistema' && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', oscuro ? '#08141A' : '#0B2F45');
    })();
`;

/** Corre un script en línea como lo haría el navegador al cargar la página. */
function alCargar(script, almacenamiento, { oscuro = false } = {}) {
  const documento = crearDocumento({ oscuro });
  const global = {
    document: documento,
    localStorage: almacenamiento,
    matchMedia: documento.defaultView.matchMedia,
    location: { search: '', hash: '', pathname: '/', href: 'http://localhost/' },
    navigator: { onLine: true, userAgent: 'prueba' },
    URLSearchParams,
    console,
  };
  global.window = global;
  global.self = global;
  vm.runInNewContext(script, global);
  return documento;
}

/** Todas las combinaciones de lo que se ve en <html>. */
function combinaciones() {
  const lista = [];
  for (const tema of ['sistema', 'claro', 'oscuro', 'contraste']) {
    for (const tamano of ['md', 'lg', 'xl', 'xxl']) {
      for (const espaciado of [false, true]) {
        for (const movimiento of ['auto', 'reducido']) {
          for (const simple of [false, true]) lista.push({ tema, tamano, espaciado, movimiento, simple });
        }
      }
    }
  }
  return lista;
}

describe('Preferencias', () => {
  test('PREFS_POR_DEFECTO coincide con el contrato y no se puede modificar', () => {
    assert.deepEqual(PREFS_POR_DEFECTO, {
      tema: 'sistema',
      tamano: 'md',
      espaciado: false,
      movimiento: 'auto',
      simple: false,
      voz: false,
      ahorro: true,
      soloWifi: true,
      dispositivo: 'auto',
    });
    assert.ok(Object.isFrozen(PREFS_POR_DEFECTO));
  });

  test('leerPreferencias da los valores por defecto (más los derivados texto y contraste) si no hay nada, si el JSON está dañado o si el almacenamiento truena', () => {
    assert.deepEqual(leerPreferencias({ almacenamiento: crearStorage() }), POR_DEFECTO);
    const danado = crearStorage();
    danado.setItem('tecu:prefs', '{roto');
    assert.deepEqual(leerPreferencias({ almacenamiento: danado }), POR_DEFECTO);
    for (const raro of ['[1,2]', '"texto"', '7', 'null', 'true']) {
      const almacenamiento = crearStorage();
      almacenamiento.setItem('tecu:prefs', raro);
      assert.deepEqual(leerPreferencias({ almacenamiento }), POR_DEFECTO, raro);
    }
    assert.deepEqual(leerPreferencias({ almacenamiento: crearRoto() }), POR_DEFECTO);
    assert.deepEqual(leerPreferencias({ almacenamiento: null }), POR_DEFECTO);
    assert.deepEqual(leerPreferencias(), POR_DEFECTO, 'sin localStorage (Node)');
  });

  test('leerPreferencias corrige valores inválidos y conserva claves extra', () => {
    const almacenamiento = crearStorage();
    almacenamiento.setItem(
      'tecu:prefs',
      JSON.stringify({ tema: 'rosa', tamano: 'xxxl', espaciado: 'si', movimiento: 'reducido', simple: 1, voz: true, ahorro: null, soloWifi: false, dispositivo: 'tableta', futuro: 'x' }),
    );
    assert.deepEqual(leerPreferencias({ almacenamiento }), {
      ...POR_DEFECTO,
      movimiento: 'reducido',
      voz: true,
      soloWifi: false,
      futuro: 'x',
    });
  });

  test('lo guardado con el modelo anterior se migra al leer: texto → tamano y contraste → tema', () => {
    const leer = (guardado) => {
      const almacenamiento = crearStorage();
      almacenamiento.setItem('tecu:prefs', JSON.stringify(guardado));
      return leerPreferencias({ almacenamiento });
    };
    assert.deepEqual(leer({ texto: 'grande', contraste: true, movimiento: 'reducido', voz: true }), {
      ...PREFS_POR_DEFECTO,
      tema: 'contraste',
      tamano: 'lg',
      movimiento: 'reducido',
      voz: true,
      texto: 'grande',
      contraste: true,
    });
    assert.equal(leer({ texto: 'muy-grande' }).tamano, 'xl');
    assert.equal(leer({ texto: 'normal', contraste: false }).tamano, 'md');
    assert.equal(leer({ contraste: false }).tema, 'sistema');
    assert.equal(leer({ contraste: true }).tema, 'contraste', 'lo que escribe tests/e2e/accesibilidad.mjs');
    // Valores inválidos del modelo anterior: como si no estuvieran.
    assert.deepEqual(leer({ texto: 'enorme', contraste: 'si' }), POR_DEFECTO);
  });

  test('texto y contraste son derivados: salen de tamano y de tema', () => {
    const almacenamiento = crearStorage();
    const derivados = (parciales) => {
      const { texto, contraste } = guardarPreferencias(parciales, { almacenamiento, doc: null, ventana: null });
      return { texto, contraste };
    };
    assert.deepEqual(derivados({ tamano: 'md', tema: 'claro' }), { texto: 'normal', contraste: false });
    assert.deepEqual(derivados({ tamano: 'lg', tema: 'oscuro' }), { texto: 'grande', contraste: false });
    assert.deepEqual(derivados({ tamano: 'xl', tema: 'contraste' }), { texto: 'muy-grande', contraste: true });
    assert.deepEqual(derivados({ tamano: 'xxl', tema: 'sistema' }), { texto: 'muy-grande', contraste: false });
    // Lo guardado trae los dos vocabularios coherentes (una versión anterior abierta en otra pestaña lee lo mismo).
    const guardado = JSON.parse(almacenamiento.getItem('tecu:prefs'));
    assert.equal(guardado.tamano, 'xxl');
    assert.equal(guardado.texto, 'muy-grande');
    assert.equal(guardado.contraste, false);
    assert.equal(leerPreferencias({ almacenamiento }).tamano, 'xxl', '«muy-grande» guardado junto a xxl no lo baja a xl');
  });

  test('si una versión anterior (otra pestaña) cambió texto o contraste en lo guardado, manda ese cambio', () => {
    const almacenamiento = crearStorage();
    guardarPreferencias({ tema: 'oscuro', tamano: 'xxl' }, { almacenamiento, doc: null, ventana: null });
    // El módulo anterior mezcla sobre lo guardado y solo conoce texto/contraste/movimiento/voz.
    const viejo = (cambios) => almacenamiento.setItem('tecu:prefs', JSON.stringify({ ...JSON.parse(almacenamiento.getItem('tecu:prefs')), ...cambios }));
    viejo({ voz: true });
    assert.deepEqual(
      (({ tema, tamano, voz }) => ({ tema, tamano, voz }))(leerPreferencias({ almacenamiento })),
      { tema: 'oscuro', tamano: 'xxl', voz: true },
      'un cambio que no toca texto ni contraste no altera tema ni tamaño',
    );
    viejo({ contraste: true });
    assert.equal(leerPreferencias({ almacenamiento }).tema, 'contraste');
    viejo({ contraste: false });
    assert.equal(leerPreferencias({ almacenamiento }).tema, 'oscuro', 'al quitar el contraste vuelve el tema que estaba');
    viejo({ texto: 'grande' });
    assert.equal(leerPreferencias({ almacenamiento }).tamano, 'lg');
  });

  test('aplicarPreferencias pone los atributos del diseño unificado y los de antes en <html>', () => {
    const doc = crearDocumento();
    aplicarPreferencias({ tema: 'contraste', tamano: 'lg', espaciado: true, movimiento: 'reducido', simple: true }, doc);
    assert.deepEqual(doc.estado(), {
      tema: 'contrast',
      tamano: 'lg',
      espaciado: 'wide',
      movimiento: 'reduce',
      simple: 'on',
      texto: 'grande',
      clases: ['alto-contraste', 'reducir-movimiento'],
      color: CLARO,
    });
    aplicarPreferencias({ tema: 'oscuro', tamano: 'xxl' }, doc);
    assert.deepEqual(doc.estado(), {
      tema: 'dark',
      tamano: 'xxl',
      espaciado: 'normal',
      movimiento: 'system',
      simple: 'off',
      texto: 'muy-grande',
      clases: [],
      color: OSCURO,
    });
    aplicarPreferencias({ tema: 'claro', tamano: 'xl' }, doc);
    assert.equal(doc.estado().tema, 'light');
    assert.equal(doc.estado().texto, 'muy-grande');
    aplicarPreferencias(PREFS_POR_DEFECTO, doc);
    assert.deepEqual(doc.estado(), {
      tema: 'system',
      tamano: 'md',
      espaciado: 'normal',
      movimiento: 'system',
      simple: 'off',
      texto: null,
      clases: [],
      color: CLARO,
    });
    assert.doesNotThrow(() => aplicarPreferencias(PREFS_POR_DEFECTO), 'sin document (Node) no hace nada');
    assert.doesNotThrow(() => aplicarPreferencias(PREFS_POR_DEFECTO, null));
    assert.doesNotThrow(() => aplicarPreferencias(null, doc));
    assert.doesNotThrow(() => aplicarPreferencias(PREFS_POR_DEFECTO, crearDocumento({ conMeta: false })), 'sin meta theme-color');
  });

  test('aplicarPreferencias acepta el vocabulario anterior: data-texto y las clases como antes; "normal" quita el atributo', () => {
    const doc = crearDocumento();
    aplicarPreferencias({ texto: 'grande', contraste: true, movimiento: 'reducido', voz: false }, doc);
    assert.deepEqual(doc.anterior(), { texto: 'grande', clases: ['alto-contraste', 'reducir-movimiento'] });
    assert.equal(doc.estado().tema, 'contrast');
    assert.equal(doc.estado().tamano, 'lg');
    aplicarPreferencias({ texto: 'muy-grande', contraste: false, movimiento: 'auto', voz: false }, doc);
    assert.deepEqual(doc.anterior(), { texto: 'muy-grande', clases: [] });
    assert.equal(doc.estado().tamano, 'xl');
    aplicarPreferencias({ texto: 'normal', contraste: false, movimiento: 'auto', voz: false }, doc);
    assert.deepEqual(doc.anterior(), { texto: null, clases: [] });
  });

  test('el color de la barra del navegador (theme-color) sigue al tema; con «sistema», al modo oscuro del sistema', () => {
    const claro = crearDocumento({ oscuro: false });
    const oscuro = crearDocumento({ oscuro: true });
    const esperado = { sistema: [CLARO, OSCURO], claro: [CLARO, CLARO], oscuro: [OSCURO, OSCURO], contraste: [CLARO, CLARO] };
    for (const [tema, [enClaro, enOscuro]] of Object.entries(esperado)) {
      aplicarPreferencias({ tema }, claro);
      aplicarPreferencias({ tema }, oscuro);
      assert.equal(claro.estado().color, enClaro, `${tema} con el sistema en claro`);
      assert.equal(oscuro.estado().color, enOscuro, `${tema} con el sistema en oscuro`);
    }
    // El sistema cambia a oscuro mientras la app está abierta.
    aplicarPreferencias({ tema: 'sistema' }, claro);
    claro.sistema.cambiar(true);
    assert.equal(claro.estado().color, OSCURO);
    aplicarPreferencias({ tema: 'claro' }, claro);
    claro.sistema.cambiar(false);
    claro.sistema.cambiar(true);
    assert.equal(claro.estado().color, CLARO, 'con un tema elegido, el sistema ya no manda');
    // Se puede inyectar la ventana (tercer argumento).
    const doc = crearDocumento({ oscuro: false });
    aplicarPreferencias({ tema: 'sistema' }, doc, { ventana: { matchMedia: () => crearConsulta(true) } });
    assert.equal(doc.estado().color, OSCURO);
  });

  test('guardarPreferencias mezcla, guarda, aplica, avisa en la misma página y devuelve las prefs completas', () => {
    const almacenamiento = crearStorage();
    const doc = crearDocumento();
    const ventana = new EventTarget();
    const avisos = [];
    alCambiarPreferencias((p) => avisos.push(p), { ventana });

    guardarPreferencias({ tamano: 'lg' }, { almacenamiento, doc, ventana });
    const prefs = guardarPreferencias({ tema: 'contraste', simple: true }, { almacenamiento, doc, ventana });

    const esperado = { ...POR_DEFECTO, tamano: 'lg', texto: 'grande', tema: 'contraste', contraste: true, simple: true };
    assert.deepEqual(prefs, esperado);
    assert.deepEqual(JSON.parse(almacenamiento.getItem('tecu:prefs')), esperado);
    assert.deepEqual(leerPreferencias({ almacenamiento }), esperado);
    assert.deepEqual(doc.estado(), {
      tema: 'contrast',
      tamano: 'lg',
      espaciado: 'normal',
      movimiento: 'system',
      simple: 'on',
      texto: 'grande',
      clases: ['alto-contraste'],
      color: CLARO,
    });
    assert.deepEqual(avisos, [{ ...POR_DEFECTO, tamano: 'lg', texto: 'grande' }, esperado]);
  });

  test('guardarPreferencias acepta los dos vocabularios (las vistas anteriores siguen funcionando)', () => {
    const almacenamiento = crearStorage();
    const doc = crearDocumento();
    const guardar = (parciales) => guardarPreferencias(parciales, { almacenamiento, doc, ventana: null });

    // Lo que hace hoy la pantalla de Ajustes del estudiante.
    let prefs = guardar({ texto: 'grande' });
    assert.equal(prefs.tamano, 'lg');
    assert.equal(prefs.texto, 'grande');
    assert.equal(doc.estado().texto, 'grande');
    assert.equal(doc.estado().tamano, 'lg');
    prefs = guardar({ contraste: true });
    assert.equal(prefs.tema, 'contraste');
    assert.equal(prefs.contraste, true);
    assert.ok(doc.estado().clases.includes('alto-contraste'));
    prefs = guardar({ movimiento: 'reducido' });
    assert.deepEqual(doc.anterior(), { texto: 'grande', clases: ['alto-contraste', 'reducir-movimiento'] });
    prefs = guardar({ contraste: false });
    assert.equal(prefs.tema, 'sistema');
    prefs = guardar({ texto: 'muy-grande' });
    assert.equal(prefs.tamano, 'xl');
    prefs = guardar({ texto: 'normal' });
    assert.equal(prefs.tamano, 'md');
    assert.equal(doc.estado().texto, null);

    // «muy-grande» no baja de xxl a xl, y quitar el contraste no toca un tema que no es contraste.
    guardar({ tamano: 'xxl', tema: 'oscuro' });
    prefs = guardar({ texto: 'muy-grande', contraste: false });
    assert.equal(prefs.tamano, 'xxl');
    assert.equal(prefs.tema, 'oscuro');
  });

  test('si llegan los dos vocabularios juntos, cuenta el que cambió (y si cambiaron los dos, el nuevo)', () => {
    const almacenamiento = crearStorage();
    const guardar = (parciales) => guardarPreferencias(parciales, { almacenamiento, doc: null, ventana: null });
    const base = guardar({});
    assert.equal(guardar({ ...base, texto: 'grande' }).tamano, 'lg', '{ ...prefs, texto } cambia el tamaño');
    assert.equal(guardar({ ...guardar({}), tamano: 'xl' }).tamano, 'xl', '{ ...prefs, tamano } no lo pisa el texto derivado');
    assert.equal(guardar({ ...guardar({}), contraste: true }).tema, 'contraste');
    assert.equal(guardar({ ...guardar({}), tema: 'oscuro' }).tema, 'oscuro', '{ ...prefs, tema } no lo pisa el contraste derivado');
    assert.equal(guardar({ tema: 'claro', contraste: true }).tema, 'claro');
    assert.equal(guardar({ tamano: 'md', texto: 'grande' }).tamano, 'md');
  });

  test('guardarPreferencias ignora valores inválidos (se queda lo que había)', () => {
    const almacenamiento = crearStorage();
    guardarPreferencias({ tamano: 'xxl', movimiento: 'reducido', dispositivo: 'movil' }, { almacenamiento, doc: null, ventana: null });
    const prefs = guardarPreferencias(
      { tamano: 'gigante', texto: 'gigante', tema: 7, contraste: 'si', movimiento: 3, voz: 'si', espaciado: 1, dispositivo: 'reloj' },
      { almacenamiento, doc: null, ventana: null },
    );
    assert.deepEqual(prefs, { ...POR_DEFECTO, tamano: 'xxl', texto: 'muy-grande', movimiento: 'reducido', dispositivo: 'movil' });
    for (const raro of [null, undefined, 'x', 5, [1]]) {
      assert.deepEqual(guardarPreferencias(raro, { almacenamiento, doc: null, ventana: null }), prefs);
    }
  });

  test('si no se puede guardar, igual aplica y avisa, y la sesión recuerda lo elegido', () => {
    for (const almacenamiento of [crearRoto(), null]) {
      const doc = crearDocumento();
      const ventana = new EventTarget();
      const avisos = [];
      alCambiarPreferencias((p) => avisos.push(p.tamano), { ventana });
      const prefs = silenciar('warn', () => guardarPreferencias({ tamano: 'lg' }, { almacenamiento, doc, ventana }));
      assert.equal(prefs.tamano, 'lg');
      assert.equal(doc.estado().tamano, 'lg');
      assert.deepEqual(avisos, ['lg']);
      // El siguiente cambio no regresa el anterior a su valor inicial.
      const despues = silenciar('warn', () => guardarPreferencias({ tema: 'oscuro' }, { almacenamiento, doc, ventana }));
      assert.equal(despues.tamano, 'lg');
      assert.equal(despues.tema, 'oscuro');
      assert.equal(leerPreferencias({ almacenamiento }).tamano, 'lg');
      assert.deepEqual(doc.estado().tamano, 'lg');
      silenciar('warn', () => restablecerPreferencias({ almacenamiento, doc: null, ventana: null }));
      assert.deepEqual(leerPreferencias({ almacenamiento }), POR_DEFECTO);
    }
  });

  test('restablecerPreferencias regresa la accesibilidad a su valor inicial y conserva ahorro, soloWifi y dispositivo', () => {
    const almacenamiento = crearStorage();
    const doc = crearDocumento();
    const ventana = new EventTarget();
    guardarPreferencias(
      { tema: 'contraste', tamano: 'xxl', espaciado: true, movimiento: 'reducido', simple: true, voz: true, ahorro: false, soloWifi: false, dispositivo: 'movil' },
      { almacenamiento, doc, ventana },
    );
    const avisos = [];
    alCambiarPreferencias((p) => avisos.push(p), { ventana });

    const prefs = restablecerPreferencias({ almacenamiento, doc, ventana });
    const esperado = { ...POR_DEFECTO, ahorro: false, soloWifi: false, dispositivo: 'movil' };
    assert.deepEqual(prefs, esperado);
    assert.deepEqual(leerPreferencias({ almacenamiento }), esperado);
    assert.deepEqual(avisos, [esperado]);
    assert.deepEqual(doc.estado(), {
      tema: 'system',
      tamano: 'md',
      espaciado: 'normal',
      movimiento: 'system',
      simple: 'off',
      texto: null,
      clases: [],
      color: CLARO,
    });
    assert.deepEqual(restablecerPreferencias({ todo: true, almacenamiento, doc, ventana }), POR_DEFECTO);
    assert.deepEqual(restablecerPreferencias({ almacenamiento: crearStorage(), doc: null, ventana: null }), POR_DEFECTO, 'sin nada guardado');
  });

  test('alCambiarPreferencias oye a otras pestañas/iframes (storage) y llama fn con UN solo argumento', async () => {
    const navegador = crearNavegador();
    const panel = navegador.abrirPestana();
    const iframe = navegador.abrirPestana();
    const llamadas = [];
    // Igual que main.js: alCambiarPreferencias(aplicarPreferencias) → el 2.º argumento sería `doc`.
    const quitar = alCambiarPreferencias((...args) => llamadas.push(args), { ventana: iframe.ventana });

    guardarPreferencias({ tamano: 'xl', movimiento: 'reducido' }, { almacenamiento: panel.almacenamiento, doc: panel.documento, ventana: panel.ventana });
    panel.almacenamiento.setItem('tecu:otra', '1');
    await tick();

    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].length, 1);
    assert.deepEqual(llamadas[0][0], { ...POR_DEFECTO, tamano: 'xl', texto: 'muy-grande', movimiento: 'reducido' });

    // Otra pestaña con la versión anterior guarda con el modelo anterior: llega ya migrado.
    panel.almacenamiento.setItem('tecu:prefs', JSON.stringify({ texto: 'grande', contraste: true, movimiento: 'auto', voz: false }));
    await tick();
    assert.deepEqual(llamadas[1], [{ ...POR_DEFECTO, tamano: 'lg', texto: 'grande', tema: 'contraste', contraste: true }]);

    panel.almacenamiento.clear();
    await tick();
    assert.deepEqual(llamadas[2], [POR_DEFECTO]);

    quitar();
    guardarPreferencias({ tema: 'oscuro' }, { almacenamiento: panel.almacenamiento, doc: null, ventana: panel.ventana });
    await tick();
    assert.equal(llamadas.length, 3);
  });

  test('alCambiarPreferencias(aplicarPreferencias), como en main.js, aplica lo que cambió otra pestaña', async () => {
    const navegador = crearNavegador();
    const panel = navegador.abrirPestana();
    const iframe = navegador.abrirPestana();
    alCambiarPreferencias((prefs) => aplicarPreferencias(prefs, iframe.documento), { ventana: iframe.ventana });
    guardarPreferencias({ tema: 'oscuro', espaciado: true }, { almacenamiento: panel.almacenamiento, doc: panel.documento, ventana: panel.ventana });
    await tick();
    assert.deepEqual(iframe.documento.estado(), panel.documento.estado());
    assert.equal(iframe.documento.estado().tema, 'dark');
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

  describe('script en línea de index.html (antes del primer pintado)', () => {
    /** Lo guardado que puede encontrarse al cargar, además de lo que escribe el módulo. */
    const GUARDADOS_RAROS = [
      null,
      '{roto',
      '[1,2]',
      '"x"',
      '{}',
      JSON.stringify({ texto: 'grande' }),
      JSON.stringify({ contraste: true }),
      JSON.stringify({ texto: 'muy-grande', contraste: true, movimiento: 'reducido', voz: true }),
      JSON.stringify({ texto: 'normal', contraste: false, movimiento: 'auto', voz: false }),
      JSON.stringify({ tema: 'rosa', tamano: 9, espaciado: 'si', simple: 1, movimiento: 'x' }),
      JSON.stringify({ tema: 'oscuro', tamano: 'xxl', texto: 'grande', contraste: true }),
      JSON.stringify({ tema: 'contraste', tamano: 'xxl', texto: 'muy-grande', contraste: false }),
      JSON.stringify({ tema: 'claro' }),
    ];
    /** Valores inválidos en las claves del modelo anterior (el script anterior no los validaba). */
    const GUARDADOS_INVALIDOS = [JSON.stringify({ texto: 'constructor', contraste: 'si', tema: 'toString', tamano: '__proto__' })];

    function mismoResultado(script, { soloAnterior = false } = {}) {
      for (const oscuro of [false, true]) {
        for (const prefs of combinaciones()) {
          const almacenamiento = crearStorage();
          const conModulo = crearDocumento({ oscuro });
          guardarPreferencias(prefs, { almacenamiento, doc: conModulo, ventana: null });
          const cargado = alCargar(script, almacenamiento, { oscuro });
          const nota = `${JSON.stringify(prefs)} · sistema ${oscuro ? 'oscuro' : 'claro'}`;
          if (soloAnterior) assert.deepEqual(cargado.anterior(), conModulo.anterior(), nota);
          else assert.deepEqual(cargado.estado(), conModulo.estado(), nota);
        }
        for (const guardado of soloAnterior ? GUARDADOS_RAROS : [...GUARDADOS_RAROS, ...GUARDADOS_INVALIDOS]) {
          const almacenamiento = crearStorage();
          if (guardado !== null) almacenamiento.setItem('tecu:prefs', guardado);
          const conModulo = crearDocumento({ oscuro });
          aplicarPreferencias(leerPreferencias({ almacenamiento }), conModulo);
          const cargado = alCargar(script, almacenamiento, { oscuro });
          const nota = `guardado: ${guardado} · sistema ${oscuro ? 'oscuro' : 'claro'}`;
          if (soloAnterior) assert.deepEqual(cargado.anterior(), conModulo.anterior(), nota);
          else assert.deepEqual(cargado.estado(), conModulo.estado(), nota);
        }
      }
    }

    test('el fragmento canónico aplica exactamente lo mismo que el módulo (modelo nuevo, modelo anterior y datos dañados)', () => {
      mismoResultado(SCRIPT_EN_LINEA);
    });

    test('el fragmento canónico no truena si el almacenamiento está bloqueado ni si falta el meta theme-color', () => {
      const bloqueado = alCargar(SCRIPT_EN_LINEA, crearRoto());
      const sinNada = crearDocumento();
      aplicarPreferencias(PREFS_POR_DEFECTO, sinNada);
      assert.deepEqual(bloqueado.estado(), sinNada.estado());
      const documento = crearDocumento({ conMeta: false });
      assert.doesNotThrow(() => vm.runInNewContext(SCRIPT_EN_LINEA, { document: documento, localStorage: crearStorage() }));
      assert.equal(documento.estado().tema, 'system');
    });

    test('el fragmento canónico es ES5 (corre en navegadores viejos) y no pasa de 2 KB', () => {
      assert.doesNotMatch(SCRIPT_EN_LINEA, /=>|\b(?:const|let)\b|`|\?\.|\?\?/);
      assert.ok(Buffer.byteLength(SCRIPT_EN_LINEA) < 2048, `${Buffer.byteLength(SCRIPT_EN_LINEA)} bytes`);
    });

    test('lo que guarda el módulo lo aplica igual el script en línea que hoy trae index.html (sin parpadeo)', () => {
      const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
      const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      const script = scripts.find((s) => s.includes('tecu:prefs'));
      assert.ok(script, 'no encontré el script en línea que lee tecu:prefs');
      // Mientras index.html conserve el script del modelo anterior, se comprueba el contrato
      // anterior (data-texto y clases); con el script unificado, todo lo que se aplica en <html>.
      const unificado = /data-theme|dataset\.theme/.test(script);
      mismoResultado(script, { soloAnterior: !unificado });
    });
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
