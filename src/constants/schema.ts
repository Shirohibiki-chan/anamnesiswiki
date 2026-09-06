// Canonical Node / Tab / Project shapes. See docs/spec.md §Data model.
// BlockNoteDocument stays a loose `unknown[]` deliberately, even after Phase 5
// wired up the real editor — this is a `constants/` file, and CLAUDE.md's
// strict layer order means constants can never import from `services/`,
// where the actual BlockNote schema (custom blocks + mention content) lives.
// Real typing happens at the boundary in src/components/page/Editor.tsx.
export type BlockNoteDocument = unknown[];

export const FOLDER_TEMPLATE_KEY = "folder";

// What every new page starts as. A page is created first and given a template
// second (see components/page/NewPageLanding.tsx) — "blank" is the state in
// between, and the one a page stays in if the user just starts writing.
export const BLANK_TEMPLATE_KEY = "blank";

// The name a page is created with. Not left empty: a node's name is also its
// filename, and an empty one has nowhere to be written.
export const UNTITLED_PAGE_NAME = "Untitled";

/**
 * A top-level container for one version of the world — Canon, Demonic AU,
 * Merfolk AU (Phase 22). It is a template key rather than a field of its own
 * so a universe stays an ordinary directory of pages on disk; nothing about
 * how a page inside one is read or written changes.
 *
 * **The rules that make it not-a-folder live outside this constant.** A
 * universe only ever sits at the root — `planMove` refuses to file one inside
 * anything, and `moveDestinations` offers it nowhere else — and it is not
 * offered in any template picker, because the way one is made is `Turn into a
 * universe` on a top-level page's right-click menu. A folder that could sit
 * anywhere and nest into anything is exactly how the `AUs` wrapper ended up
 * four levels deep, which is what this replaces.
 */
export const UNIVERSE_TEMPLATE_KEY = "universe";

// Canonical order used in the New Page picker. See docs/constants-and-theming.md.
// `universe` is in this list so it is a real template like any other — the
// pickers filter it back out themselves rather than it being half-registered.
export const TEMPLATE_KEYS = [
  "universe",
  "folder",
  "character",
  "race",
  "creature",
  "location",
  "country",
  "faction",
  "item",
  "technology",
  "event",
  "scene",
  "quest",
  "note",
  "blank",
] as const;

/**
 * The templates that describe a *page* — every key above except `universe`.
 *
 * This is what the New Page screen, the properties panel's picker and the
 * Templates rail all list. A universe is a container for a version of the
 * world rather than a kind of page: it has no tabs to start you off and no
 * shape to customise, and offering it beside Character and Location would
 * make it a folder with a different name. One is made by turning a top-level
 * page into one — see UNIVERSE_TEMPLATE_KEY.
 */
export const PAGE_TEMPLATE_KEYS = TEMPLATE_KEYS.filter((key) => key !== UNIVERSE_TEMPLATE_KEY);

/**
 * `species` was renamed to `race` on 2026-08-28. The word had to move: a
 * separate Creature template now covers animals and monsters, and "Species"
 * read as the animal one — which is the opposite of what it was for.
 *
 * Pages written before the rename still say `species` on disk. `readNodeFile`
 * translates on the way in rather than rewriting anyone's files, so a page
 * keeps its icon and its property schema and is written back as `race` the
 * next time it is saved. Nothing else in the app should know this word.
 */
export const LEGACY_TEMPLATE_KEYS: Record<string, string> = { species: "race" };

export type Tab = {
  id: string;
  label: string;
  hidden: boolean;
  content: BlockNoteDocument;
};

/**
 * The BlockNote block that stands for one of the page's own blocks (Phase 19.5).
 *
 * **It is a pointer and it holds nothing else.** A block drawn in the page body
 * keeps its record in `node.blocks` exactly as a sidebar one does; the document
 * only says which one goes here, and *that* is what makes a block moved between
 * the sidebar, the page and an infobox a move rather than a conversion. See
 * `docs/plan.md` Phase 19.5 for why the alternative was rejected.
 *
 * **A name written into every document that ever holds one**, so it is here
 * rather than beside the BlockNote spec: `block-service.ts` is plain TypeScript
 * and has to read it out of saved documents without importing anything React.
 */
