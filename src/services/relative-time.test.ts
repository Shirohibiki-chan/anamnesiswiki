import { describe, expect, it } from "vitest";
import { timeAgo } from "./relative-time";

const NOW = Date.UTC(2026, 7, 18, 12, 0, 0);
const ago = (ms: number) => timeAgo(NOW - ms, NOW);

describe("timeAgo", () => {
  it("says the rough thing at each size", () => {
    expect(ago(30_000)).toBe("just now");
    expect(ago(4 * 60_000)).toBe("4 minutes ago");
    expect(ago(4 * 3_600_000)).toBe("4 hours ago");
    expect(ago(3 * 86_400_000)).toBe("3 days ago");
    expect(ago(3 * 7 * 86_400_000)).toBe("3 weeks ago");
    expect(ago(5 * 30 * 86_400_000)).toBe("5 months ago");
  });

  it("does not say '1 hours ago'", () => {
    expect(ago(3_600_000)).toBe("1 hour ago");
    expect(ago(86_400_000)).toBe("1 day ago");
    expect(ago(7 * 86_400_000)).toBe("1 week ago");
  });

  it("stops counting past a year", () => {
    // A project she hasn't touched since doesn't need arithmetic, it needs
    // "old".
    expect(ago(400 * 86_400_000)).toBe("over a year ago");
    expect(ago(4000 * 86_400_000)).toBe("over a year ago");
  });

  it("copes with a timestamp in the future", () => {
    // A synced folder or a dual boot: the file was written by a clock that
    // disagrees with this one. "In 3 hours" would be alarming and useless.
    expect(timeAgo(NOW + 3 * 3_600_000, NOW)).toBe("just now");
  });

  it("says nothing at all when there is no time to report", () => {
    // A project found by the scan that has never been opened has no
    // last-opened time, and the caller renders the line only if there is one.
    expect(timeAgo(null, NOW)).toBeNull();
    expect(timeAgo(0, NOW)).toBeNull();
    expect(timeAgo(Number.NaN, NOW)).toBeNull();
  });
});
