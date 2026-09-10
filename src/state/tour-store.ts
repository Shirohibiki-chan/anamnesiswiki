// Whether the short tour is running, and which step it is on. Phase 26, step 2.
// Never imported directly by components; use hooks/use-tour.ts.
//
// **A store rather than state inside the layout**, because two unrelated places
// start this: the first run of a world that has never seen it, and — once
// there is a door back to it — a person asking for it again. Both would
// otherwise have to reach into whichever component happened to own the state.
//
// It does not know what the steps are or where they are drawn. `stepCount` is
// handed in when the tour starts, because which steps exist is a question about
// what is on screen at that moment (see `availableSteps`) rather than a
// constant.
import { create } from "zustand";
import { setTourSeen } from "../services/app-settings-service";

export type TourStoreState = {
  isRunning: boolean;
  /** Index into the steps that were available when the tour started. */
  at: number;
  stepCount: number;
  start: (stepCount: number) => void;
  next: () => void;
  back: () => void;
  /**
   * Leaving, however it happened — finishing the last step, pressing Escape, or
   * skipping from the first. All three mean the same thing to the setting: it
   * has been offered and does not need offering again.
   */
  finish: () => void;
};

export const useTourStore = create<TourStoreState>((set, get) => ({
  isRunning: false,
  at: 0,
  stepCount: 0,

  start(stepCount) {
    // Nothing to point at is not a tour. Better to leave the setting alone and
    // let it be offered next time than to burn it on a window that had no
    // panels open.
    if (stepCount <= 0) return;
    set({ isRunning: true, at: 0, stepCount });
  },

  next() {
    const { at, stepCount } = get();
    if (at + 1 >= stepCount) {
      get().finish();
      return;
    }
    set({ at: at + 1 });
  },

  back() {
    set({ at: Math.max(0, get().at - 1) });
  },

  finish() {
    set({ isRunning: false, at: 0 });
    // Fire and forget: the tour closing must not wait on a disk write, and a
    // failure here costs somebody being offered it once more.
    void setTourSeen(true);
  },
}));
