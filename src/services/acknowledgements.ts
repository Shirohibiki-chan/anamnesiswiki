// Warnings somebody has said they already know about.
//
// **Only the ones that come back.** A warning that appears once and is dealt
// with does not need this; the two that repeat are the load warning, which
// lists files it could not read every time a world opens, and the stylesheet
// notice, which is a fact about a file and so is there every time its panel
// is. Dismissing either is "not now", and there was no way to say "yes, I know
// about that one, stop asking".
//
// **The save-failure warning is deliberately not one of them.** It means the
// writing might not be on disk, and a permanent mute on that is a button for
// losing work.
//
// A mark rather than a flag: a file that changes is a different problem from
// the one that was acknowledged, and it has to be able to speak up again.
// What the mark is made of is the caller's business — see `fileMarks`, which
// uses the size and the modified time.

/** What has been acknowledged, and the state it was acknowledged in. */
export type Acknowledgements = Record<string, string>;

/**
 * The subset still worth showing.
 *
 * A path with no acknowledgement is shown. A path whose mark has changed since
 * it was acknowledged is shown again, because the file is not the file that
 * was waved through. **A path whose mark could not be read is shown**, which
 * is the safe direction: an unreadable mark means the disk did not answer, and
 * staying quiet on that basis would hide the case where something is properly
 * wrong.
 */
export function unacknowledged(
  paths: readonly string[],
  marks: Record<string, string>,
  acknowledged: Acknowledgements,
): string[] {
  return paths.filter((path) => {
    const mark = marks[path];
    if (!mark) return true;
    return acknowledged[path] !== mark;
  });
}

/**
 * The record after somebody says they know about these.
 *
 * A path with no readable mark is not recorded at all rather than recorded as
 * empty: acknowledging a file the disk would not describe would silence it
 * permanently on a mark that can never match, which is the one outcome this
 * whole idea is supposed to avoid.
 */
export function acknowledge(
  acknowledged: Acknowledgements,
  paths: readonly string[],
  marks: Record<string, string>,
): Acknowledgements {
  const next = { ...acknowledged };
  for (const path of paths) {
    const mark = marks[path];
    if (mark) next[path] = mark;
  }
  return next;
}

/** Whatever came back out of the settings file, reduced to what we'd accept. */
export function parseAcknowledgements(raw: unknown): Acknowledgements {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const parsed: Acknowledgements = {};
  for (const [path, mark] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof mark === "string" && mark !== "") parsed[path] = mark;
  }
  return parsed;
}
