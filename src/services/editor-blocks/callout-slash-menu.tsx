// Slash-menu entries for the callouts, added alongside BlockNote's built-in
// items (see page/Editor.tsx). See docs/spec.md §BlockNote editor.
//
// **Six entries over three block types, as of 2026-09-06.** Success, Warning
// and Danger are Info callouts that arrive already coloured and already
// carrying their icon — the four conventions that used to be inferred from a
// colour, made into things you pick instead. `constants/callout-colors.ts`
// holds what each one is and why the inference had to go; this file only turns
// that list into menu items, so a seventh kind is an entry there and nothing
// here.
//
// **And one of the built-in items removed.** BlockNote ships its own Quote,
// which inserts its own quote block — a different type from our Quote callout,
// kept because LK import maps a plain blockquote to it. Since both are now
// drawn the same (page.css), two entries called Quote in one menu are a coin
// toss with no visible difference and a different `.lk` export behind it. Ours
// stays, since it is the one the app is built around.
import { insertOrUpdateBlockForSlashMenu, type BlockNoteEditor } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { createElement } from "react";
import { CALLOUT_KINDS } from "../../constants/callout-colors";

/**
 * BlockNote's own Quote entry, taken out of its default list.
 *
 * **Matched on the title, which is the only handle there is.** The core type
 * carries a stable `key`, and the React wrapper `Omit`s it before we ever see
 * the item — so a title it is. The app has no i18n, so the string is fixed;
 * and if BlockNote ever renames it the failure is the duplicate coming back,
 * which is visible in the menu rather than dangerous.
 */
export function withoutBuiltInQuote(items: DefaultReactSuggestionItem[]): DefaultReactSuggestionItem[] {
  return items.filter((item) => item.title !== "Quote");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
export function getCalloutSlashMenuItems(editor: BlockNoteEditor<any, any, any>): DefaultReactSuggestionItem[] {
  return CALLOUT_KINDS.map((kind) => ({
    title: kind.title,
    subtext: kind.subtext,
    aliases: kind.aliases,
    group: "Callouts",
    /* `createElement` rather than `<kind.menuIcon />`: rendering a component
       read out of a local is what react-hooks/static-components is there to
       stop, and this one genuinely differs per entry. */
    icon: createElement(kind.menuIcon, { size: 16 }),
    onItemClick: () =>
      insertOrUpdateBlockForSlashMenu(editor, {
        type: kind.type,
        // Written down at creation, which is the whole difference: a Warning
        // that is later recoloured keeps its triangle, because the triangle is
        // a value on the block rather than something read back off the colour.
        props: { color: kind.color, icon: kind.icon },
      }),
  }));
}
