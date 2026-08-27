// Three-column app frame — left tree / center page / right properties.
import { useCallback, useState } from "react";
import { useProject, useProjectRootPath, useSaveNow } from "../../hooks/use-project";
import { useHoldProjectClaim } from "../../hooks/use-project-claim";
import { useAppSettings } from "../../hooks/use-app-settings";
import { useDialogs } from "../../hooks/use-dialogs";
import { useHistoryActions } from "../../hooks/use-history";
import { useNavigationActions } from "../../hooks/use-navigation";
import { useOpenTemplate } from "../../hooks/use-template-editing";
import { usePanelWidthActions, usePanelWidths } from "../../hooks/use-panel-widths";
import {
  CENTER_MIN_WIDTH,
  PROPERTIES_MAX_WIDTH,
  PROPERTIES_MIN_WIDTH,
  TREE_MAX_WIDTH,
  TREE_MIN_WIDTH,
} from "../../constants/layout";
import { fitPanelWidths, maxDraggableWidth } from "../../services/layout-service";
import { useElementSize } from "../../hooks/use-element-size";
import { ResizeHandle } from "./ResizeHandle";
import { ExportModal } from "../export/ExportModal";
import { SearchPalette } from "../search/SearchPalette";
import { useGlobalShortcuts } from "../../hooks/use-global-shortcuts";
import { useCreatePage } from "../../hooks/use-new-page";
import { TreeSidebar } from "../tree/TreeSidebar";
import { PageView } from "../page/PageView";
import { TemplateView } from "../page/TemplateView";
import { AllPropertiesModal } from "../properties/AllPropertiesModal";
import { BlockPanel } from "../blocks/BlockPanel";
import { LoadWarning } from "./LoadWarning";
import { RecoveryNotice } from "./RecoveryNotice";
import { SaveWarning } from "./SaveWarning";
import { TopBar } from "./TopBar";
import "./shell.css";

