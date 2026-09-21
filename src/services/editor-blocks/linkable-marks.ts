// A quiet mark under any words that could be a link to a page, drawn while
// she writes (Queued Adjustments, 2026-09-21). The other half of `/Link page
// names` (Phase 19.5): that one shows what could be linked when asked; this
// shows it without being asked, and changes nothing.
//
// **A ProseMirror decoration, through BlockNote's own extension API** —
// `prosemirrorPlugins` on `createExtension`, the documented way in, the same
// door `select-all.ts` uses. Decorations are drawn over the text without
// touching the document, so nothing is saved, nothing goes into the file, and
// the marks vanish the moment the setting is off.
//
// **Recomputed on every change, over the whole document.** The matcher is the
// one the preview dialog uses (`matchesInText`), run per text node, so what is
// underlined and what `/Link page names` would offer agree by construction.
// Whole-document is fine at this scale — a few hundred names against a page
// of prose is well under a millisecond — and it keeps the plugin free of the
// range arithmetic that goes wrong. Text already inside a link is skipped;
// mentions are not text nodes at all, so they never match.
import { createExtension, type ExtensionOptions } from "@blocknote/core";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorState, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { LinkableName } from "../auto-link-service";
import { matchesInText } from "../auto-link-service";

export const LINKABLE_MARK_CLASS = "editor-linkable";

const key = new PluginKey<DecorationSet>("anamnesisLinkableMarks");

function decorate(state: EditorState, names: LinkableName[]): DecorationSet {
  if (names.length === 0) return DecorationSet.empty;
  const decorations: Decoration[] = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    if (node.marks.some((mark) => mark.type.name === "link")) return;
    for (const match of matchesInText(node.text, names)) {
      decorations.push(
        Decoration.inline(pos + match.start, pos + match.end, {
          class: LINKABLE_MARK_CLASS,
          title: `Could link to ${match.pageName} — type /Link page names`,
        }),
      );
    }
  });
  return DecorationSet.create(state.doc, decorations);
}

/**
 * The extension. `getNames` is asked on every recompute rather than once,
 * because the pages that could be linked change as the world does — a page
 * made a minute ago is a page that can be linked now.
 */
export const linkableMarksExtension = createExtension(({ options }: ExtensionOptions<{ getNames: () => LinkableName[] }>) => ({
  key: "anamnesisLinkableMarks",
  prosemirrorPlugins: [
    new Plugin<DecorationSet>({
      key,
      state: {
        init: (_config, state) => decorate(state, options.getNames()),
        apply: (tr, old, _oldState, newState) =>
          tr.docChanged || tr.getMeta(key) === "refresh" ? decorate(newState, options.getNames()) : old.map(tr.mapping, tr.doc),
      },
      props: {
        decorations: (state) => key.getState(state) ?? null,
      },
    }),
  ],
}));

/**
 * Redraws the marks without a document change — after the setting flips, or
 * after the world's pages change under an open editor. A no-op before the
 * editor has a view.
 */
export function refreshLinkableMarks(editor: {
  prosemirrorView?: { state: EditorState; dispatch: (tr: Transaction) => void };
}): void {
  // Wrapped because reaching the view before the editor is mounted throws in
  // some versions of the layer underneath rather than returning nothing,
  // and a redraw that could not happen yet is not an error.
  try {
    const view = editor.prosemirrorView;
    if (!view) return;
    view.dispatch(view.state.tr.setMeta(key, "refresh"));
  } catch {
    // Not mounted yet; the plugin's own init draws the marks when it is.
  }
}
