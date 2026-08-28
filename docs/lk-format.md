# LegendKeeper `.lk` Format — Import Mapping

The field mapping and ProseMirror block translation table for `src/services/lk-import.ts`, the only file that reads `.lk` files (see `CLAUDE.md`'s architecture rules). Written after Phase 8 shipped, against the user's real 75-resource `Valeraverse.lk` export — update this doc if LK ever changes its schema version or a new export surfaces a block type not covered here.

Export (`src/services/lk-export.ts`, Phase 9) implements the inverse. Everything below is the import direction unless stated; §Export at the bottom covers what differs on the way out.

## Top-level shape

```
{
  version, exportId, exportedAt, resourceCount, hash,
  resources: [ { id, parentId, name, pos, iconColor, iconGlyph, iconShape,
                 isHidden, isLocked, documents: [...], properties: [...],
                 tags: [...], aliases: [...], banner: {...} } ],
  calendars: []
}
```

Ungzip via the browser's native `DecompressionStream("gzip")` (no `pako`/zlib dependency needed), then `JSON.parse`.

## The project root

LK's export always has exactly one resource with no `parentId` — this is LK's own project home page (every fresh LK project ships identical "Welcome to LegendKeeper…" boilerplate here, confirmed against the real export). Since 2026-07-31 it becomes a real Node, the imported project's home page:

- Its `name` becomes both the new project's name and the home page's own name — LK shows it in both places too.
- It's created whether or not anything is written on it, and designated via `Project.homeNodeId` (see `docs/handoff.md` §Project home). First in `rootOrder`.
- Its tab content comes across as an ordinary page's would, **unless it still holds LK's stock welcome tutorial** — matched on the "Welcome to LegendKeeper" heading, reported in the preview's lossy list, and left out. An empty or tab-less root still gets one blank `Main` tab so there's somewhere to type.
- It gets an entry in `idMap` like any other resource, so `mention`s pointing at the project root resolve to the home page instead of degrading to plain text. Parent-grouping deliberately uses a separate id set — see `docs/handoff.md` §LK import for what breaks otherwise.
- Its direct children become the project's top-level nodes, sorted by `pos`, following home in `rootOrder`.

If an export doesn't have exactly one no-parent resource (malformed/unexpected), the importer falls back to treating every resource with an unresolvable `parentId` as top-level, and the project name defaults to "Imported Project" (the user can rename it before confirming the import).

## Tree structure

- `parentId` maps directly — LK uses the same parent-pointer tree structure as our `Node.parentId`.
- `pos` is LK's fractional-indexing string (mixed-case ASCII, e.g. `"O"`, `` "`" ``, `"c"`). Plain code-unit string comparison (`a < b`) sorts it correctly — no special fractional-index parsing needed.
- Every resource gets a fresh `crypto.randomUUID()`; an `idMap: Map<lkId, newId>` built up front resolves mentions and reference properties later.

## Template inference (from tab-name signature)

Exactly per `CLAUDE.md`'s existing table — implemented in `inferTemplateKey`:

| Tab signature | Template |
|---|---|
| `Overview, Backstory` | character |
| `Overview, Biology, Lifestyle, Beliefs, Relations` | race |
| `Overview, Map, Government` | country |
| `Overview, Map, History` | location |
| `Overview, Blueprint` | technology |
| `Main` (has children) | folder |
| `Main` (no children) | note |
| anything else | note, tabs preserved as-is |

**Country is listed before Location and must stay there.** Both signatures
contain `Overview` and `Map`, matching is "every tab in the signature is
present", and `find` takes the first hit — with Location first, every imported
Country page would come in as a Location. The Country and Technology signatures
were read off LK's own templates, not guessed; there is no signature for their
Creature or Scene because we have not seen those, and pages of those kinds still
arrive as notes with their tabs intact.

`species` was renamed to `race` on 2026-08-28 (a separate Creature template now
covers animals). Nothing in a `.lk` file carries our key, so this rename does not
affect the format — but a page imported before that date has `species` on disk,
and `readNodeFile` translates it on the way in.

A resource inferred as **folder** never gets tabs (folders don't hold content in our model) — if it actually had non-trivial tab text anyway (shouldn't happen organically, but checked defensively), that's flagged in the import preview's lossy-notes list rather than silently dropped.

## Block translation (ProseMirror → BlockNote)

| LK / ProseMirror node | Becomes | Notes |
|---|---|---|
| `paragraph`, `heading` (levels 1-6), `rule` | `paragraph`, `heading`, `divider` | Direct pass-through. BlockNote supports all 6 heading levels, no clamping needed. |
| `bulletList` / `orderedList` → `listItem` | `bulletListItem` / `numberedListItem` | Recursively converted; a `listItem`'s first paragraph becomes the block's `content` and everything after it becomes `children`, in the order it was written. Before 2026-08-14 the rest was filtered to paragraphs and nested lists, so a picture, code block or callout inside a list item was dropped in silence. |
| `blockquote` | BlockNote's native `quote` block | One `quote` block per paragraph child. Deliberately **not** our custom Quote callout — that's reserved for LK's `panel type="note"` below, a different construct in LK even though both render as a quote-ish box. |
| `panel` (`panelType`) | `calloutInfo` / `calloutQuote` / `calloutSecret` | `info`→info, `note`→quote, `warning`/`error`→secret, anything else→info. Only the first paragraph child becomes the callout's content; further children flatten out as plain sibling blocks right after it (callouts here are single-inline-content, not containers). |
| `bodiedExtension` (`extensionKey: "block-secret"`) | `calloutSecret` | LK's own built-in Secret block — a direct, lossless match. |
| `bodiedExtension` (any other key) | Warning heading + flattened content | Unrecognized LK extension; content is kept, flagged lossy. |
| `extension` (e.g. `block-youtube`) | A plain paragraph with a link | Embeds have no equivalent; flagged lossy. |
| `layoutSection` / `layoutColumn` | Flattened to sequential blocks | BlockNote has no columns; columns collapse in source order. Flagged lossy. |
| `expand` (LK's collapsible/toggle section) | BlockNote's native `toggleListItem` | **Lossless** — title becomes the toggle's content, body becomes `children`. (An earlier version of this importer flattened expand blocks to a plain heading; fixed once it was noticed BlockNote already ships a real toggle block.) |
| `codeBlock` | BlockNote's native `codeBlock` | **Lossless apart from the language name.** `attrs.language` is narrowed by `normalizeCodeLanguage` to one of the fifteen in `constants/code-languages.ts` and falls back to `text`; the code itself is never touched. Text is taken with `plainTextOf` rather than `convertInline`, because a code block's content is plain by definition and newlines stay newlines here (see the export note below). **Added 2026-08-12, and it fixed data loss rather than adding a feature** — with no case here a code block fell to the default branch, which recurses into a node's children, and a code block's children are bare `text` nodes that the block-level switch drops. The code arrived *empty*, not unformatted. Any block type added to that switch which holds text directly rather than inside paragraphs has the same trap waiting. |
| `mediaSingle` → `media` (a picture placed in the text) | `image` | Fixed 2026-08-14; before that it fell to the default branch and the picture vanished without a note. The block is given an explicit id so the download can find it again — see `applyBodyImage` and the three-slot `ImportPendingImage`. `attrs.width` is a percentage of LK's text column and becomes `previewWidth` in pixels of ours (`READING_COLUMN_WIDTH`), left unset when LK recorded none. `attrs.layout` becomes `textAlignment` via `MEDIA_LAYOUT_ALIGNMENT`; `wrap-left`/`wrap-right` lose their text wrap and `wide`/`full-width` stay inside the column, since our image block always sits on its own line. A `media` node with no `url` is counted and reported rather than dropped — one exists in her second export. |
| `inlineExtension` (decorative icon) | Stripped | No text fallback worth keeping (LK's own `text` attr for these is just the literal string `"Icon"`). Flagged lossy. |
| `mention` | Our `mention` inline content, resolved via `idMap` | Falls back to plain text (and is flagged lossy) if the target wasn't included in the import. |
| `hardBreak` | A text run containing `"\n"` | |
| marks: `strong`, `em`, `code`, `underline`, `strike`/`strikethrough` | `styles.bold/italic/code/underline/strike` | |
| mark: `link` | BlockNote `link` inline content wrapping the text | |
| Anything else unrecognized | Recurses into any nested `content`, drops the wrapper | Flagged lossy so nothing vanishes silently even for a block type this table doesn't yet know about. |

## Properties (LK sidebar fields → our properties)

LK ships a fixed default property template (IMAGE, AMBIENCE, SUMMARY, LOCATED IN, TAGS) on most resources, frequently left at its unfilled defaults, plus whatever custom fields the user added (FRIENDS, ENEMIES, HOMELAND, LANGUAGES, "Romantic Interests" were all found in the real export).

- **`TEXT_FIELD`** → plain text extracted from the ProseMirror fragment (paragraphs joined by `\n`, marks stripped — these were consistently short plain sentences in practice).
- **`RESOURCE_LINK`** → resolved to an array of new node ids via `idMap`, same resolution as mentions.
- **`IMAGE`** → queued for download into `Node.image` (see Images below).
- **`SPOTIFY_SINGLE`, `TAGS` (the property, distinct from the resource's own flat `tags[]`), `SUBPAGE_INDEX`** → no equivalent field; silently skipped (all shipped empty/unused in the real export anyway).

**Fixed-field routing (important, fixed after a live bug report):** if a property's title matches one of the *inferred template's own* property labels (case-insensitive — e.g. Character's built-in "Friends"), the value fills that field directly rather than becoming a new custom property. Only properties with no matching template field become `CustomPropertySpec` entries. Getting this wrong originally caused the same field to render twice in the properties panel — once empty (the template's own unfilled field) and once with the real value (the wrongly-duplicated custom property).

`resource.tags[]` (the flat array, not the TAGS property) maps directly to `Node.tags`.

## Images and banners

Two independent slots on a Node, both optional, matching LK's own banner-vs-sidebar-image distinction:

- **`Node.image`** ← the `IMAGE` property's url, if present.
- **`Node.banner` + `Node.bannerFocusY`** ← `resource.banner.url` (when `enabled`) and `resource.banner.yPosition` (LK's own vertical-focus dragging, 0-100). Both are queued and downloaded independently — a resource with both an IMAGE property and a banner gets both, no precedence fight.

Actual downloading happens in `project-store.ts`'s `importLkProject`, via `fetchLkImage` (routed through `@tauri-apps/plugin-http`'s Rust-proxied `fetch`, not the webview's own `fetch`, so LK's CDN doesn't need to grant our origin CORS access). This is the **one network call this app ever makes**, gated entirely behind this explicit, user-confirmed import action — approved by the user specifically for this case, a deliberate exception to the app's normal zero-network-calls policy (see `CLAUDE.md`'s Policy Boundary). The capability is scoped to `https://assets.legendkeeper.com/*` only, not a general-purpose network grant.

A failed individual image download doesn't fail the whole import — that one page just comes in without its picture.

**There is no asset library in the export, and this is settled rather than unchecked.** Both of her accounts' exports were searched field by field on 2026-08-13: no filenames, no folder names, no media or library section, and `resources` is the only array in the file besides an empty `calendars`. A picture exists solely as a bare CDN URL (`https://assets.legendkeeper.com/<uuid>.<ext>`) at the point it's used, and inside a document its `media` node carries `attrs.id: ""` — LK's own model, in the export, doesn't reference a library entry either.

Two consequences, both permanent:

- **Imported pictures can never arrive named or filed.** LK's app plainly knows the original filenames — they're on screen in its own library view — but it doesn't write them out. The only place they still exist is LK's servers, which this app never contacts (see `CLAUDE.md`). Names and folders here are ours, made here.
- **It explains why deleting a picture behaves differently in the two apps.** In LK a page holds the picture's address, so removing the library entry leaves the page rendering; it never pointed at the entry. Here a page holds a filename inside the project's own `assets/`, so deleting the file is deleting the picture. Matching LK's button without matching its indirection would give an empty box on a page nobody was looking at.

## Color

`iconColor` maps to our palette by nearest RGB distance (`nearestPaletteKey`). LK's own "no custom color set" sentinel is plain white (`#FFFFFF`), which is skipped entirely rather than mapped to a "white-ish" palette entry.

## Hidden

`isHidden` exists at **two** levels and they mean different things:

| LK | Ours | Since |
|---|---|---|
| `documents[].isHidden` — a tab nobody but an admin sees on a page they do | `Tab.hidden` | Phase 9 |
| `resources[].isHidden` — a page nobody but an admin sees at all | `Node.hidden` | 2026-08-10 |

Only the first was read until 2026-08-10, so **every hidden page in an import before that date came across visible**, and export wrote `isHidden: false` for all of them. A world imported before then needs re-importing to get the flag back; nothing else recovers it, since the information was never written to disk.

Both directions cascade rather than being stamped onto descendants — LK hides a page's whole subtree from a reader, and so does this app (`tree-service.ts`'s `isHiddenByAncestor`). Export therefore writes the flag only on the pages that carry it, and a hidden page's children go across as `false`. Marking them individually would survive a round trip as a flag on each one, and un-hiding the parent would then un-hide nothing.

**The synthesised project root is the exception** on the way in: LK's root resource becomes the home page through a reduced path that also drops its colour and tags, and its `isHidden` goes with them. Hiding a whole world is not a thing anyone does, and it would import as a project where nothing is visible.

## What the import preview surfaces

Before committing anything to disk, `ImportModal.tsx` shows: the parsed tree with inferred template icons, per-template counts, and a plain-language list of every lossy conversion that actually occurred (built from `describeLossy`) — nothing is silently dropped without being named in that list.

## Export

`lk-export.ts` runs the table above backwards. It's a pure conversion plus one local file write — **no network access of any kind**, which is why images are the one thing that can't make the trip.

**What's exported.** Whatever was right-clicked, plus its whole subtree, always. LK's own `.lk` export offers no options at all — no subpage toggle, no image toggle (its HTML export has both, which is why that's their default: it's the one meant to leave). Right-clicking the project name exports every top-level page, and so the whole world.

**Structure.**

- LK requires exactly one parentless resource. The designated project home page *becomes* it; if home isn't in the export, one is synthesised carrying the project's name.
- A node's LK parent is its own parent when that parent is included, and the root when it isn't — which is what lets a nested page export without its ancestors, and what files a whole world's top-level pages under the home page.
- `pos` is written **fixed-width, two characters** (`positionKey`). Variable-length keys don't sort under the plain string comparison import uses. See `docs/handoff.md` §LK export.
- Folders become pages with a single empty `Main` tab — LK has no folder-only concept. Reported in the export's lossy list.

**Blocks** invert the table above, with two asymmetries worth knowing:

| Ours | Becomes | Note |
|---|---|---|
| `calloutInfo` / `calloutQuote` | `panel` `info` / `note` | Straight inverse. |
| `calloutSecret` | `bodiedExtension` `block-secret` | **Not** a `panel`. Import folds LK's Secret block *and* `panel` warning/error into this one callout, so the return trip can't distinguish them; the Secret block is the semantic match. |
| `quote` | `blockquote` | Stays distinct from the Quote callout, matching import's split. |
| `toggleListItem` | `expand` | Content becomes the title, children the body. |
| `bulletListItem` / `numberedListItem` | `bulletList` / `orderedList` | Consecutive items of the same kind gather into **one** list node — they're flat siblings here and nested there. |
| `codeBlock` | `codeBlock` | Straight inverse, `props.language` back to `attrs.language`. An empty one still exports as an empty code block rather than being skipped — a round trip that quietly drops blocks she made is a round trip that changes the document. |
| a text run containing `"\n"` | `hardBreak` between runs | Import produced those newlines; a literal newline in a ProseMirror text node renders as nothing. **The code block is the exception**: its text node is the one place ProseMirror allows a literal newline, so `plainTextOf` keeps them whole. Splitting there would shatter one code block into line fragments with break nodes between them. |
| anything unrecognised | `paragraph` keeping its text | Same never-silently-drop principle as import. |

**Properties** go back as `TEXT_FIELD` and `RESOURCE_LINK` (refs, resolved through the export's own id map) — LK has exactly those two property types, so everything that isn't a ref is text. Empty values are omitted rather than written as blank fields. `Node.tags` becomes `resource.tags`; the palette colour becomes `iconColor` as hex.

Phase 13's four new types therefore flatten on the way out, in `printableValue`:

| Anamnesis type | Goes to LK as | Note |
|---|---|---|
| `text`, `longtext` | `TEXT_FIELD` | Unchanged. |
| `date` | `TEXT_FIELD` | Free text here (fictional calendars); LK has no date type either. |
| `number` | `TEXT_FIELD` | Printed with `String(value)`. |
| `select`, `status` | `TEXT_FIELD` | The chosen option's **label**. Values are stored as option ids, so exporting the raw value would write a UUID into the user's LK page. |
| `multiselect` | `TEXT_FIELD` | Option labels joined with `", "`. |
| `refs` | `RESOURCE_LINK` | Unchanged. |

**These do not round-trip as themselves**, and can't: re-importing produces a text property holding the printed labels, with the option list and its colours gone. That's a floor LK sets, not a gap to close. An option id with no matching option in the spec is dropped rather than printed.

**The trap this replaced:** the guard used to be `if (typeof value !== "string") continue`, which was correct only while every property this app could hold *was* a string. The moment a value could be a number or an array of option ids, that same line silently dropped it from the export.

**Images can't travel, so addresses are remembered instead.** A `.lk` stores URLs pointing at LK's own servers, never image data, so a file added in Anamnesis has nowhere to go. What can go back is a picture that *came* from LK, because the address it was downloaded from was written down. Three records do this, and they are not one mechanism:

| picture | where its address lives | since |
| --- | --- | --- |
| sidebar portrait | `Node.imageSource` | Phase 8 |
| page banner | `Node.bannerSource` | Phase 8 |
| a picture in the writing | `assets/.sources.json`, keyed by filename | 2026-08-14 |

The third is keyed by *file* rather than stored on the block, because the origin belongs to the file — the same picture used on four pages came from one place — and because BlockNote's image block has a fixed set of props that an extra one wouldn't survive a load through. See `constants/paths.ts` `ASSET_SOURCES_FILE` and `services/asset-sources.ts`. Not merged with the other two on purpose: two records of one fact is how they drift.

An image block pointing at a plain `http(s)` address needs no lookup — it already is one, and LK can fetch it from wherever we do.

**A picture with no address can travel as a `data:` URI, and this is measured rather than assumed.** LK's importer accepts the whole file written into the address field, and renders it — verified against a real LegendKeeper account on 2026-08-14, for **both** media types LK writes (`type: "external"` and the stricter `type: "file"`). So a picture from her own disk can go after all, at the cost of size: base64 adds a third, and gzip can't win it back on an already-compressed image. Her Valeraverse `assets/` is 48 MB, which would be ~64 MB inside a `.lk` — hence a checkbox at export time rather than always-on. `buildExportFile` takes `assetData` (filename → data URI) and reports `localAssetFiles` so a caller can build that map in a second pass; `dataUriFor` in `asset-sources.ts` does the encoding.

**An imported address always wins over the bytes**, even when both are available: it's a fraction of the size and points at the same picture.

Anything with no address *and* no carried bytes is left out and counted. **Projects imported before each record existed have no sources and need a re-import to gain them.**

**How that was established, because the first attempt was a broken experiment.** A hand-built `.lk` was tried first and LK hung on it, reporting "? pages" — but it was missing a dozen fields LK writes (`schemaVersion`, `createdBy`, `iconGlyph`, `iconShape`, `showPropertyBar`, and per document `createdAt`, `updatedAt`, `locatorId`, `type`, `isFirst`, `transforms`, `sources`), plus a top-level `hash` whose derivation could not be reproduced from either export. A malformed file and a rejected picture look identical from outside. The second attempt started from her own real export and changed exactly four values — two media URLs and the two page names holding them — leaving the other 25 pictures as the control inside the same file, and the untouched `hash` proving LK does not verify it. **Build any future format probe that way: mutate a real export minimally, never construct one.**

`ALIGNMENT_TO_MEDIA_LAYOUT` runs the layout mapping backwards on the way out, and is deliberately not a perfect inverse: LK's wrapping and full-width layouts have no equivalent here, so a wrapped picture comes in left-aligned and goes home left-aligned. That is the only loss in the picture round trip. Width goes back as a percentage of `READING_COLUMN_WIDTH`, omitted when the picture was never resized.

**Verified end to end 2026-08-14** against her second account's real export: 27 pictures in page bodies imported, 27 `mediaSingle` nodes written back, 27 read again on a second import, same addresses throughout, and no lossy note at all. Portraits (7) and banners (3) unchanged across the same trip.

**Round-trip status.** Import → export → import over the real 75-resource `Valeraverse.lk` returns 75 pages with identical tree shape, templates, tabs and tags. That proves the mapping is self-consistent; **nothing has yet been imported into real LegendKeeper from a file we wrote.**
