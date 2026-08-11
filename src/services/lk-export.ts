// The only file that writes LegendKeeper's `.lk` export format — the inverse
// of lk-import.ts, and bound by the same architecture rule (see CLAUDE.md).
// docs/lk-format.md holds the mapping table both directions implement; read it
// before changing anything here, and update it when this changes.
//
// No network access of any kind lives in this file. An export is a pure
// conversion plus one local file write — see docs/handoff.md on why images
// therefore can't travel inside a `.lk` at all.
import { COLOR_PALETTE } from "../constants/palette";
import { FOLDER_TEMPLATE_KEY, type Node, type Project, type Tab } from "../constants/schema";
import type { RenderableProperty } from "./property-service";
import { getPropertySchema } from "./template-registry";

// ---- Raw .lk shapes we produce (mirrors lk-import's reader-side types) ----
type LkMark = { type: string; attrs?: Record<string, unknown> };
type LkNode = { type: string; attrs?: Record<string, unknown>; content?: LkNode[]; text?: string; marks?: LkMark[] };
type LkDocument = { id: string; name: string; pos: string; isHidden: boolean; content: LkNode };
type LkProperty = {
  id: string;
  title: string;
  type: string;
  data: Record<string, unknown>;
};
type LkResource = {
  id: string;
  parentId: string | null;
  name: string;
  pos: string;
  iconColor?: string;
  isHidden: boolean;
  isLocked: boolean;
  documents: LkDocument[];
  properties: LkProperty[];
  tags: string[];
  aliases: string[];
  banner?: { enabled: boolean; url: string; yPosition: number };
};

export type LkExportFile = {
  version: number;
  exportId: string;
  exportedAt: string;
  resourceCount: number;
  resources: LkResource[];
  calendars: unknown[];
};

export type ExportPlan = {
  file: LkExportFile;
  /** Pages included, excluding the synthesised project root. */
  pageCount: number;
  /** Plain-language notes about anything that won't survive the trip. */
  lossyNotes: string[];
};

// The schema version LK's own exports carried when this was written, against
// the user's real Valeraverse.lk. Declaring a version we've actually seen is
// safer than inventing a higher one.
const LK_EXPORT_VERSION = 1;

// ---- pos: LK's fractional index ----
// Import only ever compares these as plain strings (see docs/lk-format.md), so
// what matters on the way out is that siblings sort in the order we hand them
// over. Printable ASCII from '0' up.
//
// **Always two characters**, even for the first 75. Variable-length keys don't
// sort right under plain string comparison — "00" (index 75) lands before "1"
// (index 1), because comparison is character by character and '0' < '1'. Fixed
// width sidesteps that entirely, and 75² is more siblings than any hand-built
// world will hold. LK's own keys are variable-length, which is fine to read:
// its fractional indexing accepts any string, and we only have to produce keys
// that sort, not keys shaped like theirs.
const POS_ALPHABET = "0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz";

export function positionKey(index: number): string {
  const high = Math.floor(index / POS_ALPHABET.length);
  const low = index % POS_ALPHABET.length;
  return POS_ALPHABET[Math.min(high, POS_ALPHABET.length - 1)] + POS_ALPHABET[low];
}

