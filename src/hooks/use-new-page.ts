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
import { BLANK_TEMPLATE_KEY, UNIVERSE_TEMPLATE_KEY, UNTITLED_PAGE_NAME } from "../constants/schema";
import { getTemplate } from "../services/template-registry";
import { useHistoryStore } from "../state/history-store";
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
 * Makes a new, empty universe at the root and opens it for naming (Phase 22).
 *
 * **The view goes back to all universes first, and that is the whole subtlety
 * here.** A new universe is a top-level page, so making one from inside another
 * universe's view would put it somewhere the tree is not currently showing —
 * and the inline rename that follows would be aimed at a row that isn't
 * rendered, which reads as the button making nothing at all. Landing on all
 * universes puts the new one on screen among the others, which is also where
 * you want to be while deciding what to call it.
 *
 * Named "Untitled" like any other new page rather than "New universe": the
 * rename prompt opens on it immediately, and a name that looks deliberate is
 * one people leave alone.
 */
export function useCreateUniverse(): () => string | null {
  return useCallback(() => {
    const { project, addNode, selectNode, requestRename, setSelectedUniverse } = useProjectStore.getState();
    if (!project) return null;

    setSelectedUniverse(null);
    const node = addNode({ parentId: null, templateKey: UNIVERSE_TEMPLATE_KEY, name: UNTITLED_PAGE_NAME });
    // Same order as `useCreatePageIn` and for the same reason — the title asks
    // "am I being named?" once, at mount.
    requestRename(node.id);
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

/**
 * Adds a named page and **leaves you where you are** — for the dialog that
 * makes a page and links to it from the middle of a sentence (Phase 19.5).
 *
 * **The one route to a new page that must not open it.** Every other one is
 * "go and write this now", so they select the page and ask for its name. This
 * one is the opposite: the page is a link in something she is in the middle of
 * writing, and being thrown onto a blank page mid-sentence is the feature
 * taking her work away rather than saving her a trip. It is named already, too
 * — she typed the name into the dialog — so there is nothing to ask.
 *
 * Blank, like every other new page: a template is picked on the page itself
 * once she goes there (see `NewPageLanding`).
 *
 * Hiding folds into the same undo entry as the creation, because they are one
 * action from the outside. Two presses of undo to take back one dialog would
 * leave a hidden page nobody asked for sitting in the tree after the first.
 */
export function useCreateLinkedPage(): (input: {
  name: string;
  parentId: string | null;
  hidden: boolean;
}) => string | null {
  return useCallback(({ name, parentId, hidden }) => {
    const { project, addNode, setNodeHidden } = useProjectStore.getState();
    if (!project) return null;

    const depth = useHistoryStore.getState().past.length;
    const node = addNode({ parentId, templateKey: BLANK_TEMPLATE_KEY, name: name.trim() || UNTITLED_PAGE_NAME });
    if (hidden) {
      setNodeHidden([node.id], true);
      useHistoryStore.getState().collapse(depth, `making the page ${node.name}`);
    }
    return node.id;
  }, []);
}

/** What a page is being made from: one of the built-in kinds, or one of this
 *  world's own templates. */
export type NewPageTemplate = { builtInKey: string } | { templateRootId: string };

/**
 * Adds a page made from a template and opens it, ready to be named.
 *
 * **At the top level, always.** Every other route to a new page has something
 * on screen that means "here" — the tree row whose "+" was pressed, the page
 * the keyboard shortcut was pressed on. This one is pressed in the Templates
 * tab, where the tree isn't drawn and nothing on screen is a place, so the one
 * answer that can't surprise anyone is the top of the tree. The page opens and
 * asks for its name straight away, so where it landed is visible rather than
 * something to go and find.
 *
 * **Blank first, then the template poured in**, rather than a page built from
 * the template up front. Applying is where this world's own version of a
 * built-in is preferred over the shipped one, where a template's pictures get
 * their own copies, and where the pages saved inside it arrive — a second path
 * to all of that is the one that drifts out of step. It's also exactly the two
 * steps the new-page screen takes, so this is a shortcut through a road that's
 * already driven daily rather than a new one.
 */
export function useCreatePageFromTemplate(): (template: NewPageTemplate) => Promise<string | null> {
  return useCallback(async (template: NewPageTemplate) => {
    const { project, templates, addNode, applyTemplate, applyCustomTemplate, selectNode, requestRename } =
      useProjectStore.getState();
    if (!project) return null;

    const label =
      "builtInKey" in template
        ? (getTemplate(template.builtInKey)?.label ?? "")
        : (templates.nodes[template.templateRootId]?.name ?? "");
    if (!label) return null;

    // Read before either half runs, so what gets folded below is exactly what
    // this made. Both halves record for themselves, which is right when
    // they're used on their own and two presses of undo when they're used
    // together — see history-service's collapseSince.
    const depth = useHistoryStore.getState().past.length;

    const node = addNode({ parentId: null, templateKey: BLANK_TEMPLATE_KEY, name: UNTITLED_PAGE_NAME });
    if ("builtInKey" in template) await applyTemplate(node.id, template.builtInKey);
    else await applyCustomTemplate(node.id, template.templateRootId);
    useHistoryStore.getState().collapse(depth, `making a page from the ${label} template`);

    // Same order and the same reason as useCreatePageIn: the rename is asked
    // for before the selection that opens the page, because the title only
    // asks whether it's being named once, at mount.
    requestRename(node.id);
    selectNode(node.id);
    return node.id;
  }, []);
}
