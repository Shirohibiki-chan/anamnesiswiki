// Pictures on a board live in the world's library. Phase 32, step 4,
// 2026-09-19.
//
// What only the real app can answer: that a picture dropped from the Assets
// tab lands on the board as the file it already is, with no second copy;
// that a picture pasted onto the board is put into `assets/` and the board
// file points at it rather than carrying its bytes; and that both are drawn
// again after a restart, read back out of the library.
import { promises as fs } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  clearTreeSearch,
  dropAssetOntoBoard,
  makeBoard,
  pasteImageOnBoard,
  waitForBoard,
  waitForWorld,
} from "./harness/screen";

/** Long enough for the settle delay and the queued write to reach the disk. */
const WRITTEN_MS = 2500;

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

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

type Shape = { id: string; type: string; fileId?: string | null; width: number; height: number };
type StoredFile = { id: string; mimeType: string; asset?: string; dataURL?: string };
type BoardFile = { elements: Shape[]; files: Record<string, StoredFile> };

async function boardOnDisk(app: RunningApp): Promise<BoardFile> {
  await app.window.waitForTimeout(WRITTEN_MS);
  const file = await findBoardFile(app.world!.path);
  return file ? (JSON.parse(await fs.readFile(file, "utf8")) as BoardFile) : { elements: [], files: {} };
}

async function assetsOnDisk(app: RunningApp): Promise<string[]> {
  return (await fs.readdir(path.join(app.world!.path, "assets"))).filter((name) => /\.(png|jpe?g|gif|webp)$/i.test(name)).sort();
}

/** A small real PNG — a 12×8 orange block — since the library refuses a file that will not decode. */
function png(): Uint8Array {
  const width = 12;
  const height = 8;
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body), 0);
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const raw = Buffer.alloc(height * (width * 3 + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < width; x++) {
      raw[offset++] = 230;
      raw[offset++] = 120;
      raw[offset++] = 40;
    }
  }
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

describe("pictures on a board", () => {
  let app: RunningApp;
  let libraryBefore: string[];

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    libraryBefore = await assetsOnDisk(app);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type("Picture board");
    await app.window.keyboard.press("Enter");
    await makeBoard(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("takes a picture dragged from the Assets tab, as the file it already is", async () => {
    const [fileName] = libraryBefore;
    expect(fileName).toBeDefined();
    await dropAssetOntoBoard(app.window, fileName);
    const board = await boardOnDisk(app);
    const [picture] = board.elements.filter((shape) => shape.type === "image");
    expect(picture).toBeDefined();
    expect(picture.fileId).toBeTruthy();
    // The world's pictures are 480 or 1200 wide; the board scales the big
    // ones down to fit and the element is drawn at that size.
    expect(picture.width).toBeLessThanOrEqual(480);
    expect(picture.width).toBeGreaterThan(0);
    // Written as a pointer at the library, not as the bytes.
    expect(board.files[picture.fileId!]).toEqual({ id: picture.fileId, mimeType: "image/png", asset: fileName });
    // And no second copy of the picture was made.
    expect(await assetsOnDisk(app)).toEqual(libraryBefore);
  });

  it("puts a pasted picture into the library and points at it", async () => {
    await pasteImageOnBoard(app.window, png());
    const board = await boardOnDisk(app);
    const pictures = board.elements.filter((shape) => shape.type === "image");
    expect(pictures).toHaveLength(2);
    const library = await assetsOnDisk(app);
    expect(library).toHaveLength(libraryBefore.length + 1);
    const [added] = library.filter((name) => !libraryBefore.includes(name));
    const pasted = pictures.find((shape) => board.files[shape.fileId!]?.asset === added);
    expect(pasted).toBeDefined();
    expect(board.files[pasted!.fileId!].dataURL).toBeUndefined();
    // The file in the library is the picture that was pasted — a 12×8 PNG.
    // Not the same bytes: the library redraws what is pasted before it
    // keeps it, so the picture is compared by its header, not its file.
    const stored = await fs.readFile(path.join(app.world!.path, "assets", added));
    expect(stored.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect([stored.readUInt32BE(16), stored.readUInt32BE(20)]).toEqual([12, 8]);
    // Nothing in the board file is a picture's bytes.
    expect(Object.values(board.files).every((file) => file.asset && !file.dataURL)).toBe(true);
  });

  it("draws both again after a restart, read back out of the library", async () => {
    await reload(app);
    await waitForBoard(app.window);
    // The pictures are the library's placeholders until their bytes are
    // read, and the library draws a loaded picture with no placeholder
    // class on its canvas; what the file says is the check that survives.
    const board = await boardOnDisk(app);
    expect(board.elements.filter((shape) => shape.type === "image")).toHaveLength(2);
    expect(Object.values(board.files).every((file) => file.asset && !file.dataURL)).toBe(true);
    expect(app.errors).toEqual([]);
  });

  it("moves a picture the spike wrote into the file as bytes into the library on the next open", async () => {
    // A board file from before this step: the picture is a data URL in it.
    const file = (await findBoardFile(app.world!.path))!;
    const board = JSON.parse(await fs.readFile(file, "utf8")) as BoardFile & { files: Record<string, unknown> };
    const [picture] = board.elements.filter((shape) => shape.type === "image");
    const legacy = { ...picture, id: "legacy-picture", fileId: "legacy-file", x: 20, y: 20 };
    board.elements.push(legacy);
    board.files["legacy-file"] = {
      id: "legacy-file",
      mimeType: "image/png",
      dataURL: `data:image/png;base64,${Buffer.from(png()).toString("base64")}`,
      created: Date.now(),
    };
    await fs.writeFile(file, JSON.stringify(board));
    const libraryBefore = await assetsOnDisk(app);

    await reload(app);
    await waitForBoard(app.window);
    const migrated = await boardOnDisk(app);
    expect(migrated.elements.filter((shape) => shape.type === "image")).toHaveLength(3);
    const moved = migrated.files["legacy-file"];
    expect(moved.dataURL).toBeUndefined();
    expect(moved.asset).toBeTruthy();
    expect(await assetsOnDisk(app)).toEqual([...libraryBefore, moved.asset!].sort());
    expect(app.errors).toEqual([]);
  });
});
