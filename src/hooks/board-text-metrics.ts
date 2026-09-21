// The drawing library's text measuring, answered with the marks hidden
// (Phase 32, step 14).
//
// The library measures every line it wraps or sizes a box for through one
// provider, and lets the host supply it. This one reads the runs out of
// `services/board-text` and measures each in its own font, so a box with
// `**bold**` in it is as wide as the drawn bold word — not as wide as the
// stars — and a bound line wraps where the drawn words need it to. The
// provider also carries the two readers the patched drawing needs
// (`richLines`, `runFont`): the library's canvas and SVG text drawing,
// patched in `scripts/excalidraw-patch.mjs`, take them off the provider
// rather than reaching into the app.
//
// A hook-layer file rather than a service because it holds a canvas and
// talks to the library; installed by the board the first time it draws
// and by the exports before they draw, whichever comes first.
import { measuredLineWidth, richLines, runFont } from "../services/board-text";

type TextMetricsLibrary = {
  setCustomTextMetricsProvider: (provider: { getLineWidth: (text: string, font: string) => number }) => void;
};

let measuringCanvas: HTMLCanvasElement | null = null;

/** The advance width of `text` set in `font`, the measure the library itself uses. */
export function measureBoardText(text: string, font: string): number {
  measuringCanvas ??= document.createElement("canvas");
  const context = measuringCanvas.getContext("2d");
  if (!context) return 0;
  context.font = font;
  return context.measureText(text).width;
}

let installed = false;

/** Gives the library the mark-aware measuring, once; safe to call again. */
export function installBoardTextMetrics(library: TextMetricsLibrary): void {
  if (installed) return;
  installed = true;
  library.setCustomTextMetricsProvider({
    getLineWidth: (text: string, font: string) => measuredLineWidth(text, font, measureBoardText),
    // Read by the patched drawing — see scripts/excalidraw-patch.mjs.
    richLines,
    runFont,
  } as { getLineWidth: (text: string, font: string) => number });
}