export const BLOCK_REF_TYPE = "blockRef";

/**
 * The BlockNote block that holds several of the page's blocks together in a
 * bordered frame (Phase 19.5).
 *
 * **The third place a block can live, not a replacement for the second.** A
 * block inside one is the same record in `node.blocks` that a sidebar block is,
 * and it can be taken out into the page body on its own — the infobox groups
 * blocks, it does not own them. See `docs/plan.md` Phase 19.5.
 *
 * **Its order is its own.** The sidebar draws `node.blocks` in storage order;
 * an infobox draws the ids it was given, in the order it was given them, which
 * is why the list lives on the block in the document rather than being derived
 * from storage. A block's position on screen here is not its position on disk.
 */
export const INFOBOX_TYPE = "infobox";

/**
 * Side-by-side lanes of writing in the page (Phase 19.5).
 *
 * **Two block names, because a row of columns is a container of containers.**
 * The row is one block and each lane is another; a lane holds ordinary blocks as its
 * own children, which is how the writing in one lane stays writing — nothing
 * about a paragraph changes because it is in a column.
 *
 * **Written by hand against BlockNote's block API rather than installed.**
 * BlockNote ships this as `@blocknote/xl-multi-column`, which is
 * `GPL-3.0 OR PROPRIETARY` while this app is MIT: taking it means relicensing
 * the whole app or paying, for one editor block. Settled 2026-08-27, and
 * `docs/plan.md` Phase 19.5 has the reasoning so it is not reopened.
 *
 * **The word means three different things in this project.** These are columns
 * in the writing; a block's own `width` is how much of the page one block
 * takes; Phase 21's split panes are the app's layout. Only this one is called
 * Columns in the UI.
 *
 * **`pageColumns` rather than `columnList`, and the prefix is load-bearing.**
 * BlockNote's core reserves `columnList` and `column`: the specs live in the
 * `xl-` package we cannot use, but the *plugins* keyed on those names ship in
 * core and attach to any node called that. Ours answered to them and the
 * editor locked up on the first insert — no error, just a renderer spinning.
 * Never name a custom block after one of theirs.
 */
export const COLUMN_LIST_TYPE = "pageColumns";

/** One lane inside a `pageColumns` row. Holds blocks as children; see above. */
export const COLUMN_TYPE = "pageColumn";

/**
 * A contents list built from the page's own headings (Phase 19.5).
 *
 * **It stores nothing.** The block is a marker saying "a contents list goes
 * here"; the list itself is read out of the document every time it draws, so it
 * cannot disagree with the headings it is listing. The one item on the phase's
 * insert-menu list with no data model question attached.
 *
 * **Prefixed for the reason `pageColumns` is** — a custom block must never wear
 * the name of one of BlockNote's own, or that block's plugins attach to ours.
 */
export const PAGE_CONTENTS_TYPE = "pageContents";

/**
 * How an infobox writes down which blocks it holds.
 *
 * **A joined string because BlockNote props are flat.** Its prop schema takes
 * strings, numbers and booleans, not arrays, so the list is encoded on the way
 * in and parsed on the way out — see `parseBlockIds` in `block-service.ts`,
 * which is the only thing that should know this character.
 */
export const BLOCK_ID_SEPARATOR = ",";

/**
 * The inline icon — a small picture sitting in a line of writing (Phase 19.5).
 *
 * **It is an icon you can click, which is the whole of why it is not an
 * emoji.** BlockNote's own emoji command asks first and inserts a character:
 * once it is on the page it is a letter like any other, and changing it means
 * deleting it and starting again. This is inline content with a prop, so the
 * icon stays a thing on the page that knows it is an icon and opens its picker
 * when you click it.
 *
 * **Stored the same way every other icon in the app is** — a Lucide name for a
 * glyph, the character itself for an emoji — so `MeterIcon` draws one without
 * knowing where it came from, and a name that later leaves the catalogue
 * degrades to its own text rather than to nothing.
 *
 * Here rather than beside the BlockNote spec for the same reason
 * `BLOCK_REF_TYPE` is: it is a name written into saved documents, and plain
 * TypeScript has to be able to read it back out.
 */
export const ICON_INLINE_TYPE = "icon";

