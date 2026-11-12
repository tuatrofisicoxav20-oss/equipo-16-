/* =========================================================
   EstudiandoAndo · módulo del estudiante
   Pantallas: inicio, aprender, diagnóstico, tutor,
   comprobación sin ayuda, progreso y descargas.
   ========================================================= */
(function (TA) {
  'use strict';

  const { html, icon, mascot, attr, data, ui } = TA;
  const S = (TA.student = {});

  /* =========================================================
     Lógica de aprendizaje (dominio y ruta adaptativa)
     ========================================================= */
  S.profile = () => data.students[TA.state.studentId];
  S.progress = () => TA.state.progress[TA.state.studentId];

  /** Índice de la habilidad en curso: la primera sin dominar (aprendizaje por dominio). */
  S.currentSkill = (mastery = S.progress().mastery) => mastery.findIndex((v) => v == null || v < 70);

  /** Ruta personalizada a partir del dominio demostrado (TaRL + mastery learning). */
  S.route = (mastery = S.progress().mastery) => {
    const now = S.currentSkill(mastery);
    const steps = [{ title: 'Preguntas para empezar', detail: 'Terminado', status: 'done' }];
    data.skills.forEach((sk, i) => {
      if (mastery[i] != null && mastery[i] >= 70) steps.push({ title: sk.name, detail: 'Aprendido', status: 'done' });
      else if (i === now) steps.push({ title: `Reforzar: ${sk.name.toLowerCase()}`, detail: 'Estás aquí · hoy', status: 'now' });
      else steps.push({ title: sk.name, detail: 'Disponible cuando hayas practicado lo anterior', status: 'next' });
    });
    return steps;
  };

  S.overall = () => TA.util.avg(S.progress().mastery) || 0;

  /** Nivel de apoyo del tutor: disminuye cuando aumenta el dominio (andamiaje). */
  S.supportLevel = () => {
    const i = S.currentSkill();
    const v = i < 0 ? 100 : S.progress().mastery[i] || 0;
    if (v < 45) return { n: 3, label: 'Alto', text: 'Pistas detalladas, ejemplos y preguntas paso a paso.' };
    if (v < 70) return { n: 2, label: 'Medio', text: 'Preguntas guía y pistas cuando las pidas.' };
    return { n: 1, label: 'Bajo', text: 'Solo preguntas: ya resuelves con mucha autonomía.' };
  };

  /** Mensajes del docente para el estudiante actual (vínculo entre módulos). */
  S.teacherMessages = () => TA.state.teacher.outbox
    .filter((m) => m.to === TA.state.studentId && m.status === 'sent')
    .slice()
    .reverse();

  /* =========================================================
     Tutor: respuestas que orientan sin dar el resultado
     ========================================================= */
  const normalize = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  S.tutorReply = (text) => {
    const tutor = S.profile().tutor;
    const p = S.progress();
    const t = normalize(text);
    const next = () => {
      p.guideStep = Math.min(p.guideStep + 1, tutor.guide.length - 1);
      return tutor.guide[p.guideStep];
    };

    const numMatch = t.match(/x\s*=\s*(-?\d+)/) || t.match(/^\s*(-?\d+)\s*$/) || t.match(/\bes\s+(-?\d+)\b/);
    if (numMatch) {
      const n = Number(numMatch[1]);
      if (tutor.isRight(n)) {
        p.guideStep = tutor.guide.length - 1;
        return `¡Muy bien! Comprobemos: ${tutor.check(n)}. Los dos lados coinciden. Ahora explícame con tus palabras qué hiciste primero y por qué.`;
      }
      return `Revisemos juntos sin prisa: si x = ${n}, entonces ${tutor.check(n)}. ¿Da lo mismo que el otro lado de la igualdad? Revisa qué operación aplicaste en cada lado.`;
    }
    if (/(respuesta|resultado|solucion|dime|cuanto (vale|es|da)|resuelvelo|hazlo|pasame)/.test(t)) {
      return `No te daré el resultado directamente: quiero que lo descubras tú, y sé que puedes. ${tutor.guide[p.guideStep]}`;
    }
    if (/(no entiendo|no se|no le entiendo|confund|ayuda|dificil)/.test(t)) {
      return `Está bien no saberlo todavía. Te lo explico de otra forma: ${tutor.alt}`;
    }
    if (/(como se si|comprob|correct|bien hecho)/.test(t)) {
      return 'Sustituye tu valor en la ecuación original y calcula cada lado. Si los dos dan lo mismo, tu respuesta es correcta. Pruébalo y cuéntame qué obtuviste.';
    }
    return `Buen razonamiento. Sigamos: ${next()}`;
  };

  /** Agrega un mensaje al chat del estudiante actual. */
  S.pushMessage = (from, text, extra = {}) => {
    S.progress().chat.push({ id: TA.util.uid(), from, text, status: 'sent', ...extra });
  };

  /* =========================================================
     Vistas
     ========================================================= */

  /* ---------- Inicio ---------- */
  S.views = {};

  S.views.home = () => {
    const st = S.profile();
    const p = S.progress();
    const online = TA.net.isOnline();
    const cur = S.currentSkill();
    const skillName = cur >= 0 ? data.skills[cur].name.toLowerCase() : null;
    const say = !online
      ? 'Estoy contigo aunque no haya internet. Tu lección descargada, con pistas y ejercicios, funciona sin gastar datos.'
      : skillName
        ? `Según tus respuestas, hoy puedes practicar ${skillName}. Lo haremos con preguntas y pistas.`
        : '¡Dominaste las cinco habilidades del tema! Ya puedes pasar a problemas más retadores.';
    const msgs = S.teacherMessages();
    const checkDone = p.check && p.check.passed;

    return html`
      <section class="hero" aria-labelledby="page-title">
        <div class="hero__mascot">${mascot({ size: 104, local: !online, float: true })}</div>
        <div class="hero__body">
          <p class="eyebrow eyebrow--inverse">${st.grade} · Matemáticas</p>
          <h1 id="page-title" tabindex="-1">Hola, ${st.name}</h1>
          <p class="hero__say" id="tutor-say">${say}</p>
          <div class="hero__actions">
            <a class="btn btn--inverse" href="#/aprender">${icon('play', 18)}Continuar lección</a>
            <a class="btn btn--ghost-inverse" href="#/tutor">${icon('chat', 18)}Preguntarle a EstudiandoAndo</a>
            ${ui.speakButton('tutor-say', 'Escuchar a EstudiandoAndo')}
          </div>
        </div>
      </section>

      ${online ? '' : ui.netBanner('student')}

      <div class="grid grid--2 story-grid">
        ${ui.card({ id:'home-evolution', title:'Así va mi aprendizaje', titleIcon:'chart',
          aside: html`<a href="#/progreso" class="link">Ver todos mis avances</a>`,
          body: TA.charts.line({ title:'Evolución de mi comprensión',points:TA.charts.studentHistory(TA.state.studentId),help:'Los datos anteriores son ilustrativos; las actividades de esta sesión cambian el dominio actual.' })
        })}
        ${ui.card({ id:'home-ai', title:'¿Qué puedo practicar ahora?',titleIcon:'spark',tone:'accent',
          body: html`<p>Esta semana, ${S.profile().name}, puedes practicar <strong>${skillName||'problemas nuevos'}</strong>. Vamos a comenzar con un dibujo, después resolveremos una pregunta juntos y al final lo intentarás sin ayuda.</p>
          <div class="stack"><a class="btn btn--primary btn--block" href="#/visual">${icon('eye',18)}Aprender con diagramas</a>
          <a class="btn btn--secondary btn--block" href="#/tutor">${icon('chat',18)}Recibir pistas del tutor</a></div>
          <p class="small muted">La IA orienta, pero no sustituye tus decisiones ni a tu profesora.</p>`})}
      </div>

      <div class="grid grid--2">
        ${ui.card({
          id: 'c-route', title: 'Tu camino para aprender', titleIcon: 'route',
          aside: ui.badge('Hecha para ti', 'accent', 'target'),
          body: html`<p class="muted">Ecuaciones lineales. Sigue a tu ritmo. Practica lo que necesites antes de continuar.</p>
            ${ui.routeList(S.route())}
            <a class="btn btn--primary btn--block" href="#/aprender">${icon('play', 18)}Ir a la lección de hoy</a>`
        })}

        <div class="stack">
          ${ui.card({
            id: 'c-check', title: 'Comprueba lo aprendido', titleIcon: 'target', tone: 'accent',
            aside: checkDone ? ui.badge('Superada', 'ok', 'check') : '',
            body: html`<p>Resuelve 3 ejercicios nuevos <strong>sin pistas</strong> y explica tu procedimiento. Así sabrás qué aprendiste.</p>
              <a class="btn btn--secondary" href="#/comprobar">${icon('pen', 18)}${checkDone ? 'Hacer otra comprobación' : 'Empezar comprobación'}</a>`
          })}

          ${ui.card({
            id: 'c-msg', title: 'Mensaje de tu maestra', titleIcon: 'chat',
            body: msgs.length
              ? html`<blockquote class="quote"><p>${msgs[0].text}</p><footer>${data.teacher.name} · ${msgs[0].when}${msgs[0].exercises ? ' · incluye ejercicios de refuerzo' : ''}</footer></blockquote>
                ${msgs.length > 1 ? html`<a class="link" href="#/progreso#mensajes">Ver los ${msgs.length} mensajes</a>` : ''}`
              : html`<p class="muted">Aún no tienes mensajes. Cuando tu maestra te escriba, lo verás aquí.</p>`
          })}
        </div>
      </div>

      <div class="grid grid--2 is-secondary">
        ${ui.card({
          id: 'c-week', title: 'Esta semana', titleIcon: 'chart',
          aside: ui.badge('Racha de 5 días', 'warn', 'flame'),
          body: ui.weekChart(st.minutes)
        })}
        ${ui.card({
          id: 'c-review', title: 'Para repasar', titleIcon: 'clock',
          body: html`<ul class="list-icons">
            <li>${icon('sync', 18)}<span>Repasa <strong>interpretar el enunciado</strong>: lo dominaste hace 6 días y un repaso breve ayuda a no olvidarlo.</span></li>
            <li>${icon('pen', 18)}<span>Explica con tus palabras cómo comprobaste tu último ejercicio.</span></li>
          </ul>`
        })}
      </div>`;
  };

  /* ---------- Aprender: plan de estudios, lección y ruta ---------- */
  const FORMATS = [
    { value: 'steps', label: 'Paso a paso', icon: 'route' },
    { value: 'visual', label: 'Visual', icon: 'eye' },
    { value: 'everyday', label: 'Ejemplo cotidiano', icon: 'spark' },
    { value: 'audio', label: 'Escuchar', icon: 'volume' }
  ];

  function lessonContent(lesson, format) {
    if (format === 'visual') {
      return html`<figure class="balance">
        <svg viewBox="0 0 320 150" role="img" aria-label="Balanza en equilibrio. Platillo izquierdo: ${lesson.visual.left}. Platillo derecho: ${lesson.visual.right}.">
          <path class="balance__stand" d="M160 40v88M120 132h80"/>
          <path class="balance__beam" d="M40 40h240"/>
          <path class="balance__rope" d="M60 40v34M260 40v34"/>
          <rect class="balance__pan" x="10" y="74" width="100" height="40" rx="10"/>
          <rect class="balance__pan" x="210" y="74" width="100" height="40" rx="10"/>
          <text class="balance__txt" x="60" y="100" text-anchor="middle">${lesson.visual.left}</text>
          <text class="balance__txt" x="260" y="100" text-anchor="middle">${lesson.visual.right}</text>
          <circle class="balance__pivot" cx="160" cy="40" r="7"/>
        </svg>
        <figcaption id="lesson-text">${lesson.visual.caption}</figcaption>
      </figure>`;
    }
    if (format === 'everyday') {
      return html`<div class="note note--accent">${icon('spark', 22)}<p id="lesson-text">${lesson.everyday}</p></div>`;
    }
    if (format === 'audio') {
      return html`<div class="stack">
        <p id="lesson-text">${lesson.title}. ${lesson.steps.join(' ')}</p>
        <div class="cluster">
          <button type="button" class="btn btn--primary" data-action="speak" data-id="lesson-text">${icon('volume', 18)}Reproducir explicación</button>
          <button type="button" class="btn btn--secondary" data-action="speak-stop">${icon('stop', 18)}Detener</button>
        </div>
        ${TA.speech.supported ? '' : html`<p class="field__error">${icon('alert', 16)}<span>Tu navegador no permite la lectura en voz alta. Prueba con otro navegador o usa «Paso a paso».</span></p>`}
      </div>`;
    }
    return html`<ol class="steps" id="lesson-text">${lesson.steps.map((s) => html`<li>${s}</li>`)}</ol>`;
  }

  S.views.learn = () => {
    const p = S.progress();
    const cur = S.currentSkill();
    const lesson = data.lessons[cur < 0 ? 4 : cur];
    const plan = p.plan;
    const available = plan.level === data.studyPlan.available.level && plan.grade === data.studyPlan.available.grade;

    return html`
      ${ui.pageHeader({ title: 'Aprender', lead: 'Matemáticas · Ecuaciones lineales con una incógnita', eyebrow: `${plan.grade} de ${plan.level.toLowerCase()}` })}

      ${ui.card({
        id: 'c-lesson', title: `Lección de hoy: ${lesson.title}`, titleIcon: 'book', tone: 'brand',
        body: html`
          ${ui.segmented({ name: 'format', legend: '¿Cómo quieres estudiarlo?', options: FORMATS, value: p.format, action: 'lesson-format' })}
          <div class="lesson" aria-live="polite">${lessonContent(lesson, p.format)}</div>
          <p class="muted small">No hay una sola forma correcta de aprender: prueba varias y quédate con la que te ayude a entender.</p>
          <div class="cluster">
            <a class="btn btn--primary" href="#/tutor">${icon('chat', 18)}Practicar con EstudiandoAndo</a>
            <a class="btn btn--secondary" href="#/visual">${icon('eye', 18)}Ver dibujos paso a paso</a>
            <a class="btn btn--secondary" href="#/comprobar">${icon('target', 18)}Intentar sin pistas</a>
          </div>`
      })}

      <div class="grid grid--2">
        ${ui.card({ id: 'c-route2', title: 'Tu camino', titleIcon: 'route', body: ui.routeList(S.route()) })}
        <div class="stack">
          ${ui.card({
            id: 'c-plan', title: 'Tu plan de estudios', titleIcon: 'landmark',
            aside: html`<button type="button" class="btn btn--ghost btn--sm" data-action="edit-plan">${icon('pen', 16)}Cambiar</button>`,
            body: html`<dl class="dl">
              <div><dt>Nivel</dt><dd>${plan.level}</dd></div>
              <div><dt>Grado</dt><dd>${plan.grade}</dd></div>
              <div><dt>Escuela</dt><dd>${plan.school || 'Sin indicar'}</dd></div>
              <div><dt>Programa</dt><dd>Plan de estudios oficial de la SEP</dd></div>
            </dl>
            ${available ? '' : html`<div class="note note--warn">${icon('info', 20)}<p>Por ahora el contenido está disponible para 1.º de secundaria. Guardamos tu elección y te avisaremos cuando haya lecciones para ${plan.grade} de ${plan.level.toLowerCase()}.</p></div>`}`
          })}
          ${ui.card({
            id: 'c-subj', title: 'Materias', titleIcon: 'book',
            body: html`<ul class="list-rows">
              ${data.subjects.map((s) => html`<li class="row tone-${s.tone}">
                <span class="tile-icon">${icon(s.icon, 22)}</span>
                <div class="row__main"><p class="row__title">${s.name}</p><p class="row__sub">${s.active ? s.topic : 'Próximamente'}</p>
                  ${s.active ? ui.progress(S.overall(), 'Avance del tema') : ''}</div>
                ${s.active ? ui.badge('En tu dispositivo', 'ok', 'check') : ui.badge('Próximamente', 'neutral')}
              </li>`)}
            </ul>`
          })}
        </div>
      </div>`;
  };

  /** Formulario de plan de estudios (diálogo). */
  S.planForm = () => {
    const plan = S.progress().plan;
    const grades = data.studyPlan.grades[plan.level] || [];
    return html`<form class="form" data-submit="plan" novalidate>
      <p class="muted">Relacionamos tus datos con los planes y programas de estudio oficiales para mostrarte los temas que te corresponden.</p>
      <div class="field">
        <label for="plan-level">Nivel educativo</label>
        <select id="plan-level" name="level" data-change="plan-level">
          ${data.studyPlan.levels.map((l) => html`<option${attr(l === plan.level, 'selected')}>${l}</option>`)}
        </select>
      </div>
      <div class="field">
        <label for="plan-grade">Grado o periodo</label>
        <select id="plan-grade" name="grade">
          ${grades.map((g) => html`<option${attr(g === plan.grade, 'selected')}>${g}</option>`)}
        </select>
      </div>
      <div class="field">
        <label for="plan-school">Escuela <span class="optional">(opcional)</span></label>
        <input id="plan-school" name="school" type="text" autocomplete="organization" maxlength="80" value="${plan.school}" aria-describedby="plan-school-h">
        <p class="field__hint" id="plan-school-h">Si tu escuela comparte su programa, lo usaremos para ordenar los temas.</p>
      </div>
      <div class="dialog__actions">
        <button type="button" class="btn btn--secondary" data-dialog-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Guardar</button>
      </div>
    </form>`;
  };

  /* ---------- Preguntas para empezar ---------- */
  S.views.diagnostic = () => {
    const p = S.progress();
    const draft = TA.state.drafts.diagnostic;
    const showResults = p.diagnostic && p.diagnostic.answers && !draft.retake;

    const header = ui.pageHeader({
      title: 'Preguntas para empezar',
      lead: '5 preguntas, unos 5 minutos. No es un examen. Tus respuestas nos ayudan a saber qué practicar.',
      back: { href: '#/inicio', label: 'Volver al inicio' }
    });

    if (showResults) {
      const answers = p.diagnostic.answers;
      const score = data.diagnostic.filter((q, i) => answers[i] === q.correct).length;
      const cur = S.currentSkill();
      return html`${header}
        <section class="card card--accent" aria-labelledby="diag-res">
          <div class="card__head"><h2 class="card__title" id="diag-res" tabindex="-1">${icon('check', 20)}<span>Respondiste bien ${score} de ${data.diagnostic.length}</span></h2></div>
          <p>${cur >= 0 ? html`Te recomendamos practicar primero <strong>${data.skills[cur].name.toLowerCase()}</strong>.` : '¡Dominas las bases! Tu camino te lleva a problemas más retadores.'}</p>
          <div class="cluster"><a class="btn btn--primary" href="#/aprender">${icon('play', 18)}Ir a mi lección</a><button type="button" class="btn btn--secondary" data-action="diag-retake">${icon('reset', 18)}Volver a responder</button></div>
        </section>
        <section class="card" aria-labelledby="diag-rev">
          <div class="card__head"><h2 class="card__title" id="diag-rev">Revisa tus respuestas</h2></div>
          <ol class="review">
            ${data.diagnostic.map((q, i) => {
              const ok = answers[i] === q.correct;
              return html`<li class="review__item">
                <p class="review__q"><strong>${data.skills[q.skill].name}.</strong> ${q.q}</p>
                <p>${ok ? ui.badge('Correcta', 'ok', 'check') : ui.badge('Por reforzar', 'warn', 'alert')} Tu respuesta: ${q.options[answers[i]]}</p>
                ${ok ? '' : html`<p class="muted">${q.why}</p>`}
              </li>`;
            })}
          </ol>
        </section>`;
    }

    const errors = draft.errors || [];
    return html`${header}
      ${p.diagnostic && !p.diagnostic.answers && !draft.retake ? html`<div class="note">${icon('info', 20)}<p>Ya hiciste un diagnóstico el 3 de noviembre y con él se armó tu ruta. Puedes repetirlo para actualizarla.</p></div>` : ''}
      <form class="form card" data-submit="diagnostic" novalidate aria-labelledby="page-title">
        ${errors.length ? html`<div class="error-summary" role="alert" tabindex="-1" id="diag-errors">
          <h2>${icon('alert', 20)}Falta responder ${TA.util.plural(errors.length, 'pregunta', 'preguntas')}</h2>
          <ul>${errors.map((i) => html`<li><a href="#q${i}-0" data-action="focus-field" data-id="q${i}-0">Pregunta ${i + 1}</a></li>`)}</ul>
        </div>` : ''}
        ${data.diagnostic.map((q, i) => {
          const invalid = errors.includes(i);
          return html`<fieldset class="question${invalid ? ' is-invalid' : ''}"${attr(invalid, `aria-describedby="q${i}-err"`)}>
            <legend><span class="question__n">Pregunta ${i + 1} de ${data.diagnostic.length}</span>${q.q}</legend>
            ${invalid ? ui.fieldError(`q${i}-err`, 'Elige una respuesta.') : ''}
            <div class="options">
              ${q.options.map((o, j) => html`<label class="option"><input type="radio" name="q${i}" id="q${i}-${j}" value="${j}"${attr(draft.answers && draft.answers[i] === j, 'checked')}><span>${o}</span></label>`)}
            </div>
          </fieldset>`;
        })}
        <div class="field">
          <label for="diag-explain">¿Cómo resolviste la pregunta 3? <span class="optional">(opcional)</span></label>
          <textarea id="diag-explain" name="explain" rows="3" maxlength="400" aria-describedby="diag-explain-h">${draft.explain || ''}</textarea>
          <p class="field__hint" id="diag-explain-h">Explicar tu procedimiento nos ayuda a encontrar en qué paso está la dificultad.</p>
        </div>
        <div class="cluster"><button type="submit" class="btn btn--primary">${icon('check', 18)}Ver mis resultados</button></div>
      </form>`;
  };

  /* ---------- Tutor ---------- */
  function chatLog() {
    const p = S.progress();
    return html`<div class="chat" id="chat-log" role="log" aria-live="polite" aria-label="Conversación con EstudiandoAndo" tabindex="0">
      ${p.chat.map((m) => (m.from === 'me'
        ? html`<div class="msg msg--me"><p class="msg__bubble"><span class="sr-only">Tú: </span>${m.text}</p>${m.status === 'queued' ? html`<p class="msg__status">${icon('clock', 14)}En espera: se enviará cuando haya internet</p>` : ''}</div>`
        : html`<div class="msg msg--tutor">${mascot({ size: 36, face: true, mood: m.kind === 'hint' ? 'think' : 'happy' })}<div class="msg__body"><p class="msg__bubble" id="m-${m.id}"><span class="sr-only">EstudiandoAndo: </span>${m.text}</p>${TA.state.prefs.voice ? html`<button type="button" class="btn btn--ghost btn--xs" data-action="speak" data-id="m-${m.id}">${icon('volume', 14)}Escuchar</button>` : ''}</div></div>`))}
      ${TA.state.ui.typing ? html`<div class="msg msg--tutor">${mascot({ size: 36, face: true, mood: 'think' })}<p class="msg__bubble msg__bubble--typing">EstudiandoAndo está pensando…</p></div>` : ''}
    </div>`;
  }

  function hintLadder() {
    const tutor = S.profile().tutor;
    const p = S.progress();
    return html`<ol class="ladder">
      ${tutor.hints.map((h, i) => {
        if (i < p.hints) return html`<li class="ladder__step is-open"><span class="ladder__n">${i + 1}</span><p>${h}</p></li>`;
        if (i === p.hints) return html`<li class="ladder__step"><button type="button" class="btn btn--secondary btn--block" data-action="hint">${icon('bulb', 18)}Pedir la pista ${i + 1}</button></li>`;
        return html`<li class="ladder__step is-locked"><span class="ladder__n">${icon('lock', 13)}</span><p>Pista ${i + 1} · se abre después de la anterior</p></li>`;
      })}
    </ol>
    ${p.hints >= tutor.hints.length
      ? (p.solutionShown
        ? html`<div class="solution" id="solution" tabindex="-1"><h3>Solución paso a paso</h3><ol class="steps">${tutor.solution.map((s) => html`<li>${s}</li>`)}</ol>
            <p class="muted small">Ahora intenta un ejercicio parecido sin ayuda para comprobar que lo entendiste.</p><a class="btn btn--secondary btn--sm" href="#/comprobar">Intentar sin pistas</a></div>`
        : html`<button type="button" class="btn btn--ghost" data-action="show-solution">${icon('eye', 18)}Ver la solución paso a paso</button>
            <p class="muted small">Úsala solo si ya lo intentaste: ver la solución no es lo mismo que entenderla.</p>`)
      : ''}`;
  }

  S.views.tutor = () => {
    const tutor = S.profile().tutor;
    const online = TA.net.isOnline();
    const support = S.supportLevel();
    return html`
      ${ui.pageHeader({ title: 'Tu tutor', lead: online ? 'Te guía con preguntas y pistas; no hace la tarea por ti.' : 'Sin internet: usa las pistas y ejercicios guardados. Tus preguntas se envían después.' })}
      ${online ? '' : ui.netBanner('student')}
      <div class="grid grid--tutor">
        <section class="card chat-card" aria-labelledby="chat-t">
          <div class="card__head"><h2 class="card__title" id="chat-t">${icon('calc', 20)}<span>Problema: ${tutor.problem}</span></h2></div>
          ${chatLog()}
          <div class="quick" role="group" aria-label="Respuestas rápidas">
            <button type="button" class="chip" data-action="tutor-quick" data-value="hint">${icon('bulb', 16)}Dame una pista</button>
            <button type="button" class="chip" data-action="tutor-quick" data-value="alt">${icon('sync', 16)}Explícalo de otra forma</button>
            <button type="button" class="chip" data-action="tutor-quick" data-value="everyday">${icon('spark', 16)}Un ejemplo cotidiano</button>
            <button type="button" class="chip" data-action="tutor-quick" data-value="explain">${icon('pen', 16)}Te explico cómo lo hice</button>
          </div>
          <form class="composer" data-submit="chat" novalidate>
            <label class="composer__label" for="chat-input">${online ? 'Escribe tu duda o tu respuesta' : 'Escribe tu duda (se enviará cuando haya internet)'}</label>
            <div class="composer__row">
              <input id="chat-input" name="message" type="text" autocomplete="off" maxlength="300" aria-describedby="chat-help${TA.state.drafts.chatError ? ' chat-err' : ''}"${attr(TA.state.drafts.chatError, 'aria-invalid="true"')}>
              <button type="submit" class="btn btn--primary">${icon(online ? 'send' : 'clock', 18)}${online ? 'Enviar' : 'Guardar'}</button>
            </div>
            ${ui.fieldError('chat-err', TA.state.drafts.chatError)}
            <p class="field__hint" id="chat-help">Ejemplos: «x = 5», «no entiendo», «¿cómo sé si está bien?».</p>
          </form>
        </section>

        <div class="stack">
          ${ui.card({ id: 'c-hints', title: 'Pistas progresivas', titleIcon: 'bulb', aside: ui.badge(`${S.progress().hints} de ${tutor.hints.length}`, 'neutral'), body: html`<p class="muted small">Funcionan sin internet. Pide una solo cuando la necesites.</p>${hintLadder()}` })}
          ${ui.card({
            id: 'c-support', title: 'Nivel de ayuda', titleIcon: 'trend',
            body: html`<p><strong>${support.label}.</strong> ${support.text}</p>
              <div class="meter-steps" aria-hidden="true">${[3, 2, 1].map((n) => html`<span class="${n >= support.n ? 'is-on' : ''}"></span>`)}</div>
              <p class="muted small">EstudiandoAndo reduce su ayuda conforme demuestras más autonomía.</p>`
          })}
          ${ui.card({
            id: 'c-rules', title: 'Cómo usar bien a EstudiandoAndo', titleIcon: 'shield', className: 'is-secondary',
            body: html`<ul class="list-icons">
              <li>${icon('bulb', 18)}<span>Primero preguntas y pistas; la solución, solo si la pides.</span></li>
              <li>${icon('shield', 18)}<span>EstudiandoAndo puede equivocarse: compara con tu libro o pregunta a tu maestra o maestro.</span></li>
              <li>${icon('target', 18)}<span>Para avanzar demuestras que entendiste, sin ayuda.</span></li>
            </ul>`
          })}
        </div>
      </div>`;
  };

  /* ---------- Comprobación sin ayuda ---------- */
  S.views.check = () => {
    const p = S.progress();
    const draft = TA.state.drafts.check;
    const cur = S.currentSkill();
    const skill = cur >= 0 ? data.skills[cur].name.toLowerCase() : 'ecuaciones lineales';
    const result = p.check && !draft.retake ? p.check : null;
    const header = ui.pageHeader({
      title: 'Comprueba lo aprendido',
      lead: `3 ejercicios nuevos, sin pistas ni ayuda de EstudiandoAndo. Así sabremos si ya dominas ${result ? result.skillName : skill}.`,
      back: { href: '#/inicio', label: 'Volver al inicio' }
    });

    if (result) {
      return html`${header}
        <section class="card ${result.passed ? 'card--accent' : 'card--warn'}" aria-labelledby="chk-res">
          <div class="card__head"><h2 class="card__title" id="chk-res" tabindex="-1">${icon(result.passed ? 'star' : 'trend', 20)}<span>${result.passed ? '¡Dominio demostrado!' : `Resolviste ${result.score} de 3 sin ayuda`}</span></h2></div>
          <p>${result.passed
            ? html`Resolviste los 3 ejercicios por tu cuenta. Registramos tu dominio de <strong>${result.skillName}</strong> y se abrió la siguiente etapa de tu ruta.`
            : 'Vas por buen camino. Tu camino se ajustó: practica un poco más con EstudiandoAndo y vuelve a intentarlo cuando te sientas listo o lista.'}</p>
          <ul class="review">
            ${data.check.map((c, i) => {
              const ok = result.results[i];
              return html`<li class="review__item"><p><strong>Ejercicio ${i + 1}:</strong> ${c.eq} · tu respuesta: x = ${result.answers[i]}</p>
                <p>${ok ? ui.badge('Correcta', 'ok', 'check') : ui.badge('Revisa', 'warn', 'alert')} ${ok ? '' : c.review}</p></li>`;
            })}
          </ul>
          <div class="cluster">
            ${result.passed ? html`<a class="btn btn--primary" href="#/aprender">${icon('play', 18)}Siguiente etapa</a>` : html`<a class="btn btn--primary" href="#/tutor">${icon('chat', 18)}Practicar con EstudiandoAndo</a>`}
            <button type="button" class="btn btn--secondary" data-action="check-retake">${icon('reset', 18)}Intentar con otros ejercicios</button>
          </div>
          ${TA.net.isOnline() ? '' : html`<p class="muted small">${icon('clock', 14)} Resultado guardado en tu equipo; tu maestra lo verá al sincronizar.</p>`}
        </section>`;
    }

    const errors = draft.errors || {};
    const errorKeys = Object.keys(errors);
    return html`${header}
      <div class="note note--warn">${icon('lock', 20)}<p><strong>Durante la comprobación no hay pistas.</strong> Puedes usar lápiz y papel. Funciona sin internet.</p></div>
      <form class="form card" data-submit="check" novalidate aria-labelledby="page-title">
        ${errorKeys.length ? html`<div class="error-summary" role="alert" tabindex="-1" id="chk-errors">
          <h2>${icon('alert', 20)}Revisa ${TA.util.plural(errorKeys.length, 'campo', 'campos')}</h2>
          <ul>${errorKeys.map((k) => html`<li><a href="#${k}" data-action="focus-field" data-id="${k}">${errors[k]}</a></li>`)}</ul>
        </div>` : ''}
        ${data.check.map((c, i) => {
          const id = `chk-${c.id}`;
          const err = errors[id];
          return html`<div class="field${err ? ' is-invalid' : ''}">
            <label for="${id}">Ejercicio ${i + 1}: resuelve <span class="math">${c.eq}</span></label>
            <div class="input-prefix"><span aria-hidden="true">x =</span><input id="${id}" name="${c.id}" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="8" value="${(draft.values && draft.values[c.id]) || ''}" aria-describedby="${id}-h${err ? ` ${id}-e` : ''}"${attr(err, 'aria-invalid="true"')}></div>
            <p class="field__hint" id="${id}-h">Escribe solo el número. Puede ser negativo, por ejemplo −3.</p>
            ${err ? ui.fieldError(`${id}-e`, err) : ''}
          </div>`;
        })}
        <div class="field${errors['chk-explain'] ? ' is-invalid' : ''}">
          <label for="chk-explain">Explica con tus palabras qué hiciste primero en el ejercicio 1</label>
          <textarea id="chk-explain" name="explain" rows="3" maxlength="400" aria-describedby="chk-explain-h${errors['chk-explain'] ? ' chk-explain-e' : ''}"${attr(errors['chk-explain'], 'aria-invalid="true"')}>${(draft.values && draft.values.explain) || ''}</textarea>
          <p class="field__hint" id="chk-explain-h">Al menos una oración. Explicar tu procedimiento ayuda a afianzar lo aprendido.</p>
          ${errors['chk-explain'] ? ui.fieldError('chk-explain-e', errors['chk-explain']) : ''}
        </div>
        <div class="cluster"><button type="submit" class="btn btn--primary">${icon('check', 18)}Revisar mis respuestas</button></div>
      </form>`;
  };

  /* ---------- Progreso ---------- */
  S.views.progress = () => {
    const st = S.profile();
    const p = S.progress();
    const cur = S.currentSkill();
    const mastered = p.mastery.filter((v) => v != null && v >= 70).length;
    const msgs = S.teacherMessages();
    const achievements = [
      { label: 'Primera actividad de inicio', done: true, icon: 'compass' },
      { label: 'Racha de 5 días', done: true, icon: 'flame' },
      { label: 'Explicaste tu procedimiento', done: Boolean(p.check || (p.diagnostic && p.diagnostic.explain)), icon: 'pen' },
      { label: 'Dominio sin ayuda', done: Boolean(p.check && p.check.passed), icon: 'star' }
    ];
    return html`
      ${ui.pageHeader({
        title: 'Mi avance',
        lead: 'Mira qué aprendiste, qué te falta y cómo seguir.',
        actions: TA.net.isOnline() ? ui.badge('Sincronizado', 'ok', 'check') : ui.badge('Por sincronizar', 'warn', 'clock')
      })}
      <ul class="kpis" role="list">
        <li class="kpi tone-accent"><span class="tile-icon">${icon('target', 22)}</span><div><p class="kpi__value">${S.overall()} %</p><p class="kpi__label">avance en este tema</p></div></li>
        <li class="kpi tone-brand"><span class="tile-icon">${icon('check', 22)}</span><div><p class="kpi__value">${mastered} de 5</p><p class="kpi__label">temas que ya aprendí</p></div></li>
        <li class="kpi tone-warn"><span class="tile-icon">${icon('flame', 22)}</span><div><p class="kpi__value">5 días</p><p class="kpi__label">de racha</p></div></li>
        <li class="kpi tone-rose"><span class="tile-icon">${icon('bulb', 22)}</span><div><p class="kpi__value">${p.hints}</p><p class="kpi__label">pistas usadas hoy</p></div></li>
      </ul>
      ${ui.card({id:'progress-graph',title:'Mi avance a lo largo del tiempo',titleIcon:'chart',
        body: TA.charts.line({title:'Mi avance individual',points:TA.charts.studentHistory(TA.state.studentId),help:'Las semanas anteriores corresponden a datos ficticios de la demostración. El valor actual refleja tus ejercicios y evaluaciones.'})})}
      <div class="grid grid--2">
        ${ui.card({ id: 'c-skills', title: 'Así voy en cada tema', titleIcon: 'chart', body: ui.masteryBars(p.mastery, { note: (i) => (i === cur ? ui.badge('Hoy: reforzar', 'brand', 'target') : '') }) })}
        <div class="stack">
          ${ui.card({
            id: 'c-recs', title: 'Qué puedo hacer después', titleIcon: 'spark',
            body: html`<ul class="list-icons">
              ${cur >= 0 ? html`<li>${icon('target', 18)}<span>Practica <strong>${data.skills[cur].name.toLowerCase()}</strong> con EstudiandoAndo y luego haz la comprobación sin ayuda.</span></li>` : ''}
              <li>${icon('sync', 18)}<span>Repasa lo que ya dominas cada semana: recordar activamente ayuda a no olvidar.</span></li>
              <li>${icon('pen', 18)}<span>Cuando te equivoques, escribe en qué paso fue. Así encuentras tu propio error.</span></li>
            </ul>`
          })}
          ${ui.card({
            id: 'c-ach', title: 'Logros', titleIcon: 'star',
            body: html`<ul class="achievements" role="list">${achievements.map((a) => html`<li class="${a.done ? 'is-done' : ''}"><span class="achievements__icon">${icon(a.done ? a.icon : 'lock', 22)}</span><span>${a.label}</span><span class="sr-only">${a.done ? ': conseguido' : ': pendiente'}</span></li>`)}</ul>`
          })}
        </div>
      </div>
      <div class="grid grid--2">
        <section class="card" id="mensajes" aria-labelledby="msgs-t">
          <div class="card__head"><h2 class="card__title" id="msgs-t">${icon('chat', 20)}<span>Mensajes de tu maestra</span></h2></div>
          ${msgs.length ? html`<ul class="messages">${msgs.map((m) => html`<li><blockquote class="quote"><p>${m.text}</p><footer>${data.teacher.name} · ${m.when}</footer></blockquote></li>`)}</ul>` : html`<p class="muted">Sin mensajes por ahora.</p>`}
        </section>
        ${ui.card({ id: 'c-min', title: 'Minutos por día', titleIcon: 'clock', className: 'is-secondary', body: ui.weekChart(st.minutes) })}
      </div>`;
  };

  /* ---------- Descargas y sincronización ---------- */
  function packageAction(pkg, status) {
    if (status === 'ready') return html`<div class="row__actions">${ui.badge('Disponible sin Wi-Fi', 'ok', 'check')}
      <button type="button" class="btn btn--ghost btn--sm" data-action="pkg-remove" data-id="${pkg.id}">${icon('trash',16)}Desactivar<span class="sr-only"> ${pkg.name}</span></button></div>`;
    return html`<button type="button" class="btn btn--secondary btn--sm" data-action="pkg-download" data-id="${pkg.id}">
      ${icon('download',16)}Preparar material<span class="sr-only">: ${pkg.name}</span></button>`;
  }

  S.views.downloads = () => {
    const p = S.progress();
    const online = TA.net.isOnline();
    const pending = TA.sync.pendingItems();
    const used = data.packages.filter((k) => p.packages[k.id] === 'ready').reduce((a, k) => a + k.mb, 0);
    const prefs = TA.state.prefs;
    return html`
      ${ui.pageHeader({ title: 'Estudiar sin internet', lead: 'Una lección, diagramas y ejercicios funcionan aquí mismo sin red. Guarda tus avances en este navegador y visualiza lo pendiente de sincronizar.' })}
      ${ui.netBanner('student')}
      <section class="offline-guide" aria-label="Ruta para estudiar sin Wi-Fi">
        <div class="offline-guide__top">
          <span class="offline-guide__icon">${icon('wifi-off',24)}</span>
          <div><h2>Tu aula también funciona sin internet</h2><p>Conserva lo que haces en este navegador. El tutor generativo real no está disponible sin conexión.</p></div>
        </div>
        <ol class="offline-steps">
          <li><strong>1. Elige un material</strong><span>Las lecciones de ejemplo ya están incluidas en este HTML.</span></li>
          <li><strong>2. Aprende y practica</strong><span>Usa los diagramas, responde y revisa tu progreso.</span></li>
          <li><strong>3. Revisa lo pendiente</strong><span>Los resultados quedan aquí. Cuando vuelvas a tener internet podrás revisar lo pendiente. Esta demostración no envía datos a ninguna escuela.</span></li>
        </ol>
        <div class="offline-guide__actions">
          <a class="btn btn--primary" href="#/visual">${icon('eye',18)}Ver dibujos sin Wi-Fi</a>
          <a class="btn btn--secondary" href="#/comprobar">${icon('pen',18)}Resolver práctica</a>
        </div>
      </section>
      <div class="grid grid--2">
        ${ui.card({
          id: 'c-pkgs', title: 'Materiales para practicar', titleIcon: 'download',
          body: html`<ul class="list-rows">${data.packages.map((k) => html`<li class="row tone-${k.tone}">
            <span class="tile-icon">${icon(k.icon, 22)}</span>
            <div class="row__main"><p class="row__title">${k.name}</p><p class="row__sub">${k.detail} · contenido de demostración</p></div>
            ${packageAction(k, p.packages[k.id])}
          </li>`)}</ul>
          <p class="muted small">Los materiales educativos están integrados en este prototipo: «Preparar» activa su disponibilidad en la demostración. No se descargan archivos de varios MB. La IA generativa real y la sincronización con un servidor requerirán una conexión y servicios futuros.</p>`
        })}
        <div class="stack">
          ${ui.card({
            id: 'c-store', title: 'Espacio en tu equipo', titleIcon: 'phone',
            body: html`<p class="big tabnum">${data.packages.filter((k) => p.packages[k.id] === 'ready').length} <span class="muted">materiales disponibles</span></p>
              <div class="bar bar--brand" aria-hidden="true"><span style="--w:${Math.round((used / 52) * 100)}%"></span></div>
              <p class="muted small">No se consulta ni se calcula el espacio real del dispositivo. Este contador solo muestra los materiales activados para la demostración.</p>`
          })}
          ${ui.card({
            id: 'c-sync', title: 'Guardado para después', titleIcon: 'sync',
            aside: pending.length ? ui.badge(`${pending.length} pendientes`, 'warn', 'clock') : ui.badge('Al día', 'ok', 'check'),
            body: html`${pending.length
              ? html`<ul class="list-icons">${pending.map((it) => html`<li>${icon(it.icon, 18)}<span>${it.label}</span></li>`)}</ul>`
              : html`<p class="muted">No hay envíos pendientes en este navegador. El docente del prototipo puede revisar los datos ilustrativos.</p>`}
              <button type="button" class="btn btn--secondary" data-action="sync-now"${attr(!online || !pending.length, 'disabled')} aria-describedby="sync-help">${icon('sync', 18)}Actualizar pendientes</button>
              <p class="field__hint" id="sync-help">${online ? (pending.length ? 'Al recuperar conexión, el prototipo simula la sincronización local; no envía resultados a un servidor.' : 'No hay nada pendiente.') : 'Queda guardado en este navegador para una futura sincronización; la simulación no utiliza un servidor.'}</p>`
          })}
          ${ui.card({
            id: 'c-data', title: 'Ahorro de datos', titleIcon: 'shield',
            body: html`${ui.switchField({ id: 'sw-saver', label: 'Modo ahorro', hint: 'Sin videos e imágenes más ligeras.', checked: prefs.saver, action: 'pref', key: 'saver' })}
              ${ui.switchField({ id: 'sw-wifi', label: 'Descargar solo con Wi-Fi', hint: 'No gasta tus datos móviles.', checked: prefs.wifiOnly, action: 'pref', key: 'wifiOnly' })}`
          })}
        </div>
      </div>`;
  };

  /* =========================================================
     Manejadores de eventos del módulo
     ========================================================= */
  Object.assign(TA.changes, {
    'lesson-format': (el) => {
      S.progress().format = el.value;
      if (el.value !== 'audio') TA.speech.stop();
      TA.save();
      TA.render();
    },
    'plan-level': (el) => {
      const grades = data.studyPlan.grades[el.value] || [];
      const select = document.getElementById('plan-grade');
      select.innerHTML = grades.map((g) => `<option>${TA.esc(g)}</option>`).join('');
      TA.announce(`Grados disponibles para ${el.value}: ${grades.length}`);
    }
  });

  Object.assign(TA.actions, {
    'edit-plan': () => TA.dialog.open({ title: 'Tu plan de estudios', body: S.planForm() }),

    'diag-retake': () => {
      TA.state.drafts.diagnostic = { retake: true };
      TA.render();
      TA.focus.to('#q0-0');
    },

    'check-retake': () => {
      TA.state.drafts.check = { retake: true };
      TA.render();
      TA.focus.to('#chk-c1');
    },

    'focus-field': (el, e) => {
      e.preventDefault();
      TA.focus.to(`#${CSS.escape(el.dataset.id)}`);
    },

    hint: () => {
      const tutor = S.profile().tutor;
      const p = S.progress();
      if (p.hints >= tutor.hints.length) return;
      p.hints += 1;
      TA.save();
      TA.render();
      TA.announce(`Pista ${p.hints}: ${tutor.hints[p.hints - 1]}`);
      if (p.hints >= tutor.hints.length) TA.focus.to('[data-action="show-solution"]');
    },

    'show-solution': () => {
      S.progress().solutionShown = true;
      TA.save();
      TA.render();
      TA.focus.to('#solution');
    },

    'tutor-quick': (el) => {
      const tutor = S.profile().tutor;
      const p = S.progress();
      const kind = el.dataset.value;
      if (kind === 'hint') {
        if (p.hints < tutor.hints.length) p.hints += 1;
        const text = p.hints <= tutor.hints.length ? `Pista ${p.hints}: ${tutor.hints[p.hints - 1]}` : 'Ya usaste las 3 pistas. Intenta resolverlo y cuéntame tu resultado.';
        S.pushMessage('me', 'Dame una pista');
        S.pushMessage('tutor', text, { kind: 'hint' });
      } else if (kind === 'alt') {
        S.pushMessage('me', 'Explícalo de otra forma');
        S.pushMessage('tutor', tutor.alt);
      } else if (kind === 'everyday') {
        S.pushMessage('me', 'Dame un ejemplo cotidiano');
        S.pushMessage('tutor', tutor.everyday);
      } else {
        S.pushMessage('me', 'Te explico cómo lo hice');
        S.pushMessage('tutor', 'Adelante: escribe paso a paso qué hiciste. Explicarlo te ayuda a encontrar tus propios errores.');
        TA.save();
        TA.render();
        TA.focus.to('#chat-input');
        return;
      }
      TA.save();
      TA.render();
      S.scrollChat();
    }
  });

  Object.assign(TA.submits, {
    plan: (form) => {
      const p = S.progress();
      const fd = new FormData(form);
      p.plan = { level: fd.get('level'), grade: fd.get('grade'), school: String(fd.get('school') || '').trim() };
      TA.save();
      TA.dialog.close();
      TA.render();
      TA.toast('Guardamos tu plan de estudios.', { tone: 'ok' });
    },

    diagnostic: (form) => {
      const fd = new FormData(form);
      const answers = data.diagnostic.map((_, i) => (fd.has(`q${i}`) ? Number(fd.get(`q${i}`)) : null));
      const explain = String(fd.get('explain') || '').trim();
      const errors = answers.map((a, i) => (a == null ? i : -1)).filter((i) => i >= 0);
      if (errors.length) {
        TA.state.drafts.diagnostic = { retake: true, answers, explain, errors };
        TA.render();
        TA.focus.to('#diag-errors');
        return;
      }
      const p = S.progress();
      // Cada respuesta ajusta el dominio estimado de su habilidad (evaluación formativa).
      data.diagnostic.forEach((q, i) => {
        const ok = answers[i] === q.correct;
        const prev = p.mastery[q.skill];
        p.mastery[q.skill] = ok ? Math.max(prev || 0, 72) : Math.min(prev == null ? 35 : prev, 40);
      });
      p.diagnostic = { answers, explain, at: Date.now() };
      TA.charts.record(p,'Diagnóstico');
      p.pendingSync += 1;
      TA.state.drafts.diagnostic = {};
      TA.save();
      TA.render();
      TA.focus.to('#diag-res');
    },

    check: (form) => {
      const fd = new FormData(form);
      const values = { explain: String(fd.get('explain') || '').trim() };
      const errors = {};
      const answers = data.check.map((c, i) => {
        const rawValue = String(fd.get(c.id) || '').trim();
        values[c.id] = rawValue;
        if (!rawValue) { errors[`chk-${c.id}`] = `Ejercicio ${i + 1}: escribe tu respuesta.`; return null; }
        const n = TA.util.parseNumber(rawValue);
        if (n == null) { errors[`chk-${c.id}`] = `Ejercicio ${i + 1}: escribe solo un número, por ejemplo 4 o −3.`; return null; }
        return n;
      });
      if (values.explain.length < 10) errors['chk-explain'] = 'Explica tu procedimiento con al menos una oración.';
      if (Object.keys(errors).length) {
        TA.state.drafts.check = { retake: true, values, errors };
        TA.render();
        TA.focus.to('#chk-errors');
        return;
      }
      const p = S.progress();
      const cur = S.currentSkill();
      const skillIdx = cur >= 0 ? cur : 4;
      const results = data.check.map((c, i) => answers[i] === c.answer);
      const score = results.filter(Boolean).length;
      const passed = score === data.check.length;
      const skillName = data.skills[skillIdx].name.toLowerCase();
      if (passed) p.mastery[skillIdx] = Math.max(p.mastery[skillIdx] || 0, 75);
      else p.mastery[skillIdx] = Math.max(p.mastery[skillIdx] || 0, Math.min(69, (p.mastery[skillIdx] || 0) + score * 5));
      p.check = { answers, results, score, passed, skillName, explain: values.explain };
      TA.charts.record(p,'Sin ayuda');
      p.pendingSync += 1;
      TA.state.drafts.check = {};
      TA.save();
      TA.render();
      TA.focus.to('#chk-res');
      if (passed) TA.toast(`¡Dominio registrado en ${skillName}!`, { tone: 'ok' });
    },

    chat: (form) => {
      const input = form.elements.message;
      const text = input.value.trim();
      if (!text) {
        TA.state.drafts.chatError = 'Escribe tu duda antes de enviarla.';
        TA.render();
        TA.focus.to('#chat-input');
        return;
      }
      TA.state.drafts.chatError = '';
      const p = S.progress();
      if (!TA.net.isOnline()) {
        S.pushMessage('me', text, { status: 'queued' });
        p.pendingSync += 1;
        TA.save();
        TA.render();
        TA.focus.to('#chat-input');
        S.scrollChat();
        TA.announce('Guardé tu pregunta. EstudiandoAndo la responderá cuando haya internet.');
        return;
      }
      S.pushMessage('me', text);
      TA.state.ui.typing = true;
      TA.save();
      TA.render();
      TA.focus.to('#chat-input');
      S.scrollChat();
      setTimeout(() => {
        TA.state.ui.typing = false;
        S.pushMessage('tutor', S.tutorReply(text));
        TA.save();
        if (TA.route().view === 'tutor') { TA.render(); S.scrollChat(); }
      }, TA.prefersReducedMotion() ? 200 : 700);
    }
  });

  /** Mantiene visible el último mensaje del chat. */
  S.scrollChat = () => {
    const log = document.getElementById('chat-log');
    if (log) log.scrollTop = log.scrollHeight;
  };

  /** Responde las preguntas que quedaron en cola sin conexión. */
  S.flushQueue = () => {
    let answered = 0;
    Object.keys(TA.state.progress).forEach((id) => {
      const p = TA.state.progress[id];
      const chat = [];
      p.chat.forEach((m) => {
        chat.push(m);
        if (m.status === 'queued') {
          m.status = 'sent';
          answered += 1;
          const prev = TA.state.studentId;
          TA.state.studentId = id;
          chat.push({ id: TA.util.uid(), from: 'tutor', text: S.tutorReply(m.text), status: 'sent' });
          TA.state.studentId = prev;
        }
      });
      p.chat = chat;
      p.pendingSync = 0;
    });
    return answered;
  };
})(window.TA);
