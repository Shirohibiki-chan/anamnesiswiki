// A player block in the sidebar — a character's theme. Phase 31, step 2,
// 2026-09-21.
//
// What only the real app can answer: that Add Block offers the player and
// the block opens on its box for the link; that a link given there draws
// the same player the page does, at sidebar width, with the block named by
// what the link is; that the block's own menu carries the three rows about
// the link on top of every block's usual ones; and that the record — link,
// service, kind — is on the page file's block and comes back after a reload.
//
// As in the page scenario, nothing here needs the internet: what the
// service says is fetched in the background and the card draws either way.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBlockToPanel,
  blockMenuItems,
  giveMediaLink,
  mediaLinkBoxShown,
  mediaPlayerSource,
  mediaPlayersShown,
  openBlockMenu,
  openPage,
  panelBlockTitles,
  waitForWorld,
} from "./harness/screen";

/** A page the generated world really has. */
const PAGE = "Greyharbour";
const TRACK = "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc";

/** Long enough for the autosave to have written. */
const WRITTEN_MS = 2500;

type StoredBlock = { id: string; kind: string; media?: Record<string, unknown> };

async function findPageFile(root: string, name: string): Promise<string | null> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === name) return path.join(full, "_page.json");
      const found = await findPageFile(full, name);
      if (found) return found;
    } else if (entry.name === `${name}.json`) {
      return full;
    }
  }
  return null;
}

async function blocksOnDisk(app: RunningApp): Promise<StoredBlock[]> {
  await app.window.waitForTimeout(WRITTEN_MS);
  const file = await findPageFile(app.world!.path, PAGE);
  if (!file) throw new Error(`no file on disk for ${PAGE}`);
  return (JSON.parse(await fs.readFile(file, "utf8")) as { blocks?: StoredBlock[] }).blocks ?? [];
}

describe("a player in the sidebar", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("is offered by Add Block and opens on its box for the link", async () => {
    await addBlockToPanel(app.window, "Music or Video");
    expect(await panelBlockTitles(app.window)).toContain("Music or Video");
    expect(await mediaLinkBoxShown(app.window)).toBe(true);
  });

  it("draws the player from the link and names the block by what it is", async () => {
    await giveMediaLink(app.window, TRACK);
    await app.window.locator(".block-media .media-player-spotify").first().waitFor({ state: "visible" });
    expect(await mediaLinkBoxShown(app.window)).toBe(false);
    expect(await panelBlockTitles(app.window)).toContain("Spotify track");
    const players = await mediaPlayersShown(app.window, ".block-media");
    expect(players.map((player) => player.service)).toEqual(["spotify"]);
    expect(await mediaPlayerSource(app.window, 0, ".block-media")).toBe("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?theme=0");

    const stored = (await blocksOnDisk(app)).find((block) => block.kind === "media");
    expect(stored?.media).toMatchObject({
      url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
      service: "spotify",
      kind: "track",
      mediaId: "4uLU6hMCjMI75M1A2tKUQC",
    });
  });

  it("carries the link's three rows in the block's menu", async () => {
    await openBlockMenu(app.window, "Spotify track");
    const items = await blockMenuItems(app.window);
    expect(items).toEqual(expect.arrayContaining(["Open on Spotify", "Copy Link", "Fetch Again", "Remove Block"]));
    await app.window.keyboard.press("Escape");
  });

  it("comes back after a reload, from the file", async () => {
    await app.window.evaluate(() => {
      (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
    });
    await app.window.keyboard.press("Control+r");
    await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.locator(".block-media .media-player-spotify").first().waitFor({ state: "visible" });
    expect(await panelBlockTitles(app.window)).toContain("Spotify track");
  });
});
