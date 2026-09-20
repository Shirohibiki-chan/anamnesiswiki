import { describe, expect, it } from "vitest";
import { BOARD_VIDEO_LINK } from "../constants/board";
import { isVideo, isVideoFileName, videoOf } from "./board-videos";

describe("isVideoFileName", () => {
  it("knows a video by its extension, whatever its case", () => {
    expect(isVideoFileName("clip.mp4")).toBe(true);
    expect(isVideoFileName("Clip.WEBM")).toBe(true);
    expect(isVideoFileName("clip.mov")).toBe(true);
    expect(isVideoFileName("clip.png")).toBe(false);
    expect(isVideoFileName("mp4")).toBe(false);
  });
});

describe("videoOf", () => {
  it("reads the file off a video embed, and nothing off anything else", () => {
    expect(videoOf({ type: "embeddable", link: BOARD_VIDEO_LINK, customData: { video: { file: "a.mp4" } } })).toEqual({ file: "a.mp4" });
    expect(videoOf({ type: "embeddable", link: BOARD_VIDEO_LINK, customData: {} })).toBeNull();
    expect(videoOf({ type: "embeddable", link: "anamnesis://note", customData: { video: { file: "a.mp4" } } })).toBeNull();
    expect(videoOf({ type: "rectangle", link: BOARD_VIDEO_LINK, customData: { video: { file: "a.mp4" } } })).toBeNull();
    expect(isVideo({ type: "embeddable", link: BOARD_VIDEO_LINK })).toBe(true);
  });
});
