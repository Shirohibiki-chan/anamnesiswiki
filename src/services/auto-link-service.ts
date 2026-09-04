// Finding the names of pages written as plain prose, and turning them into
// links. Phase 19.5. See docs/plan.md.
//
// **The one command in the phase that rewrites what she has already written**,
// which is why the finding and the rewriting are separate functions with the
// preview between them: nothing here happens without her seeing the list first.
// A page where forty names silently turn blue is worse than no feature.
//
// Pure, and takes the document rather than the editor — the same split
// `column-service.ts` and `toc-service.ts` use, so the matching rules below can
// be argued with in tests rather than in the running app.
import type { Node } from "../constants/schema";

/** A page, under one of the names it answers to. */
export type LinkableName = { nodeId: string; name: string; pageName: string };

/**
 * The shortest name worth matching.
 *
 * **Two letters is noise.** A page called "Ka" would claim every "ka" written
 * anywhere, and the whole-word rule below does not save it — there are real
 * two-letter words. Three is the first length where a page name is usually a
 * name rather than a syllable, and anything shorter can still be linked by
 * hand with `[[ ]]` or `@`.
 */
export const MIN_LINKABLE_NAME = 3;

/**
 * Every name that could become a link, longest first.
 *
 * **Ambiguous names are left out, exactly as `[[ ]]` leaves them out.** If two
 * pages are called Sable, no rule here can say which one a sentence meant, and
 * guessing is how a bulk pass quietly points half a world at the wrong page.
 * The `@` menu still lists both, which is the way to link one deliberately.
 *
 * **Aliases count**, since an alias is a name for linking purposes everywhere
 * else in the app — but `pageName` is what the page is really called, so a
 * preview can say which page a nickname is about to point at.
 *
 * **A page never links to itself.** A character page saying its own name in
 * every other sentence would become a page of links to the page you are on.
 */
export function linkableNames(nodes: Record<string, Node>, selfId: string): LinkableName[] {
  const byName = new Map<string, LinkableName[]>();

  for (const node of Object.values(nodes)) {
    if (node.id === selfId) continue;
    for (const name of [node.name, ...(node.aliases ?? [])]) {
      const trimmed = name.trim();
      if (trimmed.length < MIN_LINKABLE_NAME) continue;
      const key = trimmed.toLowerCase();
      const entry: LinkableName = { nodeId: node.id, name: trimmed, pageName: node.name };
      const existing = byName.get(key);
      if (existing) existing.push(entry);
      else byName.set(key, [entry]);
    }
  }

  return [...byName.values()]
    .filter((entries) => entries.length === 1)
    .map((entries) => entries[0])
    .sort((a, b) => b.name.length - a.name.length);
}

/** One run of text that could become a link. */
export type LinkMatch = {
  /** The block holding it, and which item of that block's content. */
  blockId: string;
  itemIndex: number;
  /** Where in that item's text, so several matches in one paragraph stay apart. */
  start: number;
  end: number;
  /** Exactly what is written there — which may be an alias, or differently cased. */
  text: string;
  nodeId: string;
  /** What the page is actually called, for the preview to show. */
  pageName: string;
  /** The words either side, so the preview shows the sentence rather than the name. */
  context: string;
};

/** How much of the line either side of a match the preview gets. */
const CONTEXT_CHARS = 40;

/**
 * Whether the character at `at` ends a word.
 *
 * Deliberately not `\b`: a name can hold a space, an apostrophe or a hyphen —
 * "The Quiet Year", "Ka'ren" — and a regex boundary around the whole phrase
 * says nothing useful about the characters this actually has to check, which
 * are the ones immediately outside the match.
 */
