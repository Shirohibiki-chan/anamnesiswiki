// Reports pages that were found parked under a move's temp name and put back.
// This is good news, not a warning — but it's still worth saying out loud,
// because it means an earlier move was interrupted, and an interrupted move
// staying quiet is exactly what turned one into lost pages on 2026-07-31.
import { LifeBuoy, X } from "lucide-react";
import { useProject } from "../../hooks/use-project";

export function RecoveryNotice() {
  const { recoveredCount, dismissRecovered } = useProject();
  if (recoveredCount === 0) return null;

  const one = recoveredCount === 1;

  return (
    <div className="recovery-notice" role="status">
      <LifeBuoy size={14} className="recovery-notice-icon" />
      <p className="recovery-notice-message">
        {one ? "1 page was" : `${recoveredCount} pages were`} put back after a move that didn't finish.{" "}
        {one ? "It's" : "They're"} where {one ? "it" : "they"} started out — worth a look to check{" "}
        {one ? "it's" : "they're"} where you want {one ? "it" : "them"}.
      </p>
      <button type="button" className="ui-icon-btn ui-icon-btn-sm" aria-label="Dismiss" onClick={dismissRecovered}>
        <X size={13} />
      </button>
    </div>
  );
}
