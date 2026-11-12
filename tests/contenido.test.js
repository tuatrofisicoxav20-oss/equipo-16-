/**
 * Contenido pedagógico: packs/ecuaciones-1.json + js/core/textos.js.
 *
 * Fija las correcciones del revisor pedagógico (A1–A16, B1, C1–C13) y revisa, con
 * barridos amplios de procedimientos que escribe el propio motor (generarEjercicio +
 * procedimientoConError + respuestas x = v), que:
 *   - ningún texto quede con huecos, «undefined» ni «el x»;
 *   - ninguna explicación al estudiante, pista 1–2 ni pregunta revele el valor de x;
 *   - cada pregunta orientadora tenga exactamente una opción correcta y que esa sea la
 *     que dice la matemática (se comprueba aparte, sin repetir la lógica de textos.js).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TIPOS,
  analizarProcedimiento as A,
  ecuacion,
  fmtLado,
  fmtTerminoConSigno,
  forma,
  generarEjercicio,
  mismaSolucion,
  parsearRenglon,
  pasosSolucion,
  procedimientoConError,
  resolver,
  revelaSolucion,
} from '../js/core/engine.js';
import {
  datosError,
  explicarError,
  pistasPara,
  preguntaOrientadora,
  respuestaTecu,
  sugerenciaLlamada,
  sugerenciaPorMotivo,
} from '../js/core/textos.js';
import { createRng } from '../js/core/rng.js';
import { Fr } from '../js/core/fraction.js';

const pack = JSON.parse(readFileSync(new URL('../packs/ecuaciones-1.json', import.meta.url), 'utf8'));

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

/** Número como se ve en pantalla ("−4", "25/3") → fracción exacta. */
const fr = (t) => {
  const [n, d = '1'] = String(t).replace('−', '-').split('/');
  return new Fr(Number(n), Number(d));
};

const sinAcentos = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Todas las cadenas de un objeto, con su ruta ("preguntas.UN_SOLO_LADO.texto"). */
function* cadenas(obj, ruta = '') {
  if (typeof obj === 'string') yield [ruta, obj];
  else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) yield* cadenas(v, ruta ? `${ruta}.${k}` : k);
  }
}

const HUECO = /[{}]|undefined|null|NaN/;
const EL_X = /\b(?:el|al|del) x(?![a-záéíóúñ])/i;
// Un dato que faltó al llenar la plantilla deja marcas: «Restando: − 5», «entre ,», «« »».
const DATO_FALTANTE = /\s[,.;:?]|«\s*»|\(\s*\)|:\s[−+÷·]\s|\s[−+÷·]\s*$/;

function textoLimpio(t, donde) {
  assert.equal(typeof t, 'string', donde);
  assert.ok(t.trim().length > 0, `texto vacío: ${donde}`);
  assert.ok(!HUECO.test(t), `hueco en ${donde}: «${t}»`);
  assert.ok(!EL_X.test(t), `«el x» en ${donde}: «${t}»`);
  assert.ok(!DATO_FALTANTE.test(t), `dato faltante en ${donde}: «${t}»`);
}

/** Plantilla que debe usar explicarError: la de la variante (o su versión con divisor, para x/4). */
function plantillaDe(error, audiencia) {
  const plantillas = pack.errores[error.tipo][audiencia];
  const v = error.detalle.variante;
  return (error.detalle.divisor && plantillas[`${v}_divisor`]) || plantillas[v];
}

/**
 * Texto listo para revelaSolucion (un filtro pensado para texto libre de la IA). Se quitan:
 *   - «renglón 2» y «ejercicio 1»: son etiquetas, no valores (B4, pendiente en el motor);
 *   - lo citado entre «»: son los renglones que escribió el propio estudiante («10x = 4x + 12»
 *     contiene «x=4» al quitar espacios, y eso no le revela nada).
 */
const paraFiltro = (t) =>
  t
    .replace(/(renglones?|ejercicio) \d+(?: y \d+)?/g, '$1')
    .replace(/«[^»]*»/g, '«»');

/**
 * Lo que el estudiante ya tiene a la vista: sus renglones hasta el error, lo que el motor dice
 * que él mismo hizo (8x − 10 = 6 → x = −3: «juntaste 8x − 10 y quedó −2x»; nunca el resultado
 * esperado ni el correcto) y los renglones que tiene que escribir de todos modos camino a la
 * respuesta (sin el último, «x = valor»). Un número de ese camino no es la respuesta:
 * 5x + 7 = 2x + 16 lleva a 3x = 9, y «el 3 que multiplica a la x» no le dice que x = 3.
 */
function contexto(lineas, error) {
  const camino = [lineas[0], error.anterior].flatMap((t) => {
    try {
      return pasosSolucion(ecuacion(t))
        .map((p) => p.texto)
        .slice(0, -1);
    } catch {
      return [];
    }
  });
  const suyo = ['escrito', 'quedo', 'resultado'].map((k) => error.detalle[k]).filter(Boolean);
  return [...lineas.slice(0, error.renglon), ...suyo, ...camino];
}

/* ------------------------------------------------------------------ */
/* Barrido: procedimientos con error escritos por el motor             */
/* ------------------------------------------------------------------ */

const EXTRA = [
  'x/4 − 1 = 2', '2x − 7 = 9', '−x/4 = 3', 'x/4 = −3', '2x/3 = 4', '3x = x + 8', '5x + 2 = x + 14',
  '2x + 3 + 4 = 15', '6x + 9 = 2x + 21', '−4x + 12 = −8', 'x/3 + 2 = 5', '−x = 5', '2x = 4', 'x/2 = 2',
  '2x = −4', 'x − 1/3 = 1/2', '5x + 7 = 2x + 16',
];

