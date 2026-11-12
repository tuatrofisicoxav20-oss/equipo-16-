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

/** Reemplaza {clave} por datos[clave]. Las claves sin dato se quitan. */
export function rellenar(plantilla, datos = {}) {
  return String(plantilla ?? '')
    .replace(/\{(\w+)\}/g, (_, k) => (datos[k] === undefined || datos[k] === null ? '' : String(datos[k])))
    .replace(/\s{2,}/g, ' ')
    .trim();
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
    d.signoInverso = suma ? '−' : '+';
    d.signoMismo = suma ? '+' : '−';
  }
  if (d.coefNum) {
    d.coefNumAbs = d.coefNum.replace('−', '');
    d.coefNumParentesis = d.coefNum.startsWith('−') ? `(${d.coefNum})` : d.coefNum;
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
  const plantilla = plantillas[variante] || Object.values(plantillas)[0];
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

function datosPaso(paso) {
  const d = { siguiente: paso.texto };
  if (paso.tipo === 'transponer_constante' || paso.tipo === 'transponer_x') {
    const buscado = paso.tipo === 'transponer_constante' ? false : true;
    const w = paso.movidos.find((m) => m.esX === buscado) || paso.movidos[0];
    Object.assign(d, datosError({ detalle: w }));
    // La cuenta que queda del lado de los números (la x se muestra a la izquierda).
    d.cuenta = fmtLado(paso.eq.R);
  } else if (paso.tipo === 'reducir') {
    d.antes = paso.antes;
    d.siguienteHuecos = paso.texto.replace(/\d+(?:\/\d+)?/g, '▢');
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

/** Fracción a partir de su texto ASCII ("25/3", "-4"). */
function fraccion(texto) {
  const [n, d = '1'] = String(texto).replace('−', '-').split('/');
  return new Fr(Number(n), Number(d));
}

/** Muestra un valor como número ("25/3", "−4") o como coeficiente de x ("5x", "x", "−x"). */
function formatearValor(fr, esX) {
  if (!esX) return fmtNum(fr);
  if (fr.eq(1)) return 'x';
  if (fr.eq(-1)) return '−x';
  return `${fmtNum(fr)}x`;
}

/** Tercera opción de la pregunta de cuentas: un valor cercano que no sea ni el correcto ni el del estudiante. */
function distractor(d) {
  try {
    const esperado = fraccion(d.esperadoValor ?? d.esperado);
    const escrito = fraccion(d.escritoValor ?? d.escrito);
    for (const delta of [1, -1, 2, -2, 3]) {
      const candidato = esperado.add(delta);
      if (!candidato.eq(esperado) && !candidato.eq(escrito)) return formatearValor(candidato, d.esX);
    }
  } catch {
    /* valor que no se pudo leer: opción genérica */
  }
  return 'Ninguna de estas';
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
    if (variante === 'copia' || !d.cuenta) {
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
    texto = rellenar(q.texto, d);
    const negativo = String(d.correcto || '').startsWith('−');
    opciones = [
      { id: 'a', texto: 'Positivo', correcta: !negativo, retro: rellenar(negativo ? q.retroSuya : q.retroCorrecta, d) },
      { id: 'b', texto: 'Negativo', correcta: negativo, retro: rellenar(negativo ? q.retroCorrecta : q.retroSuya, d) },
      { id: 'c', texto: 'Depende de cuál número es más grande', correcta: false, retro: rellenar(q.retroOtra, d) },
    ];
  } else if (tipo === TIPOS.INVERSA_EQUIVOCADA && variante === 'divide') {
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
  } else if (tipo === TIPOS.UN_SOLO_LADO && String(variante).startsWith('divide')) {
    texto = rellenar(q.textoDivide, d);
    opciones = [
      op('a', q.correctaDivide, true, q.retroCorrectaDivide),
      op('b', q.suyaDivide, false, q.retroSuyaDivide),
      op('c', q.otraDivide, false, q.retroOtraDivide),
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

export function respuestaTecu(pregunta, pack) {
  const t = sinAcentos(pregunta);
  let mejor = null;
  let puntos = 0;
  for (const r of pack.tecu.respuestas) {
    const p = r.claves.filter((k) => t.includes(sinAcentos(k))).length;
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
