// What Settings → About says about the app: what it is built with, and under
// what terms. Written by hand, and that is fine here — this is the handful of
// libraries the app is *made of*, not the dependency tree, and none of them
// changes licence between one week and the next. The rule for the list is
// that everything on it is something a person could point at on screen: the
// window, the writing, the tree, the boards, the icons.
//
// The addresses are handed to the system browser when a name is pressed;
// nothing here is fetched. See constants/links.ts for the app's own.

export type Credit = {
  name: string;
  /** What it is, in the words the rest of the app uses. */
  role: string;
  licence: string;
  url: string;
};

export const CREDITS: readonly Credit[] = [
  { name: "Electron", role: "the window", licence: "MIT", url: "https://www.electronjs.org/" },
  { name: "React", role: "the interface", licence: "MIT", url: "https://react.dev/" },
  { name: "BlockNote", role: "the writing", licence: "MPL-2.0", url: "https://www.blocknotejs.org/" },
  { name: "Excalidraw", role: "the boards", licence: "MIT", url: "https://excalidraw.com/" },
  { name: "react-arborist", role: "the page tree", licence: "MIT", url: "https://github.com/brimdata/react-arborist" },
  { name: "Lucide", role: "the icons", licence: "ISC", url: "https://lucide.dev/" },
  { name: "Fuse.js", role: "the search", licence: "Apache-2.0", url: "https://www.fusejs.io/" },
  { name: "Zustand", role: "the app's memory of what is open", licence: "MIT", url: "https://zustand.docs.pmnd.rs/" },
  { name: "dnd kit", role: "dragging things about", licence: "MIT", url: "https://dndkit.com/" },
];

/** The app's own licence, as `LICENSE` at the root of the repository has it. */
export const APP_LICENCE = "MIT";
export const APP_COPYRIGHT = "© 2026 Shiro";

/**
 * The three faces the app ships set in, before anybody picks another. All
 * three are under the SIL Open Font License, like most of the library; the
 * library's own condition (SIL OFL or Apache 2.0) is enforced by
 * `scripts/build-fonts.mjs`, which is why a count is enough here.
 */
export const DEFAULT_FACES = ["Inter", "Fraunces", "Newsreader"] as const;
export const FONT_LICENCE_NOTE = "SIL Open Font License 1.1 or Apache 2.0";
export const GOOGLE_FONTS_URL = "https://fonts.google.com/";