let cache = null;
function barrido() {
  if (cache) return cache;
  const ejercicios = new Set([
    ...pack.diagnostico.map((d) => d.ecuacion),
    ...Object.values(pack.errores).map((e) => e.ruta.ejemplo),
    ...EXTRA,
  ]);
  for (const tipo of Object.values(TIPOS)) {
    for (const nivel of [1, 2, 3]) {
      const rng = createRng(`contenido-${tipo}-${nivel}`);
      for (let i = 0; i < 4; i++) ejercicios.add(generarEjercicio(tipo, nivel, rng).ecuacion);
    }
  }
  const vistos = new Set();
  const noClasificados = new Set();
  const out = [];
  const agregar = (lineas) => {
    const k = lineas.join(' | ');
    if (vistos.has(k)) return;
    vistos.add(k);
    const r = A(lineas);
    if (r.estado !== 'error') return;
    // Los no clasificados desde el mismo renglón dan los mismos textos (solo cambia la cita del
    // estudiante): basta uno por renglón anterior.
    if (r.error.tipo === TIPOS.NO_CLASIFICADO) {
      const llave = `${lineas[0]} | ${r.error.anterior}`;
      if (noClasificados.has(llave)) return;
      noClasificados.add(llave);
    }
    out.push({ lineas, r, error: r.error });
  };
  for (const ej of ejercicios) {
    for (const tipo of Object.values(TIPOS)) {
      const lineas = procedimientoConError(ej, tipo);
      if (lineas) agregar(lineas);
    }
    // Respuestas x = v: directo desde el enunciado y después del primer paso correcto.
    const primero = pasosSolucion(ecuacion(ej))[0]?.texto;
    for (let v = -12; v <= 20; v++) {
      agregar([ej, `x = ${v}`]);
      if (primero && !/^x = \S+$/.test(primero)) agregar([ej, primero, `x = ${v}`]);
    }
  }
  cache = out;
  return out;
}

/* ------------------------------------------------------------------ */
/* Comprobación matemática de las opciones (independiente de textos.js) */
/* ------------------------------------------------------------------ */

/** «lado del término sin el término = expresión de la opción»: ¿conserva la solución del renglón anterior? */
function conservaAlMover(error, expresion) {
  const previa = parsearRenglon(error.anterior).eq;
  const lado = error.detalle.lado === 'izquierdo' ? 'L' : 'R';
  const i = previa[lado].findIndex((t) => fmtTerminoConSigno(t) === error.detalle.termino);
  assert.ok(i >= 0, `no encontré ${error.detalle.termino} en ${error.anterior}`);
  const resto = previa[lado].filter((_, j) => j !== i);
  return mismaSolucion(resolver(ecuacion(`${fmtLado(resto)} = ${expresion}`)), resolver(previa));
}

const VERBOS = { dividir: 'div', multiplicar: 'mul', restar: 'sub', sumar: 'add' };

/** «Dividir los dos lados entre 3», «Sumar o restar 1 en los dos lados» → [{op, N}]. De un solo lado: []. */
function operacionesDe(texto) {
  if (/\bsolo\b/.test(texto)) return [];
  const n = texto.match(/−?\d+(?:\/\d+)?/);
  if (!n) return [];
  return [...texto.matchAll(/\b(dividir|multiplicar|restar|sumar)\b/gi)].map((m) => ({ op: VERBOS[m[1].toLowerCase()], N: fr(n[0]) }));
}

/**
 * ¿La operación en los dos lados deshace el número que multiplica a la x (el coeficiente queda
 * exactamente en 1, juntando las x del lado que sea)? Sumar o restar no toca el coeficiente.
 */
function dejaLaXSola(error, ops) {
  const eq = parsearRenglon(error.anterior).eq;
  const a = forma(eq.L).a.sub(forma(eq.R).a);
  return [a, a.neg()].some((c) =>
    ops.some(({ op, N }) => (op === 'div' && c.div(N).eq(1)) || (op === 'mul' && c.mul(N).eq(1))),
  );
}

/** ¿La operación en los dos lados quita el término que sumaba o restaba (y nada más)? */
function quitaElTermino(error, ops) {
  const t = fr(error.detalle.termino.replace('+', ''));
  return ops.some(({ op, N }) => (op === 'sub' && N.eq(t)) || (op === 'add' && N.neg().eq(t)));
}

/** Lado (coeficiente de x, número) después de una operación. */
function aplicar([c, k], op, N) {
  if (op === 'div') return [c.div(N), k.div(N)];
  if (op === 'mul') return [c.mul(N), k.mul(N)];
  if (op === 'sub') return [c, k.sub(N)];
  if (op === 'add') return [c, k.add(N)];
  return [c, k];
}

/** «También se divide entre 3», «Se queda igual», «Se le resta 3» → {op, N}. */
function operacionOtroLado(texto) {
  const n = texto.match(/−?\d+(?:\/\d+)?/);
  const N = n ? fr(n[0]) : null;
  if (/divide/.test(texto)) return { op: 'div', N };
  if (/multiplica/.test(texto)) return { op: 'mul', N };
  if (/resta/.test(texto)) return { op: 'sub', N };
  if (/suma/.test(texto)) return { op: 'add', N };
  return { op: 'igual', N };
}

