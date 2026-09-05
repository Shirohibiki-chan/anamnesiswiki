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
// **One element, edge to edge, so there is nothing to seam.** The band has one
// background and one rule under it, and the system's minimise/maximise/close
// are tinted to that same colour (`readTitleBarColors` in theme-service.ts), so
// the top of the window finally reads as a single strip.
//
// **The title is centred, and that is a platform answer rather than a taste.**
// Windows draws its buttons over the top right and macOS draws its traffic
// lights over the top left, so either end can be occupied depending on where
// the app is running — and the renderer has no way to ask which. Centre is the
// one position that is clear on both without branching on a platform this side
// of the door cannot see.
//
// **Nothing interactive lives in here.** The whole band is a drag region and a
// drag region swallows clicks, so a control placed here would need to opt back
// out by hand — and the app has somewhere better for every control it has. That
// is what keeps this file as short as it is; if something ever does belong in
// the bar, it needs `-webkit-app-region: no-drag` and a note saying why.
export function TitleBar() {
  return (
    <div className="title-bar">
      <span className="title-bar-name">Anamnesis</span>
    </div>
  );
}
