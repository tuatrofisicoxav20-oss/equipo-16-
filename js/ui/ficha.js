/**
 * Ficha individual del estudiante (panel docente).
 *
 * Lo que el docente abre con 1 clic para entender a UN estudiante: el último
 * procedimiento con error renglón por renglón (el renglón donde cambió la
 * solución, resaltado con icono y texto y explicado para el docente), la ruta
 * que se le asignó, las pistas que usó, si pidió la solución, si pasó la
 * comprobación sin ayuda, sus dudas a Tecu y su historial reciente.
 *
 * Es un <dialog> modal y hay una sola ficha a la vez: el foco va al nombre al
 * abrir; Escape, "Cerrar" o tocar fuera la cierran y el foco regresa a lo que
 * la abrió. En celular ocupa toda la pantalla con scroll interno; en
 * escritorio mide ~52rem (.dialogo--ancho). Estilos: css/ficha.css.
 *
 *   abrirFicha(resumenAlumno, pack, { onImprimir, onCerrar, ahora })
 *   cerrarFicha()
 *   fichaAbierta() → id del estudiante cuya ficha está abierta, o null
 *
 * Si se llama abrirFicha() mientras está abierta la ficha del MISMO estudiante
 * (p. ej. llegaron eventos nuevos con escucharServidor()), se actualiza en su
 * lugar: conserva el foco y el scroll, y avisa al lector de pantalla si hay
 * actividad nueva. Con otro estudiante, reemplaza el contenido y enfoca su nombre.
 *
 * Mientras el diálogo modal está abierto, lo de fuera queda inerte (también
 * #anuncios y #avisos): por eso la ficha trae su propia región aria-live.
 */
import { analizarProcedimiento, TIPOS } from '../core/engine.js';
import { explicarError, sugerenciaLlamada, sugerenciaPorMotivo } from '../core/textos.js';
import { html, crudo, delegar, renderConFoco } from './dom.js';
import { icono, hayIcono } from './iconos.js';
import { htmlEcuacion } from './cuaderno.js';

const MAX_HISTORIAL = 8;
const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/**
 * Estado del estudiante → chip con icono y texto (el color nunca va solo).
 * Mismos textos que la tabla del panel (js/views/docente.js), neutros en género.
 */
export const ESTADOS_ALUMNO = Object.freeze({
  sin_actividad: { texto: 'Sin empezar', icono: 'usuario', chip: 'neutro' },
  diagnostico: { texto: 'En diagnóstico', icono: 'lapiz', chip: 'info' },
  en_ruta: { texto: 'En su ruta', icono: 'aprender', chip: 'info' },
  atorado: { texto: 'Se atoró', icono: 'alerta', chip: 'error' },
  dominado: { texto: 'Dominó el tema', icono: 'trofeo', chip: 'exito' },
  inactivo: { texto: 'Sin entrar', icono: 'reloj', chip: 'alerta' },
});

/** Dónde va dentro de su ruta (ResumenAlumno.actividad). */
const LUGAR_EN_RUTA = {
  pregunta: 'la pregunta de Tecu',
  visual: 'la balanza',
  practica: 'la práctica',
  comprobacion: 'la comprobación sin ayuda',
};

/** Si el paquete aún no trae pack.llamadas: mismo sentido, en español claro. */
const RESPALDO_LLAMADAS = {
  inactivo: 'No ha entrado en {dias} días. Pregúntale si tiene celular o datos esta semana; si no, dale el cuadernillo impreso.',
  sin_diagnostico: 'Todavía no hace el diagnóstico. En 15 minutos pueden resolver juntos en papel las ecuaciones del diagnóstico.',
};

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

/** Icono decorativo (el texto de al lado siempre dice lo mismo). */
const ico = (nombre, tamano) => crudo(icono(hayIcono(nombre) ? nombre : 'info', tamano ? { tamano } : undefined));

/** Separador visual « · » que el lector de pantalla lee como coma. */
const SEP = crudo('<span aria-hidden="true"> · </span><span class="solo-lector">, </span>');

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const entero = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const minuscula = (s) => (s ? s[0].toLowerCase() + s.slice(1) : '');
/** Cierra la oración sin duplicar el punto («con Camila T.», no «con Camila T..»). */
const conPunto = (s) => (/[.!?…]$/.test(s) ? s : `${s}.`);

function aFecha(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

const msDe = (valor) => aFecha(valor)?.getTime() ?? 0;

/** Días de calendario entre dos fechas (hora local). */
function diasEntre(a, b) {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / DIA);
}

/**
 * Fecha relativa en español de México: «hace un momento», «hace 5 min»,
 * «hace 3 horas», «ayer», «hace 4 días» o, si es de hace más de un mes, «el 3 de octubre».
 * @param {string|number|Date} fecha
 * @param {string|number|Date} [ahora]
 */
export function fechaRelativa(fecha, ahora = Date.now()) {
  const d = aFecha(fecha);
  if (!d) return '';
  const ref = aFecha(ahora) || new Date();
  const dif = ref.getTime() - d.getTime();
  if (dif < MINUTO) return 'hace un momento';
  if (dif < HORA) return `hace ${Math.floor(dif / MINUTO)} min`;
  if (dif < DIA) return `hace ${plural(Math.floor(dif / HORA), 'hora', 'horas')}`;
  const dias = diasEntre(d, ref);
  if (dias <= 1) return 'ayer';
  if (dias <= 30) return `hace ${dias} días`;
  return `el ${new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' }).format(d)}`;
}

/** { iso, texto } para un <time>; null si la fecha no se puede leer. */
function cuando(fecha, ahora) {
  const d = aFecha(fecha);
  return d ? { iso: d.toISOString(), texto: fechaRelativa(d, ahora) } : null;
}

const htmlTiempo = (f) => (f ? html`<time datetime="${f.iso}">${f.texto}</time>` : '');

/** Datos de un tipo de error del paquete (con respaldo a NO_CLASIFICADO). */
function infoError(tipo, pack) {
  const errores = pack?.errores || {};
  const conocido = Boolean(errores[tipo]);
  const e = errores[tipo] || errores[TIPOS.NO_CLASIFICADO] || {};
  return {
    tipo: conocido ? tipo : TIPOS.NO_CLASIFICADO,
    nombre: e.nombre || 'Por revisar en clase',
    tono: e.tono || 'gris',
    icono: hayIcono(e.icono) ? e.icono : 'pregunta',
    tituloRuta: e.ruta?.titulo || '',
    resumen: e.resumen || '',
  };
}

