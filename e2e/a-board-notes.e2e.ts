// Sticky notes on a board. Phase 32, step 10, 2026-09-20.
//
// What only the real app can answer: that the Note button puts down a note
// in the colour picked, open for writing at once; that what is typed into
// it — with bold, a new line and a page link among the words — reaches
// `_board.json` as the note's own runs rather than as HTML; that the note
// grows taller as its words need; that a link in a resting note opens its
// page; that a selected note recolours from the top-right button and N
// puts down the next note in that colour; and that all of it draws the
// same after a restart.
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchApp, type RunningApp } from "./harness/launch-app";
import {
  addBoardNote,
  boardNoteBox,
  boardNoteColours,
  boardNoteIsBeingWritten,
  boardNoteIsOpen,
  boardNoteMarks,
  boardNoteTexts,
  boardOffersNoteColour,
  clearTreeSearch,
  clickBoardNote,
  clickBoardNoteLink,
  deselectOnBoard,
  doubleClickBoardNote,
  finishBoardNote,
  linkBoardNoteWordsToPage,
  makeBoard,
  openPage,
  pageTitle,
  recolourBoardNotes,
  waitForBoard,
  waitForPageTitle,
  waitForWorld,
} from "./harness/screen";

/** A page the generated world really has — see a-storyline-existing-pages. */
const PAGE = "Greyharbour";

/** Long enough for the settle delay and the queued write to reach the disk. */
const WRITTEN_MS = 2500;

type Run = { text: string; bold?: true; italic?: true; link?: string };
type Shape = { id: string; type: string; link?: string | null; width: number; height: number; customData?: { note?: { colour: string; lines: Run[][] } } };

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

async function notesOnDisk(app: RunningApp): Promise<Shape[]> {
  await app.window.waitForTimeout(WRITTEN_MS);
  const file = await findBoardFile(app.world!.path);
  if (!file) return [];
  const shapes = (JSON.parse(await fs.readFile(file, "utf8")) as { elements: Shape[] }).elements;
  // Notes are appended, so the file lists them in the order they were made.
  return shapes.filter((shape) => shape.link === "anamnesis://note");
}

async function reload(app: RunningApp): Promise<void> {
  await app.window.evaluate(() => {
    (window as unknown as { __beforeReload?: boolean }).__beforeReload = true;
  });
  await app.window.keyboard.press("Control+r");
  await app.window.waitForFunction(() => !(window as unknown as { __beforeReload?: boolean }).__beforeReload);
  await waitForWorld(app.window);
}

