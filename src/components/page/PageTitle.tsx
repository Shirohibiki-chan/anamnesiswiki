// Page header — breadcrumb trail, template icon (tinted per effective
// color), and a click-to-rename title. See docs/spec.md §Page view.
import { useState } from "react";
import { ChevronRight, EyeOff, Home } from "lucide-react";
import type { Node } from "../../constants/schema";
import { getTemplateIcon } from "../../constants/icons";
import { getPaletteHex } from "../../constants/palette";
import { useProjectActions, useProjectHomeId, useProjectName } from "../../hooks/use-project";
import { useAncestorChain, useEffectiveColor, useHiddenByAncestor } from "../../hooks/use-tree-data";

type PageTitleProps = {
  node: Node;
  /**
   * Opens straight into the rename input. Read once, at mount — PageView is
   * keyed by node id, so this remounts per page and can't fight a later
   * re-render for control of whether the input is open.
   */
  startEditing?: boolean;
};

export function PageTitle({ node, startEditing = false }: PageTitleProps) {
  const projectName = useProjectName();
  const homeNodeId = useProjectHomeId();
  const { renameNode, selectNode } = useProjectActions();
  const [isEditing, setIsEditing] = useState(startEditing);

  const { color: effectiveKey } = useEffectiveColor(node.id);
  const effectiveHex = getPaletteHex(effectiveKey ?? undefined);
  const Icon = getTemplateIcon(node.templateKey);
  const ancestors = useAncestorChain(node.id);
  const hiddenByAncestor = useHiddenByAncestor(node.id);
  const looksHidden = Boolean(node.hidden) || hiddenByAncestor;

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
        {homeNodeId === node.id && (
          <span className="page-title-home-badge">
            <Home size={12} /> Home
          </span>
        )}
        {/* The tree dims a hidden row, but the tree isn't where the writing
            happens. Without this the one place you'd spend an hour is the one
            place that never mentions nobody else will read it. Says which kind
            it is, because "the folder this is in" is not something the page
            can otherwise tell you. */}
        {looksHidden && (
          <span className="page-title-hidden-badge">
            <EyeOff size={12} /> {node.hidden ? "Hidden" : "Inside a hidden page"}
          </span>
        )}
      </div>
    </div>
  );
}