/** Ids de las opciones que la matemática da por buenas. */
function opcionesValidas(error, q) {
  const { tipo, detalle } = error;
  const sol = resolver(parsearRenglon(error.anterior).eq);
  const ids = (pred) => q.opciones.filter(pred).map((o) => o.id);
  const expresion = (o) => o.texto.split(': ').pop();

  if (tipo === TIPOS.SIGNO_TRANSPOSICION) return ids((o) => conservaAlMover(error, expresion(o)));
  if (tipo === TIPOS.UN_SOLO_LADO && !detalle.variante.startsWith('divide')) {
    return ids((o) => conservaAlMover(error, expresion(o)));
  }
  if (tipo === TIPOS.UN_SOLO_LADO) {
    // Un lado ya se dividió (o multiplicó): la opción dice qué hacerle al otro.
    const m = q.texto.match(/se (dividió entre|multiplicó por) (\S+) un solo lado/);
    assert.ok(m, q.texto);
    const opQ = m[1].startsWith('dividió') ? 'div' : 'mul';
    const N = fr(m[2]);
    const a = fr(detalle.coefNum);
    const b = fr(detalle.b);
    assert.ok(b.div(a).eq(sol.valor), `${detalle.b} ÷ ${detalle.coefNum} no es la solución de ${error.anterior}`);
    const ladoX = [a, Fr.ZERO];
    const ladoN = [Fr.ZERO, b];
    return ids((o) => {
      const { op, N: n } = operacionOtroLado(o.texto);
      const [P, Q] =
        detalle.variante === 'divide_solo_x'
          ? [aplicar(ladoX, opQ, N), aplicar(ladoN, op, n)]
          : [aplicar(ladoX, op, n), aplicar(ladoN, opQ, N)];
      const c = P[0].sub(Q[0]);
      return !c.isZero() && Q[1].sub(P[1]).div(c).eq(sol.valor);
    });
  }
  if (tipo === TIPOS.INVERSA_EQUIVOCADA) {
    const aditivo = detalle.variante.startsWith('aditivo');
    return ids((o) => {
      const ops = operacionesDe(o.texto);
      return ops.length > 0 && (aditivo ? quitaElTermino(error, ops) : dejaLaXSola(error, ops));
    });
  }
  if (tipo === TIPOS.SIGNO_NEGATIVO) {
    const m = q.texto.match(/: (\S+) (entre|por) (\S+), ¿da positivo o negativo\?$/);
    assert.ok(m, q.texto);
    const valor = m[2] === 'entre' ? fr(m[1]).div(fr(m[3])) : fr(m[1]).mul(fr(m[3]));
    assert.ok(valor.eq(sol.valor), `${m[1]} ${m[2]} ${m[3]} no da la solución de ${error.anterior}`);
    return ids((o) => (o.texto === 'Positivo' && !valor.isNeg() && !valor.isZero()) || (o.texto === 'Negativo' && valor.isNeg()));
  }
  if (tipo === TIPOS.ARITMETICA) {
    const m = q.texto.match(/¿Cuánto es (.+)\?$/);
    if (!m) return ids((o) => o.texto === pack.preguntas.ARITMETICA.correctaCopia); // pregunta de copia: qué conviene hacer
    return ids((o) => {
      const r = parsearRenglon(`${m[1]} = ${o.texto}`);
      if (!r.ok) return false;
      return r.tipo === 'numerica' ? r.verdadera : resolver(r.eq).tipo === 'todas';
    });
  }
  if (tipo === TIPOS.TERMINOS_NO_SEMEJANTES) {
    // Lo que se juntó no es igual a lo que quedó (si lo fuera, la respuesta «No» sería falsa).
    const r = parsearRenglon(`${detalle.terminos} = ${detalle.resultado}`);
    assert.ok(r.ok && r.tipo === 'ecuacion' && resolver(r.eq).tipo !== 'todas', `${detalle.terminos} = ${detalle.resultado}`);
    return ids((o) => o.texto === pack.preguntas.TERMINOS_NO_SEMEJANTES.correcta);
  }
  return ids((o) => o.texto === pack.preguntas.NO_CLASIFICADO.correcta);
}

function revisarPregunta(error, q, donde) {
  textoLimpio(q.texto, `pregunta ${donde}`);
  assert.equal(q.opciones.length, 3, donde);
  assert.equal(new Set(q.opciones.map((o) => o.texto)).size, 3, `opciones repetidas ${donde}`);
  for (const o of q.opciones) {
    textoLimpio(o.texto, `opción ${donde}`);
    textoLimpio(o.retro, `retro ${donde}`);
  }
  const marcadas = q.opciones.filter((o) => o.correcta).map((o) => o.id);
  assert.equal(marcadas.length, 1, `${donde}: ${marcadas.length} opciones marcadas como correctas`);
  assert.deepEqual(
    opcionesValidas(error, q),
    marcadas,
    `${donde}: la opción marcada no es la única que la matemática da por buena\n  ${q.texto}\n  ${q.opciones
      .map((o) => `[${o.correcta ? 'X' : ' '}] ${o.texto}`)
      .join('\n  ')}`,
  );
}

/* ------------------------------------------------------------------ */
/* Pruebas                                                             */
/* ------------------------------------------------------------------ */

