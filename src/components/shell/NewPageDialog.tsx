// What Cmd+N opens. A page can't be created without picking a template, so
// the shortcut has to ask — it reuses the tree's own TemplatePicker so the
// eight choices look and read the same wherever they're reached from.
//
// Deliberately not a TreePopover: that positions against a trigger's bounding
// rect, and a keyboard shortcut has no trigger to anchor to.
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useCreatePage } from "../../hooks/use-new-page";
import { TemplatePicker } from "../tree/TemplatePicker";

type NewPageDialogProps = {
  onClose: () => void;
};

export function NewPageDialog({ onClose }: NewPageDialogProps) {
  const createPage = useCreatePage();
  const templatesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // The whole point of the shortcut is not reaching for the mouse, so the
  // first template is focused on open and Tab walks the rest. Without this,
  // focus stays wherever it was — usually inside the editor behind the dialog.
  useEffect(() => {
    templatesRef.current?.querySelector("button")?.focus();
  }, []);

  function handleSelect(templateKey: string) {
    createPage(templateKey);
    onClose();
  }

  return createPortal(
    <div className="ui-backdrop" onClick={onClose}>
      <div
        className="ui-modal ui-modal-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-page-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-header">
          <h2 id="new-page-title" className="settings-title">
            New page
          </h2>
          <button type="button" className="ui-icon-btn ui-icon-btn-lg" aria-label="Cancel" onClick={onClose}>
            <X size={15} />
          </button>
        </header>
        <p className="new-page-hint">Added next to the page you're on.</p>
        <div className="new-page-templates" ref={templatesRef}>
          <TemplatePicker onSelect={handleSelect} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
