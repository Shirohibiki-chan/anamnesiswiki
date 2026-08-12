// Editing the template that's open, as opposed to editing a page.
//
// This is where the two records meet. `TemplateView` renders the same title,
// tab strip and editor a page gets, but every change has to land in the store's
// `templates` record instead of `nodes` — so the handlers are composed here,
// out of the pure transforms in tab-service.ts and the store's single
// `updateTemplateNode`.
//
// Why not six more store actions: they'd each be "read the node, transform its
// tabs, write it back", which is exactly what the page-side six already are.
// The transforms are shared; only the record differs, and that difference is
// one argument.
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useProjectStore } from "../state/project-store";
import {
  withTabAdded,
  withTabContent,
  withTabDeleted,
  withTabHiddenToggled,
  withTabRenamed,
  withTabsReordered,
} from "../services/tab-service";
import type { BlockNoteDocument, Node, Tab } from "../constants/schema";

/** The template currently open for editing, or undefined. */
export function useOpenTemplate(): Node | undefined {
  return useProjectStore((state) => (state.openTemplateId ? state.templates.nodes[state.openTemplateId] : undefined));
}

export function useOpenTemplateId(): string | null {
  return useProjectStore((state) => state.openTemplateId);
}

export function useTemplateActions() {
  return useProjectStore(
    useShallow((state) => ({
      openTemplate: state.openTemplate,
      updateTemplateNode: state.updateTemplateNode,
      deleteTemplate: state.deleteTemplate,
    })),
  );
}

/**
 * The page-editing callbacks, pointed at a template.
 *
 * Every handler re-reads the node from the store rather than closing over the
 * one it was built with: these are held across renders by a memo, and a stale
 * `tabs` array would write back the tabs as they were when the handler was
 * made, undoing whatever happened in between.
 */
export function useTemplateEditing(templateNodeId: string | null) {
  const updateTemplateNode = useProjectStore((state) => state.updateTemplateNode);

  return useMemo(() => {
    const read = (): Node | undefined => {
      const state = useProjectStore.getState();
      return templateNodeId ? state.templates.nodes[templateNodeId] : undefined;
    };

    const writeTabs = (tabs: Tab[]) => {
      if (templateNodeId) updateTemplateNode(templateNodeId, { tabs });
    };

    return {
      rename(name: string) {
        if (templateNodeId) updateTemplateNode(templateNodeId, { name });
      },

      updateTabContent(tabId: string, content: BlockNoteDocument) {
        const node = read();
        if (node) writeTabs(withTabContent(node.tabs, tabId, content));
      },

      toggleTabHidden(tabId: string) {
        const node = read();
        if (node) writeTabs(withTabHiddenToggled(node.tabs, tabId));
      },

      renameTab(tabId: string, label: string) {
        const node = read();
        if (node) writeTabs(withTabRenamed(node.tabs, tabId, label));
      },

      deleteTab(tabId: string) {
        const node = read();
        if (node) writeTabs(withTabDeleted(node.tabs, tabId));
      },

      addTab(label: string): Tab | undefined {
        const node = read();
        if (!node) return undefined;
        const { tabs, tab } = withTabAdded(node.tabs, crypto.randomUUID(), label);
        writeTabs(tabs);
        return tab;
      },

      reorderTabs(orderedTabIds: string[]) {
        const node = read();
        if (!node) return;
        // Null means the order didn't describe these exact tabs — see
        // tab-service. Writing it would drop one and everything written in it.
        const tabs = withTabsReordered(node.tabs, orderedTabIds);
        if (tabs) writeTabs(tabs);
      },
    };
  }, [templateNodeId, updateTemplateNode]);
}
