# Anamnesis — Implementation Plan

---

## Project Overview

Anamnesis is a Tauri v2 desktop app for local-first worldbuilding. React 19 + TypeScript in the renderer, Rust shell handling filesystem access. Data lives as JSON files on disk in a folder the user picks. BlockNote provides the Notion-style block editor. LegendKeeper's `.lk` export format is supported as a first-class import/export path so the user can migrate their existing world.

Work phases top-down. Do not start a phase until the previous one is complete and usable. Each phase should end with the app in a coherent, working state — not mid-refactor. Phases are sized to be reviewable as user-facing changes.

See `docs/spec.md` for the full spec, `CLAUDE.md` for architecture rules, and `docs/prototype/anamnesis.jsx` for a reference React prototype that demonstrates layout and tree behavior (its template content is filler — the real copy lives in `src/services/template-registry.ts`).

---

## Future Features

**Interactive atlas / maps**

LK's atlas — nested image maps with clickable pins that link to wiki pages — is the single feature Anamnesis intentionally doesn't ship in Phase 1. It's the most complex piece of LK to build well and the piece the user has said they use less than the wiki. If demand shows up (either from the user or from anyone she shares the app with), revisit as its own multi-phase project. Leaflet with custom CRS is the likely implementation.

---

**Timeline visualization (calendar-based)**

A view that lays out Event-template nodes on a chronological axis, with per-event pins that open the underlying page. **Superseded 2026-08-08, not cut.** The user's answer to "what happened when" is now **Phase 24 — Storylines**, which orders events by what leads to what instead of by date. That's a deliberate choice rather than a workaround: she doesn't think in calendar years, and a date field she can't fill is the thing that stops the writing.

The original blocker still stands if a calendar view is ever wanted anyway: Events have no reliable date data. `when` is a free string like "Year 872, Third Age," which nothing can sort, and a real date schema — one that copes with invented calendars — is the design work, not the chart. Storylines are the cheaper answer precisely because they need no such schema. Revisit only if she starts asking for years.

---

**Alternate universes**

Raised by the user 2026-08-08, and she's unsure of it herself. The idea: AUs (Canon, Demonic AU, Merfolk AU) become top-level contexts rather than folders, with a global switcher that filters the whole interface — tree, relationship webs, storylines — to whichever one you're in. Underneath, each character would have one base profile plus per-AU overrides, so there's no maintaining five copies of the same person.

**Recommendation: take the first half, leave the second.**

The context switcher is worth building. It's a filter over the folder structure that already exists (`AUs/Demonic AU/…`), it changes no data, and it delivers most of what she described — pick an AU and the tree, search, collections, graphs and storylines only show that world.

The base-profile-plus-overrides half is the risky part, and it argues against her own use case:

- **Overrides pay off when the variants are mostly the same.** A demonic Valera and a merfolk Valera differ in species, appearance, history, relationships and most of the prose. When the override set approaches "everything," the base profile is pure indirection. The data-drift argument assumes she wants the copies in sync — in AUs, divergence is usually the whole point.
- **It puts a question in front of every keystroke:** am I editing the base or this AU's version? That's easy to get wrong mid-sentence, and getting it wrong quietly edits canon. It also breaks the promise that her writing stays legible outside the app — a character stops being one readable file and becomes a base plus a stack of patches.
- **It's a schema change that touches every read and every write in the app.** Nothing else on this list costs that much.

**The hedge, if she wants one:** a plain "variant of" link between pages — demonic Valera points at canon Valera. That buys cross-AU navigation and somewhere to hang a compare view later, with no inheritance and no resolution logic anywhere. If she ever does find herself retyping the same fields across five copies, inheritance can be built on top of that link — the link is the prerequisite either way, so it isn't wasted work.

---

**Canvas / board / whiteboard**

Freeform spatial planning surface — LK ships one as "Board." Kept on the list at the user's request 2026-07-31, with eyes open: this is the largest single build anywhere in this document, larger than the atlas. Nothing else in the plan depends on it, so it can wait indefinitely without blocking anything.

---

**World Anvil import**

Investigated 2026-07-31 against a real export (`World-Orynthia_ Fragments of Fable-2026-07-31.zip`) and **dropped for now** by the user. Recording the findings so the next look doesn't start cold:

