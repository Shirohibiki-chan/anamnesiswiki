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
