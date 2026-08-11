// One tree row, rendered by react-arborist as its custom node renderer. Icon
// + name carry the effective (cascaded) color; folders with a color get a
// full-row tint, pages get icon-only tinting. See docs/glossary.md
// §Color Cascade and docs/spec.md §Node colors.
import { useState, type CSSProperties } from "react";
import type { NodeRendererProps } from "react-arborist";
import { ChevronDown, ChevronRight, Home, MoreHorizontal, Plus } from "lucide-react";
import { TREE_INDENT } from "../../constants/layout";
import { FOLDER_TEMPLATE_KEY } from "../../constants/schema";
import { getTemplateIcon } from "../../constants/icons";
import { getPaletteHex } from "../../constants/palette";
import { useIsPinned, useNode, useProjectActions, useProjectHomeId } from "../../hooks/use-project";
import {
  useEffectiveColor,
  useHiddenByAncestor,
  useMoveDestinations,
  type MoveDestination,
} from "../../hooks/use-tree-data";
import { useDialogs } from "../../hooks/use-dialogs";
import { useCreatePageIn } from "../../hooks/use-new-page";
import { useTreeDoubleClick } from "../../hooks/use-preferences";
import { useFileManagerName, useRevealNode } from "../../hooks/use-reveal";
import type { TreeNodeData } from "../../services/tree-service";
import { ColorPicker } from "./ColorPicker";
import { ContextMenu } from "./ContextMenu";
import { MoveMenu } from "./MoveMenu";
import { SortMenu } from "./SortMenu";
import { TreePopover } from "./TreePopover";

type OpenPopover = "color" | "menu" | "sort" | "move" | null;

