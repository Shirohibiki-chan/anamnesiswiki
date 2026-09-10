// Dropping a folder or a file onto the window to import it (Phase 20).
//
// The front door for an importer that is already folder-shaped: a vault is a
// folder, and dragging it in skips the picker for the case that matters
// most. Obsidian added exactly this in 1.13. The same code path as the
// pickers underneath — this only turns a drop into an `ImportPick`.
//
// **Only the shell can say where a dropped thing lives.** A DOM `File` has a
// name and bytes and no path, and a dropped *folder* has not even bytes —
// Chromium hands the page an empty file named after it. `droppedPath` asks
// the shell; on one that cannot answer, the drop is ignored and the pickers
// remain, which is what Tauri gets (see host-service.ts).
//
// **Listens on the window, on the start screen only.** Inside an open
// project a dropped picture already means something — it goes into the page
// or the Assets tab — and an import replaces what is open, so the two cannot
// share a drop.
import { useEffect, useState } from "react";
import { droppedPath, fileInfo } from "../services/host-service";
import type { ImportPick } from "../services/import-source";

function carriesFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export function useImportDrop(onPick: (pick: ImportPick) => void, enabled: boolean): { dragging: boolean } {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // Enter and leave fire for every child crossed, so the count is what
    // says whether the pointer is still over the window at all.
    let depth = 0;

    function onEnter(event: DragEvent) {
      if (!carriesFiles(event)) return;
      depth += 1;
      setDragging(true);
    }

    function onLeave(event: DragEvent) {
      if (!carriesFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    }

    function onOver(event: DragEvent) {
      if (!carriesFiles(event)) return;
      // Without this the browser navigates to the file instead of dropping it.
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    }

    function onDrop(event: DragEvent) {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const file = event.dataTransfer?.files[0];
      if (!file) return;
      const path = droppedPath(file);
      if (!path) return;
      void fileInfo(path)
        .then((info) => onPick({ kind: info.isDirectory ? "folder" : "file", path }))
        .catch(() => {
          // A path the shell gave but cannot read — nothing to import.
        });
    }

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [onPick, enabled]);

  return { dragging };
}
