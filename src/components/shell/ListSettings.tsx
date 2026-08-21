// Settings → Lists. How a long list of things is broken up, wherever one is
// long enough for the question to come up: the projects on the start screen,
// the pictures in the asset picker.
//
// Reusing the sidebar panel's classes rather than growing a second set —
// they're a fieldset of radios with a hint under each, which is exactly this.
import { useListPageSize, useListPaging, usePreferenceActions } from "../../hooks/use-preferences";
import {
  LIST_PAGE_SIZES,
  LIST_PAGING_MODES,
  type ListPageSize,
  type ListPagingMode,
} from "../../services/preferences-service";

const PAGING_LABELS: Record<ListPagingMode, { label: string; hint: string }> = {
  pages: {
    label: "Pages",
    hint: "A set number at a time, with arrows to move between them. A page scrolls if it's taller than the window — how many go on one is yours to pick, below.",
  },
  scroll: {
    label: "One long scroll",
    hint: "Everything in one list you scroll through, with no page breaks.",
  },
};

export function ListSettings() {
  const listPaging = useListPaging();
  const listPageSize = useListPageSize();
  const { setListPaging, setListPageSize } = usePreferenceActions();

  return (
    <div className="appearance-settings">
      <fieldset className="sidebar-setting" data-setting="list-paging">
        <legend className="sidebar-setting-label">Long lists of things</legend>
        <p className="sidebar-setting-blurb">
          Applies anywhere a list can get long enough to need it — the projects on the start screen, the pictures you
          can pick from. Nothing is hidden either way; this is about how you get to the far end of it.
        </p>
        {LIST_PAGING_MODES.map((mode) => (
          <label key={mode} className="sidebar-setting-option">
            <input
              type="radio"
              name="list-paging"
              value={mode}
              checked={listPaging === mode}
              onChange={() => setListPaging(mode)}
            />
            <span className="sidebar-setting-option-text">
              <span className="sidebar-setting-option-label">{PAGING_LABELS[mode].label}</span>
              <span className="sidebar-setting-option-hint">{PAGING_LABELS[mode].hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {/* Shown always rather than only while Pages is on. A control that
          appears and disappears as she flips the radio above it makes the panel
          jump under her hand, and the disabled state says the same thing
          without moving anything. */}
      <fieldset className="sidebar-setting" data-setting="list-page-size" disabled={listPaging !== "pages"}>
        <legend className="sidebar-setting-label">How many to a page</legend>
        <p className="sidebar-setting-blurb">
          {listPaging === "pages"
            ? "The same number everywhere — projects and pictures alike. A page taller than the window scrolls; that's expected, and it's not the same thing as a list with no end to it."
            : "Nothing to set while everything is one long scroll."}
        </p>
        {/* The panel's own control for picking one of a few — the same
            `appearance-select` the font pickers use. A row of pills would be
            nicer to look at and would be the only one of its kind in Settings,
            which is how a dialog ends up with six ways to choose a thing. */}
        <select
          className="appearance-select"
          aria-label="How many to a page"
          value={listPageSize}
          onChange={(event) => setListPageSize(Number(event.target.value) as ListPageSize)}
        >
          {LIST_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} at a time
            </option>
          ))}
        </select>
      </fieldset>
    </div>
  );
}
