// Keyboard control of a picture that's selected in the editor — resize it with
// `+` and `-`, put it back with `0`, replace it with Enter. See docs/plan.md
// Phase 16, which takes this from Obsidian 1.13/1.14.
//
// Two of the keys in that list aren't here, and that's the finding rather than
// an omission: **Backspace and Ctrl/Cmd-C/X already work**, because ProseMirror
// implements them for any selected node and BlockNote's picture is one.
// Measured 2026-08-11 — Backspace on a selected picture took the document from
// three blocks to two. Writing our own would have been a second definition of
// delete that could drift from the real one.
//
// Selecting the picture is likewise ProseMirror's: clicking it, or arrowing
// into it from the line above or below. Nothing here changes how that happens;
// it only reads the result.
import { FilePanelExtension, type BlockNoteEditor } from "@blocknote/core";
import { IMAGE_MIN_PREVIEW_WIDTH, IMAGE_RESIZE_STEP } from "../../constants/limits";

/**
 * ProseMirror's own class for "this node is the selection", which is the exact
 * question being asked and the reason this is read off the DOM rather than out
 * of the editor's state. `getSelection()` reports the *block* a picture is in,
 * and a block is also what it reports when the caret is merely sitting next to
 * one — so resizing on that would fire while she was typing a paragraph.
 */
const SELECTED_NODE_SELECTOR = ".ProseMirror-selectednode";
const IMAGE_SELECTOR = "img.bn-visual-media";

/** See suggestion-list-keys.ts — structural so a service needn't import React. */
export type ImageKeyEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
  preventDefault: () => void;
  stopPropagation: () => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * One press of `+` or `-`.
 *
 * A factor rather than a number of pixels, so a press does the same *amount*
 * to a thumbnail as to a picture running the width of the page — 40px would be
 * most of the first and nothing at all to the second.
 *
 * The floor and the ceiling are the two BlockNote's own drag handles use, read
 * from its source rather than picked: 64px, and the width of the editor. That
 * matters more than the numbers do — a picture you dragged to the edge and one
 * you pressed `+` up to the edge should stop in the same place.
 */
export function stepPreviewWidth(current: number, direction: 1 | -1, maxWidth: number): number {
  const scaled = direction > 0 ? current * IMAGE_RESIZE_STEP : current / IMAGE_RESIZE_STEP;
  const ceiling = Math.max(maxWidth, IMAGE_MIN_PREVIEW_WIDTH);
  return Math.round(clamp(scaled, IMAGE_MIN_PREVIEW_WIDTH, ceiling));
}

type SelectedImage = { blockId: string; width: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
function selectedImage(editor: BlockNoteEditor<any, any, any>): SelectedImage | null {
  const root = editor.domElement;
  if (!root) return null;

  const selected = root.querySelector(SELECTED_NODE_SELECTOR);
  const image = selected?.querySelector<HTMLImageElement>(IMAGE_SELECTOR);
  const blockId = selected?.closest("[data-id]")?.getAttribute("data-id");
  if (!image || !blockId) return null;

  // The laid-out width, not the stored `previewWidth` prop: a picture that has
  // never been resized has no prop at all, and starting from "undefined" would
  // mean the first `+` jumping it to some invented default. What's on screen is
  // what the next size should be relative to.
  return { blockId, width: image.offsetWidth };
}

/**
 * The widest a picture may be, taken from the same expression BlockNote's
 * resize handles use so the two can't disagree.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
function maxPreviewWidth(editor: BlockNoteEditor<any, any, any>): number {
  return editor.domElement?.firstElementChild?.clientWidth || Number.MAX_SAFE_INTEGER;
}

/**
 * Returns true when the keypress was handled, so the caller knows to stop.
 *
 * **Stopped as well as prevented**, and Enter is why: ProseMirror's handler
 * sits on the editor element, below the root container React attaches this to,
 * and it would otherwise insert a paragraph underneath the picture on the way
 * past. `preventDefault` alone doesn't reach it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
export function handleImageKeys(editor: BlockNoteEditor<any, any, any>, event: ImageKeyEvent): boolean {
  // Ctrl/Cmd-C and -X are ProseMirror's, and Alt combinations are the OS's.
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  // The caption box and the replace panel are real text fields, where `-` is a
  // hyphen and Enter means "done". `contenteditable` isn't checked because the
  // editor itself is one — these three are the only fields in play.
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return false;
  }

  // `=` as well as `+`, because `+` is a shifted key on most layouts and
  // holding shift to enlarge a picture is a detail nobody should have to know.
  // The lightbox takes the same pair, for the same reason.
  const isGrow = event.key === "+" || event.key === "=";
  const isShrink = event.key === "-";
  const isReset = event.key === "0";
  const isReplace = event.key === "Enter";
  if (!isGrow && !isShrink && !isReset && !isReplace) return false;

  const found = selectedImage(editor);
  if (!found) return false;

  if (isReplace) {
    // The same panel the toolbar's replace button shows, opened the same way
    // BlockNote's own "Add image" button opens it.
    editor.getExtension(FilePanelExtension)?.showMenu(found.blockId);
  } else if (isReset) {
    // Back to the size the file itself is. `undefined` is the prop's own
    // default and what a picture that's never been resized carries.
    editor.updateBlock(found.blockId, { props: { previewWidth: undefined } });
  } else {
    const width = stepPreviewWidth(found.width, isGrow ? 1 : -1, maxPreviewWidth(editor));
    editor.updateBlock(found.blockId, { props: { previewWidth: width } });
  }

  event.preventDefault();
  event.stopPropagation();
  return true;
}
