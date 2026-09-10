// The `.anpage` file: one page template, with its pictures, in something
// somebody can send you (Phase 28).
//
// **Not `.antpl`, and the extension is deliberately unlike it.** A `.antpl` is
// a *project's* shape — folders and a blank starter page of each kind,
// described rather than copied, with none of anybody's writing in it. This is
// a *page* template: one page and its subtree, copied whole, prose and
// properties and pictures and all, straight out of the Templates panel. Same
// word in the interface, different unit, different contents. `antpg` or `anpt`
// would sit one character away from `antpl` in a folder listing, which is
// exactly the confusion worth spending a few letters to avoid.
//
// **A bundle rather than one JSON document**, because templates carry their
// pictures (her call, 2026-08-14). A zip holding a manifest and an `assets/`
// folder keeps the pictures as bytes instead of inflating them by a third in
// base64 — and the switch that leaves them out produces the *same* format with
// an empty asset list, not a second one, so importing never has to ask which
// kind it was handed.
export const PAGE_TEMPLATE_FORMAT = "anamnesis-page-template";

export const PAGE_TEMPLATE_VERSION = 1;

/** Without the dot, the way `dialog-service`'s filters want it. */
export const PAGE_TEMPLATE_EXTENSION = "anpage";

/** The manifest inside the bundle. */
export const PAGE_TEMPLATE_MANIFEST = "template.json";

/** Where the pictures sit inside the bundle, if any came. */
export const PAGE_TEMPLATE_ASSETS_DIR = "assets";

/**
 * The ceiling on how many pages one template file may describe.
 *
 * The same reasoning as `MAX_TEMPLATE_NODES` for project templates: this is a
 * file she is handed by another person, and a broken or hand-edited one asking
 * for a hundred thousand pages should be refused with a sentence rather than
 * fill her Templates panel. Lower than that one because a page template is a
 * page and its subtree — a skeleton of a few dozen at the very most.
 */
export const MAX_PAGE_TEMPLATE_NODES = 200;

/**
 * How big a bundle may be before it is refused, in bytes.
 *
 * Pictures make this the one template format that can arrive enormous. The
 * limit is generous — a skeleton with a dozen photographs in it is well under
 * — and exists so a corrupt or hostile file cannot be read into memory whole
 * before anything notices.
 */
export const MAX_PAGE_TEMPLATE_BYTES = 200 * 1024 * 1024;
