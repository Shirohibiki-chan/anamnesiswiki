// The drawing surface itself: Excalidraw, dressed for this app. Board spike,
// 2026-09-13.
//
// **Its own module so it can be loaded late.** The library is a few megabytes
// of JavaScript, and a world with no boards in it should not pay for them at
// launch — PageBoard pulls this in the first time a board is opened, and
// never before.
//
// **A shape can point at a page** (links step). The library gives every shape
// one `link` string and a way to be told when one is clicked; the app adds a
// picker that writes a page link into the selected shape and follows the link
// to the page instead of the browser. Hand-typed names in the library's own
// link box resolve too — see `boardLinkTarget`.
import { CaptureUpdateAction, Excalidraw, MainMenu, newElementWith } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI, ExcalidrawInitialDataState, UIAppState } from "@excalidraw/excalidraw/types";
import { Link2, Maximize2, Minimize2, Unlink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { elementLink } from "../../services/board-service";
import type { BoardLinks } from "../../hooks/use-board-links";
import { NodeIcon } from "../blocks/IconPicker";

// The app holds a drawing opaquely (see `Board` in constants/schema.ts); this
// is the one file that knows what the library's shape is, so the cast lives
// here and nowhere above it.
type Props = {
  initialData: { elements: unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> };
  theme: "light" | "dark";
  onChange: (elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  links: BoardLinks;
};

/** The one selected shape's id, or null when nothing or several are selected. */
function soleSelection(appState: UIAppState): string | null {
  const ids = Object.keys(appState.selectedElementIds).filter((id) => appState.selectedElementIds[id]);
  return ids.length === 1 ? ids[0] : null;
}

export default function BoardCanvas({ initialData, theme, onChange, expanded, onToggleExpand, links }: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  // The picker: null closed, otherwise what she has typed so far.
  const [picking, setPicking] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Clicking anywhere else closes the picker, the storyline picker's rule.
  useEffect(() => {
    if (picking === null) return;
    function onPointerDown(event: PointerEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setPicking(null);
    }
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [picking]);

  /** Writes `link` (or none) into the shape with `elementId`, as one undoable edit. */
  function setLink(elementId: string, link: string | null) {
    const api = apiRef.current;
    if (!api) return;
    api.updateScene({
      elements: api.getSceneElements().map((element) => (element.id === elementId ? newElementWith(element, { link }) : element)),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    setPicking(null);
  }

  return (
    <Excalidraw
      excalidrawAPI={(api) => {
        apiRef.current = api;
      }}
      initialData={initialData as unknown as ExcalidrawInitialDataState}
      theme={theme}
      onChange={(elements, appState, files) => onChange(elements, appState as unknown as Record<string, unknown>, files)}
      // Every link goes through the app: a page link opens the page, and a
      // web address goes to the real browser through the host rather than
      // through `window.open`, which the Electron shell refuses.
      onLinkOpen={(element, event) => {
        event.preventDefault();
        if (element.link) links.openLink(element.link);
      }}
      // The library's own open/save-to-file actions are the desktop app's
      // job, not the board's: the drawing is already saved, in the page.
      UIOptions={{
        canvasActions: {
          loadScene: false,
          saveToActiveFile: false,
          toggleTheme: false,
        },
      }}
      // Expand and the page-link picker sit in the library's own top-right
      // slot, beside its Library button, rather than floating over it — the
      // one place the library promises to keep clear for the host.
      renderTopRightUI={(_isMobile, appState) => {
        const selectedId = soleSelection(appState);
        const selected = selectedId ? apiRef.current?.getSceneElements().find((element) => element.id === selectedId) : undefined;
        const current = selected ? elementLink(selected) : null;
        const linked = links.linkedPage(current);
        const candidates = picking !== null ? links.candidates(picking) : [];
        return (
          <>
            {selected && (
              <div className="board-picker-anchor" ref={pickerRef}>
                <button
                  type="button"
                  className="board-top-button board-link-button"
                  data-linked={linked ? "true" : "false"}
                  aria-expanded={picking !== null}
                  onClick={() => setPicking((open) => (open === null ? "" : null))}
                  title={linked ? `Linked to ${linked.name}` : "Link this shape to a page"}
                  aria-label={linked ? `Linked to ${linked.name}` : "Link this shape to a page"}
                >
                  <Link2 size={16} />
                  <span className="board-link-label">{linked ? linked.name : "Link to Page"}</span>
                </button>
                {picking !== null && (
                  <div className="board-picker" role="dialog" aria-label="Link this shape to a page">
                    <input
                      type="text"
                      className="property-field-input"
                      placeholder="Search pages…"
                      aria-label="Search pages to link this shape to"
                      value={picking}
                      autoFocus
                      onChange={(event) => setPicking(event.target.value)}
                      onKeyDown={(event) => {
                        // The library listens to the whole window for its
                        // tool shortcuts; typing a page name must not switch
                        // tools under her.
                        event.stopPropagation();
                        if (event.key === "Escape") setPicking(null);
                        if (event.key === "Enter" && candidates.length > 0) setLink(selected.id, links.pageLinkFor(candidates[0].id));
                      }}
                      onKeyUp={(event) => event.stopPropagation()}
                    />
                    {picking.trim() && candidates.length === 0 && (
                      <p className="board-picker-empty">No page by that name.</p>
                    )}
                    {candidates.map((candidate) => (
                      <button
                        type="button"
                        key={candidate.id}
                        className="board-picker-row"
                        onClick={() => setLink(selected.id, links.pageLinkFor(candidate.id))}
                      >
                        <NodeIcon icon={candidate.icon} templateKey={candidate.templateKey} size={14} />
                        <span className="board-picker-name">{candidate.name}</span>
                      </button>
                    ))}
                    {current && (
                      <button type="button" className="board-picker-row board-picker-unlink" onClick={() => setLink(selected.id, null)}>
                        <Unlink size={14} />
                        <span className="board-picker-name">Remove the link</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              className="board-top-button board-expand"
              onClick={onToggleExpand}
              aria-label={expanded ? "Shrink the board back into the page" : "Expand the board to fill the window"}
              title={expanded ? "Shrink" : "Expand"}
            >
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </>
        );
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
