// The settings rail: what sections exist, in what order, and what each one
// says about itself.
//
// This lived inside SettingsModal.tsx until the search box needed it too. A
// service may not import a component (CLAUDE.md's layer order), and the search
// index has to name the section a result is in — so the data moved down here
// and the modal kept the one thing that can't: the id → Panel component map.
//
// Adding a settings area is still one entry, in two places now. Keep them in
// step; `settings-search.test.ts` fails if a tab here has no panel.

export type SettingsTab = {
  id: string;
  /** Only draws the hairline where it changes — the rail has no group headings. */
  group: "look" | "app";
  label: string;
  blurb: string;
};

export const SETTINGS_TABS: readonly SettingsTab[] = [
  {
    id: "theme",
    group: "look",
    label: "Theme",
    blurb: "The whole look, in one pick. Themes you've made yourself are in the list too.",
  },
  {
    id: "colours",
    group: "look",
    label: "Colours",
    blurb: "Change a theme's colours and gradients here — it writes an ordinary .css file you can also open in Notepad.",
  },
  {
    id: "fonts",
    group: "look",
    label: "Fonts and text",
    blurb: "Which typefaces to use, and how big.",
  },
  {
    id: "snippets",
    group: "look",
    label: "Snippets",
    blurb: "Small bits of CSS that sit on top of whichever theme is on, each switched on and off by itself.",
  },
  {
    id: "sidebar",
    group: "app",
    label: "Sidebar",
    blurb: "How the page tree behaves.",
  },
  {
    id: "writing",
    group: "app",
    label: "Writing",
    blurb: "How the editor behaves while you're writing in it.",
  },
  {
    id: "lists",
    group: "app",
    label: "Lists",
    blurb: "How a long list of things is broken up — your projects, your pictures.",
  },
  {
    id: "history",
    group: "app",
    label: "History",
    blurb: "How long earlier versions of your pages are kept, and how many.",
  },
  {
    id: "projects",
    group: "app",
    label: "Projects",
    blurb: "Where new and imported projects get saved.",
  },
  {
    id: "keyboard",
    group: "app",
    label: "Keyboard",
    blurb: "Every shortcut, and what it's bound to.",
  },
  {
    id: "updates",
    group: "app",
    label: "Updates",
    blurb: "Check for a new version. Only ever when you press the button.",
  },
  {
    id: "report",
    group: "app",
    label: "Report a bug",
    blurb: "Send a bug report, and the crash log that goes with it.",
  },
  {
    id: "patch-notes",
    group: "app",
    label: "Patch Notes",
    blurb: "What changed in the last few versions of Anamnesis.",
  },
];

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

/**
 * Settings that no registry already describes.
 *
 * Most of the index builds itself — the colour rows come from `COLOR_TOKENS`,
 * the typefaces from `FONT_SLOTS`, the shortcuts from `SHORTCUT_LABELS` — and
 * anything derived that way can't drift from what's on screen, because it *is*
 * what's on screen. These are the rest: controls written directly into a panel
 * with no data behind them.
 *
 * `keywords` is for the word somebody would actually type that appears nowhere
 * in the label. Nobody searches "Projects folder" looking for where their files
 * go; they search "where are my files saved", and one of those words has to
 * land. Add them freely — an unhelpful keyword costs a row in a list, and a
 * missing one costs the whole feature for that setting.
 */
