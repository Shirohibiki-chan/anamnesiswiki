// The published site's stylesheet (Phase 1.5).
//
// **The look is the app's, read off the running theme rather than copied in
// here.** Every colour and typeface below is a `var()` whose value the planner
// writes into `:root` from whatever theme she has active — so a world
// published from Daylight is light and one published from Ember is warm, and
// this file never has to know either palette. `SITE_TOKENS` is the list of
// what gets read; a token used below and missing from that list falls back to
// the browser default, which is how a black-on-black page happens.
//
// **Plain CSS on purpose.** The site has no build step and is read by whatever
// browser the reader has, including old phones, so nothing here needs a
// feature newer than flexbox and custom properties.

/**
 * The tokens the site reads from the running theme. Colours are resolved
 * through the engine (a theme may write `color-mix()` or `oklch()`); the rest
 * are copied as declared.
 */
export const SITE_COLOR_TOKENS: readonly string[] = [
  "--color-bg",
  "--color-panel",
  "--color-panel-alt",
  "--color-panel-edge",
  "--color-border-strong",
  "--color-border",
  "--color-border-subtle",
  "--color-text-primary",
  "--color-text-secondary",
  "--color-text-muted",
  "--color-text-placeholder",
  "--color-accent-light",
  "--color-accent-dark",
  "--color-accent-faint",
  "--color-accent-faint-border",
  "--color-hover",
  "--color-hover-strong",
  "--color-accent-hover",
  "--color-callout-info",
  "--color-callout-info-bg",
  "--color-callout-info-text",
  "--color-callout-quote",
  "--color-callout-quote-bg",
  "--color-callout-quote-text",
  "--color-code-bg",
  "--color-code-border",
  "--color-code-text",
];

export const SITE_TEXT_TOKENS: readonly string[] = ["--font-ui", "--font-display", "--font-prose", "--font-mono"];

