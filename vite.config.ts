import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// Which shell this build is for (Phase 29). Unset means Tauri, which is still
// the shipped one — nothing changes for `pnpm tauri dev`, `pnpm build` or the
// test run until step 3 flips it.
// @ts-expect-error process is a nodejs global
const shell: string = process.env.ANAMNESIS_SHELL ?? "tauri";
const forElectron = shell === "electron";

/**
 * Sends every `host-service` import to the shell this build is for.
 *
 * **Resolved rather than aliased on purpose.** The app imports the door as
 * `./host-service` and `../services/host-service`, and a string alias would
 * have to guess at both spellings; asking Vite to resolve the sibling file
 * cannot get the path wrong. Nothing above the door changes either way — that
 * is the point of Phase 29 step 1.
 */
function shellResolver(): Plugin {
  return {
    name: "anamnesis-shell",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!forElectron || !source.endsWith("host-service")) return null;
      const resolved = await this.resolve(`${source}.electron`, importer, {
        ...options,
        skipSelf: true,
      });
      return resolved ?? null;
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [shellResolver(), react(), tailwindcss()],

  // An Electron build is opened from a file rather than served, so its asset
  // URLs have to be relative. The Tauri build keeps absolute paths.
  base: forElectron ? "./" : "/",

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  server: {
    // 2. tauri expects a fixed port, fail if that port is not available.
    //    The Electron dev server takes a different one so both shells can run
    //    side by side while Phase 29 is being built — see scripts/electron-dev.mjs.
    port: forElectron ? 1430 : 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`, and the two build outputs.
      //
      // **`release` is not housekeeping — a watcher on it breaks packaging.**
      // electron-builder extracts ~370MB of Electron into `release/…tmp` and
      // then renames that directory into place, and a file watcher holding a
      // handle inside it makes the rename fail with EPERM every time. Found
      // 2026-08-25: the same build succeeded immediately when its output went
      // anywhere outside this folder. A dev server has no business watching
      // build output anyway.
      ignored: ["**/src-tauri/**", "**/release/**", "**/dist/**"],
    },
  },
}));
