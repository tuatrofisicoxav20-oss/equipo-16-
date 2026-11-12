/* =========================================================
   EstudiandoAndo · estilos
   ---------------------------------------------------------
   1. Tokens (claro, oscuro, alto contraste)
   2. Ajustes de accesibilidad del usuario
   3. Base y tipografía
   4. Estructura (barra superior, demostración, navegación)
   5. Componentes
   6. Pantallas
   7. Adaptación (móvil → escritorio), movimiento e impresión
   Contrastes verificados: texto ≥ 4.5:1, controles ≥ 3:1.
   ========================================================= */

/* ---------- 1. Tokens ---------- */
:root {
  color-scheme: light;
  --bg: #F3F6F8;
  --surface: #FFFFFF;
  --surface-2: #EDF2F5;
  --ink: #0F2A38;
  --ink-2: #2A4351;
  --muted: #475C69;
  --line: #D3DDE3;
  --line-strong: #71858F;
  --brand: #0A5E88;
  --brand-hover: #084B6E;
  --on-brand: #FFFFFF;
  --brand-soft: #E2EEF5;
  --brand-ink: #063A55;
  --accent: #1F9C8C;
  --accent-soft: #DFF2EE;
  --accent-ink: #08594F;
  --ok: #0A6B44;
  --ok-bg: #E2F3E9;
  --warn: #8A4108;
  --warn-bg: #FFF0DB;
  --danger: #B42318;
  --danger-bg: #FDECEA;
  --rose: #9B1C4B;
  --rose-bg: #FDEBF0;
  --vio: #4B3A9E;
  --vio-bg: #EEEBFB;
  --focus: #0A5E88;
  --focus-halo: #FFFFFF;
  --nav-bg: #0B2F45;
  --nav-ink: #DCEAF2;
  --nav-muted: #B4CFDE;
  --nav-hover: #174C6E;
  --nav-active-bg: #FFFFFF;
  --nav-active-ink: #063A55;
  --nav-focus: #8FD4F5;
  --shadow-1: 0 1px 2px rgb(15 42 56 / 8%);
  --shadow-2: 0 18px 40px -18px rgb(11 47 69 / 40%);

  --font: "Atkinson Hyperlegible", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --r-sm: 0.5rem;
  --r-md: 0.75rem;
  --r-lg: 1rem;
  --gap: 1rem;
  --topbar-h: 4rem;
  --tabbar-h: 4.5rem;
  --target: 2.75rem; /* 44 px: tamaño mínimo de objetivo táctil */
}

/* Tema oscuro: por preferencia del sistema o elegido */
@media (prefers-color-scheme: dark) {
  :root[data-theme="system"] {
    color-scheme: dark;
    --bg: #0D1A21; --surface: #14232C; --surface-2: #1A2C37;
    --ink: #E6EFF3; --ink-2: #C8D6DD; --muted: #A2B3BD;
    --line: #2A404D; --line-strong: #7890A0;
    --brand: #7CC4EA; --brand-hover: #9AD3F0; --on-brand: #04263A;
    --brand-soft: #16384A; --brand-ink: #CFE9F7;
    --accent: #5FD0BE; --accent-soft: #123A35; --accent-ink: #BDEDE4;
    --ok: #7BD8A6; --ok-bg: #12342A; --warn: #F3BE73; --warn-bg: #3A2914;
    --danger: #FF9C90; --danger-bg: #3D1A17; --rose: #FFA3C2; --rose-bg: #3D1826; --vio: #C2B8FF; --vio-bg: #251F45;
    --focus: #8FD4F5; --focus-halo: #0D1A21;
    --nav-bg: #08141A; --nav-hover: #15303F;
    --shadow-1: 0 1px 2px rgb(0 0 0 / 40%); --shadow-2: 0 18px 40px -18px rgb(0 0 0 / 70%);
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0D1A21; --surface: #14232C; --surface-2: #1A2C37;
  --ink: #E6EFF3; --ink-2: #C8D6DD; --muted: #A2B3BD;
  --line: #2A404D; --line-strong: #7890A0;
  --brand: #7CC4EA; --brand-hover: #9AD3F0; --on-brand: #04263A;
  --brand-soft: #16384A; --brand-ink: #CFE9F7;
  --accent: #5FD0BE; --accent-soft: #123A35; --accent-ink: #BDEDE4;
  --ok: #7BD8A6; --ok-bg: #12342A; --warn: #F3BE73; --warn-bg: #3A2914;
  --danger: #FF9C90; --danger-bg: #3D1A17; --rose: #FFA3C2; --rose-bg: #3D1826; --vio: #C2B8FF; --vio-bg: #251F45;
  --focus: #8FD4F5; --focus-halo: #0D1A21;
  --nav-bg: #08141A; --nav-hover: #15303F;
  --shadow-1: 0 1px 2px rgb(0 0 0 / 40%); --shadow-2: 0 18px 40px -18px rgb(0 0 0 / 70%);
}

/* Alto contraste: negro sobre blanco, bordes marcados */
:root[data-theme="contrast"] {
  color-scheme: light;
  --bg: #FFFFFF; --surface: #FFFFFF; --surface-2: #FFFFFF;
  --ink: #000000; --ink-2: #000000; --muted: #1F1F1F;
  --line: #000000; --line-strong: #000000;
  --brand: #00336B; --brand-hover: #001F42; --on-brand: #FFFFFF;
  --brand-soft: #FFFFFF; --brand-ink: #00336B;
  --accent: #00513F; --accent-soft: #FFFFFF; --accent-ink: #00513F;
  --ok: #004D2B; --ok-bg: #FFFFFF; --warn: #5C2600; --warn-bg: #FFFFFF;
  --danger: #7A0000; --danger-bg: #FFFFFF; --rose: #6B0030; --rose-bg: #FFFFFF; --vio: #2E1F7A; --vio-bg: #FFFFFF;
  --focus: #000000; --focus-halo: #FFD400;
  --nav-bg: #000000; --nav-ink: #FFFFFF; --nav-muted: #FFFFFF; --nav-hover: #333333;
  --nav-active-bg: #FFD400; --nav-active-ink: #000000; --nav-focus: #FFD400;
  --shadow-1: none; --shadow-2: none;
}

/* ---------- 2. Ajustes de accesibilidad (WCAG 1.4.4 y 1.4.12) ---------- */
html[data-text="md"] { font-size: 100%; }
html[data-text="lg"] { font-size: 112.5%; }
html[data-text="xl"] { font-size: 125%; }
html[data-text="xxl"] { font-size: 150%; }

html[data-spacing="wide"] body { line-height: 1.8; letter-spacing: 0.12em; word-spacing: 0.16em; }
html[data-spacing="wide"] p { margin-block-end: 0.5em; }

html[data-simple="on"] .is-secondary,
html[data-simple="on"] .demo__hint { display: none !important; }
html[data-simple="on"] .card { box-shadow: none; }
html[data-simple="on"] .grid--2,
html[data-simple="on"] .grid--tutor,
html[data-simple="on"] .grid--split { grid-template-columns: 1fr; }

/* ---------- 3. Base ---------- */
*, *::before, *::after { box-sizing: border-box; }

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  scroll-padding-top: calc(var(--topbar-h) + 1rem); /* el foco no queda bajo la barra fija (WCAG 2.4.11) */
  scroll-padding-bottom: calc(var(--tabbar-h) + 1rem);
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font);
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4 { margin: 0; line-height: 1.25; font-weight: 700; color: inherit; }
h1 { font-size: 1.75rem; letter-spacing: -0.01em; }
h2 { font-size: 1.25rem; }
h3 { font-size: 1.0625rem; }
p, ul, ol, dl, dd, figure, blockquote { margin: 0; }
img, svg { max-width: 100%; }
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; }
a { color: var(--brand); text-underline-offset: 0.18em; }
a:hover { color: var(--brand-hover); text-decoration-thickness: 2px; }
abbr[title] { text-decoration: none; }
strong { font-weight: 700; }
[hidden] { display: none !important; }
[tabindex="-1"]:focus:not(:focus-visible) { outline: none; }

