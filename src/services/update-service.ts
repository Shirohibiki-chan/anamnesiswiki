// The app's one outbound call that isn't part of an import: asking GitHub
// whether a newer Anamnesis exists. It runs only when the user presses the
// button — nothing here is scheduled, and nothing runs at launch.
//
// What goes out is a plain GET for a static file. No identifier, no project
// data, no page names, nothing about the world open at the time. What comes
// back is a signed manifest; the installer is verified against the public key
// baked into `tauri.conf.json` before it is allowed to run, so a tampered
// download is refused rather than installed. See docs/handoff.md → Updates.
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { openUrl } from "@tauri-apps/plugin-opener";
import { RELEASES_PAGE_URL } from "../constants/links";
import { parseReleaseNotes, type ReleaseNoteBlock } from "./release-notes";

export type PendingUpdate = {
  version: string;
  // The release notes as blocks to render — headings, paragraphs and lists —
  // or empty if the release had none. Parsed rather than passed through as
  // markdown, and parsed into data rather than markup; release-notes.ts says
  // why that distinction is the important one.
  notes: ReleaseNoteBlock[];
  // Kept opaque to callers — it's the plugin's handle for the actual download.
  handle: Update;
};

export type UpdateCheck =
  | { status: "up-to-date" }
  | { status: "available"; update: PendingUpdate }
  | { status: "error"; message: string };

// Everything that can go wrong here is either "no internet" or "the release
// page isn't reachable", and neither is the user's fault or fixable by them
// beyond trying later. The distinction that matters is that failing to check
// is harmless: the copy they have keeps working exactly as it did.
function describeFailure(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const lowered = raw.toLowerCase();

  if (lowered.includes("network") || lowered.includes("dns") || lowered.includes("connect") || lowered.includes("timed out")) {
    return "Couldn't reach the update server — you may be offline. Anamnesis works fine without this; try again whenever you're connected.";
  }
  if (lowered.includes("404") || lowered.includes("not found")) {
    return "There's no published release to compare against yet. Nothing to update to.";
  }
  return `Couldn't check for updates: ${raw}`;
}

export async function checkForUpdate(): Promise<UpdateCheck> {
  try {
    const update = await check();
    if (!update) return { status: "up-to-date" };
    return {
      status: "available",
      update: { version: update.version, notes: parseReleaseNotes(update.body), handle: update },
    };
  } catch (error) {
    return { status: "error", message: describeFailure(error) };
  }
}

export type DownloadProgress = {
  // Bytes received so far, and the total if the server declared one. GitHub
  // does, but the updater's Started event allows it to be absent, so the UI
  // has to cope with a null total rather than divide by it blindly.
  received: number;
  total: number | null;
};

// Downloads, verifies the signature, and runs the installer. Resolves once the
// installer has been handed off — the caller decides whether to relaunch.
export async function installUpdate(
  update: PendingUpdate,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  let received = 0;
  let total: number | null = null;

  await update.handle.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? null;
        onProgress?.({ received, total });
        break;
      case "Progress":
        received += event.data.chunkLength;
        onProgress?.({ received, total });
        break;
      case "Finished":
        onProgress?.({ received: total ?? received, total });
        break;
    }
  });
}

export async function restartApp(): Promise<void> {
  await relaunch();
}

// Hands the releases page to the system browser, for the rest of the notes the
// panel doesn't show. Not a fetch — the app makes no request here, it asks the
// OS to open a link, and only ever this one.
export async function openReleasesPage(): Promise<void> {
  await openUrl(RELEASES_PAGE_URL);
}
