# Arquitectura de Tecu Aprende (demo)

Este documento es el **contrato** entre módulos. Varios agentes trabajan en paralelo;
cada quien es dueño de sus archivos y programa contra estas interfaces. Si necesitas
cambiar una interfaz o un archivo que no es tuyo, **no lo edites**: repórtalo al integrador.

## Reglas generales

- JavaScript puro con módulos ES, **sin framework, sin dependencias en tiempo de ejecución y sin paso de compilación**.
  Celular de gama baja: nada pesado, nada de CDN obligatorio.
- Estilo de código: 2 espacios, punto y coma, comillas simples, `const` por defecto, funciones pequeñas,
  JSDoc en lo exportado. Nombres de dominio en español (como `js/core/engine.js`).
- Patrón de interfaz (heredado de la maqueta): cada vista tiene un objeto `state`, una función `render()`
  que reconstruye el HTML de su raíz a partir de `state`, y delegación de eventos con `data-act="accion"`
  (+ `data-*` para parámetros). Escribir en un `<input>` **no** debe provocar `render()` (se perdería el foco):
  actualiza `state` en silencio y renderiza solo en acciones.
- Todo lo esencial funciona **sin internet y sin modelo de lenguaje**. El diagnóstico es `js/core/engine.js`.
- Textos en español de México. Al estudiante se le habla de tú, claro, para 12 a 15 años.
- Nunca mostrar "Diseño:" ni "datos ficticios" en la interfaz (salvo una nota discreta en el panel docente
  que diga que el grupo es simulado).
- Estadísticas: solo las de `packs/contexto.json` (con su fuente). No inventes cifras ni estudios.

## Accesibilidad (WCAG 2.2 AA) — obligatorio en cada módulo

- `<button>` para acciones, `<a>` para navegación, controles de formulario con `<label>` visible.
- Objetivos táctiles de **al menos 44×44 px**. Foco visible siempre (`:focus-visible`), nunca `outline: none` sin reemplazo.
- Contraste: texto ≥ 4.5:1, texto grande y bordes de controles ≥ 3:1. La información nunca depende solo del color
  (usa icono + texto).
- Mensajes dinámicos con `anunciar()` de `js/ui/dom.js` (región `aria-live`). Al cambiar de pantalla, `enfocarTitulo()`.
- Nada de arrastrar como única forma de interactuar (WCAG 2.5.7): todo se puede hacer con toques o teclado.
- Respeta `prefers-reduced-motion` y la clase `html.reducir-movimiento`.
- Sin límites de tiempo. Reflow sin scroll horizontal a 320 px. Texto ampliable (usa `rem`).

## Usabilidad (Nielsen) y regla de los 5 clics

- **Ninguna tarea toma más de 5 clics** desde la pantalla de inicio de su vista (escribir no cuenta como clic).
- Estado del sistema siempre visible: conexión, pendientes de sincronizar, progreso ("Ejercicio 2 de 4").
- Control y libertad: se puede corregir o borrar un renglón, volver atrás, cancelar diálogos.
- Prevención de errores: confirmar acciones destructivas (ver solución, reiniciar). Validar lo que se escribe.
- Errores en lenguaje claro que digan qué hacer ("Falta el signo =").
- Reconocer en vez de recordar: teclas rápidas para x, +, −, =, /; el enunciado siempre visible.

## Mapa de archivos y dueños

| Archivo | Responsabilidad |
|---|---|
| `index.html`, `js/main.js`, `js/ui/dom.js` | Integrador: shell, enrutador por `?vista=`, utilidades DOM |
| `js/core/*` | Motor (listo y probado): `engine.js`, `textos.js`, `ruta.js`, `fraction.js`, `rng.js` |
| `packs/ecuaciones-1.json` | Contenido (explicaciones, pistas, preguntas, respuestas de Tecu) |
| `styles.css`, `fonts/`, `js/ui/iconos.js` | Sistema visual |
| `js/ui/tecu.js`, `js/ui/balanza.js` | Mascota y balanza SVG |
| `js/ui/cuaderno.js` | Cuaderno de renglones (escribir procedimiento, pistas, solución) |
| `js/views/estudiante.js` | Flujo del estudiante (todas sus pantallas) |
| `js/data/store.js`, `js/data/paquete.js`, `js/services/preferencias.js`, `js/services/red.js` | Datos, registro de eventos, preferencias, conexión |
| `js/views/docente.js`, `js/data/grupo.js`, `js/data/analitica.js` | Panel docente (fase 4) |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA (fase 3) |
| `js/views/pitch.js`, `js/data/guiones.js` | Modo pitch (fase 5) |
| `server.js`, `js/services/tutor.js` | IA opcional (fase 6) |

## Interfaces

### `js/ui/dom.js` (listo)

