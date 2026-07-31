// "Undid deleting 2 pages" / "Nothing to undo", next to the save indicator and
// built the same way — a `key` remount driving a CSS fade rather than a timer
// in state. See SaveIndicator.tsx for why.
//
// Undo needs this more than saving does. Most of what it reverses is visible in
// the tree, but "nothing left to undo" and "that didn't work" are invisible by
// definition, and a shortcut that silently does nothing reads as broken.
import { useLastHistoryAction } from "../../hooks/use-history";

export function HistoryIndicator() {
  const lastAction = useLastHistoryAction();

  if (lastAction === null) {
    return <span className="history-indicator" aria-live="polite" />;
  }

  return (
    <span key={lastAction.at} className="history-indicator history-indicator-visible" aria-live="polite">
      {lastAction.message}
    </span>
  );
}
