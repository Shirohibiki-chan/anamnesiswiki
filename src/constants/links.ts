// The only web addresses the app knows. All of them are this repository, and
// none is fetched — they're handed to the system browser when the user presses
// something. The updater's own endpoint is not here: it lives in
// `src-tauri/tauri.conf.json`, which is where the plugin reads it from.

// The repository itself. Every address below is built from it, so a move or a
// rename is one edit here rather than a hunt through three string literals.
const REPO_URL = "https://github.com/Shirohibiki-chan/anamnesiswiki";

// Where "See everything in this release" goes. `/latest` rather than a
// `/tag/v0.3.0` built from the version string, because the update on offer is
// by definition the latest release — the updater only ever reads
// `releases/latest/download/latest.json` — and a guessed tag can 404 if the
// tag naming ever shifts.
export const RELEASES_PAGE_URL = `${REPO_URL}/releases/latest`;

// Where a single version's "Read this on GitHub" goes, from Settings → Patch
// Notes. A built tag URL is safe here in a way it isn't for the updater: these
// versions come from RELEASES.md headings, which are the same numbers the tags
// are cut from, and every one of them is already published by the time a build
// carrying it exists. The `v` prefix matches how the tags are named.
export function releaseTagUrl(version: string): string {
  return `${REPO_URL}/releases/tag/v${version}`;
}

// Where "Open a bug report" goes. The `new` page rather than the issue list,
// with the form picked by name so the fields the app fills in exist — an issue
// opened without a template has nowhere to put them and arrives as one blank
// box. `.github/ISSUE_TEMPLATE/bug_report.yml` is the other half of this; the
// filename below is its filename, and renaming one without the other loses the
// prefill silently.
export const BUG_REPORT_FORM = "bug_report.yml";

// Which field on that form takes what the app knows about itself. GitHub
// prefills a form field from a query parameter named after its `id`, so this
// string appears twice — here and in the yml — and has to match.
export const BUG_REPORT_BUILD_FIELD = "build";

export function bugReportUrl(params: URLSearchParams): string {
  return `${REPO_URL}/issues/new?${params.toString()}`;
}