/* ------------------------------------------------------------------ */
/* Del resumen a lo que se muestra                                     */
/* ------------------------------------------------------------------ */

function estadoDe(r, hayEventos) {
  if (ESTADOS_ALUMNO[r.estado]) return { clave: r.estado, ...ESTADOS_ALUMNO[r.estado] };
  if (!hayEventos) return { clave: 'sin_actividad', ...ESTADOS_ALUMNO.sin_actividad };
  return { clave: 'otro', texto: 'Con actividad', icono: 'info', chip: 'neutro' };
}

/** Por qué tiene ese estado, en una frase. */
function motivoEstado(clave, d, r, pack) {
  switch (clave) {
    case 'sin_actividad':
      return 'Todavía no empieza el diagnóstico.';
    case 'diagnostico': {
      const diag = esObjeto(r.diagnostico) ? r.diagnostico : {};
      const delPaquete = Array.isArray(pack?.diagnostico) && pack.diagnostico.length ? pack.diagnostico.length : 4;
      const total = entero(diag.total) || delPaquete;
      const hechos = numeroO(diag.hechos, d.diagnosticosHechos);
      return `Lleva ${Math.min(hechos, total)} de ${total} ejercicios del diagnóstico.`;
    }
    case 'en_ruta':
      if (LUGAR_EN_RUTA[r.actividad]) return `Va en ${LUGAR_EN_RUTA[r.actividad]}.`;
      return d.practicas ? `Lleva ${plural(d.practicas, 'ejercicio', 'ejercicios')} de práctica en su ruta.` : 'Empezó su ruta.';
    case 'atorado': {
      const c = d.comprobacion;
      const falladas = numeroO(r.comprobaciones?.falladas, Math.max(c.intentos - c.aprobadas, 0));
      if (falladas >= 2 && !c.aprobadas) return `No ha pasado la comprobación sin ayuda (${plural(falladas, 'intento', 'intentos')}).`;
      const sinAvanzar = entero(r.erroresSinAvanzar);
      if (sinAvanzar && r.errorDominante) {
        return `Lleva ${plural(sinAvanzar, 'error', 'errores')} de «${minuscula(infoError(r.errorDominante, pack).nombre)}» sin avanzar en su ruta.`;
      }
      return falladas ? `No ha pasado la comprobación sin ayuda (${plural(falladas, 'intento', 'intentos')}).` : 'Necesita apoyo para avanzar en su ruta.';
    }
    case 'dominado':
      return 'Aprobó la comprobación sin ayuda.';
    case 'inactivo':
      return d.dias !== null ? `No entra desde hace ${plural(d.dias, 'día', 'días')}.` : 'No ha entrado en varios días.';
    default:
      return '';
  }
}

const RUTA_GENERAL = {
  tono: 'verde',
  icono: 'estrella',
  titulo: 'Demuestra lo que sabes',
  detalle: 'Diagnóstico sin errores: va directo a la comprobación final.',
};

/** Ruta asignada: la de su error, la general (diagnóstico sin errores) o ninguna todavía. */
function rutaDe(r, recientes, pack) {
  const deRuta = (tipo, titulo) => {
    const e = infoError(tipo, pack);
    return { tono: e.tono, icono: e.icono, titulo: titulo || e.tituloRuta || e.nombre, detalle: `Para el error: ${e.nombre}` };
  };
  const tipo = typeof r.ruta === 'string' ? r.ruta : esObjeto(r.ruta) ? r.ruta.tipo : null;
  if (tipo && pack?.errores?.[tipo]) return deRuta(tipo, esObjeto(r.ruta) ? r.ruta.titulo : '');
  const evento = recientes.find((e) => e.tipo === 'ruta');
  if (evento?.ruta && pack?.errores?.[evento.ruta]) return deRuta(evento.ruta, evento.datos?.titulo);
  // analitica: ruta null con actividad = la ruta general (diagnóstico sin errores).
  if ((evento && (!evento.ruta || evento.datos?.sinErrores)) || (!tipo && r.actividad)) {
    return { ...RUTA_GENERAL, titulo: evento?.datos?.titulo || RUTA_GENERAL.titulo };
  }
  return null;
}

/** «Diagnóstico, ejercicio 1», «Práctica 2», «Comprobación sin ayuda, intento 2»… */
function etiquetaActividad(e) {
  const n = entero(e?.datos?.numero);
  switch (e?.tipo) {
    case 'diagnostico':
      return n ? `Diagnóstico, ejercicio ${n}` : 'Diagnóstico';
    case 'practica':
      return n ? `Práctica ${n}` : 'Práctica';
    case 'comprobacion': {
      const k = entero(e.datos?.intento);
      return k ? `Comprobación sin ayuda, intento ${k}` : 'Comprobación sin ayuda';
    }
    case 'libre':
      return 'Modo libre';
    default:
      return 'Ejercicio';
  }
}

const mismosRenglones = (a, b) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((t, i) => String(t) === String(b[i]));

/**
 * Explicación para el docente. Con `detalle` del motor usa la plantilla exacta
 * (explicarError 'docente'); sin él, el resumen del tipo de error (nunca una
 * plantilla con huecos).
 */
function explicacionDocente(error, pack) {
  if (!error) return '';
  const conocido = Boolean(pack?.errores?.[error.tipo]);
  try {
    if (!conocido || error.tipo === TIPOS.NO_CLASIFICADO) {
      if (!entero(error.renglon)) return 'Tecu marcó un error pero no pudo ubicar el renglón. Revisen juntos el procedimiento completo.';
      return explicarError({ ...error, tipo: TIPOS.NO_CLASIFICADO, detalle: { variante: 'desconocido' } }, pack, 'docente');
    }
    if (esObjeto(error.detalle)) return explicarError(error, pack, 'docente');
  } catch (e) {
    console.error(e);
  }
  return infoError(error.tipo, pack).resumen;
}

/**
 * Marca de cada renglón: el enunciado, los pasos correctos, el renglón donde
 * cambió la solución y lo que va después (no se revisó). Los renglones antes
 * del error son válidos por definición: el motor reporta el PRIMER problema.
 */
