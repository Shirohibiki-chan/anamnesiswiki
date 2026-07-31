// Project name row at the top of the tree — home button, name, and a "+"
// button to add a top-level node (opens the same type picker as any other
// "add child" button, just targeting the root instead of a parent node).
//
// The home icon jumps to whichever page has been designated this world's home
// (right-click any page → "Set as project home", LK's own arrangement). With
// no home set it stays put as a plain icon rather than disappearing — the row
// it decorates is the project itself either way.
import { useState } from "react";
import { Home, Plus } from "lucide-react";
import { useProject, useProjectHomeId } from "../../hooks/use-project";
import { useTemplates } from "../../hooks/use-templates";
import { TemplatePicker } from "./TemplatePicker";
import { TreePopover } from "./TreePopover";

export function ProjectHeader() {
  const { project, addNode, selectNode } = useProject();
  const { getLabel } = useTemplates();
  const homeNodeId = useProjectHomeId();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  function handleAdd(templateKey: string) {
    addNode({ parentId: null, templateKey, name: `New ${getLabel(templateKey)}` });
    setAnchorRect(null);
  }

  return (
    <div className="tree-project-header">
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
        title="Add top-level page"
        onClick={(e) => setAnchorRect(anchorRect ? null : e.currentTarget.getBoundingClientRect())}
      >
        <Plus size={12} />
      </button>
      {anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={() => setAnchorRect(null)}>
          <TemplatePicker onSelect={handleAdd} />
        </TreePopover>
      )}
    </div>
  );
}
