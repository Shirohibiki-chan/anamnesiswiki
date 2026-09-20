// A video on a board: the player drawn inside the library's embed box.
// Phase 32, step 12.
//
// **A still with a play mark until it is played.** The window's own player
// shows the first frame and nothing else until the mark is clicked; then
// the player's own controls are up and the box takes the pointer, so they
// can be used. Paused or finished, it is a still again and the box goes
// back to being a shape — which is how it is moved: pause it, then drag.
// Phase 31's look, applied here first.
//
// The file comes out of the world's library by name, read once into the
// window when the box is drawn — the same read a picture gets.
import { Play } from "lucide-react";
import { useRef, useState } from "react";
import { useNodeImage } from "../../hooks/use-node-image";

type Props = {
  /** The file's name in the world's library. */
  file: string;
};

export function BoardVideo({ file }: Props) {
  const { url, status } = useNodeImage(file);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="board-card board-video" data-playing={playing ? "true" : "false"} data-file={file} data-testid="board-video">
      {url ? (
        <video
          ref={videoRef}
          className="board-video-player"
          src={url}
          preload="metadata"
          playsInline
          controls={playing}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      ) : (
        // A file that will not read is still a box on the board; say so
        // rather than draw a blank.
        <span className="board-video-missing">{status === "error" ? "This video file is gone" : ""}</span>
      )}
      {url && !playing && (
        // The one part of a resting video that takes the pointer, as a
        // note's links and an opened page's Open button are.
        <button type="button" className="board-video-play" onClick={() => void videoRef.current?.play()} title="Play" aria-label="Play the video">
          <Play size={28} fill="currentColor" />
        </button>
      )}
    </div>
  );
}
