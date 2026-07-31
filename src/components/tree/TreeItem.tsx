// One tree row, rendered by react-arborist as its custom node renderer. Icon
// + name carry the effective (cascaded) color; folders with a color get a
// full-row tint, pages get icon-only tinting. See docs/glossary.md
// §Color Cascade and docs/spec.md §Node colors.
import { useState, type CSSProperties } from "react";
import type { NodeRendererProps } from "react-arborist";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { FOLDER_TEMPLATE_KEY } from "../../constants/schema";
import { getTemplateIcon } from "../../constants/icons";
import { getPaletteHex } from "../../constants/palette";
import { useNode, useProjectActions } from "../../hooks/use-project";
import { useEffectiveColor } from "../../hooks/use-tree-data";
import { useDialogs } from "../../hooks/use-dialogs";
import { useTemplates } from "../../hooks/use-templates";
import type { TreeNodeData } from "../../services/tree-service";
import { ColorPicker } from "./ColorPicker";
import { ContextMenu } from "./ContextMenu";
import { TemplatePicker } from "./TemplatePicker";
import { TreePopover } from "./TreePopover";

type OpenPopover = "color" | "add" | "menu" | null;

export function TreeItem({ node, style, dragHandle }: NodeRendererProps<TreeNodeData>) {
  // Narrow subscriptions on purpose: this renders once per visible tree row,
  // and a full-store subscription re-rendered every row on every keystroke
  // typed into the editor.
  const fullNode = useNode(node.id);
  const { duplicateNode, deleteNode, addNode, updateNode } = useProjectActions();
  const effective = useEffectiveColor(node.id);
  const { confirmDestructive } = useDialogs();
  const { getLabel, canHaveChildren } = useTemplates();
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  if (!fullNode) return null;

  const isFolder = fullNode.templateKey === FOLDER_TEMPLATE_KEY;
  const nestable = canHaveChildren(fullNode.templateKey);
  const { color: effectiveKey, isOwner } = effective;
  const effectiveHex = getPaletteHex(effectiveKey ?? undefined);
  const ownHex = getPaletteHex(fullNode.color);
  const Icon = getTemplateIcon(fullNode.templateKey);
  const showFolderTint = isFolder && !!effectiveHex;
  const hasChildren = (node.children?.length ?? 0) > 0;
  const showToggle = hasChildren || (nestable && node.isOpen);

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

  async function handleDelete() {
    const warning = hasChildren
      ? `Delete "${nodeName}" and everything inside it? This can't be undone.`
      : `Delete "${nodeName}"? This can't be undone.`;
    if (await confirmDestructive(warning)) deleteNode(node.id);
  }

  function handleAddChild(templateKey: string) {
    addNode({ parentId: node.id, templateKey, name: `New ${getLabel(templateKey)}` });
    closePopover();
    node.open();
  }

  return (
    <div style={style} ref={dragHandle}>
      <div
        className={`tree-row${node.isSelected ? " tree-row-selected" : ""}${showFolderTint ? " tree-row-tinted" : ""}${node.willReceiveDrop ? " tree-row-drop-target" : ""}`}
        style={rowStyle}
        onContextMenu={(e) => {
          e.preventDefault();
          node.select();
          openPopoverAt("menu", e.currentTarget);
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
            onDoubleClick={() => void node.edit()}
          >
            {fullNode.name}
          </span>
        )}

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

        {nestable && (
          <button
            type="button"
            className="tree-row-add"
            title="Add child"
            onClick={(e) => {
              e.stopPropagation();
              if (openPopover === "add") closePopover();
              else openPopoverAt("add", e.currentTarget);
            }}
          >
            <Plus size={12} />
          </button>
        )}
      </div>

      {openPopover === "color" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={closePopover}>
          <ColorPicker
            ownColor={fullNode.color}
            showInheritedHint={!isOwner && effectiveKey !== null}
            onSelect={(colorKey) => {
              updateNode(node.id, { color: colorKey });
              closePopover();
            }}
          />
        </TreePopover>
      )}
      {openPopover === "add" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={closePopover}>
          <TemplatePicker onSelect={handleAddChild} />
        </TreePopover>
      )}
      {openPopover === "menu" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={closePopover}>
          <ContextMenu
            canHaveChildren={nestable}
            onRename={() => void node.edit()}
            onDuplicate={() => void duplicateNode(node.id)}
            onSetColor={() => setOpenPopover("color")}
            onDelete={handleDelete}
            onAddChild={() => setOpenPopover("add")}
            onClose={closePopover}
          />
        </TreePopover>
      )}
    </div>
  );
}
