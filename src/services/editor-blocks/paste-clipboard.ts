// What Ctrl+V does, and the chord that asks for the other reading (2026-09-22).
//
// The pair of `copy-clipboard.ts`, and deliberately not built the same way.
// Copying out is a matter of where it is going, so it is a setting; pasting in
// is not. Reading `*action text*` as italics **deletes characters that were
// typed on purpose**, and nothing in the page can put them back, while the
// literal reading loses nothing — italics are a Ctrl+I away once the words are
// there. So the literal reading is not a default anyone can turn off by
// accident; asking for Markdown is a thing you do to one paste, with
// Ctrl+Shift+V, the chord that already means "paste without the formatting"
// everywhere else.
//
// **Turning BlockNote's two Markdown options off is not enough, and finding
// that out cost a diagnostic run in the real app.** tiptap's Bold, Italic,
// Strike and Code marks each carry a *paste rule* — a regex run over whatever
// was just pasted — and those fire whatever the paste handler decided, so
// `*TEN SECONDS,*` still arrived italic with its asterisks eaten. They run
// from an `appendTransaction` watching for ProseMirror's `uiEvent: "paste"`
// marker, which every route through the paste pipeline sets. So the literal
// reading does not go through that pipeline at all: it puts the words in with
// `insertInlineContent` and `insertBlocks`, ordinary edits that carry no
// marker and so meet no rules. **Anything that moves this back onto
// `pasteText`, `pasteHTML` or `defaultPasteHandler` brings the asterisk bug
// back with it**, and no unit test can see that happen — the scenario in
// `e2e/pastes-text-into-a-page.e2e.ts` is what notices.
//
// See `docs/handoff.md` § What Ctrl+V reads.
import { createExtension, type BlockNoteEditor, type ExtensionOptions } from "@blocknote/core";
import { Plugin } from "prosemirror-state";
import { paragraphsFromPlainText } from "./paste-as-text";

/**
 * The editor as the rest of this folder types it — see `image-keys.ts` and the
 * slash menus, which take the same three.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
type Editor = BlockNoteEditor<any, any, any>;

/** What BlockNote hands a paste handler. */
type PasteContext = {
  event: ClipboardEvent;
  editor: Editor;
  defaultPasteHandler: (options?: { prioritizeMarkdownOverHTML?: boolean; plainTextAsMarkdown?: boolean }) => boolean | undefined;
};

/** Upstream's defaults, both off: plain text stays text, and real formatting is never thrown away for it. */
const LITERAL = { prioritizeMarkdownOverHTML: false, plainTextAsMarkdown: false };

/**
 * The clipboard formats that are already something better than plain text.
 *
 * A paste carrying any of these is upstream's to handle unchanged — the HTML
 * from Word and Google Docs comes through well and always did, a block copied
 * from another page has to stay that block, a file has to be uploaded.
 */
const RICHER = ["vscode-editor-data", "blocknote/html", "text/markdown", "text/html", "Files"];

/** How long the chord stays armed if no paste follows it — a mis-hit must not change the next ordinary Ctrl+V. */
const ARMED_FOR_MS = 1000;

const isInCodeBlock = (editor: Editor): boolean =>
  editor.transact((tr) => tr.selection.$from.parent.type.spec.code === true && tr.selection.$to.parent.type.spec.code === true);

/** One paragraph of pasted text as a block. An empty one is an empty paragraph, not a missing one. */
const asBlock = (text: string) =>
  text ? { type: "paragraph" as const, content: [{ type: "text" as const, text, styles: {} }] } : { type: "paragraph" as const };

/**
 * Puts plain text in where the selection is, as an ordinary edit.
 *
 * The first paragraph replaces the selection, so a few words pasted into the
 * middle of a sentence are words in that sentence rather than a paragraph of
 * their own. Paragraphs after it become blocks under the one the caret is in,
 * and the caret ends at the end of the last of them, where a paste leaves it.
 *
 * **Known simplification**: pasting several paragraphs into the middle of a
 * sentence leaves the words after the caret on the first paragraph rather than
 * carrying them down to the last, which is what the editor's own paste would
 * do. Splitting the block by hand is the only way to fix it, and it buys a
 * case nobody has — text with paragraphs in it goes onto a line of its own.
 */
function putTextIn(editor: Editor, text: string): void {
  const [first, ...rest] = paragraphsFromPlainText(text);
  if (first) editor.insertInlineContent([{ type: "text", text: first, styles: {} }], { updateSelection: true });
  if (rest.length === 0) return;

  const here = editor.getTextCursorPosition().block;
  const added = editor.insertBlocks(rest.map(asBlock), here, "after");
  const last = added[added.length - 1];
  if (last) editor.setTextCursorPosition(last, "end");
}

/**
 * Ctrl+Shift+V, watched rather than claimed.
 *
 * The handler returns nothing, so the browser goes on to do its own paste and
 * the event that follows is an ordinary one — which is the point. Claiming the
 * key would stop the paste it is trying to describe.
 */
const markdownChordExtension = createExtension(({ options }: ExtensionOptions<{ arm: () => void }>) => ({
  key: "anamnesisMarkdownPasteChord",
  prosemirrorPlugins: [
    new Plugin({
      props: {
        handleDOMEvents: {
          keydown(_view, event) {
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "v") options.arm();
            return false;
          },
        },
      },
    }),
  ],
}));

/**
 * The chord and the handler, which share one armed flag.
 *
 * Made as a pair because that flag is the whole connection between them: the
 * key cannot do the pasting itself (reading the clipboard from script needs a
 * permission this app has never asked for), so what it does is say how to read
 * the paste the browser is about to deliver.
 */
export function pasteAsText(): {
  extension: ReturnType<typeof markdownChordExtension>;
  handler: (context: PasteContext) => boolean | undefined;
} {
  let armed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const arm = () => {
    armed = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      armed = false;
    }, ARMED_FOR_MS);
  };

  const handler = (context: PasteContext): boolean | undefined => {
    const asMarkdown = armed;
    armed = false;
    clearTimeout(timer);
    // The chord asks for exactly what BlockNote does by default.
    if (asMarkdown) return context.defaultPasteHandler();

    const carried = context.event.clipboardData;
    if (!carried) return context.defaultPasteHandler(LITERAL);
    if (RICHER.some((format) => carried.types.includes(format))) return context.defaultPasteHandler(LITERAL);

    const text = carried.getData("text/plain");
    if (!text) return context.defaultPasteHandler(LITERAL);
    // A code block takes its text the way it always has: there is no
    // formatting in one to get wrong, and upstream's path keeps the lines.
    if (isInCodeBlock(context.editor)) return context.defaultPasteHandler(LITERAL);

    putTextIn(context.editor, text);
    return true;
  };

  return { extension: markdownChordExtension({ arm }), handler };
}
