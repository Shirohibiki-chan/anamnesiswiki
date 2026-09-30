// Plain text pasted into a page arrives as the characters it was made of
// (2026-09-22).
//
// BlockNote reads every plain-text paste as Markdown, which is the other half
// of what the measurement on 2026-09-21 found (`docs/ideas.md` § Import and
// paste fidelity). `*She smiles.*` arrived italic with the asterisks eaten,
// `<Kalla>` vanished as an unknown tag, a line beginning `# ` became a
// heading. For prose written the way roleplay and bot text is written, that
// is not formatting being added — it is characters being deleted.
//
// **All this file does is decide where the paragraphs are**, because that is
// the only judgement plain text needs. The words themselves are handed to the
// editor as they arrived: nothing is escaped, parsed or matched, which is why
// `<Kalla>` and `*TEN SECONDS,*` come through — there is no step left that
// could eat them.
//
// **The rule is the mirror of `copy-as-text.ts`**, so the round trip closes: a
// blank line ends a paragraph, a single line break is a line break inside one.
// Text copied out of a page and pasted back in is the page it came from,
// including an empty paragraph somebody left there on purpose.

/**
 * The paragraphs a piece of plain text describes, in order.
 *
 * An empty string in the list is an empty paragraph, which is content — two
 * blank lines between paragraphs is somebody spacing their document out, and
 * the anti-goals in `ideas.md` say not to tidy it away.
 *
 * Line endings are normalised first, so text from Notepad, from a chat window
 * and from another page here all describe the same paragraphs. What is left
 * inside a paragraph is a single `\n` per line break, which is exactly what
 * BlockNote's inline content means by one.
 */
export function paragraphsFromPlainText(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n\n");
}
