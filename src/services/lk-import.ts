// The only file that reads or interprets LegendKeeper's `.lk` export format.
// See CLAUDE.md's architecture rules and docs/lk-format.md for the field
// mapping this implements. Pure parsing/conversion lives here; the one
// network fetch this phase needs (downloading a page's LK-hosted image,
// approved by the user for this explicit, one-time import action — see
// docs/handoff.md) is isolated in fetchLkImage so it's easy to find and
// audit against the app's normal zero-network-calls policy.
import { fetch as httpFetch } from "@tauri-apps/plugin-http";
import { COLOR_PALETTE } from "../constants/palette";
import { createTab, FOLDER_TEMPLATE_KEY, type CustomPropertySpec, type Node, type Tab } from "../constants/schema";
import { canHaveChildren, getPropertySchema, type TemplateKey } from "./template-registry";

// ---- Raw .lk shapes (loose — only the fields we actually read) ----
type LkMark = { type: string; attrs?: Record<string, unknown> };
type LkNode = { type: string; attrs?: Record<string, unknown>; content?: LkNode[]; text?: string; marks?: LkMark[] };
type LkDocument = { id: string; name: string; pos: string; isHidden?: boolean; content?: LkNode };
type LkPropertyItem = { resourceId?: string };
type LkProperty = {
  title?: string;
  type: string;
  data?: { url?: string; fragment?: LkNode; items?: LkPropertyItem[] };
};
type LkResource = {
  id: string;
  parentId?: string | null;
  name: string;
  pos: string;
  iconColor?: string;
  documents: LkDocument[];
  properties?: LkProperty[];
  tags?: string[];
  banner?: { enabled?: boolean; url?: string; yPosition?: number };
};
type LkExportFile = { resources: LkResource[] };

type BlockSeed = Record<string, unknown>;

// ---- Public result shapes ----
export type ImportPendingImage = { nodeId: string; url: string; field: "image" | "banner" };
export type ImportPreviewNode = { id: string; name: string; templateKey: string; children: ImportPreviewNode[] };
export type ImportPlan = {
  projectName: string;
  nodes: Node[];
  rootOrder: string[];
  // LK's project root comes across as a real page designated the project home
  // (see buildImportPlan) — never null in practice for a well-formed export,
  // null only for the malformed no-single-root fallback.
  homeNodeId: string | null;
  templateCounts: Partial<Record<TemplateKey, number>>;
  totalResources: number;
  lossyNotes: string[];
  pendingImages: ImportPendingImage[];
  preview: ImportPreviewNode[];
};

export async function parseLkBytes(bytes: Uint8Array): Promise<unknown> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  return JSON.parse(text);
}

