// How the component layer hands the editor its icon picker. Phase 19.5.
//
// **The picker already exists and this is only a door to it.**
// `components/blocks/IconPicker.tsx` shipped in Phase 18c with the glyph
// catalogue, the emoji tab and the search behind them; a callout and an inline
// icon want that exact control, and CLAUDE.md's layer order runs
// `services -> hooks -> components`, so they cannot reach it. The slot is
// filled from the other side, the same way `block-ref-context.ts` fills in the
// renderer for a page block.
//
// **Its own file so nothing here is a component**, which is what keeps fast
// refresh working for the files that consume it.
import { createContext, type ComponentType } from "react";

/**
 * A second answer beside "No icon", for a control whose blank state means
 * something rather than nothing.
 *
 * **A callout is the case this exists for.** Its blank state is the icon its
 * colour implies — a tick on green — so "no icon" and "back to the usual one"
 * are two different answers and a single clear button can only give one of
 * them. Everything else that picks an icon starts from nothing and leaves this
 * out.
 */
export type IconDefaultAction = { label: string; onPick: () => void };

/**
 * Opens the icon picker against `anchorRect` and reports what was chosen.
 *
 * `undefined` out of `onPick` is "no icon", which is why the value is optional
 * on the way in and on the way back out.
 *
 * **A component type, not a function to call.** Whatever fills this slot is a
 * popover with its own state and its own hooks, so it has to be rendered
 * rather than invoked — see `block-ref-context.ts`, which says the same thing
 * for the same reason.
 */
export type IconPickerRenderer = ComponentType<{
  anchorRect: DOMRect;
  value: string | undefined;
  onPick: (icon: string | undefined) => void;
  defaultAction?: IconDefaultAction;
  onClose: () => void;
}>;

/**
 * **Null is a real state, not a missing provider.** These blocks are rendered
 * anywhere a document is rendered, and not every one of those places has the
 * app around it. An icon that cannot be changed still draws; it just stops
 * being a button.
 *
 * Whatever is provided must be a module-level component, for the reason given
 * at length in `block-ref-context.ts`: a component built during render is a new
 * type every keystroke, and React throws away a subtree whose type changed.
 */
export const IconPickContext = createContext<IconPickerRenderer | null>(null);
