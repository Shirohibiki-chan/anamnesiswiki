// Center-panel view for a selected folder node — folders don't have tabs or
// content of their own, just a way to add a page inside, and a hint about that
// while the folder is still empty. Full-row color tint matches the tree's
// folder-tinting rule. See docs/spec.md §Node colors.
//
// **The hint is for empty folders only.** "Add one to get started" told a
// folder holding forty pages that it held none, every time she opened it. The
// button stays either way: this is the only place a page can be made inside
// the folder she's looking at without going back to the tree.
import { type CSSProperties } from "react";
import { Waypoints } from "lucide-react";
import type { Node } from "../../constants/schema";
import { NodeIcon } from "../blocks/IconPicker";
import { getPaletteHex } from "../../constants/palette";
import { useGraphOverlayActions } from "../../hooks/use-graph-overlay";
import { useCreatePageIn } from "../../hooks/use-new-page";
import { useEffectiveColor, useHasChildren } from "../../hooks/use-tree-data";

export function FolderView({ node }: { node: Node }) {
  const createPageIn = useCreatePageIn();
  const { openPageGraph } = useGraphOverlayActions();
  const isEmpty = !useHasChildren(node.id);

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
      {isEmpty && <p className="folder-view-hint">Folders hold other pages. Add one to get started.</p>}
      {/* **A folder gets to its graph from here, because it has no title row.**
          Every other page carries the button beside its name; a folder is drawn
          as this centred card instead and had no way in at all, which made the
          graph a feature that quietly did not apply to a third of the tree. Next
          to Add a page rather than up beside the name: this card is where a
          folder keeps the things you can do to it. */}
      <div className="folder-view-actions">
        <button type="button" className="ui-btn ui-btn-lg ui-btn-secondary" onClick={() => createPageIn(node.id)}>
          Add a page
        </button>
        <button
          type="button"
          className="ui-btn ui-btn-lg ui-btn-secondary"
          title="See what this folder is connected to"
          onClick={() => openPageGraph(node.id)}
        >
          <Waypoints size={16} /> See connections
        </button>
      </div>
    </div>
  );
}
