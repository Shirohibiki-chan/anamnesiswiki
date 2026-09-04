// What linking page names in bulk is about to do, before it does it.
// Phase 19.5. See docs/plan.md.
//
// **This dialog is the feature's safety.** Everything else in the app changes
// what she is looking at as she asks for it; this one rewrites prose she wrote
// weeks ago, in places that may be off screen. A page where forty names quietly
// turn blue is worse than no feature at all — so nothing is written until this
// has been read and accepted, and every match arrives ticked but removable.
//
// **Grouped by page, because that is the decision she is actually making.** The
// question is rarely "should this one sentence link" and almost always "should
// mentions of Quietgate be links" — twelve rows of the same name with twelve
// ticks is the same answer typed twelve times.
//
// Mounted once at the app root, rendering nothing until something asks — the
// same shape as the dialogs beside it.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { LinkMatch } from "../../services/auto-link-service";
import { useDialogs } from "../../hooks/use-dialogs";

export function AutoLinkDialog() {
  const { pendingAutoLink, resolveAutoLink } = useDialogs();
  if (!pendingAutoLink) return null;

  // Split so the body mounts only while the dialog is open and its ticks start
  // from the matches by construction, rather than through an effect that has to
  // remember to reset them. Same reasoning as NewPageLinkDialog.
  return <AutoLinkChooser matches={pendingAutoLink.matches} onResolve={resolveAutoLink} />;
}

function AutoLinkChooser({
  matches,
  onResolve,
}: {
  matches: LinkMatch[];
  onResolve: (chosen: LinkMatch[] | null) => void;
}) {
  // Which *pages* are ticked. Every match of a ticked page is linked, which is
  // the grouping the heading above describes.
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onResolve(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onResolve]);

  /** One row per page, in the order the page first mentions it. */
  const groups = useMemo(() => {
    const byPage = new Map<string, { nodeId: string; pageName: string; matches: LinkMatch[] }>();
    for (const match of matches) {
      const existing = byPage.get(match.nodeId);
      if (existing) existing.matches.push(match);
      else byPage.set(match.nodeId, { nodeId: match.nodeId, pageName: match.pageName, matches: [match] });
    }
    return [...byPage.values()];
  }, [matches]);

  const chosen = matches.filter((match) => !skipped.has(match.nodeId));

  function toggle(nodeId: string) {
    setSkipped((was) => {
      const next = new Set(was);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  return createPortal(
    <div className="ui-backdrop" onClick={() => onResolve(null)}>
      <div className="ui-modal ui-modal-lg auto-link-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="confirm-dialog-title">Link page names</h2>
        <p className="auto-link-intro">
          {matches.length === 1
            ? "One name on this page isn't a link yet."
            : `${matches.length} names on this page aren't links yet.`}{" "}
          Untick anything you'd rather leave as writing.
        </p>

        <div className="auto-link-list">
          {groups.map((group) => {
            const on = !skipped.has(group.nodeId);
            return (
              <div key={group.nodeId} className="auto-link-group">
                <label className="auto-link-page">
                  <input type="checkbox" checked={on} onChange={() => toggle(group.nodeId)} />
                  <span className="auto-link-page-name">{group.pageName}</span>
                  <span className="auto-link-count">
                    {group.matches.length === 1 ? "once" : `${group.matches.length} times`}
                  </span>
                </label>
                {/* The sentence rather than the name, because the name is
                    already in the heading — what she is judging is whether
                    *this* use of the word means the page. */}
                <ul className="auto-link-samples">
                  {group.matches.slice(0, 3).map((match, at) => (
                    <li key={`${match.blockId}-${match.itemIndex}-${match.start}-${at}`}>{match.context}</li>
                  ))}
                  {group.matches.length > 3 && (
                    <li className="auto-link-more">and {group.matches.length - 3} more</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="auto-link-actions">
          <button type="button" className="ui-btn ui-btn-secondary" onClick={() => onResolve(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            disabled={chosen.length === 0}
            onClick={() => onResolve(chosen)}
          >
            {chosen.length === matches.length
              ? "Link them"
              : `Link ${chosen.length} of ${matches.length}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
