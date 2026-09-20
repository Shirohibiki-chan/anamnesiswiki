// The sheets of a board — the tab strip along its bottom (Phase 32, step
// 13). tldraw's boards have pages, sheets in a workbook; here a board is
// already a page that holds pages, so the sheets are the boards inside it,
// read off the tree, and the strip is a way of seeing the tree rather than
// a second notion of page. See `boardSheets` for the shape.
import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { BOARD_TEMPLATE_KEY } from "../constants/schema";
import { boardSheets, nextSheetName } from "../services/board-service";
import { useProjectStore } from "../state/project-store";

export type BoardSheet = { id: string; name: string };

export function useBoardSheets(boardId: string): { sheets: BoardSheet[]; open: (id: string) => void; add: () => void } {
  const { nodes, childOrder } = useProjectStore(useShallow((state) => ({ nodes: state.nodes, childOrder: state.project?.childOrder })));
  const sheets = useMemo(() => boardSheets(nodes, childOrder, boardId).map((node) => ({ id: node.id, name: node.name })), [nodes, childOrder, boardId]);

  const open = useCallback((id: string) => {
    useProjectStore.getState().selectNode(id);
  }, []);

  // A new sheet is a new board inside the first one, named after its
  // number, and opened at once: a sheet is made to be drawn on, and its
  // name is one click on the title away. The tree gets it like any page.
  const add = useCallback(() => {
    const { nodes: current, project, addNode, selectNode } = useProjectStore.getState();
    if (!project) return;
    const [head] = boardSheets(current, project.childOrder, boardId);
    if (!head) return;
    const made = addNode({ parentId: head.id, templateKey: BOARD_TEMPLATE_KEY, name: nextSheetName(boardSheets(current, project.childOrder, boardId)) });
    selectNode(made.id);
  }, [boardId]);

  return { sheets, open, add };
}
