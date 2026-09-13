// The drawing surface itself: Excalidraw, dressed for this app. Board spike,
// 2026-09-13.
//
// **Its own module so it can be loaded late.** The library is a few megabytes
// of JavaScript, and a world with no boards in it should not pay for them at
// launch — PageBoard pulls this in the first time a board is opened, and
// never before.
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import { Maximize2, Minimize2 } from "lucide-react";

// The app holds a drawing opaquely (see `Board` in constants/schema.ts); this
// is the one file that knows what the library's shape is, so the cast lives
// here and nowhere above it.
type Props = {
  initialData: { elements: unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> };
  theme: "light" | "dark";
  onChange: (elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => void;
  expanded: boolean;
  onToggleExpand: () => void;
};

export default function BoardCanvas({ initialData, theme, onChange, expanded, onToggleExpand }: Props) {
  return (
    <Excalidraw
      initialData={initialData as unknown as ExcalidrawInitialDataState}
      theme={theme}
      onChange={(elements, appState, files) => onChange(elements, appState as unknown as Record<string, unknown>, files)}
      // Expand sits in the library's own top-right slot, beside its Library
      // button, rather than floating over it — the one place the library
      // promises to keep clear for the host.
      renderTopRightUI={() => (
        <button
          type="button"
          className="board-expand"
          onClick={onToggleExpand}
          aria-label={expanded ? "Shrink the board back into the page" : "Expand the board to fill the window"}
          title={expanded ? "Shrink" : "Expand"}
        >
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      )}
      // The library's own open/save-to-file actions are the desktop app's
      // job, not the board's: the drawing is already saved, in the page.
      UIOptions={{
        canvasActions: {
          loadScene: false,
          saveToActiveFile: false,
          toggleTheme: false,
        },
      }}
    >
      {/* The default menu links out to Excalidraw's own site and socials.
          This one keeps the three things that act on the drawing. */}
      <MainMenu>
        <MainMenu.DefaultItems.SaveAsImage />
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.Separator />
        <MainMenu.DefaultItems.ChangeCanvasBackground />
      </MainMenu>
    </Excalidraw>
  );
}
