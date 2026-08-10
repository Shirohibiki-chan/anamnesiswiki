// The app telling her something went wrong, with nothing to decide — see
// state/dialog-store.ts. Sibling of ConfirmDialog rather than a variant of it:
// same modal shell, but one button and no promise waiting on the answer.
//
// Mounted once at the app root for the reason ConfirmDialog documents — it
// portals to document.body regardless, so sitting above the router costs
// nothing and means the start screen can report a failure too.
import { createPortal } from "react-dom";
import { useDialogs } from "../../hooks/use-dialogs";

export function NoticeDialog() {
  const { notice, dismissNotice } = useDialogs();
  if (!notice) return null;

  return createPortal(
    <div className="ui-backdrop" onClick={dismissNotice}>
      <div className="ui-modal ui-modal-sm confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-dialog-message">{notice.message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="ui-btn ui-btn-primary" onClick={dismissNotice} autoFocus>
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
