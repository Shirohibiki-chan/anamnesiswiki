// Project name row at the top of the tree — home button, name, and a "+"
// button that makes a top-level page (the same thing a row's own "New page
// inside" does, just targeting the root instead of a parent node).
//
// The home icon jumps to whichever page has been designated this project's home
// (right-click any page → "Set as project home", LK's own arrangement). With
// no home set it stays put as a plain icon rather than disappearing — the row
// it decorates is the project itself either way.
import { useState } from "react";
import { ChevronRight, History, Home, Plus, Upload } from "lucide-react";
import { useDialogs } from "../../hooks/use-dialogs";
import type { ExportFormat } from "../../state/dialog-store";
import { useProject, useProjectHomeId, useUniverses } from "../../hooks/use-project";
import { useCreatePageIn } from "../../hooks/use-new-page";
import { ExportMenu } from "./ExportMenu";
import { TreePopover } from "./TreePopover";
import { UniverseSwitcher } from "./UniverseSwitcher";

export function ProjectHeader() {
  const { project, selectNode } = useProject();
  const { requestExport, openProjectHistory } = useDialogs();
  const createPageIn = useCreatePageIn();
  const homeNodeId = useProjectHomeId();
  const { current: currentUniverse } = useUniverses();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  // Which panel the one popover is showing. Same swap the row menu makes.
  const [showingExports, setShowingExports] = useState(false);

  function closePopover() {
    setAnchorRect(null);
    // Closing and reopening starts at the top level, never mid-submenu.
    setShowingExports(false);
  }

  // Exporting the whole project means every top-level page; their descendants
  // come along on their own (see export-walk's collectSubtree).
  function handleExportProject(format: ExportFormat) {
    closePopover();
    setShowingExports(false);
    requestExport(project?.rootOrder ?? [], format);
  }

  return (
    <div
      className="tree-project-header"
      onContextMenu={(e) => {
        e.preventDefault();
        setAnchorRect(e.currentTarget.getBoundingClientRect());
      }}
    >
      <div className="tree-project-header-row">
        <div className="tree-project-header-name">
          {homeNodeId ? (
            <button
              type="button"
              className="tree-project-header-home"
              title="Go to project home"
              onClick={() => selectNode(homeNodeId)}
            >
              <Home size={12} />
            </button>
          ) : (
            <Home size={12} />
          )}
          <span>{project?.name}</span>
        </div>
        {/* "Top level" means the top of the tree as it is currently showing —
            so inside the selected universe when there is one. A "+" on this row
            that made a page you then could not see would read as broken. */}
        <button
          type="button"
          className="ui-icon-btn ui-icon-btn-sm"
          title={currentUniverse ? `Add page in ${currentUniverse.name}` : "Add top-level page"}
          onClick={() => createPageIn(currentUniverse?.id ?? null)}
        >
          <Plus size={12} />
        </button>
      </div>
      {/* Always drawn, universes or not — it is how you find out they exist.
          See UniverseSwitcher.tsx. */}
      <UniverseSwitcher />
      {anchorRect && showingExports && (
        <TreePopover anchorRect={anchorRect} onClose={closePopover}>
          <ExportMenu scope="project" onSelect={handleExportProject} onBack={() => setShowingExports(false)} />
        </TreePopover>
      )}
      {anchorRect && !showingExports && (
        <TreePopover anchorRect={anchorRect} onClose={closePopover}>
          <div className="tree-context-menu">
            {/* Behind a submenu, the same as the row menu's — five formats
                listed flat is a menu nobody reads, and a person looking for
                "export" looks for the word rather than for a particular
                format. Her call, 2026-09-10. */}
            <button type="button" className="tree-context-menu-submenu" onClick={() => setShowingExports(true)}>
              <Upload size={13} /> Export project
              <ChevronRight size={13} className="tree-context-menu-chevron" />
            </button>
            {/* The tree's own history, in the same place a page's is: on the
                right-click menu of the row it belongs to. This row is the
                project, so this is where project.json's copies live. */}
            <button
              type="button"
              onClick={() => {
                closePopover();
                openProjectHistory();
              }}
            >
              <History size={13} /> Earlier versions of the tree
            </button>
          </div>
        </TreePopover>
      )}
    </div>
  );
}