export function TreeItem({ node, style, dragHandle }: NodeRendererProps<TreeNodeData>) {
  // Narrow subscriptions on purpose: this renders once per visible tree row,
  // and a full-store subscription re-rendered every row on every keystroke
  // typed into the editor.
  const fullNode = useNode(node.id);
  const {
    duplicateNodes,
    deleteNodes,
    moveNodes,
    setNodeColor,
    setNodeHidden,
    setProjectHome,
    setFocus,
    sortChildren,
    saveAsTemplate,
    togglePinned,
  } = useProjectActions();
  const effective = useEffectiveColor(node.id);
  const hiddenByAncestor = useHiddenByAncestor(node.id);
  const homeNodeId = useProjectHomeId();
  const isPinned = useIsPinned(node.id);
  const { confirmDestructive, requestExport, requestTemplateScope } = useDialogs();
  const createPageIn = useCreatePageIn();
  const doubleClickAction = useTreeDoubleClick();
  const revealNode = useRevealNode();
  const fileManagerName = useFileManagerName();
  const getMoveDestinations = useMoveDestinations();
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  // Computed when the submenu opens rather than on every render: it walks the
  // whole graph, and this component renders once per visible row. A menu shows
  // a snapshot anyway — nothing can move while it's open.
  const [destinations, setDestinations] = useState<MoveDestination[]>([]);

  if (!fullNode) return null;

  const isFolder = fullNode.templateKey === FOLDER_TEMPLATE_KEY;
  const { color: effectiveKey, isOwner } = effective;
  const effectiveHex = getPaletteHex(effectiveKey ?? undefined);
  const ownHex = getPaletteHex(fullNode.color);
  const Icon = getTemplateIcon(fullNode.templateKey);
  const showFolderTint = isFolder && !!effectiveHex;
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isProjectHome = homeNodeId === node.id;
  // Dimmed whether it's hidden itself or sitting under something that is —
  // both mean the same thing to a reader, and a normal-looking page inside a
  // hidden folder would be a lie about what gets shown.
  const looksHidden = Boolean(fullNode.hidden) || hiddenByAncestor;
  // Every page can hold pages now, so the chevron is purely about whether
  // there's anything to reveal — an empty page shows none. `node.isOpen` keeps
  // it visible through the moment a page is added, before the child arrives.
  const showToggle = hasChildren || node.isOpen;

  const rowStyle: CSSProperties = {
    borderLeft: ownHex ? `2px solid ${ownHex}` : "2px solid transparent",
  };
  if (showFolderTint) {
    rowStyle.backgroundColor = `${effectiveHex}${node.isSelected ? "40" : "1f"}`;
  }

  function openPopoverAt(which: Exclude<OpenPopover, null>, target: HTMLElement) {
    setAnchorRect(target.getBoundingClientRect());
    setOpenPopover(which);
  }

  function closePopover() {
    setOpenPopover(null);
    setAnchorRect(null);
  }

  // Read out here rather than inside handleDelete: `fullNode` is narrowed by
  // the guard above, but that narrowing doesn't reach into a hoisted function
  // declaration, which could in principle be called before it.
  const nodeName = fullNode.name;

  // What a menu action applies to. Acting on a row that's part of a
  // multi-selection acts on the whole selection — right-clicking a row
  // *outside* it has already replaced the selection with just that row (see
  // the context-menu handler below), so this reads correctly either way.
  function targetIds(): string[] {
    const selected = node.tree.selectedIds;
    return selected.size > 1 && selected.has(node.id) ? [...selected] : [node.id];
  }

  const selectionCount = targetIds().length;

  async function handleDelete() {
    const ids = targetIds();
    let warning: string;
    if (ids.length > 1) {
      // Deliberately doesn't try to count descendants: "12 pages" when the
      // user selected 3 folders reads like a miscount rather than a warning.
      warning = `Delete these ${ids.length} pages, and everything inside them? This can't be undone.`;
    } else {
      warning = hasChildren
        ? `Delete "${nodeName}" and everything inside it? This can't be undone.`
        : `Delete "${nodeName}"? This can't be undone.`;
    }
    if (await confirmDestructive(warning)) deleteNodes(ids);
  }

  // Asks the sub-pages question first, then copies. Cancel resolves to null
  // and nothing happens — which is why the dialog offers three answers rather
  // than a yes/no, since "no" would otherwise have to mean "just this page".
  //
  // The row's own children decide whether it's worth asking: a page with
  // nothing inside it has no sub-pages to include or leave behind, and a
  // dialog whose two buttons do the same thing is a dialog asking nothing.
  async function handleSaveAsTemplate() {
    if (!hasChildren) {
      await saveAsTemplate(node.id, false);
      return;
    }
    const scope = await requestTemplateScope(nodeName);
    if (scope) await saveAsTemplate(node.id, scope === "all");
  }

  // Expand/collapse everything under the targeted rows. Walks react-arborist's
  // own node objects rather than the store, because open/closed is its state —
  // it calls back into `setExpanded` per row (see TreePanel's onToggle), which
  // is what persists the result to project.json.
  //
  // Only rows that actually hold something are touched. Every node in our data
  // carries a `children` array whether or not it has any (see tree-service's
  // buildTreeData and why it never returns null), so react-arborist considers
  // all of them expandable — opening the empty ones would write a line into
  // `expandedIds` for every leaf page in the subtree to no visible effect.
  //
  // The targeted rows themselves are opened by "expand" but not closed by
  // "collapse": the menu says *inside*, and folding the row you opened the menu
  // on would take the result off screen along with the thing that produced it.
  // Its own chevron is right there for that.
  function setSubtreeOpen(isOpen: boolean) {
    for (const id of targetIds()) {
      const target = node.tree.get(id);
      if (!target) continue;
      const walk = (current: typeof target, isTarget: boolean) => {
        const children = current.children ?? [];
        if (children.length === 0) return;
        if (isOpen) current.open();
        else if (!isTarget) current.close();
        for (const child of children) walk(child, false);
      };
      walk(target, true);
    }
  }

  // Shared by right-clicking the row and by the row's own "..." button, so the
  // two can't drift apart — the menu acts on the selection, and a menu opened
  // on a row that isn't in it would act on rows the user isn't pointing at.
  //
  // Opening it *inside* a multi-selection keeps that selection: that's the
  // whole point of having made one. Opening it anywhere else replaces it, the
  // way every file manager behaves.
  function openMenu(anchor: HTMLElement) {
    if (!node.isSelected) node.select();
    openPopoverAt("menu", anchor);
  }

  // Where the selection could go, worked out at the moment the submenu opens.
  function openMoveMenu() {
    setDestinations(getMoveDestinations(targetIds()));
    setOpenPopover("move");
  }

  // Opening the destination — and everything above it — is what makes the move
  // visible. Unlike a drag, which lands somewhere already on screen, this can
  // file a page into a collapsed folder in a corner of the tree nobody is
  // looking at, and from here that's indistinguishable from the page having
  // vanished. Done before the move so the row is already open when its new
  // page arrives, rather than blinking shut and back.
  function moveTo(destinationId: string | null) {
    const ids = targetIds();
    if (destinationId) {
      node.tree.openParents(destinationId);
      node.tree.open(destinationId);
    }
    void moveNodes(ids, destinationId);
    closePopover();
  }

  // The new page opens in the center panel and asks what it is there, so this
  // doesn't need to ask anything first. Expanding the row is what makes the
  // result visible — a page added to a collapsed row would otherwise appear to
  // have gone nowhere.
  function handleAddChild() {
    closePopover();
    node.open();
    createPageIn(node.id);
  }

  // Double-click opens the row, the way it does in every file manager. It used
  // to rename, which was react-arborist's default rather than a decision —
  // and renaming is the destructive one of the two to trigger by accident, on
  // the gesture people use to look inside things. Rename is on the menu, where
  // the rest of the row's actions already are.
  //
  // Both actions stay reachable whichever way this is set, so nothing is lost
  // by preferring the other: the menu always renames, and a row with children
  // always has its chevron.
  function handleDoubleClick() {
    if (doubleClickAction === "rename") {
      void node.edit();
      return;
    }
    // A row with nothing inside it has nothing to open. Renaming instead would
    // be the setting quietly not applying on exactly the rows where the old
    // behaviour was most likely to be muscle memory.
    if (showToggle) node.toggle();
  }

  return (
    <div className="tree-node" style={style} ref={dragHandle}>
      {/* One vertical line per level of nesting above this row, drawn where
          that ancestor's chevron sits. Every row draws its own segment and the
          rows are flush, so the segments read as continuous lines down the
          tree. Decoration only — hidden from screen readers, which already get
          the depth from react-arborist's aria-level. */}
      {node.level > 0 &&
        Array.from({ length: node.level }, (_, level) => (
          <span key={level} className="tree-guide" style={{ left: level * TREE_INDENT }} aria-hidden="true" />
        ))}
      <div
        // `tree-row-active` holds the row's buttons on screen while one of its
        // popovers is open. They're laid out only on hover now (see tree.css),
        // and the mouse leaves the row the moment it travels to the menu —
        // without this the buttons vanish and the name springs back to full
        // width underneath an open menu, including the button the menu is
        // anchored to.
        className={`tree-row${node.isSelected ? " tree-row-selected" : ""}${showFolderTint ? " tree-row-tinted" : ""}${node.willReceiveDrop ? " tree-row-drop-target" : ""}${looksHidden ? " tree-row-hidden" : ""}${openPopover ? " tree-row-active" : ""}`}
        style={rowStyle}
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu(e.currentTarget);
        }}
      >
        <button
          type="button"
          className="tree-row-toggle"
          onClick={(e) => {
            e.stopPropagation();
            node.toggle();
          }}
        >
          {showToggle && (node.isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
        </button>

        {/* eslint-disable-next-line react-hooks/static-components -- getTemplateIcon reads a fixed lookup table, so it returns the same stable component reference for a given templateKey every render */}
        <Icon size={14} className="tree-row-icon" style={effectiveHex ? { color: effectiveHex } : undefined} />

        {node.isEditing ? (
          <input
            className="tree-row-name-input"
            defaultValue={fullNode.name}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => node.submit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") node.submit(e.currentTarget.value);
              if (e.key === "Escape") node.reset();
            }}
          />
        ) : (
          <span
            className="tree-row-name"
            style={showFolderTint ? { color: effectiveHex ?? undefined, fontWeight: 500 } : undefined}
            onDoubleClick={handleDoubleClick}
          >
            {fullNode.name}
          </span>
        )}

        {isProjectHome && <Home size={11} className="tree-row-home-badge" aria-label="Project home" />}

        <button
          type="button"
          className="tree-row-color-dot"
          style={ownHex ? { backgroundColor: ownHex, borderColor: ownHex } : undefined}
          title="Set color"
          onClick={(e) => {
            e.stopPropagation();
            if (openPopover === "color") closePopover();
            else openPopoverAt("color", e.currentTarget);
          }}
        />

        {/* The right-click menu, for anyone who doesn't right-click. Anchored to
            the button rather than the row so the menu opens under the thing
            that was pressed. */}
        <button
          type="button"
          className="tree-row-menu"
          title="More actions"
          onClick={(e) => {
            e.stopPropagation();
            if (openPopover === "menu") closePopover();
            else openMenu(e.currentTarget);
          }}
        >
          <MoreHorizontal size={12} />
        </button>

        {/* On every row: there's no longer a kind of page that can't hold one. */}
        <button
          type="button"
          className="tree-row-add"
          title="New page inside"
          onClick={(e) => {
            e.stopPropagation();
            handleAddChild();
          }}
        >
          <Plus size={12} />
        </button>
      </div>

      {openPopover === "color" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={closePopover}>
          <ColorPicker
            ownColor={fullNode.color}
            showInheritedHint={!isOwner && effectiveKey !== null}
            onSelect={(colorKey) => {
              setNodeColor(targetIds(), colorKey);
              closePopover();
            }}
          />
        </TreePopover>
      )}
      {openPopover === "sort" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={closePopover}>
          <SortMenu
            onSelect={(sort) => {
              // Opened as well as sorted, for the same reason "Focus here"
              // opens: a reorder inside a collapsed row is a change with
              // nothing on screen to show for it.
              node.open();
              sortChildren(node.id, sort);
              closePopover();
            }}
            onBack={() => setOpenPopover("menu")}
          />
        </TreePopover>
      )}
      {openPopover === "move" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={closePopover}>
          <MoveMenu destinations={destinations} onSelect={moveTo} onBack={() => setOpenPopover("menu")} />
        </TreePopover>
      )}
      {openPopover === "menu" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={closePopover}>
          <ContextMenu
            isProjectHome={isProjectHome}
            isPinned={isPinned}
            // This row's own flag, not `looksHidden`: a visible page inside a
            // hidden folder still has hiding of its own to offer, and offering
            // to "show" it would set a flag that changes nothing anyone sees.
            isHidden={Boolean(fullNode.hidden)}
            selectionCount={selectionCount}
            fileManagerName={fileManagerName}
            hasChildren={hasChildren}
            canSort={(node.children?.length ?? 0) > 1}
            onRename={() => void node.edit()}
            onDuplicate={() => void duplicateNodes(targetIds())}
            onMoveTo={openMoveMenu}
            onSetColor={() => setOpenPopover("color")}
            onSaveAsTemplate={() => void handleSaveAsTemplate()}
            onSortChildren={() => setOpenPopover("sort")}
            onExpandAll={() => setSubtreeOpen(true)}
            onCollapseAll={() => setSubtreeOpen(false)}
            // Opened as well as focused. The row is about to stop existing at
            // this level — it becomes the path bar — and leaving the tree
            // collapsed under it would show an empty panel under a bar naming
            // a page with things in it.
            onFocusHere={() => {
              node.open();
              setFocus(node.id);
            }}
            onToggleProjectHome={() => setProjectHome(node.id)}
            onTogglePinned={() => togglePinned(node.id)}
            onToggleHidden={() => setNodeHidden(targetIds(), !fullNode.hidden)}
            onReveal={() => void revealNode(node.id)}
            onExport={() => requestExport(targetIds())}
            onDelete={handleDelete}
            onAddChild={handleAddChild}
            onClose={closePopover}
          />
        </TreePopover>
      )}
    </div>
  );
}
