// The page's own controls, floating at its top right rather than sitting in a
// bar across it.
//
// **The bar they came from is gone, 2026-09-05.** `TopBar` held back, forward
// and home at one end and these at the other, and the user and her partner went
// over it together: it was doing very little and reading as clutter. The
// navigation moved to the foot of the rail (NavButtons); what is left is what
// belongs to the page being read, and it belongs *on* the page. The reference is
// LegendKeeper, which puts its panel toggle straight onto the page with no band
// around it, and she pointed at exactly that.
//
// **The two indicators float here rather than moving to the rail** — her call
// left to me, and the rail is the reason: it is 84px wide and "Undid deleting 2
// pages" is not going to fit in it. They also appear and fade, so they want to be
// where the eye already is rather than in the furniture.
//
// **Positioned against the centre column, not the scrolling page.** The writing
// scrolls underneath; a control that scrolled away with it would be a control
// you have to scroll back up to reach. See `.page-controls` in shell.css.
import { PanelRight } from "lucide-react";
import { HistoryIndicator } from "./HistoryIndicator";
import { SaveIndicator } from "./SaveIndicator";

type PageControlsProps = {
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
};

export function PageControls({ isRightPanelOpen, onToggleRightPanel }: PageControlsProps) {
  return (
    <div className="page-controls">
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
  );
}