export const SITE_STYLE = `
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-family: var(--font-ui);
  font-size: 15px;
  line-height: 1.5;
}
a { color: var(--color-accent-light); text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; height: auto; }
button { font: inherit; color: inherit; }

/* ---- Shell ---- */
.site { display: flex; min-height: 100vh; }
.sidebar {
  width: 280px;
  flex: none;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  background: var(--color-panel);
  border-right: 1px solid var(--color-border-strong);
  padding: 16px 12px 32px;
  font-size: 13px;
}
.site-name {
  display: block;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  padding: 4px 8px 12px;
}
.site-name:hover { text-decoration: none; color: var(--color-accent-light); }
main { flex: 1 1 auto; min-width: 0; }
.menu-toggle {
  display: none;
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 3;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-panel);
  cursor: pointer;
}

/* ---- Search ---- */
.search { position: relative; margin: 0 4px 12px; }
.search input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-panel-alt);
  color: var(--color-text-primary);
  font: inherit;
}
.search input:focus { outline: none; border-color: var(--color-accent-light); }
.search-results {
  display: none;
  position: absolute;
  left: 0; right: 0; top: 100%;
  margin-top: 4px;
  max-height: 60vh;
  overflow-y: auto;
  z-index: 2;
  background: var(--color-panel-edge);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
.search-results.is-open { display: block; }
.search-results a { display: block; padding: 8px 10px; color: var(--color-text-primary); border-bottom: 1px solid var(--color-border-subtle); }
.search-results a:hover, .search-results a.is-active { background: var(--color-hover-strong); text-decoration: none; }
.search-results a:last-child { border-bottom: 0; }
.search-results .result-path { display: block; font-size: 11px; color: var(--color-text-muted); }
.search-results .result-snippet { display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
.search-results .result-empty { padding: 10px; color: var(--color-text-muted); }

/* ---- Tree ---- */
.tree, .tree ul { list-style: none; margin: 0; padding: 0; }
.tree ul { padding-left: 14px; }
.tree li { margin: 1px 0; }
.tree a, .tree summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.tree a:hover, .tree summary:hover { background: var(--color-hover); text-decoration: none; color: var(--color-text-primary); }
.tree a[aria-current="page"] { background: var(--color-accent-hover); color: var(--color-text-primary); }
.tree summary { list-style: none; }
.tree summary::-webkit-details-marker { display: none; }
.tree summary::before {
  content: "";
  width: 0; height: 0;
  border: 4px solid transparent;
  border-left: 5px solid var(--color-text-muted);
  margin-left: 2px;
  transition: transform 0.12s;
  flex: none;
}
.tree details[open] > summary::before { transform: rotate(90deg); }
.tree summary a { padding: 0; flex: 1 1 auto; }
.tree summary a:hover { background: none; }
.tree .row-icon, .page-list .row-icon { width: 14px; height: 14px; flex: none; color: var(--color-text-muted); }
.tree .universe > summary { font-weight: 600; color: var(--color-text-primary); text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; margin-top: 8px; }
.tree .universe > summary::before { display: none; }

/* ---- Page ---- */
.page { max-width: 1120px; margin: 0 auto; padding: 0 0 64px; }
.page-banner {
  height: 220px;
  background-size: cover;
  background-position: center;
  border-bottom: 1px solid var(--color-border);
}
.page-head { display: flex; align-items: center; gap: 14px; padding: 28px 40px 8px; }
.page-icon { width: 28px; height: 28px; flex: none; color: var(--color-text-secondary); font-size: 26px; }
.page-title { font-family: var(--font-display); font-size: 32px; font-weight: 600; margin: 0; line-height: 1.2; }
.page-kind { display: block; font-size: 12px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
.page-columns { display: flex; gap: 32px; padding: 8px 40px 0; align-items: flex-start; }
.page-body { flex: 1 1 auto; min-width: 0; font-family: var(--font-prose); font-size: 16px; line-height: 1.65; }
.page-panel {
  flex: none;
  width: 300px;
  position: sticky;
  top: 24px;
  background: var(--color-panel);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 13px;
}
.page-panel dl { margin: 0; }

/* ---- Tabs ---- */
.tab-strip { display: flex; gap: 4px; border-bottom: 1px solid var(--color-border-subtle); margin: 8px 0 20px; font-family: var(--font-ui); font-size: 14px; }
.tab-button {
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  padding: 8px 12px;
  margin-bottom: -1px;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.tab-button:hover { color: var(--color-text-primary); }
.tab-button.is-active { color: var(--color-text-primary); border-bottom-color: var(--color-accent-light); }
.tab-heading { font-family: var(--font-display); font-size: 22px; margin: 32px 0 8px; padding-bottom: 6px; border-bottom: 1px solid var(--color-border-subtle); }
html.js .tab-heading { display: none; }
html.js .tab { display: none; }
html.js .tab.is-active { display: block; }

/* ---- Writing ---- */
.page-body h1, .page-body h2, .page-body h3, .page-body h4 { font-family: var(--font-display); line-height: 1.25; margin: 1.4em 0 0.5em; }
.page-body h1 { font-size: 26px; }
.page-body h2 { font-size: 22px; }
.page-body h3 { font-size: 18px; }
.page-body h4 { font-size: 16px; }
.page-body > :first-child, .tab > :first-child, .tab > .tab-heading + * { margin-top: 0; }
.page-body p { margin: 0 0 0.9em; }
.page-body hr { border: 0; border-top: 1px solid var(--color-border); margin: 1.6em 0; }
.page-body blockquote { margin: 1em 0; padding: 4px 16px; border-left: 3px solid var(--color-border-strong); color: var(--color-text-secondary); }
.page-body ul, .page-body ol { padding-left: 1.6em; margin: 0 0 0.9em; }
.page-body li.check { list-style: none; margin-left: -1.4em; }
.page-body li.check input { margin-right: 6px; }
.page-body pre {
  background: var(--color-code-bg);
  border: 1px solid var(--color-code-border);
  color: var(--color-code-text);
  border-radius: 8px;
  padding: 12px 14px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
}
.page-body code { font-family: var(--font-mono); font-size: 0.9em; }
.page-body p code, .page-body li code { background: var(--color-panel-alt); border: 1px solid var(--color-border-subtle); border-radius: 4px; padding: 0 4px; }
.page-body figure { margin: 1.2em 0; }
.page-body figure img { display: block; border-radius: 8px; }
.page-body figcaption, .caption { font-size: 13px; color: var(--color-text-muted); margin-top: 6px; font-family: var(--font-ui); }
.page-body table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 14px; }
.page-body td, .page-body th { border: 1px solid var(--color-border); padding: 6px 10px; text-align: left; vertical-align: top; }
.page-body th { background: var(--color-panel-alt); font-family: var(--font-ui); font-weight: 600; }
.page-body details { margin: 0.6em 0; padding: 6px 12px; border: 1px solid var(--color-border-subtle); border-radius: 8px; }
.page-body summary { cursor: pointer; font-weight: 600; }
.page-body details[open] > summary { margin-bottom: 8px; }
.columns { display: flex; gap: 24px; margin: 1em 0; }
.column { flex: 1 1 0; min-width: 0; }
.contents { background: var(--color-panel); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 16px; margin: 1em 0; font-family: var(--font-ui); font-size: 14px; }
.contents ul { list-style: none; padding: 0; margin: 0; }
.contents li.toc-2 { padding-left: 14px; }
.contents li.toc-3, .contents li.toc-4, .contents li.toc-5, .contents li.toc-6 { padding-left: 28px; }
.ref { font-weight: 500; }
.ref-gone { color: var(--color-text-secondary); }
.icon { display: inline-block; vertical-align: -0.15em; width: 1em; height: 1em; }
.file::before { content: "📎 "; }
.empty { color: var(--color-text-muted); font-style: italic; }

/* ---- Callouts ---- */
.callout {
  display: flex;
  gap: 12px;
  margin: 1.2em 0;
  padding: 12px 16px;
  border-left: 3px solid var(--callout-accent, var(--color-callout-info));
  border-radius: 0 8px 8px 0;
  background: var(--color-callout-info-bg);
  color: var(--color-callout-info-text);
}
.callout-quote { --callout-accent: var(--color-callout-quote); background: var(--color-callout-quote-bg); color: var(--color-callout-quote-text); font-style: italic; }
.callout-colored { background: color-mix(in srgb, var(--callout-accent) 12%, transparent); color: var(--color-text-primary); }
.callout-icon { flex: none; width: 18px; height: 18px; margin-top: 3px; color: var(--callout-accent, var(--color-callout-info)); font-size: 16px; }
.callout-quote .callout-icon { color: var(--color-callout-quote); }
.callout-body { flex: 1 1 auto; min-width: 0; }
.callout-body > :last-child { margin-bottom: 0; }

/* ---- The page's own blocks ---- */
.block { margin: 0 0 12px; font-family: var(--font-ui); }
.block:last-child { margin-bottom: 0; }
.block-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin: 0 0 6px; font-family: var(--font-ui); font-weight: 600; }
.block p { margin: 0; }
.block-property { display: flex; gap: 12px; align-items: baseline; }
.block-property dt { flex: 0 0 38%; font-size: 12px; color: var(--color-text-muted); }
.block-property dd { flex: 1 1 auto; margin: 0; min-width: 0; overflow-wrap: anywhere; }
.block-image img { display: block; width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: 8px; }
.chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--color-panel-edge);
  border: 1px solid var(--color-border);
  --chip-ink: var(--chip, var(--color-text-secondary));
  color: var(--chip-ink);
}
.chip[style] { border-color: color-mix(in srgb, var(--chip) 50%, transparent); background: color-mix(in srgb, var(--chip) 14%, transparent); }
.page-list { list-style: none; padding: 0; margin: 0; }
.page-list li { margin: 2px 0; }
.page-list a { display: inline-flex; align-items: center; gap: 6px; }
.inline-block { margin: 1em 0; }
.inline-block .block-image img { aspect-ratio: auto; }
.infobox {
  border: 1px solid var(--infobox-accent, var(--color-border));
  border-radius: 8px;
  background: var(--color-panel);
  padding: 12px 14px;
  margin: 1em 0;
  font-family: var(--font-ui);
  font-size: 13px;
}
.infobox-left { float: left; margin: 0 24px 12px 0; max-width: 45%; }
.infobox-right { float: right; margin: 0 0 12px 24px; max-width: 45%; }
.infobox-centred { margin-left: auto; margin-right: auto; }

/* ---- Meters ---- */
.meter { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; align-items: center; margin: 4px 0 8px; --meter-ink: var(--meter, var(--color-accent-light)); }
.meter-label { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-text-secondary); }
.meter-icon { width: 14px; height: 14px; }
.meter-track { display: block; height: 8px; border-radius: 999px; background: var(--color-panel-alt); border: 1px solid var(--color-border-subtle); overflow: hidden; position: relative; }
.meter-fill { display: block; height: 100%; background: var(--meter-ink); border-radius: 999px; }
.meter-readout { font-size: 12px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
.meter-pips .meter-track { grid-column: 1 / -1; height: auto; background: none; border: 0; overflow: visible; letter-spacing: 2px; font-size: 15px; color: var(--color-text-placeholder); }
.meter-pips .pip-on { color: var(--meter-ink); }
.meter-spectrum .meter-ends { grid-column: 1 / -1; display: flex; justify-content: space-between; font-size: 11px; color: var(--color-text-muted); }
.meter-spectrum .meter-track { grid-column: 1 / -1; overflow: visible; }
.meter-mark { position: absolute; top: -4px; width: 4px; height: 14px; margin-left: -2px; border-radius: 2px; background: var(--meter-ink); }

/* ---- Database ---- */
.database { overflow-x: auto; margin: 0 0 24px; font-family: var(--font-ui); }
.database table { font-size: 14px; }

/* ---- Small screens ---- */
@media (max-width: 900px) {
  .page-columns { flex-direction: column; }
  .page-panel { width: 100%; position: static; }
  .columns { flex-direction: column; }
  .infobox-left, .infobox-right { float: none; max-width: none; margin: 1em 0; }
}
@media (max-width: 720px) {
  .menu-toggle { display: block; }
  .sidebar { position: fixed; left: 0; top: 0; z-index: 2; transform: translateX(-100%); transition: transform 0.15s; box-shadow: 0 0 32px rgba(0,0,0,0.5); }
  .sidebar.is-open { transform: none; }
  .page-head, .page-columns { padding-left: 20px; padding-right: 20px; }
  .page-head { padding-top: 56px; }
  .page-title { font-size: 26px; }
}
@media print {
  .sidebar, .menu-toggle, .tab-strip { display: none; }
  html.js .tab { display: block; }
  html.js .tab-heading { display: block; }
  .page-panel { position: static; }
}
`;
