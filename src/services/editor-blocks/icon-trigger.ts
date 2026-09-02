// When a typed `:` is reaching for an icon and when it is punctuation.
//
// **Two controls, two keys — her call 2026-09-01, after three attempts to make
// one do both.** A bare `:` followed by what you are looking for is the
// type-ahead, the way it works in every chat app; `Ctrl+:` opens the full
// picker, for when you do not know the name. The rules below are the first
// one's.
//
// **It has to work in the middle of a sentence, which is what the `/` menu
// deliberately does not do.** A slash only means a command at the start of a
// line — her call 2026-08-28, after the command list kept opening over
// `and/or` — and an icon is by nature a thing you want inside a line you are
// already writing. So it gets its own trigger rather than a relaxation of that
// rule.
//
// **`:` cannot be ungated the way `@` is, though.** Nobody writes an `@` in
// prose by accident; everybody writes a colon. `Note:`, `10:30`, `Chapter 4:` —
// each of those would throw a picker over her writing, which is precisely the
// complaint that gated the slash menu in the first place.
//
// **The rule is what comes *before* the colon.** After a letter or a digit it
// is punctuation and nothing opens; at the start of a line or after a space it
// is somebody reaching for something. That covers every case above without a
// list of them.
//
// **A plain string predicate, so both callers can use the one rule.** The
// keystroke arrives as a DOM selection and the text before the caret is what
// either side can produce; making this take a ProseMirror transaction would
// have meant a second copy of the rule for the DOM.

import type { TriggerTransaction } from "./slash-trigger";

export const ICON_TRIGGER = ":";

/**
 * How much has to be typed after the colon before the menu appears.
 *
 * **A colon on its own shows nothing, and that is the point.** It is
 * punctuation far more often than it is a request — a menu on every one is the
 * complaint that gated the slash menu, arriving by a different door. Two
 * characters is what Discord asks for and what the hand already expects.
 */
export const ICON_MIN_QUERY = 2;

/** Whether a `:` typed after `before` should open the menu. */
export function iconTriggerOpens(before: string): boolean {
  return before === "" || /\s$/.test(before);
}

/**
 * The same rule, for BlockNote's `shouldOpen`.
 *
 * **Both readings of "before" are accepted, on purpose.** Whether the colon is
 * already in the document by the time the hook runs is an implementation detail
 * of a library we do not control, so a prefix ending in the trigger and one not
 * ending in it are the same situation — see `slashOpensCommandMenu`, which says
 * this at greater length for the same reason.
 */
export function iconMenuOpens(tr: TriggerTransaction): boolean {
  const { selection } = tr;
  // Replacing a selection is not somebody typing a trigger.
  if (!selection.empty) return false;
  const blockStart = selection.from - selection.$from.parentOffset;
  const before = tr.doc.textBetween(blockStart, selection.from);
  return iconTriggerOpens(before.endsWith(ICON_TRIGGER) ? before.slice(0, -1) : before);
}
