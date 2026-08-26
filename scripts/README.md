# Launchers

Double-clickable scripts, all for the same problem: the copy of Anamnesis in the
Start menu only changes when someone publishes a release, so between releases
it's behind whatever's in the repo.

Shortcuts live on the Desktop. None of them needs a terminal, and none needs
anything typed.

**Two shells exist at the moment** (Phase 29 — see `docs/plan.md`). The Electron
pair is the one the app is moving to; the Tauri pair below it is what is
installed today. Both open the same worlds, so it is safe to go back and forth.

### `Anamnesis Electron (latest code).bat`  — the Phase 29 shell

Same idea as the Tauri one below, for the app's new shell: opens Anamnesis
running from the source in this folder, pulls first, keeps a black window open
that *is* the app.

Two differences worth knowing. It needs no Rust, so there is one less thing that
can be missing or out of date. And it runs its dev server on a different port
from the Tauri launcher, so both can be open at once — useful while the two
shells still exist side by side.

Use when: you want today's work in the new shell, right now.

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

### `Anamnesis (latest code).bat`

Opens Anamnesis running straight from the source in this folder, so it always
has the newest committed code. Pulls first, then starts.

Leaves a black console window open — that window *is* the app process, and
closing it closes Anamnesis. Startup is a few seconds after the first run of
the day (Rust caches its build), longer if Rust files changed.

Use when: you want today's work, right now.

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
