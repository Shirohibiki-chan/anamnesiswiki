// Parses a GitHub release body into blocks the update panel can render.
//
// The body is a section pasted out of `RELEASES.md` — the notes written for
// people rather than the changelog written for us. That document is already
// the short version: v0.3.0 is ~1,500 words cut down from ~280 changelog
// lines. It doesn't want cutting down again on the way to the screen, it wants
// showing, so this keeps the headings, the bullets and the emphasis it was
// written with.
//
// **This produces data, never markup.** The result is plain objects; the
// component turns them into React elements. There is no HTML string anywhere
// in between, and nothing here is passed to `dangerouslySetInnerHTML`. That
// rule is what makes it safe to render text the app fetched over the network —
// the only text in Anamnesis that didn't come off the user's own disk. Adding
// a markdown library that emits HTML would undo it. See docs/handoff.md →
// Updates.
//
// The grammar is deliberately only what RELEASES.md actually uses: `###`
// headings, `-`/`1.` bullets, `**bold**`, `*emphasis*`, `` `code` ``, and
// links reduced to their words. Underscores are left alone as ordinary
// characters — nobody writing these uses `_emphasis_`, and `snake_case` and
// `_folder.json` turn up in them constantly.

export type ReleaseNoteSpan =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "code"; text: string };

export type ReleaseNoteBlock =
  | { kind: "heading"; spans: ReleaseNoteSpan[] }
  | { kind: "paragraph"; spans: ReleaseNoteSpan[] }
  | { kind: "list"; ordered: boolean; items: ReleaseNoteSpan[][] };

const HEADING = /^#{1,6}(?:\s+(.*))?$/;
const HORIZONTAL_RULE = /^(?:-{3,}|\*{3,}|_{3,})$/;
const LIST_ITEM = /^([-*+]|\d+[.)])\s+(.*)$/;

// The version line at the top of a RELEASES.md section — `## v0.3.0 — date`.
// Dropped when it leads, because the panel's own headline directly above the
// notes already says which version this is.
const VERSION_HEADING = /^v?\d+\.\d+/;

// One pass, longest-form-first so `**bold**` is matched before `*emphasis*`
// and an image before the link it looks like. No lookbehind anywhere: older
// WKWebView builds don't have it, and this runs in the system webview.
const INLINE = /!\[[^\]]*\]\([^)]*\)|\[([^\]]*)\]\([^)]*\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\\([\\`*_{}[\]()#+\-.!])/g;

function parseSpans(text: string): ReleaseNoteSpan[] {
  const spans: ReleaseNoteSpan[] = [];
  let plain = "";

  // Runs of ordinary characters accumulate here and land as one span, so an
  // escaped marker doesn't split a sentence into three.
  function flush() {
    if (plain) spans.push({ kind: "text", text: plain });
    plain = "";
  }

  INLINE.lastIndex = 0;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE.exec(text)) !== null) {
    plain += text.slice(cursor, match.index);
    cursor = match.index + match[0].length;

    const [, link, code, strong, em, escaped] = match;
    if (escaped !== undefined) plain += escaped;
    else if (link !== undefined) plain += link;
    else if (code !== undefined) {
      flush();
      spans.push({ kind: "code", text: code });
    } else if (strong !== undefined) {
      flush();
      spans.push({ kind: "strong", text: strong });
    } else if (em !== undefined) {
      flush();
      spans.push({ kind: "em", text: em });
    }
    // An image is the remaining case: dropped, since there's nothing to show.
  }

  plain += text.slice(cursor);
  flush();

  // A dropped image leaves the space that separated it from the next word, so
  // the run is tidied at both ends before it goes out.
  const first = spans[0];
  if (first?.kind === "text") first.text = first.text.replace(/^\s+/, "");
  const last = spans[spans.length - 1];
  if (last?.kind === "text") last.text = last.text.replace(/\s+$/, "");

  return spans.filter((span) => span.kind !== "text" || span.text !== "");
}

/**
 * The release body as blocks, or an empty array if it had none worth showing.
 */
export function parseReleaseNotes(body: string | null | undefined): ReleaseNoteBlock[] {
  if (!body) return [];

  const blocks: ReleaseNoteBlock[] = [];
  let prose: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  function endProse() {
    if (prose.length === 0) return;
    // RELEASES.md hard-wraps at ~78 characters, so the lines of a paragraph
    // are rejoined into the one paragraph they were written as.
    blocks.push({ kind: "paragraph", spans: parseSpans(prose.join(" ")) });
    prose = [];
  }

  function endList() {
    if (!list) return;
    blocks.push({ kind: "list", ordered: list.ordered, items: list.items.map(parseSpans) });
    list = null;
  }

  for (const raw of body.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim().replace(/[ \t]+/g, " ");

    if (!line) {
      endProse();
      endList();
      continue;
    }

    if (HORIZONTAL_RULE.test(line)) {
      endProse();
      endList();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      endProse();
      endList();
      const spans = parseSpans(heading[1]?.trim() ?? "");
      if (spans.length > 0) blocks.push({ kind: "heading", spans });
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      endProse();
      const ordered = /\d/.test(item[1]);
      // A list that changes marker style is still one list; the panel has no
      // way to show the difference and doesn't need one.
      if (!list) list = { ordered, items: [] };
      list.items.push(item[2]);
      continue;
    }

    // Not blank, not a marker — so it's the rest of whatever came before.
    // Bullets in RELEASES.md routinely run five or six lines, and each of
    // those continuation lines lands here.
    if (list) list.items[list.items.length - 1] += ` ${line}`;
    else prose.push(line);
  }

  endProse();
  endList();

  const first = blocks[0];
  if (first?.kind === "heading" && VERSION_HEADING.test(plainText(first.spans))) blocks.shift();

  return blocks;
}

/** The words of a run of spans, with the formatting dropped. */
export function plainText(spans: ReleaseNoteSpan[]): string {
  return spans.map((span) => span.text).join("");
}
