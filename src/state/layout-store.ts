// How wide the two side panels are. A store rather than component state
// because the drag handles live inside the panels and the widths are applied
// by the grid that contains them, so the two ends of a drag are in different
// components.
import { create } from "zustand";
import * as appSettings from "../services/app-settings-service";
import {
  clampPropertiesWidth,
  clampRailWidth,
  clampTreeWidth,
  DEFAULT_PANEL_WIDTHS,
  parsePanelWidths,
  type PanelWidths,
} from "../services/layout-service";

/**
 * How long after the last change the widths are written.
 *
 * The lesson from Phase 12's colour pickers, applied before it could be
 * repeated: **the thing that shows a change and the thing that records it are
 * different jobs.** A drag fires on every frame, and a disk write per frame is
 * both wasteful and slower than the drag. The grid updates immediately; the
 * file catches up when the mouse stops.
 */
const SAVE_DELAY_MS = 400;

export type LayoutStoreState = {
  widths: PanelWidths;
  /** Called once at startup. See StartupRouter. */
  loadPanelWidths: () => Promise<void>;
  setTreeWidth: (width: number) => void;
  setPropertiesWidth: (width: number) => void;
  setRailWidth: (width: number) => void;
  /** The shell's two, not all three — see the reset note below. */
  resetPanelWidths: () => void;
  resetRailWidth: () => void;
};

export const useLayoutStore = create<LayoutStoreState>((set, get) => {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const applyWidths = (widths: PanelWidths) => {
    set({ widths });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      // Deliberately unhandled beyond this: a settings file that won't write
      // costs the user a panel width, and there is nothing useful to say about
      // it in the middle of a drag. It retries on the next one.
      void appSettings.setPanelWidths(get().widths).catch(() => {});
    }, SAVE_DELAY_MS);
  };

  return {
    widths: DEFAULT_PANEL_WIDTHS,

    // A settings file that won't open must not cost the user a usable window,
    // so a failure here leaves the defaults in place — which is also exactly
    // what a first run looks like. Same shape as loadBindings.
    async loadPanelWidths() {
      try {
        set({ widths: parsePanelWidths(await appSettings.getPanelWidths()) });
      } catch {
        set({ widths: DEFAULT_PANEL_WIDTHS });
      }
    },

    setTreeWidth(width) {
      applyWidths({ ...get().widths, tree: clampTreeWidth(width) });
    },

    setPropertiesWidth(width) {
      applyWidths({ ...get().widths, properties: clampPropertiesWidth(width) });
    },

    setRailWidth(width) {
      applyWidths({ ...get().widths, rail: clampRailWidth(width) });
    },

    // Two resets rather than one, because a reset is a double-click on a
    // handle and it should put back what the person can see. The shell and the
    // start screen never share a window, so a reset on either used to silently
    // reach across and undo a width on the other.
    resetPanelWidths() {
      applyWidths({
        ...get().widths,
        tree: DEFAULT_PANEL_WIDTHS.tree,
        properties: DEFAULT_PANEL_WIDTHS.properties,
      });
    },

    resetRailWidth() {
      applyWidths({ ...get().widths, rail: DEFAULT_PANEL_WIDTHS.rail });
    },
  };
});
