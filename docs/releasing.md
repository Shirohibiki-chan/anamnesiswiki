# Cutting a release

Publishing a new version is three commands. GitHub does the rest — it builds
Anamnesis for Windows, macOS and Linux, writes the file the update button reads,
and puts it all on the releases page as a draft for you to look at before anyone
gets it.

## What changed in Phase 29 (2026-08-25)

The app moved from Tauri to Electron, and the release pipeline moved with it.
The commands below are the same. What is different underneath:

- **`release-electron.yml` is what a version tag builds now.** The old
  `release.yml` still exists, set to manual-only, as a way back if the new one
  ever fails badly. Delete it once an Electron release has shipped and settled.
- **The updater's signing key is no longer used.** Tauri verified each update
  against a key you hold; electron-updater verifies the SHA-512 published in the
  release feed and fetched from GitHub over HTTPS. The
  `TAURI_SIGNING_PRIVATE_KEY` secret is harmless where it is and does nothing —
  leave it until the old workflow is deleted.
- **The AppImage repack job is gone**, along with the problem it existed for.
  That was Tauri's bundler sealing the host's graphics libraries into the
  AppImage; electron-builder builds its own. **Confirmed 2026-08-27**: an
  Electron AppImage from a dry run started on the same Fedora machine that used
  to die with `EGL_BAD_PARAMETER` before a window appeared, with no
  `LD_PRELOAD` and no workaround.
- **You can test the pipeline without spending a version number.** Actions tab →
  Release (Electron) → Run workflow. It builds all three platforms and attaches
  the installers to the run instead of creating a release.

## Nothing is code signed, on purpose

Decided 2026-08-25, after pricing it: a Windows certificate is a few hundred a
year and an Apple one is another hundred on top, and all they buy is the absence
of a warning. The Tauri builds were never signed either, so this is not a
change — it is the same position, written down.

What that means for whoever installs it:

- **Windows** shows "Windows protected your PC" the first time. More info → Run
  anyway. Same as every release so far.
- **Linux** neither asks nor cares.
- **macOS refuses to open it from a double-click.** The way past is right-click
  the app → Open → Open. **Say so in the release notes when there is a Mac
  build**, because someone hitting that with no explanation reads it as broken.
  Mac updates also have to be done by hand — the automatic updater cannot
  install an unsigned build on that platform.

**One thing to check before upgrading electron-builder across a major version:**
skipping the update signature check is deprecated. A future version treats a
missing publisher name as a *failed* verification rather than a skipped one,
which would stop Windows updates dead. See the comment in `electron/main.js`.

## The updater key — retired, not needed

**There is no one-time setup any more.** This section used to walk through
putting a minisign key into the repository Actions secrets, because Tauri
verified every update against a key she holds. Electron does not work that way:
`electron-updater` checks the SHA-512 published in the release feed and fetched
from GitHub over HTTPS, and no key of ours is involved.

So `TAURI_SIGNING_PRIVATE_KEY` and its password secret do nothing. They are
harmless where they are and should be left until `release.yml` is deleted,
which is what still reads them. **Nothing needs to be set up before an Electron
release can be cut.**

This is unrelated to code signing, which is a separate thing the project
deliberately does not do — see the section above. The key was free and local;
a certificate is neither.

## Every release after that

```bash
node scripts/set-version.mjs 0.3.0
```

That's the version number written into the four places that hold it — including
`package.json`, which is the one the Electron build reads. Then:

```bash
git commit -am "Release v0.3.0"; git tag v0.3.0; git push; git push --tags
```

**The separators are semicolons, not `&&`, on purpose.** Windows PowerShell 5.1
— which is what the terminal here runs — has no `&&` operator and refuses the
whole line with a parser error before running any of it. A command written with
`&&` will look like it did nothing. Git Bash accepts semicolons too, so this
form works in both.

