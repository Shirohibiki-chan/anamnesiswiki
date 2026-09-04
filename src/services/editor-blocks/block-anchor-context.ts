// What a block's "Copy link to this block" needs from the page around it.
// Phase 19.5.
//
// **A context rather than a prop, because of what BlockNote's side menu takes.**
// `SideMenuController` is handed a *component type* and renders it itself, so
// the item cannot be given anything by the component that mounts it — and a
// component built during render is a new type on every keystroke, which React
// answers by throwing the subtree away (the same bug the formatting toolbar
// had; Editor.tsx tells that story). The type stays at the module level and
// the page it is looking at arrives through here.
//
// **Its own file so nothing here is a component**, which is what keeps fast
// refresh working for the files that consume it — same reason as
// `icon-pick-context.ts` beside it.
import { createContext } from "react";

/** What the item that copies a block link needs from the page around it. */
export type BlockAnchorSlot = {
  /**
   * The page whose writing is on screen. The item does not draw without one —
   * a link that names no page is not a link — which is the case in any place
   * that renders a document with no app around it.
   */
  nodeId: string;
  /**
   * A link to this block has just been copied.
   *
   * **The confirmation, and it has to come from out here.** The menu shuts on
   * the click, taking anything the item itself could say with it, so what says
   * it worked is the block being marked for a moment — the same mark a link
   * arriving at a block leaves, which is the honest thing for it to mean:
   * *this* is what the link points at.
   */
  onCopied: (blockId: string) => void;
};

export const BlockAnchorContext = createContext<BlockAnchorSlot | null>(null);
