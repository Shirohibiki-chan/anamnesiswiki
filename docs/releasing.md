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
git commit -am "Release v0.3.0" && git tag v0.3.0 && git push && git push --tags
```

Pushing the tag is what starts it. Watch it on the
[Actions tab](https://github.com/Shirohibiki-chan/anamnesiswiki/actions) — it
takes roughly twenty minutes, most of which is four machines compiling.

When it finishes there's a **draft release** on the releases page with the
installers attached. Paste in that version's section from
[`RELEASES.md`](../RELEASES.md) — it's written for exactly this — then press
**Publish release**.

Write the section in `RELEASES.md` *before* tagging, so it goes out with the
release rather than being remembered afterwards. It's the plain-language read of
what changed; `CHANGELOG.md` stays the full log and is what you write it from.

**Keep the first paragraph plain.** The app's update panel shows the release body
as unformatted text in a single block — headings, bullets and `**bold**` arrive
as literal characters — so the opening paragraph is what people actually read
before deciding to install. Everything below it is for the releases page, where
it renders properly.

Nothing reaches anyone's update button until you press that. That's the point of
the draft — the release is assembled by four separate machines finishing at
different times, and publishing early would offer people an update whose
installer for their platform hadn't been built yet.

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
