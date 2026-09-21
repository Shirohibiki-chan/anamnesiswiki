// A blank page's first tab, drawn before it exists.
//
// A page made blank has no tabs, and used to have no editor either — the
// template grid was the whole page, and the only way to write without picking
// a template was the "Skip this" link under it. What she wanted (2026-09-06)
// is what LegendKeeper does: click into the page, start typing, and the offer
// gets out of the way by itself. So the page now shows a tab strip and an
// editor above the grid from the start, and this hook is the tab they stand
// in for until something is done to it.
//
// **The tab is made on the first real keystroke, with the id it was drawn
// under.** Making it is what dismisses the grid — a blank page with a tab is
// one that has answered for itself (see `isUnanswered` in PageView) — so no
// new flag is set and nothing has to be unset when a template is picked
// later. Passing the id in is the part that matters: PageView keys the editor
// by tab id, so a tab that arrived under a fresh id would remount the editor
// mid-word and drop the caret on the floor. `hideTemplatePrompt` stays what
// it was — the sidebar's own "don't ask again" — and the sidebar keeps
// offering a template after the page is typed in, which is the route back
// that schema.ts insists must exist.
import { useCallback, useMemo, useState } from "react";
import { createTab, FIRST_TAB_LABEL, type BlockNoteDocument, type Tab } from "../constants/schema";
import { contentIsUntouched } from "../services/tab-service";
import { useProjectStore } from "../state/project-store";

// Takes an id rather than a node because PageView calls it above its early
// returns, where there may be no page open at all.
export function useFirstTab(nodeId: string | null | undefined): {
  /** The tab the strip and the editor draw while the page still has none. */
  draftTab: Tab;
  /** The first tab's id, making it if the page still has no tabs. Every tab
   *  control on the draft strip goes through this before acting. */
  ensureFirstTab: () => string;
  /** What the draft editor's writing goes to: nothing until there is some,
   *  then the tab, made with that writing in it. */
  onDraftChange: (content: BlockNoteDocument) => void;
} {
  const [draftId] = useState(() => crypto.randomUUID());
  const draftTab = useMemo(() => createTab({ id: draftId, label: FIRST_TAB_LABEL }), [draftId]);

  // Read through `getState()` rather than the closed-over node: the editor's
  // onChange can fire more than once before React has re-rendered with the
  // tab, and the second call must see the first one's work.
  const ensureFirstTab = useCallback(
    (content: BlockNoteDocument = []) => {
      const { nodes, addTab } = useProjectStore.getState();
      const current = nodeId ? nodes[nodeId] : undefined;
      if (!current) return draftId;
      if (current.tabs.length > 0) return current.tabs[0].id;
      return addTab(current.id, FIRST_TAB_LABEL, { id: draftId, content }).id;
    },
    [nodeId, draftId],
  );

  const onDraftChange = useCallback(
    (content: BlockNoteDocument) => {
      // BlockNote fires a change for the blank paragraph it puts in an empty
      // document, and that must not count — see contentIsUntouched.
      if (contentIsUntouched(content)) return;
      ensureFirstTab(content);
    },
    [ensureFirstTab],
  );

  return { draftTab, ensureFirstTab, onDraftChange };
}
