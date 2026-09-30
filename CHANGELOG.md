# Changelog

## 2026-09-30 — Dragging a scene on a storyline moves only that scene

### Fixes

- **Dragging a scene on a storyline moves that scene and nothing else.** The canvas kept itself centred on all your scenes as a whole, so dragging one card shifted that middle and the whole picture slid with it: the card you were dragging only went about half as far as your pointer, and the card joined to it slid the other way. The canvas now holds still while you drag, and only re-centres when a scene, note or band is added or removed, or you press Tidy Up.

## 2026-09-30 — Dragging a page on the graph moves only that page

### Fixes

- **Dragging a page on a graph leaves every other page where it was.** Only the page you dragged used to be remembered, so the next time the graph was drawn (opening it again, for instance) everything else was laid out afresh around it, and the lines pulled the pages joined to it along after it. Now letting go of a page remembers where every page on the picture is, so nothing moves unless you move it. Pages added later find a spot around what you've arranged, and Reset Positions still hands the whole picture back to the automatic layout.

## 2026-09-30 — Import shows everything it can take, and takes more

### Additions

- **The Import window lists where a world can come from, one tile each:** LegendKeeper, Obsidian, Text & Markdown, HTML, Anamnesis Backup, Folder and Zip, each with a line saying what to pick. Before, there were two buttons, *Choose a File* and *Choose a Folder*, and the only way to find out what the app could take was the sentence above them. A tile opens the picker already set to that kind of file; pick something else by mistake and it still comes in as what it really is.
- **A drop box under the tiles.** Drag a file or folder onto it (or anywhere on the window, as before) and it imports; it lights up while something is being dragged. Clicking it opens a picker for anything importable, for when you have the file and don't know which tile it is.
- **Web pages can be imported.** A single `.html` page, a folder of them, or a zip — a Notion export, a saved wiki, or a website published from here. Headings, lists, tables, quotes, code, pictures and links between the pages all come across, and a page's folder of sub-pages becomes pages inside it. To bring in a whole website with the HTML tile, pick its `index.html`.
- **A website published from Anamnesis comes back with its tabs, fields, portrait and callouts.** What the website had already flattened — a meter drawn as a bar, a table drawn from a database — comes back as it was drawn, so the backup below is the way back that loses nothing.
- **An Export as JSON zip can be imported.** It used to be turned away with directions to unzip it into your projects folder yourself. Now the Anamnesis Backup tile (or Zip, or dropping it) restores it as a new project — every page, picture and earlier version exactly as it was saved — says how many of each before it starts, and opens it. It never writes over an existing project: restoring next to the original gives the copy its own folder. A project folder picked through Folder is restored the same way.

### Changes

- **The start screen's Import line** reads "From LegendKeeper, Obsidian, Markdown, HTML or a backup."

## 2026-09-30 — Import says whose files it takes

### Changes

- **Import names LegendKeeper.** The Import button on the start screen and the first line of the Import window both used to offer a bare ".lk", which means nothing to anyone who doesn't already know whose format that is. The window now says "a LegendKeeper export (.lk)" and the button "A world from LegendKeeper", the way the export menu and the file picker already named it. The button lost "Bring in" to stay on two lines like the three beside it.

## 2026-09-22 — Pasted text stays the text you pasted

### Fixes

- **Plain text pasted into a page arrives as the characters you pasted.** It used to be read as Markdown, which for the way roleplay and bot text is written meant characters being *deleted*: `*TEN SECONDS,*` arrived in italics with the asterisks gone, a name in `<angle brackets>` vanished outright, and a line starting `# ` became a heading. All three now come through as they were. Pasting from Word, Google Docs or another page here is unchanged — those carry real formatting and always came through properly.
- **A blank line between paragraphs survives the paste**, and so does an empty paragraph you left there on purpose; a single line break stays a line break inside its paragraph instead of splitting it in two. Text copied out of a page and pasted back in is now the page it came from, exactly.

### Additions

- **Ctrl+Shift+V pastes as Markdown**, for when you *want* `**bold**` and `# Heading` turned into real formatting — bringing in a card or a lorebook someone wrote in Markdown. It is on the shortcut sheet (press `?`) with the rest of the writing keys. Ordinary Ctrl+V is always literal, and there is no setting that changes that: the literal reading can be undone by selecting the words and pressing Ctrl+I, and the Markdown one cannot be undone at all once the asterisks are gone.

## 2026-09-22 — Copying out, your way

