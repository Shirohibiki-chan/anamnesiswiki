# Theme Sandbox

A playground for fonts, colours and CSS. **It is not the app** — it can't open a
project, can't write to disk, and can't break anything you've written.

## Opening it

Double-click **`theme-sandbox.html`**. That's it — no install, no dev server, no
internet. It works from anywhere on disk.

Your changes save themselves in the browser, so you can close it and come back.

## What's in it

- **Six starting points** — the dark theme the app ships today, plus the five
  palettes queued for Phase 12 (Light, Parchment, Foxian, Belobog, Deep Space).
- **Every colour the app uses**, grouped by what it's for rather than by name.
- **Fonts** for titles, interface, writing and code. The three bundled with the
  app are marked ✦; the rest are Windows fonts and would need bundling before
  they could ship.
- **Size and spacing** sliders, **gradients**, and a box for your own CSS.
- **Show me the CSS** turns whatever you've made into a real theme block.

Send that CSS back and it becomes a theme you can switch to in the app.

## Keeping it honest

The preview is a *mock* of the app, hand-written against the same token names as
`src/index.css`. Nothing enforces that it stays accurate — if you change a token
name, a font stack or a component's structure in the app, update the mock too or
it quietly starts lying.

`fonts.css` is generated, not written. It inlines the real woff2 files as data
URIs so fonts work from a `file://` page. Regenerate after changing anything in
`public/fonts`:

```bash
node sandbox/build-fonts.mjs
```
