// In-memory node graph. Never imported directly by components — access is
// always through src/hooks/use-project.ts. See CLAUDE.md's layer order.
import { create } from "zustand";
import { joinPath } from "../services/host-service";
import {
  createNode,
  createProject,
  DEFAULT_STATUS_OPTIONS,
  FOLDER_TEMPLATE_KEY,
  type Block,
  type BlockKind,
  type CollectionSource,
  type CustomPropertySpec,
  type MeterStyle,
  type MeterEntry,
  type MeterFace,
  createTemplateLibrary,
  type Node,
  type Project,
  type TemplateLibrary,
  type Tab,
} from "../constants/schema";
import { IMPORT_IMAGE_CONCURRENCY } from "../constants/limits";
import { TEMPLATES_FILE } from "../constants/paths";
import type { ProjectTemplateFile } from "../constants/project-template";
import * as fsService from "../services/filesystem-service";
import { acknowledge, parseAcknowledgements, unacknowledged } from "../services/acknowledgements";
import { getAcknowledgedWarnings, setAcknowledgedWarnings } from "../services/app-settings-service";
import { isReservedWorldName } from "../services/world-scan";
import { assetRef, releaseAssetUrls } from "../services/asset-urls";
import { isAssetInUse } from "../services/asset-usage";
import { cancelSave, flushAllSaves, flushSave, scheduleSave, setSaveErrorHandler } from "../services/autosave";
import { enqueueWrite } from "../services/write-queue";
import {
  addAssetFolder,
  assignAsset,
  createAssetFolders,
  parseAssetFolders,
  pruneAssignments,
  removeAssetFolder,
  renameAssetFolder as renameFolder,
  type AssetFolders,
} from "../services/asset-folders";
import {
  createAssetNames,
  nameAsset,
  parseAssetNames,
  pruneAssetNames,
  suggestedAssetName,
  type AssetNames,
} from "../services/asset-names";
import {
  createRemovedAssets,
  parseRemovedAssets,
  pruneRemovedAssets,
  removeAsset,
  type RemovedAssets,
} from "../services/asset-removed";
import {
  withTabAdded,
  withTabContent,
  withTabDeleted,
  withTabHiddenToggled,
  withTabRenamed,
  withTabsReordered,
} from "../services/tab-service";
import { getDefaultTabs, getPropertySchema, getTemplate } from "../services/template-registry";
import {
  blockImage,
  blockImageFiles,
  blockKindLabel,
  blocksFor,
  duplicateBlock as duplicateBlockIn,
  moveBlock,
  newBlock,
  pageImageBlockId,
  planBlockRemoval,
  planPageImageBlock,
  planTemplateSwap,
  seedBlocks,
  withBlockImage,
  withCopiedBlockImages,
  withField,
  type BlockPicture,
} from "../services/block-service";
import {
  isPipMeter,
  metersOf,
  meterStyleOf,
  newMeterFor,
  withMeter,
  withMeters,
  withoutMeter,
} from "../services/meter-service";
import {
  descendantIds,
  duplicateScope,
  orderedSiblingIds,
  planDelete,
  planDuplicate,
  planMove,
  type ClonedAssetNames,
} from "../services/node-edit-service";
import { isDescendantOf, sortSiblingIds, type SiblingSort } from "../services/tree-service";
import {
  addOverride,
  addTemplate,
  buildOverrideNode,
  cloneSubtree,
  collectSubtree,
  overrideFor,
  parseTemplateLibrary,
  removeOverride,
  removeTemplate,
  withTemplatesReordered,
} from "../services/template-library";
import {
  EMPTY_NAV_HISTORY,
  forgetNodes,
  locationAt,
  stepBack,
  stepForward,
  visit,
  type NavHistory,
} from "../services/navigation-service";
import {
  isChipType,
  knownOptionsFor,
  planOptionDelete,
  planOptionRecolour,
  planOptionRename,
  planPropertyDelete,
  planPropertyRename,
  planTagDelete,
  planTagRename,
  propertyLabel,
} from "../services/property-service";
import * as lkImportService from "../services/lk-import";
import { materializeProjectTemplate } from "../services/project-template";
import {
  createAssetSources,
  parseAssetSources,
  pruneAssetSources,
  recordAssetSource,
  type AssetSources,
} from "../services/asset-sources";
import type { ImportPendingImage } from "../services/lk-import";
import { countLabel } from "../services/history-service";
import { useHistoryStore } from "./history-store";

// Starter top-level folders for a brand-new project, matching the user's
// actual LK structure (see docs/plan.md Phase 2).
const STARTER_FOLDERS = ["Canon", "AUs", "Characters", "Locations", "Factions", "Worldbuilding"];

export type CreateProjectResult = { ok: true; rootPath: string } | { ok: false; error: string };

/**
 * How far along an import is. Two phases, because they fail differently and
 * take differently long: `images` is dozens of requests to LK's servers and is
 * where the wait actually is, `writing` is local disk and is quick.
 */
export type ImportProgress = { phase: "images" | "writing"; done: number; total: number };

// ─── Undo support ───────────────────────────────────────────────────────────

// Enough of Project to put the tree back the way it was, and deliberately not
// the whole object. Selection and expanded folders are where the user is
// looking *now* — undoing a delete from ten minutes ago shouldn't also collapse
// the folders they've opened since.
type OrderingSnapshot = Pick<Project, "rootOrder" | "childOrder" | "homeNodeId">;

// A deleted page's picture, held in memory so undo can put it back. Nothing
// else in the app keeps a copy: images live in the flat assets/ dir and the
// delete removes the file, so the bytes have to be read before it happens.
type CapturedAsset = { fileName: string; bytes: Uint8Array };

/**
 * The image and banner files belonging to `nodes`, read off disk now. One that
 * won't read is skipped rather than failing the caller — losing the ability to
 * restore a picture is not a reason to refuse a delete the user asked for.
 */
async function captureAssets(rootPath: string, nodes: Node[]): Promise<CapturedAsset[]> {
  const captured: CapturedAsset[] = [];
  for (const node of nodes) {
    // The image blocks' own pictures alongside the two slots (Phase 19.5) —
    // a photo held only by a block in the writing is as deleted as the
    // portrait when the page goes, so it has to be readable to come back.
    for (const fileName of [node.image, node.banner, ...blockImageFiles(node.blocks)]) {
      if (!fileName) continue;
      try {
        captured.push({ fileName, bytes: await fsService.readAssetImage(rootPath, fileName) });
      } catch {
        // See above.
      }
    }
  }
  return captured;
}

/**
 * A page's blocks, with every picture they hold copied to a file of its own
 * (Phase 19.5).
 *
 * **The third set of pictures a page can carry**, after the portrait and the
 * cover, and the one every copying path has to be taught by hand: duplicating a
 * page, saving one as a template and pouring a template into a page all give the
 * arriving copy private files, so that replacing a picture on one page can never
 * empty another. A block missed here is a file two pages share without knowing.
 *
 * A picture that will not copy is dropped rather than shared — `copy` returns
 * undefined for one it cannot read, and the block arrives empty. Sharing the
 * original's filename is the one outcome that can lose someone else's picture.
 */
async function withCopiedBlockPictures(
  blocks: Block[] | undefined,
  copy: (fileName: string) => Promise<string | undefined>,
): Promise<Block[] | undefined> {
  const files = [...new Set(blockImageFiles(blocks))];
  if (files.length === 0) return blocks;
  const copies = new Map(await Promise.all(files.map(async (file) => [file, await copy(file)] as const)));
  return withCopiedBlockImages(blocks, (file) => copies.get(file));
}

