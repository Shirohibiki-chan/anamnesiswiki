// A shape on a board pointing at a page: what the picker offers, what a click
// on a link does, and what a linked shape says it is linked to. Board spike,
// links step, 2026-09-13.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOARD_PICKER_RESULTS } from "../constants/board";
import type { Node } from "../constants/schema";
import { boardLinkTarget, linkCandidates, pageLinkFor } from "../services/board-service";
import { openExternalUrl } from "../services/dialog-service";
import { useProjectStore } from "../state/project-store";

/** How long a "no page by that name" notice stays before clearing itself. */
const NOTICE_MS = 3000;

export function useBoardLinks(boardId: string) {
  const nodes = useProjectStore((state) => state.nodes);
  const selectNode = useProjectStore((state) => state.selectNode);

  // A link that goes nowhere says so briefly rather than doing nothing: a
  // click that produces neither a page nor a reason is indistinguishable from
  // a broken board.
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    },
    [],
  );
  const say = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);

  const candidates = useCallback(
    (query: string): Node[] => linkCandidates(query, boardId, nodes, BOARD_PICKER_RESULTS),
    [boardId, nodes],
  );

  /** Follows a shape's link: to the page, to the browser, or to a notice. */
  const openLink = useCallback(
    (link: string) => {
      const target = boardLinkTarget(link, nodes);
      if (target.kind === "page") selectNode(target.pageId);
      else if (target.kind === "external") void openExternalUrl(target.url);
      else say(`No page called “${target.text}”.`);
    },
    [nodes, selectNode, say],
  );

  /** The page a shape's link points at, for the button to name; null for anything else. */
  const linkedPage = useCallback(
    (link: string | null): Node | null => {
      if (!link) return null;
      const target = boardLinkTarget(link, nodes);
      return target.kind === "page" ? (nodes[target.pageId] ?? null) : null;
    },
    [nodes],
  );

  return useMemo(
    () => ({ candidates, openLink, linkedPage, pageLinkFor, notice }),
    [candidates, openLink, linkedPage, notice],
  );
}

export type BoardLinks = ReturnType<typeof useBoardLinks>;
