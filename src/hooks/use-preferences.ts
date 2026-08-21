// The only import path components have into preferences-store.ts. See
// CLAUDE.md's layer order — components never import stores directly.
import { useShallow } from "zustand/react/shallow";
import { usePreferencesStore } from "../state/preferences-store";
import type { ListPageSize, ListPagingMode, ProjectSort, ProjectView, TreeDoubleClickAction } from "../services/preferences-service";

/**
 * Selected down to the one field rather than the whole preferences object,
 * because the caller is `TreeItem` — one instance per visible row. A component
 * that renders per row subscribes to as little as it can; see the note at the
 * top of TreeItem about what a broad subscription costs there.
 */
export function useTreeDoubleClick(): TreeDoubleClickAction {
  return usePreferencesStore((state) => state.preferences.treeDoubleClick);
}

/**
 * Whether a long grid comes in pages or one scroll. Read by every grid that
 * can be long enough to need the answer — the projects on the start screen,
 * the pictures in the asset picker.
 */
export function useListPaging(): ListPagingMode {
  return usePreferencesStore((state) => state.preferences.listPaging);
}

/**
 * How many things one page holds. Read by the same grids `useListPaging` is,
 * and meaningless while that says `scroll` — there are no pages to size.
 */
export function useListPageSize(): ListPageSize {
  return usePreferencesStore((state) => state.preferences.listPageSize);
}

/** Covers or rows on the start screen. Its control is on that screen, not in settings. */
export function useProjectView(): ProjectView {
  return usePreferencesStore((state) => state.preferences.projectView);
}

/** What order that screen lists them in. Its control sits beside the view toggle. */
export function useProjectSort(): ProjectSort {
  return usePreferencesStore((state) => state.preferences.projectSort);
}

export function usePreferenceActions() {
  return usePreferencesStore(
    useShallow((state) => ({
      setTreeDoubleClick: state.setTreeDoubleClick,
      setListPaging: state.setListPaging,
      setListPageSize: state.setListPageSize,
      setProjectView: state.setProjectView,
      setProjectSort: state.setProjectSort,
    })),
  );
}

/** Reads the saved preferences at startup. See StartupRouter. */
export function useLoadPreferences(): () => Promise<void> {
  return usePreferencesStore((state) => state.loadPreferences);
}
