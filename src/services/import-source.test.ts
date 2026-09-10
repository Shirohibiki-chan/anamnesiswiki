import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { inputFromFolder, inputFromText, inputFromZip, nameFromPath, sniffFile } from "./import-source";

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

  it("refuses a world's own files with directions", () => {
    const bytes = zipSync({ "Valeraverse/project.json": encode("{}"), "Valeraverse/Canon/_folder.json": encode("{}") });
    expect(() => inputFromZip("Valeraverse", bytes)).toThrow(/Unzip it into your projects folder/);
  });

  it("says so when the bytes are not a zip", () => {
    expect(() => inputFromZip("x", encode("not a zip"))).toThrow(/couldn't be opened/);
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
