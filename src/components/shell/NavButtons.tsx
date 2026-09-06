// Back / forward / home, in a row at the foot of the sidebar — the wide column
// with the tree in it, not the narrow rail beside it.
//
// **They were in the bar above the page until 2026-09-05, and that bar is gone.**
// The user and her partner went over it together: the strip was doing very
// little and reading as clutter, and these three belong at the bottom left with
// the rest of the app's buttons rather than in a band of their own. The
// reference is LegendKeeper, where the page carries no bar at all.
//
// **They spent an hour in the rail first, which was a misreading worth not
// repeating.** She asked for the bottom of the left *column*, near settings —
// and settings lives in the rail, so the rail is where they went. The column she
// meant is this one. When a piece of this app's furniture is named loosely, the
// thing she was looking at is what she means.
//
// **Back and forward are page navigation, not undo.** Worth stating because the
// two got conflated when this move was discussed — these walk the pages you have
// visited, the way a browser does, while undo (Ctrl+Z) reverses edits and has no
// button anywhere. Asked directly, she chose to keep these three and leave undo
// on the keyboard.
//
// **Icon-only, which is the one place in this app that is allowed.** Asked for
// 2026-09-05 by a co-writer and passed on by the user, and it does not reopen the
// rail's labels: a house, a left arrow and a right arrow are glyphs everybody has
// read a thousand times, where the rail's panel icons stood for Project,
// Templates and a picture library and stood for them only here. The rule is about
// icons that need explaining, not about icons.
//
// All three stay mounted and go disabled rather than disappearing. A control that
// vanishes when it has nothing to do moves the two beside it, so the button under
// the pointer changes identity between clicks — and a greyed-out Back is what
// says the feature exists before you have been anywhere. **They are dimmed to
// 0.55 rather than the shared 0.25**: on a freshly opened world all three are
// disabled at once, and at a quarter opacity the user read the whole group as
// missing (2026-09-05).
//
// The tooltip carries the keyboard shortcut; `aria-label` is the bare word, so
// the accessible name is the one thing the button is called.
//
// `Home` rather than `House` so this and the sidebar's home button are the same
// glyph; they do the same thing from two places.
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
    <div className="tree-sidebar-foot">
      <button
        type="button"
        className="ui-icon-btn ui-icon-btn-lg tree-sidebar-foot-btn"
        aria-label="Home"
        title={`Home (${homeShortcut})`}
        disabled={!hasHome}
        onClick={goHome}
      >
        <Home size={16} />
      </button>
      <button
        type="button"
        className="ui-icon-btn ui-icon-btn-lg tree-sidebar-foot-btn"
        aria-label="Back"
        title={`Back (${backShortcut})`}
        disabled={!canGoBack}
        onClick={goBack}
      >
        <ArrowLeft size={16} />
      </button>
      <button
        type="button"
        className="ui-icon-btn ui-icon-btn-lg tree-sidebar-foot-btn"
        aria-label="Forward"
        title={`Forward (${forwardShortcut})`}
        disabled={!canGoForward}
        onClick={goForward}
      >
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
