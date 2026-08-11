// Which picture is currently blown up to fill the window, and what it can be
// arrowed between. See docs/plan.md Phase 16.
//
// Its own store rather than a fifth entry in dialog-store.ts: everything in
// there is a *question* — something is waiting on an answer, or a modal owes a
// promise a resolution. The lightbox asks nothing and resolves nothing, and
// giving it a lifecycle alongside things that do would invite it being treated
// like one.
//
// The list is passed in by whoever opened it rather than derived here, because
// "every picture on this page" means something different depending on where the
// click came from — the editor's own pictures in document order, or the single
// portrait in the sidebar. A store that tried to work it out itself would need
// to know about both surfaces.
import { create } from "zustand";

/**
 * `src` is whatever the browser is already painting — a blob URL for an
 * uploaded file, the web address itself for an embedded one. Deliberately not
 * the stored `anamnesis-asset:` reference: the lightbox shows the same bytes
 * the page is showing, so there is nothing to resolve and nothing to get wrong.
 *
 * `name` is for display only and is allowed to be empty. An uploaded picture
 * carries the file name it arrived with; an embedded one often carries nothing
 * worth reading, and a blank strip is better than a made-up label.
 */
export type LightboxImage = { src: string; name: string };

type LightboxStoreState = {
  images: LightboxImage[];
  index: number;
  openLightbox: (images: LightboxImage[], index: number) => void;
  closeLightbox: () => void;
  /** Moves by `delta` images, wrapping at both ends. */
  stepLightbox: (delta: number) => void;
};

export const useLightboxStore = create<LightboxStoreState>((set, get) => ({
  // An empty list *is* the closed state. A separate `isOpen` flag would be a
  // second source of truth that can disagree with the list it describes.
  images: [],
  index: 0,

  openLightbox(images, index) {
    if (images.length === 0) return;
    set({ images, index: Math.min(Math.max(index, 0), images.length - 1) });
  },

  closeLightbox() {
    set({ images: [], index: 0 });
  },

  // Wrapping rather than stopping at the ends: the case this is built for is a
  // character page with several portraits on it, where going back one from the
  // first is a shorter trip than arrowing all the way forward.
  stepLightbox(delta) {
    const { images, index } = get();
    if (images.length === 0) return;
    const count = images.length;
    set({ index: (((index + delta) % count) + count) % count });
  },
}));