function marcarLineas(lineas, error, analisis) {
  const nError = entero(error?.renglon) || null;
  const porNumero = new Map((analisis?.renglones || []).map((r) => [r.n, r]));
  return lineas
    .map((texto, i) => {
      const numero = i + 1;
      if (!String(texto).trim()) return null;
      const r = porNumero.get(numero);
      if (numero === 1) return { numero, texto, estado: 'enunciado' };
      if (nError && numero === nError) return { numero, texto, estado: 'error', numerica: r?.tipo === 'numerica' };
      if (nError && numero > nError) return { numero, texto, estado: 'despues' };
      if (r?.ok === false) return { numero, texto, estado: 'ilegible', mensaje: r.error?.mensaje || '' };
      if (!nError && r && r.valido !== true) return { numero, texto, estado: 'neutro' };
      return { numero, texto, estado: 'ok', nota: r?.nota || null };
    })
    .filter(Boolean);
}

/** El evento (diagnóstico, práctica…) donde quedó ese procedimiento, para dar contexto. */
function eventoDe(proc, recientes, conError) {
  return (
    recientes.find(
      (e) => e.ejercicio === proc.ejercicio && mismosRenglones(e.renglones, proc.renglones) && (!conError || e.error),
    ) || null
  );
}

/**
 * Un procedimiento listo para pintar (ResumenAlumno.ultimoProcedimiento: el más
 * reciente con error o, si nunca se equivocó, el más reciente). Si al error le
 * falta `detalle` (eventos de antes) o la confianza, se recalcula con
 * analizarProcedimiento([ejercicio, ...renglones]); sus datos solo se usan si el
 * motor ve el mismo error en el mismo renglón. Sin error registrado, no se inventa uno.
 */
function prepararProcedimiento(proc, recientes, pack, ahora) {
  if (!esObjeto(proc) || typeof proc.ejercicio !== 'string' || !proc.ejercicio.trim()) return null;
  const renglones = Array.isArray(proc.renglones) ? proc.renglones.map((t) => String(t ?? '')) : [];
  const lineas = [proc.ejercicio, ...renglones];
  let analisis = null;
  try {
    analisis = analizarProcedimiento(lineas);
  } catch (e) {
    console.error(e);
  }
  const delMotor = analisis?.estado === 'error' ? analisis.error : null;
  const error = esObjeto(proc.error) && proc.error.tipo ? { ...proc.error } : null;
  if (error && !entero(error.renglon) && delMotor && delMotor.tipo === error.tipo) error.renglon = delMotor.renglon;
  const coincide = Boolean(error && delMotor && delMotor.renglon === entero(error.renglon) && delMotor.tipo === error.tipo);
  if (error && coincide) {
    if (!esObjeto(error.detalle)) error.detalle = delMotor.detalle;
    if (!error.confianza) error.confianza = delMotor.confianza;
    if (!Array.isArray(error.alternativas)) error.alternativas = delMotor.alternativas || [];
  }
  const evento = eventoDe({ ejercicio: proc.ejercicio, renglones }, recientes, Boolean(error));
  const tipoEvento = evento?.tipo || proc.tipoEvento || null;
  const fecha = evento?.fecha ?? proc.fecha ?? null;
  return {
    ejercicio: proc.ejercicio,
    lineas: marcarLineas(lineas, error, analisis),
    error,
    estadoMotor: analisis?.estado || proc.resultado || null,
    info: error ? infoError(error.tipo, pack) : null,
    explicacion: explicacionDocente(error, pack),
    contexto: tipoEvento
      ? {
          texto: etiquetaActividad(evento || { tipo: tipoEvento }),
          fecha: cuando(fecha, ahora),
          pistas: tipoEvento === 'practica' && evento ? entero(evento.pistasUsadas) : null,
        }
      : null,
  };
}

/** Texto de una actividad del historial, en lenguaje claro. */
function describirEvento(e, pack) {
  const n = entero(e.datos?.numero);
  const pistas = entero(e.pistasUsadas);
  const conPistas = pistas ? `con ${plural(pistas, 'pista', 'pistas')}` : 'sin pistas';
  const err = esObjeto(e.error) && e.error.tipo ? e.error : null;
  const conError = err
    ? `error en el renglón ${entero(err.renglon) || '?'} (${minuscula(infoError(err.tipo, pack).nombre)})`
    : '';
  const sinTerminar = e.datos?.sinTerminar ? 'lo dejó sin terminar' : 'sin terminar';
  const procedimiento = (titulo, correcto) => {
    if (e.resultado === 'correcto') return { titulo, resultado: correcto, tono: 'ok' };
    if (e.resultado === 'error' || err) return { titulo, resultado: `con ${conError || 'error'}`, tono: 'error' };
    if (e.resultado === 'incompleto') return { titulo, resultado: sinTerminar, tono: 'alerta' };
    if (e.resultado === 'sin_entender') return { titulo, resultado: 'Tecu no entendió un renglón', tono: 'alerta' };
    return { titulo, resultado: '', tono: 'neutro', icono: 'lapiz' };
  };
  switch (e.tipo) {
    case 'diagnostico':
      return procedimiento(n ? `Diagnóstico, ejercicio ${n}` : 'Diagnóstico', 'correcto');
    case 'practica':
    case 'libre': {
      const titulo = e.tipo === 'libre' ? 'Modo libre' : n ? `Práctica ${n}` : 'Práctica';
      const x = procedimiento(titulo, `correcta ${conPistas}${e.pidioSolucion ? ' y con la solución a la vista' : ''}`);
      if (x.tono === 'error' && pistas) x.resultado += `, ${conPistas}`;
      return x;
    }
    case 'solucion':
      return {
        titulo: n ? `Práctica ${n}` : 'Práctica',
        resultado: `pidió ver la solución${pistas ? ` después de ${plural(pistas, 'pista', 'pistas')}` : ''}`,
        tono: 'alerta',
        icono: 'ojo',
      };
    case 'comprobacion': {
      const k = entero(e.datos?.intento);
      const titulo = k ? `Comprobación sin ayuda, intento ${k}` : 'Comprobación sin ayuda';
      if (e.aprobado || e.resultado === 'correcto') return { titulo, resultado: 'aprobada', tono: 'ok' };
      return { titulo, resultado: `no aprobada${conError ? `: ${conError}` : ''}`, tono: 'error' };
    }
    case 'dominio':
      return { titulo: 'Dominó el tema', resultado: 'pasó la comprobación sin ayuda', tono: 'ok', icono: 'trofeo' };
    case 'ruta': {
      const titulo = e.ruta ? e.datos?.titulo || infoError(e.ruta, pack).tituloRuta : e.datos?.titulo || 'Demuestra lo que sabes';
      return {
        titulo: 'Ruta asignada',
        resultado: e.ruta ? `«${titulo}»` : `«${titulo}» (diagnóstico sin errores)`,
        tono: 'neutro',
        icono: 'aprender',
      };
    }
    case 'pregunta': {
      const intentos = entero(e.datos?.intentos);
      const resultado = e.aprobado
        ? intentos > 1
          ? `contestó bien en el intento ${intentos}`
          : 'contestó bien al primer intento'
        : 'sin contestar';
      return { titulo: 'Pregunta de Tecu', resultado, tono: e.aprobado ? 'ok' : 'neutro', icono: 'tecu' };
    }
    case 'visual':
      return e.datos?.omitida
        ? { titulo: 'Balanza', resultado: 'siguió sin la balanza', tono: 'neutro', icono: 'balanza' }
        : { titulo: 'Balanza', resultado: 'completada', tono: 'ok' };
    default:
      return { titulo: e.tipo ? `${e.tipo[0].toUpperCase()}${e.tipo.slice(1)}` : 'Actividad', resultado: '', tono: 'neutro', icono: 'info' };
  }
}

