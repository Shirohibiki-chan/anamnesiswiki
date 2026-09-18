// How a board's drawing gets from the drawing library onto disk, and which
// theme it is drawn in. Board spike, 2026-09-13. The component renders; this
// decides when a change is worth writing.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Board } from "../constants/schema";
import { boardFingerprint, boardFromScene, boardStartState } from "../services/board-service";
import { useBoard, useSetBoard } from "./use-board";

/**
 * How long the drawing has to hold still before it is written. The library
 * reports a change on every pointer move; a stroke is dozens of them, and
 * writing a JSON file per pixel would be the one thing that made the board
 * feel slow.
 */
const SETTLE_MS = 600;

/**
 * Which of the library's two looks the app's current theme wants.
 *
 * The app's themes carry no light/dark flag — a theme is a set of tokens and
 * nothing more — so the answer is read off the page background: a dark
 * surface gets the dark board. Measured once per board mount, which is
 * enough for a spike; a theme switched while a board is open redraws on the
 * next visit.
 */
function boardThemeFor(element: Element | null): "light" | "dark" {
  if (!element) return "dark";
  const color = getComputedStyle(element).backgroundColor;
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (!match) return "dark";
  const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.5 ? "light" : "dark";
}

export function useBoardView(boardId: string, surface: Element | null) {
  const board = useBoard(boardId);
  const setBoard = useSetBoard();

  // What is on disk, as a fingerprint, so a change report that changes
  // nothing — a hover, a selection, a menu opening — costs a string compare
  // and no write.
  // The dotted background, the one thing on a board that is the app's
  // rather than the library's. Held here so a toggle writes the file the
  // same way a stroke does, with whatever the library last reported.
  const [dots, setDotsState] = useState(board.dots);
  const dotsRef = useRef(board.dots);
  const sceneRef = useRef<{ elements: readonly unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> }>({
    elements: board.elements,
    appState: board.appState,
    files: board.files,
  });

  const savedRef = useRef(boardFingerprint(board.elements, board.appState, board.dots));
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<Board | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    setBoard(boardId, pending);
  }, [boardId, setBoard]);

  const onChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => {
      sceneRef.current = { elements, appState, files };
      const fingerprint = boardFingerprint(elements, appState, dotsRef.current);
      if (fingerprint === savedRef.current) return;
      savedRef.current = fingerprint;
      pendingRef.current = boardFromScene(elements, appState, files, dotsRef.current);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(flush, SETTLE_MS);
    },
    [flush],
  );

  // Written at once rather than after the settle delay: a toggle is one
  // deliberate act, not the middle of a stroke.
  const toggleDots = useCallback(() => {
    const next = !dotsRef.current;
    dotsRef.current = next;
    setDotsState(next);
    const { elements, appState, files } = sceneRef.current;
    savedRef.current = boardFingerprint(elements, appState, next);
    pendingRef.current = boardFromScene(elements, appState, files, next);
    flush();
  }, [flush]);

  // Leaving the page writes whatever was still settling, so a stroke drawn
  // a moment before clicking away is not the one that gets lost.
  useEffect(() => flush, [flush]);

  // The drawing the library starts from. Read once: after mount the library
  // owns the scene and the store is only ever told about it, never the other
  // way round, so feeding store updates back in would echo every save.
  const initialData = useMemo(
    () => ({ elements: board.elements, appState: boardStartState(board.appState), files: board.files }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardId],
  );

  const theme = useMemo(() => boardThemeFor(surface), [surface]);

  return { initialData, theme, onChange, dots, toggleDots };
}
