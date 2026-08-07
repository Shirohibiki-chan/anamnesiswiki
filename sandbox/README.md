# Theme Sandbox

A playground for fonts, colours and CSS. **It is not the app** — it can't open a
project, can't write to disk, and can't break anything you've written.

## Opening it

Double-click **`theme-sandbox.html`**. That's it — no install, no dev server, no
internet. It works from anywhere on disk.

Your changes save themselves in the browser, so you can close it and come back.

## What's in it

- **Ten starting points** — the six themes the app ships (Midnight, Anamnesis
  Dark, Ember, Grove, Nightbloom, Daylight), then the four that stayed sketches
  (Parchment, Foxian, Belobog, Deep Space). **Keep the shipped six in step with
  the `[data-theme]` blocks in `src/index.css`** — a theme you can't reopen here
  is a theme you can't adjust.
- **Every colour the app uses**, grouped by what it's for rather than by name.
- **Fonts** for titles, interface, writing and code, in three tiers:
  - ✦ the app's own four defaults,
  - ~98 open-licence families, all of which **ship inside the app** — pick one
    and your theme renders exactly like this on any machine,
  - · Windows faces, which **can't** be redistributed. Anamnesis doesn't have
    these, so a theme using one falls back to something else.
- **Size and spacing** sliders, **gradients on twelve surfaces**, and a box for
  your own CSS.
- **Show me the CSS** turns whatever you've made into a real theme file.

## Using what you made

Save the exported CSS as `anything.css` in **`Documents\Anamnesis\themes`**,
then open Anamnesis → **Settings → Appearance**. It's in the list. Nothing else
needs doing to it — the export is written to be dropped in as-is.

Snippets work the same way: a `.css` file in `Documents\Anamnesis\snippets` gets
its own on/off switch and layers over whichever theme is active.

Anything in either file that tries to load from the internet is stripped before
it's used, and the app says what it removed. That's the offline promise, not a
bug.

## Keeping it honest

The preview is a *mock* of the app, hand-written against the same token names as
`src/index.css`. Nothing enforces that it stays accurate — if you change a token
name, a font stack or a component's structure in the app, update the mock too or
it quietly starts lying.

`fonts.css`, `fonts-library.css` and `fonts-library.js` are generated, not
written. They inline the woff2 files as data URIs so fonts work from a
`file://` page. The same script also writes the app's copies —
`public/fonts/library/`, `src/fonts-library.css` and
`src/constants/font-library.ts` — from the same list, which is what stops the
sandbox offering a font the app doesn't have. Regenerate after changing
anything in `public/fonts`, or after editing the `LIBRARY` list:

```bash
node scripts/build-fonts.mjs
```

The library families come from Google Fonts, fetched **by that script, at build
time**, and cached in `scripts/.font-cache/`. The sandbox and the app never make
a network call — see `docs/handoff.md`. Only add families that are OFL or Apache
2.0 licensed: everything in that list ships inside the installer, so an
unlicensed one there is unlicensed fonts in the product.
