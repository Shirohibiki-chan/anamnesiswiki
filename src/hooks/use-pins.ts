// The pinned row's state. The only import path components have into `pins.ts`
// and into the pin half of app settings — see CLAUDE.md's layer order.
//
// Held here rather than in a store because both ends are in one screen: the row
// and the manage window are siblings under StartScreen, and a store would be a
// second home for state that never leaves the house.
import { useCallback, useEffect, useMemo, useState } from "react";
import * as appSettings from "../services/app-settings-service";
import { addPin, healPins, movePin, removePin, type Pin } from "../services/pins";
import type { ListedWorld } from "../services/world-scan";

export function usePins(worlds: readonly ListedWorld[]) {
  const [pins, setPins] = useState<Pin[]>([]);
  // Until the settings file has been read, an empty list means "not read yet"
  // rather than "nothing is pinned" — and those two draw differently. Without
  // this the row flashes its empty state on every start.
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    appSettings
      .getPinnedProjects()
      .catch(() => [])
      .then((stored) => {
        if (cancelled) return;
        setPins(stored);
        setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Applied to the screen first and written after, and the write isn't awaited
  // — same shape as the preferences store. A pin that waits on a disk round
  // trip before it moves is a pin that feels broken.
  const apply = useCallback((next: Pin[]) => {
    setPins(next);
    void appSettings.setPinnedProjects(next).catch(() => {});
  }, []);

  // Whatever the scan has since learned — an id a project gained the first
  // time it was opened, a path that changed under a pin matched by id.
  //
  // Derived rather than stored, and that is not just to please the linter: the
  // healed list is a function of the pins and the scan, so holding a second
  // copy in state would mean two answers to one question and a render spent
  // reconciling them. `healPins` returns the same array when there is nothing
  // to learn, so this is the stored list itself on all but the rare pass that
  // finds drift.
  const healed = useMemo(() => healPins(pins, worlds) ?? pins, [pins, worlds]);

  // Writing out is the one thing an effect is for here — updating an external
  // system, with no state of its own to set. It fires only on a pass that
  // actually found something, because otherwise the two are the same array.
  useEffect(() => {
    if (healed !== pins) void appSettings.setPinnedProjects(healed).catch(() => {});
  }, [healed, pins]);

  return {
    pins: healed,
    isLoaded,
    pin: useCallback((world: ListedWorld) => apply(addPin(healed, world)), [apply, healed]),
    unpin: useCallback((world: ListedWorld) => apply(removePin(healed, world)), [apply, healed]),
    reorder: useCallback((from: number, to: number) => apply(movePin(healed, from, to)), [apply, healed]),
  };
}
