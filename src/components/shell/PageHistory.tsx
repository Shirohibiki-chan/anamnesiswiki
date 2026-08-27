// Earlier versions of one page: what was kept, what it said, and putting one
// back (Phase 19).
//
// **This is the screen the safety net is for, and its job is to be believed.**
// The app has lost her pages once (`docs/handoff.md` §Storage), so a version
// list that shows a date and nothing else would be a list you have to gamble
// on — every copy here can be read in full before it replaces anything, and
// what is on the page right now is copied aside before a restore, so choosing
// wrong is itself undoable.
import { History, RotateCcw } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { documentText } from "../../services/search-service";
import { listStepForKey, stepIndex } from "../../services/list-keys";
import { timeAgo } from "../../services/relative-time";
import { usePageHistory } from "../../hooks/use-page-history";
import { useProject } from "../../hooks/use-project";
import type { Tab } from "../../constants/schema";

export function PageHistory({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { nodes } = useProject();
  const node = nodes[nodeId];
  const { snapshots, listedAt, selected, select, restore, isRestoring } = usePageHistory(nodeId);
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Reading a copy is a disk read, so it happens for the highlighted row only
  // — moving down the list with the arrow keys reads one file per press, not
  // fifty up front.
  useEffect(() => {
    const snapshot = snapshots?.[highlighted];
    if (snapshot) select(snapshot);
  }, [highlighted, select, snapshots]);

  // Escape at the window rather than on the dialog: with no versions to show
  // there is no list to focus, so the keypress arrives on the body and a
  // handler bound to this element never hears it. Closing a dialog has to work
  // whether or not anything inside it is focused.
  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose]);

  function onKeyDown(event: React.KeyboardEvent) {
    const step = listStepForKey(event);
    if (!step || !snapshots || snapshots.length === 0) return;
    event.preventDefault();
    setHighlighted((at) => stepIndex(at, step, snapshots.length));
  }

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  // The list is what this dialog is, so it takes focus on open — arrow keys
  // walk the versions without anyone having to Tab into anything first. With
  // nothing to list, the close button takes it instead, so Tab starts inside
  // the dialog rather than in the window behind it.
  useEffect(() => {
    if (snapshots && snapshots.length > 0) listRef.current?.focus();
    else if (snapshots) closeRef.current?.focus();
  }, [snapshots]);

  return createPortal(
    <div className="ui-backdrop" onMouseDown={onClose}>
      <div
        className="ui-modal ui-modal-xl page-history"
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-history-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <header className="page-history-header">
          <History size={18} className="page-history-icon" />
          <h2 id="page-history-title" className="page-history-title">
            Earlier versions of “{node?.name ?? "this page"}”
          </h2>
        </header>

        {snapshots === null && <p className="page-history-empty">Looking…</p>}

        {snapshots !== null && snapshots.length === 0 && (
          <p className="page-history-empty">
            Nothing kept yet. Anamnesis puts a copy of a page aside before it saves over it — at most one every few
            minutes, and always before a page is deleted — so a page written in one sitting and not touched since has
            nothing here.
          </p>
        )}

        {snapshots !== null && snapshots.length > 0 && (
          <div className="page-history-body">
            <ul
              ref={listRef}
              className="page-history-list"
              role="listbox"
              aria-label="Versions"
              tabIndex={0}
            >
              {snapshots.map((snapshot, index) => (
                <li key={snapshot.name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === highlighted}
                    className={`page-history-row${index === highlighted ? " page-history-row-active" : ""}`}
                    onClick={() => setHighlighted(index)}
                  >
                    <span className="page-history-when">{timeAgo(snapshot.at, listedAt) ?? "unknown"}</span>
                    <span className="page-history-exact">{new Date(snapshot.at).toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="page-history-preview">
              {selected ? <VersionPreview tabs={selected.node.tabs} name={selected.node.name} /> : <p>Reading…</p>}
            </div>
          </div>
        )}

        <footer className="page-history-footer">
          <p className="page-history-note">
            Restoring puts this version's writing, properties and tags back. It leaves the page where it is in the
            tree. What's on the page now is kept as a version first, and Ctrl+Z undoes a restore.
          </p>
          <div className="page-history-actions">
            <button ref={closeRef} type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              disabled={!selected || isRestoring}
              onClick={() => void restore().then((ok) => ok && onClose())}
            >
              <RotateCcw size={14} />
              {isRestoring ? "Restoring…" : "Restore this version"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/**
 * What a copy said, tab by tab.
 *
 * Plain text rather than a rendered editor: a second BlockNote instance per
 * keypress of the arrow key would be slow, and what somebody is checking here
 * is *which* version this is — the words, not the formatting. Reusing the
 * search index's own extractor keeps it one implementation.
 */
function VersionPreview({ name, tabs }: { name: string; tabs: Tab[] }) {
  return (
    <>
      <h3 className="page-history-preview-name">{name}</h3>
      {tabs.length === 0 && <p className="page-history-empty">This version had no tabs.</p>}
      {tabs.map((tab) => {
        const text = documentText(tab.content);
        return (
          <section key={tab.id} className="page-history-tab">
            <h4 className="page-history-tab-name">{tab.label}</h4>
            <p className="page-history-tab-text">{text || <em>Empty</em>}</p>
          </section>
        );
      })}
    </>
  );
}
