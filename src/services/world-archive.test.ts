import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { HISTORY_DIR, MOVE_TEMP_PREFIX, OPEN_MARKER_FILE } from "../constants/paths";
import { isExcludedFromArchive, packWorldZip, planArchive } from "./world-archive";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("what never travels", () => {
  // It says "this world is open in a running app right now". Unzipped
  // somewhere else it makes a fresh copy look locked by somebody.
  it("leaves the open marker behind, wherever it sits", () => {
    expect(isExcludedFromArchive(OPEN_MARKER_FILE)).toBe(true);
    expect(isExcludedFromArchive(`Canon/${OPEN_MARKER_FILE}`)).toBe(true);
  });

  // Half of an interrupted rename, which the loader repairs on the way in.
  it("leaves a parked move behind", () => {
    expect(isExcludedFromArchive(`Canon/${MOVE_TEMP_PREFIX}abc`)).toBe(true);
  });

  // The default is everything: each exclusion has to earn itself.
  it("takes the world's own files, including the ones the app writes for itself", () => {
    for (const path of ["project.json", ".templates.json", "Canon/Kaine/_page.json", "assets/face.png", "assets/.sources.json", `${HISTORY_DIR}/abc/2026-01-01.json`]) {
      expect({ path, excluded: isExcludedFromArchive(path) }).toEqual({ path, excluded: false });
    }
  });

  it("does not mistake a page whose name merely starts the same way", () => {
    expect(isExcludedFromArchive("Anamnesis Open Questions.json")).toBe(false);
  });
});

describe("planArchive", () => {
  const entries = [
    { path: "project.json", size: 1000 },
    { path: "Canon/Kaine.json", size: 2000 },
    { path: `${HISTORY_DIR}/abc/one.json`, size: 4000 },
    { path: `${HISTORY_DIR}/abc/two.json`, size: 4000 },
  ];

  it("counts everything, and says how much of it is history", () => {
    const plan = planArchive(entries);
    expect(plan.fileCount).toBe(4);
    expect(plan.totalBytes).toBe(11000);
    expect(plan.historyBytes).toBe(8000);
  });

  // The surprising part of the number, so it is named rather than buried.
  it("says what the history is and why it squashes", () => {
    expect(planArchive(entries).notes.join(" ")).toContain("2 of them are earlier versions of your pages");
  });

  it("reads as English for a single earlier version too", () => {
    const one = planArchive([{ path: "project.json", size: 10 }, { path: `${HISTORY_DIR}/abc/one.json`, size: 10 }]);
    expect(one.notes.join(" ")).toContain("One of them is an earlier version of a page");
  });

  it("says nothing about history when there is none", () => {
    expect(planArchive([{ path: "project.json", size: 10 }]).notes.join(" ")).not.toContain("earlier versions");
  });

  // The claim the whole format rests on, said every time.
  it("always says that nothing is converted", () => {
    expect(planArchive([]).notes.join(" ")).toContain("Nothing is converted");
  });
});

describe("packWorldZip", () => {
  it("puts the world inside a folder of its own name, so unzipping is tidy", async () => {
    const packed = await packWorldZip("Valeraverse", [
      { path: "project.json", bytes: bytes('{"name":"Valeraverse"}') },
      { path: "Canon/Kaine.json", bytes: bytes('{"name":"Kaine"}') },
    ]);
    const back = unzipSync(packed);
    expect(Object.keys(back).sort()).toEqual(["Valeraverse/Canon/Kaine.json", "Valeraverse/project.json"]);
  });

  it("hands the bytes back unchanged, which is the whole promise", async () => {
    const original = '{"name":"Kaine","tabs":[]}';
    const packed = await packWorldZip("W", [{ path: "Canon/Kaine.json", bytes: bytes(original) }]);
    expect(new TextDecoder().decode(unzipSync(packed)["W/Canon/Kaine.json"])).toBe(original);
  });

  it("survives a picture's bytes, which are not text and must not be mangled", async () => {
    const raw = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0xfe]);
    const packed = await packWorldZip("W", [{ path: "assets/face.png", bytes: raw }]);
    expect([...unzipSync(packed)["W/assets/face.png"]]).toEqual([...raw]);
  });

  it("makes an empty archive rather than failing on a world with nothing in it", async () => {
    expect(Object.keys(unzipSync(await packWorldZip("W", [])))).toEqual([]);
  });
});
