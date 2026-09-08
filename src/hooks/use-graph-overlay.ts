// The only import path components have into graph-store.ts. See CLAUDE.md's
// layer order — components never import stores directly.
import { useShallow } from "zustand/react/shallow";
import { useGraphStore, type OpenGraph } from "../state/graph-store";

/** The graph currently up, or null. */
export function useOpenGraph(): OpenGraph | null {
  return useGraphStore((state) => state.open);
}

/**
 * The two doors and the way out.
 *
 * Selected as actions alone rather than off the whole store: the callers are a
 * rail button and a page's title row, and neither should re-render because a
 * graph opened somewhere else in the app.
 */
export function useGraphOverlayActions() {
  return useGraphStore(
    useShallow((state) => ({
      openPageGraph: state.openPageGraph,
      openWorldGraph: state.openWorldGraph,
      closeGraph: state.closeGraph,
    })),
  );
}
