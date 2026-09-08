// Which graph is open over the app, if any. Phase 24, step 3.
//
// **Its own store rather than state inside PageView**, for the reason
// lightbox-store gives about itself: it is opened from two unrelated places
// with no props path between them. One is the button beside a page's name; the
// other is the rail, which sits outside the page entirely and has no idea which
// page is open. Threading a callback from the app's root down through the
// layout into the title row, so that a button in a different column could reach
// it, is a prop drilled past four components that have nothing to do with it.
//
// It asks nothing and resolves nothing, which is the other half of that store's
// reasoning — a modal owing a promise an answer belongs in dialog-store; this
// is a thing that is either up or not.
import { create } from "zustand";

/**
 * The graph currently up.
 *
 * `focusId` null is the whole universe — no centre, nothing pinned, every page
 * drawn. It is not a missing value: the two doors into the graph differ by
 * exactly this, and the null is what one of them means.
 */
export type OpenGraph = { focusId: string | null };

type GraphStoreState = {
  open: OpenGraph | null;
  /** One page's surroundings, from the button beside its name. */
  openPageGraph: (focusId: string) => void;
  /** The whole of the universe the tree is showing, from the rail. */
  openWorldGraph: () => void;
  closeGraph: () => void;
};

export const useGraphStore = create<GraphStoreState>((set) => ({
  // Null *is* the closed state. A separate `isOpen` flag would be a second
  // source of truth that can disagree with the thing it describes — the same
  // note lightbox-store makes about its empty list.
  open: null,

  openPageGraph(focusId) {
    set({ open: { focusId } });
  },

  openWorldGraph() {
    set({ open: { focusId: null } });
  },

  closeGraph() {
    set({ open: null });
  },
}));
