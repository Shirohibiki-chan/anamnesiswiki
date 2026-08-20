// The only import path components have into layout-store.ts. See CLAUDE.md's
// layer order — components never import stores directly.
import { useShallow } from "zustand/react/shallow";
import { useLayoutStore } from "../state/layout-store";
import type { PanelWidths } from "../services/layout-service";

export function usePanelWidths(): PanelWidths {
  return useLayoutStore(useShallow((state) => state.widths));
}

/** Store actions, so these are stable and a drag handler never gets rebuilt. */
export function usePanelWidthActions() {
  return useLayoutStore(
    useShallow((state) => ({
      setTreeWidth: state.setTreeWidth,
      setPropertiesWidth: state.setPropertiesWidth,
      resetPanelWidths: state.resetPanelWidths,
    })),
  );
}

/** The start screen's rail. Separate so the shell doesn't carry it around. */
export function useRailWidthActions() {
  return useLayoutStore(
    useShallow((state) => ({
      setRailWidth: state.setRailWidth,
      resetRailWidth: state.resetRailWidth,
    })),
  );
}

/** Reads the saved widths at startup. See StartupRouter. */
export function useLoadPanelWidths(): () => Promise<void> {
  return useLayoutStore((state) => state.loadPanelWidths);
}
