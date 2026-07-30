// Three-column app frame — left tree / center page / right properties.
// Page and properties content are still placeholders until Phases 4 and 6.
import { useState } from "react";
import { useProject } from "../../hooks/use-project";
import { useAppSettings } from "../../hooks/use-app-settings";
import { TreeSidebar } from "../tree/TreeSidebar";
import { TopBar } from "./TopBar";
import "./shell.css";

export function AppLayout() {
  const { project, closeProject } = useProject();
  const { clearLastOpenedProject } = useAppSettings();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  async function handleSwitchProject() {
    await clearLastOpenedProject();
    closeProject();
  }

  return (
    <div className={`app-layout${isRightPanelOpen ? "" : " app-layout-properties-collapsed"}`}>
      <aside className="app-layout-tree">
        <TreeSidebar />
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
