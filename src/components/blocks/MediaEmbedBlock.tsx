// The player block in the writing: the frame, what is in it, its caption,
// its menu and its width. Phase 31. See docs/plan.md.
//
// **It draws through MediaPlayer, which the sidebar's block shares**, so the
// look is one thing decided once. What this file owns is the block's life in
// the document: putting a link into an empty one, asking the service about it
// and writing the answer back onto the block, and the caption and width she
// edits in place.
//
// **Module-level, and it has to stay that way.** It is handed to the editor
// through a context and rendered as a component type; one built inside another
// component would be a new type on every keystroke, resetting the caption box
// mid-word. PageBlock and Infobox live under the same rule.
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useBlockNoteEditor } from "@blocknote/react";
import { Copy, ExternalLink, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { useMediaFetch, useOnline } from "../../hooks/use-media";
import { BLOCK_WIDTH_FULL, storedBlockWidth } from "../../services/block-service";
import { copyText } from "../../services/clipboard-service";
import { openInBrowser } from "../../services/host-service";
import {
  defaultMediaWidth,
  mediaInfoFor,
  mediaLabel,
  parseMediaLink,
  serviceLabel,
  type MediaInfo,
  type MediaKind,
  type MediaService,
} from "../../services/media-service";
import type { MediaEmbedProps } from "../../services/editor-blocks/block-ref-context";
import { TreePopover } from "../tree/TreePopover";
import { BlockWidthHandles } from "./BlockWidthHandle";
import { MediaPlayer } from "./MediaPlayer";
import "./blocks.css";

/** The block's stored props as the service's record — the same fields, typed. */
function infoOf(props: MediaEmbedProps): MediaInfo {
  return {
    url: props.url,
    service: props.service as MediaService,
    kind: props.kind as MediaKind,
    mediaId: props.mediaId,
    title: props.title,
    author: props.author,
    thumbnail: props.thumbnail,
    fetched: props.fetched,
  };
}

export function MediaEmbedBlock({ editorBlockId, props }: { editorBlockId: string; props: MediaEmbedProps }) {
  const editor = useBlockNoteEditor();
  const editable = editor.isEditable;
  const { fetchMedia } = useMediaFetch();
  const online = useOnline();
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  /**
   * Writes onto the block outside the undo history. What the service said
   * is not something she did, and Ctrl+Z after pasting a link should take
   * the link out, not first forget the title it fetched.
   */
  function record(patch: Partial<MediaEmbedProps>) {
    editor.transact((tr) => {
      tr.setMeta("addToHistory", false);
      editor.updateBlock(editorBlockId, { props: patch } as never);
    });
  }

  /** Her own edits — the caption, the width, a link put in — which undo does take back. */
  function edit(patch: Partial<MediaEmbedProps>) {
    editor.updateBlock(editorBlockId, { props: patch } as never);
  }

  // **Asked once per block per time it is drawn online, never in a loop.** A
  // block that has not been answered asks when it mounts and again when the
  // internet comes back; one that has been answered never asks on its own.
  // `asked` is what stops a failed answer (which leaves `fetched` false on
  // purpose, so the next open tries again) from asking again on the same
  // open.
  const asked = useRef(false);
  const fetched = props.fetched;
  const url = props.url;
  useEffect(() => {
    if (!url || fetched || !online || asked.current) return;
    asked.current = true;
    let live = true;
    fetchMedia(infoOf(props)).then((answer) => {
      if (live) record(answer);
    });
    return () => {
      live = false;
    };
    // The props object changes on every keystroke in the caption; only the
    // link and whether it has been answered are reasons to ask.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, fetched, online]);

  if (!url) {
    return editable ? <MediaLinkBox onLink={(info, width) => edit({ ...info, width })} onCancel={() => editor.removeBlocks([editorBlockId])} /> : null;
  }

  const info = infoOf(props);
  const width = props.width || BLOCK_WIDTH_FULL;
  const service = serviceLabel(info.service);

  function openMenuAt(clientX: number, clientY: number) {
    setMenuRect(new DOMRect(clientX, clientY, 0, 0));
  }

  async function refetch() {
    setMenuRect(null);
    asked.current = true;
    const answer = await fetchMedia({ ...info, thumbnail: "" });
    record(answer);
  }

  return (
    <div
      ref={setFrame}
      className="block-frame media-embed"
      style={width === BLOCK_WIDTH_FULL ? undefined : { width: `${width}%` }}
      onContextMenu={(event) => {
        // Inside the caption box the webview's own cut/copy/paste is the
        // right answer; anywhere else on the block, this menu is.
        if ((event.target as HTMLElement | null)?.closest("input")) return;
        event.preventDefault();
        event.stopPropagation();
        openMenuAt(event.clientX, event.clientY);
      }}
    >
      <MediaPlayer media={info} surface={frame} />
      {(editable || props.caption) && (
        <input
          className="media-caption"
          value={props.caption}
          placeholder="Add a caption"
          readOnly={!editable}
          onChange={(event) => edit({ caption: event.target.value })}
          onKeyDown={(event) => {
            // Enter and Escape leave the caption rather than doing anything to
            // the document — the box is inside a block the editor sees as one
            // node, and a key that reached ProseMirror would act on the block.
            if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
            event.stopPropagation();
          }}
          aria-label="Caption"
        />
      )}
      {editable && (
        <>
          <button
            type="button"
            className="media-embed-menu-button"
            aria-label={`${mediaLabel(info)} options`}
            title="Options"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              openMenuAt(rect.left, rect.bottom + 4);
            }}
          >
            <MoreHorizontal size={13} />
          </button>
          <BlockWidthHandles
            width={width}
            label={mediaLabel(info)}
            onResize={(next) => edit({ width: storedBlockWidth(next) ?? BLOCK_WIDTH_FULL })}
            onReset={() => edit({ width: BLOCK_WIDTH_FULL })}
          />
        </>
      )}
      {menuRect && (
        <TreePopover anchorRect={menuRect} onClose={() => setMenuRect(null)}>
          <div className="tree-context-menu block-menu">
            <button
              type="button"
              onClick={() => {
                setMenuRect(null);
                void openInBrowser(info.url);
              }}
            >
              <ExternalLink size={13} /> Open on {service}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuRect(null);
                void copyText(info.url);
              }}
            >
              <Copy size={13} /> Copy Link
            </button>
            <button type="button" onClick={refetch} disabled={!online} title={online ? undefined : "Needs the internet"}>
              <RefreshCw size={13} /> Fetch Again
            </button>
            <div className="block-menu-separator" />
            <button
              type="button"
              className="tree-context-menu-danger"
              onClick={() => {
                setMenuRect(null);
                editor.removeBlocks([editorBlockId]);
              }}
            >
              <Trash2 size={13} /> Remove
            </button>
          </div>
        </TreePopover>
      )}
    </div>
  );
}

/**
 * The box an empty block is: a place for the link, for the case where it is
 * not on the clipboard yet. Enter or Add takes it; Escape, or leaving it
 * empty and moving on, takes the block out — an empty player is nothing
 * worth keeping on the page.
 */
function MediaLinkBox({ onLink, onCancel }: { onLink: (info: MediaInfo, width: number) => void; onCancel: () => void }) {
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
    <form className="block-frame media-embed media-link-box" onSubmit={submit}>
      <span className="ui-eyebrow media-link-box-title">Music or Video</span>
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
