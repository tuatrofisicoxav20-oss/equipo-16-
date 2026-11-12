# Unificación: una sola app («Estudiando Ando» + lo que ya funciona)

El equipo tiene dos prototipos de la misma plataforma:

| | Prototipo de interfaz (zip) | App funcional (este repositorio) |
|---|---|---|
| Dónde | `referencia/estudiando-ando/` (sin cambios) y capturas en `referencia/capturas/` | `index.html`, `js/`, `css/`, `packs/` |
| Qué tiene | Diseño propio (barra azul marino, Atkinson Hyperlegible, tecolote con birrete, temas claro/oscuro/alto contraste), barra «Demostración», 13 pantallas (estudiante, docente, acerca), ajustes de accesibilidad, recorrido guiado | Motor determinista de diagnóstico, cuaderno renglón por renglón, balanza, rutas por tipo de error, modo avión real, cola de sincronización, panel docente en vivo, ficha, cuadernillo, modo presentación, pruebas |
| Qué le falta | Todo es simulado: datos fijos, «IA» con temporizadores | Las pantallas y funciones extra del zip |

**Resultado:** UNA app. **La cara es la del zip** (su diseño, su navegación, sus pantallas y funciones); **por dentro funciona
lo de este repositorio** (motor y datos reales). Donde las dos tienen algo parecido, se combinan.

## Reglas

1. **Un solo sistema de diseño: el del zip.** `styles.css` contiene TODO el CSS del zip con sus mismos nombres (tokens
   `--bg`, `--surface`, `--ink`, `--brand`…; clases `.btn`, `.card`, `.badge`, `.grid`, `.hero`…; temas por
   `html[data-theme]`) más una **capa de compatibilidad**: los tokens de aquí (`--color-*`, `--tono-*`, `--radio*`,
   `--fuente*`…) se definen a partir de los del zip y las clases del kit de aquí (`.boton`, `.tarjeta`, `.chip`…) siguen
   funcionando con el aspecto del zip. Así los componentes que ya existen (cuaderno, balanza, cola, ficha, cuadernillo,
   QR, pitch) se ven integrados en los tres temas sin reescribirse.
2. **Pantallas nuevas o reestructuradas usan el marcado y las clases del zip** (copia su estructura de
   `referencia/estudiando-ando/js/*.js`); los componentes funcionales conservan las suyas.
3. **Todo lo que se muestra es real**: sale de los eventos del estudiante y del motor, o del grupo simulado de 28
   (aclarado con una nota discreta en el módulo docente). **Ningún número fijo del zip** llega a la app.
4. **«IA» solo donde hay IA.** Lo que calcula el motor se llama «sugerencia automática · no es un diagnóstico». La
   capa de IA es opcional (fase 6) y todo funciona sin ella.
5. Ningún texto dice «Diseño:» ni «datos ficticios».
6. **Ana y Luis** son los estudiantes de ejemplo (el guion del pitch y las pruebas dependen de ellos), no Ximena y Diego.
7. **Marca en un solo lugar:** `js/marca.js` → `MARCA = { nombre: 'Estudiando Ando', tutor: 'Tecu', equipo: 'Equipo 16' }`.
   Ningún otro archivo JS escribe el nombre del producto a mano (los estáticos `index.html` y `manifest.webmanifest`
   sí, y están documentados ahí). El tecolote tutor se llama Tecu.
8. WCAG 2.2 AA en los tres temas, heurísticas de Nielsen, ninguna tarea a más de 5 clics, celular de gama baja, sin CDN
   (la fuente Atkinson Hyperlegible va local, con respaldo del sistema).
9. La app debe funcionar en cada commit y las pruebas (`npm test`, `npm run e2e`) deben pasar al cerrar cada etapa.

## Identidad por URL y rutas

- Quién soy va en la URL (cada pestaña o iframe puede ser otra persona): `?alumno=ana|luis|invitado` (por defecto
  `invitado`), `?vista=docente`, `?vista=pitch`; `&embebido=1` (dentro del pitch: sin barra de demostración ni pie) y
  `&compacto=1` (docente denso para el pitch).