export type ProjectStoreState = {
  rootPath: string | null;
  project: Project | null;
  nodes: Record<string, Node>;
  // This world's own templates, kept apart from `nodes` on purpose — see
  // constants/schema.ts's TemplateLibrary. Always an object, empty before a
  // project is open, so no reader has to null-check it.
  templates: TemplateLibrary;
  /**
   * Which template is open for editing in the centre panel, if any.
   *
   * Deliberately not `project.selectedId`. That field is a *project* node id —
   * the tree, the properties panel, breadcrumbs, search and every walker read
   * it that way — and putting a template id in it would have all of them
   * looking up an id that isn't in `nodes`. This is its own piece of state for
   * the same reason templates are their own record.
   *
   * Not persisted: which template you last had open isn't a fact about the
   * world, and reopening a project into a template rather than a page would be
   * a surprise.
   */
  openTemplateId: string | null;
  isLoaded: boolean;
  lastSavedAt: number | null;
  // Node files that couldn't be read on the last load (corrupt JSON, wrong
  // shape). Surfaced by the shell, then dismissed — see LoadWarning.tsx.
  //
  // **Already filtered by what has been acknowledged.** A file waved through
  // as known-broken is left out of this list at load time rather than hidden
  // in the component, so nothing downstream has to remember the distinction.
  // `loadWasIncomplete` below is deliberately *not* filtered.
  skippedFiles: string[];
  // Whether the last load failed to read at least one page file. Deliberately
  // *not* the same thing as `skippedFiles.length > 0`: that list is emptied
  // when she dismisses the notice, and dismissing a notice must not be what
  // re-enables a button whose safety depends on the graph being complete —
  // "nothing is using this picture" is a claim about every page there is.
  // Cleared only by the next load.
  loadWasIncomplete: boolean;
  // Writes that didn't happen. Debounced saves run with no caller left to
  // catch anything, so without this a failed write is invisible and the app
  // goes on claiming "Saved" from the last one that worked — see SaveWarning.
  saveErrors: string[];
  // Pages that were found parked under a move's temp name on the last load and
  // put back. Worth telling the user about: it means an earlier move was
  // interrupted, and silence is what made that dangerous in the first place.
  recoveredCount: number;
  // Pages whose own file was found outside the directory holding their
  // children, and which the last load put back inside it. Same reason as
  // above, plus one of its own: the tree these pages come back into is not the
  // one she was last looking at, and nothing else would explain the change.
  reunitedNames: string[];
  // Pages that had a second, older copy of themselves on disk, which the last
  // load renamed aside. Same notice as the two above, and the same reason:
  // until it's said out loud, the only visible symptom is a page missing work
  // it should have — or a picture the app thinks nothing is using.
  supersededNames: string[];
  dismissRecovered: () => void;
  // Which tab to open on, when a page is being reached from somewhere that
  // knows the answer — a search result naming the tab its match came from.
  // Deliberately not part of Project: it's a single navigation, not state
  // worth writing to disk. Carries the node id as well so PageView can ignore
  // a leftover from an earlier jump instead of applying it to the wrong page.
  pendingFocus: { nodeId: string; tabId: string } | null;
  // A page created a moment ago, still called "Untitled", whose title should
  // open straight into its rename input. Session-only and never written to
  // disk, like pendingFocus above, and it carries a node id for the same
  // reason: so it can only ever apply to the page it was asked for.
  //
  // Being a one-shot is the whole point. The rule used to be "any blank page
  // with no tabs" — a state a page *stays* in until it's answered — so every
  // click back onto an unfinished page grabbed the keyboard and highlighted
  // the title as though a rename had been asked for. Naming a page you just
  // made is help; doing it again on every visit is the title fighting you for
  // the cursor.
  pendingRenameId: string | null;
  // Called by the create hook just *before* it opens the new page: the one
  // selection that lands on the page named here keeps the request, and every
  // other navigation clears it. See applySelection.
  requestRename: (id: string) => void;
  // Which node the tree is showing the inside of — "Focus here" in the
  // right-click menu, for a branch nested deeper than the sidebar can render
  // legibly. Its *children* become the tree's roots; the node itself is named
  // in the path bar above, which is the way back out.
  //
  // Session-only and never written to disk, for the same reason navHistory
  // isn't: reopening a project into a tree showing a fraction of itself, with
  // no memory of having asked for that, reads as pages having gone missing.
  focusedId: string | null;
  setFocus: (id: string | null) => void;
  // Where you've been in this session. Not part of Project and never written to
  // disk — see services/navigation-service.ts for why. Every navigation goes
  // through `selectNode`, which is the only thing that appends to it; back and
  // forward move the cursor over what's already there.
  navHistory: NavHistory;
  loadProject: (rootPath: string) => Promise<{ name: string } | null>;
  dismissSkippedFiles: () => void;
  /**
   * "I know about these, stop telling me" (2026-08-27).
   *
   * Records what state each file is in as well as its name, so acknowledging
   * one problem does not silence the next one in the same file — see
   * services/acknowledgements.ts.
   */
  acknowledgeSkippedFiles: () => Promise<void>;
  dismissSaveErrors: () => void;
  initializeProject: (rootPath: string, name: string) => Promise<void>;
  createProjectAt: (parentDir: string, name: string) => Promise<CreateProjectResult>;
  /**
   * A new project built from a `.antpl` (Phase 27). Same shape as
   * `createProjectAt` from the caller's side — a parent folder and a name in,
   * a path or a reason out — because from hers it is the same errand with the
   * folders already decided.
   */
  createProjectFromTemplate: (
    parentDir: string,
    name: string,
    template: ProjectTemplateFile,
  ) => Promise<CreateProjectResult>;
  importLkProject: (
    parentDir: string,
    name: string,
    plan: { nodes: Node[]; rootOrder: string[]; pendingImages: ImportPendingImage[]; homeNodeId: string | null },
    onProgress?: (progress: ImportProgress) => void,
  ) => Promise<CreateProjectResult>;
  closeProject: () => void;
  addNode: (input: { parentId: string | null; templateKey: string; name: string; blocks?: Block[] }) => Node;
  /**
   * `touch: false` leaves `updatedAt` alone.
   *
   * For changes that are not edits to the page — dismissing the template
   * prompt is the first — because the sidebar prints "Updated <date>" and
   * marking a page edited for closing a box in it is a lie she can read.
   */
  updateNode: (id: string, patch: Partial<Omit<Node, "id">>, options?: { touch?: boolean }) => void;
  /**
   * How many times each node's writing has been replaced from outside the
   * editor (Phase 19: restoring an earlier version).
   *
   * **The editor reads its content once, when it mounts.** It is keyed by tab,
   * so a rewrite underneath it leaves the old words on screen — and the next
   * keystroke saves those old words back, quietly undoing the restore. This
   * number goes in that key, so an external rewrite remounts the editor and
   * nothing else does: `updatedAt` changes on every keystroke and would remount
   * it on every one.
   */
  contentRevisions: Record<string, number>;
  bumpContentRevision: (id: string) => void;
  updateTabContent: (nodeId: string, tabId: string, content: Tab["content"]) => void;
  toggleTabHidden: (nodeId: string, tabId: string) => void;
  addTab: (nodeId: string, label: string) => Tab;
  renameTab: (nodeId: string, tabId: string, label: string) => void;
  deleteTab: (nodeId: string, tabId: string) => void;
  reorderTabs: (nodeId: string, orderedTabIds: string[]) => void;
  applyTemplate: (nodeId: string, templateKey: string) => Promise<void>;
  updateNodeProperty: (nodeId: string, key: string, value: unknown) => void;
  updateNodeTags: (nodeId: string, tags: string[]) => void;
  addCustomProperty: (nodeId: string, label: string, type: CustomPropertySpec["type"]) => void;
  updateCustomProperty: (nodeId: string, key: string, patch: Partial<Omit<CustomPropertySpec, "key">>) => void;
  removePropertyOption: (nodeId: string, key: string, optionId: string) => void;
  /**
   * Takes a property off one page for good — the value, the block showing it,
   * and the spec if the page owned one.
   *
   * Works on a template's fields as well as ones she added, which is her call
   * 2026-08-21 and obviously right: a page made from a template is a *copy*,
   * editing a template already doesn't touch pages made from it, so a field on
   * her page is hers. A template field can be added back empty from Add Block
   * afterwards; one she invented is gone, because nothing else defines it.
   */
  deletePageProperty: (nodeId: string, key: string) => void;
  // Phase 18a's sidebar. Each edit is its own action rather than one
  // "write the blocks array", because Phase 19's panel undo hooks these and a
  // generic setter leaves it unable to say what it is undoing.
  /**
   * Adds a block to the page and hands back its id.
   *
   * **The id is returned for the page body's sake** (Phase 19.5): a block drawn
   * in the writing is a pointer to a record in `node.blocks`, so whoever makes
   * the record has to be able to say which one it made. The sidebar ignores it.
   */
  addBlock: (nodeId: string, kind: BlockKind, extra?: Partial<Block>) => string;
  removeBlock: (nodeId: string, blockId: string) => void;
  reorderBlocks: (nodeId: string, fromIndex: number, toIndex: number) => void;
  duplicateBlock: (nodeId: string, blockId: string) => void;
  setBlockTitle: (nodeId: string, blockId: string, title: string | undefined) => void;
  setBlockTitleShown: (nodeId: string, blockId: string, shown: boolean) => void;
  setBlockColor: (nodeId: string, blockId: string, color: string | undefined) => void;
  /**
   * How wide the block is drawn in the page, as a percentage; `undefined` puts
   * it back to the whole column. Phase 19.5.
   *
   * **A panel edit rather than an editor one, and that follows from where the
   * width lives.** The record is in `node.blocks`, so Ctrl+Z in the middle of
   * the page will not undo a resize — the right-hand panel's undo does. It is
   * the right side to have it on: the width belongs to the block, and a block
   * dragged to the sidebar and back is still the width she made it.
   */
  setBlockWidth: (nodeId: string, blockId: string, width: number | undefined) => void;
  setBlockText: (nodeId: string, blockId: string, text: string) => void;
  setBlockLink: (nodeId: string, blockId: string, targetId: string | undefined) => void;
  // Phase 18c's meters. A meter block holds a list of readings, so everything
  // below the first two names a reading as well as a block.
  setBlockMeter: (nodeId: string, blockId: string, style: MeterStyle) => void;
  setBlockMeterText: (nodeId: string, blockId: string, shown: boolean) => void;
  setBlockMeterMax: (nodeId: string, blockId: string, shown: boolean) => void;
  setBlockMeterFace: (nodeId: string, blockId: string, face: MeterFace) => void;
  setBlockMeterSegmented: (nodeId: string, blockId: string, segmented: boolean) => void;
  setBlockMeterPip: (nodeId: string, blockId: string, pip: string | undefined) => void;
  addMeter: (nodeId: string, blockId: string) => void;
  duplicateMeter: (nodeId: string, blockId: string, meterId: string) => void;
  removeMeter: (nodeId: string, blockId: string, meterId: string) => void;
  editMeter: (nodeId: string, blockId: string, meterId: string, patch: Partial<MeterEntry>) => void;
  editMeters: (nodeId: string, blockId: string, patches: Record<string, Partial<MeterEntry>>) => void;
  // Phase 18b's collection settings.
  setBlockSource: (nodeId: string, blockId: string, source: CollectionSource) => void;
  setBlockTargets: (nodeId: string, blockId: string, targetIds: string[]) => void;
  setBlockTags: (nodeId: string, blockId: string, tags: string[]) => void;
  setNodeAliases: (nodeId: string, aliases: string[]) => void;
  // Project-wide, from the All properties & tags view. Each is one undo entry
  // however many pages it touched — see applyBulk.
  renamePropertyEverywhere: (label: string, newLabel: string) => void;
  deletePropertyEverywhere: (label: string) => void;
  renameTagEverywhere: (tag: string, newTag: string) => void;
  deleteTagEverywhere: (tag: string) => void;
  renameOptionEverywhere: (propertyLabel: string, optionLabel: string, newLabel: string) => void;
  recolourOptionEverywhere: (propertyLabel: string, optionLabel: string, color: string) => void;
  deleteOptionEverywhere: (propertyLabel: string, optionLabel: string) => void;
  /**
   * A page's own icon, or `undefined` to go back to its template's.
   *
   * Takes a list because the tree's menu acts on the selection, the way
   * `setNodeColor` does — giving nine pages the same icon is one action and
   * one undo, not nine.
   */
  setNodeIcon: (nodeIds: string[], icon: string | undefined) => void;
  setTemplatePromptHidden: (nodeId: string, hidden: boolean) => void;
  setNodeImage: (nodeId: string, data: Uint8Array, extension: string) => Promise<void>;
  /**
   * Point the portrait at a picture the project already has, rather than
   * uploading another copy of it. Phase 17's library.
   *
   * Not async, and that's the point of the whole feature: there's no file to
   * write. The same filename can now be held by any number of slots, pages and
   * templates at once, which is why nothing deletes an asset without asking
   * `isAssetInUse` first.
   */
  /**
   * The five below name an *image block* as well as a page, and one rule
   * decides where each write lands (Phase 19.5): the block that draws the
   * page's own picture writes to the node, and every other image block writes
   * to its own record. See `blockImage` in block-service.ts — nothing here
   * decides that for itself.
   */
  setNodeImageFromLibrary: (nodeId: string, blockId: string, fileName: string) => void;
  clearNodeImage: (nodeId: string, blockId: string) => Promise<void>;
  setImageAlt: (nodeId: string, blockId: string, alt: string) => void;
  setImageFocus: (nodeId: string, blockId: string, focusY: number) => void;
  clearImageFocus: (nodeId: string, blockId: string) => void;
  setBannerFromImage: (nodeId: string, blockId: string) => Promise<void>;
  /**
   * Hand the page's own picture to a different image block — the one the tree
   * row, the hover preview and the export show. Phase 19.5.
   *
   * The two pictures trade places rather than one overwriting the other, so
   * nothing is lost by choosing wrong and choosing again.
   */
  setPageImageBlock: (nodeId: string, blockId: string) => void;
  /**
   * Writes a picture into the project's `assets/` and hands back the reference
   * that goes inside a page's image block (Phase 16). Unlike `setNodeImage`
   * there's no slot on the node that owns it — the reference lives in the
   * block, inside the tab's content, and the ordinary content autosave is what
   * persists it.
   */
  /**
   * `originalName` is the name of the file she picked, and it is only ever a
   * starting name for the tile — the file lands in `assets/` under a UUID
   * either way. Optional because two of the four callers have no file to have
   * a name (a picture pasted into a page, and one pulled from a `.lk` import).
   */
  uploadAsset: (data: Uint8Array, extension: string, originalName?: string) => Promise<string>;
  /** Every file in `assets/`, with its size. Read on demand — see useAssets. */
  listAssets: () => Promise<{ fileName: string; size: number }[]>;
  /**
   * Takes one picture out of the library — a change to the library, never to a
   * page. See the implementation for the two paths and why she sees neither.
   *
   * Undoable, and it has to be: this sits under a grid of thumbnails where the
   * wrong one is a mis-click away.
   */
  removeAssetFromLibrary: (fileName: string) => Promise<void>;
  /**
   * Pictures taken out of the library that a page still needs, so the file had
   * to stay. Almost always empty — see constants/paths.ts ASSET_REMOVED_FILE.
   * Held here rather than read on demand for the same reason the folders and
   * names are: the grid has to redraw the moment one is removed.
   */
  removedAssets: RemovedAssets;
  /**
   * The picture library's folders. A folder is a label on a file, never a
   * place it lives — see services/asset-folders.ts, and constants/paths.ts for
   * why. Held in the store rather than read on demand like the listing itself,
   * because unlike the directory it is *edited* here, and the grid has to
   * redraw the moment a picture is dropped into a folder.
   */
  assetFolders: AssetFolders;
  /**
   * What each picture is called, keyed by filename. A label, never the file's
   * own name — see constants/paths.ts ASSET_NAMES_FILE for why that isn't a
   * shortcut worth taking. Held here rather than read on demand for the same
   * reason the folders are: the grid edits it, and a tile has to redraw the
   * moment a name is committed.
   */
  assetNames: AssetNames;
  /**
   * Where each picture came from, keyed by filename — only ever written by a
   * LegendKeeper import, and only read when exporting back to one. See
   * constants/paths.ts ASSET_SOURCES_FILE.
   *
   * Held here rather than read on demand purely so the export path can have it
   * synchronously; nothing on screen shows it, and nothing but an import edits
   * it.
   */
  assetSources: AssetSources;
  /** Names a picture. An empty name takes the name away rather than storing one. */
  renameAsset: (fileName: string, name: string) => void;
  /** Drops names for pictures that are no longer on disk. */
  pruneAssetNames: (present: string[]) => void;
  /** Returns the new folder's id, so the caller can put it into rename. */
  createAssetFolder: (name: string) => string;
  renameAssetFolder: (id: string, name: string) => void;
  /** Removes the folder. **Every picture in it stays** — see the service. */
  deleteAssetFolder: (id: string) => void;
  /** `null` puts it back in Unsorted. */
  setAssetFolder: (fileName: string, folderId: string | null) => void;
  /** Drops labels for files no longer in `assets/`. Called with the listing. */
  pruneAssetFolders: (files: { fileName: string; size: number }[]) => void;
  setNodeBanner: (nodeId: string, data: Uint8Array, extension: string) => Promise<void>;
  /** The cover's half of `setNodeImageFromLibrary`. */
  setNodeBannerFromLibrary: (nodeId: string, fileName: string) => void;
  setBannerFocus: (nodeId: string, focusY: number) => void;
  clearNodeBanner: (nodeId: string) => Promise<void>;
  renameNode: (id: string, name: string) => void;
  moveNode: (id: string, newParentId: string | null, index?: number) => void;
  moveNodes: (ids: string[], newParentId: string | null, index?: number) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  deleteNodes: (ids: string[]) => Promise<void>;
  // The whole selection copied as one undoable step. Takes a list rather than
  // an id even though the menu's usual case is one row: a per-id loop at the
  // call site is several undo entries for one thing the user did, and the
  // ordering pass below has to see the whole batch to place the copies right.
  duplicateNodes: (ids: string[]) => Promise<void>;
  /**
   * Copies a page into this world's templates. The original is untouched —
   * this is "make me one of these to start from", not "turn this into a
   * template" — which is what the dialog says before it runs.
   *
   * `includeDescendants` is the sub-pages question. Off keeps the page's own
   * shape and drops what's parented to it.
   */
  saveAsTemplate: (nodeId: string, includeDescendants: boolean) => Promise<void>;
  deleteTemplate: (rootId: string) => void;
  /**
   * Rewrites the order this world's own templates are offered in — what the
   * drag in the Templates tab writes, and the same list the new-page screen
   * reads, so moving one moves it in both places at once.
   *
   * Takes the whole order rather than an id and an index. `rootOrder` is
   * allowed to be incomplete — `listTemplates` falls back to creation time for
   * anything it doesn't mention — so a diff would have to reason about
   * templates that were never in it, where a whole list simply replaces the
   * question.
   */
  reorderTemplates: (orderedRootIds: string[]) => void;
  /** Opens a template for editing, or closes whatever is open with `null`. */
  openTemplate: (templateNodeId: string | null) => void;
  /**
   * Opens one of the built-in templates for editing, making this world's own
   * copy of it the first time.
   *
   * **The copy is made on open, not on the first edit**, and that's the whole
   * reason `TemplateView` needed no changes: editing a template is already
   * "patch the node with this id in the library", so a built-in only has to
   * become a node in the library for all of it to work. The cost is that
   * looking at one creates a copy identical to the original, which is why
   * "changed" is asked as *does it still match the built-in* rather than *does
   * an override exist* — see isOverrideModified.
   */
  openBuiltInTemplate: (templateKey: string) => void;
  /**
   * Throws away this world's version of a built-in template, so the key means
   * the original again. Undoable, unlike editing one, because it's the step
   * that loses work.
   */
  resetBuiltInTemplate: (templateKey: string) => void;
  /**
   * Patches one node inside the template library — the `updateNode` of the
   * other record.
   *
   * Saves the whole library debounced, the same way editing a page debounces
   * that page's file, because this runs per keystroke through the editor. No
   * undo entry per call, also matching `updateNode`: history is for structural
   * moves, and an undo stack with one entry per character isn't one.
   */
  updateTemplateNode: (nodeId: string, patch: Partial<Omit<Node, "id">>) => void;
  /**
   * Pours one of this world's templates into an existing page — the same shape
   * `applyTemplate` has for the built-in ones, because it answers the same
   * question in the same place: a page is made first and asks what it is
   * afterwards (see NewPageLanding).
   *
   * The page keeps its own name, id and position. Everything the template
   * carries — tabs, properties, tags, colour, pictures, and the pages that were
   * saved inside it — replaces what's there.
   */
  applyCustomTemplate: (nodeId: string, templateRootId: string) => Promise<void>;
  // Rewrites one sibling group's manual order. `parentId` is null for the
  // project root, matching rootOrder/childOrder.
  sortChildren: (parentId: string | null, sort: SiblingSort) => void;
  // Colour has its own action rather than going through updateNode, so it can
  // be recorded as one undoable step across a whole multi-selection.
  setNodeColor: (ids: string[], color: string | undefined) => void;
  setNodeHidden: (ids: string[], hidden: boolean) => void;
  selectNode: (id: string | null, tabId?: string) => void;
  // Moving over the session's navigation history rather than adding to it.
  // Both are no-ops at the ends of the stack, so the buttons can stay mounted
  // and just go quiet.
  goBack: () => void;
  goForward: () => void;
  // The page designated as this project's home, if there is one. An ordinary
  // navigation — it records, so Back comes straight back out of it.
  goHome: () => void;
  // Cmd+S. Runs every outstanding debounced write now, then shows "Saved" —
  // including when there was nothing pending, because "Saved" is a statement
  // about the state of the disk, not about a write having just happened. The
  // one case it stays quiet is a flush that failed; SaveWarning has that.
  saveNow: () => Promise<void>;
  setProjectHome: (id: string | null) => void;
  togglePinned: (id: string) => void;
  /**
   * Puts the tree's arrangement back to an earlier copy of `project.json`
   * (Phase 19) — the order, the home page, the pins, the expanded folders.
   *
   * Takes a patch rather than a whole project because deciding *what* of a copy
   * may come back, and checking its ids against the pages that exist now, is
   * `restoreProjectPatch`'s job and is testable without a disk.
   */
  restoreProjectArrangement: (patch: Partial<Project>) => void;
  setExpanded: (id: string, isOpen: boolean) => void;
};

// Debounce key for project.json metadata writes (selection, expanded state)
// that aren't node edits but shouldn't hammer disk on every click either.
const PROJECT_META_SAVE_KEY = "__project_meta__";

