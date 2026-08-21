// The frame every sidebar block sits in: its title strip, its colour, its drag
// grip and its menu button. Phase 18a.
//
// **The shell owns the title, not the field inside it.** Every property field
// used to draw its own label, which is why they now take an empty `label` and
// skip it (see TextProperty). Moving that up here is what makes Title / No
// title one behaviour across thirteen block kinds instead of thirteen
// implementations of it, and it is why a text block can be a bare paragraph
// with no heading at all.
import { useRef, useState, type ReactNode } from "react";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getPaletteHex } from "../../constants/palette";
import { TreePopover } from "../tree/TreePopover";
import { BlockMenu } from "./BlockMenu";

type BlockShellProps = {
  id: string;
  /** What the title strip shows when the block has no title of its own. */
  naturalTitle: string;
  title: string | undefined;
  titleShown: boolean;
  color: string | undefined;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRetitle: (title: string | undefined) => void;
  onToggleTitle: () => void;
  onColor: (color: string | undefined) => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  children: ReactNode;
};

export function BlockShell({
  id,
  naturalTitle,
  title,
  titleShown,
  color,
  canMoveUp,
  canMoveDown,
  onRetitle,
  onToggleTitle,
  onColor,
  onDuplicate,
  onMove,
  onRemove,
  children,
}: BlockShellProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement | null>(null);

  const shown = title ?? naturalTitle;
  const hex = getPaletteHex(color);

  function startRename() {
    setDraft(shown);
    setIsRenaming(true);
    setMenuRect(null);
  }

  // An empty box means "back to the natural name" rather than a blank strip —
  // clearing a title is the way to undo a rename, and storing "" would leave
  // the block wearing nothing with no way to tell it apart from a bug.
  function commitRename() {
    const trimmed = draft.trim();
    onRetitle(trimmed && trimmed !== naturalTitle ? trimmed : undefined);
    setIsRenaming(false);
  }

  return (
    <div
      ref={setNodeRef}
      className={`block-shell${isDragging ? " block-shell-dragging" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        ...(hex ? { ["--block-accent" as string]: hex } : {}),
      }}
      {...attributes}
    >
      <div className="block-shell-bar">
        {/* The grip carries the drag listeners rather than the whole block, for
            the reason the old property rows did: a block is mostly text inputs,
            and dragging to select text inside one would start a reorder. */}
        <span className="block-grip" title="Drag to reorder" {...listeners}>
          <GripVertical size={12} />
        </span>

        {titleShown &&
          (isRenaming ? (
            <input
              ref={input}
              className="block-title-input"
              autoFocus
              value={draft}
              placeholder={naturalTitle}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setIsRenaming(false);
              }}
            />
          ) : (
            <button type="button" className="ui-eyebrow block-title" onDoubleClick={startRename}>
              {shown}
            </button>
          ))}

        <button
          type="button"
          className="block-menu-trigger"
          aria-label={`${shown} block options`}
          onClick={(e) => setMenuRect(e.currentTarget.getBoundingClientRect())}
        >
          <MoreHorizontal size={13} />
        </button>
      </div>

      <div className="block-shell-body">{children}</div>

      {menuRect && (
        <TreePopover anchorRect={menuRect} onClose={() => setMenuRect(null)}>
          <BlockMenu
            titleShown={titleShown}
            color={color}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onRename={startRename}
            onToggleTitle={() => {
              onToggleTitle();
              setMenuRect(null);
            }}
            onColor={(next) => {
              onColor(next);
              setMenuRect(null);
            }}
            onDuplicate={() => {
              onDuplicate();
              setMenuRect(null);
            }}
            onMove={(direction) => {
              onMove(direction);
              setMenuRect(null);
            }}
            onRemove={() => {
              onRemove();
              setMenuRect(null);
            }}
          />
        </TreePopover>
      )}
    </div>
  );
}