describe('Paquete: plantillas bien formadas', () => {
  const DATOS = new Set([
    // detalle del motor
    'termino', 'terminoSinSigno', 'lado', 'otroLado', 'quedo', 'debioQuedar', 'operacion', 'terminos', 'cantidad',
    'resultado', 'coef', 'coefNum', 'b', 'correcto', 'escrito', 'esperado', 'divisor', 'cuenta',
    // derivados en datosError
    'renglon', 'verbo', 'verboInverso', 'verboCap', 'verboInversoCap', 'inversa', 'inversaCap', 'directa', 'directaCap',
    'signoInverso', 'signoMismo', 'elTermino', 'elTerminoCap', 'alTermino', 'coefNumAbs', 'coefNumParentesis',
    'bParentesis', 'divisorParentesis', 'escritoTermino', 'esperadoTermino', 'eseNumero', 'unNumero',
    // pregunta orientadora, pistas, Tecu y panel docente
    'intro', 'otroLadoTexto', 'ejercicio', 'anterior', 'siguiente', 'operaciones', 'operacionesCap', 'antes',
    'siguienteHuecos', 'n', 'dudas', 'dias', 'tema',
  ]);

  test('cada {dato} del paquete es uno que textos.js sabe llenar (una errata dejaría la frase incompleta)', () => {
    for (const [ruta, s] of cadenas(pack)) {
      for (const [, k] of s.matchAll(/\{(\w+)\}/g)) assert.ok(DATOS.has(k), `{${k}} desconocido en ${ruta}`);
      assert.equal((s.match(/\{/g) || []).length, (s.match(/\}/g) || []).length, `llaves sin cerrar en ${ruta}`);
    }
  });

  test('sin «el x», «undefined», «la balanza se cae» ni comas en «Lo que suma pasa restando» (C4, C7, C9)', () => {
    for (const [ruta, s] of cadenas(pack)) {
      assert.ok(!EL_X.test(s) && !/undefined/.test(s), `${ruta}: «${s}»`);
      assert.ok(!/se ca[eíy]/.test(s), `${ruta}: «${s}»`);
    }
    assert.equal(pack.errores.SIGNO_TRANSPOSICION.ruta.titulo, 'Lo que suma pasa restando');
    assert.equal(pack.errores.INVERSA_EQUIVOCADA.ruta.titulo, 'Lo que multiplica pasa dividiendo');
  });

  test('Tecu: claves sin duplicados al quitar acentos (antes «no sé» y «no se» contaban doble) e ids únicos', () => {
    const ids = pack.tecu.respuestas.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const r of pack.tecu.respuestas) {
      assert.equal(new Set(r.claves.map(sinAcentos)).size, r.claves.length, r.id);
      assert.ok(!r.claves.map(sinAcentos).some((k) => ['pasa', 'que es', 'no se', 'para que'].includes(k)), r.id);
    }
  });
});

