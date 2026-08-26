import { describe, expect, it, vi } from "vitest";
import {
  apiUrlFor,
  buildPayload,
  newSessionId,
  parseAppKey,
  sendEvent,
  touchSession,
  type SystemInfo,
} from "./analytics-service";

const system: SystemInfo = {
  isDebug: false,
  locale: "en-GB",
  osName: "Windows",
  osVersion: "10.0",
  engineName: "Chromium",
  engineVersion: "152.0",
  appVersion: "0.5.0",
};

describe("parseAppKey", () => {
  it("accepts a well-formed key and reports its region", () => {
    expect(parseAppKey("A-US-1234567890")).toEqual({ valid: true, region: "US" });
    expect(parseAppKey("A-EU-1234567890")).toEqual({ valid: true, region: "EU" });
    expect(parseAppKey("A-SH-1234567890")).toEqual({ valid: true, region: "SH" });
  });

  it("rejects anything that is not three parts with a known region", () => {
    for (const key of ["", "A-US", "A-US-1-2", "A-XX-1234567890", "nonsense"]) {
      expect(parseAppKey(key).valid).toBe(false);
    }
  });
});

describe("apiUrlFor", () => {
  it("routes to the region named in the key", () => {
    expect(apiUrlFor("A-US-1234567890")).toBe("https://us.aptabase.com/api/v0/event");
    expect(apiUrlFor("A-EU-1234567890")).toBe("https://eu.aptabase.com/api/v0/event");
  });

  it("sends nowhere without a usable key", () => {
    expect(apiUrlFor("")).toBeNull();
    expect(apiUrlFor("A-XX-123")).toBeNull();
  });

  // The whole point of the self-hosted path: her data must never quietly fall
  // back to their cloud because an address was missing.
  it("refuses a self-hosted key with no address rather than defaulting", () => {
    expect(apiUrlFor("A-SH-1234567890")).toBeNull();
    expect(apiUrlFor("A-SH-1234567890", "https://stats.example.com")).toBe(
      "https://stats.example.com/api/v0/event",
    );
    expect(apiUrlFor("A-SH-1234567890", "https://stats.example.com/")).toBe(
      "https://stats.example.com/api/v0/event",
    );
  });
});

describe("newSessionId", () => {
  it("is epoch seconds followed by eight digits", () => {
    const id = newSessionId(1_700_000_000_000, 0.5);
    expect(id).toBe("1700000000" + "50000000");
    expect(id).toMatch(/^\d{10}\d{8}$/);
  });

  it("pads a small random part rather than shortening the id", () => {
    expect(newSessionId(1_700_000_000_000, 0)).toBe("170000000000000000");
  });
});

describe("touchSession", () => {
  const start = 1_700_000_000_000;

  it("starts a session when there is none", () => {
    const session = touchSession(null, start, 0.5);
    expect(session.id).toBe(newSessionId(start, 0.5));
    expect(session.lastTouched).toBe(start);
  });

  it("keeps the same session inside the timeout and moves the clock on", () => {
    const first = touchSession(null, start, 0.5);
    const second = touchSession(first, start + 60_000, 0.9);
    expect(second.id).toBe(first.id);
    expect(second.lastTouched).toBe(start + 60_000);
  });

  it("starts a new one past the timeout", () => {
    const first = touchSession(null, start, 0.5);
    const second = touchSession(first, start + 3_601_000, 0.9);
    expect(second.id).not.toBe(first.id);
  });

  it("treats the boundary itself as the same session", () => {
    const first = touchSession(null, start, 0.5);
    const second = touchSession(first, start + 3_600_000, 0.9);
    expect(second.id).toBe(first.id);
  });
});

describe("buildPayload", () => {
  it("puts the event, session and system info in the shape the endpoint takes", () => {
    const payload = buildPayload({
      eventName: "page-created",
      sessionId: "170000000012345678",
      now: 1_700_000_000_000,
      system,
      props: { template: "character" },
    });
    expect(payload.timestamp).toBe(new Date(1_700_000_000_000).toISOString());
    expect(payload.eventName).toBe("page-created");
    expect(payload.sessionId).toBe("170000000012345678");
    expect(payload.systemProps.osName).toBe("Windows");
    expect(payload.systemProps.sdkVersion).toBe("anamnesis-inhouse@1");
    expect(payload.props).toEqual({ template: "character" });
  });

  it("carries no props when there are none", () => {
    const payload = buildPayload({
      eventName: "app-launched",
      sessionId: "1",
      now: 0,
      system,
    });
    expect(payload.props).toBeUndefined();
  });
});

describe("sendEvent", () => {
  const payload = buildPayload({ eventName: "app-launched", sessionId: "1", now: 0, system });

  it("posts JSON with the key in the header", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendEvent("https://us.aptabase.com/api/v0/event", "A-US-1", payload)).resolves.toBe(
      true,
    );
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://us.aptabase.com/api/v0/event");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["App-Key"]).toBe("A-US-1");
    expect(JSON.parse(init.body as string).eventName).toBe("app-launched");

    vi.unstubAllGlobals();
  });

  // The app has to keep working with no internet, so a failure here is a
  // false and nothing else — never a rejection reaching a caller that was
  // doing something that matters.
  it("swallows a refused request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    await expect(sendEvent("https://us.aptabase.com/api/v0/event", "A-US-1", payload)).resolves.toBe(
      false,
    );
    vi.unstubAllGlobals();
  });

  it("reports a rejected event without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad key", { status: 401 })));
    await expect(sendEvent("https://us.aptabase.com/api/v0/event", "A-US-1", payload)).resolves.toBe(
      false,
    );
    vi.unstubAllGlobals();
  });
});
