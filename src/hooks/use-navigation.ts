// Back, forward and home. Components' only way into the session's navigation
// history — see CLAUDE.md's layer order.
import { useShallow } from "zustand/react/shallow";
import { useProjectStore } from "../state/project-store";
import { canGoBack, canGoForward } from "../services/navigation-service";

/**
 * Store actions are created once and never replaced, so this object's contents
 * are permanently stable — which is what lets the shell hand them straight to
 * the global shortcut listener without rebuilding it on every keystroke.
 */
export function useNavigationActions() {
  return useProjectStore(
    useShallow((state) => ({
      goBack: state.goBack,
      goForward: state.goForward,
      goHome: state.goHome,
    })),
  );
}

/**
 * Whether each direction currently goes anywhere. Derived in the selector and
 * compared shallowly, so the buttons re-render when one of them flips rather
 * than on every step through the stack.
 */
export function useNavigationState() {
  return useProjectStore(
    useShallow((state) => ({
      canGoBack: canGoBack(state.navHistory),
      canGoForward: canGoForward(state.navHistory),
      hasHome: Boolean(state.project?.homeNodeId),
    })),
  );
}
