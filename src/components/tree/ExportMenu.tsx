// The formats behind `Export ▸` (Phase 28).
//
// **A submenu once there are three, and there will be five.** The argument is
// what a person reading the menu needs, not what anybody is used to: a
// right-click menu with five export lines in it is a menu nobody reads, and
// somebody who wants to export looks for the word "export" rather than for a
// particular format. Two entries did not justify the click; five would justify
// it twice over. Her call, 2026-09-10.
//
// Deliberately shaped like `SortMenu` and `MoveMenu`: the same panel, the same
// back row, swapped into the same popover. A third way of drawing a submenu
// would be the thing that made the menus feel inconsistent.
import { ArrowLeft, FileText, Files, Upload } from "lucide-react";
import type { ExportFormat } from "../../state/dialog-store";

type ExportMenuProps = {
  onSelect: (format: ExportFormat) => void;
  onBack: () => void;
};

/**
 * The wording drops "Export" from each row, since the row above says it.
 *
 * Kept as data rather than three hand-written buttons because two more
 * formats are coming and a list is where they should be added.
 */
const FORMATS: { format: ExportFormat; label: string; Icon: typeof Upload }[] = [
  { format: "lk", label: "To LegendKeeper", Icon: Upload },
  { format: "markdown", label: "As Markdown", Icon: Files },
  { format: "markdown-single", label: "As one Markdown file", Icon: FileText },
];

export function ExportMenu({ onSelect, onBack }: ExportMenuProps) {
  return (
    <div className="tree-context-menu">
      <button type="button" className="tree-context-menu-back" onClick={onBack}>
        <ArrowLeft size={13} /> Export
      </button>
      {FORMATS.map(({ format, label, Icon }) => (
        <button key={format} type="button" onClick={() => onSelect(format)}>
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  );
}
