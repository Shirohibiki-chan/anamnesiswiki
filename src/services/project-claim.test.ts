import { describe, expect, it } from "vitest";
import { PROJECT_CLAIM_STALE_MS } from "../constants/limits";
import {
  describeClaimAge,
  isClaimStale,
  isHeldElsewhere,
  newProjectClaim,
  parseProjectClaim,
  SESSION_ID,
  type ProjectClaim,
} from "./project-claim";

const NOW = 1_700_000_000_000;
const theirs = (refreshedAt: number): ProjectClaim => ({ sessionId: "another-app", refreshedAt });

describe("parseProjectClaim", () => {
  it("reads a marker this version wrote", () => {
    expect(parseProjectClaim({ sessionId: "abc", refreshedAt: 5 })).toEqual({ sessionId: "abc", refreshedAt: 5 });
  });

  it("refuses anything it can't act on", () => {
    // Written by a version that isn't this one, or damaged. Refusing to open a
    // project on the strength of a file we can't understand would be the app
    // locking her out over its own bookkeeping.
    expect(parseProjectClaim({ sessionId: "abc" })).toBeNull();
    expect(parseProjectClaim({ refreshedAt: "soon" })).toBeNull();
    expect(parseProjectClaim("open")).toBeNull();
    expect(parseProjectClaim(null)).toBeNull();
  });
});

describe("isClaimStale", () => {
  it("believes a marker that was refreshed recently", () => {
    expect(isClaimStale(theirs(NOW - 1_000), NOW)).toBe(false);
  });

  it("stops believing one nothing has refreshed", () => {
    // What a crash leaves behind. Without this the project stays locked until
    // someone deletes a file by hand.
    expect(isClaimStale(theirs(NOW - PROJECT_CLAIM_STALE_MS - 1), NOW)).toBe(true);
  });

  it("does not call a marker from the future stale", () => {
    // A clock that disagrees, or a file synced from a machine running ahead.
    // Reading that as abandoned would unlock a project that is genuinely open.
    expect(isClaimStale(theirs(NOW + 60_000), NOW)).toBe(false);
  });
});

describe("isHeldElsewhere", () => {
  it("blocks on a live marker from another copy of the app", () => {
    expect(isHeldElsewhere(theirs(NOW), NOW)).toBe(true);
  });

  it("never blocks on our own", () => {
    // Closing a project and opening it again inside one run of the app is
    // ordinary, and a marker we wrote is not evidence of anybody else.
    expect(isHeldElsewhere(newProjectClaim(NOW), NOW)).toBe(false);
    expect(isHeldElsewhere({ sessionId: SESSION_ID, refreshedAt: NOW }, NOW)).toBe(false);
  });

  it("does not block on a stale marker, or on none at all", () => {
    expect(isHeldElsewhere(theirs(NOW - PROJECT_CLAIM_STALE_MS - 1), NOW)).toBe(false);
    expect(isHeldElsewhere(null, NOW)).toBe(false);
  });
});

describe("describeClaimAge", () => {
  it("says switch windows, or says the wait is nearly over", () => {
    expect(describeClaimAge(theirs(NOW - 2_000), NOW)).toBe("a few seconds ago");
    expect(describeClaimAge(theirs(NOW - 60_000), NOW)).toBe("about a minute ago");
    expect(describeClaimAge(theirs(NOW - 115_000), NOW)).toBe("about 2 minutes ago");
  });

  it("never says a negative age for a marker written a moment ahead of us", () => {
    expect(describeClaimAge(theirs(NOW + 5_000), NOW)).toBe("a few seconds ago");
  });
});