const ICONO_RESULTADO = { ok: 'exito', error: 'error', alerta: 'alerta' };

/** Duda (evento 'duda' del store o, por si acaso, la Duda del celular). */
function leerDuda(x, ahora) {
  const datos = esObjeto(x.datos) ? x.datos : x;
  const texto = String(datos.texto ?? '').trim();
  if (!texto) return null;
  const respuesta = datos.respuesta === null || datos.respuesta === undefined ? '' : String(datos.respuesta).trim();
  return { texto, respuesta, fecha: cuando(x.fecha ?? datos.fecha, ahora), orden: msDe(x.fecha ?? datos.fecha) };
}

function sumar(eventos, filtro, valor) {
  return eventos.filter(filtro).reduce((s, e) => s + valor(e), 0);
}

const numeroO = (v, respaldo) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? entero(v) : respaldo);

/** Todo lo que pinta la ficha, a partir del ResumenAlumno (tolerante a campos faltantes). */
function datosFicha(r, pack, ahora) {
  const eventos = (Array.isArray(r.eventos) ? r.eventos : []).filter(esObjeto);
  const recientes = [...eventos].sort((a, b) => msDe(b.fecha) - msDe(a.fecha));
  const nombre = String(r.nombre || r.id || 'Estudiante').trim();
  const estado = estadoDe(r, eventos.length > 0);

  const comprobaciones = eventos.filter((e) => e.tipo === 'comprobacion');
  const c = esObjeto(r.comprobaciones) ? r.comprobaciones : {};
  const comprobacion = {
    intentos: numeroO(c.intentos, comprobaciones.length),
    aprobadas: numeroO(c.aprobadas, comprobaciones.filter((e) => e.aprobado).length),
  };

  const ultimaFecha = r.ultimaActividad ?? recientes[0]?.fecha ?? null;
  const ultima = cuando(ultimaFecha, ahora);
  const diasCalculados = ultima ? Math.max(Math.floor((msDe(ahora) - msDe(ultimaFecha)) / DIA), 0) : null;
  const dias = Number.isFinite(Number(r.diasSinActividad)) && r.diasSinActividad !== null ? entero(r.diasSinActividad) : diasCalculados;

  const d = {
    nombre,
    inicial: nombre.charAt(0).toUpperCase() || '?',
    enVivo: Boolean(r.enVivo),
    estado,
    ultima,
    dias,
    comprobacion,
    pistas: numeroO(r.pistasUsadas, sumar(eventos, (e) => e.tipo === 'practica' || e.tipo === 'libre', (e) => entero(e.pistasUsadas))),
    soluciones: numeroO(r.solucionesPedidas, eventos.filter((e) => e.tipo === 'solucion').length),
    porRevisar: entero(r.porRevisar),
    practicas: eventos.filter((e) => e.tipo === 'practica').length,
    diagnosticosHechos: new Set(eventos.filter((e) => e.tipo === 'diagnostico').map((e) => e.datos?.numero ?? e.ejercicio)).size,
    ruta: rutaDe(r, recientes, pack),
  };
  d.motivo = motivoEstado(estado.clave, d, r, pack);

  if (estado.clave === 'inactivo') {
    d.sugerencia = sugerenciaPorMotivo('inactivo', { dias: d.dias }, pack) || RESPALDO_LLAMADAS.inactivo.replace('{dias}', d.dias ?? 'varios');
  } else if (estado.clave === 'sin_actividad') {
    d.sugerencia = sugerenciaPorMotivo('sin_diagnostico', {}, pack) || RESPALDO_LLAMADAS.sin_diagnostico;
  }

  // Dónde se atoró: el último procedimiento con error. Si no hay, el más reciente (en positivo).
  const proc = prepararProcedimiento(r.ultimoProcedimiento, recientes, pack, ahora);
  if (proc?.error) {
    d.procedimiento = proc;
    if (proc.info.tipo !== TIPOS.NO_CLASIFICADO) proc.sugerencia = sugerenciaLlamada(proc.error.tipo, proc.ejercicio, pack);
  } else {
    d.procedimiento = null;
    let reciente = proc && proc.lineas.length > 1 ? proc : null;
    if (!reciente) {
      const ev = recientes.find(
        (e) => e.resultado === 'correcto' && typeof e.ejercicio === 'string' && Array.isArray(e.renglones) && e.renglones.length,
      );
      reciente = ev ? prepararProcedimiento({ ejercicio: ev.ejercicio, renglones: ev.renglones }, recientes, pack, ahora) : null;
    }
    d.correcto = reciente;
  }

  // Errores por tipo, del más al menos frecuente.
  const conteo = esObjeto(r.conteoErrores) ? r.conteoErrores : {};
  const fuente = Object.keys(conteo).length
    ? conteo
    : eventos.reduce((acc, e) => {
        if (esObjeto(e.error) && e.error.tipo) acc[e.error.tipo] = (acc[e.error.tipo] || 0) + 1;
        return acc;
      }, {});
  d.errores = Object.entries(fuente)
    .map(([tipo, n]) => ({ ...infoError(tipo, pack), tipoOriginal: tipo, n: entero(n) }))
    .filter((e) => e.n > 0)
    .sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre, 'es'));
  const dominante = r.errorDominante || d.errores[0]?.tipoOriginal || null;
  d.errores.forEach((e) => {
    e.dominante = d.errores.length > 1 && e.tipoOriginal === dominante;
  });
  d.totalErrores = d.errores.reduce((s, e) => s + e.n, 0);

  const dudas = Array.isArray(r.dudas) ? r.dudas : eventos.filter((e) => e.tipo === 'duda');
  d.dudas = dudas
    .filter(esObjeto)
    .map((x) => leerDuda(x, ahora))
    .filter(Boolean)
    .sort((a, b) => b.orden - a.orden);

  const actividades = recientes.filter((e) => e.tipo !== 'duda');
  d.historial = {
    total: actividades.length,
    items: actividades.slice(0, MAX_HISTORIAL).map((e) => {
      const x = describirEvento(e, pack);
      return {
        ...x,
        icono: ICONO_RESULTADO[x.tono] || x.icono || 'info',
        fecha: cuando(e.fecha, ahora),
        ejercicio: typeof e.ejercicio === 'string' && e.ejercicio.trim() ? e.ejercicio : '',
      };
    }),
  };
  return d;
}

