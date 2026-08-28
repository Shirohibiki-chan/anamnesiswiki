# Changelog

## 2026-08-28 — the formatting bar can stay put

### Additions

- **Settings → Writing, a new section**, for how the editor behaves while you're writing in it rather than what it looks like.
- **The formatting bar can stay at the top of the page.** The strip with bold, italic and the rest normally appears over your text when you select some and goes away again; now you can have it always there instead, above what you're writing. The buttons do exactly the same thing either way — this is only about where the strip lives.
- **It appears-on-selection by default**, the way it always has, so nothing changes unless you go and change it.

## 2026-08-28 — a tidy-up under the floor

### Changes

- **Internal tidy-up, nothing visible in the app:** the code that decides what happens when you move, delete or duplicate a page has been lifted out of the big file it was buried in and given tests of its own — 43 of them. It had none before. That code works out things like which pages go with a folder you delete, where a copy lands in the list, and what happens to the home button or a shortcut when the page it pointed at is gone. It all worked; it just couldn't be checked without launching the whole app, so nothing was checking it very often.
- **Moving and deleting a page are now tested against the real app too**, which they never were — the only test that mentioned deleting was about deleting a whole project. The new one files a page into a folder, deletes one, and pins one and deletes it, closing and reopening the window each time. That last part is the point: a move or a delete that only happened on screen looks exactly like one that worked, right up until you next open Anamnesis.
- **One thing you could just about trip over is fixed.** Dropping a page into a folder that stopped existing while you were mid-drag is now refused outright rather than filed somewhere unfindable. You'd have to delete the folder in the second between picking a page up and letting go, so this is closing a gap rather than fixing something you've hit.
- **The picture on a project's tile is drawn by one piece of code now** instead of five near-identical copies — the big pinned card, the tile, the little square in the side list and both thumbnails in the Pinned Projects window. They all agreed, but nothing was making them, so changing how a cover looks meant finding four files and hoping that was all of them.

### Adjustments

- **A rule in Claude's instructions file has been removed**, because it was never yours and never followed. It said no part of the on-screen code was allowed to call a piece of shared logic directly — it arrived in the very first commit, in the same batch as the network rule you got rid of in August, and it had no reason written next to it. 22 of the app's 103 screen components broke it, almost all for harmless things like working out how long ago something was. The rule above it, the one about how the app's memory is reached, is real and stays.

## 2026-08-28 — the slash menu, tidied

### Fixes

- **Clicking back onto a line with a `/` at the front brings the menu back.** It used to sit there dead — the only way on was to delete the slash and type it again. It comes back with whatever you'd typed after the slash still in it. Same for an unfinished `[[`, which already worked.
- **A `/` only opens the menu at the start of a line now.** It used to open for *any* slash you typed — mid-word in `and/or`, straight after a full stop — which put the command list over your writing several times a paragraph. Everywhere else a slash is just a slash.
- **It won't wrongly come back either.** Clicking onto a line that starts with `/` brings the menu back; moving the cursor through `and/or`, a date or a path leaves it shut. The rule for coming back is the same as the rule for typing, so the two can't disagree.

### Changes

- **The menu had a white outline.** Not a choice — the outline colour was never set, so it fell back to the colour of the text, which is nearly white. It's the same quiet line every other panel in the app uses now, and the menu has a proper shadow instead of none at all.
- **The text is smaller and the rows are tighter**, matching the menus everywhere else in the app rather than being a size of their own. About nine options fit where five did, which is most of why it felt cramped.
- **It can't be squashed to a sliver any more.** Open it near the bottom of a page and it used to collapse to a row and a half; it now keeps a usable height and scrolls.
- **The group headings** (*Headings*, *Basic blocks*) read as headings now, in the same small caps the rest of the app uses for labels.

## 2026-08-28 — the link text box actually does something

### Fixes

- **Link text in the New page window did nothing.** Whatever you typed there was thrown away and the link came out reading as the page's name. The box works now: type *the bell* for a page called *Ninefold Bell* and that's what the link says, while still pointing at the right page and still showing up in the tree under its real name.
- **A link with no wording of its own still follows a rename**, which is why this took a moment to get right. Links look their page up as you read them, so renaming a page updates every link to it — the fix keeps that, and only pins the wording when you deliberately typed some.

## 2026-08-28 — callouts can be any colour

### Additions

- **A callout can be any colour you like.** Hover one and a small dot appears in its top right; click it for the palette. Info, Quote and Secret all take a colour, and *The usual colour* puts one back to how its kind normally looks.
- **Four colours also get an icon, because everyone already knows what they mean** — a tick on green, a triangle on amber, an exclamation on red, an *i* on blue. Any green does it, not just one: emerald, sage, teal and pine all read as a tick. Every other colour just recolours the box, and a colour you mix yourself never gets an icon, since there's no meaning to read off it.
- **Colouring a callout doesn't change what it is.** A red Secret is still a secret and still gets stripped when a page is shared; it keeps its 🔒 label whatever colour it's wearing.