describe('Barrido amplio de procedimientos con error', () => {
  test('el barrido cubre todas las variantes de error que el motor produce', () => {
    const variantes = new Set(barrido().map(({ error }) => `${error.tipo}:${error.detalle.variante}${error.detalle.divisor ? '+divisor' : ''}`));
    for (const v of [
      'SIGNO_TRANSPOSICION:sin_cambio_signo', 'SIGNO_TRANSPOSICION:varios_sin_cambio_signo', 'INVERSA_EQUIVOCADA:resta',
      'INVERSA_EQUIVOCADA:resta+divisor', 'INVERSA_EQUIVOCADA:divide+divisor', 'INVERSA_EQUIVOCADA:aditivo_divide',
      'ARITMETICA:cuenta', 'ARITMETICA:copia', 'TERMINOS_NO_SEMEJANTES:todo_a_x', 'UN_SOLO_LADO:quita_de_un_lado',
      'UN_SOLO_LADO:varios_quita_de_un_lado', 'UN_SOLO_LADO:divide_solo_x', 'UN_SOLO_LADO:divide_solo_x+divisor',
      'SIGNO_NEGATIVO:pierde_signo', 'NO_CLASIFICADO:desconocido',
    ]) {
      assert.ok(variantes.has(v), `el barrido no produjo ${v}`);
    }
    assert.ok(barrido().length > 1500, `solo ${barrido().length} procedimientos`);
  });

  test('cada variante tiene su propia explicación (alumno y docente) y ningún dato queda sin llenar', () => {
    for (const { error, lineas } of barrido()) {
      const datos = datosError(error);
      for (const audiencia of ['alumno', 'docente']) {
        const donde = `${audiencia} ${error.tipo}:${error.detalle.variante} (${lineas.join(' | ')})`;
        const plantilla = plantillaDe(error, audiencia);
        assert.ok(plantilla, `sin plantilla propia: ${donde}`);
        for (const [, k] of plantilla.matchAll(/\{(\w+)\}/g)) {
          assert.ok(datos[k] !== undefined && datos[k] !== null && datos[k] !== '', `{${k}} sin dato: ${donde}`);
        }
        textoLimpio(explicarError(error, pack, audiencia), donde);
      }
    }
  });

  test('B1: ninguna explicación al estudiante, pista 1–2 ni pregunta revela el valor de x', () => {
    const fugas = [];
    for (const { lineas, r, error } of barrido()) {
      const ctx = contexto(lineas, error);
      const revisar = (texto, que, extra = []) => {
        if (revelaSolucion(paraFiltro(texto), r.solucion, [...ctx, ...extra])) fugas.push(`${que}: ${lineas.join(' | ')} → «${texto}»`);
      };
      revisar(explicarError(error, pack, 'alumno'), `explicación ${error.tipo}`);
      const { pistas } = pistasPara(lineas[0], lineas.slice(1, error.renglon), pack);
      pistas.slice(0, 2).forEach((p, i) => revisar(p, `pista ${i + 1}`));
      const q = preguntaOrientadora(error.tipo, { error, ejercicio: 1 }, pack);
      revisar(q.texto, `pregunta ${error.tipo}`);
      // B3: en la pregunta de cuentas la opción correcta ES el resultado de la cuenta, a propósito (el
      // ejercicio del diagnóstico no vuelve a salir en la ruta). Las retroalimentaciones traen ejemplos fijos
      // («15 ÷ 3», «3 · 4») que no dependen del ejercicio. Las opciones «Sumar 3x: 4x + 1 + 3x» se revisan por
      // partes: el filtro leería «3x: 4» como «x: 4».
      const deCuentas = /¿Cuánto es /.test(q.texto);
      const ejemplosFijos = Object.values(pack.preguntas[error.tipo]);
      for (const o of q.opciones) {
        if (!deCuentas) o.texto.split(': ').forEach((parte) => revisar(parte, `opción ${error.tipo}`));
        revisar(o.retro, `retro ${error.tipo}`, ejemplosFijos);
      }
    }
    assert.deepEqual(fugas.slice(0, 5), [], `${fugas.length} fugas`);
  });

  test('B1 dirigido: seguir la pista 3 («Escribe: x = 15/3») y equivocarse en la cuenta no destapa x', () => {
    let casos = 0;
    for (let a = 2; a <= 9; a++) {
      for (let x0 = 2; x0 <= 12; x0++) {
        for (const [enunciado, previo, mal] of [
          [`${a}x = ${a * x0}`, `x = ${a * x0}/${a}`, `x = ${x0 + 1}`],
          [`x/${a} = ${x0}`, `x = ${x0} · ${a}`, `x = ${x0 * a + 1}`],
        ]) {
          const r = A([enunciado, previo, mal]);
          if (r.estado !== 'error') continue;
          casos++;
          const t = explicarError(r.error, pack, 'alumno');
          assert.ok(!revelaSolucion(paraFiltro(t), r.solucion, [enunciado, previo, mal]), `${enunciado} | ${previo} | ${mal} → «${t}»`);
        }
      }
    }
    assert.ok(casos > 100, `solo ${casos} casos`);
  });

  test('pistas sin huecos y la 3 de «reducir» nunca deja la x con su valor a la vista', () => {
    for (const { lineas, error } of barrido()) {
      const { pistas, paso } = pistasPara(lineas[0], lineas.slice(1, error.renglon), pack);
      assert.equal(pistas.length, 3);
      pistas.forEach((p, i) => textoLimpio(p, `pista ${i + 1} (${lineas.join(' | ')})`));
      if (paso === 'reducir') assert.ok(!/el renglón queda −?x = −?\d/.test(pistas[2]), pistas[2]);
    }
  });

  test('pregunta orientadora: exactamente una opción correcta y es la que dice la matemática', () => {
    for (const { lineas, error } of barrido()) {
      const q = preguntaOrientadora(error.tipo, { error, ejercicio: 1 }, pack);
      assert.ok(q.basadaEnAlumno);
      revisarPregunta(error, q, `${error.tipo}:${error.detalle.variante} (${lineas.join(' | ')})`);
    }
  });

  test('pregunta orientadora con el ejemplo del paquete (sin error propio de ese tipo)', () => {
    for (const tipo of Object.values(TIPOS)) {
      const q = preguntaOrientadora(tipo, null, pack);
      assert.equal(q.basadaEnAlumno, false);
      const error = A(procedimientoConError(pack.errores[tipo].ruta.ejemplo, tipo)).error;
      assert.equal(error.tipo, tipo, `el ejemplo de ${tipo} no produce ese error`);
      revisarPregunta(error, q, `ejemplo ${tipo}`);
      // A10: en modo ejemplo no se le atribuye nada al estudiante.
      for (const t of [q.texto, ...q.opciones.map((o) => o.retro)]) {
        assert.ok(!/diagn[oó]stico|\b(?:[Tt]u método|[Jj]untaste|[Qq]uitaste|[Dd]ividiste)\b/.test(t), `${tipo}: «${t}»`);
      }
    }
  });
});

