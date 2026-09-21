// The markdown that turns into formatting as it is typed, listed for the
// shortcut sheet (Queued Adjustments, 2026-09-21).
//
// **A written list, on purpose, and the sheet says where it came from.** The
// slash commands beside it are generated from the menu itself, because they
// are ours; these are BlockNote's and tiptap's input rules, which nothing in
// the app can read back out. They were taken from the installed BlockNote
// 0.52 (`find:` patterns in its blocks bundle, `inputRegex` in tiptap's mark
// extensions), and `e2e/writes-with-shortcuts.e2e.ts` types a few of them to
// catch one going missing. Each is written the way a person would type it,
// with `text` standing for whatever they are writing.

export type MarkdownShortcut = {
  /** As typed, with a trailing space where the rule needs one. */
  typed: string;
  what: string;
};

export const MARKDOWN_SHORTCUTS: readonly MarkdownShortcut[] = [
  { typed: "# ", what: "Heading 1 — up to ###### for heading 6" },
  { typed: "- ", what: "Bullet list (* and + do the same)" },
  { typed: "1. ", what: "Numbered list" },
  { typed: "[] ", what: "Check list ([x] for one already ticked)" },
  { typed: "> ", what: "Quote" },
  { typed: "```", what: "Code block" },
  { typed: "---", what: "Divider" },
  { typed: "**text**", what: "Bold (__text__ too)" },
  { typed: "*text*", what: "Italic (_text_ too)" },
  { typed: "~~text~~", what: "Strikethrough" },
  { typed: "`text`", what: "Code" },
];
