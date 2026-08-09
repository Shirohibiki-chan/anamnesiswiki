// Feeds Settings → Patch Notes. Nothing here is async and nothing fetches:
// RELEASES.md is bundled into the app, so the panel has its content before it
// paints. See services/release-history.ts for why it's bundled rather than
// pulled from GitHub.
import { useMemo } from "react";
import { PATCH_NOTES_VERSION_COUNT } from "../constants/limits";
import { parseReleaseNotes, type ReleaseNoteBlock } from "../services/release-notes";
import { recentReleases } from "../services/release-history";
import { openReleaseTag } from "../services/update-service";

export type ShownRelease = {
  version: string;
  date: string | null;
  blocks: ReleaseNoteBlock[];
};

export function useReleaseHistory() {
  // The file never changes while the app is running — it's a build artefact —
  // so this parses once for the life of the process rather than on every
  // switch between version tabs.
  const releases = useMemo<ShownRelease[]>(
    () =>
      recentReleases(PATCH_NOTES_VERSION_COUNT).map((entry) => ({
        version: entry.version,
        date: entry.date,
        blocks: parseReleaseNotes(entry.body),
      })),
    [],
  );

  return { releases, openOnGitHub: openReleaseTag };
}
