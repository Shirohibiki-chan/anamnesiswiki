// Wraps react-arborist's Tree: converts the node graph to its nested data
// shape, wires rename/move/toggle back to the project store, and handles
// its own pixel sizing (react-arborist doesn't auto-size itself).
import { useEffect, useMemo, useRef, useState } from "react";
import { Tree, type TreeApi } from "react-arborist";
import { TREE_INDENT } from "../../constants/layout";
import { useProject } from "../../hooks/use-project";
import { useSearchMatcher, useTreeData, type TreeSearchMode } from "../../hooks/use-tree-data";
import { useElementSize } from "../../hooks/use-element-size";
import type { TreeNodeData } from "../../services/tree-service";
import { TreeItem } from "./TreeItem";
import { TreeSearch } from "./TreeSearch";

export function TreePanel() {
  const { project, renameNode, moveNodes, setExpanded, selectNode } = useProject();
  const { treeData, getAncestorChain } = useTreeData();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<TreeSearchMode>("all");
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const treeApiRef = useRef<TreeApi<TreeNodeData> | null>(null);

  const searchMatcher = useSearchMatcher(searchQuery, searchMode);

  // Selecting a node isn't only ever a click on this tree anymore — a
  // mention/wikilink click in the editor calls `selectNode` directly (see
  // Phase 5's MentionChip.tsx), which react-arborist has no way to know
  // about on its own. Expand the target's ancestors and sync the tree's own
  // selection/focus state to match whenever `selectedId` changes for any
  // reason. `treeApi.select()` re-fires `onSelect` with the same id, which
  // is a no-op here since the dependency below is keyed on the id value.
  //
  // The `isSelected` guard is what lets multi-selection survive: `select()`
  // replaces the whole selection with one node, so running it for a node the
  // tree has *already* got selected would collapse a ctrl-click selection the
  // moment it was made.
  useEffect(() => {
    const selectedId = project?.selectedId;
    if (!selectedId) return;
    for (const ancestor of getAncestorChain(selectedId)) {
      if (!project?.expandedIds.includes(ancestor.id)) setExpanded(ancestor.id, true);
    }
    if (!treeApiRef.current?.isSelected(selectedId)) treeApiRef.current?.select(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.selectedId]);

  // Seeds react-arborist's open/closed state once at mount from the
  // persisted project.expandedIds. TreePanel remounts fresh whenever a
  // different project loads (the shell only exists while one is loaded), so
  // there's no case where this needs to react to later changes.
  const initialOpenState = useMemo(
    () => Object.fromEntries((project?.expandedIds ?? []).map((id) => [id, true])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="tree-panel">
      <TreeSearch value={searchQuery} onChange={setSearchQuery} mode={searchMode} onModeChange={setSearchMode} />
      <div className="tree-panel-body" ref={containerRef}>
        {size.height > 0 && (
          <Tree<TreeNodeData>
            ref={treeApiRef}
            data={treeData}
            width={size.width}
            height={size.height}
            indent={TREE_INDENT}
            openByDefault={false}
            initialOpenState={initialOpenState}
            searchTerm={searchQuery}
            searchMatch={(node) => (searchMatcher ? searchMatcher(node.data.id) : true)}
            // No `disableDrop`: every page can hold pages as of 2026-08-10.
            // There used to be one, because a leaf template had no directory
            // of its own and its would-be children were written into a plain
            // directory with no marker in it — the drop looked fine until the
            // next load, and then the whole subtree was gone. The storage
            // model now grows a directory for a leaf that gains a child (see
            // filesystem-service's `usesDirectoryStorage`), so the shape the
            // guard existed to prevent can no longer occur.
            onRename={({ id, name }) => renameNode(id, name)}
            onMove={({ dragIds, parentId, index }) => {
              // react-arborist reports the drop index within the destination
              // regardless of depth. It used to be discarded for anything but
              // the root, so dragging a page around inside a folder appeared
              // to work and then snapped back to creation order.
              //
              // All of them go in one call — a dragged multi-selection arrives
              // here as several ids, and moving them one at a time races on
              // disk (see the store's moveNodes).
              void moveNodes(dragIds, parentId, index);
            }}
            onToggle={(id) => setExpanded(id, treeApiRef.current?.isOpen(id) ?? false)}
            // The page view follows the row you last touched, not the topmost
            // one in the selection — `selected` arrives in tree order, so
            // shift-selecting *upwards* would otherwise throw you onto a
            // different page than the one you clicked.
            onSelect={(selected) => {
              const focused = treeApiRef.current?.focusedNode;
              const primary = focused && selected.some((node) => node.id === focused.id) ? focused : selected[0];
              selectNode(primary?.id ?? null);
            }}
          >
            {TreeItem}
          </Tree>
        )}
      </div>
    </div>
  );
}