- La pantalla va en el hash, como en el zip (permite «Atrás» y compartir):
  - Estudiante: `#/inicio`, `#/aprender`, `#/diagnostico`, `#/tutor`, `#/comprobar`, `#/progreso`, `#/descargas`
  - Docente: `#/grupo`, `#/alertas`, `#/alumnos`, `#/alumnos/<id>`, `#/planeacion`, `#/datos`
  - Ambos: `#/acerca`
- Navegación (igual que el zip): Estudiante → Inicio · Aprender · Tutor · Progreso · Descargas; Docente → Grupo ·
  Alertas (con contador) · Alumnos · Planear · Datos. Pestañas abajo en móvil, barra lateral en escritorio.

## Cascarón y vistas (contrato anfitrión ↔ huésped)

El **cascarón** (`js/shell/`) dibuja la página con el marcado del zip: encabezado (marca con Tecu, estado de conexión
que abre el panel de conexión, botón de accesibilidad, «Leer página» si la voz está activa), barra «Demostración»,
navegación por perfil, `<main id="contenido" tabindex="-1">`, pie. Es dueño del enrutador por hash, del diálogo de
accesibilidad, del panel de conexión (con la cola de `js/ui/cola.js` y «Sincronizar ahora»), del recorrido guiado y del
reinicio. Las **vistas** solo dibujan su pantalla dentro de `<main>`.

```js
// js/views/estudiante.js  y  js/views/docente.js
export async function crearVistaEstudiante({ alumno, embebido, anfitrion }) → Vista
export async function crearVistaDocente({ compacto, anfitrion }) → Vista

// Vista = {
//   rutas: string[],                          // rutas que atiende, p. ej. ['/inicio', '/aprender', …]
//   montar(ruta, params, contenedor),         // dibuja la pantalla en <main> (el cascarón ya la vació); puede ser async.
//                                             // La pantalla trae su <h1 id="page-title" tabindex="-1">.
//   desmontar(),                              // limpia la pantalla actual (listeners, componentes montados)
//   insignias() → { [idNav]: number },        // contadores de la navegación (p. ej. { alertas: 4 })
//   control(mensaje),                         // API de control del modo presentación (la de siempre)
//   destruir(),
// }
// anfitrion = {
//   ir(ruta),                                 // navega: cambia el hash
//   rutaActual() → { ruta, params },
//   actualizar(),                             // pide redibujar encabezado, navegación e insignias
//   titulo(texto),                            // document.title + anuncio para lector de pantalla
//   abrirAccesibilidad(), abrirConexion(),
//   red, store,                               // los mismos objetos de js/services/red.js y js/data/store.js del alumno
// }
```

Mientras una vista no exporte `crearVista…`, el cascarón monta la vista anterior (`montarEstudiante` /
`montarDocente`) a página completa, para que la app nunca deje de funcionar. `montarEstudiante` y `montarDocente`
siguen existiendo (delegan en el cascarón) porque las pruebas y el pitch los usan. La API de control por `postMessage`
(`reproducirDiagnostico`, `avanzarRuta`, `reproducirPractica`, `simularRed`, `irA`, `reiniciar`; docente: `abrirFicha`,
`cerrarFicha`, `enfocar`) y los mensajes `{ tecu: 'estado', … }` no cambian. Se agrega `{ cmd: 'sembrar', hasta:
'diagnostico'|'ruta'|'practica' }`: deja al estudiante en ese punto **al instante** (sin animación) creando eventos
reales con el motor y los `GUIONES`; lo usan «Estudiante de ejemplo» y el recorrido guiado.

## Barra «Demostración» (del zip, con funciones reales)

| Control del zip | En la app unificada |
|---|---|
| Vista: Automática · Móvil · Escritorio | Igual que en el zip (marco de teléfono con iframe de 390 px; escritorio = viewport ampliado) |
| Perfil: Estudiante · Docente | Cambia `?vista=` (conserva el alumno) |
| Estudiante de ejemplo | Ana («se le van los signos al pasar términos»), Luis («resta en lugar de dividir»), Invitado (empieza de cero). Cambia `?alumno=`; «Ver con datos de ejemplo» manda `sembrar` |
| Simular sin internet | El simulador de `js/services/red.js` (el real `navigator.onLine` también cuenta) |
| Recorrido guiado | Los pasos del zip adaptados a Ana/Luis; cada paso navega y, si hace falta, siembra datos |
| Acerca del proyecto | `#/acerca` |
| Reiniciar | `reiniciarTodo()` con confirmación |
| (nuevo) Modo presentación | Enlace a `?vista=pitch` |

