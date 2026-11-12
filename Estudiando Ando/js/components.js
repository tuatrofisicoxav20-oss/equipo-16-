/* =========================================================
   Tecu Aprende · componentes de interfaz reutilizables
   Cada función devuelve HTML seguro (TA.html) y no modifica
   el estado: solo lo lee. Así la interfaz es predecible.
   ========================================================= */
(function (TA) {
  'use strict';

  const { html, icon, data } = TA;
  const C = (TA.ui = {});

  /* ---------- Conexión ---------- */

  /** Texto e icono del estado de conexión actual. */
  C.netInfo = () => {
    const s = TA.net.status();
    if (s === 'online') return { icon: 'wifi', label: 'Con internet', tone: 'ok' };
    if (s === 'local') return { icon: 'phone', label: 'Modo local', tone: 'warn' };
    return { icon: 'wifi-off', label: 'Sin internet', tone: 'warn' };
  };

  /** Botón de estado de conexión: siempre visible (Nielsen 1: visibilidad del estado). */
  C.netButton = () => {
    const n = C.netInfo();
    return html`<button type="button" class="chip chip--${n.tone}" data-action="open-connection" aria-haspopup="dialog">
      ${icon(n.icon, 18)}<span>${n.label}</span><span class="sr-only">. Abrir opciones de conexión</span></button>`;
  };

  /** Aviso contextual de conexión con lo que funciona y lo que no. */
  C.netBanner = (context = 'student') => {
    const s = TA.net.status();
    if (s === 'online') {
      const text = context === 'teacher'
        ? 'Datos casi en vivo. Puedes pedir recomendaciones a la IA y enviar retroalimentación al instante.'
        : 'Tecu puede conversar contigo y guiarte con preguntas y pistas. Tu avance se guarda al momento.';
      return html`<div class="banner banner--ok" role="note">${icon('wifi', 22)}<div><p class="banner__title">Con internet</p><p>${text}</p></div></div>`;
    }
    const pending = TA.sync.pendingCount();
    const why = s === 'local' ? 'Elegiste el modo local para no gastar datos.' : 'No hay conexión en este momento.';
    const text = context === 'teacher'
      ? `${why} Ves la última sincronización (hoy, 7:20 a. m.). Tus mensajes se enviarán al conectarte.`
      : `${why} Tu lección descargada, las pistas y los ejercicios siguen funcionando. ${pending ? `Tienes ${TA.util.plural(pending, 'elemento', 'elementos')} por sincronizar.` : ''}`;
    return html`<div class="banner banner--warn" role="note">${icon(s === 'local' ? 'phone' : 'wifi-off', 22)}<div>
      <p class="banner__title">${s === 'local' ? 'Modo local' : 'Sin internet'}</p><p>${text}</p>
      ${context === 'student' ? html`<p class="banner__actions"><a class="link" href="#/descargas">Ver lo descargado</a></p>` : ''}
    </div></div>`;
  };

  /* ---------- Estructura de página ---------- */

  /** Encabezado de página con el único h1 (WCAG 2.4.6 y 1.3.1). */
  C.pageHeader = ({ title, lead = '', actions = '', back = null, eyebrow = '' }) => html`
    <header class="page-head">
      ${back ? html`<a class="back-link" href="${back.href}">${icon('left', 18)}${back.label}</a>` : ''}
      <div class="page-head__row">
        <div class="page-head__text">
          ${eyebrow ? html`<p class="eyebrow">${eyebrow}</p>` : ''}
          <h1 id="page-title" tabindex="-1">${title}</h1>
          ${lead ? html`<p class="lead">${lead}</p>` : ''}
        </div>
        ${actions ? html`<div class="page-head__actions">${actions}</div>` : ''}
      </div>
    </header>`;

  /** Tarjeta con encabezado opcional. `id` permite enlazarla con aria-labelledby. */
  C.card = ({ id, title, titleIcon, aside = '', body, tone = '', level = 2, className = '' }) => {
    const hid = id ? `${id}-t` : null;
    const idAttr = TA.attr(hid, `id="${hid}"`);
    const inner = html`${titleIcon ? icon(titleIcon, 20) : ''}<span>${title}</span>`;
    const heading = title
      ? html`<div class="card__head">${level === 3
        ? html`<h3 class="card__title"${idAttr}>${inner}</h3>`
        : html`<h2 class="card__title"${idAttr}>${inner}</h2>`}${aside}</div>`
      : '';
    return html`<section class="card${tone ? ` card--${tone}` : ''}${className ? ` ${className}` : ''}"${TA.attr(hid, `aria-labelledby="${hid}"`)}>${heading}${body}</section>`;
  };

  /* ---------- Insignias de estado (siempre con texto, nunca solo color) ---------- */
  C.badge = (text, tone = 'neutral', iconName = null) =>
    html`<span class="badge badge--${tone}">${iconName ? icon(iconName, 14) : ''}${text}</span>`;

  C.levelBadge = (value) => {
    const lv = data.levelOf(value);
    const map = { ok: ['ok', 'check'], mid: ['info', 'trend'], low: ['warn', 'alert'], none: ['neutral', null] };
    return C.badge(lv.label, map[lv.id][0], map[lv.id][1]);
  };

  /* ---------- Barras de dominio ----------
     El porcentaje y el nivel se muestran como texto; la barra es
     un apoyo visual (aria-hidden) para no duplicar la lectura. */
  C.masteryBars = (values, { note = null } = {}) => html`
    <ul class="bars" role="list">
      ${data.skills.map((sk, i) => {
        const v = values[i];
        const lv = data.levelOf(v);
        return html`<li class="bars__item">
          <div class="bars__row"><span class="bars__label">${sk.name}</span><span class="bars__value">${v == null ? 'Sin datos' : `${v} %`}</span></div>
          <div class="bar bar--${lv.id}" aria-hidden="true"><span style="--w:${v || 0}%"></span></div>
          <div class="bars__meta">${C.levelBadge(v)}${note ? note(i) : ''}</div>
        </li>`;
      })}
    </ul>`;

  /** Barra simple de progreso con texto visible. */
  C.progress = (pct, label) => html`
    <div class="progress">
      <div class="progress__row"><span>${label}</span><span class="tabnum">${pct} %</span></div>
      <div class="bar bar--brand" aria-hidden="true"><span style="--w:${pct}%"></span></div>
    </div>`;

  /* ---------- Gráficas (SVG con descripción textual) ---------- */
  C.weekChart = (minutes) => {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const max = Math.max(50, ...minutes);
    const w = 300; const h = 132; const bw = 26; const gap = (w - bw * 7) / 6;
    const desc = `Minutos de estudio por día: ${minutes.map((m, i) => `${days[i].toLowerCase()} ${m}`).join(', ')}.`;
    const bars = minutes.map((v, i) => {
      const bh = Math.max(3, (v / max) * 88);
      const x = i * (bw + gap); const y = 100 - bh;
      const cls = v === 0 ? 'chart__bar--empty' : i === 6 ? 'chart__bar--today' : 'chart__bar';
      return `<rect class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" rx="6"/>
        <text class="chart__axis" x="${(x + bw / 2).toFixed(1)}" y="122" text-anchor="middle">${days[i][0]}</text>
        ${v ? `<text class="chart__val" x="${(x + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${v}</text>` : ''}`;
    }).join('');
    return html`<figure class="chart">
      <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${desc}">${TA.raw(bars)}</svg>
      <figcaption class="muted small">Total: ${minutes.reduce((a, b) => a + b, 0)} minutos. El domingo (hoy) aparece en verde.</figcaption>
    </figure>`;
  };

  C.ring = (pct, text, label) => {
    const r = 26; const c = 2 * Math.PI * r;
    return html`<div class="ring" role="img" aria-label="${label}">
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle class="ring__track" cx="32" cy="32" r="${r}"/><circle class="ring__fill" cx="32" cy="32" r="${r}" stroke-dasharray="${((c * pct) / 100).toFixed(1)} ${c.toFixed(1)}"/></svg>
      <span aria-hidden="true">${text}</span></div>`;
  };

  C.beforeAfter = (before, after, label) => html`
    <figure class="compare">
      <figcaption class="compare__title">${label}</figcaption>
      <div class="compare__row"><span>Antes</span><div class="bar bar--warn" aria-hidden="true"><span style="--w:${before}%"></span></div><b class="tabnum">${before} %</b></div>
      <div class="compare__row"><span>Después</span><div class="bar bar--ok" aria-hidden="true"><span style="--w:${after}%"></span></div><b class="tabnum">${after} %</b></div>
      <p class="small muted">${after > before ? `Mejora de ${after - before} puntos.` : 'Sin mejora todavía.'}</p>
    </figure>`;

  /* ---------- Ruta de aprendizaje ---------- */
  C.routeList = (route) => html`
    <ol class="route">
      ${route.map((step) => {
        const ic = step.status === 'done' ? icon('check', 16) : step.status === 'now' ? icon('play', 14) : icon('lock', 14);
        return html`<li class="route__item route__item--${step.status}" ${step.status === 'now' ? TA.raw('aria-current="step"') : ''}>
          <span class="route__dot">${ic}</span>
          <div><p class="route__title">${step.title}</p><p class="route__detail">${step.detail}</p></div>
        </li>`;
      })}
    </ol>`;

  /** Ciclo pedagógico: Diagnosticar → … → Reajustar. */
  C.cycle = (current = -1) => html`
    <ol class="cycle" aria-label="Ciclo de aprendizaje adaptativo">
      ${data.cycle.map((name, i) => html`<li class="cycle__item ${i === current ? 'is-now' : i < current ? 'is-done' : ''}" ${i === current ? TA.raw('aria-current="step"') : ''}>
        <span class="cycle__n" aria-hidden="true">${i < current ? icon('check', 14) : i + 1}</span>${name}${i === current ? html`<span class="sr-only"> (paso actual)</span>` : ''}</li>`)}
    </ol>`;

  /* ---------- Mapa de aprendizaje (tabla de datos accesible) ---------- */
  const cellIcon = { ok: 'check', mid: 'trend', low: 'alert', none: null };
  C.heatCell = (v) => {
    const lv = data.levelOf(v);
    return html`<span class="heat__cell heat__cell--${lv.id}">${cellIcon[lv.id] ? icon(cellIcon[lv.id], 15) : ''}<span>${v == null ? '–' : v}</span><span class="sr-only"> ${v == null ? '' : '%,'} ${lv.label}</span></span>`;
  };

  C.heatmap = (rows, { stale = false } = {}) => html`
    <div class="table-wrap" role="region" aria-labelledby="heat-cap" tabindex="0">
      <table class="heat">
        <caption id="heat-cap" class="sr-only">Mapa de aprendizaje: porcentaje de dominio por estudiante y habilidad</caption>
        <thead><tr><th scope="col">Estudiante</th>${data.skills.map((s) => html`<th scope="col"><abbr title="${s.name}">${s.short}</abbr><span class="sr-only">: ${s.name}</span></th>`)}</tr></thead>
        <tbody>
          ${rows.map((r) => html`<tr>
            <th scope="row"><a class="link" href="#/alumnos/${r.id}">${r.name}</a>${stale && r.unsynced ? html` ${C.badge('Sin sincronizar', 'neutral', 'clock')}` : ''}</th>
            ${r.mastery.map((v) => html`<td>${C.heatCell(v)}</td>`)}
          </tr>`)}
        </tbody>
      </table>
    </div>
    <ul class="legend" aria-label="Leyenda del mapa">
      ${['ok', 'mid', 'low', 'none'].map((id) => {
        const lv = data.levels.find((l) => l.id === id);
        return html`<li><span class="heat__cell heat__cell--${id} heat__cell--sm" aria-hidden="true">${cellIcon[id] ? icon(cellIcon[id], 14) : '–'}</span>${lv.label}${id === 'ok' ? ' (70 % o más)' : id === 'mid' ? ' (45 a 69 %)' : id === 'low' ? ' (menos de 45 %)' : ''}</li>`;
      })}
    </ul>`;

  /* ---------- Formularios ---------- */

  /** Interruptor accesible (checkbox con role="switch"). */
  C.switchField = ({ id, label, hint = '', checked = false, action = 'toggle', key = '', disabled = false }) => html`
    <div class="switch">
      <label class="switch__label" for="${id}"><span class="switch__text">${label}</span>${hint ? html`<span class="switch__hint" id="${id}-h">${hint}</span>` : ''}</label>
      <input class="switch__input" type="checkbox" role="switch" id="${id}" data-change="${action}" data-key="${key}" ${checked ? TA.raw('checked') : ''} ${disabled ? TA.raw('disabled') : ''} ${hint ? TA.raw(`aria-describedby="${id}-h"`) : ''}>
    </div>`;

  /**
   * Control segmentado accesible: grupo de radios nativos
   * (flechas del teclado incluidas) con apariencia de botones.
   */
  C.segmented = ({ name, legend, options, value, action, hideLegend = false }) => html`
    <fieldset class="segmented">
      <legend class="${hideLegend ? 'sr-only' : 'segmented__legend'}">${legend}</legend>
      <div class="segmented__options">
        ${options.map((o) => html`<label class="segmented__opt">
          <input type="radio" name="${name}" id="${name}-${o.value}" value="${o.value}" data-change="${action}" ${o.value === value ? TA.raw('checked') : ''}>
          <span>${o.icon ? icon(o.icon, 18) : ''}${o.label}</span></label>`)}
      </div>
    </fieldset>`;

  /** Mensaje de error de campo (WCAG 3.3.1 y 3.3.3). */
  C.fieldError = (id, message) => html`<p class="field__error" id="${id}" ${message ? '' : TA.raw('hidden')}>${icon('alert', 16)}<span>${message || ''}</span></p>`;

  /* ---------- Varios ---------- */
  C.speakButton = (targetId, label = 'Escuchar') => (TA.state.prefs.voice
    ? html`<button type="button" class="btn btn--ghost btn--sm" data-action="speak" data-id="${targetId}">${icon('volume', 18)}${label}</button>`
    : '');

  C.emptyState = ({ title, text, action = '' }) => html`
    <div class="empty">${TA.mascot({ mood: 'think', size: 72, face: true })}<h2>${title}</h2><p>${text}</p>${action}</div>`;

  C.avatar = (name, size = 'md') => html`<span class="avatar avatar--${size}" aria-hidden="true">${name.trim()[0]}</span>`;
})(window.TA);
