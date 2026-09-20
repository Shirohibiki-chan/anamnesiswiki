// The tab strip along the bottom of a board: its sheets, and a + for one
// more (Phase 32, step 13). The boards inside this one, drawn from the
// tree — see hooks/use-board-sheets.ts.
import { Plus } from "lucide-react";
import { useBoardSheets } from "../../hooks/use-board-sheets";

export function BoardSheets({ boardId }: { boardId: string }) {
  const { sheets, open, add } = useBoardSheets(boardId);
  return (
    <nav className="board-sheets" aria-label="Boards in this one" data-testid="board-sheets">
      {sheets.map((sheet) => (
        <button
          type="button"
          key={sheet.id}
          className="board-sheet"
          aria-current={sheet.id === boardId ? "page" : undefined}
          title={sheet.id === boardId ? "This board" : `Open ${sheet.name}`}
          onClick={() => {
            if (sheet.id !== boardId) open(sheet.id);
          }}
        >
          {sheet.name}
        </button>
      ))}
      <button type="button" className="board-sheet-add" onClick={add} title="Add a Board" aria-label="Add a board inside this one">
        <Plus size={14} />
      </button>
    </nav>
  );
}
