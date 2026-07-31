# Launchers

Two double-clickable scripts, both for the same problem: the copy of Anamnesis
in the Start menu only changes when someone publishes a release, so between
releases it's behind whatever's in the repo.

Shortcuts to both live on the Desktop. Neither needs a terminal, and neither
needs anything typed.

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
