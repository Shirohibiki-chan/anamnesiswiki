// The trip-wire that says the tutorial has fallen behind the app.
//
// **This is the reminder, and it is a test rather than a note because a note
// gets read by whoever already remembered.** The tour points at four elements
// by `data-tour` attribute. Somebody rearranging the shell a phase from now has
// no reason to know that, and the failure they would otherwise cause is silent:
// a step that quietly stops being drawn, or a tour that has three steps instead
// of four for everybody installing from then on. Neither shows up in a build,
// in a typecheck, or in any other test — the only witness is a person taking the
// tour on a fresh install, which is nobody who works on this.
//
// So: the attributes in the components and the anchors in `tour.ts` have to be
// the same set, and this fails loudly in both directions when they are not.
// **If it fails because the interface has genuinely moved, the fix is to update
// the tour — the step's wording as well as its anchor — not to loosen this.**
//
// **It lives in `scripts/` because it reads the repository off disk.**
// `tsconfig.json` covers `src` only and gives it no Node types, which is what
// stops `node:fs` being imported into a service by accident — a boundary worth
// more than this file's tidiness. `make-test-world.test.ts` is here for the
// same reason and runs in the same `pnpm test`.
//
// The example world has its own version of this alarm, in
// `services/example-world.test.ts`: every tab id and property key it writes into
// is checked against `template-registry`, so a template that gains a tab or
// renames a field fails there rather than leaving the world half-written.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TOUR_STEPS } from "../src/constants/tour";

const COMPONENTS = join(process.cwd(), "src", "components");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

/** Every `data-tour="…"` the app actually carries, and which file it is in. */
function anchorsInComponents(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of sourceFiles(COMPONENTS)) {
    for (const match of readFileSync(file, "utf8").matchAll(/data-tour="([^"]+)"/g)) {
      found.set(match[1], file);
    }
  }
  return found;
}

describe("the tour still points at the app", () => {
  const carried = anchorsInComponents();

  it("has something to point at for every step", () => {
    for (const step of TOUR_STEPS) {
      expect(
        carried.has(step.anchor),
        `The tour's "${step.id}" step points at data-tour="${step.anchor}" and nothing in src/components carries it. ` +
          `If that part of the app moved or was renamed, move the attribute with it and check the step's wording still describes what is there.`,
      ).toBe(true);
    }
  });

  it("has a step for every anchor the app carries", () => {
    const wanted = new Set(TOUR_STEPS.map((step) => step.anchor));
    for (const [anchor, file] of carried) {
      expect(
        wanted.has(anchor),
        `${file} carries data-tour="${anchor}" and no tour step uses it — either the step was removed and the attribute left behind, or a step is missing.`,
      ).toBe(true);
    }
  });

  it("says something in every step", () => {
    // Cheap, and it is the other half of "the tutorial fell behind": a step
    // whose wording was emptied while somebody was editing is a card with a
    // title and a blank space under it.
    for (const step of TOUR_STEPS) {
      expect(step.title.trim().length, step.id).toBeGreaterThan(0);
      expect(step.body.trim().length, step.id).toBeGreaterThan(20);
    }
  });
});