// The Rust-proxied fetch from @tauri-apps/plugin-http, not the webview's own
// fetch — LK's image CDN doesn't need to grant our origin CORS access this
// way, since the request never runs as a same-origin browser fetch at all.
export async function fetchLkImage(url: string): Promise<Uint8Array> {
  const response = await httpFetch(url);
  if (!response.ok) throw new Error(`Couldn't download image (${response.status}): ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}

export function extensionFromUrl(url: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?|#|$)/.exec(url);
  return match ? match[1].toLowerCase() : "png";
}

// ---- Template inference from tab signature — see CLAUDE.md §LegendKeeper Import/Export ----
// Ordered most-specific-first, and matched as a *subset*: a page's tabs only
// need to contain a signature's tabs, not equal them exactly. LK treats tabs
// as freeform per page, so a character page with an extra "Gallery" tab the
// user added is still a character — under the original exact-match rule it
// fell through to `note` instead, which silently orphaned its children (see
// the nestability net below).
const TAB_SIGNATURE_TEMPLATES: { tabs: string[]; templateKey: TemplateKey }[] = [
  { tabs: ["Overview", "Biology", "Lifestyle", "Beliefs", "Relations"], templateKey: "species" },
  { tabs: ["Overview", "Map", "History"], templateKey: "location" },
  { tabs: ["Overview", "Backstory"], templateKey: "character" },
];

type InferredTemplate = { templateKey: TemplateKey; promotedForChildren: boolean };

function inferTemplateKey(tabNames: string[], hasChildren: boolean): InferredTemplate {
  const present = new Set(tabNames);
  const matched = TAB_SIGNATURE_TEMPLATES.find((signature) => signature.tabs.every((tab) => present.has(tab)));

  let templateKey: TemplateKey;
  if (matched) templateKey = matched.templateKey;
  else if (tabNames.join("|") === "Main") templateKey = hasChildren ? "folder" : "note";
  else templateKey = "note";

  // Nestability net: LK lets any page hold sub-pages, but our leaf templates
  // (item/event/note) can't — and a leaf node is stored as a flat `Name.json`
  // with no directory of its own, so its children get written into a
  // directory the loader doesn't recognize as node-owned and are gone for
  // good on the next project load, with nothing shown in the tree meanwhile.
  // Falling back to `folder` keeps the sub-pages; the page's own text is
  // dropped in that case, which is reported in the import preview.
  if (hasChildren && !canHaveChildren(templateKey)) {
    return { templateKey: FOLDER_TEMPLATE_KEY, promotedForChildren: true };
  }
  return { templateKey, promotedForChildren: false };
}

// ---- iconColor -> our palette (nearest by RGB distance); LK's own "unset" value is white ----
function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function nearestPaletteKey(hex: string | undefined): string | undefined {
  if (!hex || hex.trim().toLowerCase() === "#ffffff") return undefined;
  const rgb = hexToRgb(hex);
  if (!rgb) return undefined;
  let best: { key: string; distance: number } | null = null;
  for (const color of COLOR_PALETTE) {
    const candidate = color.hex ? hexToRgb(color.hex) : null;
    if (!candidate) continue;
    const distance = (rgb[0] - candidate[0]) ** 2 + (rgb[1] - candidate[1]) ** 2 + (rgb[2] - candidate[2]) ** 2;
    if (!best || distance < best.distance) best = { key: color.key, distance };
  }
  return best?.key;
}

// ---- Lossy-conversion tracking, surfaced in the import preview ----
type LossyTracker = Map<string, number>;
function bump(tracker: LossyTracker, key: string): void {
  tracker.set(key, (tracker.get(key) ?? 0) + 1);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function describeLossy(tracker: LossyTracker): string[] {
  const notes: string[] = [];
  const folders = tracker.get("folderContentDropped");
  if (folders) notes.push(`${plural(folders, "organizing page")} had their own text, which isn't kept — pages used purely as containers don't hold content here.`);
  const promoted = tracker.get("promotedPageContentDropped");
  if (promoted) notes.push(`${plural(promoted, "page")} had both sub-pages and their own text. They became folders so the sub-pages come across, which means their own text isn't kept.`);
  const columns = tracker.get("columns");
  if (columns) notes.push(`${plural(columns, "multi-column layout")} were flattened into a single column.`);
  const embeds = tracker.get("embeds");
  if (embeds) notes.push(`${plural(embeds, "embedded video/link block")} became a plain link.`);
  const icons = tracker.get("icons");
  if (icons) notes.push(`${plural(icons, "decorative icon")} were removed — LegendKeeper's inline icon markers have no equivalent here.`);
  const mentions = tracker.get("brokenMentions");
  if (mentions) notes.push(`${plural(mentions, "cross-reference link")} pointed at a page that wasn't included, and became plain text.`);
  const unknown = tracker.get("unknownBlocks");
  if (unknown) notes.push(`${plural(unknown, "block")} used a LegendKeeper feature Anamnesis doesn't recognize — its text was kept, formatting may be off.`);
  if (tracker.get("welcomeBoilerplate")) {
    notes.push("Your project home page comes across empty — it still held LegendKeeper's stock \"Welcome to LegendKeeper\" tutorial, which is theirs rather than yours.");
  }
  return notes;
}

type ConvertCtx = { idMap: Map<string, string>; lossy: LossyTracker };

function posCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function textLength(nodes: LkNode[] | undefined): number {
  let length = 0;
  for (const node of nodes ?? []) {
    if (node.type === "text" && node.text) length += node.text.length;
    if (node.content) length += textLength(node.content);
  }
  return length;
}

function collectText(nodes: LkNode[] | undefined): string {
  let out = "";
  for (const node of nodes ?? []) {
    if (node.type === "text" && node.text) out += node.text;
    if (node.content) out += collectText(node.content);
  }
  return out;
}

// Every fresh LegendKeeper project ships the identical "Welcome to
// LegendKeeper" home page — a tutorial with links to their own demo world, not
// anything the user wrote. Importing it verbatim would drop LK's onboarding
// copy into the middle of someone's world, so a root page still carrying it
// comes across as an empty home page instead. Matched on the heading text,
// which is the stable part; the rest of the page varies with their releases.
function isLkWelcomeBoilerplate(documents: LkDocument[]): boolean {
  return documents.some((doc) => collectText(doc.content?.content).toLowerCase().includes("welcome to legendkeeper"));
}

// ---- Inline content: text runs, marks, mentions, hard breaks ----
function convertMarksToStyles(marks: LkMark[] | undefined): Record<string, unknown> {
  const styles: Record<string, unknown> = {};
  for (const mark of marks ?? []) {
    if (mark.type === "strong") styles.bold = true;
    else if (mark.type === "em") styles.italic = true;
    else if (mark.type === "code") styles.code = true;
    else if (mark.type === "underline") styles.underline = true;
    else if (mark.type === "strike" || mark.type === "strikethrough") styles.strike = true;
  }
  return styles;
}

function convertInline(nodes: LkNode[] | undefined, ctx: ConvertCtx): unknown[] {
  const out: unknown[] = [];
  for (const node of nodes ?? []) {
    if (node.type === "text") {
      const linkMark = node.marks?.find((m) => m.type === "link");
      const otherMarks = node.marks?.filter((m) => m.type !== "link");
      const textNode = { type: "text", text: node.text ?? "", styles: convertMarksToStyles(otherMarks) };
      const href = linkMark?.attrs?.href;
      out.push(typeof href === "string" && href ? { type: "link", href, content: [textNode] } : textNode);
    } else if (node.type === "hardBreak") {
      out.push({ type: "text", text: "\n", styles: {} });
    } else if (node.type === "mention") {
      const lkId = typeof node.attrs?.id === "string" ? node.attrs.id : undefined;
      const mapped = lkId ? ctx.idMap.get(lkId) : undefined;
      const label = typeof node.attrs?.text === "string" ? node.attrs.text : "";
      if (mapped) {
        out.push({ type: "mention", props: { nodeId: mapped, label } });
      } else {
        bump(ctx.lossy, "brokenMentions");
        out.push({ type: "text", text: label || "[broken mention]", styles: {} });
      }
    } else if (node.type === "inlineExtension") {
      bump(ctx.lossy, "icons");
    } else if (node.content) {
      out.push(...convertInline(node.content, ctx));
    }
  }
  return out;
}

// ---- Block content ----
function convertBlocks(nodes: LkNode[] | undefined, ctx: ConvertCtx): BlockSeed[] {
  const out: BlockSeed[] = [];
  for (const node of nodes ?? []) out.push(...convertBlock(node, ctx));
  return out;
}

// A container node (panel/bodiedExtension) whose first paragraph becomes an
// inline-only custom callout's content; any further children flatten out as
// plain sibling blocks right after it, same "collapse to sequential blocks"
// approach used for layoutSection/layoutColumn and expand.
function convertContainerAsCallout(node: LkNode, blockType: string, ctx: ConvertCtx): BlockSeed[] {
  const children = node.content ?? [];
  const first = children.find((c) => c.type === "paragraph");
  const rest = children.filter((c) => c !== first);
  const callout: BlockSeed = { type: blockType, content: first ? convertInline(first.content, ctx) : [] };
  return [callout, ...convertBlocks(rest, ctx)];
}

function convertListItem(item: LkNode, itemType: "bulletListItem" | "numberedListItem", ctx: ConvertCtx): BlockSeed {
  const children = item.content ?? [];
  const firstParagraph = children.find((c) => c.type === "paragraph");
  const extraParagraphs = children.filter((c) => c !== firstParagraph && c.type === "paragraph");
  const nestedLists = children.filter((c) => c.type === "bulletList" || c.type === "orderedList");
  const block: BlockSeed = { type: itemType, content: firstParagraph ? convertInline(firstParagraph.content, ctx) : [] };
  const childBlocks: BlockSeed[] = [
    ...extraParagraphs.map((p) => ({ type: "paragraph", content: convertInline(p.content, ctx) })),
    ...nestedLists.flatMap((list) => convertList(list, ctx)),
  ];
  if (childBlocks.length > 0) block.children = childBlocks;
  return block;
}

function convertList(node: LkNode, ctx: ConvertCtx): BlockSeed[] {
  const itemType = node.type === "orderedList" ? "numberedListItem" : "bulletListItem";
  return (node.content ?? []).filter((c) => c.type === "listItem").map((item) => convertListItem(item, itemType, ctx));
}

const PANEL_TYPE_TO_CALLOUT: Record<string, string> = {
  info: "calloutInfo",
  note: "calloutQuote",
  warning: "calloutSecret",
  error: "calloutSecret",
  success: "calloutInfo",
};

function convertBlock(node: LkNode, ctx: ConvertCtx): BlockSeed[] {
  switch (node.type) {
    case "paragraph":
      return [{ type: "paragraph", content: convertInline(node.content, ctx) }];
    case "heading": {
      const level = typeof node.attrs?.level === "number" ? Math.min(Math.max(node.attrs.level, 1), 6) : 1;
      return [{ type: "heading", props: { level }, content: convertInline(node.content, ctx) }];
    }
    case "rule":
      return [{ type: "divider" }];
    case "bulletList":
    case "orderedList":
      return convertList(node, ctx);
    case "blockquote": {
      // BlockNote's own native "quote" block is the closest match for a
      // plain ProseMirror blockquote — distinct from LK's panel type="note",
      // which maps to our custom Quote callout instead (see PANEL_TYPE_TO_CALLOUT).
      const paragraphs = (node.content ?? []).filter((c) => c.type === "paragraph");
      return paragraphs.map((p) => ({ type: "quote", content: convertInline(p.content, ctx) }));
    }
    case "panel": {
      const panelType = typeof node.attrs?.panelType === "string" ? node.attrs.panelType : "info";
      return convertContainerAsCallout(node, PANEL_TYPE_TO_CALLOUT[panelType] ?? "calloutInfo", ctx);
    }
    case "bodiedExtension": {
      const key = typeof node.attrs?.extensionKey === "string" ? node.attrs.extensionKey : "";
      if (key === "block-secret") return convertContainerAsCallout(node, "calloutSecret", ctx);
      bump(ctx.lossy, "unknownBlocks");
      const params = (node.attrs?.parameters ?? {}) as Record<string, unknown>;
      const title = typeof params.extensionTitle === "string" ? params.extensionTitle : key || "unsupported block";
      return [
        { type: "heading", props: { level: 4 }, content: [{ type: "text", text: `⚠ Unsupported block: ${title}`, styles: { italic: true } }] },
        ...convertBlocks(node.content, ctx),
      ];
    }
    case "extension": {
      bump(ctx.lossy, "embeds");
      const params = (node.attrs?.parameters ?? {}) as Record<string, unknown>;
      const url = typeof params.embedUrl === "string" ? params.embedUrl : typeof params.url === "string" ? params.url : undefined;
      return [
        {
          type: "paragraph",
          content: url
            ? [{ type: "link", href: url, content: [{ type: "text", text: url, styles: {} }] }]
            : [{ type: "text", text: "[Unsupported embedded content]", styles: { italic: true } }],
        },
      ];
    }
    case "layoutSection":
      bump(ctx.lossy, "columns");
      return convertBlocks(node.content, ctx);
    case "layoutColumn":
      return convertBlocks(node.content, ctx);
    case "expand": {
      // BlockNote ships a real toggle block (toggleListItem, already in our
      // schema via defaultBlockSpecs) — a direct, lossless match for LK's
      // collapsible "expand" block, title and all. No flattening needed.
      const title = typeof node.attrs?.title === "string" ? node.attrs.title : "";
      const children = convertBlocks(node.content, ctx);
      return [{ type: "toggleListItem", content: title ? [{ type: "text", text: title, styles: {} }] : [], ...(children.length > 0 ? { children } : {}) }];
    }
    case "text":
    case "hardBreak":
    case "mention":
    case "inlineExtension":
      return []; // inline-only node types shouldn't appear at block level; ignore defensively
    default:
      bump(ctx.lossy, "unknownBlocks");
      return convertBlocks(node.content, ctx);
  }
}

// ---- LK sidebar properties -> our per-page custom properties (see docs/handoff.md) ----
function extractPlainText(doc: LkNode | undefined): string {
  const paragraphs: string[] = [];
  for (const block of doc?.content ?? []) {
    if (block.type !== "paragraph") continue;
    const text = (block.content ?? []).filter((n) => n.type === "text").map((n) => n.text ?? "").join("");
    if (text) paragraphs.push(text);
  }
  return paragraphs.join("\n");
}

function convertProperties(
  resource: LkResource,
  templateKey: TemplateKey,
  ctx: ConvertCtx,
): { properties: Record<string, unknown>; customProperties: CustomPropertySpec[]; imageUrl?: string } {
  const properties: Record<string, unknown> = {};
  const customProperties: CustomPropertySpec[] = [];
  let imageUrl: string | undefined;

  // A LK property whose title matches one of the inferred template's own
  // fixed fields (e.g. Character's built-in "Friends") fills that field
  // directly rather than becoming a second, duplicate custom property —
  // otherwise the properties panel shows the same-looking field twice, once
  // empty (the template's own) and once with the real imported value.
  const fixedByLabel = new Map(getPropertySchema(templateKey).map((field) => [field.label.trim().toLowerCase(), field]));

  for (const prop of resource.properties ?? []) {
    const fixedMatch = fixedByLabel.get((prop.title ?? "").trim().toLowerCase());

    if (prop.type === "TEXT_FIELD") {
      const text = extractPlainText(prop.data?.fragment);
      if (!text) continue;
      if (fixedMatch && (fixedMatch.type === "text" || fixedMatch.type === "longtext")) {
        properties[fixedMatch.key] = text;
      } else {
        const key = crypto.randomUUID();
        customProperties.push({ key, label: prop.title || "Text", type: "longtext" });
        properties[key] = text;
      }
    } else if (prop.type === "RESOURCE_LINK") {
      const resolved = (prop.data?.items ?? [])
        .map((item) => (item.resourceId ? ctx.idMap.get(item.resourceId) : undefined))
        .filter((id): id is string => Boolean(id));
      if (resolved.length === 0) continue;
      if (fixedMatch && fixedMatch.type === "refs") {
        properties[fixedMatch.key] = resolved;
      } else {
        const key = crypto.randomUUID();
        customProperties.push({ key, label: prop.title || "References", type: "refs" });
        properties[key] = resolved;
      }
    } else if (prop.type === "IMAGE") {
      if (typeof prop.data?.url === "string" && prop.data.url) imageUrl = prop.data.url;
    }
    // TAGS / SPOTIFY_SINGLE / SUBPAGE_INDEX and anything else: no equivalent
    // field here, and in practice these ship empty/unused — silently skipped.
  }

  return { properties, customProperties, imageUrl };
}

// ---- Top-level orchestration ----
export function buildImportPlan(raw: unknown): ImportPlan {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as LkExportFile).resources)) {
    throw new Error("This doesn't look like a LegendKeeper export file.");
  }
  const resources = (raw as LkExportFile).resources;
  const lossy: LossyTracker = new Map();

  // LK's export always has exactly one resource with no parent — that's the
  // project's own root/home page, which corresponds to our Project itself
  // rather than to any Node (see docs/handoff.md's Phase 8 notes for why).
  const rootCandidates = resources.filter((r) => !r.parentId);
  const rootResource = rootCandidates.length === 1 ? rootCandidates[0] : undefined;
  const importedResources = rootResource ? resources.filter((r) => r.id !== rootResource.id) : resources;
  const projectName = rootResource?.name.trim() || "Imported World";

  const idMap = new Map<string, string>();
  for (const resource of importedResources) idMap.set(resource.id, crypto.randomUUID());

  // The root resource gets an id in the map too, because it also becomes a
  // real page — the project home, built at the bottom of this function. That's
  // what lets a mention pointing *at* the project root resolve to something;
  // before the home page existed those came across as plain text (15 of them
  // in the user's own export).
  const homeNodeId = rootResource ? crypto.randomUUID() : null;
  if (rootResource && homeNodeId) idMap.set(rootResource.id, homeNodeId);

  // Grouped by a plain id set rather than by `idMap`, which now knows the root
  // as well: the root's children are the project's *top-level* nodes, and
  // keying them under the root instead would leave the top-level walk empty.
  const importedIds = new Set(importedResources.map((resource) => resource.id));
  const byParent = new Map<string, LkResource[]>();
  for (const resource of importedResources) {
    const parentKey = resource.parentId && importedIds.has(resource.parentId) ? resource.parentId : "";
    const list = byParent.get(parentKey) ?? [];
    list.push(resource);
    byParent.set(parentKey, list);
  }
  for (const list of byParent.values()) list.sort((a, b) => posCompare(a.pos, b.pos));

  const ctx: ConvertCtx = { idMap, lossy };
  const nodes: Node[] = [];
  const pendingImages: ImportPendingImage[] = [];
  const templateCounts: Partial<Record<TemplateKey, number>> = {};
  let createdCounter = Date.now();

  function walk(parentKey: string, newParentId: string | null): ImportPreviewNode[] {
    const children = byParent.get(parentKey) ?? [];
    return children.map((resource) => {
      const newId = idMap.get(resource.id)!;
      const hasChildren = (byParent.get(resource.id) ?? []).length > 0;
      const sortedDocs = [...resource.documents].sort((a, b) => posCompare(a.pos, b.pos));
      const { templateKey, promotedForChildren } = inferTemplateKey(sortedDocs.map((d) => d.name), hasChildren);
      templateCounts[templateKey] = (templateCounts[templateKey] ?? 0) + 1;

      const isFolder = templateKey === FOLDER_TEMPLATE_KEY;
      if (isFolder && sortedDocs.some((d) => textLength(d.content?.content))) {
        bump(lossy, promotedForChildren ? "promotedPageContentDropped" : "folderContentDropped");
      }

      const tabs: Tab[] = isFolder
        ? []
        : sortedDocs.map((doc) =>
            createTab({
              id: crypto.randomUUID(),
              label: doc.name,
              hidden: Boolean(doc.isHidden),
              content: convertBlocks(doc.content?.content, ctx),
            }),
          );

      const { properties, customProperties, imageUrl } = isFolder
        ? { properties: {}, customProperties: [], imageUrl: undefined }
        : convertProperties(resource, templateKey, ctx);

      // Banner (a full-width page-header cover) and the IMAGE property (a
      // sidebar portrait) are two independent slots on our Node — see
      // schema.ts — so both get queued for download rather than one winning.
      if (imageUrl) pendingImages.push({ nodeId: newId, url: imageUrl, field: "image" });
      const bannerUrl = resource.banner?.enabled && resource.banner.url ? resource.banner.url : undefined;
      if (bannerUrl) pendingImages.push({ nodeId: newId, url: bannerUrl, field: "banner" });
      const bannerFocusY = bannerUrl && typeof resource.banner?.yPosition === "number" ? resource.banner.yPosition : undefined;

      const createdAt = createdCounter++;
      const node: Node = {
        id: newId,
        parentId: newParentId,
        templateKey,
        name: resource.name.trim() || "Untitled",
        tabs,
        properties,
        customProperties,
        tags: Array.isArray(resource.tags) ? resource.tags : [],
        color: nearestPaletteKey(resource.iconColor),
        bannerFocusY,
        createdAt,
        updatedAt: createdAt,
      };
      nodes.push(node);

      return { id: newId, name: node.name, templateKey, children: walk(resource.id, newId) };
    });
  }

  const preview = walk("", null);

  // LK's project root is its project home page, and here it becomes exactly
  // that: an ordinary page marked as the project's home (Project.homeNodeId),
  // first in the tree. Always created, even when it has nothing on it — the
  // designation is the point, and a world's home page is somewhere to write
  // rather than something earned by having written already. It keeps the
  // root's own name, which is also the project's name, the same way LK shows
  // it in both places.
  if (rootResource && homeNodeId) {
    const sortedDocs = [...rootResource.documents].sort((a, b) => posCompare(a.pos, b.pos));
    const isBoilerplate = isLkWelcomeBoilerplate(sortedDocs);
    if (isBoilerplate) bump(lossy, "welcomeBoilerplate");

    const importedTabs = isBoilerplate
      ? []
      : sortedDocs.map((doc) =>
          createTab({
            id: crypto.randomUUID(),
            label: doc.name,
            hidden: Boolean(doc.isHidden),
            content: convertBlocks(doc.content?.content, ctx),
          }),
        );

    const createdAt = createdCounter++;
    const homeNode: Node = {
      id: homeNodeId,
      parentId: null,
      templateKey: "note",
      name: rootResource.name.trim() || "Home",
      // A page with no tabs at all has nowhere to type, so an emptied or
      // tab-less root still gets one to start from.
      tabs: importedTabs.length > 0 ? importedTabs : [createTab({ id: crypto.randomUUID(), label: "Main" })],
      properties: {},
      customProperties: [],
      tags: [],
      createdAt,
      updatedAt: createdAt,
    };
    nodes.push(homeNode);
    preview.unshift({ id: homeNodeId, name: homeNode.name, templateKey: "note", children: [] });
    templateCounts.note = (templateCounts.note ?? 0) + 1;
  }

  // Home leads the tree, whatever order it was built in — `nodes` itself is an
  // unordered bag (the store keys it by id the moment it lands), so the home
  // page is appended there and promoted here rather than the other way round.
  const rootOrder = [
    ...(homeNodeId ? [homeNodeId] : []),
    ...nodes.filter((n) => n.parentId === null && n.id !== homeNodeId).map((n) => n.id),
  ];

  return {
    projectName,
    nodes,
    rootOrder,
    homeNodeId,
    templateCounts,
    totalResources: importedResources.length,
    lossyNotes: describeLossy(lossy),
    pendingImages,
    preview,
  };
}
