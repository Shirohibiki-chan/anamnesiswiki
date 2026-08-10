// Three-column app frame — left tree / center page / right properties.
import { useCallback, useState } from "react";
import { useProject, useSaveNow } from "../../hooks/use-project";
import { useAppSettings } from "../../hooks/use-app-settings";
import { useDialogs } from "../../hooks/use-dialogs";
import { useHistoryActions } from "../../hooks/use-history";
import { useNavigationActions } from "../../hooks/use-navigation";
import { ExportModal } from "../export/ExportModal";
import { SearchPalette } from "../search/SearchPalette";
import { useGlobalShortcuts } from "../../hooks/use-global-shortcuts";
import { useSaveOnExit } from "../../hooks/use-save-on-exit";
import { TreeSidebar } from "../tree/TreeSidebar";
import { PageView } from "../page/PageView";
import { AllPropertiesModal } from "../properties/AllPropertiesModal";
import { PropertiesPanel } from "../properties/PropertiesPanel";
import { LoadWarning } from "./LoadWarning";
import { NewPageDialog } from "./NewPageDialog";
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAllPropertiesOpen, setIsAllPropertiesOpen] = useState(false);
  const [isNewPageOpen, setIsNewPageOpen] = useState(false);
  const saveNow = useSaveNow();
  const { undo, redo } = useHistoryActions();
  // Store actions, so these are stable and the shortcut listener isn't rebuilt.
  const { goBack, goForward, goHome } = useNavigationActions();

  useSaveOnExit();
  // Stable so the shortcut listener is attached once, not rebuilt on every
  // re-render of the shell — see use-global-shortcuts.ts.
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const openNewPage = useCallback(() => setIsNewPageOpen(true), []);
  // Search hands over rather than stacking: two full-screen dialogs on top of
  // each other is two Escapes to get out of one mistake.
  const openAllProperties = useCallback(() => {
    setIsSearchOpen(false);
    setIsAllPropertiesOpen(true);
  }, []);
  const handleSave = useCallback(() => void saveNow(), [saveNow]);
  useGlobalShortcuts({
    onSearch: openSearch,
    onAllProperties: openAllProperties,
    onNewPage: openNewPage,
    onSave: handleSave,
    onUndo: undo,
    onRedo: redo,
    onNavigateBack: goBack,
    onNavigateForward: goForward,
    onNavigateHome: goHome,
  });

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
          isRightPanelOpen={isRightPanelOpen}
          onToggleRightPanel={() => setIsRightPanelOpen((open) => !open)}
          onSwitchProject={() => void handleSwitchProject()}
          onOpenSearch={openSearch}
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

      {exportRequest && <ExportModal rootIds={exportRequest.rootIds} onClose={closeExport} />}
      {isSearchOpen && <SearchPalette onClose={() => setIsSearchOpen(false)} onOpenAllProperties={openAllProperties} />}
      {isAllPropertiesOpen && <AllPropertiesModal onClose={() => setIsAllPropertiesOpen(false)} />}
      {isNewPageOpen && <NewPageDialog onClose={() => setIsNewPageOpen(false)} />}
    </div>
  );
}