export const useProjectStore = create<ProjectStoreState>((set, get) => {
  const markSaved = () => set({ lastSavedAt: Date.now() });

  // Records a write that didn't happen so the shell can say so. Deduped:
  // a debounced save retries on every subsequent keystroke, and a page nested
  // too deep fails identically every time — one banner, not eighty. Capped
  // for the same reason, since a whole failing project would otherwise fill
  // the list with the same handful of causes.
  const recordSaveError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const { saveErrors } = get();
    if (saveErrors.includes(message) || saveErrors.length >= 10) return;
    set({ saveErrors: [...saveErrors, message] });
  };

  setSaveErrorHandler((_key, error) => recordSaveError(error));

  // Every direct disk write in this store goes through here. These calls are
  // deliberately not awaited — the UI updates from memory and shouldn't block
  // on the filesystem — but `void promise.then(markSaved)` leaves a rejection
  // with nowhere to go, so a failed write became an unhandled promise
  // rejection in a console nobody was reading while the app went on showing
  // "Saved". That is exactly the failure `setSaveErrorHandler` was built to
  // prevent, and it was only ever wired to autosave's debounced writes; every
  // other path — adding a page, moving one, deleting one — was silent.
  //
  // This has already cost the user real pages (2026-07-31: a half-completed
  // move left files stranded under temp names and said nothing). Don't
  // reintroduce a bare `void fsService.…` here.
  //
  // Takes a function rather than a promise, and that distinction is the whole
  // point: a promise passed in here has already started, and two of these
  // overlapping is what desynced the graph from the disk on 2026-08-11. Every
  // one of them is queued in call order instead — see services/write-queue.ts
  // for why ordering matters even though none of this is awaited.
  const track = (work: () => Promise<unknown>): void => {
    void enqueueWrite(work).then(markSaved).catch(recordSaveError);
  };

  // Set and written together, always. The library is one file, so there's no
  // partial write to get right — but there are three call sites plus their
  // undos, and each one forgetting the save independently is how the tree and
  // the disk drift apart.
  const applyTemplates = (templates: TemplateLibrary): void => {
    const { rootPath } = get();
    set({ templates });
    if (rootPath) track(() => fsService.saveTemplateLibrary(rootPath, templates));
  };

  // Set and written together, always — the same pairing as `applyTemplates`
  // above and for the same reason: one file, several call sites, and each one
  // forgetting the save independently is how the tab and the disk drift apart.
  const applyAssetFolders = (assetFolders: AssetFolders): void => {
    const { rootPath } = get();
    set({ assetFolders });
    if (rootPath) track(() => fsService.saveAssetFolders(rootPath, assetFolders));
  };

  // Same pairing again, for the other half of what the library knows about a
  // picture that isn't in the picture.
  const applyAssetNames = (assetNames: AssetNames): void => {
    const { rootPath } = get();
    set({ assetNames });
    if (rootPath) track(() => fsService.saveAssetNames(rootPath, assetNames));
  };

  /**
   * Let go of an asset file: delete it, but only if nothing points at it any
   * more.
   *
   * **Call this after the state change that dropped the reference, never
   * before** — it asks the store what the world looks like now, and asking too
   * early sees the reference that's on its way out and keeps the file forever.
   *
   * Every asset delete that isn't the Assets tab's own goes through here, and
   * the check is the whole reason it exists. Before the picture library, a file
   * had exactly one owner and replacing a portrait could delete the old bytes
   * outright. Now that the same picture can sit in a portrait, a cover, six
   * pages and a template at once, an unconditional delete is a way to empty
   * five of them — see services/asset-usage.ts's isAssetInUse.
   */
  const releaseAsset = (rootPath: string, fileName: string | undefined): void => {
    if (!fileName) return;
    const { nodes, templates } = get();
    if (isAssetInUse(nodes, templates, fileName)) return;
    track(() => fsService.deleteAssetImage(rootPath, fileName));
  };

  /**
   * A private copy of an image, under a fresh name. Returns the name to point
   * at, or undefined when there was nothing to copy.
   *
   * A copy that can't be read gives back `undefined` rather than throwing: the
   * page or template still arrives, minus a picture that was already missing.
   * Failing the whole operation over it would be the app refusing to work
   * because of damage it can't fix either way.
   */
  const copyAssetFile = async (rootPath: string, fileName: string | undefined): Promise<string | undefined> => {
    if (!fileName) return undefined;
    const extension = fileName.slice(fileName.lastIndexOf(".") + 1);
    const copyName = `${crypto.randomUUID()}.${extension}`;
    try {
      await fsService.saveAssetImage(rootPath, copyName, await fsService.readAssetImage(rootPath, fileName));
    } catch {
      return undefined;
    }
    return copyName;
  };

  const captureOrdering = (project: Project): OrderingSnapshot => ({
    rootOrder: project.rootOrder,
    childOrder: project.childOrder,
    homeNodeId: project.homeNodeId,
  });

  // Hands an undoable operation to the history stack. A no-op while an undo or
  // redo is running, so reversing something doesn't get recorded as a new
  // thing to reverse — history-store owns that guard.
  const record = (
    label: string,
    undo: () => Promise<void> | void,
    redo: () => Promise<void> | void,
    mergeKey?: string,
  ): void => {
    useHistoryStore.getState().record({ label, undo, redo, mergeKey });
  };

  /**
   * Applies one patch to one page and records it as a single undo entry.
   *
   * The single-page twin of `applyBulk`, and the whole of Phase 19's panel
   * undo: everything the right-hand panel changes is a patch to the page it is
   * showing, so recording it is a matter of reading the fields the patch is
   * about to overwrite before it lands. Every key in the patch is captured,
   * including the ones the page does not have yet — `undefined` restores a
   * field to absent, which is what putting a page back means when the edit
   * being undone is the one that created it.
   *
   * `mergeKey` names one field on one page. Pass it for anything that writes
   * while the user is still moving — a text field, a dragged meter — so a run
   * of writes reverses as the one edit it looked like; see mergeRepeat. Leave
   * it off for anything that happens once per click.
   */
  const patchNode = (
    label: string,
    nodeId: string,
    patch: Partial<Omit<Node, "id">>,
    mergeKey?: string,
  ): void => {
    const node = get().nodes[nodeId];
    if (!node) return;

    const before: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) before[key] = node[key as keyof Node];
    const after = { ...patch };

    get().updateNode(nodeId, patch);
    record(
      label,
      () => get().updateNode(nodeId, before as Partial<Omit<Node, "id">>),
      () => get().updateNode(nodeId, after),
      mergeKey,
    );
  };

  /**
   * Applies one edit to a page's block list, materialising the list first if
   * the page has never had one.
   *
   * That materialisation is Phase 18a's whole migration. A page written before
   * blocks existed has no `blocks` field and renders from a list derived on
   * read (see block-service), so the panel looks the way it always did without
   * anything being written. The moment the user actually changes something,
   * the derived list becomes real and the change lands on top of it — so a
   * world she only opened is never rewritten, and one she edits is converted a
   * page at a time by the act of editing it.
   *
   * Every block action goes through here rather than calling `updateNode`
   * directly, because getting that order wrong — patching `blocks` on a node
   * that has none — would write a one-block sidebar and drop every field the
   * page was showing.
   */
  const editBlocks = (
    nodeId: string,
    edit: (blocks: Block[]) => Block[],
    label: string,
    mergeKey?: string,
  ): void => {
    const node = get().nodes[nodeId];
    if (!node) return;
    const current = blocksFor(node, getPropertySchema(node.templateKey));
    const next = edit(current);
    if (next === current) return;
    // Recorded against the node's *stored* blocks rather than the derived list
    // above, so undoing the first edit to a page written before Phase 18a
    // un-materialises it — the page goes back to having no block list at all,
    // which is what it had. patchNode reads that field for itself.
    patchNode(label, nodeId, { blocks: next }, mergeKey);
  };

  /**
   * A page's blocks as they stand, derived if the page has never had a list.
   *
   * The read half of `editBlocks`, pulled out for the image-block writes below:
   * they have to know which block draws the page's picture *before* deciding
   * where the write goes, and that question is asked of the resolved list.
   */
  const currentBlocks = (node: Node): Block[] => blocksFor(node, getPropertySchema(node.templateKey));

  /** The picture one image block is showing, wherever that picture is kept. */
  const pictureOf = (node: Node, blockId: string): BlockPicture => {
    const blocks = currentBlocks(node);
    const block = blocks.find((candidate) => candidate.id === blockId);
    return block ? blockImage(node, blocks, block) : {};
  };

  /**
   * One image block's picture, changed (Phase 19.5).
   *
   * **Where it lands is not this function's decision and not the caller's** —
   * `blockImage`'s rule decides: the page's own picture is on the node, every
   * other image block's is on its own record. One place either way, so nothing
   * has to be kept in step with anything.
   *
   * `imageSource` goes with the picture whenever the picture itself changes:
   * it is the web address an LK-imported photo came from, and leaving the old
   * one behind makes an export hand out the previous picture's address for this
   * one. Absent from the block records for the same reason it is meaningless
   * there — nothing but a page's own portrait is exported.
   */
  const patchBlockImage = (
    nodeId: string,
    blockId: string,
    picture: BlockPicture,
    label: string,
    mergeKey?: string,
  ): void => {
    const node = get().nodes[nodeId];
    if (!node) return;
    const blocks = currentBlocks(node);
    if (pageImageBlockId(node, blocks) === blockId) {
      patchNode(label, nodeId, "image" in picture ? { ...picture, imageSource: undefined } : picture, mergeKey);
      return;
    }
    if (!blocks.some((block) => block.id === blockId && block.kind === "image")) return;
    editBlocks(
      nodeId,
      (list) => list.map((block) => (block.id === blockId ? withBlockImage(block, picture) : block)),
      label,
      mergeKey,
    );
  };

  /**
   * Applies one patch per page and records the lot as a single undo entry.
   *
   * Used by the project-wide property and tag edits, which are the only things
   * in this app that change dozens of pages from one click — and so the only
   * ones where a per-page loop would leave the user pressing undo forty times
   * to get back. The reverse is built by reading the fields the patch is about
   * to overwrite, rather than snapshotting whole nodes: these run over the
   * entire project, and a page's tabs are the largest thing on it.
   */
  const applyBulk = (label: string, patches: { nodeId: string; patch: Partial<Omit<Node, "id">> }[]): void => {
    const { nodes } = get();
    const present = patches.filter(({ nodeId }) => nodes[nodeId]);
    if (present.length === 0) return;

    const before = present.map(({ nodeId, patch }) => {
      const node = nodes[nodeId];
      const previous: Partial<Omit<Node, "id">> = {};
      if ("customProperties" in patch) previous.customProperties = node.customProperties;
      if ("properties" in patch) previous.properties = node.properties;
      if ("propertyOrder" in patch) previous.propertyOrder = node.propertyOrder;
      if ("tags" in patch) previous.tags = node.tags;
      return { nodeId, patch: previous };
    });

    const run = (list: typeof present) => {
      for (const { nodeId, patch } of list) get().updateNode(nodeId, patch);
    };

    run(present);
    record(
      `${label} on ${countLabel(present.length, "page")}`,
      () => run(before),
      () => run(present),
    );
  };

  /**
   * Puts pages back: their files, their pictures, and the sibling order they
   * sat in. Also the primitive behind redoing anything that created pages.
   *
   * Disk first, memory second — the opposite of every other action in this
   * store, which updates memory immediately and lets the write catch up. That
   * asymmetry is deliberate. An optimistic undo that then fails to write
   * leaves the tree showing pages that aren't on disk, which is precisely the
   * shape of the bug that cost real pages on 2026-07-31. Throwing instead
   * lets history-store keep the entry and say it couldn't undo, so the next
   * press retries the whole thing.
   */
/**
 * The skipped files that have not already been acknowledged.
 *
 * **Fails towards showing them.** Every path out of here that cannot answer
 * properly returns the whole list: a warning about unreadable pages is not
 * something to swallow because a settings read went wrong.
 */
