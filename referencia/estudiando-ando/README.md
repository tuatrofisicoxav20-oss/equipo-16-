# Estudiando Ando

Prototipo de una plataforma web y móvil de aprendizaje adaptativo con IA para secundaria en Veracruz. Tiene dos módulos:

- **Estudiante:** diagnóstico, ruta personalizada, lecciones en varios formatos, un tutor que guía con preguntas y pistas progresivas sin dar la respuesta, una comprobación sin ayuda, avances, mensajes del docente y uso sin internet con sincronización.
- **Docente:** mapa de aprendizaje del grupo, alertas tempranas (son sugerencias, no diagnósticos), seguimiento individual, retroalimentación, planeación de clase e indicadores de intervención.

Los datos son ficticios. La barra «Demostración» permite cambiar de perfil, elegir estudiante y simular que no hay conexión. También tiene el control **Vista**, con tres opciones:

- **Automática** (predeterminada): se adapta a la pantalla real.
- **Móvil:** en una pantalla ancha, la app se muestra dentro de un marco de teléfono de 390 × 844 px y funciona igual que en un celular.
- **Escritorio:** en un teléfono o tableta se amplía el viewport a 1280 px, como la opción «versión de escritorio» del navegador. En una ventana angosta de computadora, la vista de escritorio se muestra reducida.

Las respuestas y los ajustes se comparten entre las vistas.

## Cómo ejecutarlo

No requiere instalación ni dependencias. Puedes abrir `index.html` directamente en el navegador o servir la carpeta en local, lo que además activa el modo sin conexión (service worker):

```bash
python -m http.server 5173
```

Luego abre <http://localhost:5173>.

## Estructura

| Archivo | Contenido |
| --- | --- |
| `index.html` | Documento base: idioma, enlace para saltar al contenido, regiones en vivo, diálogo modal |
| `styles.css` | Variables de diseño, temas (claro, oscuro, alto contraste), componentes y adaptación |
| `js/core.js` | Plantillas seguras (escapan HTML), iconos, almacenamiento, avisos, diálogo, foco, voz |
| `js/data.js` | Contenido y datos de ejemplo |
| `js/components.js` | Componentes de interfaz reutilizables |
| `js/student.js` | Pantallas y lógica del módulo estudiante |
| `js/teacher.js` | Pantallas y lógica del módulo docente |
| `js/about.js` | Planteamiento, propuesta, pedagogía, impacto y fuentes |
| `js/app.js` | Estado, rutas, estructura general, preferencias, conexión y sincronización |
| `sw.js`, `manifest.webmanifest` | Aplicación instalable y uso sin conexión |

Son scripts clásicos que comparten el espacio de nombres `window.TA`, así que el proyecto también funciona abierto como archivo local, sin servidor. Para no repetir controladores, los eventos se delegan con atributos `data-action`, `data-change` y `data-submit`.

## Accesibilidad (WCAG 2.2 nivel AA)

- **Perceptible:**
  - Contraste de texto de al menos 4.5:1 y de controles de al menos 3:1, en los tres temas.
  - Ningún estado depende solo del color: también lleva texto e icono.
  - Las gráficas tienen descripción en texto y el mapa de aprendizaje es una tabla de datos.
- **Adaptable:**
  - Sin desplazamiento horizontal a 320 px.
  - Texto ampliable hasta 150 %.
  - Espaciado de texto según el criterio 1.4.12.
  - Se respetan el movimiento reducido y los colores forzados de Windows.
- **Operable:**
  - Todo funciona con teclado.
  - Enlace para saltar al contenido.
  - Foco siempre visible y que no queda oculto bajo las barras fijas.
  - Objetivos táctiles de 44 px.
  - Los avisos se pausan al pasar el cursor o enfocarlos.
- **Comprensible:**
  - Idioma `es-MX`.
  - Errores con resumen enlazado y mensaje en cada campo.
  - Confirmación o «Deshacer» antes de acciones que no se pueden revertir.
  - La navegación es la misma en todas las pantallas.
- **Robusto:**
  - HTML semántico y diálogos nativos.
  - Regiones en vivo para anunciar cambios.
  - Nombres accesibles en todos los controles.

Revisado con axe-core: sin infracciones WCAG en las 13 pantallas ni en los tres temas.

## Heurísticas de usabilidad de Nielsen

1. **Visibilidad del estado:** conexión, sincronización pendiente, nivel de dominio y alertas sin revisar.
2. **Relación con el mundo real:** lenguaje escolar y ejemplos cotidianos, como la balanza o el mercado.
3. **Control y libertad:** deshacer, restaurar, volver y reiniciar la demostración.
4. **Consistencia:** los mismos componentes y la misma navegación en ambos módulos.
5. **Prevención de errores:** validación antes de enviar y confirmación en acciones destructivas.
6. **Reconocer antes que recordar:** ruta visible, pistas a la vista y plantillas de retroalimentación.
7. **Flexibilidad:** modo simple, lectura en voz alta, tamaño de texto y ahorro de datos.
8. **Diseño minimalista:** una tarea principal por pantalla; el modo simple oculta lo secundario.
9. **Recuperación de errores:** los mensajes dicen qué pasó y cómo seguir.
10. **Ayuda:** recorrido guiado y sección «Acerca del proyecto» con sus fuentes.
