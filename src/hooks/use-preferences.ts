// The only import path components have into preferences-store.ts. See
// CLAUDE.md's layer order — components never import stores directly.
import { useShallow } from "zustand/react/shallow";
import { usePreferencesStore } from "../state/preferences-store";
import type { TreeDoubleClickAction } from "../services/preferences-service";

/**
 * Selected down to the one field rather than the whole preferences object,
 * because the caller is `TreeItem` — one instance per visible row. A component
 * that renders per row subscribes to as little as it can; see the note at the
 * top of TreeItem about what a broad subscription costs there.
 */
export function useTreeDoubleClick(): TreeDoubleClickAction {
  return usePreferencesStore((state) => state.preferences.treeDoubleClick);
}

export function usePreferenceActions() {
  return usePreferencesStore(
    useShallow((state) => ({
      setTreeDoubleClick: state.setTreeDoubleClick,
    })),
  );
}

/** Reads the saved preferences at startup. See StartupRouter. */
export function useLoadPreferences(): () => Promise<void> {
  return usePreferencesStore((state) => state.loadPreferences);
}
