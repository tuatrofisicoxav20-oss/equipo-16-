/* =========================================================
   EstudiandoAndo · módulo docente
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
  T.activeGroup = () => data.teacherGroups.find(g=>g.id===T.state().activeGroup)||data.teacherGroups[0];
  T.roster = () => data.roster.filter(r=>r.groupId===T.activeGroup().id)
    .map(r=>(TA.state.progress[r.id]?{...r,mastery:TA.state.progress[r.id].mastery}:r));
  T.groupAverage=(id)=>{
    const g=data.teacherGroups.find(g=>g.id===id)||data.teacherGroups[0];
    if(id!=='1b')return g.avg.slice();
    return g.avg.map((score,i)=>{
      const delta=['x','d'].reduce((sum,id)=>sum+((TA.state.progress[id]?.mastery[i]??data.students[id].mastery[i]??0)-(data.students[id].mastery[i]??0)),0);
      return Math.max(0,Math.min(100,Math.round(score+delta/g.size)));
    });
  };

  T.needsAttention = (r) => r.mastery.some((v) => v != null && v < 45) || r.mastery.filter((v) => v == null).length >= 2;

  /** Habilidad más débil de un estudiante (o -1 si no hay datos). */
  T.weakest = (r) => {
    let idx = -1;
    r.mastery.forEach((v, i) => { if (v != null && (idx < 0 || v < r.mastery[idx])) idx = i; });
    return idx;
  };

  T.alertState = (id) => T.state().alerts[id];
  T.pendingAlerts = () => T.activeGroup().id==='1b'?data.alerts.filter((a) => T.alertState(a.id).status === 'new').length:0;

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
    const ts=T.state();
    const online=TA.net.isOnline();
    const group=T.activeGroup();
    const roster=T.roster();
    const rows=ts.onlyAttention?roster.filter(T.needsAttention):roster;
    const averages=T.groupAverage(group.id);
    const avg=TA.util.avg(averages)||0;
    const trend=group.trend.map((score,i)=>({label:`Sem. ${i+1}`,score}));
    trend[trend.length-1]={label:'Ahora',score:avg};
    const worst=group.struggling.indexOf(Math.max(...group.struggling));
    return html`
      ${ui.pageHeader({title:`Cómo va el grupo ${group.label}`,lead:`${group.size} estudiantes · Matemáticas · Ecuaciones lineales`,actions:T.freshness()})}
      <div class="group-switcher"><div class="field field--inline"><label for="teacher-group-select">Grupo que quieres analizar</label>
        <select id="teacher-group-select" data-change="teacher-group">${data.teacherGroups.map(g=>html`<option value="${g.id}"${attr(g.id===group.id,'selected')}>${g.label} · ${g.size} estudiantes</option>`)}</select>
      </div><span class="badge badge--neutral">Datos ilustrativos · demo</span></div>
      ${online?'':ui.netBanner('teacher')}
      <ul class="kpis" role="list">
       <li class="kpi tone-brand"><span class="tile-icon">${icon('users',22)}</span><div><p class="kpi__value">${group.size}</p><p class="kpi__label">Estudiantes del grupo</p></div></li>
       <li class="kpi tone-accent"><span class="tile-icon">${icon('target',22)}</span><div><p class="kpi__value">${avg} %</p><p class="kpi__label">Avance promedio</p></div></li>
       <li class="kpi tone-warn"><span class="tile-icon">${icon('flag',22)}</span><div><p class="kpi__value">${group.struggling[worst]}</p><p class="kpi__label">Requieren apoyo en ${data.skills[worst].short.toLowerCase()}</p></div></li>
       <li class="kpi tone-rose"><span class="tile-icon">${icon('chart',22)}</span><div><p class="kpi__value">${trend[4].score-trend[0].score>=0?'+':''}${trend[4].score-trend[0].score}</p><p class="kpi__label">Puntos desde la semana 1</p></div></li>
      </ul>
      <div class="grid grid--2 dashboard-charts">
       ${ui.card({title:`Evolución del grupo ${group.label}`,titleIcon:'chart',body:TA.charts.line({title:`Avance del grupo ${group.label}`,points:trend,help:'Historial ficticio de cinco semanas para mostrar la evolución; la semana actual incorpora cambios de las cuentas de demostración.'})})}
       ${ui.card({title:'Comparación entre mis grupos',titleIcon:'users',body:html`${TA.charts.compareGroups(data.teacherGroups,group.id)}`})}
      </div>
      <div class="grid grid--2">
       ${ui.card({title:'¿Cómo va el grupo?',titleIcon:'target',body:html`<p class="muted small">Estas barras muestran cuántos estudiantes avanzan y cuántos necesitan ayuda.</p>${TA.charts.distribution([
         {label:'Ya lo aprendieron',count:group.distribution[0],tone:'success'},
         {label:'En proceso',count:group.distribution[1],tone:'mid'},
         {label:'Necesita reforzar',count:group.distribution[2],tone:'low'}],group.size)}
         <a class="link" href="#/alumnos">Ver progreso individual de cada estudiante</a>`})}
       ${ui.card({title:'Ideas para apoyar a la clase',titleIcon:'spark',tone:'accent',body:html`
         <div class="ai-observation"><strong>El asistente encontró esto</strong><p>En ${group.label}, <strong>${group.struggling[worst]} estudiantes</strong> podrían necesitar apoyo adicional en ${data.skills[worst].name.toLowerCase()}.</p>
         <p class="small">Sugerencia: revisar los procedimientos, mostrar la balanza y practicar un ejercicio sin asistencia para comprobar comprensión.</p></div>
         <div class="cluster"><a href="#/planeacion" class="btn btn--primary">${icon('calendar',18)}Preparar mi clase</a><a href="#/alumnos" class="btn btn--secondary">${icon('users',18)}Revisar estudiantes</a></div>
         <p class="small muted">No es un diagnóstico automático. Tú decides qué recomendaciones aplicar.</p>`})}
      </div>
      <details class="optional-details"><summary>Ver la tabla de resultados por estudiante y tema</summary>
      ${ui.card({id:'c-heat',title:`Resultados por estudiante y tema · ${group.label}`,titleIcon:'grid',aside:html`<span class="muted small">${rows.length} ejemplos de ${group.size} estudiantes</span>`,body:html`
        ${ui.switchField({id:'sw-attention',label:'Mostrar solo quienes necesitan apoyo',checked:ts.onlyAttention,action:'heat-filter'})}
        <p class="sr-only" aria-live="polite">Se muestran ${rows.length} perfiles de demostración.</p>
        ${ui.heatmap(rows,{stale:!online})}
        <div class="cluster"><a class="btn btn--secondary" href="#/alumnos">${icon('users',18)}Ver avances por estudiante</a></div>`})}
      </details>
      <details class="optional-details"><summary>Ver más detalles para planear la clase</summary>
      <div class="grid grid--2">
       ${ui.card({title:'Así va el grupo en cada tema',titleIcon:'chart',body:ui.masteryBars(averages,{note:i=>html`<span class="muted small">${group.struggling[i]} de ${group.size} necesitan apoyo</span>`})})}
       ${ui.card({title:'Alertas y próximas decisiones',titleIcon:'flag',body:html`
         <p>${group.id==='1b'?`${T.pendingAlerts()} alertas pendientes de revisión docente.`:'En esta muestra no hay alertas abiertas para este grupo.'}</p>
         <p>Para la próxima clase se recomienda reforzar <strong>${data.skills[worst].name.toLowerCase()}</strong> y comprobar el aprendizaje sin pistas.</p>
         <div class="cluster"><a href="#/alertas" class="btn btn--secondary">Ver alertas</a><a href="#/planeacion" class="btn btn--primary">Planear refuerzo</a></div>`})}
      </div>
      </details>`;
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
    const alerts = T.activeGroup().id === '1b' ? data.alerts : [];
    const list = alerts.filter((a) => filter === 'all' || T.alertState(a.id).status === filter);
    const count = (s) => alerts.filter((a) => T.alertState(a.id).status === s).length;
    return html`
      ${ui.pageHeader({ title: `Alertas · ${T.activeGroup().label}`, lead: 'Detección temprana a partir de intentos, respuestas y errores recurrentes. Muestra ficticia de la demostración.', actions: T.freshness() })}
      <div class="note note--accent">${icon('shield', 22)}<p><strong>Son apoyos para decidir, no diagnósticos definitivos.</strong> Puedes revisarlas, modificarlas o descartarlas según lo que conoces de cada estudiante y del grupo.${TA.net.isOnline() ? '' : ' Las alertas nuevas aparecerán cuando los estudiantes sincronicen.'}</p></div>
      ${ui.segmented({
        name: 'alert-filter', legend: 'Mostrar alertas', action: 'alert-filter', value: filter,
        options: [
          { value: 'new', label: `Por revisar (${count('new')})` },
          { value: 'rev', label: `Revisadas (${count('rev')})` },
          { value: 'dis', label: `Descartadas (${count('dis')})` },
          { value: 'all', label: `Todas (${alerts.length})` }
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
      <div class="individual-summary"><div><span class="muted small">Avance de este estudiante</span><strong>${TA.util.avg(r.mastery)||0} %</strong></div>
        <div><span class="muted small">Promedio de ${T.activeGroup().label}</span><strong>${TA.util.avg(T.groupAverage(T.activeGroup().id))||0} %</strong></div>
      </div>
      <h3>Cómo ha avanzado</h3>
      ${TA.charts.line({title:`Evolución de ${r.name}`,points:TA.charts.studentHistory(r.id),help:'Evolución de demostración. En Ximena y Diego se registra el avance después de un diagnóstico o comprobación sin ayuda.'})}
      <h3>Así va en cada tema</h3>
      ${ui.masteryBars(r.mastery)}
      <h3>Temas que le cuestan</h3>
      <ul class="list-icons">${obs.map((o) => html`<li>${icon('flag', 18)}<span>${o}</span></li>`)}</ul>
      <h3>Ayuda que ha recibido</h3>
      <p>${r.hints} pistas esta semana · nivel máximo de pista: ${r.hints > 4 ? 3 : 2}. Contenidos trabajados: lecciones 1 a 3.</p>
      <h3>Seguimiento de la intervención</h3>
      ${iv ? html`${ui.beforeAfter(iv.before, iv.after, data.skills[iv.skill].name)}<p class="muted small">${iv.what}.</p>` : html`<p class="muted">Sin intervención registrada todavía.</p>`}
      <div class="note note--accent">${icon('spark',20)}<p><strong>El asistente recomienda:</strong> observa el procedimiento de ${r.name} en ${weak>=0?data.skills[weak].name.toLowerCase():'la próxima evaluación'}. Puedes enviar comentarios específicos y revisar si mejora en su siguiente intento. Es una sugerencia, no una etiqueta.</p></div>
      <div class="cluster"><button type="button" class="btn btn--primary" data-action="feedback" data-id="${r.id}">${icon('send', 18)}Enviar un mensaje<span class="sr-only"> a ${r.name}</span></button></div>
    </section>`;
  }

  T.views.students = (params = {}) => {
    const roster = T.roster();
    const sel = roster.find((r) => r.id === params.id) || roster.find((r) => r.id === T.state().selected) || roster[0];
    const online = TA.net.isOnline();
    return html`
      ${ui.pageHeader({ title: `Avance por estudiante · ${T.activeGroup().label}`, lead: 'Elige un estudiante para ver sus avances, dificultades y apoyos.', actions: T.freshness() })}
      <div class="cluster"><a class="btn btn--secondary" href="#/grupo">${icon('left',18)}Volver al grupo</a></div>
      <div class="grid grid--split">
        <nav class="card" aria-labelledby="roster-t">
          <div class="card__head"><h2 class="card__title" id="roster-t">${icon('users', 20)}<span>Estudiantes de muestra (${roster.length} de ${T.activeGroup().size})</span></h2></div>
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
    if (to === 'group') return `todo el grupo ${T.activeGroup().label}`;
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
    'choose-group':(el,e)=>{e.preventDefault();T.state().activeGroup=el.dataset.id;T.state().selected=T.roster()[0]?.id||'x';TA.save();TA.go('/grupo');},
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
    'teacher-group':(el)=>{T.state().activeGroup=el.value;T.state().selected=T.roster()[0]?.id||'x';TA.save();TA.go('/grupo');},
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
