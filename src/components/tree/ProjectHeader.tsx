// Project name row at the top of the tree — home icon, name, and a "+"
// button to add a top-level node (opens the same type picker as any other
// "add child" button, just targeting the root instead of a parent node).
import { useState } from "react";
import { Home, Plus } from "lucide-react";
import { useProject } from "../../hooks/use-project";
import { useTemplates } from "../../hooks/use-templates";
import { TemplatePicker } from "./TemplatePicker";
import { TreePopover } from "./TreePopover";

export function ProjectHeader() {
  const { project, addNode } = useProject();
  const { getLabel } = useTemplates();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  function handleAdd(templateKey: string) {
    addNode({ parentId: null, templateKey, name: `New ${getLabel(templateKey)}` });
    setAnchorRect(null);
  }

  return (
    <div className="tree-project-header">
      <div className="tree-project-header-name">
        <Home size={12} />
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
