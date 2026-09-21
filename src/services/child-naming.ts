// The naming rule a template can carry for the pages inside it, pure.
//
// A template saved with sub-pages can say that each of them is named after
// the page it lands in — `Damien` getting `Damien_Pics`, `Damien_Sheets`,
// `Damien_Overrides` — see `Node.namesChildren`. Asked for 2026-08-31 by a
// botmaker who had built the same thing as an Obsidian plugin, where every
// character folder holds the same three subfolders and typing the folder's
// name three more times per character was the whole reason to leave.
//
// **Take its rules, not its shape.** Obsidian keeps folders and notes as
// different kinds of thing, so the plugin needed a "folder preset" of its own;
// here every page holds pages, and a folder with three subfolders *is* a page
// with three child pages — so the rule lives on the template that already
// carries the pages, and nothing new is designed (CLAUDE.md → Data on disk).
//
// **What the prefix buys is narrower than it looks.** Links do not break either
// way (a mention stores an id) and same-named siblings already get a `(2)` on
// the filename. What a dozen pages called `Pics` ruins is every list that
// shows pages *by name* — the `@` menu, the wikilink picker, Ctrl-K — and that
// is the case for this file.
//
// No `{parent}` token: you type `Pics`, and prefixing is what the rule does.
// A token has to be typed correctly on every child when the thing every child
// wants is identical.
import type { ChildNaming, NameFromParent, Node } from "../constants/schema";

/** `Damien` + `_` + `Pics`. An empty separator runs them together. */
export function composeChildName(parentName: string, base: string, separator: string): string {
  return `${parentName}${separator}${base}`;
}

/**
 * The children of a template, named for the page they are landing in.
 *
 * The template's direct children take the landing page's name; deeper down,
 * a page whose own parent carries `namesChildren` (a template saved from a
 * page that was itself made this way — see `asTemplateSubtree`) takes that
 * parent's finished name, so a rule nested inside a rule composes the way it
 * was saved. Each renamed page remembers what it was made of, so a rename of
 * its parent can remake it (`renamesFor`). Without a rule the children come
 * through untouched.
 */
export function namedForParent<T extends Pick<Node, "id" | "name" | "parentId" | "namesChildren">>(
  clones: T[],
  parentId: string,
  parentName: string,
  naming: ChildNaming | undefined,
): (T & { nameFromParent?: NameFromParent })[] {
  const byId = new Map(clones.map((clone) => [clone.id, clone]));
  const finished = new Map<string, string>();

  const finalName = (clone: T): string => {
    const known = finished.get(clone.id);
    if (known !== undefined) return known;
    const parent = clone.parentId ? byId.get(clone.parentId) : undefined;
    let name = clone.name;
    if (clone.parentId === parentId && naming) name = composeChildName(parentName, clone.name, naming.separator);
    else if (parent?.namesChildren) name = composeChildName(finalName(parent), clone.name, parent.namesChildren.separator);
    finished.set(clone.id, name);
    return name;
  };

  return clones.map((clone) => {
    const name = finalName(clone);
    if (name === clone.name) return clone;
    const parent = clone.parentId ? byId.get(clone.parentId) : undefined;
    const separator = clone.parentId === parentId && naming ? naming.separator : parent!.namesChildren!.separator;
    return { ...clone, name, nameFromParent: { base: clone.name, separator } };
  });
}

/**
 * What a parent's rename does to the children named after it: each one that
 * still carries `nameFromParent` gets the new name composed the same way.
 * A child renamed by hand has no marker any more and is left alone.
 */
export function renamesFor(nodes: Record<string, Node>, parentId: string, newName: string): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  for (const node of Object.values(nodes)) {
    if (node.parentId !== parentId || !node.nameFromParent) continue;
    const name = composeChildName(newName, node.nameFromParent.base, node.nameFromParent.separator);
    if (name !== node.name) out.push({ id: node.id, name });
  }
  return out;
}

/**
 * Which of a template's children to make inside a page that already exists,
 * and which to skip because a page of that name is already there.
 *
 * Compared by the name the child *would* get, without regard to case: a
 * character who already has a `Damien_Pics` does not get a second one, and
 * neither does one whose page is called `damien_pics`. That is what makes
 * running it twice safe. Grandchildren of a skipped child are skipped with
 * it — they would have nowhere to land.
 */
export function planAddedChildren<T extends Pick<Node, "id" | "name" | "parentId">>(
  clones: T[],
  parentId: string,
  existingChildNames: string[],
): { make: T[]; skipped: T[] } {
  const taken = new Set(existingChildNames.map((name) => name.trim().toLowerCase()));
  const skippedIds = new Set<string>();
  const make: T[] = [];
  const skipped: T[] = [];
  for (const clone of clones) {
    if (clone.parentId === parentId) {
      if (taken.has(clone.name.trim().toLowerCase())) {
        skippedIds.add(clone.id);
        skipped.push(clone);
        continue;
      }
      make.push(clone);
      continue;
    }
    // Deeper down: in or out with its nearest ancestor among the clones.
    if (clone.parentId && skippedIds.has(clone.parentId)) {
      skippedIds.add(clone.id);
      continue;
    }
    make.push(clone);
  }
  return { make, skipped };
}

/**
 * A page and its sub-pages on their way to becoming a template: the rule is
 * read back off the children.
 *
 * Any page in the set whose children carry `nameFromParent` gets
 * `namesChildren` with that separator, and those children go in under their
 * base names — `Pics`, not `Damien_Pics` — so the next page made from the
 * template is named after itself rather than after Damien. Children without
 * the marker keep their names, and a page whose children have none makes a
 * template with no rule. The markers themselves are dropped: inside a
 * template they would describe a parent that is not there.
 */
export function asTemplateSubtree<T extends Node>(clones: T[]): T[] {
  const ids = new Set(clones.map((clone) => clone.id));
  const separatorFor = new Map<string, string>();
  for (const clone of clones) {
    if (clone.nameFromParent && clone.parentId && ids.has(clone.parentId) && !separatorFor.has(clone.parentId)) {
      separatorFor.set(clone.parentId, clone.nameFromParent.separator);
    }
  }
  return clones.map((clone) => {
    const { nameFromParent, namesChildren: _dropped, ...rest } = clone;
    void _dropped;
    const separator = separatorFor.get(clone.id);
    const named = nameFromParent && clone.parentId && ids.has(clone.parentId) ? nameFromParent.base : clone.name;
    const out = { ...rest, name: named } as T;
    return separator === undefined ? out : ({ ...out, namesChildren: { separator } } as T);
  });
}

/** How the count reads afterwards — "3 pages added inside Damien, 1 already there." */
export function describeAddedChildren(parentName: string, made: number, skipped: number): string {
  const pages = (n: number) => `${n} page${n === 1 ? "" : "s"}`;
  if (made === 0 && skipped === 0) return `The template has no pages inside it to add.`;
  if (made === 0) return `Nothing added inside "${parentName}" — ${skipped === 1 ? "its page was" : `all ${skipped} were`} already there.`;
  const added = `${pages(made)} added inside "${parentName}"`;
  return skipped === 0 ? `${added}.` : `${added}; ${skipped} already there and left alone.`;
}
