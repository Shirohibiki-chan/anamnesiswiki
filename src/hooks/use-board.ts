// The only import path components have into a board's drawing — see
// CLAUDE.md's layer order. Board spike, 2026-09-13.
import { useCallback } from "react";
import { BOARD_TEMPLATE_KEY, type Board } from "../constants/schema";
import { createBoard } from "../services/board-service";
import { useProjectStore } from "../state/project-store";

/** Whether this page is one whose body is a whiteboard. */
export function isBoardPage(templateKey: string): boolean {
  return templateKey === BOARD_TEMPLATE_KEY;
}

const EMPTY = createBoard();

/** One board's drawing, or an empty one for a board nobody has drawn on. */
export function useBoard(boardId: string | null): Board {
  return useProjectStore((state) => (boardId ? state.boards[boardId] : undefined)) ?? EMPTY;
}

/** Every board's drawing, by the page it belongs to — read here for the reason `useStorylines` gives. */
export function useBoards(): Record<string, Board> {
  return useProjectStore((state) => state.boards);
}

export function useSetBoard(): (boardId: string, board: Board) => void {
  const setBoard = useProjectStore((state) => state.setBoard);
  return useCallback((boardId: string, board: Board) => setBoard(boardId, board), [setBoard]);
}
