// Center-panel router — folder nodes get FolderView, everything else gets a
// title + tab strip + placeholder body, and no selection gets EmptyPageView.
// See docs/plan.md Phase 4.
import { useState } from "react";
import { FOLDER_TEMPLATE_KEY } from "../../constants/schema";
import { useProject } from "../../hooks/use-project";
import { EmptyPageView } from "./EmptyPageView";
import { FolderView } from "./FolderView";
import { PageTabs } from "./PageTabs";
import { PageTitle } from "./PageTitle";
import { PlaceholderEditor } from "./PlaceholderEditor";
import "./page.css";

// Rendered with `key={node.id}` by AppLayout, so activeTabId's initial value
// (the page's first tab) is recomputed fresh on every node switch without
// needing an effect to reset it.
export function PageView() {
  const { project, nodes, updateTabContent, toggleTabHidden } = useProject();
  const selectedId = project?.selectedId ?? null;
  const node = selectedId ? nodes[selectedId] : undefined;

  const [activeTabId, setActiveTabId] = useState<string | null>(node?.tabs[0]?.id ?? null);

  if (!node) return <EmptyPageView />;
  if (node.templateKey === FOLDER_TEMPLATE_KEY) return <FolderView node={node} />;

  const activeTab = node.tabs.find((tab) => tab.id === activeTabId) ?? node.tabs[0];

  return (
    <div className="page-view">
      <PageTitle node={node} />
      {node.tabs.length === 0 ? (
        <p className="page-view-no-tabs">This page doesn't have any tabs yet.</p>
      ) : (
        <>
          <PageTabs
            tabs={node.tabs}
            activeTabId={activeTab?.id ?? null}
            onSelect={setActiveTabId}
            onToggleHidden={(tabId) => toggleTabHidden(node.id, tabId)}
          />
          {activeTab && (
            <PlaceholderEditor
              key={activeTab.id}
              value={typeof activeTab.content[0] === "string" ? activeTab.content[0] : ""}
              onChange={(value) => updateTabContent(node.id, activeTab.id, [value])}
            />
          )}
        </>
      )}
    </div>
  );
}
