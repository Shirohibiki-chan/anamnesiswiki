// A player, drawn from what a media block stores. Phase 31. Shared by the
// block in the writing (MediaEmbedBlock) and the one in the sidebar, so the
// look is settled once and copied — the plan's rule for step 2.
//
// **The player sits inside the same frame every other block gets**, and
// what is in the frame depends on the service and the internet:
//
// - YouTube is a still until it is played: the video's own thumbnail at 16:9
//   with its title over it and a play mark, and only a click loads the real
//   player. A page with five videos does not start five players, nothing
//   from YouTube loads until she asks, and the player's own bar of buttons
//   is not on the page until something is playing.
// - Spotify's embed is already a card, so it is shown as-is; SoundCloud's
//   player takes the accent. Both load when the block draws, online.
// - With the internet off every block draws whole from what it stored —
//   frame, service mark, title, author, thumbnail — and says it needs the
//   internet where the player would be. Not a grey hole and not a broken-
//   image glyph.
import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { useOnline } from "../../hooks/use-media";
import { useSurfaceLook } from "../../hooks/use-surface-theme";
import { useProjectRootPath } from "../../hooks/use-project";
import { resolveAssetUrl, assetRef } from "../../services/asset-urls";
import {
  OFFLINE_NOTICE,
  linkOf,
  playerShape,
  playerUrl,
  playsFromStill,
  serviceLabel,
  type MediaInfo,
} from "../../services/media-service";
import { ServiceMark } from "./ServiceMark";
import "./blocks.css";

type Props = {
  media: MediaInfo;
  /** The element the theme is read off; the block's own frame. */
  surface: Element | null;
};

/**
 * The thumbnail as something the window can paint — the same resolver the
 * picture blocks use, since the file is one of the world's pictures.
 */
function useThumbnailUrl(fileName: string): string | null {
  const rootPath = useProjectRootPath();
  // Keyed by the file it was resolved for, so a block whose thumbnail changes
  // draws nothing rather than the old picture while the new one is read.
  const [resolved, setResolved] = useState<{ fileName: string; url: string } | null>(null);
  useEffect(() => {
    if (!fileName) return;
    let live = true;
    resolveAssetUrl(rootPath, assetRef(fileName)).then((url) => {
      if (live && url.startsWith("blob:")) setResolved({ fileName, url });
    });
    return () => {
      live = false;
    };
  }, [rootPath, fileName]);
  return resolved && resolved.fileName === fileName ? resolved.url : null;
}

export function MediaPlayer({ media, surface }: Props) {
  const link = linkOf(media);
  const online = useOnline();
  const look = useSurfaceLook(surface);
  const thumbnail = useThumbnailUrl(media.thumbnail);
  const [playing, setPlaying] = useState(false);
  const shape = playerShape(link);
  const still = playsFromStill(link);

  // A video that was playing keeps playing across a theme change — the
  // address is the same — but a track's player is reloaded, since Spotify's
  // look is in its address. That is the cost of matching the theme and it
  // is only paid when the theme moves.
  const src = playerUrl(link, look);

  const box = "ratio" in shape ? { aspectRatio: `${shape.ratio}` } : { height: shape.height };
  const title = media.title || media.url;

  // Offline, or a service whose player is loaded on demand and has not been
  // asked yet: the card from what the block stored.
  const showPlayer = online && (!still || playing);

  return (
    <div className={`media-player media-player-${media.service}`} data-service={media.service}>
      <div className="media-player-box" style={box}>
        {showPlayer ? (
          <iframe
            className="media-player-frame"
            src={src}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <MediaStill
            media={media}
            thumbnail={thumbnail}
            offline={!online}
            onPlay={still && online ? () => setPlaying(true) : undefined}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The card drawn where the player would be: the thumbnail with the title
 * and who made it over it, a play mark when a click will play it, and the
 * offline line when nothing will.
 */
function MediaStill({
  media,
  thumbnail,
  offline,
  onPlay,
}: {
  media: MediaInfo;
  thumbnail: string | null;
  offline: boolean;
  onPlay?: () => void;
}) {
  const service = serviceLabel(media.service);
  const title = media.title || media.url;
  const body = (
    <>
      {thumbnail ? (
        <img className="media-still-picture" src={thumbnail} alt="" draggable={false} />
      ) : (
        <div className="media-still-blank" />
      )}
      <div className="media-still-shade" />
      <div className="media-still-words">
        <span className="media-still-service">
          <ServiceMark service={media.service} /> {service}
        </span>
        <span className="media-still-title">{title}</span>
        {media.author && <span className="media-still-author">{media.author}</span>}
      </div>
      {onPlay && (
        <span className="media-still-play" aria-hidden="true">
          <Play size={22} fill="currentColor" />
        </span>
      )}
      {offline && <span className="media-still-offline">{OFFLINE_NOTICE}</span>}
    </>
  );
  if (onPlay) {
    return (
      <button type="button" className="media-still media-still-playable" onClick={onPlay} aria-label={`Play ${title}`}>
        {body}
      </button>
    );
  }
  return <div className="media-still">{body}</div>;
}
