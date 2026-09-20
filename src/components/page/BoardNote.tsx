// A sticky note on a board: the coloured square drawn inside the library's
// embed box, and the editor for its words. Phase 32, step 10.
//
// **Two faces of one box.** Not being edited, the note draws its lines as
// plain React and takes no pointer at all, so it selects, moves and turns
// like any shape (board.css). Being edited, the same box is the browser's
// own contenteditable — the library's rules for its text editor apply to
// it too, since it is marked the way the library marks its own — and it
// takes the pointer and the keyboard until editing ends. The two are
// different elements on purpose: React never reconciles inside the box the
// browser is editing, and the words are read back off that box, into runs,
// on every change.
//
// **It grows with its words.** The words' own height is measured whenever
// it changes and told to the canvas, which is the one that can make the
// library's box taller.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type MutableRefObject, type ReactNode, type RefObject } from "react";
import { noteHtml, noteLinesFromDom, type Note, type NoteLine } from "../../services/board-notes";

/** What the canvas can ask of the note being edited: put a link in its words. */
export type NoteEditor = {
  /** Wraps the selected words in a link, or puts `text` linked at the caret when nothing is selected. */
  insertLink: (href: string, text: string) => void;
  /** The keyboard back in the words, where it was. */
  focus: () => void;
};

/** How long a note just opened for writing keeps taking the keyboard back from nothing. */
const KEEP_FOCUS_MS = 800;

type Props = {
  id: string;
  note: Note;
  editing: boolean;
  /** Where the canvas keeps its handle on the note being edited; set by the note while it is. */
  editorRef: MutableRefObject<NoteEditor | null>;
  /** The words as they stand, on every change while editing. */
  onEdit: (id: string, lines: NoteLine[]) => void;
  /** The words' size changed, or may have: the canvas measures and grows the box. */
  onMeasure: () => void;
  /** Escape, or anything else that means she is done writing. */
  onDone: (id: string) => void;
  /** Ctrl+K: she wants a link at the caret. */
  onWantLink: (id: string) => void;
  /** A link in the words clicked, when not editing. */
  onOpenLink: (href: string) => void;
};

