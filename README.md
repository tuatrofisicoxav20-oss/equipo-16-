# EstudiandoAndo 📚

**Prototipo web educativo, adaptable a móvil y escritorio.** Incluye una experiencia de aprendizaje guiado, ejemplos visuales, avance del estudiante y panel de seguimiento docente.

> **Estado:** prototipo interactivo. Los datos mostrados son ejemplos y el acompañamiento de IA es una simulación pedagógica, no una conexión a un modelo real. No se conecta a sistemas escolares ni tiene un backend.

## Problema y personas usuarias

Estudiantes de diferentes niveles educativos pueden necesitar explicaciones adicionales o mayor tiempo para comprender un tema, incluso cuando la conectividad es limitada. A su vez, el personal docente necesita identificar dificultades a tiempo y dar seguimiento al aprendizaje de sus grupos y de cada estudiante. La propuesta se dirige a **estudiantes y docentes**, con énfasis en accesibilidad y en el contexto educativo de Veracruz.

## Qué incluye la demostración

- **Estudiante:** actividades de práctica, materiales visuales, acompañamiento guiado con preguntas y pistas, visualización del progreso y material de ejemplo para estudiar cuando la conexión es limitada.
- **Docente:** avances por grupo y estudiante, visualizaciones y tablas accesibles, identificación de contenidos que necesitan refuerzo y propuestas de retroalimentación.
- **Accesibilidad:** controles para contraste, tamaño del texto y opciones de visualización; navegación adaptable para móvil y escritorio.
- **Modo sin Wi-Fi:** demostración del trabajo local con contenidos integrados en el HTML. Los avances pueden persistirse mediante `localStorage` cuando el navegador lo permite.

**Importante:** la simulación "Sin internet" dentro de la interfaz no equivale a desconectar físicamente el dispositivo. Esta versión no instala un *service worker*; tras desplegarla en Vercel, la primera visita necesita internet y no se garantiza que el sitio vuelva a abrir desde cero totalmente desconectado. Lo que sí puede funcionar sin red, una vez abierto, son los ejercicios y recursos incluidos en la página.

## Cómo usarla

1. Abre la web desplegada o el archivo `index.html` con un navegador moderno.
2. Utiliza los controles para cambiar entre **Estudiante** y **Docente**.
3. Cambia la visualización entre **Móvil**, **Web** o **Adaptable**.
4. Entra a las lecciones, practica y revisa las gráficas de avance; en el panel docente, revisa los resultados por grupo y por estudiante.
5. Utiliza las opciones de accesibilidad y el modo de demostración sin Wi-Fi según necesites.

## Cómo ejecutarla localmente

No necesitas Node.js, React ni instalar paquetes. Puedes abrir `index.html` directamente o utilizar un servidor local para reproducir mejor el entorno de Vercel:

```bash
python -m http.server 5173
```

Abre `http://localhost:5173`.

## Cómo subirla a GitHub

Si **ya tienes un repositorio local**, coloca `index.html`, `vercel.json`, `.gitignore` y `README.md` en su **raíz**, sin meterlos en una carpeta adicional. Luego ejecuta:

```bash
git add index.html vercel.json .gitignore README.md
git commit -m "deploy: prepara EstudiandoAndo para Vercel"
git push origin main
```

Sustituye `main` por la rama que realmente uses (`develop`, por ejemplo) si corresponde.

Si estás comenzando un **repositorio nuevo**:

```bash
git init
git branch -M main
git add .
git commit -m "feat: publica prototipo EstudiandoAndo"
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Cambia la URL de ejemplo por la de tu repositorio de GitHub antes de ejecutarlo. Si el repositorio remoto ya tiene commits, no uses estos pasos de inicialización sin reconciliar sus cambios.

## Desplegar en Vercel desde GitHub

1. En [Vercel](https://vercel.com/new), elige **Add New → Project**.
2. Conecta GitHub (si aún no está conectado) y selecciona el repositorio.
3. Usa **Framework Preset: Other** y **Root Directory: `./`** si los archivos están en la raíz.
4. No necesitas **Build Command** ni **Install Command**; la configuración `vercel.json` establece **Output Directory: `.`**.
5. Pulsa **Deploy**. El enlace principal abrirá el archivo `index.html`.

Si el proyecto de Vercel ya estaba asociado a ese repositorio, subir el commit a la rama de producción puede desencadenar un nuevo despliegue automáticamente.

## Estructura del repositorio

```text
EstudiandoAndo/
├── index.html      # HTML, CSS y JavaScript de la aplicación
├── vercel.json     # Configuración de sitio estático (sin compilación)
├── .gitignore      # Archivos que no se suben al repositorio
└── README.md       # Documentación
```

## Tecnologías

**HTML5**, **CSS3**, **JavaScript** del navegador, **SVG** para gráficos y visualizaciones, almacenamiento local con **localStorage** y navegación del lado cliente mediante rutas con `#`. Vercel sirve los archivos estáticos; GitHub aloja el código fuente. No se utiliza framework ni API de IA en esta versión.

## Uso de IA (bitácora breve)

Durante la preparación del prototipo se utilizó asistencia de IA para organizar flujos, redactar lenguaje más sencillo, elaborar diagramas e interfaces y proponer ajustes de accesibilidad. La IA integrada que se ve en el prototipo utiliza **respuestas simuladas** y no requiere token/API externa. Las sugerencias pedagógicas deben ser revisadas y validadas por el equipo y por docentes antes de cualquier uso real.

## Datos utilizados

Para la demostración se utilizan **estudiantes, grupos, ejercicios y resultados ficticios**. Las cifras en gráficas no son estadísticas reales de escuelas de Veracruz. La aplicación no solicita cuentas escolares ni envía datos a un servidor. La persistencia local, cuando existe, queda restringida al navegador y al dispositivo.

## Limitaciones y próximos pasos

La demo no incluye autenticación, base de datos, integración con planes de estudio oficiales ni IA generativa real. Antes de utilizarla con personas o datos escolares reales harían falta validación pedagógica, evaluación de accesibilidad WCAG 2.2 AA, pruebas de usabilidad, protección de datos, soporte real de uso sin conexión e infraestructura de sincronización segura.
