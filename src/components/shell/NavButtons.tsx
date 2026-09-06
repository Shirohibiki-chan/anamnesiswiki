// Back / forward / home, at the foot of the left rail.
//
// **They were in the bar above the page until 2026-09-05, and that bar is gone.**
// The user and her partner went over it together: the strip was doing very
// little and reading as clutter, and these three belong down with the rest of
// the app's buttons rather than in a band of their own. The reference is
// LegendKeeper, where the page carries no bar at all.
//
// **Back and forward are page navigation, not undo.** Worth stating because the
// two got conflated when this move was discussed — these walk the pages you have
// visited, the way a browser does, while undo (Ctrl+Z) reverses edits and has no
// button anywhere. Asked directly, she chose to keep these three and leave undo
// on the keyboard.
//
// All three stay mounted and go disabled rather than disappearing — see
// `RailButton`, which carries the reasoning.
//
// `Home` rather than `House` so this and the sidebar's home button are the same
// glyph; they do the same thing from two places.
import { ArrowLeft, ArrowRight, Home } from "lucide-react";
import { useNavigationActions, useNavigationState } from "../../hooks/use-navigation";
import { useShortcutLabel } from "../../hooks/use-shortcuts";
import { RailButton } from "./RailButton";

export function NavButtons() {
  const { goBack, goForward, goHome } = useNavigationActions();
  const { canGoBack, canGoForward, hasHome } = useNavigationState();
  const backShortcut = useShortcutLabel("navigateBack");
  const forwardShortcut = useShortcutLabel("navigateForward");
  const homeShortcut = useShortcutLabel("navigateHome");

  return (
    <div className="left-rail-group">
      <RailButton
        label="Home"
        title={`Home (${homeShortcut})`}
        Icon={Home}
        disabled={!hasHome}
        onClick={goHome}
      />
      <RailButton
        label="Back"
        title={`Back (${backShortcut})`}
        Icon={ArrowLeft}
        disabled={!canGoBack}
        onClick={goBack}
      />
      <RailButton
        label="Forward"
        title={`Forward (${forwardShortcut})`}
        Icon={ArrowRight}
        disabled={!canGoForward}
        onClick={goForward}
      />
    </div>
  );
}
