// Video on a board. Phase 32, step 12.
//
// What only the real app can answer: that a video file dropped on the board
// goes into the world's library and the board points at it by name; that
// it is drawn as a still with a play mark, plays on the mark with the
// player's controls up and the box taking the pointer, and is a still again
// when it ends; that a video already in the library lands from the Assets
// tab's drag; and that it draws again after a restart.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  boardVideoBox,
  boardVideoFiles,
  boardVideoIsPlaying,
  boardVideoPlayerState,
  clearTreeSearch,
  deselectOnBoard,
  dropAssetOntoBoard,
  dropVideoFileOntoBoard,
  makeBoard,
  openPage,
  playBoardVideo,
  waitForBoard,
  waitForWorld,
} from "./harness/screen";

/** Long enough for the settle delay and the queued write to reach the disk. */
const WRITTEN_MS = 2500;

type Shape = { type: string; link?: string | null; width: number; height: number; customData?: { video?: { file?: string } } };

async function findBoardFile(root: string): Promise<string | null> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const found = await findBoardFile(full);
      if (found) return found;
    } else if (entry.name === "_board.json") {
      return full;
    }
  }
  return null;
}

async function videosOnDisk(app: RunningApp): Promise<Shape[]> {
  await app.window.waitForTimeout(WRITTEN_MS);
  const file = await findBoardFile(app.world!.path);
  expect(file).not.toBeNull();
  const shapes = (JSON.parse(await fs.readFile(file!, "utf8")) as { elements: Shape[] }).elements;
  return shapes.filter((shape) => shape.link === "anamnesis://video");
}

async function libraryVideos(app: RunningApp): Promise<string[]> {
  return (await fs.readdir(path.join(app.world!.path, "assets"))).filter((name) => /\.webm$/i.test(name)).sort();
}

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

describe("video on a board", () => {
  let app: RunningApp;
  const BOARD = "Screening room";

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type(BOARD);
    await app.window.keyboard.press("Enter");
    await makeBoard(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("puts a dropped video file into the library and points at it from the board", async () => {
    expect(await libraryVideos(app)).toEqual([]);
    await dropVideoFileOntoBoard(app.window, "clip.webm", 2);
    const [inLibrary] = await libraryVideos(app);
    expect(inLibrary).toMatch(/\.webm$/);
    const [video] = await videosOnDisk(app);
    expect(video).toBeDefined();
    expect(video.type).toBe("embeddable");
    expect(video.customData?.video?.file).toBe(inLibrary);
    expect(video.width).toBe(480);
    expect(video.height).toBe(270);
    expect(await boardVideoFiles(app.window)).toEqual([inLibrary]);
    expect(app.errors).toEqual([]);
  });

  it("is a still with a play mark until played, then the player with its controls, then a still again", async () => {
    expect(await boardVideoIsPlaying(app.window, 0)).toBe(false);
    expect((await boardVideoPlayerState(app.window, 0)).controls).toBe(false);
    await playBoardVideo(app.window, 0);
    await app.window.waitForFunction(() => document.querySelector("[data-testid='board-video']")?.getAttribute("data-playing") === "true");
    const playing = await boardVideoPlayerState(app.window, 0);
    expect(playing.paused).toBe(false);
    expect(playing.controls).toBe(true);
    // A two-second clip: over soon, and the mark is back.
    await app.window.waitForFunction(() => document.querySelector("[data-testid='board-video']")?.getAttribute("data-playing") === "false", undefined, {
      timeout: 15_000,
    });
    expect((await boardVideoPlayerState(app.window, 0)).controls).toBe(false);
    expect(app.errors).toEqual([]);
  });

  it("moves when dragged, as a still — anywhere but the play mark", async () => {
    await deselectOnBoard(app.window);
    const before = await boardVideoBox(app.window, 0);
    // The mark in the middle is the one part of a still that takes the
    // pointer; a hand takes the box by the picture beside it.
    const grip = { x: before.x + before.width * 0.2, y: before.y + before.height / 2 };
    await app.window.mouse.move(grip.x, grip.y);
    await app.window.mouse.down();
    await app.window.mouse.move(grip.x - 80, grip.y - 120, { steps: 8 });
    await app.window.mouse.up();
    const after = await boardVideoBox(app.window, 0);
    expect(Math.round(after.x - before.x)).toBe(-80);
    expect(Math.round(after.y - before.y)).toBe(-120);
  });

  it("lands a video from the Assets tab's drag as the file it already is", async () => {
    const [inLibrary] = await libraryVideos(app);
    await dropAssetOntoBoard(app.window, inLibrary);
    await app.window.waitForFunction(() => document.querySelectorAll("[data-testid='board-video']").length === 2);
    expect(await boardVideoFiles(app.window)).toEqual([inLibrary, inLibrary]);
    // No second copy of the file was made.
    expect(await libraryVideos(app)).toEqual([inLibrary]);
    expect((await videosOnDisk(app)).length).toBe(2);
  });

  it("draws both again after a restart, read back out of the library", async () => {
    const [inLibrary] = await libraryVideos(app);
    await reload(app);
    await openPage(app.window, BOARD);
    await waitForBoard(app.window);
    await app.window.waitForFunction(() => document.querySelectorAll("[data-testid='board-video'] video").length === 2);
    expect(await boardVideoFiles(app.window)).toEqual([inLibrary, inLibrary]);
    await app.window.waitForFunction(() => {
      const video = document.querySelector<HTMLVideoElement>("[data-testid='board-video'] video");
      return !!video && video.readyState >= 1;
    });
    expect(app.errors).toEqual([]);
  });
});