/**
 * What an inline icon is when nothing has been chosen yet.
 *
 * **Deliberately arbitrary, and that is the design.** Inserting one puts a
 * heart in the sentence and lets her carry on typing; a picker that opened
 * first would stop the sentence to ask a question she may not have an answer
 * to yet. The reference does the same thing with the same icon.
 */
export const DEFAULT_INLINE_ICON = "heart";

// One of the allowed values on a select / multi-select / status property.
// `color` is a key from constants/palette.ts's COLOR_PALETTE, not a hex —
// the same list node colours come from, so a chip recolours with the theme
// instead of carrying a literal that outlives whatever palette it was picked
// against. Ids are generated once and never reused, so renaming an option
// leaves every page already using it pointing at the same option.
export type PropertyOption = {
  id: string;
  label: string;
  color: string;
};

// One-off extra fields a user adds to a single page beyond its template's
// fixed property list (Notion's "+ Add property" pattern) — logged as a
// queued adjustment during Phase 6, built in Phase 7, widened in Phase 13.
// The definition (key, label, type) lives here on the node; the value itself
// lives in `properties[key]` the same way a template-defined property's value
// does. What that value looks like per type:
//
//   text / longtext / date  a string
//   number                  a number (not a numeric string — see NumberProperty)
//   refs / multiselect      an array of node ids / option ids
//   select / status         one option id, or absent for "not set"
//
// `options` is only meaningful for select/multiselect/status and is absent
// everywhere else. Status is a select that arrives pre-seeded (see
// DEFAULT_STATUS_OPTIONS) and renders with a dot — same machinery, different
// starting point, per the user's call 2026-08-09.
export type CustomPropertySpec = {
  key: string;
  label: string;
  type: "text" | "longtext" | "refs" | "date" | "number" | "select" | "multiselect" | "status";
  options?: PropertyOption[];
};

// The three types that carry an option list. Named once because both the
// service that indexes options project-wide and the views that render them
// have to agree on what counts as a chip field.
export const CHIP_PROPERTY_TYPES: CustomPropertySpec["type"][] = ["select", "multiselect", "status"];

// What each type is called in front of the user. Here rather than in the
// panel because two views name them now — the add-property form and the All
// properties & tags list — and one type reading "Multi-select" in one and
// "Multiselect" in the other is the kind of drift nobody notices until it's
// everywhere.
export const PROPERTY_TYPE_LABELS: Record<CustomPropertySpec["type"], string> = {
  text: "Text",
  longtext: "Long text",
  number: "Number",
  select: "Select",
  multiselect: "Multi-select",
  status: "Status",
  refs: "References",
  date: "Date",
};

// Option ids are stable strings rather than UUIDs here so a seeded status
// reads plainly in the JSON on disk. Everything the user adds later gets a
// UUID; nothing depends on which kind an id is.
export const DEFAULT_STATUS_OPTIONS: PropertyOption[] = [
  { id: "draft", label: "Draft", color: "gray" },
  { id: "in-progress", label: "In progress", color: "amber" },
  { id: "needs-revision", label: "Needs revision", color: "rose" },
  { id: "done", label: "Done", color: "sage" },
];

// A single widget in a page's right-hand panel. Phase 18a turned that panel
// from a fixed list of fields into an ordered list of these, so the picture,
// the tags and every property are all blocks and nothing sits outside the
// list. See docs/plan.md Phase 18a.
//
// **A block is a view, not storage, for anything that already exists
// elsewhere.** `node.tags` feeds search and the tag index, `node.image` feeds
// the assets tab, the lightbox and export, and `node.properties` feeds the
// property index and the templates — a block that kept its own copy of any of
// those would fork them silently. So a block record holds presentation plus a
// pointer, and the value stays in the field it has always lived in. Only the
// kinds with genuinely new data (`text` and `meter`) store a value inside the
// block itself.
export type BlockKind = "property" | "image" | "tags" | "text" | "link" | "collection" | "alias" | "meter";

/**
 * How a `meter` block draws itself. Phase 18c, plus `spectrum` on 2026-08-25.
 *
 * Eight shapes, three value models. `bar`, `circle`, `semicircle`, `gauge` and
 * `pie` read one number against a maximum and differ only in how they draw it;
 * `rating` and `pool` count whole units and differ only in what a click means;
 * `spectrum` marks a position between two named ends and prints no number at
 * all. One block with a switchable shape rather than eight kinds, the same way
 * `collection` carries a source — a bar that should have been a gauge is a
 * setting, not a delete and a rebuild.
 */
