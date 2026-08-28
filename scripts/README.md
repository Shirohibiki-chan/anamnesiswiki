# Launchers

Double-clickable scripts, all for the same problem: the copy of Anamnesis in the
Start menu only changes when someone publishes a release, so between releases
it's behind whatever's in the repo.

Shortcuts live on the Desktop. None of them needs a terminal, and none needs
anything typed.

**There is one shell.** Anamnesis moved to Electron in v0.6.0 and the Tauri
launcher was deleted on 2026-08-28. The file below still has *Electron* in its
name only because renaming it would break the Desktop shortcut pointing at it.

### `Anamnesis Electron (latest code).bat`

Opens Anamnesis running from the source in this folder, so it always has the
newest committed code. Pulls first, then starts.

Leaves a black console window open — that window *is* the app process, and
closing it closes Anamnesis. It needs no Rust, so there is one less thing that
can be missing or out of date.

Use when: you want today's work, right now.

### `Install Anamnesis (Electron).bat`

Builds an installer from the current source and runs it, so the new shell ends
up in your Start menu like an ordinary program.

**It installs alongside the copy you already have**, so until you uninstall the
old one there will be two Start menu entries both called Anamnesis. They read
the same worlds — nothing is duplicated except the entry.

Windows will say the publisher is unknown. That is expected: nothing here is
code signed, by choice (see `docs/releasing.md`). More info, then Run anyway.

Builds into `%TEMP%` rather than into the project folder, because a dev server
watching this repo makes the packaging step fail — see the note in the script.

### `Test Anamnesis.bat`

Checks the app still works, by building it and then opening and driving it
several times over on a made-up world. Windows flash open and shut while it
runs — that is the test, not a fault.

**It cannot touch your worlds.** Every world it opens is generated in a
temporary folder and deleted afterwards, and it reads its settings from a
scratch folder rather than the real one.

Takes about half a minute. Use when: something feels off and you want to know
whether it is the app or just you, or after pulling a change you want to sanity
check. `docs/testing.md` is the longer version.

### `Update installed Anamnesis.bat`

Rebuilds from source and installs over the copy in your Start menu, so the
normal app becomes current. Takes a few minutes and then needs nothing kept
open afterwards.

Needs the updater signing key at `%USERPROFILE%\.tauri\anamnesis-updater.key`
— the build refuses to run without it, because `tauri.conf.json` declares the
matching public key and a build signed with nothing would produce updates no
installed copy would accept. If the key is missing the script says so and
stops without touching your installed copy.

Use when: you want the ordinary app, with no console window, to be up to date.

### Neither of these is a release

Publishing to the releases page is still a separate, deliberate step — it's
what lets an installed copy elsewhere find an update via the in-app check.
These two only affect this machine.
