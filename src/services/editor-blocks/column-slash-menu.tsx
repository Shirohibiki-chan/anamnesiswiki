// The `/` entries that put a row of columns in the page. Phase 19.5.
//
// **Two and three, offered separately rather than one entry that asks.** A
// menu item that opens a number picker is two decisions where one will do, and
// the reference offers the shapes directly. Anything past three is narrower
// than a sentence in a page this wide.
import { insertOrUpdateBlockForSlashMenu, type BlockNoteEditor } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { Columns2, Columns3 } from "lucide-react";
import { COLUMN_LIST_TYPE, COLUMN_TYPE } from "../../constants/schema";

export function getColumnSlashMenuItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
  editor: BlockNoteEditor<any, any, any>,
): DefaultReactSuggestionItem[] {
  /**
   * Inserts the row, then puts the caret in the first lane.
   *
   * **Every lane starts with an empty paragraph, and that is not decoration.**
   * A column with no children has nothing to click into, so a row inserted
   * empty is a row that cannot be typed in — the only way into it would be to
   * drag something in from elsewhere.
   */
  function insert(count: number) {
    // No widths written down: an even split is what a row with no stored
    // widths already draws, and a row that says 50,50 says nothing extra.
    const columns = Array.from({ length: count }, () => ({
      type: COLUMN_TYPE,
      children: [{ type: "paragraph" }],
    }));
    const row = insertOrUpdateBlockForSlashMenu(editor, {
      type: COLUMN_LIST_TYPE,
      children: columns,
    });
    // **A line after the row when it lands at the end of the page**, for the
    // same reason a block in the page gets one: a row holds no text of its own,
    // so with nothing under it there is no way to carry on writing past it and
    // no line to press backspace from. See page-block-slash-menu.ts.
    const document = editor.document;
    if (document[document.length - 1]?.id === row.id) {
      editor.insertBlocks([{ type: "paragraph" }], row.id, "after");
    }
    const firstLane = editor.getBlock(row.id)?.children[0];
    const firstLine = firstLane?.children[0];
    if (firstLine) editor.setTextCursorPosition(firstLine.id, "start");
  }

  return [
    {
      title: "Two columns",
      subtext: "Two lanes of writing, side by side",
      aliases: ["columns", "column", "layout", "split", "two"],
      group: "Page blocks",
      icon: <Columns2 size={16} />,
      onItemClick: () => insert(2),
    },
    {
      title: "Three columns",
      subtext: "Three lanes of writing, side by side",
      aliases: ["columns", "column", "layout", "three"],
      group: "Page blocks",
      icon: <Columns3 size={16} />,
      onItemClick: () => insert(3),
    },
  ];
}
