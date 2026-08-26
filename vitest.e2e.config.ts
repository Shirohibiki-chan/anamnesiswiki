// The scenarios that drive the real app. Separate from `vitest.config.ts`, and
// separate on purpose.
//
// **The unit run must stay fast and must stay runnable anywhere.** `pnpm test`
// is 700-odd tests of pure logic in a few seconds with no display, no build and
// no window; these launch a whole desktop app per file and need a screen to put
// it on. Folding them together would make the quick check slow and the slow
// check the only one anybody runs.
//
// Files are named `*.e2e.ts` rather than `*.test.ts` so the two suites cannot
// pick each other up by accident, whatever either config later says.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["e2e/**/*.e2e.ts"],

    // **One app at a time.** Each file starts its own Electron process against
    // its own generated world, and several of those competing for one machine's
    // window manager is the classic way to get a suite that fails differently
    // every run. Slower and true beats faster and unreliable — the whole point
    // of this suite is being able to believe it.
    fileParallelism: false,

    // Generous, because these wait on real work: a world written to disk, a
    // process started, a page loaded. A scenario that is genuinely stuck still
    // ends, it just takes a minute to say so.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