### Additions

- **Ctrl+C can leave plain text behind, and that is what it does to begin with.** Copying out of a page always put Markdown on the clipboard for anywhere that can hold nothing but characters — a lorebook field, a character card, a chat box — so `**bold**`, `# Heading` and a backslash before every line break travelled with the words. There are two readings of a copy now, and Settings → Writing → *What Ctrl+C copies* decides which one the keystroke does: **Plain Text**, the words as they read, or **Markdown**, the formatting written out as marks. Whichever is set, the other is one button away on the formatting bar whenever something is selected. Pasting into Word, Google Docs or another page here is unchanged — those take the formatting either way, whichever of the two is on.
- **What plain text keeps.** A bullet comes out as the bullet it is drawn as rather than an asterisk, a numbered list keeps its numbers, a checkbox comes as an empty or ticked box, and a table as rows of cells. A blank line between paragraphs stays a blank line, and an empty one left there on purpose stays too. A picture brings its caption if it has one and nothing at all if it doesn't.

## 2026-09-22 — Removing a picture can be undone

### Fixes

- **Removing or replacing a page's picture, or its cover, can be undone.** It was the one thing the right-hand panel did that undo couldn't take back: removing a picture deletes its file once nothing else shows it, so putting the field back pointed at a file that was gone. The picture's bytes are now kept with the undo entry, the way a deleted page's already were, so undo puts the file back and then the picture; redo takes it away again. This covers *Remove image*, choosing a different picture from the library, uploading over one, and the cover's three equivalents.

## 2026-09-21 — One bad block no longer takes the app down

### Fixes

- **A block that can't be drawn now says so where it sits, and the rest of the app carries on.** Before, one damaged block on one page brought up the whole-window crash screen, whose only offer was a restart. Now the page, the sidebar panel and every block in it each have a boundary of their own: the block that failed shows a short notice in its place with *Try Again*, keeps its heading and its menu (so it can be removed the ordinary way), and everything around it — the tree, the writing, the other blocks — keeps working. The fault is still recorded for Settings → Report a Bug.

## 2026-09-21 — A world that won't open says why

### Fixes

- **A world that can't be opened now says what's wrong, and a damaged one stays on the list.** Before, a world whose `project.json` was damaged and a world whose folder had gone got the same one-line refusal, and both were dropped from the start screen's list — so the next click was against nothing, and there was no way to know which of the two had happened. Now a world that is there but can't be read says so with the reason (which file, and what the disk said) and stays listed for when the folder can be read again; a world that has genuinely moved or been deleted says that, and is forgotten.

## 2026-09-21 — A storyline opens showing all of itself

### Fixes

- **A note or a band put out past the scenes is on the screen when the storyline is opened.** The canvas used to fit itself to the scenes alone, so a note dropped to the right of the last scene, or a band drawn round empty space, was there on the canvas and off the edge of the window every time the page opened, until you dragged the view to find it. The fit now takes the notes and the bands into account as well.

## 2026-09-21 — A click beside a callout's words

### Fixes

- **Clicking the coloured edge of a callout used to leave you with a caret that wasn't in it.** The strip of padding between a callout's border and its first word counted as "beside the block" rather than "in it", so a click there put an invisible caret next to the words: typing landed nowhere, Ctrl+End didn't move, and Enter did nothing at all. This was the bug written down as "Enter at the end of a fresh Note page's last line does nothing" — the caret was never on that line. A click there now puts the caret at the start of the callout's words, where you can see it.

## 2026-09-21 — A version you name is kept

### Additions

- **An earlier version of a page can be kept under a name.** In *Earlier Versions*, *Keep This Version* on the one you are looking at asks for a name and keeps it for good — the automatic clearing-out never touches a named one — and *Keep a Copy Now* takes a copy of the page as it is this minute and names it in the same breath. A kept version shows its name above its time in the list, with a bookmark beside it. *Stop Keeping* takes the name off and puts it back on the timer. On disk it is the same file with the name after the time, so it survives anything the app does and reads plainly in the folder.

## 2026-09-21 — Loose ends

### Additions

- **Two more ways to a bug report.** The "couldn't be saved to disk" warning ends with *Report a Bug*, and so does the footnote of the `?` sheet — both open Settings on the Report a Bug section, from where you actually are when something has gone wrong.
- **The "this file asked to load something from the internet" line can be acknowledged.** *I Know, Stop Telling Me* on it, in Theme and in Snippets, and it stays quiet until the file changes.

