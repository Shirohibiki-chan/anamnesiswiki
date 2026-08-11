// The "Sort sub-pages" submenu. Swaps into the same popover the context menu
// was in, the way the color picker does, rather than flying out sideways: the
// popover is portaled to document.body and positioned from the trigger's rect
// (see TreePopover), so a second layer would need its own flip-and-clamp pass
// against the viewport to avoid opening off the edge of the window. Replacing
// the contents reuses the one that already works.
//
// The header doubles as the way back, so a submenu opened by mistake isn't a
// dead end that has to be dismissed and reopened.
import { ArrowLeft } from "lucide-react";
import { SIBLING_SORTS, SIBLING_SORT_LABELS, type SiblingSort } from "../../services/tree-service";

type SortMenuProps = {
  onSelect: (sort: SiblingSort) => void;
  onBack: () => void;
};

export function SortMenu({ onSelect, onBack }: SortMenuProps) {
  return (
    <div className="tree-context-menu">
      <button type="button" className="tree-context-menu-back" onClick={onBack}>
        <ArrowLeft size={13} /> Sort sub-pages
      </button>
      {SIBLING_SORTS.map((sort) => (
        <button key={sort} type="button" onClick={() => onSelect(sort)}>
          {SIBLING_SORT_LABELS[sort]}
        </button>
      ))}
    </div>
  );
}