/* Foco siempre visible y con halo para fondos de cualquier color (WCAG 2.4.7) */
:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
  box-shadow: 0 0 0 5px var(--focus-halo);
}
:root[data-theme="contrast"] :focus-visible { outline-width: 4px; }

.sr-only {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: absolute;
  left: 1rem;
  top: -10rem;
  z-index: 1000;
  padding: 0.75rem 1.125rem;
  border-radius: var(--r-md);
  background: var(--surface);
  color: var(--brand-ink);
  font-weight: 700;
  box-shadow: var(--shadow-2);
}
.skip-link:focus { top: 0.75rem; }

.noscript { padding: 1.5rem; font-size: 1.125rem; }

.ic { display: inline-block; flex: none; vertical-align: -0.2em; }
.muted { color: var(--muted); }
.small { font-size: 0.875rem; }
.big { font-size: 1.5rem; font-weight: 700; }
.big .muted { font-size: 1rem; font-weight: 400; }
.tabnum { font-variant-numeric: tabular-nums; }
.eyebrow { font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.eyebrow--inverse { color: var(--nav-muted); }
.lead { color: var(--muted); font-size: 1.0625rem; max-width: 68ch; margin-top: 0.25rem; }
.prose { max-width: 72ch; }
.optional { font-weight: 400; color: var(--muted); }
.h-sm { font-size: 1rem; margin-block: 0.25rem 0.5rem; }
.math { font-family: var(--mono); white-space: nowrap; background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-sm); padding: 0 0.375rem; }
.list-reset { list-style: none; padding: 0; margin: 0; }

/* Utilidades de composición */
.stack { display: flex; flex-direction: column; gap: var(--gap); }
.cluster { display: flex; flex-wrap: wrap; gap: 0.625rem; align-items: center; }
.cluster--tight { gap: 0.375rem; }
.grid { display: grid; gap: var(--gap); }
.grid > *, .stack > * { min-width: 0; }

/* ---------- 4. Estructura ---------- */
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  min-height: var(--topbar-h);
  padding: 0.5rem max(1rem, env(safe-area-inset-left));
  background: var(--nav-bg);
  color: var(--nav-ink);
  --focus: var(--nav-focus);
  --focus-halo: var(--nav-bg);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  color: #FFFFFF;
  text-decoration: none;
  font-weight: 700;
  font-size: 1.125rem;
  line-height: 1.1;
  min-height: var(--target);
  border-radius: var(--r-md);
  padding-inline-end: 0.25rem;
}
.brand:hover { color: #FFFFFF; }
.brand__mark { width: 2.25rem; height: 2.25rem; border-radius: 0.625rem; background: #FFFFFF; display: grid; place-items: center; overflow: hidden; flex: none; }
.brand__text { display: flex; flex-direction: column; }
.brand__sub { font-size: 0.8125rem; font-weight: 400; color: var(--nav-muted); }

.topbar__actions { margin-inline-start: auto; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.topbar .chip { border-color: transparent; }

.demo {
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}
.demo__summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: var(--target);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 700;
  color: var(--brand-ink);
  list-style: none;
}
.demo__summary::-webkit-details-marker { display: none; }
.demo__summary .ic:last-child { margin-inline-start: auto; transition: transform 0.2s; }
.demo[open] .demo__summary .ic:last-child { transform: rotate(180deg); }
.demo__hint { font-weight: 400; color: var(--muted); font-size: 0.875rem; }
.demo__body {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem 1.5rem;
  padding: 0 1rem 1rem;
}
.demo .segmented { min-width: min(100%, 16rem); }
.demo .switch { min-width: min(100%, 15rem); border: 1px solid var(--line); border-radius: var(--r-md); padding: 0.25rem 0.75rem; }

.layout { display: grid; grid-template-columns: minmax(0, 1fr); min-height: calc(100vh - var(--topbar-h)); }
.main {
  padding: 1.25rem 1rem calc(var(--tabbar-h) + 2rem);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 82rem;
  width: 100%;
  margin-inline: auto;
}
.main:focus { outline: none; }
.main > *, .card > *, .page-head__row > * { min-width: 0; }
/* Palabras largas con texto ampliado o espaciado amplio: se cortan en lugar de desbordar */
:where(.main, .topbar, .dialog) :where(h1, h2, h3, p, li, dd, dt, label, span, a, button):not(:where(.table-wrap *)) { overflow-wrap: anywhere; }
.kpi > *, .card__title > span, .feature-link > span, .banner > div, .note > div, .switch__label, .row__main { min-width: 0; }

/* Navegación: barra inferior en móvil, lateral en escritorio (mismo orden y nombres) */
.nav {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 40;
  background: var(--surface);
  border-top: 1px solid var(--line);
  padding-bottom: env(safe-area-inset-bottom);
}
.nav__list { list-style: none; margin: 0; padding: 0.25rem; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); }
.nav__label { max-width: 100%; overflow-wrap: anywhere; hyphens: auto; }
.nav__link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  min-height: 3.75rem;
  padding: 0.375rem 0.125rem;
  border-radius: var(--r-md);
  color: var(--muted);
  font-size: 0.8125rem;
  font-weight: 700;
  text-decoration: none;
  text-align: center;
}
.nav__link:hover { color: var(--brand); background: var(--surface-2); }
.nav__link[aria-current="page"] { color: var(--brand-ink); background: var(--brand-soft); }
.nav__link[aria-current="page"] .nav__icon { color: var(--brand); }
.nav__icon { position: relative; display: inline-flex; }
.nav__badge {
  position: absolute;
  top: -0.375rem;
  right: -0.75rem;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: #F2B134;
  color: #0B2F45;
  font-size: 0.75rem;
  font-weight: 700;
  display: grid;
  place-items: center;
  border: 2px solid var(--surface);
}

.footer {
  padding: 1.25rem 1rem calc(var(--tabbar-h) + 1.5rem);
  border-top: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  font-size: 0.875rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  justify-content: space-between;
  align-items: center;
}
.footer__links { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; }

/* ---------- 5. Componentes ---------- */

/* Botones */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: var(--target);
  padding: 0.5rem 1rem;
  border: 2px solid transparent;
  border-radius: var(--r-md);
  font-weight: 700;
  font-size: 0.9375rem;
  line-height: 1.2;
  text-decoration: none;
  text-align: center;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}
