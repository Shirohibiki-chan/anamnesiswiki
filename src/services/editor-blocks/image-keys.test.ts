import { describe, expect, it } from "vitest";
import { stepPreviewWidth } from "./image-keys";
import { IMAGE_MIN_PREVIEW_WIDTH } from "../../constants/limits";

describe("stepPreviewWidth", () => {
  const MAX = 900;

  it("grows a picture by one step", () => {
    expect(stepPreviewWidth(400, 1, MAX)).toBe(440);
  });

  it("shrinks by the same factor, so a press each way lands back where it started", () => {
    const grown = stepPreviewWidth(400, 1, MAX);
    expect(stepPreviewWidth(grown, -1, MAX)).toBe(400);
  });

  it("returns whole pixels", () => {
    for (const width of [65, 133, 407, 899]) {
      expect(Number.isInteger(stepPreviewWidth(width, 1, MAX))).toBe(true);
      expect(Number.isInteger(stepPreviewWidth(width, -1, MAX))).toBe(true);
    }
  });

  it("stops at the editor's width rather than running past the page", () => {
    expect(stepPreviewWidth(880, 1, MAX)).toBe(MAX);
    expect(stepPreviewWidth(MAX, 1, MAX)).toBe(MAX);
  });

  it("stops at the floor rather than shrinking a picture to nothing", () => {
    expect(stepPreviewWidth(66, -1, MAX)).toBe(IMAGE_MIN_PREVIEW_WIDTH);
    expect(stepPreviewWidth(IMAGE_MIN_PREVIEW_WIDTH, -1, MAX)).toBe(IMAGE_MIN_PREVIEW_WIDTH);
  });

  it("keeps the floor when the editor is narrower than it", () => {
    // A pane dragged very narrow. The two bounds cross, and the floor is the
    // one that wins — a width below it isn't a size, it's a disappearance.
    expect(stepPreviewWidth(200, -1, 20)).toBe(IMAGE_MIN_PREVIEW_WIDTH);
    expect(stepPreviewWidth(200, 1, 20)).toBe(IMAGE_MIN_PREVIEW_WIDTH);
  });

  it("always moves, even at sizes where a tenth rounds to nothing much", () => {
    const small = IMAGE_MIN_PREVIEW_WIDTH + 1;
    expect(stepPreviewWidth(small, 1, MAX)).toBeGreaterThan(small);
  });
});
