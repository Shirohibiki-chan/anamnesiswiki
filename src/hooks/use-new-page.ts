// Every route to "make me a new page" lands here. There's only one kind of new
// page now — a blank one — because picking a template happens *on* the page
// once it exists (see components/page/NewPageLanding.tsx) rather than in a
// popover beforehand. So these hooks answer the only question left: where does
// it go, and what gets opened afterwards.
//
// Both read the store through `getState()` instead of subscribing, so the
// returned callbacks keep their identity forever. `useGlobalShortcuts` needs
// that for the keyboard route — see its doc comment — and the tree's "+"
// button is rendered once per visible row, where a subscription would re-render
// every row on every keystroke typed into the editor.
import { useCallback } from "react";
import { BLANK_TEMPLATE_KEY, UNTITLED_PAGE_NAME } from "../constants/schema";
import { useProjectStore } from "../state/project-store";

/**
 * Adds a blank page **inside** the given parent — `null` for the top level —
 * and opens it. Returns the new page's id so the caller can do whatever else
 * its own surface needs (the tree expands the parent row, for instance).
 */
export function useCreatePageIn(): (parentId: string | null) => string | null {
  return useCallback((parentId: string | null) => {
    const { project, addNode, selectNode, requestRename } = useProjectStore.getState();
    if (!project) return null;

    const node = addNode({ parentId, templateKey: BLANK_TEMPLATE_KEY, name: UNTITLED_PAGE_NAME });
    // Before the selection, not after: opening the page is what mounts the
    // title, and the title reads "am I being named?" once, at mount. Asking
    // afterwards would only land because React happens to batch the two
    // updates into one render — true today, and not something a rename should
    // quietly depend on. Selecting the page the request names keeps it (see
    // the store's applySelection); everything else clears it.
    //
    // This is the only place the request is made. A page is worth interrupting
    // for exactly once, when it's a second old and still called "Untitled".
    requestRename(node.id);
    // Opening it is the point: the new page is empty and unnamed, so leaving
    // it sitting in the tree for the user to go and find would mean creating a
    // page and then having to work out which one it was.
    selectNode(node.id);
    return node.id;
  }, []);
}

/**
 * Adds a blank page **alongside** whatever's currently open — same parent, so
 * the keyboard shortcut on a character makes another page in the same folder.
 * The tree's own "+" covers "inside this one"; this is the other half, and the
 * one there was no way to reach without the mouse.
 *
 * With nothing selected it lands at the top level.
 */
export function useCreatePage(): () => void {
  const createPageIn = useCreatePageIn();
  return useCallback(() => {
    const { project, nodes } = useProjectStore.getState();
    if (!project) return;
    const selected = project.selectedId ? nodes[project.selectedId] : undefined;
    createPageIn(selected?.parentId ?? null);
  }, [createPageIn]);
}