.btn--sm { min-height: 2.5rem; padding: 0.375rem 0.75rem; font-size: 0.875rem; }
.btn--xs { min-height: 2rem; padding: 0.125rem 0.5rem; font-size: 0.8125rem; gap: 0.25rem; }
.btn--block { width: 100%; }
.btn--primary { background: var(--brand); color: var(--on-brand); }
.btn--primary:hover { background: var(--brand-hover); color: var(--on-brand); }
.btn--secondary { background: var(--surface); color: var(--brand-ink); border-color: var(--line-strong); }
.btn--secondary:hover { background: var(--brand-soft); color: var(--brand-ink); border-color: var(--brand); }
.btn--ghost { background: transparent; color: var(--brand); }
.btn--ghost:hover { background: var(--brand-soft); color: var(--brand-ink); }
.btn--danger { background: var(--danger); color: #FFFFFF; }
.btn--danger:hover { filter: brightness(0.9); color: #FFFFFF; }
:root[data-theme="dark"] .btn--danger { color: #2B0A07; }
.btn--inverse { background: #FFFFFF; color: #063A55; }
.btn--inverse:hover { background: #E2EEF5; color: #063A55; }
.btn--ghost-inverse { background: transparent; color: #FFFFFF; border-color: rgb(255 255 255 / 45%); }
.btn--ghost-inverse:hover { background: rgb(255 255 255 / 12%); color: #FFFFFF; }
.btn--icon-label { padding-inline: 0.75rem; }
.btn:disabled,
.btn[aria-disabled="true"] {
  background: var(--surface-2);
  color: var(--muted);
  border-color: var(--line);
  filter: none;
}

.link { color: var(--brand); font-weight: 700; }
.link .ic { margin-inline-start: 0.25rem; }
.link-btn {
  background: none;
  border: 0;
  padding: 0.5rem 0;
  min-height: var(--target);
  color: var(--brand);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 0.18em;
}
.back-link { display: inline-flex; align-items: center; gap: 0.25rem; min-height: var(--target); font-weight: 700; text-decoration: none; }
.back-link:hover { text-decoration: underline; }

.icon-btn {
  width: var(--target);
  height: var(--target);
  display: inline-grid;
  place-items: center;
  border-radius: var(--r-md);
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--ink-2);
  flex: none;
}
.icon-btn:hover { background: var(--surface-2); }
.icon-btn--inverse { background: transparent; border-color: rgb(255 255 255 / 45%); color: #FFFFFF; }
.icon-btn--inverse:hover { background: rgb(255 255 255 / 12%); }

/* Chips (botones compactos) */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: var(--target);
  padding: 0.375rem 0.875rem;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--ink-2);
  font-weight: 700;
  font-size: 0.875rem;
  text-align: start;
}
.chip:hover { background: var(--brand-soft); color: var(--brand-ink); }
.chip--ok { background: var(--ok-bg); color: var(--ok); }
.chip--warn { background: var(--warn-bg); color: var(--warn); }
.chip--ok:hover { background: var(--ok-bg); color: var(--ok); text-decoration: underline; }
.chip--warn:hover { background: var(--warn-bg); color: var(--warn); text-decoration: underline; }

/* Insignias de estado (siempre con texto) */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1875rem 0.625rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.3;
  background: var(--surface-2);
  color: var(--ink-2);
  border: 1px solid transparent;
  vertical-align: middle;
}
.badge--ok { background: var(--ok-bg); color: var(--ok); }
.badge--warn { background: var(--warn-bg); color: var(--warn); }
.badge--info, .badge--brand { background: var(--brand-soft); color: var(--brand-ink); }
.badge--accent { background: var(--accent-soft); color: var(--accent-ink); }
.badge--neutral { background: var(--surface-2); color: var(--ink-2); }
:root[data-theme="contrast"] .badge { border-color: currentColor; }

/* Tarjetas */
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 1rem;
  box-shadow: var(--shadow-1);
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}
.card--brand { border-top: 4px solid var(--brand); }
.card--accent { border-top: 4px solid var(--accent); }
.card--warn { border-top: 4px solid var(--warn); }
.card--ok { border-top: 4px solid var(--ok); }
.card__head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.5rem; }
.card__title { display: flex; align-items: center; gap: 0.5rem; font-size: 1.125rem; }
.card__title .ic { color: var(--brand); }
.card h3 { margin-top: 0.25rem; }

/* Encabezado de página */
.page-head { display: flex; flex-direction: column; gap: 0.25rem; }
.page-head__row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 0.75rem 1.5rem; }
.page-head__actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

/* Avisos */
.banner, .note {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.875rem 1rem;
  border-radius: var(--r-md);
  border: 1px solid;
  border-inline-start-width: 5px;
}
.banner .ic, .note .ic { margin-top: 0.1rem; }
.banner__title { font-weight: 700; }
.banner__actions { margin-top: 0.375rem; }
.banner--ok { background: var(--ok-bg); color: var(--ok); border-color: var(--ok); }
.banner--ok p:not(.banner__title) { color: var(--ink); }
.banner--warn { background: var(--warn-bg); color: var(--warn); border-color: var(--warn); }
.banner--warn p:not(.banner__title) { color: var(--ink); }
.note { background: var(--brand-soft); color: var(--ink); border-color: var(--brand); }
.note .ic { color: var(--brand); }
.note--accent { background: var(--accent-soft); border-color: var(--accent-ink); }
.note--accent .ic { color: var(--accent-ink); }
.note--warn { background: var(--warn-bg); border-color: var(--warn); }
.note--warn .ic { color: var(--warn); }
.note--brand { background: var(--brand-soft); }

/* Tonos para iconos de mosaico */
.tone-brand { --tb: var(--brand-soft); --ti: var(--brand-ink); }
.tone-accent { --tb: var(--accent-soft); --ti: var(--accent-ink); }
.tone-warn { --tb: var(--warn-bg); --ti: var(--warn); }
.tone-rose { --tb: var(--rose-bg); --ti: var(--rose); }
.tone-vio { --tb: var(--vio-bg); --ti: var(--vio); }
.tile-icon {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--r-md);
  display: grid;
  place-items: center;
  flex: none;
  background: var(--tb, var(--brand-soft));
  color: var(--ti, var(--brand-ink));
}
.tile-icon--letter { font-weight: 700; font-size: 1.25rem; }
:root[data-theme="contrast"] .tile-icon { border: 2px solid currentColor; }

/* Indicadores (KPI) */
.kpis { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.5rem), 1fr)); gap: 0.75rem; }
.kpi {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 0.75rem;
  box-shadow: var(--shadow-1);
}
.kpi__value { font-size: 1.375rem; font-weight: 700; line-height: 1.1; }
.kpi__label { font-size: 0.875rem; color: var(--muted); }

/* Barras de progreso y dominio */
.bar { height: 0.625rem; background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; overflow: hidden; }
.bar > span { display: block; height: 100%; width: var(--w, 0%); background: var(--brand); border-radius: inherit; }
.bar--ok > span { background: var(--ok); }
.bar--mid > span, .bar--brand > span { background: var(--brand); }
.bar--low > span, .bar--warn > span { background: var(--warn); }
.bar--none > span { background: var(--line-strong); }
:root[data-theme="contrast"] .bar { border-color: #000; }

.bars { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1rem; }
.bars__row, .progress__row { display: flex; justify-content: space-between; gap: 0.5rem; font-weight: 700; margin-bottom: 0.25rem; }
.bars__value { font-variant-numeric: tabular-nums; white-space: nowrap; }
.bars__meta { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.375rem; margin-top: 0.375rem; }
.progress { margin-top: 0.5rem; font-size: 0.875rem; }

.meter-steps { display: flex; gap: 0.375rem; }
.meter-steps span { flex: 1; height: 0.5rem; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--line-strong); }
.meter-steps span.is-on { background: var(--accent); border-color: var(--accent); }

/* Gráficas */
.chart svg { width: 100%; max-width: 26rem; height: auto; display: block; margin-inline: auto; }
.chart__bar { fill: var(--brand); }
.chart__bar--today { fill: var(--accent); }
.chart__bar--empty { fill: var(--line-strong); }
.chart__axis { fill: var(--muted); font-size: 12px; font-weight: 700; font-family: var(--font); }
.chart__val { fill: var(--ink-2); font-size: 11px; font-weight: 700; font-family: var(--font); }
.chart figcaption { margin-top: 0.5rem; text-align: center; }

.ring { position: relative; width: 4rem; height: 4rem; flex: none; }
.ring svg { transform: rotate(-90deg); }
.ring__track { fill: none; stroke: var(--surface-2); stroke-width: 7; }
.ring__fill { fill: none; stroke: var(--accent); stroke-width: 7; stroke-linecap: round; }
.ring > span { position: absolute; inset: 0; display: grid; place-items: center; font-weight: 700; }

.compare { display: flex; flex-direction: column; gap: 0.375rem; }
.compare__title { font-weight: 700; }
.compare__row { display: grid; grid-template-columns: 4.5rem 1fr 3rem; align-items: center; gap: 0.5rem; font-size: 0.875rem; }
.compare__row b { text-align: end; }

