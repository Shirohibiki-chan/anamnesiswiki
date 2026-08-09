// The only web addresses the app knows. Both are this repository, and neither
// is fetched — they're handed to the system browser when the user presses
// something. The updater's own endpoint is not here: it lives in
// `src-tauri/tauri.conf.json`, which is where the plugin reads it from.

// Where "See everything in this release" goes. `/latest` rather than a
// `/tag/v0.3.0` built from the version string, because the update on offer is
// by definition the latest release — the updater only ever reads
// `releases/latest/download/latest.json` — and a guessed tag can 404 if the
// tag naming ever shifts.
export const RELEASES_PAGE_URL = "https://github.com/Shirohibiki-chan/anamnesiswiki/releases/latest";

// Where a single version's "Read this on GitHub" goes, from Settings → Patch
// Notes. A built tag URL is safe here in a way it isn't for the updater: these
// versions come from RELEASES.md headings, which are the same numbers the tags
// are cut from, and every one of them is already published by the time a build
// carrying it exists. The `v` prefix matches how the tags are named.
export function releaseTagUrl(version: string): string {
  return `https://github.com/Shirohibiki-chan/anamnesiswiki/releases/tag/v${version}`;
}
