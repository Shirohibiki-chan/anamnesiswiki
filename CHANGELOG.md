# Changelog

## 2026-08-28 — the templates are laid out our way now

### Changes

- **Every template has been rebuilt from the shape up.** The words were rewritten a while back, but the layout under them hadn't changed at all — the same tabs in the same order, the same headings, and the same run of blocks repeated identically on every tab of every template. That's all been redesigned.
- **Headings ask you something instead of labelling a box.** "What you notice first" rather than "Description", "What it costs to use" rather than "Function". Where a heading already says everything, there's just an empty line to start typing on rather than a paragraph of instructions to delete first.
- **The tabs are named for what's in them.** No more "Overview" on everything: a Character opens on *Who They Are* with *Ties* beside it, a Location on *The Place*, an Item on *The Thing Itself*.
- **Character has a Ties tab.** Somewhere to put who they're closest to, who they're at odds with, and who owes whom — with a reminder that @ links a page that already exists.
- **Species is three tabs instead of five.** Five on an empty page read as homework. Beliefs and Relations are now sections inside *Living*.
- **Faction splits into what they want, who's inside, and what everyone else thinks** — the last one hidden until you want it.
- **Each template opens differently.** The prompt at the top asks for something now rather than telling you what a character or a location is, and the quote and secret blocks turn up where they're actually useful instead of on every single tab.

**Pages you've already made are untouched.** This only changes what a *new* page starts with. If you've customised a built-in template yourself, your version still wins.

## 2026-08-28 — undo reaches the panel, and the tree keeps its own history

### Additions

- **Undo now covers the panel down the right of a page.** Every field, every tag, the other names, a picture's crop and description, and every block in it — added, removed, moved, recoloured, renamed, or a meter dragged. Until now that panel was the one part of the app where a mistake couldn't be taken back.
- **A run of typing counts as one undo, not thirty.** Keep typing in a field and it stays one edit; stop for a couple of seconds and whatever you type next is its own. Same for dragging a meter or moving a picture's crop — one drag, one undo.
- **A page's tabs can be undone too** — adding one, renaming it, hiding it, dragging it into a different order, and deleting one. Deleting a tab takes what's written in it with it, and until now that was gone the moment you clicked. *What's inside* a tab is still the editor's own undo on Ctrl+Z, unchanged.
- **The undo message says what it undid** — "Undid changing Age", "Undid adding a meter" — in the same place saving reports itself.
- **The tree itself has earlier versions now.** Right-click the project's name at the top of the sidebar and choose *Earlier versions of the tree*. It keeps the order of your pages, which one is the home page, which are pinned and which folders were open — the things that live in `project.json` rather than in any page.
- **Restoring an arrangement leaves your pages alone.** Nothing is written, deleted or brought back; pages deleted since the copy was taken stay deleted, and the panel says how many of those there are before you press anything.
- **Settings → History.** How often a copy is kept (every minute up to every half hour), how far back they go (a week up to a year) and how many any one page keeps.
- **A page's right-click menu says how many earlier versions it has**, or "none yet", so you can tell without opening the list.

## 2026-08-27 — Ctrl+Z belongs to what you're writing

### Changes

- **Ctrl+Z now only ever undoes your writing.** It used to do double duty: the editor's undo while your cursor was in a page, and Anamnesis's own undo — the one that takes back a rename, a delete, a move — everywhere else. Same key, two meanings, depending on where you'd last clicked.
- **The sidebar's undo moved to Ctrl+Shift+Z**, and its redo to **Ctrl+Shift+Y**. They work wherever your cursor is now, including mid-sentence, since they no longer have to get out of the editor's way.
- Both are still rebindable in Settings → Keyboard. **If you'd already changed either of them to Ctrl+Z or Ctrl+Y, that change is dropped** and you'll get the new keys — those two now belong to the editor and the app won't take them.
## 2026-08-27 — a warning you can tell to stop

### Additions

- **The "couldn't be opened" notice has an "I know about this one" button.** Some files are never going to open — a sync conflict copy you're keeping on purpose, something you dropped in the folder yourself — and until now that notice greeted you every single time you opened the world, with only a × that lasted until the next launch.
- **It's per file, and it remembers what the file looked like.** If that file changes, the notice comes back: saying you know about one problem doesn't silence the next one in the same file.
- It's remembered for this installation of Anamnesis rather than inside the world, so a world you copy to another machine still warns you over there.
- **The "couldn't be saved" warning deliberately has no such button.** That one means your writing might not be on disk, and a permanent mute on it is a button for losing work.

