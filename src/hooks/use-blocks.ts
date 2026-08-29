// The only import path components have into block-service.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { useMemo } from "react";
import type { Block, CustomPropertySpec, Node } from "../constants/schema";
import { blockIdsInPage, blocksFor, sidebarBlocks, unshownPropertyKeys } from "../services/block-service";
import { defaultPropertyOrder } from "../services/block-service";
import type { RenderableProperty } from "../services/property-service";
import { getPropertySchema } from "../services/template-registry";

/**
 * A page's blocks, and the properties they can point at.
 *
 * `blocks` is every block the page has, wherever it is drawn. `inSidebar` is
 * the subset the right-hand panel shows — the same list less whatever the
 * page's writing has claimed, because a block dragged into the page body must
 * not also sit in the sidebar. `properties` is every field the page has
 * — template and custom together — keyed for lookup, because a property block
 * stores only a key and the panel needs the label, type and options to draw
 * anything. `unshown` is what "Add block" can still offer, which is the way
 * back to a field whose block was removed.
 *
 * **`unshown` is computed against `blocks`, not `inSidebar`, and that is not an
 * oversight.** A property block moved into the page is still showing that
 * property; offering to add a second one would put the same field on the page
 * twice. The question "Add block" asks is whether a field is shown anywhere.
 */
export function useBlocks(node: Node | undefined): {
  blocks: Block[];
  inSidebar: Block[];
  properties: Map<string, RenderableProperty>;
  unshown: RenderableProperty[];
} {
  return useMemo(() => {
    if (!node) return { blocks: [], inSidebar: [], properties: new Map(), unshown: [] };

    const schema = getPropertySchema(node.templateKey);
    const custom: CustomPropertySpec[] = node.customProperties ?? [];
    const all = defaultPropertyOrder(schema, custom);
    const blocks = blocksFor(node, schema);

    return {
      blocks,
      inSidebar: sidebarBlocks(blocks, blockIdsInPage(node.tabs)),
      properties: new Map(all.map((prop) => [prop.key, prop])),
      unshown: unshownPropertyKeys(blocks, all),
    };
  }, [node]);
}
