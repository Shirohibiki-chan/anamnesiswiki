// A name asked for before something is made from it. Mounted once at the app
// root and renders nothing until something asks — the same shape as
// ConfirmDialog and SaveAsTemplateDialog beside it. See dialog-store's
// NamePrompt for who asks.
import { createPortal } from "react-dom";
import { useState } from "react";
import { useDialogs } from "../../hooks/use-dialogs";

export function NamePromptDialog() {
  const { pendingName, resolveName } = useDialogs();
  if (!pendingName) return null;
  return <NamePromptForm key={pendingName.title} title={pendingName.title} message={pendingName.message} initial={pendingName.initial} onDone={resolveName} />;
}

function NamePromptForm({
  title,
  message,
  initial,
  onDone,
}: {
  title: string;
  message: string;
  initial: string;
  onDone: (name: string | null) => void;
}) {
  const [name, setName] = useState(initial);
  const trimmed = name.trim();

  return createPortal(
    <div className="ui-backdrop" onClick={() => onDone(null)}>
      <div
        className="ui-modal ui-modal-sm confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-prompt-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone(null);
        }}
      >
        <h2 id="name-prompt-title" className="confirm-dialog-title">
          {title}
        </h2>
        <p className="confirm-dialog-message">{message}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed) onDone(trimmed);
          }}
        >
          <input
            className="new-page-input"
            aria-label="Name"
            autoFocus
            value={name}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="confirm-dialog-actions">
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => onDone(null)}>
              Cancel
            </button>
            <button type="submit" className="ui-btn ui-btn-primary" disabled={!trimmed}>
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
