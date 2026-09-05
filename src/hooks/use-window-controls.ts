// Whether the page draws the window's buttons, and what the maximise one shows.
//
// **Both answers come from the host and neither can be guessed.** Whether we
// draw them at all is a platform question (see `drawsWindowControls` in
// host-contract.ts), and whether the window is maximised is one the page cannot
// observe: a double-click on the bar, Win+Up, a snap and a drag to the top of
// the screen all maximise a window without going near our button.
//
// **`draws` starts false, which is the safe way round.** Drawing three buttons
// and then taking them away is a bar that flickers; drawing none for a frame and
// then adding them is a bar that fills in. The first answer arrives within a
// frame or two of mount either way.
import { useEffect, useState } from "react";
import {
  drawsWindowControls,
  minimiseWindow,
  requestWindowClose,
  toggleMaximiseWindow,
  watchWindowMaximised,
} from "../services/host-service";

export type WindowControls = {
  draws: boolean;
  maximised: boolean;
  minimise: () => void;
  toggleMaximise: () => void;
  /** The polite close — the app may hold it to finish saving. Never
      `window.close()`, which would take the window without that. */
  close: () => void;
};

export function useWindowControls(): WindowControls {
  const [draws, setDraws] = useState(false);
  const [maximised, setMaximised] = useState(false);

  useEffect(() => {
    let live = true;
    void drawsWindowControls().then((answer) => {
      if (live) setDraws(answer);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    // The unsubscribe arrives asynchronously, so an unmount that beats it has to
    // leave word behind rather than have nothing to call.
    let stop: (() => void) | null = null;
    let live = true;
    void watchWindowMaximised((next) => {
      if (live) setMaximised(next);
    }).then((unsubscribe) => {
      if (live) stop = unsubscribe;
      else unsubscribe();
    });
    return () => {
      live = false;
      stop?.();
    };
  }, []);

  return {
    draws,
    maximised,
    minimise: () => void minimiseWindow(),
    toggleMaximise: () => void toggleMaximiseWindow(),
    close: () => void requestWindowClose(),
  };
}