## 2026-08-27 — the page keeps its room

### Fixes

- **Dragging both side panels wide can no longer squeeze the page down to nothing.** The two panels could be dragged to 520 and 560 pixels, which is wider than the app's smallest window — so at that size, dragging both out left the page between them with no room at all and nothing to read.
- The page now holds a minimum width, and the panels give the room back instead. **Your panel widths aren't changed by this**: they render narrower only while the window is too small for all three, and they're back exactly where you put them the moment it isn't.
- **The edge you drag stays on the edge of the panel**, including when the window has had to make a panel narrower than you set it.
- **Dragged all the way out, the two sidebars now come to rest at the same width.** Before, whichever one you dragged first took all the room and the second one wouldn't move at all. Each can go up to half of what the two of them have between them, so it no longer matters which you drag first — and the page keeps its own minimum throughout.
- The trade, worth knowing: **a very wide sidebar beside a slim properties panel isn't possible any more.** Each stops at half the room even if the other one isn't using its share. Say the word if you'd rather have the old freedom back.

## 2026-08-27 — a template no longer takes your fields with it

### Fixes

- **Applying one of your own templates to a page keeps what you'd already written in that page's fields.** Before, the template's fields replaced the page's outright: anything the template had no equivalent of lost its value, and the block that had been showing it turned into a **MISSING PROPERTY** note — which was the only sign anything had gone. The text was still in the file with no way back to it.
- Those fields are now kept as properties of that page, with their names, their types and what was in them, listed after the template's own. The block that was showing one keeps working.
- **Empty fields the new template doesn't have are dropped** rather than carried, so a page doesn't slowly collect the blank fields of every template it has ever been. Nothing with anything in it is ever dropped.
- If you have a **MISSING PROPERTY** block sitting on a page from before this, it's still just a block — its `⋯` menu removes it, and removing it doesn't delete anything else.
## 2026-08-27 — text boxes the size of the text

### Fixes

- **A sidebar note longer than three lines is no longer clipped behind a scrollbar.** Every multi-line field in the properties panel — text blocks, and the longer template fields — is now exactly as tall as what you've written in it, however long that is. It was a fixed three lines, which was wrong in both directions: a one-line note reserved space it wasn't using, and a four-line one hid its fourth behind a scrollbar inside a panel that already scrolls.
- The field's box still only appears when you hover or click into it. With the scrollbar gone there's nothing drawn around a note you're not editing.
## 2026-08-27 — a way back to what a page used to say

### Additions

- **Anamnesis keeps earlier versions of your pages, on your own disk.** Before it saves over a page it puts a copy of what was there aside — at most one every five minutes, and always before a page is deleted. Right-click any page in the sidebar and choose **Earlier versions** to see what's kept, read each one, and put one back.
- **You can read a version before you restore it.** The panel shows what that copy said, tab by tab, so you're choosing between versions rather than between timestamps. Arrow keys walk the list.
- **Restoring is safe to get wrong.** What's on the page right now is kept as a version first, and **Ctrl+Z** undoes a restore in one press. A restore puts the writing, properties, tags and title back, and leaves the page exactly where it is in your tree.
- **The copies are ordinary files you can use without the app**, in a `.history` folder inside your project, with a note in it explaining what they are. They travel with the project when you copy or back it up, and deleting the folder loses the history and nothing else.
- Old copies are cleared out on their own: anything past 30 days, and more than 50 of any one page. **The most recent copy of a page is never deleted**, however old it is.
## 2026-08-27 — every shortcut on one screen

### Additions

- **Press `?` to see every keyboard shortcut you have.** It opens a list of all of them with the keys each one is currently on — including anything you've changed, since it reads the same settings the keys themselves do rather than a list written down somewhere. Press `?` again to close it, or Escape. **While you're writing, `F1` does the same thing**, because a question mark in the middle of a sentence should stay a question mark.
- **The four keys you can't change are on that list too**, named as fixed rather than left out: Ctrl+R to reload, F11 for fullscreen, F12 for the developer tools, and `?` itself.
- It works on the front page as well as inside a world.

### Adjustments

- **Settings → Keyboard now mentions `?` and `F1`** in its note about the keys that can't be rebound, which had three on it and now has four.
## 2026-08-27 — somewhere to send it

### Additions

