// The headings in a tab's writing, for the contents block to list. Phase 19.5.
//
// **It derives and stores nothing, which is the whole appeal.** A contents list
// that kept its own copy of the headings would be a second record of something
// the document already says, and it would be wrong the moment a heading was
// edited. This reads the document every time it draws.
//
// Pure, and takes the document rather than the editor: the same reason
// `column-service.ts` is separate from the block that uses it — the rules stay
// testable without launching the app.

/** One line of the contents list. */
export type TocHeading = {
  /** The BlockNote block's own id, which is what a click scrolls to. */
  id: string;
  /** 1, 2 or 3 — BlockNote's heading levels, and how far the line is indented. */
  level: number;
  /** The heading's words, with any formatting flattened away. */
  text: string;
};

/**
 * The text of one block's inline content.
 *
 * **Walked rather than read off a `text` field**, because inline content is a
 * list of runs: a heading with one bold word in it is three runs, and taking
 * the first would list the heading as its first two words. Links and mentions
 * are objects with their own content, which is why this recurses.
 */
function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((run) => {
      if (!run || typeof run !== "object") return "";
      const candidate = run as { text?: unknown; content?: unknown };
      if (typeof candidate.text === "string") return candidate.text;
      return textOf(candidate.content);
    })
    .join("");
}

/**
 * Every heading in the document, in reading order.
 *
 * **Nested headings count.** BlockNote's toggle heading holds its children
 * inside itself, so a heading written under one is a child rather than a
 * sibling — skipping those would leave a contents list that quietly stops at
 * the first collapsible section.
 *
 * A heading with nothing written in it yet is left out: it has no name to list,
 * and a row of blanks appearing as you press Enter is worse than a list that
 * fills in as you type.
 */
export function headingsOf(content: unknown): TocHeading[] {
  const found: TocHeading[] = [];

  function walk(blocks: unknown): void {
    if (!Array.isArray(blocks)) return;
    for (const entry of blocks) {
      if (!entry || typeof entry !== "object") continue;
      const candidate = entry as { id?: unknown; type?: unknown; props?: unknown; content?: unknown; children?: unknown };
      if (candidate.type === "heading" && typeof candidate.id === "string") {
        const text = textOf(candidate.content).trim();
        const rawLevel = (candidate.props as { level?: unknown } | undefined)?.level;
        if (text) found.push({ id: candidate.id, level: typeof rawLevel === "number" ? rawLevel : 1, text });
      }
      walk(candidate.children);
    }
  }

  walk(content);
  return found;
}