/* ------------------------------------------------------------------ */
/* HTML                                                                */
/* ------------------------------------------------------------------ */

function htmlRuta(ruta) {
  if (!ruta) {
    return html`
      <div class="ficha-resumen__dato">
        <dt>Ruta asignada</dt>
        <dd>
          <span class="ficha-resumen__valor">Sin ruta todavía</span>
          <span class="ficha-resumen__nota">Se asigna al terminar el diagnóstico.</span>
        </dd>
      </div>`;
  }
  return html`
    <div class="ficha-resumen__dato ficha-resumen__dato--ruta" data-tono="${ruta.tono}">
      <dt>Ruta asignada</dt>
      <dd>
        <span class="ficha-ruta">${ico(ruta.icono)}<span class="ficha-ruta__titulo">${ruta.titulo}</span></span>
        <span class="ficha-resumen__nota">${ruta.detalle}</span>
      </dd>
    </div>`;
}

function htmlResumen(d) {
  const e = d.estado;
  return html`
    <dl class="ficha-resumen">
      <div class="ficha-resumen__dato">
        <dt>Estado</dt>
        <dd>
          <span class="chip chip--${e.chip}">${ico(e.icono)}<span>${e.texto}</span></span>
          ${d.motivo ? html`<span class="ficha-resumen__nota">${d.motivo}</span>` : ''}
        </dd>
      </div>
      <div class="ficha-resumen__dato">
        <dt>Última actividad</dt>
        <dd>
          ${d.ultima
            ? html`<time class="ficha-resumen__valor" datetime="${d.ultima.iso}">${d.ultima.texto}</time>`
            : html`<span class="ficha-resumen__valor">Ninguna todavía</span>`}
        </dd>
      </div>
      ${htmlRuta(d.ruta)}
    </dl>
    ${d.sugerencia
      ? html`<p class="ficha-sugerencia">${ico('llamar')}<span><strong>Qué hacer:</strong> ${d.sugerencia}</span></p>`
      : ''}`;
}

/** Texto e icono del estado de un renglón (el kit pone además ✓, ✗ o ○ en el margen). */
function marcaDe(l) {
  switch (l.estado) {
    case 'ok':
      return { texto: { calculo: 'Cuenta correcta', aproximado: 'Correcto (redondeado)' }[l.nota] || 'Paso correcto', kit: 'ok' };
    case 'error':
      return {
        texto: l.numerica ? 'Aquí la cuenta ya no da' : 'Aquí cambió la solución',
        icono: 'alerta',
        kit: 'error',
      };
    case 'despues':
      return { texto: 'Sin revisar: va después del error', kit: 'despues' };
    case 'ilegible':
      return { texto: `Tecu no entiende este renglón${l.mensaje ? `: ${minuscula(l.mensaje)}` : ''}`, icono: 'alerta', kit: 'error' };
    default:
      return { texto: '', kit: 'neutro' };
  }
}

function htmlLinea(l, p) {
  const ecuacion = crudo(htmlEcuacion(l.texto));
  if (l.estado === 'enunciado') {
    return html`
      <li class="cuaderno__enunciado ficha-proc__renglon">
        <div class="ficha-proc__fila">
          <span class="ficha-proc__num" aria-hidden="true">1</span>
          <span class="ficha-proc__eq"><span class="solo-lector">Renglón 1, la ecuación: </span>${ecuacion}</span>
          <span class="ficha-proc__etiqueta" aria-hidden="true">Ecuación</span>
        </div>
      </li>`;
  }
  const m = marcaDe(l);
  const roto = l.estado === 'error';
  return html`
    <li class="cuaderno__renglon ficha-proc__renglon${roto ? ' ficha-proc__renglon--roto' : ''}" data-estado="${m.kit}">
      <div class="ficha-proc__fila">
        <span class="ficha-proc__num" aria-hidden="true">${l.numero}</span>
        <span class="ficha-proc__eq"><span class="solo-lector">Renglón ${l.numero}: </span>${ecuacion}</span>
        ${m.texto ? html`<span class="ficha-proc__estado">${m.icono ? ico(m.icono) : ''}<span>${m.texto}</span></span>` : ''}
      </div>
      ${roto && p.explicacion ? html`<p class="ficha-proc__explicacion">${p.explicacion}</p>` : ''}
    </li>`;
}

function htmlProcedimiento(p, nombre) {
  return html`
    <div class="cuaderno ficha-proc">
      <ol class="ficha-proc__lista" role="list" aria-label="${`Procedimiento de ${nombre}, renglón por renglón`}">
        ${p.lineas.map((l) => htmlLinea(l, p))}
      </ol>
    </div>`;
}

function htmlContexto(p) {
  if (!p.contexto) return '';
  const { texto, fecha, pistas } = p.contexto;
  return html`<p class="ficha__nota">${texto}${pistas !== null ? html`${SEP}${pistas ? `con ${plural(pistas, 'pista', 'pistas')}` : 'sin pistas'}` : ''}${fecha ? html`${SEP}${htmlTiempo(fecha)}` : ''}</p>`;
}

/** Qué tan seguro está el motor: «Alta», «Probable» o «revísenlo juntos». */
function htmlCerteza(error, info, d) {
  if (info.tipo === TIPOS.NO_CLASIFICADO) {
    return html`<span class="ficha-certeza ficha-certeza--revisar">${ico('pregunta')}<span>Tecu no reconoce este error: revísenlo juntos.</span></span>`;
  }
  if (error.confianza === 'media' || error.confianza === 'baja') {
    const otras = (Array.isArray(error.alternativas) ? error.alternativas : [])
      .filter((t) => t !== error.tipo && d.pack?.errores?.[t])
      .map((t) => minuscula(infoError(t, d.pack).nombre));
    return html`<span class="ficha-certeza ficha-certeza--media">${ico('info')}<span><strong>Probable.</strong> ${otras.length ? `También podría ser: ${otras.join(', ')}. ` : ''}Confírmalo con ${conPunto(d.nombre)}</span></span>`;
  }
  return html`<span class="ficha-certeza ficha-certeza--alta">${ico('check')}<span>Alta: el renglón coincide con este error.</span></span>`;
}

