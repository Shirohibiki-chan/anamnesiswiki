// The contents list itself — the rows, and what a click on one does.
// Phase 19.5.
//
// **Its own file so `table-of-contents.tsx` exports no component.** That file
// is the block spec and its config; a component beside them costs the whole
// file its fast refresh, which is the same reason `ColumnLane.tsx` sits beside
// `columns.tsx` and `MentionChip.tsx` beside its inline content spec.
import { useState } from "react";
import { useBlockNoteEditor, useEditorChange, useEditorDOMElement } from "@blocknote/react";
import { headingsOf, type TocHeading } from "../toc-service";

/**
 * The list itself.
 *
 * **Redrawn on every change to the document, and that is the feature.** A
 * contents list that only refreshed when the page was reopened would be wrong
 * for the whole of the time she was writing the headings it is meant to be
 * listing.
 */
export function PageContents() {
  const editor = useBlockNoteEditor();
  const editorDom = useEditorDOMElement();
  const [headings, setHeadings] = useState<TocHeading[]>(() => headingsOf(editor.document));
  useEditorChange(() => setHeadings(headingsOf(editor.document)), editor);

  // **Scrolled to rather than selected.** Putting the caret in a heading from
  // here would mean a click on the contents list quietly moved where the next
  // keystroke lands, which is not what following a contents list means.
  function goTo(id: string) {
    const heading = editorDom?.querySelector(`[data-id="${CSS.escape(id)}"]`);
    heading?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="page-contents" contentEditable={false}>
      <span className="ui-eyebrow page-contents-title">Contents</span>
      {headings.length === 0 ? (
        // An empty box with a heading and nothing else reads as something that
        // failed. This says what will fill it.
        <p className="page-contents-empty">The headings you write on this page will be listed here.</p>
      ) : (
        <ol className="page-contents-list">
          {headings.map((heading) => (
            <li key={heading.id} className={`page-contents-item page-contents-level-${Math.min(heading.level, 3)}`}>
              <button type="button" onClick={() => goTo(heading.id)}>
                {heading.text}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
