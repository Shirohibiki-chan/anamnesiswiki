// Wraps react-arborist's Tree: converts the node graph to its nested data
// shape, wires rename/move/toggle back to the project store, and handles
// its own pixel sizing (react-arborist doesn't auto-size itself).
import { useMemo, useRef, useState } from "react";
import { Tree, type TreeApi } from "react-arborist";
import { useProject } from "../../hooks/use-project";
import { useTreeData } from "../../hooks/use-tree-data";
import { useElementSize } from "../../hooks/use-element-size";
import { createSearchMatcher, type TreeNodeData } from "../../services/tree-service";
import { TreeItem } from "./TreeItem";
import { TreeSearch } from "./TreeSearch";

export function TreePanel() {
  const { project, nodes, renameNode, moveNode, setExpanded, selectNode } = useProject();
  const { treeData } = useTreeData();
  const [searchQuery, setSearchQuery] = useState("");
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const treeApiRef = useRef<TreeApi<TreeNodeData> | null>(null);

  const searchMatcher = useMemo(() => createSearchMatcher(nodes, searchQuery), [nodes, searchQuery]);

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
      <TreeSearch value={searchQuery} onChange={setSearchQuery} />
      <div className="tree-panel-body" ref={containerRef}>
        {size.height > 0 && (
          <Tree<TreeNodeData>
            ref={treeApiRef}
            data={treeData}
            width={size.width}
            height={size.height}
            openByDefault={false}
            initialOpenState={initialOpenState}
            searchTerm={searchQuery}
            searchMatch={(node) => (searchMatcher ? searchMatcher(node.data.id) : true)}
            disableMultiSelection
            onRename={({ id, name }) => renameNode(id, name)}
            onMove={({ dragIds, parentId, index }) => {
              for (const id of dragIds) moveNode(id, parentId, parentId === null ? index : undefined);
            }}
            onToggle={(id) => setExpanded(id, treeApiRef.current?.isOpen(id) ?? false)}
            onSelect={(selected) => selectNode(selected[0]?.id ?? null)}
          >
            {TreeItem}
          </Tree>
        )}
      </div>
    </div>
  );
}
