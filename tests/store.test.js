import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  crearStore,
  eventosServidor,
  guardarEnServidor,
  escucharServidor,
  reiniciarTodo,
  crearAlmacenMemoria,
} from '../js/data/store.js';

// ---------------------------------------------------------------------------
// Navegador falso: nada de globals del navegador, todo se inyecta.

/** Storage en memoria que reporta cada cambio real, como localStorage. */
function crearStorage(datos, alCambiar = () => {}) {
  return {
    get length() {
      return datos.size;
    },
    key: (i) => [...datos.keys()][i] ?? null,
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem(clave, valor) {
      const anterior = datos.has(clave) ? datos.get(clave) : null;
      const nuevo = String(valor);
      datos.set(clave, nuevo);
      if (anterior !== nuevo) alCambiar({ key: clave, oldValue: anterior, newValue: nuevo });
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

/**
 * Varias pestañas (o iframes) del mismo origen: comparten localStorage y cada una
 * tiene su `window` y su BroadcastChannel('tecu-sync'). Como en el navegador:
 * 'storage' llega solo a las OTRAS pestañas, BroadcastChannel no se entrega a
 * quien envía, y ambos llegan en una tarea posterior (no en el mismo instante).
 */
function crearNavegador({ conCanal = true } = {}) {
  const datos = new Map();
  const pestanas = [];
  const canales = new Set();

  function crearCanal(nombre) {
    const canal = new EventTarget();
    canal.name = nombre;
    canal.cerrado = false;
    canal.postMessage = (data) => {
      if (canal.cerrado) throw new Error('InvalidStateError');
      for (const otro of canales) {
        if (otro === canal || otro.name !== nombre) continue;
        const copia = structuredClone(data);
        setTimeout(() => {
          if (!otro.cerrado) otro.dispatchEvent(new MessageEvent('message', { data: copia }));
        }, 0);
      }
    };
    canal.close = () => {
      canal.cerrado = true;
      canales.delete(canal);
    };
    canales.add(canal);
    return canal;
  }

  function difundir(origen, cambio) {
    for (const pestana of pestanas) {
      if (pestana === origen) continue;
      setTimeout(() => {
        const evento = new Event('storage');
        Object.assign(evento, cambio, { storageArea: pestana.almacenamiento });
        pestana.ventana.dispatchEvent(evento);
      }, 0);
    }
  }

  function abrirPestana() {
    const pestana = { ventana: new EventTarget() };
    pestana.almacenamiento = crearStorage(datos, (cambio) => difundir(pestana, cambio));
    pestana.canal = conCanal ? crearCanal('tecu-sync') : null;
    pestanas.push(pestana);
    return pestana;
  }

  return { datos, abrirPestana };
}

/** Deja correr las tareas pendientes (eventos 'storage' y mensajes del canal). */
const tick = (ms = 5) => new Promise((resolver) => setTimeout(resolver, ms));

const storeEn = (pestana, alumno = 'ana', extra = {}) =>
  crearStore(alumno, {
    almacenamiento: pestana.almacenamiento,
    canal: pestana.canal,
    ventana: pestana.ventana,
    pausaMs: 0,
    ...extra,
  });

const opcionesDe = (pestana) => ({ almacenamiento: pestana.almacenamiento, canal: pestana.canal, ventana: pestana.ventana });

/** Escucha al servidor desde una pestaña y junta los mensajes. */
function oyente(pestana) {
  const mensajes = [];
  const quitar = escucharServidor((m) => mensajes.push(m), opcionesDe(pestana));
  return { mensajes, quitar };
}

const leerClave = (navegador, clave) => JSON.parse(navegador.datos.get(clave) ?? 'null');

function nuevoCelular(alumno = 'ana', extra = {}) {
  const navegador = crearNavegador();
  const pestana = navegador.abrirPestana();
  return { navegador, pestana, store: storeEn(pestana, alumno, extra) };
}

const ejemplo = (n) => ({ tipo: 'diagnostico', ejercicio: `${n}x + 5 = 20`, renglones: [`${n}x = 15`], resultado: 'correcto' });

// ---------------------------------------------------------------------------

describe('Registrar y consultar', () => {
  test('registrar agrega id único, alumno, fecha ISO y sincronizado:false, y lo guarda', () => {
    const { navegador, store } = nuevoCelular('ana');
    const antes = Date.now();
    const evento = store.registrar({ tipo: 'diagnostico', ejercicio: '3x + 5 = 20', renglones: ['3x = 25', 'x = 25/3'] });

    assert.match(evento.id, /^ana-[0-9a-z]+-[0-9a-z]+$/);
    assert.equal(evento.alumno, 'ana');
    assert.equal(evento.sincronizado, false);
    assert.equal(evento.tipo, 'diagnostico');
    assert.deepEqual(evento.renglones, ['3x = 25', 'x = 25/3']);
    assert.equal(new Date(evento.fecha).toISOString(), evento.fecha);
    assert.ok(Date.parse(evento.fecha) >= antes - 1000);
    assert.deepEqual(leerClave(navegador, 'tecu:dispositivo:ana:eventos'), [evento]);
  });

  test('los ids no se repiten aunque se registren muchos en el mismo milisegundo', () => {
    const { store } = nuevoCelular();
    const ids = new Set(Array.from({ length: 300 }, () => store.registrar({ tipo: 'libre' }).id));
    assert.equal(ids.size, 300);
  });

  test('el parcial no puede cambiar id, alumno ni sincronizado', () => {
    const { store } = nuevoCelular('ana');
    const evento = store.registrar({ id: 'falso', alumno: 'luis', sincronizado: true, tipo: 'practica' });
    assert.notEqual(evento.id, 'falso');
    assert.equal(evento.alumno, 'ana');
    assert.equal(evento.sincronizado, false);
  });

  test('eventos() y pendientes() respetan el orden de registro', () => {
    const { store } = nuevoCelular();
    const ids = [1, 2, 3].map((n) => store.registrar(ejemplo(n)).id);
    assert.deepEqual(store.eventos().map((e) => e.id), ids);
    assert.deepEqual(store.pendientes().map((e) => e.id), ids);
  });

  test('suscribir avisa al registrar (con el conteo de pendientes) y quitar deja de avisar', () => {
    const { store } = nuevoCelular('ana');
    const cambios = [];
    const quitar = store.suscribir((c) => cambios.push(c));
    const evento = store.registrar(ejemplo(1));
    store.registrar(ejemplo(2));
    quitar();
    store.registrar(ejemplo(3));

    assert.equal(cambios.length, 2);
    assert.equal(cambios[0].tipo, 'registro');
    assert.equal(cambios[0].alumno, 'ana');
    assert.equal(cambios[0].pendientes, 1);
    assert.equal(cambios[0].evento.id, evento.id);
    assert.equal(cambios[1].pendientes, 2);
  });

  test('un suscriptor que truena no impide avisar a los demás ni registrar', () => {
    const { store } = nuevoCelular();
    const original = console.error;
    console.error = () => {};
    try {
      let llamadas = 0;
      store.suscribir(() => {
        throw new Error('vista rota');
      });
      store.suscribir(() => llamadas++);
      assert.doesNotThrow(() => store.registrar(ejemplo(1)));
      assert.equal(llamadas, 1);
      assert.equal(store.eventos().length, 1);
    } finally {
      console.error = original;
    }
  });

  test('otra instancia del mismo alumno en la misma página también se entera', () => {
    const { pestana, store } = nuevoCelular('ana');
    const otra = storeEn(pestana, 'ana');
    const deLuis = storeEn(pestana, 'luis');
    const cambios = [];
    otra.suscribir((c) => cambios.push(['ana', c.tipo]));
    deLuis.suscribir((c) => cambios.push(['luis', c.tipo]));
    store.registrar(ejemplo(1));
    assert.deepEqual(cambios, [['ana', 'registro']]);
  });

  test('progreso: null al inicio, se guarda, se lee y null lo borra', () => {
    const { navegador, store } = nuevoCelular('ana');
    const avisos = [];
    store.suscribir((c) => avisos.push(c.tipo));
    assert.equal(store.progreso(), null);
    store.guardarProgreso({ pantalla: 'ruta', ruta: 'SIGNO_TRANSPOSICION', actividad: 2 });
    assert.deepEqual(store.progreso(), { pantalla: 'ruta', ruta: 'SIGNO_TRANSPOSICION', actividad: 2 });
    assert.ok(navegador.datos.has('tecu:dispositivo:ana:progreso'));
    store.guardarProgreso(null);
    assert.equal(store.progreso(), null);
    assert.ok(!navegador.datos.has('tecu:dispositivo:ana:progreso'));
    assert.deepEqual(avisos, ['progreso', 'progreso']);
  });

  test('cada alumno usa sus propias claves', () => {
    const navegador = crearNavegador();
    const pestana = navegador.abrirPestana();
    const ana = storeEn(pestana, 'ana');
    const luis = storeEn(pestana, 'luis');
    ana.registrar(ejemplo(1));
    luis.registrar(ejemplo(2));
    luis.registrar(ejemplo(3));
    assert.equal(ana.eventos().length, 1);
    assert.equal(luis.eventos().length, 2);
    assert.ok(navegador.datos.has('tecu:dispositivo:ana:eventos'));
    assert.ok(navegador.datos.has('tecu:dispositivo:luis:eventos'));
  });
});

describe('Sincronizar', () => {
  test('sube los pendientes en orden, uno por uno, llama onPaso(i, total, evento) y los marca', async () => {
    const { navegador, store } = nuevoCelular('ana');
    const ids = [1, 2, 3].map((n) => store.registrar(ejemplo(n)).id);
    const pasos = [];
    const n = await store.sincronizar({
      onPaso: (i, total, evento) => pasos.push([i, total, evento.id, evento.sincronizado, store.pendientes().length]),
    });

    assert.equal(n, 3);
    assert.deepEqual(pasos, [
      [1, 3, ids[0], true, 2],
      [2, 3, ids[1], true, 1],
      [3, 3, ids[2], true, 0],
    ]);
    assert.deepEqual(eventosServidor({ almacenamiento: navegador.abrirPestana().almacenamiento }).map((e) => e.id), ids);
    assert.ok(store.eventos().every((e) => e.sincronizado));
    assert.ok(leerClave(navegador, 'tecu:servidor:eventos').every((e) => e.sincronizado && e.alumno === 'ana'));
  });

  test('al final avisa { tipo: "sync", alumno, n } por BroadcastChannel a las otras pestañas', async () => {
    const navegador = crearNavegador();
    const celular = navegador.abrirPestana();
    const panel = navegador.abrirPestana();
    const { mensajes, quitar } = oyente(panel);
    const store = storeEn(celular, 'ana');
    store.registrar(ejemplo(1));
    store.registrar(ejemplo(2));

    await store.sincronizar();
    await tick();

    assert.deepEqual(
      mensajes.filter((m) => m.tipo === 'sync'),
      [{ tipo: 'sync', alumno: 'ana', n: 2 }],
    );
    assert.equal(eventosServidor({ almacenamiento: panel.almacenamiento }).length, 2);
    quitar();
  });

  test('el panel recibe cada evento conforme se sube (cambio por storage) antes del aviso final', async () => {
    const navegador = crearNavegador();
    const celular = navegador.abrirPestana();
    const panel = navegador.abrirPestana();
    const vistos = [];
    const quitar = escucharServidor(
      (m) => vistos.push([m.tipo, eventosServidor({ almacenamiento: panel.almacenamiento }).length]),
      opcionesDe(panel),
    );
    const store = storeEn(celular, 'ana', { pausaMs: 2 });
    [1, 2, 3].forEach((n) => store.registrar(ejemplo(n)));

    await store.sincronizar();
    await tick(20);
    quitar();

    assert.deepEqual(vistos, [
      ['cambio', 1],
      ['cambio', 2],
      ['cambio', 3],
      ['sync', 3],
    ]);
  });

  test('sin pendientes devuelve 0 y no avisa nada', async () => {
    const navegador = crearNavegador();
    const panel = navegador.abrirPestana();
    const { mensajes } = oyente(panel);
    const store = storeEn(navegador.abrirPestana());
    assert.equal(await store.sincronizar(), 0);
    await tick();
    assert.deepEqual(mensajes, []);
  });

  test('si ya hay una sincronización en curso devuelve la misma promesa y no duplica', async () => {
    const { navegador, store } = nuevoCelular('ana', { pausaMs: 3 });
    [1, 2, 3].forEach((n) => store.registrar(ejemplo(n)));
    const primera = store.sincronizar();
    const segunda = store.sincronizar();
    assert.equal(primera, segunda);
    assert.equal(store.sincronizando(), true);
    assert.equal(await primera, 3);
    assert.equal(store.sincronizando(), false);
    assert.equal(await store.sincronizar(), 0);
    assert.equal(leerClave(navegador, 'tecu:servidor:eventos').length, 3);
  });

  test('con pausaMs espera entre eventos para animar la cola', async () => {
    const { store } = nuevoCelular('ana', { pausaMs: 15 });
    [1, 2, 3].forEach((n) => store.registrar(ejemplo(n)));
    const inicio = Date.now();
    await store.sincronizar();
    assert.ok(Date.now() - inicio >= 40, `tardó ${Date.now() - inicio} ms`);
  });

  test('si se cierra a la mitad (subió al servidor pero no alcanzó a marcar), al reintentar no duplica', async () => {
    const navegador = crearNavegador();
    const pestana = navegador.abrirPestana();
    let cerrada = true; // "la app se cierra" justo después de escribir en el servidor
    const almacen = {
      ...pestana.almacenamiento,
      get length() {
        return pestana.almacenamiento.length;
      },
      setItem(clave, valor) {
        if (cerrada && clave === 'tecu:dispositivo:ana:eventos' && valor.includes('"sincronizado":true')) {
          throw new Error('se cerró la app');
        }
        pestana.almacenamiento.setItem(clave, valor);
      },
    };
    const original = console.warn;
    console.warn = () => {};
    try {
      const store = crearStore('ana', { almacenamiento: almacen, canal: null, ventana: null, pausaMs: 0 });
      const ids = [1, 2, 3].map((n) => store.registrar(ejemplo(n)).id);
      await store.sincronizar();
      assert.equal(store.pendientes().length, 3, 'en el celular siguen pendientes');
      assert.equal(leerClave(navegador, 'tecu:servidor:eventos').length, 3);

      cerrada = false;
      assert.equal(await store.sincronizar(), 3);
      assert.equal(store.pendientes().length, 0);
      assert.deepEqual(leerClave(navegador, 'tecu:servidor:eventos').map((e) => e.id), ids);
    } finally {
      console.warn = original;
    }
  });

  test('si la cuota se llena a la mitad, no truena: devuelve cuántos subió y el resto queda pendiente', async () => {
    const memoria = crearAlmacenMemoria();
    let escriturasServidor = 0;
    const almacen = {
      ...memoria,
      get length() {
        return memoria.length;
      },
      setItem(clave, valor) {
        if (clave === 'tecu:servidor:eventos' && ++escriturasServidor === 2) {
          const error = new Error('lleno');
          error.name = 'QuotaExceededError';
          throw error;
        }
        memoria.setItem(clave, valor);
      },
    };
    const original = console.warn;
    console.warn = () => {};
    try {
      const store = crearStore('ana', { almacenamiento: almacen, canal: null, ventana: null, pausaMs: 0 });
      const ids = [1, 2, 3].map((n) => store.registrar(ejemplo(n)).id);
      assert.equal(await store.sincronizar(), 1);
      assert.deepEqual(store.pendientes().map((e) => e.id), ids.slice(1));
      assert.equal(await store.sincronizar(), 2);
      assert.deepEqual(eventosServidor({ almacenamiento: almacen }).map((e) => e.id), ids);
    } finally {
      console.warn = original;
    }
  });

  test('un error en onPaso no detiene la sincronización', async () => {
    const { store } = nuevoCelular();
    [1, 2].forEach((n) => store.registrar(ejemplo(n)));
    const original = console.error;
    console.error = () => {};
    try {
      const n = await store.sincronizar({
        onPaso: () => {
          throw new Error('animación rota');
        },
      });
      assert.equal(n, 2);
      assert.equal(store.pendientes().length, 0);
    } finally {
      console.error = original;
    }
  });

  test('lo que se registra durante la sincronización queda para la siguiente', async () => {
    const { store } = nuevoCelular('ana', { pausaMs: 2 });
    [1, 2].forEach((n) => store.registrar(ejemplo(n)));
    let nuevo = null;
    const n = await store.sincronizar({
      onPaso: (i) => {
        if (i === 1) nuevo = store.registrar(ejemplo(9));
      },
    });
    assert.equal(n, 2);
    assert.deepEqual(store.pendientes().map((e) => e.id), [nuevo.id]);
    assert.equal(await store.sincronizar(), 1);
  });

  test('los suscriptores ven la cola vaciarse paso a paso', async () => {
    const { store } = nuevoCelular();
    [1, 2, 3].forEach((n) => store.registrar(ejemplo(n)));
    const cola = [];
    store.suscribir((c) => {
      if (c.tipo === 'sincronizado') cola.push(c.pendientes);
    });
    await store.sincronizar();
    assert.deepEqual(cola, [2, 1, 0]);
  });
});

describe('Dudas', () => {
  test('agregarDuda guarda la duda pendiente y registra su evento tipo duda', () => {
    const { store } = nuevoCelular('ana');
    const duda = store.agregarDuda('  ¿Por qué cambia el signo?  ');
    assert.match(duda.id, /^ana-/);
    assert.equal(duda.texto, '¿Por qué cambia el signo?');
    assert.equal(duda.respuesta, null);
    assert.equal(duda.fechaRespuesta, null);
    assert.equal(duda.pendiente, true);
    assert.deepEqual(store.dudas(), [duda]);

    const [evento] = store.pendientes();
    assert.equal(evento.tipo, 'duda');
    assert.equal(evento.fecha, duda.fecha);
    assert.deepEqual(evento.datos, {
      dudaId: duda.id,
      texto: duda.texto,
      respondida: false,
      respuesta: null,
      fechaRespuesta: null,
    });
  });

  test('una duda = un evento: registrar la misma duda (mismo dudaId) no la duplica', async () => {
    const { navegador, store } = nuevoCelular('ana');
    const duda = store.agregarDuda('¿Por qué se divide?');
    const devuelto = store.registrar({ tipo: 'duda', datos: { texto: duda.texto, respondida: false, dudaId: duda.id } });
    assert.equal(store.pendientes().length, 1);
    assert.equal(devuelto.id, store.pendientes()[0].id);
    store.registrar({ tipo: 'duda', datos: { texto: 'otra duda contestada en línea', respondida: true } });
    assert.equal(store.pendientes().length, 2, 'sin dudaId es un evento nuevo');

    store.contestarDuda(duda.id, 'Porque el 3 multiplica a la x.');
    await store.sincronizar();
    const dudas = leerClave(navegador, 'tecu:servidor:eventos').filter((e) => e.tipo === 'duda');
    assert.equal(dudas.length, 2);
    assert.equal(dudas[0].datos.respondida, true);
    assert.equal(dudas[0].datos.respuesta, 'Porque el 3 multiplica a la x.');
  });

  test('si se contesta antes de sincronizar, la duda sube ya con su respuesta', async () => {
    const { navegador, store } = nuevoCelular('ana');
    const duda = store.agregarDuda('¿Qué hago con el 3?');
    const contestada = store.contestarDuda(duda.id, 'Divide entre 3 en los dos lados.');
    assert.equal(contestada.pendiente, false);
    assert.equal(contestada.respuesta, 'Divide entre 3 en los dos lados.');
    assert.ok(contestada.fechaRespuesta);
    assert.equal(store.pendientes().length, 1);

    assert.equal(await store.sincronizar(), 1);
    const [enServidor] = leerClave(navegador, 'tecu:servidor:eventos');
    assert.equal(enServidor.tipo, 'duda');
    assert.equal(enServidor.datos.respuesta, 'Divide entre 3 en los dos lados.');
  });

  test('si se contesta después de sincronizar, vuelve a subir y en el servidor se reemplaza (sin duplicar)', async () => {
    const { navegador, store } = nuevoCelular('ana');
    store.registrar(ejemplo(1));
    const duda = store.agregarDuda('¿Por qué cambia el signo?');
    store.registrar(ejemplo(2));
    await store.sincronizar();
    assert.equal(leerClave(navegador, 'tecu:servidor:eventos')[1].datos.respuesta, null);

    store.contestarDuda(duda.id, 'Piensa en una balanza.');
    assert.equal(store.pendientes().length, 1);
    assert.equal(await store.sincronizar(), 1);

    const servidor = leerClave(navegador, 'tecu:servidor:eventos');
    assert.equal(servidor.length, 3);
    assert.equal(servidor[1].tipo, 'duda');
    assert.equal(servidor[1].datos.respuesta, 'Piensa en una balanza.');
    assert.equal(store.dudas()[0].pendiente, false);
  });

  test('contestar una duda que no existe devuelve null y no cambia nada', () => {
    const { store } = nuevoCelular();
    store.agregarDuda('hola');
    assert.equal(store.contestarDuda('no-existe', 'x'), null);
    assert.equal(store.dudas()[0].pendiente, true);
  });
});

describe('Servidor compartido entre pestañas', () => {
  test('otra pestaña ve lo sincronizado con eventosServidor() sin recargar', async () => {
    const navegador = crearNavegador();
    const celular = navegador.abrirPestana();
    const panel = navegador.abrirPestana();
    const store = storeEn(celular, 'ana');
    const ids = [1, 2].map((n) => store.registrar(ejemplo(n)).id);
    assert.deepEqual(eventosServidor({ almacenamiento: panel.almacenamiento }), []);
    await store.sincronizar();
    assert.deepEqual(eventosServidor({ almacenamiento: panel.almacenamiento }).map((e) => e.id), ids);
  });

  test('escucharServidor oye cambios de tecu:servidor:eventos hechos en otra pestaña y quitar deja de oír', async () => {
    const navegador = crearNavegador();
    const panel = navegador.abrirPestana();
    const otra = navegador.abrirPestana();
    const { mensajes, quitar } = oyente(panel);

    guardarEnServidor([{ id: 'g-1', alumno: 'sofia', tipo: 'diagnostico' }], { almacenamiento: otra.almacenamiento });
    otra.almacenamiento.setItem('tecu:otra-cosa', '1');
    await tick();
    assert.deepEqual(mensajes, [{ tipo: 'cambio', origen: 'storage' }]);

    quitar();
    guardarEnServidor([{ id: 'g-2', alumno: 'sofia', tipo: 'diagnostico' }], { almacenamiento: otra.almacenamiento });
    await tick();
    assert.equal(mensajes.length, 1);
  });

  test('sin BroadcastChannel la otra pestaña igual recibe los cambios y el aviso de sync (buzón en storage)', async () => {
    const navegador = crearNavegador({ conCanal: false });
    const celular = navegador.abrirPestana();
    const panel = navegador.abrirPestana();
    const { mensajes, quitar } = oyente(panel);
    const store = storeEn(celular, 'ana');
    store.registrar(ejemplo(1));
    store.registrar(ejemplo(2));

    assert.equal(await store.sincronizar(), 2);
    await tick();
    quitar();

    assert.deepEqual(mensajes, [
      { tipo: 'cambio', origen: 'storage' },
      { tipo: 'cambio', origen: 'storage' },
      { tipo: 'sync', alumno: 'ana', n: 2 },
    ]);
    assert.equal(eventosServidor({ almacenamiento: panel.almacenamiento }).length, 2);
    assert.ok(!navegador.datos.has('tecu:servidor:aviso'), 'el buzón no deja basura');
  });

  test('guardarEnServidor agrega sin duplicar por id, reemplaza y completa id/fecha', () => {
    const almacenamiento = crearAlmacenMemoria();
    const fecha = '2026-10-01T15:00:00.000Z';
    assert.equal(guardarEnServidor([{ id: 'a', alumno: 'sofia', tipo: 'diagnostico', fecha }], { almacenamiento }), 1);
    assert.equal(
      guardarEnServidor(
        [
          { id: 'a', alumno: 'sofia', tipo: 'dominio', fecha },
          { alumno: 'mateo', tipo: 'practica' },
        ],
        { almacenamiento },
      ),
      2,
    );
    const lista = eventosServidor({ almacenamiento });
    assert.equal(lista.length, 2);
    assert.equal(lista[0].tipo, 'dominio');
    assert.equal(lista[0].fecha, fecha);
    assert.match(lista[1].id, /^mateo-/);
    assert.equal(new Date(lista[1].fecha).toISOString(), lista[1].fecha);
    assert.ok(lista.every((e) => e.sincronizado === true));
    assert.equal(guardarEnServidor([], { almacenamiento }), 0);
  });
});

describe('Reinicios', () => {
  test('reiniciar() borra solo las claves de este celular', async () => {
    const navegador = crearNavegador();
    const pestana = navegador.abrirPestana();
    const ana = storeEn(pestana, 'ana');
    const anabel = storeEn(pestana, 'anabel');
    ana.registrar(ejemplo(1));
    ana.guardarProgreso({ pantalla: 'inicio' });
    ana.agregarDuda('¿?');
    anabel.registrar(ejemplo(2));
    await ana.sincronizar();
    pestana.almacenamiento.setItem('tecu:prefs', '{"texto":"grande"}');
    const avisos = [];
    ana.suscribir((c) => avisos.push(c.tipo));

    ana.reiniciar();

    assert.deepEqual(ana.eventos(), []);
    assert.deepEqual(ana.dudas(), []);
    assert.equal(ana.progreso(), null);
    assert.equal(anabel.eventos().length, 1);
    assert.equal(eventosServidor({ almacenamiento: pestana.almacenamiento }).length, 2, 'el servidor no se toca');
    assert.ok(navegador.datos.has('tecu:prefs'));
    assert.deepEqual(avisos, ['reinicio']);
  });

  test('reiniciarTodo() borra todo "tecu:" excepto tecu:prefs y avisa { tipo: "reinicio" }', async () => {
    const navegador = crearNavegador();
    const pestana = navegador.abrirPestana();
    const panel = navegador.abrirPestana();
    const { mensajes } = oyente(panel);
    const store = storeEn(pestana, 'ana');
    store.registrar(ejemplo(1));
    await store.sincronizar();
    store.registrar(ejemplo(2));
    for (const [clave, valor] of [
      ['tecu:prefs', '{"contraste":true}'],
      ['tecu:red:ana', 'true'],
      ['otra-app', 'x'],
    ]) {
      pestana.almacenamiento.setItem(clave, valor);
    }
    await tick();
    mensajes.length = 0;

    reiniciarTodo(opcionesDe(pestana));
    await tick();

    assert.deepEqual([...navegador.datos.keys()].sort(), ['otra-app', 'tecu:prefs']);
    assert.deepEqual(mensajes.at(-1), { tipo: 'reinicio' });
    assert.ok(mensajes.some((m) => m.tipo === 'cambio'));
  });

  test('reiniciarTodo() sin BroadcastChannel avisa por el buzón y no deja claves', async () => {
    const navegador = crearNavegador({ conCanal: false });
    const pestana = navegador.abrirPestana();
    const panel = navegador.abrirPestana();
    const { mensajes } = oyente(panel);
    storeEn(pestana, 'ana').registrar(ejemplo(1));

    reiniciarTodo(opcionesDe(pestana));
    await tick();

    assert.deepEqual([...navegador.datos.keys()], []);
    assert.deepEqual(mensajes, [{ tipo: 'reinicio' }]);
  });

  test('suscribir oye los cambios de otra pestaña para su alumno (y no los de otro alumno)', async () => {
    const navegador = crearNavegador();
    const aqui = navegador.abrirPestana();
    const alla = navegador.abrirPestana();
    const cambios = [];
    storeEn(aqui, 'ana').suscribir((c) => cambios.push(c));

    storeEn(alla, 'luis').registrar(ejemplo(1));
    storeEn(alla, 'ana').registrar(ejemplo(2));
    await tick();
    assert.equal(cambios.length, 1);
    assert.equal(cambios[0].tipo, 'externo');
    assert.equal(cambios[0].clave, 'tecu:dispositivo:ana:eventos');
    assert.equal(cambios[0].pendientes, 1);

    alla.almacenamiento.clear();
    await tick();
    assert.equal(cambios.length, 2);
    assert.equal(cambios[1].pendientes, 0);
  });
});

describe('Robustez del almacenamiento', () => {
  test('JSON dañado ⇒ listas vacías y progreso null; registrar sigue funcionando', () => {
    const almacenamiento = crearAlmacenMemoria();
    for (const clave of ['eventos', 'dudas', 'progreso']) almacenamiento.setItem(`tecu:dispositivo:ana:${clave}`, '{roto');
    almacenamiento.setItem('tecu:servidor:eventos', 'no es json');
    const store = crearStore('ana', { almacenamiento, canal: null, ventana: null, pausaMs: 0 });

    assert.deepEqual(store.eventos(), []);
    assert.deepEqual(store.dudas(), []);
    assert.equal(store.progreso(), null);
    assert.deepEqual(eventosServidor({ almacenamiento }), []);
    store.registrar(ejemplo(1));
    assert.equal(store.eventos().length, 1);
  });

  test('elementos ajenos dentro de las listas se ignoran', () => {
    const almacenamiento = crearAlmacenMemoria();
    almacenamiento.setItem('tecu:dispositivo:ana:eventos', JSON.stringify([null, 3, 'x', [], { id: 'ok', tipo: 'libre' }]));
    almacenamiento.setItem('tecu:servidor:eventos', JSON.stringify({ no: 'es lista' }));
    const store = crearStore('ana', { almacenamiento, canal: null, ventana: null, pausaMs: 0 });
    assert.deepEqual(store.eventos().map((e) => e.id), ['ok']);
    assert.deepEqual(eventosServidor({ almacenamiento }), []);
  });

  test('un almacenamiento que lanza en todo (bloqueado) no tumba nada', async () => {
    const roto = {
      get length() {
        throw new Error('SecurityError');
      },
      key() {
        throw new Error('SecurityError');
      },
      getItem() {
        throw new Error('SecurityError');
      },
      setItem() {
        throw new Error('SecurityError');
      },
      removeItem() {
        throw new Error('SecurityError');
      },
    };
    const original = console.warn;
    console.warn = () => {};
    try {
      const store = crearStore('ana', { almacenamiento: roto, canal: null, ventana: null, pausaMs: 0 });
      const evento = store.registrar(ejemplo(1));
      assert.equal(evento.alumno, 'ana');
      assert.deepEqual(store.eventos(), []);
      assert.equal(store.progreso(), null);
      assert.doesNotThrow(() => store.guardarProgreso({ a: 1 }));
      assert.equal(store.agregarDuda('¿?').pendiente, true);
      assert.equal(await store.sincronizar(), 0);
      assert.doesNotThrow(() => store.reiniciar());
      assert.deepEqual(eventosServidor({ almacenamiento: roto }), []);
      assert.equal(guardarEnServidor([{ id: 'x' }], { almacenamiento: roto }), 0);
      assert.doesNotThrow(() => reiniciarTodo({ almacenamiento: roto, canal: null }));
    } finally {
      console.warn = original;
    }
  });

  test('sin localStorage (almacenamiento: null) el celular funciona en memoria', async () => {
    const store = crearStore('ana', { almacenamiento: null, canal: null, ventana: null, pausaMs: 0 });
    store.registrar(ejemplo(1));
    store.guardarProgreso({ pantalla: 'ruta' });
    assert.equal(store.pendientes().length, 1);
    assert.deepEqual(store.progreso(), { pantalla: 'ruta' });
    assert.equal(await store.sincronizar(), 1);
    assert.equal(store.pendientes().length, 0);
  });

  test('sin window ni almacenamiento del navegador (Node puro) todo sigue respondiendo', async () => {
    const store = crearStore('ana', { pausaMs: 0, canal: null });
    const cambios = [];
    store.suscribir((c) => cambios.push(c.tipo));
    store.registrar(ejemplo(1));
    assert.deepEqual(cambios, ['registro']);
    assert.equal(await store.sincronizar(), 1);
    assert.deepEqual(eventosServidor(), []);
    const quitar = escucharServidor(() => {}, { canal: null });
    assert.equal(typeof quitar, 'function');
    quitar();
  });

  test('alumno vacío usa "invitado"', () => {
    const store = crearStore('', { almacenamiento: crearAlmacenMemoria(), canal: null, ventana: null });
    assert.equal(store.alumno, 'invitado');
    assert.match(store.registrar({ tipo: 'libre' }).id, /^invitado-/);
  });
});
