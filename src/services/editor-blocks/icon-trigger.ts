// When a typed `:` is reaching for an icon and when it is punctuation.
//
// **The icon menu needs to work in the middle of a sentence, which is what the
// `/` menu deliberately does not do.** A slash only means a command at the
// start of a line — her call 2026-08-28, after the command list kept opening
// over `and/or` — and an icon is by nature a thing you want inside a line you
// are already writing. So it gets its own trigger rather than a relaxation of
// that rule, the same way `@` and `[[` have theirs.
//
// **`:` cannot be ungated the way `@` is, though.** Nobody writes an `@` in
// prose by accident; everybody writes a colon. `Note:`, `10:30`, `Chapter 4:` —
// each of those would pop a menu of icons over her writing, which is precisely
// the complaint that gated the slash menu in the first place.
//
// **The rule is what comes *before* the colon.** After a letter or a digit it
// is punctuation and this stays shut; at the start of a line or after a space
// it is somebody reaching for something, which is when it opens. That covers
// every case above without a list of them, and it leaves the useful gesture —
// a space, then `:swo` — working exactly where it is wanted.
import type { TriggerTransaction } from "./slash-trigger";

export const ICON_TRIGGER = ":";

/** Whether a `:` just typed should open the icon menu. */
export function iconMenuOpens(tr: TriggerTransaction): boolean {
  const { selection } = tr;
  // Replacing a selection is not somebody typing a trigger — same reasoning as
  // the slash menu's.
  if (!selection.empty) return false;

  const blockStart = selection.from - selection.$from.parentOffset;
  const before = tr.doc.textBetween(blockStart, selection.from);
  // Both readings of "before", for the reason spelled out on
  // `slashOpensCommandMenu`: whether the trigger has landed in the document by
  // the time this runs belongs to a library we do not control.
  const upToTrigger = before.endsWith(ICON_TRIGGER) ? before.slice(0, -1) : before;
  if (upToTrigger === "") return true;
  return /\s$/.test(upToTrigger);
}
