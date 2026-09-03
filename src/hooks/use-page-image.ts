// Which picture an image block is showing, and whether it is the page's own.
// Phase 19.5. See docs/plan.md.
//
// **One rule, in one place, reached through one door.** An image block used to
// be a window onto `node.image` and nothing else, so a picture dropped into one
// in the middle of the writing became the page's portrait and a second image
// block showed the same photo. Now every image block holds its own picture and
// one of them is marked as the page's — `blockImage` in block-service.ts is
// where that is decided, and this is the components' only way to ask it.
import { useCallback, useMemo } from "react";
import type { Block, Node } from "../constants/schema";
import { blockImage, blocksFor, pageImageBlockId, type BlockPicture } from "../services/block-service";
import { getPropertySchema } from "../services/template-registry";

/** A picture, plus whether this is the frame the page's own portrait lives in. */
export type ShownPicture = BlockPicture & { isPageImage: boolean };

/**
 * `pictureOf(block)` for a page's image blocks, and the id of the one that
 * draws the page's own picture.
 *
 * **It resolves against the page's whole block list, not the list being drawn.**
 * A block in the page body or inside an infobox is drawn from a slice of
 * `node.blocks`, and "is this the page's picture" is a question about all of
 * them — asking it of a one-block slice would make every lone image block the
 * page's.
 */
export function usePageImage(node: Node | undefined): {
  pageImageId: string | undefined;
  pictureOf: (block: Block) => ShownPicture;
} {
  const blocks = useMemo(() => (node ? blocksFor(node, getPropertySchema(node.templateKey)) : []), [node]);
  const pageImageId = useMemo(() => (node ? pageImageBlockId(node, blocks) : undefined), [node, blocks]);

  const pictureOf = useCallback(
    (block: Block): ShownPicture =>
      node
        ? { ...blockImage(node, blocks, block), isPageImage: block.id === pageImageId }
        : { isPageImage: false },
    [node, blocks, pageImageId],
  );

  return { pageImageId, pictureOf };
}
