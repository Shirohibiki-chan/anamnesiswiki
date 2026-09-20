// A video on a board (Phase 32, step 12): a file in the world's library,
// played where it lands.
//
// **The board holds the file's name and nothing else.** The picture route
// (step 4) already made the library the home of anything a board shows,
// and a video is the same case with bigger bytes: the file goes into
// `assets/` once, the element carries its name in `customData`, and the
// player reads the file when it is drawn. No bytes in the board file, no
// second copy for a second board.
//
// **An embed, drawn by the app**, like a page card, a bookmark and a note —
// its link, `anamnesis://video`, only says what it is. Reading `customData`
// off it is the named exception `docs/handoff.md` § Boards allows.
import { BOARD_VIDEO_LINK } from "../constants/board";

/**
 * The file extensions a dropped file is taken as a video by. What the
 * window's own player plays: the shell is Chromium with its usual codecs,
 * so MP4 (H.264/AAC), WebM and Ogg; MOV and M4V are MP4 containers under
 * another name and usually play. Lowercased before the check.
 */
export const VIDEO_EXTENSIONS = ["mp4", "m4v", "mov", "webm", "ogv", "ogg"] as const;

export type Video = { file: string };

/** Whether `fileName` is a video by its extension. */
export function isVideoFileName(fileName: string): boolean {
  const extension = (/\.([a-zA-Z0-9]+)$/.exec(fileName)?.[1] ?? "").toLowerCase();
  return (VIDEO_EXTENSIONS as readonly string[]).includes(extension);
}

/** Whether `element` is a video: an embed whose link is the video link. */
export function isVideo(element: unknown): boolean {
  const record = element as { type?: unknown; link?: unknown };
  return record.type === "embeddable" && record.link === BOARD_VIDEO_LINK;
}

/** The video an element holds, or null for anything that is not one — including a video element with no file named. */
export function videoOf(element: unknown): Video | null {
  if (!isVideo(element)) return null;
  const file = (element as { customData?: { video?: { file?: unknown } } }).customData?.video?.file;
  return typeof file === "string" && file.length > 0 ? { file } : null;
}
