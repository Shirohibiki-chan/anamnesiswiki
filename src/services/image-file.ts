// Turning a `File` the user handed over — dropped on a slot, chosen in the
// picker — into the two things the store wants: bytes and an extension.
//
// One file for it because the same checks were about to exist in a third
// place. They're the part that must not drift: a slot that accepts a 40MB TIFF
// the picker refuses is a bug you only find by trying both.
import { MAX_IMAGE_BYTES } from "../constants/limits";
import { extensionFor } from "./asset-urls";

export type ReadImage = { bytes: Uint8Array; extension: string };

/**
 * Reads an image file, or throws with a sentence that can be shown as-is.
 *
 * The message is as much the return value as the bytes are — every caller puts
 * it in front of the user, so writing it here is what stops three different
 * phrasings of "too big" existing.
 */
export async function readImageFile(file: File): Promise<ReadImage> {
  if (!file.type.startsWith("image/")) throw new Error("That's not an image file.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("That image is too large (10MB max).");
  return { bytes: new Uint8Array(await file.arrayBuffer()), extension: extensionFor(file) };
}
