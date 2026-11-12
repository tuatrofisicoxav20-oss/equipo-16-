/* =========================================================
   Tecu Aprende – diseño de interfaz (sin ejecución real)
   Solo muestra vistas y estados con datos ficticios.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Iconos (SVG en línea) ---------- */
  const ICONS = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z"/><path d="M20 17v4H6.5A2.5 2.5 0 0 1 4 18.5"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
    download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M2 9a14 14 0 0 1 20 0"/><circle cx="12" cy="19.2" r=".6"/>',
    'wifi-off': '<path d="m3 3 18 18"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 3-2"/><path d="M19 12.5a10 10 0 0 0-3-2"/><circle cx="12" cy="19.2" r=".6"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    play: '<path d="M7 4v16l13-8Z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    send: '<path d="m22 2-11 11"/><path d="M22 2 15 22l-4-9-9-4Z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="4"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3Z"/>',
    flame: '<path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-10Z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 20h20"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4Z"/><path d="M10 21h4"/>',
    sliders: '<path d="M4 6h10"/><path d="M18 6h2"/><circle cx="16" cy="6" r="2"/><path d="M4 12h2"/><path d="M10 12h10"/><circle cx="8" cy="12" r="2"/><path d="M4 18h10"/><path d="M18 18h2"/><circle cx="16" cy="18" r="2"/>',
    chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sync: '<path d="M20 11a8 8 0 0 0-14-4L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14 4l2-2"/><path d="M20 20v-5h-5"/>',
    shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6Z"/><path d="m9 12 2 2 4-4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    x: '<path d="m6 6 12 12"/><path d="m18 6-12 12"/>',
    storage: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="m3 13 3-8h12l3 8"/><path d="M7 16.5h.01"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 17v4"/><path d="M17 19h4"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-15 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>',
    pen: '<path d="M4 20l1-4L17 4l3 3L8 19Z"/><path d="m14 7 3 3"/>',
    atom: '<circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
    landmark: '<path d="M3 21h18"/><path d="M5 21V10"/><path d="M10 21V10"/><path d="M14 21V10"/><path d="M19 21V10"/><path d="m2 10 10-6 10 6Z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>'
  };
  const I = (n, s = 20, extra = '') =>
    `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${extra}>${ICONS[n] || ''}</svg>`;

  /* ---------- Mascota: Tecu, el tecolote tutor (SVG) ---------- */
  function mascot(mood = 'happy', size = 96, o = {}) {
    const { local = false, face = false, float = false } = o;
    const D = '#0B2F45';
    const eyes = {
      happy: `<circle cx="44" cy="60" r="7" fill="${D}"/><circle cx="76" cy="60" r="7" fill="${D}"/><circle cx="46.6" cy="57.4" r="2.4" fill="#fff"/><circle cx="78.6" cy="57.4" r="2.4" fill="#fff"/>`,
      think: `<circle cx="41" cy="56" r="7" fill="${D}"/><circle cx="73" cy="56" r="7" fill="${D}"/><circle cx="43.4" cy="53.6" r="2.4" fill="#fff"/><circle cx="75.4" cy="53.6" r="2.4" fill="#fff"/><path d="M33 44l15 3M87 44l-15 3" stroke="${D}" stroke-width="3" stroke-linecap="round"/>`,
      cheer: `<path d="M37 63q7-10 14 0M69 63q7-10 14 0" stroke="${D}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M100 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#F2B134"/><path d="M14 40l1.5 4.5 4.5 1.5-4.5 1.5L14 52l-1.5-4.5L8 46l4.5-1.5Z" fill="#F2B134"/>`,
      sleep: `<path d="M37 60q7 7 14 0M69 60q7 7 14 0" stroke="${D}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`
    }[mood] || '';
    const bx = face ? 94 : 95, by = face ? 82 : 112, br = face ? 12 : 15, bs = face ? .57 : .71;
    const badge = local
      ? `<circle cx="${bx}" cy="${by}" r="${br}" fill="#fff" stroke="${D}" stroke-width="2.4"/><g transform="translate(${(bx - 12 * bs).toFixed(1)} ${(by - 12 * bs).toFixed(1)}) scale(${bs})" fill="none" stroke="${D}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></g>`
      : '';
    const vb = face ? '14 6 92 90' : '0 0 120 138';
    const h = face ? size * 90 / 92 : size * 138 / 120;
    return `<svg class="mascot${float ? ' mascot-float' : ''}" width="${size}" height="${h.toFixed(0)}" viewBox="${vb}" style="overflow:${face ? 'hidden' : 'visible'}" aria-hidden="true" focusable="false">
      <ellipse cx="46" cy="134" rx="13" ry="3.4" fill="#F2B134"/><ellipse cx="74" cy="134" rx="13" ry="3.4" fill="#F2B134"/>
      <path d="M60 22c-22 0-38 16-38 40v22c0 21 15 36 38 36s38-15 38-36V62c0-24-16-40-38-40Z" fill="#1F9C8C"/>
      <path d="M25 74c-9 10-8 30 5 42 3-15 3-30-5-42Z" fill="#157A6E"/><path d="M95 74c9 10 8 30-5 42-3-15-3-30 5-42Z" fill="#157A6E"/>
      <ellipse cx="60" cy="100" rx="24" ry="27" fill="#E1F3F0"/>
      <path d="M47 90q4.5 4 9 0M64 90q4.5 4 9 0M55 104q5 4.5 10 0M45 112q4.5 4 9 0M66 112q4.5 4 9 0" stroke="#1F9C8C" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="44" cy="59" r="17.5" fill="#fff"/><circle cx="76" cy="59" r="17.5" fill="#fff"/>
      ${eyes}
      <path d="M54 67l6 11 6-11Z" fill="#F2B134" stroke="#D8921A" stroke-width="1" stroke-linejoin="round"/>
      <circle cx="29" cy="70" r="4" fill="#F4A68F" opacity=".7"/><circle cx="91" cy="70" r="4" fill="#F4A68F" opacity=".7"/>
      <path d="M28 27 60 12l32 15-32 15Z" fill="${D}"/><path d="M44 35v9c9 6 23 6 32 0v-9" fill="#0F3D5A"/>
      <path d="M92 27v16" stroke="#F2B134" stroke-width="2.6" stroke-linecap="round"/><circle cx="92" cy="45" r="3.6" fill="#F2B134"/>
      ${badge}
    </svg>`;
  }

  /* ---------- Datos ficticios ---------- */
  const SUBJ = [
    { id: 'mat', n: 'Matemáticas', ic: 'calc', t: 'brand', p: 62, mb: 38, d: 'on', l: 18, done: 11 },
    { id: 'esp', n: 'Español', ic: 'pen', t: 'rose', p: 48, mb: 26, d: 'on', l: 16, done: 8 },
    { id: 'bio', n: 'Biología', ic: 'leaf', t: 'mint', p: 30, mb: 44, d: 'on', l: 14, done: 4 },
    { id: 'his', n: 'Historia de México', ic: 'landmark', t: 'sun', p: 15, mb: 31, d: 'off', l: 12, done: 2 },
    { id: 'fis', n: 'Física', ic: 'atom', t: 'vio', p: 0, mb: 52, d: 'off', l: 15, done: 0 },
    { id: 'ing', n: 'Inglés', ic: 'globe', t: 'brand', p: 71, mb: 29, d: 'q', l: 20, done: 14 }
  ];
  const LESSONS = [
    { n: 'Qué es una incógnita', s: 'done' },
    { n: 'Sumar y restar en ambos lados', s: 'done' },
    { n: 'Multiplicar y dividir en ambos lados', s: 'done' },
    { n: 'Ecuaciones de primer grado', s: 'now' },
    { n: 'Problemas con ecuaciones', s: 'next' },
    { n: 'Repaso y práctica final', s: 'next' }
  ];
  const WEEK = [20, 35, 0, 45, 30, 25, 12];
  const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const GUIDE = [
    { t: 'Inicio y mascota', tab: 'home', net: 'online' },
    { t: 'Materias y descargas', tab: 'learn', net: 'online' },
    { t: 'Tutor que da pistas', tab: 'tutor', net: 'online' },
    { t: 'Sin internet: Tecu local', tab: 'tutor', net: 'offline' },
    { t: 'Descargas y sincronización', tab: 'down', net: 'offline' },
    { t: 'Perfil y accesibilidad', tab: 'me', net: null }
  ];

  /* ---------- Estado ---------- */
  const state = {
    device: 'mobile',
    net: 'online',
    mTab: 'home',
    dSec: 'home',
    hint: 1,
    level: 'sec',
    sheet: false,
    connMode: 'auto',
    saver: true,
    wifiOnly: true
  };
  const on = () => state.net === 'online';
  const $ = (s, r = document) => r.querySelector(s);
  const root = $('#root');

  /* ---------- Piezas reutilizables ---------- */
  const netChip = () => on()
    ? `<span class="net-chip is-on">${I('wifi', 16)} Con internet</span>`
    : `<span class="net-chip is-off">${I('wifi-off', 16)} Modo local</span>`;

  function netBanner(full) {
    return on()
      ? `<div class="net-banner" data-net="on" role="status">${I('wifi', 20)}<div><strong>Con internet</strong>Tecu en línea puede explicar cualquier tema. Tu progreso se guardó hace 2 min.</div></div>`
      : `<div class="net-banner" data-net="off" role="status">${I('wifi-off', 20)}<div><strong>Sin internet: modo local</strong>Tienes 3 materias en tu dispositivo. Tecu local responde con lo descargado y guarda 2 preguntas para después.${full ? `<br><button class="btn btn-line btn-sm" data-act="go-down">${I('download', 16)} Ver lo descargado</button>` : ''}</div></div>`;
  }

  const stChip = (d) => {
    if (d === 'on') return `<span class="st st-on">${I('check', 13)} En tu dispositivo</span>`;
    if (d === 'q') return `<span class="st st-q">${I('clock', 13)} En cola</span>`;
    return on() ? `<span class="st st-off">${I('download', 13)} Descargar</span>` : `<span class="st st-lock">${I('lock', 13)} Requiere internet</span>`;
  };

  const progress = (p, label, cls = '') =>
    `<div class="progress ${cls}" role="progressbar" aria-label="${label}" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${p}%"></div></div>`;

  function tile(s) {
    const locked = !on() && s.d !== 'on';
    return `<button class="tile tone-${s.t}" data-act="toast" data-m="Diseño: aquí se abriría ${s.n}." ${locked ? 'aria-disabled="true" style="opacity:.78"' : ''}>
      <div class="top"><span class="s-ic">${I(s.ic, 22)}</span>${s.p ? `<span class="tabnum" style="font-weight:700;font-size:14px">${s.p}%</span>` : ''}</div>
      <h3>${s.n}</h3>${progress(s.p, 'Avance en ' + s.n)}${stChip(s.d)}</button>`;
  }

  function subjRow(s) {
    const locked = !on() && s.d !== 'on';
    return `<div class="li-row tone-${s.t}" ${locked ? 'style="opacity:.8"' : ''}>
      <span class="s-ic">${I(s.ic, 22)}</span>
      <div class="grow"><h3>${s.n}</h3><p>${s.done} de ${s.l} lecciones · ${s.mb}&nbsp;MB</p>${progress(s.p, 'Avance en ' + s.n)}<div style="margin-top:8px">${stChip(s.d)}</div></div>
    </div>`;
  }

  const lessonList = () => `<div class="d-flex flex-column gap-2">${LESSONS.map((l) => {
    const needs = !on() && l.s === 'next' && l.n.startsWith('Problemas');
    const ic = l.s === 'done' ? `<span class="s-ic tone-mint" style="width:36px;height:36px">${I('check', 18)}</span>`
      : l.s === 'now' ? `<span class="s-ic" style="width:36px;height:36px;background:var(--brand);color:#fff">${I('play', 16)}</span>`
      : `<span class="s-ic tone-sun" style="width:36px;height:36px;--tb:var(--low-bg);--ti:var(--low)">${needs ? I('lock', 16) : I('book', 16)}</span>`;
    return `<div class="d-flex align-items-center gap-2" style="min-height:44px">${ic}<div class="grow" style="flex:1"><div style="font-weight:700;font-size:15px">${l.n}</div><div style="font-size:13px;color:var(--muted)">${l.s === 'done' ? 'Terminada' : l.s === 'now' ? 'Estás aquí · 8 min' : needs ? 'Falta descargar' : 'Siguiente'}</div></div></div>`;
  }).join('')}</div>`;

  function weekChart() {
    const max = 50, w = 280, h = 120, bw = 24, gap = (w - bw * 7) / 6;
    const bars = WEEK.map((v, i) => {
      const bh = Math.max(3, (v / max) * 84), x = i * (bw + gap), y = 94 - bh, today = i === 6;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" rx="6" fill="${v === 0 ? '#C3D0D8' : today ? '#1F9C8C' : '#0A5E88'}"/>
      <text x="${(x + bw / 2).toFixed(1)}" y="112" text-anchor="middle" font-size="12" font-weight="700" fill="#4E6371">${DAYS[i]}</text>
      ${v ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#2A4351" font-weight="700">${v}</text>` : ''}`;
    }).join('');
    return `<svg class="bars-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Minutos de estudio por día: lunes 20, martes 35, miércoles 0, jueves 45, viernes 30, sábado 25, domingo 12.">${bars}</svg>`;
  }

  function ring(pct, label) {
    const r = 26, c = 2 * Math.PI * r;
    return `<div class="ring" role="img" aria-label="${label}"><svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="#DCE4E9" stroke-width="7"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="#1F9C8C" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}"/></svg><b>2/3</b></div>`;
  }

  function storage() {
    return `<div class="panel">
      <div class="panel-h"><h3>Espacio en tu equipo</h3><span class="tabnum muted" style="font-size:14px">0.4 de 3.5 GB</span></div>
      <div class="meter" role="img" aria-label="Lecciones 108 MB, Tecu local 180 MB, audios 112 MB, libre 3.1 GB"><span class="m1" style="width:3%"></span><span class="m2" style="width:5%"></span><span class="m3" style="width:3%"></span></div>
      <div class="meter-legend"><span><i style="background:var(--brand)"></i>Lecciones 108 MB</span><span><i style="background:var(--mint)"></i>Tecu local 180 MB</span><span><i style="background:var(--sun)"></i>Audios 112 MB</span></div>
    </div>`;
  }

  const PKGS = [
    { n: 'Tecu local (modelo ligero)', d: 'Responde sin internet', mb: 180, s: 'on', ic: 'spark', t: 'mint' },
    { n: 'Matemáticas · 3.º secundaria', d: '18 lecciones y ejercicios', mb: 38, s: 'on', ic: 'calc', t: 'brand' },
    { n: 'Español · 3.º secundaria', d: '16 lecciones y audios', mb: 26, s: 'on', ic: 'pen', t: 'rose' },
    { n: 'Biología · 3.º secundaria', d: '14 lecciones con imágenes', mb: 44, s: 'on', ic: 'leaf', t: 'mint' },
    { n: 'Inglés · nivel A2', d: 'Audios de pronunciación', mb: 29, s: 'q', ic: 'globe', t: 'brand' },
    { n: 'Historia de México', d: '12 lecciones', mb: 31, s: 'off', ic: 'landmark', t: 'sun' }
  ];
  function pkgAction(p, desktop) {
    const sm = desktop ? 'btn-sm' : 'btn-sm';
    if (p.s === 'on') return `<span class="st st-on">${I('check', 13)} Listo</span>`;
    if (p.s === 'q') return `<span class="st st-q">${I('clock', 13)} Esperando Wi-Fi</span>`;
    return on()
      ? `<button class="btn btn-soft ${sm}" ${desktop ? 'data-bs-toggle="modal" data-bs-target="#dlModal"' : 'data-act="sheet"'}>${I('download', 16)} ${p.mb} MB</button>`
      : `<span class="st st-lock">${I('lock', 13)} Con internet</span>`;
  }
  function pkgList(desktop) {
    return PKGS.map((p) => `<div class="li-row tone-${p.t}"><span class="s-ic">${I(p.ic, 22)}</span><div class="grow"><h4>${p.n}</h4><p>${p.d} · ${p.mb}&nbsp;MB</p></div>${pkgAction(p, desktop)}</div>`).join('');
  }

  function syncPanel() {
    return `<div class="panel">
      <div class="panel-h"><h3>Para sincronizar</h3>${on() ? '<span class="st st-on">Al día</span>' : '<span class="st st-lock">2 en espera</span>'}</div>
      ${on()
        ? `<p class="muted" style="font-size:14.5px">Todo está guardado. Tus preguntas largas ya fueron respondidas por Tecu en línea.</p>`
        : `<ul class="list-unstyled d-flex flex-column gap-2 mb-3" style="font-size:14.5px">
          <li class="d-flex gap-2">${I('chat', 18)} 2 preguntas para ampliar con Tecu en línea</li>
          <li class="d-flex gap-2">${I('check', 18)} 4 lecciones terminadas</li>
          <li class="d-flex gap-2">${I('camera', 18)} 1 foto de tarea por revisar</li></ul>`}
      <button class="btn ${on() ? 'btn-line' : 'btn-line is-off'} btn-sm" data-act="toast" data-m="Diseño: la sincronización no se ejecuta." ${on() ? '' : 'aria-disabled="true"'}>${I('sync', 16)} Sincronizar ahora</button>
      ${on() ? '' : '<p class="muted mt-2" style="font-size:13px">Se enviará solo cuando vuelvas a tener internet.</p>'}
    </div>`;
  }

  function settingsSwitches() {
    return `<div class="panel">
      <div class="panel-h"><h3>Ahorro de datos</h3></div>
      <div class="form-check form-switch"><label class="form-check-label" for="sw1"><strong>Modo ahorro</strong><br><span class="muted" style="font-size:13.5px">Sin videos, imágenes ligeras</span></label><input class="form-check-input" type="checkbox" role="switch" id="sw1" data-act="sw" data-k="saver" ${state.saver ? 'checked' : ''}></div>
      <div class="form-check form-switch"><label class="form-check-label" for="sw2"><strong>Descargar solo con Wi-Fi</strong><br><span class="muted" style="font-size:13.5px">No gasta tus datos móviles</span></label><input class="form-check-input" type="checkbox" role="switch" id="sw2" data-act="sw" data-k="wifiOnly" ${state.wifiOnly ? 'checked' : ''}></div>
    </div>`;
  }

  function hintLadder() {
    const H = ['Mira el «+ 5»: ¿qué operación lo deshace?', 'Resta 5 de los dos lados y queda <span class="math">3x = 15</span>.', 'Ahora divide entre 3. ¿Cuánto vale x?'];
    return `<div class="ladder">${H.map((t, i) => {
      const n = i + 1;
      if (n <= state.hint) return `<div class="ladder-step open"><span class="n">${n}</span><span>${t}</span></div>`;
      if (n === state.hint + 1) return `<button class="ladder-step next" data-act="hint" data-v="${n}"><span class="n">${n}</span><span>${I('bulb', 16)} Pedir la pista ${n}</span></button>`;
      return `<div class="ladder-step" style="opacity:.6"><span class="n">${I('lock', 12)}</span><span>Pista ${n} (opcional)</span></div>`;
    }).join('')}
    <button class="btn btn-line btn-sm" data-act="toast" data-m="Diseño: la solución completa se muestra solo si el estudiante la pide.">Ver solución completa</button></div>`;
  }

  function chatMsgs(compactFace) {
    const m = (mood) => mascot(mood, 34, { face: true, local: !on() });
    return `<div class="chat" aria-label="Conversación con Tecu">
      <div class="msg me"><div class="bubble">No entiendo cómo resolver <span class="math">3x + 5 = 20</span></div></div>
      <div class="msg bot">${m('think')}<div class="bubble">Vamos paso a paso; no te doy el resultado todavía. <strong>¿Qué quieres dejar solo de un lado de la igualdad?</strong></div></div>
      <div class="msg me"><div class="bubble">La x</div></div>
      <div class="msg bot">${m('cheer')}<div class="bubble">¡Exacto! Para dejar <span class="math">3x</span> solo, ¿qué número tendrías que quitar de los dos lados? Si dudas, pide una pista.</div></div>
      <div class="msg me"><div class="bubble">¿Cómo sé si mi respuesta es correcta?</div></div>
      ${on()
        ? `<div class="msg bot">${m('happy')}<div class="bubble">Sustituye tu valor en la ecuación original: si los dos lados dan lo mismo, es correcta. Probémoslo con tu resultado.<div class="meta"><span class="tag tag-brand">${I('book', 13)} Lección 4 · Tu libro, p. 112</span><span class="tag tag-mint">${I('wifi', 13)} Respuesta completa</span></div></div></div>`
        : `<div class="msg bot">${m('happy')}<div class="bubble">Sustituye tu valor en la ecuación: si ambos lados dan igual, está bien.<div class="meta"><span class="tag tag-brand">${I('book', 13)} Lección 4</span><span class="tag">${I('phone', 13)} Respuesta breve (local)</span></div></div></div>
        <div class="queued" role="status">${I('clock', 16)} Guardé tu duda para ampliarla cuando haya internet.</div>`}
    </div>`;
  }

  function composer() {
    return `<div class="composer">
      <button class="icon-btn ${on() ? '' : 'is-off'}" data-act="toast" data-m="${on() ? 'Diseño: aquí se subiría la foto del cuaderno.' : 'La foto se guarda y se revisa cuando haya internet.'}" aria-label="Foto del cuaderno${on() ? '' : ' (se enviará después)'}">${I('camera', 20)}</button>
      <input class="form-control" type="text" placeholder="Escribe tu duda…" aria-label="Escribe tu duda a Tecu">
      <button class="icon-btn" data-act="toast" data-m="Diseño: dictado por voz." aria-label="Dictar por voz">${I('mic', 20)}</button>
      <button class="icon-btn send" data-act="toast" data-m="Diseño: el mensaje no se envía." aria-label="Enviar">${I('send', 20)}</button></div>`;
  }

  const quickChips = () => `<div class="chips"><button class="chip" data-act="toast" data-m="Diseño: pediría una pista.">${I('bulb', 16)} Dame una pista</button><button class="chip" data-act="toast" data-m="Diseño: ejemplo parecido.">${I('spark', 16)} Un ejemplo parecido</button><button class="chip" data-act="toast" data-m="Diseño: revisaría el procedimiento.">${I('check', 16)} Revisa mi procedimiento</button></div>`;

  const rules = () => `<ul class="legend-list">
    <li>${I('bulb', 18)} Primero pistas, después la solución.</li>
    <li>${I('shield', 18)} Tecu puede equivocarse: compara con tu libro o pregunta a tu maestra o maestro.</li>
    <li>${I('book', 18)} Cita la lección de donde saca la explicación.</li></ul>`;

  function compareTable() {
    const rows = [
      ['Explicaciones de Tecu', 'Cualquier tema, con detalle', 'Temas descargados, respuestas breves'],
      ['Foto del cuaderno', 'Se revisa al momento', 'Se guarda y se revisa después'],
      ['Lecciones y ejercicios', 'Todas las del curso', 'Las que descargaste'],
      ['Datos móviles', 'Mínimos con modo ahorro', 'Cero'],
      ['Tu progreso', 'Se guarda al instante', 'Se guarda en el cel y se sincroniza']
    ];
    return `<div class="table-responsive"><table class="table"><caption class="sr-only">Qué cambia con y sin internet</caption><thead><tr><th scope="col">Función</th><th scope="col">${I('wifi', 14)} Con internet</th><th scope="col">${I('wifi-off', 14)} Modo local</th></tr></thead><tbody>${rows.map((r) => `<tr class="t-cmp"><td>${r[0]}</td><td class="${on() ? 'cmp-on' : ''}">${r[1]}</td><td class="${on() ? '' : 'cmp-off'}">${r[2]}</td></tr>`).join('')}</tbody></table></div>`;
  }

  /* ---------- Pantallas móviles ---------- */
  const statusbar = () => `<div class="statusbar" aria-hidden="true"><span>7:42</span><span class="sb-r">${on() ? I('wifi', 15) : I('wifi-off', 15)}<svg width="24" height="12" viewBox="0 0 24 12"><rect x=".5" y=".5" width="20" height="11" rx="3" fill="none" stroke="currentColor"/><rect x="2" y="2" width="12" height="8" rx="1.5" fill="currentColor"/><rect x="21.5" y="4" width="2" height="4" rx="1" fill="currentColor"/></svg></span></div>`;

  const contours = `<svg class="contours" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#2F6385" stroke-width="1.2"><path d="M-20 170C60 120 120 190 200 140S330 90 430 130"/><path d="M-20 190C60 140 120 210 200 160S330 110 430 150"/><path d="M-20 210C60 160 120 230 200 180S330 130 430 170"/><path d="M-20 150C60 100 120 170 200 120S330 70 430 110"/><path d="M-20 130C60 80 120 150 200 100S330 50 430 90"/></g></svg>`;

  function titleBar(t, right = '') {
    return `${statusbar()}<div class="m-title"><h1>${t}</h1>${right}</div>`;
  }
  const connBtn = () => `<button class="net-chip ${on() ? 'is-on' : 'is-off'}" data-act="sheet" aria-haspopup="dialog">${on() ? I('wifi', 16) + ' Con internet' : I('wifi-off', 16) + ' Modo local'}</button>`;

  function mHome() {
    const say = on()
      ? '¡Hola, Ximena! Hoy repasamos <strong>ecuaciones</strong>. Tengo 3 pistas listas para ti.'
      : 'Estoy contigo aunque no haya internet. <strong>Todo lo descargado funciona sin gastar datos.</strong>';
    return `<header class="m-head on-dark">${contours}${statusbar()}<div class="m-head-in">
        <div class="m-top"><span class="avatar" aria-hidden="true">X</span><div class="grow"><h1>Hola, Ximena</h1><p>3.º de secundaria</p></div>${connBtn()}</div>
        <div class="tecu-card">${mascot(on() ? 'happy' : 'happy', 92, { local: !on(), float: true })}<div class="bubble-say">${say}</div></div>
      </div></header>
      <div class="m-body" id="main" tabindex="-1">
        ${netBanner(false)}
        <section class="panel tone-brand" aria-labelledby="h-cont">
          <div class="eyebrow">Sigue donde ibas</div>
          <h2 id="h-cont" style="font-size:19px;margin:2px 0 4px">Ecuaciones de primer grado</h2>
          <p class="muted" style="font-size:14px">Matemáticas · Lección 4 de 9 · 8 min</p>
          <div class="my-3">${progress(44, 'Avance de la lección', 'p-thick')}</div>
          <button class="btn btn-brand w-100" data-act="toast" data-m="Diseño: se abriría la lección.">${I('play', 16)} Continuar lección</button>
        </section>
        <section class="panel d-flex align-items-center gap-3" aria-label="Meta de hoy">
          ${ring(66, 'Meta de hoy: 2 de 3 actividades')}
          <div style="flex:1"><h2 style="font-size:16px">Meta de hoy</h2><p class="muted" style="font-size:14px">2 de 3 actividades listas</p></div>
          <div class="text-center" style="color:var(--high)">${I('flame', 26)}<div class="tabnum" style="font-weight:700;font-size:14px">5 días</div></div>
        </section>
        <section aria-labelledby="h-mat"><div class="panel-h"><h2 id="h-mat" style="font-size:17px">Tus materias</h2><button class="link-btn" data-act="mtab" data-t="learn">Ver todas</button></div>
          <div class="tiles">${SUBJ.slice(0, 4).map(tile).join('')}</div></section>
      </div>`;
  }

  function mLearn() {
    return `${titleBar('Materias', connBtn())}
      <div class="m-body" id="main" tabindex="-1">
        <div class="seg" role="group" aria-label="Nivel"><button data-act="level" data-v="sec" aria-pressed="${state.level === 'sec'}">Secundaria</button><button data-act="level" data-v="bach" aria-pressed="${state.level === 'bach'}">Bachillerato</button></div>
        ${on() ? '' : netBanner(false)}
        <section class="panel"><h2 style="font-size:16px;margin-bottom:12px">${state.level === 'sec' ? '3.º de secundaria' : '1.er semestre de bachillerato'}</h2>${SUBJ.map(subjRow).join('')}</section>
        <section class="panel"><div class="panel-h"><h2>Matemáticas · ruta</h2><span class="tag">9 lecciones</span></div>${lessonList()}</section>
      </div>`;
  }

  function mTutor() {
    return `<div class="m-head on-dark" style="background:var(--deep)">${contours}${statusbar()}<div class="m-head-in" style="padding-top:2px;padding-bottom:12px"><div class="m-top">${mascot('happy', 44, { face: true, local: !on() })}<div class="grow"><h1 style="font-size:18px">Tecu, tu tutor</h1><p>${on() ? 'En línea · explica cualquier tema' : 'Local · responde con lo descargado'}</p></div>${netChip()}</div></div></div>
      <div class="m-body" id="main" tabindex="-1" style="gap:12px">
        <div class="note" data-tone="${on() ? 'mint' : 'sun'}">${I(on() ? 'bulb' : 'wifi-off', 18)}<div>${on() ? '<strong>Tecu te guía, no hace la tarea por ti.</strong> Pide pistas y revisa con tu libro.' : '<strong>Respuestas breves sin internet.</strong> Las fotos y temas nuevos se envían cuando vuelvas a conectarte.'}</div></div>
        ${chatMsgs()}
        <section class="panel" aria-labelledby="h-hint"><div class="panel-h"><h2 id="h-hint" style="font-size:16px">${I('bulb', 18)} Pistas</h2><span class="tag">${state.hint} de 3</span></div>${hintLadder()}</section>
        ${quickChips()}
      </div>
      <div style="padding:10px 14px;background:#fff;border-top:1px solid var(--line);flex:none">${composer()}</div>`;
  }

  function mDown() {
    return `${titleBar('Descargas', connBtn())}
      <div class="m-body" id="main" tabindex="-1">
        ${netBanner(false)}
        ${storage()}
        <section class="panel"><div class="panel-h"><h2>Paquetes</h2></div>${pkgList(false)}</section>
        ${syncPanel()}
        ${settingsSwitches()}
      </div>`;
  }

  function mMe() {
    return `${titleBar('Mi perfil', connBtn())}
      <div class="m-body" id="main" tabindex="-1">
        <section class="panel d-flex align-items-center gap-3"><span class="avatar" style="width:56px;height:56px;font-size:22px" aria-hidden="true">X</span><div><h2 style="font-size:18px">Ximena R.</h2><p class="muted" style="font-size:14px">3.º de secundaria · Veracruz</p></div></section>
        <section class="panel"><div class="panel-h"><h2>Esta semana</h2><span class="tag tag-mint tabnum">167 min</span></div>${weekChart()}</section>
        <section class="panel"><div class="panel-h"><h2>Insignias</h2></div><div class="badges">
          <div class="badge-it"><span class="bi">${I('flame', 24)}</span>Racha de 5</div>
          <div class="badge-it"><span class="bi">${I('bulb', 24)}</span>Sin pistas</div>
          <div class="badge-it"><span class="bi">${I('star', 24)}</span>Mate I</div>
          <div class="badge-it lock"><span class="bi">${I('lock', 22)}</span>Bio I</div></div></section>
        <section class="panel"><div class="panel-h"><h2>Accesibilidad</h2></div>
          <div class="seg mb-2" role="group" aria-label="Tamaño de letra"><button aria-pressed="false" data-act="toast" data-m="Diseño: letra normal.">A</button><button aria-pressed="true" data-act="toast" data-m="Diseño: letra mediana.">A+</button><button aria-pressed="false" data-act="toast" data-m="Diseño: letra grande.">A++</button></div>
          <div class="form-check form-switch"><label class="form-check-label" for="sw3">Alto contraste</label><input class="form-check-input" type="checkbox" role="switch" id="sw3"></div>
          <div class="form-check form-switch"><label class="form-check-label" for="sw4">Leerme en voz alta</label><input class="form-check-input" type="checkbox" role="switch" id="sw4"></div></section>
      </div>`;
  }

  function mSheet() {
    if (!state.sheet) return '';
    const c = (v, t, d) => `<button class="choice" data-act="conn" data-v="${v}" aria-pressed="${state.connMode === v}"><span class="rd">${state.connMode === v ? I('check', 13) : ''}</span><span><strong>${t}</strong><span class="d">${d}</span></span></button>`;
    return `<button class="sheet-scrim" data-act="sheet-close" aria-label="Cerrar"></button>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t">
        <h2 id="sh-t">¿Cómo quieres usar Tecu?</h2>
        <p class="muted" style="font-size:14.5px">Elige cómo gastar tus datos. Siempre podrás estudiar lo que descargaste.</p>
        ${c('auto', 'Automático', 'Usa internet si hay Wi-Fi y cambia a local si no.')}
        ${c('local', 'Solo local (cero datos)', 'Tecu responde desde tu dispositivo. Las dudas largas esperan.')}
        ${c('online', 'Siempre con internet', 'Respuestas completas. Puede gastar tus datos móviles.')}
        <button class="btn btn-brand w-100" data-act="sheet-close">Listo</button></div>`;
  }

  function tabbar() {
    const T = (id, ic, l) => `<button class="tab" data-act="mtab" data-t="${id}" ${state.mTab === id ? 'aria-current="page"' : ''}>${I(ic, 24)}<span>${l}</span></button>`;
    return `<nav class="tabbar" aria-label="Navegación principal">${T('home', 'home', 'Inicio')}${T('learn', 'book', 'Materias')}
      <button class="tab tab-cta" data-act="mtab" data-t="tutor" ${state.mTab === 'tutor' ? 'aria-current="page"' : ''} aria-label="Hablar con Tecu"><span class="tab-ic">${mascot('happy', 40, { face: true })}</span><span>Tecu</span></button>
      ${T('down', 'download', 'Descargas')}${T('me', 'user', 'Perfil')}</nav>`;
  }

  function mobileStage() {
    const screens = { home: mHome, learn: mLearn, tutor: mTutor, down: mDown, me: mMe };
    const cur = GUIDE.findIndex((g) => g.tab === state.mTab && (g.net === null || g.net === state.net));
    return `<div class="stage-mobile">
      <div class="device" role="group" aria-label="Teléfono con la plataforma">
        <div class="device-screen">${screens[state.mTab]()}${state.mTab === 'tutor' ? '' : ''}${tabbar()}${mSheet()}</div>
      </div>
      <aside class="guide" aria-labelledby="g-t">
        <h2 id="g-t">Recorrido sugerido</h2>
        <p>Toca un paso para ver la pantalla y el modo de conexión correspondiente.</p>
        <ol>${GUIDE.map((g, i) => `<li><button class="guide-step" data-act="gstep" data-i="${i}" ${i === cur ? 'aria-current="step"' : ''}>${g.t}</button></li>`).join('')}</ol>
        <hr>
        <h3 style="font-size:15px">Ideas del diseño</h3>
        <ul class="legend-list">
          <li>${I('phone', 18)} El modo local siempre es visible: chip, banner y mascota con insignia de teléfono.</li>
          <li>${I('bulb', 18)} Tecu da pistas en escalera antes de la solución.</li>
          <li>${I('download', 18)} Se descarga con Wi-Fi para no gastar datos.</li>
          <li>${I('sync', 18)} Lo pendiente se sincroniza solo.</li></ul>
      </aside></div>`;
  }

  /* ---------- Escritorio ---------- */
  const SECS = [
    ['home', 'home', 'Inicio'], ['courses', 'book', 'Mis cursos'], ['tutor', 'chat', 'Hablar con Tecu'],
    ['local', 'download', 'Modo local'], ['progress', 'chart', 'Mi progreso']
  ];
  const navBtns = (cls) => SECS.map(([id, ic, l]) => `<button class="side-btn" data-act="dsec" data-s="${id}" ${state.dSec === id ? 'aria-current="page"' : ''}>${I(ic, 20)}${l}</button>`).join('');

  function sidebar() {
    return `<aside class="side on-dark" aria-label="Menú">
      <div class="brand"><span class="brand-mark">${mascot('happy', 30, { face: true })}</span><span>Tecu Aprende</span></div>
      <nav aria-label="Secciones">${navBtns()}</nav>
      <div class="side-foot">${mascot('happy', 56, { local: !on(), float: true })}<strong>${on() ? 'Tecu en línea' : 'Tecu local'}</strong><span>${on() ? 'Listo para explicarte cualquier tema.' : 'Funcionando desde tu equipo, sin internet.'}</span></div>
    </aside>`;
  }

  function connDropdown() {
    const it = (v, t, d) => `<li><button class="dropdown-item ${state.connMode === v ? 'active' : ''}" data-act="conn" data-v="${v}"><span>${state.connMode === v ? I('check', 16) : '<span style="display:inline-block;width:16px"></span>'}</span><span>${t}<small>${d}</small></span></button></li>`;
    return `<div class="dropdown"><button class="net-chip ${on() ? 'is-on' : 'is-off'}" type="button" data-bs-toggle="dropdown" aria-expanded="false">${on() ? I('wifi', 16) + ' Con internet' : I('wifi-off', 16) + ' Modo local'}</button>
      <ul class="dropdown-menu dropdown-menu-end">${it('auto', 'Automático', 'Cambia a local si no hay señal')}${it('local', 'Solo local', 'Cero datos móviles')}${it('online', 'Siempre con internet', 'Respuestas completas')}</ul></div>`;
  }

  function topbar() {
    return `<div class="topbar">
      <button class="icon-btn d-lg-none" data-bs-toggle="offcanvas" data-bs-target="#navCanvas" aria-controls="navCanvas" aria-label="Abrir menú">${I('menu', 22)}</button>
      <div class="search"><span class="sr-only"><label for="q">Buscar lecciones</label></span>${I('search', 18)}<input id="q" class="form-control" type="search" placeholder="Buscar lecciones o preguntas"></div>
      <div class="grow"></div>${connDropdown()}
      <button class="icon-btn" data-act="toast" data-m="Diseño: notificaciones." aria-label="Avisos">${I('bell', 20)}</button>
      <span class="avatar" aria-label="Ximena R.">X</span></div>`;
  }

  function dHome() {
    return `<div class="page" id="main" tabindex="-1">
      <div class="hero on-dark">${mascot(on() ? 'happy' : 'happy', 120, { local: !on(), float: true })}
        <div><h1 style="font-size:28px;color:#fff">Hola, Ximena</h1><p>${on() ? 'Hoy repasamos ecuaciones. Tengo tres pistas listas para ti.' : 'No hay internet, pero tu curso sigue contigo: lo descargado funciona sin gastar datos.'}</p>
        <div class="d-flex gap-2 flex-wrap mt-3"><button class="btn btn-brand" style="--bs-btn-bg:#fff;--bs-btn-color:var(--brand-ink);--bs-btn-border-color:#fff;--bs-btn-hover-bg:#E4F0F6;--bs-btn-hover-color:var(--brand-ink)" data-act="toast" data-m="Diseño: se abriría la lección.">${I('play', 16)} Continuar lección</button><button class="btn btn-line" style="--bs-btn-bg:transparent;--bs-btn-color:#fff;--bs-btn-border-color:#2F6385;--bs-btn-hover-bg:#174C6E;--bs-btn-hover-color:#fff" data-act="dsec" data-s="tutor">${I('chat', 16)} Preguntarle a Tecu</button></div></div></div>
      <div class="row g-3">
        <div class="col-6 col-lg-3"><div class="kpi tone-sun"><span class="s-ic">${I('flame', 22)}</span><div><b class="tabnum">5</b><span class="l">días de racha</span></div></div></div>
        <div class="col-6 col-lg-3"><div class="kpi tone-brand"><span class="s-ic">${I('book', 22)}</span><div><b class="tabnum">39</b><span class="l">lecciones terminadas</span></div></div></div>
        <div class="col-6 col-lg-3"><div class="kpi tone-mint"><span class="s-ic">${I('clock', 22)}</span><div><b class="tabnum">167</b><span class="l">min esta semana</span></div></div></div>
        <div class="col-6 col-lg-3"><div class="kpi tone-rose"><span class="s-ic">${I('bulb', 22)}</span><div><b class="tabnum">12</b><span class="l">dudas resueltas con pistas</span></div></div></div>
      </div>
      <div class="row g-3">
        <div class="col-12 col-xl-8"><div class="panel h-100"><div class="panel-h"><h2>Tus materias</h2><button class="link-btn" data-act="dsec" data-s="courses">Ver todas</button></div>
          <div class="row g-3">${SUBJ.slice(0, 4).map((s) => `<div class="col-12 col-md-6"><div class="li-row tone-${s.t}" style="border:0;padding:0"><span class="s-ic">${I(s.ic, 22)}</span><div class="grow"><h3>${s.n}</h3><p>${s.done} de ${s.l} lecciones</p>${progress(s.p, 'Avance en ' + s.n)}</div>${stChip(s.d)}</div></div>`).join('')}</div></div></div>
        <div class="col-12 col-xl-4"><div class="panel h-100"><div class="panel-h"><h2>Esta semana</h2><span class="tag tag-mint tabnum">167 min</span></div>${weekChart()}</div></div>
      </div>
      <div class="row g-3"><div class="col-12 col-xl-7">${netBanner(true)}</div><div class="col-12 col-xl-5">${syncPanelCompact()}</div></div></div>`;
  }
  function syncPanelCompact() {
    return `<div class="note" data-tone="${on() ? 'mint' : 'sun'}">${I('sync', 18)}<div><strong>${on() ? 'Todo sincronizado' : '2 preguntas en espera'}</strong><br>${on() ? 'Último respaldo hace 2 minutos.' : 'Se enviarán a Tecu en línea cuando vuelvas a conectarte.'}</div></div>`;
  }

  function dCourses() {
    return `<div class="page" id="main" tabindex="-1">
      <div class="page-h"><div><h1>Mis cursos</h1><p>Elige tu nivel y descarga lo que quieras llevar sin internet.</p></div>
        <div class="seg" style="min-width:280px" role="group" aria-label="Nivel"><button data-act="level" data-v="sec" aria-pressed="${state.level === 'sec'}">Secundaria</button><button data-act="level" data-v="bach" aria-pressed="${state.level === 'bach'}">Bachillerato</button></div></div>
      <div class="row g-3">${SUBJ.map((s) => `<div class="col-12 col-md-6 col-xl-4"><article class="course tone-${s.t}">
        <div class="top"><span class="s-ic">${I(s.ic, 24)}</span>${stChip(s.d)}</div>
        <div><h3>${s.n}</h3><p class="muted" style="font-size:14px">${s.done} de ${s.l} lecciones · ${s.mb} MB</p></div>
        ${progress(s.p, 'Avance en ' + s.n)}
        <div class="d-flex gap-2 mt-auto"><button class="btn btn-brand btn-sm flex-fill ${!on() && s.d !== 'on' ? 'is-off' : ''}" data-act="toast" data-m="Diseño: se abriría ${s.n}." ${!on() && s.d !== 'on' ? 'aria-disabled="true"' : ''}>${!on() && s.d !== 'on' ? I('lock', 16) + ' Sin descargar' : I('play', 16) + ' Abrir'}</button>${s.d === 'off' && on() ? `<button class="btn btn-line btn-sm" data-bs-toggle="modal" data-bs-target="#dlModal" aria-label="Descargar ${s.n}">${I('download', 16)}</button>` : ''}</div></article></div>`).join('')}</div></div>`;
  }

  function dTutor() {
    return `<div class="page" id="main" tabindex="-1">
      <div class="page-h"><div><h1>Hablar con Tecu</h1><p>${on() ? 'Tecu en línea · explica cualquier tema y lee fotos de tu cuaderno.' : 'Tecu local · responde con lo que descargaste.'}</p></div>${netChip()}</div>
      <div class="row g-3">
        <div class="col-12 col-xl-8"><div class="panel d-flex flex-column gap-3" style="min-height:560px">
          <div class="note" data-tone="${on() ? 'mint' : 'sun'}">${I(on() ? 'bulb' : 'wifi-off', 18)}<div>${on() ? '<strong>Tecu te guía, no hace la tarea por ti.</strong> Pide pistas y verifica con tu libro.' : '<strong>Respuestas breves sin internet.</strong> Las fotos y los temas nuevos se envían cuando vuelvas a conectarte.'}</div></div>
          <div style="flex:1">${chatMsgs()}</div>${quickChips()}${composer()}</div></div>
        <div class="col-12 col-xl-4 d-flex flex-column gap-3">
          <div class="panel"><div class="panel-h"><h2>${I('bulb', 18)} Pistas</h2><span class="tag">${state.hint} de 3</span></div>${hintLadder()}</div>
          <div class="panel">${mascot('think', 72, { face: true, local: !on() })}<h2 style="font-size:17px;margin:8px 0 4px">Cómo usar bien a Tecu</h2>${rules()}</div>
          <div class="accordion" id="faq">
            <div class="accordion-item"><h3 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#f1" aria-expanded="false" aria-controls="f1">¿Tecu me da las respuestas?</button></h3><div id="f1" class="accordion-collapse collapse" data-bs-parent="#faq"><div class="accordion-body">Primero te hace preguntas y te da pistas. La solución completa solo aparece si la pides.</div></div></div>
            <div class="accordion-item"><h3 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#f2" aria-expanded="false" aria-controls="f2">¿Qué pasa si se equivoca?</button></h3><div id="f2" class="accordion-collapse collapse" data-bs-parent="#faq"><div class="accordion-body">Puede pasar. Por eso cita la lección y te invita a comparar con tu libro o a preguntar a tu docente.</div></div></div>
          </div></div>
      </div></div>`;
  }

  function dLocal() {
    return `<div class="page" id="main" tabindex="-1">
      <div class="page-h"><div><h1>Modo local</h1><p>Lleva tus cursos y a Tecu en tu equipo para estudiar sin internet.</p></div><button class="btn btn-brand" data-bs-toggle="modal" data-bs-target="#dlModal">${I('download', 16)} Descargar paquetes</button></div>
      ${netBanner(false)}
      <div class="row g-3">
        <div class="col-12 col-xl-8 d-flex flex-column gap-3">${storage()}
          <div class="panel"><div class="panel-h"><h2>Paquetes</h2></div>${pkgList(true)}</div></div>
        <div class="col-12 col-xl-4 d-flex flex-column gap-3">${syncPanel()}${settingsSwitches()}</div>
      </div>
      <div class="panel"><div class="panel-h"><h2>Qué cambia con y sin internet</h2></div>${compareTable()}</div></div>`;
  }

  function dProgress() {
    return `<div class="page" id="main" tabindex="-1">
      <div class="page-h"><div><h1>Mi progreso</h1><p>Se guarda en tu equipo y se sincroniza cuando hay internet.</p></div>${on() ? '<span class="st st-on">Sincronizado</span>' : '<span class="st st-lock">Por sincronizar</span>'}</div>
      <div class="row g-3">
        <div class="col-12 col-lg-6"><div class="panel h-100"><div class="panel-h"><h2>Minutos por día</h2><span class="tag tag-mint tabnum">167 min</span></div>${weekChart()}</div></div>
        <div class="col-12 col-lg-6"><div class="panel h-100"><div class="panel-h"><h2>Avance por materia</h2></div><div class="d-flex flex-column gap-3">${SUBJ.map((s) => `<div class="tone-${s.t}"><div class="d-flex justify-content-between" style="font-size:14.5px;font-weight:700"><span>${s.n}</span><span class="tabnum">${s.p}%</span></div>${progress(s.p, 'Avance en ' + s.n)}</div>`).join('')}</div></div></div>
      </div>
      <div class="panel"><div class="panel-h"><h2>Insignias</h2></div><div class="badges" style="max-width:520px">
        <div class="badge-it"><span class="bi">${I('flame', 24)}</span>Racha de 5</div><div class="badge-it"><span class="bi">${I('bulb', 24)}</span>Sin pistas</div><div class="badge-it"><span class="bi">${I('star', 24)}</span>Mate I</div><div class="badge-it lock"><span class="bi">${I('lock', 22)}</span>Bio I</div></div></div></div>`;
  }

  function desktopStage() {
    const secs = { home: dHome, courses: dCourses, tutor: dTutor, local: dLocal, progress: dProgress };
    return `<div class="site" role="group" aria-label="Sitio en un navegador">
      <div class="browser-bar"><div class="dots" aria-hidden="true"><span></span><span></span><span></span></div><div class="urlbox">${I('lock', 14)} aprende.tecu.example${state.dSec === 'home' ? '' : '/' + state.dSec}</div><span style="width:44px"></span></div>
      <div class="app">${sidebar()}<div class="main">${topbar()}${secs[state.dSec]()}
        <footer class="site-footer site-foot"><span>Tecu Aprende · diseño de interfaz</span><span>Datos ficticios · sin ejecución real</span></footer></div></div></div>`;
  }

  function overlays() {
    return `<div class="offcanvas offcanvas-start on-dark" tabindex="-1" id="navCanvas" aria-labelledby="navCanvasL">
        <div class="offcanvas-header"><h2 class="offcanvas-title" id="navCanvasL" style="font-size:18px;color:#fff">Tecu Aprende</h2><button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Cerrar"></button></div>
        <div class="offcanvas-body d-flex flex-column gap-1">${navBtns().replace(/data-act="dsec"/g, 'data-act="dsec-oc"')}</div></div>
      <div class="modal fade" id="dlModal" tabindex="-1" aria-labelledby="dlT" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
        <div class="modal-header"><h2 class="modal-title" id="dlT">Descargar para estudiar sin internet</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
        <div class="modal-body d-flex flex-column gap-3">
          <p class="muted" style="font-size:15px">Elige qué llevar en tu equipo. Se descarga con Wi-Fi para no gastar tus datos.</p>
          <div class="form-check form-switch"><label class="form-check-label" for="m1"><strong>Historia de México</strong><br><span class="muted" style="font-size:13.5px">31 MB · 12 lecciones</span></label><input class="form-check-input" type="checkbox" role="switch" id="m1" checked></div>
          <div class="form-check form-switch"><label class="form-check-label" for="m2"><strong>Física</strong><br><span class="muted" style="font-size:13.5px">52 MB · 15 lecciones</span></label><input class="form-check-input" type="checkbox" role="switch" id="m2"></div>
          <div class="note" data-tone="mint">${I('info', 18)}<div>Total: <strong>31 MB</strong>. Te quedan 3.1 GB libres.</div></div></div>
        <div class="modal-footer"><button type="button" class="btn btn-line" data-bs-dismiss="modal">Cancelar</button><button type="button" class="btn btn-brand" data-bs-dismiss="modal" data-act="toast" data-m="Diseño: no se descarga nada.">${I('download', 16)} Descargar</button></div>
      </div></div></div>`;
  }

  /* ---------- Barra del prototipo y render ---------- */
  function shell() {
    const sw = (act, k, v, ic, l) => `<button class="switch-btn" data-act="${act}" data-v="${v}" aria-pressed="${state[k] === v}">${ic ? I(ic, 16) : ''}${l}</button>`;
    return `<header class="shell on-dark"><div class="shell-inner">
      <div class="brand"><span class="brand-mark">${mascot('happy', 34, { face: true })}</span><span>Tecu Aprende<span class="brand-sub">Plataforma de aprendizaje · local y con internet</span></span></div>
      <div class="switcher">
        <div class="switch-group" role="group" aria-label="Vista"><span class="switch-group-label" aria-hidden="true">Vista</span>${sw('device', 'device', 'mobile', 'phone', 'Móvil')}${sw('device', 'device', 'desktop', 'laptop', 'Escritorio')}</div>
        <div class="switch-group" role="group" aria-label="Conexión"><span class="switch-group-label" aria-hidden="true">Conexión</span>${sw('net', 'net', 'online', 'wifi', 'Con internet')}${sw('net', 'net', 'offline', 'wifi-off', 'Sin internet')}</div>
      </div></div></header>`;
  }

  function render(announce) {
    const mob = state.device === 'mobile';
    root.innerHTML = `${shell()}<main class="stage">
      <div class="stage-intro"><div><h1 class="stage-name">${mob ? 'Vista móvil' : 'Vista de escritorio'} · ${on() ? 'con internet' : 'modo local (sin internet)'}</h1>
      <p class="stage-desc">Estudiantes de secundaria y bachillerato en Veracruz con conexión limitada. Tecu, la mascota tutora, acompaña con pistas, con o sin internet.</p></div>
      <span class="stage-note">${I('info', 16)} Solo diseño · datos ficticios</span></div>
      ${mob ? mobileStage() : desktopStage()}</main>`;
    document.getElementById('overlays').innerHTML = mob ? '' : overlays();
    if (announce) document.getElementById('live').textContent = announce;
  }

  /* ---------- Avisos (toast de Bootstrap) ---------- */
  function toast(msg) {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast align-items-center';
    el.setAttribute('role', 'status');
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button></div>`;
    box.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 3200 });
    el.addEventListener('hidden.bs.toast', () => el.remove());
    t.show();
  }

  /* ---------- Eventos ---------- */
  function closeThen(fn) {
    const oc = document.getElementById('navCanvas');
    const inst = oc && bootstrap.Offcanvas.getInstance(oc);
    if (inst && oc.classList.contains('show')) {
      oc.addEventListener('hidden.bs.offcanvas', fn, { once: true });
      inst.hide();
    } else fn();
  }
  function focusMain() {
    const m = document.getElementById('main');
    if (m) m.focus({ preventScroll: true });
  }
  const keepScroll = (fn) => { const y = window.scrollY; fn(); window.scrollTo(0, y); };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'INPUT') return;
    const a = b.dataset.act, v = b.dataset.v;
    switch (a) {
      case 'device': state.device = v; state.sheet = false; render(v === 'mobile' ? 'Vista móvil' : 'Vista de escritorio'); window.scrollTo(0, 0); break;
      case 'net': state.net = v; state.connMode = v === 'online' ? 'auto' : 'local'; keepScroll(() => render(v === 'online' ? 'Con internet' : 'Sin internet, modo local')); break;
      case 'mtab': state.mTab = b.dataset.t; state.sheet = false; render('Pantalla ' + b.textContent.trim()); focusMain(); break;
      case 'gstep': { const g = GUIDE[+b.dataset.i]; state.mTab = g.tab; if (g.net) { state.net = g.net; state.connMode = g.net === 'online' ? 'auto' : 'local'; } state.sheet = false; keepScroll(() => render(g.t)); break; }
      case 'go-down': if (state.device === 'mobile') { state.mTab = 'down'; } else { state.dSec = 'local'; } render(); focusMain(); break;
      case 'dsec': state.dSec = b.dataset.s; render('Sección ' + b.textContent.trim()); focusMain(); break;
      case 'dsec-oc': { const s = b.dataset.s; closeThen(() => { state.dSec = s; render(); focusMain(); }); break; }
      case 'level': state.level = v; keepScroll(() => render()); break;
      case 'hint': state.hint = +v; keepScroll(() => render('Pista ' + v)); break;
      case 'sheet': state.sheet = true; render(); (document.querySelector('.sheet .choice') || document.body).focus(); break;
      case 'sheet-close': state.sheet = false; render(); break;
      case 'conn': {
        state.connMode = v;
        if (v === 'local') state.net = 'offline'; else if (v === 'online') state.net = 'online';
        if (state.device === 'mobile') render(); else keepScroll(() => render());
        break;
      }
      case 'toast': toast(b.dataset.m || 'Diseño: sin ejecución real.'); break;
    }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.act === 'sw') state[t.dataset.k] = t.checked;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.sheet) { state.sheet = false; render(); }
  });

  render();
})();