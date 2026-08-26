// The door's own tests. Most of what host-service does is a one-line forward
// and there is nothing there to test that wouldn't be testing the shell — but
// the updater is different: it is the one capability whose shape had to be
// translated rather than passed along, and the counting that produces a
// progress bar lives here now. It moved out of update-service.test.ts in
// Phase 29 step 1, along with the code it covers.
import { describe, expect, it, vi } from "vitest";
import { check } from "@tauri-apps/plugin-updater";
import { checkForShellUpdate } from "./host-service";

vi.mock("@tauri-apps/plugin-updater", () => ({ check: vi.fn() }));

const mockedCheck = vi.mocked(check);

/**
 * A stand-in for the host's own update handle. `emit` lets a test play the
 * events the real one would send during a download.
 */
function hostUpdate(play: (emit: (event: unknown) => void) => void) {
  return {
    version: "0.2.0",
    body: undefined,
    downloadAndInstall: async (onEvent: (event: unknown) => void) => play(onEvent),
  } as unknown as Awaited<ReturnType<typeof check>>;
}

describe("checkForShellUpdate", () => {
  it("reports nothing when the host has nothing newer", async () => {
    mockedCheck.mockResolvedValue(null);
    await expect(checkForShellUpdate()).resolves.toBeNull();
  });

  it("accumulates chunk lengths into a running byte total", async () => {
    mockedCheck.mockResolvedValue(
      hostUpdate((emit) => {
        emit({ event: "Started", data: { contentLength: 300 } });
        emit({ event: "Progress", data: { chunkLength: 100 } });
        emit({ event: "Progress", data: { chunkLength: 50 } });
        emit({ event: "Finished" });
      }),
    );

    const update = await checkForShellUpdate();
    const seen: { received: number; total: number | null }[] = [];
    await update?.install((progress) => seen.push({ ...progress }));

    expect(seen).toEqual([
      { received: 0, total: 300 },
      { received: 100, total: 300 },
      { received: 150, total: 300 },
      { received: 300, total: 300 },
    ]);
  });

  // The progress bar divides by this, so an undeclared length has to arrive as
  // null rather than 0 or undefined.
  it("reports a null total when the server declares no content length", async () => {
    mockedCheck.mockResolvedValue(
      hostUpdate((emit) => {
        emit({ event: "Started", data: {} });
        emit({ event: "Progress", data: { chunkLength: 42 } });
      }),
    );

    const update = await checkForShellUpdate();
    const seen: (number | null)[] = [];
    await update?.install((progress) => seen.push(progress.total));

    expect(seen).toEqual([null, null]);
  });

  // The host's event shapes stop at this file. Anything above it sees a
  // version, whatever notes came with it, and bytes.
  it("hands back the version and body without the handle behind them", async () => {
    mockedCheck.mockResolvedValue({
      version: "1.4.0",
      body: "### Fixes",
      downloadAndInstall: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof check>>);

    const update = await checkForShellUpdate();

    expect(update?.version).toBe("1.4.0");
    expect(update?.body).toBe("### Fixes");
    expect(update).not.toHaveProperty("downloadAndInstall");
  });
});
