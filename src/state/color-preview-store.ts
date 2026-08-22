// The colour something is *about* to be. Phase 18c.
//
// **A preview must not go through the project store.** Recolouring a block
// looked cheap — `updateNode` sets state and debounces its own save — but it
// replaces the whole `nodes` record, and that record is what `link-index` and
// `search-service` key their caches on. So one pointer move inside the system
// colour dialog re-walks every page of prose in the world, and a drag through
// the purples does it a hundred times. That is the lag, and it only shows up
// in a real project: a probe with one page has nothing to re-walk.
//
// So a live colour lands here instead. One tiny store, read by exactly the two
// components that draw an accent, so a preview re-renders those and nothing
// else. The real edit happens once, when the dialog closes.
import { create } from "zustand";

type ColorPreviewState = {
  /** What is being previewed: a block id, or a meter reading's id. */
  targetId: string | null;
  /** A hex, or null when nothing is being previewed. */
  color: string | null;
  preview: (targetId: string, color: string) => void;
  clear: () => void;
};

export const useColorPreviewStore = create<ColorPreviewState>((set) => ({
  targetId: null,
  color: null,
  preview: (targetId, color) => set({ targetId, color }),
  clear: () => set({ targetId: null, color: null }),
}));
