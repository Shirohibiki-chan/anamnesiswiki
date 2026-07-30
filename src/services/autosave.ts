// Plain service, not a hook — debounce timers must survive React re-renders.
const DEBOUNCE_MS = 300;

type PendingSave = {
  timer: ReturnType<typeof setTimeout>;
  save: () => Promise<void> | void;
};

const pending = new Map<string, PendingSave>();

export function scheduleSave(key: string, save: () => Promise<void> | void): void {
  const existing = pending.get(key);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    pending.delete(key);
    void save();
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
  await existing.save();
}

export function cancelSave(key: string): void {
  const existing = pending.get(key);
  if (!existing) return;
  clearTimeout(existing.timer);
  pending.delete(key);
}
