// Earlier versions of the tree itself: the order of the pages, the home page,
// the pins and which folders were open (Phase 19).
//
// **The sibling of PageHistory.tsx, sharing its markup and its stylesheet.**
// Two dialogs that look different for no reason would read as two features,
// and this is the same feature pointed at the other file in a world whose loss
// would hurt — `project.json`. What differs is the preview: a copy of a page is
// words, and a copy of this is a shape, so it names what the arrangement puts
// back rather than quoting it.
import { History, RotateCcw } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { listStepForKey, stepIndex } from "../../services/list-keys";
import { timeAgo } from "../../services/relative-time";
import { useProjectHistory } from "../../hooks/use-project-history";
import { useShortcutLabel } from "../../hooks/use-shortcuts";
import { useProject } from "../../hooks/use-project";

export function ProjectHistory({ onClose }: { onClose: () => void }) {
  const { nodes } = useProject();
  const { snapshots, listedAt, selected, select, restore, isRestoring } = useProjectHistory();
  const [highlighted, setHighlighted] = useState(0);
  const undoKey = useShortcutLabel("undo");
  const listRef = useRef<HTMLUListElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const snapshot = snapshots?.[highlighted];
    if (snapshot) select(snapshot);
  }, [highlighted, select, snapshots]);

  // At the window rather than on the dialog — see PageHistory for why.
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

  useEffect(() => {
    if (snapshots && snapshots.length > 0) listRef.current?.focus();
    else if (snapshots) closeRef.current?.focus();
  }, [snapshots]);

  const nameOf = (id: string) => nodes[id]?.name;

  return createPortal(
    <div className="ui-backdrop" onMouseDown={onClose}>
      <div
        className="ui-modal ui-modal-xl page-history"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-history-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <header className="page-history-header">
          <History size={18} className="page-history-icon" />
          <h2 id="project-history-title" className="page-history-title">
            Earlier versions of this project's tree
          </h2>
        </header>

        {snapshots === null && <p className="page-history-loading">Looking…</p>}

        {snapshots !== null && snapshots.length === 0 && (
          <p className="page-history-empty">
            Nothing kept yet. Anamnesis puts a copy of the tree's arrangement aside before it saves over it — at most
            one every few minutes — so a project whose pages haven't been moved around has nothing here.
          </p>
        )}

        {snapshots !== null && snapshots.length > 0 && (
          <div className="page-history-body">
            <ul ref={listRef} className="page-history-list" role="listbox" aria-label="Versions" tabIndex={0}>
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
              {selected ? (
                <>
                  <h3 className="page-history-preview-name">
                    {selected.pages === 1 ? "1 page" : `${selected.pages} pages`} arranged
                  </h3>

                  {/* The number that decides whether an old arrangement is worth
                      having. Pages deleted since are left out of what comes back
                      — see restoreProjectPatch — and saying so here is what stops
                      that being a surprise. */}
                  {selected.missing > 0 && (
                    <p className="page-history-tab-text">
                      {selected.missing === 1 ? "1 page it mentions has" : `${selected.missing} pages it mentions have`}{" "}
                      been deleted since. They stay deleted.
                    </p>
                  )}

                  <section className="page-history-tab">
                    <h4 className="page-history-tab-name">Home page</h4>
                    <p className="page-history-tab-text">
                      {selected.project.homeNodeId ? (
                        (nameOf(selected.project.homeNodeId) ?? <em>a page that no longer exists</em>)
                      ) : (
                        <em>None</em>
                      )}
                    </p>
                  </section>

                  <section className="page-history-tab">
                    <h4 className="page-history-tab-name">Pinned</h4>
                    <p className="page-history-tab-text">
                      {(selected.project.pinnedIds ?? []).map(nameOf).filter(Boolean).join(", ") || <em>None</em>}
                    </p>
                  </section>

                  <section className="page-history-tab">
                    <h4 className="page-history-tab-name">Top level, in order</h4>
                    <p className="page-history-tab-text">
                      {selected.project.rootOrder.map(nameOf).filter(Boolean).join(", ") || <em>Empty</em>}
                    </p>
                  </section>
                </>
              ) : (
                <p>Reading…</p>
              )}
            </div>
          </div>
        )}

        <footer className="page-history-footer">
          <p className="page-history-note">
            Restoring puts back the order of your pages, the home page, the pinned pages and which folders were open.
            It doesn't touch what any page says, and no page comes back or goes away. What the tree looks like now is
            kept as a version first, and <kbd>{undoKey}</kbd> undoes a restore.
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