No se muestra con `&embebido=1`. Su subtítulo no dice «datos ficticios».

## Pantalla por pantalla

| Pantalla del zip | En la app unificada | De dónde salen los datos |
|---|---|---|
| **Inicio** (héroe con Tecu, «Tu ruta personalizada», «Comprueba lo aprendido», «Mensaje de tu maestra», «Esta semana», «Para repasar») | Igual. El héroe dice lo que toca hoy según el diagnóstico real (o «Empieza con el diagnóstico»). La ruta es: Diagnóstico → Reforzar *(nombre de su error)*: pregunta de Tecu · balanza · práctica → Comprobación sin ayuda → Tema dominado | Progreso y eventos reales; `js/data/mensajes.js`; `js/data/habilidades.js` (minutos, racha) |
| **Aprender** (plan de estudios, lección con formatos Paso a paso · Visual · Ejemplo cotidiano · Escuchar, materias) | Lección de la ruta del estudiante con los 4 formatos: Paso a paso = pasos generados por el motor para el ejemplo de su ruta; **Visual = la balanza interactiva**; Ejemplo cotidiano = texto del paquete; Escuchar = lectura en voz alta. Debajo, las actividades de la ruta (pregunta de Tecu, práctica con cuaderno y pistas). Otras materias: «Próximamente» | `pack.lecciones`, `pack.errores[tipo].ruta`, motor |
| **Diagnóstico** (5 preguntas de opción múltiple, una por habilidad) | Dos partes: **1) Del enunciado a la ecuación** (las 5 preguntas rápidas del zip, con su explicación) y **2) Resuelve paso a paso** (las 4 ecuaciones renglón por renglón con el cuaderno). Resultado: habilidades + error dominante + ruta | `pack.diagnosticoRapido`, `pack.diagnostico`, motor |
| **Tutor** (problema, chat, «Dame una pista», «Explícamelo de otra forma», «Ejemplo cotidiano», «Ver solución», nivel de apoyo) | Igual, con Tecu: el problema es el ejercicio en curso; pistas en escalera generadas (`pistasPara`), otra forma = balanza en palabras, ejemplo cotidiano del paquete, solución solo si la pide (confirmación y registro). Dudas escritas: respuestas preparadas (IA opcional); sin conexión se guardan y se contestan al volver. Bloqueado durante el diagnóstico y la comprobación | `js/core/textos.js`, `js/data/store.js` |
| **Comprobar** (3 ejercicios sin pistas) | La comprobación sin ayuda con el cuaderno: Tecu dormido, sin pistas ni chat; solo si resuelve se marca el tema como dominado | motor |
| **Progreso** (dominio del tema, habilidades dominadas, racha, pistas de hoy, «Mis habilidades», mensajes) | Igual, con datos reales; además «Mis errores» (los tipos de error que ha tenido y cuántas veces) | `js/data/habilidades.js`, eventos |
| **Descargas** (estado de conexión, paquetes, solo Wi-Fi, ahorro de datos) | Igual, con el peso real del paquete y lo que guarda el service worker; los paquetes que no existen: «Próximamente» | `js/data/paquete.js`, `estadoSinConexion()` |
| **Grupo** (indicadores, mapa de aprendizaje por habilidad, filtro «solo quienes necesitan apoyo») | Indicadores reales, **«Lo que más se repite»**, y el mapa con un selector **Habilidades · Errores** (la tabla del zip y el mapa de dificultades en una sola), en vivo | `js/data/analitica.js`, `js/data/habilidades.js`, `js/data/grupo.js` |
| **Alertas** (por revisar · revisadas · descartadas; revisar, editar, descartar con deshacer) | Igual; las alertas salen de «a quién llamar» (atorado, por revisar, inactivo, sin diagnóstico) y del error más repetido del grupo, con el porqué y qué retomar en 15 minutos. Etiqueta: «Sugerencia automática · no es un diagnóstico» | `js/data/alertas.js` |
| **Alumnos** (lista + detalle: dominio, observaciones, intervención antes/después, retroalimentación con plantillas) | Igual; el detalle incluye el procedimiento con el renglón roto (lo de la ficha), y el formulario de retroalimentación envía un mensaje real al estudiante (sin internet queda en la bandeja de salida); «Imprimir hoja» | `js/data/analitica.js`, `js/ui/ficha.js`, `js/data/mensajes.js` |
| **Planear** (contenidos a reforzar con minutos, agrupaciones, «Generar nueva propuesta», intervenciones) | Igual; contenidos y agrupaciones salen del análisis real; cada agrupación imprime su cuadernillo; «Generar otra propuesta» recalcula con otra semilla (sin IA) | `js/data/planeacion.js`, `js/ui/cuadernillo.js` |
| **Datos** (qué ves con y sin internet, privacidad) | Igual, con el estado real de sincronización | `js/data/store.js` |
| **Acerca** (problema con estadísticas, propuesta, pedagogía, impacto, accesibilidad, fuentes) | Igual; los enlaces de «propuesta» llevan a las pantallas reales | `packs/contexto.json` |
| Diálogo de accesibilidad | Igual: tamaño de texto (4), colores (sistema, claro, oscuro, alto contraste), espaciado, movimiento, navegación simplificada, lectura en voz alta | `js/services/preferencias.js` |
| (no existe en el zip) | Modo presentación `?vista=pitch`, cola de sincronización animada, aviso de versión nueva, cuadernillo, QR | lo que ya hay |