export type MeterStyle = "bar" | "spectrum" | "circle" | "semicircle" | "gauge" | "pie" | "rating" | "pool";

/** The shapes that count whole units rather than measuring a proportion. */
export const PIP_METER_STYLES: MeterStyle[] = ["rating", "pool"];

/**
 * What sits inside a round meter. Phase 18c.
 *
 * The reference offers the same dial three ways — the number, the icon, or
 * both — and they read differently enough to be worth choosing between: a wall
 * of dials showing icons is a dashboard, and the same wall showing numbers is
 * a character sheet. Absent means "the icon if there is one, otherwise the
 * number", which is what a meter did before this existed.
 */
export type MeterFace = "value" | "icon" | "both";

/**
 * One reading inside a meter block. Phase 18c.
 *
 * **A meter block holds a list of these, not a single number.** The reference
 * puts several in one block — four dials under one GAUGE heading, each with
 * its own icon, name and numbers — and that is the shape she asked for: a
 * character's meters are a panel of stats, not five separate blocks stacked up
 * with five headings between them.
 *
 * `icon` is a name from constants/glyphs.ts, or an emoji character outright;
 * anything unrecognised is drawn as text, so an emoji needs no registry.
 */
export type MeterEntry = {
  id: string;
  icon?: string;
  label?: string;
  value?: number;
  max?: number;
  /**
   * This reading's own colour, overriding the block's. A palette key or a hex,
   * the same as `Block.color`.
   *
   * Four dials under one heading are four different things — health, mana,
   * favour, rations — and colouring them together is what a *block* colour is
   * for. This is the other half: one of them being red on its own.
   */
  color?: string;
  /**
   * This reading drawn in segments, overriding the block's setting.
   *
   * The same override `color` is, and asked for on the same grounds: the four
   * dials under one heading are four different things, and one of them being
   * counted off in units while the others sweep is an ordinary thing to want.
   * Absent means "whatever the block says", and toggling a reading back to
   * agree with its block stores nothing again rather than pinning it.
   */
  segmented?: boolean;
  /**
   * The words at either end of a `spectrum`. Added 2026-08-25.
   *
   * **A pair, not a name.** `label` is what the reading is called — "Temper" —
   * and these are the two poles it sits between: `nonchalant` at the empty end
   * and `emotional` at the full one. Every other shape measures a number
   * against a maximum and needs one name; a spectrum is only meaningful as a
   * distance between two words, so it needs both and never draws the number.
   *
   * Stored on the reading rather than on the block because a block holds
   * several of these and each is its own axis — calm/furious and shy/bold
   * under one heading is the ordinary case.
   *
   * On any other shape they are inert: kept on disk, not drawn, and back the
   * moment the block is switched to a spectrum again.
   */
  startLabel?: string;
  endLabel?: string;
};

/**
 * Where a `collection` block gets its list of pages. Phase 18b.
 *
 * One block with a source rather than four block types, which is how the
 * reference does it and what the plan worked out underneath: Backlinks, a tag
 * index and a subpage index are the same question asked three ways. The Add
 * Block menu still offers them under those four names, because "Backlinks" is
 * what somebody goes looking for and "Collection, source: mentions" is not.
 */
export type CollectionSource = "manual" | "subpages" | "tags" | "mentions";