```js
esc(texto)                      // escapa HTML
html`...${valor}...`            // plantilla que escapa todo lo interpolado...
crudo(htmlConfiable)            // ...salvo lo envuelto en crudo() (SVG propio, HTML ya armado con html``)
anunciar(mensaje, { urgente })  // lector de pantalla (aria-live polite o assertive)
aviso(mensaje, { tipo, duracion })        // toast visual + anunciar(); tipo: info|exito|alerta|error
enfocarTitulo(raiz)             // enfoca el [data-titulo] (o el primer h1/h2) de la raíz
delegar(raiz, acciones)         // click en [data-act] → acciones[act](elemento, evento); devuelve función para quitar
confirmar({ titulo, mensaje, aceptar, cancelar, peligro })  // <dialog> accesible → Promise<boolean>
renderConFoco(raiz, htmlNuevo)  // reemplaza el contenido y devuelve el foco al elemento con el mismo [data-foco]
```

### `js/services/preferencias.js`

```js
PREFS_POR_DEFECTO = { texto: 'normal', contraste: false, movimiento: 'auto', voz: false }
leerPreferencias() → prefs                   // localStorage 'tecu:prefs'
guardarPreferencias(parciales) → prefs       // guarda, aplica y avisa a otras pestañas/iframes
aplicarPreferencias(prefs, doc = document)
alCambiarPreferencias(fn) → quitar           // también escucha el evento 'storage'
```

Contrato CSS: `html[data-texto="grande"]` (112.5 %), `html[data-texto="muy-grande"]` (125 %),
`html.alto-contraste`, `html.reducir-movimiento`.

### `js/services/red.js`

```js
crearRed(alumno) → {
  enLinea() → boolean               // navigator.onLine && !simuladaSinInternet()
  real() → boolean                  // navigator.onLine
  simuladaSinInternet() → boolean   // interruptor "Con internet / Sin internet" (para proyectar)
  simular(sinInternet)              // persiste en localStorage 'tecu:red:<alumno>'
  suscribir(fn(estado)) → quitar    // estado = { enLinea, real, simulada }
}
```

### `js/data/store.js`

Claves de `localStorage` (todas empiezan con `tecu:`):

- `tecu:dispositivo:<alumno>:eventos` — eventos del celular (con bandera `sincronizado`)
- `tecu:dispositivo:<alumno>:progreso` — avance del estudiante (lo define y usa `estudiante.js`)
- `tecu:dispositivo:<alumno>:dudas` — dudas escritas a Tecu
- `tecu:servidor:eventos` — "servidor" simulado: eventos ya sincronizados (lo lee el panel docente)

```js
/** @typedef {{
 *   id: string, alumno: string, fecha: string, sincronizado: boolean,
 *   tipo: 'diagnostico'|'practica'|'comprobacion'|'pregunta'|'visual'|'ruta'|'dominio'|'duda'|'solucion'|'libre',
 *   ejercicio?: string, renglones?: string[],
 *   resultado?: 'correcto'|'error'|'incompleto'|'sin_entender',
 *   error?: { tipo, renglon, variante, texto, anterior, confianza } | null,
 *   pistasUsadas?: number, pidioSolucion?: boolean, aprobado?: boolean,
 *   ruta?: string, datos?: object
 * }} Evento */

crearStore(alumno, { almacenamiento = localStorage } = {}) → {
  alumno,
  registrar(parcial) → Evento         // agrega id, fecha (ISO) y sincronizado:false
  eventos() / pendientes() → Evento[]
  progreso() → object|null ; guardarProgreso(obj)
  dudas() → Duda[] ; agregarDuda(texto) → Duda ; contestarDuda(id, respuesta)
  sincronizar({ onPaso(i, total) } = {}) → Promise<number>   // mueve pendientes al servidor, marca sincronizado:true,
                                                              // emite BroadcastChannel('tecu-sync') {tipo:'sync', alumno, n}
  reiniciar()                          // borra solo las claves de este dispositivo
  suscribir(fn) → quitar               // cambios locales y de otras pestañas
}
eventosServidor() → Evento[]
guardarEnServidor(eventos)             // lo usa el grupo simulado (fase 4)
escucharServidor(fn(mensaje)) → quitar // BroadcastChannel + evento 'storage'
reiniciarTodo()                        // borra todo 'tecu:' excepto 'tecu:prefs'; emite {tipo:'reinicio'}
```

`Duda = { id, texto, fecha, respuesta: string|null, fechaRespuesta: string|null, pendiente: boolean }`

### `js/data/paquete.js`

```js
cargarPaquete(url = 'packs/ecuaciones-1.json') → Promise<{ pack, bytes, kb }>   // bytes reales del archivo
formatearKB(bytes) → '14.2 KB'
```

### `js/ui/tecu.js`

```js
ESTADOS_TECU = ['normal', 'feliz', 'pensando', 'dormido', 'atento', 'sin-senal']
tecuSVG({ estado = 'normal', tamano = 96, etiqueta = 'Tecu, el tecolote', decorativo = false }) → string SVG
```

### `js/ui/balanza.js`

