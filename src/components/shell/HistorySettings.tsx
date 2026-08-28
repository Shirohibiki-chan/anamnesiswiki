// Settings → History. How long earlier versions of a page are kept, and how
// many (Phase 19).
//
// **Three numbers rather than an on/off switch.** Keeping copies is not
// optional here: this app has lost pages once, and a switch marked "keep my
// work safe" is a switch somebody turns off on the day they are tidying up and
// regrets six weeks later. What is hers is the shape of it — how fine-grained
// the history is, and how far back it goes.
//
// Reusing the sidebar panel's classes, the same way ListSettings does.
import { useHistoryRetention, usePreferenceActions } from "../../hooks/use-preferences";
import {
  HISTORY_INTERVAL_MINUTES,
  HISTORY_KEEP_DAYS,
  HISTORY_PER_PAGE,
  type HistoryIntervalMinutes,
  type HistoryKeepDays,
  type HistoryPerPage,
} from "../../services/preferences-service";

const INTERVAL_LABELS: Record<HistoryIntervalMinutes, string> = {
  1: "Every minute",
  5: "Every 5 minutes",
  15: "Every 15 minutes",
  30: "Every half hour",
};

const KEEP_LABELS: Record<HistoryKeepDays, string> = {
  7: "A week",
  30: "A month",
  90: "Three months",
  365: "A year",
};

export function HistorySettings() {
  const { intervalMinutes, keepDays, perPage } = useHistoryRetention();
  const { setHistoryInterval, setHistoryKeepDays, setHistoryPerPage } = usePreferenceActions();

  return (
    <div className="appearance-settings">
      <fieldset className="sidebar-setting" data-setting="history-interval">
        <legend className="sidebar-setting-label">How often a copy is kept</legend>
        <p className="sidebar-setting-blurb">
          Anamnesis puts a copy of a page aside before it saves over it, at most this often. The first change after
          you open a page is always copied, whatever this says — so what the page looked like before today's writing is
          never the thing that gets skipped. A copy is also taken before a page is deleted.
        </p>
        <select
          className="appearance-select"
          aria-label="How often a copy is kept"
          value={intervalMinutes}
          onChange={(event) => setHistoryInterval(Number(event.target.value) as HistoryIntervalMinutes)}
        >
          {HISTORY_INTERVAL_MINUTES.map((minutes) => (
            <option key={minutes} value={minutes}>
              {INTERVAL_LABELS[minutes]}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="sidebar-setting" data-setting="history-keep">
        <legend className="sidebar-setting-label">How far back they go</legend>
        <p className="sidebar-setting-blurb">
          Copies older than this are cleared out. The most recent copy of a page is always kept, however old it is —
          a page you haven't touched in a year is exactly the one you'd want to go back to.
        </p>
        <select
          className="appearance-select"
          aria-label="How far back they go"
          value={keepDays}
          onChange={(event) => setHistoryKeepDays(Number(event.target.value) as HistoryKeepDays)}
        >
          {HISTORY_KEEP_DAYS.map((days) => (
            <option key={days} value={days}>
              {KEEP_LABELS[days]}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="sidebar-setting" data-setting="history-per-page">
        <legend className="sidebar-setting-label">How many per page</legend>
        <p className="sidebar-setting-blurb">
          The most copies any one page keeps. This is what stops a page you write in all day from filling the folder —
          at a copy every five minutes, fifty is about four hours of solid work.
        </p>
        <select
          className="appearance-select"
          aria-label="How many copies per page"
          value={perPage}
          onChange={(event) => setHistoryPerPage(Number(event.target.value) as HistoryPerPage)}
        >
          {HISTORY_PER_PAGE.map((count) => (
            <option key={count} value={count}>
              {count} copies
            </option>
          ))}
        </select>
      </fieldset>

      <p className="sidebar-setting-blurb">
        The copies live in a folder called <code>.history</code> inside your project, as ordinary JSON files with a
        note explaining them. Deleting that folder loses the history and nothing else. To read or put one back, right-
        click a page in the sidebar and choose <em>Earlier versions</em> — or the project's own name, for the
        arrangement of the tree.
      </p>
    </div>
  );
}