export type Block = {
  id: string;
  kind: BlockKind;
  // Presentation, meaningful for every kind. `title` absent means the block
  // shows its own natural label — a property's name, or "Tags". `showTitle`
  // absent means true; false is LK's "No Title", which is how a text block
  // becomes a bare paragraph in the sidebar.
  title?: string;
  showTitle?: boolean;
  // A key from constants/palette.ts's COLOR_PALETTE, never a hex — same rule
  // as node colours and property options, so a block recolours with the theme.
  color?: string;
  /**
   * How wide the block is drawn where there is room for a choice: a percentage
   * of the writing column, 25 to 100. Phase 19.5.
   *
   * **It is on the block rather than on the page, and that is deliberate.** A
   * block dragged out of the page into the sidebar and back should still be as
   * wide as it was, and only the block itself knows how wide it wants to be —
   * a meter of eleven dials wants the room, a portrait does not.
   *
   * **Absent means the whole column**, which is what every block had before
   * this could be set, so nothing that looks ordinary carries a field saying
   * so. **The sidebar ignores it outright**: 60% of a 340px column is not a
   * width anyone chose, it is the same block made unusable.
   */
  width?: number;
  // `property` only: which property this block shows, matching a key in
  // `properties` / `customProperties`. Removing the block leaves both alone —
  // hiding a field is not deleting its value, and the block can be added back.
  propertyKey?: string;
  // `text` only: the block's own writing. The one kind in 18a whose data
  // exists nowhere else.
  text?: string;
  /**
   * `image` only: this block's own picture, and its description and crop —
   * the same three fields `node.image`, `node.imageAlt` and `node.imageFocusY`
   * carry, because they are the same three facts about a picture. Phase 19.5.
   *
   * **The page's own picture is not stored here, and that is the whole rule.**
   * One image block on a page is the page's — the one the tree row, the hover
   * preview and the LK export show — and *that* block's picture lives on the
   * node, where those three have always read it. Every other image block's
   * lives here. One picture, one place, either way: see `blockImage` in
   * block-service.ts, which is the only thing that should decide which.
   *
   * **Absent on every page written before this existed**, which is what makes
   * them open unchanged: a page with one image block has that block reading
   * `node.image`, exactly as it did when an image block could only be a window
   * onto the page's portrait.
   */
  image?: string;
  imageAlt?: string;
  imageFocusY?: number;
  // `link` only, and no new one is ever created: Phase 18b replaced it with a
  // `collection` whose source is "manual", which is the same feature holding a
  // list instead of a single page. Kept readable so the pages that already
  // have one still open — block-service migrates it on read.
  targetId?: string;
  // `collection` only. `targetIds` is the curated list for the "manual"
  // source; `tags` is which tags the "tags" source looks for. Both absent for
  // the sources that compute their own list.
  source?: CollectionSource;
  targetIds?: string[];
  tags?: string[];
  // `meter` only. The shape every reading in the block is drawn in, and the
  // readings themselves. `showText` and `showMax` are the block's two display
  // toggles — absent means on, the way `showTitle` does it, so a block that
  // looks normal carries no fields saying so.
  meter?: MeterStyle;
  meters?: MeterEntry[];
  showText?: boolean;
  showMax?: boolean;
  face?: MeterFace;
  /**
   * Drawn as a run of segments rather than one solid sweep.
   *
   * The block's answer, which every reading follows unless it carries its own
   * — see `MeterEntry.segmented`. On a composed pie this is read directly and
   * means a gap between the slices, since there is one shape there.
   */
  segmented?: boolean;
  /**
   * What a rating or a token pool is counted in: a glyph name, or an emoji.
   * Absent means a star for a rating and a disc for a pool, which is what they
   * were before this could be chosen. Same two kinds of value as an entry's
   * `icon`, read back through the same resolver.
   */
  pip?: string;
  // The first cut of `meter` kept one reading directly on the block. No new
  // one is written — block-service lifts these into a single entry on read,
  // the way it does for `link`. Kept readable so a meter made before the list
  // existed still opens.
  value?: number;
  max?: number;
};

