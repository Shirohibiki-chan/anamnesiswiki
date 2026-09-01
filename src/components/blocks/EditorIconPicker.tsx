// The icon picker, as the editor's own blocks get to see it. Phase 19.5.
//
// **This is the component that fills `IconPickContext`.** A callout and an
// inline icon both want the picker that shipped in Phase 18c, and both live
// under `services/`, which may not import a component — so the slot is filled
// from this side. See `services/editor-blocks/icon-pick-context.ts`, and
// `PageBlock.tsx` for the same arrangement one layer down.
//
// **A module-level component and not a closure**, which is load-bearing: it is
// handed across as a type, and a component built during another component's
// render is a new type on every keystroke, which would tear the popover down
// and rebuild it as she types.
import { TreePopover } from "../tree/TreePopover";
import { IconPicker } from "./IconPicker";

export function EditorIconPicker({
  anchorRect,
  value,
  onPick,
  defaultAction,
  onClose,
}: {
  anchorRect: DOMRect;
  value: string | undefined;
  onPick: (icon: string | undefined) => void;
  defaultAction?: { label: string; onPick: () => void };
  onClose: () => void;
}) {
  return (
    // `TreePopover` portals to the body, which is what makes this safe to
    // render from inside the writing: the popover's DOM never lands inside
    // ProseMirror's contenteditable, so nothing typed into its search box is
    // typed into the page.
    <TreePopover anchorRect={anchorRect} onClose={onClose}>
      <IconPicker value={value} onPick={onPick} defaultAction={defaultAction} />
    </TreePopover>
  );
}
