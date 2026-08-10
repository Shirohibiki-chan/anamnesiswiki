// Spans the center panel. Search, project switch, settings and the
// right-panel toggle, all pushed right; the left half is deliberately empty.
//
// It used to hold the project name, which the sidebar header also shows about
// 50px away — the doubled name in docs/ui-audit.md defect 6. The sidebar keeps
// it: that copy has the home button and the add-page button attached and heads
// the tree it names, while this one was a label with nothing to do. The gap it
// left was held open for back/forward, which Phase 14 filled 2026-08-10.
//
// The clickable breadcrumb trail meanwhile lives on the page itself (see
// page/PageTitle.tsx), directly above the title it describes.
import { FolderOpen, PanelRight, Search } from "lucide-react";
import { useShortcutLabel } from "../../hooks/use-shortcuts";
import { HistoryIndicator } from "./HistoryIndicator";
import { NavButtons } from "./NavButtons";
import { SaveIndicator } from "./SaveIndicator";
import { SettingsButton } from "./SettingsButton";

type TopBarProps = {
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  onSwitchProject: () => void;
  onOpenSearch: () => void;
};

export function TopBar({ isRightPanelOpen, onToggleRightPanel, onSwitchProject, onOpenSearch }: TopBarProps) {
  const searchShortcut = useShortcutLabel("search");

  return (
    <header className="top-bar">
      <NavButtons />
      <div className="top-bar-right">
        <HistoryIndicator />
        <SaveIndicator />
        {/* A visible way in as well as the shortcut — nothing else in the app
            advertises that Cmd+K exists. */}
        <button type="button" className="top-bar-search-button" onClick={onOpenSearch}>
          <Search size={14} />
          <span>Search</span>
          <kbd className="top-bar-kbd">{searchShortcut}</kbd>
        </button>
        <button type="button" className="ui-icon-btn ui-icon-btn-lg" aria-label="Switch project" onClick={onSwitchProject}>
          <FolderOpen size={16} />
        </button>
        <SettingsButton />
        {/* `.ui-icon-btn` picks the accent colour up from aria-pressed, so the
            toggled-on look isn't a class this has to remember to pass. */}
        <button
          type="button"
          className="ui-icon-btn ui-icon-btn-lg"
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