export type Node = {
  id: string;
  parentId: string | null;
  templateKey: string;
  name: string;
  /**
   * The page's own icon, replacing its template's. A glyph name from
   * constants/glyphs.ts, or an emoji character outright — the same two kinds a
   * meter's icon takes, read back through the same resolver.
   *
   * Absent is the normal state and means "whatever this template uses", which
   * is what every page had before. Asked for 2026-08-18, built 2026-08-21.
   */
  icon?: string;
  /**
   * The "this page doesn't have a template yet" prompt, sent away for good on
   * this page.
   *
   * Only ever true on a blank page — applying a template hides the prompt by
   * itself, so this is the other way it goes: a page that is *meant* to have
   * no template and does not want to be asked again.
   *
   * **Dismissing it must never be the only way out.** Before this existed the
   * prompt was the single route to applying a template to a page that already
   * exists, so Add Block carries one too — see `AddBlockMenu`.
   */
  hideTemplatePrompt?: boolean;
  tabs: Tab[];
  properties: Record<string, unknown>;
  // Optional (not defaulted to []) because pages saved before this field
  // existed won't have it on disk — every read site falls back to [] itself
  // rather than relying on a load-time migration. See createNode below.
  customProperties?: CustomPropertySpec[];
  // Manual sidebar order for this page's properties, as property keys —
  // covering the template's own fields and the custom ones together, since
  // the point of reordering is to interleave them. Optional and partial: a
  // page nobody has reordered has no entry at all and falls back to the
  // default grouping (fixed fields, then refs, then custom — see
  // PropertiesPanel), and a key the list doesn't mention sorts after
  // everything it does. Per page, not per template, decided 2026-08-09:
  // templates aren't user-editable until Phase 17, and making one page's
  // order bind every page of that template quietly makes them so.
  propertyOrder?: string[];
  // Alternate names for this page (Phase 18b). `[[Val]]` resolves to Valera
  // Jiang through this, search matches on it and says which alias hit, and the
  // index counts a mention written as an alias as a mention of the page.
  // Absent for every page that has never been given one, which is most.
  aliases?: string[];
  // The sidebar, as an ordered list of blocks (Phase 18a). This replaces
  // `propertyOrder` rather than sitting beside it: once every property is a
  // block, this list *is* the order, and two answers to one question is how
  // they drift apart. `propertyOrder` is still read, but only by
  // block-service's derivation for a page written before blocks existed —
  // nothing writes it any more.
  //
  // **Absent and empty mean different things, and the distinction is what
  // makes the migration work.** Absent means the page predates blocks, and
  // block-service derives a list that reproduces the old fixed panel exactly.
  // Empty means somebody has an empty sidebar on purpose, which is what a
  // blank new page now starts with. So `createNode` always writes one, and
  // nothing else may default this to `[]` on read.
  blocks?: Block[];
  tags: string[];
  color?: string;
  // Held back from anyone the world is shown to, while staying completely
  // normal to work on here — LK's own `isHidden` on a resource, and the same
  // idea `Tab.hidden` already carries one level down. Absent means visible, so
  // no page written before this existed needs migrating.
  //
  // It cascades: hiding a page hides everything under it, since a reader who
  // can't reach the parent can't reach the children either. Only the page's
  // own flag is stored — see tree-service's isHiddenByAncestor.
  hidden?: boolean;
  // Filename of the uploaded portrait/sidebar image inside the project's
  // assets/ directory (see paths.ts's ASSETS_DIR), not a full path — Phase 6's
  // ImageSlot resolves it against the project root when it needs to display
  // or delete the file.
  image?: string;
  // Alternative text describing `image`, written by the user through the image
  // slot's ALT button. Absent means none was written — the picture then renders
  // with an empty alt, which is the correct markup for a decorative image and
  // is what every page created before this field existed gets.
  imageAlt?: string;
  // 0-100 vertical focus point for `image`, the same idea as `bannerFocusY`
  // below. Absent is meaningful and is the default: the slot shows the whole
  // photo at its own aspect ratio, and nothing is cropped. Setting one is what
  // "Reposition" does — it crops the slot to a square frame focused there, and
  // clearing it returns the whole photo. So this field is both the focus point
  // *and* the flag saying the slot is cropped at all.
  imageFocusY?: number;
  /**
   * Which image block draws `image` above — the page's own picture. Phase 19.5.
   *
   * **Absent is the ordinary state and means "the first image block there is",**
   * which is what makes every page written before this open unchanged: a page
   * with one image block has always shown the page's portrait in it, and the
   * fallback says exactly that without a word being written to disk. It is
   * stored only once she picks a different one.
   *
   * **A page can have several image blocks and only one of them is this.** The
   * others hold their own pictures on their own records — see `Block.image`.
   * Nothing outside `blockImage` and `pageImageBlockId` in block-service.ts
   * should read this field.
   */
  pageImageBlockId?: string;
  // A separate full-width cover image shown above the page title (Phase 8's
  // PageBanner) — distinct from `image` above, matching LegendKeeper's own
  // banner-vs-sidebar-image distinction. Same assets/ dir, addressed the same
  // way. `bannerFocusY` is a 0-100 vertical focus point (LK's own banners are
  // draggable the same way) used as the image's CSS object-position.
  banner?: string;
  bannerFocusY?: number;
  // Where `image`/`banner` were downloaded from, when they came in via LK
  // import. Kept solely so export can put them back: a `.lk` file stores web
  // addresses of pictures on LegendKeeper's servers, never picture data, so a
  // locally-added file has nothing that can go in one. Absent for anything the
  // user uploaded here, and absent on projects imported before this existed —
  // both mean "this picture can't be exported", which is what the export
  // preview reports. Never used to *fetch* anything outside an explicit
  // import.
  imageSource?: string;
  bannerSource?: string;
  createdAt: number;
  updatedAt: number;
};

