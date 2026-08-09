// Turns a GitHub release body into the one paragraph the update panel shows.
//
// The body is whatever was written on the release, which since v0.3.0 is a
// section pasted out of `RELEASES.md`: a paragraph of prose, then `###`
// headings and dozens of `-` bullets. All of that is written for the releases
// page, where it renders. The panel is answering a narrower question — *is
// this worth installing right now* — and the opening paragraph is the answer
// to it. The rest is a link away.
//
// Plain really is plain here. Nothing in this file produces markup, and the
// caller renders the result as a text node, so no release body can turn into
// an element in the app. That matters because this text arrives over the
// network: it is the only text in Anamnesis that didn't come off the user's
// own disk, and the panel it lands in is not a place worth inventing an HTML
// path for. See docs/handoff.md → Updates.

// A line that is only structure, with no words of its own to show: an ATX
// heading, or a horizontal rule in any of the three spellings.
const STRUCTURE_ONLY = /^(?:#{1,6}(?:\s|$)|-{3,}$|\*{3,}$|_{3,}$)/;

// Bullet or numbered list markers, as GitHub accepts them.
const LIST_MARKER = /^(?:[-*+]|\d+[.)])\s+/;

// A backslash in front of one of markdown's markers means the writer wanted
// the character itself. Splitting on this keeps the capture group in the
// output, so the pieces alternate text, literal, text, literal…
const ESCAPED_MARKER = /\\([\\`*_{}[\]()#+\-.!])/;

// Markdown's inline markers, removed rather than rendered. Order matters:
// images before links (an image is a link with a `!`), and `**bold**` before
// `*emphasis*` so the doubled markers aren't eaten one at a time.
function stripSegment(segment: string): string {
  return segment
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/\*([^*]+)\*/g, "$1")
    // Underscores only count as emphasis at a word boundary, or `snake_case`
    // in a release note would come out mangled.
    .replace(/(^|[\s([{])_([^_]+)_(?=$|[\s)\]},.;:!?])/g, "$1$2");
}

function stripInlineMarkdown(line: string): string {
  // The escaped characters are held out of the strippers entirely rather than
  // unescaped afterwards. Left in the text, `\*star\*` reads as emphasis to
  // the pass above and comes back as `\star\` — the stars gone and the
  // backslashes kept, which is exactly backwards.
  return line
    .split(ESCAPED_MARKER)
    .map((piece, index) => (index % 2 === 1 ? piece : stripSegment(piece)))
    .join("")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * The opening paragraph of a release body as plain text, or null if there
 * isn't one. Headings above the paragraph are skipped, so it doesn't matter
 * whether the `## v0.3.0` line was pasted in along with the section.
 */
export function summariseReleaseNotes(body: string | null | undefined): string | null {
  if (!body) return null;

  const blocks = body
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !STRUCTURE_ONLY.test(line)),
    )
    .filter((lines) => lines.length > 0);

  const first = blocks[0];
  if (!first) return null;

  // Prose is hard-wrapped in RELEASES.md, so its lines are rejoined into the
  // single paragraph they were written as. A body that opens with bullets
  // instead keeps one item per line — running those together would splice
  // sentences mid-thought — and `.update-check-notes` is already `pre-wrap`.
  const summary = first.every((line) => LIST_MARKER.test(line))
    ? first.map((line) => `• ${stripInlineMarkdown(line.replace(LIST_MARKER, ""))}`).join("\n")
    : stripInlineMarkdown(first.join(" "));

  return summary || null;
}