Pushing the tag is what starts it. Watch it on the
[Actions tab](https://github.com/Shirohibiki-chan/anamnesiswiki/actions) — it
takes roughly twenty minutes, most of which is four machines compiling.

When it finishes there's a **draft release** on the releases page with the
installers attached, **and its description is already filled in** — the build
reads that version's section out of [`RELEASES.md`](../RELEASES.md) itself.
Nothing to paste.

**Publish it from the Releases tab, and only from there.** Go to
[Releases](https://github.com/Shirohibiki-chan/anamnesiswiki/releases), find the
entry titled **Anamnesis v0.3.0** with a grey **Draft** label beside it, open it,
and press **Publish release**.

> **Don't use the Tags tab.** Its `⋯` menu offers **Create release**, which
> sounds right and is not: it makes a *second*, empty release pointing at the
> same tag — no installers, no notes, no `latest.json` — and publishes that
> instead. GitHub will happily keep both, with the empty one marked *Latest*, so
> the update button finds nothing. This happened on v0.4.0. The tell is a
> release whose title starts with the tag name followed by a commit message, and
> whose only assets are GitHub's automatic *Source code* archives.
>
> To recover: delete the empty release (the tag itself is fine and stays), then
> publish the real draft.

**Write the section in `RELEASES.md` before tagging.** Not as tidiness — the
build now refuses to start without it, and the reason is in the next section.

**Write it unwrapped — one line per paragraph, one line per bullet.** GitHub
renders a release body with every newline as a hard line break, and so does the
app's update panel, so a section wrapped at 78 columns reaches the reader as a
narrow ragged column. `scripts/release-notes.test.mjs` fails the build if the
current version's section is wrapped, so this is enforced rather than
remembered. Older sections in the file are still wrapped and are left alone;
they are already published.
It's the plain-language read of what changed; `CHANGELOG.md` stays the full log
and is what you write it from.

Nothing reaches anyone's update button until you press that. That's the point of
the draft — the release is assembled by four separate machines finishing at
different times, and publishing early would offer people an update whose
installer for their platform hadn't been built yet.

## What the update panel shows

All of it, the way you wrote it. When someone's update button finds a new
version, the panel shows that release's notes with your `###` headings as
headings, your `-` bullets as bullets, and `**bold**`, `*italic*` and `` `code` ``
looking like what they are. So write the section in `RELEASES.md` the way you'd
want it read — that's the thing people actually read before deciding to install,
and nothing gets trimmed on the way to the screen.

The version heading is dropped on the way in, because the panel's own headline
directly above already says *Anamnesis 0.3.0 is available*.

### Why the notes have to be right *before* you tag

**The update panel does not read the release description.** It reads
`latest.json` — the small file the build uploads beside the installers — and
that file carries its own copy of the notes, written when the build ran. Editing
the release on the web afterwards changes the page and *not* `latest.json`, so
the panel would keep showing whatever the build put there.

This is why the release body is generated from `RELEASES.md` rather than typed
in afterwards, and why a missing section fails the build in the first few
seconds instead of twenty minutes later. It was learned the expensive way: v0.3.0
built with a placeholder body reading "See CHANGELOG.md for what changed", which
had to be corrected by editing `latest.json` on the draft by hand before it could
be published.

If it ever happens again, that repair is: download `latest.json` from the draft,
replace its `notes` field, and re-upload it with
`gh release upload <tag> latest.json --clobber`. Nothing needs rebuilding — the
signatures in that file cover the installers, not the file itself.

There's also a **Read this on GitHub** link under the notes, for reading them in
a browser window instead. Same text, more room.

A few things don't carry across, none of which you're likely to hit:

- **Links become their words.** `[the docs](https://…)` shows as *the docs*,
  not as something clickable — nothing in a release should be able to send
  someone off somewhere from inside the app. Put the address in the notes as
  plain text if it matters, or leave it to the GitHub link.
- **Images are dropped.** There's nowhere sensible to put one in a panel that
  size.
- **Underscores aren't italics.** `_like this_` shows as-is. Use `*stars*`.
  That's on purpose: these notes are full of `_folder.json`, `snake_case` and
  `project_home`, and having those come out mangled would be much worse than
  losing a way of writing italics you weren't using anyway.
- **Nested bullets flatten** to one level.

Long notes scroll inside the panel rather than pushing *Download and install*
down the screen, so length isn't something you have to write around.

## What can go wrong

**"Expected 0.3.0, but: package.json: 0.2.1…"** — the tag and the version files
disagree. This check runs first, before twenty minutes of compiling, precisely so
this is the cheap failure. Run `node scripts/set-version.mjs` with the right
number, commit, delete the tag (`git tag -d v0.3.0` and
`git push --delete origin v0.3.0`), and tag again.

**One platform failed, the others worked.** The release still gets made with what
succeeded. Re-run just the failed job from the Actions page; it adds its
installer to the same draft.

**"The command line is too long", on Windows only.** Happened on v0.6.0 and
fixed the same evening. The release notes used to be handed to electron-builder
as a command-line argument, and Windows caps a command line at 8,191 characters:
that version's notes were 9,914, so the Windows job died in about a second while
macOS and Linux published normally, leaving a draft with two thirds of a release
in it. The notes go through a file now, which has no ceiling — but if anyone
ever puts them back on the command line, this is what it looks like.

**A failure inside the workflow itself cannot be fixed by re-running the job.**
Worth knowing before reaching for the re-run button, because the advice above is
for a build that failed, not for a workflow that was wrong. A re-run checks the
tag out again, so it runs the same broken file. The repair is: fix it on `main`,
delete the half-built draft from the Releases tab, delete the tag
(`git tag -d v0.6.0` and `git push --delete origin v0.6.0`), and tag the fix.
Reusing the version number is right here — nothing was ever published under it.

**The build worked but nobody's update button finds it.** Almost always the
signing secret: without it the installers ship unsigned and every existing copy
of Anamnesis refuses them. Check `TAURI_SIGNING_PRIVATE_KEY` is set, then re-run.

## What this replaced

Bumping the version in three files by hand, remembering to set the signing key
as an environment variable before building, hand-writing `latest.json` with the
signature contents pasted into it, and repeating all of it once per platform —
which in practice meant Windows only, so `latest.json` never declared any other
platform and a Mac would have found no entry for itself at all.
