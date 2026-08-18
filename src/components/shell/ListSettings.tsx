// Settings → Lists. How a long list of things is broken up, wherever one is
// long enough for the question to come up: the projects on the start screen,
// the pictures in the asset picker.
//
// Reusing the sidebar panel's classes rather than growing a second set —
// they're a fieldset of radios with a hint under each, which is exactly this.
import { useListPaging, usePreferenceActions } from "../../hooks/use-preferences";
import { LIST_PAGING_MODES, type ListPagingMode } from "../../services/preferences-service";

const PAGING_LABELS: Record<ListPagingMode, { label: string; hint: string }> = {
  pages: {
    label: "Pages",
    hint: "One screenful at a time, with arrows to move between them. The page fills the window, so a bigger window is a bigger page.",
  },
  scroll: {
    label: "One long scroll",
    hint: "Everything in one list you scroll through, with no page breaks.",
  },
};

export function ListSettings() {
  const listPaging = useListPaging();
  const { setListPaging } = usePreferenceActions();

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
    </div>
  );
}
