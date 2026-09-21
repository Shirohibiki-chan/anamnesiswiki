// The box an empty player block is — a place for the link, for the case
// where it is not on the clipboard yet. Phase 31. Shared by the block in the
// writing and the one in the sidebar, since an empty player is the same
// question wherever it sits.
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { defaultMediaWidth, mediaInfoFor, parseMediaLink, type MediaInfo } from "../../services/media-service";
import "./blocks.css";

/**
 * Enter or Add takes the link; Escape and Cancel hand back to the caller,
 * which takes the block out — an empty player is nothing worth keeping.
 * `width` is the block's starting width for the link, for the caller that
 * has one to set.
 */
export function MediaLinkBox({
  onLink,
  onCancel,
  bare = false,
}: {
  onLink: (info: MediaInfo, width: number) => void;
  onCancel: () => void;
  /** Inside a block that already has a frame and a title — the sidebar's — so it draws neither. */
  bare?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [refused, setRefused] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  useEffect(() => input.current?.focus(), []);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const link = parseMediaLink(draft);
    if (!link) {
      setRefused(true);
      return;
    }
    onLink(mediaInfoFor(link), defaultMediaWidth(link));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <form className={bare ? "media-link-box media-link-box-bare" : "block-frame media-embed media-link-box"} onSubmit={submit}>
      {!bare && <span className="ui-eyebrow media-link-box-title">Music or Video</span>}
      <div className="media-link-box-row">
        <input
          ref={input}
          className="media-link-box-input"
          value={draft}
          placeholder="Paste a YouTube, Spotify or SoundCloud link"
          onChange={(event) => {
            setDraft(event.target.value);
            setRefused(false);
          }}
          onKeyDown={onKeyDown}
          onPaste={(event) => {
            // A paste that is one of the four services' links is taken at
            // once — no second Enter for the ordinary case.
            const link = parseMediaLink(event.clipboardData.getData("text/plain"));
            if (!link) return;
            event.preventDefault();
            onLink(mediaInfoFor(link), defaultMediaWidth(link));
          }}
          aria-label="Link"
        />
        <button type="submit" className="ui-btn ui-btn-primary">
          Add
        </button>
        <button type="button" className="ui-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {refused && (
        <p className="media-link-box-refused" role="alert">
          That's not a link from YouTube, YouTube Music, Spotify or SoundCloud — those are the four that play here.
        </p>
      )}
    </form>
  );
}
