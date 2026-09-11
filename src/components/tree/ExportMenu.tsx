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
import { ArrowLeft, FileArchive, FileText, Files, Globe, Upload } from "lucide-react";
import type { ExportFormat } from "../../state/dialog-store";

type ExportMenuProps = {
  onSelect: (format: ExportFormat) => void;
  onBack: () => void;
  /**
   * Which menu this is in.
   *
   * **Not every format makes sense for one page.** The JSON zip is the
   * project's own folder — there is no such thing as a folder for a single
   * character — so offering it on a row would be offering something that
   * cannot mean what it says. The other three take whatever they are given.
   */
  scope: "project" | "page";
};

/**
 * The wording drops "Export" from each row, since the row above says it.
 *
 * Kept as data rather than three hand-written buttons because two more
 * formats are coming and a list is where they should be added.
 */
const FORMATS: { format: ExportFormat; label: string; Icon: typeof Upload; projectOnly?: true }[] = [
  { format: "lk", label: "To LegendKeeper", Icon: Upload },
  { format: "markdown", label: "As Markdown", Icon: Files },
  { format: "markdown-single", label: "As one Markdown file", Icon: FileText },
  // Labelled JSON rather than Zip, her call: people arriving from other tools
  // look for the word, and the extension is the detail.
  { format: "json-zip", label: "As JSON (.zip)", Icon: FileArchive, projectOnly: true },
  // Phase 1.5. Last because it is the odd one out: the others hand her a file
  // to keep, this hands her a folder to put online.
  { format: "website", label: "As a website", Icon: Globe },
];

export function ExportMenu({ onSelect, onBack, scope }: ExportMenuProps) {
  return (
    <div className="tree-context-menu">
      <button type="button" className="tree-context-menu-back" onClick={onBack}>
        <ArrowLeft size={13} /> Export
      </button>
      {FORMATS.filter((entry) => scope === "project" || !entry.projectOnly).map(({ format, label, Icon }) => (
        <button key={format} type="button" onClick={() => onSelect(format)}>
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  );
}
