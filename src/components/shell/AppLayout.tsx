// Three-column app frame — left tree / center page / right properties.
import { useState } from "react";
import { useProject } from "../../hooks/use-project";
import { useAppSettings } from "../../hooks/use-app-settings";
import { useDialogs } from "../../hooks/use-dialogs";
import { ExportModal } from "../export/ExportModal";
import { useSaveOnExit } from "../../hooks/use-save-on-exit";
import { TreeSidebar } from "../tree/TreeSidebar";
import { PageView } from "../page/PageView";
import { PropertiesPanel } from "../properties/PropertiesPanel";
import { ConfirmDialog } from "./ConfirmDialog";
import { LoadWarning } from "./LoadWarning";
import { RecoveryNotice } from "./RecoveryNotice";
import { SaveWarning } from "./SaveWarning";
import { TopBar } from "./TopBar";
import "./shell.css";

export function AppLayout() {
  const { project, closeProject } = useProject();
  const { clearLastOpenedProject } = useAppSettings();
  // Raised from a tree row's right-click menu, rendered here — react-arborist
  // owns row rendering, so there's nothing to thread a callback through.
  const { exportRequest, closeExport } = useDialogs();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  useSaveOnExit();

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
        <LoadWarning />
        <RecoveryNotice />
        <SaveWarning />
        <main className="app-layout-page">
          <PageView key={project?.selectedId ?? "none"} />
        </main>
      </div>

      {isRightPanelOpen && (
        <aside className="app-layout-properties">
          <PropertiesPanel key={project?.selectedId ?? "none"} />
        </aside>
      )}

      <ConfirmDialog />
      {exportRequest && <ExportModal rootIds={exportRequest.rootIds} onClose={closeExport} />}
    </div>
  );
}
