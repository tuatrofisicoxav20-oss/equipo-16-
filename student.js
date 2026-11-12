/* =========================================================
   EstudiandoAndo · datos de la demostración
   Alcance del prototipo: Matemáticas de 1.º de secundaria,
   ecuaciones lineales con una incógnita.
   Todos los nombres y datos de estudiantes son ficticios.
   ========================================================= */
(function (TA) {
  'use strict';

  /* ---------- Habilidades del tema ---------- */
  const skills = [
    { id: 'leer', name: 'Interpretar el enunciado', short: 'Leer' },
    { id: 'inversas', name: 'Operaciones inversas', short: 'Inversas' },
    { id: 'despejar', name: 'Despejar la incógnita', short: 'Despejar' },
    { id: 'comprobar', name: 'Comprobar la solución', short: 'Comprobar' },
    { id: 'plantear', name: 'Plantear problemas', short: 'Plantear' }
  ];

  /** Nivel de dominio a partir del porcentaje (null = sin datos). */
  const levels = [
    { id: 'ok', label: 'Dominado', min: 70 },
    { id: 'mid', label: 'En progreso', min: 45 },
    { id: 'low', label: 'Necesita apoyo', min: 0 },
    { id: 'none', label: 'Sin datos', min: null }
  ];
  const levelOf = (v) => (v == null ? levels[3] : v >= 70 ? levels[0] : v >= 45 ? levels[1] : levels[2]);

  /* ---------- Lecciones (una por habilidad) ----------
     Cada lección ofrece varias formas de estudiar el mismo
     contenido (no "estilos de aprendizaje" fijos). */
  const lessons = [
    {
      title: 'Leer un problema y plantearlo',
      steps: [
        'Lee el problema completo una vez, sin hacer cuentas.',
        'Subraya la pregunta: ¿qué número te piden encontrar?',
        'Nombra ese número con una letra, por ejemplo x.',
        'Traduce cada frase a símbolos: «más 5» es + 5, «es 20» es = 20.',
        'Vuelve a leer tu ecuación con palabras y compárala con el problema.'
      ],
      visual: { left: 'x + 5', right: '20', caption: '«Un número más 5 es 20» se escribe x + 5 = 20.' },
      everyday: 'Tienes algunas canicas y tu prima te regala 5. Ahora tienes 20. Las canicas que tenías al principio son la incógnita: x + 5 = 20.'
    },
    {
      title: 'Operaciones inversas',
      steps: [
        'Cada operación tiene una inversa que la deshace: la suma se deshace restando y la multiplicación, dividiendo.',
        'Para dejar sola a x, deshaz las operaciones que la acompañan.',
        'Lo que hagas de un lado de la igualdad, hazlo también del otro.',
        'Ejemplo: en x + 8 = 15, resta 8 en ambos lados y queda x = 7.'
      ],
      visual: { left: 'x + 8', right: '15', caption: 'Si quitas 8 de un platillo, quita 8 del otro para que la balanza siga en equilibrio.' },
      everyday: 'Si a tu dinero le sumaron $8 y ahora tienes $15, para saber cuánto tenías antes «deshaces» la suma: 15 − 8 = 7.'
    },
    {
      title: 'Despejar la incógnita',
      steps: [
        'Primero deshaz las sumas y restas que acompañan al término con x.',
        'Después deshaz la multiplicación dividiendo entre el número que acompaña a x.',
        'Ejemplo: 3x + 5 = 20 → 3x = 15 → x = 5.'
      ],
      visual: { left: '3x + 5', right: '20', caption: 'Primero quita 5 de ambos lados; después reparte entre 3.' },
      everyday: 'Compras 3 cuadernos iguales y pagas $5 de envío: en total $20. Quita el envío ($15) y repártelo entre los 3 cuadernos: $5 cada uno.'
    },
    {
      title: 'Comprobar la solución',
      steps: [
        'Sustituye el valor que encontraste en la ecuación original.',
        'Calcula cada lado por separado.',
        'Si los dos lados dan lo mismo, tu solución es correcta.'
      ],
      visual: { left: '3(5) + 5', right: '20', caption: '3 por 5 más 5 da 20: los dos lados son iguales.' },
      everyday: 'Es como revisar el cambio en la tienda: vuelves a sumar para confirmar que todo cuadra.'
    },
    {
      title: 'Plantear problemas con ecuaciones',
      steps: [
        'Identifica qué cantidades conoces y cuál desconoces.',
        'Busca la relación entre ellas: ¿se suman?, ¿se multiplican?, ¿una es el doble de otra?',
        'Escribe la ecuación, resuélvela y comprueba que la respuesta tenga sentido en el problema.'
      ],
      visual: { left: 'x + (x + 4)', right: '30', caption: 'Ana tiene x años, su hermano 4 más, y juntos suman 30.' },
      everyday: 'Organizan una rifa: cada boleto cuesta $10 y ya juntaron $50 de donativos. Si la meta es $250, ¿cuántos boletos deben vender? 10x + 50 = 250.'
    }
  ];

  /* ---------- Estudiantes de ejemplo (dos dificultades distintas) ---------- */
  const students = {
    x: {
      id: 'x',
      name: 'Ximena',
      fullName: 'Ximena R.',
      grade: '1.º de secundaria',
      mastery: [78, 34, 52, 58, 30],
      minutes: [20, 35, 0, 45, 30, 25, 12],
      tutor: {
        problem: '3x + 5 = 20',
        answer: 5,
        check: (n) => `3(${n}) + 5 = ${3 * n + 5}`,
        isRight: (n) => 3 * n + 5 === 20,
        guide: [
          '¿Qué quieres dejar solo de un lado de la igualdad?',
          'Para dejar 3x solo, ¿qué número tienes que quitar de los dos lados?',
          'Ya tienes 3x = 15. ¿Qué operación deshace «3 por x»?',
          '¿Cómo comprobarías que tu valor es correcto?'
        ],
        hints: [
          'Mira el «+ 5»: ¿qué operación lo deshace?',
          'Resta 5 en los dos lados de la igualdad: queda 3x = 15.',
          'Ahora divide entre 3 en los dos lados. ¿Cuánto vale x?'
        ],
        solution: ['3x + 5 = 20', '3x + 5 − 5 = 20 − 5  →  3x = 15', '3x ÷ 3 = 15 ÷ 3  →  x = 5', 'Comprobación: 3(5) + 5 = 20 ✓'],
        alt: 'Imagina una balanza en equilibrio: en un platillo hay 3 bolsas iguales con x canicas y 5 canicas sueltas; en el otro, 20 canicas. Si quitas las 5 sueltas de un lado, ¿cuántas quitas del otro para que siga en equilibrio?',
        everyday: 'Compras 3 cuadernos iguales y pagas $5 de envío. En total pagas $20. ¿Cuánto pagaste solo por los cuadernos? ¿Y por cada uno?'
      },
      chat: [
        { from: 'me', text: 'No entiendo cómo resolver 3x + 5 = 20' },
        { from: 'tutor', text: 'Vamos paso a paso; no te daré el resultado todavía. ¿Qué quieres dejar solo de un lado de la igualdad?' },
        { from: 'me', text: 'La x' },
        { from: 'tutor', text: '¡Exacto! Para dejar 3x solo, ¿qué número tienes que quitar de los dos lados? Si dudas, pide una pista.' }
      ]
    },
    d: {
      id: 'd',
      name: 'Diego',
      fullName: 'Diego M.',
      grade: '1.º de secundaria',
      mastery: [32, 64, 55, 60, 22],
      minutes: [15, 20, 25, 0, 40, 10, 18],
      tutor: {
        problem: 'Si a un número le sumo 5, obtengo 20',
        answer: 15,
        check: (n) => `${n} + 5 = ${n + 5}`,
        isRight: (n) => n + 5 === 20,
        guide: [
          '¿Qué es lo que te piden encontrar?',
          'Si a ese número lo llamas x, ¿cómo escribirías «le sumo 5 y obtengo 20»?',
          'Ya tienes x + 5 = 20. ¿Qué operación deshace el «+ 5»?',
          'Léelo de vuelta con palabras: ¿dice lo mismo que el problema?'
        ],
        hints: [
          'Subraya qué te preguntan: ¿qué número buscas?',
          'Llama x a ese número: «un número más 5 es 20» se escribe x + 5 = 20.',
          'Ahora, ¿qué operación deshace el «+ 5»?'
        ],
        solution: ['Número desconocido: x', '«Le sumo 5 y obtengo 20»  →  x + 5 = 20', 'x + 5 − 5 = 20 − 5  →  x = 15', 'Comprobación: 15 + 5 = 20 ✓'],
        alt: 'Piensa el problema al revés: terminaste con 20 después de sumar 5. Si regresas el último paso, ¿con cuánto empezaste?',
        everyday: 'Tenías algunas estampas y te regalaron 5. Ahora tienes 20. ¿Cuántas tenías al principio?'
      },
      chat: [
        { from: 'me', text: 'Si a un número le sumo 5 me da 20. No sé por dónde empezar' },
        { from: 'tutor', text: 'Leamos con calma. ¿Qué es lo que te piden encontrar?' },
        { from: 'me', text: 'El número' },
        { from: 'tutor', text: '¡Eso es! A ese número desconocido lo llamamos x. ¿Cómo escribirías «le sumo 5 y obtengo 20»? Si dudas, pide una pista.' }
      ]
    }
  };

  /* ---------- Evaluación diagnóstica (una pregunta por habilidad) ---------- */
  const diagnostic = [
    {
      skill: 0,
      q: '«El doble de un número menos 3 es 11». ¿Qué ecuación lo representa?',
      options: ['2x − 3 = 11', '2(x − 3) = 11', 'x² − 3 = 11', '3 − 2x = 11'],
      correct: 0,
      why: '«El doble de un número» es 2x; «menos 3» resta después: 2x − 3 = 11.'
    },
    {
      skill: 1,
      q: 'En x + 8 = 15, ¿qué haces para dejar sola a x?',
      options: ['Sumar 8 en los dos lados', 'Restar 8 en los dos lados', 'Restar 8 solo del lado izquierdo', 'Dividir entre 8 los dos lados'],
      correct: 1,
      why: 'La resta deshace la suma, y se aplica en los dos lados para mantener la igualdad.'
    },
    {
      skill: 2,
      q: 'Si 4x = 20, ¿cuánto vale x?',
      options: ['16', '80', '5', '24'],
      correct: 2,
      why: '4x significa 4 por x; se deshace dividiendo entre 4: 20 ÷ 4 = 5.'
    },
    {
      skill: 3,
      q: '¿x = 3 es solución de 2x + 1 = 9?',
      options: ['Sí, porque 3 es menor que 9', 'Sí, porque 2(3) + 1 = 9', 'No, porque 2(3) + 1 = 7', 'No se puede saber'],
      correct: 2,
      why: 'Al sustituir, 2(3) + 1 = 7, que no es igual a 9.'
    },
    {
      skill: 4,
      q: 'Ana tiene x años y su hermano 4 años más. Juntos suman 30. ¿Qué ecuación lo describe?',
      options: ['x + 4 = 30', '4x = 30', 'x + (x + 4) = 30', 'x − 4 = 30'],
      correct: 2,
      why: 'Hay dos edades: x y x + 4. Juntas suman 30.'
    }
  ];

  /* ---------- Comprobación sin ayuda ---------- */
  const check = [
    { id: 'c1', eq: '2x + 6 = 14', answer: 4, review: 'Revisa: ¿restaste 6 en los dos lados antes de dividir?' },
    { id: 'c2', eq: 'x − 9 = −2', answer: 7, review: 'Revisa el signo: la resta se deshace sumando 9 en los dos lados.' },
    { id: 'c3', eq: '5x = −15', answer: -3, review: 'Revisa: al dividir un número negativo entre uno positivo, el resultado es negativo.' }
  ];

  /* ---------- Materias ---------- */
  const subjects = [
    { id: 'mat', name: 'Matemáticas', icon: 'calc', tone: 'brand', active: true, topic: 'Ecuaciones lineales con una incógnita' },
    { id: 'esp', name: 'Español', icon: 'pen', tone: 'rose', active: false },
    { id: 'bio', name: 'Biología', icon: 'leaf', tone: 'accent', active: false },
    { id: 'his', name: 'Historia', icon: 'landmark', tone: 'warn', active: false }
  ];

  const studyPlan = {
    levels: ['Primaria', 'Secundaria', 'Media superior', 'Superior'],
    grades: { Primaria: ['1.º', '2.º', '3.º', '4.º', '5.º', '6.º'], Secundaria: ['1.º', '2.º', '3.º'], 'Media superior': ['1.er semestre', '2.º semestre', '3.er semestre', '4.º semestre'], Superior: ['1.er año', '2.º año'] },
    available: { level: 'Secundaria', grade: '1.º' }
  };

  /* ---------- Paquetes descargables ---------- */
  const packages = [
    { id: 'p1', name: 'Ecuaciones lineales · lecciones 1 a 3', detail: 'Texto, imágenes y ejemplos', mb: 18, icon: 'book', tone: 'brand', status: 'ready' },
    { id: 'p2', name: 'Pistas y ejercicios con retroalimentación', detail: 'Funcionan sin internet', mb: 9, icon: 'bulb', tone: 'accent', status: 'ready' },
    { id: 'p3', name: 'Lectura por voz del navegador', detail: 'Depende de las voces instaladas, no incluye audios descargables', mb: 0, icon: 'volume', tone: 'vio', status: 'none' },
    { id: 'p4', name: 'Problemas con ecuaciones', detail: 'Lección 5 y práctica', mb: 11, icon: 'calc', tone: 'warn', status: 'none' }
  ];

  /* ---------- Grupo del docente ---------- */
  const teacher = { name: 'Profa. Aranda', group: '1.º B', subject: 'Matemáticas', size: 28 };

  const roster = [
    { id: 'x', name: 'Ximena R.', mastery: students.x.mastery, unsynced: false, last: 'Hoy, 7:18', hints: 6 },
    { id: 'd', name: 'Diego M.', mastery: students.d.mastery, unsynced: true, last: 'Hoy, 7:05', hints: 5 },
    { id: 'v', name: 'Valeria T.', mastery: [85, 72, 55, 74, 48], unsynced: false, last: 'Hoy, 7:12', hints: 2 },
    { id: 'm', name: 'Mateo S.', mastery: [60, 40, 38, 58, 32], unsynced: false, last: 'Ayer, 6:40 p. m.', hints: 7 },
    { id: 'r', name: 'Regina L.', mastery: [92, 88, 81, 90, 66], unsynced: false, last: 'Hoy, 7:20', hints: 1 },
    { id: 'e', name: 'Emiliano C.', mastery: [55, 36, 50, null, null], unsynced: true, last: 'Hoy, 6:55', hints: 4 },
    { id: 'c', name: 'Camila V.', mastery: [80, 60, 75, 58, 52], unsynced: false, last: 'Hoy, 7:02', hints: 3 },
    { id: 's', name: 'Santiago P.', mastery: [30, 28, null, null, null], unsynced: true, last: 'Hace 3 días', hints: 2 }
  ];

  const groupAvg = [58, 41, 52, 66, 33];
  const groupStruggling = [5, 9, 6, 3, 11];

  /* Tres grupos para demostrar análisis y comparación. Los datos son ficticios. */
  const teacherGroups = [
    { id:'1b', label:'1.º B', size:28, subject:'Matemáticas', avg:groupAvg, trend:[37,41,44,47,50], distribution:[7,12,9], struggling:groupStruggling },
    { id:'1a', label:'1.º A', size:26, subject:'Matemáticas', avg:[70,61,64,69,59], trend:[47,51,55,59,65], distribution:[13,9,4], struggling:[3,6,5,4,7] },
    { id:'2a', label:'2.º A', size:30, subject:'Matemáticas', avg:[66,58,62,60,56], trend:[42,48,52,56,60], distribution:[12,11,7], struggling:[6,8,5,7,10] }
  ];
  roster.forEach(r=>{r.groupId='1b';});
  roster.push(
    { id:'a1', groupId:'1a', name:'Ana P.', mastery:[84,72,80,78,68], last:'Hoy, 8:10', hints:2 },
    { id:'a2', groupId:'1a', name:'Bruno R.', mastery:[55,49,61,64,40], last:'Hoy, 8:03', hints:5 },
    { id:'a3', groupId:'1a', name:'Elena C.', mastery:[77,80,67,74,71], last:'Ayer', hints:2 },
    { id:'a4', groupId:'1a', name:'Iván M.', mastery:[62,45,56,61,43], last:'Hoy, 7:57', hints:4 },
    { id:'b1', groupId:'2a', name:'Abril G.', mastery:[74,68,78,73,56], last:'Hoy, 7:50', hints:2 },
    { id:'b2', groupId:'2a', name:'Julián V.', mastery:[52,44,51,57,41], last:'Ayer', hints:6 },
    { id:'b3', groupId:'2a', name:'Nora C.', mastery:[89,81,84,76,72], last:'Hoy, 8:21', hints:1 },
    { id:'b4', groupId:'2a', name:'Luis H.', mastery:[58,62,47,53,45], last:'Hoy, 8:00', hints:5 }
  );


  /** Dificultades observadas (texto del análisis de respuestas). */
  const observations = {
    x: ['Aplica la operación inversa solo en un lado de la igualdad (3 de 4 intentos).', 'Confunde el signo al restar términos negativos.'],
    d: ['No identifica la incógnita en problemas escritos (4 de 5).', 'Plantea bien cuando el enunciado ya viene en símbolos.']
  };

  /** Seguimiento de intervenciones: antes y después del refuerzo. */
  const interventions = {
    x: { skill: 1, before: 34, after: 61, what: 'Refuerzo guiado y retroalimentación del 9 de noviembre' },
    d: { skill: 0, before: 32, after: 45, what: 'Enunciados cortos con apoyo visual · mejora en curso' }
  };

  const alerts = [
    { id: 'a1', who: 'Ximena R.', studentId: 'x', skill: 1, scope: 'student', text: 'Errores repetidos al despejar: aplicó la operación inversa solo en un lado en 3 de 4 intentos.', suggestion: 'Reforzar operaciones inversas con 3 ejercicios guiados.' },
    { id: 'a2', who: 'Diego M.', studentId: 'd', skill: 0, scope: 'student', text: 'No identificó la incógnita en 4 de 5 problemas escritos; sí plantea bien cuando el enunciado ya viene en símbolos.', suggestion: 'Practicar lectura y planteamiento con enunciados cortos.' },
    { id: 'a3', who: 'Grupo 1.º B', studentId: null, skill: 1, scope: 'group', text: '9 de 28 estudiantes muestran errores similares con operaciones inversas.', suggestion: 'Reforzar el tema en la próxima clase (15 min) y formar un grupo de apoyo.' },
    { id: 'a4', who: 'Santiago P.', studentId: 's', skill: 2, scope: 'student', text: 'Dos sesiones sin completar y sin datos en 3 habilidades.', suggestion: 'Preguntarle si necesita apoyo o si tiene problemas de acceso a internet.' }
  ];

  const planSuggestions = [
    { id: 'ps1', title: 'Operaciones inversas', minutes: 15, detail: '9 estudiantes con errores similares. 4 ejercicios complementarios de nivel básico.' },
    { id: 'ps2', title: 'Leer y plantear enunciados', minutes: 10, detail: '6 estudiantes no identifican la incógnita. Enunciados cortos con apoyo visual.' },
    { id: 'ps3', title: 'Plantear problemas (extensión)', minutes: 10, detail: '8 estudiantes listos para problemas de dos pasos.' }
  ];

  const groupings = [
    { id: 'A', title: 'Operaciones inversas', count: 9, tone: 'brand', members: 'Ximena R., Mateo S., Emiliano C. y 6 más' },
    { id: 'B', title: 'Leer y plantear enunciados', count: 6, tone: 'rose', members: 'Diego M., Santiago P. y 4 más' },
    { id: 'C', title: 'Práctica y extensión', count: 8, tone: 'accent', members: 'Regina L., Valeria T., Camila V. y 5 más' }
  ];

  const feedbackTemplates = [
    { label: 'Reconocer su esfuerzo', text: 'Noté tu esfuerzo esta semana. Sigue así: cada intento te acerca a dominar el tema.' },
    { label: 'Sugerir reforzar', text: 'Te recomiendo practicar 3 ejercicios más de operaciones inversas. Cuéntame qué paso te costó más.' },
    { label: 'Pedir que explique', text: 'Explícame con tus palabras cómo resolviste el último ejercicio. Me ayuda a saber cómo apoyarte.' }
  ];

  /** Mensajes ya enviados por el docente (aparecen en el inicio del estudiante). */
  const teacherMessages = [
    { id: 'tm1', to: 'x', text: 'Vi que mejoraste al despejar. Practica 3 ejercicios de operaciones inversas y cuéntame qué paso te costó.', when: 'Ayer', status: 'sent', exercises: true },
    { id: 'tm2', to: 'd', text: 'Buen trabajo cuando el problema ya viene en símbolos. Esta semana practica leer problemas cortos: subraya primero lo que te preguntan.', when: 'Ayer', status: 'sent', exercises: true }
  ];

  /* ---------- Ciclo pedagógico ---------- */
  const cycle = ['Diagnosticar', 'Identificar dificultades', 'Adaptar', 'Acompañar', 'Comprobar', 'Reajustar'];

  /* ---------- Recorrido guiado de la demostración ---------- */
  const tour = [
    { title: 'Diagnóstico y ruta personalizada', detail: 'Ximena · con internet', role: 'student', student: 'x', offline: false, route: '/inicio' },
    { title: 'Otra dificultad, otra ruta', detail: 'Diego · con internet', role: 'student', student: 'd', offline: false, route: '/inicio' },
    { title: 'Evaluación diagnóstica', detail: 'Identifica conocimientos previos', role: 'student', student: 'x', offline: false, route: '/diagnostico' },
    { title: 'Tutor que guía sin dar respuestas', detail: 'Preguntas y pistas progresivas', role: 'student', student: 'x', offline: false, route: '/tutor' },
    { title: 'Sin internet: lección descargada', detail: 'Las pistas funcionan; las dudas esperan', role: 'student', student: 'x', offline: true, route: '/tutor' },
    { title: 'Comprobar lo aprendido sin ayuda', detail: 'Distingue apoyo de dominio', role: 'student', student: 'x', offline: false, route: '/comprobar' },
    { title: 'Mapa de aprendizaje del grupo', detail: 'Docente · con internet', role: 'teacher', offline: false, route: '/grupo' },
    { title: 'Alertas para revisar', detail: 'Sugerencias, no diagnósticos', role: 'teacher', offline: false, route: '/alertas' },
    { title: 'Seguimiento individual', detail: 'Antes y después de intervenir', role: 'teacher', offline: false, route: '/alumnos/x' },
    { title: 'Planear la clase', detail: 'Con base en necesidades reales', role: 'teacher', offline: false, route: '/planeacion' }
  ];

  TA.data = {
    skills, levels, levelOf, lessons, students, diagnostic, check, subjects, studyPlan, packages,
    teacher, roster, teacherGroups, groupAvg, groupStruggling, observations, interventions, alerts,
    planSuggestions, groupings, feedbackTemplates, teacherMessages, cycle, tour
  };
})(window.TA);
