<!doctype html>
<html lang="es-MX" data-standalone="true" data-theme="system" data-text="md">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>EstudiandoAndo · Aprendizaje adaptativo con IA</title>
  <meta name="description" content="Prototipo de plataforma educativa adaptativa: un tutor de IA que guía con preguntas y pistas, funciona con conectividad limitada y ayuda al docente a detectar dificultades a tiempo.">
  <meta name="theme-color" content="#0B2F45">
  <meta name="color-scheme" content="light dark">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%230A5E88'/%3E%3Ctext x='32' y='44' font-size='36' font-family='Arial' font-weight='bold' fill='white' text-anchor='middle'%3EE%3C/text%3E%3C/svg%3E">
  <!-- La versión HTML autónoma no usa un service worker. -->
  <!-- Sin solicitudes externas: se utiliza tipografía local o del sistema. -->
  <style>
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

</style>
</head>
<body>
  <a class="skip-link" href="#contenido">Saltar al contenido principal</a>

  <!-- La aplicación se dibuja aquí -->
  <div id="app"></div>

  <!-- Diálogo modal reutilizable (nativo: atrapa el foco y se cierra con Esc) -->
  <dialog id="dialog" class="dialog" aria-labelledby="dialog-title"></dialog>

  <!-- Avisos breves y región para lectores de pantalla -->
  <div id="toasts" class="toasts"></div>
  <div id="live" class="sr-only" aria-live="polite" aria-atomic="true"></div>

  <noscript>
    <p class="noscript">EstudiandoAndo necesita JavaScript para funcionar. Actívalo en tu navegador y recarga la página.</p>
  </noscript>

  <script>