function htmlConError(d, p) {
  return html`
    ${htmlContexto(p)}
    ${htmlProcedimiento(p, d.nombre)}
    <dl class="ficha-diag">
      <div class="ficha-diag__dato">
        <dt>Tipo de error</dt>
        <dd><span class="chip" data-tono="${p.info.tono}">${ico(p.info.icono)}<span>${p.info.nombre}</span></span></dd>
      </div>
      <div class="ficha-diag__dato">
        <dt>Certeza de Tecu</dt>
        <dd>${htmlCerteza(p.error, p.info, d)}</dd>
      </div>
    </dl>
    ${d.estado.clave === 'dominado'
      ? html`<p class="ficha-positivo">${ico('exito')}<span>Ya lo superó: después aprobó la comprobación sin ayuda.</span></p>`
      : ''}
    ${p.sugerencia
      ? html`<p class="ficha-sugerencia">${ico('reloj')}<span><strong>Para 15 minutos con ${d.nombre}:</strong> ${p.sugerencia}</span></p>`
      : ''}`;
}

/** Cómo quedó el procedimiento más reciente cuando no hay error que mostrar. */
const SIN_ERROR = {
  correcto: 'Su último procedimiento está bien de principio a fin.',
  incompleto: 'Su último procedimiento va bien, pero lo dejó sin terminar.',
  sin_entender: 'En su último procedimiento Tecu no entendió un renglón (está marcado).',
};

function htmlSinErrores(d) {
  const p = d.correcto;
  const titulo = d.totalErrores
    ? 'No hay un procedimiento con error para mostrar.'
    : 'No se ha atorado: no tiene errores en lo que ha entregado.';
  const texto = p ? SIN_ERROR[p.estadoMotor] || SIN_ERROR.correcto : 'Todavía no entrega procedimientos escritos.';
  return html`
    <div class="ficha-ok">
      <p class="ficha-ok__titulo">${ico('exito')}<span>${titulo}</span></p>
      <p class="ficha-ok__texto">${texto}</p>
    </div>
    ${p ? html`${htmlContexto(p)}${htmlProcedimiento(p, d.nombre)}` : ''}`;
}

function htmlAtoro(d, ids) {
  let cuerpo;
  if (d.procedimiento) cuerpo = htmlConError(d, d.procedimiento);
  else if (d.estado.clave === 'sin_actividad' && !d.historial.total) {
    cuerpo = html`<div class="vacio ficha__vacio">${ico('lapiz', 40)}<p>Todavía no hay procedimientos: no ha empezado el diagnóstico.</p></div>`;
  } else cuerpo = htmlSinErrores(d);
  return html`
    <section class="ficha__seccion" aria-labelledby="${ids.atoro}">
      <h3 class="titulo-3 ficha__h3" id="${ids.atoro}">${ico('buscar')}<span>Dónde se atoró</span></h3>
      ${cuerpo}
    </section>`;
}

function htmlCifra(etiqueta, valor, unidad = '') {
  const esTexto = !/^\d/.test(String(valor));
  return html`
    <div class="ficha-cifra">
      <dt>${etiqueta}</dt>
      <dd><span class="ficha-cifra__valor${esTexto ? ' ficha-cifra__valor--texto' : ''}">${valor}</span>${unidad
        ? html`<span class="ficha-cifra__unidad">${unidad}</span>`
        : ''}</dd>
    </div>`;
}

function htmlErroresPorTipo(d, ids) {
  if (!d.errores.length) {
    // Sin actividad no hay errores, pero tampoco hay nada que celebrar todavía.
    if (!d.historial.total) return html`<p class="ficha__nota">Sin datos todavía.</p>`;
    return html`<p class="ficha-positivo">${ico('exito')}<span>Sin errores registrados.</span></p>`;
  }
  const max = Math.max(...d.errores.map((e) => e.n));
  return html`
    <ul class="ficha-errores" role="list" aria-labelledby="${ids.tipos}">
      ${d.errores.map(
        (e) => html`
          <li class="ficha-errores__item" data-tono="${e.tono}">
            <span class="ficha-errores__nombre">${ico(e.icono)}<span>${e.nombre}</span>${e.dominante
              ? html`<span class="ficha-errores__marca">el más frecuente</span>`
              : ''}</span>
            <span class="ficha-errores__cuenta"><span class="ficha-errores__num">${e.n}</span> ${e.n === 1 ? 'vez' : 'veces'}</span>
            <span class="ficha-errores__barra" aria-hidden="true"><span style="--valor: ${Math.max(Math.round((e.n / max) * 100), 4)}%"></span></span>
          </li>`,
      )}
    </ul>
    <p class="ficha__nota">${plural(d.totalErrores, 'error', 'errores')} en total.</p>`;
}

function htmlIndicadores(d, ids) {
  const c = d.comprobacion;
  return html`
    <section class="ficha__seccion" aria-labelledby="${ids.indicadores}">
      <h3 class="titulo-3 ficha__h3" id="${ids.indicadores}">${ico('grafica')}<span>Indicadores</span></h3>
      <dl class="ficha-cifras">
        ${htmlCifra('Pistas usadas', d.pistas)}
        ${htmlCifra('Pidió la solución', d.soluciones, d.soluciones === 1 ? 'vez' : 'veces')}
        ${c.intentos
          ? htmlCifra('Comprobación sin ayuda', `${c.aprobadas} de ${c.intentos}`, c.intentos === 1 ? 'aprobada' : 'aprobadas')
          : htmlCifra('Comprobación sin ayuda', 'Aún no la intenta')}
        ${d.porRevisar ? htmlCifra('Por revisar en clase', d.porRevisar, d.porRevisar === 1 ? 'procedimiento' : 'procedimientos') : ''}
      </dl>
      <h4 class="ficha__h4" id="${ids.tipos}">Errores por tipo</h4>
      ${htmlErroresPorTipo(d, ids)}
    </section>`;
}

