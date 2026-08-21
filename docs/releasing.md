# Cutting a release

Publishing a new version is three commands. GitHub does the rest — it builds
Anamnesis for Windows, macOS and Linux, signs the update, writes the file the
update button reads, and puts it all on the releases page as a draft for you to
look at before anyone gets it.

## One-time setup — ✅ done 2026-07-31

**Already handled. The signing key is in the repository's Actions secrets, so
releases work now.** Kept below because it's what to redo if the key is ever
rotated or the secret is deleted, and because nothing in this repo may touch the
key — only you can do this part.

Anamnesis signs its updates so the app can tell a real update from something
pretending to be one. The key that does the signing lives on your machine at:

```
C:\Users\shiro\.tauri\anamnesis-updater.key
```

GitHub needs a copy to sign the builds it makes. Copies of it go in GitHub's
encrypted secrets, which are write-only — once saved, nobody (including you) can
read it back out of the web page.

1. Open that key file in Notepad and copy **all** of it.
2. Go to
   [the repository's Actions secrets](https://github.com/Shirohibiki-chan/anamnesiswiki/settings/secrets/actions).
3. **New repository secret**. Name it exactly `TAURI_SIGNING_PRIVATE_KEY`, paste
   the key into the value box, and save.
4. If you set a password on the key when you made it, add a second secret called
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` with that password. If you didn't, skip
   this — an empty one is fine.

Don't paste the key anywhere else: not into a file in the repo, not into a chat,
not into a commit. The repository is public.

## Every release after that

```bash
node scripts/set-version.mjs 0.3.0
```

That's the version number written into the four places that hold it. Then:

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

**The build worked but nobody's update button finds it.** Almost always the
signing secret: without it the installers ship unsigned and every existing copy
of Anamnesis refuses them. Check `TAURI_SIGNING_PRIVATE_KEY` is set, then re-run.

## What this replaced

Bumping the version in three files by hand, remembering to set the signing key
as an environment variable before building, hand-writing `latest.json` with the
signature contents pasted into it, and repeating all of it once per platform —
which in practice meant Windows only, so `latest.json` never declared any other
platform and a Mac would have found no entry for itself at all.
