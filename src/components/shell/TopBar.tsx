// Spans the center panel — breadcrumb on the left, right-panel toggle + save
// indicator on the right. Breadcrumb is project-name-only until Phase 3/4
// give it a real selected-page path to walk.
import { PanelRight } from "lucide-react";
import { SaveIndicator } from "./SaveIndicator";

type TopBarProps = {
  projectName: string;
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
};

export function TopBar({ projectName, isRightPanelOpen, onToggleRightPanel }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar-breadcrumb">
        <span className="top-bar-project-name">{projectName}</span>
      </div>
      <div className="top-bar-right">
        <SaveIndicator />
        <button
          type="button"
          className="top-bar-toggle"
          aria-pressed={isRightPanelOpen}
          aria-label={isRightPanelOpen ? "Hide properties panel" : "Show properties panel"}
          onClick={onToggleRightPanel}
        >
          <PanelRight size={16} />
        </button>
      </div>
    </header>
  );
}
