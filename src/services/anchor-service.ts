// A link to one spot on a page, rather than to the page. Phase 19.5.
//
// **A block's own menu copies one of these, and pasting it in the writing turns
// it back into a link.** Two halves, and the plan named the hard one: something
// stable to point at. This points at the *block's own id* — BlockNote mints one
// per block and writes it into the document, so it survives editing the words,
// moving the block, and closing the app. The alternative that suggests itself
// is an id made out of the heading's text, which is readable and which dies
// silently the first time the heading is reworded.
//
// **The scheme is ours and goes nowhere else.** Anamnesis is a program on one
// machine, not a site — there is no address for a page that a browser could
// open. A link on the clipboard is for pasting back into Anamnesis, and it is
// written as text so it survives the trip through anything, including a chat
// window it will not work in.
import type { Tab } from "../constants/schema";

/** What a block link starts with. Not a registered protocol; see the file note. */
export const ANCHOR_SCHEME = "anamnesis://";

/** A page, and one block in its writing. */
export type BlockAnchor = {
  nodeId: string;
  /** The BlockNote block's own id — what `data-id` carries in the DOM. */
  blockId: string;
};

/**
 * Ids as they may appear in a link.
 *
 * Deliberately narrow: a link is read off the clipboard, which can hold
 * anything at all, and everything downstream of this treats what comes out as
 * an id worth looking up.
 */
const ID = "[A-Za-z0-9_-]{1,64}";
const LINK = new RegExp(`^anamnesis://page/(${ID})#(${ID})$`);

export function anchorLink(anchor: BlockAnchor): string {
  return `${ANCHOR_SCHEME}page/${anchor.nodeId}#${anchor.blockId}`;
}

/**
 * A block link, or null for anything else on the clipboard.
 *
 * **One link and nothing else, which is the whole check.** Text with a link
 * somewhere inside it is a paragraph she copied, and turning that into a chip
 * would throw the rest of the sentence away. Surrounding whitespace is allowed
 * because selecting a line tends to take the newline with it.
 */
export function parseAnchorLink(text: string): BlockAnchor | null {
  const match = LINK.exec(text.trim());
  if (!match) return null;
  return { nodeId: match[1], blockId: match[2] };
}

/**
 * Which of a page's tabs holds the block a link points at, or null.
 *
 * **Worked out when the link is followed rather than written into it.** A tab
 * is where a block happens to be sitting, not part of what the link means — so
 * a block moved from Overview to History keeps every link to it, and a link to
 * a block that has been deleted resolves to nothing rather than to the wrong
 * tab.
 *
 * A hidden tab counts. Hiding a tab hides what is written in it from a reader;
 * a link she made to something inside it is not a reader.
 */
export function tabHoldingBlock(tabs: Tab[], blockId: string): string | null {
  function holds(documentBlocks: unknown): boolean {
    if (!Array.isArray(documentBlocks)) return false;
    for (const entry of documentBlocks) {
      // Documents are `unknown[]` on purpose — BlockNote's shape, read off
      // disk, so every step down is checked rather than asserted.
      if (!entry || typeof entry !== "object") continue;
      const candidate = entry as { id?: unknown; children?: unknown };
      if (candidate.id === blockId) return true;
      if (holds(candidate.children)) return true;
    }
    return false;
  }

  for (const tab of tabs) {
    if (holds(tab.content)) return tab.id;
  }
  return null;
}