function isWordChar(text: string, at: number): boolean {
  const char = text[at];
  return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

/**
 * Every place a page's name is written as plain prose.
 *
 * **Only in text.** Inline content that is already a mention or a link is a
 * different kind of item, so matches inside one are impossible by construction
 * rather than by a rule that could be forgotten — which is what stops a second
 * pass from linking the words inside the links the first pass made.
 *
 * **Longest name wins, and matches never overlap.** With pages called Valera
 * and Valera Jiang, the sentence naming the second should link to the second;
 * `linkableNames` sorts long-first and each match claims its characters.
 *
 * **Whole words only.** Without it a page called "Art" claims the middle of
 * "particular", which is the sort of thing that would be found weeks later in
 * the middle of a paragraph nobody was looking at.
 */
export function findLinkMatches(content: unknown, names: LinkableName[]): LinkMatch[] {
  const matches: LinkMatch[] = [];

  function scanText(blockId: string, itemIndex: number, text: string): void {
    const found: LinkMatch[] = [];
    // Which characters are already claimed, so a shorter name inside a longer
    // one is not matched a second time.
    const taken: boolean[] = new Array(text.length).fill(false);
    const haystack = text.toLowerCase();

    for (const name of names) {
      const needle = name.name.toLowerCase();
      let from = 0;
      for (;;) {
        const at = haystack.indexOf(needle, from);
        if (at === -1) break;
        const end = at + needle.length;
        from = at + 1;

        if (isWordChar(text, at - 1) || isWordChar(text, end)) continue;
        if (taken.slice(at, end).some(Boolean)) continue;

        for (let i = at; i < end; i++) taken[i] = true;
        found.push({
          blockId,
          itemIndex,
          start: at,
          end,
          text: text.slice(at, end),
          nodeId: name.nodeId,
          pageName: name.pageName,
          context: [
            at > CONTEXT_CHARS ? "…" : "",
            text.slice(Math.max(0, at - CONTEXT_CHARS), at),
            text.slice(at, end),
            text.slice(end, end + CONTEXT_CHARS),
            text.length > end + CONTEXT_CHARS ? "…" : "",
          ].join(""),
        });
      }
    }

    // This run's own matches in the order they are written. The loop above goes
    // name by name — longest first, which is what makes a long name win — and
    // that is not an order anybody reads in.
    matches.push(...found.sort((a, b) => a.start - b.start));
  }

  function walk(blocks: unknown): void {
    if (!Array.isArray(blocks)) return;
    for (const entry of blocks) {
      if (!entry || typeof entry !== "object") continue;
      const block = entry as { id?: unknown; content?: unknown; children?: unknown };
      if (typeof block.id === "string" && Array.isArray(block.content)) {
        block.content.forEach((item, itemIndex) => {
          if (!item || typeof item !== "object") return;
          const run = item as { type?: unknown; text?: unknown };
          if (run.type === "text" && typeof run.text === "string") {
            scanText(block.id as string, itemIndex, run.text);
          }
        });
      }
      walk(block.children);
    }
  }

  // Blocks are walked in document order and each run is sorted as it is
  // scanned, so what comes back reads down the page.
  walk(content);
  return matches;
}

/**
 * One block's content with the chosen matches turned into mentions.
 *
 * Returns the content it was given when none of the matches are in this block,
 * so a caller can tell which blocks it actually has to write.
 *
 * **Applied back to front.** Each replacement changes the offsets after it, and
 * working from the end means every match still describes the text it was found
 * in — the alternative is arithmetic that is right until two matches land in
 * one paragraph.
 */
export function withLinkedMatches(content: unknown[], matches: LinkMatch[], blockId: string): unknown[] {
  const mine = matches.filter((match) => match.blockId === blockId);
  if (mine.length === 0) return content;

  const next = [...content];
  const byItem = new Map<number, LinkMatch[]>();
  for (const match of mine) {
    const list = byItem.get(match.itemIndex);
    if (list) list.push(match);
    else byItem.set(match.itemIndex, [match]);
  }

  // Items are rebuilt one at a time and spliced in, so an item that gains three
  // mentions becomes seven pieces without disturbing its neighbours.
  for (const [itemIndex, itemMatches] of [...byItem.entries()].sort((a, b) => b[0] - a[0])) {
    const item = next[itemIndex] as { type?: string; text?: string; styles?: unknown };
    if (!item || item.type !== "text" || typeof item.text !== "string") continue;

    const styles = item.styles ?? {};
    const pieces: unknown[] = [];
    let cursor = 0;
    for (const match of [...itemMatches].sort((a, b) => a.start - b.start)) {
      if (match.start > cursor) pieces.push({ type: "text", text: item.text.slice(cursor, match.start), styles });
      // **`text` is empty when the prose already says the page's own name**,
      // which is what keeps the link following a rename — see the note on
      // `NewPageLink.linkText`. Anything else (an alias, or lower-case prose)
      // pins the wording, because rewriting "the quiet year" to "The Quiet
      // Year" mid-sentence is an edit to her writing rather than a link.
      pieces.push({
        type: "mention",
        props: {
          nodeId: match.nodeId,
          label: match.pageName,
          text: match.text === match.pageName ? "" : match.text,
        },
      });
      cursor = match.end;
    }
    if (cursor < item.text.length) pieces.push({ type: "text", text: item.text.slice(cursor), styles });

    next.splice(itemIndex, 1, ...pieces);
  }

  return next;
}

/** The blocks the chosen matches touch, in document order. */
export function blocksToRelink(matches: LinkMatch[]): string[] {
  return [...new Set(matches.map((match) => match.blockId))];
}
