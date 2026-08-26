// Proves the generated world is one the app can actually open.
//
// The generator restates the app's storage rules — which templates are a
// directory, how a collision is suffixed, how a name becomes a filename — and a
// restatement is a copy that can drift. So rather than asserting the generator
// agrees with itself, this runs the real world it wrote through the app's own
// `buildPathIndex` and `resolveNodePath` and checks every file is where the app
// will go looking for it. If someone changes a storage rule in
// filesystem-service and not in the generator, this is what fails.
//
// Mocks match src/services/filesystem-service.test.ts: only the pure path
// functions are used here, and the fs plugin is stubbed to nothing so importing
// the module cannot touch disk.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep as osSep } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/path", () => ({ sep: () => "/" }));
vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: vi.fn(async () => {}),
  writeTextFile: vi.fn(async () => {}),
  exists: vi.fn(async () => false),
  readDir: vi.fn(async () => []),
  readTextFile: vi.fn(async () => ""),
  remove: vi.fn(async () => {}),
  rename: vi.fn(async () => {}),
  readFile: vi.fn(async () => new Uint8Array()),
  writeFile: vi.fn(async () => {}),
  watch: vi.fn(async () => () => {}),
}));

import { buildPathIndex, resolveNodePath } from "../src/services/filesystem-service";
import type { Node } from "../src/constants/schema";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const GENERATOR = join(REPO_ROOT, "scripts", "make-test-world.mjs");
const ASSET_FILES = new Set([".names.json"]);

/** Every `.json` under `root` that holds a node, with where it actually sits. */
function collectNodeFiles(root: string): { node: Node; dirSegments: string[]; fileName: string }[] {
  const found: { node: Node; dirSegments: string[]; fileName: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry !== "assets") walk(full);
        continue;
      }
      if (!entry.endsWith(".json")) continue;
      if (dir === root && entry === "project.json") continue;
      if (ASSET_FILES.has(entry)) continue;
      const rel = relative(root, dir);
      const segments = rel === "" ? [] : rel.split(osSep);
      found.push({ node: JSON.parse(readFileSync(full, "utf8")) as Node, dirSegments: segments, fileName: entry });
    }
  };
  walk(root);
  return found;
}

describe("make-test-world", () => {
  let out: string;
  let files: ReturnType<typeof collectNodeFiles>;
  let nodes: Node[];

  beforeAll(() => {
    out = mkdtempSync(join(tmpdir(), "anamnesis-test-world-"));
    // Small on purpose: this is about the rules holding, not about volume, and
    // every hard case is written at any size.
    execFileSync(process.execPath, [GENERATOR, "--out", out, "--pages", "40", "--seed", "3", "--force"], {
      stdio: "pipe",
    });
    files = collectNodeFiles(out);
    nodes = files.map((file) => file.node);
  });

  afterAll(() => {
    rmSync(out, { recursive: true, force: true });
  });

  it("writes every node where the app's own path code expects it", () => {
    const index = buildPathIndex(nodes);
    const misplaced = files.filter((file) => {
      const resolved = resolveNodePath(file.node, index);
      return (
        resolved.fileName !== file.fileName ||
        resolved.dirSegments.join("/") !== file.dirSegments.join("/")
      );
    });
    expect(misplaced.map((file) => file.node.name)).toEqual([]);
  });

  it("gives every node a unique id and a parent that exists", () => {
    const ids = new Set(nodes.map((node) => node.id));
    expect(ids.size).toBe(nodes.length);
    const orphans = nodes.filter((node) => node.parentId !== null && !ids.has(node.parentId));
    expect(orphans.map((node) => node.name)).toEqual([]);
  });

  it("lists exactly the root nodes in project.json's rootOrder", () => {
    const project = JSON.parse(readFileSync(join(out, "project.json"), "utf8"));
    const roots = nodes.filter((node) => node.parentId === null).map((node) => node.id);
    expect([...project.rootOrder].sort()).toEqual([...roots].sort());
  });

  it("points every picture, mention and reference at something that exists", () => {
    const assets = new Set(readdirSync(join(out, "assets")));
    const ids = new Set(nodes.map((node) => node.id));

    const missingPictures = nodes
      .flatMap((node) => [node.image, node.banner])
      .filter((name): name is string => Boolean(name) && !assets.has(name as string));
    expect(missingPictures).toEqual([]);

    const danglingMentions: string[] = [];
    for (const node of nodes) {
      for (const tab of node.tabs) {
        for (const block of tab.content as { content?: unknown }[]) {
          for (const inline of (block?.content ?? []) as { type?: string; props?: { nodeId?: string } }[]) {
            if (inline?.type === "mention" && !ids.has(inline.props?.nodeId ?? "")) {
              danglingMentions.push(node.name);
            }
          }
        }
      }
      const friends = (node.properties?.friends ?? []) as string[];
      for (const id of friends) if (!ids.has(id)) danglingMentions.push(node.name);
    }
    expect(danglingMentions).toEqual([]);
  });

  it("includes the hard cases, and gives the colliding names distinct filenames", () => {
    const names = nodes.map((node) => node.name);
    expect(names.filter((name) => name === "Duplicate Name")).toHaveLength(3);
    expect(names.some((name) => name.length > 96)).toBe(true);
    expect(names.some((name) => /[<>:"/\\|?*]/.test(name))).toBe(true);

    const duplicates = files.filter((file) => file.node.name === "Duplicate Name");
    const paths = duplicates.map((file) => [...file.dirSegments, file.fileName].join("/"));
    expect(new Set(paths).size).toBe(3);
  });

  it("produces the same world twice from the same seed", () => {
    const second = mkdtempSync(join(tmpdir(), "anamnesis-test-world-"));
    try {
      execFileSync(process.execPath, [GENERATOR, "--out", second, "--pages", "40", "--seed", "3", "--force"], {
        stdio: "pipe",
      });
      const before = files.map((file) => [...file.dirSegments, file.fileName].join("/")).sort();
      const after = collectNodeFiles(second)
        .map((file) => [...file.dirSegments, file.fileName].join("/"))
        .sort();
      expect(after).toEqual(before);
    } finally {
      rmSync(second, { recursive: true, force: true });
    }
  });

  it("refuses to overwrite a directory it did not generate", () => {
    const stranger = mkdtempSync(join(tmpdir(), "anamnesis-not-ours-"));
    // Not empty: an empty directory is a fine place to write, and the guard
    // says so. What must never be touched is a directory with someone's
    // things already in it.
    writeFileSync(join(stranger, "someones-real-work.json"), "{}");
    try {
      execFileSync(process.execPath, [GENERATOR, "--out", stranger, "--pages", "5"], { stdio: "pipe" });
      throw new Error("expected the generator to refuse");
    } catch (error) {
      expect(String((error as { stderr?: Buffer }).stderr ?? error)).toContain("Refusing to write");
    } finally {
      rmSync(stranger, { recursive: true, force: true });
    }
  });
});