export function BoardNote({ id, note, editing, editorRef, onEdit, onMeasure, onDone, onWantLink, onOpenLink }: Props) {
  const wordsRef = useRef<HTMLDivElement | null>(null);
  // Where the caret was last seen while editing, so a link picked from the
  // top-right button — which takes the focus — goes back where she was.
  const rangeRef = useRef<Range | null>(null);

  const report = useCallback(() => {
    const words = wordsRef.current;
    if (words) onEdit(id, noteLinesFromDom(words));
  }, [id, onEdit]);

  // The words' size changing — a wider box that wraps less, a narrower
  // one that wraps more, a keystroke — is the canvas's cue to measure.
  // Watched on whichever of the two boxes is up, and told again straight
  // from every keystroke below, since the observer alone was seen to fall
  // silent mid-edit on one machine.
  useEffect(() => {
    const words = wordsRef.current;
    if (!words || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(onMeasure);
    observer.observe(words);
    return () => observer.disconnect();
  }, [editing, onMeasure]);

  // Editing starts: the keyboard goes into the box, at the end of the
  // words. And it is kept there through the first moments: the library's
  // own wake timers from the clicks that started the writing fire after
  // this, each a state change and a redraw, and on a slow machine one of
  // them was seen to leave the keyboard on nothing at all (CI, 2026-09-20)
  // — so for a short while the box takes it back whenever it finds the
  // keyboard on the body or on the library's own container, never from a
  // box that takes typing, such as the link picker's.
  useLayoutEffect(() => {
    if (!editing) return;
    const words = wordsRef.current;
    if (!words) return;
    const take = () => {
      words.focus();
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(words);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    };
    take();
    const until = performance.now() + KEEP_FOCUS_MS;
    let frame = 0;
    const keep = () => {
      const active = document.activeElement;
      if (active !== words && (active === null || active === document.body || active.classList.contains("excalidraw-container"))) take();
      if (performance.now() < until) frame = requestAnimationFrame(keep);
    };
    frame = requestAnimationFrame(keep);
    return () => cancelAnimationFrame(frame);
  }, [editing]);

  // While editing, the caret is remembered on every move, and the canvas is
  // handed a way to put a link where it is.
  useEffect(() => {
    if (!editing) return;
    function onSelectionChange() {
      const selection = window.getSelection();
      const words = wordsRef.current;
      if (!selection || selection.rangeCount === 0 || !words) return;
      const range = selection.getRangeAt(0);
      if (words.contains(range.commonAncestorContainer)) rangeRef.current = range.cloneRange();
    }
    // The document's event, and the box's own key and mouse events too,
    // which arrive in step with the typing where the document's is queued.
    const words = wordsRef.current;
    document.addEventListener("selectionchange", onSelectionChange);
    words?.addEventListener("keyup", onSelectionChange);
    words?.addEventListener("mouseup", onSelectionChange);
    words?.addEventListener("input", onSelectionChange);
    const focus = () => {
      const words = wordsRef.current;
      if (!words) return;
      words.focus();
      const selection = window.getSelection();
      const saved = rangeRef.current;
      if (selection && saved && words.contains(saved.commonAncestorContainer)) {
        selection.removeAllRanges();
        selection.addRange(saved);
      }
    };
    editorRef.current = {
      focus,
      insertLink(href, text) {
        focus();
        const selection = window.getSelection();
        // The browser's own commands, so the native undo inside the box
        // knows about the link too.
        if (selection && !selection.isCollapsed) {
          document.execCommand("createLink", false, href);
        } else {
          const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
          document.execCommand("insertHTML", false, `<a href="${href.replace(/"/g, "&quot;")}">${escaped}</a>&nbsp;`);
        }
        report();
      },
    };
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      words?.removeEventListener("keyup", onSelectionChange);
      words?.removeEventListener("mouseup", onSelectionChange);
      words?.removeEventListener("input", onSelectionChange);
      if (editorRef.current) editorRef.current = null;
    };
  }, [editing, editorRef, report]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      // Ours, not the library's: its Escape would drop the selection too.
      event.preventDefault();
      event.stopPropagation();
      onDone(id);
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      event.stopPropagation();
      onWantLink(id);
    }
  }

  function onLinkClick(event: MouseEvent<HTMLDivElement>) {
    if (editing) return;
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor) return;
    event.preventDefault();
    event.stopPropagation();
    onOpenLink(anchor.getAttribute("href") ?? "");
  }

  return (
    <div className="board-note" data-note-id={id} data-colour={note.colour} data-editing={editing ? "true" : "false"} data-testid="board-note" onClick={onLinkClick}>
      {editing ? (
        <NoteEditorBox key="editor" lines={note.lines} wordsRef={wordsRef} onInput={report} onKeyDown={onKeyDown} />
      ) : (
        <div key="words" ref={wordsRef} className="board-note-words">
          {note.lines.map((line, index) => (
            <div key={index} className="board-note-line">
              {line.length === 0 ? <br /> : line.map((run, runIndex) => <Run key={runIndex} text={run.text} bold={run.bold} italic={run.italic} link={run.link} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The box being written in. Its starting HTML is fixed on mount for the
 * whole edit — React resets a box's contents whenever that string changes,
 * which would throw the caret away mid-word — and it is unmounted, not
 * updated, when the writing ends.
 */
function NoteEditorBox({
  lines,
  wordsRef,
  onInput,
  onKeyDown,
}: {
  lines: NoteLine[];
  wordsRef: RefObject<HTMLDivElement | null>;
  onInput: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
  // One object for the whole edit, not a fresh one per render: React
  // rewrites the box whenever the object changes, not only the string.
  const [startHtml] = useState(() => ({ __html: noteHtml(lines) }));
  return (
    <div
      ref={wordsRef}
      className="board-note-words"
      contentEditable
      suppressContentEditableWarning
      // The library's own mark for its text editor: keys typed here are
      // the box's, not tool shortcuts, and a paste here is a paste of
      // words rather than a shape.
      data-type="wysiwyg"
      spellCheck
      onInput={onInput}
      onKeyDown={onKeyDown}
      dangerouslySetInnerHTML={startHtml}
    />
  );
}

function Run({ text, bold, italic, link }: { text: string; bold?: true; italic?: true; link?: string }) {
  let inner: ReactNode = text;
  if (italic) inner = <em>{inner}</em>;
  if (bold) inner = <strong>{inner}</strong>;
  if (link) inner = <a href={link}>{inner}</a>;
  return <>{inner}</>;
}