- The export is a zip of one JSON file per entity, keyed by `entityClass` / `templateType` (`Person`, `Article`, `Category`, plus Timeline, Map, Manuscript, VariableCollection). Tree structure comes from categories, which nest via their own `parent`, plus `articleParent` for sub-articles. Template inference is easy — `person` → Character, and the rest line up similarly.
- **Content is BBCode** — `[p]`, `[h3|uuid]`, `[hr]`, `[articletoc]`. This is the expensive part. It shares nothing with the LK importer, which speaks ProseMirror; it's a second parser from scratch.
- **The export is not clean UTF-8.** Real observed damage in the sample: "they're" arrives as `they<?>re`. An importer that doesn't repair this mangles every apostrophe in the world.
- Portraits and covers are URLs on WA's servers, not files in the zip — same fetch-on-import shape the LK importer already uses.
- Manuscripts, maps, timelines and `{{user}}` variables have no home here and would need flagging as skipped in the preview.

**Worth salvaging even though the importer is dropped:** WA's Person template carries ~120 typed fields (age, pronouns, eyes, hair, height, species, family, relations, motivation, vices, quirks…). That list is a ready-made source for default property suggestions in Phase 13 — but mine it *selectively*. WA's own reputation for bloat is the cautionary tale; pick the dozen or so per template people actually fill in.

---

**Browser version**

The user raised this 2026-07-31 — not for herself, but so people who won't install an unknown `.exe` can still look at a world. **Phase 1.5 (Publish) already covers that need** and needs no re-architecture; check whether it's satisfied before considering anything further.

A genuinely editable browser build is a different animal: `filesystem-service.ts` talking to the user's disk through Tauri *is* the storage layer, and a browser can't do that. It would mean either a real backend or a much more limited "your world lives in this browser" mode. Not a build flag. Deferred, and related to Phase 2 below.

---

**Cloud sync (Phase 2)**

Supabase-backed sync for users who want multi-device access without shared-folder tools. Free tier is enough for two people; adds a real backend and auth. Deferred until the shared-folder approach (Dropbox / Syncthing) demonstrably stops meeting the user's needs. Do not scaffold in Phase 1.

---

## Queued Adjustments

- **Duplicate doesn't work on a multi-selection.** The right-click menu hides it
  above one selected row rather than looping `duplicateNode`, which writes
  through `saveNodes` without a relocation pass — adding several nodes at once
  can shift colliding siblings' suffixes the same way deleting them does, and
  that path hasn't been worked through. Bulk delete, move, and colour are all
  supported. Fix by giving duplicate the same batch treatment as
  `deleteNodes`/`moveNodes` (see `docs/handoff.md` §Storage). **Scheduled into
  Phase 15**, which reworks that menu anyway — no reason to open it twice.

- **More right-click menu items.** Answered 2026-07-31 — the user supplied a screenshot of LK's full node menu and the wanted items are now written up as **Phase 15**. Nothing left to ask here.

