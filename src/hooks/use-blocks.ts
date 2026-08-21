// The only import path components have into block-service.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { useMemo } from "react";
import type { Block, CustomPropertySpec, Node } from "../constants/schema";
import { blocksFor, unshownPropertyKeys } from "../services/block-service";
import { defaultPropertyOrder } from "../services/block-service";
import type { RenderableProperty } from "../services/property-service";
import { getPropertySchema } from "../services/template-registry";

/**
 * A page's blocks, and the properties they can point at.
 *
 * `blocks` is what the panel renders. `properties` is every field the page has
 * — template and custom together — keyed for lookup, because a property block
 * stores only a key and the panel needs the label, type and options to draw
 * anything. `unshown` is what "Add block" can still offer, which is the way
 * back to a field whose block was removed.
 */
export function useBlocks(node: Node | undefined): {
  blocks: Block[];
  properties: Map<string, RenderableProperty>;
  unshown: RenderableProperty[];
} {
  return useMemo(() => {
    if (!node) return { blocks: [], properties: new Map(), unshown: [] };

    const schema = getPropertySchema(node.templateKey);
    const custom: CustomPropertySpec[] = node.customProperties ?? [];
    const all = defaultPropertyOrder(schema, custom);
    const blocks = blocksFor(node, schema);

    return {
      blocks,
      properties: new Map(all.map((prop) => [prop.key, prop])),
      unshown: unshownPropertyKeys(blocks, all),
    };
  }, [node]);
}
