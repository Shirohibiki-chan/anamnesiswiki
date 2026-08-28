// App-level modal state: things asked for from somewhere deep in the tree but
// rendered up at the shell.
//
// The confirm dialog is here because Tauri's native confirm() rendered as an
// OS-chrome dialog box, visually inconsistent with the app's own dark theme —
// this replaces it with a themed in-app modal while keeping the same "await a
// yes/no" call shape for consumers (see use-dialogs.ts and
// components/shell/ConfirmDialog.tsx).
//
// The export request is here for the routing reason rather than the theming
// one: it's raised by a row's right-click menu, and react-arborist renders
// rows itself, so there are no props to thread a callback down through.
import { create } from "zustand";

type PendingConfirm = { message: string; resolve: (ok: boolean) => void };

/** The nodes to export, plus their descendants. Null when the modal is shut. */
type ExportRequest = { rootIds: string[] };

/**
 * A one-way message with nothing to decide — the app couldn't do the thing and
 * is saying so. Separate from `pendingConfirm` rather than a mode of it: that
 * one resolves a promise a caller is blocked on, and an acknowledgement that
 * resolves nothing has no business sharing its lifecycle.
 *
 * It exists because of a Phase 12 bug worth not repeating: "open the themes
 * folder" swallowed its own rejection, so a refused call left the button doing
 * nothing at all, indistinguishable from a slow file manager. Anything that
 * hands work to the OS needs somewhere to report that the OS said no.
 */
type Notice = { message: string };

/**
 * The sub-pages question "Save as template" asks before it runs — LegendKeeper
 * asks the same one, and it's the only thing about the operation that can't be
 * guessed. `null` is the cancel, so a caller has one thing to check.
 *
 * Its own entry rather than a mode of `pendingConfirm` for the reason that one
 * exists at all: a yes/no dialog can't offer two yeses, and squeezing a third
 * answer through a boolean is how "Cancel" ends up meaning "just this page".
 */
export type TemplateScope = "all" | "one";
type PendingTemplateScope = { pageName: string; resolve: (scope: TemplateScope | null) => void };

/**
 * The picture library, opened from wherever a picture is being chosen — the
 * sidebar portrait, the page cover. Resolves with a filename in `assets/`, or
 * null if she backed out.
 *
 * A *filename* rather than an upload result, because uploading is one of the
 * ways the dialog answers the question: a new file is added to the library and
 * then picked, so every caller has one thing to handle instead of two. `title`
 * is the only thing that differs between the places it opens from, and it's
 * there because "Choose a portrait" and "Choose a cover" land on the same grid.
 */
type PendingAssetPick = { title: string; resolve: (fileName: string | null) => void };

/**
 * Making a page and linking to it without leaving the editor (Phase 19.5).
 *
 * **The dialog makes the page itself and hands back what to link to**, rather
 * than reporting four field values for the caller to act on. There are two
 * callers already — the `/` menu and a `[[Name]]` that matches nothing — and
 * every one of them wants the same thing afterwards: a chip pointing at a page
 * that now exists. Splitting that in two would mean each caller repeating the
 * create, and the second one getting it slightly different.
 *
 * `name` pre-fills the box, which is what makes the `[[Name]]` route worth
 * having: she has already typed the name, and being asked for it again is the
 * feature failing to notice. `parentId` is where the page will go unless she
 * says otherwise — the page she is writing on, and null for the top level.
 */
export type NewPageLinkPrefill = { name: string; parentId: string | null };
/**
 * What the dialog hands back: the page it made, its name, and what she asked
 * the link to read as.
 *
 * **`linkText` is empty in the normal case and that is a real answer**, not a
 * missing one — it means "call it whatever the page is called", which is what
 * lets the chip keep following renames. Merging the two here into one display
 * string was the first cut and it is why the Link text box did nothing: the
 * chip looks its target up live, so a label that merely repeated the name was
 * indistinguishable from one she chose and had to be ignored.
 */
export type NewPageLink = { nodeId: string; name: string; linkText: string };
type PendingNewPageLink = NewPageLinkPrefill & { resolve: (link: NewPageLink | null) => void };

