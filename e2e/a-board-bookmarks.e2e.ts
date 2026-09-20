// Bookmark cards on a board. Phase 32, step 5, 2026-09-20.
//
// What only the real app can answer: that a web address pasted on the board
// becomes a card rather than a line of text; that the card fills in with
// what the page says about itself, fetched through the app's own host
// rather than the page's origin rules; that the page's picture lands in the
// world's library and the card points at it; and that all of it is in the
// board file, so the card draws with the site gone.
//
// The site is a server started here, so the scenario asks nothing of the
// internet: a page with Open Graph tags and a picture, on a port of its own.
import { createServer, type Server } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  boardBookmarkTitles,
  clearTreeSearch,
  makeBoard,
  pasteTextOnBoard,
  smallPng,
  waitForBookmarkFetched,
  waitForWorld,
} from "./harness/screen";

/** Long enough for the settle delay and the queued write to reach the disk. */
const WRITTEN_MS = 2500;

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

type Bookmark = { url: string; title: string; description: string; site: string; image: string | null; fetched: boolean };
type Shape = { id: string; type: string; link?: string | null; customData?: { bookmark?: Bookmark } };

async function shapesOnDisk(app: RunningApp): Promise<Shape[]> {
  await app.window.waitForTimeout(WRITTEN_MS);
  const file = await findBoardFile(app.world!.path);
  return file ? (JSON.parse(await fs.readFile(file, "utf8")) as { elements: Shape[] }).elements : [];
}

async function assetsOnDisk(app: RunningApp): Promise<string[]> {
  return (await fs.readdir(path.join(app.world!.path, "assets"))).filter((name) => /\.(png|jpe?g|gif|webp)$/i.test(name)).sort();
}

/** A site of one article and its picture, and a page that says nothing about itself. */
function startSite(): Promise<{ server: Server; origin: string; hits: string[] }> {
  const hits: string[] = [];
  const server = createServer((request, response) => {
    hits.push(request.url ?? "");
    if (request.url === "/article") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(`<!doctype html><html><head>
        <title>Fallback title</title>
        <meta property="og:title" content="The Siege of Greyharbour &amp; After">
        <meta property="og:description" content="How the harbour held for forty days.">
        <meta property="og:site_name" content="Codex Vale">
        <meta property="og:image" content="/siege.png">
      </head><body><h1>The Siege</h1></body></html>`);
    } else if (request.url === "/siege.png") {
      response.writeHead(200, { "content-type": "image/png" });
      response.end(Buffer.from(smallPng()));
    } else if (request.url === "/bare") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<html><body>nothing to say</body></html>");
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, origin: `http://127.0.0.1:${port}`, hits });
    });
  });
}

describe("bookmark cards on a board", () => {
  let app: RunningApp;
  let site: { server: Server; origin: string; hits: string[] };
  let libraryBefore: string[];

  beforeAll(async () => {
    site = await startSite();
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    libraryBefore = await assetsOnDisk(app);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type("Reading list");
    await app.window.keyboard.press("Enter");
    await makeBoard(app.window);
  });

  afterAll(async () => {
    await app?.close();
    site?.server.close();
  });

  it("turns a pasted web address into a card that fills in with what the page says", async () => {
    const url = `${site.origin}/article`;
    await pasteTextOnBoard(app.window, url);
    await waitForBookmarkFetched(app.window, 1);
    expect(await boardBookmarkTitles(app.window)).toEqual(["The Siege of Greyharbour & After"]);

    const shapes = await shapesOnDisk(app);
    const [card] = shapes.filter((shape) => shape.type === "embeddable");
    expect(shapes).toHaveLength(1);
    expect(card.link).toBe(url);
    const bookmark = card.customData!.bookmark!;
    expect(bookmark).toMatchObject({
      url,
      title: "The Siege of Greyharbour & After",
      description: "How the harbour held for forty days.",
      site: "Codex Vale",
      fetched: true,
    });
    // The page's picture is in the world's library, and the card points at it.
    const library = await assetsOnDisk(app);
    expect(library).toHaveLength(libraryBefore.length + 1);
    expect(library).toContain(bookmark.image);
    expect(site.hits).toEqual(["/article", "/siege.png"]);
  });

  it("makes a card from the address alone when the page says nothing", async () => {
    await pasteTextOnBoard(app.window, `${site.origin}/bare`);
    await waitForBookmarkFetched(app.window, 2);
    const titles = await boardBookmarkTitles(app.window);
    expect(titles).toContain("127.0.0.1");
    const shapes = await shapesOnDisk(app);
    const bare = shapes.find((shape) => shape.link === `${site.origin}/bare`)!;
    expect(bare.customData!.bookmark).toMatchObject({ title: "127.0.0.1", description: "", site: "127.0.0.1", image: null, fetched: true });
    // No picture, so nothing new in the library.
    expect(await assetsOnDisk(app)).toHaveLength(libraryBefore.length + 1);
  });

  it("leaves a sentence with an address in it to the library, as text", async () => {
    await pasteTextOnBoard(app.window, `read ${site.origin}/article later`);
    const shapes = await shapesOnDisk(app);
    expect(shapes.filter((shape) => shape.type === "embeddable")).toHaveLength(2);
    expect(shapes.some((shape) => shape.type === "text")).toBe(true);
  });

  it("still draws the card with the site gone", async () => {
    await new Promise<void>((resolve) => site.server.close(() => resolve()));
    await app.window.evaluate(() => {
      (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
    });
    await app.window.keyboard.press("Control+r");
    await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
    await waitForWorld(app.window);
    await waitForBookmarkFetched(app.window, 2);
    expect(await boardBookmarkTitles(app.window)).toContain("The Siege of Greyharbour & After");
    expect(app.errors).toEqual([]);
  });
});