### Fixes

- **A world that has been moved or renamed no longer asks again about files it had already been told about.** The record of acknowledged warnings is kept by the world's name and the file's place inside it rather than by the full path, and it now tidies itself when something new is acknowledged rather than growing forever.

## 2026-09-21 — A dotted line under a name that could be a link

### Additions

- **A page's name in your writing gets a quiet dotted line under it**, the moment it is typed, while it is still just words. It changes nothing — the words stay words and nothing goes into the file — and it is the same list `/Link page names` would offer, so what is underlined is exactly what that command would turn into links. Hover one to see which page it could link to. Settings → Writing has *Mark them while I write* to turn it off, and the marks go away without reopening the page.

## 2026-09-21 — An index block has all its settings

### Additions

- **A Subpage Index or Tag Index block in the sidebar has Columns, Filter, Sort and Group.** They sit behind one *Settings* control beside the block's layout switcher, since a sidebar has no room for a row of buttons; each opens the same menu a page shown as a database uses, and the control shows a count while any of them is doing something. The one thing a block does not get is *Looking in* — its rows are its source's.

## 2026-09-21 — Pages inside a template, named after the page

### Additions

- **A template can name the pages inside it after the page they land in.** Save a page with its sub-pages as a template, open the template, and tick *Name the pages inside after the page they land in*: a page called Damien made from it gets Damien_Pics and Damien_Sheets, with whatever you put in the *Joined with* box between the halves (an underscore to start; it can be anything, or nothing). Renaming the page renames them with it, and one press of undo takes the lot back. A sub-page you rename yourself stops following — a name you typed wins.
- **Add Pages From Template, on a page's right-click menu.** The pages saved inside one of your templates, put inside a page that already exists — its own writing and fields left alone. A page of that name already there is skipped and the rest are still made, and a line says how many, so running it on a character twice is safe.
- **A page still called Untitled is asked for its name first** when a template like this is picked for it, so nothing is ever named after nothing.

### Fixes

- **Pages arriving from a template land in the template's own order.** They used to land in a random order that changed from one page to the next, because every copy was stamped with the same instant and the tie was broken by a fresh id.

## 2026-09-21 — The shortcut sheet knows the slash commands and the markdown

### Additions

- **The `?` sheet has three tabs now: Keys, Slash Commands, Markdown.** *Slash Commands* lists every `/` command the editor offers, in the menu's own groups, with what each does and the short form to type — read from the menu itself, so a command added later appears on its own. *Markdown* lists what turns into formatting as you type: `# ` for a heading, `- ` for a list, `**text**` for bold, and the rest. *Keys* gained a *While writing* list of the editor's own chords — Ctrl+B, Ctrl+Alt+2 for a heading, Ctrl+Shift+8 for a list — under the fixed keys it already showed.

### Changes

- **The sheet is the same height whichever tab is open**, so switching tabs doesn't move the strip under the pointer.

## 2026-09-21 — About

### Additions

- **Settings has an About section.** Which version this is, what the app is built with and under what licence — Electron, React, BlockNote, Excalidraw and the rest, each a link — and a note on the fonts: the three the app is set in, the size of the library, and that all of them are open typefaces bundled with the app. The app's own MIT licence and the source code are a click away. The other half of a bullet whose first half became Patch Notes.

## 2026-09-21 — More than, less than

### Additions

- **A number column can be filtered by a line, not only by an exact value.** Pick a number in a table's *Filter* and it now offers *is more than*, *is less than*, *is at least* and *is at most*, each with a box to type the number into. They compare as numbers, so 9 is less than 40 rather than after it; a page with no number in that column is on neither side of the line and is left out. *Contains* is no longer offered on a number, since part of a number is not a question anyone asks.

## 2026-09-21 — Start writing and the template offer gets out of the way

### Changes

- **A new page can simply be written in.** The tab strip and the writing area are there from the moment the page is made, above the "what kind of page is this?" offer rather than instead of it. Type a word and the offer goes away on its own, with the word where you typed it; the sidebar still offers a template afterwards, as it did after *Skip this*, and *Skip this* is still there for sending the offer away without writing. Before, the offer was the whole page and the link under it was the only way past it.
- **A page whose offer was sent away from the sidebar now has somewhere to write.** Pressing the ✕ on the sidebar's "this page doesn't have a template yet" used to leave the offer standing in the middle of the page anyway; now the page shows its writing area instead.

