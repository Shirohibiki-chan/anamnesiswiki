// When a typed `:` is reaching for an icon and when it is punctuation.
//
// **The icon picker needs to open in the middle of a sentence, which is what
// the `/` menu deliberately does not do.** A slash only means a command at the
// start of a line — her call 2026-08-28, after the command list kept opening
// over `and/or` — and an icon is by nature a thing you want inside a line you
// are already writing. So it gets its own trigger rather than a relaxation of
// that rule.
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

export const ICON_TRIGGER = ":";

/** Whether a `:` typed after `before` should open the picker. */
export function iconTriggerOpens(before: string): boolean {
  return before === "" || /\s$/.test(before);
}
