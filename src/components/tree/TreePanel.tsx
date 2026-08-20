// Wraps react-arborist's Tree: converts the node graph to its nested data
// shape, wires rename/move/toggle back to the project store, and handles
// its own pixel sizing (react-arborist doesn't auto-size itself).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tree, type TreeApi } from "react-arborist";
import { TREE_INDENT } from "../../constants/layout";
import { useProject } from "../../hooks/use-project";
import { useSearchMatcher, useTreeData, type TreeSearchMode } from "../../hooks/use-tree-data";
import { useElementSize } from "../../hooks/use-element-size";
import type { TreeNodeData } from "../../services/tree-service";
import { BookmarksRail } from "./BookmarksRail";
import { TreeItem } from "./TreeItem";
import { TreePathBar } from "./TreePathBar";
import { TreeSearch } from "./TreeSearch";

export function TreePanel() {
  const { project, renameNode, moveNodes, setExpanded, selectNode, togglePinned, focusedId, setFocus } = useProject();
  const { treeData, focusPath, getAncestorChain } = useTreeData();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<TreeSearchMode>("all");
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const treeApiRef = useRef<TreeApi<TreeNodeData> | null>(null);
  // Plain `useRef` doesn't tell React when `.current` changes, so an effect
  // keyed on `project?.selectedId` alone can run once *before* `<Tree>` has
  // mounted (its own row is gated on `size.height > 0`, a layout measurement
  // that lands a render or two after this component's first paint) and never
  // get a second chance — the id didn't change, so the effect has no reason
  // to fire again once the ref is finally live. This callback ref makes
  // "the tree just became available" a real, trackable state change.
  const [isTreeReady, setIsTreeReady] = useState(false);
  const setTreeApiRef = useCallback((api: TreeApi<TreeNodeData> | null | undefined) => {
    treeApiRef.current = api ?? null;
    setIsTreeReady(api != null);
  }, []);

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
  //
  // `isTreeReady` is in the dependency list for the reason above the ref
  // declaration: a project that opens straight onto a nested page needs this
  // to run again once the tree exists, not just when `selectedId` changes.
  useEffect(() => {
    const selectedId = project?.selectedId;
    if (!selectedId) return;
    for (const ancestor of getAncestorChain(selectedId)) {
      if (!project?.expandedIds.includes(ancestor.id)) setExpanded(ancestor.id, true);
    }
    if (!treeApiRef.current?.isSelected(selectedId)) treeApiRef.current?.select(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.selectedId, isTreeReady]);

  // Seeds react-arborist's open/closed state once at mount from the
  // persisted project.expandedIds. TreePanel remounts fresh whenever a
  // different project loads (the shell only exists while one is loaded), so
  // there's no case where this needs to react to later changes.
  const initialOpenState = useMemo(
    () => Object.fromEntries((project?.expandedIds ?? []).map((id) => [id, true])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // react-arborist's own container is what holds keyboard focus (it's the
  // `role="tree"` element it renders, and the only thing in here with a
  // tabindex). Both Escape behaviours below have to put focus back on it, and
  // neither is reachable from the row that started them.
  function focusTree() {
    containerRef.current?.querySelector<HTMLElement>('[role="tree"]')?.focus();
  }

  // Escape, in the two senses a file tree has for it.
  //
  // Capture, because the answer depends on something that stops being true the
  // moment the key is handled anywhere else: whether a row is being renamed.
  // react-arborist's container ignores every key while editing, and the rename
  // field's own handler cancels the edit and unmounts itself — taking focus
  // with it, out of the tree entirely, which is the actual complaint. So the
  // work here is deciding *now* and acting after.
  function handleEscape(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    const api = treeApiRef.current;
    if (!api) return;

    if (api.isEditing) {
      // The field cancels itself; this only catches the focus. Deferred
      // because the input is still mounted and still focused at this point,
      // and focusing the tree before it goes would be undone by it going.
      requestAnimationFrame(focusTree);
      return;
    }

    // Not "deselect everything": in this app the tree's selection *is* which
    // page is open, so clearing it outright would close the page as a side
    // effect of getting out of a multi-select. Dropping back to the row you're
    // on is the half that maps — it undoes the selection without touching what
    // you're reading. With nothing multi-selected there's nothing to undo, and
    // Escape falls through to whatever else wants it.
    const focused = api.focusedNode;
    if (api.selectedIds.size <= 1 || !focused) return;
    event.preventDefault();
    api.select(focused);
  }

  return (
    <div className="tree-panel">
      <TreeSearch value={searchQuery} onChange={setSearchQuery} mode={searchMode} onModeChange={setSearchMode} />
      {/* Above the path bar, not below it: the rail belongs to the project
          and the path bar belongs to whatever the tree is currently showing,
          so a rail that moved when you focused a folder would read as being
          part of the focused branch. */}
      <BookmarksRail
        pinnedIds={project?.pinnedIds ?? []}
        selectedId={project?.selectedId ?? null}
        onSelect={selectNode}
        onUnpin={togglePinned}
      />
      {focusPath.length > 0 && (
        <TreePathBar projectName={project?.name ?? "Project"} path={focusPath} onFocus={setFocus} />
      )}
      <div className="tree-panel-body" ref={containerRef} onKeyDownCapture={handleEscape}>

        {size.height > 0 && (
          <Tree<TreeNodeData>
            ref={setTreeApiRef}
            data={treeData}
            width={size.width}
            height={size.height}
            indent={TREE_INDENT}
            openByDefault={false}
            initialOpenState={initialOpenState}
            // react-arborist's own mount effect deselects everything whenever
            // this is left unset — with nothing to tell it otherwise, it reads
            // "no selection" rather than "hasn't been told yet", and fires
            // `onSelect([])` to say so. That call reaches `selectNode` exactly
            // like a real deselect would, and up to now it always won: this is
            // why opening a project never actually landed on the page
            // `project.selectedId` already named — the page you were last on
            // was overwritten by this before the effect below ever got to
            // restore it, every single time. Handing it the real id up front
            // means the library asks for that node instead of clearing one.
            selection={project?.selectedId ?? undefined}
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
              //
              // `parentId` is null for a drop at the tree's own root, and
              // while focused that root *is* the focused node — not the
              // project. Without the fallback, dragging a page to the top of a
              // focused tree would fling it out to the project root, which is
              // the one place the person doing it can't currently see.
              void moveNodes(dragIds, parentId ?? focusedId, index);
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
