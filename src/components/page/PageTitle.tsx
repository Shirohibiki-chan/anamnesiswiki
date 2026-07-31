// Page header — breadcrumb trail, template icon (tinted per effective
// color), and a click-to-rename title. See docs/spec.md §Page view.
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Node } from "../../constants/schema";
import { getTemplateIcon } from "../../constants/icons";
import { getPaletteHex } from "../../constants/palette";
import { useProjectActions, useProjectName } from "../../hooks/use-project";
import { useAncestorChain, useEffectiveColor } from "../../hooks/use-tree-data";

export function PageTitle({ node }: { node: Node }) {
  const projectName = useProjectName();
  const { renameNode, selectNode } = useProjectActions();
  const [isEditing, setIsEditing] = useState(false);

  const { color: effectiveKey } = useEffectiveColor(node.id);
  const effectiveHex = getPaletteHex(effectiveKey ?? undefined);
  const Icon = getTemplateIcon(node.templateKey);
  const ancestors = useAncestorChain(node.id);

  function commit(value: string) {
    const trimmed = value.trim();
    if (trimmed && trimmed !== node.name) renameNode(node.id, trimmed);
    setIsEditing(false);
  }

  return (
    <div className="page-title">
      <div className="page-title-breadcrumb">
        <button type="button" className="page-title-breadcrumb-link" onClick={() => selectNode(null)}>
          {projectName}
        </button>
        {ancestors.map((ancestor) => (
          <span key={ancestor.id} className="page-title-breadcrumb-item">
            <ChevronRight size={10} />
            <button type="button" className="page-title-breadcrumb-link" onClick={() => selectNode(ancestor.id)}>
              {ancestor.name}
            </button>
          </span>
        ))}
        <span className="page-title-breadcrumb-item page-title-breadcrumb-current">
          <ChevronRight size={10} />
          {node.name}
        </span>
      </div>

      <div className="page-title-row">
        {/* eslint-disable-next-line react-hooks/static-components -- getTemplateIcon reads a fixed lookup table, so it returns the same stable component reference for a given templateKey every render */}
        <Icon size={24} className="page-title-icon" style={effectiveHex ? { color: effectiveHex } : undefined} />
        {isEditing ? (
          <input
            className="page-title-input"
            defaultValue={node.name}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => commit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = node.name;
                e.currentTarget.blur();
              }
            }}
          />
        ) : (
          <h1 className="page-title-name" onClick={() => setIsEditing(true)}>
            {node.name}
          </h1>
        )}
      </div>
    </div>
  );
}
