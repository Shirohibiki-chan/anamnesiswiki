// Project name row at the top of the tree — home button, name, and a "+"
// button that makes a top-level page (the same thing a row's own "New page
// inside" does, just targeting the root instead of a parent node).
//
// The home icon jumps to whichever page has been designated this project's home
// (right-click any page → "Set as project home", LK's own arrangement). With
// no home set it stays put as a plain icon rather than disappearing — the row
// it decorates is the project itself either way.
import { useState } from "react";
import { History, Home, Plus, Upload } from "lucide-react";
import { useDialogs } from "../../hooks/use-dialogs";
import { useProject, useProjectHomeId, useUniverses } from "../../hooks/use-project";
import { useCreatePageIn } from "../../hooks/use-new-page";
import { TreePopover } from "./TreePopover";
import { UniverseSwitcher } from "./UniverseSwitcher";

export function ProjectHeader() {
  const { project, selectNode } = useProject();
  const { requestExport, openProjectHistory } = useDialogs();
  const createPageIn = useCreatePageIn();
  const homeNodeId = useProjectHomeId();
  const { current: currentUniverse } = useUniverses();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  function closePopover() {
    setAnchorRect(null);
  }

  // Exporting the whole project means every top-level page; their descendants
  // come along on their own (see lk-export's collectSubtree).
  function handleExportProject() {
    closePopover();
    requestExport(project?.rootOrder ?? []);
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
      {anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={closePopover}>
          <div className="tree-context-menu">
            <button type="button" onClick={handleExportProject}>
              <Upload size={13} /> Export project to LegendKeeper
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
