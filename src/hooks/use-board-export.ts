// The pictures of the boards an export carries (Phase 32, step 7), drawn
// by the drawing library from each board as it is in the store.
//
// A hook-layer file rather than a service because the drawing library is
// what draws the picture, and it is loaded here the way `PageBoard` loads
// it — late, the first time it is needed, so an export of a world with no
// boards never pays for it. `use-export-world.ts` has the same shape: a
// plain function every export calls, at click time.
import type { Board } from "../constants/schema";
import { BOARD_EXPORT_PADDING, LIBRARY_DEFAULT_BACKGROUND } from "../constants/board";
import { boardHasDrawing, exportableElements, isBoardPage, type BoardPictures } from "../services/board-export";
import { mimeForFileName, pictureAsset, pictureFile, type PictureFile } from "../services/board-pictures";
import { collectSubtree } from "../services/export-walk";
import { installBoardTextMetrics } from "./board-text-metrics";
import { readAssetImage } from "../services/filesystem-service";
import { useProjectStore } from "../state/project-store";

/** A board's pictures out of the world's library, as the library takes them; one whose file is gone is left out. */
async function readPictures(rootPath: string, board: Board): Promise<PictureFile[]> {
  const read = await Promise.all(
    Object.entries(board.files).map(async ([id, file]) => {
      const asset = pictureAsset(file);
      if (!asset) return null;
      try {
        return pictureFile(id, mimeForFileName(asset), await readAssetImage(rootPath, asset));
      } catch {
        return null;
      }
    }),
  );
  return read.filter((file): file is PictureFile => file !== null);
}

/**
 * A PNG of every board among the pages being exported, by board page id.
 * A board with nothing on it gets no picture; a board whose picture will
 * not draw is left out too, and its page says nothing of it — the same
 * outcome as before this existed.
 */
export async function renderBoardPictures(rootIds: string[]): Promise<BoardPictures> {
  const { nodes, boards, rootPath } = useProjectStore.getState();
  const all = Object.values(nodes);
  const wanted = collectSubtree(rootIds, all);
  const boardNodes = all.filter((node) => wanted.has(node.id) && isBoardPage(node) && boardHasDrawing(boards[node.id]));
  const pictures: BoardPictures = {};
  if (boardNodes.length === 0) return pictures;

  const library = await import("@excalidraw/excalidraw");
  const { convertToExcalidrawElements, exportToBlob } = library;
  // The marks in a text box's words are drawn, not shown, in the picture
  // too (step 14) — the library reads them off the app's measuring.
  installBoardTextMetrics(library);
  const pageName = (id: string) => nodes[id]?.name ?? null;

  for (const node of boardNodes) {
    const board = boards[node.id];
    try {
      const elements = exportableElements(board.elements as never[], pageName, (skeleton) => convertToExcalidrawElements([skeleton as never], { regenerateIds: false }) as never[]);
      const files = rootPath ? await readPictures(rootPath, board) : [];
      const background = board.appState.viewBackgroundColor;
      const blob = await exportToBlob({
        elements: elements as never,
        appState: {
          exportBackground: true,
          exportWithDarkMode: false,
          viewBackgroundColor: typeof background === "string" ? background : LIBRARY_DEFAULT_BACKGROUND,
        },
        files: Object.fromEntries(files.map((file) => [file.id, file])) as never,
        mimeType: "image/png",
        exportPadding: BOARD_EXPORT_PADDING,
      });
      pictures[node.id] = new Uint8Array(await blob.arrayBuffer());
    } catch (error) {
      console.warn(`The board "${node.name}" would not draw for the export.`, error);
    }
  }
  return pictures;
}