### Fixes

- **Warnings imported from a `.lk` file were being turned into secrets.** There were only three kinds of callout and no colours, so warning and error panels were given the nearest-looking one — but Secret is the box that gets stripped out when a page is shared, so every warning in an imported world was quietly marked don't-show-anyone, with nothing on screen saying so. They now come in as a callout coloured amber or red, and a success panel comes in green. **Pages you've already imported keep whatever they were brought in as** — this changes what a new import does, not what's already on your disk.
- **Those colours survive going back out to a `.lk` file** — an amber callout leaves as a warning, red as an error, green as a success. Other colours are ours alone and leave as a plain info panel.

## 2026-08-28 — make a page without leaving the one you're writing

### Additions

- **You can make a page from inside the editor.** Type `/` and pick *New page*. A small window asks four things — what it's called, what the link should say if that's different, where it goes, and whether it's hidden — then makes the page and drops a link to it where your cursor was. You stay where you are; nothing opens the new page or takes you to it.
- **Where it goes defaults to the page you're on**, and you can search for somewhere else or clear it with the × to put it at the top of the tree.
- **Writing `[[Something]]` for a page that doesn't exist now offers to make it.** It used to sit there as plain text with brackets showing, and the only way on was to go and make the page yourself somewhere else. Now the same window opens with the name already filled in, and the brackets turn into a link once the page exists.
- **Backing out costs nothing.** What you typed stays exactly as you typed it, brackets and all, and you're put back where you were so you can keep going. It won't ask about that name again.

## 2026-08-28 — projects can be deleted

### Additions

- **A project can be deleted.** It's on the tile's ••• menu, under Archive. Until now Archive was the only way to get a project out of the list, and all that does is hide the tile — the folder stayed on your disk with no way to get rid of it except doing it yourself in File Explorer.
- **It goes to the recycle bin, not into thin air.** The whole project folder is moved there, so if you delete the wrong one you can put it back. You're asked first, and the warning names the project and says the whole folder is what goes.
- **It tidies up after itself.** A deleted project leaves the archive, any groups you'd filed it under, your pins and the recently-opened list, so nothing is left pointing at a folder that isn't there. If it happened to be the last project you had open, the app won't try to reopen it next time it starts.
- **It says so afterwards.** A small panel slides up at the bottom of the window — *Deleted "Orynthia". The folder is in your recycle bin.* — and fades on its own after a few seconds. The tile disappearing tells you something happened; this tells you where it went, which is the thing worth knowing if you deleted the wrong one.
- **A project another window has open won't be deleted**, the same as renaming one — you're told to go to that window instead.

## 2026-08-28 — five new kinds of page, and Species is now Race

### Additions

- **Country.** A nation isn't somewhere you can stand, so it stopped sharing a template with Location. Territory, peoples and economy on the first tab, a map tab, a *Rule* tab for government, law, what it can put in the field and who it borders, and a hidden *Past* for founding, wars and the last few years.
- **Creature.** Animals, monsters, the thing in the woods. Appearance, behaviour and habitat, then an *Encounters* tab for the signs one is near, what it can actually do to a person, and how people deal with them.
- **Technology.** Inventions and machinery, magical or otherwise — what it looks like, how it works, what it was for. Then who has it, what it costs, what it made obsolete, and who's building a better one.
- **Scene.** One moment as a piece of writing rather than a piece of history: setting, who's present, and what's different by the end. A hidden *Drafting* tab holds beats, lines you don't want to lose, and what isn't working yet.
- **Quest.** Objective, who's asking, stakes and payment, with a hidden *Running It* tab for the steps, the obstacles and the twists. Written with a table in mind, but a plot thread works the same way.

### Renames

- **Species is now Race.** With Creature taking the animals, the old name was pointing at the wrong half — "Species" reads as the non-sentient one, which is the opposite of what that template was for. **Pages you already made are fine and nothing on disk was rewritten**; they keep their icon, their fields and their writing, and simply show up as Race.

### Changes

- **Importing recognises Country and Technology pages** rather than bringing them in as plain notes. Kinds we haven't seen an example of still import as notes with all their tabs and writing intact, as before.

## 2026-08-28 — the templates are laid out our way now

### Changes

- **Every template has been rebuilt from the shape up.** The words were rewritten a while back, but the layout under them hadn't changed at all — the same tabs in the same order, the same headings, and the same run of blocks repeated identically on every tab of every template. That's all been redesigned.
- **The sections are named differently, and every one still explains itself.** A Character page goes Appearance, Manner, Motivations; an Item goes Appearance, Abilities, Limits; an Event goes In brief, Causes, Aftermath. Each heading has a line under it saying what belongs there, the way it always did.
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