export type Project = {
  version: 1;
  // This world's own identity, independent of where its folder sits. Without
  // it a world *is* its path, so renaming the folder or moving it to another
  // drive makes it a different world to everything that refers to one — which
  // is already the recent list's bug, and would be every pin, group and
  // archive flag's bug the moment those exist.
  //
  // In `project.json` rather than app settings, deliberately: it travels with
  // the world, so a world handed to someone else keeps the identity that
  // in-world references were written against.
  //
  // Optional only for reading. Worlds saved before this existed have none, and
  // `loadProject` mints one and writes it back the first time such a world is
  // opened — so the field is absent on disk exactly once per world, and every
  // caller downstream of a load can rely on it being there.
  id?: string;
  // Which world this one was copied from, by that world's `id`. Lineage is its
  // own field precisely so `id` can stay meaningless: a copy gets a *fresh*
  // id, never one derived from its parent's, because anything derived
  // eventually gets recomputed and a recomputed id breaks every reference to
  // it. "This is a fork of that" is real data and lives here.
  //
  // Absent means "not known to be a copy", which is also what an original
  // reads as — there is no way to tell those apart and no need to.
  forkedFromId?: string;
  name: string;
  rootOrder: string[];
  // Manual sibling order inside each parent, keyed by parent node id — the
  // same job `rootOrder` does for the top level. Optional, and individual
  // parents may be missing from it: projects saved before drag-to-reorder
  // existed have neither, and a folder nobody has reordered never gets an
  // entry. Anything unlisted falls back to creation order (see
  // tree-service.ts's orderSiblings), so this is additive, never a migration.
  childOrder?: Record<string, string[]>;
  // The page designated as this world's home — an ordinary Node like any
  // other, not a reserved one, exactly as LegendKeeper does it ("Set as
  // project home" on any page's right-click menu). Optional and nullable:
  // projects saved before this existed have no entry, and a world simply
  // needn't have a home page. Deleting the designated page clears it (see
  // project-store's deleteNode) so this never points at a node that's gone.
  homeNodeId?: string | null;
  // Pages pinned to the rail under the tree search — LegendKeeper's "Set as
  // shortcut", and the same kind of thing `homeNodeId` is: ordinary pages,
  // marked, not a reserved sort of page. Per-project rather than app-level,
  // unlike the sidebar widths and the double-click preference: which pages you
  // reach for constantly is a fact about a world, not a habit that follows you
  // between them.
  //
  // Optional, so every project saved before this existed reads as "none
  // pinned" rather than needing a migration. Order is the order they were
  // pinned in, and is the order the rail draws them — deliberately not
  // alphabetical or tree order, because a rail you arranged stays where you
  // put it. Deleting a pinned page unpins it (see project-store's deleteNodes)
  // so this never points at a node that's gone.
  pinnedIds?: string[];
  // The picture the start screen's grid shows for this world, in `assets/` —
  // Phase 27, "covers you set yourself". Absent means "no cover set", the same
  // reading a world saved before this existed gets, and both draw the
  // generated gradient (`project-covers.ts`) instead.
  //
  // Written from the start screen itself, on a world that may well not be
  // open — see `setProjectCoverImage` in filesystem-service.ts, which patches
  // just this key rather than going through the normal typed load/save round
  // trip a project only gets by being opened.
  coverImage?: string;
  expandedIds: string[];
  selectedId: string | null;
  // The name of the page `selectedId` pointed at, the moment it was set —
  // kept alongside the id rather than derived from it so the start screen can
  // say what page she was last on without opening the world to look it up.
  // `readWorldSummary` reads two flat fields off `project.json`; resolving a
  // name from an id needs the node it belongs to, and node files are found by
  // walking the tree, not indexed by id. Stale the moment that page is
  // renamed until she visits it again, which is the same trade `name` itself
  // already makes for a world whose folder was renamed outside the app.
  selectedName?: string | null;
  createdAt: number;
};