- **You can report a bug from inside the app.** Settings has a new **Report a bug** section: press *Open a bug report* and it opens a form in your browser with a box for what happened, plus the version you're running, which build it is and what system it's on already filled in. Nothing is sent until you press Submit on that page, and the exact text it carries is on screen first so you can read it, trim it, or decide against it. A report filed there is public — worth knowing before you paste a crash into it, since the details include file paths and a path carries the name of a world and of a page.
- **If you haven't got a GitHub account, *Copy the details* does the same job.** It puts the whole thing on your clipboard to send to somebody who has one — which is how the Linux build has been getting tested.
- **The crash screen has a *Report this* button.** It copies the details and opens the same form with them filled in, so a crash goes from blank window to written-down in one press. The clipboard is loaded first, because a web link can only carry so much text and the rest is worth keeping.
- **A report says which of the two builds it came from.** The Windows/Tauri build and the newer Electron one have been shipping under the same version number, so the number alone couldn't tell them apart; every report now names the shell as well.

### Renames

- **Settings → Privacy is now Settings → Report a bug.** It held one thing — the crash log — and the crash log exists so you can send it to somebody. It's still there, underneath the report section, saying where the file lives and copying the last crash on its own.

## 2026-08-27 — the keys the window didn't answer

### Additions

- **Ctrl+R reloads the window, and F11 goes fullscreen.** Neither key did anything before — Anamnesis draws its own top bar and switches off the plain File/Edit/View menu that comes with the window, and that menu turned out to be what those two keys were attached to. They work now, wherever you are in the app, including the front page.
- **Reloading is safe to press while you're writing.** Anything not yet saved is written to disk before the window goes, and the app lets go of the world properly on the way out — so it opens straight back into it rather than deciding somebody else has it open.
- **Settings → Keyboard now mentions all three keys it can't rebind**, those two plus F12 for the developer tools, instead of leaving them off the list entirely.

## 2026-08-27 — a window that tells you what happened

### Additions

- **A crash no longer leaves you looking at a blank window.** If Anamnesis hits a problem it can't carry on from, it now says so on screen: what went wrong, that your worlds on disk weren't touched by it, and a button to start the app up again. The details are there to read rather than hidden, with a button that copies them if you want to send them on to someone.
- **The last few crashes are written down, on your own computer.** They go in a file kept beside your settings, five at a time, and nothing about them is sent anywhere. Settings → Privacy says where the file is and can copy the most recent one — useful for the kind of fault that doesn't take the window down but still goes wrong quietly in the background.

## 2026-08-27 — it doesn't report on you

### Changes

- **Anamnesis no longer reports which features get used, and the switch for it is gone.** It was built so you could turn it off and so it could never carry anything you'd written — but a worldbuilding app you keep your own notes in is a better thing when the answer to "what does it send" is simply nothing, so it's out rather than switched off. Nothing was ever sent from a released build: no version of Anamnesis you could have installed had anywhere to send it to.

## 2026-08-27 — a project open in another window

### Fixes

- **Anamnesis no longer says a project is open somewhere else when it isn't.** A project carries a small file saying somebody has it open, so two copies of the app can't quietly write over each other. That file was never cleared when you closed the app — only when you left a project from inside it — so closing Anamnesis and opening it again within two minutes met its own leftovers and refused, with "Open it anyway" as the only way past. It's cleared on the way out now, so the ordinary case never comes up.

### Adjustments

- **Opening a project that's already open takes you to it.** Pick it from the front page and the window that has it comes to the front, and the front page closes behind you — the way any app with more than one window behaves. It used to be a refusal you had to click through.
- **Opening Anamnesis while it's already running gives you the front page**, rather than a second copy of the app reopening the same project underneath the first. That was the situation the "open in another window" message existed to catch; now it can't happen in the first place.
- **The warning that's left is the one that's real.** If your projects live in OneDrive or Dropbox and a copy is genuinely open **on another computer**, Anamnesis still can't see that window and still can't be sure — so it says so, and "Open it anyway" is still there. That's now the only time you'll see it.


## 2026-08-26 — names you can finish reading

### Fixes

- **A block's name no longer trails off where you can't finish reading it.** Give a block a long name and the properties panel cut it short with a "…" and no way to see the rest — not by hovering it, not by widening the panel, not anywhere. The name now runs onto as many lines as it needs and the block grows to fit, the same way a spectrum's end words already did. A name with no spaces in it breaks across lines rather than running off the side.

