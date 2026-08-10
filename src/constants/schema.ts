// Canonical Node / Tab / Project shapes. See docs/spec.md §Data model.
// BlockNoteDocument stays a loose `unknown[]` deliberately, even after Phase 5
// wired up the real editor — this is a `constants/` file, and CLAUDE.md's
// strict layer order means constants can never import from `services/`,
// where the actual BlockNote schema (custom blocks + mention content) lives.
// Real typing happens at the boundary in src/components/page/Editor.tsx.
export type BlockNoteDocument = unknown[];

export const FOLDER_TEMPLATE_KEY = "folder";

// Canonical order used in the New Page picker. See docs/constants-and-theming.md.
export const TEMPLATE_KEYS = [
  "folder",
  "character",
  "location",
  "faction",
  "item",
  "event",
  "species",
  "note",
  "blank",
] as const;

export type Tab = {
  id: string;
  label: string;
  hidden: boolean;
  content: BlockNoteDocument;
};

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

// Option ids are stable strings rather than UUIDs here so a seeded status
// reads plainly in the JSON on disk. Everything the user adds later gets a
// UUID; nothing depends on which kind an id is.
export const DEFAULT_STATUS_OPTIONS: PropertyOption[] = [
  { id: "draft", label: "Draft", color: "gray" },
  { id: "in-progress", label: "In progress", color: "amber" },
  { id: "needs-revision", label: "Needs revision", color: "rose" },
  { id: "done", label: "Done", color: "sage" },
];

export type Node = {
  id: string;
  parentId: string | null;
  templateKey: string;
  name: string;
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
  tags: string[];
  color?: string;
  // Filename of the uploaded portrait/sidebar image inside the project's
  // assets/ directory (see paths.ts's ASSETS_DIR), not a full path — Phase 6's
  // ImageSlot resolves it against the project root when it needs to display
  // or delete the file.
  image?: string;
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
  expandedIds: string[];
  selectedId: string | null;
  createdAt: number;
};

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
    tags: input.tags ?? [],
    color: input.color,
    createdAt: now,
    updatedAt: now,
  };
}

export function createProject(input: { name: string; rootOrder?: string[]; expandedIds?: string[] }): Project {
  return {
    version: 1,
    name: input.name,
    rootOrder: input.rootOrder ?? [],
    expandedIds: input.expandedIds ?? [],
    selectedId: null,
    createdAt: Date.now(),
  };
}
