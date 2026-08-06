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
- **Fonts** for titles, interface, writing and code, in three tiers:
  - ✦ the three already bundled with the app,
  - ~98 open-licence families sitting inside the sandbox — any of them can be
    bundled for real, it's a small job,
  - · Windows faces, which **can't** be redistributed and would fall back to
    something else on another machine.
- **Size and spacing** sliders, **gradients on twelve surfaces**, and a box for
  your own CSS.
- **Show me the CSS** turns whatever you've made into a real theme block.

Send that CSS back and it becomes a theme you can switch to in the app.

## Keeping it honest

The preview is a *mock* of the app, hand-written against the same token names as
`src/index.css`. Nothing enforces that it stays accurate — if you change a token
name, a font stack or a component's structure in the app, update the mock too or
it quietly starts lying.

`fonts.css`, `fonts-library.css` and `fonts-library.js` are generated, not
written. They inline the woff2 files as data URIs so fonts work from a
`file://` page. Regenerate after changing anything in `public/fonts`, or after
editing the `LIBRARY` list in the script:

```bash
node sandbox/build-fonts.mjs
```

The library families come from Google Fonts, fetched **by that script, at build
time**, and cached in `.font-cache/`. The sandbox and the app never make a
network call — see `docs/handoff.md`. Only add families that are OFL or Apache
2.0 licensed; the whole point of that list is that anything in it can be
bundled into the app for real.
