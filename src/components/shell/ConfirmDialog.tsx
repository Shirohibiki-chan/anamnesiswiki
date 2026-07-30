// In-app themed replacement for Tauri's native confirm() dialog — see
// state/dialog-store.ts. Mounted once at the app root; renders nothing when
// no confirm is pending. Portaled to document.body so it always paints above
// everything else, same reasoning as TreePopover.
import { createPortal } from "react-dom";
import { useDialogs } from "../../hooks/use-dialogs";

export function ConfirmDialog() {
  const { pendingConfirm, resolveConfirm } = useDialogs();
  if (!pendingConfirm) return null;

  return createPortal(
    <div className="confirm-dialog-backdrop" onClick={() => resolveConfirm(false)}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-dialog-message">{pendingConfirm.message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="confirm-dialog-cancel" onClick={() => resolveConfirm(false)}>
            Cancel
          </button>
          <button type="button" className="confirm-dialog-confirm" onClick={() => resolveConfirm(true)}>
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
