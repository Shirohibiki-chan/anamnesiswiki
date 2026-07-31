// Plain service, not a hook — debounce timers must survive React re-renders.
const DEBOUNCE_MS = 300;

type PendingSave = {
  timer: ReturnType<typeof setTimeout>;
  save: () => Promise<void> | void;
};

const pending = new Map<string, PendingSave>();

// A debounced save runs long after the action that caused it, with no caller
// left to catch anything it throws — so a rejected write used to become an
// unhandled promise rejection and vanish. The user, meanwhile, has every
// reason to believe their work is on disk: the app said "Saved" the last time
// one succeeded, and nothing has contradicted it since. Whatever the cause —
// a path the OS won't accept, a full disk, a file a sync client has locked —
// a write that didn't happen has to be visible.
let saveErrorHandler: ((key: string, error: unknown) => void) | null = null;

export function setSaveErrorHandler(handler: ((key: string, error: unknown) => void) | null): void {
  saveErrorHandler = handler;
}

async function runSave(key: string, save: () => Promise<void> | void): Promise<void> {
  try {
    await save();
  } catch (error) {
    saveErrorHandler?.(key, error);
    throw error;
  }
}

export function scheduleSave(key: string, save: () => Promise<void> | void): void {
  const existing = pending.get(key);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    pending.delete(key);
    // Reported through the handler above; swallowed here so a failed write
    // doesn't surface as an unhandled rejection on top of the real message.
    void runSave(key, save).catch(() => {});
  }, DEBOUNCE_MS);
  pending.set(key, { timer, save });
}

// Returns the pending save's own promise so a caller that's about to
// relocate the same node on disk (rename/move) can await it first — writing
// the latest content to the *old* path before that path stops existing.
export async function flushSave(key: string): Promise<void> {
  const existing = pending.get(key);
  if (!existing) return;
  clearTimeout(existing.timer);
  pending.delete(key);
  await runSave(key, existing.save);
}

export function cancelSave(key: string): void {
  const existing = pending.get(key);
  if (!existing) return;
  clearTimeout(existing.timer);
  pending.delete(key);
}

export function hasPendingSaves(): boolean {
  return pending.size > 0;
}

// Runs every outstanding debounced write immediately. Called when the window
// loses focus, is hidden, or is closing (see hooks/use-save-on-exit.ts) — the
// debounce means the last ~300ms of typing is only in memory, which is fine
// while the app is running and not fine if the process is about to go away.
// Failures don't stop the loop — one unwritable node shouldn't cost the rest
// their flush — but they do still go through the error handler, so a failure
// on a window-blur flush is reported when the user comes back. On the
// closing flush there's no UI left to report into, which is exactly why the
// handler records into the store rather than rendering anything itself.
export async function flushAllSaves(): Promise<void> {
  const keys = [...pending.keys()];
  await Promise.all(
    keys.map(async (key) => {
      try {
        await flushSave(key);
      } catch {
        // Ignore — see comment above.
      }
    }),
  );
}