## Datos nuevos

```js
// packs/ecuaciones-1.json (se agregan secciones; no se quita nada)
habilidades: [{ id: 'leer'|'inversas'|'despejar'|'comprobar'|'plantear', nombre, corto, errores: [tipos de error que la afectan] }]
lecciones:   { [tipoDeError]: { titulo, pasos: [..], cotidiano, escuchar } }   // + una por habilidad para leer/plantear/comprobar
diagnosticoRapido: [{ id, habilidad, pregunta, opciones: [..], correcta, porque }]   // las 5 del zip
plantillasRetro: [{ etiqueta, texto }]   ·   ciclo: [..]   ·   recorrido: [{ titulo, detalle, perfil, alumno, sinInternet, ruta, sembrar }]

// js/data/habilidades.js (puro, con pruebas)
dominioPorHabilidad(eventos, pack, { ahora }) → [{ id, nombre, corto, valor: 0–100 | null, nivel: 'ok'|'mid'|'low'|'none', etiqueta, evidencias }]
nivelDe(valor) → { id, etiqueta }          // ≥ 70 Dominado · ≥ 45 En progreso · < 45 Necesita apoyo · null Sin datos
habilidadActual(dominio) → índice | -1     ·   racha(eventos, { ahora }) → días   ·   minutosPorDia(eventos, { ahora, dias = 7 }) → number[]
// Evidencia: respuestas del diagnóstico rápido (evento nuevo tipo 'rapido': datos.respuestas = [{ id, habilidad, elegida, correcta }]);
// cada error clasificado cuenta en contra de la habilidad de su tipo; cada procedimiento correcto, a favor.

// js/data/mensajes.js — retroalimentación del docente al estudiante (clave compartida tecu:servidor:mensajes + BroadcastChannel)
crearMensajes({ almacenamiento, canal }) → { enviar({ para, texto, ejercicios }, { enLinea }) → Mensaje, bandeja(), enCola(), vaciarCola() → n,
  para(alumno) → Mensaje[], marcarLeido(id), suscribir(fn) → quitar }
// Mensaje = { id, para, texto, fecha, estado: 'enviado'|'en_cola', ejercicios, leido }

// js/data/alertas.js — sugerencias, no diagnósticos
generarAlertas(resumenes, resumenGrupo, pack, { ahora }) → [{ id (estable), ambito: 'estudiante'|'grupo', alumnoId, quien, tipo, motivo, texto, sugerencia, explicacion }]
crearEstadoAlertas({ almacenamiento }) → { estado(id) → { estado: 'nueva'|'revisada'|'descartada', sugerencia }, revisar(id), deshacerRevision(id),
  descartar(id), restaurar(id), editar(id, texto), reiniciar(id), pendientes(alertas) → n, suscribir(fn) }      // tecu:docente:alertas

// js/data/planeacion.js
sugerirPlan(resumenGrupo, grupos, pack, { semilla }) → [{ id, titulo, minutos, detalle, tipo }]
crearEstadoPlan({ almacenamiento }) → { elegidos(), alternar(id), suscribir(fn) }                               // tecu:docente:plan
intervenciones(resumenes, mensajes, { ahora }) → [{ alumnoId, nombre, tipo, antes, despues, que }]   // antes y después reales
```