## 2026-08-26 — a button you couldn't click

### Fixes

- **The button that shows and hides the properties panel couldn't be clicked on a narrow window.** Drag Anamnesis as narrow as it goes and the row of controls along the top ran out of room, so the last one slid underneath the properties panel itself and stopped responding — the button that would have given you the room back was the one you couldn't reach. The row now shortens the Search button to its icon when it's short of space, which frees more than enough; the keyboard shortcut it used to display is on the button's tooltip. Nothing changes at a comfortable window size.
- **This also happens when you drag the panels rather than the window.** The top row is only as wide as the space between the two side panels, so widening those squeezes it exactly the same way — the fix follows the room the row actually has, not the size of the screen, so it holds either way.

## 2026-08-26 — starting up on Linux

### Additions

- **A Test Anamnesis shortcut, beside the other launchers.** Double-click it and the app is built, opened, and driven through a set of checks on a made-up world — pages opened by name, a world too big to see all of, and the awkward names that a filesystem can't store as typed. Windows flash open and shut while it runs; that's the checking, not a fault. **It can't touch your worlds**: every one it opens is invented in a temporary folder and deleted afterwards. Takes about half a minute.
- **Those checks now measure the layout too.** On every screen they open, they look for text cut off with no way to read the rest, anything sticking out past the window, a control with something on top of it, and buttons too small to hit comfortably. Each screen is checked at two window sizes, including the narrowest the app can be dragged to, because that's where this kind of thing hides. What each screen has today is written down, so nothing can quietly get worse.

### Fixes

- **Anamnesis wouldn't start at all on Linux when run from its own source code.** The window simply never appeared, and nothing said why — nothing on screen, nothing in the black console window. The part of the app that checks for updates was being built the instant the app loaded, and on Linux it refused a version number it didn't recognise, which stopped everything before the window was ever made. It's now built at the moment something actually asks about updates, which is the only time it's needed. Windows was never affected by this.
- **A freshly-copied project couldn't run or package the app either.** Setting one up was skipping the step that fetches Electron itself, so there was nothing for the app to run inside — which the "latest code" launchers need. Anyone starting from a clean copy hit it: a second machine, or somebody else's.
- **The three workflows that build your downloads were running an older package manager than the rest of the project.** That version does not understand the setting which tells it to fetch Electron, so it skipped it without saying so — the same gap fixed above for the everyday checks. A full test build of Windows, macOS and Linux passes on the newer one. Whether the older one would have produced a bad download was never established, and now does not need to be.

## 2026-08-26 — a steadier tree

### Additions

- **A Privacy section in Settings, with a switch for usage reporting.** Anamnesis can report which of its features get used — that a page was made, which template it used, which version and operating system it is running on — so the time spent on the app goes to the parts that actually get opened. **Nothing you write is ever part of that**: no page titles, no world names, no tags, no text from the editor, no file paths, and your worlds stay on your own disk exactly as they always have. The section lists everything it covers in full.
- **You get a one-time note about it before anything is ever sent**, with the choice to say no right there. That goes for an installation you have been running for months as well as a fresh one — nobody starts being counted without being told first. Turning it off in Settings stops it there and then; nothing is stored up to be sent later.

### Fixes

- **A folder that already holds pages no longer tells you it's empty.** Opening one showed "Folders hold other pages. Add one to get started." whether it held nothing or two hundred pages. That line is now only there when the folder really is empty. The "Add a page" button stays on both — it's still the quickest way to make a page inside the folder you're looking at.
- **The page tree no longer flickers while you scroll it.** On a big world, the strip you were scrolling into went blank for a moment before the pages appeared in it — going up and going down both, and on every frame of the scroll rather than now and then. The tree now draws about a screenful of pages beyond what you can see, so whatever you scroll into is already drawn. Measured on a 480-row tree: an empty strip on all 25 frames of an ordinary scroll before, none after.

## 2026-08-25 — spectrum meters

### Additions

- **A Spectrum: a meter that is a position between two words rather than a number.** `nonchalant ——●—— emotional`. Add Block → Meters has it under Progress bar, and it works the way every other meter does — drag the marker, or use the arrow keys — except that it prints no number anywhere. Type the two words straight into the ends underneath it; the reading's own name sits above, so one block can hold several axes with their own names.
- **A new spectrum starts in the middle**, ready to be dragged, rather than jammed against the first word.
- **Each one sits on its own card**, so a block holding three of them reads as three things rather than nine rows of words.

