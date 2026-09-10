// What every importer hands the store (Phase 20).
//
// **One plan shape for every source, so the modal and the store know nothing
// about where a world came from.** The `.lk` importer wrote this shape first
// (Phase 8) and kept it to itself; the markdown importer is the second thing
// to produce one, and the preview, the destination step and the write to disk
// are the same for both — so the shape moved out here rather than being
// borrowed from a file whose rule is that it alone reads `.lk`.
//
// Nothing in this file decides anything. It is vocabulary.
import type { Node } from "../constants/schema";
import type { TemplateKey } from "./template-registry";

/**
 * A picture that still has to be downloaded before the import can be written.
 *
 * Three slots, not one, and the third is shaped differently on purpose. A
 * portrait and a banner are fields on the Node, so naming the node is enough to
 * say where the filename goes. A picture in the writing is a block inside a
 * tab's content, and there can be any number of them in one page — so it
 * carries the id of the block it belongs to, and `applyBodyImage` in
 * `lk-import.ts` is what puts the two back together.
 *
 * Only the `.lk` importer produces these: LegendKeeper stores addresses, not
 * files, so its pictures are on its servers. A markdown vault's pictures are
 * already files, and travel as `ImportAsset`s instead.
 */
export type ImportPendingImage =
  | { nodeId: string; url: string; field: "image" | "banner" }
  | { nodeId: string; url: string; field: "body"; blockId: string };

/**
 * A picture that already exists as a file and is copied into the new project.
 *
 * **The nodes already point at `fileName`.** Unlike a pending download, which
 * may fail and leaves the page pointing at the address it came from, a copy
 * from a file the importer has already listed is expected to succeed — so the
 * plan writes the final `anamnesis-asset:` reference up front and the store
 * only has to put the bytes where that reference says. `read` is a closure
 * because the bytes may sit in a folder on disk or inside a zip held in
 * memory, and the store has no business knowing which.
 */
export type ImportAsset = { fileName: string; read: () => Promise<Uint8Array> };

export type ImportPreviewNode = { id: string; name: string; templateKey: string; children: ImportPreviewNode[] };

export type ImportPlan = {
  projectName: string;
  nodes: Node[];
  rootOrder: string[];
  // LK's project root comes across as a real page designated the project home
  // (see `buildImportPlan`) — never null in practice for a well-formed export,
  // null only for the malformed no-single-root fallback, and always null for
  // a markdown vault, which has no such page.
  homeNodeId: string | null;
  templateCounts: Partial<Record<TemplateKey, number>>;
  totalResources: number;
  lossyNotes: string[];
  pendingImages: ImportPendingImage[];
  /** Pictures copied from files. Empty for a `.lk`, whose pictures download. */
  assets: ImportAsset[];
  preview: ImportPreviewNode[];
};