- **Valeraverse needs re-importing once, and hasn't been.** Two import changes
  landed after her copy was brought in: the project home arriving as a real page,
  and each picture remembering the LK address it came from (without which export
  can't send pictures back). Both apply at import time only, so her existing
  project has neither. One re-import picks up both — worth doing in a single
  pass rather than twice.

---

## Known Bugs

*(Empty. Both entries here were fixed on 2026-07-30 — see `CHANGELOG.md`.)*

---

## Shipped

Phases 0–11.5 are complete. **`docs/shipped.md`** has what each one delivered;
`CHANGELOG.md` has the same story in plain language.

| Phase | | Shipped |
|---|---|---|
| 0 | Project Scaffold | 2026-07-29 |
| 1 | Data Layer | 2026-07-30 |
| 2 | App Shell | 2026-07-30 |
| 3 | Tree | 2026-07-30 |
| 4 | Page View Skeleton | 2026-07-30 |
| 5 | BlockNote Editor | 2026-07-30 |
| 6 | Properties Panel | 2026-07-30 |
| 7 | Templates | 2026-07-30 |
| 8 | LK Import | 2026-07-30 |
| 9 | LK Export | 2026-07-31 |
| 10 | Polish + Distribution | 2026-07-31 |
| 11.5 | The Design System | 2026-08-04 |
| 11 | Make It Ours | 2026-08-05 |

Project home — the last Queued Adjustment standing before Phase 9 — shipped
2026-07-31.

**Phase 10 closed 2026-07-31** when the signing key went into the repository's
Actions secrets, which was the one step nothing in the repo was allowed to do.
Search, keyboard shortcuts, rebinding, tabbed Settings, sidebar undo/redo and
automated four-platform releases all landed that day. Two things it deliberately
left behind: undo for the right-hand panel, now **Phase 19**, and the
duplicate-on-multi-selection fix, folded into **Phase 15** where that menu gets
reworked anyway. Neither blocks anything.

**The app is shippable.** Anyone can install it, updates reach them, and
nothing about anyone's world leaves their machine.

**Phase 9 left one thing open, and it can't be closed from here:** nothing has
been imported into real LegendKeeper from a file we wrote. The round trip is
verified through our own importer against the real 75-resource
`Valeraverse.lk`, which proves the mapping is self-consistent — not that LK
accepts it. That needs an LK account and an import attempt. See
`docs/handoff.md` §Known gaps.

---

## Phase 1.5 — Publish

**Unblocked as of 2026-07-31** — Phase 10 was the thing in front of it.

`PublishModal.tsx` with checkbox tree of what to publish, "include hidden tabs?" toggle (default off), tag filter, output folder picker.

`src/services/publisher.ts` — static site generator. Renders each node as an HTML page, preserves tree navigation as a sidebar, respects hidden tabs and Secret blocks. Bundles a Fuse.js search index as JSON for client-side search on the published site. Same visual style as the app (dark theme, callouts, references as clickable links).

User then hosts the output folder anywhere free (Cloudflare Pages / Netlify / GitHub Pages). Re-publish overwrites.

**End state:** user can share Valeraverse with Nitwit read-only, and Orynthia with the world when it's ready, without any account or backend.

**Not scheduled against Phases 11+ below.** It can land whenever the user wants it; nothing after it depends on it. Its one live argument for going sooner is that it's the existing answer to "people won't install an unknown `.exe`" — see Future Features → Browser version.

---

# Phases 11+ — planned 2026-07-31

Everything below comes out of one planning session: the user brought a list of roughly thirty wants plus screenshots of LegendKeeper's current UI, and the answers to nine scoping questions are baked into the phases rather than left as open questions. Where a phase records a decision, the decision is hers and doesn't need re-litigating.

**Two framing decisions that shape the ordering:**

1. **The "UI overhaul" is two jobs, not one.** The *look* (colour, type, spacing, icons, naming) is CSS tokens and is cheap — done early, everything built afterwards is born looking like Anamnesis. The *layout* (left rail, splittable columns, tabs) rewrites the app shell and touches components that don't exist yet — done early it gets done twice. Hence Phases 11–12 up front and Phase 21 near the end.

2. **The identity pass is deliberately made reversible before it's attempted.** The user's stated blocker was being "extremely picky" with no fixed idea yet. The answer is to ship the theme switcher *first*, so a visual direction becomes a file that can be tried and deleted rather than a one-shot commitment, and then to present complete running directions to react to instead of asking for a design from a blank page. If a future session finds itself asking her to describe what she wants in the abstract, it has taken a wrong turn.

---

**Phases 11 and 11.5 are done** (2026-08-05 and 2026-08-04). Their detail is in
`docs/shipped.md`; what still binds the code is in `docs/handoff.md`.

---

## Phase 12 — Themes & Appearance

Identity, the visual half — and the reversibility machinery that has to exist before it. Depends on Phase 11.5; don't start it early.

- ~~**A sandbox to try directions in**~~ — shipped 2026-08-05, ahead of the phase proper, because she asked for somewhere to change fonts and colours that couldn't break the real app. `sandbox/theme-sandbox.html`, a single double-clickable file: a mock of the app driven by the real token names, the six palettes as starting points, font/size/spacing/gradient controls, a free-text CSS box, and an export that emits a `[data-theme]` block. It is **not** the theme switcher and doesn't replace the bullets below — it's the thing that makes "2–3 candidate directions" cheap to produce, and it's where her answers come from. `sandbox/README.md` covers keeping it in step with `src/index.css`.
- ~~**Widen the sandbox**~~ — 2026-08-06, on her first reaction to it: "i'm going to need WAY more fonts than what's here" and "I want to be able to make gradients for various things." 98 open-licence families inlined (up from 3 bundled + Windows faces), and 12 gradient slots with radial/linear, three stops and per-stop transparency (up from 3 fixed linear ones). The two asks are the same signal — she wants range before she wants a decision, so **don't narrow her options down to a shortlist before she's played with them**.
- ~~**Custom themes, the Obsidian way**~~ — 2026-08-06, and this is the bullet that reshaped the rest of the phase. She asked for it directly: *"i'd like to build the ability to create custom themes into the app, similar to how obsidian does it. I know notion and LK don't let you do fancy stuff, but I think that's lame tbh? Like, why NOT let people do what they want?"* Settings → Appearance, `.css` files in `<projectsDir>/themes/` and `/snippets/`, all 98 library families bundled so a theme can name any of them, the twelve gradient tokens wired to real components, and text scaling. Details in `docs/constants-and-theming.md`; the CSS-vetting rule is in `docs/handoff.md` and is not optional.
- ~~**Colour and gradient pickers in the app**~~ — 2026-08-07. The bullet above originally said *the app is where a theme gets used, the sandbox is where it gets made*, and used that to argue there should be no colour picker in Settings. She asked the obvious question and it didn't survive it: *"i know we have css override but shouldn't we enable people to change colors in-app too, or is that too complicated? ... Idk i get that CSS is more robust but why not both."* There was no answer. So `ThemeEditor.tsx` ships: twenty colours, all twelve gradients, and a "make a copy I can edit" that seeds from whatever theme is on. **What replaced the old rule is a better one — there is one theme format.** The pickers write a `.css` file in the themes folder and read one back; nothing in the app knows or cares which of the three places a theme was made in. Keep it that way: the moment the editor gets a state of its own, hand-written themes become second-class.
- ~~**Text scaling**~~ — 2026-08-06, split in two on 2026-08-07. `--fs-scale` multiplies the eight `--fs-*` steps; deliberately not a root `font-size`, which would drag the whole layout with it. `--fs-scale-content` is the second slider, on the page body alone — *"the contents are generally too large but getting it to a more normal size makes the ui a bit small."*
- ~~**2–3 complete candidate directions**~~ — done twice over. Three shipped 2026-08-06 (`dark`, `midnight`, `daylight`), and on seeing them she picked one and asked for more: *"the midnight theme is BiS as far as what you did add, so make that default"* and *"maybe come up with some other dark themes that look different but aren't.... ugly?"* So `midnight` is now `DEFAULT_THEME_ID` and three more darks ship: `ember`, `grove`, `nightbloom`.
- ~~**The four remaining queued palettes**~~ — **superseded, not built.** Parchment / Foxian / Belobog / Deep Space were four descriptions written before she'd seen anything; the second ask replaced them with a brief in her own words, and the answer to that was three themes chosen to be four *different rooms* rather than four shades of one. **The rule that survives: don't build a palette from a description she hasn't reacted to.** If she names one of the four, build that one.
- ~~**Rebuild the settings screen**~~ — 2026-08-07, immediately after the bullet above, and caused by it: every feature this phase added went into one tab of a 28rem dialog until *"the entire settings menu is fucking insane now. Why is it one tiny ass column? it goes on and on and on... it's set up so poorly."* Both halves of that are one fault — **a narrow dialog can only stack, and a stack that long stops being a screen and becomes a scroll**. So the dialog is `ui-modal-xl` (60rem) with a vertical rail, and Appearance's five sections became four peer panels (Theme / Colours / Fonts and text / Snippets) beside Projects, Keyboard and Updates. **The rule going in: a settings section that doesn't fit on screen is a section that wants splitting, not a longer panel.** Adding one is still a single entry in `SETTINGS_TABS` — keep it that way.
- ~~**Delete a theme from the app, and a contrast pass over all six**~~ — 2026-08-07. Two reports from use, one screen apart. The themes list had no way to remove anything from it, which reads as a bug in a list of files she owns; there's now a confirmed delete per custom row, and the failure path says so rather than doing nothing. The second was that the quiet grey text is hard to read and not accessible — true, and true of **every theme**: `--color-text-muted` measured between 3.14 and 3.94 against its own panel where AA small text wants 4.5, with the default the worst of the six. All twelve values (muted and placeholder, six themes) re-measured and lifted, and the floor is written down in `docs/handoff.md` so a seventh theme can't quietly repeat it. **The rule: a palette isn't finished until it's measured — by eye is how all six failed the same check together.**
- ~~**Stop the pickers from destroying hand-written theme files**~~ — 2026-08-07, reported from use and the worst bug this phase has produced. Changing one colour in Settings called `serializeTheme`, which builds a file out of the twenty-odd tokens the app knows about — so a theme somebody had written by hand was replaced wholesale by the app's rendering of it, with no warning and no undo. **The rule: an edit changes the values it was asked to change and nothing else.** `patchTheme` locates the declaration and rewrites the value in place; `serializeTheme` is now only for a file that doesn't exist yet. Two things fell out of it — the write has to go to the *unvetted* copy of the file, or the loader's own URL stripping gets baked into her stylesheet permanently, and a copy now goes into `themes/backups` before the session's first change. Detail in `docs/handoff.md`.
- ~~**Live reload on the themes and snippets folders**~~ — 2026-08-08, reported from use: editing a theme's `.css` by hand changed nothing until you found the rescan button, and even then it took a switch away and back to fully land (that second half was the id bug, fixed separately). The rescan button was always a stopgap — **a format whose selling point is "it's a file you can open in Notepad" has to behave like one**, and an app that only looks when asked doesn't. `watchCssDirs` puts a non-recursive watch on both folders and rescans on any `.css` event; `tauri-plugin-fs`'s `watch` feature is enabled for it. Two constraints came out of building it and both are in `docs/handoff.md`: the watch can't be recursive, because `themes/backups` is inside the folder it watches, and the store has to ignore its own writes, because a rescan flushes the pending one and a dragged colour picker would otherwise defeat its own debounce.
- ~~**A copy of Midnight comes out in Midnight's fonts**~~ — 2026-08-08, reported from use. `createTheme` seeded from `COLOR_TOKENS` only, and Midnight is the one built-in that sets `--font-*`, so its copy fell back to the base tokens' faces and visibly wasn't the theme it copied. **The rule, and it generalises past fonts: the copy is a new `[data-theme]` id, so the original is not in the cascade behind it — anything a copy doesn't declare falls to the base tokens.** Detail in `docs/handoff.md`, including why the faces come from `themeFonts` and not from the document beside the colours.
- ~~**The colour pickers were laggy**~~ — 2026-08-08, reported from use and the last of the four things that came out of actually living in the Colours panel. Every `input` event ran the entire commit: patch the file text, vet it, replace the `<style>` contents, clear and re-read the fonts, read the background back, and `JSON.stringify` the lot into `localStorage`. Two stylesheet reparses and two forced style recalculations per frame of a drag. **The rule: the thing that shows a change and the thing that records it are different jobs, and only one of them belongs in the event handler.** The preview is one inline custom property on the root element; the commit rides the debounce that was already there for the disk write. Detail, and the two cases that deliberately don't preview, in `docs/handoff.md`.
- ~~**Import a theme, or a palette from another app**~~ — 2026-08-08, from two asks in one breath — a button so a theme file doesn't have to be dragged into a folder by hand, and some way to bring her other project's palette across without picking through it. Both are the same button. A `.css` is copied into the themes folder as-is; a `.json` goes through `palette-import.ts`, which works the roles out and writes what it guessed into the file's header. **The rule this one is built on is the contrast rule from two bullets up, applied to input nobody vetted: every text and border step is *solved* for a ratio against both surfaces rather than picked, so a file from outside can't land below the floor the built-ins are held to.** The second rule — names are a hint, not an instruction — is in `docs/handoff.md` with the case that forced it. - ~~**Abyssal, a seventh built-in**~~ — 2026-08-08, the other half of the ask above: her CharSnap palette, run through the importer and then hand-tuned where the numbers said to. It clears the "different room, not a different shade" bar on luminance as much as hue — `#00253d` is a lit ocean, not another dark. **The rule the tuning pass produced: the importer solves for a *floor* and a built-in is held to the *band* the other six sit in** — four values moved for that reason and each one is justified in the comment above its block in `index.css`. It also turned up a real defect in the importer, now fixed: callout text was mixed toward the body text, so all three callouts converged on one hue. The contrast rule is now **enforced by a test** (`palette-import.test.ts` parses `index.css`) rather than only written down, which is what should have happened when all six themes failed it at once.
- **Bundle the app's *default* fonts if she changes them.** The 98-family library ships, so nothing else is blocked on bundling — but `--font-ui`/`--font-display`/`--font-prose`'s defaults are still Inter/Fraunces/Newsreader in `index.css`, and moving those is a separate decision from her picking fonts for herself.
- **Changelog viewer** in Settings, plus an **About** dialog. `CHANGELOG.md` renders via a Vite raw import.
- **Search in Settings.** Taken from Obsidian 1.13, which added it because their settings panel got too big to scan — ours is going the same way and is most of the reason why: Appearance alone now holds themes, the theme editor, 98 fonts, sixteen colours, twelve gradients and two text sliders, and Phase 18 will add block settings on top. Cheaper to build now, while there are few enough settings to test it against. Arrow-key navigation between results comes with it; their `Ctrl/Cmd-F`-to-refocus is worth copying too.

**Answered 2026-08-06:** the default was hers to decide and she decided — `midnight` leads the list, `dark` is the alternate. Her earlier worry (*"im afraid of making the default insane because i dont want ppl to be turned off by it"*) resolved by seeing it running rather than by discussing it, which is the pattern: build it switchable, let her look at it.

**End state:** the app looks like hers, and looking different tomorrow costs nothing.

---

## Phase 13 — Property Types

Cheaper than it looks: `customProperties` on the node and the "+ Add a property" flow already shipped in Phase 7. This widens the type list, it doesn't build the system.

- **New types:** number, select, multi-select, status — the last three rendering as coloured chips, per the user's reference screenshot.
- **Surface Created / Updated.** `createdAt` and `updatedAt` are already on every node and already saved to disk. Nothing displays them. This is rendering only.
- **Default property suggestions per template**, mined selectively from World Anvil's Person field list (see Future Features → World Anvil import). A dozen or so per template. Resist the full list.
- **Reorderable properties.**

### One place that lists every property and every tag

Taken from Obsidian 1.13's All Properties view, and asked for 2026-08-08. **Two views, one mechanism** — the user asked for the tag half unprompted after seeing the property half, which is the tell that they're the same feature over two fields.

The problem both solve is the one you only get after a project is big: you can see the tags and properties on *this* page, and nowhere can you see the set you've actually accumulated. So `pov` and `POV` and `point-of-view` coexist for months, and the only way to find out is to trip over it.

- **A list of every property name in the project, with a count of how many pages use each.** Same for tags.
- **Rename across the whole project from that list.** This is the point of the feature — renaming a tag on 40 pages one page at a time is why the typo survives instead of getting fixed. Merging is what rename already does when the new name is one that exists; say so in the confirmation rather than building a separate merge.
- **Delete across the project**, with the count shown, behind a confirmation that names it.
- **Click through to the pages using one.** `#tag` already works in both the tree filter (`TreeSearch.tsx`) and the search palette (`search-service.ts` §tag mode), so for tags this is a jump into machinery that exists. Properties have no equivalent yet and need one.
- Case-insensitive grouping, so `POV` and `pov` land next to each other and can be seen. **Don't auto-merge them** — they're the user's words and she may mean both.

**Sequencing.** Do this *after* the new types above, not before. `select`/`multi-select`/`status` come with a set of allowed values per property, and a values list is the second thing anyone wants to rename in bulk. Building the view first means building it twice.

**Where it lives is open.** Settings is wrong — this is about a project's contents, not the app's configuration. Likeliest a panel off the search palette, or its own view. Decide when the rest of the phase is in place and the shape is clearer.

**Not in scope:** property types on tags (a tag is a bare string and should stay one), and tag hierarchies (`#char/valera`). Both are their own features, and neither was asked for.

---

## Phase 14 — Everyday Navigation

Small things, felt daily. Independent of each other; safe to ship piecemeal.

- **Back / forward / home buttons.** Needs a navigation history stack — a separate thing from Phase 10's undo history, which reverses *edits*, not *location*.
- **Double-click expands a folder**, and rename moves to the right-click menu. Note this is a *swap*: `TreeItem.tsx` already renames on double-click (react-arborist's default). Ships with a setting to put it back.
- **Resizable sidebars.**
- **Show in system explorer.**
- **Hover previews** on wikilinks and mentions. The README already claims these exist; they don't.
- **"Create new" landing page** — a blank untitled page that offers the template picker inline, so pages can be spammed out and typed later.
- **Bookmarks rail** — pinned pages as icon tiles under the tree search, fed by "Set as shortcut" from Phase 15.
- **The small-friction batch**, lifted from Obsidian 1.13's own list. Each is a line or two, none depends on the others, and they're the kind of thing that's only ever felt as vague clumsiness rather than reported as a bug — which is why they're written down rather than left to be noticed:
  - `Escape` cancels a rename and **leaves the tree focused** (today focus escapes with it);
  - `Escape` clears the current selection;
  - auto-reveal doesn't fire while a file or folder is being renamed;
  - `Shift`-arrow extends a multi-selection from the keyboard;
  - `Ctrl-N`/`Ctrl-P` move through suggestion lists — the wikilink autocomplete, the quick switcher — on every platform, not just macOS;
  - closing the quick switcher or command palette with `Escape` restores the selection that was there before it opened.

---

## Phase 15 — Right-Click Menu, Full Pass

From the user's screenshot of LK's node menu, minus what doesn't apply to a single-user app.

Convert to template · Export (per node) · Move ▸ · Sort sub-pages ▸ · Set as shortcut · Hide · Collapse all · Expand all.

**Skipped:** "Edit permissions" — multi-user, not us.

Fold in the queued **duplicate-on-multi-selection** fix while in here; it's the same menu and the same batch-relocation problem `deleteNodes`/`moveNodes` already solved.

---

## Phase 16 — Images & Tags

- **Image slot buttons**, per the user's screenshot: change image, reposition, expand to lightbox, ALT text, Set cover. The remove **×** becomes hover-only. Note the *banner* already has upload, drag-to-reposition and hover-× (`PageBanner.tsx`) — this phase is about the sidebar portrait, which doesn't.
- **What the lightbox actually does**, taken from Obsidian 1.13/1.14 rather than designed from nothing — the bullet above said "expand to lightbox" and stopped there. Three details, and they're what separates a big picture from something usable on a character page with six portraits on it:
  - **the file name of the current image is shown**;
  - **arrow between every image embedded in the current page**, not just the one clicked;
  - **click and drag to pan** within a zoomed image.
- **Keyboard control of images in the editor**, same source. Select an image with the keyboard; `+`/`-` resize it, `0` resets, backspace deletes it, `Enter` edits, `Ctrl/Cmd-C`/`X` copy or cut. Paired with a change worth copying for its own sake: Obsidian *stopped* auto-expanding an image to reveal its filename when the cursor moves near it. That flicker is cheaper never to build than to remove later, so **don't build the auto-expand**.
- **Tag picker** — a search box over a checkbox list of every tag in the project, reached from a **+** next to the existing chips.

---

## Phase 17 — Templates & Assets Tabs

The two greyed-out tabs in `TreeSidebar.tsx`.

- **Templates tab, powered by "Convert to template"** (Phase 15). The user chose this over a dedicated template editor 2026-07-31, and it's the better trade: templates get designed in a real page rather than in a settings form, and there's no second editing surface to build or maintain. This supersedes the old "user-editable templates" Future Feature.
- **Assets tab** — the image organiser over the project's `assets/` directory.

---

## Phase 18 — Sidebar Blocks

The big one, and a genuinely new concept: the right panel becomes a second block canvas rather than a fixed list of fields.

Keep the distinction sharp — **properties** are labelled facts (`Age: 26`); **blocks** are arranged widgets (a 75% purple bar called "Hollow Emperor's Influence"). They share a column and nothing else.

- Node gains an ordered block list. **Add, remove and reorder are requirements from the start**, not follow-ups — build the panel as an ordered collection or this gets rewritten.
- Per-block context menu: title / no-title, colour, duplicate, move, remove.
- **Blocks:** Text Box · Tags · Alias · Link Block · Tag Index · Subpage Index · Backlinks · Image.
- **Meters:** Progress Bar · Circle · Semi-circle · Gauge · Token Pool · Rating.
- **Backlinks, Tag Index and Subpage Index are one job underneath** — an index of what points at what. Build that service once; it serves all three blocks and is the same data Phase 23's graphs need.
- **Alias** punches above its weight — alternate names that feed search and `[[wikilinks]]`, so "Val" finds Valera Jiang.
- **No YouTube or Spotify embeds.** The user's reason, 2026-07-31, was aesthetic — LK's are ugly — not the offline policy, which she has never personally agreed with. If embeds come back, that's a policy conversation to have with her, and she'll likely wave it through; ask anyway, because the boundary is still written strict in `CLAUDE.md` at her request.

---

## Phase 19 — Safety Net

Unglamorous and probably the highest-value work in this document. This app has already lost user data once (`docs/handoff.md` §Storage).

- **Version history / snapshots / file recovery.** Local, on disk, in keeping with everything else. **Obsidian's "File Recovery" is the shape to copy**, rather than designing one: automatic periodic snapshots kept on disk, a per-file list of past versions you can browse and restore, and arrow-key navigation through that list (the keyboard part is new in 1.13). Copying a known-good model matters more here than anywhere else in this document, because this is the feature that exists to catch the failure that already happened once (`docs/handoff.md` §Storage) and a half-designed version of it is worse than none — it would be trusted.
- **Undo for the right-hand panel** — carried over from Phase 10, still the one part of the app a mistake can't be taken back in. A dedicated store action per operation, the way `setNodeColor` did it.

---

## Phase 20 — Markdown & Folder Import

**Text & Markdown, Obsidian.md, Folder and Zip are one importer wearing four hats** — read a tree of markdown files, map directories to the tree. Build it once.

**Dragging a folder onto the window is the entry point**, and imports the whole thing with its directory structure preserved. Obsidian added exactly this in 1.13 and it's the right front door for an importer that's already directory-shaped: it skips the file-picker step for the case that matters most, and it's the same code path underneath.

JSON and HTML are separate and lower priority. World Anvil is dropped (see Future Features).

---

## Phase 21 — Shell Rework

The layout half of the overhaul. Late on purpose: it rewrites `AppLayout.tsx` and it should only happen once, after the features it has to arrange actually exist.

- Left rail replacing the top bar, with Project / Templates / Assets moved into it.
- Splittable columns — open to the right, open in new tab, open in new window, split right, split down.

---

## Phase 22 — Collections

A filtered table or gallery view over pages, by template or tag. Cheapest of the "big views" and the most useful day to day, which is why it leads them.

---

## Phase 23 — Graphs

Both, per the user's decision 2026-07-31, and in this order:

1. **Relationship graph, scoped to one page** — who she knows, who she serves, what she owns. This is the one that earns its keep.
2. **Global graph** — the whole world as a force-directed network. Worth an honest expectation: this is the feature people screenshot constantly and use rarely. It's a poster more than a tool, and it's second for that reason.

Both run on the reference index built in Phase 18, so neither starts from nothing. D3-force is the likely library.

---

## Phase 24 — Storylines

Sequence-based narrative trees, asked for 2026-08-08. **This is the app's answer to "what happened next," and it replaces the calendar timeline** rather than sitting beside it — see Future Features → Timeline visualization.

**The distinction that drives the design:** a timeline is date-locked and linear; a storyline is sequence-driven and date-optional. Nodes connect by what leads to what, not by year. Dates are the reason the timeline never got built — a blank the user can't fill and won't guess at stops the writing. Storylines have no such field. Where a date happens to be known it's just another property on the page.

**The view** is a zoomable, pannable, drag-and-drop graph. Each node is a scene or an event; edges run in narrative order. The tree branches for parallel plot threads or alternate viewpoints and reconverges at shared events — so it's a DAG, not a strict tree, and a node can have two parents. Nothing else in the app has that shape; the sidebar tree's model does not fit it.

**Every node is also a page.** Opening a node opens a full editor where the whole scene gets written — a storyline is somewhere she writes, not just a map of writing kept elsewhere. Creating a node makes a lightweight page for it by default; pointing a node at an existing page is the other option, and both are first-class, because half the nodes in a real storyline are events that already have pages.

**Storage.** Node pages follow the existing file-per-node model and stay legible on disk. The graph itself — edges, positions, branch structure — is the new part and wants its own file next to them. Don't scatter edges across the individual pages: a reparent then rewrites two page files, and a failure halfway leaves the graph half-connected.

**Sequenced here because** it wants the reference index from Phase 18 (a scene node should be able to show who's in it), the reworked shell from Phase 21 to host a full-screen canvas, and the pan/zoom/node/edge rendering from Phase 23. It doesn't otherwise depend on Collections or Graphs, so it can be pulled ahead of both if it's what she wants sooner. If AUs ever land, a storyline belongs to one — a fork in reality has its own sequence of events by definition.

---

## Phase 2 — Cloud Sync (Deferred)

Only if the shared-folder sync approach demonstrably stops working. Options in preference order: Supabase (hosted Postgres + auth), Yjs + y-webrtc (P2P CRDT), self-hosted sync server.

Do not scaffold in earlier phases. The file-per-node data model already sets us up well for any of these.
