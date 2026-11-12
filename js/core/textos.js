/**
 * Textos para personas a partir de los resultados del motor.
 *
 * El motor (engine.js) devuelve códigos y datos (qué término, qué lado, qué
 * número). Aquí se llenan las plantillas del paquete de contenido para:
 *   - explicar un error al estudiante o al docente,
 *   - armar la escalera de pistas del ejercicio que se está resolviendo,
 *   - construir la pregunta orientadora de Tecu,
 *   - contestar dudas con respuestas preparadas.
 *
 * Módulo puro: recibe el paquete como parámetro.
 */
import {
  TIPOS,
  analizarProcedimiento,
  bonito,
  fmtLado,
  fmtNum,
  parsearRenglon,
  pasosSolucion,
  procedimientoConError,
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

/** Reemplaza {clave} por datos[clave]. Las claves sin dato se quitan. */
export function rellenar(plantilla, datos = {}) {
  return String(plantilla ?? '')
    .replace(/\{(\w+)\}/g, (_, k) => (datos[k] === undefined || datos[k] === null ? '' : String(datos[k])))
    .replace(/\s{2,}/g, ' ')
    .trim();
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

/** Campos derivados que usan las plantillas (verbo, operación inversa, etc.). */
export function datosError(error = {}) {
  const d = { ...(error.detalle || {}) };
  if (error.renglon) d.renglon = error.renglon;
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
  // «el 2 y el x» (lista armada por el motor) → «el 2 y la x».
  if (typeof d.terminos === 'string') d.terminos = d.terminos.replace(/\bel (x[^\s,]*)(?=,| y |$)/g, 'la $1');
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

/**
 * Explicación de un error para el estudiante ('alumno') o el docente ('docente').
 * @param {{tipo: string, renglon: number, detalle: object}} error
 */
export function explicarError(error, pack, audiencia = 'alumno') {
  const info = pack.errores[error.tipo] || pack.errores[TIPOS.NO_CLASIFICADO];
  const plantillas = info[audiencia] || info.alumno;
  const variante = error.detalle?.variante;
  // x/4 = 3: el "coeficiente" es 1/4, pero se habla del divisor (4): «multiplicaste», «le restaste 4».
  const conDivisor = error.detalle?.divisor ? plantillas[`${variante}_divisor`] : null;
  const plantilla = conDivisor || plantillas[variante] || Object.values(plantillas)[0];
  return rellenar(plantilla, datosError(error));
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
 */
export function pistasPara(ejercicioTexto, renglonesAlumno, pack) {
  try {
    return pistasSinRed(ejercicioTexto, renglonesAlumno, pack);
  } catch {
    // Números fuera de rango o un renglón raro: pistas generales, nunca una excepción en pantalla.
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

function pistasSinRed(ejercicioTexto, renglonesAlumno, pack) {
  const todos = [ejercicioTexto, ...(renglonesAlumno || [])];
  const analisis = analizarProcedimiento(todos);
  const ejercicioInvalido =
    analisis.estado === 'vacio' ||
    analisis.estado === 'sin_solucion_unica' ||
    (analisis.estado === 'sin_entender' && analisis.renglon === 1);
  if (ejercicioInvalido) {
    // Ejercicio escrito a mano (modo libre) que no se puede resolver paso a paso: decir por qué
    // (antes: "Revisa el renglón anterior…" o, si no tenía solución, "Ya tienes la x sola").
    return {
      pistas: [analisis.mensaje || 'Escribe primero el ejercicio.', ...PISTAS_EJERCICIO_INVALIDO],
      solucion: [bonito(ejercicioTexto)],
      paso: null,
      error: null,
    };
  }
  const inicial = analisis.renglones[0].eq; // ya parseado: no hace falta volver a llamar a ecuacion()
  let base = inicial;
  let error = null;

  if (analisis.estado === 'error') {
    error = analisis.error;
    const ultimaValida = [...analisis.renglones].reverse().find((r) => r.valido && r.tipo === 'ecuacion');
    if (ultimaValida) base = ultimaValida.eq;
  } else if (analisis.estado === 'incompleto' || analisis.estado === 'correcto') {
    const ultima = [...analisis.renglones].reverse().find((r) => r.valido && r.tipo === 'ecuacion');
    if (ultima) base = ultima.eq;
  }

  const solucion = [bonito(ejercicioTexto), ...pasosSolucion(inicial).map((p) => p.texto)];
  const paso = siguientePaso(base);
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
  const datos = datosPaso(paso);
  const plantillas = pack.pistas[paso.tipo] || pack.pistas.revisar;
  const pistas = plantillas.map((p) => rellenar(p, datos));
  if (error && pack.pistasPorError[error.tipo]) {
    pistas[0] = rellenar(pack.pistasPorError[error.tipo], { ...datos, ...datosError(error) });
  }
  return { pistas, solucion, paso: paso.tipo, error };
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
 *   dividir entre n (n·x = b), restar n:     b(n − 1) = n²
 *   multiplicar por k (x/k = b), sumar k:   b(k − 1) = k
 */
function otraUnLadoCoincide(d, multiplica) {
  try {
    const b = fraccion(d.b);
    if (multiplica) {
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
  let error = delAlumno?.error?.tipo === tipo ? delAlumno.error : null;
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

  if (tipo === TIPOS.ARITMETICA) {
    // Sin cuenta que hacer (x = 25/3 = 26/3: «¿Cuánto es 25/3?» se contesta solo), se pregunta como copia.
    if (variante === 'copia' || !d.cuenta || d.cuenta === d.esperado) {
      texto = rellenar(q.textoCopia, d);
      opciones = [
        op('a', q.correctaCopia, true, q.retroCorrectaCopia),
        op('b', q.suyaCopia, false, q.retroSuyaCopia),
        op('c', q.otraCopia, false, q.retroOtraCopia),
      ];
    } else {
      texto = rellenar(q.texto, d);
      opciones = [
        { id: 'a', texto: d.esperado, correcta: true, retro: rellenar(q.retroCorrecta, d) },
        { id: 'b', texto: d.escrito, correcta: false, retro: rellenar(q.retroSuya, d) },
        { id: 'c', texto: distractor(d), correcta: false, retro: rellenar(q.retroOtra, d) },
      ];
    }
  } else if (tipo === TIPOS.SIGNO_NEGATIVO) {
    // x/4 = −3: la cuenta es −3 · 4 (se pregunta por la multiplicación, no por "−3 entre 1/4").
    texto = rellenar(d.divisor && q.textoMultiplica ? q.textoMultiplica : q.texto, d);
    const negativo = String(d.correcto || '').startsWith('−');
    opciones = [
      { id: 'a', texto: 'Positivo', correcta: !negativo, retro: rellenar(negativo ? q.retroSuya : q.retroCorrecta, d) },
      { id: 'b', texto: 'Negativo', correcta: negativo, retro: rellenar(negativo ? q.retroCorrecta : q.retroSuya, d) },
      { id: 'c', texto: 'Depende de cuál número es más grande', correcta: false, retro: rellenar(q.retroOtra, d) },
    ];
  } else if (tipo === TIPOS.INVERSA_EQUIVOCADA && (variante === 'divide' || d.divisor)) {
    // La x estaba dividida (x/4 = 3): da igual si volvió a dividir o restó el 4, lo que la deshace es multiplicar.
    texto = rellenar(q.textoDivide, d);
    opciones = [
      op('a', q.correctaDivide, true, q.retroCorrectaDivide),
      op('b', q.suyaDivide, false, q.retroSuyaDivide),
      op('c', q.otraDivide, false, q.retroOtraDivide),
    ];
  } else if (tipo === TIPOS.INVERSA_EQUIVOCADA && String(variante).startsWith('aditivo')) {
    texto = rellenar(q.textoAditivo, d);
    opciones = [
      op('a', q.correctaAditivo, true, q.retroCorrectaAditivo),
      op('b', q.suyaAditivo, false, q.retroSuyaAditivo),
      op('c', q.otraAditivo, false, q.retroOtraAditivo),
    ];
  } else if (tipo === TIPOS.INVERSA_EQUIVOCADA && d.coefNum === '−1' && q.textoOpuesto) {
    // −x = 5: dividir entre −1 y multiplicar por −1 son la misma operación (las dos serían correctas).
    // Se pregunta como en la pista de ese paso: «Multiplica los dos lados por −1».
    texto = rellenar(q.textoOpuesto, d);
    opciones = [
      op('a', q.correctaOpuesto, true, q.retroCorrectaOpuesto),
      op('b', q.suyaOpuesto, false, q.retroSuyaOpuesto),
      op('c', q.otraOpuesto, false, q.retroOtraOpuesto),
    ];
  } else if (tipo === TIPOS.UN_SOLO_LADO && String(variante).startsWith('divide')) {
    // Con x/4 la operación de un solo lado fue multiplicar por 4.
    const s = d.divisor && q.textoMultiplica ? 'Multiplica' : 'Divide';
    // La opción equivocada nunca debe dar, por casualidad, el valor correcto de x.
    const alt = q[`otra${s}Alt`] && otraUnLadoCoincide(d, s === 'Multiplica') ? 'Alt' : '';
    texto = rellenar(q[`texto${s}`], d);
    opciones = [
      op('a', q[`correcta${s}`], true, q[`retroCorrecta${s}`]),
      op('b', q[`suya${s}`], false, q[`retroSuya${s}`]),
      op('c', q[`otra${s}${alt}`], false, q[`retroOtra${s}${alt}`]),
    ];
  } else {
    texto = rellenar(q.texto, d);
    opciones = [
      op('a', q.correcta, true, q.retroCorrecta),
      op('b', q.suya, false, q.retroSuya),
      op('c', q.otra, false, q.retroOtra),
    ];
  }
  const semilla = tipo.length + (error?.renglon || 0);
  return { texto, opciones: ordenar(opciones, semilla), basadaEnAlumno: Boolean(delAlumno?.error?.tipo === tipo) };
}

/* ------------------------------------------------------------------ */
/* Respuestas preparadas de Tecu                                       */
/* ------------------------------------------------------------------ */

const sinAcentos = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/**
 * Respuesta preparada para una duda escrita. Gana el grupo con más claves
 * distintas dentro de la duda; en un empate, el que va primero en el paquete.
 */
export function respuestaTecu(pregunta, pack) {
  const t = sinAcentos(pregunta);
  let mejor = null;
  let puntos = 0;
  for (const r of pack.tecu.respuestas) {
    // Sin duplicados al quitar acentos: «no sé» y «no se» cuentan una sola vez.
    const p = [...new Set(r.claves.map(sinAcentos))].filter((k) => t.includes(k)).length;
    if (p > puntos) {
      mejor = r;
      puntos = p;
    }
  }
  return mejor ? mejor.texto : pack.tecu.porDefecto;
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