type DialogStoreState = {
  pendingConfirm: PendingConfirm | null;
  requestConfirm: (message: string) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;
  exportRequest: ExportRequest | null;
  requestExport: (rootIds: string[]) => void;
  closeExport: () => void;
  notice: Notice | null;
  showNotice: (message: string) => void;
  dismissNotice: () => void;
  pendingTemplateScope: PendingTemplateScope | null;
  requestTemplateScope: (pageName: string) => Promise<TemplateScope | null>;
  resolveTemplateScope: (scope: TemplateScope | null) => void;
  /**
   * Which page's earlier versions are being looked at, or null (Phase 19).
   *
   * Here rather than passed down for the same reason the export request is:
   * it is raised from a tree row's menu, and react-arborist renders those
   * rows itself — there is no props path from the app root to one.
   */
  historyNodeId: string | null;
  openHistory: (nodeId: string) => void;
  closeHistory: () => void;
  /**
   * Whether the tree's own earlier versions are being looked at (Phase 19).
   *
   * A flag rather than an id because there is only one `project.json`. It lives
   * beside `historyNodeId` and not inside it so the two dialogs can never both
   * be open, and so neither has to encode "the project" as a fake node id.
   */
  isProjectHistoryOpen: boolean;
  openProjectHistory: () => void;
  closeProjectHistory: () => void;
  pendingAssetPick: PendingAssetPick | null;
  requestAssetPick: (title: string) => Promise<string | null>;
  resolveAssetPick: (fileName: string | null) => void;
  pendingNewPageLink: PendingNewPageLink | null;
  requestNewPageLink: (prefill: NewPageLinkPrefill) => Promise<NewPageLink | null>;
  resolveNewPageLink: (link: NewPageLink | null) => void;
};

export const useDialogStore = create<DialogStoreState>((set, get) => ({
  pendingConfirm: null,
  exportRequest: null,
  notice: null,
  pendingTemplateScope: null,
  pendingAssetPick: null,
  pendingNewPageLink: null,
  historyNodeId: null,
  isProjectHistoryOpen: false,

  requestAssetPick(title) {
    return new Promise<string | null>((resolve) => {
      set({ pendingAssetPick: { title, resolve } });
    });
  },

  openHistory(nodeId) {
    set({ historyNodeId: nodeId });
  },

  closeHistory() {
    set({ historyNodeId: null });
  },

  openProjectHistory() {
    set({ isProjectHistoryOpen: true, historyNodeId: null });
  },

  closeProjectHistory() {
    set({ isProjectHistoryOpen: false });
  },

  resolveAssetPick(fileName) {
    const pending = get().pendingAssetPick;
    if (!pending) return;
    set({ pendingAssetPick: null });
    pending.resolve(fileName);
  },

  requestNewPageLink(prefill) {
    return new Promise<NewPageLink | null>((resolve) => {
      set({ pendingNewPageLink: { ...prefill, resolve } });
    });
  },

  resolveNewPageLink(link) {
    const pending = get().pendingNewPageLink;
    if (!pending) return;
    set({ pendingNewPageLink: null });
    pending.resolve(link);
  },

  requestTemplateScope(pageName) {
    return new Promise<TemplateScope | null>((resolve) => {
      set({ pendingTemplateScope: { pageName, resolve } });
    });
  },

  resolveTemplateScope(scope) {
    const pending = get().pendingTemplateScope;
    if (!pending) return;
    set({ pendingTemplateScope: null });
    pending.resolve(scope);
  },

  showNotice(message) {
    set({ notice: { message } });
  },

  dismissNotice() {
    set({ notice: null });
  },

  requestExport(rootIds) {
    set({ exportRequest: { rootIds } });
  },

  closeExport() {
    set({ exportRequest: null });
  },

  requestConfirm(message) {
    return new Promise<boolean>((resolve) => {
      set({ pendingConfirm: { message, resolve } });
    });
  },

  resolveConfirm(ok) {
    const pending = get().pendingConfirm;
    if (!pending) return;
    set({ pendingConfirm: null });
    pending.resolve(ok);
  },
}));
