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

export function flushSave(key: string): void {
  const existing = pending.get(key);
  if (!existing) return;
  clearTimeout(existing.timer);
  pending.delete(key);
  void existing.save();
}

export function cancelSave(key: string): void {
  const existing = pending.get(key);
  if (!existing) return;
  clearTimeout(existing.timer);
  pending.delete(key);
}
