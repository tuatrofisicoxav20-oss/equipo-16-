/**
 * Textos para personas a partir de los resultados del motor.
 *
 * El motor (engine.js) devuelve códigos y datos (qué término, qué lado, qué
 * número). Aquí se llenan las plantillas del paquete de contenido para:
 *   - explicar un error al estudiante o al docente,
 *   - armar la escalera de pistas del ejercicio que se está resolviendo,
 *   - construir la pregunta orientadora de Tecu,
 *   - contestar dudas con respuestas preparadas,
 *   - leer el contenido de la app unificada: lecciones, botones del tutor
 *     («otra forma», «ejemplo cotidiano», nivel de apoyo) y plantillas de
 *     retroalimentación.
 *
 * Módulo puro: recibe el paquete como parámetro.
 */
import {
  TIPOS,
  analizarProcedimiento,
  bonito,
  fmtEcuacion,
  fmtLado,
  fmtNum,
  parsearRenglon,
  pasosSolucion,
  procedimientoConError,
  resolver,
  siguientePaso,
} from './engine.js';
import { Fr } from './fraction.js';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** «a», «a y b», «a, b y c». */
const enLista = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

/** Un número dentro de una cuenta: negativos y fracciones entre paréntesis («8 ÷ (−2)», «4 ÷ (2/3)»). */
const entreParentesis = (n) => (/^−|\//.test(n) ? `(${n})` : n);

/** «la x» (también «la x/4») cuando el término es la x sola; «el 5», «el 2x» en los demás casos. */
const esLaX = (t) => /^x/.test(t);

const conDato = (v) => v !== undefined && v !== null && v !== '';

/**
 * Reemplaza {clave} por datos[clave]. Las claves sin dato se quitan.
 * Con {clave|uno|varios} escribe el número y la palabra que le toca:
 * «{sueltas|pesa suelta|pesas sueltas}» → «1 pesa suelta», «5 pesas sueltas».
 */
export function rellenar(plantilla, datos = {}) {
  const d = datos || {};
  return String(plantilla ?? '')
    .replace(/\{(\w+)\|([^{}|]*)\|([^{}|]*)\}/g, (_, k, uno, varios) =>
      conDato(d[k]) ? `${d[k]} ${String(d[k]) === '1' ? uno : varios}` : '',
    )
    .replace(/\{(\w+)\}/g, (_, k) => (d[k] === undefined || d[k] === null ? '' : String(d[k])))
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Nombres de los datos que pide una plantilla ({clave} y {clave|uno|varios}). */
const datosDe = (plantilla) => [...String(plantilla ?? '').matchAll(/\{(\w+)(?:\|[^{}]*)?\}/g)].map((m) => m[1]);

/** La primera plantilla de la lista que se puede llenar completa con `datos` (o la última, la más general). */
function primeraCompleta(variantes, datos) {
  const lista = [].concat(variantes ?? []).filter((p) => typeof p === 'string' && p);
  return lista.find((p) => datosDe(p).every((k) => conDato(datos[k]))) ?? lista[lista.length - 1] ?? '';
}

/** Fracción a partir de su texto ASCII o de pantalla ("25/3", "-4", "−4"). */
function fraccion(texto) {
  const [n, d = '1'] = String(texto).replace('−', '-').split('/');
  return new Fr(Number(n), Number(d));
}

/** Muestra un valor como número ("25/3", "−4") o como término con x ("5x", "x", "−x", "x/2"). */
function formatearValor(fr, esX) {
  if (!esX || fr.isZero()) return fmtNum(fr);
  return fmtLado([{ c: fr, x: true }]);
}

/**
 * Varios términos con el mismo error («el 14 y el 5x», lista armada por el motor): se dejan en el
 * orden de la ecuación (primero los del lado izquierdo) y, si no están todos del mismo lado, se
 * arma además `terminosConLado` («el 5x del lado izquierdo y el 14 del lado derecho»).
 *
 * El motor siempre toma esos términos de los que estorban para despejar: los números que están
 * de un lado y las x que están del otro. Por eso basta el lado del primero (`lado`, `esX`).
 */
function ordenarVarios(d) {
  const piezas = d.terminos.split(/, | y /);
  if (piezas.length < 2 || !d.lado || !d.otroLado || !piezas.every((p) => /^(?:el|la) \S+$/.test(p))) return;
  const conLado = piezas.map((p) => ({ p, lado: /x/.test(p) === Boolean(d.esX) ? d.lado : d.otroLado }));
  const orden = [...conLado.filter((t) => t.lado === 'izquierdo'), ...conLado.filter((t) => t.lado !== 'izquierdo')];
  d.terminos = enLista(orden.map((t) => t.p));
  const lados = [...new Set(orden.map((t) => t.lado))];
  if (lados.length > 1) {
    d.ladosDistintos = true;
    d.terminosConLado = lados
      .map((lado) => `${enLista(orden.filter((t) => t.lado === lado).map((t) => t.p))} del lado ${lado}`)
      .join(' y ');
  }
}

/** Campos derivados que usan las plantillas (verbo, operación inversa, etc.). */
export function datosError(error) {
  const e = error || {};
  const d = { ...(e.detalle || {}) };
  if (e.renglon) d.renglon = e.renglon;
  if (d.signoOriginal) {
    const suma = d.signoOriginal === 'suma';
    d.verbo = suma ? 'sumando' : 'restando';
    d.verboInverso = suma ? 'restando' : 'sumando';
    d.verboCap = cap(d.verbo);
    d.verboInversoCap = cap(d.verboInverso);
    d.inversa = suma ? 'restar' : 'sumar';
    d.inversaCap = cap(d.inversa);
    // La operación que repite el error (sumar lo que ya sumaba): distractor de UN_SOLO_LADO.
    d.directa = suma ? 'sumar' : 'restar';
    d.directaCap = cap(d.directa);
    d.signoInverso = suma ? '−' : '+';
    d.signoMismo = suma ? '+' : '−';
  }
  if (d.terminoSinSigno) {
    const laX = esLaX(d.terminoSinSigno);
    d.elTermino = `${laX ? 'la' : 'el'} ${d.terminoSinSigno}`;
    d.elTerminoCap = cap(d.elTermino);
    d.alTermino = `${laX ? 'a la' : 'al'} ${d.terminoSinSigno}`;
  }
  if (typeof d.terminos === 'string') {
    // «el 2 y el x» (lista armada por el motor) → «el 2 y la x».
    d.terminos = d.terminos.replace(/\bel (x[^\s,]*)(?=,| y |$)/g, 'la $1');
    ordenarVarios(d);
  }
  if (d.coefNum) {
    d.coefNumAbs = d.coefNum.replace('−', '');
    d.coefNumParentesis = entreParentesis(d.coefNum);
  }
  if (d.b) d.bParentesis = entreParentesis(d.b);
  if (d.divisor) d.divisorParentesis = entreParentesis(d.divisor);
  if (d.escritoValor !== undefined && d.escrito !== undefined) {
    // ARITMETICA: si lo que cambió es el coeficiente de la x, se muestra el término ("x", "4x"), no "1" o "4".
    const coeficiente = d.esX && !/x/.test(String(d.escrito));
    try {
      d.escritoTermino = coeficiente ? formatearValor(fraccion(d.escritoValor), true) : d.escrito;
      d.esperadoTermino = coeficiente ? formatearValor(fraccion(d.esperadoValor), true) : d.esperado;
    } catch {
      d.escritoTermino = d.escrito;
      d.esperadoTermino = d.esperado;
    }
    d.eseNumero = coeficiente ? 'ese término' : 'ese número';
    d.unNumero = coeficiente ? 'un término' : 'un número';
  }
  return d;
}

/** −x (coeficiente −1): se habla del opuesto y de multiplicar por −1, igual que en la pista de ese paso. */
const esOpuesto = (d) => d.coefNum === '−1' && !d.divisor;

/**
 * Explicación de un error para el estudiante ('alumno') o el docente ('docente').
 *
 * Cada variante del motor tiene su plantilla; algunas tienen además una versión más precisa
 * que se prefiere cuando aplica:
 *   `<variante>_divisor`          la x estaba dividida (x/4 = 3): se habla del divisor, no de «1/4»;
 *   `<variante>_opuesto`          el coeficiente es −1 (−x = 5): se habla de multiplicar por −1;
 *   `<variante>_lados_distintos`  varios términos quitados que no estaban todos del mismo lado.
 *
 * @param {{tipo: string, renglon: number, detalle: object}} error
 */
export function explicarError(error, pack, audiencia = 'alumno') {
  const e = error || {};
  const info = pack.errores[e.tipo] || pack.errores[TIPOS.NO_CLASIFICADO];
  const plantillas = info[audiencia] || info.alumno;
  const d = datosError(e);
  const variante = d.variante;
  // x/4 = 3: el "coeficiente" es 1/4, pero se habla del divisor (4): «multiplicaste», «le restaste 4».
  const sufijo = d.divisor ? 'divisor' : esOpuesto(d) ? 'opuesto' : d.ladosDistintos ? 'lados_distintos' : null;
  const plantilla = (sufijo && plantillas[`${variante}_${sufijo}`]) || plantillas[variante] || Object.values(plantillas)[0];
  return rellenar(plantilla, d);
}

export function nombreError(tipo, pack, corto = false) {
  const info = pack.errores[tipo];
  if (!info) return tipo;
  return corto ? info.nombreCorto : info.nombre;
}

/* ------------------------------------------------------------------ */
/* Pistas en escalera                                                  */
/* ------------------------------------------------------------------ */

/** Tapa los números de un lado del renglón, con todo y signo: «−20» → «▢», «−2x» → «▢x». */
const tapar = (lado) => lado.replace(/−?\d+(?:\/\d+)?/g, '▢');

/**
 * Renglón reducido con huecos, para la pista 3 de "reducir". Solo se tapa el lado
 * que tenía más de un término (x/4 = 2 + 1 → «x/4 = ▢», no «x/▢ = ▢»), salvo que
 * así quede la x sola con su valor a la vista (2x − x = 8 → «x = ▢», nunca «x = 8»).
 */
function renglonConHuecos(antes, despues) {
  const [antesL = '', antesR = ''] = antes.split(' = ');
  const [L = '', R = ''] = despues.split(' = ');
  const teniaVarios = (lado) => / [+−] /.test(lado);
  const nuevoL = teniaVarios(antesL) ? tapar(L) : L;
  let nuevoR = teniaVarios(antesR) ? tapar(R) : R;
  if (!nuevoR.includes('▢') && /^−?x$/.test(nuevoL)) nuevoR = tapar(R);
  return `${nuevoL} = ${nuevoR}`;
}

function datosPaso(paso) {
  const d = { siguiente: paso.texto };
  if (paso.tipo === 'transponer_constante' || paso.tipo === 'transponer_x') {
    const buscado = paso.tipo === 'transponer_constante' ? false : true;
    const w = paso.movidos.find((m) => m.esX === buscado) || paso.movidos[0];
    Object.assign(d, datosError({ detalle: w }));
    // Todas las operaciones del paso, en imperativo, para que la pista 2 coincida con la 3:
    // 5x + 2 = 2x + 14 → «Resta 2 y resta 2x en los dos lados del =».
    d.operaciones = enLista(
      paso.movidos.map((m) => `${m.signoOriginal === 'suma' ? 'resta' : 'suma'} ${m.terminoSinSigno}`),
    );
    d.operacionesCap = cap(d.operaciones);
    // La cuenta que queda del lado de los números (la x se muestra a la izquierda).
    d.cuenta = fmtLado(paso.eq.R);
  } else if (paso.tipo === 'reducir') {
    d.antes = paso.antes;
    d.siguienteHuecos = renglonConHuecos(paso.antes, paso.texto);
  } else if (paso.tipo === 'dividir') {
    Object.assign(d, datosError({ detalle: { coefNum: paso.coef } }), { b: paso.b });
  } else if (paso.tipo === 'multiplicar') {
    d.divisor = paso.divisor;
    d.b = paso.b;
  } else if (paso.tipo === 'cambiar_signo') {
    d.b = paso.b;
  }
  return d;
}

/**
 * Escalera de 3 pistas para el ejercicio, según lo que el estudiante lleva
 * escrito y el error detectado. La solución completa va aparte: la interfaz
 * solo la muestra si el estudiante la pide (y queda registrado).
 *
 * @param {string} ejercicioTexto
 * @param {string[]} renglonesAlumno renglones escritos por el estudiante (sin el enunciado)
 * @returns {{pistas: string[], solucion: string[], paso: string|null, error: object|null}}
 *   `paso`: tipo del siguiente paso ('transponer_constante', 'reducir', 'dividir'…; 'distribuir'
 *   si antes hay que quitar un paréntesis; null si ya no hay paso o el ejercicio no sirve).
 */
export function pistasPara(ejercicioTexto, renglonesAlumno, pack) {
  try {
    return pistasSinRed(ejercicioTexto, renglonesAlumno, pack);
  } catch (e) {
    // Números fuera de rango o un renglón raro: pistas generales, nunca una excepción en pantalla.
    // Lo que no sea un desborde es un defecto nuestro: que quede en la consola y no pase en silencio.
    if (!(e instanceof RangeError)) console.error(e);
    return {
      pistas: pack.pistas.revisar.map((p) => rellenar(p, { renglon: 'anterior', anterior: bonito(ejercicioTexto) })),
      solucion: [],
      paso: null,
      error: null,
    };
  }
}

const PISTAS_EJERCICIO_INVALIDO = [
  'Revisa que el ejercicio tenga números, una x, signos y un solo =.',
  'Si está bien escrito y aun así no se puede resolver, pide otro ejercicio.',
];

/** ¿El renglón tiene un paréntesis con la x adentro? Antes de mover términos hay que quitarlo. */
const conParentesis = (texto) => /\([^()]*x[^()]*\)/i.test(String(texto ?? ''));

function pistasSinRed(ejercicioTexto, renglonesAlumno, pack) {
  const enunciado = String(ejercicioTexto ?? '').trim();
  const todos = [ejercicioTexto, ...(renglonesAlumno || [])];
  const analisis = analizarProcedimiento(todos);
  const primero = analisis.renglones?.[0];
  // Sin enunciado, el motor tomaría como ejercicio el primer renglón del estudiante.
  const ejercicioInvalido =
    !enunciado ||
    analisis.estado === 'vacio' ||
    analisis.estado === 'sin_solucion_unica' ||
    (analisis.estado === 'sin_entender' && analisis.renglon === 1) ||
    !primero?.eq ||
    (primero.n ?? 1) !== 1;
  if (ejercicioInvalido) {
    // Ejercicio escrito a mano (modo libre) que no se puede resolver paso a paso: decir por qué
    // (antes: "Revisa el renglón anterior…" o, si no tenía solución, "Ya tienes la x sola").
    return {
      pistas: [(enunciado && analisis.mensaje) || 'Escribe primero el ejercicio.', ...PISTAS_EJERCICIO_INVALIDO],
      solucion: enunciado ? [bonito(enunciado)] : [],
      paso: null,
      error: null,
    };
  }
  const inicial = primero.eq; // ya parseado: no hace falta volver a llamar a ecuacion()
  let base = primero;
  let error = null;

  if (analisis.estado === 'error') error = analisis.error;
  if (['error', 'incompleto', 'correcto'].includes(analisis.estado)) {
    const ultimaValida = [...analisis.renglones].reverse().find((r) => r.valido && r.tipo === 'ecuacion');
    if (ultimaValida) base = ultimaValida;
  }

  // 2(x + 3) = 14: el motor ya lo lee como 2x + 6 = 14; el estudiante todavía tiene que escribirlo.
  const sinParentesis = (r) => (conParentesis(r.texto) && fmtEcuacion(r.eq) !== bonito(r.texto) ? fmtEcuacion(r.eq) : null);
  const expandidoInicial = sinParentesis(primero);
  const solucion = [
    bonito(enunciado),
    ...(expandidoInicial ? [expandidoInicial] : []),
    ...pasosSolucion(inicial).map((p) => p.texto),
  ];
  const paso = siguientePaso(base.eq);
  if (!paso) {
    return {
      pistas: [
        'Ya tienes la x sola. ¿Cómo puedes comprobar que tu respuesta es correcta?',
        'Sustituye tu valor de x en la ecuación original.',
        'Si los dos lados dan el mismo número, tu respuesta es correcta.',
      ],
      solucion,
      paso: null,
      error,
    };
  }
  const expandido = pack.pistas.distribuir ? sinParentesis(base) : null;
  const datos = expandido ? { siguiente: expandido } : datosPaso(paso);
  const plantillas = (expandido ? pack.pistas.distribuir : pack.pistas[paso.tipo]) || pack.pistas.revisar;
  const pistas = plantillas.map((p) => rellenar(p, datos));
  if (error && pack.pistasPorError[error.tipo]) {
    pistas[0] = rellenar(pack.pistasPorError[error.tipo], { ...datos, ...datosError(error) });
  }
  return { pistas, solucion, paso: expandido ? 'distribuir' : paso.tipo, error };
}

/* ------------------------------------------------------------------ */
/* Pregunta orientadora                                                */
/* ------------------------------------------------------------------ */

const ladoClave = { izquierdo: 'L', derecho: 'R' };

/**
 * Tercera opción de la pregunta de cuentas: un error creíble que no sea ni el
 * resultado correcto ni el del estudiante. Con fracciones, la fracción invertida
 * (dividir al revés, 3/25 en vez de 25/3); si no, un valor cercano. Se escribe
 * igual que las otras dos opciones: con x solo si ellas la llevan ("4x" en una
 * cadena 3x + 2x = 4x; "4" si la cuenta es de coeficientes, 5 − 2).
 */
function distractor(d) {
  try {
    const esperado = fraccion(d.esperadoValor ?? d.esperado);
    const escrito = fraccion(d.escritoValor ?? d.escrito);
    const conX = /x/.test(String(d.esperado));
    const candidatos = [];
    if (!esperado.isInt()) candidatos.push(esperado.inv());
    for (const delta of [1, -1, 2, -2, 3]) candidatos.push(esperado.add(delta));
    const elegido = candidatos.find((c) => !c.eq(esperado) && !c.eq(escrito));
    if (elegido) return formatearValor(elegido, conX);
  } catch {
    /* valor que no se pudo leer: opción genérica */
  }
  return 'Ninguna de estas';
}

/**
 * UN_SOLO_LADO al dividir o multiplicar un solo lado: la opción equivocada es sumar o
 * restar el mismo número del otro lado. ¿Daría, por casualidad, el mismo valor de x?
 * Con 2x = 4, «se le resta 2» da 4 − 2 = 2 = 4 ÷ 2; con x/2 = 2, «se le suma 2» da
 * 2 + 2 = 4 = 2 · 2. Vale igual si se dividió el lado de la x o el de los números.
 *   dividir entre n (n·x = b), restar n:        b(n − 1) = n²
 *   multiplicar por k (x/k = b), sumar k:      b(k − 1) = k
 *   multiplicar por −1 (−x = b), sumar 1:      b + 1 = −b
 * @param {'Divide'|'Multiplica'|'Opuesto'} caso
 */
function otraUnLadoCoincide(d, caso) {
  try {
    const b = fraccion(d.b);
    if (caso === 'Opuesto') return b.add(1).eq(b.neg());
    if (caso === 'Multiplica') {
      const k = fraccion(d.divisor);
      return b.mul(k.sub(1)).eq(k);
    }
    const n = fraccion(d.coefNum);
    return b.mul(n.sub(1)).eq(n.mul(n));
  } catch {
    return false;
  }
}

/** Rota las opciones para que la correcta no siempre quede en el mismo lugar. */
function ordenar(opciones, semilla) {
  const k = Math.abs(semilla) % opciones.length;
  return [...opciones.slice(k), ...opciones.slice(0, k)];
}

/**
 * Pregunta de Tecu para iniciar la mini-ruta. Si tenemos el error real del
 * estudiante (del diagnóstico), la pregunta lo cita; si no, usa un ejemplo.
 *
 * @param {string} tipo
 * @param {{error: object, ejercicio: number}|null} delAlumno
 */
export function preguntaOrientadora(tipo, delAlumno, pack) {
  const q = pack.preguntas[tipo] || pack.preguntas[TIPOS.NO_CLASIFICADO];
  const suyo = delAlumno?.error && delAlumno.error.tipo === tipo ? delAlumno.error : null;
  let error = suyo;
  let intro;
  if (error) {
    intro = rellenar(pack.preguntas.introDiagnostico, {
      ejercicio: delAlumno.ejercicio,
      anterior: bonito(error.anterior),
      escrito: bonito(error.texto),
    });
  } else {
    const ejemplo = pack.errores[tipo]?.ruta?.ejemplo;
    const lineas = ejemplo ? procedimientoConError(ejemplo, tipo) : null;
    const an = lineas ? analizarProcedimiento(lineas) : null;
    error = an?.estado === 'error' ? an.error : null;
    intro = error
      ? rellenar(pack.preguntas.introEjemplo, { anterior: bonito(error.anterior), escrito: bonito(error.texto) })
      : '';
  }
  const d = { ...datosError(error || {}), intro };
  const variante = error?.detalle?.variante;

  // Texto del lado contrario al término (para "20 − 5" en la opción correcta).
  if (error && d.lado) {
    const previa = parsearRenglon(error.anterior);
    if (previa.ok) {
      const destino = ladoClave[d.lado] === 'L' ? 'R' : 'L';
      d.otroLadoTexto = fmtLado(previa.eq[destino]);
    }
  }

  let texto;
  let opciones;
  const op = (id, plantilla, correcta, retro) => ({
    id,
    texto: rellenar(plantilla, d),
    correcta,
    retro: rellenar(retro, d),
  });
  /** Las tres opciones de una familia de claves: correcta<S>, suya<S>, otra<S><alt> y sus retro. */
  const familia = (s, alt = '') => [
    op('a', q[`correcta${s}`], true, q[`retroCorrecta${s}`]),
    op('b', q[`suya${s}`], false, q[`retroSuya${s}`]),
    op('c', q[`otra${s}${alt}`], false, q[`retroOtra${s}${alt}`]),
  ];
  const sinRepetir = (ops) => new Set(ops.map((o) => o.texto)).size === ops.length;

  if (tipo === TIPOS.ARITMETICA) {
    const deCuenta = [
      { id: 'a', texto: d.esperado, correcta: true, retro: rellenar(q.retroCorrecta, d) },
      { id: 'b', texto: d.escrito, correcta: false, retro: rellenar(q.retroSuya, d) },
      { id: 'c', texto: distractor(d), correcta: false, retro: rellenar(q.retroOtra, d) },
    ];
    // Sin cuenta que hacer (x = 25/3 = 26/3: «¿Cuánto es 25/3?» se contesta solo) o con dos opciones
    // que se leerían igual, se pregunta como copia.
    if (variante === 'copia' || !d.cuenta || d.cuenta === d.esperado || !sinRepetir(deCuenta)) {
      texto = rellenar(q.textoCopia, d);
      opciones = familia('Copia');
    } else {
      texto = rellenar(q.texto, d);
      opciones = deCuenta;
    }
  } else if (tipo === TIPOS.SIGNO_NEGATIVO) {
    // x/4 = −3: la cuenta es −3 · 4 (se pregunta por la multiplicación, no por "−3 entre 1/4").
    // −x = 5: la cuenta es 5 · (−1), como en la pista «Multiplica los dos lados por −1».
    const plantilla =
      (d.divisor && q.textoMultiplica) || (esOpuesto(d) && q.textoOpuesto) || q.texto;
    texto = rellenar(plantilla, d);
    const negativo = String(d.correcto || '').startsWith('−');
    opciones = [
      { id: 'a', texto: 'Positivo', correcta: !negativo, retro: rellenar(negativo ? q.retroSuya : q.retroCorrecta, d) },
      { id: 'b', texto: 'Negativo', correcta: negativo, retro: rellenar(negativo ? q.retroCorrecta : q.retroSuya, d) },
      { id: 'c', texto: 'Depende de cuál número es más grande', correcta: false, retro: rellenar(q.retroOtra, d) },
    ];
  } else if (tipo === TIPOS.INVERSA_EQUIVOCADA && (variante === 'divide' || d.divisor)) {
    // La x estaba dividida (x/4 = 3): da igual si volvió a dividir o restó el 4, lo que la deshace es multiplicar.
    texto = rellenar(q.textoDivide, d);
    opciones = familia('Divide');
  } else if (tipo === TIPOS.INVERSA_EQUIVOCADA && String(variante).startsWith('aditivo')) {
    texto = rellenar(q.textoAditivo, d);
    opciones = familia('Aditivo');
  } else if (tipo === TIPOS.INVERSA_EQUIVOCADA && esOpuesto(d) && q.textoOpuesto) {
    // −x = 5: dividir entre −1 y multiplicar por −1 son la misma operación (las dos serían correctas).
    // Se pregunta como en la pista de ese paso: «Multiplica los dos lados por −1».
    texto = rellenar(q.textoOpuesto, d);
    opciones = familia('Opuesto');
  } else if (tipo === TIPOS.INVERSA_EQUIVOCADA && variante === 'invierte' && q.textoInvierte) {
    // 3x = 12 → x = 3/12: sí dividió, pero al revés. Se pregunta por el orden de la división,
    // no por la operación (esa ya la sabía).
    texto = rellenar(q.textoInvierte, d);
    opciones = familia('Invierte');
  } else if (tipo === TIPOS.UN_SOLO_LADO && String(variante).startsWith('divide')) {
    // Con x/4 la operación de un solo lado fue multiplicar por 4; con −x, multiplicar por −1.
    const s = d.divisor && q.textoMultiplica ? 'Multiplica' : esOpuesto(d) && q.textoOpuesto ? 'Opuesto' : 'Divide';
    // La opción equivocada nunca debe dar, por casualidad, el valor correcto de x.
    const alt = q[`otra${s}Alt`] && otraUnLadoCoincide(d, s) ? 'Alt' : '';
    texto = rellenar(q[`texto${s}`], d);
    opciones = familia(s, alt);
  } else {
    texto = rellenar(q.texto, d);
    opciones = familia('');
  }
  const semilla = String(tipo).length + (error?.renglon || 0);
  return { texto, opciones: ordenar(opciones, semilla), basadaEnAlumno: Boolean(suyo) };
}

/* ------------------------------------------------------------------ */
/* Respuestas preparadas de Tecu                                       */
/* ------------------------------------------------------------------ */

const sinAcentos = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** La duda lista para buscar claves: sin acentos ni signos de puntuación, y su «forma» con # en lugar de cada número. */
function prepararDuda(pregunta) {
  const texto = sinAcentos(pregunta)
    .replace(/[¿?¡!,;"«»]/g, ' ')
    .replace(/\.(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { texto, forma: texto.replace(/\d+(?:[.,/]\d+)?/g, '#') };
}

/**
 * ¿La clave está en la duda? Tres formas de escribir una clave en el paquete:
 *   «pasa restando»   aparece en cualquier parte de la duda;
 *   «no sé$»          la duda termina ahí («pues no sé», pero no «no sé cómo» ni «no se puede sumar»);
 *   «# de #x»         # es cualquier número («el 4 de 4x», «el 12 de 12x»).
 */
function claveEnDuda(clave, duda) {
  const alFinal = clave.endsWith('$');
  const k = alFinal ? clave.slice(0, -1) : clave;
  const t = k.includes('#') ? duda.forma : duda.texto;
  if (!alFinal) return t.includes(k);
  const fin = t.replace(/[^\p{L}\p{N}#]+$/u, '');
  return fin === k || fin.endsWith(` ${k}`);
}

/**
 * Grupo de respuestas preparadas (pack.tecu.respuestas) que mejor corresponde a una duda escrita.
 * Gana el grupo con más claves distintas dentro de la duda; en un empate, el que va primero
 * en el paquete (por eso los saludos y agradecimientos van al final).
 * @returns {{id: string, claves: string[], texto: string}|null} null si ninguna clave coincide
 */
export function clasificarDuda(pregunta, pack) {
  const duda = prepararDuda(pregunta);
  let mejor = null;
  let puntos = 0;
  for (const r of pack.tecu?.respuestas || []) {
    // Sin duplicados al quitar acentos: «no sé» y «no se» cuentan una sola vez.
    const p = [...new Set(r.claves.map(sinAcentos))].filter((k) => claveEnDuda(k, duda)).length;
    if (p > puntos) {
      mejor = r;
      puntos = p;
    }
  }
  return mejor;
}

/**
 * Respuesta preparada para una duda escrita (ver clasificarDuda). Si ninguna clave
 * coincide, la respuesta por defecto del paquete.
 */
export function respuestaTecu(pregunta, pack) {
  const grupo = clasificarDuda(pregunta, pack);
  return grupo ? grupo.texto : pack.tecu.porDefecto;
}

/** Sugerencia de 15 minutos para el docente. */
export function sugerenciaLlamada(tipo, ejercicio, pack) {
  const info = pack.errores[tipo] || pack.errores[TIPOS.NO_CLASIFICADO];
  return rellenar(info.llamada15, { ejercicio: bonito(ejercicio) });
}

/**
 * Sugerencia para el docente cuando el motivo de la llamada no es un error
 * (pack.llamadas): 'inactivo' o 'sin_diagnostico'. Devuelve '' si el paquete
 * no tiene texto para ese motivo.
 * @param {string} motivo
 * @param {{dias?: number, tema?: string}} [datos] días sin entrar; tema del cuadernillo (por omisión, el del paquete)
 */
export function sugerenciaPorMotivo(motivo, datos = {}, pack) {
  const plantilla = pack.llamadas?.[motivo];
  if (!plantilla) return '';
  const n = Math.round(Number(datos.dias));
  const tema = datos.tema || (pack.tema ? pack.tema[0].toLowerCase() + pack.tema.slice(1) : 'el tema');
  const texto = rellenar(plantilla, { dias: Number.isFinite(n) && n >= 0 ? n : 'varios', tema });
  return n === 1 ? texto.replace('1 días', '1 día') : texto;
}

/* ------------------------------------------------------------------ */
/* Lecciones (pantalla «Aprender»)                                     */
/* ------------------------------------------------------------------ */

/**
 * @typedef {object} Leccion
 * @property {string} clave tipo de error o id de habilidad al que pertenece la lección
 * @property {string} titulo
 * @property {string} meta qué se aprende (la meta de la ruta, o la de la habilidad)
 * @property {string[]} pasos de 3 a 5 frases cortas (formato «Paso a paso»)
 * @property {string|null} ejemplo ecuación de ejemplo (sus renglones: pasosExplicados)
 * @property {{modo: string, ecuacion: string, unLado?: boolean, instruccion: string, cierre: string}|null} visual
 *   configuración de la balanza interactiva (formato «Visual»)
 * @property {string} cotidiano ejemplo de la vida diaria (formato «Ejemplo cotidiano»)
 * @property {string} escuchar el mismo contenido redactado para oírse (formato «Escuchar»)
 */

/**
 * Lección de un tipo de error (la de su ruta) o de una habilidad (pack.lecciones).
 * Si la clave es una habilidad sin lección propia, se usa la del primer tipo de error que la
 * afecta; si no se reconoce, la lección general (NO_CLASIFICADO). El título, la meta, el ejemplo
 * y la balanza de las lecciones por tipo de error salen de `pack.errores[tipo].ruta`, para que
 * la lección y la ruta nunca digan cosas distintas.
 *
 * @param {string} clave tipo de error ('SIGNO_TRANSPOSICION'…) o id de habilidad ('leer', 'plantear'…)
 * @param {object} pack
 * @returns {Leccion|null} null si el paquete no trae lecciones
 */
export function leccionPara(clave, pack) {
  const lecciones = pack?.lecciones || {};
  let id = lecciones[clave] ? clave : null;
  if (!id) {
    const habilidad = (pack?.habilidades || []).find((h) => h.id === clave);
    id = habilidad?.errores?.find((t) => lecciones[t]) ?? (lecciones[TIPOS.NO_CLASIFICADO] ? TIPOS.NO_CLASIFICADO : null);
  }
  if (!id) return null;
  const leccion = lecciones[id];
  const ruta = pack.errores?.[id]?.ruta || {};
  return {
    clave: id,
    titulo: leccion.titulo || ruta.titulo || '',
    meta: leccion.meta || ruta.meta || '',
    pasos: [...(leccion.pasos || [])],
    ejemplo: leccion.ejemplo || ruta.ejemplo || null,
    visual: leccion.visual || ruta.visual || null,
    cotidiano: leccion.cotidiano || '',
    escuchar: leccion.escuchar || '',
  };
}

/**
 * Resolución de una ecuación renglón por renglón, con lo que se hizo en cada uno (pack.pasos).
 * Es el «Paso a paso» del ejemplo de una lección y sirve para «Ver la solución».
 * OJO: el último renglón dice cuánto vale x; no usar como pista.
 *
 * @param {string} ecuacionTexto p. ej. '2x + 3 = 11'
 * @param {object} pack
 * @returns {{renglon: string, explicacion: string}[]} el primero es la ecuación tal cual; [] si no se puede resolver
 */
export function pasosExplicados(ecuacionTexto, pack) {
  const frases = pack?.pasos || {};
  let leido;
  let pasos;
  try {
    leido = parsearRenglon(ecuacionTexto);
    if (!leido.ok || leido.tipo !== 'ecuacion' || leido.cadena) return [];
    pasos = pasosSolucion(leido.eq);
  } catch {
    return [];
  }
  if (!pasos.length) return [];
  const salida = [{ renglon: bonito(ecuacionTexto), explicacion: rellenar(frases.inicio, {}) }];
  if (conParentesis(ecuacionTexto) && fmtEcuacion(leido.eq) !== bonito(ecuacionTexto)) {
    salida.push({ renglon: fmtEcuacion(leido.eq), explicacion: rellenar(frases.distribuir, {}) });
  }
  for (const paso of pasos) {
    salida.push({ renglon: paso.texto, explicacion: rellenar(frases[paso.tipo], datosPaso(paso)) });
  }
  return salida;
}

/* ------------------------------------------------------------------ */
/* Tutor: «Explícamelo de otra forma», «Ejemplo cotidiano», apoyo      */
/* ------------------------------------------------------------------ */

/** Entero (como texto) si la fracción lo es y vale al menos `min`; si no, null. */
const enteroDesde = (fr, min) => (fr.isInt() && fr.n >= min ? String(fr.n) : null);

/**
 * Forma del ejercicio cuando se puede contar como una balanza o una historia con cantidades
 * positivas (cajas, pesas, precios). Los nombres coinciden con los del generador del motor.
 * Devuelve null si no es una de estas formas o si la x no vale un número positivo (no se puede
 * hablar de un precio o de un peso negativo). Solo dice la forma: nunca el valor de x.
 */
function formaDe(eq) {
  const partir = (ts) => ({
    xs: ts.filter((t) => t.x && !t.c.isZero()).map((t) => t.c),
    ns: ts.filter((t) => !t.x && !t.c.isZero()).map((t) => t.c),
  });
  let A = partir(eq.L);
  let B = partir(eq.R);
  if (!A.xs.length && B.xs.length) [A, B] = [B, A]; // la x a la izquierda
  const solucion = resolver(eq);
  if (solucion.tipo !== 'unica' || solucion.valor.cmp(0) <= 0) return null;
  if (A.ns.length > 1 || B.ns.length !== 1) return null;
  const sueltas = A.ns.length ? enteroDesde(A.ns[0], 1) : null;
  const descuento = A.ns.length ? enteroDesde(A.ns[0].neg(), 1) : null;
  const totalB = enteroDesde(B.ns[0], 1);
  if (!totalB || (A.ns.length && !sueltas && !descuento)) return null;

  if (B.xs.length) {
    // x en los dos lados: ax + b = cx + d, con todo positivo.
    if (A.xs.length !== 1 || B.xs.length !== 1 || !sueltas) return null;
    const cajas = enteroDesde(A.xs[0], 2);
    const cajasB = enteroDesde(B.xs[0], 1);
    if (!cajas || !cajasB) return null;
    return cajasB === '1'
      ? { forma: 'ax+b=x+d', cajas, sueltas, sueltasB: totalB }
      : { forma: 'ax+b=cx+d', cajas, sueltas, cajasB, sueltasB: totalB };
  }
  const total = totalB;
  if (A.xs.length === 2) {
    const [cajas, cajasB] = A.xs.map((c) => enteroDesde(c, 2));
    if (!cajas || !cajasB || descuento) return null;
    return sueltas ? { forma: 'ax+b+cx=d', cajas, cajasB, sueltas, total } : { forma: 'ax+bx=c', cajas, cajasB, total };
  }
  if (A.xs.length !== 1) return null;
  const c = A.xs[0];
  if (c.eq(1)) {
    if (sueltas) return { forma: 'x+b=c', sueltas, total };
    return descuento ? { forma: 'x-b=c', descuento, total } : null;
  }
  const cajas = enteroDesde(c, 2);
  if (cajas) {
    if (sueltas) return { forma: 'ax+b=c', cajas, sueltas, total };
    return descuento ? { forma: 'ax-b=c', cajas, descuento, total } : { forma: 'ax=b', cajas, total };
  }
  const partes = c.n === 1 ? enteroDesde(new Fr(c.d), 2) : null; // x/4
  if (partes) {
    if (sueltas) return { forma: 'x/a+b=c', partes, sueltas, total };
    return descuento ? null : { forma: 'x/a=b', partes, total };
  }
  const gastadas = enteroDesde(c.neg(), 2); // −3x + 20 = 5: tenías 20, compraste 3 y te quedaron 5
  if (gastadas && sueltas) return { forma: '-ax+b=c', cajas: gastadas, tenias: sueltas, total };
  return null;
}

/**
 * Datos del ejercicio en curso para las plantillas del tutor (pack.tutor). Solo usa lo que está
 * a la vista en el enunciado: nunca el valor de x ni resultados intermedios.
 *
 * Siempre (si el ejercicio se puede leer): `ejercicio`, `izquierdo`, `derecho`.
 * Si hay un número que suma o resta y hay que pasarlo al otro lado: `termino`, `elTermino`,
 * `terminoSinSigno`, `verbo`, `verboInverso`, `inversa`, `lado`, `otroLado`…
 * Si la x tiene un coeficiente negativo a la vista: `coefNum` («−3») o `menosX` («−x»).
 * Si el ejercicio tiene una de las formas de formaDe(): `forma` y sus cantidades (`cajas`,
 * `cajasB`, `sueltas`, `sueltasB`, `descuento`, `partes`, `tenias`, `total`).
 *
 * @param {string|{ecuacion: string}} ejercicio texto de la ecuación o un ejercicio de la ruta
 * @returns {object} {} si no se puede leer
 */
export function datosEjercicio(ejercicio) {
  const texto = String((ejercicio && typeof ejercicio === 'object' ? ejercicio.ecuacion : ejercicio) ?? '').trim();
  if (!texto) return {};
  try {
    const leido = parsearRenglon(texto);
    if (!leido.ok || leido.tipo !== 'ecuacion' || leido.cadena) return {};
    const escrito = bonito(texto);
    const [izquierdo, derecho] = escrito.split(' = ');
    if (!conDato(izquierdo) || !conDato(derecho)) return {};
    const d = { ejercicio: escrito, izquierdo, derecho };
    // Con paréntesis, los términos que maneja el motor (2x + 6) no son los que se ven: 2(x + 3).
    if (/[()]/.test(escrito)) return d;
    const eq = leido.eq;
    const paso = siguientePaso(eq);
    const numero = paso?.movidos?.find((m) => !m.esX);
    if (numero) Object.assign(d, datosError({ detalle: numero }));
    const conX = [...eq.L, ...eq.R].filter((t) => t.x && !t.c.isZero());
    if (conX.length === 1 && conX[0].c.isInt() && conX[0].c.isNeg()) {
      if (conX[0].c.eq(-1)) d.menosX = fmtLado([conX[0]]);
      else d.coefNum = fmtNum(conX[0].c);
    }
    return Object.assign(d, formaDe(eq));
  } catch {
    return {};
  }
}

/**
 * «Explícamelo de otra forma»: la balanza contada con palabras y con los números del ejercicio
 * en curso, seguida de la regla que trabaja la ruta de ese tipo de error. Termina con una
 * pregunta y nunca dice cuánto vale x.
 *
 * Se arma con `pack.tutor.balanza[forma]` (o `.general`, o `.sinEjercicio`) y la primera
 * plantilla de `pack.tutor.otraForma[tipo]` que se pueda llenar con los datos del ejercicio.
 *
 * @param {string} tipo tipo de error de la ruta del estudiante
 * @param {string|{ecuacion: string}} ejercicio el ejercicio en curso
 * @param {object} pack
 * @returns {string}
 */
export function otraForma(tipo, ejercicio, pack) {
  const tutor = pack?.tutor || {};
  const datos = datosEjercicio(ejercicio);
  const balanza = tutor.balanza || {};
  const descripcion = datos.ejercicio ? balanza[datos.forma] || balanza.general : balanza.sinEjercicio;
  const reglas = tutor.otraForma || {};
  const regla = primeraCompleta(reglas[tipo] ?? reglas[TIPOS.NO_CLASIFICADO], datos);
  return [rellenar(descripcion, datos), rellenar(regla, datos)].filter(Boolean).join(' ');
}

/**
 * «Un ejemplo cotidiano»: si se pasa el ejercicio en curso y tiene una forma con historia
 * (`pack.tutor.historias[forma]`), la historia usa sus mismos números; si no, el ejemplo fijo
 * del tipo de error (`pack.tutor.cotidiano[tipo]`). Ninguno dice cuánto vale x.
 *
 * @param {string} tipo tipo de error de la ruta del estudiante
 * @param {object} pack
 * @param {string|{ecuacion: string}|null} [ejercicio] el ejercicio en curso (opcional)
 * @returns {string}
 */
export function ejemploCotidiano(tipo, pack, ejercicio = null) {
  const tutor = pack?.tutor || {};
  const datos = ejercicio ? datosEjercicio(ejercicio) : {};
  const historia = datos.forma ? tutor.historias?.[datos.forma] : null;
  if (historia && datosDe(historia).every((k) => conDato(datos[k]))) return rellenar(historia, datos);
  const fijos = tutor.cotidiano || {};
  return rellenar(fijos[tipo] ?? fijos[TIPOS.NO_CLASIFICADO], {});
}

/**
 * Nivel de apoyo del tutor según el dominio de la habilidad en curso: baja cuando sube el dominio
 * (pack.tutor.apoyo.niveles, cada uno con `desde`: dominio mínimo). Sin datos, el apoyo más alto.
 *
 * @param {number|null} valor dominio de 0 a 100 (dominioPorHabilidad), o null si no hay datos
 * @param {object} pack
 * @returns {{id: 'alto'|'medio'|'bajo', etiqueta: string, n: number, desde: number, texto: string, nota: string}|null}
 *   `n`: 3 = alto … 1 = bajo (para el medidor de tres pasos); null si el paquete no trae niveles
 */
export function nivelDeApoyo(valor, pack) {
  const apoyo = pack?.tutor?.apoyo || {};
  const niveles = [...(apoyo.niveles || [])].sort((a, b) => a.desde - b.desde);
  if (!niveles.length) return null;
  const v = typeof valor === 'number' && Number.isFinite(valor) ? valor : 0;
  const nivel = niveles.filter((n) => v >= n.desde).pop() || niveles[0];
  return { ...nivel, nota: apoyo.nota || '' };
}

/* ------------------------------------------------------------------ */
/* Docente: plantillas de retroalimentación                            */
/* ------------------------------------------------------------------ */

/**
 * Plantillas para escribirle a un estudiante (pack.plantillasRetro). Con `tema` (por ejemplo, el
 * nombre de su ruta) se usa la versión que lo menciona; sin él, el texto general.
 *
 * @param {object} pack
 * @param {{tema?: string}} [datos]
 * @returns {{etiqueta: string, texto: string}[]}
 */
export function plantillasDeRetro(pack, datos = {}) {
  const tema = String(datos?.tema ?? '').trim();
  return (pack?.plantillasRetro || []).map((p) => ({
    etiqueta: p.etiqueta,
    texto: tema && p.conTema ? rellenar(p.conTema, { tema }) : p.texto,
  }));
}
