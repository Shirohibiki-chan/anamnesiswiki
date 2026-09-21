// A player in the page. Phase 31, step 1, 2026-09-21.
//
// What only the real app can answer: that a YouTube link pasted on an empty
// line becomes a card rather than a line of text, and one pasted among words
// stays a link; that the `/` menu's four entries put down a box that takes a
// link and refuses one from anywhere else; that a Spotify link loads the
// service's own player at the address the page's theme asks for, while a
// YouTube one waits as a still until it is clicked; and that all of it —
// link, service, caption — is in the page file and comes back after a
// reload.
//
// Nothing here asks the internet for anything it needs: what the services
// say about a link (title, thumbnail) is fetched in the background and the
// card draws with or without it. The scenario asserts on what is stored and
// what is drawn from the link alone, so it passes the same way on a runner
// with the internet and one without.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  captionMedia,
  clickLastLineInEditor,
  editorText,
  giveMediaLink,
  makePageOfTemplate,
  mediaLinkBoxRefusal,
  mediaLinkBoxShown,
  mediaMenuItems,
  mediaPlayerSource,
  mediaPlayersShown,
  openPage,
  pasteTextInEditor,
  pickSuggestion,
  playMedia,
  suggestionMenuItems,
  typeInEditor,
  waitForWorld,
} from "./harness/screen";

const PAGE = "Listening Room";
const VIDEO = "https://youtu.be/dQw4w9WgXcQ?si=share";
const TRACK = "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc";

/** Long enough for the autosave to have written. */
const WRITTEN_MS = 2500;

type StoredBlock = { type: string; props?: Record<string, unknown>; content?: unknown; children?: StoredBlock[] };

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
  const page = JSON.parse(await fs.readFile(file, "utf8")) as { tabs: { content: StoredBlock[] }[] };
  return page.tabs.flatMap((tab) => tab.content);
}

describe("a player in the page", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await makePageOfTemplate(app.window, PAGE, "Note");
    // An empty page: the template's own writing cleared, so the first line
    // is an empty one and every paste below lands where the caret is put.
    await typeInEditor(app.window, "");
    await app.window.keyboard.press("Control+a");
    await app.window.keyboard.press("Backspace");
  });

  afterAll(async () => {
    await app?.close();
  });

  /** The caret on the empty line at the end of the page, which every player leaves behind it. */
  async function lastLine() {
    await clickLastLineInEditor(app.window);
  }

  it("turns a YouTube link pasted on an empty line into a still that waits to be played", async () => {
    await lastLine();
    await pasteTextInEditor(app.window, VIDEO);
    await app.window.locator(".media-embed").first().waitFor({ state: "visible" });

    const [player] = await mediaPlayersShown(app.window);
    expect(player.service).toBe("youtube");
    expect(player.playing).toBe(false);
    // Before the service has answered — or without the internet — the still
    // says which service and shows the address; nothing here needs a fetch.
    expect(player.still).toContain("YouTube");
    expect(await mediaPlayerSource(app.window, 0)).toBeNull();

    const stored = (await blocksOnDisk(app)).find((block) => block.type === "mediaEmbed");
    expect(stored?.props).toMatchObject({
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      service: "youtube",
      kind: "video",
      mediaId: "dQw4w9WgXcQ",
      width: 100,
    });
  });

  it("loads the real player only when the still is clicked", async () => {
    await playMedia(app.window, 0);
    const source = await mediaPlayerSource(app.window, 0);
    expect(source).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0");
  });

  it("leaves a link pasted among words as a link", async () => {
    await lastLine();
    await app.window.keyboard.type("Listen to ");
    await pasteTextInEditor(app.window, `${VIDEO} tonight`);
    await app.window.waitForTimeout(300);
    expect(await mediaPlayersShown(app.window)).toHaveLength(1);
    expect(await editorText(app.window)).toContain("Listen to");
    // On to a fresh line for the next one.
    await app.window.keyboard.press("End");
    await app.window.keyboard.press("Enter");
  });

  it("offers the four entries in the slash menu and takes a Spotify link through the box", async () => {
    await lastLine();
    await app.window.keyboard.type("/spot", { delay: 20 });
    const items = await suggestionMenuItems(app.window);
    expect(items.some((item) => item.startsWith("Spotify"))).toBe(true);
    await pickSuggestion(app.window, "Spotify");
    expect(await mediaLinkBoxShown(app.window)).toBe(true);

    await giveMediaLink(app.window, "https://example.com/not-a-player");
    expect(await mediaLinkBoxRefusal(app.window)).toContain("YouTube, YouTube Music, Spotify or SoundCloud");
    expect(await mediaLinkBoxShown(app.window)).toBe(true);

    await giveMediaLink(app.window, TRACK);
    await app.window.locator(".media-embed .media-player-spotify").waitFor({ state: "visible" });
    expect(await mediaLinkBoxShown(app.window)).toBe(false);

    // Spotify's own card is loaded straight away, in the look the dark
    // theme asks for, and a lone track does not take the whole column.
    const players = await mediaPlayersShown(app.window);
    expect(players.map((player) => player.service)).toEqual(["youtube", "spotify"]);
    expect(await mediaPlayerSource(app.window, 1)).toBe("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?theme=0");
    const width = await app.window.locator(".media-embed").nth(1).evaluate((frame) => frame.style.width);
    expect(width).toBe("60%");
  });

  it("takes a caption, and offers the block's own menu", async () => {
    await captionMedia(app.window, 1, "Her theme");
    expect(await mediaMenuItems(app.window, 1)).toEqual(["Open on Spotify", "Copy Link", "Fetch Again", "Remove"]);
    const stored = (await blocksOnDisk(app)).filter((block) => block.type === "mediaEmbed");
    expect(stored.map((block) => block.props?.caption)).toEqual(["", "Her theme"]);
  });

  it("draws both again after a reload, from the file", async () => {
    await app.window.evaluate(() => {
      (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
    });
    await app.window.keyboard.press("Control+r");
    await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
    await waitForWorld(app.window);
    await openPage(app.window, PAGE);
    await app.window.locator(".media-embed").nth(1).waitFor({ state: "visible" });
    const players = await mediaPlayersShown(app.window);
    expect(players.map((player) => player.service)).toEqual(["youtube", "spotify"]);
    expect(players[0].playing).toBe(false);
    const caption = await app.window.locator(".media-embed .media-caption").nth(1).inputValue();
    expect(caption).toBe("Her theme");
  });
});
