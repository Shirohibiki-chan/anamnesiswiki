// The "Turn into" submenu — which layout a page becomes when it is shown as a
// database. Phase 23, step 4.
//
// It was a flat "Turn into a table" through steps 1 to 3, because a submenu
// holding one item is a click for nothing. Now there are four.
//
// Swaps into the same popover the context menu was in, the way SortMenu does
// and for the same reason — see the note there. The header doubles as the way
// back.
import { ArrowLeft } from "lucide-react";
import { DATABASE_LAYOUTS, type DatabaseLayout } from "../../constants/schema";

const LAYOUT_LABELS: Record<DatabaseLayout, string> = {
  table: "Table",
  cards: "Cards",
  board: "Board",
  list: "List",
};

type Props = {
  onSelect: (layout: DatabaseLayout) => void;
  onBack: () => void;
};

export function DatabaseLayoutSubmenu({ onSelect, onBack }: Props) {
  return (
    <div className="tree-context-menu">
      <button type="button" className="tree-context-menu-back" onClick={onBack}>
        <ArrowLeft size={13} /> Turn into
      </button>
      {DATABASE_LAYOUTS.map((layout) => (
        <button key={layout} type="button" onClick={() => onSelect(layout)}>
          {LAYOUT_LABELS[layout]}
        </button>
      ))}
    </div>
  );
}
