// Finding the pictures BlockNote has painted inside a page, so the lightbox can
// arrow between all of them rather than only the one that was clicked. See
// docs/plan.md Phase 16.
//
// Read off the DOM rather than out of `editor.document`, which is the less
// obvious of the two and worth the sentence: the question being asked is
// genuinely a rendered one. The `src` on screen is already resolved — a blob
// URL for an uploaded file, the web address itself for an embedded one — so the
// lightbox shows exactly the bytes the page is showing, with no second
// resolution to fall out of step. Reading the document instead would mean
// re-resolving every `anamnesis-asset:` reference and walking nested blocks to
// recover an order the DOM already has.
//
// `img.bn-visual-media` is BlockNote's own class on the image element (see
// @blocknote/react's blocks/Image/block.tsx). Videos use the same class on a
// different tag, which is why the tag is part of the selector.
import type { LightboxImage } from "../state/lightbox-store";

const EMBEDDED_IMAGE_SELECTOR = "img.bn-visual-media";

/**
 * What to call a picture in the lightbox.
 *
 * BlockNote writes the uploaded file's own name into the image block's `name`
 * prop and renders it as `alt` (`props.block.props.name || ""`), so for
 * anything uploaded this is the name it had on disk before it became a UUID in
 * `assets/`. That's the whole reason the name is read from the element rather
 * than from the stored reference, which carries no such memory.
 *
 * A picture added by web address usually has no name, so the last segment of
 * its path is the closest thing to one. Only `http(s)` is unpicked that way: a
 * `blob:` URL's last segment is a UUID, which is worse than showing nothing.
 */
export function imageDisplayName(alt: string, src: string): string {
  if (alt) return alt;
  if (!/^https?:/i.test(src)) return "";
  try {
    const lastSegment = new URL(src).pathname.split("/").pop() ?? "";
    return decodeURIComponent(lastSegment);
  } catch {
    // A src that isn't a parseable URL has no name to offer. Not worth
    // reporting — it only costs the strip at the top of the lightbox.
    return "";
  }
}

function toLightboxImage(element: HTMLImageElement): LightboxImage {
  // `currentSrc` is what the browser actually loaded; `getAttribute` is the
  // literal attribute. The attribute is the one to hand to `imageDisplayName`,
  // since a relative address would come back from `src` already absolute and
  // could be unpicked into a name that was never written anywhere.
  return { src: element.src, name: imageDisplayName(element.alt, element.getAttribute("src") ?? "") };
}

/**
 * Every picture inside `container`, in the order they appear on the page.
 */
export function collectEmbeddedImages(container: Element): LightboxImage[] {
  return Array.from(container.querySelectorAll<HTMLImageElement>(EMBEDDED_IMAGE_SELECTOR), toLightboxImage);
}

/**
 * The picture a click landed on, together with the rest of them — or null if
 * the click wasn't on one, which is nearly every click in a page of text.
 *
 * The element is matched by identity rather than by index-of-a-second-query, so
 * there's no window in which the two lists could differ.
 */
export function embeddedImageAt(
  container: Element,
  target: EventTarget | null,
): { images: LightboxImage[]; index: number } | null {
  if (!(target instanceof Element)) return null;
  const image = target.closest<HTMLImageElement>(EMBEDDED_IMAGE_SELECTOR);
  if (!image || !container.contains(image)) return null;

  const elements = Array.from(container.querySelectorAll<HTMLImageElement>(EMBEDDED_IMAGE_SELECTOR));
  const index = elements.indexOf(image);
  if (index === -1) return null;

  return { images: elements.map(toLightboxImage), index };
}
