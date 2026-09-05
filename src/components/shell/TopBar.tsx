// The strip above the page. Spans the centre panel.
//
// **What is left here is what belongs to the page.** Phase 21 moved search, the
// project switcher and settings out to the rail, along with the sidebar's own
// tab strip — those are errands about the app. Back and forward, the save and
// history indicators and the properties toggle stayed, because each is about
// the page currently being read. When Phase 21.5 splits the centre into panes,
// this is the bar each pane will want its own copy of; the rail is not.
//
// It used to hold the project name, which the sidebar header also shows about
// 50px away — the doubled name in docs/ui-audit.md defect 6. The sidebar keeps
// it: that copy has the home button and the add-page button attached and heads
// the tree it names, while this one was a label with nothing to do. The gap it
// left was held open for back/forward, which Phase 14 filled 2026-08-10.
//
// The clickable breadcrumb trail meanwhile lives on the page itself (see
// page/PageTitle.tsx), directly above the title it describes.
import { PanelRight } from "lucide-react";
import { HistoryIndicator } from "./HistoryIndicator";
import { NavButtons } from "./NavButtons";
import { SaveIndicator } from "./SaveIndicator";

type TopBarProps = {
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
};

export function TopBar({ isRightPanelOpen, onToggleRightPanel }: TopBarProps) {
  return (
    <header className="top-bar">
      <NavButtons />
      <div className="top-bar-right">
        <HistoryIndicator />
        <SaveIndicator />
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
