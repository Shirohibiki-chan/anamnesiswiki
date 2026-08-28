// Make a page and link to it, without leaving the sentence you were writing.
// Phase 19.5. See docs/plan.md.
//
// **Everything this does already existed except the asking.** Creating a page
// under a parent is what the tree's "+" does, hiding one shipped in Phase 12,
// and the chip it leaves behind is the same mention chip the "@" menu inserts.
// What was missing was a way to do all three from the middle of a paragraph,
// which is where you are when you find out a page is missing.
//
// **It is reached two ways and the second one is the point.** The `/` menu is
// the obvious route; typing `[[Some Page]]` for a page that does not exist yet
// is the one that happens by itself, because writing the name of a page you
// have not written is the ordinary way to notice you need it.
//
// Mounted once at the app root, rendering nothing until something asks — the
// same shape as the dialogs beside it.
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getTemplateIcon } from "../../constants/icons";
import { FOLDER_TEMPLATE_KEY } from "../../constants/schema";
import type { NewPageLink, NewPageLinkPrefill } from "../../state/dialog-store";
import { useDialogs } from "../../hooks/use-dialogs";
import { useCreateLinkedPage } from "../../hooks/use-new-page";
import { useProject } from "../../hooks/use-project";

/** How many pages the location box offers at once. Same count as RefsProperty. */
const MAX_SUGGESTIONS = 8;

export function NewPageLinkDialog() {
  const { pendingNewPageLink, resolveNewPageLink } = useDialogs();
  if (!pendingNewPageLink) return null;

  // Split in two so the body is mounted only while the dialog is open, and its
  // four fields therefore start from the prefill by construction rather than
  // through an effect that has to remember to reset them. Same reasoning as
  // AssetPickerDialog.
  return <NewPageLinkForm prefill={pendingNewPageLink} onResolve={resolveNewPageLink} />;
}

function NewPageLinkForm({
  prefill,
  onResolve,
}: {
  prefill: NewPageLinkPrefill;
  onResolve: (link: NewPageLink | null) => void;
}) {
  const { nodes } = useProject();
  const createLinkedPage = useCreateLinkedPage();

  const [name, setName] = useState(prefill.name);
  const [linkText, setLinkText] = useState("");
  const [parentId, setParentId] = useState<string | null>(prefill.parentId);
  const [hidden, setHidden] = useState(false);
  const [parentQuery, setParentQuery] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);

  // Escape closes it, on the window rather than the dialog — the same trap
  // AssetPickerDialog avoids: nothing here is focused until something is
  // clicked, and a dialog the keyboard cannot dismiss until then is one.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onResolve(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onResolve]);

  // Straight to the name, or straight past it when `[[Name]]` already filled it
  // in — in that case the name is settled and the next thing worth her
  // attention is where the page goes.
  useEffect(() => {
    nameInput.current?.focus();
    nameInput.current?.select();
  }, []);

  const parent = parentId ? nodes[parentId] : undefined;

  const candidates = useMemo(() => {
    const needle = parentQuery.trim().toLowerCase();
    return Object.values(nodes)
      .filter((node) => !needle || node.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, MAX_SUGGESTIONS);
  }, [nodes, parentQuery]);

  const trimmed = name.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    const nodeId = createLinkedPage({ name: trimmed, parentId, hidden });
    if (!nodeId) {
      onResolve(null);
      return;
    }
    // The link reads as the name unless she said otherwise. An empty box means
    // "same as the page", not an empty chip.
    onResolve({ nodeId, label: linkText.trim() || trimmed });
  }

  return createPortal(
    <div className="ui-backdrop" onClick={() => onResolve(null)}>
      <div className="ui-modal ui-modal-sm new-page-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="confirm-dialog-title">New page</h2>
        <form onSubmit={submit}>
          <label className="new-page-field">
            <span className="ui-eyebrow new-page-label">Name</span>
            <input
              ref={nameInput}
              className="new-page-input"
              value={name}
              placeholder="What the page is called"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="new-page-field">
            <span className="ui-eyebrow new-page-label">Link text</span>
            <input
              className="new-page-input"
              value={linkText}
              // The placeholder is the name as typed, so the default is visible
              // rather than something to remember — an empty box is not a
              // missing answer here, it is the usual one.
              placeholder={trimmed || "Same as the name"}
              onChange={(e) => setLinkText(e.target.value)}
            />
          </label>

          <div className="new-page-field">
            <span className="ui-eyebrow new-page-label">Where it goes</span>
            {parent ? (
              <div className="new-page-parent">
                {(() => {
                  const Icon = getTemplateIcon(parent.templateKey);
                  return <Icon size={13} className="new-page-parent-icon" />;
                })()}
                <span className="new-page-parent-name">{parent.name}</span>
                <button
                  type="button"
                  className="ui-inline-remove"
                  aria-label="Put it at the top level instead"
                  onClick={() => setParentId(null)}
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <>
                <input
                  className="new-page-input"
                  value={parentQuery}
                  // Cleared means the top of the tree, and it says so rather
                  // than sitting empty — an empty box that quietly means
                  // something is the same as an unanswered question.
                  placeholder="Top level — search to put it inside a page"
                  onChange={(e) => setParentQuery(e.target.value)}
                />
                {parentQuery.trim() && candidates.length > 0 && (
                  <div className="new-page-candidates">
                    {candidates.map((node) => {
                      const Icon = getTemplateIcon(node.templateKey);
                      return (
                        <button
                          type="button"
                          key={node.id}
                          className="new-page-candidate"
                          onClick={() => {
                            setParentId(node.id);
                            setParentQuery("");
                          }}
                        >
                          <Icon size={12} className="new-page-parent-icon" />
                          {node.name}
                          {node.templateKey === FOLDER_TEMPLATE_KEY && <span className="new-page-candidate-kind">folder</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <label className="new-page-check">
            <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
            <span>Hidden — keep it out of the tree for now</span>
          </label>

          <div className="confirm-dialog-actions">
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => onResolve(null)}>
              Cancel
            </button>
            <button type="submit" className="ui-btn ui-btn-primary" disabled={!trimmed}>
              Make the page
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