El grupo simulado (`js/data/grupo.js`) también genera el evento `rapido` para que el mapa por habilidades tenga datos.

## Preferencias unificadas (`js/services/preferencias.js`)

```js
PREFS_POR_DEFECTO = { tema: 'sistema', tamano: 'md', espaciado: false, movimiento: 'auto', simple: false, voz: false,
                      ahorro: true, soloWifi: true, dispositivo: 'auto' }
// tema: sistema | claro | oscuro | contraste   ·   tamano: md | lg | xl | xxl   ·   movimiento: auto | reducido
// dispositivo: auto | movil | escritorio
```

- `leerPreferencias()` devuelve ese modelo **más** dos campos derivados de solo lectura para el código anterior:
  `texto` (`normal` | `grande` | `muy-grande`) y `contraste` (booleano). `guardarPreferencias()` acepta ambos
  vocabularios (`{ texto: 'grande' }` equivale a `{ tamano: 'lg' }`; `{ contraste: true }` a `{ tema: 'contraste' }`).
  Lo guardado con el modelo anterior se migra al leer. Misma clave `tecu:prefs`.
- Se aplican con los atributos del zip **y** los de antes, para que todo el CSS responda: `data-theme` (`system`,
  `light`, `dark`, `contrast`), `data-text` (`md`…`xxl`), `data-spacing` (`wide`/`normal`), `data-motion`
  (`system`/`reduce`), `data-simple` (`on`/`off`), el `meta[name=theme-color]`, y además la clase `alto-contraste`
  (tema contraste), la clase `reducir-movimiento` y `data-texto` (`grande` para lg, `muy-grande` para xl y xxl).
- El script en línea de `index.html` aplica lo mismo antes del primer pintado.

## Etapas y dueños de archivos

Cada agente edita **solo** sus archivos; si necesita otro, lo reporta. Nadie hace `git commit` ni `git push`.

| Etapa | Área | Archivos |
|---|---|---|
| 1 | Motor (correcciones de la verificación) | `js/core/engine.js`, `js/core/fraction.js`, `tests/regresiones-motor.test.js`, `tests/engine.extra.test.js` |
| 1 | Contenido | `packs/ecuaciones-1.json`, `js/core/textos.js`, `tests/contenido.test.js`, `tests/contenido-unificado.test.js` |
| 1 | Diseño | `styles.css`, `fonts/`, `docs/estilo.html` |
| 1 | Base de interfaz | `js/ui/dom.js`, `js/ui/iconos.js`, `js/ui/tecu.js`, `css/tecu.css`, `js/ui/voz.js`, `icons/`, `js/services/preferencias.js`, `tests/servicios.test.js`, `tests/base-ui.test.js` (`js/marca.js` ya existe) |
| 1 | Datos | `js/data/habilidades.js`, `js/data/mensajes.js`, `js/data/alertas.js`, `js/data/planeacion.js`, `js/data/grupo.js`, sus pruebas |
| 1 | Cascarón | `js/shell/*`, `js/main.js`, `index.html`, `js/views/acerca.js`, `css/cascaron.css`, `docs/demo-cascaron.html` |
| 2 | Estudiante | `js/views/estudiante.js` (y `js/views/estudiante/*`), `css/estudiante.css`, `js/ui/cola.js`, `css/cola.css` |
| 2 | Docente | `js/views/docente.js` (y `js/views/docente/*`), `css/docente.css`, `js/ui/ficha.js`, `css/ficha.css` |
| 2 | Presentación y PWA | `js/views/pitch.js`, `css/pitch.css`, `js/data/escenas.js`, `js/ui/libre.js`, `js/ui/diapositiva.js`, `sw.js`, `manifest.webmanifest`, `tests/sw.test.js` |
| 3 | Pruebas y cierre | `tests/e2e/*`, `README.md`, `docs/*` |

`sw.js` (lista `PRECACHE` y `VERSION`) lo actualiza **solo el integrador** con `npm run version` al cerrar cada etapa:
mientras tanto, las dos pruebas de `tests/sw.test.js` sobre PRECACHE y VERSION pueden fallar por archivos nuevos y se
ignoran.
