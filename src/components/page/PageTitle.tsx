// Page header — breadcrumb trail, template icon (tinted per effective
// color), and a click-to-rename title. See docs/spec.md §Page view.
import { useState } from "react";
import { ChevronRight, EyeOff, Home } from "lucide-react";
import type { Node } from "../../constants/schema";
import { NodeIcon } from "../blocks/IconPicker";
import { getPaletteHex } from "../../constants/palette";
import { useProjectActions, useProjectHomeId, useProjectName } from "../../hooks/use-project";
import { useBreadcrumbTrail, useEffectiveColor, useHiddenByAncestor } from "../../hooks/use-tree-data";

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
  const trail = useBreadcrumbTrail(node.id);
  const hiddenByAncestor = useHiddenByAncestor(node.id);
  const looksHidden = Boolean(node.hidden) || hiddenByAncestor;

  // Reset per page for free: PageView keys this component by node id, so
  // opening a deep page never inherits an expansion from the last one.
  const [showWholeTrail, setShowWholeTrail] = useState(false);
  const isFolded = trail.hidden.length > 0 && !showWholeTrail;

  function crumb(ancestor: Node) {
    return (
      <span key={ancestor.id} className="page-title-breadcrumb-item">
        <ChevronRight size={10} className="page-title-breadcrumb-sep" />
        {/* The full name on hover, since the one on screen may be cut. Worth
            having even when it isn't: these are page names she wrote, and the
            trail is often the only place a parent's whole name appears while
            she's reading the child. */}
        <button
          type="button"
          className="page-title-breadcrumb-link"
          title={ancestor.name}
          onClick={() => selectNode(ancestor.id)}
        >
          {ancestor.name}
        </button>
      </span>
    );
  }

  function commit(value: string) {
    const trimmed = value.trim();
    if (trimmed && trimmed !== node.name) renameNode(node.id, trimmed);
    setIsEditing(false);
  }

  return (
    <div className="page-title">
      {/* One line, always. A crumb too wide for its share is cut with an
          ellipsis rather than wrapped, and a trail with too many steps folds
          its middle away — see collapseBreadcrumb in tree-service.ts for why
          those are two problems and not one. */}
      <nav className="page-title-breadcrumb" aria-label="Breadcrumb">
        <button
          type="button"
          className="page-title-breadcrumb-link"
          title={projectName}
          onClick={() => selectNode(null)}
        >
          {projectName}
        </button>
        {trail.leading.map(crumb)}
        {isFolded ? (
          <span className="page-title-breadcrumb-item">
            <ChevronRight size={10} className="page-title-breadcrumb-sep" />
            {/* Expands in place rather than opening a menu of the hidden
                steps: they're all one click away in the sidebar anyway, so the
                only thing a menu would add here is a popover to dismiss. */}
            <button
              type="button"
              className="page-title-breadcrumb-link page-title-breadcrumb-more"
              aria-label={`Show ${trail.hidden.length} more steps`}
              title={trail.hidden.map((ancestor) => ancestor.name).join(" › ")}
              onClick={() => setShowWholeTrail(true)}
            >
              …
            </button>
          </span>
        ) : (
          trail.hidden.map(crumb)
        )}
        {trail.trailing.map(crumb)}
        <span className="page-title-breadcrumb-item page-title-breadcrumb-current" title={node.name}>
          <ChevronRight size={10} className="page-title-breadcrumb-sep" />
          <span className="page-title-breadcrumb-leaf">{node.name}</span>
        </span>
      </nav>

      <div className="page-title-row">
        {/* The page's own icon when it has one — picking an icon has to change
            the page, not just its row in the tree. */}
        <NodeIcon
          icon={node.icon}
          templateKey={node.templateKey}
          size={24}
          className="page-title-icon"
          style={effectiveHex ? { color: effectiveHex } : undefined}
        />
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