// ---- Lossy tracking, surfaced in the export preview ----
type LossyTracker = Map<string, number>;
function bump(tracker: LossyTracker, key: string, by = 1): void {
  tracker.set(key, (tracker.get(key) ?? 0) + by);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function describeLossy(tracker: LossyTracker): string[] {
  const notes: string[] = [];
  const localImages = tracker.get("localImages");
  if (localImages) {
    notes.push(
      `${plural(localImages, "picture")} you added in Anamnesis can't go into a LegendKeeper file. The format only stores web addresses of pictures already on LegendKeeper's own servers, so there's nowhere to put a file from your computer. Your pictures stay where they are — they're just not in this export.`,
    );
  }
  const folders = tracker.get("folderTabs");
  if (folders) {
    notes.push(`${plural(folders, "folder")} export as pages with an empty Main tab — LegendKeeper has no folder-only concept.`);
  }
  return notes;
}

// ---- Inline content: BlockNote -> ProseMirror ----
type InlineRun = { type?: string; text?: string; styles?: Record<string, unknown>; content?: unknown; props?: Record<string, unknown>; href?: string };

const STYLE_TO_MARK: Record<string, string> = {
  bold: "strong",
  italic: "em",
  code: "code",
  underline: "underline",
  strike: "strike",
};

function marksFromStyles(styles: Record<string, unknown> | undefined, extra: LkMark[] = []): LkMark[] | undefined {
  const marks: LkMark[] = [...extra];
  for (const [style, markType] of Object.entries(STYLE_TO_MARK)) {
    if (styles?.[style]) marks.push({ type: markType });
  }
  return marks.length > 0 ? marks : undefined;
}

// Import turns LK's hardBreak into a text run containing "\n" (docs/lk-format.md),
// so the way back has to split those runs apart again — a literal newline
// inside a ProseMirror text node isn't valid and renders as nothing in LK.
function pushTextRun(out: LkNode[], value: string, marks: LkMark[] | undefined): void {
  const segments = value.split("\n");
  segments.forEach((segment, index) => {
    if (index > 0) out.push({ type: "hardBreak" });
    if (segment) out.push({ type: "text", text: segment, ...(marks ? { marks } : {}) });
  });
}

function convertInline(content: unknown, idMap: Map<string, string>): LkNode[] {
  const out: LkNode[] = [];
  if (!Array.isArray(content)) return out;

  for (const raw of content as InlineRun[]) {
    if (!raw || typeof raw !== "object") continue;

    if (raw.type === "link") {
      const href = typeof raw.href === "string" ? raw.href : "";
      const linkMark: LkMark[] = href ? [{ type: "link", attrs: { href } }] : [];
      for (const child of (Array.isArray(raw.content) ? raw.content : []) as InlineRun[]) {
        if (child?.type === "text" && typeof child.text === "string") {
          pushTextRun(out, child.text, marksFromStyles(child.styles, linkMark));
        }
      }
      continue;
    }

    if (raw.type === "mention") {
      // A mention whose target isn't in this export would point at nothing in
      // LK, so it degrades to its own label — the same fallback import makes
      // in the opposite direction.
      const nodeId = typeof raw.props?.nodeId === "string" ? raw.props.nodeId : undefined;
      const label = typeof raw.props?.label === "string" ? raw.props.label : "";
      const lkId = nodeId ? idMap.get(nodeId) : undefined;
      if (lkId) out.push({ type: "mention", attrs: { id: lkId, text: label } });
      else if (label) pushTextRun(out, label, undefined);
      continue;
    }

    if (typeof raw.text === "string") pushTextRun(out, raw.text, marksFromStyles(raw.styles));
  }

  return out;
}

// ---- Blocks: BlockNote -> ProseMirror ----
type BlockNoteBlock = {
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: unknown;
};

const CALLOUT_TO_PANEL_TYPE: Record<string, string> = {
  calloutInfo: "info",
  calloutQuote: "note",
};

function paragraphOf(content: LkNode[]): LkNode {
  return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
}

function childBlocks(block: BlockNoteBlock, idMap: Map<string, string>, lossy: LossyTracker): LkNode[] {
  return Array.isArray(block.children) ? convertBlocks(block.children, idMap, lossy) : [];
}

function convertListRun(
  blocks: BlockNoteBlock[],
  listType: "bulletList" | "orderedList",
  idMap: Map<string, string>,
  lossy: LossyTracker,
): LkNode {
  return {
    type: listType,
    content: blocks.map((block) => {
      const nested = childBlocks(block, idMap, lossy);
      return { type: "listItem", content: [paragraphOf(convertInline(block.content, idMap)), ...nested] };
    }),
  };
}

function convertBlock(block: BlockNoteBlock, idMap: Map<string, string>, lossy: LossyTracker): LkNode[] {
  const inline = () => convertInline(block.content, idMap);

  switch (block.type) {
    case "paragraph":
      return [paragraphOf(inline())];
    case "heading": {
      const rawLevel = block.props?.level;
      const level = typeof rawLevel === "number" ? Math.min(Math.max(rawLevel, 1), 6) : 1;
      return [{ type: "heading", attrs: { level }, content: inline() }];
    }
    case "divider":
      return [{ type: "rule" }];
    case "quote":
      // Import maps LK's plain blockquote here and its panel type="note" to the
      // Quote *callout*; this is the matching half of that split.
      return [{ type: "blockquote", content: [paragraphOf(inline())] }];
    case "calloutInfo":
    case "calloutQuote":
      return [
        {
          type: "panel",
          attrs: { panelType: CALLOUT_TO_PANEL_TYPE[block.type] },
          content: [paragraphOf(inline()), ...childBlocks(block, idMap, lossy)],
        },
      ];
    case "calloutSecret":
      // LK's own Secret block, which import calls a direct lossless match.
      // (Import also folds panel warning/error into this callout, so those
      // come back as Secrets rather than warnings — nothing distinguishes
      // them once they're here.)
      return [
        {
          type: "bodiedExtension",
          attrs: { extensionKey: "block-secret", extensionType: "com.legendkeeper.block", parameters: {} },
          content: [paragraphOf(inline()), ...childBlocks(block, idMap, lossy)],
        },
      ];
    case "toggleListItem": {
      const title = convertInline(block.content, idMap)
        .map((node) => node.text ?? "")
        .join("");
      return [{ type: "expand", attrs: { title }, content: childBlocks(block, idMap, lossy) }];
    }
    default:
      // Unknown block types keep their text rather than vanishing — the same
      // principle import applies in the other direction.
      return [paragraphOf(inline())];
  }
}

export function convertBlocks(blocks: unknown, idMap: Map<string, string>, lossy: LossyTracker): LkNode[] {
  if (!Array.isArray(blocks)) return [];
  const out: LkNode[] = [];

  // List items are flat siblings in BlockNote and nested inside a single list
  // node in ProseMirror, so consecutive items of the same kind are gathered
  // into one list rather than each becoming a list of its own.
  let index = 0;
  const typed = blocks as BlockNoteBlock[];
  while (index < typed.length) {
    const block = typed[index];
    const listType =
      block?.type === "bulletListItem" ? "bulletList" : block?.type === "numberedListItem" ? "orderedList" : null;

    if (listType) {
      const run: BlockNoteBlock[] = [];
      while (index < typed.length && typed[index]?.type === block.type) run.push(typed[index++]);
      out.push(convertListRun(run, listType, idMap, lossy));
      continue;
    }

    out.push(...convertBlock(block, idMap, lossy));
    index++;
  }

  return out;
}

function emptyDoc(content: LkNode[]): LkNode {
  return { type: "doc", content };
}

// ---- Properties: our sidebar fields -> LK's property list ----
function textFragment(value: string): LkNode {
  const paragraphs = value.split("\n").map((line) => paragraphOf(line ? [{ type: "text", text: line }] : []));
  return emptyDoc(paragraphs.length > 0 ? paragraphs : [paragraphOf([])]);
}

/**
 * A property value as text LK can hold. Select-family values are stored as
 * option *ids*, so the labels have to be looked up through the spec — an
 * export that wrote the ids would put "a3f1-…" in the user's LegendKeeper
 * page. An id with no matching option is dropped rather than printed.
 *
 * `date` fields are free text here (fictional calendars — see
 * docs/handoff.md) and LK has no date type either, so they need no special
 * handling; they arrive as strings and leave as strings.
 */
function printableValue(spec: RenderableProperty, value: unknown): string {
  if (spec.type === "number") return typeof value === "number" ? String(value) : "";

  if (spec.type === "select" || spec.type === "status" || spec.type === "multiselect") {
    const ids = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    return ids
      .map((id) => (spec.options ?? []).find((option) => option.id === id)?.label)
      .filter((label): label is string => Boolean(label))
      .join(", ");
  }

  return typeof value === "string" ? value.trim() : "";
}

function convertProperties(node: Node, idMap: Map<string, string>): LkProperty[] {
  const out: LkProperty[] = [];

  const specs: RenderableProperty[] = [...getPropertySchema(node.templateKey), ...(node.customProperties ?? [])];

  for (const spec of specs) {
    const value = node.properties[spec.key];

    if (spec.type === "refs") {
      const ids = Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
      const items = ids.map((id) => idMap.get(id)).filter((id): id is string => Boolean(id));
      if (items.length === 0) continue;
      out.push({
        id: crypto.randomUUID(),
        title: spec.label,
        type: "RESOURCE_LINK",
        data: { items: items.map((resourceId) => ({ resourceId })) },
      });
      continue;
    }

    // Everything else lands in a LK TEXT_FIELD, because LK has exactly two
    // property types — text and resource link — and that's the one left. So
    // this is where Phase 13's number/select/multi-select/status get
    // flattened to their printed form: LK has no equivalent and the round
    // trip back can only ever produce text. Recorded in docs/lk-format.md.
    //
    // Flattening deliberately happens here rather than by leaving them out.
    // Before Phase 13 the guard below was `typeof value !== "string"`, which
    // was true of every value this app could hold — the moment a property
    // could be a number or an array of option ids, that same guard started
    // silently dropping them from the export instead.
    const text = printableValue(spec, value);
    if (!text) continue;
    out.push({ id: crypto.randomUUID(), title: spec.label, type: "TEXT_FIELD", data: { fragment: textFragment(text) } });
  }

  return out;
}

function paletteHexFor(colorKey: string | undefined): string | undefined {
  if (!colorKey) return undefined;
  return COLOR_PALETTE.find((color) => color.key === colorKey)?.hex ?? undefined;
}

// ---- Tabs -> documents ----
function convertTabs(tabs: Tab[], idMap: Map<string, string>, lossy: LossyTracker): LkDocument[] {
  return tabs.map((tab, index) => ({
    id: crypto.randomUUID(),
    name: tab.label,
    pos: positionKey(index),
    isHidden: tab.hidden,
    content: emptyDoc(convertBlocks(tab.content, idMap, lossy)),
  }));
}

// ---- Top-level orchestration ----

/**
 * Collects the ids to export: every node given, plus everything beneath them.
 * A `.lk` export always carries the whole subtree — LegendKeeper's own export
 * offers no choice about it (confirmed against a live account), so neither
 * does ours.
 */
export function collectSubtree(rootIds: string[], nodes: Node[]): Set<string> {
  const childrenByParent = new Map<string, Node[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  }

  const included = new Set<string>();
  const queue = [...rootIds];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (included.has(id)) continue;
    included.add(id);
    for (const child of childrenByParent.get(id) ?? []) queue.push(child.id);
  }
  return included;
}

