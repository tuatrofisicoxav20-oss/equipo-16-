/* =========================================================
   EstudiandoAndo · acerca del proyecto
   Planteamiento, propuesta, fundamento pedagógico, impacto
   esperado, fuentes y declaración de accesibilidad.
   ========================================================= */
(function (TA) {
  'use strict';

  const { html, icon, ui } = TA;
  const A = (TA.about = {});

  const STATS = [
    { value: '70 %', text: 'de los estudiantes mexicanos evaluados no alcanzó el nivel 2 de competencia matemática.', src: 'OCDE, PISA 2025' },
    { value: '47 %', text: 'usa chatbots de IA para aprender cada semana; 35 % para redactar trabajos y 34 % para resumir textos.', src: 'OCDE, PISA 2025' },
    { value: '17 %', text: 'menor desempeño, al evaluarse sin ayuda, en estudiantes que usaron IA sin salvaguardas pedagógicas.', src: 'Bastani et al., 2025' },
    { value: '25–33 %', text: 'de quienes después reprobarían o abandonarían fueron identificados por sus tutores tras 42 días de observación.', src: "O'Neill, Mørcke y Eika, 2016" },
    { value: '68.3 %', text: 'de los hogares de Veracruz tiene internet, frente a 78.3 % a nivel nacional.', src: 'INEGI, ENDUTIH 2025' },
    { value: '25.4 %', text: 'de los planteles de educación básica del indicador en Veracruz tiene conexión, frente a 46.9 % nacional.', src: 'Indicador estatal 2024 (ver fuentes)' }
  ];

  const STUDENT_FEATURES = [
    ['Contenidos según nivel y plan de estudios', 'student', '/aprender'],
    ['Evaluación diagnóstica', 'student', '/diagnostico'],
    ['Rutas de aprendizaje personalizadas', 'student', '/inicio'],
    ['Tutor de IA que no entrega respuestas', 'student', '/tutor'],
    ['Diferentes formas de estudiar', 'student', '/aprender'],
    ['Detección de errores y refuerzo inmediato', 'student', '/tutor'],
    ['Seguimiento del progreso y autonomía', 'student', '/progreso'],
    ['Comprobación sin asistencia', 'student', '/comprobar'],
    ['Retroalimentación del docente', 'student', '/inicio'],
    ['Accesibilidad y conectividad limitada', 'student', '/descargas']
  ];

  const TEACHER_FEATURES = [
    ['Seguimiento individual', 'teacher', '/alumnos/x'],
    ['Identificación temprana de dificultades', 'teacher', '/alertas'],
    ['Dashboard grupal y mapa de aprendizaje', 'teacher', '/grupo'],
    ['Retroalimentación personalizada', 'teacher', '/alumnos/d'],
    ['Planeación con base en necesidades reales', 'teacher', '/planeacion'],
    ['Seguimiento de las intervenciones', 'teacher', '/planeacion'],
    ['Supervisión y control docente', 'teacher', '/datos']
  ];

  const PEDAGOGY = [
    ['Enseñar en el nivel adecuado (TaRL)', 'Adapta las actividades al nivel demostrado por el estudiante, no solo a su grado. En Veracruz hay un antecedente: los campamentos de Medición Independiente de Aprendizajes (MIA) de CIESAS-Golfo y la Universidad Veracruzana.'],
    ['Evaluación formativa', 'Identifica dificultades con el análisis de respuestas y usa esa información para ajustar la enseñanza y orientar al docente.'],
    ['Aprendizaje por dominio', 'Se avanza a contenidos más complejos cuando se demuestra comprensión de los fundamentos.'],
    ['Andamiaje pedagógico', 'Preguntas, pistas y explicaciones progresivas; el apoyo se reduce conforme aumenta la autonomía.'],
    ['Metacognición y recuperación activa', 'El estudiante explica su procedimiento, reflexiona sobre sus errores y comprueba lo aprendido con ejercicios nuevos.']
  ];

  const SOURCES = [
    ['Organización para la Cooperación y el Desarrollo Económicos (OCDE). (2026). PISA 2025 Results (Volume I): Mexico. OECD Publishing.', 'https://www.oecd.org/en/publications/pisa-2025-results-volume-i-country-notes_2d4ff9ea-en/mexico_85702d30-en.html'],
    ['Instituto Nacional de Estadística y Geografía (INEGI). (2026). Encuesta Nacional sobre Disponibilidad y Uso de Tecnologías de la Información en los Hogares (ENDUTIH) 2025.', 'https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/endutih/ENDUTIH_25_RR.pdf'],
    ['Gobierno del Estado de Veracruz. (2025). Plan Veracruzano de Desarrollo 2025–2030.', 'https://repositorio.veracruz.gob.mx/programadegobierno/wp-content/uploads/sites/4/2025/05/PVD_2025-2030.pdf'],
    ['Bastani, H., Bastani, O., Sungu, A., Ge, H., Kabakcı, Ö., & Mariman, R. (2025). Generative AI without guardrails can harm learning: Evidence from high school mathematics. PNAS, 122(26), e2422633122.', 'https://doi.org/10.1073/pnas.2422633122'],
    ['Banerjee, A., Banerji, R., Berry, J., Duflo, E., Kannan, H., Mukherji, S., Shotland, M., & Walton, M. (2016). Mainstreaming an effective intervention: Evidence from randomized evaluations of Teaching at the Right Level in India. NBER Working Paper No. 22746.', 'https://doi.org/10.3386/w22746'],
    ['Education Endowment Foundation (EEF). Mastery learning.', 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/mastery-learning/'],
    ['Education Endowment Foundation (EEF). Metacognition and self-regulated learning (2.ª ed., 2025).', 'https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/metacognition/'],
    ['Medición Independiente de Aprendizajes (MIA). (s. f.). Campamentos MIA: Enseñar en el Nivel Adecuado (ENAd). CIESAS-Golfo y Universidad Veracruzana.', 'https://www.medicionmia.org.mx/about-1'],
    ['Institute of Education Sciences (IES). (2015, revisado en 2019). Teaching strategies for improving algebra knowledge in middle and high school students. What Works Clearinghouse.', 'https://ies.ed.gov/ncee/wwc/practiceguide/20'],
    ["O'Neill, L. D., Mørcke, A. M., & Eika, B. (2016). The validity of student tutors' judgments in early detection of struggling in medical school: A prospective cohort study. Advances in Health Sciences Education, 21, 1061–1079.", 'https://doi.org/10.1007/s10459-016-9677-6']
  ];

  const featureList = (list) => html`<ul class="feature-list">${list.map(([label, role, route]) => html`<li>
    <a class="feature-link" href="#${route}" data-action="goto" data-role="${role}" data-value="${route}">${icon('right', 16)}<span>${label}</span><span class="sr-only"> (ver en la demostración)</span></a></li>`)}</ul>`;

  A.view = () => html`
    ${ui.pageHeader({
      eyebrow: 'Equipo 16 · Propuesta',
      title: 'Acerca de EstudiandoAndo',
      lead: 'Una plataforma de aprendizaje adaptativo, alineada con los planes y programas de estudio oficiales de México, que usa IA para acompañar al estudiante sin pensar por él y para que el docente detecte dificultades a tiempo.'
    })}

    <nav class="card toc" aria-labelledby="toc-t">
      <h2 class="card__title" id="toc-t">En esta página</h2>
      <ol>
        <li><a class="link" href="#ab-problema" data-action="jump" data-id="ab-problema">Planteamiento del problema</a></li>
        <li><a class="link" href="#ab-propuesta" data-action="jump" data-id="ab-propuesta">Propuesta de solución</a></li>
        <li><a class="link" href="#ab-pedagogia" data-action="jump" data-id="ab-pedagogia">Fundamento pedagógico</a></li>
        <li><a class="link" href="#ab-impacto" data-action="jump" data-id="ab-impacto">Validación e impacto esperado</a></li>
        <li><a class="link" href="#ab-accesibilidad" data-action="jump" data-id="ab-accesibilidad">Accesibilidad y usabilidad</a></li>
        <li><a class="link" href="#ab-fuentes" data-action="jump" data-id="ab-fuentes">Fuentes</a></li>
      </ol>
    </nav>

    <section class="section" id="ab-problema" aria-labelledby="ab-problema-t" tabindex="-1">
      <h2 id="ab-problema-t">Planteamiento del problema</h2>
      <p class="prose">En México, el desafío no es solo dar acceso a contenidos, sino lograr que los estudiantes comprendan, desarrollen y apliquen lo que aprenden. Tener herramientas que dan respuestas no garantiza la comprensión, y los docentes pueden tardar semanas en identificar a quién le cuesta un tema.</p>
      <ul class="stats" role="list">
        ${STATS.map((s) => html`<li class="stat"><p class="stat__value">${s.value}</p><p class="stat__text">${s.text}</p><p class="stat__src">Fuente: ${s.src}</p></li>`)}
      </ul>
      <div class="note note--brand">${icon('target', 22)}<p><strong>Problema central:</strong> dar acompañamiento educativo accesible y adaptado a las dificultades de cada estudiante, que le permita comprender, ganar autonomía y seguir aprendiendo con conectividad limitada; y fortalecer al docente para identificar dificultades a tiempo y retroalimentar de forma personalizada, sin sustituir su labor.</p></div>
    </section>

    <section class="section" id="ab-propuesta" aria-labelledby="ab-propuesta-t" tabindex="-1">
      <h2 id="ab-propuesta-t">Propuesta de solución</h2>
      <p class="prose">Una plataforma móvil y web que, mediante evaluaciones diagnósticas, identifica conocimientos previos y errores, y adapta explicaciones, actividades y apoyos. La IA no entrega respuestas: orienta con preguntas, pistas progresivas, ejemplos y retroalimentación. Elige una función para verla en la demostración.</p>
      <div class="grid grid--2">
        ${ui.card({ id: 'ab-mod-s', title: 'Módulo del estudiante', titleIcon: 'user', level: 3, body: featureList(STUDENT_FEATURES) })}
        ${ui.card({ id: 'ab-mod-t', title: 'Módulo docente', titleIcon: 'users', level: 3, body: featureList(TEACHER_FEATURES) })}
      </div>
    </section>

    <section class="section" id="ab-pedagogia" aria-labelledby="ab-pedagogia-t" tabindex="-1">
      <h2 id="ab-pedagogia-t">Fundamento pedagógico</h2>
      <p class="prose">Un modelo de aprendizaje adaptativo basado en el dominio y la evaluación formativa. Los resultados alimentan al mismo tiempo el módulo del estudiante y el docente.</p>
      ${ui.cycle(-1)}
      <dl class="defs">${PEDAGOGY.map(([t, d]) => html`<div><dt>${t}</dt><dd>${d}</dd></div>`)}</dl>
    </section>

    <section class="section" id="ab-impacto" aria-labelledby="ab-impacto-t" tabindex="-1">
      <h2 id="ab-impacto-t">Validación e impacto esperado</h2>
      <ul class="list-icons prose">
        <li>${icon('target', 18)}<span>Evaluaciones antes y después del aprendizaje, y ejercicios resueltos <strong>sin asistencia</strong>, para medir comprensión y autonomía, no solo actividades completadas.</span></li>
        <li>${icon('clock', 18)}<span>Tiempo entre la aparición de dificultades recurrentes y su identificación por el docente, y utilidad de las alertas.</span></li>
        <li>${icon('trend', 18)}<span>Evolución de los estudiantes después de recibir apoyo, y si las rutas permiten que quienes parten de distintos conocimientos alcancen los objetivos.</span></li>
        <li>${icon('grid', 18)}<span>Cuando sea viable, comparación entre una experiencia adaptativa y una secuencia uniforme, antes de ampliar a otras asignaturas, niveles y regiones.</span></li>
      </ul>
    </section>

    <section class="section" id="ab-accesibilidad" aria-labelledby="ab-accesibilidad-t" tabindex="-1">
      <h2 id="ab-accesibilidad-t">Accesibilidad y usabilidad</h2>
      <p class="prose">Este prototipo se diseñó para cumplir las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.2, nivel AA, y los 10 principios de usabilidad de Jakob Nielsen.</p>
      <div class="grid grid--2">
        ${ui.card({
          id: 'ab-wcag', title: 'WCAG 2.2 AA', titleIcon: 'access', level: 3,
          body: html`<ul class="list-icons">
            <li>${icon('check', 18)}<span>Contraste mínimo de 4.5:1 en texto y 3:1 en controles, en temas claro, oscuro y alto contraste.</span></li>
            <li>${icon('check', 18)}<span>Todo funciona con teclado, con foco visible y sin que la barra fija lo oculte.</span></li>
            <li>${icon('check', 18)}<span>Estructura semántica: puntos de referencia, encabezados en orden y tablas con encabezados.</span></li>
            <li>${icon('check', 18)}<span>El color nunca es la única señal: cada estado lleva texto o icono.</span></li>
            <li>${icon('check', 18)}<span>Texto ampliable hasta 150 % y espaciado ajustable sin perder contenido; adaptable desde 320 px.</span></li>
            <li>${icon('check', 18)}<span>Formularios con etiquetas visibles, ayudas y errores que explican cómo corregir.</span></li>
            <li>${icon('check', 18)}<span>Mensajes de estado anunciados a lectores de pantalla y avisos que no desaparecen mientras se leen.</span></li>
            <li>${icon('check', 18)}<span>Controles de al menos 44 × 44 px y respeto por «reducir movimiento».</span></li>
          </ul>`
        })}
        ${ui.card({
          id: 'ab-nielsen', title: 'Heurísticas de Nielsen', titleIcon: 'compass', level: 3,
          body: html`<ol class="steps">
            <li><strong>Visibilidad del estado:</strong> conexión, sincronización y guardado siempre visibles.</li>
            <li><strong>Lenguaje del mundo real:</strong> español claro y ejemplos cotidianos.</li>
            <li><strong>Control y libertad:</strong> deshacer, cancelar, restaurar y volver atrás con el navegador.</li>
            <li><strong>Consistencia:</strong> la misma navegación y los mismos patrones en todas las pantallas.</li>
            <li><strong>Prevención de errores:</strong> acciones no disponibles explican por qué.</li>
            <li><strong>Reconocer antes que recordar:</strong> iconos con texto y ruta de aprendizaje visible.</li>
            <li><strong>Flexibilidad:</strong> varias formas de estudiar y ajustes de accesibilidad.</li>
            <li><strong>Diseño minimalista:</strong> modo de navegación simplificada.</li>
            <li><strong>Recuperarse de errores:</strong> mensajes junto al campo con la solución.</li>
            <li><strong>Ayuda:</strong> recorrido guiado y esta página de documentación.</li>
          </ol>`
        })}
      </div>
    </section>

    <section class="section" id="ab-fuentes" aria-labelledby="ab-fuentes-t" tabindex="-1">
      <h2 id="ab-fuentes-t">Fuentes</h2>
      <ol class="sources">
        ${SOURCES.map(([ref, url]) => html`<li>${ref} <a class="link" href="${url}" target="_blank" rel="noopener noreferrer">${new URL(url).hostname.replace('www.', '')}${icon('external', 14)}<span class="sr-only"> (se abre en una pestaña nueva)</span></a></li>`)}
      </ol>
      <p class="muted small">Los datos de estudiantes y del grupo en la demostración son ficticios.</p>
    </section>`;

  /* Saltos dentro de la página sin romper el enrutador por hash. */
  Object.assign(TA.actions, {
    jump: (el, e) => {
      e.preventDefault();
      const target = document.getElementById(el.dataset.id);
      if (target) {
        target.scrollIntoView({ behavior: TA.prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        target.focus({ preventScroll: true });
      }
    }
  });

})(window.TA);
