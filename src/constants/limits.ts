// Hard numeric limits. See docs/constants-and-theming.md §Key Constants.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB — Phase 6's ImageSlot upload

// Caps for the Cmd+K search palette. The result cap keeps a one-letter query
// from rendering a row per page in a 75-page world.
export const MAX_SEARCH_RESULTS = 40;

// How much prose a result row shows around the match. A row fits roughly 88
// characters, less whatever the tab label in front of it takes — measured at
// ~77 for a short label and ~64 for a long one like "Relationships (hidden)".
// The window is centred on the match, so half of it is leading context, and
// the match stays on screen as long as that half clears the narrower figure.
// 100 leaves real headroom there; the trailing few characters may be clipped
// by the row's own ellipsis, which costs nothing but context already past the
// thing she was looking for.
export const SEARCH_SNIPPET_CHARS = 100;

// **Not a limit the app enforces.** It used to refuse any path over 200
// characters, on the old Windows MAX_PATH of 260, with 60 held back on the
// theory that a node's children run longer than its own path. That was wrong
// twice: the check already ran on the node's own full file path, and a child
// too long to write fails its own check when it's written. All the headroom
// bought was refusing pages the OS would have taken — five levels of ordinary
// page names under `OneDrive\Documents\Anamnesis` comes to 203, which the user
// hit on 2026-08-11 with a project nothing else objected to.
//
// Measured rather than assumed, on Windows 11 with `LongPathsEnabled` (on by
// default there): Rust's `std::fs` — what Tauri's fs plugin calls — wrote,
// read and listed a **1021-character** path without complaint, and so did
// PowerShell and .NET. The 260 ceiling this was designed around isn't the
// ceiling any more, and guessing at a replacement produced false refusals
// rather than safety.
//
// So the OS decides, and a failed write is reported through the save-error
// channel like any other. This number is used only to *explain* a failure that
// already happened: past this length "the path is very long" is worth saying,
// because the path is unreadable at that size and a raw OS error tells the
// user nothing they can act on. Below it the original error passes through
// untouched. Nothing is refused on the strength of it.
export const LONG_PATH_ADVICE_CHARS = 260;

// This one *is* enforced, because it's a limit that hasn't moved: NTFS allows
// 255 characters per individual file or folder name, long-path support or not.
// So one absurd name — a pasted paragraph as a page title — is shortened on
// disk rather than failing. The page keeps its full name: that lives in the
// JSON, and the tree reads names from there, never from the filename.
//
// 96 is well clear of anything real — the longest name in the user's worlds is
// 44 characters — which matters, because lowering this later would change
// where existing pages resolve to and leave their old files behind.
export const MAX_SEGMENT_CHARS = 96;

// How many versions Settings → Patch Notes offers, and the start screen's New
// Releases in the rail — one number, since both are the same list of recent
// versions shown at two sizes. Three is enough to cover "what changed
// recently" without either one becoming an archive — the whole history is on
// the releases page, one link away from both.
export const PATCH_NOTES_VERSION_COUNT = 3;

// How many LK pictures an import downloads at once. Strictly one at a time
// made a 53-picture world take about a minute with the window looking frozen;
// a small pool cuts that without leaning on someone else's server.
export const IMPORT_IMAGE_CONCURRENCY = 6;

// How much of a page a hover preview shows. Bigger than a search snippet
// because it answers a different question: a snippet proves a match, and a
// preview is meant to save you the trip. Four or five lines at the card's
// width — enough to recognise which Valera this is, short enough that reading
// it is faster than following the link.
export const PREVIEW_EXCERPT_CHARS = 280;

// How far the lightbox will zoom, and by how much per step. 1 is fit-to-window
// and also the floor: a picture smaller than the window is shown at the size it
// fits, never blown up past it, so "zoom out" bottoms out at the whole picture
// on screen rather than a stamp in the middle of it. 8 is past the point where
// anything is legible and exists to stop a trackpad flick zooming to infinity.
//
// The step is shared by the buttons, the +/- keys and one notch of the wheel,
// so a notch and a click move by the same amount.
export const LIGHTBOX_MIN_SCALE = 1;
export const LIGHTBOX_MAX_SCALE = 8;
export const LIGHTBOX_ZOOM_STEP = 1.3;

// How many steps the page's breadcrumb trail shows before it folds its middle
// away behind an ellipsis. Counts the ancestors only — the project name at the
// front and the page itself at the end are always shown, so four here is a
// six-crumb bar at its widest.
//
// Four rather than two because the trail is also the answer to "where am I",
// and a page three levels down is common enough in this user's worlds that
// hiding a step there would fold something away far more often than not. Past
// four it stops being read as a path and starts being read as a wall.
export const BREADCRUMB_MAX_ANCESTORS = 4;

// Resizing a picture in a page from the keyboard (Phase 16). Both numbers are
// deliberately BlockNote's own: 64px is the floor its drag handles clamp to,
// and the ceiling — the editor's width — is read from the same expression they
// use, so a picture dragged to the edge and one pressed to the edge stop in the
// same place.
//
// A factor rather than a pixel step, so one press does the same *amount* to a
// thumbnail as to a picture running the width of the page. 10% is small enough
// to land on a size you meant and large enough that holding the key gets
// somewhere: seven presses roughly halve a picture.
export const IMAGE_MIN_PREVIEW_WIDTH = 64;
export const IMAGE_RESIZE_STEP = 1.1;

// How long the pointer has to stay on a link before its preview appears. This
// number is the difference between a convenience and something you learn to
// steer around: with no delay, a card fires on every link the pointer crosses
// on its way somewhere else. Matches what Obsidian settled on.
export const HOVER_PREVIEW_DELAY_MS = 350;

// How many folders the picture library's dropdown needs before it grows a
// filter box. Below this the list is quicker to read than to type at, and a
// search field over four rows is a control asking to be used. Raised as a real
// problem at fifty (2026-08-18); eight is where scanning starts to lose.
export const ASSET_FOLDER_FILTER_MIN = 8;

// How long a start-screen group's name may be. Groups are drawn as chips in a
// single row above the project grid, so the cap is about that row rather than
// about storage: past roughly this length one chip is the whole row and the
// rest are off the end of it. Enforced when the name is stored, not while she
// types, so a paste that runs long is trimmed rather than refused.
export const MAX_GROUP_NAME_CHARS = 40;
