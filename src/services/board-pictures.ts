// A board's pictures, held in the world's library rather than in the board
// file. Phase 32, step 4.
//
// The drawing library carries every picture as a data URL in its `files`
// map, and the spike wrote that map to `_board.json` as it came: three
// photos made a three-megabyte drawing file, and the Assets tab could not
// see them. Now a picture on a board is a file in `assets/` like a page's
// portrait — one picture on six boards is one file — and the board file
// holds only the library's file id, the type, and the asset's name. The
// bytes are read back into a data URL when the board opens, which is the
// only form the library takes.
//
// Pure. The reading and writing of files is the store's and the hook's;
// this is the shape of what is stored and the arithmetic between a data
// URL and bytes.
import type { Board } from "../constants/schema";
import { bookmarkOf } from "./bookmark-service";

/** A picture as `_board.json` holds it: the library's id, its type, and the asset it lives in. */
export type StoredPicture = { id: string; mimeType: string; asset: string };

/** A picture as the drawing library takes it: the same id, with the bytes as a data URL. */
export type PictureFile = { id: string; mimeType: string; dataURL: string; created: number };

/** The library's form of a picture read out of `assets/`. */
export function pictureFile(id: string, mimeType: string, bytes: Uint8Array): PictureFile {
  return { id, mimeType, dataURL: encodeDataUrl(bytes, mimeType), created: Date.now() };
}

/**
 * Which formats a board picture can be. The library's own list, minus the
 * ones it cannot draw; the extension is what the file is stored under.
 */
const FORMATS: ReadonlyArray<[mimeType: string, extension: string]> = [
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/gif", "gif"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
  ["image/bmp", "bmp"],
  ["image/avif", "avif"],
];

/** The asset filename a stored picture points at, or null for a file held any other way. */
export function pictureAsset(file: unknown): string | null {
  const asset = (file as { asset?: unknown } | null)?.asset;
  return typeof asset === "string" && asset.length > 0 ? asset : null;
}

/** The data URL a stored picture still carries — the spike's form, migrated on the next write. */
export function pictureDataUrl(file: unknown): string | null {
  const dataURL = (file as { dataURL?: unknown } | null)?.dataURL;
  return typeof dataURL === "string" && dataURL.startsWith("data:") ? dataURL : null;
}

export function storedPicture(id: string, mimeType: string, asset: string): StoredPicture {
  return { id, mimeType, asset };
}

/** The extension a picture of `mimeType` is stored under; "png" for anything unknown. */
export function extensionForMime(mimeType: string): string {
  return FORMATS.find(([mime]) => mime === mimeType.toLowerCase())?.[1] ?? "png";
}

/** The type of the picture stored under `fileName`, from its extension; PNG for anything unknown. */
export function mimeForFileName(fileName: string): string {
  const extension = (/\.([a-zA-Z0-9]+)$/.exec(fileName)?.[1] ?? "").toLowerCase();
  const found = FORMATS.find(([, ext]) => ext === extension || (extension === "jpeg" && ext === "jpg"));
  return found?.[0] ?? "image/png";
}

/**
 * The bytes inside a data URL, with the type it names. Null for anything
 * that is not a base64 data URL — the library writes nothing else, so
 * anything else is not a picture to keep.
 */
export function decodeDataUrl(dataURL: string): { bytes: Uint8Array; mimeType: string } | null {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataURL);
  if (!match) return null;
  try {
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, mimeType: match[1] };
  } catch {
    return null;
  }
}

/** The data URL for `bytes` of `mimeType` — what the library draws from. */
export function encodeDataUrl(bytes: Uint8Array, mimeType: string): string {
  // In chunks: a spread of a few million bytes into one `fromCharCode` call
  // is more arguments than the engine allows.
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/** A fresh id for a picture the app puts on a board itself; the library's ids are opaque strings too. */
export function newPictureId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * The size a picture is put on the board at: its own, unless its longer
 * side is over `maxSide`, in which case it is scaled to fit — a photograph
 * straight off a camera would otherwise arrive the size of a wall.
 */
export function fittedSize(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide || longest === 0) return { width, height };
  const scale = maxSide / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Every asset a board's pictures live in, each once: the pictures on it,
 * and the picture on each bookmark card (step 5), which is on the element
 * rather than in `files`.
 */
export function boardAssetUses(board: Board): string[] {
  const names = new Set<string>();
  for (const file of Object.values(board.files)) {
    const asset = pictureAsset(file);
    if (asset) names.add(asset);
  }
  for (const element of board.elements) {
    if ((element as { isDeleted?: boolean }).isDeleted) continue;
    const image = bookmarkOf(element)?.image;
    if (image) names.add(image);
  }
  return [...names];
}
