// The only import path components have into storyline-service.ts — see
// CLAUDE.md's layer order, components never reach a service directly.
//
// What is *drawn* is worked out here; how it is pushed around is
// `use-storyline-view.ts`, the same split the graph makes for the same reason.
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { STORYLINE_TEMPLATE_KEY } from "../constants/schema";
import {
  createStoryline,
  needsTidying,
  storylineModel,
  type StorylineModel,
} from "../services/storyline-service";
import { useProjectStore } from "../state/project-store";

export type {
  ConnectRefusal,
  DrawnNote,
  DrawnScene,
  NoteSegment,
  StorylineModel,
} from "../services/storyline-service";

/** Whether this page is one whose body is a canvas. */
export function isStorylinePage(templateKey: string): boolean {
  return templateKey === STORYLINE_TEMPLATE_KEY;
}

const EMPTY: StorylineModel = { scenes: [], edges: [], notes: [], bands: [], orphans: 0 };

/**
 * One storyline's canvas, with every scene dressed in the page it stands for.
 *
 * **Recomputed when the pages change as well as when the canvas does**, and
 * that is the point of joining here rather than storing names on the canvas: a
 * scene renamed in the tree, given an icon, or given a colour is redrawn
 * without the storyline file being touched at all.
 */
export function useStoryline(storylineId: string | null): StorylineModel {
  const storyline = useProjectStore((state) => (storylineId ? state.storylines[storylineId] : undefined));
  const nodes = useProjectStore((state) => state.nodes);
  return useMemo(() => {
    if (!storylineId) return EMPTY;
    return storylineModel(storyline ?? createStoryline(), nodes);
  }, [storylineId, storyline, nodes]);
}

/**
 * Whether *Tidy up* would move anything.
 *
 * **Its own hook, keyed on the canvas alone rather than folded into the model.**
 * Working it out means laying the whole thing out and comparing — and the model
 * is rebuilt whenever any page in the world changes, so inside it that ran on
 * every keystroke typed anywhere. Nothing about a page's name can make a canvas
 * untidy, so this only has to be asked when the canvas itself moves.
 */
export function useStorylineIsUntidy(storylineId: string | null): boolean {
  const storyline = useProjectStore((state) => (storylineId ? state.storylines[storylineId] : undefined));
  return useMemo(() => (storyline ? needsTidying(storyline) : false), [storyline]);
}

export function useStorylineActions() {
  return useProjectStore(
    useShallow((state) => ({
      addSceneToStoryline: state.addSceneToStoryline,
      moveStorylineNodes: state.moveStorylineNodes,
      connectStorylineNodes: state.connectStorylineNodes,
      disconnectStorylineEdge: state.disconnectStorylineEdge,
      removeStorylineNode: state.removeStorylineNode,
      addStorylineNote: state.addStorylineNote,
      setStorylineNoteText: state.setStorylineNoteText,
      moveStorylineNote: state.moveStorylineNote,
      removeStorylineNote: state.removeStorylineNote,
      addStorylineBand: state.addStorylineBand,
      setStorylineBandLabel: state.setStorylineBandLabel,
      moveStorylineBand: state.moveStorylineBand,
      resizeStorylineBand: state.resizeStorylineBand,
      removeStorylineBand: state.removeStorylineBand,
      tidyStoryline: state.tidyStoryline,
      selectNode: state.selectNode,
    })),
  );
}