/**
 * Builds the whole `.lk` file in memory. Pure — no disk, no network.
 *
 * `rootIds` are the nodes the user asked for; their descendants come along
 * automatically. `orderedIdsFor` supplies each parent's sibling order (the
 * tree's own ordering lives in the project, not on the nodes), so exported
 * `pos` keys match what the user sees.
 */
export function buildExportFile(input: {
  project: Project;
  nodes: Node[];
  rootIds: string[];
  orderedIdsFor: (parentId: string | null) => string[];
}): ExportPlan {
  const { project, nodes, rootIds, orderedIdsFor } = input;
  const lossy: LossyTracker = new Map();
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const included = collectSubtree(rootIds, nodes);
  const includedNodes = nodes.filter((node) => included.has(node.id));

  // LK's format requires exactly one resource with no parent — its project
  // home. Ours is a page like any other, so if the designated home page is in
  // this export it *becomes* that root; otherwise one is synthesised from the
  // project's name, which is what LK would show there anyway.
  const homeNode = project.homeNodeId && included.has(project.homeNodeId) ? byId.get(project.homeNodeId) : undefined;
  const rootId = crypto.randomUUID();

  const idMap = new Map<string, string>();
  for (const node of includedNodes) {
    idMap.set(node.id, homeNode && node.id === homeNode.id ? rootId : crypto.randomUUID());
  }

  const resources: LkResource[] = [];

  function imageProperties(node: Node): LkProperty[] {
    if (!node.image) return [];
    // A picture that came from LK still knows the address it came from, so it
    // can go home. One added here is a local file with no address at all.
    if (!node.imageSource) {
      bump(lossy, "localImages");
      return [];
    }
    return [{ id: crypto.randomUUID(), title: "Image", type: "IMAGE", data: { url: node.imageSource } }];
  }

  function bannerFor(node: Node): LkResource["banner"] {
    if (!node.banner) return undefined;
    if (!node.bannerSource) {
      bump(lossy, "localImages");
      return undefined;
    }
    return { enabled: true, url: node.bannerSource, yPosition: node.bannerFocusY ?? 50 };
  }

  function emit(node: Node, parentLkId: string | null, pos: string): void {
    if (node.templateKey === FOLDER_TEMPLATE_KEY) bump(lossy, "folderTabs");

    // Folders hold no content in our model and LK has no folder-only concept,
    // so they go across as pages with one empty tab. Same for any page that
    // has somehow ended up with no tabs at all.
    const documents =
      node.tabs.length > 0
        ? convertTabs(node.tabs, idMap, lossy)
        : [{ id: crypto.randomUUID(), name: "Main", pos: positionKey(0), isHidden: false, content: emptyDoc([]) }];

    resources.push({
      id: idMap.get(node.id)!,
      parentId: parentLkId,
      name: node.name,
      pos,
      iconColor: paletteHexFor(node.color),
      // Straight across — LK's `isHidden` on a resource means what this app's
      // `hidden` means, and both cascade to descendants rather than being
      // written onto each one. Hardcoded `false` here until 2026-08-10, which
      // silently un-hid every hidden page on the way out.
      isHidden: Boolean(node.hidden),
      isLocked: false,
      documents,
      properties: [...convertProperties(node, idMap), ...imageProperties(node)],
      tags: node.tags ?? [],
      aliases: [],
      banner: bannerFor(node),
    });
  }

  if (homeNode) {
    emit(homeNode, null, positionKey(0));
  } else {
    resources.push({
      id: rootId,
      parentId: null,
      name: project.name,
      pos: positionKey(0),
      isHidden: false,
      isLocked: false,
      documents: [{ id: crypto.randomUUID(), name: "Main", pos: positionKey(0), isHidden: false, content: emptyDoc([]) }],
      properties: [],
      tags: [],
      aliases: [],
    });
  }

  // Depth-first in the order the tree actually shows, so exported `pos` keys
  // put siblings back the way the user arranged them.
  const orderedIncluded: string[] = [];
  (function collect(parentId: string | null): void {
    for (const id of orderedIdsFor(parentId)) {
      if (included.has(id)) orderedIncluded.push(id);
      collect(id);
    }
  })(null);

  // One rule covers every shape this can take: a node hangs off its own parent
  // when that parent is in the export too, and off the root when it isn't.
  // That's what lets a single nested page be exported without dragging its
  // ancestors along, and what puts a whole world's top-level pages under the
  // home page — which is exactly where LK keeps them.
  const childrenByLkParent = new Map<string, string[]>();
  for (const id of orderedIncluded) {
    if (homeNode && id === homeNode.id) continue;
    const parentId = byId.get(id)?.parentId;
    const lkParentId = parentId && included.has(parentId) ? idMap.get(parentId)! : rootId;
    const siblings = childrenByLkParent.get(lkParentId) ?? [];
    siblings.push(id);
    childrenByLkParent.set(lkParentId, siblings);
  }

  for (const [lkParentId, siblings] of childrenByLkParent) {
    siblings.forEach((id, index) => {
      const node = byId.get(id);
      if (node) emit(node, lkParentId, positionKey(index));
    });
  }

  const file: LkExportFile = {
    version: LK_EXPORT_VERSION,
    exportId: crypto.randomUUID(),
    exportedAt: new Date().toISOString(),
    resourceCount: resources.length,
    resources,
    calendars: [],
  };

  return { file, pageCount: includedNodes.length, lossyNotes: describeLossy(lossy) };
}

/**
 * Gzips the export. `CompressionStream` is native to the webview, so this needs
 * no dependency — the same trick import uses to decompress, run backwards.
 */
export async function packLkBytes(file: LkExportFile): Promise<Uint8Array> {
  const json = JSON.stringify(file);
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
