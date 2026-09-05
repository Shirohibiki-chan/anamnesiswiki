// The window's title bar — one band across the very top, above everything else.
//
// **It is a real bar, and the first attempt at this was not.** The Phase 21
// version turned the frame off and then promoted the four things the app
// already drew across its top — the rail's top, the sidebar's header, the bar
// above the page, the properties panel — into the drag region, on the reasoning
// that a strip of chrome did not need adding when a 48px row was already there.
// Those four are separate elements with separate backgrounds and their own
// borders, so what it produced was four colour bands with seams between them
// and the system's buttons tinted to whichever one they happened to sit over.
// The user rejected it on sight 2026-09-05, and she was right: what she asked
// for on 2026-08-21 was a title bar that wears the theme, not the absence of
// one. This is the bar.
//
// **The buttons are ours as of 2026-09-05, and the reason is worth keeping.**
// They were the system's for one day, which bought Windows 11's snap layouts —
// the arrangement grid that appears when you hover the *native* maximise button
// — at the price of three 46px-wide slabs in a 32px bar, since a caption button
// takes a colour and a height and offers no other dimension. Put to the user,
// she did not know the feature existed and could not find it. So it is unmade:
// `drawsWindowControls` says whether to draw them, and everything they cost —
// the overlay, `setTitleBarColors`, `readTitleBarColors`, the whole path for
// telling the shell what colour the page is — went with them. A div is themed
// for free.
//
// **macOS keeps its traffic lights**, which are that platform's own convention
// rather than a default nobody chose, and which the shell still draws into the
// page. `drawsWindowControls` is false there and the bar leaves its left end
// clear for them instead.
//
// **The title is centred, and that is a platform answer rather than a taste.**
// Either end of a title bar can belong to the system depending on where the app
// is running, and centre is the one position that is clear on both without the
// renderer having to know which it is.
//
// **Everything else in here is a drag region.** A drag region swallows clicks,
// so the buttons opt back out in `shell.css` — anything else interactive added
// to the bar needs the same, and a note saying why it is in the bar at all.
import { Minus, Square, X } from "lucide-react";
import { useWindowControls } from "../../hooks/use-window-controls";

export function TitleBar() {
  const { draws, maximised, minimise, toggleMaximise, close } = useWindowControls();

  return (
    <div className="title-bar">
      <span className="title-bar-name">Anamnesis</span>
      {draws && (
        <div className="title-bar-controls">
          <button type="button" className="title-bar-btn" aria-label="Minimise" title="Minimise" onClick={minimise}>
            <Minus size={14} />
          </button>
          <button
            type="button"
            className="title-bar-btn"
            aria-label={maximised ? "Restore down" : "Maximise"}
            title={maximised ? "Restore down" : "Maximise"}
            onClick={toggleMaximise}
          >
            {/* Two overlapping squares is the restore glyph everywhere it
                appears, and one square is maximise. Drawn from the same icon at
                two sizes rather than imported twice — the offset pair is what
                reads as "put it back", and lucide has no restore of its own. */}
            {maximised ? (
              <span className="title-bar-restore">
                <Square size={9} />
                <Square size={9} />
              </span>
            ) : (
              <Square size={12} />
            )}
          </button>
          {/* Close is last and turns red on hover, which is the one piece of
              window-button convention worth keeping from the system's set: it is
              the button whose mistake costs something. */}
          <button
            type="button"
            className="title-bar-btn title-bar-close"
            aria-label="Close"
            title="Close"
            onClick={close}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
