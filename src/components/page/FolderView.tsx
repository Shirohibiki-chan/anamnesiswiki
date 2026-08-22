// Center-panel view for a selected folder node — folders don't have tabs or
// content of their own, just a hint and a way to add a page inside. Full-row
// color tint matches the tree's folder-tinting rule. See docs/spec.md
// §Node colors.
import { type CSSProperties } from "react";
import type { Node } from "../../constants/schema";
import { NodeIcon } from "../blocks/IconPicker";
import { getPaletteHex } from "../../constants/palette";
import { useCreatePageIn } from "../../hooks/use-new-page";
import { useEffectiveColor } from "../../hooks/use-tree-data";

export function FolderView({ node }: { node: Node }) {
  const createPageIn = useCreatePageIn();

  const { color: effectiveKey } = useEffectiveColor(node.id);
  const effectiveHex = getPaletteHex(effectiveKey ?? undefined);

  const containerStyle: CSSProperties = effectiveHex ? { backgroundColor: `${effectiveHex}14` } : {};

  return (
    <div className="folder-view" style={containerStyle}>
      <NodeIcon
        icon={node.icon}
        templateKey={node.templateKey}
        size={32}
        className="folder-view-icon"
        style={effectiveHex ? { color: effectiveHex } : undefined}
      />
      <h1 className="folder-view-name" style={effectiveHex ? { color: effectiveHex } : undefined}>
        {node.name}
      </h1>
      <p className="folder-view-hint">Folders hold other pages. Add one to get started.</p>
      <button type="button" className="ui-btn ui-btn-lg ui-btn-secondary" onClick={() => createPageIn(node.id)}>
        Add a page
      </button>
    </div>
  );
}
