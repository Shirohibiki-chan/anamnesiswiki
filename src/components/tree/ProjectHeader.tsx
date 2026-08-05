// Project name row at the top of the tree — home button, name, and a "+"
// button to add a top-level node (opens the same type picker as any other
// "add child" button, just targeting the root instead of a parent node).
//
// The home icon jumps to whichever page has been designated this project's home
// (right-click any page → "Set as project home", LK's own arrangement). With
// no home set it stays put as a plain icon rather than disappearing — the row
// it decorates is the project itself either way.
import { useState } from "react";
import { Home, Plus, Upload } from "lucide-react";
import { useDialogs } from "../../hooks/use-dialogs";
import { useProject, useProjectHomeId } from "../../hooks/use-project";
import { useTemplates } from "../../hooks/use-templates";
import { TemplatePicker } from "./TemplatePicker";
import { TreePopover } from "./TreePopover";

type OpenPopover = "add" | "menu" | null;

export function ProjectHeader() {
  const { project, addNode, selectNode } = useProject();
  const { getLabel } = useTemplates();
  const { requestExport } = useDialogs();
  const homeNodeId = useProjectHomeId();
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  function closePopover() {
    setOpenPopover(null);
    setAnchorRect(null);
  }

  function handleAdd(templateKey: string) {
    addNode({ parentId: null, templateKey, name: `New ${getLabel(templateKey)}` });
    closePopover();
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
        setOpenPopover("menu");
      }}
    >
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
      <button
        type="button"
        className="ui-icon-btn ui-icon-btn-sm"
        title="Add top-level page"
        onClick={(e) => {
          if (openPopover === "add") closePopover();
          else {
            setAnchorRect(e.currentTarget.getBoundingClientRect());
            setOpenPopover("add");
          }
        }}
      >
        <Plus size={12} />
      </button>
      {openPopover === "add" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={closePopover}>
          <TemplatePicker onSelect={handleAdd} />
        </TreePopover>
      )}
      {openPopover === "menu" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={closePopover}>
          <div className="tree-context-menu">
            <button type="button" onClick={handleExportProject}>
              <Upload size={13} /> Export project to LegendKeeper
            </button>
          </div>
        </TreePopover>
      )}
    </div>
  );
}
