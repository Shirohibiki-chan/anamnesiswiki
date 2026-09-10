// The way back to the two things that only ever offer themselves once.
// Phase 26, step 3.
//
// **Both halves of the phase are things somebody meets on their first morning
// and then cannot find again.** The tour offers itself once and is gone the
// moment it is skipped; the example world is given once, and once deleted is
// not put back. Neither of those is wrong — an app that keeps offering a
// tutorial is worse — but both need a door, and this is it.
//
// It is also how either half gets tested without editing a settings file by
// hand, which is the reason this was written into the plan rather than left as
// a nicety.
import { useState } from "react";
import { useAppSettings } from "../../hooks/use-app-settings";
import { useProject } from "../../hooks/use-project";
import { useStartTour } from "../../hooks/use-tour";

type Made = { kind: "none" } | { kind: "busy" } | { kind: "made"; name: string } | { kind: "failed"; error: string };

type GettingStartedSettingsProps = {
  /**
   * Closes the settings dialog.
   *
   * The tour draws over everything, this dialog included, so starting one from
   * inside it has to put it away first — otherwise the first thing the tour
   * points at is hidden behind the window that started it.
   */
  onClose: () => void;
};

export function GettingStartedSettings({ onClose }: GettingStartedSettingsProps) {
  const { isLoaded, writeExampleProject } = useProject();
  const { prepareNewProjectsDir } = useAppSettings();
  const startTour = useStartTour();
  const [made, setMade] = useState<Made>({ kind: "none" });

  async function makeAnother() {
    setMade({ kind: "busy" });
    try {
      const parentDir = await prepareNewProjectsDir();
      const result = await writeExampleProject(parentDir);
      setMade(
        result.ok
          ? { kind: "made", name: result.rootPath.split(/[\\/]/).filter(Boolean).pop() ?? "the example world" }
          : { kind: "failed", error: result.error },
      );
    } catch {
      setMade({ kind: "failed", error: "Couldn't write it. Check that your projects folder still exists." });
    }
  }

  return (
    <div className="getting-started">
      <section className="getting-started-item">
        <p className="getting-started-label">The tour</p>
        <p className="getting-started-note">
          The four steps you were shown the first time a world was open — the rail, your world, the page, and the panel
          on the right.
        </p>
        {/* Every step points at a column of an open project, so there is
            nothing to point at from the start screen — where this dialog also
            opens. Refusing with a reason beats a button that appears to work
            and produces nothing. */}
        <button
          type="button"
          className="ui-btn ui-btn-secondary"
          disabled={!isLoaded}
          onClick={() => {
            onClose();
            startTour();
          }}
        >
          Take the tour again
        </button>
        {!isLoaded && <p className="getting-started-note">Open a world first — the tour points at the parts of one.</p>}
      </section>

      <section className="getting-started-item">
        <p className="getting-started-label">The example world</p>
        <p className="getting-started-note">
          Saltmere: a small world already written, to look around. You were given one when you installed Anamnesis, and
          it is in your projects list unless you deleted it.
        </p>
        <button
          type="button"
          className="ui-btn ui-btn-secondary"
          disabled={made.kind === "busy"}
          onClick={() => void makeAnother()}
        >
          {made.kind === "busy" ? "Making it…" : "Make a fresh copy"}
        </button>
        {/* A fresh copy every time rather than finding the old one: somebody
            asking for this has usually written all over theirs, and the point
            of asking is to see it as it came. */}
        {made.kind === "made" && (
          <p className="getting-started-note getting-started-done">{made.name} is in your projects list.</p>
        )}
        {made.kind === "failed" && <p className="getting-started-note getting-started-failed">{made.error}</p>}
      </section>
    </div>
  );
}
