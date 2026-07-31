// The components' way in to the undo stack. See CLAUDE.md's layer order —
// nothing renders straight out of state/history-store.
import { useCallback } from "react";
import { useHistoryStore } from "../state/history-store";

/**
 * Stable callbacks for the two shortcuts. `getState()` rather than subscribing,
 * so the identity never changes and the global key listener isn't torn down
 * and rebuilt every time the stacks move.
 */
export function useHistoryActions(): { undo: () => void; redo: () => void } {
  const undo = useCallback(() => void useHistoryStore.getState().undo(), []);
  const redo = useCallback(() => void useHistoryStore.getState().redo(), []);
  return { undo, redo };
}

/** What the last undo or redo did, for the status line. Null until one happens. */
export function useLastHistoryAction(): { message: string; at: number } | null {
  return useHistoryStore((state) => state.lastAction);
}
