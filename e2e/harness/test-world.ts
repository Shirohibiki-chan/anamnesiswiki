// A generated world in a temporary folder, for one test run to open and throw away.
//
// **This wraps `scripts/make-test-world.mjs` rather than reimplementing it.**
// The generator already knows every awkward name and shape worth opening the
// app against, and `scripts/make-test-world.test.ts` already checks that what
// it writes agrees with the app's own path rules. A second world-builder living
// in here would be a second thing to keep in step with the first.
//
// **Never in Documents.** The generator's default output sits beside her real
// projects so a generated world turns up in the picker — right for a world you
// mean to look at by hand, wrong for one a test run deletes. Everything here
// goes to the system temp folder instead, so a crashed run leaves rubbish
// somewhere rubbish is expected and never near anything of hers.
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export type TestWorld = {
  /** The world's folder — what the app is pointed at. */
  path: string;
  /**
   * The name the app will show for it, read from `project.json`.
   *
   * **Not the folder's name**, and the difference is the reason this is here
   * rather than derived: a world is named by the file inside it, so a scenario
   * checking the app opened the right world has to compare against that. The
   * two happen to differ for a generated world, which is a useful accident —
   * asserting on the folder name would have passed for the wrong reason.
   */
  name: string;
  /** How many pages the generator says it wrote. */
  pages: number;
  /** Removes the folder. Safe to call twice, and never throws. */
  dispose: () => Promise<void>;
};

export type TestWorldOptions = {
  /**
   * Roughly how many ordinary pages to fill the world with, before the hard
   * cases and the deep chain are added on top.
   *
   * **Small by default, because most scenarios are not about size.** The
   * awkward names, the nine-level chain and the colliding siblings are all
   * present at any count — they are added whatever this says — so a scenario
   * only needs a big number when the thing under test is bigness itself
   * (scrolling, virtualisation, a search across hundreds of pages).
   */
  pages?: number;
  /** Same seed, same world. Left alone unless a scenario wants a different one. */
  seed?: number;
};

/**
 * Writes a world to a fresh temporary folder and hands back where it is.
 *
 * Runs the generator as a child process rather than importing it: it is a
 * script with a command line, not a module with exports, and shelling out means
 * this keeps working if it grows another flag.
 */
export async function makeTestWorld(options: TestWorldOptions = {}): Promise<TestWorld> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "anamnesis-e2e-"));
  const worldPath = path.join(root, "Test World");

  const args = [
    path.join("scripts", "make-test-world.mjs"),
    "--out",
    worldPath,
    "--force",
    "--pages",
    String(options.pages ?? 40),
  ];
  if (options.seed !== undefined) args.push("--seed", String(options.seed));

  const output = await run(process.execPath, args);
  const pages = Number(/Wrote (\d+) pages/.exec(output)?.[1] ?? 0);
  const project = JSON.parse(await fs.readFile(path.join(worldPath, "project.json"), "utf8"));

  return {
    path: worldPath,
    name: String(project.name),
    pages,
    dispose: () => removeQuietly(root),
  };
}

/**
 * Deletes a folder and swallows whatever goes wrong.
 *
 * **Cleanup must never be able to fail a passing test.** On Windows the app has
 * only just let go of these files — it holds recursive watches on an open world
 * — and a directory removal that lands a few milliseconds early comes back
 * EBUSY. The world is in the temp folder precisely so that leaving one behind
 * costs nothing.
 */
export async function removeQuietly(target: string): Promise<void> {
  try {
    await fs.rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch {
    // Left for the operating system to sweep up.
  }
}

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.stderr.on("data", (chunk) => (err += chunk));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${path.basename(args[0])} exited ${code}\n${err || out}`));
    });
  });
}
