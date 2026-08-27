// Settings → Privacy. Nothing to switch, which is the point.
//
// A tab of its own rather than a line in a README nobody opens. "It collects
// nothing" is only worth saying where somebody would go looking to turn
// something off — anyone who arrives here suspicious should be able to read
// the page and leave satisfied.
//
// **Usage reporting was built and then removed, 2026-08-27.** It was hers to
// ask for and hers to drop: with a handful of users the numbers would have
// said less than asking them would, and the app is easier to hand to somebody
// when the answer to "what does it send" is nothing at all. See
// `docs/plan.md` → Phase 29.
//
// **If anything in the app ever sends something, it gets said here**, in this
// file, before it ships. That is what makes this page worth having.

export function PrivacySettings() {
  return (
    <div className="appearance-settings">
      <section className="sidebar-setting" data-setting="privacy-collected">
        <h3 className="sidebar-setting-label">What Anamnesis collects</h3>
        <p className="sidebar-setting-blurb">
          Nothing. There's no account and no sign-in, and nothing reports back on how you use the app — not which
          features you open, not how often, not from where. There's no switch on this page because there's nothing
          running to turn off.
        </p>
        <p className="sidebar-setting-blurb">
          Your worlds are ordinary folders of files on your own disk. You can open them, copy them, back them up or
          walk away with them, and none of that needs Anamnesis's permission.
        </p>
      </section>

      <section className="sidebar-setting" data-setting="privacy-network">
        <h3 className="sidebar-setting-label">When it uses the internet</h3>
        <p className="sidebar-setting-blurb">Twice, and both times because you pressed something:</p>
        <ul className="sidebar-setting-list">
          <li>Fetching the pictures in a world you're importing from a <code>.lk</code> file.</li>
          <li>Checking whether a newer version exists, when you press Check for updates.</li>
        </ul>
        <p className="sidebar-setting-blurb">
          That's the whole list. Nothing happens on a timer, nothing happens in the background, and the app works
          the same with the internet switched off.
        </p>
      </section>
    </div>
  );
}
