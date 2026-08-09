// Settings → Patch Notes: what changed in the last few versions, read from
// the RELEASES.md bundled into this build. No fetch, no loading state, no
// empty state to design around — the content ships with the app.
//
// The notes render through the same `ReleaseNotes` component the update panel
// uses, so a release reads the same in both places and links inside a release
// stay unclickable in both.
import { useState } from "react";
import { useReleaseHistory } from "../../hooks/use-release-history";
import { ReleaseNotes } from "./ReleaseNotes";

function tabIndexForKey(key: string, from: number, count: number): number | null {
  const last = count - 1;
  if (key === "ArrowRight" || key === "ArrowDown") return from === last ? 0 : from + 1;
  if (key === "ArrowLeft" || key === "ArrowUp") return from === 0 ? last : from - 1;
  if (key === "Home") return 0;
  if (key === "End") return last;
  return null;
}

export function PatchNotes() {
  const { releases, openOnGitHub } = useReleaseHistory();
  const [activeIndex, setActiveIndex] = useState(0);

  // Only reachable if a build shipped a RELEASES.md with no version headings
  // in it, which is a broken build rather than a state to design for — but a
  // blank panel with no explanation would be worse than one line.
  if (releases.length === 0) {
    return <p className="patch-notes-empty">No release notes shipped with this build.</p>;
  }

  const active = releases[Math.min(activeIndex, releases.length - 1)];

  function onTabsKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const next = tabIndexForKey(event.key, activeIndex, releases.length);
    if (next === null) return;
    event.preventDefault();
    setActiveIndex(next);
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons[next]?.focus();
  }

  return (
    <div className="patch-notes">
      <div
        className="patch-notes-tabs"
        role="tablist"
        aria-label="Versions"
        onKeyDown={onTabsKeyDown}
      >
        {releases.map((release, index) => (
          <button
            key={release.version}
            type="button"
            role="tab"
            id={`patch-notes-tab-${release.version}`}
            aria-controls={`patch-notes-panel-${release.version}`}
            aria-selected={index === activeIndex}
            // Roving tabindex, same as the settings rail: the strip is one Tab
            // stop and arrow keys move inside it.
            tabIndex={index === activeIndex ? 0 : -1}
            className={`patch-notes-tab${index === activeIndex ? " patch-notes-tab-active" : ""}`}
            onClick={() => setActiveIndex(index)}
          >
            <span className="patch-notes-tab-version">{release.version}</span>
            {release.date && <span className="patch-notes-tab-date">{release.date}</span>}
          </button>
        ))}
      </div>

      <div
        className="patch-notes-panel"
        role="tabpanel"
        id={`patch-notes-panel-${active.version}`}
        aria-labelledby={`patch-notes-tab-${active.version}`}
        // Keyed so switching version starts at the top of the new notes rather
        // than wherever the last one was scrolled to.
        key={active.version}
      >
        <ReleaseNotes blocks={active.blocks} />

        <p className="patch-notes-link-line">
          <button type="button" className="ui-link" onClick={() => void openOnGitHub(active.version)}>
            Read {active.version} on GitHub
          </button>
        </p>
      </div>
    </div>
  );
}
