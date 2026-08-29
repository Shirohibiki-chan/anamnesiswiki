// Slash-menu entries that put one of the page's own blocks into the writing.
// Phase 19.5. See docs/plan.md.
//
// **These are the sidebar's blocks, offered from the other end.** Nothing here
// is a new kind of block — every entry makes the same record `+ Add Block`
// makes and then points the document at it, which is why the two menus have to
// keep saying the same things. `AddBlockMenu` is the sidebar's copy; if a kind
// is added to one and not the other the app has two answers to what a page can
// hold.
//
// **The meters are eight entries over one block, on purpose**, for the reason
// the sidebar's menu already gives: somebody adding a rating does not want to
// add a progress bar and then go hunting for the setting that turns it into
// one. Read from METER_STYLES rather than listed again, so a ninth shape
// appears here without being added here.
import { insertOrUpdateBlockForSlashMenu, type BlockNoteEditor } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { AtSign, FileText, Image as ImageIcon, Link2, ListTree, PanelsTopLeft, Sparkles, Tags } from "lucide-react";
import { METER_STYLES } from "../../constants/meter-styles";
import { BLOCK_REF_TYPE, INFOBOX_TYPE, type Block, type BlockKind } from "../../constants/schema";

/** Makes the block record and hands back its id — the store's `addBlock`. */
export type AddPageBlock = (kind: BlockKind, extra?: Partial<Block>) => string;

export function getPageBlockSlashMenuItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
  editor: BlockNoteEditor<any, any, any>,
  addPageBlock: AddPageBlock,
): DefaultReactSuggestionItem[] {
  /**
   * Makes the block, then points the document at it.
   *
   * **In that order, and it cannot be the other way round.** The document has
   * to carry an id that already exists, or the pointer draws nothing until the
   * record catches up — which on a slow save is a visible blank.
   */
  function insert(kind: BlockKind, extra?: Partial<Block>) {
    const blockId = addPageBlock(kind, extra);
    const inserted = insertOrUpdateBlockForSlashMenu(editor, { type: BLOCK_REF_TYPE, props: { blockId } });

    // **A line after it, and the cursor in that line.** A block block holds no
    // text of its own, so inserting one at the end of a page leaves the caret
    // with nowhere to go: typing does nothing, and the only way on is to find
    // a spot with the mouse. Worse, there is then no line to press backspace
    // from, which is how anybody would try to take the block out again.
    //
    // Only when it really is last — a block inserted mid-page already has a
    // line under it, and adding another would leave a blank one behind every
    // time she used the menu.
    const document = editor.document;
    if (document[document.length - 1]?.id !== inserted.id) return;
    editor.insertBlocks([{ type: "paragraph" }], inserted.id, "after");
    const after = editor.document[editor.document.length - 1];
    if (after) editor.setTextCursorPosition(after.id, "end");
  }

  return [
    {
      // **First, and it makes nothing.** Every other entry here creates a block
      // record; an infobox starts empty and is filled from its own Add Block,
      // so there is nothing to make until she picks something. That is also why
      // it is the one entry that cannot leave a stray block behind if she
      // changes her mind.
      title: "Infobox",
      subtext: "A framed group of blocks, with its own Add Block",
      aliases: ["infobox", "panel", "group", "box"],
      group: "Page blocks",
      icon: <PanelsTopLeft size={16} />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: INFOBOX_TYPE }),
    },
    {
      title: "Text block",
      subtext: "A titled box of writing, in the page",
      aliases: ["textbox", "text", "block"],
      group: "Page blocks",
      icon: <FileText size={16} />,
      onItemClick: () => insert("text"),
    },
    {
      title: "Picture block",
      subtext: "The page's picture, at full width",
      // Not "image": BlockNote's own Image entry is in this menu too, and that
      // one inserts a picture into the writing. These are different things and
      // the words have to be different or the menu is a coin toss.
      aliases: ["picture", "pictureblock"],
      group: "Page blocks",
      icon: <ImageIcon size={16} />,
      onItemClick: () => insert("image"),
    },
    {
      title: "Tags",
      subtext: "This page's tags",
      aliases: ["tags"],
      group: "Page blocks",
      icon: <Tags size={16} />,
      onItemClick: () => insert("tags"),
    },
    {
      title: "Alias",
      subtext: "The page's other names",
      aliases: ["alias", "aka"],
      group: "Page blocks",
      icon: <AtSign size={16} />,
      onItemClick: () => insert("alias"),
    },
    {
      title: "Manual links",
      subtext: "A list of pages you choose",
      aliases: ["links", "collection"],
      group: "Page blocks",
      icon: <Link2 size={16} />,
      onItemClick: () => insert("collection", { source: "manual" }),
    },
    {
      title: "Subpage index",
      subtext: "Every page filed under this one",
      aliases: ["subpages", "children", "index"],
      group: "Page blocks",
      icon: <ListTree size={16} />,
      onItemClick: () => insert("collection", { source: "subpages" }),
    },
    {
      title: "Tag index",
      subtext: "Every page sharing a tag",
      aliases: ["tagindex", "index"],
      group: "Page blocks",
      icon: <Tags size={16} />,
      onItemClick: () => insert("collection", { source: "tags" }),
    },
    {
      // Named Backlinks rather than Mentions because that is the word she went
      // looking for — same reasoning as the sidebar's menu.
      title: "Backlinks",
      subtext: "Every page that mentions this one",
      aliases: ["backlinks", "mentions"],
      group: "Page blocks",
      icon: <Sparkles size={16} />,
      onItemClick: () => insert("collection", { source: "mentions" }),
    },
    ...METER_STYLES.map((style) => ({
      title: style.label,
      subtext: style.hint,
      aliases: ["meter", style.key.toLowerCase()],
      group: "Meters",
      icon: <style.icon size={16} />,
      onItemClick: () => insert("meter", { meter: style.key }),
    })),
  ];
}