export function AppLayout() {
  const { project, closeProject } = useProject();
  // This component exists exactly while a project is open, which makes it the
  // honest place to hold the marker that says so — no separate bookkeeping to
  // keep in step, and no path that closes a project without releasing it.
  useHoldProjectClaim(useProjectRootPath());
  const openTemplate = useOpenTemplate();
  const { clearLastOpenedProject } = useAppSettings();
  // Raised from a tree row's right-click menu, rendered here — react-arborist
  // owns row rendering, so there's nothing to thread a callback through.
  const { exportRequest, closeExport } = useDialogs();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAllPropertiesOpen, setIsAllPropertiesOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const saveNow = useSaveNow();
  const { undo, redo } = useHistoryActions();
  // Store actions, so these are stable and the shortcut listener isn't rebuilt.
  const { goBack, goForward, goHome } = useNavigationActions();
  const widths = usePanelWidths();
  const { setTreeWidth, setPropertiesWidth, resetPanelWidths } = usePanelWidthActions();
  // The grid's own width, watched rather than read once: the window is
  // resizable and how much room the two panels can have is a fact about it.
  const [layoutRef, layoutSize] = useElementSize<HTMLDivElement>();
  // What to draw, which is not always what was chosen — see fitPanelWidths.
  const fitted = fitPanelWidths(layoutSize.width, widths, isRightPanelOpen);
  // How far each handle may be dragged in this window, with the page's own
  // minimum and the opposite panel already accounted for.
  const treeMax = maxDraggableWidth(layoutSize.width, fitted.properties, TREE_MIN_WIDTH, TREE_MAX_WIDTH);
  const propertiesMax = maxDraggableWidth(layoutSize.width, fitted.tree, PROPERTIES_MIN_WIDTH, PROPERTIES_MAX_WIDTH);

  // Stable so the shortcut listener is attached once, not rebuilt on every
  // re-render of the shell — see use-global-shortcuts.ts.
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  // No dialog in between: the shortcut makes the page, and the page itself is
  // where it gets named and given a kind. Already stable — useCreatePage never
  // replaces its callback — so it doesn't need wrapping like the rest of these.
  const openNewPage = useCreatePage();
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
    // Since Phase 14 the two column widths are custom properties on the grid
    // rather than numbers in the stylesheet. They're properties and not an
    // inline `grid-template-columns` because the handles read them too: both
    // sit *outside* the panels, positioned against the grid itself, which is
    // what keeps them clear of the properties panel's own scroll container. A
    // handle inside a scrolling column scrolls away with the content.
    //
    // `app-layout-resizing` is only here to switch the column transition off
    // mid-drag — 150ms of easing on every pointer move is a panel edge that
    // trails the pointer and never catches up.
    <div
      ref={layoutRef}
      className={[
        "app-layout",
        isRightPanelOpen ? "" : "app-layout-properties-collapsed",
        isResizing ? "app-layout-resizing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          // The *fitted* widths, not the stored ones: the grid and the two drag
          // handles have to agree about where a panel's edge is, and on a
          // window too narrow for all three that edge is not where the stored
          // number says. Feeding the handles the stored width is what left them
          // floating in the middle of the page the first time this was built.
          "--tree-w": `${fitted.tree}px`,
          "--props-w": `${fitted.properties}px`,
          // The floor the page holds whatever the panels are dragged to. Fed
          // from the constant rather than written into the stylesheet so the
          // number lives with the widths it is in tension with.
          "--center-min": `${CENTER_MIN_WIDTH}px`,
        } as React.CSSProperties
      }
    >
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
        {/* An open template takes the centre panel, and the page underneath
            stays selected — closing it puts you back exactly where you were.
            What it does *not* do is outlive a move to a page: going anywhere
            clears it (the store's applySelection), as does returning to the
            sidebar's Project tab (TreeSidebar). Both exist because this panel
            shows one thing while the other two columns show another, and a
            template that stayed put made a click on a tree row look ignored.
            Keyed by template id for the same reason PageView is keyed by node
            id: the tab strip's state resets on a switch without an effect. */}
        <main className="app-layout-page">
          {openTemplate ? (
            <TemplateView key={openTemplate.id} template={openTemplate} />
          ) : (
            <PageView key={project?.selectedId ?? "none"} />
          )}
        </main>
      </div>

      {isRightPanelOpen && (
        <aside className="app-layout-properties">
          <BlockPanel key={project?.selectedId ?? "none"} />
        </aside>
      )}

      {/* Last in the DOM so they sit above both panels without a z-index race,
          and outside them so neither scrolls away from its own edge. The
          properties handle isn't rendered at all while that panel is closed —
          there's no edge there to drag. */}
      <ResizeHandle
        edge="tree"
        label="Sidebar width"
        width={widths.tree}
        min={TREE_MIN_WIDTH}
        max={treeMax}
        // Clamped here rather than in the store: the store's own clamp is about
        // what a panel may ever be, and this is about what it may be in the
        // window it is in at this moment.
        onResize={(width) => setTreeWidth(Math.min(width, treeMax))}
        onReset={resetPanelWidths}
        onDragChange={setIsResizing}
      />
      {isRightPanelOpen && (
        <ResizeHandle
          edge="properties"
          label="Properties panel width"
          width={widths.properties}
          min={PROPERTIES_MIN_WIDTH}
          max={propertiesMax}
          onResize={(width) => setPropertiesWidth(Math.min(width, propertiesMax))}
          onReset={resetPanelWidths}
          onDragChange={setIsResizing}
        />
      )}

      {exportRequest && <ExportModal rootIds={exportRequest.rootIds} onClose={closeExport} />}
      {isSearchOpen && <SearchPalette onClose={() => setIsSearchOpen(false)} onOpenAllProperties={openAllProperties} />}
      {isAllPropertiesOpen && <AllPropertiesModal onClose={() => setIsAllPropertiesOpen(false)} />}
    </div>
  );
}
