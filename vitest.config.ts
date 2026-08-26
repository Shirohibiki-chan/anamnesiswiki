import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    // **A background agent's worktree lives inside this repo**, at
    // `.claude/worktrees/<name>/`, and it is a full second checkout — every
    // `src/**/*.test.ts` in here exists in there too. Left alone, the unit run
    // silently doubles while one is open: 59 files and 1405 tests were reported
    // as 118 and 2815 on 2026-08-26, which is a number nobody can act on and,
    // worse, a run whose result partly depends on somebody else's branch.
    //
    // Spread over the defaults rather than replacing them — this list is the
    // whole exclusion set, so writing it out by hand would quietly drop
    // `node_modules` and `dist`.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
});
