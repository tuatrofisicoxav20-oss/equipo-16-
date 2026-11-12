/* =========================================================
   EstudiandoAndo · aplicación
   Estado, persistencia, conexión, enrutador por hash,
   estructura de la página, ajustes de accesibilidad y
   delegación de eventos.
   ========================================================= */
(function (TA) {
  'use strict';

  const { html, icon, mascot, attr, data, ui } = TA;
  const STORE_KEY = 'state-v2';

  /* =========================================================
     Estado
     ========================================================= */
  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  const DEFAULT_PREFS = {
    theme: 'system', // system | light | dark | contrast
    text: 'md', // md | lg | xl | xxl
    spacing: false, // espaciado de texto amplio (WCAG 1.4.12)
    motion: 'system', // system | reduce
    simple: true, // vista sencilla activada por defecto
    voice: false, // botones de lectura en voz alta
    saver: true,
    wifiOnly: true,
    device: 'auto' // auto | mobile | desktop: vista de la demostración
  };

  function studentProgress(id) {
    const st = data.students[id];
    return {
      mastery: st.mastery.slice(),
      diagnostic: { answers: null, at: null },
      check: null,
      hints: 1,
      solutionShown: false,
      guideStep: 1,
      chat: st.chat.map((m) => ({ id: TA.util.uid(), status: 'sent', ...m })),
      format: 'steps',
      packages: Object.fromEntries(data.packages.map((p) => [p.id, p.status])),
      plan: { level: 'Secundaria', grade: '1.º', school: 'Secundaria de ejemplo · Xalapa, Ver.' },
      pendingSync: 0
    };
  }

  function defaultState() {
    return {
      role: 'student',
      studentId: 'x',
      simulateOffline: false,
      dataMode: 'auto', // auto | local
      prefs: clone(DEFAULT_PREFS),
      progress: { x: studentProgress('x'), d: studentProgress('d') },
      teacher: {
        alerts: Object.fromEntries(data.alerts.map((a) => [a.id, { status: 'new', suggestion: null }])),
        outbox: clone(data.teacherMessages),
        privacy: { own: true, labels: true, review: true },
        plan: { ps1: true, ps2: true, ps3: false },
        onlyAttention: false,
        alertFilter: 'new',
        selected: 'x',
        activeGroup: '1b',
        aiLoading: false
      }
    };
  }

  /** Estado persistente + estado efímero de interfaz (no se guarda). */
  function loadState() {
    const base = defaultState();
    const saved = TA.store.get(STORE_KEY, null);
    if (saved && typeof saved === 'object') {
      Object.assign(base, saved);
      base.prefs = { ...DEFAULT_PREFS, ...(saved.prefs || {}) };
      base.teacher = { ...defaultState().teacher, ...(saved.teacher || {}), aiLoading: false };
    }
    base.realOnline = navigator.onLine !== false;
    base.ui = { visualStep: 0, balanceStep: 0, typing: false, demoOpen: false, firstRender: true };
    base.drafts = { diagnostic: {}, check: {}, chatError: '' };
    return base;
  }

  TA.state = loadState();

  TA.save = () => {
    const { role, studentId, simulateOffline, dataMode, prefs, progress, teacher } = TA.state;
    TA.store.set(STORE_KEY, { role, studentId, simulateOffline, dataMode, prefs, progress, teacher });
    // Mantener la vista previa sincronizada incluso cuando file:// bloquea localStorage.
    if (window.self !== window.top) {
      window.parent.postMessage({ type: 'estudiando-ando:state', state: { role, studentId, simulateOffline, dataMode, prefs, progress, teacher } }, '*');
    }
  };

  TA.prefersReducedMotion = () => TA.state.prefs.motion === 'reduce'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Copia en memoria lo que otra ventana o el marco de vista previa guardó. */
  function syncFromStorage() {
    const fresh = loadState();
    ['role', 'studentId', 'simulateOffline', 'dataMode', 'prefs', 'progress', 'teacher'].forEach((k) => { TA.state[k] = fresh[k]; });
  }

  /* =========================================================
     Vista: automática, móvil o escritorio
     - Automática: se adapta a la pantalla real (por defecto).
     - Móvil en pantalla ancha: la app se muestra dentro de un
       marco de teléfono (iframe de 390 px), así se comporta
       exactamente como en un celular.
     - Escritorio en pantalla angosta: en teléfonos y tabletas
       se amplía el viewport (como «ver versión de escritorio»);
       en una ventana angosta de computadora se muestra reducida.
     ========================================================= */
  const EMBEDDED = (() => { try { return window.self !== window.top; } catch (_) { return true; } })();
  const DESKTOP_WIDTH = 1280;
  const mq = {
    phoneFits: window.matchMedia('(min-width: 30em)'),
    desktop: window.matchMedia('(min-width: 60em)'),
    coarse: window.matchMedia('(pointer: coarse)')
  };
  const VIEW_TEXT = {
    auto: 'Vista automática: se adapta al tamaño de tu pantalla.',
    mobile: 'Vista móvil activada.',
    desktop: 'Vista web activada.'
  };
  const msgOrigin = () => (window.location.protocol === 'file:' || window.location.origin === 'null' ? '*' : window.location.origin);

  /** App adaptable, teléfono enmarcado o web enmarcada en la misma página. */
  function viewMode() {
    if (EMBEDDED || TA.state.prefs.device === 'auto') return 'app';
    if (TA.state.prefs.device === 'mobile') return mq.phoneFits.matches ? 'phone' : 'app';
    return 'desktop';
  }

  // Nunca alterar meta viewport: mantiene zoom y accesibilidad en un teléfono real.
  function applyViewport() {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta && meta.content !== 'width=device-width, initial-scale=1, viewport-fit=cover')
      meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
  }

  // En HTML independiente se genera una vista previa autónoma usando srcdoc.
  // Así el marco puede abrirse sin HTTP y sin solicitar una segunda página.
  const STANDALONE = document.documentElement.hasAttribute('data-standalone');
  let standaloneDocument = '';

  const viewControl = () => (EMBEDDED ? '' : ui.segmented({
    name: 'device',
    legend: 'Vista',
    action: 'device',
    value: TA.state.prefs.device,
    options: [
      { value: 'auto', label: 'Automática', icon: 'compass' },
      { value: 'mobile', label: 'Móvil', icon: 'phone' },
      { value: 'desktop', label: 'Web', icon: 'monitor' }
    ]
  }));

  /* =========================================================
     Conexión y sincronización
     ========================================================= */
  TA.net = {
    /** online · offline (sin conexión real o simulada) · local (elegido por la persona) */
    status() {
      const s = TA.state;
      if (!s.realOnline || s.simulateOffline) return 'offline';
      if (s.dataMode === 'local') return 'local';
      return 'online';
    },
    isOnline: () => TA.net.status() === 'online'
  };

  TA.sync = {
    pendingItems() {
      const items = [];
      if (TA.state.role === 'teacher') {
        const n = TA.state.teacher.outbox.filter((m) => m.status === 'queued').length;
        if (n) items.push({ n, icon: 'send', label: `${TA.util.plural(n, 'mensaje', 'mensajes')} para tus estudiantes` });
        return items;
      }
      const p = TA.student.progress();
      const q = p.chat.filter((m) => m.status === 'queued').length;
      if (q) items.push({ n: q, icon: 'chat', label: `${TA.util.plural(q, 'pregunta', 'preguntas')} para EstudiandoAndo` });
      if (p.pendingSync) items.push({ n: p.pendingSync, icon: 'check', label: `${TA.util.plural(p.pendingSync, 'resultado guardado', 'resultados guardados')} en tu equipo` });
      return items;
    },
    pendingCount: () => TA.sync.pendingItems().reduce((total, it) => total + it.n, 0),
    /** Envía lo pendiente. `auto` indica que se disparó al recuperar la conexión. */
    run({ auto = false } = {}) {
      if (!TA.net.isOnline()) return;
      const answered = TA.student.flushQueue();
      const sent = TA.teacher.flushOutbox();
      TA.save();
      TA.render();
      const parts = [];
      if (answered) parts.push(`EstudiandoAndo respondió ${TA.util.plural(answered, 'pregunta guardada', 'preguntas guardadas')}`);
      if (sent) parts.push(`se ${sent === 1 ? 'envió' : 'enviaron'} ${TA.util.plural(sent, 'mensaje', 'mensajes')}`);
      if (parts.length) TA.toast(`Sincronizado: ${parts.join(' y ')}.`, { tone: 'ok' });
      else if (!auto) TA.toast('Sin elementos pendientes en esta demostración.', { tone: 'ok' });
    }
  };

  /** Aplica un cambio que afecta la conexión y sincroniza si se recuperó. */
  function changeNetwork(mutator) {
    const was = TA.net.isOnline();
    mutator();
    const now = TA.net.isOnline();
    TA.save();
    TA.render();
    if (TA.dialog.isOpen() && document.getElementById('conn-panel')) TA.dialog.update(connectionPanel());
    if (!was && now) {
      TA.toast('Conexión recuperada. Actualizando la demostración local…', { tone: 'ok', duration: 3000 });
      setTimeout(() => TA.sync.run({ auto: true }), 400);
    } else if (was && !now) {
      TA.toast(TA.net.status() === 'local' ? 'Modo local activado: no se usarán datos.' : 'Sin internet. Sigues trabajando con lo descargado.', { tone: 'warn' });
    }
  }

  /* =========================================================
     Enrutador (hash): permite usar «Atrás» del navegador,
     guardar enlaces y compartir pantallas (Nielsen 3).
     ========================================================= */
  const ROUTES = {
    '/inicio': { role: 'student', nav: 'inicio', title: 'Inicio', view: () => TA.student.views.home() },
    '/aprender': { role: 'student', nav: 'aprender', title: 'Aprender', view: () => TA.student.views.learn() },
    '/visual': { role: 'student', nav: 'aprender', title: 'Aprender con dibujos', view: () => TA.visual.view() },
    '/diagnostico': { role: 'student', nav: 'aprender', title: 'Preguntas para empezar', view: () => TA.student.views.diagnostic() },
    '/tutor': { role: 'student', nav: 'tutor', title: 'Tu tutor', view: () => TA.student.views.tutor() },
    '/comprobar': { role: 'student', nav: 'aprender', title: 'Comprueba lo aprendido', view: () => TA.student.views.check() },
    '/progreso': { role: 'student', nav: 'progreso', title: 'Mi progreso', view: () => TA.student.views.progress() },
    '/descargas': { role: 'student', nav: 'descargas', title: 'Estudiar sin internet', view: () => TA.student.views.downloads() },
    '/grupo': { role: 'teacher', nav: 'grupo', title: 'Grupo', view: () => TA.teacher.views.group() },
    '/alertas': { role: 'teacher', nav: 'alertas', title: 'Alertas', view: () => TA.teacher.views.alerts() },
    '/alumnos': { role: 'teacher', nav: 'alumnos', title: 'Avance de cada estudiante', view: (p) => TA.teacher.views.students(p) },
    '/planeacion': { role: 'teacher', nav: 'planeacion', title: 'Planeación', view: () => TA.teacher.views.plan() },
    '/datos': { role: 'teacher', nav: 'datos', title: 'Conexión y datos', view: () => TA.teacher.views.data() },
    '/acerca': { role: null, nav: null, title: 'Acerca del proyecto', view: () => TA.about.view() }
  };

  const HOME = { student: '/inicio', teacher: '/grupo' };

  const NAV = {
    student: [
      { id: 'inicio', href: '#/inicio', icon: 'home', label: 'Inicio' },
      { id: 'aprender', href: '#/aprender', icon: 'book', label: 'Aprender' },
      { id: 'tutor', href: '#/tutor', icon: 'chat', label: 'Tutor' },
      { id: 'progreso', href: '#/progreso', icon: 'chart', label: 'Mi avance' },
      { id: 'descargas', href: '#/descargas', icon: 'download', label: 'Sin Wi-Fi' }
    ],
    teacher: [
      { id: 'grupo', href: '#/grupo', icon: 'grid', label: 'Grupo' },
      { id: 'alertas', href: '#/alertas', icon: 'flag', label: 'Apoyos' },
      { id: 'alumnos', href: '#/alumnos', icon: 'users', label: 'Estudiantes' },
      { id: 'planeacion', href: '#/planeacion', icon: 'calendar', label: 'Mi clase' },
      { id: 'datos', href: '#/datos', icon: 'shield', label: 'Datos' }
    ]
  };

  /** Ruta actual a partir del hash: «#/alumnos/x#seccion» → { path, params, anchor } */
  TA.route = () => {
    const hash = window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : HOME[TA.state.role];
    const [pathPart, anchor = ''] = hash.split('#');
    const segments = pathPart.split('/').filter(Boolean);
    const path = `/${segments[0] || ''}`;
    const def = ROUTES[path];
    if (!def) return { path, view: 'notfound', title: 'Página no encontrada', nav: null, render: notFound, params: {}, anchor };
    const params = segments[1] ? { id: segments[1] } : {};
    const view = { '/inicio': 'home', '/tutor': 'tutor', '/planeacion': 'plan' }[path] || path.slice(1);
    return { path, view, title: def.title, nav: def.nav, role: def.role, render: () => def.view(params), params, anchor };
  };

  TA.go = (path) => {
    if (window.location.hash === `#${path}`) onRoute();
    else window.location.hash = path;
  };

  const notFound = () => html`
    ${ui.pageHeader({ title: 'No encontramos esta página' })}
    ${ui.emptyState({ title: 'La dirección no existe o cambió', text: 'Puedes volver al inicio o usar el menú de navegación.', action: html`<a class="btn btn--primary" href="#${HOME[TA.state.role]}">${icon('home', 18)}Ir al inicio</a>` })}`;

  /* =========================================================
     Estructura de la página
     ========================================================= */
  function header() {
    const isT = TA.state.role === 'teacher';
    const voice = TA.state.prefs.voice;
    return html`<header class="topbar" role="banner">
      <a class="brand" href="#${HOME[TA.state.role]}">
        <span class="brand__mark">${mascot({ size: 30, face: true })}</span>
        <span class="brand__text">EstudiandoAndo<span class="brand__sub">${isT ? 'Módulo docente' : 'Módulo del estudiante'}</span></span>
      </a>
      <div class="topbar__actions">
        ${ui.netButton()}
        ${voice ? readPageButton() : ''}
        <button type="button" class="btn btn--ghost-inverse btn--icon-label" data-action="open-a11y" aria-haspopup="dialog">${icon('access', 20)}<span class="hide-sm">Accesibilidad</span><span class="sr-only show-sm">Accesibilidad</span></button>
      </div>
    </header>`;
  }

  function readPageButton() {
    const speaking = TA.speech.speaking;
    return html`<button type="button" class="btn btn--ghost-inverse btn--icon-label" data-action="read-page" aria-pressed="${speaking}">${icon(speaking ? 'stop' : 'volume', 20)}<span class="hide-sm">${speaking ? 'Detener lectura' : 'Leer página'}</span><span class="sr-only show-sm">${speaking ? 'Detener lectura' : 'Leer página en voz alta'}</span></button>`;
  }

  /** Barra de acceso directo: vistas y modo sin Wi-Fi a un solo clic. */
  function quickBar() {
    const d = TA.state.prefs.device;
    const off = !TA.net.isOnline();
    const actual = TA.state.realOnline === false;
    const items = [ ['auto','Adaptable','compass'], ['mobile','Móvil','phone'], ['desktop','Web','monitor'] ];
    return html`<section class="quickbar" aria-label="Vista y conexión del prototipo">
      <div class="quickbar__views" role="group" aria-label="Visualizar como">
        <span class="quickbar__label">Ver pantalla:</span>
        ${items.map(([value,label,ic]) => html`<button type="button" class="quickbar__btn" data-action="preview-device" data-value="${value}" aria-pressed="${d === value}" title="Mostrar vista ${label.toLowerCase()}">${icon(ic,17)}<span>${label}</span></button>`)}
      </div>
      <div class="quickbar__right">
        <div class="quickbar__roles" role="group" aria-label="Perfil de demostración">
          <button type="button" class="quickbar__role" data-action="preview-role" data-value="student" aria-pressed="${TA.state.role === 'student'}">Estudiante</button>
          <button type="button" class="quickbar__role" data-action="preview-role" data-value="teacher" aria-pressed="${TA.state.role === 'teacher'}">Docente</button>
        </div>
        <span class="quickbar__status" role="status">${icon(off ? 'wifi-off':'wifi',17)}${off ? 'Trabajando sin internet' : 'Material listo sin Wi-Fi'}</span>
        <button type="button" class="quickbar__btn quickbar__offline" data-action="preview-offline" aria-pressed="${off}"${attr(actual,'disabled')}>
          ${icon(off ? 'wifi' : 'wifi-off',17)}${off ? 'Volver a conectar' : 'Probar sin Wi-Fi'}
        </button>
      </div>
    </section>`;
  }

  function demoBar() {
    const s = TA.state;
    return html`<section aria-label="Controles de la demostración"><details class="demo"${attr(s.ui.demoOpen, 'open')} data-toggle="demo">
      <summary class="demo__summary">${icon('compass', 18)}<span>Más opciones</span><span class="demo__hint">Cambiar estudiante o probar otras funciones</span>${icon('down', 18)}</summary>
      <div class="demo__body">
        ${viewControl()}
        ${ui.segmented({ name: 'role', legend: 'Perfil', action: 'demo-role', value: s.role, options: [{ value: 'student', label: 'Estudiante', icon: 'user' }, { value: 'teacher', label: 'Docente', icon: 'users' }] })}
        ${s.role === 'student' ? html`<div class="field field--inline">
          <label for="demo-student">Estudiante de ejemplo</label>
          <select id="demo-student" data-change="demo-student">
            <option value="x"${attr(s.studentId === 'x', 'selected')}>Ximena · le cuestan las operaciones inversas</option>
            <option value="d"${attr(s.studentId === 'd', 'selected')}>Diego · le cuesta leer y plantear</option>
          </select>
        </div>` : ''}
        ${ui.switchField({ id: 'demo-offline', label: 'Simular sin internet', checked: s.simulateOffline, action: 'demo-offline' })}
        <div class="cluster cluster--tight">
          <button type="button" class="btn btn--secondary btn--sm" data-action="open-tour" aria-haspopup="dialog">${icon('route', 16)}Recorrido guiado</button>
          <a class="btn btn--ghost btn--sm" href="#/acerca">${icon('info', 16)}Acerca del proyecto</a>
          <button type="button" class="btn btn--ghost btn--sm" data-action="reset-demo" aria-haspopup="dialog">${icon('reset', 16)}Reiniciar</button>
        </div>
      </div>
    </details></section>`;
  }

  function nav(route) {
    const items = NAV[TA.state.role];
    const pending = TA.state.role === 'teacher' ? TA.teacher.pendingAlerts() : 0;
    return html`<nav class="nav" aria-label="Principal">
      <ul class="nav__list">
        ${items.map((it) => html`<li><a class="nav__link" href="${it.href}"${attr(route.nav === it.id, 'aria-current="page"')}>
          <span class="nav__icon">${icon(it.icon, 24)}${it.id === 'alertas' && pending ? html`<span class="nav__badge" aria-hidden="true">${pending}</span>` : ''}</span>
          <span class="nav__label">${it.label}${it.id === 'alertas' && pending ? html`<span class="sr-only"> (${pending} por revisar)</span>` : ''}</span>
        </a></li>`)}
      </ul>
    </nav>`;
  }

  function footer() {
    return html`<footer class="footer">
      <p>EstudiandoAndo · prototipo del Equipo 16 · Los datos son ficticios.</p>
      <ul class="footer__links">
        <li><a class="link" href="#/acerca">Acerca del proyecto</a></li>
        <li><button type="button" class="link-btn" data-action="open-a11y" data-fk="footer-a11y" aria-haspopup="dialog">Ajustes de accesibilidad</button></li>
        <li><button type="button" class="link-btn" data-action="open-tour" data-fk="footer-tour" aria-haspopup="dialog">Recorrido guiado</button></li>
      </ul>
    </footer>`;
  }

  /* =========================================================
     Render
     ========================================================= */
  const appEl = () => document.getElementById('app');

  TA.render = () => {
    const mode = viewMode();
    document.documentElement.dataset.view = mode;
    if (mode !== 'app') { renderStage(mode); return; }
    const app = appEl();
    const active = document.activeElement;
    const key = active && app.contains(active) ? TA.focus.keyOf(active) : null;
    const route = TA.route();
    app.innerHTML = String(html`
      ${header()}
      ${EMBEDDED ? '' : quickBar()}
      ${EMBEDDED ? '' : demoBar()}
      <div class="layout" data-role="${TA.state.role}">
        ${nav(route)}
        <main id="contenido" class="main" tabindex="-1">${route.render()}</main>
      </div>
      ${footer()}`);
    document.title = `${route.title} · EstudiandoAndo`;
    if (key) TA.focus.restore(key, app);
  };

  /* ---------- Escenario con marco (vista móvil o de escritorio simulada) ---------- */
  function stageIntro(mode) {
    const phone = mode === 'phone';
    return html`
      <h1 id="page-title" class="stage__title">${phone ? 'Vista móvil' : 'Vista web'}</h1>
      <p>${phone
        ? 'Así se ve EstudiandoAndo en un teléfono. Puedes abrir lecciones, responder ejercicios y consultar tu avance.'
        : 'Así se ve EstudiandoAndo en una computadora. Prueba todas las funciones sin salir de esta página.'}</p>
      <p class="stage__note">${icon('info', 18)}<span>Usa los botones de arriba para cambiar de pantalla. Tus avances se mantienen al cambiar de vista.</span></p>`;
  }

  function fitDesktop() {
    const box = document.querySelector('.device--desktop');
    if (box) box.style.setProperty('--scale', String(box.clientWidth / DESKTOP_WIDTH));
  }
  const stageObserver = 'ResizeObserver' in window ? new ResizeObserver(fitDesktop) : null;

  function renderStage(mode) {
    const app = appEl();
    const stage = app.querySelector('.stage');
    const active = document.activeElement;
    const key = active && app.contains(active) ? TA.focus.keyOf(active) : null;
    const label = mode === 'phone' ? 'vista móvil' : 'vista de escritorio';
    if (stage && stage.dataset.stage === mode) {
      // Mismo marco: solo se actualiza el texto; el iframe no se recarga.
      document.getElementById('stage-intro').innerHTML = String(stageIntro(mode));
      const quick = stage.querySelector('.quickbar');
      if (quick) quick.outerHTML = String(quickBar());
      const child = stage.querySelector('#device-frame');
      if (child && child.contentWindow) child.contentWindow.postMessage({type:'estudiando-ando:state', state:TA.state}, msgOrigin());
    } else {
      const src = window.location.href.split('#')[0] + window.location.hash;
      app.innerHTML = String(html`
        <div class="stage" data-stage="${mode}">
          <header class="topbar" role="banner">
            <span class="brand">
              <span class="brand__mark">${mascot({ size: 30, face: true })}</span>
              <span class="brand__text">EstudiandoAndo<span class="brand__sub">Demostración · ${label}</span></span>
            </span>
            <div class="topbar__actions">
              <button type="button" class="btn btn--ghost-inverse btn--icon-label" data-action="open-a11y" aria-haspopup="dialog">${icon('access', 20)}<span class="hide-sm">Accesibilidad</span><span class="sr-only show-sm">Accesibilidad</span></button>
            </div>
          </header>
          ${quickBar()}
          <main id="contenido" class="stage__main" tabindex="-1">
            <div class="stage__intro" id="stage-intro">${stageIntro(mode)}</div>
            <div class="device device--${mode}">
              <iframe id="device-frame" class="device__frame"${STANDALONE ? '' : html` src="${src}"`} title="EstudiandoAndo en ${label}"></iframe>
            </div>
          </main>
        </div>`);
      if (STANDALONE) {
        const frame = document.getElementById('device-frame');
        frame.addEventListener('load', () => {
          try {
            if (frame.contentWindow && frame.contentWindow.location.hash !== window.location.hash)
              frame.contentWindow.location.hash = window.location.hash;
            frame.contentWindow.postMessage({type:'estudiando-ando:state',state:TA.state}, msgOrigin());
          } catch (_) { /* la ruta sigue siendo accesible desde la vista adaptable */ }
        }, {once:true});
        frame.srcdoc = '<!doctype html>\n' + standaloneDocument;
      }
      if (!STANDALONE) {
        const frame = document.getElementById('device-frame');
        frame.addEventListener('load', () => frame.contentWindow.postMessage({type:'estudiando-ando:state',state:TA.state}, msgOrigin()), {once:true});
      }
      document.title = `${mode === 'phone' ? 'Vista móvil' : 'Vista web'} · EstudiandoAndo`;
      if (stageObserver) {
        stageObserver.disconnect();
        if (mode === 'desktop') stageObserver.observe(app.querySelector('.device'));
      }
    }
    if (mode === 'desktop') fitDesktop();
    if (key) TA.focus.restore(key, app);
  }

  /** Al cambiar de pantalla: dibujar, mover el foco al título y anunciarlo. */
  function onRoute() {
    const route = TA.route();
    if (route.role && route.role !== TA.state.role) {
      TA.state.role = route.role;
      TA.save();
    }
    if (route.path === '/alumnos' && route.params.id) TA.state.teacher.selected = route.params.id;
    TA.speech.stop();
    TA.dialog.close();
    if (viewMode() !== 'app') {
      // La dirección cambió fuera del marco (por ejemplo, a mano): el marco la sigue.
      const frame = document.getElementById('device-frame');
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'estudiando-ando:go', hash: window.location.hash }, msgOrigin());
        frame.contentWindow.postMessage({ type:'estudiando-ando:state', state: TA.state }, msgOrigin());
      }
      TA.render();
      TA.state.ui.firstRender = false;
      return;
    }
    TA.render();
    if (EMBEDDED) {
      // Dentro del marco: se informa la pantalla actual para conservarla al cambiar de vista.
      window.parent.postMessage({ type: 'estudiando-ando:route', hash: window.location.hash, title: document.title }, msgOrigin());
    }
    const first = TA.state.ui.firstRender;
    TA.state.ui.firstRender = false;
    if (route.anchor) {
      const target = document.getElementById(route.anchor);
      if (target) { TA.focus.to(target); target.scrollIntoView({ block: 'start' }); return; }
    }
    if (route.view === 'tutor') TA.student.scrollChat();
    if (!first) {
      window.scrollTo(0, 0);
      TA.focus.to('#page-title', { scroll: false });
      TA.announce(`${route.title}`);
    }
  }

  /* =========================================================
     Ajustes de accesibilidad
     ========================================================= */
  function applyPrefs() {
    const p = TA.state.prefs;
    const root = document.documentElement;
    root.dataset.theme = p.theme;
    root.dataset.text = p.text;
    root.dataset.spacing = p.spacing ? 'wide' : 'normal';
    root.dataset.motion = p.motion;
    root.dataset.simple = p.simple ? 'on' : 'off';
    const dark = p.theme === 'dark' || (p.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#08141A' : '#0B2F45');
  }

  function a11yPanel() {
    const p = TA.state.prefs;
    return html`<div class="stack" id="a11y-panel">
      ${ui.segmented({ name: 'text', legend: 'Tamaño del texto', action: 'pref', value: p.text, options: [{ value: 'md', label: 'Normal' }, { value: 'lg', label: 'Grande' }, { value: 'xl', label: 'Muy grande' }, { value: 'xxl', label: 'Enorme' }] })}
      ${ui.segmented({ name: 'theme', legend: 'Colores', action: 'pref', value: p.theme, options: [{ value: 'system', label: 'Del sistema' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }, { value: 'contrast', label: 'Alto contraste' }] })}
      <div class="switch-list">
        ${ui.switchField({ id: 'pref-spacing', label: 'Espaciado de texto amplio', hint: 'Más espacio entre letras, palabras y líneas. Ayuda a la lectura.', checked: p.spacing, action: 'pref', key: 'spacing' })}
        ${ui.switchField({ id: 'pref-motion', label: 'Reducir movimiento', hint: 'Quita animaciones y desplazamientos suaves.', checked: p.motion === 'reduce', action: 'pref', key: 'motion' })}
        ${ui.switchField({ id: 'pref-simple', label: 'Vista sencilla', hint: 'Da más espacio a lo importante y deja los detalles adicionales en segundo plano.', checked: p.simple, action: 'pref', key: 'simple' })}
        ${ui.switchField({ id: 'pref-voice', label: 'Lectura en voz alta', hint: TA.speech.supported ? 'Agrega botones «Escuchar» y «Leer página».' : 'Tu navegador no permite esta función.', checked: p.voice, action: 'pref', key: 'voice', disabled: !TA.speech.supported })}
      </div>
      <p class="muted small">Los ajustes se guardan en este equipo y se aplican al momento.</p>
      <div class="dialog__actions">
        <button type="button" class="btn btn--ghost" data-action="reset-prefs">${icon('reset', 18)}Restablecer ajustes</button>
        <button type="button" class="btn btn--primary" data-dialog-close>Listo</button>
      </div>
    </div>`;
  }

  function connectionPanel() {
    const s = TA.state;
    const status = TA.net.status();
    const pending = TA.sync.pendingItems();
    const n = ui.netInfo();
    return html`<div class="stack" id="conn-panel">
      <div class="banner banner--${n.tone}" role="note">${icon(n.icon, 22)}<div>
        <p class="banner__title">${n.label}</p>
        <p>${status === 'online' ? 'Puedes aprender con las lecciones guardadas. Las respuestas quedan en este equipo; esta versión no se conecta con la escuela.'
          : status === 'local' ? 'Elegiste no usar datos. Funciona lo descargado; lo demás espera.'
            : 'No hay conexión. Funciona lo descargado; lo demás se enviará después.'}</p>
      </div></div>
      ${ui.segmented({ name: 'dataMode', legend: '¿Cómo quieres usar la conexión?', action: 'data-mode', value: s.dataMode, options: [{ value: 'auto', label: 'Automático' }, { value: 'local', label: 'Solo modo local' }] })}
      <p class="field__hint">${s.dataMode === 'auto' ? 'Usa internet cuando hay y cambia a modo local cuando no.' : 'No usa datos: solo lo descargado. Tus dudas y resultados esperan.'}</p>
      <div>
        <h3 class="h-sm">Guardado para cuando vuelva internet</h3>
        ${pending.length ? html`<ul class="list-icons">${pending.map((it) => html`<li>${icon(it.icon, 18)}<span>${it.label}</span></li>`)}</ul>` : html`<p class="muted">Nada pendiente.</p>`}
      </div>
      ${s.simulateOffline ? html`<div class="note note--warn">${icon('info', 20)}<p>Estás simulando la falta de internet desde la barra de demostración.</p></div>` : ''}
      <div class="dialog__actions">
        <button type="button" class="btn btn--secondary" data-action="sync-now" data-fk="conn-sync"${attr(!TA.net.isOnline() || !pending.length, 'disabled')}>${icon('sync', 18)}Actualizar pendientes</button>
        <button type="button" class="btn btn--primary" data-dialog-close>Listo</button>
      </div>
    </div>`;
  }

  function tourPanel() {
    return html`<p class="muted">Cada paso te lleva a una pantalla con el perfil y la conexión adecuados.</p>
      <ol class="tour">
        ${data.tour.map((t, i) => html`<li><button type="button" class="tour__step" data-action="tour" data-value="${i}">
          <span class="tour__n" aria-hidden="true">${i + 1}</span><span><span class="tour__title">${t.title}</span><span class="tour__detail">${t.detail}</span></span>${icon('right', 18)}
        </button></li>`)}
      </ol>`;
  }

  /* =========================================================
     Manejadores globales
     ========================================================= */
  Object.assign(TA.actions, {
    'preview-device': (el) => {
      TA.state.prefs.device = el.dataset.value;
      TA.state.ui.demoOpen = true;
      TA.save();
      applyViewport();
      TA.render();
      lastMode = viewMode();
      TA.announce(VIEW_TEXT[el.dataset.value]);
    },
    'preview-role': (el) => {
      const role = el.dataset.value;
      if (role !== 'student' && role !== 'teacher') return;
      TA.state.role = role;
      TA.save();
      TA.go(HOME[role]);
    },
    'preview-offline': () => {
      if (!TA.state.realOnline) { TA.toast('El dispositivo no tiene conexión. Puedes seguir estudiando.', {tone:'warn'}); return; }
      changeNetwork(() => {
        TA.state.simulateOffline = TA.net.isOnline();
        // Si estaba en modo local, el botón vuelve al modo automático.
        if (TA.state.dataMode === 'local') { TA.state.dataMode = 'auto'; TA.state.simulateOffline = false; }
      });
    },
    'open-a11y': () => TA.dialog.open({ title: 'Ajustes de accesibilidad', body: a11yPanel() }),
    'open-connection': () => TA.dialog.open({ title: 'Conexión y datos', body: connectionPanel() }),
    'open-tour': () => TA.dialog.open({ title: 'Recorrido guiado', body: tourPanel(), size: 'sm' }),

    tour: (el) => {
      const t = data.tour[Number(el.dataset.value)];
      if (t.student) TA.state.studentId = t.student;
      TA.state.role = t.role;
      const was = TA.net.isOnline();
      TA.state.simulateOffline = t.offline;
      if (t.offline) TA.state.dataMode = 'auto';
      TA.save();
      TA.dialog.close();
      if (!was && TA.net.isOnline()) TA.sync.run({ auto: true });
      TA.go(t.route);
      TA.toast(`Recorrido: ${t.title}.`, { duration: 4000 });
    },

    goto: (el, e) => {
      e.preventDefault();
      TA.go(el.dataset.value);
    },

    'reset-demo': () => TA.dialog.open({
      title: '¿Reiniciar la demostración?',
      size: 'sm',
      body: html`<p>Se borrarán las respuestas, mensajes y cambios guardados en este navegador. Tus ajustes de accesibilidad se conservan.</p>
        <div class="dialog__actions"><button type="button" class="btn btn--secondary" data-dialog-close>Cancelar</button><button type="button" class="btn btn--danger" data-action="reset-confirm">${icon('reset', 18)}Reiniciar</button></div>`
    }),

    'reset-confirm': () => {
      const prefs = TA.state.prefs;
      const fresh = defaultState();
      Object.assign(TA.state, fresh, { prefs, drafts: { diagnostic: {}, check: {}, chatError: '' } });
      TA.save();
      TA.dialog.close();
      TA.go(HOME.student);
      TA.toast('Demostración reiniciada.', { tone: 'ok' });
    },

    'reset-prefs': () => {
      const { saver, wifiOnly, device } = TA.state.prefs;
      TA.state.prefs = { ...clone(DEFAULT_PREFS), saver, wifiOnly, device };
      applyPrefs();
      TA.save();
      TA.render();
      TA.dialog.update(a11yPanel());
      TA.announce('Ajustes de accesibilidad restablecidos.');
    },

    'sync-now': () => {
      TA.sync.run();
      if (TA.dialog.isOpen() && document.getElementById('conn-panel')) TA.dialog.update(connectionPanel());
    },

    speak: (el) => {
      const target = document.getElementById(el.dataset.id);
      if (target) TA.speech.speak(target.innerText || target.textContent);
    },
    'speak-stop': () => TA.speech.stop(),
    'read-page': () => {
      if (TA.speech.speaking) TA.speech.stop();
      else TA.speech.speak(document.getElementById('contenido').innerText);
    },

    'pkg-download': (el) => {
      const pkg = data.packages.find((p) => p.id === el.dataset.id);
      const progress = TA.student.progress();
      // Todo el contenido de ejemplo ya está integrado; no se simula una descarga de MB inexistentes.
      progress.packages[pkg.id] = 'ready';
      TA.save();
      TA.render();
      TA.toast(`«${pkg.name}» está disponible en esta demostración sin Wi-Fi.`, { tone: 'ok' });
    },

    'pkg-remove': (el) => {
      const pkg = data.packages.find((p) => p.id === el.dataset.id);
      const progress = TA.student.progress();
      progress.packages[pkg.id] = 'none';
      TA.save();
      TA.render();
      TA.focus.to('#page-title');
      TA.toast(`Desactivaste «${pkg.name}» en la demostración.`, {
        action: { label: 'Deshacer', onClick: () => { progress.packages[pkg.id] = 'ready'; TA.save(); TA.render(); TA.announce('Paquete recuperado.'); } }
      });
    }
  });

  Object.assign(TA.changes, {
    pref: (el) => {
      const key = el.dataset.key || el.name;
      const p = TA.state.prefs;
      if (key === 'motion') p.motion = el.checked ? 'reduce' : 'system';
      else if (el.type === 'checkbox') p[key] = el.checked;
      else p[key] = el.value;
      if (key === 'voice' && !el.checked) TA.speech.stop();
      applyPrefs();
      TA.save();
      TA.render();
      if (TA.dialog.isOpen() && document.getElementById('a11y-panel')) TA.dialog.update(a11yPanel());
      if (el.type === 'checkbox') TA.announce(el.checked ? 'Activado.' : 'Desactivado.');
    },
    device: (el) => {
      TA.state.prefs.device = el.value;
      TA.state.ui.demoOpen = true; // el control sigue visible después de cambiar
      applyViewport();
      TA.save();
      TA.render();
      lastMode = viewMode();
      if (!appEl().contains(document.activeElement)) TA.focus.restore(`id:device-${el.value}`);
      if (lastMode === 'app') window.scrollTo(0, 0);
      TA.announce(VIEW_TEXT[el.value]);
    },
    'data-mode': (el) => changeNetwork(() => { TA.state.dataMode = el.value; }),
    'demo-offline': (el) => changeNetwork(() => { TA.state.simulateOffline = el.checked; }),
    'demo-role': (el) => {
      TA.state.role = el.value;
      TA.save();
      TA.go(HOME[el.value]);
    },
    'demo-student': (el) => {
      TA.state.studentId = el.value;
      TA.state.drafts = { diagnostic: {}, check: {}, chatError: '' };
      TA.save();
      TA.render();
      TA.announce(`Ahora ves la cuenta de ${data.students[el.value].name}.`);
    }
  });

  /* ---------- Delegación de eventos ---------- */
  // about:srcdoc hereda la URL base del padre: los enlaces hash podrían
  // abrir about:blank en lugar de cambiar de pantalla. Capturamos la ruta.
  document.addEventListener('click', (e) => {
    if (!(EMBEDDED && window.location.protocol === 'about:')) return;
    const link = e.target.closest('a[href^="#/"]');
    if (!link) return;
    e.preventDefault();
    const next = link.getAttribute('href');
    if (window.location.hash === next) onRoute();
    else window.location.hash = next;
  }, true);

  document.addEventListener('click', (e) => {
    const skip = e.target.closest('.skip-link');
    if (skip) {
      e.preventDefault();
      TA.focus.to('#contenido');
      return;
    }
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const handler = TA.actions[el.dataset.action];
    if (handler) handler(el, e);
  });

  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    const handler = TA.changes[el.dataset.change];
    if (handler) handler(el, e);
  });

  document.addEventListener('input', (e) => {
    const counter = e.target.dataset && e.target.dataset.input;
    if (counter) {
      const out = document.getElementById(counter);
      if (out) out.textContent = e.target.value.length;
    }
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-submit]');
    if (!form) return;
    e.preventDefault();
    const handler = TA.submits[form.dataset.submit];
    if (handler) handler(form, e);
  });

  /* El evento «toggle» no burbujea: se escucha en fase de captura. */
  document.addEventListener('toggle', (e) => {
    if (e.target.dataset && e.target.dataset.toggle === 'demo') TA.state.ui.demoOpen = e.target.open;
  }, true);

  document.addEventListener('ta:speech', () => {
    const btn = document.querySelector('[data-action="read-page"]');
    if (btn) btn.outerHTML = String(readPageButton());
  });

  window.addEventListener('hashchange', () => {
    if (window.location.hash.startsWith('#/')) onRoute();
  });

  window.addEventListener('online', () => changeNetwork(() => { TA.state.realOnline = true; }));
  window.addEventListener('offline', () => changeNetwork(() => { TA.state.realOnline = false; }));

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyPrefs);

  /* Si cambia el tamaño de la ventana, la vista elegida se recalcula. */
  let lastMode = null;
  [mq.phoneFits, mq.desktop, mq.coarse].forEach((m) => m.addEventListener('change', () => {
    if (EMBEDDED || TA.state.prefs.device === 'auto') return;
    applyViewport();
    if (viewMode() !== lastMode) TA.render();
    lastMode = viewMode();
  }));

  /* Al girar el teléfono cambia el ancho de la pantalla: se recalcula el zoom de la vista de escritorio. */
  window.addEventListener('orientationchange', applyViewport);

  /* Otra ventana o el marco guardó cambios: se reflejan aquí sin recargar. */
  window.addEventListener('storage', (e) => {
    if (e.key !== null && e.key !== TA.store.keyFor(STORE_KEY)) return;
    syncFromStorage();
    applyPrefs();
    applyViewport();
    TA.render();
    lastMode = viewMode();
    if (TA.dialog.isOpen() && document.getElementById('a11y-panel')) TA.dialog.update(a11yPanel());
  });

  /* Mensajes entre la página y el marco de vista previa. */
  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'estudiando-ando:state' && msg.state && typeof msg.state === 'object') {
      const keys = ['role', 'studentId', 'simulateOffline', 'dataMode', 'prefs', 'progress', 'teacher'];
      if (EMBEDDED && e.source === window.parent) {
        keys.forEach(k => { if (Object.hasOwn(msg.state,k)) TA.state[k] = msg.state[k]; });
        applyPrefs();
        TA.render();
      } else if (!EMBEDDED) {
        const frame = document.getElementById('device-frame');
        if (!frame || e.source !== frame.contentWindow) return;
        // El marco no puede cambiar la opción Móvil/Web del presentador:
        // las vistas internas siempre usan diseño adaptable.
        const presenterDevice = TA.state.prefs.device;
        keys.forEach(k => { if (Object.hasOwn(msg.state,k)) TA.state[k] = msg.state[k]; });
        TA.state.prefs.device = presenterDevice;
        TA.save();
        TA.render();
      }
      return;
    }
    if (typeof msg.hash !== 'string' || !msg.hash.startsWith('#/') || msg.hash.length > 200) return;
    if (msg.type === 'estudiando-ando:route') {
      const frame = document.getElementById('device-frame');
      if (!frame || e.source !== frame.contentWindow) return;
      window.history.replaceState(null, '', msg.hash);
      if (typeof msg.title === 'string') document.title = `${msg.title.slice(0, 120)} (${viewMode() === 'phone' ? 'vista móvil' : 'vista de escritorio'})`;
    } else if (msg.type === 'estudiando-ando:go' && EMBEDDED && e.source === window.parent && window.location.hash !== msg.hash) {
      window.location.hash = msg.hash;
    }
  });

  /* =========================================================
     Inicio
     ========================================================= */
  function init() {
    if (STANDALONE && !EMBEDDED) standaloneDocument = document.documentElement.outerHTML;
    applyPrefs();
    applyViewport();
    lastMode = viewMode();
    if (!window.location.hash.startsWith('#/')) {
      let parentHash = '';
      if (EMBEDDED) {
        try { parentHash = window.parent.location.hash; } catch (_) { /* origen independiente: se usa el inicio local */ }
      }
      const start = parentHash.startsWith('#/') ? parentHash : `#${HOME[TA.state.role]}`;
      if (window.location.protocol === 'about:') window.location.hash = start;
      else window.history.replaceState(null, '', start);
    }
    onRoute();
    if (!EMBEDDED && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline instalable */ });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.TA);
