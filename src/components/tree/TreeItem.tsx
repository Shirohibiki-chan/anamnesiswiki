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
import { useNode, useProjectActions, useProjectHomeId } from "../../hooks/use-project";
import { useEffectiveColor, useHiddenByAncestor } from "../../hooks/use-tree-data";
import { useDialogs } from "../../hooks/use-dialogs";
import { useCreatePageIn } from "../../hooks/use-new-page";
import { useTreeDoubleClick } from "../../hooks/use-preferences";
import { useFileManagerName, useRevealNode } from "../../hooks/use-reveal";
import type { TreeNodeData } from "../../services/tree-service";
import { ColorPicker } from "./ColorPicker";
import { ContextMenu } from "./ContextMenu";
import { TreePopover } from "./TreePopover";

type OpenPopover = "color" | "menu" | null;

export function TreeItem({ node, style, dragHandle }: NodeRendererProps<TreeNodeData>) {
  // Narrow subscriptions on purpose: this renders once per visible tree row,
  // and a full-store subscription re-rendered every row on every keystroke
  // typed into the editor.
  const fullNode = useNode(node.id);
  const { duplicateNode, deleteNodes, setNodeColor, setNodeHidden, setProjectHome, setFocus } = useProjectActions();
  const effective = useEffectiveColor(node.id);
  const hiddenByAncestor = useHiddenByAncestor(node.id);
  const homeNodeId = useProjectHomeId();
  const { confirmDestructive, requestExport } = useDialogs();
  const createPageIn = useCreatePageIn();
  const doubleClickAction = useTreeDoubleClick();
  const revealNode = useRevealNode();
  const fileManagerName = useFileManagerName();
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

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
        className={`tree-row${node.isSelected ? " tree-row-selected" : ""}${showFolderTint ? " tree-row-tinted" : ""}${node.willReceiveDrop ? " tree-row-drop-target" : ""}${looksHidden ? " tree-row-hidden" : ""}`}
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
      {openPopover === "menu" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={closePopover}>
          <ContextMenu
            isProjectHome={isProjectHome}
            // This row's own flag, not `looksHidden`: a visible page inside a
            // hidden folder still has hiding of its own to offer, and offering
            // to "show" it would set a flag that changes nothing anyone sees.
            isHidden={Boolean(fullNode.hidden)}
            selectionCount={selectionCount}
            fileManagerName={fileManagerName}
            hasChildren={hasChildren}
            onRename={() => void node.edit()}
            onDuplicate={() => void duplicateNode(node.id)}
            onSetColor={() => setOpenPopover("color")}
            // Opened as well as focused. The row is about to stop existing at
            // this level — it becomes the path bar — and leaving the tree
            // collapsed under it would show an empty panel under a bar naming
            // a page with things in it.
            onFocusHere={() => {
              node.open();
              setFocus(node.id);
            }}
            onToggleProjectHome={() => setProjectHome(node.id)}
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