/* Ruta de aprendizaje */
.route { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.route__item { display: flex; gap: 0.75rem; position: relative; padding-bottom: 1rem; }
.route__item:last-child { padding-bottom: 0; }
.route__item::before { content: ""; position: absolute; left: 0.8125rem; top: 1.875rem; bottom: 0.125rem; width: 2px; background: var(--line-strong); }
.route__item:last-child::before { display: none; }
.route__dot {
  width: 1.75rem; height: 1.75rem; flex: none;
  border-radius: 50%;
  display: grid; place-items: center;
  border: 2px solid var(--line-strong);
  background: var(--surface);
  color: var(--muted);
}
.route__item--done .route__dot { background: var(--ok); border-color: var(--ok); color: var(--surface); }
.route__item--now .route__dot { background: var(--brand); border-color: var(--brand); color: var(--on-brand); }
.route__item--now .route__title { color: var(--brand-ink); }
.route__title { font-weight: 700; }
.route__detail { font-size: 0.875rem; color: var(--muted); }

/* Ciclo pedagógico */
.cycle { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
.cycle__item {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.375rem 0.75rem 0.375rem 0.375rem;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  font-weight: 700;
  font-size: 0.875rem;
}
.cycle__n { width: 1.5rem; height: 1.5rem; border-radius: 50%; display: grid; place-items: center; background: var(--surface); font-size: 0.75rem; }
.cycle__item.is-done { background: var(--ok-bg); color: var(--ok); }
.cycle__item.is-now { background: var(--brand); color: var(--on-brand); }
.cycle__item.is-now .cycle__n { color: var(--brand-ink); }
.cycle__item:not(:last-child)::after { content: "→"; margin-inline-start: 0.25rem; color: var(--muted); }
.cycle__item.is-now::after { color: var(--on-brand); }

/* Listas */
.list-icons { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.625rem; }
.list-icons li { display: flex; gap: 0.625rem; align-items: flex-start; }
.list-icons .ic { color: var(--brand); margin-top: 0.15rem; }

.list-rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.row { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--line); }
.row:first-child { padding-top: 0; }
.row:last-child { border-bottom: 0; padding-bottom: 0; }
.row__main { flex: 1 1 12rem; min-width: 0; }
.row__title { font-weight: 700; }
.row__sub { font-size: 0.875rem; color: var(--muted); }
.row__actions { display: flex; flex-wrap: wrap; gap: 0.375rem; align-items: center; }
.row__note { display: inline-flex; gap: 0.375rem; align-items: center; font-size: 0.875rem; color: var(--warn); font-weight: 700; }

.steps { margin: 0; padding-inline-start: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
.steps li::marker { font-weight: 700; color: var(--brand); }

.dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; margin: 0; }
.dl dt { font-size: 0.8125rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
.dl dd { font-weight: 700; }

.quote { border-inline-start: 4px solid var(--accent); padding: 0.25rem 0 0.25rem 0.875rem; }
.quote p { font-size: 1.0625rem; }
.quote footer { margin-top: 0.375rem; font-size: 0.875rem; color: var(--muted); }
.messages { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; }

/* Formularios */
.form { display: flex; flex-direction: column; gap: 1.125rem; }
.field { display: flex; flex-direction: column; gap: 0.375rem; }
.field > label, .field__label { font-weight: 700; }
.field--inline { min-width: min(100%, 18rem); }
.field__hint { font-size: 0.875rem; color: var(--muted); }
.field__error { display: flex; gap: 0.375rem; align-items: flex-start; color: var(--danger); font-weight: 700; font-size: 0.9375rem; }
.field__error .ic { margin-top: 0.15rem; }

input[type="text"], input[type="search"], select, textarea {
  width: 100%;
  min-height: var(--target);
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--line-strong);
  border-radius: var(--r-md);
  background: var(--surface);
  color: var(--ink);
}
textarea { resize: vertical; min-height: 6rem; }
input:hover, select:hover, textarea:hover { border-color: var(--ink-2); }
[aria-invalid="true"], .is-invalid input, .is-invalid textarea { border-color: var(--danger); }

.input-prefix { display: flex; align-items: stretch; max-width: 14rem; }
.input-prefix > span { display: grid; place-items: center; padding: 0 0.75rem; border: 2px solid var(--line-strong); border-inline-end: 0; border-radius: var(--r-md) 0 0 var(--r-md); background: var(--surface-2); font-family: var(--mono); font-weight: 700; }
.input-prefix input { border-radius: 0 var(--r-md) var(--r-md) 0; font-family: var(--mono); font-size: 1.125rem; }

.error-summary {
  border: 3px solid var(--danger);
  border-radius: var(--r-md);
  padding: 1rem;
  background: var(--danger-bg);
}
.error-summary h2 { display: flex; gap: 0.5rem; align-items: center; color: var(--danger); font-size: 1.125rem; }
.error-summary ul { margin-top: 0.5rem; padding-inline-start: 1.25rem; }
.error-summary a { color: var(--danger); font-weight: 700; }

/* Preguntas de opción múltiple */
.question { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.625rem; }
.question legend { font-weight: 700; font-size: 1.0625rem; padding: 0; margin-bottom: 0.5rem; }
.question__n { display: block; font-size: 0.8125rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
.question.is-invalid { border-inline-start: 4px solid var(--danger); padding-inline-start: 0.875rem; }
.options { display: grid; gap: 0.5rem; }
.option {
  display: flex; gap: 0.75rem; align-items: center;
  min-height: var(--target);
  padding: 0.625rem 0.875rem;
  border: 2px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  cursor: pointer;
}
.option:hover { border-color: var(--line-strong); }
.option:has(input:checked) { border-color: var(--brand); background: var(--brand-soft); }
.option input, .check-row input { width: 1.25rem; height: 1.25rem; accent-color: var(--brand); flex: none; margin: 0; }

.checklist { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.check-row { display: flex; gap: 0.75rem; align-items: flex-start; padding: 0.75rem; border: 1px solid var(--line); border-radius: var(--r-md); cursor: pointer; }
.check-row input { margin-top: 0.15rem; }
.check-row:has(input:checked) { border-color: var(--brand); background: var(--brand-soft); }
.plan-total { font-size: 1.0625rem; }

/* Interruptor (checkbox con role="switch") */
.switch { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: var(--target); padding-block: 0.375rem; }
.switch__label { display: flex; flex-direction: column; cursor: pointer; flex: 1; }
.switch__text { font-weight: 700; }
.switch__hint { font-size: 0.875rem; color: var(--muted); }
.switch__input {
  appearance: none;
  -webkit-appearance: none;
  flex: none;
  width: 3.25rem;
  height: 1.875rem;
  margin: 0;
  border-radius: 999px;
  border: 2px solid var(--line-strong);
  background: var(--surface-2);
  position: relative;
  cursor: pointer;
  transition: background-color 0.15s;
}
.switch__input::before {
  content: "";
  position: absolute;
  top: 0.1875rem;
  left: 0.1875rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: var(--line-strong);
  transition: transform 0.15s;
}
.switch__input:checked { background: var(--brand); border-color: var(--brand); }
.switch__input:checked::before { transform: translateX(1.375rem); background: var(--on-brand); }
.switch__input:disabled { opacity: 0.6; cursor: not-allowed; }
.switch-list { display: flex; flex-direction: column; gap: 0.25rem; }

/* Control segmentado (radios nativos) */
.segmented { border: 0; padding: 0; margin: 0; min-width: 0; }
.segmented__legend { font-weight: 700; margin-bottom: 0.375rem; padding: 0; }
.segmented__options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: var(--r-md);
  background: var(--surface-2);
  border: 1px solid var(--line-strong);
}
.segmented__opt { flex: 1 1 auto; position: relative; }
.segmented__opt input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
.segmented__opt span {
  display: flex; align-items: center; justify-content: center; gap: 0.375rem;
  min-height: 2.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: calc(var(--r-md) - 0.25rem);
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--ink-2);
  text-align: center;
}
.segmented__opt input:hover + span { background: var(--surface); }
.segmented__opt input:checked + span { background: var(--surface); color: var(--brand-ink); box-shadow: var(--shadow-1); outline: 2px solid var(--brand); outline-offset: -2px; }
.segmented__opt input:focus-visible + span { outline: 3px solid var(--focus); outline-offset: 2px; box-shadow: 0 0 0 5px var(--focus-halo); }

/* Tablas */
.table-wrap { position: relative; overflow-x: auto; max-width: 100%; border-radius: var(--r-md); } /* relative: los textos sr-only no escapan del desplazamiento */
.table { width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
.table th, .table td { text-align: start; padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--line); vertical-align: top; }
.table thead th { font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); white-space: nowrap; }
.table td.is-current { background: var(--brand-soft); font-weight: 700; }