/* =========================================================
   EstudiandoAndo · núcleo
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
     Mascota: el tecolote tutor de EstudiandoAndo (ilustración decorativa)
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
  const PREFIX = 'estudiando-ando:';
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

</script>
  <script>
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

</script>
  <script>
/* =========================================================
   EstudiandoAndo · componentes de interfaz reutilizables
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
    if (s === 'local') return { icon: 'phone', label: 'Solo este equipo', tone: 'warn' };
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
        ? 'Datos de demostración. El asistente y los mensajes se simulan en este navegador.'
        : 'Tu lección, el tutor de demostración y los diagramas funcionan en este navegador. Tus respuestas se guardan localmente.';
      return html`<div class="banner banner--ok" role="note">${icon('wifi', 22)}<div><p class="banner__title">Con internet</p><p>${text}</p></div></div>`;
    }
    const pending = TA.sync.pendingCount();
    const why = s === 'local' ? 'Elegiste el modo local para no gastar datos.' : 'No hay conexión en este momento.';
    const text = context === 'teacher'
      ? `${why} Puedes seguir revisando los datos guardados y redactar comentarios; quedan en espera dentro de esta demostración.`
      : `${why} Tus materiales de ejemplo, las pistas preparadas y los ejercicios siguen funcionando. ${pending ? `Tienes ${TA.util.plural(pending, 'elemento', 'elementos')} por sincronizar.` : ''}`;
    return html`<div class="banner banner--warn" role="note">${icon(s === 'local' ? 'phone' : 'wifi-off', 22)}<div>
      <p class="banner__title">${s === 'local' ? 'Solo este equipo' : 'Sin internet'}</p><p>${text}</p>
      ${context === 'student' ? html`<p class="banner__actions"><a class="link" href="#/descargas">Ver materiales guardados</a></p>` : ''}
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
        <caption id="heat-cap" class="sr-only">Mapa de aprendizaje: porcentaje de avance por estudiante y tema</caption>
        <thead><tr><th scope="col">Estudiante</th>${data.skills.map((s) => html`<th scope="col"><abbr title="${s.name}">${s.short}</abbr><span class="sr-only">: ${s.name}</span></th>`)}</tr></thead>
        <tbody>
          ${rows.map((r) => html`<tr>
            <th scope="row"><a class="link" href="#/alumnos/${r.id}">${r.name}</a>${stale && r.unsynced ? html` ${C.badge('Guardado en el equipo', 'neutral', 'clock')}` : ''}</th>
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

</script>
  <script>
/* EstudiandoAndo · gráficas accesibles y reutilizables, sin librerías externas. */
(function(TA){
 'use strict';
 const {html}=TA;
 const charts=TA.charts={};
 const clamp=n=>Math.max(0,Math.min(100,Number(n)||0));
 /** Historial de demostración + registros nuevos de evaluaciones reales del prototipo. */
 charts.studentHistory=(id)=>{
   const baselines={x:[28,33,39,43],d:[20,27,31,37]};
   const p=TA.state.progress[id];
   if(p){
     const history=(p.history||[]).slice(-4);
     return [...(baselines[id]||[25,33,40,45]).map((score,i)=>({label:`Sem. ${i+1}`,score})),
       ...history.map((point,i)=>({label:point.label||`Actividad ${i+1}`,score:point.score})),
       {label:'Ahora',score:TA.util.avg(p.mastery)||0}].slice(-7);
   }
   const r=TA.data.roster.find(r=>r.id===id);
   const final=r?TA.util.avg(r.mastery)||0:0;
   return [final-20,final-15,final-10,final-5,final].map((score,i)=>({label:i===4?'Ahora':`Sem. ${i+1}`,score:clamp(score)}));
 };
 charts.record=(p,label)=>{
   if(!Array.isArray(p.history))p.history=[];
   p.history.push({label,score:TA.util.avg(p.mastery)||0,at:Date.now()});
   if(p.history.length>15)p.history=p.history.slice(-15);
 };
 charts.line=({points,title='Así cambia el avance',help='Los datos anteriores son de ejemplo.'})=>{
   const items=(points||[]).map(p=>({label:String(p.label),score:clamp(p.score)}));
   if(!items.length)return html`<p>Aún no hay actividades para mostrar.</p>`;
   const W=570,H=238,L=42,R=22,T=27,B=44;
   const X=i=>L+(i*(W-L-R)/Math.max(1,items.length-1));
   const Y=v=>T+(100-v)*(H-T-B)/100;
   const grid=[0,25,50,75,100].map(v=>`<line x1="${L}" y1="${Y(v)}" x2="${W-R}" y2="${Y(v)}" class="trend-guide"/><text x="${L-9}" y="${Y(v)+4}" text-anchor="end" class="trend-axis">${v}</text>`).join('');
   const path=items.map((p,i)=>`${i?'L':'M'} ${X(i).toFixed(2)} ${Y(p.score).toFixed(2)}`).join(' ');
   const dots=items.map((p,i)=>`<circle cx="${X(i)}" cy="${Y(p.score)}" r="6" class="trend-point"/><text x="${X(i)}" y="${Math.max(15,Y(p.score)-12)}" text-anchor="middle" class="trend-value">${p.score}%</text><text x="${X(i)}" y="${H-13}" text-anchor="middle" class="trend-axis">${TA.esc(p.label.length>12?p.label.slice(0,10)+'…':p.label)}</text>`).join('');
   const from=items[0].score,now=items[items.length-1].score,delta=Math.round(now-from);
   const message=delta>0?`Subió ${delta} puntos desde ${items[0].label}.`:delta<0?`Bajó ${Math.abs(delta)} puntos desde ${items[0].label}; conviene repasar.`:'Se mantuvo igual desde el primer registro.';
   const desc=`${title}. ${items.map(p=>`${p.label}: ${p.score} de 100 puntos`).join('; ')}.`;
   return html`<figure class="trend-figure">
     <figcaption class="chart-takeaway"><span class="chart-takeaway__label">Lo más importante</span><strong>Ahora: ${now} de 100</strong><span>${message}</span></figcaption>
     <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${desc}" preserveAspectRatio="xMidYMid meet"><title>${title}</title>
       ${TA.raw(grid)}<path class="trend-path" d="${path}"/>${TA.raw(dots)}</svg>
     <p class="trend-caption"><span class="chart-charthelp">Los puntos muestran el resultado de cada periodo, no una calificación escolar.</span> ${help}</p>
     <details class="chart-details"><summary>Leer todos los resultados</summary>
       <div class="table-wrap" role="region" aria-label="Valores de ${title}" tabindex="0"><table class="table"><thead><tr><th scope="col">Momento</th><th scope="col">Avance (de 100)</th></tr></thead><tbody>
         ${items.map(p=>html`<tr><th scope="row">${p.label}</th><td>${p.score} de 100</td></tr>`)}</tbody></table></div>
     </details></figure>`;
 };
 charts.distribution=(segments,total)=>{
   const items=segments.map(s=>({...s,count:Math.max(0,Number(s.count)||0)}));
   const n=total||items.reduce((a,s)=>a+s.count,0)||1;
   return html`<figure class="dist-figure"><figcaption class="chart-short-intro">Cada fila indica cuántos estudiantes están en esa situación. El número también aparece escrito.</figcaption>
     <ul class="learning-groups">${items.map((s,i)=>html`<li class="learning-group">
       <div class="learning-group__header"><strong>${s.label}</strong><span>${s.count} de ${n} estudiantes</span></div>
       <div class="learning-group__track" aria-hidden="true"><span class="learning-group__fill dist-${s.tone}" style="width:${(s.count/n*100).toFixed(1)}%"></span></div>
     </li>`)}</ul>
   </figure>`;
 };
 charts.compareGroups=(groups,active)=>{
   return html`<figure class="compare-groups"><figcaption class="chart-short-intro">Selecciona un grupo para ver sus resultados. El número representa puntos de 100.</figcaption>
     <ul class="compare-group-list">${groups.map(g=>{
       const score=TA.util.avg(TA.teacher.groupAverage(g.id))||0;
       return html`<li><a href="#/grupo" class="group-graph-link${g.id===active?' is-current':''}" data-action="choose-group" data-id="${g.id}" ${TA.attr(g.id===active,'aria-current="true"')}>
         <span class="group-graph-name">${g.label}</span><span class="group-graph-bar" aria-hidden="true"><span style="width:${score}%"></span></span><strong>${score}/100</strong></a></li>`;
     })}</ul></figure>`;
 };
})(window.TA);

