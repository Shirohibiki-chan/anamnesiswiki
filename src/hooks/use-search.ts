// The only import path components have into search-service.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { useMemo } from "react";
import { useProjectStore } from "../state/project-store";
import { getAncestorChain } from "../services/tree-service";
import { searchProject, type SearchResult } from "../services/search-service";

export type SearchRow = SearchResult & {
  name: string;
  templateKey: string;
  /** Names of the folders above this page, outermost first. */
  path: string[];
};

/**
 * Search results with everything a row needs to render already attached, so
 * the palette never reaches for the node graph itself.
 *
 * Memoised on the query and the node map together: the map is replaced on every
 * keystroke *into a page*, but stands still while someone types into the search
 * box, which is the only time this runs.
 */
export function useSearchResults(query: string): SearchRow[] {
  const nodes = useProjectStore((state) => state.nodes);

  return useMemo(
    () =>
      searchProject(nodes, query).map((result) => {
        const node = nodes[result.nodeId];
        return {
          ...result,
          name: node.name,
          templateKey: node.templateKey,
          path: getAncestorChain(result.nodeId, nodes).map((ancestor) => ancestor.name),
        };
      }),
    [nodes, query],
  );
}
