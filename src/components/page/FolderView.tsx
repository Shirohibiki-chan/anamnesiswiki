// Center-panel view for a selected folder node — folders don't have tabs or
// content of their own, just a hint and a way to add a page inside. Full-row
// color tint matches the tree's folder-tinting rule. See docs/spec.md
// §Node colors.
import { useState, type CSSProperties } from "react";
import type { Node } from "../../constants/schema";
import { getTemplateIcon } from "../../constants/icons";
import { getPaletteHex } from "../../constants/palette";
import { useProjectActions } from "../../hooks/use-project";
import { useEffectiveColor } from "../../hooks/use-tree-data";
import { useTemplates } from "../../hooks/use-templates";
import { TemplatePicker } from "../tree/TemplatePicker";
import { TreePopover } from "../tree/TreePopover";

export function FolderView({ node }: { node: Node }) {
  const { addNode } = useProjectActions();
  const { getLabel } = useTemplates();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const { color: effectiveKey } = useEffectiveColor(node.id);
  const effectiveHex = getPaletteHex(effectiveKey ?? undefined);
  const Icon = getTemplateIcon(node.templateKey);

  const containerStyle: CSSProperties = effectiveHex ? { backgroundColor: `${effectiveHex}14` } : {};

  function handleAdd(templateKey: string) {
    addNode({ parentId: node.id, templateKey, name: `New ${getLabel(templateKey)}` });
    setAnchorRect(null);
  }

  return (
    <div className="folder-view" style={containerStyle}>
      {/* eslint-disable-next-line react-hooks/static-components -- getTemplateIcon reads a fixed lookup table, so it returns the same stable component reference for a given templateKey every render */}
      <Icon size={32} className="folder-view-icon" style={effectiveHex ? { color: effectiveHex } : undefined} />
      <h1 className="folder-view-name" style={effectiveHex ? { color: effectiveHex } : undefined}>
        {node.name}
      </h1>
      <p className="folder-view-hint">Folders hold other pages. Add one to get started.</p>
      <button type="button" className="ui-btn ui-btn-lg ui-btn-secondary" onClick={(e) => setAnchorRect(e.currentTarget.getBoundingClientRect())}>
        Add a page
      </button>
      {anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={() => setAnchorRect(null)}>
          <TemplatePicker onSelect={handleAdd} />
        </TreePopover>
      )}
    </div>
  );
}
