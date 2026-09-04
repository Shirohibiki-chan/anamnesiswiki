var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// @ts-expect-error process is a nodejs global
var host = process.env.TAURI_DEV_HOST;
// Which shell this build is for (Phase 29). Unset means Tauri, which is still
// the shipped one — nothing changes for `pnpm tauri dev`, `pnpm build` or the
// test run until step 3 flips it.
// @ts-expect-error process is a nodejs global
var shell = (_a = process.env.ANAMNESIS_SHELL) !== null && _a !== void 0 ? _a : "tauri";
var forElectron = shell === "electron";
/**
 * Sends every `host-service` import to the shell this build is for.
 *
 * **Resolved rather than aliased on purpose.** The app imports the door as
 * `./host-service` and `../services/host-service`, and a string alias would
 * have to guess at both spellings; asking Vite to resolve the sibling file
 * cannot get the path wrong. Nothing above the door changes either way — that
 * is the point of Phase 29 step 1.
 */
function shellResolver() {
    return {
        name: "anamnesis-shell",
        enforce: "pre",
        resolveId: function (source, importer, options) {
            return __awaiter(this, void 0, void 0, function () {
                var resolved;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!forElectron || !source.endsWith("host-service"))
                                return [2 /*return*/, null];
                            return [4 /*yield*/, this.resolve("".concat(source, ".electron"), importer, __assign(__assign({}, options), { skipSelf: true }))];
                        case 1:
                            resolved = _a.sent();
                            return [2 /*return*/, resolved !== null && resolved !== void 0 ? resolved : null];
                    }
                });
            });
        },
    };
}
// https://vite.dev/config/
export default defineConfig(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, ({
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
                            host: host,
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
            })];
    });
}); });
