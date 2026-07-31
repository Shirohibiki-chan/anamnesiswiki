// Tiny fade-in/fade-out "Saved" text — no spinners, no toasts. Uses a `key`
// remount + CSS animation instead of timer-driven state, since deriving
// "still within the visible window" needs Date.now() during render, which
// isn't a pure render calculation React allows.
import { useLastSavedAt } from "../../hooks/use-project";

export function SaveIndicator() {
  const lastSavedAt = useLastSavedAt();

  if (lastSavedAt === null) {
    return <span className="save-indicator" aria-live="polite" />;
  }

  return (
    <span key={lastSavedAt} className="save-indicator save-indicator-visible" aria-live="polite">
      Saved
    </span>
  );
}
