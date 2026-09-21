// A moving GIF moves on a board. Phase 32, step 9.
//
// What only the real app can answer: that a picture with two frames,
// pasted onto the board, is drawn as one frame and then the other rather
// than standing on its first — the library's canvas takes an animated
// picture's first frame only, and the patch in `scripts/excalidraw-patch.mjs`
// is what makes it move. Fails against an unpatched build: the colour at
// the picture's middle never changes.
//
// The picture is built by hand here, byte by byte, so the test carries no
// file: two frames of one flat colour each, ten hundredths of a second
// apart, looping.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import { boardCentreColours, clearTreeSearch, makeBoard, pasteFileOnBoard, waitForWorld } from "./harness/screen";

/**
 * A GIF of `size`×`size` pixels with one flat frame per colour, looping,
 * each shown for `delay` hundredths of a second. The pixels are LZW-coded
 * the lazy way — a clear code before every pixel, so no dictionary ever
 * builds — which every decoder accepts.
 */
function animatedGif(size: number, colours: [number, number, number][], delay: number): Uint8Array {
  const out: number[] = [];
  const word = (value: number) => out.push(value & 0xff, (value >> 8) & 0xff);
  out.push(...[0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
  word(size);
  word(size);
  // A global colour table of four entries (two bits), so index codes are three bits wide.
  out.push(0x80 | 0x01, 0, 0);
  const table = [...colours, [0, 0, 0], [0, 0, 0]].slice(0, 4);
  for (const [r, g, b] of table) out.push(r, g, b);
  // Loop forever.
  out.push(0x21, 0xff, 0x0b, ...Array.from("NETSCAPE2.0", (c) => c.charCodeAt(0)), 0x03, 0x01, 0x00, 0x00, 0x00);
  colours.forEach((_, index) => {
    // Graphic control: the delay, no transparency.
    out.push(0x21, 0xf9, 0x04, 0x00);
    word(delay);
    out.push(0x00, 0x00);
    // Image descriptor: the whole screen, no local table.
    out.push(0x2c);
    word(0);
    word(0);
    word(size);
    word(size);
    out.push(0x00);
    // LZW with a minimum code size of 2: codes are 3 bits, clear is 4, end is 5.
    out.push(0x02);
    const bits: number[] = [];
    const code = (value: number) => {
      for (let bit = 0; bit < 3; bit++) bits.push((value >> bit) & 1);
    };
    for (let pixel = 0; pixel < size * size; pixel++) {
      code(4);
      code(index);
    }
    code(5);
    const bytes: number[] = [];
    for (let at = 0; at < bits.length; at += 8) {
      let value = 0;
      for (let bit = 0; bit < 8; bit++) value |= (bits[at + bit] ?? 0) << bit;
      bytes.push(value);
    }
    for (let at = 0; at < bytes.length; at += 255) {
      const block = bytes.slice(at, at + 255);
      out.push(block.length, ...block);
    }
    out.push(0x00);
  });
  out.push(0x3b);
  return new Uint8Array(out);
}

describe("a moving GIF on a board", () => {
  let app: RunningApp;

  beforeAll(async () => {
    app = await launchApp();
    await waitForWorld(app.window);
    await clearTreeSearch(app.window);
    await app.window.keyboard.press("Control+n");
    await app.window.keyboard.type("Moving pictures");
    await app.window.keyboard.press("Enter");
    await makeBoard(app.window);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("is drawn frame after frame rather than standing on its first", async () => {
    await pasteFileOnBoard(app.window, animatedGif(60, [[220, 30, 30], [30, 60, 220]], 10), "blink.gif", "image/gif");
    // The library puts the pasted picture under the mouse, at the middle;
    // decoding the frames takes a moment after that.
    await app.window.waitForTimeout(1500);
    const colours = await boardCentreColours(app.window, 800, 40);
    const distinct = new Set(colours);
    // Two frames, both seen: the picture is moving. The background is not
    // among them — the picture covers the middle.
    expect(distinct.size).toBeGreaterThanOrEqual(2);
    // And both frames were held for a while, not flickered once: each
    // colour shows up in more than one sample.
    for (const colour of distinct) expect(colours.filter((seen) => seen === colour).length).toBeGreaterThan(1);
  });
});
