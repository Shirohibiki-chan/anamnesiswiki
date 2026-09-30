// @vitest-environment happy-dom
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { backupFromListing, inputFromFolder, inputFromText, nameFromPath, readZip, sniffFile } from "./import-source";

function inputFromZip(name: string, bytes: Uint8Array) {
  const read = readZip(name, bytes);
  if (read.kind !== "notes") throw new Error("expected notes");
  return read.input;
}

const encode = (text: string) => new TextEncoder().encode(text);

describe("nameFromPath", () => {
  it("takes the last segment and drops the extension, on either slash", () => {
    expect(nameFromPath("C:\\Users\\shiro\\My Vault")).toBe("My Vault");
    expect(nameFromPath("/home/x/My Vault/")).toBe("My Vault");
    expect(nameFromPath("/home/x/world.lk.zip")).toBe("world.lk");
    expect(nameFromPath("/home/x/.hidden")).toBe(".hidden");
  });
});

describe("inputFromFolder", () => {
  it("reads every note up front and leaves pictures to the plan", async () => {
    const reads: string[] = [];
    const input = await inputFromFolder("V", ["A.md", "pic.png", "sub/B.txt", ".obsidian/app.json"], async (path) => {
      reads.push(path);
      return encode(`text of ${path}`);
    });
    expect(reads).toEqual(["A.md", "sub/B.txt"]);
    expect(input.name).toBe("V");
    expect(input.files).toHaveLength(4);
    expect(input.texts.get("sub/B.txt")).toBe("text of sub/B.txt");
  });
});

describe("inputFromText", () => {
  it("is a one-file vault", async () => {
    const input = inputFromText("Notes", "Notes.md", encode("# hi"));
    expect(input.files).toEqual(["Notes.md"]);
    expect(input.texts.get("Notes.md")).toBe("# hi");
    expect(new TextDecoder().decode(await input.readBytes("Notes.md"))).toBe("# hi");
  });
});

describe("inputFromZip", () => {
  it("unpacks the entries and hands their bytes back on request", async () => {
    const bytes = zipSync({ "A.md": encode("one"), "sub/B.md": encode("two"), "x.png": new Uint8Array([1, 2, 3]) });
    const input = inputFromZip("archive", bytes);
    expect(input.name).toBe("archive");
    expect(input.files.sort()).toEqual(["A.md", "sub/B.md", "x.png"]);
    expect(input.texts.get("sub/B.md")).toBe("two");
    expect([...(await input.readBytes("x.png"))]).toEqual([1, 2, 3]);
  });

  it("strips the one folder everything sits in and names the project after it", () => {
    const bytes = zipSync({ "My Vault/A.md": encode("one"), "My Vault/sub/B.md": encode("two") });
    const input = inputFromZip("archive", bytes);
    expect(input.name).toBe("My Vault");
    expect(input.files.sort()).toEqual(["A.md", "sub/B.md"]);
  });

  it("does not strip a folder when something sits beside it", () => {
    const bytes = zipSync({ "Vault/A.md": encode("one"), "README.md": encode("top") });
    expect(inputFromZip("archive", bytes).files.sort()).toEqual(["README.md", "Vault/A.md"]);
  });

  it("reads a world's own files as a backup to restore, not as notes", async () => {
    const bytes = zipSync({
      "Valeraverse/project.json": encode(JSON.stringify({ name: "Valeraverse World" })),
      "Valeraverse/Canon/_folder.json": encode("{}"),
      "Valeraverse/Canon/Kaine.json": encode("{}"),
      "Valeraverse/assets/a.png": new Uint8Array([1]),
      "Valeraverse/.history/k/1.json": encode("{}"),
      "Valeraverse/.anamnesis-open.json": encode("{}"),
    });
    const read = readZip("archive", bytes);
    expect(read.kind).toBe("backup");
    if (read.kind !== "backup") return;
    expect(read.plan.projectName).toBe("Valeraverse World");
    expect(read.plan.pageCount).toBe(2);
    expect(read.plan.pictureCount).toBe(1);
    expect(read.plan.versionCount).toBe(1);
    // The claim that it was open when zipped stays behind.
    expect(read.plan.files.map((file) => file.path)).not.toContain(".anamnesis-open.json");
    const kaine = read.plan.files.find((file) => file.path === "Canon/Kaine.json")!;
    expect(new TextDecoder().decode(await kaine.read())).toBe("{}");
  });

  it("says so when the bytes are not a zip", () => {
    expect(() => inputFromZip("x", encode("not a zip"))).toThrow(/couldn't be opened/);
  });
});

describe("backupFromListing", () => {
  it("falls back to the folder's name, and says so when project.json is damaged", () => {
    const read = async () => new Uint8Array();
    expect(backupFromListing("Folder Name", ["project.json"], "{}", read).projectName).toBe("Folder Name");
    expect(() => backupFromListing("x", ["project.json"], "{not json", read)).toThrow(/damaged/);
  });
});

describe("web pages", () => {
  it("comes through a folder as notes", async () => {
    const input = await inputFromFolder("Site", ["a.html", "b.md"], async (path) =>
      encode(path === "a.html" ? "<html><body><h1>Alpha</h1><p>Hi</p></body></html>" : "plain"),
    );
    expect(input.files.sort()).toEqual(["a.md", "b.md"]);
    expect(input.texts.get("a.md")).toContain('title: "Alpha"');
    expect(input.texts.get("b.md")).toBe("plain");
  });

  it("comes through a single file as a note", () => {
    const input = inputFromText("Page", "Page.html", encode("<title>Page</title><p>Words</p>"));
    expect(input.files).toEqual(["Page.md"]);
    expect(input.texts.get("Page.md")).toContain("Words");
  });
});

describe("sniffFile", () => {
  it("knows gzip, zip and everything else", () => {
    expect(sniffFile(new Uint8Array([0x1f, 0x8b, 0x08]))).toBe("lk");
    expect(sniffFile(zipSync({ "a.md": encode("x") }))).toBe("zip");
    expect(sniffFile(encode("# markdown"))).toBe("text");
    expect(sniffFile(new Uint8Array())).toBe("text");
  });
});