```js
montarBalanza(contenedor, {
  modo: 'quitar' | 'repartir' | 'separar' | 'comprobar',
  ecuacion: '2x + 3 = 11',     // enteros pequeños (≤ 20 unidades por platillo)
  unLado: false,               // 'quitar': ofrece "quitar de un solo platillo" (la balanza se inclina)
  textos: { instruccion, cierre },
  onCompletar(resumen),        // una vez, al lograr la meta
  onCambio(estado),
}) → { destruir(), reiniciar() }
```

Metas por modo: **quitar** = dejar solas las cajas (pesas fuera del platillo de las x);
**repartir** = elegir el número de grupos igual al número de cajas; **separar** = juntar cajas con cajas y dejar
las pesas aparte (intentar juntar caja con pesa da retroalimentación); **comprobar** = encontrar el valor de la caja
que equilibra (acepta negativos).

### `js/ui/cuaderno.js`

```js
montarCuaderno(contenedor, {
  ejercicio: '3x + 5 = 20',
  modo: 'diagnostico' | 'practica' | 'comprobacion' | 'libre',
  pack,
  ayudas: boolean,          // pistas y "ver solución" (false en diagnóstico y comprobación)
  validarEnVivo: boolean,   // ✓/⚠ por renglón al agregarlo (práctica y libre)
  onRevisar(resultado),     // { analisis, renglones, pistasUsadas, pidioSolucion }
  onPista(nivel), onSolucion(),
}) → {
  escribirRenglon(texto, { animado = true, msPorLetra = 60 }) → Promise   // para reproducir en el pitch
  revisar() → resultado
  renglones() → string[]    // solo los del estudiante (sin el enunciado)
  enfocar(), destruir()
}
```

`analisis` es lo que devuelve `analizarProcedimiento([ejercicio, ...renglones])`.

### `js/views/estudiante.js`

```js
montarEstudiante(raiz, { alumno = 'invitado', nombre, embebido = false }) → Promise<void>
```

API de control para el modo pitch (mensajes `postMessage` del mismo origen):

```js
{ tecu: 'control', cmd: 'reproducirDiagnostico', items: string[][], rapido?: boolean } // renglones del alumno por ejercicio
{ tecu: 'control', cmd: 'reproducirPractica' }        // resuelve bien el ejercicio de práctica actual
{ tecu: 'control', cmd: 'simularRed', sinInternet: boolean }
{ tecu: 'control', cmd: 'irA', pantalla: string }
{ tecu: 'control', cmd: 'reiniciar' }
// La vista responde con window.parent.postMessage({ tecu: 'estado', alumno, pantalla, pendientes, ruta }, origen)
```

## Kit de clases CSS (lo implementa `styles.css`; lo usan todas las vistas)

**Tokens** (`:root`): `--color-fondo`, `--color-superficie`, `--color-superficie-2`, `--color-texto`,
`--color-texto-sec`, `--color-primario`, `--color-primario-hover`, `--color-sobre-primario`, `--color-acento`,
`--color-exito`, `--color-alerta`, `--color-error`, `--color-info`, `--color-borde`, `--color-foco`,
`--radio`, `--radio-grande`, `--sombra`, `--espacio-1` … `--espacio-6`, `--fuente`, `--fuente-math`,
`--duracion`. Tonos de ruta con `[data-tono="coral|morado|ambar|verde|azul|rosa|gris"]` → `--tono`, `--tono-suave`, `--sobre-tono`.

**Estructura**: `.app`, `.app--estudiante`, `.app--docente`, `.app--pitch`, `.barra-superior`, `.contenido`
(es el `<main id="contenido" tabindex="-1">`), `.nav-inferior` + `.nav-inferior__item` (`aria-current="page"`),
`.pantalla`, `.pila` (columna con espacio), `.fila` (renglón con espacio), `.rejilla`, `.saltar` (skip link).

**Texto**: `.titulo-1`, `.titulo-2`, `.titulo-3`, `.texto-sec`, `.math` (ecuaciones: números tabulares),
`.solo-lector`.

**Componentes**: `.boton` + `--primario|--secundario|--fantasma|--peligro|--bloque|--icono|--chico`;
`.tarjeta` + `--destacada|--tono`; `.chip` + `--exito|--alerta|--error|--info|--neutro`; `.insignia`;
`.segmentado` (botones con `aria-pressed`); `.interruptor` (`button[role=switch][aria-checked]`);
`.barra-progreso` (con `<progress>`); `.pasos` (`li[data-estado="hecho|actual|pendiente"]`);
`.burbuja` + `--tecu|--alumno`; `.opciones` + `button.opcion` (`--correcta|--incorrecta`);
`.cuaderno`, `.cuaderno__enunciado`, `.cuaderno__renglon[data-estado="ok|error|neutro|despues"]`,
`.cuaderno__entrada`, `.teclas-rapidas` + `.tecla`; `.diagnostico` + `--error|--ok|--revisar`;
`.pistas` + `.pista`; `.dialogo` (para `<dialog>`); `.vacio`; `.avisos` + `.aviso--info|exito|alerta|error`;
`.oculto-impresion`, `.solo-impresion`.