describe('Correcciones del revisor (regresiones)', () => {
  const error = (...lineas) => A(lineas).error;
  const pregunta = (...lineas) => {
    const e = error(...lineas);
    return { e, q: preguntaOrientadora(e.tipo, { error: e, ejercicio: 2 }, pack) };
  };
  const correcta = (q) => q.opciones.find((o) => o.correcta).texto;
  const textos = (q) => q.opciones.map((o) => o.texto);

  test('A1: si se quitó un número que restaba, al otro lado se le SUMA (antes se marcaba «también se le quita»)', () => {
    for (const [lineas, buena, suya, otra] of [
      [['x/4 − 1 = 2', 'x/4 = 2'], 'Sumar 1 también: 2 + 1', 'Nada, se queda igual: 2', 'Restar 1: 2 − 1'],
      [['2x − 7 = 9', '2x = 9'], 'Sumar 7 también: 9 + 7', 'Nada, se queda igual: 9', 'Restar 7: 9 − 7'],
      [['3x + 5 = 20', '3x = 20'], 'Restar 5 también: 20 − 5', 'Nada, se queda igual: 20', 'Sumar 5: 20 + 5'],
    ]) {
      const { e, q } = pregunta(...lineas);
      assert.equal(e.tipo, TIPOS.UN_SOLO_LADO);
      assert.equal(correcta(q), buena);
      assert.deepEqual(textos(q).sort(), [buena, suya, otra].sort());
      // La «suya» es exactamente el renglón del estudiante.
      assert.equal(`${lineas[1].split(' = ')[0]} = ${suya.split(': ')[1]}`, lineas[1]);
    }
  });

  test('A3/A4: con x/4 se habla del divisor (4), no de «el 1/4 que multiplica»', () => {
    const resta = error('x/4 = 3', 'x = −1');
    assert.match(explicarError(resta, pack), /dividida entre 4 y le restaste 4\. Una división se deshace multiplicando/);
    assert.match(explicarError(resta, pack, 'docente'), /restó el divisor \(3 − 4 = −1\) en lugar de multiplicar/);
    assert.equal(correcta(pregunta('x/4 = 3', 'x = −1').q), 'Multiplicar los dos lados por 4');
    const soloNumero = pregunta('x/4 = 3', 'x/4 = 12');
    assert.match(explicarError(soloNumero.e, pack), /multiplicaste por 4 solo el número/);
    assert.match(soloNumero.q.texto, /se multiplicó por 4 un solo lado/);
    assert.equal(correcta(soloNumero.q), 'También se multiplica por 4');
    assert.match(explicarError(error('x/4 − 1 = 2', 'x = 3'), pack), /multiplicaste por 4 solo el lado de la x/);
    for (const t of [explicarError(resta, pack), explicarError(soloNumero.e, pack)]) assert.ok(!/1\/4/.test(t), t);
  });

  test('A5: signo negativo — el resultado quedó con el signo contrario (no solo «se perdió un menos»)', () => {
    const e = error('−2x = 8', 'x = 4');
    assert.match(explicarError(e, pack), /quedó con el signo contrario/);
    assert.match(explicarError(e, pack, 'docente'), /8 ÷ \(−2\) = −4; escribió 4/);
    assert.match(pistasPara('−2x = 8', [], pack).pistas[0], /−2/);
    assert.equal(pistasPara('−2x = 8', ['x = 4'], pack).pistas[0], pack.pistasPorError.SIGNO_NEGATIVO);
    assert.match(pack.pistasPorError.SIGNO_NEGATIVO, /iguales, el resultado es positivo/);
    // x/4 = −3: la cuenta es una multiplicación.
    const div = pregunta('x/4 = −3', 'x = 12');
    assert.match(div.q.texto, /−3 por 4, ¿da positivo o negativo\?/);
    assert.equal(correcta(div.q), 'Negativo');
  });

  test('A7/C1: la pista 2 nombra todas las operaciones del paso, en imperativo', () => {
    assert.equal(pistasPara('6x + 9 = 2x + 21', [], pack).pistas[1], 'Resta 9 y resta 2x en los dos lados del =. Así la balanza sigue en equilibrio.');
    assert.equal(pistasPara('5x = 2x + 12', [], pack).pistas[1], 'Resta 2x en los dos lados del =.');
    assert.equal(pistasPara('x/4 − 1 = 2', [], pack).pistas[1], 'Suma 1 en los dos lados del =. Así la balanza sigue en equilibrio.');
  });

  test('A8/A11: SIGNO_TRANSPOSICION sin la opción «Dividiendo» y con retro que explica el porqué', () => {
    const { q } = pregunta('3x + 5 = 20', '3x = 25');
    assert.deepEqual(textos(q).sort(), ['Desaparece: 20', 'Restando: 20 − 5', 'Sumando: 20 + 5']);
    assert.ok(!textos(q).some((t) => /÷/.test(t)));
    assert.match(q.opciones.find((o) => o.correcta).retro, /restar 5 en los dos lados/);
  });

  test('A12/A15: textos del docente con la operación correcta y paréntesis en negativos y fracciones', () => {
    assert.equal(explicarError(error('x + 4 = 15', 'x = 15/4'), pack, 'docente'), 'Quitó el término +4 dividiendo en lugar de restar 4 en los dos lados.');
    assert.match(explicarError(error('8x = −2', 'x = −4'), pack, 'docente'), /8 ÷ \(−2\) = −4 en lugar de −2 ÷ 8 = −1\/4/);
    assert.match(explicarError(error('−x = 5', 'x = 6'), pack, 'docente'), /5 − \(−1\) = 6/);
    assert.match(explicarError(error('2x/3 = 4', 'x = 4 − 2/3'), pack, 'docente'), /4 − \(2\/3\)/);
    for (const { error: e } of barrido()) {
      const t = explicarError(e, pack, 'docente');
      assert.ok(!/[÷·+−] −/.test(t), t);
    }
  });

  test('A16: la pista 3 de «reducir» tapa solo el lado que tenía cuentas', () => {
    const tercera = (ej, lineas) => pistasPara(ej, lineas, pack).pistas[2];
    assert.match(tercera('x/4 − 1 = 2', ['x/4 = 2 + 1']), /el renglón queda x\/4 = ▢\./);
    assert.match(tercera('3x + 5 = 20', ['3x = 20 − 5']), /el renglón queda 3x = ▢\./);
    assert.match(tercera('5x + 2 = 2x + 14', ['5x − 2x = 14 − 2']), /el renglón queda ▢x = ▢\./);
    assert.match(tercera('2x = x + 8', ['2x − x = 8']), /el renglón queda x = ▢\./);
    assert.match(tercera('−4x + 12 = −8', ['−4x = −8 − 12']), /el renglón queda −4x = ▢\./);
  });

  test('B1: un error de copia o de cuenta ya no dice cuál era el número correcto', () => {
    const copia = error('2x = 22', 'x = 22/2', 'x = 12');
    assert.equal(copia.detalle.variante, 'copia');
    const t = explicarError(copia, pack);
    assert.equal(t, 'En el renglón 3 escribiste 12, pero ese número no sale del renglón anterior. Revisa cómo lo copiaste o la cuenta que hiciste.');
    assert.match(explicarError(copia, pack, 'docente'), /debía quedar 11 y escribió 12/);
    const coef = pregunta('2x + 3 = 7', 'x + 3 = 7');
    assert.match(explicarError(coef.e, pack), /escribiste x, pero ese término no sale del renglón anterior/);
    assert.match(coef.q.texto, /hay un término que no sale del renglón anterior/);
    assert.equal(correcta(coef.q), 'Revisar cada número y cada cuenta antes de seguir');
  });

  test('C2/C3: el no clasificado no culpa a nadie y da una acción concreta', () => {
    const e = error('3x + 5 = 20', 'x + 5 = 20/3');
    assert.equal(e.tipo, TIPOS.NO_CLASIFICADO);
    assert.match(explicarError(e, pack), /^En el renglón 2 la ecuación cambió y ya no tiene la misma solución\. Todavía no sé explicar/);
    assert.match(explicarError(e, pack, 'docente'), /Pídele que explique ese renglón con sus palabras\.$/);
    assert.equal(pack.errores.NO_CLASIFICADO.nombre, 'Por revisar en clase');
    assert.match(pack.tecu.diagnosticoSiguiente, /en este cel/);
    assert.match(pack.tecu.sinConexionDuda, /en este cel/);
  });

  test('C4: «la x» cuando el término es la x sola', () => {
    const una = error('3x = x + 8', '3x + x = 8');
    assert.match(explicarError(una, pack), /la x cambió de lado pero conservó su signo\. Pasar la x al otro lado es restar x/);
    assert.match(preguntaOrientadora(una.tipo, { error: una, ejercicio: 1 }, pack).texto, /Fíjate en la x: estaba sumando del lado derecho/);
    assert.match(pistasPara('3x = x + 8', ['3x + x = 8'], pack).pistas[0], /¿Qué le pasa a la x al cruzar el =\?/);
    assert.match(explicarError(error('3x + 2 = x + 18', '3x + x = 18 + 2'), pack), /el 2 y la x cambiaron de lado/);
    assert.match(explicarError(error('3x = x + 8', '3x = 8'), pack), /quitaste la x del lado derecho: como estaba sumando, eso es restar x/);
  });

  test('C5/C6: las explicaciones dicen por qué (la operación contraria en los dos lados)', () => {
    assert.match(
      explicarError(error('3x + 5 = 20', '3x = 25'), pack),
      /Pasar el 5 al otro lado es restar 5 en los dos lados del =: por eso, si estaba sumando, aparece restando\./,
    );
    assert.match(
      explicarError(error('x/4 − 1 = 2', 'x/4 = 2'), pack),
      /quitaste el 1 del lado izquierdo: como estaba restando, eso es sumar 1\. Pero al lado derecho no le hiciste nada/,
    );
  });

  test('C11/C13: distractores que son errores reales', () => {
    assert.deepEqual(
      [pack.preguntas.NO_CLASIFICADO.suya, pack.preguntas.NO_CLASIFICADO.otra],
      ['Hago la operación solo del lado donde está la x', 'Paso los números al otro lado sin cambiarles nada'],
    );
    // Con fracciones, la tercera opción de la pregunta de cuentas es la fracción invertida.
    const { e, q } = pregunta('x − 1/3 = 1/2', 'x = 1/2 + 1/3 = 2/5');
    assert.equal(e.tipo, TIPOS.ARITMETICA);
    assert.equal(correcta(q), '5/6');
    assert.deepEqual(textos(q).sort(), ['2/5', '5/6', '6/5']);
  });

  test('coeficiente −1: multiplicar por −1 es la respuesta (dividir y multiplicar por −1 son lo mismo)', () => {
    const { e, q } = pregunta('−x = 5', 'x = 6');
    assert.equal(e.tipo, TIPOS.INVERSA_EQUIVOCADA);
    assert.equal(correcta(q), 'Multiplicar los dos lados por −1');
    assert.ok(!textos(q).some((t) => /^Dividir los dos lados entre −1/.test(t)));
    assert.equal(pistasPara('−x = 5', [], pack).pistas[1], 'Multiplica los dos lados por −1: así −x se vuelve x.');
  });

  test('la opción equivocada de «un solo lado» nunca da por casualidad el valor de x (2x = 4: 4 − 2 = 4 ÷ 2)', () => {
    assert.ok(!textos(pregunta('2x = 4', 'x = 4').q).includes('Se le resta 2'));
    assert.ok(!textos(pregunta('2x = 4', '2x = 2').q).includes('Se le resta 2'));
    assert.ok(!textos(pregunta('x/2 = 2', 'x = 2').q).includes('Se le suma 2'));
    assert.ok(textos(pregunta('2x = −4', 'x = −4').q).includes('Se le resta 2'));
  });

  test('una cadena sin cuenta (x = 25/3 = 26/3) no pregunta «¿Cuánto es 25/3?»', () => {
    const { q } = pregunta('3x = 25', 'x = 25/3 = 26/3');
    assert.ok(!/¿Cuánto es/.test(q.texto), q.texto);
    assert.equal(correcta(q), 'Revisar cada número y cada cuenta antes de seguir');
  });

  test('Ana y Luis conservan su diagnóstico y reciben preguntas con la opción correcta', () => {
    const ana = pregunta('3x + 5 = 20', '3x = 25', 'x = 25/3');
    assert.equal(ana.e.tipo, TIPOS.SIGNO_TRANSPOSICION);
    assert.equal(ana.e.renglon, 2);
    assert.equal(correcta(ana.q), 'Restando: 20 − 5');
    const luis = pregunta('3x + 5 = 20', '3x = 15', 'x = 12');
    assert.equal(luis.e.tipo, TIPOS.INVERSA_EQUIVOCADA);
    assert.equal(luis.e.renglon, 3);
    assert.equal(correcta(luis.q), 'Dividir los dos lados entre 3');
    assert.match(explicarError(luis.e, pack), /una multiplicación se deshace dividiendo/);
  });
});

