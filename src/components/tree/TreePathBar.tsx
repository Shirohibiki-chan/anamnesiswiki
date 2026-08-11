// The way back out of a focused tree. Sits above the rows and shows the chain
// from the project down to whatever the tree is currently showing the inside
// of; every step is a click, and the project name is the way all the way out.
//
// This is the whole reason focus is safe to offer. A sidebar that quietly
// shows a fraction of the project with nothing saying so would read as pages
// having gone missing — the bar is what makes it obviously a view rather than
// a loss.
import { ChevronRight, X } from "lucide-react";
import type { Node } from "../../constants/schema";

type TreePathBarProps = {
  projectName: string;
  /** Project root → focused node. The last entry is what the tree is showing. */
  path: Node[];
  onFocus: (id: string | null) => void;
};

export function TreePathBar({ projectName, path, onFocus }: TreePathBarProps) {
  const current = path[path.length - 1];
  if (!current) return null;

  return (
    <nav className="tree-path-bar" aria-label="Focused folder">
      {/* Scrolls sideways rather than wrapping: a deep path is exactly when
          this appears, and a bar that grows to three rows would push the tree
          it's labelling off the top of the panel. */}
      <div className="tree-path-bar-crumbs">
        <button type="button" className="tree-path-crumb" onClick={() => onFocus(null)}>
          {projectName}
        </button>
        {path.map((node, index) => {
          const isCurrent = index === path.length - 1;
          return (
            <span key={node.id} className="tree-path-crumb-item">
              <ChevronRight size={11} className="tree-path-sep" aria-hidden="true" />
              {isCurrent ? (
                // The last one isn't a button. Focusing what's already focused
                // does nothing, and a control that does nothing is one you
                // press once and stop trusting.
                <span className="tree-path-crumb tree-path-crumb-current" aria-current="true">
                  {node.name}
                </span>
              ) : (
                <button type="button" className="tree-path-crumb" onClick={() => onFocus(node.id)}>
                  {node.name}
                </button>
              )}
            </span>
          );
        })}
      </div>

      <button
        type="button"
        className="ui-icon-btn ui-icon-btn-sm tree-path-clear"
        aria-label="Show the whole project"
        title="Show the whole project"
        onClick={() => onFocus(null)}
      >
        <X size={12} />
      </button>
    </nav>
  );
}
