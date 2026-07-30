// Three-column app frame — left tree / center page / right properties.
// Tree, page, and properties content are placeholders until Phases 3, 4, 6.
import { useState } from "react";
import { useProject } from "../../hooks/use-project";
import { useAppSettings } from "../../hooks/use-app-settings";
import { TopBar } from "./TopBar";
import "./shell.css";

export function AppLayout() {
  const { project, nodes, closeProject } = useProject();
  const { clearLastOpenedProject } = useAppSettings();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  const nodeCount = Object.keys(nodes).length;

  async function handleSwitchProject() {
    await clearLastOpenedProject();
    closeProject();
  }

  return (
    <div className={`app-layout${isRightPanelOpen ? "" : " app-layout-properties-collapsed"}`}>
      <aside className="app-layout-tree">
        <div className="app-layout-placeholder">
          <p>Tree view arrives in Phase 3.</p>
          <p className="app-layout-placeholder-sub">
            {nodeCount} node{nodeCount === 1 ? "" : "s"} in this project so far.
          </p>
        </div>
      </aside>

      <div className="app-layout-center">
        <TopBar
          projectName={project?.name ?? "Untitled Project"}
          isRightPanelOpen={isRightPanelOpen}
          onToggleRightPanel={() => setIsRightPanelOpen((open) => !open)}
          onSwitchProject={() => void handleSwitchProject()}
        />
        <main className="app-layout-page">
          <div className="app-layout-placeholder">
            <p>The page view arrives in Phase 4.</p>
            <p className="app-layout-placeholder-sub">Once the tree exists, selecting a page will show it here.</p>
          </div>
        </main>
      </div>

      {isRightPanelOpen && (
        <aside className="app-layout-properties">
          <div className="app-layout-placeholder">
            <p>Properties panel arrives in Phase 6.</p>
          </div>
        </aside>
      )}
    </div>
  );
}