describe('Respuestas de Tecu (A13, C12)', () => {
  const id = (duda) => pack.tecu.respuestas.find((r) => r.texto === respuestaTecu(duda, pack))?.id ?? 'porDefecto';

  test('las 20 dudas de prueba del revisor caen en su respuesta', () => {
    const dudas = [
      ['¿por qué el 5 pasa restando?', 'cambiar_de_lado'],
      ['¿Qué pasa si divido entre un negativo?', 'signos'],
      ['¿Cómo quito el 4 que está dividiendo a la x?', 'dividir'],
      ['¿por qué no puedo juntar 3x y 5?', 'juntar'],
      ['¿cómo sé si está bien mi resultado?', 'comprobar'],
      ['¿qué es una incógnita?', 'incognita'],
      ['no entiendo nada', 'atorado'],
      ['¿por qué menos por menos da más?', 'signos'],
      ['¿qué hago con el menos de la x?', 'signos'],
      ['¿por qué se divide y no se resta?', 'dividir'],
      ['¿qué es lo que pasa con el signo?', 'cambiar_de_lado'],
      ['¿para qué sirven las ecuaciones?', 'incognita'],
      ['¿cuánto vale x?', 'respuesta'],
      ['dime la respuesta', 'respuesta'],
      ['¿el 3 que multiplica pasa restando?', 'cambiar_de_lado'],
      ['¿cómo paso la x al otro lado?', 'cambiar_de_lado'],
      ['¿por qué cambia de signo?', 'cambiar_de_lado'],
      ['¿por qué −x = 5 da x = −5?', 'opuesto'],
      ['tengo x/3 = 2, ¿qué hago?', 'dividir'],
      ['¿me puedes ayudar?', 'atorado'],
    ];
    const mal = dudas.filter(([duda, esperado]) => id(duda) !== esperado).map(([duda, esperado]) => `${duda} → ${id(duda)} (esperaba ${esperado})`);
    assert.deepEqual(mal, []);
  });

  test('sin acentos ni signos tipográficos también funciona', () => {
    assert.equal(id('cuanto vale x'), 'respuesta');
    assert.equal(id('no se como hacerle'), 'atorado');
    assert.equal(id('por que -x = 5 da x = -5'), 'opuesto');
    assert.equal(id('que es la x'), 'incognita');
  });

  test('a quien pregunta si «el 3 que multiplica pasa restando» no se le refuerza el error de Luis', () => {
    assert.match(respuestaTecu('¿el 3 que multiplica pasa restando?', pack), /el número pegado a la x la multiplica y se quita dividiendo/);
  });

  test('nunca da la respuesta y nunca contesta «Buena pregunta» a «dime cuánto vale x»', () => {
    for (const r of [...pack.tecu.respuestas.map((x) => x.texto), pack.tecu.porDefecto]) textoLimpio(r, 'Tecu');
    assert.notEqual(respuestaTecu('dime cuánto vale x', pack), pack.tecu.porDefecto);
    assert.match(respuestaTecu('dime la respuesta', pack), /No te doy la respuesta, pero te ayudo a encontrarla/);
  });
});

