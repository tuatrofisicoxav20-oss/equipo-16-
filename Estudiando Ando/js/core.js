/* =========================================================
   Tecu Aprende · núcleo
   Utilidades compartidas: plantillas seguras, iconos, mascota,
   almacenamiento, avisos, diálogo modal y lectura en voz alta.
   Todos los módulos cuelgan del espacio de nombres global `TA`.
   ========================================================= */
(function (global) {
  'use strict';

  const TA = (global.TA = global.TA || {});

  /* ---------------------------------------------------------
     Plantillas HTML seguras
     `html` escapa cada valor interpolado salvo que sea HTML
     marcado como confiable (otra plantilla `html` o `raw`).
     Así ningún texto escrito por la persona usuaria se
     interpreta como código (previene XSS).
     --------------------------------------------------------- */
  class SafeHTML {
    constructor(value) { this.value = value; }
    toString() { return this.value; }
  }

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

  function toHTML(value) {
    if (value == null || value === false) return '';
    if (value instanceof SafeHTML) return value.value;
    if (Array.isArray(value)) return value.map(toHTML).join('');
    return esc(value);
  }

  /** Plantilla etiquetada: html`<p>${texto}</p>` */
  function html(strings, ...values) {
    let out = strings[0];
    values.forEach((v, i) => { out += toHTML(v) + strings[i + 1]; });
    return new SafeHTML(out);
  }

  /** Marca como confiable un HTML estático escrito por el equipo (nunca datos de la persona usuaria). */
  const raw = (value) => new SafeHTML(String(value ?? ''));

  /** Quita etiquetas para obtener texto plano (lectura en voz alta, etiquetas ARIA). */
  const plain = (value) => String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  /** Atributo condicional: attr(estaActivo, 'aria-current="page"') */
  const attr = (condition, attribute) => (condition ? raw(` ${attribute}`) : '');

  Object.assign(TA, { html, raw, esc, plain, attr, SafeHTML });

  /* Registros de manejadores por módulo (delegación de eventos en app.js):
     · actions: clics en [data-action]
     · changes: cambios en [data-change]
     · submits: envíos de formularios [data-submit] */
  TA.actions = {};
  TA.changes = {};
  TA.submits = {};

  /* ---------------------------------------------------------
     Iconos (trazos SVG en línea, siempre decorativos)
     --------------------------------------------------------- */
  const ICONS = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z"/><path d="M20 17v4H6.5A2.5 2.5 0 0 1 4 18.5"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
    download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a5 5 0 0 1 5 5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M2 9a14 14 0 0 1 20 0"/><circle cx="12" cy="19.2" r=".6"/>',
    'wifi-off': '<path d="m3 3 18 18"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 3-2"/><path d="M19 12.5a10 10 0 0 0-3-2"/><circle cx="12" cy="19.2" r=".6"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    play: '<path d="M7 4v16l13-8Z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    send: '<path d="m22 2-11 11"/><path d="M22 2 15 22l-4-9-9-4Z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3Z"/>',
    flame: '<path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-10Z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
    monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4Z"/><path d="M10 21h4"/>',
    chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sync: '<path d="M20 11a8 8 0 0 0-14-4L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14 4l2-2"/><path d="M20 20v-5h-5"/>',
    shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6Z"/><path d="m9 12 2 2 4-4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    alert: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 17v4"/><path d="M17 19h4"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-15 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
    pen: '<path d="M4 20l1-4L17 4l3 3L8 19Z"/><path d="m14 7 3 3"/>',
    landmark: '<path d="M3 21h18"/><path d="M5 21V10"/><path d="M10 21V10"/><path d="M14 21V10"/><path d="M19 21V10"/><path d="m2 10 10-6 10 6Z"/>',
    access: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5 12 10l7-1.5"/><path d="M12 10v4.5"/><path d="m9 21 3-6.5 3 6.5"/>',
    volume: '<path d="M4 9v6h4l5 4V5L8 9Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17h.01"/>',
    route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };

  /** Icono decorativo. Su significado siempre se acompaña de texto visible o accesible. */
  const icon = (name, size = 20) => raw(
    `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`
  );

  /* ---------------------------------------------------------
     Mascota: Tecu, el tecolote tutor (ilustración decorativa)
     --------------------------------------------------------- */
  function mascot({ mood = 'happy', size = 96, face = false, local = false, float = false } = {}) {
    const D = '#0B2F45';
    const eyes = {
      happy: `<circle cx="44" cy="60" r="7" fill="${D}"/><circle cx="76" cy="60" r="7" fill="${D}"/><circle cx="46.6" cy="57.4" r="2.4" fill="#fff"/><circle cx="78.6" cy="57.4" r="2.4" fill="#fff"/>`,
      think: `<circle cx="41" cy="56" r="7" fill="${D}"/><circle cx="73" cy="56" r="7" fill="${D}"/><circle cx="43.4" cy="53.6" r="2.4" fill="#fff"/><circle cx="75.4" cy="53.6" r="2.4" fill="#fff"/><path d="M33 44l15 3M87 44l-15 3" stroke="${D}" stroke-width="3" stroke-linecap="round"/>`,
      cheer: `<path d="M37 63q7-10 14 0M69 63q7-10 14 0" stroke="${D}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M100 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#F2B134"/>`
    }[mood] || '';
    const bx = face ? 94 : 95;
    const by = face ? 82 : 112;
    const br = face ? 12 : 15;
    const bs = face ? 0.57 : 0.71;
    const badge = local
      ? `<circle cx="${bx}" cy="${by}" r="${br}" fill="#fff" stroke="${D}" stroke-width="2.4"/><g transform="translate(${(bx - 12 * bs).toFixed(1)} ${(by - 12 * bs).toFixed(1)}) scale(${bs})" fill="none" stroke="${D}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></g>`
      : '';
    const viewBox = face ? '14 6 92 90' : '0 0 120 138';
    const height = Math.round(face ? (size * 90) / 92 : (size * 138) / 120);
    return raw(`<svg class="mascot${float ? ' mascot--float' : ''}${face ? ' mascot--face' : ''}" width="${size}" height="${height}" viewBox="${viewBox}" aria-hidden="true" focusable="false">
      <ellipse cx="46" cy="134" rx="13" ry="3.4" fill="#F2B134"/><ellipse cx="74" cy="134" rx="13" ry="3.4" fill="#F2B134"/>
      <path d="M60 22c-22 0-38 16-38 40v22c0 21 15 36 38 36s38-15 38-36V62c0-24-16-40-38-40Z" fill="#1F9C8C"/>
      <path d="M25 74c-9 10-8 30 5 42 3-15 3-30-5-42Z" fill="#157A6E"/><path d="M95 74c9 10 8 30-5 42-3-15-3-30 5-42Z" fill="#157A6E"/>
      <ellipse cx="60" cy="100" rx="24" ry="27" fill="#E1F3F0"/>
      <path d="M47 90q4.5 4 9 0M64 90q4.5 4 9 0M55 104q5 4.5 10 0M45 112q4.5 4 9 0M66 112q4.5 4 9 0" stroke="#1F9C8C" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="44" cy="59" r="17.5" fill="#fff"/><circle cx="76" cy="59" r="17.5" fill="#fff"/>
      ${eyes}
      <path d="M54 67l6 11 6-11Z" fill="#F2B134" stroke="#D8921A" stroke-width="1" stroke-linejoin="round"/>
      <path d="M28 27 60 12l32 15-32 15Z" fill="${D}"/><path d="M44 35v9c9 6 23 6 32 0v-9" fill="#0F3D5A"/>
      <path d="M92 27v16" stroke="#F2B134" stroke-width="2.6" stroke-linecap="round"/><circle cx="92" cy="45" r="3.6" fill="#F2B134"/>
      ${badge}
    </svg>`);
  }

  Object.assign(TA, { icon, mascot });

  /* ---------------------------------------------------------
     Almacenamiento local (puede no estar disponible:
     navegación privada, permisos bloqueados…)
     --------------------------------------------------------- */
  const PREFIX = 'tecu:';
  TA.store = {
    get(key, fallback) {
      try {
        const value = global.localStorage.getItem(PREFIX + key);
        return value == null ? fallback : JSON.parse(value);
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      try { global.localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (_) { /* sin almacenamiento: se trabaja en memoria */ }
    },
    keyFor: (key) => PREFIX + key,
    clear() {
      try {
        Object.keys(global.localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => global.localStorage.removeItem(k));
      } catch (_) { /* nada que limpiar */ }
    }
  };

  /* ---------------------------------------------------------
     Anuncios para lectores de pantalla (WCAG 4.1.3)
     --------------------------------------------------------- */
  let announceTimer;
  TA.announce = (message) => {
    const live = document.getElementById('live');
    if (!live || !message) return;
    live.textContent = '';
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { live.textContent = plain(message); }, 60);
  };

  /* ---------------------------------------------------------
     Avisos breves (toasts)
     · Se pausan al pasar el puntero o enfocarlos (WCAG 2.2.1).
     · Pueden incluir una acción, p. ej. «Deshacer» (Nielsen 3).
     --------------------------------------------------------- */
  TA.toast = (message, { tone = 'info', action = null, duration } = {}) => {
    const box = document.getElementById('toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = `toast toast--${tone}`;
    const iconName = { ok: 'check', warn: 'alert', info: 'info' }[tone] || 'info';
    el.innerHTML = String(html`
      <span class="toast__icon">${icon(iconName, 20)}</span>
      <p class="toast__msg">${message}</p>
      ${action ? html`<button type="button" class="btn btn--ghost-inverse btn--sm" data-toast-action>${action.label}</button>` : ''}
      <button type="button" class="icon-btn icon-btn--inverse" data-toast-close aria-label="Cerrar aviso">${icon('x', 18)}</button>`);
    box.appendChild(el);
    TA.announce(message);

    let remaining = duration || (action ? 10000 : 6000);
    let started = Date.now();
    let timer = setTimeout(close, remaining);
    const pause = () => { clearTimeout(timer); remaining -= Date.now() - started; };
    const resume = () => { started = Date.now(); clearTimeout(timer); timer = setTimeout(close, Math.max(remaining, 1500)); };

    function close() {
      clearTimeout(timer);
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 180);
    }

    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('focusin', pause);
    el.addEventListener('focusout', resume);
    el.querySelector('[data-toast-close]').addEventListener('click', close);
    if (action) {
      el.querySelector('[data-toast-action]').addEventListener('click', () => { close(); action.onClick(); });
    }
  };

  /* ---------------------------------------------------------
     Diálogo modal (elemento <dialog> nativo)
     · Atrapa el foco y se cierra con Esc.
     · Devuelve el foco al control que lo abrió (WCAG 2.4.3).
     --------------------------------------------------------- */
  const dialogState = { opener: null, onClose: null };

  TA.dialog = {
    open({ title, body, footer = '', size = 'md', onClose = null }) {
      const dlg = document.getElementById('dialog');
      dialogState.opener = TA.focus.keyOf(document.activeElement);
      dialogState.onClose = onClose;
      dlg.className = `dialog dialog--${size}`;
      dlg.innerHTML = String(html`
        <div class="dialog__inner">
          <header class="dialog__head">
            <h2 id="dialog-title" class="dialog__title">${title}</h2>
            <button type="button" class="icon-btn" data-dialog-close aria-label="Cerrar">${icon('x', 20)}</button>
          </header>
          <div class="dialog__body">${body}</div>
          ${footer ? html`<footer class="dialog__foot">${footer}</footer>` : ''}
        </div>`);
      if (!dlg.open) dlg.showModal();
      const first = dlg.querySelector('[autofocus], .dialog__body input:not([type=hidden]), .dialog__body select, .dialog__body textarea, .dialog__body button');
      (first || dlg.querySelector('[data-dialog-close]')).focus();
    },
    /** Reemplaza solo el cuerpo (cuando cambia el estado sin cerrar el diálogo). */
    update(body) {
      const dlg = document.getElementById('dialog');
      const key = TA.focus.keyOf(document.activeElement);
      const bodyEl = dlg.querySelector('.dialog__body');
      if (bodyEl) bodyEl.innerHTML = String(body);
      TA.focus.restore(key, dlg);
    },
    close() {
      const dlg = document.getElementById('dialog');
      if (dlg.open) dlg.close();
    },
    isOpen: () => document.getElementById('dialog').open
  };

  document.addEventListener('DOMContentLoaded', () => {
    const dlg = document.getElementById('dialog');
    dlg.addEventListener('click', (e) => {
      if (e.target.closest('[data-dialog-close]')) TA.dialog.close();
      else if (e.target === dlg) TA.dialog.close(); // clic en el fondo
    });
    dlg.addEventListener('close', () => {
      const cb = dialogState.onClose;
      dialogState.onClose = null;
      dlg.innerHTML = '';
      if (cb) cb();
      TA.focus.restore(dialogState.opener);
    });
  });

  /* ---------------------------------------------------------
     Gestión del foco
     Cada vez que se vuelve a dibujar la interfaz, el foco se
     restaura en el mismo control (WCAG 2.4.3 y 3.2.2).
     --------------------------------------------------------- */
  TA.focus = {
    /** Clave estable de un elemento: id o combinación de atributos data-. */
    keyOf(el) {
      if (!el || el === document.body) return null;
      if (el.dataset && el.dataset.fk) return `fk:${el.dataset.fk}`;
      if (el.id) return `id:${el.id}`;
      if (el.dataset && el.dataset.action) {
        return `act:${el.dataset.action}|${el.dataset.id || ''}|${el.dataset.value || ''}`;
      }
      if (el.getAttribute && el.getAttribute('href')) return `href:${el.getAttribute('href')}`;
      return null;
    },
    find(key, scope = document) {
      if (!key) return null;
      const [type, rest] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
      if (type === 'id') return scope.querySelector(`#${CSS.escape(rest)}`);
      if (type === 'fk') return scope.querySelector(`[data-fk="${CSS.escape(rest)}"]`);
      if (type === 'href') return scope.querySelector(`[href="${CSS.escape(rest)}"]`);
      if (type === 'act') {
        return Array.from(scope.querySelectorAll('[data-action]')).find((el) => TA.focus.keyOf(el) === key) || null;
      }
      return null;
    },
    restore(key, scope = document) {
      const el = TA.focus.find(key, scope);
      if (el && !el.disabled) {
        el.focus({ preventScroll: true });
        return true;
      }
      return false;
    },
    /** Enfoca un elemento o selector; útil tras cambiar de pantalla. */
    to(target, { scroll = true } = {}) {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) return;
      if (!el.matches('a, button, input, select, textarea, [tabindex]')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: !scroll });
    }
  };

  /* ---------------------------------------------------------
     Lectura en voz alta (Web Speech API)
     --------------------------------------------------------- */
  const synth = global.speechSynthesis;
  TA.speech = {
    supported: Boolean(synth && global.SpeechSynthesisUtterance),
    speaking: false,
    speak(text, rate = 1) {
      if (!this.supported) {
        TA.toast('Tu navegador no permite la lectura en voz alta.', { tone: 'warn' });
        return;
      }
      synth.cancel();
      const utter = new global.SpeechSynthesisUtterance(plain(text));
      utter.lang = 'es-MX';
      utter.rate = rate;
      const voice = synth.getVoices().find((v) => v.lang === 'es-MX') || synth.getVoices().find((v) => v.lang.startsWith('es'));
      if (voice) utter.voice = voice;
      utter.onend = utter.onerror = () => { this.speaking = false; document.dispatchEvent(new CustomEvent('ta:speech')); };
      this.speaking = true;
      synth.speak(utter);
      document.dispatchEvent(new CustomEvent('ta:speech'));
    },
    stop() {
      if (this.supported) synth.cancel();
      this.speaking = false;
      document.dispatchEvent(new CustomEvent('ta:speech'));
    }
  };

  /* ---------------------------------------------------------
     Utilidades varias
     --------------------------------------------------------- */
  TA.util = {
    clamp: (n, min, max) => Math.min(max, Math.max(min, n)),
    avg: (list) => {
      const vals = list.filter((v) => v != null);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    },
    uid: () => Math.random().toString(36).slice(2, 9),
    time: (date = new Date()) => date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }),
    /** Normaliza una respuesta numérica escrita: «− 3», «x=−3», «-3.0» → -3 */
    parseNumber(text) {
      const clean = String(text).replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(/^x=/i, '').replace(',', '.');
      if (!/^-?\d+(\.\d+)?$/.test(clean)) return null;
      return Number(clean);
    },
    plural: (n, one, many) => `${n} ${n === 1 ? one : many}`
  };
})(window);
