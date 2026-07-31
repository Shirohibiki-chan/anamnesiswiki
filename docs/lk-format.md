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

If an export doesn't have exactly one no-parent resource (malformed/unexpected), the importer falls back to treating every resource with an unresolvable `parentId` as top-level, and the project name defaults to "Imported World" (the user can rename it before confirming the import).

## Tree structure

- `parentId` maps directly — LK uses the same parent-pointer tree structure as our `Node.parentId`.
- `pos` is LK's fractional-indexing string (mixed-case ASCII, e.g. `"O"`, `` "`" ``, `"c"`). Plain code-unit string comparison (`a < b`) sorts it correctly — no special fractional-index parsing needed.
- Every resource gets a fresh `crypto.randomUUID()`; an `idMap: Map<lkId, newId>` built up front resolves mentions and reference properties later.

## Template inference (from tab-name signature)

Exactly per `CLAUDE.md`'s existing table — implemented in `inferTemplateKey`:

| Tab signature | Template |
|---|---|
| `Overview, Backstory` | character |
| `Overview, Map, History` | location |
| `Overview, Biology, Lifestyle, Beliefs, Relations` | species |
| `Main` (has children) | folder |
| `Main` (no children) | note |
| anything else | note, tabs preserved as-is |

A resource inferred as **folder** never gets tabs (folders don't hold content in our model) — if it actually had non-trivial tab text anyway (shouldn't happen organically, but checked defensively), that's flagged in the import preview's lossy-notes list rather than silently dropped.

## Block translation (ProseMirror → BlockNote)

| LK / ProseMirror node | Becomes | Notes |
|---|---|---|
| `paragraph`, `heading` (levels 1-6), `rule` | `paragraph`, `heading`, `divider` | Direct pass-through. BlockNote supports all 6 heading levels, no clamping needed. |
| `bulletList` / `orderedList` → `listItem` | `bulletListItem` / `numberedListItem` | Recursively converted; a `listItem`'s first paragraph becomes the block's `content`, any nested list becomes `children`, extra paragraphs become sibling `children`. |
| `blockquote` | BlockNote's native `quote` block | One `quote` block per paragraph child. Deliberately **not** our custom Quote callout — that's reserved for LK's `panel type="note"` below, a different construct in LK even though both render as a quote-ish box. |
| `panel` (`panelType`) | `calloutInfo` / `calloutQuote` / `calloutSecret` | `info`→info, `note`→quote, `warning`/`error`→secret, anything else→info. Only the first paragraph child becomes the callout's content; further children flatten out as plain sibling blocks right after it (callouts here are single-inline-content, not containers). |
| `bodiedExtension` (`extensionKey: "block-secret"`) | `calloutSecret` | LK's own built-in Secret block — a direct, lossless match. |
| `bodiedExtension` (any other key) | Warning heading + flattened content | Unrecognized LK extension; content is kept, flagged lossy. |
| `extension` (e.g. `block-youtube`) | A plain paragraph with a link | Embeds have no equivalent; flagged lossy. |
| `layoutSection` / `layoutColumn` | Flattened to sequential blocks | BlockNote has no columns; columns collapse in source order. Flagged lossy. |
| `expand` (LK's collapsible/toggle section) | BlockNote's native `toggleListItem` | **Lossless** — title becomes the toggle's content, body becomes `children`. (An earlier version of this importer flattened expand blocks to a plain heading; fixed once it was noticed BlockNote already ships a real toggle block.) |
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

## Color

`iconColor` maps to our palette by nearest RGB distance (`nearestPaletteKey`). LK's own "no custom color set" sentinel is plain white (`#FFFFFF`), which is skipped entirely rather than mapped to a "white-ish" palette entry.

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
| a text run containing `"\n"` | `hardBreak` between runs | Import produced those newlines; a literal newline in a ProseMirror text node renders as nothing. |
| anything unrecognised | `paragraph` keeping its text | Same never-silently-drop principle as import. |

**Properties** go back as `TEXT_FIELD` (text, longtext, and date — LK has no date type either) and `RESOURCE_LINK` (refs, resolved through the export's own id map). Empty values are omitted rather than written as blank fields. `Node.tags` becomes `resource.tags`; the palette colour becomes `iconColor` as hex.

**Images can't travel.** A `.lk` stores URLs pointing at LK's own servers, never image data, so a file added in Anamnesis has nowhere to go. Import therefore records `Node.imageSource` / `bannerSource` — the address a picture was downloaded from — purely so export can hand it back. Anything without one is left out and counted in the export's lossy list. Projects imported before this existed have no sources and need a re-import to gain them.

**Round-trip status.** Import → export → import over the real 75-resource `Valeraverse.lk` returns 75 pages with identical tree shape, templates, tabs and tags. That proves the mapping is self-consistent; **nothing has yet been imported into real LegendKeeper from a file we wrote.**
