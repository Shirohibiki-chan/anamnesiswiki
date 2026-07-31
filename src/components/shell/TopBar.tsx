// Spans the center panel — project name on the left, right-panel toggle +
// save indicator on the right. The clickable breadcrumb trail lives on the
// page itself (see page/PageTitle.tsx), where it sits directly above the
// title it describes; this bar deliberately stays a fixed project-level
// header rather than duplicating it.
import { FolderOpen, PanelRight, Search } from "lucide-react";
import { SaveIndicator } from "./SaveIndicator";
import { SettingsButton } from "./SettingsButton";

type TopBarProps = {
  projectName: string;
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  onSwitchProject: () => void;
  onOpenSearch: () => void;
};

// The platform's own name for the modifier, so the hint on the search button
// reads the way the user's keyboard is actually labelled.
const MOD_LABEL = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl+";

export function TopBar({ projectName, isRightPanelOpen, onToggleRightPanel, onSwitchProject, onOpenSearch }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar-breadcrumb">
        <span className="top-bar-project-name">{projectName}</span>
      </div>
      <div className="top-bar-right">
        <SaveIndicator />
        {/* A visible way in as well as the shortcut — nothing else in the app
            advertises that Cmd+K exists. */}
        <button type="button" className="top-bar-search-button" onClick={onOpenSearch}>
          <Search size={14} />
          <span>Search</span>
          <kbd className="top-bar-kbd">{MOD_LABEL}K</kbd>
        </button>
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
