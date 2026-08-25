# Release notes

What's new in each published version of Anamnesis, written for the people
using it. Each section here is the text that goes on that version's
[releases page](https://github.com/Shirohibiki-chan/anamnesiswiki/releases), and
it's what the update button shows you before you install.

This is the short version on purpose. `CHANGELOG.md` (and its archive,
`docs/changelog-archive.md`, linked from the bottom of it) is the full log —
every fix, every adjustment, in the order it happened. If you want to know
what changed, read this. If you want to know *everything* that changed, read
that.

---

## v0.5.0 — 2026-08-25

The right-hand panel stopped being a fixed list of fields and became something you arrange yourself. Everything in it is a block now — the picture, your tags, every property — and there are new kinds to add: backlinks and lists of pages, and meters, which draw a number as a picture. Plus aliases, and a long run of fixes to keys that weren't doing what they said.

### The sidebar is a canvas

- **Everything in the panel is a block you can add, remove, reorder and duplicate.** Drag one by the grip that appears when you hover it, or use Move up / Move down in its `⋯` menu.
- **Every block has its own menu** — rename its heading, turn the heading off, give it a colour, duplicate it, move it, remove it. Double-clicking a heading renames it too.
- **Two new kinds: Text block and Link block.** A text block is somewhere to write beside the page rather than in it. A link block points at another page and follows it if you rename that page.
- **Removing a block never deletes what you typed.** Take a property off the panel and the value stays on the page — it's hidden, not gone, and Add Block lists everything you've hidden. Deleting a field for real is **Delete property**, worded apart on purpose, and it asks first if there's anything in it.
- **Your existing pages look exactly as they did.** Every page written before this works out its own layout the first time you open it, and nothing is rewritten until you actually change something.

### Lists of pages, and backlinks

- **Backlinks.** A block that lists every other page pointing at this one — whether it mentioned this page in its writing, named it in a field like Friends, or put it in a hand-made list. Each row says which, so a page in the list is never a mystery.
- **Three more lists, and they're all the same block.** Add Block offers **Backlinks**, **Subpage index**, **Tag index** and **Manual links**. One block with a source you can change afterwards, so a list you set up as subpages can become backlinks without deleting anything.
- **An empty list tells you why it's empty** rather than just sitting there.
- **Aliases.** Give a page other names it answers to — Valera Jiang can be "Val". `[[Val]]` links straight to her, and searching "Val" finds her.

### Meters

- **A number drawn as a picture instead of typed as a fact.** How loyal someone is, how far along a war is, how many rations are left. Add Block has a **Meters** group with eight shapes: Progress bar, Spectrum, Circle, Semi-circle, Gauge, Pie chart, Rating and Token pool.
- **One block holds several meters** — a panel of stats, not a single reading. Each carries its own icon, name, numbers and colour.
- **Every meter has an icon**, picked from about 1,900 of them, searchable by what you'd call it — "health" finds the heart — plus a tab of emoji.
- **Drag any of them to set it.** Hovering shows what a click would do before it does it. Arrow keys work too.
- **A pie chart divides one circle between all its meters.** Each slice is sized by its share, coloured for you, labelled with its percentage, and you can drag the edge between two slices to move it — the two either side trade with each other and nothing else on the chart moves. A line above the chart names whatever you're pointing at.
- **A Spectrum is a marker between two words, with no number on it** — `nonchalant ——●—— emotional`. For the things about a character that aren't a quantity. Type the two words straight into the ends; each one sits on its own card so a block of them stays readable.
- **Type into a meter's number to set it exactly**, as `62` or as `4/10`. Or draw it in segments instead of one solid sweep, per meter or for the whole block.

### Fixes

- **Menus answer the keyboard.** Opening one puts the cursor on its first item, Up and Down walk the list and wrap around, Enter picks, Escape closes and puts the cursor back on the button that opened it. Tab stays inside the menu instead of sailing past it into the page behind.
- **Tab stays inside dialogs too** — Settings, Import, Export, the picture picker, Manage pins and the rest all keep the cursor in, wrapping at either end.
- **Tab in the `[[` menu takes the highlighted page**, the way `]]` already did. Before, it fell through into the editor and rearranged the block you were writing in — that's the "it turns into a quote" you kept hitting. Same for `/` and `@`.
- **`[[name]]` no longer picks silently between two pages called the same thing.** It holds the menu open with both on it and waits for you to choose. And a page whose name you typed exactly now wins over a longer one listed above it.
- **The X closes the app from every screen**, including the start screen and after a refresh, and a close that fails can simply be tried again instead of jamming the button for the rest of the session.
- **Refreshing the app no longer locks you out of the project you had open.** A window remembers who it is across a refresh and takes its own project straight back. Two genuinely separate copies are still kept apart.
- **When Anamnesis says a project is open in another window, you can overrule it.** An **Open it anyway** link sits beside the message — the check is a guess, and a crash or a sync client looks exactly like a second window from the outside.
- **The template prompt can be sent away**, with an × on it, and the page remembers. Add Block offers **Apply a template** afterwards, so dismissing it never closes the only door.

---

## v0.4.0 — 2026-08-21

The screen you land on is a library now — every project you have, with covers, pinned favourites, groups and an archive, instead of the last eight you opened. Alongside that: pictures anywhere in a page and a library to keep them in, templates you can actually edit, four new kinds of property, and a lot of small things that were in the way every day.

### Your projects have a home screen

- **Every project you own is on it**, not just the last eight. Covers or a list, whichever you prefer, and you can page through them.
- **Pin the ones you're always in** to a row across the top, in whatever order you like.
- **Give a project a cover.** Any picture from the project, or one from your computer.
- **Sort projects into groups** — a row of chips under the heading, and a project can be in as many as you like. Groups live in the app, so nothing on your disk moves or gets renamed.
- **Archive what you're done with.** It folds out of sight without touching a single file, and comes back exactly where it was.
- **Rename, duplicate, or show a project in File Explorer**, all from the `⋯` menu on it. Renaming changes the name and the folder together so the two can't drift apart.
- **Start a project from a template**, and **send somebody your project's shape** as a small file. It carries your folders and what nests in what — none of your writing, no page names, no pictures.
- **Two windows can't open the same project any more.** Launching Anamnesis twice used to put both copies on the same files, each saving over the other.

### Pictures

- **Put a picture anywhere in a page**, not only in the sidebar. Drag it in, paste it, or pick one you've already used.
- **A picture library**, under Assets: every picture in the project as a grid, sorted into folders you make, searchable by what it's used for, with the ones nothing is using listed first so they're easy to clear out.
- **Click any picture to open it full size**, from a page or from the library.
- **Name and caption your pictures.** The name sits on the picture in the library; naming one doesn't rename the file on your disk.
- **Using the same picture twice stops making a second copy of it.**

### Templates you can change

- **Edit any template, including the ones that came with the app** — Character, Location, all of them. You're editing this world's copy, and there's a Put back to the original if you change your mind.
- **Turn a page you like into a template**, from its right-click menu.
- **Drag your templates into the order you want them offered in**, and start a new page from one directly.
- **Editing a template never touches pages you already made from it.**

### Getting around

- **Back, forward and home**, at the top left, all rebindable.
- **A `⋯` menu on every page in the sidebar**, holding the whole right-click menu: move to, duplicate, sort sub-pages, expand or collapse a branch, show in File Explorer.
- **Any page can hold pages.** Notes, items and events too — nothing is flat-only any more, and there's no depth limit; your computer decides.
- **Pin the pages you keep coming back to.**
- **Hide a page from anyone you show your world to**, and everything under it.
- **Rest the pointer on a link or a `[[mention]]`** and the page it points at appears in a card without opening it.
- **Both side panels drag to whatever width you want.**

### Properties

- **Four new kinds:** Number, Select, Multi-select and Status.
- **Every property suggests values you've already used elsewhere**, so you stop retyping yourself, and a new value shows up for the other pages once you invent it.
- **Drag properties into the order you want**, per page.
- **One place listing every property and every tag in the project**, including what's inside your Select and Status fields.

### Code blocks

- **Syntax colouring**, a header bar with the language on it, and a copy button. Three backticks and a space starts one.
- **Plain text is the default and is never coloured**, so a block full of braces and asterisks comes through exactly as you typed it.

### Fixes worth knowing about

- **Pages stopped saving long before they had to.** A long page title now gets a shorter filename instead of blocking the save.
- **A folder that had gone wrong once stayed broken forever.** Opening a project repairs what it finds and tells you what it repaired.
- **Pages that came loose from the page they were nested in get put back.**
- **Opening a project lands on the page you were last on**, which it had always remembered and never used.
- **Pictures and code blocks inside a page now survive importing a `.lk` file** — both used to arrive empty or missing. Pictures you added yourself can go back out again too.

---

## v0.3.0 — 2026-08-08

Anamnesis looks however you want it to now. There are seven themes instead of
one, you can build your own from inside Settings without touching a file, and a
theme is just a `.css` file you can hand to someone else. Alongside that:
search that reads your writing and not just page titles, undo in the sidebar,
export back out to LegendKeeper, and shortcuts you can change. This is also the
first version built for Mac and Linux as well as Windows.

### Themes, and making your own

- **Seven themes.** *Midnight* — deep navy, teal, and its own set of fonts — is
  what you start on now. *Anamnesis Dark* is what the app used to look like.
  *Daylight* is a real light mode. *Ember* is warm charcoal and copper, *Grove*
  is forest green and old gold, *Nightbloom* is dark plum and orchid, and
  *Abyssal* is deep ocean blue, cyan and violet. Each one has its own callout
  colours, so Info, Quote and Secret still read as three different things
  wherever you are.
- **Change any colour, in Settings → Colours.** Twenty colours and all twelve
  gradients — backgrounds, top bar, sidebar, buttons, selected page, tags, page
  titles, headings, the callout wash. Gradients can be a straight line at any
  angle or a glow from a point, with a see-through slider on each end. Changes
  land as you make them; there's nothing to save.
- **One button fills in the other three background colours.** The app has four
  of them, which is the thing that made building a light theme annoying —
  changing one left you with a pink dialog full of navy boxes. Pick the colour
  you want and press *Match the others to Panels*.
- **A theme is a file.** Drop a `.css` into `Documents\Anamnesis\themes` and it
  turns up in the list. Edit it in Notepad with the app open and the window
  changes as you save. Press *New theme* in Settings → Themes to copy the one
  you're on into a file of your own, and it becomes an ordinary file too —
  nothing is locked to the place you made it.
- **Import a theme, or a palette from another app.** Point it at a `.css`
  somebody sent you, or at a `.json` palette exported from a palette tool, and
  it works out which colour is the window, which is the accent, which is the
  delete-button red. Every text and border colour is solved for readability
  rather than guessed, so an imported theme can't come out harder to read than
  the built-in ones.
- **Snippets.** A `.css` file in `Documents\Anamnesis\snippets` gets its own
  on/off switch and sits on top of whichever theme is on — for changing one
  thing without building a whole theme.
- **98 fonts ship inside the app**, so anything you pick renders the same on any
  machine with nothing to install. Titles are in a serif now rather than the
  same sans-serif as everything else.
- **Fonts belong to the theme, the same as its colours do.** Pick one in
  Settings → Fonts and text and it's written into that theme's file — so
  switching theme switches the fonts with it, and a copy keeps the faces it was
  copied with. If you'd rather have one set of fonts everywhere regardless of
  theme, there's a switch at the top of that panel for exactly that, and it's
  per slot: your reading font can stay put while the titles follow the theme.
- **Two text-size sliders, Writing and Interface.** They used to be one control,
  so getting your pages comfortable dragged the menus along with them.
- **Small grey text is readable in every theme.** The greys used for hints,
  dates, counts and field notes were failing the standard contrast check in all
  of them. Hover was worse — on Daylight, hovering a page in the sidebar painted
  white on white and changed nothing at all. Both are fixed everywhere.

### Finding things

- **Search everything you've written, with Ctrl+K.** Not just page names — tags
  and the actual text on every tab. Results show which folder a page lives in
  and the sentence the match came from, and opening one takes you to the tab it
  was found on rather than dumping you on Overview. It searches hidden tabs too,
  and says so when a result comes from one.

### Undo

- **Ctrl+Z undoes what you did to the sidebar**, and Ctrl+Y does it again.
  Adding, deleting, renaming, moving, duplicating, colouring and setting your
  home page, including when you did any of those to several pages at once. It
  goes back 25 steps and starts fresh each time you open a project. Deleting a
  page keeps its picture aside, so undo brings back the whole page rather than
  one with a hole in it. While your cursor is in a page's writing, Ctrl+Z
  belongs to the writing, the same as in any other app.

### Keyboard

- **Every shortcut can be changed, in Settings → Keyboard.** Click the keys,
  press what you'd rather use. It turns down a key that's already busy and says
  what has it. Shortcuts need Ctrl held down, except F1–F12, which are allowed
  on their own if you'd rather have one-key options.
- **Ctrl+N makes a page** next to the one you're on — the thing the sidebar's
  **+** couldn't do, since that always meant "inside this".
- **Ctrl+S** writes anything still waiting and flashes *Saved*. Anamnesis
  already saves as you type; this is for when you want to see it happen.

### LegendKeeper

- **You can export back out.** Right-click a page for a `.lk` of it and
  everything under it, or your project's name for the whole thing. You get a
  preview of what's going and anything that won't survive the trip before it
  writes. Pictures are the one real limit and it's LegendKeeper's: a `.lk` holds
  web addresses rather than the pictures themselves, so a picture that came from
  LK goes home fine and one you added here gets left out, with a count.
- **Importing brings your LK home page across** as a real page, already set as
  your project home, with cross-references to it working.
- **Importing is much faster and tells you what it's doing.** Pictures come down
  six at a time instead of one, which is most of a minute back on a world with
  53 of them, and the screen counts them as they arrive instead of sitting
  still.
- **It stops making you find a folder.** The preview says where the project is
  about to land, and Import puts it there. Settings → Projects is where you
  change that for good; there's a *Change* next to the folder for a one-off.

### The sidebar

- **Select more than one page at a time.** Ctrl-click to add, shift-click for a
  run — then drag, colour or delete them all at once.
- **Your project can have a home page.** Right-click any page and set it; it
  gets a house next to its name and the house at the top of the sidebar becomes
  a button that goes there.
- **Lines showing what's inside what.** Each level of nesting has a faint
  vertical line running down it, so you can follow a row back up to its folder
  instead of counting indents.
- **It doesn't scroll sideways any more.** Nesting a few folders deep used to
  push everything wider than the panel and take the colour dot and **+** button
  off the edge with it. Long names shorten with a `…` instead.

### Settings

- **Settings is a proper screen now**, not a narrow dialog with everything
  stacked in one scrolling column. Sections are down the left-hand side and each
  one fits on screen. Nothing was taken away — the same controls are behind
  shorter walks.

### Your work staying where you put it

- **A move that gets interrupted puts everything back** rather than leaving
  pages under a temporary name where the app walks past them. Anything already
  left in that state is found and restored next time you open the project, and
  you're told rather than it happening quietly.
- **Any failed save shows the warning now**, not just failures while typing.
  That was the real reason this could bite: the app knew and said nothing.
- **A page dropped onto a page that can't hold pages is refused** at the point
  of dropping, instead of looking like it worked and being gone next time you
  opened the project.

### Everything else you'll notice

- **No white flash when Anamnesis opens.** The window stays hidden until there's
  something dark to show.
- **The scroll wheel, and the scrollbars.** The page and the properties panel
  each scroll inside their own box now, and the app's scrollbars are the thin
  dark ones they were always meant to be rather than the Windows default.
- **No more white boxes** around whatever you last clicked. Nothing gets the
  white ring anywhere; things you reach with the keyboard get a teal one.
- **Hovering fades instead of snapping**, and buttons, dialogs, spacing, corners
  and text sizes agree with each other across the app instead of each screen
  having built its own.
- **The window is called Anamnesis**, not the placeholder title it shipped with.
- **New writing prompts in all eight templates** — shorter, more specific, and
  none of them anyone else's writing. Pages you've already made don't change;
  templates only fill a page in when it's first created.

### Installing it

- **Mac and Linux builds.** Windows, macOS (Intel and Apple Silicon) and Linux
  are all built and signed now. Before this, a Mac looking for an update found
  no entry for itself at all.

---

## v0.2.1 — 2026-07-31

- **The settings cog reaches an installed copy.** It landed just after v0.2.0
  was built, so it existed in the project but in no version you could run. This
  release is the one that carries it — and the first time the
  download-and-install path ran for real rather than only in tests.

## v0.2.0 — 2026-07-31

- **First published release.** Anamnesis became something you download from the
  releases page rather than something that only existed on the machine it was
  built on.
- **A settings cog**, reachable from the start screen and from the top bar once
  you're inside a project.
- **The update button.** Anamnesis can tell you when a newer version exists and
  install it for you. Nothing happens on its own — you press the button. It
  sends nothing about you or your worlds, and updating only ever replaces the
  app itself.