/**
 * A world's own templates, as saved by "Convert to template".
 *
 * Deliberately the same shape as the project's tree — a flat bag of `Node`s
 * wired together by `parentId`, plus the order of the roots — because a
 * template *is* a page, copied. That's what LegendKeeper does and what the user
 * confirmed she wants: converting copies everything, the writing and the filled
 * -in property values included, optionally with the sub-pages underneath.
 *
 * Reusing `Node` means these get tabs, properties, colours, images and nesting
 * for free, and Phase 17's Templates tab can render them with the same tree the
 * project uses. Kept in their own record rather than mixed into the project's
 * `nodes`, which is the important half: anything that walks every page — search,
 * the property index, LK export, the Phase 1.5 publisher — would otherwise have
 * to remember to filter templates out, and the one that forgets is a bug that
 * puts scaffolding in her published world.
 */
export type TemplateLibrary = {
  version: 1;
  // Keyed by id, matching the project store's `nodes`.
  nodes: Record<string, Node>;
  // The template roots, in the order they should be offered. Newest last, the
  // way the shortcut rail appends rather than prepends: a list that reorders
  // itself every time you add to it can't be learned.
  rootOrder: string[];
  /**
   * This world's replacements for the built-in templates: a template key
   * ("character") → the id of the node in `nodes` that stands in for it.
   *
   * The built-in ones are seed data in `template-registry.ts` and are the same
   * in every world, so "edit the Character template" can only mean *this
   * world's* Character — an override, kept beside her own templates because it
   * is one, in the same file, of the same shape.
   *
   * **An overridden node is a root in `nodes` but must never be in
   * `rootOrder`.** That list is her own templates, the ones offered as extras
   * on the new-page screen; an override isn't an extra, it's what Character
   * already means here. `listTemplates` filters these out and everything that
   * draws her templates goes through it.
   *
   * Removing the entry (and its node) is what "put it back to the original"
   * does — the registry is untouched and always still there underneath.
   */
  overrides: Record<string, string>;
};

export function createTemplateLibrary(): TemplateLibrary {
  return { version: 1, nodes: {}, rootOrder: [], overrides: {} };
}

export function createTab(input: { id: string; label: string; hidden?: boolean; content?: BlockNoteDocument }): Tab {
  return {
    id: input.id,
    label: input.label,
    hidden: input.hidden ?? false,
    content: input.content ?? [],
  };
}

export function createNode(input: {
  parentId: string | null;
  templateKey: string;
  name: string;
  tabs?: Tab[];
  properties?: Record<string, unknown>;
  customProperties?: CustomPropertySpec[];
  blocks?: Block[];
  tags?: string[];
  color?: string;
}): Node {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    parentId: input.parentId,
    templateKey: input.templateKey,
    name: input.name,
    tabs: input.tabs ?? [],
    properties: input.properties ?? {},
    customProperties: input.customProperties ?? [],
    // Always written, never left absent — see the field's comment on Node. A
    // page created from here has authored its sidebar even when the answer is
    // "nothing in it", and only a page from before Phase 18a gets derived.
    blocks: input.blocks ?? [],
    tags: input.tags ?? [],
    color: input.color,
    createdAt: now,
    updatedAt: now,
  };
}

export function createProject(input: {
  name: string;
  rootOrder?: string[];
  expandedIds?: string[];
  forkedFromId?: string;
}): Project {
  return {
    version: 1,
    id: crypto.randomUUID(),
    // Spread rather than assigned, so an original has no `forkedFromId` key at
    // all rather than one holding `undefined` — the same shape a world read
    // back off disk has, since JSON drops undefined.
    ...(input.forkedFromId ? { forkedFromId: input.forkedFromId } : {}),
    name: input.name,
    rootOrder: input.rootOrder ?? [],
    expandedIds: input.expandedIds ?? [],
    selectedId: null,
    createdAt: Date.now(),
  };
}
