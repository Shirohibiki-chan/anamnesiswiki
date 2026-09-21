// The `/` entries that put a player in the page. Phase 31.
//
// **Four entries over one block, on purpose.** `/YouTube`, `/Spotify` and
// `/SoundCloud` are the words somebody types when they know what they are
// pasting; `/Embed` is for when they do not. All four put down the same empty
// block with a box for the link — the block is what tells the services apart,
// by reading the link — so nothing here decides anything. Pasting a link on
// an empty line is the other way in and skips this box entirely; see
// `pasteMediaLink` in use-editor.ts.
import { insertOrUpdateBlockForSlashMenu, type BlockNoteEditor } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { AudioLines, Clapperboard, Music, SquarePlay } from "lucide-react";
import { MEDIA_EMBED_TYPE } from "../../constants/schema";

export function getMediaSlashMenuItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
  editor: BlockNoteEditor<any, any, any>,
): DefaultReactSuggestionItem[] {
  /**
   * Puts down the empty block. **A line after it when it lands at the end
   * of the page**, for the reason every block of ours gets one: it holds no
   * text, so with nothing under it there is no way to write past it.
   */
  function insert() {
    const inserted = insertOrUpdateBlockForSlashMenu(editor, { type: MEDIA_EMBED_TYPE });
    const document = editor.document;
    if (document[document.length - 1]?.id === inserted.id) {
      editor.insertBlocks([{ type: "paragraph" }], inserted.id, "after");
    }
  }

  const shared = { group: "Media", onItemClick: insert };
  return [
    {
      ...shared,
      title: "YouTube",
      subtext: "A video, or a playlist, played in the page",
      aliases: ["youtube", "video", "yt", "youtubemusic"],
      icon: <Clapperboard size={16} />,
    },
    {
      ...shared,
      title: "Spotify",
      subtext: "A track, album, playlist, artist or episode",
      aliases: ["spotify", "music", "song", "track", "album"],
      icon: <Music size={16} />,
    },
    {
      ...shared,
      title: "SoundCloud",
      subtext: "A track or a playlist from SoundCloud",
      aliases: ["soundcloud", "audio", "sound"],
      icon: <AudioLines size={16} />,
    },
    {
      ...shared,
      title: "Embed",
      subtext: "Any link from the three services above",
      aliases: ["embed", "player", "media", "link"],
      icon: <SquarePlay size={16} />,
    },
  ];
}
