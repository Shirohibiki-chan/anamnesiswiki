import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assetFileName, assetRef, extensionFor, isAssetRef, releaseAssetUrls, resolveAssetUrl } from "./asset-urls";

const readAssetImage = vi.hoisted(() => vi.fn());
vi.mock("./filesystem-service", () => ({ readAssetImage }));

// Object URLs are a browser thing and the test environment is node (see
// vitest.config.ts), so they're stubbed with something countable — which is
// also what makes "was this file read twice?" observable.
let minted = 0;
beforeEach(() => {
  minted = 0;
  readAssetImage.mockReset();
  readAssetImage.mockResolvedValue(new Uint8Array([1, 2, 3]));
  vi.stubGlobal("URL", {
    createObjectURL: () => `blob:stub-${++minted}`,
    revokeObjectURL: () => {},
  });
});

afterEach(() => {
  releaseAssetUrls();
  vi.unstubAllGlobals();
});

describe("asset references", () => {
  it("round-trips a filename", () => {
    const ref = assetRef("abc-123.png");
    expect(isAssetRef(ref)).toBe(true);
    expect(assetFileName(ref)).toBe("abc-123.png");
  });

  it("doesn't claim a web address", () => {
    expect(isAssetRef("https://example.com/cat.png")).toBe(false);
    expect(assetFileName("https://example.com/cat.png")).toBeNull();
  });
});

describe("extensionFor", () => {
  it("prefers the file's own name", () => {
    expect(extensionFor({ name: "Valera.JPEG", type: "image/png" } as File)).toBe("jpeg");
  });

  it("falls back to the mime type when there's no extension", () => {
    expect(extensionFor({ name: "clipboard", type: "image/webp" } as File)).toBe("webp");
  });

  it("falls back again when there's neither", () => {
    expect(extensionFor({ name: "clipboard", type: "" } as File)).toBe("png");
  });
});

describe("resolveAssetUrl", () => {
  it("reads the file and hands back something displayable", async () => {
    const url = await resolveAssetUrl("C:/Worlds/Valeraverse", assetRef("cat.png"));
    expect(url).toBe("blob:stub-1");
    expect(readAssetImage).toHaveBeenCalledWith("C:/Worlds/Valeraverse", "cat.png");
  });

  // The whole reason the reference carries a scheme. Anything else in that
  // field is not ours, and going to disk for it would be wrong twice over:
  // there's no such file, and a web address must not be quietly turned into
  // something the app fetches. See CLAUDE.md §Policy Boundary.
  it("passes anything that isn't one of ours straight through, untouched", async () => {
    const url = await resolveAssetUrl("C:/Worlds/Valeraverse", "https://example.com/cat.png");
    expect(url).toBe("https://example.com/cat.png");
    expect(readAssetImage).not.toHaveBeenCalled();
  });

  it("does nothing with no project open", async () => {
    expect(await resolveAssetUrl(null, assetRef("cat.png"))).toBe(assetRef("cat.png"));
    expect(readAssetImage).not.toHaveBeenCalled();
  });

  // BlockNote asks on every render of the block, so a read per call would be a
  // fresh object URL per keystroke — none of which anything ever revokes.
  it("reads a picture once however many times it's asked for", async () => {
    const first = await resolveAssetUrl("C:/W", assetRef("cat.png"));
    const second = await resolveAssetUrl("C:/W", assetRef("cat.png"));
    expect(first).toBe(second);
    expect(readAssetImage).toHaveBeenCalledTimes(1);
    expect(minted).toBe(1);
  });

  it("only reads once when two blocks ask at the same moment", async () => {
    const [first, second] = await Promise.all([
      resolveAssetUrl("C:/W", assetRef("cat.png")),
      resolveAssetUrl("C:/W", assetRef("cat.png")),
    ]);
    expect(first).toBe(second);
    expect(readAssetImage).toHaveBeenCalledTimes(1);
  });

  it("keeps two projects' pictures apart even when the filenames match", async () => {
    const one = await resolveAssetUrl("C:/Valeraverse", assetRef("cat.png"));
    const two = await resolveAssetUrl("C:/Orynthia", assetRef("cat.png"));
    expect(one).not.toBe(two);
    expect(readAssetImage).toHaveBeenCalledTimes(2);
  });

  // A missing file must render as a broken picture, not take out BlockNote's
  // render of the whole page.
  it("doesn't throw when the file won't read", async () => {
    readAssetImage.mockRejectedValue(new Error("os error 2"));
    await expect(resolveAssetUrl("C:/W", assetRef("gone.png"))).resolves.toBe(assetRef("gone.png"));
  });

  it("re-reads after the project's pictures are released", async () => {
    await resolveAssetUrl("C:/W", assetRef("cat.png"));
    releaseAssetUrls();
    await resolveAssetUrl("C:/W", assetRef("cat.png"));
    expect(readAssetImage).toHaveBeenCalledTimes(2);
  });
});
