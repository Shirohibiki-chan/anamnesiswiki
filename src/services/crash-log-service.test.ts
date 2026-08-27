import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCrash,
  describeCrash,
  getCrashes,
  MAX_CRASHES,
  persistCrash,
  type CrashRecord,
} from "./crash-log-service";

// The store is the app's own settings file in production. Here it is a Map, so
// that "what ended up on disk" is something a test can read back.
const saved = vi.hoisted(() => new Map<string, unknown>());
const failing = vi.hoisted(() => ({ value: false }));
const openKeyValueStore = vi.hoisted(() =>
  vi.fn(async () => ({
    get: async (key: string) => saved.get(key),
    set: async (key: string, value: unknown) => {
      if (failing.value) throw new Error("disk is full");
      saved.set(key, value);
    },
    delete: async (key: string) => saved.delete(key),
    save: async () => {},
  })),
);
vi.mock("./host-service", () => ({
  openKeyValueStore,
  appVersion: async () => "1.2.3",
}));

beforeEach(() => {
  saved.clear();
  failing.value = false;
});

function crashAt(at: number, message: string): CrashRecord {
  return { ...buildCrash("render", new Error(message)), at };
}

describe("building a record out of whatever was thrown", () => {
  it("takes an Error apart", () => {
    const record = buildCrash("render", new TypeError("cannot read x of undefined"), "  at <Page>");
    expect(record.name).toBe("TypeError");
    expect(record.message).toBe("cannot read x of undefined");
    expect(record.stack).toContain("TypeError");
    expect(record.componentStack).toBe("  at <Page>");
    expect(record.kind).toBe("render");
  });

  // Not hypothetical: a rejected promise carries whatever was passed to
  // `reject`, and plenty of code rejects with a string.
  it("takes a string", () => {
    const record = buildCrash("rejection", "the save never came back");
    expect(record.message).toBe("the save never came back");
    expect(record.stack).toBeNull();
  });

  // The branch that exists so the crash logger cannot become the crash: a
  // value that cannot be serialised has to come out as words anyway.
  it("survives something that refuses to be described", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const record = buildCrash("error", circular);
    expect(record.message).toBeTruthy();
    expect(typeof record.message).toBe("string");
  });

  it("has no component stack unless one was handed to it", () => {
    expect(buildCrash("error", new Error("boom")).componentStack).toBeNull();
  });
});

describe("the text the copy button produces", () => {
  it("leads with the version and the time, then the error", () => {
    const record = { ...buildCrash("render", new Error("boom"), "  at <Tree>"), version: "9.9.9" };
    const text = describeCrash(record);
    expect(text).toContain("Anamnesis 9.9.9");
    expect(text).toContain("while drawing the window");
    expect(text).toContain("Error: boom");
    expect(text).toContain("Components on screen:");
    expect(text).toContain("at <Tree>");
  });

  it("leaves out the sections it has nothing for", () => {
    const text = describeCrash(buildCrash("rejection", "no stack here"));
    expect(text).toContain("no stack here");
    expect(text).not.toContain("Components on screen:");
  });
});

describe("what reaches the file", () => {
  it("keeps the newest first", async () => {
    await persistCrash(crashAt(1, "first"));
    await persistCrash(crashAt(2, "second"));
    const crashes = await getCrashes();
    expect(crashes.map((crash) => crash.message)).toEqual(["second", "first"]);
  });

  // The point of the cap: a crash on startup can repeat every launch, and the
  // file is meant to stay small enough that somebody will paste it.
  it("holds no more than the cap", async () => {
    for (let index = 0; index < MAX_CRASHES + 4; index += 1) {
      await persistCrash(crashAt(index, `crash ${index}`));
    }
    const crashes = await getCrashes();
    expect(crashes).toHaveLength(MAX_CRASHES);
    expect(crashes[0]?.message).toBe(`crash ${MAX_CRASHES + 3}`);
  });

  // A logger that throws while recording a crash turns a bad situation into an
  // incomprehensible one, so a failed write has to be a quiet one.
  it("says nothing when the write fails", async () => {
    failing.value = true;
    await expect(persistCrash(crashAt(1, "unwritable"))).resolves.toBeUndefined();
  });

  it("reads a file that holds nothing as no crashes", async () => {
    expect(await getCrashes()).toEqual([]);
  });

  // Hand-edited, half-written, or left by a much older version. None of those
  // should stop the rest of the log being readable.
  it("skips entries that are not crashes", async () => {
    saved.set("crashes", [{ at: 5, message: "real" }, null, "nonsense", { message: "no timestamp" }]);
    const crashes = await getCrashes();
    expect(crashes).toHaveLength(1);
    expect(crashes[0]?.message).toBe("real");
  });
});
