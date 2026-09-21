// The player block in the sidebar: a character's theme song in the infobox,
// a location's ambience beside its description. Phase 31, step 2.
//
// **The same renderer as the block in the writing**, at sidebar width — the
// look was settled in step 1 and is copied here, not re-decided. What this
// file owns is the block's record: the box an empty one is, and the fetch
// written back onto `block.media` through the store rather than onto a
// BlockNote block. The chrome — title, colour, menu, drag — is BlockShell's,
// like every other block's.
import { useEffect, useRef, useState } from "react";
import { useMediaFetch, useOnline } from "../../hooks/use-media";
import type { Block, SidebarMedia } from "../../constants/schema";
import { MediaLinkBox } from "./MediaLinkBox";
import { MediaPlayer } from "./MediaPlayer";
import "./blocks.css";

type Props = {
  block: Block;
  onChange: (media: SidebarMedia | undefined) => void;
  /** Taking the block off the panel, for the box's Cancel. */
  onRemove: () => void;
};

export function MediaBlock({ block, onChange, onRemove }: Props) {
  const media = block.media;
  const { fetchMedia } = useMediaFetch();
  const online = useOnline();
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);

  // Asked once per open, and again when the internet comes back; the same
  // rule as the block in the writing, for the same reason (MediaEmbedBlock).
  const asked = useRef(false);
  const url = media?.url ?? "";
  const fetched = media?.fetched ?? false;
  useEffect(() => {
    if (!media || !url || fetched || !online || asked.current) return;
    asked.current = true;
    let live = true;
    fetchMedia(media).then((answer) => {
      if (live) onChange({ ...media, ...answer });
    });
    return () => {
      live = false;
    };
    // Only the link and whether it has been answered are reasons to ask.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, fetched, online]);

  if (!media?.url) {
    return <MediaLinkBox onLink={(info) => onChange(info)} onCancel={onRemove} bare />;
  }

  return (
    <div ref={setFrame} className="block-media">
      <MediaPlayer media={media} surface={frame} />
    </div>
  );
}
