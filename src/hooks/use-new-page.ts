// Creating a page from the keyboard rather than from a "+" button, which is
// the only reason this needs its own answer to "where does it go".
import { useCallback } from "react";
import { useProjectStore } from "../state/project-store";
import { getTemplate } from "../services/template-registry";

/**
 * Adds a page **alongside** whatever's currently open — same parent, so Cmd+N
 * on a character makes another character in the same folder — and selects it.
 * A row's own "+" button already covers "child of this one"; this is the other
 * half, and the one there was no way to reach without the mouse.
 *
 * With nothing selected it lands at the top level.
 *
 * Reads the store through `getState()` instead of subscribing, so the returned
 * callback keeps its identity forever. `useGlobalShortcuts` needs that — see
 * its doc comment.
 */
export function useCreatePage(): (templateKey: string) => void {
  return useCallback((templateKey: string) => {
    const { project, nodes, addNode, selectNode } = useProjectStore.getState();
    if (!project) return;

    const selected = project.selectedId ? nodes[project.selectedId] : undefined;
    const label = getTemplate(templateKey)?.label ?? templateKey;
    const node = addNode({ parentId: selected?.parentId ?? null, templateKey, name: `New ${label}` });

    // Selecting it is what makes the shortcut worth having: the new page opens,
    // rather than appearing somewhere in the tree for the user to go and find.
    // TreePanel expands the ancestors and scrolls to the row off the back of
    // the selection change.
    selectNode(node.id);
  }, []);
}
