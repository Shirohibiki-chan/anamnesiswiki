// The snippet shipped beside the Dashboard template. Phase 30, step 4.
//
// **A file in her snippets folder, not a rule in the app's stylesheets.** The
// dashboard's look is the thing somebody copies to make their own, so it has
// to be a `.css` that can be opened in Notepad, edited, switched off in
// Settings → Snippets, or deleted — exactly what a snippet already is. Written
// once, the first time the folder is scanned, and never again: a file she has
// deleted is a decision, not a gap to refill (see `getDashboardSnippetMade`).
//
// **It targets the template hook and the style name, not a class of its
// own**, so it doubles as the worked example of both halves of step 2: a
// Dashboard page gets it from `data-template`, and any other page named
// `dashboard` from `data-style`. Every colour is a token, so it follows
// whichever theme is on rather than fighting it.

export const DASHBOARD_SNIPPET_FILE = "dashboard.css";

export const DASHBOARD_SNIPPET_CSS = `/* Dashboard — the look of the Dashboard template, and of any page whose
   style name is "dashboard" (right-click a page → Style name).

   This is an ordinary snippet: edit it, switch it off in Settings → Snippets,
   or delete it. It reaches a page through the two hooks every page carries —
   data-template="dashboard" and data-style="dashboard" — and nothing else in
   the app knows this file exists. Colours are theme tokens, so it follows
   whichever theme is on. */

/* Every block on the page as a card. */
[data-template="dashboard"] .page-block .block-frame,
[data-style="dashboard"] .page-block .block-frame {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0)),
    var(--color-panel);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

/* Card headings as small caps, spaced out. */
[data-template="dashboard"] .page-block .block-title,
[data-style="dashboard"] .page-block .block-title {
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: var(--fs-2xs);
  color: var(--color-text-muted);
}

/* Rows of a list as tiles that light up. */
[data-template="dashboard"] .page-block .block-link,
[data-style="dashboard"] .page-block .block-link {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
}

[data-template="dashboard"] .page-block .block-link:hover,
[data-style="dashboard"] .page-block .block-link:hover {
  background: var(--color-accent-faint);
}

/* The capture box a little roomier than it is elsewhere. */
[data-template="dashboard"] .page-block .block-capture-text,
[data-style="dashboard"] .page-block .block-capture-text {
  min-height: 6em;
  font-size: var(--fs-md);
}
`;
