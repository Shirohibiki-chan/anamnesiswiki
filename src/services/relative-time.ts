// "4 hours ago", for the start screen. The only place in the app that says a
// time in words rather than showing a save indicator.
//
// Written out rather than reached for through `Intl.RelativeTimeFormat`, which
// would give "4 hours ago" and also "1 hours ago" unless it's fed a rounded
// number and a chosen unit — which is this function, minus the sentence at the
// end of it. Locale is not in play: the app ships in English.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * How long ago, in the roughest words that are still true.
 *
 * **Rough on purpose.** The number is only ever read to answer "is this the one
 * I was working on", and "3 weeks ago" answers that as well as a date does
 * while being readable at a glance. Anything older than a year stops counting —
 * "over a year ago" is the whole of what she needs from a project she has not
 * touched since.
 *
 * `now` is a parameter so this is testable without freezing the clock, and so a
 * screen drawing forty of these uses one timestamp for all of them rather than
 * forty that disagree.
 */
export function timeAgo(at: number | null, now: number = Date.now()): string | null {
  if (at === null || !Number.isFinite(at) || at <= 0) return null;

  const elapsed = now - at;
  // A file written a moment in the future is a clock that disagrees with the
  // one that wrote it — a synced folder, a dual boot. "Just now" is the least
  // wrong thing to say about it, and much less alarming than "in 3 hours".
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return plural(Math.floor(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return plural(Math.floor(elapsed / HOUR), "hour");
  if (elapsed < WEEK) return plural(Math.floor(elapsed / DAY), "day");
  if (elapsed < MONTH) return plural(Math.floor(elapsed / WEEK), "week");
  if (elapsed < YEAR) return plural(Math.floor(elapsed / MONTH), "month");
  return "over a year ago";
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}