async function stillWorthShowing(skipped: string[]): Promise<string[]> {
  if (skipped.length === 0) return skipped;
  try {
    const [marks, stored] = await Promise.all([fsService.fileMarks(skipped), getAcknowledgedWarnings()]);
    return unacknowledged(skipped, marks, parseAcknowledgements(stored));
  } catch {
    return skipped;
  }
}

  const restoreNodes = async (restored: Node[], assets: CapturedAsset[], ordering: OrderingSnapshot): Promise<void> => {
    const { rootPath, project } = get();
    if (!rootPath || !project) return;

    // Pictures before the pages that point at them, so there is never a
    // moment where a restored page references a file that isn't there yet.
    for (const asset of assets) await fsService.saveAssetImage(rootPath, asset.fileName, asset.bytes);

    const previousNodes = Object.values(get().nodes);
    const nextNodes = { ...get().nodes };
    for (const node of restored) nextNodes[node.id] = node;
    const nextProject: Project = { ...project, ...ordering };

    // Through addNodes, not saveNodes: undoing a delete can put the last child
    // back into a page that had converted to a flat file when it left, and
    // that page's own file has to move back before its child is written.
    // Queued like every other write, even though this one is awaited: awaiting
    // orders it against *this* function's own steps, not against a page save
    // the user set off a moment before pressing undo.
    if (restored.length > 0) {
      await enqueueWrite(() => fsService.addNodes(rootPath, restored, previousNodes, Object.values(nextNodes)));
    }
    await enqueueWrite(() => fsService.saveProject(rootPath, nextProject));

    set({ nodes: nextNodes, project: nextProject });
    markSaved();
  };

  // Sibling order and nothing else — the tail end of undoing a move, where the
  // pages are already back under the right parents but not in the right places.
  const restoreOrdering = (ordering: OrderingSnapshot): Promise<void> => restoreNodes([], [], ordering);

  /**
   * Move to a page, with the navigation history it leaves behind.
   *
   * Split out from `selectNode` because back and forward have to change the
   * selection *without* recording a new visit — they hand in a history whose
   * cursor has already moved. Every other caller hands in `visit(...)`, which
   * is what makes `selectNode` the single choke point: a navigation added in a
   * year's time gets its history entry by using the action everything else
   * already uses, not by remembering this exists.
   *
   * `tabId` is for callers that know which tab they mean — a search result
   * naming the tab its match was found in. Everything else omits it, and
   * clearing it here is what stops one jump's tab leaking into the next.
   * Expanding the target's ancestors is deliberately *not* done here: TreePanel
   * already does it for every selection however it was made.
   */
  const applySelection = (id: string | null, tabId: string | undefined, navHistory: NavHistory): void => {
    const { rootPath, project, nodes, focusedId, pendingRenameId } = get();
    if (!rootPath || !project) return;
    const nextProject: Project = { ...project, selectedId: id, selectedName: id ? (nodes[id]?.name ?? null) : null };
    // Landing outside the focused branch drops the focus. The tree physically
    // can't show a page that isn't under the focused node, so the alternative
    // is the sidebar quietly not following you — which is how a search result
    // or a wikilink would leave you on a page with no row anywhere. Selecting
    // the focused node itself counts as outside: it isn't in its own subtree.
    const leavesFocus = Boolean(focusedId) && (!id || !isDescendantOf(id, focusedId!, nodes));
    set({
      project: nextProject,
      // Going to a page closes an open template. The centre panel shows one
      // thing at a time, and every route into here is a deliberate move to a
      // page — a tree row, a mention, a search result, back/forward/home.
      // Without this the move half-lands: the selection changes, the sidebar
      // follows it, the properties panel redraws for the new page, and the
      // centre keeps editing the template, which reads as the click doing
      // nothing at all.
      openTemplateId: null,
      pendingFocus: id && tabId ? { nodeId: id, tabId } : null,
      // Survives only the one selection that opens the page it names — which
      // is the selection the create hook makes a line after asking. Every
      // other navigation clears it, so coming back to a page you never got
      // round to naming opens it like any other page.
      pendingRenameId: pendingRenameId === id ? id : null,
      navHistory,
      ...(leavesFocus ? { focusedId: null } : {}),
    });
    scheduleSave(PROJECT_META_SAVE_KEY, () => fsService.saveProject(rootPath, nextProject).then(markSaved));
  };

  // The write half of setProjectHome, split out so undo and redo can set an
  // exact value instead of going back through the action's toggle.
  const applyHome = (homeNodeId: string | null): void => {
    const { rootPath, project } = get();
    if (!rootPath || !project) return;
    const nextProject: Project = { ...project, homeNodeId };
    set({ project: nextProject });
    track(() => fsService.saveProject(rootPath, nextProject));
  };

  // The same split again, for a patch of any shape — the restore below is the
  // only thing that changes several of these fields at once.
  const applyProjectPatch = (patch: Partial<Project>): void => {
    const { rootPath, project } = get();
    if (!rootPath || !project) return;
    const nextProject: Project = { ...project, ...patch };
    set({ project: nextProject });
    track(() => fsService.saveProject(rootPath, nextProject));
  };

  // Same split, same reason: undo sets the exact list it saw rather than
  // toggling back, which would be wrong if anything else changed the pins in
  // between.
  const applyPins = (pinnedIds: string[]): void => {
    const { rootPath, project } = get();
    if (!rootPath || !project) return;
    const nextProject: Project = { ...project, pinnedIds };
    set({ project: nextProject });
    track(() => fsService.saveProject(rootPath, nextProject));
  };

  return {
    rootPath: null,
    project: null,
    nodes: {},
    contentRevisions: {},
    templates: createTemplateLibrary(),
    openTemplateId: null,
    isLoaded: false,
    lastSavedAt: null,
    assetFolders: createAssetFolders(),
    assetNames: createAssetNames(),
    removedAssets: createRemovedAssets(),
    assetSources: createAssetSources(),
    skippedFiles: [],
    loadWasIncomplete: false,
    saveErrors: [],
    recoveredCount: 0,
    reunitedNames: [],
    supersededNames: [],
    pendingFocus: null,
    pendingRenameId: null,
    focusedId: null,
    navHistory: EMPTY_NAV_HISTORY,

    // Resolves null for anything that means "this isn't an openable project"
    // — missing or unreadable project.json, an unreadable folder — so callers
    // have exactly one failure case to handle instead of a mix of nulls and
    // thrown errors. Individually damaged node files don't fail the load; they
    // come back in `skippedFiles` for the UI to report.
    async loadProject(rootPath) {
      let result: Awaited<ReturnType<typeof fsService.loadProject>>;
      try {
        result = await fsService.loadProject(rootPath);
      } catch {
        return null;
      }
      if (!result) return null;

      // Any entry still on the stack closes over the project being replaced,
      // and running one would write pages from the old world into the new one.
      useHistoryStore.getState().clear();

      // The picture cache is keyed by project root, so nothing from the old
      // world can be *shown* by the new one — but the blobs would sit in
      // memory for the rest of the session with nothing able to display them.
      releaseAssetUrls();

      // Read after the pages rather than alongside them: a project with no
      // template file is the normal case, and a template file that won't parse
      // reads as an empty library (see fsService.loadTemplateLibrary). Neither
      // is allowed to be the reason a world doesn't open.
      const templates = parseTemplateLibrary(await fsService.loadTemplateLibrary(rootPath));
      // Same forgiveness, same reason. A world with no folders yet is the
      // normal case and reads identically to one whose folder file is damaged:
      // every picture shows up under All pictures either way.
      const assetFolders = parseAssetFolders(await fsService.loadAssetFolders(rootPath));
      // And again for the names. A world made before pictures had names has no
      // file here at all, which reads as "nothing is named yet" — the state
      // every picture starts in regardless.
      const assetNames = parseAssetNames(await fsService.loadAssetNames(rootPath));
      // Before the state is set rather than after, so a file that was waved
      // through as known-broken never flashes on screen on the way to being
      // filtered out. Costs two reads on a world that has skipped files, and
      // nothing at all on one that hasn't.
      const visibleSkipped = await stillWorthShowing(result.skipped);
      // And the fourth: pictures she took out of the library that a page still
      // needs. Absent for almost every project, which reads as "nothing is
      // hidden" — the state everything starts in.
      const removedAssets = parseRemovedAssets(await fsService.loadRemovedAssets(rootPath));
      // And the third: where the pictures came from. Absent for every project
      // that has never imported from LegendKeeper, which is most of them.
      const assetSources = parseAssetSources(await fsService.loadAssetSources(rootPath));

      const nodes = Object.fromEntries(result.nodes.map((n) => [n.id, n]));
      set({
        rootPath,
        project: result.project,
        nodes,
        templates,
        assetFolders,
        assetNames,
        removedAssets,
        assetSources,
        // Opening a world never opens a template — see the field's own note.
        openTemplateId: null,
        isLoaded: true,
        skippedFiles: visibleSkipped,
        loadWasIncomplete: result.skipped.length > 0,
        recoveredCount: result.recoveredCount,
        reunitedNames: result.reunited,
        supersededNames: result.supersededNames,
        // Seeded with wherever the project was left, not left empty — so the
        // first page opened this session has somewhere to go Back *to*, which
        // is the page that's on screen when the window appears.
        navHistory: visit(EMPTY_NAV_HISTORY, result.project.selectedId ?? null),
      });
      return { name: result.project.name };
    },

    // Not undoable and not recorded in navigation history: this changes what
    // the sidebar is showing, not what the project contains or which page is
    // open. Undo is for edits, and Back is for pages.
    setFocus(id) {
      set({ focusedId: id });
    },

    requestRename(id) {
      set({ pendingRenameId: id });
    },

    dismissSkippedFiles() {
      set({ skippedFiles: [] });
    },

    async acknowledgeSkippedFiles() {
      const { skippedFiles } = get();
      if (skippedFiles.length === 0) return;
      // Cleared first: the acknowledgement is a settings write that can fail on
      // a read-only disk, and leaving the notice up because the bookkeeping
      // failed would be answering "I know" with "no you don't".
      set({ skippedFiles: [] });
      try {
        const [marks, stored] = await Promise.all([fsService.fileMarks(skippedFiles), getAcknowledgedWarnings()]);
        await setAcknowledgedWarnings(acknowledge(parseAcknowledgements(stored), skippedFiles, marks));
      } catch {
        // The notice is gone for this session either way; next launch asks
        // again, which is the right way round for a failure nobody saw.
      }
    },

    // One dismissal for both, because they're one notice on screen.
    dismissRecovered() {
      set({ recoveredCount: 0, reunitedNames: [], supersededNames: [] });
    },

    dismissSaveErrors() {
      set({ saveErrors: [] });
    },

    async initializeProject(rootPath, name) {
      useHistoryStore.getState().clear();
      const project = createProject({ name });
      await fsService.saveProject(rootPath, project);
      set({
        rootPath,
        project,
        nodes: {},
        contentRevisions: {},
        templates: createTemplateLibrary(),
        openTemplateId: null,
        isLoaded: true,
        // A brand new folder has nothing in it to have failed to read, and
        // whatever the last project reported has nothing to do with this one.
        assetFolders: createAssetFolders(),
        assetNames: createAssetNames(),
        removedAssets: createRemovedAssets(),
        assetSources: createAssetSources(),
        skippedFiles: [],
        loadWasIncomplete: false,
        navHistory: EMPTY_NAV_HISTORY,
      });
      markSaved();
    },

    async createProjectAt(parentDir, name) {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: "Give your project a name." };

      // The app's own folder names, refused wherever the project is being
      // made. A project called "Projects" sitting where the container does
      // would be found by the scan and never walked into, so every project
      // inside it would vanish from the list; "themes" and "snippets" are the
      // same failure one folder up. One rule is easier to explain than a rule
      // about where this particular project happens to be going.
      if (isReservedWorldName(trimmed)) {
        return { ok: false, error: "That name belongs to one of the app's own folders. Try another." };
      }

      const folderName = fsService.sanitizeSegment(trimmed);
      const rootPath = await joinPath(parentDir, folderName);
      if (await fsService.pathExists(rootPath)) {
        return { ok: false, error: "A folder with that name already exists there." };
      }

      await get().initializeProject(rootPath, trimmed);
      for (const folder of STARTER_FOLDERS) {
        get().addNode({ parentId: null, templateKey: FOLDER_TEMPLATE_KEY, name: folder });
      }
      // The starter folders are part of making the project, not six things the
      // user did — leaving them on the stack means the first Ctrl+Z in a brand
      // new world deletes "Worldbuilding".
      useHistoryStore.getState().clear();
      return { ok: true, rootPath };
    },

    // Phase 27's third way in. Sits between the two either side of it: more
    // than `createProjectAt`'s six stub folders, and without any of the
    // fetching and picture-shuffling `importLkProject` exists to do — a
    // template file has no pictures in it and nothing to download, by design
    // (see constants/project-template.ts).
    //
    // The nodes are built before anything touches disk, so a template that
    // turns out to describe nothing fails with the folder unmade rather than
    // leaving an empty project behind.
    async createProjectFromTemplate(parentDir, name, template) {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: "Give your project a name." };

      // The same refusal the other two make. A project is a project however it
      // got made, and the app's own folder names are off limits in all three.
      if (isReservedWorldName(trimmed)) {
        return { ok: false, error: "That name belongs to one of the app's own folders. Try another." };
      }

      const { nodes, rootOrder } = materializeProjectTemplate(template);
      if (nodes.length === 0) {
        return { ok: false, error: "That template is empty — there are no folders or pages in it to make." };
      }

      const folderName = fsService.sanitizeSegment(trimmed);
      const rootPath = await joinPath(parentDir, folderName);
      if (await fsService.pathExists(rootPath)) {
        return { ok: false, error: "A folder with that name already exists there." };
      }

      // Cleared before the state swap rather than after, for the reason
      // `createProjectAt` spells out: the template's folders are part of making
      // the project, not a stack of things she did, and the first Ctrl+Z in a
      // brand new project must not start undoing them.
      useHistoryStore.getState().clear();
      const project = createProject({ name: trimmed, rootOrder });
      const nodesRecord = Object.fromEntries(nodes.map((node) => [node.id, node]));
      set({ rootPath, project, nodes: nodesRecord, contentRevisions: {}, isLoaded: true, navHistory: EMPTY_NAV_HISTORY });

      await fsService.saveProject(rootPath, project);
      // One shared path index for the whole write, the way the LK import does
      // it — a template is a couple of dozen nodes, but they all land at once.
      await fsService.saveNodes(rootPath, nodes, nodes);
      markSaved();

      return { ok: true, rootPath };
    },

    // The Phase 8 LK-import path: unlike createProjectAt (a handful of stub
    // folders), this writes a whole already-built node graph converted by
    // src/services/lk-import.ts. Images live on LegendKeeper's own CDN, so
    // each pending one is fetched here (the single network call this app
    // ever makes, and only for this explicit, user-confirmed action — see
    // docs/handoff.md) before anything hits disk. A failed download just
    // leaves that one page without a picture rather than failing the import.
    async importLkProject(parentDir, name, plan, onProgress) {
      const { nodes, rootOrder, pendingImages, homeNodeId } = plan;
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: "Give your project a name." };

      // Same refusal as createProjectAt above — an import is a project being
      // made, and lands in the same folder.
      if (isReservedWorldName(trimmed)) {
        return { ok: false, error: "That name belongs to one of the app's own folders. Try another." };
      }

      const folderName = fsService.sanitizeSegment(trimmed);
      const rootPath = await joinPath(parentDir, folderName);
      if (await fsService.pathExists(rootPath)) {
        return { ok: false, error: "A folder with that name already exists there." };
      }

      // Pictures come down from LK's servers one HTTP request each, and a real
      // world has dozens — this is where essentially all of an import's time
      // goes. Fetched a few at a time rather than strictly one after another,
      // and reported as they land, because the alternative is a minute of a
      // window that looks frozen.
      let fetched = 0;
      onProgress?.({ phase: "images", done: 0, total: pendingImages.length });

      // Where every downloaded picture came from, so an export back to LK can
      // send it home — a `.lk` holds addresses, not files. Built here rather
      // than through the store's setter because the workers run concurrently
      // and the project isn't loaded yet; it's written once, below.
      let assetSources = createAssetSources();

      async function fetchOne(pending: ImportPendingImage): Promise<void> {
        try {
          const bytes = await lkImportService.fetchLkImage(pending.url);
          const fileName = `${crypto.randomUUID()}.${lkImportService.extensionFromUrl(pending.url)}`;
          await fsService.saveAssetImage(rootPath, fileName, bytes);
          assetSources = recordAssetSource(assetSources, fileName, pending.url);
          const node = nodes.find((n) => n.id === pending.nodeId);
          if (!node) return;
          // A portrait and a banner are fields on the node; a picture in the
          // writing is a block inside a tab, found by the id the plan gave it.
          if (pending.field === "body") lkImportService.applyBodyImage(node, pending.blockId, fileName);
          else node[pending.field] = fileName;
        } catch {
          // Ignore — see comment above.
        } finally {
          fetched += 1;
          onProgress?.({ phase: "images", done: fetched, total: pendingImages.length });
        }
      }

      // Fixed-size pool: each worker takes the next index until they run out.
      // Kept modest deliberately — this is someone else's server.
      const queue = [...pendingImages];
      const workers = Array.from({ length: Math.min(IMPORT_IMAGE_CONCURRENCY, queue.length) }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          await fetchOne(next);
        }
      });
      await Promise.all(workers);

      onProgress?.({ phase: "writing", done: 0, total: nodes.length });
      useHistoryStore.getState().clear();
      const project = { ...createProject({ name: trimmed, rootOrder }), homeNodeId };
      const nodesRecord = Object.fromEntries(nodes.map((n) => [n.id, n]));
      set({
        rootPath,
        project,
        nodes: nodesRecord,
        contentRevisions: {},
        isLoaded: true,
        assetSources,
        navHistory: EMPTY_NAV_HISTORY,
      });

      await fsService.saveProject(rootPath, project);
      // One shared path index for the whole import rather than one per node —
      // an LK world is the largest single write this app ever does.
      await fsService.saveNodes(rootPath, nodes, nodes);
      // Written only when something was actually downloaded, so an import of a
      // world with no pictures doesn't leave an empty file behind.
      if (Object.keys(assetSources).length > 0) await fsService.saveAssetSources(rootPath, assetSources);
      markSaved();

      return { ok: true, rootPath };
    },

    closeProject() {
      useHistoryStore.getState().clear();
      releaseAssetUrls();
      // Node ids are unique, so a stale entry could only ever cost one missed
      // safety copy rather than a wrong one — but the cache is per session and
      // a session can open several worlds, and there is no reason to carry a
      // closed world's answers into the next one.
      fsService.forgetSnapshotTimes();
      set({
        rootPath: null,
        project: null,
        nodes: {},
        contentRevisions: {},
        templates: createTemplateLibrary(),
        openTemplateId: null,
        isLoaded: false,
        lastSavedAt: null,
        assetFolders: createAssetFolders(),
        assetNames: createAssetNames(),
        removedAssets: createRemovedAssets(),
        assetSources: createAssetSources(),
        skippedFiles: [],
        loadWasIncomplete: false,
        saveErrors: [],
        recoveredCount: 0,
        reunitedNames: [],
        supersededNames: [],
        pendingFocus: null,
        pendingRenameId: null,
        focusedId: null,
        // Closing a project throws its history away with it — the ids in there
        // mean nothing in the next project, and carrying them over would let
        // Back navigate to a page in a world you've left.
        navHistory: EMPTY_NAV_HISTORY,
      });
    },

    addNode(input) {
      const { rootPath, project, nodes } = get();
      if (!rootPath || !project) throw new Error("addNode: no project loaded");

      const tabs = getDefaultTabs(input.templateKey);
      // A new page's sidebar is its template's — the picture, the fields that
      // template asks for, and tags — while a blank page starts with nothing
      // in it but Add block. Written at creation rather than derived on read,
      // because an authored empty list is exactly how a blank page says its
      // sidebar is meant to be empty. See block-service's seedBlocks.
      const blocks = input.blocks ?? seedBlocks(input.templateKey, getPropertySchema(input.templateKey));
      const node = createNode({ ...input, tabs, blocks });
      const nextNodes = { ...nodes, [node.id]: node };
      const nextProject: Project =
        input.parentId === null ? { ...project, rootOrder: [...project.rootOrder, node.id] } : project;

      set({ nodes: nextNodes, project: nextProject });

      // The parent is written alongside the child, and any debounced write it
      // already had is dropped first. Both are about the same thing: gaining a
      // first child moves the parent's own file into a new directory (see
      // fsService.addNodes), and a pending save firing in the gap would
      // recreate it at the destination before the move got there — which fails
      // the move instead of racing it. Its content is already in `nextNodes`,
      // so cancelling loses nothing; this write is that write.
      const parent = input.parentId ? nextNodes[input.parentId] : undefined;
      if (parent) cancelSave(parent.id);
      track(
        () => fsService.addNodes(rootPath, parent ? [parent, node] : [node], Object.values(nodes), Object.values(nextNodes)),
      );
      if (nextProject !== project) track(() => fsService.saveProject(rootPath, nextProject));

      const orderingAfter = captureOrdering(nextProject);
      record(
        `adding "${node.name}"`,
        () => get().deleteNodes([node.id]),
        // The same node object, id included — creating a fresh one would leave
        // the undo half above pointing at a page that no longer exists.
        () => restoreNodes([node], [], orderingAfter),
      );
      return node;
    },

    bumpContentRevision(id) {
      const { contentRevisions } = get();
      set({ contentRevisions: { ...contentRevisions, [id]: (contentRevisions[id] ?? 0) + 1 } });
    },

    updateNode(id, patch, options) {
      const { rootPath, nodes } = get();
      const existing = nodes[id];
      if (!rootPath || !existing) return;

      const updated: Node = {
        ...existing,
        ...patch,
        updatedAt: options?.touch === false ? existing.updatedAt : Date.now(),
      };
      set({ nodes: { ...nodes, [id]: updated } });

      // Snapshot the graph when the debounce actually fires, not when it's
      // scheduled. Two reasons. This runs on every keystroke via
      // updateTabContent, so materializing the whole node array here would
      // allocate an n-element array per character typed. And a node's path
      // depends on its siblings, so a snapshot captured 300ms ago can resolve
      // against a graph that no longer exists — a sibling renamed inside the
      // debounce window shifts the collision suffixes, and the write lands at
      // a filename that's no longer the node's own.
      scheduleSave(id, () => {
        const { rootPath: currentRootPath, nodes: currentNodes } = get();
        const current = currentNodes[id];
        if (!currentRootPath || !current) return;
        return fsService.saveNode(currentRootPath, current, Object.values(currentNodes)).then(markSaved);
      });
    },

    // The six below are thin: the tab transforms themselves live in
    // services/tab-service.ts, because a template's tabs are edited by the same
    // six operations and a second copy against `templates.nodes` is the one
    // that drifts. What stays here is what a pure service can't do — reading
    // the record, writing it back, and the undo and disk write that follow.
    updateTabContent(nodeId, tabId, content) {
      const existing = get().nodes[nodeId];
      if (!existing) return;
      get().updateNode(nodeId, { tabs: withTabContent(existing.tabs, tabId, content) });
    },

    // The five below record; `updateTabContent` above deliberately does not.
    // What is inside a tab is writing, and writing has BlockNote's own undo on
    // Ctrl+Z (see docs/handoff.md §Ctrl+Z). What a tab *is* — that it exists,
    // what it is called, where it sits — is structure, and losing a tab to a
    // misclick was the one thing left in this file that a press could not take
    // back. Deleting one takes its contents with it, which is why this is here
    // rather than queued.
    toggleTabHidden(nodeId, tabId) {
      const existing = get().nodes[nodeId];
      if (!existing) return;
      patchNode("hiding a tab", nodeId, { tabs: withTabHiddenToggled(existing.tabs, tabId) });
    },

    addTab(nodeId, label) {
      const existing = get().nodes[nodeId];
      if (!existing) throw new Error("addTab: node not found");
      const { tabs, tab } = withTabAdded(existing.tabs, crypto.randomUUID(), label);
      patchNode(`adding the ${label} tab`, nodeId, { tabs });
      return tab;
    },

    renameTab(nodeId, tabId, label) {
      const existing = get().nodes[nodeId];
      if (!existing) return;
      // Typed into, so the whole rename folds into one entry — same reasoning
      // as a property field.
      patchNode(
        "renaming a tab",
        nodeId,
        { tabs: withTabRenamed(existing.tabs, tabId, label) },
        `tab-name:${nodeId}:${tabId}`,
      );
    },

    deleteTab(nodeId, tabId) {
      const existing = get().nodes[nodeId];
      if (!existing) return;
      const going = existing.tabs.find((tab) => tab.id === tabId);
      patchNode(`deleting the ${going?.label ?? "tab"} tab`, nodeId, {
        tabs: withTabDeleted(existing.tabs, tabId),
      });
    },

    reorderTabs(nodeId, orderedTabIds) {
      const existing = get().nodes[nodeId];
      if (!existing) return;
      // Null means the order didn't describe these exact tabs. Writing it would
      // drop one and everything in it, so the drag is abandoned instead.
      const tabs = withTabsReordered(existing.tabs, orderedTabIds);
      if (tabs) patchNode("moving a tab", nodeId, { tabs });
    },

    // Sets a page's template and adds that template's default tabs — but
    // only the ones this page doesn't already have (by id), so applying a
    // template to a blank page that's already been written in never
    // clobbers the user's own tabs/content. This is how every page gets its
    // kind: new pages are created blank and choose one from the page itself
    // (see components/page/NewPageLanding.tsx), and a blank page that's
    // already been written in can still pick one later from the properties
    // panel.
    async applyTemplate(nodeId, templateKey) {
      const { rootPath, nodes } = get();
      if (!rootPath || !nodes[nodeId]) return;

      // Flushed for the same reason renameNode flushes: the write below can
      // move this node's file, and a debounced content save still holding the
      // pre-move path would either miss it or write a second copy back at the
      // old one.
      await flushSave(nodeId);

      const { rootPath: rootPathAfter, nodes: nodesAfter } = get();
      const existing = nodesAfter[nodeId];
      if (!rootPathAfter || !existing) return;

      const allNodesBefore = Object.values(nodesAfter);
      const existingTabIds = new Set(existing.tabs.map((tab) => tab.id));
      // This world's own version of the template if it has one, the shipped one
      // otherwise. Deep-copied either way — an override's tabs are live objects
      // in the library, and handing them straight to a page would have the page
      // and the template editing one array between them.
      const override = overrideFor(get().templates, templateKey);
      const seedTabs = override ? (structuredClone(override.tabs) as Tab[]) : getDefaultTabs(templateKey);
      const newTabs = seedTabs.filter((tab) => !existingTabIds.has(tab.id));
      // Applying a template to a page that has never had one brings that
      // template's sidebar with it — otherwise the blank page's empty panel
      // stays empty and choosing a template appears to do nothing below the
      // fold. A page that already has blocks keeps them: the user arranged
      // that panel, and a template change is not permission to rearrange it.
      const hadBlocks = Boolean(existing.blocks && existing.blocks.length > 0);
      // The new template's fields are not the old one's, so a field the page
      // was carrying can be left with no home. `planTemplateSwap` turns those
      // into custom properties rather than letting the value go quiet — see
      // its own note, and `docs/handoff.md` §Template swaps.
      const swap = planTemplateSwap(
        existing,
        getPropertySchema(existing.templateKey),
        getPropertySchema(templateKey),
      );
      const updated: Node = {
        ...existing,
        templateKey,
        tabs: [...existing.tabs, ...newTabs],
        blocks: hadBlocks ? swap.blocks : seedBlocks(templateKey, getPropertySchema(templateKey)),
        properties: swap.properties,
        customProperties: swap.customProperties,
        updatedAt: Date.now(),
      };
      const nextNodes = { ...nodesAfter, [nodeId]: updated };
      set({ nodes: nextNodes });

      // Not a plain save: a template carries whether the node stores itself as
      // a flat file or as its own directory, so changing one can move the
      // node's file without its name or parent changing at all. Only the
      // relocation planner sees that; `updateNode` would write at the new path
      // and leave the old file behind. When the shape doesn't change there's
      // nothing to move and this is just the save. See
      // filesystem-service's relocateNode.
      track(() => fsService.relocateNode(rootPathAfter, allNodesBefore, Object.values(nextNodes), nodeId));
    },

    // Typing into a field writes on every keystroke, so this is one of the two
    // actions in the store that hand `patchNode` a merge key — a sentence typed
    // into Age reverses as a sentence rather than as thirty presses.
    updateNodeProperty(nodeId, key, value) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;
      const label = propertyLabel(getPropertySchema(existing.templateKey), existing.customProperties, key);
      patchNode(
        `changing ${label}`,
        nodeId,
        { properties: { ...existing.properties, [key]: value } },
        `property:${nodeId}:${key}`,
      );
    },

    updateNodeTags(nodeId, tags) {
      patchNode("changing the tags", nodeId, { tags });
    },

    addCustomProperty(nodeId, label, type) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;

      // A chip property arrives with the vocabulary already in use for that
      // name on pages of the same kind — ids and colours copied, so it's
      // genuinely the same option rather than a lookalike. Without this,
      // adding Status to a second character means retyping your own four
      // states and getting different colours for them.
      //
      // Status is the one type with a fallback: an empty status is a control
      // with nothing in it, and the four defaults are what everyone types
      // anyway. Select and multi-select start empty on purpose when there's
      // nothing to copy — their values are the user's vocabulary, not ours.
      const known = isChipType(type) ? knownOptionsFor(nodes, existing.templateKey, label) : [];
      const options =
        known.length > 0 ? known : type === "status" ? DEFAULT_STATUS_OPTIONS.map((option) => ({ ...option })) : [];

      const spec: CustomPropertySpec = {
        key: crypto.randomUUID(),
        label,
        type,
        ...(isChipType(type) ? { options } : {}),
      };
      // The property and the block that shows it are added together. Adding a
      // field that then doesn't appear in the panel would read as the button
      // being broken, and Phase 18a's panel renders nothing it has no block
      // for. Materialised the same way every block edit is — see editBlocks.
      const blocks = [
        ...blocksFor(existing, getPropertySchema(existing.templateKey)),
        newBlock("property", { propertyKey: spec.key }),
      ];
      patchNode(`adding ${label}`, nodeId, {
        customProperties: [...(existing.customProperties ?? []), spec],
        blocks,
      });
    },

    updateCustomProperty(nodeId, key, patch) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;
      const customProperties = (existing.customProperties ?? []).map((spec) =>
        spec.key === key ? { ...spec, ...patch } : spec,
      );
      // A field being renamed is typed into, the same as a value is, so the
      // whole rename is one entry — see the merge key on updateNodeProperty.
      patchNode(
        `editing ${propertyLabel(getPropertySchema(existing.templateKey), existing.customProperties, key)}`,
        nodeId,
        { customProperties },
        `property-spec:${nodeId}:${key}`,
      );
    },

    // Dropping an option has to drop the pages' use of it in the same step,
    // or the value left behind points at an option that no longer exists and
    // the chip silently renders as nothing. Options are defined per page (the
    // spec lives on the node), so the only page that can be holding this one
    // is this one.
    removePropertyOption(nodeId, key, optionId) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;
      const customProperties = (existing.customProperties ?? []).map((spec) =>
        spec.key === key ? { ...spec, options: (spec.options ?? []).filter((option) => option.id !== optionId) } : spec,
      );

      const properties = { ...existing.properties };
      const value = properties[key];
      if (Array.isArray(value)) {
        properties[key] = value.filter((id) => id !== optionId);
      } else if (value === optionId) {
        delete properties[key];
      }

      patchNode("removing an option", nodeId, { customProperties, properties });
    },

    deletePageProperty(nodeId, key) {
      const { nodes } = get();
      const existing = nodes[nodeId];
      if (!existing) return;
      // A no-op for a template's field, which has no spec on the node — the
      // value and the blocks below are the whole of it in that case.
      const customProperties = (existing.customProperties ?? []).filter((spec) => spec.key !== key);
      const properties = { ...existing.properties };
      delete properties[key];
      // Drop it from the manual order too, so a key that no longer exists
      // can't sit in the list influencing where its neighbours land.
      const propertyOrder = existing.propertyOrder?.filter((orderedKey) => orderedKey !== key);
      // Deleting the property takes its blocks with it — every one of them,
      // since a property can be shown twice. This is the opposite of
      // `removeBlock`, which hides a field and keeps the value; here the value
      // is going, so a block still pointing at it would render a field that no
      // longer exists.
      const blocks = blocksFor(existing, getPropertySchema(existing.templateKey)).filter(
        (block) => !(block.kind === "property" && block.propertyKey === key),
      );
      patchNode(
        `deleting ${propertyLabel(getPropertySchema(existing.templateKey), existing.customProperties, key)}`,
        nodeId,
        { customProperties, properties, propertyOrder, blocks },
      );
    },


    // ---- Phase 18a: the sidebar's blocks ----
    //
    // Every one of these goes through `editBlocks`, which is where the
    // migration actually happens: a page written before Phase 18a has no
    // block list, so the first edit to its panel materialises the derived one
    // and then applies the change to it. Reading a page never writes, and a
    // world she only opened is never rewritten.
    addBlock(nodeId, kind, extra) {
      // A meter block arrives with one reading in it. An empty one would draw
      // as a heading and nothing else, which reads as a block that failed to
      // add rather than as one waiting to be filled in.
      //
      // What is in that reading depends on the shape — a spectrum starts at
      // its midpoint rather than at zero, which is a real stored number and
      // not a rule about empty ones. See newMeterFor.
      const seeded =
        kind === "meter" ? { meters: [newMeterFor(extra?.meter ?? "bar")], ...extra } : extra;
      // Built before the edit rather than inside it, so its id can be returned.
      // `editBlocks` runs its mapper against whatever the page has now, and a
      // block made in there would have an id nobody outside could learn.
      const block = newBlock(kind, seeded);
      editBlocks(nodeId, (blocks) => [...blocks, block], `adding ${blockKindLabel(kind)}`);
      return block.id;
    },

    // Removing a block removes the block, and nothing else. A property block
    // leaves its value in `properties` and its spec in `customProperties`, so
    // hiding a field is not deleting what was typed into it and the block can
    // be added back from the same list it was hidden from. Deleting the
    // property itself is `deletePageProperty`, which is a different action
    // with a different name for a reason.
    // **Not `editBlocks`, because removing the block that draws the page's
    // picture moves the picture as well as the list** — see planBlockRemoval,
    // which decides both — and the two have to land in one patch or undo puts
    // the block back without its photo.
    removeBlock(nodeId, blockId) {
      const node = get().nodes[nodeId];
      if (!node) return;
      const patch = planBlockRemoval(node, currentBlocks(node), blockId);
      if (!patch.blocks) return;
      patchNode("removing a block", nodeId, patch);
    },

    reorderBlocks(nodeId, fromIndex, toIndex) {
      editBlocks(nodeId, (blocks) => moveBlock(blocks, fromIndex, toIndex), "moving a block");
    },

    duplicateBlock(nodeId, blockId) {
      const node = get().nodes[nodeId];
      if (!node) return;
      // The copy of an image block keeps the picture rather than coming out
      // empty, which for the page's own picture means reading it off the node.
      const picture = pictureOf(node, blockId);
      editBlocks(nodeId, (blocks) => duplicateBlockIn(blocks, blockId, picture), "duplicating a block");
    },

    // An empty title is not a title: it is stored as absent so the block falls
    // back to its natural label rather than rendering a blank strip where a
    // heading should be.
    setBlockTitle(nodeId, blockId, title) {
      const trimmed = title?.trim();
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? withField(block, "title", trimmed || undefined) : block)),
        "renaming a block",
        `block-title:${nodeId}:${blockId}`,
      );
    },

    // True is the default, so it is stored as absent — otherwise every block
    // ever shown carries a field saying it looks normal.
    setBlockTitleShown(nodeId, blockId, shown) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? withField(block, "showTitle", shown ? undefined : false) : block)),
        `${shown ? "showing" : "hiding"} a block's title`,
      );
    },

    setBlockColor(nodeId, blockId, color) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? withField(block, "color", color) : block)),
        "recolouring a block",
      );
    },

    // **One undo entry for one drag**, by way of the merge key: a resize writes
    // on every pointer move so the block redraws under the pointer, and without
    // this a single drag across the page would leave forty entries to undo.
    setBlockWidth(nodeId, blockId, width) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? withField(block, "width", width) : block)),
        "resizing a block",
        `block-width:${nodeId}:${blockId}`,
      );
    },

    setBlockText(nodeId, blockId, text) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? withField(block, "text", text || undefined) : block)),
        "editing a note",
        `block-text:${nodeId}:${blockId}`,
      );
    },

    setBlockLink(nodeId, blockId, targetId) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? withField(block, "targetId", targetId) : block)),
        "changing a link",
      );
    },

    // ---- Phase 18c: meters ----
    //
    // Changing the shape keeps the number, because a bar redrawn as a gauge is
    // the same fact drawn differently. It drops the *maximum* when the value
    // model changes, though: 0-100 and a count of pips are different
    // questions, and a bar reading against 200 carried into a rating would
    // hand her twenty stars to click.
    setBlockMeter(nodeId, blockId, style) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => {
          if (block.id !== blockId) return block;
          const next = withField(block, "meter", style);
          if (isPipMeter(style) === isPipMeter(meterStyleOf(block))) return next;
          // The maximum belongs to the model, and every reading in the block
          // is drawn in the same shape — so switching the shape resets all of
          // them, not just the one the click landed near.
          return withField(
            next,
            "meters",
            metersOf(block).map((entry) => {
              const cleared = { ...entry };
              delete cleared.max;
              return cleared;
            }),
          );
        }),
        "changing a meter's shape",
      );
    },

    // True is the default and is stored as absent, the way showTitle is.
    setBlockMeterText(nodeId, blockId, shown) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? withField(block, "showText", shown ? undefined : false) : block)),
        "changing what a meter shows",
      );
    },

    setBlockMeterMax(nodeId, blockId, shown) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? withField(block, "showMax", shown ? undefined : false) : block)),
        "changing what a meter shows",
      );
    },

    setBlockMeterFace(nodeId, blockId, face) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? withField(block, "face", face) : block)),
        "changing a meter's face",
      );
    },

    // Off is the default and is stored as absent, like every other block flag.
    setBlockMeterSegmented(nodeId, blockId, segmented) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? withField(block, "segmented", segmented || undefined) : block)),
        "changing a meter's shape",
      );
    },

    setBlockMeterPip(nodeId, blockId, pip) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? withField(block, "pip", pip) : block)),
        "changing a meter's pip",
        `meter-pip:${nodeId}:${blockId}`,
      );
    },

    addMeter(nodeId, blockId) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) =>
          block.id === blockId
            ? withField(block, "meters", [...metersOf(block), newMeterFor(meterStyleOf(block))])
            : block,
        ),
        "adding a reading",
      );
    },

    // A copy of one reading, directly under it, keeping its icon, name and
    // numbers — four stats that differ by a word and a number are the normal
    // case, and duplicating one that came back blank would save nothing.
    duplicateMeter(nodeId, blockId, meterId) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => {
          if (block.id !== blockId) return block;
          const entries = metersOf(block);
          const index = entries.findIndex((entry) => entry.id === meterId);
          if (index === -1) return block;
          const copy = { ...entries[index], id: crypto.randomUUID() };
          return withField(block, "meters", [...entries.slice(0, index + 1), copy, ...entries.slice(index + 1)]);
        }),
        "duplicating a reading",
      );
    },

    // Taking out the last reading leaves the block empty rather than refilling
    // it — an empty meter block is one she can see and delete, and one that
    // grows a new reading every time she clears it is one that won't go away.
    removeMeter(nodeId, blockId, meterId) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) =>
          block.id === blockId ? withField(block, "meters", withoutMeter(metersOf(block), meterId)) : block,
        ),
        "removing a reading",
      );
    },

    // One action for every field of a reading, because they are all the same
    // edit to the same record and four near-identical actions would only be
    // four places to forget the clamping rule. The raw number is stored and
    // meter-service clamps on read: writing the clamped one would quietly
    // destroy what she typed the moment a maximum moved under it.
    editMeter(nodeId, blockId, meterId, patch) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) =>
          block.id === blockId ? withField(block, "meters", withMeter(metersOf(block), meterId, patch)) : block,
        ),
        "editing a meter",
        `meter:${nodeId}:${blockId}:${meterId}`,
      );
    },

    // Several readings in one write, which dragging a pie's edge needs: it
    // changes the two slices either side at once, and doing that as two edits
    // would put a frame between them where the chart does not add up — and,
    // once Phase 19 lands undo, two steps to take back one gesture.
    editMeters(nodeId, blockId, patches) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) =>
          block.id === blockId ? withField(block, "meters", withMeters(metersOf(block), patches)) : block,
        ),
        "editing a meter",
        `meters:${nodeId}:${blockId}`,
      );
    },

    // Changing the source clears the settings belonging to the old one. A
    // collection switched from tags to subpages that quietly kept its tag list
    // would surprise whoever switched it back, and a stale list is invisible
    // while another source is showing.
    setBlockSource(nodeId, blockId, source) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) =>
          block.id === blockId
            ? withField(withField(withField(block, "source", source), "tags", undefined), "targetIds", undefined)
            : block,
        ),
        "changing what a collection lists",
      );
    },

    setBlockTargets(nodeId, blockId, targetIds) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? withField(block, "targetIds", targetIds) : block)),
        "changing a collection",
      );
    },

    setBlockTags(nodeId, blockId, tags) {
      editBlocks(nodeId, (blocks) =>
        blocks.map((block) => (block.id === blockId ? withField(block, "tags", tags) : block)),
        "changing a block's tags",
      );
    },

    // Blank entries are dropped rather than stored: an empty alias would match
    // an empty search and pull every page into the results.
    setNodeAliases(nodeId, aliases) {
      const cleaned = aliases.map((alias) => alias.trim()).filter(Boolean);
      patchNode("changing the other names", nodeId, { aliases: cleaned.length > 0 ? cleaned : undefined });
    },


    // The four project-wide edits. All the thinking is in property-service's
    // plan* functions, which the view has already run to show what's about to
    // happen — these re-plan against the current graph rather than taking the
    // preview's patches, so a page edited between the preview and the click
    // is handled as it is now, not as it was.
    renamePropertyEverywhere(label, newLabel) {
      applyBulk(`renaming ${label}`, planPropertyRename(get().nodes, label, newLabel).patches);
    },

    deletePropertyEverywhere(label) {
      applyBulk(`deleting ${label}`, planPropertyDelete(get().nodes, label).patches);
    },

    renameTagEverywhere(tag, newTag) {
      const { patches } = planTagRename(get().nodes, tag, newTag);
      applyBulk(`renaming #${tag}`, patches.map(({ nodeId, tags }) => ({ nodeId, patch: { tags } })));
    },

    deleteTagEverywhere(tag) {
      const { patches } = planTagDelete(get().nodes, tag);
      applyBulk(`deleting #${tag}`, patches.map(({ nodeId, tags }) => ({ nodeId, patch: { tags } })));
    },

    renameOptionEverywhere(propertyLabel, optionLabel, newLabel) {
      applyBulk(`renaming ${optionLabel}`, planOptionRename(get().nodes, propertyLabel, optionLabel, newLabel).patches);
    },

    recolourOptionEverywhere(propertyLabel, optionLabel, color) {
      applyBulk(`recolouring ${optionLabel}`, planOptionRecolour(get().nodes, propertyLabel, optionLabel, color).patches);
    },

    deleteOptionEverywhere(propertyLabel, optionLabel) {
      applyBulk(`deleting ${optionLabel}`, planOptionDelete(get().nodes, propertyLabel, optionLabel).patches);
    },

    async setNodeImage(nodeId, data, extension) {
      const { rootPath, nodes } = get();
      const existing = nodes[nodeId];
      if (!rootPath || !existing) return;

      const fileName = `${crypto.randomUUID()}.${extension}`;
      await fsService.saveAssetImage(rootPath, fileName, data);
      // Drop the old file only after the new one is safely written, and only
      // if this node still exists (it could have been deleted mid-upload).
      const previousImage = get().nodes[nodeId]?.image;
      // `imageSource` goes with the picture that's leaving. It's the web
      // address an LK-imported picture came from, and schema.ts is explicit
      // that anything uploaded here has none — so leaving the old one behind
      // makes LK export hand out the previous picture's address for this one.
      get().updateNode(nodeId, { image: fileName, imageSource: undefined });
      releaseAsset(rootPath, previousImage);
    },

    // Point this node's portrait at a picture the project already has. The
    // whole difference from setNodeImage above is that no file is written:
    // one file, any number of references. See docs/handoff.md on the library.
    setNodeImageFromLibrary(nodeId, blockId, fileName) {
      const { rootPath, nodes } = get();
      const existing = nodes[nodeId];
      if (!rootPath || !existing) return;

      const previousImage = pictureOf(existing, blockId).image;
      if (previousImage === fileName) return;
      // The crop travels with the slot, not with the file — a different
      // picture in the same slot is a different shape, and keeping the old
      // offset would crop the new one somewhere arbitrary.
      patchBlockImage(
        nodeId,
        blockId,
        { image: fileName, imageAlt: undefined, imageFocusY: undefined },
        "changing a picture",
      );
      releaseAsset(rootPath, previousImage);
    },

    async clearNodeImage(nodeId, blockId) {
      const { rootPath, nodes } = get();
      const existing = nodes[nodeId];
      if (!rootPath || !existing) return;
      const previousImage = pictureOf(existing, blockId).image;
      if (!previousImage) return;
      // The crop and the description belong to the picture that's going, not
      // to the slot — leaving either behind would apply them to whatever is
      // uploaded next.
      patchBlockImage(
        nodeId,
        blockId,
        { image: undefined, imageAlt: undefined, imageFocusY: undefined },
        "removing a picture",
      );
      releaseAsset(rootPath, previousImage);
    },

    setImageAlt(nodeId, blockId, alt) {
      const trimmed = alt.trim();
      patchBlockImage(
        nodeId,
        blockId,
        { imageAlt: trimmed === "" ? undefined : trimmed },
        "describing a picture",
        `image-alt:${nodeId}:${blockId}`,
      );
    },

    // Dragged rather than typed, so it writes continuously for as long as the
    // pointer is down — the merge key is what makes one drag one entry.
    setImageFocus(nodeId, blockId, focusY) {
      patchBlockImage(
        nodeId,
        blockId,
        { imageFocusY: Math.min(100, Math.max(0, focusY)) },
        "moving a picture",
        `image-focus:${nodeId}:${blockId}`,
      );
    },

    // Back to the whole photo at its own shape. Absent is the uncropped state
    // rather than a stored 50, so this clears rather than resets — see
    // schema.ts on why the field is its own flag.
    clearImageFocus(nodeId, blockId) {
      patchBlockImage(nodeId, blockId, { imageFocusY: undefined }, "recentring a picture");
    },

    // **The two pictures trade places** — see planPageImageBlock, which is
    // where that is decided and tested. One patch rather than two, so the
    // block that gains the mark and the picture that moves with it are one
    // step of undo.
    setPageImageBlock(nodeId, blockId) {
      const node = get().nodes[nodeId];
      if (!node) return;
      const patch = planPageImageBlock(node, currentBlocks(node), blockId);
      if (!patch.blocks) return;
      patchNode("changing the page's picture", nodeId, patch);
    },

    // A picture dropped, pasted or picked inside the editor. Deliberately not
    // paired with a delete: the reference lives in the page's text, where it
    // can be cut, undone, re-pasted and duplicated freely, so "which file is
    // still wanted" isn't a question any single edit can answer. Removing an
    // image block therefore leaves its file in assets/ — see docs/handoff.md,
    // and Phase 17's Assets tab is where unused files get to be visible.
    async uploadAsset(data, extension, originalName) {
      const { rootPath } = get();
      if (!rootPath) throw new Error("No project is open.");
      const fileName = `${crypto.randomUUID()}.${extension}`;
      await fsService.saveAssetImage(rootPath, fileName, data);
      // The name she picked the file under, kept as its starting name. This is
      // the only moment it's knowable — the file on disk is a UUID from here
      // on, and nothing later can work back to "Valera sword.png". Written
      // after the picture itself, so a failed upload leaves no name behind for
      // a file that isn't there.
      const suggested = originalName ? suggestedAssetName(originalName) : "";
      if (suggested) applyAssetNames(nameAsset(get().assetNames, fileName, suggested));
      return assetRef(fileName);
    },

    async listAssets() {
      const { rootPath } = get();
      if (!rootPath) return [];
      return fsService.listAssetImages(rootPath);
    },

    renameAsset(fileName, name) {
      const before = get().assetNames;
      const next = nameAsset(before, fileName, name);
      // Same object means she opened the name box and committed it unchanged,
      // which is most of the times it's opened. No write, and no undo entry
      // for a step that didn't happen.
      if (next === before) return;
      applyAssetNames(next);
      record(
        name.trim() ? `renaming a picture to "${name.trim()}"` : "clearing a picture's name",
        () => applyAssetNames(before),
        () => applyAssetNames(nameAsset(get().assetNames, fileName, name)),
      );
    },

    pruneAssetNames(present) {
      const { rootPath } = get();
      const stillHere = new Set(present);

      const before = get().assetNames;
      const pruned = pruneAssetNames(before, stillHere);
      // Not undoable and deliberately silent: the pictures are already gone,
      // and this is the record catching up rather than an edit she made.
      if (pruned !== before) applyAssetNames(pruned);

      // The sources file rides along on the same sweep rather than having its
      // own. It's the same question — which filenames still exist — and a
      // second pass would be a second chance to disagree.
      const sourcesBefore = get().assetSources;
      const sourcesPruned = pruneAssetSources(sourcesBefore, stillHere);
      if (sourcesPruned !== sourcesBefore) {
        set({ assetSources: sourcesPruned });
        if (rootPath) track(() => fsService.saveAssetSources(rootPath, sourcesPruned));
      }

      // And the removed list, on the same sweep. This is where a removal ends
      // its life: the entry only exists while some page still needs the file,
      // so once the last page lets go and `releaseAsset` deletes it, the name
      // here has nothing left to hide and goes.
      const removedBefore = get().removedAssets;
      const removedPruned = pruneRemovedAssets(removedBefore, stillHere);
      if (removedPruned !== removedBefore) {
        set({ removedAssets: removedPruned });
        if (rootPath) track(() => fsService.saveRemovedAssets(rootPath, removedPruned));
      }
    },

    createAssetFolder(name) {
      const id = crypto.randomUUID();
      applyAssetFolders(addAssetFolder(get().assetFolders, id, name));
      return id;
    },

    renameAssetFolder(id, name) {
      applyAssetFolders(renameFolder(get().assetFolders, id, name));
    },

    deleteAssetFolder(id) {
      const before = get().assetFolders;
      const folder = before.folders.find((f) => f.id === id);
      if (!folder) return;
      applyAssetFolders(removeAssetFolder(before, id));
      // Undoable like everything else that removes something she made. Cheap
      // to hold in full: this record is a handful of names and labels, not
      // pages — and restoring it by id is what puts the pictures that were in
      // the folder back into it rather than leaving them loose.
      record(
        `deleting the folder ${folder.name}`,
        () => applyAssetFolders(before),
        () => applyAssetFolders(removeAssetFolder(get().assetFolders, id)),
      );
    },

    setAssetFolder(fileName, folderId) {
      applyAssetFolders(assignAsset(get().assetFolders, fileName, folderId));
    },

    pruneAssetFolders(files) {
      const before = get().assetFolders;
      const pruned = pruneAssignments(before, files);
      // Identity, not a deep compare: the service returns the same object when
      // there was nothing to drop, which is every call but the rare one. This
      // runs on each read of the directory, so it has to cost nothing when the
      // answer is "no change" — and writing the file every time would put a
      // disk touch behind opening a tab.
      if (pruned !== before) applyAssetFolders(pruned);
    },

    /**
     * Take a picture out of the library.
     *
     * **This is a change to the library, not to any page.** Her instruction,
     * 2026-08-14, after two rounds of me building the wrong thing: the library
     * is the list of pictures she's looking at, and removing one from it must
     * leave every page that shows it showing it. LegendKeeper behaves the same
     * way, and for the same reason its pages never break — deleting a library
     * entry there deletes a row nothing was reading through.
     *
     * So there are two paths and she sees no difference between them:
     *
     * - **Nothing is using it.** The file goes. Keeping bytes nothing points at
     *   would be hoarding, and there's no page to protect.
     * - **Something is using it.** The file stays, because a page needs those
     *   bytes, and the name goes into `.removed.json` so the grid stops showing
     *   it. `releaseAsset` deletes it later, when the last page lets go.
     *
     * Undo puts it back either way.
     */
    async removeAssetFromLibrary(fileName) {
      const { rootPath, nodes, templates } = get();
      if (!rootPath) return;

      const inUse = isAssetInUse(nodes, templates, fileName);
      const before = get().removedAssets;
      const after = removeAsset(before, fileName);

      const applyRemoved = (next: RemovedAssets): void => {
        set({ removedAssets: next });
        track(() => fsService.saveRemovedAssets(rootPath, next));
      };

      if (inUse) {
        applyRemoved(after);
        record(
          `removing the picture ${fileName} from the library`,
          () => applyRemoved(before),
          () => applyRemoved(removeAsset(get().removedAssets, fileName)),
        );
        return;
      }

      // Read before the delete, so undo has something to put back. A file that
      // won't read is still deleted — refusing would leave her unable to clear
      // a picture that's already damaged — but then there's nothing to restore,
      // so no undo entry is offered rather than one that would quietly do
      // nothing.
      const bytes = await fsService.readAssetImage(rootPath, fileName).catch(() => null);

      // Awaited, not just queued. Every other asset delete happens behind a
      // change the user can already see, so the queue landing a moment later
      // costs nothing — but this one *is* the change, and the tab re-reads the
      // folder the instant this resolves. Returning early had it read the
      // directory before the delete landed and draw the picture straight back,
      // which then sat there looking undeleted until she left the tab.
      await enqueueWrite(() => fsService.deleteAssetImage(rootPath, fileName)).then(markSaved).catch(recordSaveError);
      if (!bytes) return;

      const restored = bytes;
      record(
        `removing the picture ${fileName} from the library`,
        () => track(() => fsService.saveAssetImage(rootPath, fileName, restored)),
        () => track(() => fsService.deleteAssetImage(rootPath, fileName)),
      );
    },

    // "Set cover" — the sidebar portrait becomes the page's banner as well.
    async setBannerFromImage(nodeId, blockId) {
      const { rootPath, nodes } = get();
      const existing = nodes[nodeId];
      if (!rootPath || !existing) return;
      // Whichever picture *this* block is showing, which since Phase 19.5 is
      // not always the page's own — an image block in the middle of the writing
      // holds its own photo, and "set as cover" there means that one.
      const picture = pictureOf(existing, blockId);
      if (!picture.image) return;

      // The cover points at the portrait's own file now, and no longer takes a
      // copy of it. The copy existed because setNodeImage's cleanup deleted the
      // old file outright, so a shared filename meant replacing the portrait
      // silently emptied the cover; `releaseAsset` is what removed that hazard,
      // and with it gone a second identical file on disk is pure waste — and
      // one that would show up twice over in the Assets tab.
      const previousBanner = get().nodes[nodeId]?.banner;
      // `imageSource` carries across because it describes this exact picture,
      // and LK export needs an address for the cover as much as for the
      // portrait — same picture, same address, nothing invented. It only
      // describes the page's own portrait, so a block's own photo takes none.
      const bannerSource = picture.image === existing.image ? existing.imageSource : undefined;
      get().updateNode(nodeId, { banner: picture.image, bannerFocusY: 50, bannerSource });
      releaseAsset(rootPath, previousBanner);
    },

    // The page-header cover image (Phase 8's PageBanner) — a separate slot
    // from setNodeImage's sidebar portrait above, matching LegendKeeper's own
    // banner-vs-sidebar-image distinction.
    async setNodeBanner(nodeId, data, extension) {
      const { rootPath, nodes } = get();
      const existing = nodes[nodeId];
      if (!rootPath || !existing) return;

      const fileName = `${crypto.randomUUID()}.${extension}`;
      await fsService.saveAssetImage(rootPath, fileName, data);
      const previousBanner = get().nodes[nodeId]?.banner;
      // `bannerSource` clears with it — same reasoning as setNodeImage's.
      get().updateNode(nodeId, { banner: fileName, bannerFocusY: 50, bannerSource: undefined });
      releaseAsset(rootPath, previousBanner);
    },

    // The cover's half of setNodeImageFromLibrary — same trade, no file
    // written.
    setNodeBannerFromLibrary(nodeId, fileName) {
      const { rootPath, nodes } = get();
      if (!rootPath || !nodes[nodeId]) return;

      const previousBanner = nodes[nodeId]?.banner;
      if (previousBanner === fileName) return;
      get().updateNode(nodeId, { banner: fileName, bannerFocusY: 50, bannerSource: undefined });
      releaseAsset(rootPath, previousBanner);
    },

    setBannerFocus(nodeId, focusY) {
      get().updateNode(nodeId, { bannerFocusY: Math.min(100, Math.max(0, focusY)) });
    },

    async clearNodeBanner(nodeId) {
      const { rootPath, nodes } = get();
      const existing = nodes[nodeId];
      if (!rootPath || !existing?.banner) return;
      const previousBanner = existing.banner;
      get().updateNode(nodeId, { banner: undefined, bannerFocusY: undefined });
      releaseAsset(rootPath, previousBanner);
    },

    async renameNode(id, name) {
      const { rootPath, nodes } = get();
      const existing = nodes[id];
      if (!rootPath || !existing) return;

      // A rename/move changes where this node resolves on disk. If a
      // debounced content edit for this same node is still pending, flush it
      // first so it lands at the *old* path before that path stops existing
      // — otherwise it fires later with a stale pre-rename path snapshot and
      // either silently fails or resurrects a duplicate directory (this
      // orphaned a page mid-testing during Phase 5; see docs/handoff.md).
      await flushSave(id);

      const { rootPath: rootPathAfter, nodes: nodesAfter, project } = get();
      const existingAfter = nodesAfter[id];
      if (!rootPathAfter || !existingAfter) return;

      const allNodesBefore = Object.values(nodesAfter);
      const previousName = existingAfter.name;
      const updated: Node = { ...existingAfter, name, updatedAt: Date.now() };
      const nextNodes = { ...nodesAfter, [id]: updated };
      set({ nodes: nextNodes });
      track(() => fsService.renameNode(rootPathAfter, allNodesBefore, Object.values(nextNodes), id));

      // selectedName is a copy of this same node's name, taken at selection
      // time so the start screen can read it without a tree walk (see
      // schema.ts). Renaming the page she's currently on would otherwise
      // leave that copy wrong until her next navigation.
      if (project && project.selectedId === id) {
        const nextProject: Project = { ...project, selectedName: name };
        set({ project: nextProject });
        scheduleSave(PROJECT_META_SAVE_KEY, () => fsService.saveProject(rootPathAfter, nextProject).then(markSaved));
      }

      // A rename is its own inverse, so both halves are the ordinary action —
      // no new filesystem path is involved in undoing one.
      record(
        `renaming "${previousName}"`,
        () => get().renameNode(id, previousName),
        () => get().renameNode(id, name),
      );
    },

    async moveNode(id, newParentId, index) {
      await get().moveNodes([id], newParentId, index);
    },

    // A multi-selection drops as one operation. Looping moveNode instead
    // would fire several un-awaited filesystem relocations that each plan
    // across the whole graph — they'd interleave, and the later ones would
    // rename paths the earlier ones had already moved.
    async moveNodes(ids, newParentId, index) {
      const { rootPath, project, nodes } = get();
      if (!rootPath || !project) return;
      const moving = ids.filter((id) => nodes[id]);
      if (moving.length === 0) return;

      // The parent still has to exist — a drop onto an id that isn't in the
      // graph would file a subtree nowhere. What's gone from this guard is the
      // template test: a leaf gaining a child now grows a directory to hold it
      // rather than losing it (see filesystem-service's `usesDirectoryStorage`).
      if (newParentId && !nodes[newParentId]) return;

      // Same stale-path race as renameNode above.
      await Promise.all(moving.map((id) => flushSave(id)));

      const { rootPath: rootPathAfter, project: projectAfter, nodes: nodesAfter } = get();
      if (!rootPathAfter || !projectAfter) return;
      const present = moving.filter((id) => nodesAfter[id]);
      if (present.length === 0) return;

      const allNodesBefore = Object.values(nodesAfter);
      // The graph half of the drop — reparenting, the destination order, and
      // pruning every old parent that mentioned one of these — is
      // node-edit-service's, and tested there. What is left here is the part
      // that needs the store: the writes and the undo entry.
      const plan = planMove(nodesAfter, projectAfter, present, newParentId, index, Date.now());
      if (!plan) return;
      const { nodes: nextNodes, project: nextProject, previousParents } = plan;

      set({ nodes: nextNodes, project: nextProject });
      track(() => fsService.moveNodes(rootPathAfter, allNodesBefore, Object.values(nextNodes), present));
      if (nextProject !== projectAfter) track(() => fsService.saveProject(rootPathAfter, nextProject));

      // Where each one came from. A multi-selection can be dragged out of
      // several different folders at once, so putting them back is one move
      // per old parent, not one move.
      const orderingBefore = captureOrdering(projectAfter);
      const orderingAfter = captureOrdering(nextProject);
      const groupsByOldParent = new Map<string | null, string[]>();
      for (const [id, parentId] of previousParents) {
        const group = groupsByOldParent.get(parentId);
        if (group) group.push(id);
        else groupsByOldParent.set(parentId, [id]);
      }

      record(
        `moving ${countLabel(present.length, "page")}`,
        async () => {
          for (const [parentId, groupIds] of groupsByOldParent) await get().moveNodes(groupIds, parentId);
          // moveNodes appends when it isn't told an index, which is rarely
          // where they were. The recorded order is the exact answer.
          await restoreOrdering(orderingBefore);
        },
        async () => {
          await get().moveNodes(present, newParentId, index);
          await restoreOrdering(orderingAfter);
        },
      );
    },

    deleteNode(id) {
      return get().deleteNodes([id]);
    },

    // The tree can hand up a whole multi-selection, and that has to be one
    // operation rather than a loop over deleteNode: each delete renumbers
    // colliding siblings on disk, so a second call would resolve its target
    // against a layout the first had already changed underneath it.
    async deleteNodes(ids) {
      // A first pass purely to know which pictures to read, because after the
      // delete there is nothing left to read them from. State is re-read below
      // rather than reused, since this awaits. If something changed underneath
      // in that window the worst case is a picture captured that didn't need
      // to be, or one missed — not a wrong delete.
      const planning = get();
      if (!planning.rootPath || !planning.project) return;
      const plannedIds = new Set(
        ids.filter((id) => planning.nodes[id]).flatMap((id) => [id, ...descendantIds(id, planning.nodes)]),
      );
      const capturedAssets = await captureAssets(
        planning.rootPath,
        [...plannedIds].map((id) => planning.nodes[id]).filter(Boolean),
      );

      const { rootPath, project, nodes } = get();
      if (!rootPath || !project) return;

      // The graph half — expanding to subtrees, working out which roots the
      // disk should be asked for, pruning the orders, and clearing home, pins
      // and the selection when what they point at is going — is
      // node-edit-service's, and tested there.
      const plan = planDelete(nodes, project, ids);
      if (!plan) return;
      const { nodes: nextNodes, project: nextProject, deleted: existing, removedIds: toRemove, removalRoots } = plan;

      const allNodesBefore = Object.values(nodes);
      // Cancel (not flush) any pending debounced writes for everything being
      // deleted — a stale write firing after deletion would silently
      // resurrect the file/directory that was just removed.
      for (const removedId of toRemove) cancelSave(removedId);

      // Same reasoning as the cleared pointers in the plan, one level further out: a
      // deleted page left in the back stack sends Back to a blank page view
      // with nothing to explain it. Whole subtrees go, not just the rows that
      // were selected, and the cursor is re-pointed at wherever the selection
      // ended up so the first Back is a real step rather than a correction.
      const prunedHistory = forgetNodes(get().navHistory, toRemove);
      const navHistory =
        locationAt(prunedHistory) === nextProject.selectedId ? prunedHistory : visit(prunedHistory, nextProject.selectedId);

      set({ nodes: nextNodes, project: nextProject, navHistory });
      track(
        () => fsService.deleteNodes(rootPath, removalRoots.map((id) => nodes[id]), allNodesBefore, Object.values(nextNodes)),
      );
      track(() => fsService.saveProject(rootPath, nextProject));
      // A deleted node's own uploaded image/banner (see ImageSlot Phase 6,
      // PageBanner Phase 8) lives in the flat assets/ dir, not inside the
      // node's own file/directory, so fsService.deleteNodes above never
      // touches either — clean them up here or they orphan forever.
      //
      // `releaseAsset` runs after `set` above, so it reads the tree with these
      // pages already gone. That ordering is the whole correctness argument:
      // deleting a page that shared its portrait with three others must take
      // the reference and leave the file, and asking a moment earlier would
      // see the page's own reference and always decide to keep it.
      for (const removedId of toRemove) {
        const removed = nodes[removedId];
        // Pulled out of the node first: the write runs later now that it's
        // queued, and a narrowed optional property doesn't survive into a
        // closure the way a plain local does.
        const { image, banner } = removed ?? {};
        releaseAsset(rootPath, image);
        releaseAsset(rootPath, banner);
      }

      // Descendants as well as what was selected — undoing a folder delete has
      // to bring back everything that was inside it.
      const removedNodes = [...toRemove].map((id) => nodes[id]).filter(Boolean);
      const orderingBefore = captureOrdering(project);
      record(
        `deleting ${countLabel(existing.length, "page")}`,
        () => restoreNodes(removedNodes, capturedAssets, orderingBefore),
        // Redoing re-reads the pictures it's about to delete, which is wasted
        // work — the bytes captured above are still good, since restoreNodes
        // wrote them back under the same names. Not worth a second code path.
        () => get().deleteNodes(existing),
      );
    },

    async duplicateNodes(ids) {
      const { rootPath, project, nodes } = get();
      if (!rootPath || !project) return;

      // Which pages a copy has to be made of, worked out before anything is
      // read: the picture files belonging to them are copied next, and their
      // new names are an input to the plan rather than something it invents.
      const scope = duplicateScope(nodes, ids);
      if (!scope) return;
      const { roots, subtreeIds } = scope;

      // A clone must get its own copy of the image/banner file — sharing the
      // original's filename would mean deleting or replacing it on either the
      // original or the copy later deletes it out from under the other
      // (fsService has no dedicated "copy" — read + rewrite under a fresh name
      // does the same thing). This is the I/O half, and the only reason
      // duplicating is async at all.
      const projectRootPath: string = rootPath;
      async function cloneAsset(fileName: string | undefined): Promise<string | undefined> {
        if (!fileName) return fileName;
        const extension = fileName.slice(fileName.lastIndexOf(".") + 1);
        const clonedFileName = `${crypto.randomUUID()}.${extension}`;
        const bytes = await fsService.readAssetImage(projectRootPath, fileName);
        await fsService.saveAssetImage(projectRootPath, clonedFileName, bytes);
        return clonedFileName;
      }
      const clonedAssetNames = new Map<string, ClonedAssetNames>(
        await Promise.all(
          subtreeIds.map(async (subId): Promise<[string, ClonedAssetNames]> => {
            const source = nodes[subId];
            const [image, banner, blocks] = await Promise.all([
              cloneAsset(source.image),
              cloneAsset(source.banner),
              withCopiedBlockPictures(source.blocks, cloneAsset),
            ]);
            return [subId, { image, banner, blocks }];
          }),
        ),
      );

      // Everything else — the fresh ids, the rewired parents, the "(Copy)"
      // suffix and landing each copy directly after its original — is
      // node-edit-service's, and tested there.
      const {
        nodes: nextNodes,
        project: nextProject,
        clones,
        cloneRootIds,
      } = planDuplicate(nodes, project, scope, {
        mintId: () => crypto.randomUUID(),
        now: Date.now(),
        assets: clonedAssetNames,
      });

      set({ nodes: nextNodes, project: nextProject });
      // Duplicating a folder writes its whole subtree, so the clones share one
      // path index rather than each rebuilding it from the full graph. Through
      // addNodes so the arrival of a copy gets the same relocation pass a new
      // page does — a copy lands beside its original, so its parent can't
      // convert, but a same-named sibling appearing does shift collision
      // suffixes, and that has always needed the planner.
      track(() => fsService.addNodes(rootPath, clones, Object.values(nodes), Object.values(nextNodes)));
      if (nextProject !== project) track(() => fsService.saveProject(rootPath, nextProject));

      // The clones' own copies of the pictures, read only if the user actually
      // undoes — the undo is about to delete those files, and redo needs them
      // back. Capturing eagerly would mean re-reading every image in a
      // duplicated folder on the chance that it's wanted.
      let clonedAssets: CapturedAsset[] = [];
      const orderingBefore = captureOrdering(project);
      const orderingAfter = captureOrdering(nextProject);
      record(
        roots.length === 1
          ? `duplicating "${nodes[roots[0]].name}"`
          : `duplicating ${countLabel(roots.length, "page")}`,
        async () => {
          const currentRootPath = get().rootPath;
          if (currentRootPath) clonedAssets = await captureAssets(currentRootPath, clones);
          await get().deleteNodes([...cloneRootIds]);
          await restoreOrdering(orderingBefore);
        },
        () => restoreNodes(clones, clonedAssets, orderingAfter),
      );
    },

    // The page stays exactly where it is; what lands in the library is a copy.
    // Nothing about the project's own nodes changes, so there's no relocation
    // pass and no path index — the template file is the only write.
    async saveAsTemplate(nodeId, includeDescendants) {
      const { rootPath, nodes, templates } = get();
      if (!rootPath || !nodes[nodeId]) return;

      const sources = collectSubtree(nodeId, nodes, includeDescendants);
      const { clones, idMap } = cloneSubtree(sources, null, () => crypto.randomUUID());

      // Its own copies of the pictures, for the same reason a duplicate gets
      // them: sharing the original's filename means replacing the page's image
      // later deletes the template's out from under it.
      const withOwnAssets = await Promise.all(
        clones.map(async (clone) => {
          const [image, banner, blocks] = await Promise.all([
            copyAssetFile(rootPath, clone.image),
            copyAssetFile(rootPath, clone.banner),
            withCopiedBlockPictures(clone.blocks, (fileName) => copyAssetFile(rootPath, fileName)),
          ]);
          return { ...clone, image, banner, blocks };
        }),
      );

      const rootId = idMap.get(nodeId)!;
      const nextTemplates = addTemplate(templates, withOwnAssets, rootId);
      set({ templates: nextTemplates });
      track(() => fsService.saveTemplateLibrary(rootPath, nextTemplates));

      record(
        `saving "${nodes[nodeId].name}" as a template`,
        () => applyTemplates(removeTemplate(get().templates, rootId)),
        () => applyTemplates(addTemplate(get().templates, withOwnAssets, rootId)),
      );
    },

    // The template's copied image files are deliberately left on disk. They're
    // in the shared assets/ directory, undo is one keystroke away, and an
    // orphaned image costs a few KB where a deleted one costs the picture.
    deleteTemplate(rootId) {
      const { rootPath, templates } = get();
      if (!rootPath || !templates.nodes[rootId]) return;

      const name = templates.nodes[rootId].name;
      const removed = collectSubtree(rootId, templates.nodes, true);
      const index = templates.rootOrder.indexOf(rootId);
      const nextTemplates = removeTemplate(templates, rootId);
      applyTemplates(nextTemplates);

      // Deleting a template while it's the thing on screen would leave the
      // centre panel editing a record that no longer exists. Checked against
      // the whole subtree, not just the root — a sub-page of the template can
      // be what's open, and it goes with its parent.
      const { openTemplateId } = get();
      if (openTemplateId && removed.some((node) => node.id === openTemplateId)) {
        set({ openTemplateId: null });
      }

      record(
        `deleting the "${name}" template`,
        () => {
          // Put back where it was, not on the end — undo that moves the thing
          // it restores is undo you have to check up on.
          const current = get().templates;
          const nodes = { ...current.nodes };
          for (const node of removed) nodes[node.id] = node;
          const rootOrder = [...current.rootOrder];
          rootOrder.splice(index === -1 ? rootOrder.length : index, 0, rootId);
          applyTemplates({ ...current, nodes, rootOrder });
        },
        () => applyTemplates(removeTemplate(get().templates, rootId)),
      );
    },

    reorderTemplates(orderedRootIds) {
      const { templates } = get();
      const { rootOrder } = withTemplatesReordered(templates, orderedRootIds);
      const previous = templates.rootOrder;

      // A drag that put everything back where it was would otherwise leave an
      // undo entry that reverses nothing, which reads as undo being broken.
      // Same guard, same reason, as sortChildren's.
      if (rootOrder.length === previous.length && rootOrder.every((id, index) => id === previous[index])) return;

      applyTemplates({ ...templates, rootOrder });
      // Re-read inside both halves rather than closing over the library: a
      // template can be saved or deleted between the drag and the undo, and
      // putting back a whole library from before that would take the new one
      // with it. Only the order is restored.
      record(
        "reordering the templates",
        () => applyTemplates({ ...get().templates, rootOrder: previous }),
        () => applyTemplates({ ...get().templates, rootOrder }),
      );
    },

    openTemplate(templateNodeId) {
      // A template that's just been deleted mustn't stay open behind the
      // dialog that deleted it. Closing is always allowed.
      if (templateNodeId !== null && !get().templates.nodes[templateNodeId]) return;
      set({ openTemplateId: templateNodeId });
    },

    openBuiltInTemplate(templateKey) {
      const { rootPath, templates } = get();
      const definition = getTemplate(templateKey);
      if (!rootPath || !definition) return;

      const existing = overrideFor(templates, templateKey);
      if (existing) {
        set({ openTemplateId: existing.id });
        return;
      }

      // Named after the built-in it replaces rather than "Copy of Character",
      // because it isn't a copy from her side — it's what Character means in
      // this world now, and the sidebar row it opens from says Character.
      const node = buildOverrideNode(templateKey, crypto.randomUUID(), definition.label, getDefaultTabs(templateKey));
      const nextTemplates = addOverride(templates, templateKey, node);
      set({ templates: nextTemplates, openTemplateId: node.id });
      track(() => fsService.saveTemplateLibrary(rootPath, nextTemplates));
    },

    resetBuiltInTemplate(templateKey) {
      const { rootPath, templates } = get();
      const override = overrideFor(templates, templateKey);
      if (!rootPath || !override) return;

      const label = getTemplate(templateKey)?.label ?? templateKey;
      const removed = collectSubtree(override.id, templates.nodes, true);
      applyTemplates(removeOverride(templates, templateKey));

      // Same reasoning as deleteTemplate: the thing on screen mustn't outlive
      // the record behind it, and a sub-page of the override can be what's
      // open rather than its root.
      const { openTemplateId } = get();
      if (openTemplateId && removed.some((node) => node.id === openTemplateId)) {
        set({ openTemplateId: null });
      }

      record(
        `putting the ${label} template back to the original`,
        () => {
          const current = get().templates;
          const nodes = { ...current.nodes };
          for (const node of removed) nodes[node.id] = node;
          applyTemplates({ ...current, nodes, overrides: { ...current.overrides, [templateKey]: override.id } });
        },
        () => applyTemplates(removeOverride(get().templates, templateKey)),
      );
    },

    updateTemplateNode(nodeId, patch) {
      const { rootPath, templates } = get();
      const existing = templates.nodes[nodeId];
      if (!rootPath || !existing) return;

      const updated: Node = { ...existing, ...patch, updatedAt: Date.now() };
      set({ templates: { ...templates, nodes: { ...templates.nodes, [nodeId]: updated } } });

      // Keyed on the library file, not the node: templates all live in one
      // file, so two edited in quick succession must debounce onto one write
      // rather than two racing writes of the same path. Re-read at fire time
      // for the same reason `updateNode` does — the value 300ms ago may not be
      // the value being saved.
      scheduleSave(TEMPLATES_FILE, () => {
        const { rootPath: currentRootPath, templates: currentTemplates } = get();
        if (!currentRootPath) return;
        return fsService.saveTemplateLibrary(currentRootPath, currentTemplates).then(markSaved);
      });
    },

    // The page itself is patched in place and its saved sub-pages arrive as
    // children — so the page keeps its id, and everything already pointing at
    // it (the selection, the tree's open rows, a wikilink someone wrote) still
    // points at the same page afterwards.
    async applyCustomTemplate(nodeId, templateRootId) {
      const { rootPath, nodes, templates } = get();
      const target = nodes[nodeId];
      if (!rootPath || !target || !templates.nodes[templateRootId]) return;

      const source = templates.nodes[templateRootId];
      // The template's own descendants, re-parented onto the page. The root
      // isn't among them: its *contents* are being poured into a page that
      // already exists, rather than arriving as a new page of its own.
      const descendants = collectSubtree(templateRootId, templates.nodes, true).filter((n) => n.id !== templateRootId);
      const { clones } = cloneSubtree(descendants, nodeId, () => crypto.randomUUID());

      // Every picture gets a private copy, the root's included — a page sharing
      // the template's filename would lose its image the moment the template
      // was deleted or re-saved.
      const copyAssetsOf = async <T extends { image?: string; banner?: string; blocks?: Block[] }>(
        node: T,
      ): Promise<T> => {
        const [image, banner, blocks] = await Promise.all([
          copyAssetFile(rootPath, node.image),
          copyAssetFile(rootPath, node.banner),
          withCopiedBlockPictures(node.blocks, (fileName) => copyAssetFile(rootPath, fileName)),
        ]);
        return { ...node, image, banner, blocks };
      };
      const arriving = await Promise.all(clones.map(copyAssetsOf));
      // The root's two slots only. Its *blocks* are deliberately not copied:
      // the page keeps its own block list through the swap below — see
      // planTemplateSwap — so a copy of the template's image blocks would be
      // files on disk that nothing ever points at.
      const [rootImage, rootBanner] = await Promise.all([
        copyAssetFile(rootPath, source.image),
        copyAssetFile(rootPath, source.banner),
      ]);

      // Deep-copied out of the library rather than shared with it: writing on
      // the page afterwards must not quietly edit the template it came from.
      // **The template's fields replace the page's, and anything the page was
      // carrying that they have no home for is kept as a custom property.**
      // Without this the value went out of the file with the field, and the
      // block that was showing it turned into "Missing property" — which was
      // the only sign anything had happened. Reported from use 2026-08-27; see
      // `planTemplateSwap`.
      const swap = planTemplateSwap(
        target,
        getPropertySchema(target.templateKey),
        getPropertySchema(source.templateKey),
        {
          properties: structuredClone(source.properties),
          customProperties: source.customProperties ? structuredClone(source.customProperties) : [],
        },
      );

      const patch: Partial<Omit<Node, "id">> = {
        templateKey: source.templateKey,
        tabs: structuredClone(source.tabs),
        properties: swap.properties,
        customProperties: swap.customProperties,
        propertyOrder: source.propertyOrder ? [...source.propertyOrder] : undefined,
        blocks: swap.blocks,
        tags: [...source.tags],
        color: source.color,
        image: rootImage,
        banner: rootBanner,
      };

      // Read off the node as it stands, not a whole snapshot of it: these are
      // exactly the fields the patch overwrites, which is what undo has to put
      // back. Same approach as applyBulk above.
      const previous: Partial<Omit<Node, "id">> = {
        templateKey: target.templateKey,
        tabs: target.tabs,
        properties: target.properties,
        customProperties: target.customProperties,
        propertyOrder: target.propertyOrder,
        blocks: target.blocks,
        tags: target.tags,
        color: target.color,
        image: target.image,
        banner: target.banner,
      };

      // The pages that land directly on the target. Undo deletes these and
      // their own children go with them, the way deleting a folder works.
      const arrivingRootIds = arriving.filter((n) => n.parentId === nodeId).map((n) => n.id);

      const addArriving = (): void => {
        if (arriving.length === 0) return;
        const before = Object.values(get().nodes);
        const nextNodes = { ...get().nodes };
        for (const clone of arriving) nextNodes[clone.id] = clone;
        set({ nodes: nextNodes });
        // The target gains its first child here, which moves its own file into
        // a new directory — so a debounced write for it is cancelled rather
        // than left to fire into the gap. Same reasoning as addNode.
        cancelSave(nodeId);
        track(() => fsService.addNodes(rootPath, [nextNodes[nodeId], ...arriving], before, Object.values(nextNodes)));
      };

      get().updateNode(nodeId, patch);
      addArriving();

      let clonedAssets: CapturedAsset[] = [];
      record(
        `using the "${source.name}" template`,
        async () => {
          const currentRootPath = get().rootPath;
          if (currentRootPath && arriving.length > 0) clonedAssets = await captureAssets(currentRootPath, arriving);
          if (arrivingRootIds.length > 0) await get().deleteNodes(arrivingRootIds);
          get().updateNode(nodeId, previous);
        },
        async () => {
          get().updateNode(nodeId, patch);
          const project = get().project;
          if (arriving.length > 0 && project) await restoreNodes(arriving, clonedAssets, captureOrdering(project));
        },
      );
    },

    // One step for the whole selection, and its own action rather than a loop
    // over updateNode at the call site, because a loop is several undo entries
    // for what the user did once.
    setNodeColor(ids, color) {
      const { nodes } = get();
      const targets = ids.filter((id) => nodes[id]);
      if (targets.length === 0) return;

      const previousColors = new Map(targets.map((id) => [id, nodes[id].color]));
      const apply = (next: (id: string) => string | undefined) => {
        for (const id of targets) get().updateNode(id, { color: next(id) });
      };

      apply(() => color);
      record(
        `recolouring ${countLabel(targets.length, "page")}`,
        () => apply((id) => previousColors.get(id)),
        () => apply(() => color),
      );
    },

    // Sending the template prompt away, and undoably — it is one click that
    // changes what a page shows, which is exactly the kind of thing that gets
    // clicked by accident. Applying a template hides the prompt by itself, so
    // this is only ever about a page that means to stay blank.
    setTemplatePromptHidden(nodeId, hidden) {
      const node = get().nodes[nodeId];
      if (!node) return;
      const before = node.hideTemplatePrompt;
      const apply = (next: boolean | undefined) =>
        get().updateNode(nodeId, { hideTemplatePrompt: next }, { touch: false });

      apply(hidden || undefined);
      record(
        hidden ? "dismissing the template prompt" : "bringing the template prompt back",
        () => apply(before),
        () => apply(hidden || undefined),
      );
    },

    // The same shape as setNodeColor above, and for the same reason: the tree's
    // menu acts on the selection, so nine pages getting one icon is one action
    // and one undo. Absent means "use the template's", which is what every
    // page had before this existed.
    setNodeIcon(nodeIds, icon) {
      const { nodes } = get();
      const targets = nodeIds.filter((id) => nodes[id]);
      if (targets.length === 0) return;

      const previous = new Map(targets.map((id) => [id, nodes[id].icon]));
      const apply = (next: (id: string) => string | undefined) => {
        for (const id of targets) get().updateNode(id, { icon: next(id) });
      };

      apply(() => icon);
      record(
        `changing the icon on ${countLabel(targets.length, "page")}`,
        () => apply((id) => previous.get(id)),
        () => apply(() => icon),
      );
    },

    // Only the pages named are flagged; the cascade onto their descendants is
    // derived at read time (tree-service's isHiddenByAncestor) rather than
    // written onto every child. Writing it down would mean a page dragged out
    // of a hidden folder stayed hidden with nothing on screen explaining why.
    setNodeHidden(ids, hidden) {
      const { nodes } = get();
      const targets = ids.filter((id) => nodes[id]);
      if (targets.length === 0) return;

      const previousHidden = new Map(targets.map((id) => [id, nodes[id].hidden]));
      const apply = (next: (id: string) => boolean | undefined) => {
        for (const id of targets) get().updateNode(id, { hidden: next(id) });
      };

      // Written as `undefined` rather than `false` on the way back to visible,
      // so a page that was never hidden and a page that was un-hidden are the
      // same page on disk. Nothing distinguishes them.
      apply(() => (hidden ? true : undefined));
      record(
        `${hidden ? "hiding" : "showing"} ${countLabel(targets.length, "page")}`,
        () => apply((id) => previousHidden.get(id)),
        () => apply(() => (hidden ? true : undefined)),
      );
    },

    selectNode(id, tabId) {
      const { navHistory } = get();
      // The one place a visit is recorded, so nothing that navigates can
      // forget to. Back and forward deliberately don't come through here — see
      // `applySelection`.
      applySelection(id, tabId, visit(navHistory, id));
    },

    goBack() {
      const { navHistory } = get();
      const next = stepBack(navHistory);
      if (next === navHistory) return;
      applySelection(locationAt(next), undefined, next);
    },

    goForward() {
      const { navHistory } = get();
      const next = stepForward(navHistory);
      if (next === navHistory) return;
      applySelection(locationAt(next), undefined, next);
    },

    goHome() {
      const { project, nodes } = get();
      const homeNodeId = project?.homeNodeId;
      // A home that's been deleted clears itself on the way out (see
      // deleteNodes), so this should never fire — but a button that silently
      // navigates to nothing is worse than one that does nothing.
      if (!homeNodeId || !nodes[homeNodeId]) return;
      get().selectNode(homeNodeId);
    },

    async saveNow() {
      const failedCount = await flushAllSaves();
      if (failedCount === 0) markSaved();
    },

    // Designating a page as this world's home. Written immediately rather than
    // through the debounced metadata path selection/expansion use — this is a
    // deliberate act the user just performed, not incidental UI state, and it
    // should survive a crash in the next 300ms.
    setProjectHome(id) {
      const { rootPath, project, nodes } = get();
      if (!rootPath || !project) return;
      if (id !== null && !nodes[id]) return;
      const previousHomeNodeId = project.homeNodeId ?? null;
      const homeNodeId = project.homeNodeId === id ? null : id;
      applyHome(homeNodeId);
      record(
        "the home page change",
        () => applyHome(previousHomeNodeId),
        () => applyHome(homeNodeId),
      );
    },

    restoreProjectArrangement(patch) {
      const { project } = get();
      if (!project) return;

      // Read before the write, the same way patchNode does it: the fields this
      // patch is about to overwrite are exactly what undoing it puts back.
      const before: Record<string, unknown> = {};
      for (const key of Object.keys(patch)) before[key] = project[key as keyof Project];
      const after = { ...patch };

      applyProjectPatch(after);
      record(
        "restoring the tree",
        () => applyProjectPatch(before as Partial<Project>),
        () => applyProjectPatch(after),
      );
    },

    // Pinning a page to the rail. Written immediately for the same reason as
    // the home page above: a deliberate act, not incidental UI state.
    //
    // A new pin goes on the end rather than the front. The rail is a row of
    // small tiles and its order is the only thing making any one of them
    // findable by muscle memory — putting each new pin first would shuffle
    // every tile along one every time, which costs the whole row to gain a
    // position for one page.
    togglePinned(id) {
      const { rootPath, project, nodes } = get();
      if (!rootPath || !project || !nodes[id]) return;
      const previousPinnedIds = project.pinnedIds ?? [];
      const pinnedIds = previousPinnedIds.includes(id)
        ? previousPinnedIds.filter((pinnedId) => pinnedId !== id)
        : [...previousPinnedIds, id];
      applyPins(pinnedIds);
      record(
        previousPinnedIds.includes(id) ? `removing the "${nodes[id].name}" shortcut` : `the "${nodes[id].name}" shortcut`,
        () => applyPins(previousPinnedIds),
        () => applyPins(pinnedIds),
      );
    },

    // Sorting only ever rewrites the order list — no node changes, no files
    // move, so nothing here needs the relocation pass that moveNodes does. The
    // whole ordering snapshot is captured for undo rather than just this one
    // group, because `restoreOrdering` is the existing reverse for exactly this
    // shape of change and a bespoke narrower one would be a second way to do it.
    sortChildren(parentId, sort) {
      const { rootPath, project, nodes } = get();
      if (!rootPath || !project) return;
      if (parentId !== null && !nodes[parentId]) return;

      const currentIds = orderedSiblingIds(nodes, project, parentId);
      if (currentIds.length < 2) return;
      const sortedIds = sortSiblingIds(currentIds, nodes, sort);
      // Sorting an already-sorted group would otherwise leave an undo entry
      // that reverses nothing, which reads as undo being broken.
      if (sortedIds.every((id, index) => id === currentIds[index])) return;

      const orderingBefore = captureOrdering(project);
      const nextProject: Project =
        parentId === null
          ? { ...project, rootOrder: sortedIds }
          : { ...project, childOrder: { ...project.childOrder, [parentId]: sortedIds } };
      set({ project: nextProject });
      track(() => fsService.saveProject(rootPath, nextProject));

      const orderingAfter = captureOrdering(nextProject);
      const label = parentId === null ? "sorting the project" : `sorting "${nodes[parentId].name}"`;
      record(
        label,
        () => restoreOrdering(orderingBefore),
        () => restoreOrdering(orderingAfter),
      );
    },

    setExpanded(id, isOpen) {
      const { rootPath, project } = get();
      if (!rootPath || !project) return;
      const alreadyExpanded = project.expandedIds.includes(id);
      if (isOpen === alreadyExpanded) return;
      const expandedIds = isOpen
        ? [...project.expandedIds, id]
        : project.expandedIds.filter((expandedId) => expandedId !== id);
      const nextProject: Project = { ...project, expandedIds };
      set({ project: nextProject });
      scheduleSave(PROJECT_META_SAVE_KEY, () => fsService.saveProject(rootPath, nextProject).then(markSaved));
    },
  };
});
