// Applying a template whose pages are named after the page they land in —
// and asking for that page's name first when it has none yet.
//
// The plugin this was modelled on takes the folder's name, then the preset,
// then makes everything, so nothing is ever named after an unnamed parent.
// Ours runs the other way round — a page made from the grid is added blank,
// filled, and named last — which is exactly how the children would land under
// "Untitled_Pics". So for this one kind of template, and only while the page
// is still "Untitled", the name is asked for before the template is poured
// in. Both halves record for themselves; folded so it is one press of undo.
import { useCallback } from "react";
import { UNTITLED_PAGE_NAME } from "../constants/schema";
import { describeAddedChildren } from "../services/child-naming";
import { useDialogStore } from "../state/dialog-store";
import { useHistoryStore } from "../state/history-store";
import { useProjectStore } from "../state/project-store";

export function useNamedTemplate() {
  const applyCustomTemplate = useCallback(async (nodeId: string, templateRootId: string) => {
    const { nodes, templates, renameNode, applyCustomTemplate: apply } = useProjectStore.getState();
    const page = nodes[nodeId];
    const template = templates.nodes[templateRootId];
    if (!page || !template) return;

    const asksFirst = template.namesChildren !== undefined && page.name === UNTITLED_PAGE_NAME;
    if (!asksFirst) {
      await apply(nodeId, templateRootId);
      return;
    }

    const name = await useDialogStore.getState().requestName({
      title: "What Is This Page Called?",
      message: `The "${template.name}" template names the pages inside after this one, so it needs the name first.`,
      initial: "",
    });
    if (name === null) return;

    const depth = useHistoryStore.getState().past.length;
    await renameNode(nodeId, name);
    await apply(nodeId, templateRootId);
    useHistoryStore.getState().collapse(depth, `making "${name}" from the "${template.name}" template`);
  }, []);

  /** The right-click route: the template's pages inside a page that exists, and a line saying how many. */
  const addTemplatePages = useCallback(async (nodeId: string, templateRootId: string) => {
    const { nodes, addTemplatePages: add } = useProjectStore.getState();
    const page = nodes[nodeId];
    if (!page) return;
    const result = await add(nodeId, templateRootId);
    if (!result) return;
    useDialogStore.getState().showNotice(describeAddedChildren(page.name, result.made, result.skipped));
  }, []);

  return { applyCustomTemplate, addTemplatePages };
}