export const DECLARED_SETTINGS: readonly {
  id: string;
  tabId: string;
  label: string;
  hint: string;
  keywords: string[];
}[] = [
  {
    id: "formatting-bar",
    tabId: "writing",
    label: "The formatting bar",
    hint: "whether the bold/italic strip appears over the text when you select some, or stays at the top of the page",
    // "toolbar" is the word most people have for it and appears nowhere in the
    // label; "bold" and "italic" are what somebody is actually looking at when
    // they go looking for it.
    //
    // **No "bar", no "stays", no "fixed"** — all three are near-misses on the
    // words in "where are my files saved", the query this file's other comments
    // keep coming back to: "bar" is one transposition from "are", "stays" and
    // "fixed" are two edits from "saved" and "files". A keyword that costs an
    // unrelated query its precision is not worth the one it helps, and
    // "toolbar" already catches anybody typing "bar".
    keywords: ["toolbar", "formatting", "bold", "italic", "floating", "pinned", "sticky"],
  },
  {
    id: "bug-report",
    tabId: "report",
    label: "Report a bug",
    // No "filled in": the search is fuzzy, and "filled" lands two edits from
    // "files", which put this row into the results for "where are my files
    // saved" — the exact trap the crash-log row below documents.
    hint: "opens a form in your browser with the version and system already on it",
    keywords: ["bug", "report", "issue", "broken", "problem", "wrong", "feedback", "github", "tell", "complain"],
  },
  {
    id: "crash-log",
    tabId: "report",
    label: "If something goes wrong",
    hint: "the crash log kept on your own computer, and how to copy the last one",
    // No "white screen" and no "crashed", though both are what somebody would
    // actually type. The search is fuzzy and ignores position, so a five-letter
    // word matches anything two edits away from it: "white" catches "where" and
    // "crashed" catches "saved", which put this row into the results for "where
    // are my files saved". A near-miss keyword costs an unrelated query its
    // precision, so the list stays with the words that only mean this.
    keywords: ["crash", "error", "bug", "log", "report", "froze", "blank window"],
  },
  {
    id: "theme-pick",
    tabId: "theme",
    label: "Theme",
    hint: "the whole look, in one pick",
    keywords: ["dark", "light", "midnight", "daylight", "appearance", "colour scheme", "color scheme", "skin"],
  },
  {
    id: "theme-new",
    tabId: "theme",
    label: "New theme",
    hint: "copy the theme you're on into a file of your own",
    keywords: ["create", "duplicate", "custom", "make", "copy"],
  },
  {
    id: "theme-import",
    tabId: "theme",
    label: "Import a theme",
    hint: "take a .css theme or a .json palette from somewhere else",
    keywords: ["load", "css", "json", "palette", "bring in", "another app"],
  },
  {
    id: "theme-folder",
    tabId: "theme",
    label: "Themes folder",
    hint: "where your own theme files live",
    keywords: ["where", "location", "files", "open", "explorer", "folder"],
  },
  {
    id: "muted-covers",
    tabId: "theme",
    label: "Mute project covers",
    hint: "desaturate every cover on the start screen",
    keywords: ["cover", "project", "start screen", "saturation", "vibrant", "colour", "color", "contrast", "gray", "grey"],
  },
  {
    id: "text-size-writing",
    tabId: "fonts",
    label: "Writing size",
    hint: "how big the text on a page is",
    keywords: ["bigger", "smaller", "zoom", "scale", "font size", "prose", "body"],
  },
  {
    id: "text-size-interface",
    tabId: "fonts",
    label: "Interface size",
    hint: "how big everything that isn't a page is",
    keywords: ["bigger", "smaller", "zoom", "scale", "font size", "ui", "menus", "sidebar"],
  },
  {
    id: "snippets-list",
    tabId: "snippets",
    label: "Snippets",
    hint: "small bits of CSS on top of the theme, each switched on by itself",
    keywords: ["css", "tweak", "override", "custom", "patch"],
  },
  {
    id: "tree-double-click",
    tabId: "sidebar",
    label: "Double-click in the sidebar",
    hint: "whether it opens a page or renames it",
    keywords: ["double click", "rename", "expand", "open", "tree", "folder", "sidebar", "two clicks"],
  },
  {
    id: "list-page-size",
    tabId: "lists",
    label: "How many to a page",
    hint: "20, 40, 60 or 100 projects or pictures before the next page",
    keywords: [
      "page size",
      "per page",
      "how many",
      // Not "more" or "bigger": both are what somebody types when they want
      // larger *text*, and this entry outranked the font setting for "make the
      // text bigger" until the settings-search test said so.
      "how many per page",
      "20",
      "pagination",
      "page",
      "grid",
      "projects",
      "pictures",
    ],
  },
  {
    id: "history-interval",
    tabId: "history",
    label: "How often a copy is kept",
    hint: "every minute, 5, 15 or 30 minutes",
    keywords: ["history", "version", "versions", "earlier versions", "snapshot", "copy", "interval"],
  },
  {
    id: "history-keep",
    tabId: "history",
    label: "How far back earlier versions go",
    hint: "a week, a month, three months or a year",
    keywords: ["history", "version", "versions", "earlier versions", "retention", "how long", "snapshot"],
  },
  {
    id: "history-per-page",
    tabId: "history",
    label: "How many copies per page",
    hint: "10, 25, 50 or 100 copies",
    keywords: ["history", "version", "versions", "earlier versions", "how many", "copies", "snapshot"],
  },
  {
    id: "list-paging",
    tabId: "lists",
    label: "Pages or scrolling",
    hint: "whether a long list comes in pages, or is one endless scroll",
    keywords: [
      "pagination",
      "paging",
      "page",
      "next page",
      "scroll",
      "scrolling",
      "endless",
      "infinite",
      "grid",
      "projects",
      "pictures",
      "images",
      "assets",
    ],
  },
  {
    id: "projects-folder",
    tabId: "projects",
    label: "Projects folder",
    hint: "where new and imported projects get saved",
    keywords: ["where", "save", "saved", "location", "files", "disk", "storage", "path", "documents", "move"],
  },
  {
    id: "update-check",
    tabId: "updates",
    label: "Check for updates",
    hint: "only ever when you press the button",
    keywords: ["version", "new", "upgrade", "download", "install", "latest"],
  },
  {
    id: "patch-notes",
    tabId: "patch-notes",
    label: "Patch notes",
    hint: "what changed in the last few versions",
    keywords: ["changelog", "changes", "release notes", "what's new", "history", "version"],
  },
];
