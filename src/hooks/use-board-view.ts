// How a board's drawing gets from the drawing library onto disk, and which
// theme it is drawn in. Board spike, 2026-09-13. The component renders; this
// decides when a change is worth writing.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Board } from "../constants/schema";
import { assetFileName } from "../services/asset-urls";
import {
  decodeDataUrl,
  extensionForMime,
  mimeForFileName,
  newPictureId,
  pictureAsset,
  pictureDataUrl,
  pictureFile,
  type PictureFile,
} from "../services/board-pictures";
import { boardFingerprint, boardFromScene, boardStartState } from "../services/board-service";
import { readAssetImage } from "../services/filesystem-service";
import { useProjectStore } from "../state/project-store";
import { useBoard, useSetBoard } from "./use-board";

/**
 * How long the drawing has to hold still before it is written. The library
 * reports a change on every pointer move; a stroke is dozens of them, and
 * writing a JSON file per pixel would be the one thing that made the board
 * feel slow.
 */
const SETTLE_MS = 600;

/**
 * Which of the library's two looks the app's current theme wants.
 *
 * The app's themes carry no light/dark flag — a theme is a set of tokens and
 * nothing more — so the answer is read off the page background: a dark
 * surface gets the dark board. Measured when the board mounts and again
 * whenever the theme moves — see `useBoardTheme`.
 */
function boardThemeFor(element: Element | null): "light" | "dark" {
  if (!element) return "dark";
  const color = getComputedStyle(element).backgroundColor;
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (!match) return "dark";
  const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.5 ? "light" : "dark";
}

/**
 * The look the board is drawn in, following the theme while the board is
 * open (Phase 32, step 8). A theme is applied by three things and nothing
 * else — `data-theme` on the root, tokens set in the root's own `style`
 * (the theme editor, the font scale), and the `<style>` elements in the
 * head that a custom theme or a snippet writes into — so those are what
 * is watched, and the surface is measured again on any of them. Measuring
 * is a computed style, which is cheap enough to do on every change
 * without guessing which ones matter.
 */