### Fixes

- **On Linux, a spectrum's wrapping words could show one line and hide the rest.** Older Linux systems ship a browser engine that can't grow a text box to fit what's in it, which is what the wrapping relies on. The app now measures and grows those boxes itself where that's missing, so they look the same on every machine.
- **An empty spectrum's Name box was as wide as the card**, with the × for removing the meter sitting on top of it. The box is the width of what's in it now — a short box when it's empty, growing only as you type — and it stops short of the corner the × lives in.
- **A long word at either end of a spectrum was cut short with no way to read the rest of it** — the only way to see the whole thing was to drag the sidebar wider. The end words now wrap onto as many lines as they need and the card grows to fit, so nothing is hidden at any panel width. The reading's name above them does the same. Long words with no space in them break across lines rather than running off the edge.

### Worth knowing

- **It's the same reading underneath as a progress bar.** Switch a spectrum to a bar and the number is there — where the marker sat, out of a hundred. Switch it back and the two end words are still there too; nothing is thrown away by changing shape.
- **Show text still hides the reading's name**, the way it does on every other shape. The two words at the ends aren't the name, so they stay. **Show max isn't offered on a spectrum**, since there's no number for it to hide.
- **Segmented** ticks the line into notches to sit between, if you'd rather it were a five-point scale than a smooth slide.

## 2026-08-22 — pie labels, and a few things in the way

### Additions

- **Every slice big enough to hold one now has its percentage written on it**, in black or white depending on what it's sitting on.
- **A line above the chart names whatever you're pointing at** — its name, its number and its share, at full size. That's the answer for the slivers too thin to hold a label of their own. With nothing under the pointer it shows what the whole chart adds up to.
- **A visible + Add slice under the pie**, and **+ Add meter** under every other meter block. Adding another one lived only in the block's `⋯` menu, which isn't where anyone would look for it.
- **The template prompt can be sent away.** There's an × on it now, and the page remembers — no more being asked about a page that's meant to stay blank. Dismissing it doesn't mark the page as edited.
- **Add Block now offers Apply a template** on a page that hasn't got one, so dismissing the prompt never closes the only door.

### Fixes

- **The template prompt was jammed against the title bar** with no gap above it, since the sidebar's top padding moved onto its blocks. It has room now.
- **Clicking a dial's number opened a text box very nearly as wide as the dial.** The box is the width of what's in it now, and grows only if you type something longer.
- **Enter now finishes naming a meter.** It did nothing at all before, which looked like the name hadn't taken — it always had, since a name saves as you type it. Enter and Escape both step out of the field now, the same as they do on the number.
- **The + on Add slice and Add meter was sitting on its own line above the words.** A bare button lays its icon and its label out as two lines of text if anything squeezes it. Both sit on one line now, centred, on every meter shape.

## 2026-08-21 — pie charts

### Additions

- **A pie chart divides one circle between all its meters.** Put two or more meters in a Pie chart block and they stop being separate pies and become slices of the same one — which is what a pie chart is for. Each slice is sized by its share of what they add up to, and every slice gets its own colour without you picking one.
- **Drag any edge between two slices to move it.** The two slices either side of that edge trade with each other and nothing else on the chart moves, so adjusting two figures never quietly rewrites the rest. Overshoot and the slice you're squeezing collapses to nothing rather than wrapping round.
- **A legend under the chart**, one row per slice: its colour, its icon, its name, its number and its share. Everything is editable there — click a number to type it, exactly as on the other shapes.
- **A pie nobody has filled in yet draws equal slices**, ready to be dragged, instead of an empty circle. The first edge you move writes those numbers down.
- **Segmented is now per meter, not per block.** Right-click one meter and **Segmented (this meter)** ticks off just that one; from the block's own `⋯` menu it still sets all of them. A meter you toggle back into agreement with its block goes back to following it.
- **Segmented on a pie chart** leaves a gap between the slices.

### Worth knowing

- **A Pie chart block holding a single meter is unchanged** — it still fills up against its own maximum, the way it always did, because one number can only be a share of itself. It becomes a slice the moment you add a second meter.
- **A slice ignores its maximum**, since what matters is its size next to the others. The maximum is kept, not thrown away: switch the block to a Circle or a Gauge and every meter reads against it again.
- **On a pie chart, Show max is called Show share** and hides the percentages in the legend.
