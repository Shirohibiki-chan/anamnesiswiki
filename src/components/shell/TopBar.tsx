// Spans the center panel — project name on the left, right-panel toggle +
// save indicator on the right. The clickable breadcrumb trail lives on the
// page itself (see page/PageTitle.tsx), where it sits directly above the
// title it describes; this bar deliberately stays a fixed project-level
// header rather than duplicating it.
import { FolderOpen, PanelRight } from "lucide-react";
import { SaveIndicator } from "./SaveIndicator";
import { SettingsButton } from "./SettingsButton";

type TopBarProps = {
  projectName: string;
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  onSwitchProject: () => void;
};

export function TopBar({ projectName, isRightPanelOpen, onToggleRightPanel, onSwitchProject }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar-breadcrumb">
        <span className="top-bar-project-name">{projectName}</span>
      </div>
      <div className="top-bar-right">
        <SaveIndicator />
        <button type="button" className="top-bar-icon-button" aria-label="Switch project" onClick={onSwitchProject}>
          <FolderOpen size={16} />
        </button>
        <SettingsButton />
        <button
          type="button"
          className="top-bar-icon-button"
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