</script>
  <script>
/* EstudiandoAndo · laboratorio visual del prototipo anterior, integrado al proyecto modular. */
(function(TA){'use strict';
 const {html,icon,ui}=TA;
 TA.visual={};
 function numline(step){
   const nums=Array.from({length:14},(_,i)=>i-5);
   const x=v=>44+(v+5)*34;
   const walk=step===0?'':step===1?`<path d="M ${x(-3)} 63 L ${x(0)} 63" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/>`:`<path d="M ${x(-3)} 63 L ${x(2)} 63" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/>`;
   const msg=['Partimos de −3. Ubica el punto inicial en la recta.','Para sumar 5, avanzamos hacia la derecha.','Llegamos a 2: así visualizamos −3 + 5 = 2.'][step];
   return html`<figure class="math-visual"><svg viewBox="0 0 550 148" role="img" aria-label="Recta numérica de menos cinco a ocho. ${msg}">
     <path d="M32 66H533" stroke="var(--ink-2)" stroke-width="2"/><path d="m526 60 9 6-9 6" fill="none" stroke="var(--ink-2)" stroke-width="2"/>
     ${TA.raw(nums.map(n=>`<g><path d="M${x(n)} 60V73" stroke="var(--ink-2)" stroke-width="2"/><text x="${x(n)}" y="94" fill="var(--ink)" text-anchor="middle" font-size="15">${n}</text></g>`).join(''))}
     ${TA.raw(walk)}<circle cx="${step===2?x(2):x(-3)}" cy="66" r="8" fill="var(--brand)" stroke="var(--surface)" stroke-width="3"/>
     <text x="${x(-3)}" y="28" text-anchor="middle" fill="var(--brand-ink)" font-size="17" font-weight="700">−3</text>
     ${step>0?html`<text x="${x(0)}" y="42" fill="var(--accent-ink)" text-anchor="middle" font-size="16" font-weight="700">+5 →</text>`:''}</svg>
     <figcaption class="math-caption" aria-live="polite">Paso ${step+1} de 3 · ${msg}</figcaption></figure>`;
 }
 function balance(step){
   const equations=['x + 8 = 15','x + 8 − 8 = 15 − 8','x = 7','7 + 8 = 15 ✓'];
   const txt=['Una ecuación es como una balanza: los dos lados deben pesar lo mismo.','Restamos 8 a ambos lados para conservar el equilibrio.','La incógnita queda sola. Comprueba el resultado.','Sustituimos x por 7: la igualdad sigue siendo verdadera.'];
   return html`<figure class="math-visual"><svg viewBox="0 0 440 200" role="img" aria-label="Modelo de balanza, paso ${step+1}: ${txt[step]}">
     <path d="M220 42v115 M170 157h100" stroke="var(--ink-2)" stroke-width="7" stroke-linecap="round"/>
     <path d="M65 73H375 M110 73v35 M330 73v35" stroke="var(--brand)" stroke-width="5" stroke-linecap="round" fill="none"/>
     <path d="M55 110H165L148 140H72Z M275 110H385L367 140H294Z" fill="var(--brand-soft)" stroke="var(--brand)" stroke-width="3"/>
     <text x="110" y="128" fill="var(--brand-ink)" text-anchor="middle" font-size="20" font-weight="700">${step<2?'x + 8':step===2?'x':'7'}</text>
     <text x="330" y="128" fill="var(--brand-ink)" text-anchor="middle" font-size="20" font-weight="700">${step<2?'15':'7'}</text>
     <circle cx="220" cy="73" r="10" fill="var(--accent)"/>
     <text x="220" y="24" fill="var(--ink)" text-anchor="middle" font-size="23" font-weight="700">${equations[step]}</text>
     </svg><figcaption class="math-caption" aria-live="polite">Paso ${step+1} de 4 · ${txt[step]}</figcaption></figure>`;
 }
 TA.visual.view=()=>{
   const step=TA.state.ui.visualStep||0;const bal=TA.state.ui.balanceStep||0;
   return html`${ui.pageHeader({title:'Aprende con dibujos',lead:'Dos dibujos que puedes recorrer paso a paso para entender las matemáticas.',back:{href:'#/aprender',label:'Volver a aprender'}})}
   <div class="note note--accent">${icon('spark',22)}<p><strong>El asistente puede darte pistas.</strong> Explora el dibujo, observa cada cambio y después pregunta al tutor por qué funciona. Estos dibujos funcionan sin internet.</p></div>
   <div class="grid grid--2 visual-layout">
   ${ui.card({title:'1. Operaciones con signos',titleIcon:'chart',body:html`<p>¿Qué significa <strong>−3 + 5</strong>? Muévete sobre la recta numérica, sin saltar directamente al resultado.</p>${numline(step)}<div class="cluster visual-actions"><button class="btn btn--secondary" type="button" data-action="visual-prev" ${TA.attr(!step,'disabled')}>${icon('left',18)}Anterior</button><button class="btn btn--primary" type="button" data-action="visual-next" ${TA.attr(step===2,'disabled')}>Siguiente paso ${icon('right',18)}</button><button class="btn btn--ghost" type="button" data-action="visual-reset">Repetir</button></div>`})}
   ${ui.card({title:'2. Resolver con una balanza',titleIcon:'target',body:html`<p>¿Por qué hacemos la <strong>misma operación a los dos lados</strong> de una ecuación?</p>${balance(bal)}<div class="cluster visual-actions"><button class="btn btn--secondary" type="button" data-action="balance-prev" ${TA.attr(!bal,'disabled')}>${icon('left',18)}Anterior</button><button class="btn btn--primary" type="button" data-action="balance-next" ${TA.attr(bal===3,'disabled')}>Siguiente paso ${icon('right',18)}</button><button class="btn btn--ghost" type="button" data-action="balance-reset">Repetir</button></div>`})}
   </div><div class="note note--accent visual-finish"><div><strong>¿Puedes explicarlo con tus palabras?</strong><p>Si lo comprendes, intenta resolver un problema nuevo sin ayuda. Si aún tienes dudas, el tutor te acompañará con pistas.</p><div class="cluster"><a href="#/tutor" class="btn btn--primary">${icon('chat',18)}Pedir una pista</a><a href="#/comprobar" class="btn btn--secondary">${icon('target',18)}Comprobar sin ayuda</a></div></div></div>`;
 };
 Object.assign(TA.actions,{
   'visual-prev':()=>{TA.state.ui.visualStep=Math.max(0,(TA.state.ui.visualStep||0)-1);TA.render();},
   'visual-next':()=>{TA.state.ui.visualStep=Math.min(2,(TA.state.ui.visualStep||0)+1);TA.render();},
   'visual-reset':()=>{TA.state.ui.visualStep=0;TA.render();},
   'balance-prev':()=>{TA.state.ui.balanceStep=Math.max(0,(TA.state.ui.balanceStep||0)-1);TA.render();},
   'balance-next':()=>{TA.state.ui.balanceStep=Math.min(3,(TA.state.ui.balanceStep||0)+1);TA.render();},
   'balance-reset':()=>{TA.state.ui.balanceStep=0;TA.render();}
 });
})(window.TA);

</script>
  <script>
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

</script>
  <script>
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

</script>
  <script>
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

</script>
  <script>
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
    if (false && !EMBEDDED && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline instalable */ });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.TA);

</script>
</body>
</html>
