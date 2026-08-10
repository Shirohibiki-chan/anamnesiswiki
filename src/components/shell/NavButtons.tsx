// Back / forward / home, at the left end of the top bar — the half of that bar
// that was deliberately left empty for them (see TopBar.tsx).
//
// All three stay mounted and go disabled rather than disappearing. A control
// that vanishes when it has nothing to do moves the two beside it, so the
// button under the pointer changes identity between clicks; and the greyed-out
// arrow is what tells you the feature exists at all before you've been anywhere.
// `Home` rather than `House` so this and the sidebar's home button are the same
// glyph — they do the same thing from two places.
import { ArrowLeft, ArrowRight, Home } from "lucide-react";
import { useNavigationActions, useNavigationState } from "../../hooks/use-navigation";
import { useShortcutLabel } from "../../hooks/use-shortcuts";

export function NavButtons() {
  const { goBack, goForward, goHome } = useNavigationActions();
  const { canGoBack, canGoForward, hasHome } = useNavigationState();
  const backShortcut = useShortcutLabel("navigateBack");
  const forwardShortcut = useShortcutLabel("navigateForward");
  const homeShortcut = useShortcutLabel("navigateHome");

  return (
    <div className="top-bar-nav">
      <button
        type="button"
        className="ui-icon-btn ui-icon-btn-lg"
        aria-label="Back"
        title={`Back (${backShortcut})`}
        disabled={!canGoBack}
        onClick={goBack}
      >
        <ArrowLeft size={16} />
      </button>
      <button
        type="button"
        className="ui-icon-btn ui-icon-btn-lg"
        aria-label="Forward"
        title={`Forward (${forwardShortcut})`}
        disabled={!canGoForward}
        onClick={goForward}
      >
        <ArrowRight size={16} />
      </button>
      {/* Disabled rather than hidden when no home is set, for the same reason —
          and the tooltip says how to set one, since a permanently grey button
          with no explanation reads as broken rather than as unconfigured. */}
      <button
        type="button"
        className="ui-icon-btn ui-icon-btn-lg"
        aria-label="Project home"
        title={hasHome ? `Project home (${homeShortcut})` : "No project home set — right-click a page to set one"}
        disabled={!hasHome}
        onClick={goHome}
      >
        <Home size={16} />
      </button>
    </div>
  );
}
