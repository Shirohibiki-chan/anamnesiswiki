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
// needing an effect to reset it.
export function PageView() {
  const { project, nodes, updateTabContent, toggleTabHidden, addTab, renameTab, deleteTab, reorderTabs } = useProject();
  const selectedId = project?.selectedId ?? null;
  const node = selectedId ? nodes[selectedId] : undefined;

  const [activeTabId, setActiveTabId] = useState<string | null>(node?.tabs[0]?.id ?? null);

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
