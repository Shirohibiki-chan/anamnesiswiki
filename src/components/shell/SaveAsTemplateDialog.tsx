// The sub-pages question, asked before "Save as template" runs. Mounted once
// at the app root and renders nothing until something asks — same shape as
// ConfirmDialog beside it, and portaled for the same reason.
//
// Three answers rather than a yes/no, so the two real ones are both buttons
// and neither is hiding behind Cancel. See dialog-store's TemplateScope.
//
// The copy is ours. LegendKeeper asks the same question, and its wording is
// its own — nothing transcribed, here or in template-registry.ts.
import { createPortal } from "react-dom";
import { useDialogs } from "../../hooks/use-dialogs";

export function SaveAsTemplateDialog() {
  const { pendingTemplateScope, resolveTemplateScope } = useDialogs();
  if (!pendingTemplateScope) return null;

  return createPortal(
    <div className="ui-backdrop" onClick={() => resolveTemplateScope(null)}>
      {/* The standard width, not the narrow one a plain confirm uses: three
          buttons need 343px side by side and `ui-modal-sm` leaves about 304px
          between its padding, so they wrapped 2-and-1. Measured, not guessed. */}
      <div className="ui-modal confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="confirm-dialog-title">Save as template</h2>
        {/* Says what it won't do as well as what it will. "Convert" is the
            word every other app uses for this and it reads as one-way — the
            page is copied and stays exactly where it is. */}
        <p className="confirm-dialog-message">
          This makes a template out of a copy of &ldquo;{pendingTemplateScope.pageName}&rdquo;, with its writing,
          properties and pictures. The page itself doesn&rsquo;t change.
        </p>
        <p className="confirm-dialog-message">Should the pages inside it come along too?</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="ui-btn ui-btn-secondary" onClick={() => resolveTemplateScope(null)}>
            Cancel
          </button>
          <button type="button" className="ui-btn ui-btn-secondary" onClick={() => resolveTemplateScope("all")}>
            Include sub-pages
          </button>
          <button type="button" className="ui-btn ui-btn-primary" onClick={() => resolveTemplateScope("one")}>
            Just this page
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
