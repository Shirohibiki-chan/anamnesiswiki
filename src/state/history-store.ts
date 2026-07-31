// The undo/redo stacks. Deliberately knows nothing about pages, folders or the
// filesystem — project-store hands it closures and it runs them in order.
// Never imported directly by components; use hooks/use-history.ts.
import { create } from "zustand";
import { pushEntry, type HistoryEntry } from "../services/history-service";

export type HistoryStoreState = {
  past: HistoryEntry[];
  future: HistoryEntry[];
  /**
   * Set while an undo or a redo is running. Two jobs: `record` ignores
   * everything that happens underneath it (otherwise undoing an operation
   * would push the reversal onto the stack as a new operation), and the
   * shortcut handler drops a second keypress rather than starting a second
   * filesystem operation on top of an unfinished one.
   */
  isReplaying: boolean;
  /** What the last undo or redo did, for the status line. Cleared on the next one. */
  lastAction: { message: string; at: number } | null;
  record: (entry: HistoryEntry) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  /** On project open and close — a stack of closures over the old project is worse than none. */
  clear: () => void;
};

export const useHistoryStore = create<HistoryStoreState>((set, get) => {
  const announce = (message: string) => set({ lastAction: { message, at: Date.now() } });

  // Both directions are the same shape: take the entry off one stack, run the
  // matching half of it, put it on the other. The entry only moves if its
  // closure resolved — a failed filesystem write leaves it where it was, so
  // the next press retries rather than silently skipping past it.
  const replay = async (from: "past" | "future") => {
    const { isReplaying } = get();
    if (isReplaying) return;

    const source = get()[from];
    const entry = source[source.length - 1];
    if (!entry) {
      announce(from === "past" ? "Nothing to undo" : "Nothing to redo");
      return;
    }

    set({ isReplaying: true });
    try {
      await (from === "past" ? entry.undo() : entry.redo());
      const to = from === "past" ? "future" : "past";
      set({
        [from]: get()[from].slice(0, -1),
        [to]: [...get()[to], entry],
      } as Pick<HistoryStoreState, "past" | "future">);
      announce(`${from === "past" ? "Undid" : "Redid"} ${entry.label}`);
    } catch {
      announce(from === "past" ? "Couldn't undo that" : "Couldn't redo that");
    } finally {
      set({ isReplaying: false });
    }
  };

  return {
    past: [],
    future: [],
    isReplaying: false,
    lastAction: null,

    record(entry) {
      if (get().isReplaying) return;
      // A new action after an undo abandons the redo branch. Keeping it would
      // mean offering to redo something that no longer fits the tree it was
      // recorded against.
      set({ past: pushEntry(get().past, entry), future: [] });
    },

    undo: () => replay("past"),
    redo: () => replay("future"),

    clear() {
      set({ past: [], future: [], lastAction: null });
    },
  };
});
