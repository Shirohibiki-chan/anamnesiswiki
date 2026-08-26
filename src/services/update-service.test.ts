import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkForUpdate, installUpdate, type PendingUpdate } from "./update-service";
import { check } from "@tauri-apps/plugin-updater";

vi.mock("@tauri-apps/plugin-updater", () => ({ check: vi.fn() }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));

const mockedCheck = vi.mocked(check);

// The plugin's real Update object carries a download handle we never touch
// directly; only the three fields the service reads matter here.
function fakeUpdate(version: string, body?: string) {
  return { version, body, downloadAndInstall: vi.fn() } as unknown as Awaited<ReturnType<typeof check>>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkForUpdate", () => {
  it("reports up-to-date when the endpoint has nothing newer", async () => {
    mockedCheck.mockResolvedValue(null);
    await expect(checkForUpdate()).resolves.toEqual({ status: "up-to-date" });
  });

  it("surfaces the new version and its release notes", async () => {
    mockedCheck.mockResolvedValue(fakeUpdate("0.2.0", "Adds LK export."));
    const result = await checkForUpdate();
    expect(result.status).toBe("available");
    if (result.status !== "available") return;
    expect(result.update.version).toBe("0.2.0");
    expect(result.update.notes).toEqual([
      { kind: "paragraph", spans: [{ kind: "text", text: "Adds LK export." }] },
    ]);
  });

  // The body arrives as markdown and reaches the panel as blocks to render.
  // See release-notes.ts.
  it("hands the panel the whole body as blocks, not a string", async () => {
    mockedCheck.mockResolvedValue(fakeUpdate("0.3.0", "## v0.3.0\n\nThemes are here.\n\n### Details\n\n- One\n- Two"));
    const result = await checkForUpdate();
    expect(result.status === "available" && result.update.notes.map((block) => block.kind)).toEqual([
      "paragraph",
      "heading",
      "list",
    ]);
  });

  it("treats missing release notes as nothing to render", async () => {
    mockedCheck.mockResolvedValue(fakeUpdate("0.2.0"));
    const result = await checkForUpdate();
    expect(result.status === "available" && result.update.notes).toEqual([]);
  });

  // A failed check is never allowed to reach the UI as a raw error — the app
  // keeps working, and the message has to say so.
  it("explains an offline failure without jargon", async () => {
    mockedCheck.mockRejectedValue(new Error("error sending request: dns error"));
    const result = await checkForUpdate();
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.message).toContain("offline");
    expect(result.message).toContain("works fine without this");
  });

  it("explains a missing release manifest as nothing to update to", async () => {
    mockedCheck.mockRejectedValue(new Error("Could not fetch a valid release JSON: 404 Not Found"));
    const result = await checkForUpdate();
    expect(result.status === "error" && result.message).toContain("no published release");
  });

  it("still reports an unrecognised failure rather than swallowing it", async () => {
    mockedCheck.mockRejectedValue(new Error("signature mismatch"));
    const result = await checkForUpdate();
    expect(result.status === "error" && result.message).toContain("signature mismatch");
  });

  it("never throws — the caller has no recovery path", async () => {
    mockedCheck.mockRejectedValue("a bare string, not an Error");
    await expect(checkForUpdate()).resolves.toMatchObject({ status: "error" });
  });
});

// The counting that turns a download into a progress bar moved to
// host-service in Phase 29 step 1, and its tests went with it — see
// host-service.test.ts. What is left to check here is that this service passes
// the host's progress straight out to the panel and adds nothing of its own.
describe("installUpdate", () => {
  function pending(play: (report: (progress: { received: number; total: number | null }) => void) => void): PendingUpdate {
    return {
      version: "0.2.0",
      notes: [],
      handle: {
        version: "0.2.0",
        install: async (onProgress: (progress: { received: number; total: number | null }) => void) => play(onProgress),
      },
    } as unknown as PendingUpdate;
  }

  it("passes the host's progress through untouched", async () => {
    const seen: { received: number; total: number | null }[] = [];
    await installUpdate(
      pending((report) => {
        report({ received: 0, total: 300 });
        report({ received: 150, total: 300 });
        report({ received: 300, total: 300 });
      }),
      (progress) => seen.push({ ...progress }),
    );

    expect(seen).toEqual([
      { received: 0, total: 300 },
      { received: 150, total: 300 },
      { received: 300, total: 300 },
    ]);
  });

  it("works without a progress callback", async () => {
    await expect(
      installUpdate(
        pending((report) => {
          report({ received: 10, total: 10 });
        }),
      ),
    ).resolves.toBeUndefined();
  });
});
