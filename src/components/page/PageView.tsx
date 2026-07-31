// Center-panel router — folder nodes get FolderView, everything else gets a
// title + tab strip + placeholder body, and no selection gets EmptyPageView.
// See docs/plan.md Phase 4.
import { useState } from "react";
import { FOLDER_TEMPLATE_KEY } from "../../constants/schema";
import { useProject } from "../../hooks/use-project";
import { Editor } from "./Editor";
import { EmptyPageView } from "./EmptyPageView";
import { FolderView } from "./FolderView";
import { PageBanner } from "./PageBanner";
import { PageTabs } from "./PageTabs";
import { PageTitle } from "./PageTitle";
import "./page.css";

// Rendered with `key={node.id}` by AppLayout, so activeTabId's initial value
// (the page's first tab) is recomputed fresh on every node switch without
// needing an effect to reset it. The same remount is what lets a search jump
// land on a specific tab: `pendingFocus` only has to be right at mount, and
// it's matched against this node's id so a leftover from an earlier jump
// can't open the wrong tab on the next page opened.
export function PageView() {
  const { project, nodes, pendingFocus, updateTabContent, toggleTabHidden, addTab, renameTab, deleteTab, reorderTabs } =
    useProject();
  const selectedId = project?.selectedId ?? null;
  const node = selectedId ? nodes[selectedId] : undefined;

  const focusedTabId = pendingFocus && pendingFocus.nodeId === node?.id ? pendingFocus.tabId : undefined;
  const [activeTabId, setActiveTabId] = useState<string | null>(focusedTabId ?? node?.tabs[0]?.id ?? null);

  // The initial value above covers a jump to a *different* page, with no frame
  // spent on the wrong tab. This covers the case the remount can't see: a
  // search hit on the page already open, where selectedId never changes and so
  // nothing remounts. React's documented alternative to a syncing effect —
  // adjust during render, keyed on the value that changed. `pendingFocus` is a
  // fresh object per jump, so asking for the same tab twice still lands.
  const [appliedFocus, setAppliedFocus] = useState(pendingFocus);
  if (pendingFocus !== appliedFocus) {
    setAppliedFocus(pendingFocus);
    if (focusedTabId) setActiveTabId(focusedTabId);
  }

  if (!node) return <EmptyPageView />;
  if (node.templateKey === FOLDER_TEMPLATE_KEY) return <FolderView node={node} />;

  const activeTab = node.tabs.find((tab) => tab.id === activeTabId) ?? node.tabs[0];

  function handleAddTab() {
    const tab = addTab(node!.id, "New Tab");
    setActiveTabId(tab.id);
  }

  return (
    <div className="page-view-shell">
      <PageBanner node={node} />
      <div className="page-view">
        <PageTitle node={node} />
        {node.tabs.length === 0 ? (
          <div className="page-view-no-tabs">
            <p>This page doesn't have any tabs yet.</p>
            <button type="button" className="page-view-add-tab" onClick={handleAddTab}>
              Add a tab
            </button>
          </div>
        ) : (
          <>
            <PageTabs
              tabs={node.tabs}
              activeTabId={activeTab?.id ?? null}
              onSelect={setActiveTabId}
              onToggleHidden={(tabId) => toggleTabHidden(node.id, tabId)}
              onAdd={handleAddTab}
              onRename={(tabId, label) => renameTab(node.id, tabId, label)}
              onDelete={(tabId) => deleteTab(node.id, tabId)}
              onReorder={(orderedTabIds) => reorderTabs(node.id, orderedTabIds)}
            />
            {activeTab && (
              <Editor
                key={activeTab.id}
                nodeId={node.id}
                content={activeTab.content}
                onContentChange={(content) => updateTabContent(node.id, activeTab.id, content)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
