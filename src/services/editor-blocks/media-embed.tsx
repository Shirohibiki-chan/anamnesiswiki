// The player block: a YouTube, YouTube Music, Spotify or SoundCloud link in
// the writing, drawn as its service's player. Phase 31. See docs/plan.md.
//
// **Ours in the way `pageColumns` and the callouts are ours**, and shaped
// like the picture block she already has: a link, what it resolved to, a
// caption and a width. The props are what `MediaInfo` in media-service.ts
// says, flattened, because BlockNote props are strings, numbers and booleans
// — the same reason an infobox stores its ids as a joined string.
//
// **Nothing in this file knows how to draw a player, on purpose.** Drawing one
// needs the store (the thumbnail goes into `assets/`), the host (the service
// is asked over the network) and the theme (Spotify's two looks, SoundCloud's
// colour), which are all above this folder in CLAUDE.md's layer order. So this
// leaves a slot and the component layer fills it, exactly as `blockRef` does.
import { createReactBlockSpec } from "@blocknote/react";
import { MEDIA_EMBED_TYPE } from "../../constants/schema";
import { MediaEmbedSlot } from "./BlockRefSlot";

export const mediaEmbedConfig = {
  type: MEDIA_EMBED_TYPE,
  propSchema: {
    /** The address as pasted, tidied. Empty for a block put down from the slash menu with no link yet. */
    url: { default: "" },
    service: { default: "" },
    kind: { default: "" },
    mediaId: { default: "" },
    title: { default: "" },
    author: { default: "" },
    /** The filename in `assets/` of the thumbnail, or empty. */
    thumbnail: { default: "" },
    /** True once the service has answered; false is "ask again when online". */
    fetched: { default: false },
    caption: { default: "" },
    /** Percent of the writing column, the way a page block's `width` is. */
    width: { default: 100 },
  },
  content: "none",
} as const;

export const mediaEmbedSpec = createReactBlockSpec(mediaEmbedConfig, {
  // `contentEditable={false}` for the reason every block of ours has it: there
  // is no text of ours in here (the caption is its own input), and without it
  // the caret lands somewhere it cannot be drawn.
  render: ({ block }) => (
    <div className="media-embed-row" contentEditable={false}>
      <MediaEmbedSlot editorBlockId={block.id} props={block.props} />
    </div>
  ),
})();