function useBoardTheme(surface: Element | null): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">(() => boardThemeFor(surface));
  useEffect(() => {
    const measure = () => setTheme(boardThemeFor(surface));
    measure();
    if (!surface) return;
    const observer = new MutationObserver(measure);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style", "class"] });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [surface]);
  return theme;
}

export function useBoardView(boardId: string, surface: Element | null) {
  const board = useBoard(boardId);
  const setBoard = useSetBoard();
  const rootPath = useProjectStore((state) => state.rootPath);
  const uploadAsset = useProjectStore((state) => state.uploadAsset);
  const pageName = useProjectStore((state) => state.nodes[boardId]?.name ?? "");

  // Which of the library's file ids live in which asset (Phase 32, step
  // 4): everything the file already said, plus every upload that lands
  // and every picture dropped from the Assets tab. What the board is
  // written with, so a picture's bytes never go back into the file once
  // the library has them.
  const assetsRef = useRef<Map<string, string>>(new Map());
  // Uploads in flight or given up on, by file id, so a change report — one
  // per pointer move — starts each upload once.
  const uploadsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  // What is on disk, as a fingerprint, so a change report that changes
  // nothing — a hover, a selection, a menu opening — costs a string compare
  // and no write.
  // The dotted background, the one thing on a board that is the app's
  // rather than the library's. Held here so a toggle writes the file the
  // same way a stroke does, with whatever the library last reported.
  const [dots, setDotsState] = useState(board.dots);
  const dotsRef = useRef(board.dots);
  const sceneRef = useRef<{ elements: readonly unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> }>({
    elements: board.elements,
    appState: board.appState,
    files: board.files,
  });

  const savedRef = useRef(boardFingerprint(board.elements, board.appState, board.dots));
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<Board | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    setBoard(boardId, pending);
  }, [boardId, setBoard]);

  /**
   * Puts every picture the library holds only as bytes into the world's
   * library, and writes the board again once each is there. A picture
   * pasted or dropped on the board arrives this way, and so does one the
   * spike wrote into the file as a data URL — that is the migration, and
   * it happens the first time such a board is opened.
   */
  const adoptPictures = useCallback(
    (files: Record<string, unknown>) => {
      for (const [id, file] of Object.entries(files)) {
        if (assetsRef.current.has(id) || uploadsRef.current.has(id)) continue;
        const dataURL = pictureDataUrl(file);
        if (!dataURL) continue;
        const decoded = decodeDataUrl(dataURL);
        if (!decoded) continue;
        uploadsRef.current.add(id);
        const extension = extensionForMime(decoded.mimeType);
        void uploadAsset(decoded.bytes, extension, `${pageName}.${extension}`)
          .then((ref) => {
            const fileName = assetFileName(ref);
            if (!fileName) return;
            assetsRef.current.set(id, fileName);
            // Written now rather than on the next stroke, and only while
            // the board is still open: a write from a board she has left
            // could land on top of edits made since.
            if (!mountedRef.current) return;
            const { elements, appState, files: current } = sceneRef.current;
            pendingRef.current = boardFromScene(elements, appState, current, dotsRef.current, assetsRef.current);
            flush();
          })
          .catch(() => {
            // Left as the data URL in the file, which is no worse than the
            // spike; tried again on the next open, not on the next pointer move.
          });
      }
    },
    [flush, pageName, uploadAsset],
  );

  const onChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => {
      sceneRef.current = { elements, appState, files };
      adoptPictures(files);
      const fingerprint = boardFingerprint(elements, appState, dotsRef.current);
      if (fingerprint === savedRef.current) return;
      savedRef.current = fingerprint;
      pendingRef.current = boardFromScene(elements, appState, files, dotsRef.current, assetsRef.current);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(flush, SETTLE_MS);
    },
    [adoptPictures, flush],
  );

  /**
   * The board's pictures, read out of the library into the form the
   * drawing library takes. The board's elements start without them and
   * the canvas adds them as they arrive — a picture is a placeholder for
   * the moment it takes to read, which is how the library itself treats a
   * picture whose bytes are on their way.
   */
  const readPictures = useCallback(async (): Promise<PictureFile[]> => {
    if (!rootPath) return [];
    const read = await Promise.all(
      Object.entries(board.files).map(async ([id, file]) => {
        const asset = pictureAsset(file);
        if (!asset) return null;
        try {
          return pictureFile(id, mimeForFileName(asset), await readAssetImage(rootPath, asset));
        } catch {
          // A picture whose file is gone stays a placeholder, the honest
          // outcome; its reference is kept, so nothing is written away.
          return null;
        }
      }),
    );
    return read.filter((file): file is PictureFile => file !== null);
    // Read once, for the same reason `initialData` is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, rootPath]);

  /**
   * A picture from the Assets tab, dropped on the board: the library gets
   * it under a fresh id, and the board is written pointing at the asset
   * the picture already is — a second copy of the bytes is what the
   * library exists to avoid.
   */
  const placePicture = useCallback(
    async (fileName: string): Promise<PictureFile | null> => {
      if (!rootPath) return null;
      try {
        const file = pictureFile(newPictureId(), mimeForFileName(fileName), await readAssetImage(rootPath, fileName));
        assetsRef.current.set(file.id, fileName);
        return file;
      } catch {
        return null;
      }
    },
    [rootPath],
  );

  // What the file already knew, and the spike's data URLs put into the
  // library on the way in.
  useEffect(() => {
    mountedRef.current = true;
    for (const [id, file] of Object.entries(board.files)) {
      const asset = pictureAsset(file);
      if (asset) assetsRef.current.set(id, asset);
    }
    adoptPictures(board.files);
    return () => {
      mountedRef.current = false;
    };
    // Once per board, like `initialData`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  // Written at once rather than after the settle delay: a toggle is one
  // deliberate act, not the middle of a stroke.
  const toggleDots = useCallback(() => {
    const next = !dotsRef.current;
    dotsRef.current = next;
    setDotsState(next);
    const { elements, appState, files } = sceneRef.current;
    savedRef.current = boardFingerprint(elements, appState, next);
    pendingRef.current = boardFromScene(elements, appState, files, next, assetsRef.current);
    flush();
  }, [flush]);

  // Leaving the page writes whatever was still settling, so a stroke drawn
  // a moment before clicking away is not the one that gets lost.
  useEffect(() => flush, [flush]);

  // The drawing the library starts from. Read once: after mount the library
  // owns the scene and the store is only ever told about it, never the other
  // way round, so feeding store updates back in would echo every save.
  // Pictures in the library arrive through `readPictures`; the spike's data
  // URLs, which the library can take as they are, go straight in.
  const initialData = useMemo(
    () => ({
      elements: board.elements,
      appState: boardStartState(board.appState),
      files: Object.fromEntries(Object.entries(board.files).filter(([, file]) => pictureDataUrl(file) !== null)),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardId],
  );

  const theme = useBoardTheme(surface);

  /**
   * A video file dropped on the board, put into the world's library (step
   * 12): its name there, or null if it would not read. The file's own name
   * is kept as the library's name for it, as a picked picture's is.
   */
  const placeVideo = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const extension = (/\.([a-zA-Z0-9]+)$/.exec(file.name)?.[1] ?? "mp4").toLowerCase();
        return assetFileName(await uploadAsset(bytes, extension, file.name));
      } catch {
        return null;
      }
    },
    [uploadAsset],
  );

  return { initialData, theme, onChange, dots, toggleDots, readPictures, placePicture, placeVideo };
}
