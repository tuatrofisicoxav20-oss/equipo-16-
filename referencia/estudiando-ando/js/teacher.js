/* =========================================================
   Estudiando Ando · módulo docente
   Pantallas: grupo (mapa de aprendizaje), alertas, alumnos,
   planeación y datos/privacidad.
   Las alertas de la IA son apoyos para decidir, nunca
   diagnósticos: el docente las revisa, edita o descarta.
   ========================================================= */
(function (TA) {
  'use strict';

  const { html, icon, attr, data, ui } = TA;
  const T = (TA.teacher = {});

  /* ---------- Datos derivados ---------- */
  T.state = () => TA.state.teacher;

  /** Lista del grupo con el dominio actualizado de los estudiantes de ejemplo. */
  T.roster = () => data.roster.map((r) => (TA.state.progress[r.id] ? { ...r, mastery: TA.state.progress[r.id].mastery } : r));

  T.needsAttention = (r) => r.mastery.some((v) => v != null && v < 45) || r.mastery.filter((v) => v == null).length >= 2;

  /** Habilidad más débil de un estudiante (o -1 si no hay datos). */
  T.weakest = (r) => {
    let idx = -1;
    r.mastery.forEach((v, i) => { if (v != null && (idx < 0 || v < r.mastery[idx])) idx = i; });
    return idx;
  };

  T.alertState = (id) => T.state().alerts[id];
  T.pendingAlerts = () => data.alerts.filter((a) => T.alertState(a.id).status === 'new').length;

  T.freshness = () => (TA.net.isOnline()
    ? ui.badge('Actualizado hace 1 min', 'ok', 'sync')
    : ui.badge('Última sincronización: 7:20 a. m.', 'warn', 'clock'));

  const statusBadge = (status) => ({
    new: ui.badge('Por revisar', 'info', 'flag'),
    rev: ui.badge('Revisada', 'ok', 'check'),
    dis: ui.badge('Descartada', 'neutral', 'trash')
  }[status]);

  /* =========================================================
     Vistas
     ========================================================= */
  T.views = {};

  /* ---------- Grupo ---------- */
  T.views.group = () => {
    const ts = T.state();
    const online = TA.net.isOnline();
    const roster = T.roster();
    const rows = ts.onlyAttention ? roster.filter(T.needsAttention) : roster;
    const avg = TA.util.avg(data.groupAvg);
    return html`
      ${ui.pageHeader({
        title: `Grupo ${data.teacher.group} · ${data.teacher.subject}`,
        lead: `Ecuaciones lineales con una incógnita · ${data.teacher.size} estudiantes`,
        actions: T.freshness()
      })}
      ${online ? '' : ui.netBanner('teacher')}
      <ul class="kpis" role="list">
        <li class="kpi tone-brand"><span class="tile-icon">${icon('users', 22)}</span><div><p class="kpi__value">${data.teacher.size}</p><p class="kpi__label">estudiantes</p></div></li>
        <li class="kpi tone-warn"><span class="tile-icon">${icon('flag', 22)}</span><div><p class="kpi__value">${T.pendingAlerts()}</p><p class="kpi__label">alertas por revisar</p></div></li>
        <li class="kpi tone-accent"><span class="tile-icon">${icon('target', 22)}</span><div><p class="kpi__value">${avg} %</p><p class="kpi__label">dominio promedio</p></div></li>
        <li class="kpi tone-rose"><span class="tile-icon">${icon('clock', 22)}</span><div><p class="kpi__value">${online ? 0 : 5}</p><p class="kpi__label">sin sincronizar</p></div></li>
      </ul>

      ${ui.card({
        id: 'c-heat', title: 'Mapa de aprendizaje', titleIcon: 'grid',
        aside: html`<span class="muted small">${rows.length} de ${data.teacher.size} (muestra)</span>`,
        body: html`${ui.switchField({ id: 'sw-attention', label: 'Mostrar solo quienes necesitan apoyo', checked: ts.onlyAttention, action: 'heat-filter' })}
          <p class="sr-only" aria-live="polite">${`Se muestran ${rows.length} estudiantes.`}</p>
          ${ui.heatmap(rows, { stale: !online })}
          ${online ? '' : html`<p class="muted small">${icon('clock', 14)} Las filas marcadas «Sin sincronizar» trabajaron sin conexión; su avance aparecerá cuando sincronicen.</p>`}`
      })}

      <div class="grid grid--2">
        ${ui.card({
          id: 'c-gskills', title: 'Dominio del grupo por habilidad', titleIcon: 'chart',
          body: ui.masteryBars(data.groupAvg, { note: (i) => html`<span class="muted small">${data.groupStruggling[i]} de ${data.teacher.size} necesitan apoyo</span>` })
        })}
        <div class="stack">
          ${ui.card({
            id: 'c-palerts', title: 'Por revisar', titleIcon: 'flag',
            aside: html`<a class="link" href="#/alertas">Ver todas<span class="sr-only"> las alertas</span></a>`,
            body: html`<ul class="list-rows">${data.alerts.slice(0, 3).map((a) => html`<li class="row">
              <span class="tile-icon tone-warn">${icon(a.scope === 'group' ? 'users' : 'user', 20)}</span>
              <div class="row__main"><p class="row__title">${a.who} · ${data.skills[a.skill].name}</p><p class="row__sub">${T.alertState(a.id).suggestion || a.suggestion}</p></div>
              ${statusBadge(T.alertState(a.id).status)}
            </li>`)}</ul>`
          })}
          ${ui.card({
            id: 'c-next', title: 'Próxima clase', titleIcon: 'calendar', tone: 'brand',
            body: html`<p>Sugerencia: reforzar <strong>operaciones inversas</strong> (15 min) y formar un grupo de apoyo con 9 estudiantes.</p>
              <a class="btn btn--secondary" href="#/planeacion">${icon('calendar', 18)}Ver planeación</a>`
          })}
        </div>
      </div>`;
  };

  /* ---------- Alertas ---------- */
  function alertCard(a) {
    const st = T.alertState(a.id);
    const online = TA.net.isOnline();
    return html`<li><article class="alert-card alert-card--${st.status}" aria-labelledby="al-${a.id}">
      <div class="cluster cluster--tight">
        ${ui.badge(a.who, a.scope === 'group' ? 'brand' : 'neutral', a.scope === 'group' ? 'users' : 'user')}
        ${ui.badge('Sugerencia de IA · no es un diagnóstico', 'accent', 'spark')}
        ${statusBadge(st.status)}
        ${online ? '' : ui.badge('De la última sincronización', 'neutral', 'clock')}
      </div>
      <h2 class="alert-card__title" id="al-${a.id}">${data.skills[a.skill].name}</h2>
      <p>${a.text}</p>
      <p><strong>Sugerencia:</strong> ${st.suggestion || a.suggestion}${st.suggestion ? html` <span class="muted">(editada por ti)</span>` : ''}</p>
      ${st.status === 'dis'
        ? html`<div class="cluster"><button type="button" class="btn btn--secondary btn--sm" data-action="alert-restore" data-id="${a.id}">${icon('reset', 16)}Restaurar<span class="sr-only"> alerta de ${a.who}</span></button></div>`
        : html`<div class="cluster">
          ${st.status === 'new'
            ? html`<button type="button" class="btn btn--primary btn--sm" data-action="alert-review" data-id="${a.id}">${icon('check', 16)}Marcar como revisada<span class="sr-only"> (${a.who})</span></button>`
            : html`<button type="button" class="btn btn--secondary btn--sm" data-action="alert-unreview" data-id="${a.id}">${icon('reset', 16)}Volver a «por revisar»<span class="sr-only"> (${a.who})</span></button>`}
          <button type="button" class="btn btn--secondary btn--sm" data-action="alert-edit" data-id="${a.id}">${icon('pen', 16)}Editar sugerencia<span class="sr-only"> (${a.who})</span></button>
          <button type="button" class="btn btn--secondary btn--sm" data-action="feedback" data-id="${a.studentId || 'group'}">${icon('send', 16)}Retroalimentar<span class="sr-only"> a ${a.who}</span></button>
          <button type="button" class="btn btn--ghost btn--sm" data-action="alert-discard" data-id="${a.id}">${icon('trash', 16)}Descartar<span class="sr-only"> alerta de ${a.who}</span></button>
        </div>`}
    </article></li>`;
  }

  T.views.alerts = () => {
    const ts = T.state();
    const filter = ts.alertFilter;
    const list = data.alerts.filter((a) => filter === 'all' || T.alertState(a.id).status === filter);
    const count = (s) => data.alerts.filter((a) => T.alertState(a.id).status === s).length;
    return html`
      ${ui.pageHeader({ title: 'Alertas de reforzamiento', lead: 'Detección temprana a partir de intentos, respuestas y errores recurrentes.', actions: T.freshness() })}
      <div class="note note--accent">${icon('shield', 22)}<p><strong>Son apoyos para decidir, no diagnósticos definitivos.</strong> Puedes revisarlas, modificarlas o descartarlas según lo que conoces de cada estudiante y del grupo.${TA.net.isOnline() ? '' : ' Las alertas nuevas aparecerán cuando los estudiantes sincronicen.'}</p></div>
      ${ui.segmented({
        name: 'alert-filter', legend: 'Mostrar alertas', action: 'alert-filter', value: filter,
        options: [
          { value: 'new', label: `Por revisar (${count('new')})` },
          { value: 'rev', label: `Revisadas (${count('rev')})` },
          { value: 'dis', label: `Descartadas (${count('dis')})` },
          { value: 'all', label: `Todas (${data.alerts.length})` }
        ]
      })}
      <p class="sr-only" aria-live="polite">${`${list.length} alertas en esta vista.`}</p>
      ${list.length
        ? html`<ul class="grid grid--2 list-reset">${list.map(alertCard)}</ul>`
        : ui.emptyState({ title: filter === 'new' ? '¡Todo revisado!' : 'No hay alertas en esta vista', text: filter === 'new' ? 'No tienes alertas pendientes. Te avisaremos cuando la plataforma detecte nuevas dificultades.' : 'Cambia el filtro para ver otras alertas.' })}`;
  };

  /* ---------- Alumnos (lista y detalle) ---------- */
  function studentDetail(r) {
    const online = TA.net.isOnline();
    const weak = T.weakest(r);
    const obs = data.observations[r.id] || [weak >= 0 ? `Dificultad recurrente en «${data.skills[weak].name}».` : 'Aún no hay datos suficientes.'];
    const iv = data.interventions[r.id];
    return html`<section class="card detail" aria-labelledby="detail-t">
      <div class="detail__head">${ui.avatar(r.name, 'lg')}<div><h2 id="detail-t" tabindex="-1">${r.name}</h2><p class="muted">Última actividad: ${r.last}</p></div>
        ${r.unsynced && !online ? ui.badge('Sin sincronizar', 'warn', 'clock') : ''}</div>
      <h3>Dominio por habilidad</h3>
      ${ui.masteryBars(r.mastery)}
      <h3>Dificultades recurrentes</h3>
      <ul class="list-icons">${obs.map((o) => html`<li>${icon('flag', 18)}<span>${o}</span></li>`)}</ul>
      <h3>Apoyos que ha necesitado</h3>
      <p>${r.hints} pistas esta semana · nivel máximo de pista: ${r.hints > 4 ? 3 : 2}. Contenidos trabajados: lecciones 1 a 3.</p>
      <h3>Seguimiento de la intervención</h3>
      ${iv ? html`${ui.beforeAfter(iv.before, iv.after, data.skills[iv.skill].name)}<p class="muted small">${iv.what}.</p>` : html`<p class="muted">Sin intervención registrada todavía.</p>`}
      <div class="cluster"><button type="button" class="btn btn--primary" data-action="feedback" data-id="${r.id}">${icon('send', 18)}Enviar retroalimentación<span class="sr-only"> a ${r.name}</span></button></div>
    </section>`;
  }

  T.views.students = (params = {}) => {
    const roster = T.roster();
    const sel = roster.find((r) => r.id === params.id) || roster.find((r) => r.id === T.state().selected) || roster[0];
    const online = TA.net.isOnline();
    return html`
      ${ui.pageHeader({ title: 'Seguimiento individual', lead: 'Qué trabajó, qué le cuesta y qué apoyos ha necesitado cada estudiante.', actions: T.freshness() })}
      <div class="grid grid--split">
        <nav class="card" aria-labelledby="roster-t">
          <div class="card__head"><h2 class="card__title" id="roster-t">${icon('users', 20)}<span>Estudiantes</span></h2></div>
          <ul class="roster">${roster.map((r) => {
            const w = T.weakest(r);
            return html`<li><a class="roster__item" href="#/alumnos/${r.id}"${attr(r.id === sel.id, 'aria-current="page"')}>
              ${ui.avatar(r.name, 'sm')}
              <span class="roster__main"><span class="roster__name">${r.name}</span><span class="roster__sub">${w >= 0 ? `Reforzar: ${data.skills[w].name.toLowerCase()}` : 'Sin datos'}</span></span>
              ${r.unsynced && !online ? html`<span class="roster__flag">${icon('clock', 16)}<span class="sr-only">Sin sincronizar</span></span>` : ''}
              ${icon('right', 18)}
            </a></li>`;
          })}</ul>
        </nav>
        ${studentDetail(sel)}
      </div>`;
  };

  /* ---------- Planeación ---------- */
  T.views.plan = () => {
    const ts = T.state();
    const online = TA.net.isOnline();
    const chosen = data.planSuggestions.filter((s) => ts.plan[s.id]);
    const minutes = chosen.reduce((a, s) => a + s.minutes, 0);
    return html`
      ${ui.pageHeader({ title: 'Planeación basada en necesidades reales', lead: 'Contenidos a reforzar, ejercicios complementarios y posibles agrupaciones.', actions: T.freshness() })}
      <div class="grid grid--2">
        <div class="stack">
          ${ui.card({
            id: 'c-sugg', title: 'Contenidos que conviene reforzar', titleIcon: 'target',
            body: html`<fieldset class="checklist"><legend class="sr-only">Elige qué incluir en tu próxima clase</legend>
                ${data.planSuggestions.map((s) => html`<label class="check-row"><input type="checkbox" data-change="plan-item" data-key="${s.id}"${attr(ts.plan[s.id], 'checked')}>
                  <span><strong>${s.title}</strong> · ${s.minutes} min<br><span class="muted">${s.detail}</span></span></label>`)}
              </fieldset>
              <p class="plan-total" role="status">Tu clase: <strong>${TA.util.plural(chosen.length, 'tema', 'temas')}</strong>, <strong>${minutes} minutos</strong>.</p>
              <button type="button" class="btn btn--secondary" data-action="ai-plan"${attr(!online || ts.aiLoading, 'disabled')} aria-describedby="ai-plan-h">${icon('spark', 18)}${ts.aiLoading ? 'Generando propuesta…' : 'Generar nueva propuesta con IA'}</button>
              <p class="field__hint" id="ai-plan-h">${online ? 'La propuesta es editable: tú decides qué usar.' : 'Generar con IA requiere internet. Ves las últimas propuestas guardadas.'}</p>`
          })}
          ${ui.card({
            id: 'c-impact', title: '¿Funcionaron las intervenciones?', titleIcon: 'trend',
            body: html`${Object.entries(data.interventions).map(([id, iv]) => html`${ui.beforeAfter(iv.before, iv.after, `${data.roster.find((r) => r.id === id).name} · ${data.skills[iv.skill].name}`)}<p class="muted small">${iv.what}.</p>`)}`
          })}
        </div>
        ${ui.card({
          id: 'c-groups', title: 'Posibles agrupaciones', titleIcon: 'users',
          body: html`<ul class="list-rows">${data.groupings.map((g) => html`<li class="row tone-${g.tone}">
              <span class="tile-icon tile-icon--letter" aria-hidden="true">${g.id}</span>
              <div class="row__main"><p class="row__title"><span class="sr-only">Grupo ${g.id}: </span>${g.title} · ${g.count} estudiantes</p><p class="row__sub">${g.members}</p></div>
            </li>`)}</ul>
            <p class="muted small">Son propuestas: tú decides cómo organizar el grupo. Evitamos etiquetas que puedan perjudicar a tus estudiantes.</p>`
        })}
      </div>`;
  };

  /* ---------- Datos, conexión y privacidad ---------- */
  T.views.data = () => {
    const online = TA.net.isOnline();
    const pv = T.state().privacy;
    const rows = [
      ['Panel del grupo', 'Datos casi en vivo', 'Última sincronización guardada en tu equipo'],
      ['Avance de estudiantes sin conexión', 'Aparece cuando el estudiante sincroniza', 'No se ve hasta que sincronice'],
      ['Alertas', 'Se actualizan con cada actividad', 'Ves las ya generadas; las nuevas llegan al sincronizar'],
      ['Recomendaciones con IA', 'Reforzamientos y agrupaciones nuevas', 'Requieren internet; ves las últimas guardadas'],
      ['Retroalimentación', 'Se envía al instante', 'Se guarda y se envía cuando te conectas'],
      ['Planeación', 'Edición y sugerencias', 'Edición de tu plan guardado']
    ];
    const queued = T.state().outbox.filter((m) => m.status === 'queued');
    return html`
      ${ui.pageHeader({ title: 'Conexión y datos', lead: 'Qué ves con y sin internet, y cómo se cuidan los datos de tus estudiantes.', actions: T.freshness() })}
      ${ui.netBanner('teacher')}
      ${ui.card({
        id: 'c-cmp', title: 'Lo que ves con y sin internet', titleIcon: 'wifi',
        body: html`<div class="table-wrap" role="region" aria-label="Tabla comparativa: con y sin internet" tabindex="0"><table class="table">
          <thead><tr><th scope="col">Función</th><th scope="col">Con internet</th><th scope="col">Sin internet</th></tr></thead>
          <tbody>${rows.map((r) => html`<tr><th scope="row">${r[0]}</th><td${attr(online, 'class="is-current"')}>${r[1]}</td><td${attr(!online, 'class="is-current"')}>${r[2]}</td></tr>`)}</tbody>
        </table></div><p class="muted small">La columna resaltada corresponde a tu conexión actual.</p>`
      })}
      <div class="grid grid--2">
        ${ui.card({
          id: 'c-pend', title: 'Pendiente de sincronizar', titleIcon: 'clock',
          body: html`<h3 class="h-sm">Estudiantes</h3>
            <ul class="list-icons">${data.roster.filter((r) => r.unsynced).map((r) => html`<li>${icon('user', 18)}<span>${r.name} · ${online ? 'sincronizó hoy' : `trabajó sin conexión (${r.last})`}</span></li>`)}</ul>
            <h3 class="h-sm">Tus mensajes</h3>
            ${queued.length ? html`<ul class="list-icons">${queued.map((m) => html`<li>${icon('send', 18)}<span>Para ${T.recipientName(m.to)}: «${m.text.slice(0, 60)}${m.text.length > 60 ? '…' : ''}»</span></li>`)}</ul>` : html`<p class="muted">No hay mensajes en espera.</p>`}`
        })}
        ${ui.card({
          id: 'c-priv', title: 'Privacidad y control', titleIcon: 'shield',
          body: html`${ui.switchField({ id: 'pv-own', label: 'Solo yo veo los datos de mis grupos', checked: pv.own, action: 'privacy', key: 'own' })}
            ${ui.switchField({ id: 'pv-labels', label: 'Sin etiquetas de desempeño visibles para estudiantes', hint: 'Los estudiantes ven su avance, no comparaciones con otros.', checked: pv.labels, action: 'privacy', key: 'labels' })}
            ${ui.switchField({ id: 'pv-review', label: 'Las alertas requieren mi revisión antes de usarse', checked: pv.review, action: 'privacy', key: 'review' })}`
        })}
      </div>`;
  };

  /* =========================================================
     Retroalimentación personalizada (diálogo)
     ========================================================= */
  T.recipientName = (to) => {
    if (to === 'group') return `todo el grupo ${data.teacher.group}`;
    if (to === 'groupA') return 'el grupo A · Operaciones inversas';
    const r = data.roster.find((x) => x.id === to);
    return r ? r.name : 'estudiante';
  };

  T.feedbackForm = (to, draft = {}) => {
    const online = TA.net.isOnline();
    const text = draft.text ?? '';
    const err = draft.error || '';
    return html`<form class="form" data-submit="feedback" novalidate>
      <div class="field">
        <label for="fb-to">Para</label>
        <select id="fb-to" name="to">
          ${data.roster.map((r) => html`<option value="${r.id}"${attr(r.id === to, 'selected')}>${r.name}</option>`)}
          <option value="groupA"${attr(to === 'groupA', 'selected')}>Grupo A · Operaciones inversas (9)</option>
          <option value="group"${attr(to === 'group', 'selected')}>Todo el grupo ${data.teacher.group}</option>
        </select>
      </div>
      <div class="field">
        <p class="field__label" id="fb-tpl-l">Plantillas</p>
        <div class="cluster cluster--tight" role="group" aria-labelledby="fb-tpl-l">
          ${data.feedbackTemplates.map((t, i) => html`<button type="button" class="chip" data-action="fb-template" data-value="${i}">${t.label}</button>`)}
        </div>
      </div>
      <div class="field${err ? ' is-invalid' : ''}">
        <label for="fb-msg">Mensaje</label>
        <textarea id="fb-msg" name="text" rows="4" maxlength="280" aria-describedby="fb-msg-h${err ? ' fb-msg-e' : ''}"${attr(err, 'aria-invalid="true"')} data-input="fb-count">${text}</textarea>
        <p class="field__hint" id="fb-msg-h"><span id="fb-count">${text.length}</span> de 280 caracteres. Reconoce el esfuerzo y propone un siguiente paso concreto.</p>
        ${err ? ui.fieldError('fb-msg-e', err) : ''}
      </div>
      ${ui.switchField({ id: 'fb-ex', label: 'Adjuntar ejercicios de reforzamiento', checked: draft.exercises ?? true, action: 'noop' })}
      <div class="note ${online ? 'note--accent' : 'note--warn'}">${icon(online ? 'send' : 'clock', 20)}<p>${online ? 'Se enviará al instante y el estudiante lo verá en su inicio.' : 'Sin internet: se guarda en tu equipo y se enviará cuando te conectes.'}</p></div>
      <div class="dialog__actions">
        <button type="button" class="btn btn--secondary" data-dialog-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">${icon(online ? 'send' : 'clock', 18)}${online ? 'Enviar' : 'Guardar para enviar'}</button>
      </div>
    </form>`;
  };

  T.editForm = (a, draft = {}) => {
    const st = T.alertState(a.id);
    const value = draft.text ?? (st.suggestion || a.suggestion);
    const err = draft.error || '';
    return html`<form class="form" data-submit="alert-edit" data-id="${a.id}" novalidate>
      <p class="muted">${a.who} · ${data.skills[a.skill].name}</p>
      <div class="field${err ? ' is-invalid' : ''}">
        <label for="al-edit">Sugerencia</label>
        <textarea id="al-edit" name="text" rows="3" maxlength="200" aria-describedby="al-edit-h${err ? ' al-edit-e' : ''}"${attr(err, 'aria-invalid="true"')}>${value}</textarea>
        <p class="field__hint" id="al-edit-h">Ajusta la sugerencia de la IA con lo que conoces del estudiante.</p>
        ${err ? ui.fieldError('al-edit-e', err) : ''}
      </div>
      <div class="dialog__actions">
        ${st.suggestion ? html`<button type="button" class="btn btn--ghost" data-action="alert-reset" data-id="${a.id}">Usar la sugerencia original</button>` : ''}
        <button type="button" class="btn btn--secondary" data-dialog-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Guardar cambios</button>
      </div>
    </form>`;
  };

  /* =========================================================
     Manejadores
     ========================================================= */
  const setAlert = (id, status) => {
    T.alertState(id).status = status;
    TA.save();
    TA.render();
  };

  Object.assign(TA.actions, {
    'alert-review': (el) => {
      setAlert(el.dataset.id, 'rev');
      TA.announce('Alerta marcada como revisada.');
      TA.focus.to('#page-title');
    },
    'alert-unreview': (el) => {
      setAlert(el.dataset.id, 'new');
      TA.announce('Alerta devuelta a «por revisar».');
      TA.focus.to('#page-title');
    },
    'alert-restore': (el) => {
      setAlert(el.dataset.id, 'new');
      TA.toast('Alerta restaurada.', { tone: 'ok' });
      TA.focus.to('#page-title');
    },
    'alert-discard': (el) => {
      const id = el.dataset.id;
      const prev = T.alertState(id).status;
      setAlert(id, 'dis');
      TA.focus.to('#page-title');
      TA.toast('Descartaste la alerta.', {
        action: { label: 'Deshacer', onClick: () => { setAlert(id, prev); TA.announce('Se restauró la alerta.'); } }
      });
    },
    'alert-edit': (el) => {
      const a = data.alerts.find((x) => x.id === el.dataset.id);
      TA.dialog.open({ title: 'Editar sugerencia', body: T.editForm(a) });
    },
    'alert-reset': (el) => {
      T.alertState(el.dataset.id).suggestion = null;
      TA.save();
      TA.dialog.close();
      TA.render();
      TA.toast('Se restauró la sugerencia original.', { tone: 'ok' });
    },
    feedback: (el) => {
      const to = el.dataset.id || T.state().selected || 'x';
      TA.dialog.open({ title: 'Retroalimentación personalizada', body: T.feedbackForm(to) });
    },
    'fb-template': (el) => {
      const ta = document.getElementById('fb-msg');
      ta.value = data.feedbackTemplates[Number(el.dataset.value)].text;
      document.getElementById('fb-count').textContent = ta.value.length;
      ta.focus();
      TA.announce('Plantilla agregada al mensaje. Puedes editarla.');
    },
    'ai-plan': () => {
      const ts = T.state();
      ts.aiLoading = true;
      TA.render();
      TA.announce('Generando propuesta…');
      setTimeout(() => {
        ts.aiLoading = false;
        ts.plan = { ps1: true, ps2: true, ps3: true };
        TA.save();
        if (TA.route().view === 'plan') TA.render();
        TA.toast('Propuesta actualizada: se agregó la extensión para 8 estudiantes. Revísala antes de usarla.', { tone: 'ok' });
      }, 1200);
    }
  });

  Object.assign(TA.changes, {
    'heat-filter': (el) => { T.state().onlyAttention = el.checked; TA.save(); TA.render(); },
    'alert-filter': (el) => { T.state().alertFilter = el.value; TA.save(); TA.render(); },
    'plan-item': (el) => { T.state().plan[el.dataset.key] = el.checked; TA.save(); TA.render(); },
    privacy: (el) => {
      T.state().privacy[el.dataset.key] = el.checked;
      TA.save();
      TA.announce(el.checked ? 'Activado.' : 'Desactivado.');
    }
  });

  Object.assign(TA.submits, {
    feedback: (form) => {
      const fd = new FormData(form);
      const text = String(fd.get('text') || '').trim();
      const to = fd.get('to');
      const exercises = form.querySelector('#fb-ex').checked;
      if (text.length < 5) {
        TA.dialog.update(T.feedbackForm(to, { text, exercises, error: 'Escribe un mensaje de al menos 5 caracteres.' }));
        TA.focus.to('#fb-msg');
        return;
      }
      const online = TA.net.isOnline();
      T.state().outbox.push({ id: TA.util.uid(), to, text, exercises, when: 'Hoy', status: online ? 'sent' : 'queued' });
      TA.save();
      TA.dialog.close();
      TA.render();
      TA.toast(online ? `Mensaje enviado a ${T.recipientName(to)}.` : 'Mensaje guardado: se enviará cuando te conectes.', { tone: online ? 'ok' : 'warn' });
    },
    'alert-edit': (form) => {
      const id = form.dataset.id;
      const a = data.alerts.find((x) => x.id === id);
      const text = String(new FormData(form).get('text') || '').trim();
      if (text.length < 5) {
        TA.dialog.update(T.editForm(a, { text, error: 'La sugerencia no puede quedar vacía.' }));
        TA.focus.to('#al-edit');
        return;
      }
      T.alertState(id).suggestion = text === a.suggestion ? null : text;
      TA.save();
      TA.dialog.close();
      TA.render();
      TA.toast('Sugerencia actualizada.', { tone: 'ok' });
    }
  });

  /** Envía los mensajes del docente que quedaron en cola. */
  T.flushOutbox = () => {
    const queued = T.state().outbox.filter((m) => m.status === 'queued');
    queued.forEach((m) => { m.status = 'sent'; });
    return queued.length;
  };
})(window.TA);