/* Mapa de aprendizaje */
.heat { width: 100%; border-collapse: separate; border-spacing: 0.25rem; font-size: 0.875rem; }
.heat th { font-weight: 700; text-align: center; color: var(--muted); font-size: 0.8125rem; padding: 0 0.25rem 0.25rem; }
.heat th[scope="row"] { text-align: start; color: var(--ink); font-size: 0.9375rem; white-space: nowrap; padding-inline-end: 0.75rem; }
.heat td { text-align: center; padding: 0; }
.heat__cell {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem;
  min-width: 3.5rem; height: 2.25rem;
  padding: 0 0.375rem;
  border-radius: var(--r-sm);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  border: 1px solid transparent;
}
.heat__cell--ok { background: var(--ok-bg); color: var(--ok); }
.heat__cell--mid { background: var(--brand-soft); color: var(--brand-ink); }
.heat__cell--low { background: var(--warn-bg); color: var(--warn); border: 2px solid var(--warn); }
.heat__cell--none { background: var(--surface-2); color: var(--muted); border: 1px dashed var(--line-strong); }
.heat__cell--sm { min-width: 2rem; height: 1.75rem; }
:root[data-theme="contrast"] .heat__cell { border: 2px solid currentColor; }
.legend { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; font-size: 0.875rem; }
.legend li { display: inline-flex; align-items: center; gap: 0.5rem; }

/* Avatar */
.avatar { display: grid; place-items: center; border-radius: 50%; background: #F2B134; color: #0B2F45; font-weight: 700; flex: none; }
.avatar--sm { width: 2.25rem; height: 2.25rem; font-size: 0.9375rem; background: var(--brand-soft); color: var(--brand-ink); }
.avatar--md { width: 2.75rem; height: 2.75rem; font-size: 1.125rem; }
.avatar--lg { width: 3.25rem; height: 3.25rem; font-size: 1.375rem; }

/* Estado vacío */
.empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.5rem; padding: 2rem 1rem; background: var(--surface); border: 1px dashed var(--line-strong); border-radius: var(--r-lg); }
.empty p { color: var(--muted); max-width: 42ch; }

/* Mascota */
.mascot { display: block; flex: none; overflow: visible; }
.mascot--face { overflow: hidden; }
.mascot--float { animation: bob 4.2s ease-in-out infinite; }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

/* Diálogo modal */
.dialog {
  width: min(36rem, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
  padding: 0;
  border: 0;
  border-radius: var(--r-lg);
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-2);
}
.dialog--sm { width: min(28rem, calc(100vw - 2rem)); }
.dialog::backdrop { background: rgb(11 47 69 / 60%); }
:root[data-theme="contrast"] .dialog { border: 3px solid #000; }
.dialog__inner { display: flex; flex-direction: column; max-height: calc(100vh - 2rem); }
.dialog__head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1rem 1rem 0.75rem 1.25rem; border-bottom: 1px solid var(--line); }
.dialog__title { font-size: 1.25rem; }
.dialog__body { padding: 1.25rem; overflow-y: auto; }
.dialog__foot { padding: 0.75rem 1.25rem 1rem; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.625rem; }
.dialog__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.625rem; margin-top: 0.5rem; }