function htmlDudas(d, ids) {
  const n = d.dudas.length;
  return html`
    <section class="ficha__seccion" aria-labelledby="${ids.dudas}">
      <h3 class="titulo-3 ficha__h3" id="${ids.dudas}">${ico('chat')}<span>Dudas a Tecu</span>${n
        ? html`<span class="ficha__cuenta"><span class="solo-lector">: </span>${n}</span>`
        : ''}</h3>
      ${n
        ? html`<ol class="ficha-dudas" role="list">
            ${d.dudas.map(
              (x) => html`
                <li class="ficha-duda">
                  <p class="ficha-duda__pregunta"><span class="solo-lector">Su duda: </span>«${x.texto}»</p>
                  ${x.respuesta
                    ? html`<p class="ficha-duda__respuesta"><span class="ficha-duda__quien">${ico('tecu')}<span>Tecu respondió:</span></span> ${x.respuesta}</p>`
                    : html`<p class="ficha-duda__pendiente">${ico('reloj')}<span>Pendiente de respuesta</span></p>`}
                  ${x.fecha ? html`<p class="ficha__nota">${htmlTiempo(x.fecha)}</p>` : ''}
                </li>`,
            )}
          </ol>`
        : html`<p class="ficha__nota">No ha escrito dudas a Tecu.</p>`}
    </section>`;
}

function htmlHistorial(d, ids) {
  const { items, total } = d.historial;
  const cuantas = total > items.length ? `Últimas ${items.length} de ${total} actividades` : `${plural(total, 'actividad', 'actividades')}`;
  return html`
    <section class="ficha__seccion" aria-labelledby="${ids.historial}">
      <h3 class="titulo-3 ficha__h3" id="${ids.historial}">${ico('calendario')}<span>Historial</span></h3>
      ${items.length
        ? html`
            <p class="ficha__nota">${cuantas}, de la más reciente a la más antigua.</p>
            <ol class="ficha-historial" role="list">
              ${items.map(
                (x) => html`
                  <li class="ficha-evento" data-resultado="${x.tono}">
                    <span class="ficha-evento__icono">${ico(x.icono)}</span>
                    <div class="ficha-evento__cuerpo">
                      <p class="ficha-evento__texto"><strong>${x.titulo}</strong>${x.resultado ? html`${SEP}${x.resultado}` : ''}</p>
                      ${x.fecha || x.ejercicio
                        ? html`<p class="ficha-evento__meta">${htmlTiempo(x.fecha)}${x.fecha && x.ejercicio ? SEP : ''}${x.ejercicio
                            ? html`<span class="ficha-evento__ecuacion">${crudo(htmlEcuacion(x.ejercicio))}</span>`
                            : ''}</p>`
                        : ''}
                    </div>
                  </li>`,
              )}
            </ol>`
        : html`<p class="ficha__nota">Todavía no hay actividad.</p>`}
    </section>`;
}

function htmlFicha(est) {
  const d = datosFicha(est.resumen, est.pack, est.opciones.ahora);
  d.pack = est.pack;
  est.datos = d;
  const ids = est.ids;
  return html`
    <div class="ficha__cabeza">
      <div class="ficha__identidad">
        <span class="ficha__avatar" aria-hidden="true">${d.inicial}</span>
        <div class="ficha__nombre">
          <h2 class="titulo-2 ficha__titulo" id="${ids.titulo}" tabindex="-1"><span class="solo-lector">Ficha de </span>${d.nombre}</h2>
          ${d.enVivo ? html`<span class="insignia ficha__vivo">En vivo</span>` : ''}
        </div>
      </div>
      <button type="button" class="boton boton--secundario ficha__cerrar" data-act="cerrar" data-foco="cerrar">${ico('cerrar')}<span>Cerrar</span></button>
    </div>
    <div class="ficha__cuerpo">
      ${htmlResumen(d)}
      ${htmlAtoro(d, ids)}
      ${htmlIndicadores(d, ids)}
      ${htmlDudas(d, ids)}
      ${htmlHistorial(d, ids)}
    </div>
    ${typeof est.opciones.onImprimir === 'function'
      ? html`
          <div class="ficha__pie">
            ${est.mensajePie ? html`<p class="ficha__error" role="alert">${ico('alerta')}<span>${est.mensajePie}</span></p>` : ''}
            <button type="button" class="boton boton--primario ficha__imprimir" data-act="imprimir" data-foco="imprimir">${ico('imprimir')}<span>Imprimir hoja<span class="ficha__imprimir-resto"> para este estudiante</span></span></button>
          </div>`
      : ''}`;
}

/* ------------------------------------------------------------------ */
/* Diálogo                                                             */
/* ------------------------------------------------------------------ */

/** La ficha abierta (solo hay una a la vez). */
let abierta = null;
let contador = 0;

/** Lo que cambia cuando llega actividad nueva (para avisar solo entonces). */
const firmaDe = (r) =>
  [
    Array.isArray(r.eventos) ? r.eventos.length : 0,
    r.ultimaActividad ?? '',
    Array.isArray(r.dudas) ? r.dudas.map((x) => `${x.id ?? ''}:${x.datos?.respondida ?? x.respuesta ?? ''}`).join(',') : '',
    r.estado ?? '',
  ].join('|');

function decir(est, mensaje) {
  est.voz.textContent = '';
  setTimeout(() => {
    if (!est.cerrada) est.voz.textContent = mensaje;
  }, 60);
}

function enfocarTituloDe(est) {
  est.dialogo.querySelector(`#${est.ids.titulo}`)?.focus({ preventScroll: true });
}

/** Mide la barra de arriba y la de abajo: el scroll deja lo enfocado a la vista (WCAG 2.4.11). */
function medir(est) {
  est.observador?.disconnect();
  if (typeof ResizeObserver !== 'function') return;
  const cabeza = est.marco.querySelector('.ficha__cabeza');
  const pie = est.marco.querySelector('.ficha__pie');
  est.observador = new ResizeObserver(() => {
    est.dialogo.style.setProperty('--ficha-cabeza-alto', `${cabeza ? cabeza.offsetHeight : 0}px`);
    est.dialogo.style.setProperty('--ficha-pie-alto', `${pie ? pie.offsetHeight : 0}px`);
  });
  if (cabeza) est.observador.observe(cabeza);
  if (pie) est.observador.observe(pie);
}

function pintar(est, { conservar = false } = {}) {
  const contenido = htmlFicha(est);
  const scroll = est.dialogo.scrollTop;
  if (conservar) renderConFoco(est.marco, contenido);
  else est.marco.innerHTML = String(contenido);
  est.dialogo.scrollTop = conservar ? scroll : 0;
  medir(est);
}