describe('Textos para el docente', () => {
  test('sugerencia de 15 minutos para cada tipo, con el ejercicio y sin huecos', () => {
    for (const tipo of Object.values(TIPOS)) {
      const t = sugerenciaLlamada(tipo, '2x - 7 = 9', pack);
      textoLimpio(t, `llamada15 ${tipo}`);
      assert.match(t, /2x − 7 = 9/, tipo);
      textoLimpio(pack.errores[tipo].actividadGrupo, `actividadGrupo ${tipo}`);
    }
  });

  test('panel: textos para llamar a quien no entra o no ha hecho el diagnóstico', () => {
    const inactivo = sugerenciaPorMotivo('inactivo', { dias: 9 }, pack);
    assert.match(inactivo, /^No ha entrado en 9 días\./);
    assert.match(inactivo, /cuadernillo impreso de ecuaciones lineales con una incógnita\.$/);
    assert.match(sugerenciaPorMotivo('inactivo', { dias: 1, tema: 'ecuaciones' }, pack), /en 1 día\..*de ecuaciones\.$/);
    assert.match(sugerenciaPorMotivo('inactivo', {}, pack), /en varios días/);
    const sinDiag = sugerenciaPorMotivo('sin_diagnostico', {}, pack);
    assert.match(sinDiag, /4 ecuaciones del diagnóstico en papel/);
    for (const t of [inactivo, sinDiag]) textoLimpio(t, 'llamadas');
    assert.equal(sugerenciaPorMotivo('motivo_que_no_existe', {}, pack), '');
  });
});
