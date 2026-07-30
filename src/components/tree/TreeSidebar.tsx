// Left sidebar container — top tab strip (only "Project" is functional; the
// other two are placeholders per docs/plan.md Phase 3), project header, and
// the tree itself.
import { ProjectHeader } from "./ProjectHeader";
import { TreePanel } from "./TreePanel";
import "./tree.css";

export function TreeSidebar() {
  return (
    <div className="tree-sidebar">
      <div className="tree-sidebar-tabs">
        <button type="button" className="tree-sidebar-tab tree-sidebar-tab-active">
          Project
        </button>
        <button type="button" className="tree-sidebar-tab" disabled>
          Templates
        </button>
        <button type="button" className="tree-sidebar-tab" disabled>
          Assets
        </button>
      </div>
      <ProjectHeader />
      <TreePanel />
    </div>
  );
}
