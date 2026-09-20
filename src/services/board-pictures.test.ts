import { describe, expect, it } from "vitest";
import {
  boardAssetUses,
  decodeDataUrl,
  encodeDataUrl,
  extensionForMime,
  fittedSize,
  mimeForFileName,
  pictureAsset,
  pictureDataUrl,
  pictureFile,
} from "./board-pictures";

describe("a board picture's two forms", () => {
  it("tells a stored asset reference from the spike's data URL", () => {
    expect(pictureAsset({ id: "f", mimeType: "image/png", asset: "abc.png" })).toBe("abc.png");
    expect(pictureAsset({ id: "f", mimeType: "image/png", dataURL: "data:image/png;base64,AA" })).toBeNull();
    expect(pictureAsset(null)).toBeNull();
    expect(pictureDataUrl({ dataURL: "data:image/png;base64,AA" })).toBe("data:image/png;base64,AA");
    expect(pictureDataUrl({ dataURL: "https://elsewhere/x.png" })).toBeNull();
    expect(pictureDataUrl({ asset: "abc.png" })).toBeNull();
  });

  it("goes from bytes to a data URL and back without loss", () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 255]);
    const dataURL = encodeDataUrl(bytes, "image/png");
    expect(dataURL.startsWith("data:image/png;base64,")).toBe(true);
    expect(decodeDataUrl(dataURL)).toEqual({ bytes, mimeType: "image/png" });
    expect(pictureFile("id", "image/png", bytes)).toMatchObject({ id: "id", mimeType: "image/png", dataURL });
  });

  it("refuses what is not a base64 data URL", () => {
    expect(decodeDataUrl("https://elsewhere/x.png")).toBeNull();
    expect(decodeDataUrl("data:image/png,plain")).toBeNull();
  });

  it("names the format both ways", () => {
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("image/svg+xml")).toBe("svg");
    expect(extensionForMime("application/octet-stream")).toBe("png");
    expect(mimeForFileName("a1b2.jpeg")).toBe("image/jpeg");
    expect(mimeForFileName("a1b2.JPG")).toBe("image/jpeg");
    expect(mimeForFileName("a1b2.webp")).toBe("image/webp");
    expect(mimeForFileName("a1b2")).toBe("image/png");
  });

  it("scales a big picture to fit and leaves a small one alone", () => {
    expect(fittedSize(200, 100, 480)).toEqual({ width: 200, height: 100 });
    expect(fittedSize(4000, 3000, 480)).toEqual({ width: 480, height: 360 });
    expect(fittedSize(300, 960, 480)).toEqual({ width: 150, height: 480 });
    expect(fittedSize(0, 0, 480)).toEqual({ width: 0, height: 0 });
  });

  it("lists the assets a board's pictures live in, each once — the pictures on it and the ones on its bookmark cards", () => {
    const bookmark = (id: string, image: string | null, isDeleted = false) => ({
      id,
      type: "embeddable",
      isDeleted,
      link: "https://example.com",
      customData: { bookmark: { url: "https://example.com", image } },
    });
    const board = {
      version: 1 as const,
      elements: [bookmark("b1", "three.png"), bookmark("b2", "one.png"), bookmark("b3", null), bookmark("b4", "gone.png", true)],
      appState: {},
      files: {
        a: { id: "a", mimeType: "image/png", asset: "one.png" },
        b: { id: "b", mimeType: "image/png", asset: "one.png" },
        c: { id: "c", mimeType: "image/png", asset: "two.png" },
        d: { id: "d", mimeType: "image/png", dataURL: "data:image/png;base64,AA" },
      },
      dots: true,
    };
    expect(boardAssetUses(board).sort()).toEqual(["one.png", "three.png", "two.png"]);
  });
});