/** Si la vista se repintó mientras tanto, busca el mismo botón por id, data-foco o data-alumno. */
function devolverFoco(previo) {
  if (!previo) return;
  let destino = previo.isConnected ? previo : null;
  if (!destino && typeof CSS !== 'undefined' && CSS.escape) {
    const { id } = previo;
    const foco = previo.dataset?.foco;
    const alumno = previo.dataset?.alumno;
    destino =
      (id && document.getElementById(id)) ||
      (foco && document.querySelector(`[data-foco="${CSS.escape(foco)}"]`)) ||
      (alumno && document.querySelector(`:is(button, a, [tabindex])[data-alumno="${CSS.escape(alumno)}"]`)) ||
      null;
  }
  if (destino && typeof destino.focus === 'function') destino.focus();
}

function finalizar(est) {
  if (est.cerrada) return;
  est.cerrada = true;
  est.quitar.forEach((fn) => fn());
  est.observador?.disconnect();
  if (est.dialogo.open) est.dialogo.close();
  est.dialogo.remove();
  if (abierta === est) abierta = null;
  if (!abierta) devolverFoco(est.previo);
  try {
    est.opciones.onCerrar?.(est.resumen);
  } catch (error) {
    console.error(error);
  }
}

function imprimir(est) {
  const fn = est.opciones.onImprimir;
  if (typeof fn !== 'function') return;
  const fallo = (error) => {
    console.error(error);
    if (est.cerrada) return;
    est.mensajePie = 'No se pudo preparar la hoja. Intenta de nuevo.';
    pintar(est, { conservar: true });
  };
  if (est.mensajePie) {
    est.mensajePie = '';
    pintar(est, { conservar: true });
  }
  try {
    Promise.resolve(fn(est.resumen)).catch(fallo);
  } catch (error) {
    fallo(error);
  }
}

/** Tocar el fondo oscuro cierra (solo si el toque empezó y terminó fuera de la ficha). */
function escucharFondo(est) {
  const { dialogo } = est;
  let empezoFuera = false;
  const fuera = (e) => {
    if (e.target !== dialogo) return false;
    const r = dialogo.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  const abajo = (e) => {
    empezoFuera = fuera(e);
  };
  const clic = (e) => {
    if (empezoFuera && fuera(e)) finalizar(est);
    empezoFuera = false;
  };
  dialogo.addEventListener('pointerdown', abajo);
  dialogo.addEventListener('click', clic);
  est.quitar.push(() => {
    dialogo.removeEventListener('pointerdown', abajo);
    dialogo.removeEventListener('click', clic);
  });
}

function opcionesDe({ onImprimir = null, onCerrar = null, ahora = Date.now() } = {}) {
  return { onImprimir, onCerrar, ahora: aFecha(ahora) ? ahora : Date.now() };
}

/**
 * Abre la ficha de un estudiante en un <dialog> modal.
 *
 * @param {object} resumenAlumno ResumenAlumno de js/data/analitica.js (tolera campos faltantes)
 * @param {object} pack paquete de contenido (packs/ecuaciones-1.json)
 * @param {{
 *   onImprimir?: (resumen: object) => void,  // botón «Imprimir hoja para este estudiante» (sin él no se muestra)
 *   onCerrar?: (resumen: object) => void,    // al cerrarse por cualquier vía
 *   ahora?: number|string|Date,              // referencia para «hace 2 días» (por omisión, Date.now())
 * }} [opciones]
 * @returns {HTMLDialogElement|null}
 */
export function abrirFicha(resumenAlumno, pack, opciones = {}) {
  if (!esObjeto(resumenAlumno)) return null;
  const paquete = esObjeto(pack) ? pack : { errores: {} };
  const opts = opcionesDe(opciones);

  // Ya hay una ficha abierta: se reutiliza (una sola a la vez).
  if (abierta && !abierta.cerrada && abierta.dialogo.open) {
    const est = abierta;
    const mismo = est.resumen?.id === resumenAlumno.id;
    const firma = firmaDe(resumenAlumno);
    const nueva = mismo && firma !== est.firma;
    Object.assign(est, { resumen: resumenAlumno, pack: paquete, opciones: opts, firma, mensajePie: '' });
    pintar(est, { conservar: mismo });
    if (!mismo) enfocarTituloDe(est);
    else if (nueva) decir(est, `Ficha de ${est.datos.nombre} actualizada con actividad nueva.`);
    return est.dialogo;
  }

  const activo = document.activeElement;
  const id = `ficha-${++contador}`;
  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialogo dialogo--ancho ficha';
  dialogo.setAttribute('aria-labelledby', `${id}-titulo`);
  dialogo.innerHTML =
    '<div class="ficha__marco" data-ref="marco"></div>' +
    '<p class="solo-lector" role="status" aria-live="polite" aria-atomic="true" data-ref="voz"></p>';

  const est = {
    dialogo,
    ids: {
      titulo: `${id}-titulo`,
      atoro: `${id}-atoro`,
      indicadores: `${id}-indicadores`,
      tipos: `${id}-tipos`,
      dudas: `${id}-dudas`,
      historial: `${id}-historial`,
    },
    marco: dialogo.querySelector('[data-ref="marco"]'),
    voz: dialogo.querySelector('[data-ref="voz"]'),
    previo: activo && activo !== document.body && activo !== document.documentElement ? activo : null,
    resumen: resumenAlumno,
    pack: paquete,
    opciones: opts,
    firma: firmaDe(resumenAlumno),
    mensajePie: '',
    cerrada: false,
    quitar: [],
    observador: null,
    datos: null,
  };

  document.body.appendChild(dialogo);
  pintar(est);
  abierta = est;
  dialogo.addEventListener('close', () => finalizar(est));
  est.quitar.push(delegar(dialogo, { cerrar: () => finalizar(est), imprimir: () => imprimir(est) }));
  escucharFondo(est);
  if (typeof dialogo.showModal === 'function') dialogo.showModal();
  else dialogo.setAttribute('open', '');
  enfocarTituloDe(est);
  return dialogo;
}

/** Cierra la ficha abierta (si hay) y devuelve el foco a lo que la abrió. */
export function cerrarFicha() {
  if (abierta) finalizar(abierta);
}

/** @returns {string|null} id del estudiante cuya ficha está abierta */
export function fichaAbierta() {
  return abierta && !abierta.cerrada ? (abierta.resumen?.id ?? null) : null;
}
