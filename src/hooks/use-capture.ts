// What a Quick capture block needs to know and do. Phase 30, step 1. The
// component draws; the deciding — where a thought goes, and what happens when
// the button is pressed — happens here and in capture-service.ts.
import { useMemo, useState } from "react";
import type { Block, Node } from "../constants/schema";
import {
  captureDestinations,
  captureDocument,
  captureStamp,
  parseCapture,
  type CaptureDestination,
  type ParsedCapture,
} from "../services/capture-service";
import { useProject } from "./use-project";

export type CaptureResolution = {
  parsed: ParsedCapture;
  /** Where this text would be filed if captured now. */
  destination: CaptureDestination;
  /** True when a code word in the text picked it, rather than the picker. */
  viaCodeWord: boolean;
};

export function useCapture(node: Node, block: Block) {
  const { nodes, capturePage, rememberCaptureDestination, setCaptureRoot } = useProject();
  // Picked in the popover and not yet captured to. Held here rather than on
  // the block so browsing the list is free; the capture is what writes, and
  // once it has, the block's own memory of where it went takes over.
  const [chosenId, setChosenId] = useState<string | undefined>();

  const rootId = block.captureRoot ?? node.id;
  const root = nodes[rootId];
  const destinations = useMemo(() => captureDestinations(nodes, rootId), [nodes, rootId]);

  /**
   * The destination the picker shows before any code word: the one just
   * picked, else where the last capture went — code word or not, because
   * "where the last one went" is the honest default — else the root. Each
   * earlier answer is dropped if the page it named has since gone.
   */
  const pickerDestination = useMemo(() => {
    const wanted = [chosenId, block.captureLast, rootId];
    for (const id of wanted) {
      const hit = id ? destinations.find((destination) => destination.id === id) : undefined;
      if (hit) return hit;
    }
    return destinations[0];
  }, [chosenId, block.captureLast, rootId, destinations]);

  function resolve(text: string): CaptureResolution | undefined {
    if (!pickerDestination) return undefined;
    const parsed = parseCapture(text, destinations);
    const byWord = parsed.codeWordId ? destinations.find((d) => d.id === parsed.codeWordId) : undefined;
    return { parsed, destination: byWord ?? pickerDestination, viaCodeWord: byWord !== undefined };
  }

  /** Files the text as a page and says which page it became, or nothing if there is nowhere to file. */
  function capture(text: string): { page: Node; destination: CaptureDestination } | undefined {
    const resolution = resolve(text);
    if (!resolution) return undefined;
    const page = capturePage({
      parentId: resolution.destination.id,
      title: resolution.parsed.title,
      content: captureDocument(resolution.parsed.body),
      stamp: captureStamp(new Date()),
    });
    rememberCaptureDestination(node.id, block.id, resolution.destination.id);
    setChosenId(undefined);
    return { page, destination: resolution.destination };
  }

  return {
    /** The page the destinations hang under; undefined if it has been deleted. */
    root,
    /** Whether the block is filing under its own page, which is the default. */
    rootIsOwn: block.captureRoot === undefined,
    destinations,
    pickerDestination,
    resolve,
    choose: setChosenId,
    capture,
    setRoot: (rootId: string | undefined) => {
      setChosenId(undefined);
      setCaptureRoot(node.id, block.id, rootId);
    },
  };
}