/* Avisos breves */
.toasts {
  position: fixed;
  z-index: 200;
  left: 50%;
  bottom: calc(var(--tabbar-h) + 1rem);
  transform: translateX(-50%);
  width: min(30rem, calc(100vw - 2rem));
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.toast {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.625rem 0.625rem 0.875rem;
  border-radius: var(--r-md);
  background: #0B2F45;
  color: #FFFFFF;
  box-shadow: var(--shadow-2);
  border-inline-start: 5px solid #8FD4F5;
  animation: toast-in 0.18s ease-out;
  --focus: #8FD4F5;
  --focus-halo: #0B2F45;
}
.toast--ok { border-inline-start-color: #7BD8A6; }
.toast--warn { border-inline-start-color: #F3BE73; }
.toast__msg { flex: 1; }
.toast.is-leaving { opacity: 0; transition: opacity 0.18s; }
@keyframes toast-in { from { opacity: 0; transform: translateY(0.5rem); } to { opacity: 1; transform: none; } }

/* ---------- 6. Pantallas ---------- */

/* Inicio del estudiante */
.hero {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1.25rem;
  border-radius: var(--r-lg);
  background: #0B2F45;
  color: #FFFFFF;
  --focus: #8FD4F5;
  --focus-halo: #0B2F45;
}
:root[data-theme="contrast"] .hero { background: #000; }
.hero h1 { color: #FFFFFF; font-size: 1.875rem; }
.hero__say {
  margin-top: 0.625rem;
  background: #FFFFFF;
  color: #0F2A38;
  border-radius: 1rem 1rem 1rem 0.25rem;
  padding: 0.75rem 0.875rem;
  max-width: 56ch;
}
.hero__actions { display: flex; flex-wrap: wrap; gap: 0.625rem; margin-top: 1rem; }
.hero__actions .btn--ghost { color: #FFFFFF; }
.hero__actions .btn--ghost:hover { background: rgb(255 255 255 / 12%); color: #FFFFFF; }

/* Lección */
.lesson { min-height: 6rem; }
.balance svg { width: 100%; max-width: 26rem; height: auto; display: block; margin-inline: auto; }
.balance__stand, .balance__beam, .balance__rope { stroke: var(--ink-2); stroke-width: 4; stroke-linecap: round; fill: none; }
.balance__pan { fill: var(--brand-soft); stroke: var(--brand); stroke-width: 2; }
.balance__pivot { fill: var(--accent); }
.balance__txt { fill: var(--brand-ink); font-family: var(--mono); font-size: 16px; font-weight: 700; }
.balance figcaption { text-align: center; margin-top: 0.5rem; }

/* Revisión de respuestas */
.review { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
.review__item { padding: 0.75rem; border: 1px solid var(--line); border-radius: var(--r-md); display: flex; flex-direction: column; gap: 0.375rem; }

/* Tutor */
.grid--tutor { grid-template-columns: 1fr; }
.chat-card { gap: 0.75rem; }
.chat {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 28rem;
  min-height: 12rem;
  overflow-y: auto;
  padding: 0.75rem;
  border-radius: var(--r-md);
  background: var(--surface-2);
  border: 1px solid var(--line);
  overscroll-behavior: contain;
  position: relative;
}
.msg { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }
.msg--tutor { flex-direction: row; align-items: flex-end; gap: 0.5rem; }
.msg__body { display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem; max-width: 86%; }
.msg__bubble { padding: 0.625rem 0.875rem; border-radius: 1rem; max-width: 86%; }
.msg--me .msg__bubble { background: var(--brand); color: var(--on-brand); border-bottom-right-radius: 0.25rem; }
.msg--tutor .msg__bubble { background: var(--surface); border: 1px solid var(--line); border-bottom-left-radius: 0.25rem; max-width: 100%; }
.msg__bubble--typing { color: var(--muted); font-style: italic; }
.msg__status { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.8125rem; color: var(--warn); font-weight: 700; }
.quick { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.composer { display: flex; flex-direction: column; gap: 0.375rem; }
.composer__label { font-weight: 700; }
.composer__row { display: flex; gap: 0.5rem; }
.composer__row input { flex: 1; min-width: 0; }

.ladder { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.ladder__step { display: flex; gap: 0.625rem; align-items: flex-start; }
.ladder__step.is-open, .ladder__step.is-locked { padding: 0.625rem 0.75rem; border-radius: var(--r-md); border: 1px solid var(--line); }
.ladder__step.is-open { background: var(--accent-soft); border-color: var(--accent-ink); }
.ladder__step.is-locked { color: var(--muted); border-style: dashed; }
.ladder__n { width: 1.625rem; height: 1.625rem; border-radius: 50%; display: grid; place-items: center; flex: none; font-weight: 700; font-size: 0.8125rem; background: var(--surface-2); color: var(--muted); }
.is-open .ladder__n { background: var(--accent-ink); color: var(--surface); }
.solution { padding: 0.875rem; border-radius: var(--r-md); border: 2px solid var(--brand); display: flex; flex-direction: column; gap: 0.5rem; }
.solution .steps { font-family: var(--mono); }

/* Logros */
.achievements { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.achievements li { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.375rem; font-weight: 700; font-size: 0.875rem; color: var(--muted); }
.achievements__icon { width: 3.25rem; height: 3.25rem; border-radius: 50%; display: grid; place-items: center; background: var(--surface-2); border: 2px dashed var(--line-strong); }
.achievements .is-done { color: var(--ink); }
.achievements .is-done .achievements__icon { background: var(--warn-bg); color: var(--warn); border: 2px solid var(--warn); }

/* Docente: alertas */
.alert-card {
  height: 100%;
  background: var(--surface);
  border: 1px solid var(--line);
  border-inline-start: 6px solid var(--warn);
  border-radius: var(--r-lg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  box-shadow: var(--shadow-1);
}
.alert-card--rev { border-inline-start-color: var(--ok); }
.alert-card--dis { border-inline-start-color: var(--line-strong); background: var(--surface-2); box-shadow: none; }
.alert-card__title { font-size: 1.125rem; }

/* Docente: alumnos */
.grid--split { grid-template-columns: 1fr; }
.roster { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.roster__item {
  display: flex; align-items: center; gap: 0.75rem;
  min-height: 3.25rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--r-md);
  color: var(--ink);
  text-decoration: none;
}
.roster__item:hover { background: var(--surface-2); color: var(--ink); }
.roster__item[aria-current="page"] { background: var(--brand-soft); box-shadow: inset 4px 0 0 var(--brand); }
.roster__main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.roster__name { font-weight: 700; }
.roster__sub { font-size: 0.875rem; color: var(--muted); }
.roster__flag { color: var(--warn); display: inline-flex; }
.detail__head { display: flex; align-items: center; gap: 0.875rem; flex-wrap: wrap; }
.detail__head > div { flex: 1; }
.detail h2 { font-size: 1.375rem; }

/* Acerca del proyecto */
.toc ol { margin: 0; padding-inline-start: 1.25rem; display: grid; gap: 0.25rem; }
.toc li { min-height: 2rem; }
.section { display: flex; flex-direction: column; gap: 1rem; padding-top: 0.5rem; }
.section > h2 { font-size: 1.5rem; }
.section:focus { outline: none; }
.stats { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
.stat { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
.stat__value { font-size: 2rem; font-weight: 700; color: var(--brand); line-height: 1.1; }
.stat__src { font-size: 0.8125rem; color: var(--muted); margin-top: auto; }
.defs { display: grid; gap: 0.75rem; margin: 0; }
.defs > div { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md); padding: 0.875rem 1rem; }
.defs dt { font-weight: 700; }
.defs dd { color: var(--ink-2); }
.feature-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.feature-link { display: flex; align-items: center; gap: 0.5rem; min-height: var(--target); padding: 0.25rem 0.5rem; border-radius: var(--r-sm); font-weight: 700; text-decoration: none; }
.feature-link:hover { background: var(--brand-soft); text-decoration: underline; }
.sources { margin: 0; padding-inline-start: 1.5rem; display: flex; flex-direction: column; gap: 0.625rem; font-size: 0.9375rem; overflow-wrap: anywhere; }

/* Recorrido guiado */
.tour { list-style: none; margin: 1rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.375rem; }
.tour__step {
  width: 100%;
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  min-height: 3.25rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  text-align: start;
}
.tour__step:hover { border-color: var(--brand); background: var(--brand-soft); }
.tour__step > span:nth-child(2) { flex: 1; display: flex; flex-direction: column; }
.tour__n { width: 1.75rem; height: 1.75rem; border-radius: 50%; display: grid; place-items: center; background: var(--brand); color: var(--on-brand); font-weight: 700; font-size: 0.875rem; flex: none; }
.tour__title { font-weight: 700; }
.tour__detail { font-size: 0.875rem; color: var(--muted); }

/* Escenario de la demostración: la app dentro de un marco de teléfono o de computadora */
.stage { min-height: 100vh; display: flex; flex-direction: column; }
.stage__main {
  flex: 1;
  display: grid;
  gap: 1.5rem;
  justify-items: center;
  align-content: start;
  padding: 1.5rem 1rem 2.5rem;
  width: 100%;
  max-width: 82rem;
  margin-inline: auto;
}
.stage__main:focus { outline: none; }
.stage__intro { display: flex; flex-direction: column; gap: 0.875rem; width: 100%; max-width: 34rem; min-width: 0; }
.stage__intro > p { margin: 0; }
.stage__title { margin: 0; }
.stage__note { display: flex; gap: 0.5rem; align-items: flex-start; font-size: 0.9375rem; color: var(--muted); }
.stage__note .ic { flex: none; margin-top: 0.15em; }

.device { position: relative; flex: none; background: var(--nav-bg); box-shadow: var(--shadow-2); }
.device__frame { display: block; border: 0; background: var(--bg); }
/* Teléfono: 390 × 844 px (tamaño CSS típico de un celular actual) */
.device--phone { padding: 0.75rem; border-radius: 2.75rem; border: 1px solid var(--line-strong); }
.device--phone .device__frame { width: 390px; height: clamp(480px, calc(100vh - 9rem), 844px); border-radius: 2rem; }
/* Computadora: 1280 px de ancho, reducida con --scale (calculada en app.js) para caber en la ventana */
.device--desktop {
  --scale: 0.5;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border: 0.5rem solid var(--nav-bg);
  border-radius: var(--r-lg);
}
.device--desktop .device__frame {
  width: 1280px;
  height: calc(100% / var(--scale));
  transform: scale(var(--scale));
  transform-origin: 0 0;
}

/* ---------- 7. Adaptación ---------- */
.show-sm { display: none; }

@media (max-width: 30em) { /* ≤ 480 px */
  .hide-sm { display: none; }
  .show-sm { display: inline; }
  .brand__sub { display: none; }
  /* En pantallas angostas la conexión se muestra solo con icono; el texto queda para lectores de pantalla
     y el aviso de cada página explica el estado. */
  .topbar .chip { width: var(--target); padding: 0; justify-content: center; }
  .topbar .chip > span:not(.sr-only) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  h1 { font-size: 1.5rem; }
  .hero { flex-direction: column; align-items: flex-start; }
  .hero__mascot { display: none; }
  .demo__hint { display: none; }
  .composer__row { flex-direction: column; }
  .dl { grid-template-columns: 1fr; }
}

@media (min-width: 40em) { /* ≥ 640 px */
  .main { padding-inline: 1.5rem; }
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .achievements { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (min-width: 60em) { /* ≥ 960 px: navegación lateral */
  :root { --tabbar-h: 0rem; }
  .layout { grid-template-columns: 15rem minmax(0, 1fr); }
  .nav {
    position: sticky;
    top: var(--topbar-h);
    align-self: start;
    height: calc(100vh - var(--topbar-h));
    border-top: 0;
    border-inline-end: 1px solid var(--line);
    padding: 1rem 0.75rem;
    background: var(--surface);
  }
  .nav__list { display: flex; flex-direction: column; gap: 0.25rem; padding: 0; }
  .nav__link { flex-direction: row; gap: 0.75rem; min-height: 3rem; padding: 0.5rem 0.875rem; font-size: 1rem; text-align: start; }
  .nav__link[aria-current="page"] { box-shadow: inset 4px 0 0 var(--brand); }
  .nav__badge { position: static; margin-inline-start: 0.5rem; order: 2; }
  .nav__icon { gap: 0; }
  .main { padding: 1.75rem 2rem 2.5rem; }
  .footer { padding-bottom: 1.25rem; }
  .grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
  .grid--tutor { grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); align-items: start; }
  .grid--split { grid-template-columns: minmax(16rem, 0.8fr) minmax(0, 1.6fr); align-items: start; }
  .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .defs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hero { padding: 1.5rem 1.75rem; }
  .toasts { bottom: 1.5rem; }
  .stage[data-stage="phone"] .stage__main { grid-template-columns: minmax(0, 26rem) auto; justify-content: center; align-items: start; column-gap: 3rem; padding-top: 2rem; }
  .stage[data-stage="phone"] .stage__intro { position: sticky; top: calc(var(--topbar-h) + 2rem); }
}

/* Con texto grande, la barra inferior se apila mejor en dos líneas */
html[data-text="xxl"] .nav__label { font-size: 0.75rem; }

/* Movimiento reducido (sistema o preferencia) */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
html[data-motion="reduce"] *,
html[data-motion="reduce"] *::before,
html[data-motion="reduce"] *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }

/* Modo de colores forzados (Windows Alto contraste) */
@media (forced-colors: active) {
  .nav__link[aria-current="page"], .roster__item[aria-current="page"] { outline: 3px solid CanvasText; }
  .segmented__opt input:checked + span { outline: 3px solid Highlight; }
  .bar > span, .meter-steps span.is-on { background: Highlight; forced-color-adjust: none; }
  .switch__input:checked { background: Highlight; }
  .badge, .heat__cell, .chip { border: 1px solid CanvasText; }
  .device { border: 2px solid CanvasText; }
}

/* Impresión: solo el contenido */
@media print {
  .topbar, .demo, .nav, .footer, .toasts, .skip-link, .hero__actions, .quick, .composer { display: none !important; }
  .main { padding: 0; }
  .card, .stat { box-shadow: none; break-inside: avoid; }
  body { background: #FFFFFF; color: #000000; }
}

/* === Fusión de prototipos: paneles de avance + laboratorio visual === */
.story-grid,.dashboard-charts{margin-block:1.15rem 1.5rem;align-items:stretch}
.story-grid .card,.dashboard-charts .card{height:100%}
.story-grid .card>.card__head,.dashboard-charts .card>.card__head{align-items:center}
.group-switcher{display:flex;align-items:end;gap:1rem;flex-wrap:wrap;margin:0 0 1rem}
.group-switcher .field{width:min(100%,22rem)}
.group-switcher .badge{margin-bottom:.65rem}
.trend-figure{display:grid;gap:.5rem;min-width:0}
.trend-figure svg{width:100%;height:auto;max-height:260px;display:block;color:var(--ink-2);overflow:visible}
.trend-path{fill:none;stroke:var(--brand);stroke-width:4.2;stroke-linecap:round;stroke-linejoin:round}
.trend-point{fill:var(--accent);stroke:var(--surface);stroke-width:2}
.trend-value{fill:var(--ink);font-size:13px;font-family:var(--font);font-weight:700}
.trend-axis{fill:var(--muted);font-size:12px;font-family:var(--font)}
.trend-caption{font-size:.88rem;color:var(--muted)}
.trend-caption strong{color:var(--brand-ink);font-size:1rem}
.chart-details{border-top:1px solid var(--line);padding-top:.5rem}
.chart-details summary{cursor:pointer;color:var(--brand-ink);font-weight:700;min-height:44px;display:flex;align-items:center;max-width:max-content}
.dist-track{display:flex;width:100%;height:42px;border-radius:12px;overflow:hidden;border:1px solid var(--line-strong);margin-block:1rem}
.dist-slice{min-width:1px}
.dist-success{background:var(--ok)}.dist-mid{background:var(--brand)}.dist-low{background:var(--warn)}
.dist-legend,.compare-group-list{list-style:none;margin:.5rem 0 0;padding:0;display:grid;gap:.55rem}
.dist-legend li{display:flex;gap:.6rem;align-items:center;font-size:.9rem}
.dist-swatch{width:15px;height:15px;min-width:15px;border-radius:4px}
.group-graph-link{display:grid;grid-template-columns:minmax(3.2rem,auto) minmax(4rem,1fr) 3.5rem;align-items:center;gap:.75rem;min-height:50px;padding:.35rem .45rem;color:var(--ink);text-decoration:none;border-radius:9px}
.group-graph-link:hover,.group-graph-link:focus-visible,.group-graph-link.is-current{background:var(--brand-soft)}
.group-graph-link.is-current{outline:2px solid var(--brand)}
.group-graph-bar{height:17px;background:var(--surface-2);border:1px solid var(--line-strong);border-radius:9px;overflow:hidden}
.group-graph-bar>span{display:block;height:100%;background:var(--brand);border-radius:9px}
.group-graph-name{font-weight:700}.group-graph-link strong{font-variant-numeric:tabular-nums;text-align:right}
.individual-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem;margin-block:1rem}
.individual-summary>div{display:grid;gap:.25rem;background:var(--surface-2);padding:1rem;border:1px solid var(--line);border-radius:12px}
.individual-summary strong{font-size:1.55rem;color:var(--brand-ink);font-variant-numeric:tabular-nums}
.ai-observation{border-left:4px solid var(--accent);padding-left:1rem;margin-bottom:1rem}
.ai-observation p{margin-top:.55rem}
.visual-layout{margin-block:1rem}.visual-layout .card{min-width:0}
.math-visual{min-width:0;background:var(--surface-2);border-radius:12px;border:1px solid var(--line);padding:.75rem;display:grid;gap:.5rem;margin-block:1rem}
.math-visual svg{width:100%;height:auto;max-height:250px}
.math-caption{font-weight:650;color:var(--ink-2);font-size:.9rem;min-height:3rem}
.visual-actions .btn{flex:1 1 7rem;white-space:normal}.visual-finish{margin-top:1rem}
@media (max-width:480px){.trend-value{font-size:12px}.trend-axis{font-size:12px}.group-graph-link{gap:.4rem}.individual-summary strong{font-size:1.25rem}}
@media (prefers-reduced-motion:reduce){.trend-path,.trend-point,.dist-slice{transition:none!important;animation:none!important}}
@media(forced-colors:active){.dist-slice,.group-graph-bar>span{border:2px solid CanvasText}.trend-path{stroke:CanvasText}.trend-point{fill:Highlight}}

/* ===== Vista previa y uso offline · EstudiandoAndo ===== */
.quickbar{display:flex;align-items:center;justify-content:space-between;gap:.75rem 1.5rem;padding:.7rem clamp(.8rem,3vw,1.5rem);background:var(--surface);border-bottom:1px solid var(--line);flex-wrap:wrap;position:relative;z-index:5}
.quickbar__views,.quickbar__right{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap}
.quickbar__label{font-size:.875rem;font-weight:700;color:var(--muted);margin-right:.3rem}
.quickbar__btn{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:.4rem;background:var(--surface);border:1px solid var(--line-strong);border-radius:.7rem;padding:.5rem .85rem;font-size:.9rem;font-weight:700;color:var(--ink);white-space:nowrap}
.quickbar__btn:hover{background:var(--surface-2);border-color:var(--brand)}
.quickbar__btn[aria-pressed="true"]{color:var(--on-brand);background:var(--brand);border-color:var(--brand)}
.quickbar__offline{border-color:var(--brand);color:var(--brand-ink)}
.quickbar__offline[aria-pressed="true"]{background:var(--warn-bg);border-color:var(--warn);color:var(--warn)}
.quickbar__offline:disabled{cursor:not-allowed;opacity:.75}
.quickbar__status{display:inline-flex;align-items:center;gap:.35rem;color:var(--muted);font-size:.83rem;font-weight:600}
.offline-guide{border:1px solid var(--line);background:var(--surface);padding:1.3rem;border-radius:1rem;display:grid;gap:1rem;margin-bottom:1rem;box-shadow:var(--shadow-1)}
.offline-guide__top{display:flex;align-items:start;gap:.9rem}
.offline-guide__top h2{font-size:1.25rem;margin-bottom:.35rem}
.offline-guide__top p{color:var(--muted)}
.offline-guide__icon{flex:none;width:48px;height:48px;display:grid;place-items:center;border-radius:.85rem;color:var(--brand-ink);background:var(--brand-soft)}
.offline-steps{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem;padding:0;margin:0}
.offline-steps li{display:grid;align-content:start;gap:.35rem;padding:.85rem;border:1px solid var(--line);border-radius:.65rem;background:var(--surface-2)}
.offline-steps li strong{color:var(--ink);font-size:.93rem}
.offline-steps li span{color:var(--muted);font-size:.9rem}
.offline-guide__actions{display:flex;gap:.75rem;flex-wrap:wrap}
.offline-guide__actions>.btn{flex:1 1 220px}
.stage[data-stage="desktop"] .stage__intro{max-width:60rem}
.stage[data-stage="desktop"] .stage__main{max-width:96rem}
.stage[data-stage="desktop"] .device{max-width:1300px}
@media(max-width:48em){
  .quickbar{align-items:stretch;padding:.6rem .75rem}
  .quickbar__views{width:100%;justify-content:center}
  .quickbar__label{margin-right:auto}
  .quickbar__views .quickbar__btn{flex:1 1 0;padding:.5rem .4rem}
  .quickbar__right{width:100%;justify-content:space-between}
  .quickbar__status{font-size:.78rem}
  .quickbar__offline{padding:.35rem .5rem;font-size:.85rem}
  .offline-steps{grid-template-columns:1fr}
  .stage__main{padding-inline:.6rem}
}
@media(max-width:360px){.quickbar__status{font-size:.72rem}.quickbar__btn{font-size:.8rem}}
@media(prefers-reduced-motion:reduce){.quickbar__btn{transition:none}}

.quickbar__roles{display:inline-flex;align-items:center;gap:2px;background:var(--surface-2);padding:3px;border:1px solid var(--line);border-radius:.65rem}
.quickbar__role{min-height:38px;border:1px solid transparent;border-radius:.5rem;padding:.35rem .7rem;background:transparent;color:var(--ink-2);font-weight:700;font-size:.83rem}
.quickbar__role[aria-pressed="true"]{background:var(--brand);color:var(--on-brand)}
.quickbar__role:hover{border-color:var(--brand)}
@media(max-width:48em){.quickbar__right{gap:.4rem}.quickbar__roles{flex:1}.quickbar__role{flex:1}.quickbar__status{order:2;width:100%;justify-content:center}}

/* --- Claridad visual y lectura accesible: actualización WCAG 2.2 AA --- */
:root { --reading-width: 70ch; }
html[data-simple="on"] .card { border-width: 1px; }
html[data-simple="on"] .demo:not([open]) { margin-block: .25rem; }
html[data-simple="on"] .kpis { gap: .75rem; }
html[data-simple="on"] .story-grid,.dashboard-charts { align-items: start; }
/* No ocultamos información de los gráficos: toda cifra tiene una etiqueta textual. */
.chart-takeaway { display: grid; gap: .2rem; padding: .85rem 1rem; border: 1px solid var(--line-strong); border-radius: .8rem; background: var(--surface-2); color: var(--ink); }
.chart-takeaway strong { font-size: clamp(1.125rem, 2vw, 1.4rem); color: var(--ink); font-variant-numeric: tabular-nums; }
.chart-takeaway__label { font-weight: 700; font-size: .84rem; }
.chart-short-intro { color: var(--ink-2); margin-block: .1rem .65rem; line-height: 1.55; }
.chart-charthelp { display: block; margin-bottom: .2rem; color: var(--ink); }
.trend-figure svg { margin-block: .55rem; }
.trend-guide { stroke: var(--line-strong); stroke-width: 1; stroke-dasharray: 5 5; }
.trend-path { stroke: var(--brand-ink); stroke-width: 4; }
.trend-point { fill: var(--surface); stroke: var(--brand-ink); stroke-width: 3.5; }
.trend-value { fill: var(--ink); font-size: 13.5px; }
.trend-axis { fill: var(--ink-2); font-size: 12.5px; }
.learning-groups { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
.learning-group { min-width: 0; }
.learning-group__header { display: flex; justify-content: space-between; flex-wrap: wrap; gap: .25rem .75rem; font-size: .96rem; margin-bottom: .4rem; }
.learning-group__header span { font-variant-numeric: tabular-nums; font-weight: 650; }
.learning-group__track { height: 1.1rem; background: var(--surface-2); border: 1px solid var(--line-strong); border-radius: .4rem; overflow: hidden; }
.learning-group__fill { display: block; height: 100%; border-right: 2px solid var(--ink); border-radius: .3rem; }
.learning-group__fill.dist-mid { background-image: repeating-linear-gradient(120deg,transparent 0,transparent 8px, rgb(255 255 255 / 40%) 8px,rgb(255 255 255 / 40%) 11px); }
.learning-group__fill.dist-low { background-image: repeating-linear-gradient(90deg,transparent 0,transparent 5px,rgb(255 255 255 / 40%) 5px,rgb(255 255 255 / 40%) 8px); }
.group-graph-link { grid-template-columns: minmax(3.2rem,auto) minmax(3rem,1fr) minmax(4.3rem,auto); }
.group-graph-bar { height: 1.15rem; }
.group-graph-link.is-current .group-graph-bar>span { background-image: repeating-linear-gradient(135deg,transparent 0,transparent 7px,rgb(255 255 255 / 35%) 7px,rgb(255 255 255 / 35%) 10px); }
.chart-details summary { width: max-content; max-width: 100%; min-height: 44px; }
.optional-details { margin-block: 1.2rem; padding: .25rem .8rem; background: var(--surface); border: 1px solid var(--line-strong); border-radius: .85rem; }
.optional-details > summary { cursor: pointer; color: var(--brand-ink); font-weight: 700; padding: .8rem; min-height: 44px; }
.optional-details[open] > summary { border-bottom: 1px solid var(--line); margin-bottom: .8rem; }
.optional-details > .card { margin-bottom: .8rem; }
/* Mantiene visibles los datos incluso con zoom 200% y alto contraste del sistema. */
@media (forced-colors: active) {
 .trend-point { stroke: CanvasText; fill: Canvas; }
 .trend-path { stroke: CanvasText; }
 .trend-guide { stroke: GrayText; }
 .learning-group__fill,.group-graph-bar>span { background: Highlight; border-right: 2px solid CanvasText; }
 .chart-takeaway,.optional-details { border: 1px solid CanvasText; }
}
@media (max-width: 30em) { .learning-group__header { flex-direction: column; } .chart-takeaway { padding: .75rem; } }
/* Reflow a 320 CSS px con texto ampliado (WCAG 1.4.10 / 1.4.12). */
.trend-figure { grid-template-columns: minmax(0, 1fr); }
.trend-figure > * { min-width: 0; max-width: 100%; }
.trend-figure svg { min-width: 0; max-width: 100%; }
.chart-takeaway { overflow-wrap: anywhere; }
.chart-details { min-width: 0; }
.chart-details .table-wrap { max-width: 100%; }
.compare-group-list { grid-template-columns: minmax(0, 1fr); min-width: 0; }
.compare-group-list li { min-width: 0; }
.group-graph-link { min-width: 0; }
.group-graph-link strong, .group-graph-name { overflow-wrap: anywhere; }
@media (max-width: 30em) {
  .group-graph-link { grid-template-columns: minmax(0, auto) minmax(0, 1fr) minmax(0, auto); gap: .25rem; padding-inline: .15rem; }
  .group-graph-link strong { font-size: .8rem; }
}