describe("sticky notes on a board", () => {
  let app: RunningApp;
  const BOARD = "Plotting wall";

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

  it("puts down a note in the colour picked, open for writing, and keeps its words as runs", async () => {
    await addBoardNote(app.window, "teal");
    expect(await boardNoteIsBeingWritten(app.window)).toBe(true);
    await app.window.keyboard.type("Siege of ", { delay: 20 });
    await app.window.keyboard.press("Control+b");
    await app.window.keyboard.type("Greyharbour", { delay: 20 });
    await app.window.keyboard.press("Control+b");
    await app.window.keyboard.press("Enter");
    await app.window.keyboard.type("forty days", { delay: 20 });
    await finishBoardNote(app.window);
    expect(await boardNoteTexts(app.window)).toEqual(["Siege of Greyharbour\nforty days"]);
    expect((await boardNoteMarks(app.window, 0)).bold).toEqual(["Greyharbour"]);

    const [note] = await notesOnDisk(app);
    expect(note.type).toBe("embeddable");
    expect(note.customData?.note).toEqual({
      colour: "teal",
      lines: [[{ text: "Siege of " }, { text: "Greyharbour", bold: true }], [{ text: "forty days" }]],
    });
    expect(note.width).toBe(200);
    expect(note.height).toBe(200);
  });

  it("takes a whole edit back with one undo, and puts it back with one redo", async () => {
    await doubleClickBoardNote(app.window, 0);
    await app.window.keyboard.press("Control+End");
    await app.window.keyboard.type(" and nights", { delay: 20 });
    await finishBoardNote(app.window);
    expect(await boardNoteTexts(app.window)).toEqual(["Siege of Greyharbour\nforty days and nights"]);
    await app.window.keyboard.press("Control+z");
    expect(await boardNoteTexts(app.window)).toEqual(["Siege of Greyharbour\nforty days"]);
    await app.window.keyboard.press("Control+Shift+z");
    expect(await boardNoteTexts(app.window)).toEqual(["Siege of Greyharbour\nforty days and nights"]);
    await app.window.keyboard.press("Control+z");
    expect(await boardNoteTexts(app.window)).toEqual(["Siege of Greyharbour\nforty days"]);
  });

  it("grows taller as its words need, and never back", async () => {
    await doubleClickBoardNote(app.window, 0);
    expect(await boardNoteIsBeingWritten(app.window)).toBe(true);
    await app.window.keyboard.press("Control+End");
    for (let line = 0; line < 8; line += 1) {
      await app.window.keyboard.press("Enter");
      await app.window.keyboard.type(`line ${line + 1}`, { delay: 10 });
    }
    await finishBoardNote(app.window);
    const grown = await boardNoteBox(app.window, 0);
    if (grown.height <= 260) {
      const diag = await app.window.evaluate(() => (window as unknown as { __diag?: string[] }).__diag);
      expect({ diag, errors: app.errors, box: await app.window.evaluate(() => { const n = document.querySelector<HTMLElement>("[data-testid='board-note']"); const inner = n?.closest<HTMLElement>(".excalidraw__embeddable-container__inner"); return [n?.offsetHeight, inner?.style.height, inner?.offsetHeight]; }) }).toEqual({});
    }
    expect(grown.height).toBeGreaterThan(260);
    const [note] = await notesOnDisk(app);
    expect(note.height).toBeGreaterThan(260);
    expect(note.customData?.note.lines).toHaveLength(10);
  }, 120_000);

  it("takes a page link among its words, and the link opens the page from the resting note", async () => {
    await doubleClickBoardNote(app.window, 0);
    await app.window.keyboard.press("Control+End");
    await app.window.keyboard.press("Enter");
    await app.window.keyboard.type("see ", { delay: 20 });
    await linkBoardNoteWordsToPage(app.window, PAGE);
    await finishBoardNote(app.window);
    const marks = await boardNoteMarks(app.window, 0);
    expect(marks.links).toHaveLength(1);
    expect(marks.links[0].text).toBe(PAGE);
    expect(marks.links[0].href).toMatch(/^anamnesis:\/\/page\/.+/);
    const [note] = await notesOnDisk(app);
    const last = note.customData!.note.lines[note.customData!.note.lines.length - 1];
    expect(last[0]).toEqual({ text: "see " });
    expect(last[1].text).toBe(PAGE);
    expect(last[1].link).toBe(marks.links[0].href);

    await clickBoardNoteLink(app.window, 0, PAGE);
    await waitForPageTitle(app.window, PAGE);
    expect(await pageTitle(app.window)).toBe(PAGE);
    await openPage(app.window, BOARD);
    await waitForBoard(app.window);
    expect(await boardNoteTexts(app.window)).toHaveLength(1);
  }, 120_000);

  it("recolours a selected note from the top-right button, and N puts the next note down in that colour", async () => {
    await deselectOnBoard(app.window);
    expect(await boardOffersNoteColour(app.window)).toBe(false);
    await clickBoardNote(app.window, 0);
    // The first click selects; writing is the second click, as opening is a card's.
    expect(await boardNoteIsOpen(app.window)).toBe(false);
    expect(await boardOffersNoteColour(app.window)).toBe(true);
    await recolourBoardNotes(app.window, "orange");
    expect(await boardNoteColours(app.window)).toEqual(["orange"]);
    // Still selected and still at rest: recolouring is not writing.
    expect(await boardNoteIsBeingWritten(app.window)).toBe(false);

    await deselectOnBoard(app.window);
    await app.window.keyboard.press("n");
    await app.window.locator("[data-testid='board-note'][data-editing='true']").waitFor({ state: "visible" });
    await app.window.keyboard.type("second", { delay: 20 });
    await finishBoardNote(app.window);
    expect(await boardNoteColours(app.window)).toEqual(["orange", "orange"]);
    const notes = await notesOnDisk(app);
    expect(notes.map((note) => note.customData?.note.colour)).toEqual(["orange", "orange"]);
    expect(notes[1].customData?.note.lines).toEqual([[{ text: "second" }]]);
  });

  it("keeps the words when writing ends by a click elsewhere, or by leaving the page", async () => {
    await doubleClickBoardNote(app.window, 1);
    await app.window.keyboard.press("Control+End");
    await app.window.keyboard.type(" thought", { delay: 20 });
    await deselectOnBoard(app.window);
    await app.window.locator("[data-testid='board-note'][data-editing='true']").waitFor({ state: "detached" });
    expect((await boardNoteTexts(app.window))[1]).toBe("second thought");
    let notes = await notesOnDisk(app);
    expect(notes[1].customData?.note.lines).toEqual([[{ text: "second thought" }]]);
    // One undo takes that edit back too, and one redo returns it.
    await app.window.keyboard.press("Control+z");
    expect((await boardNoteTexts(app.window))[1]).toBe("second");
    await app.window.keyboard.press("Control+Shift+z");
    expect((await boardNoteTexts(app.window))[1]).toBe("second thought");

    await doubleClickBoardNote(app.window, 1);
    await app.window.keyboard.press("Control+End");
    await app.window.keyboard.type(", kept", { delay: 20 });
    await openPage(app.window, PAGE);
    await waitForPageTitle(app.window, PAGE);
    await openPage(app.window, BOARD);
    await waitForBoard(app.window);
    await app.window.locator("[data-testid='board-note']").nth(1).waitFor({ state: "visible" });
    expect((await boardNoteTexts(app.window))[1]).toBe("second thought, kept");
    notes = await notesOnDisk(app);
    expect(notes[1].customData?.note.lines).toEqual([[{ text: "second thought, kept" }]]);
  }, 120_000);

  it("draws the same after a restart", async () => {
    await reload(app);
    await openPage(app.window, BOARD);
    await waitForBoard(app.window);
    await app.window.locator("[data-testid='board-note']").nth(1).waitFor({ state: "visible" });
    const texts = await boardNoteTexts(app.window);
    expect(texts[0].startsWith("Siege of Greyharbour\nforty days\nline 1")).toBe(true);
    expect(texts[1]).toBe("second thought, kept");
    expect(await boardNoteColours(app.window)).toEqual(["orange", "orange"]);
    expect((await boardNoteMarks(app.window, 0)).bold).toEqual(["Greyharbour"]);
    expect(app.errors).toEqual([]);
  });
});
