# Changelog

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

## 2026-09-21 — Players come in and go out with the world

### Additions

- **A LegendKeeper import turns its YouTube blocks into real players**, and its filled Spotify property into a player in the sidebar, titled as it was there. Both used to come in as a plain link and a note in the lossy list. An empty Spotify slot stays skipped — most pages in a real export carry two — since a box asking for a link on every character is not what an empty slot was.
- **Players leave with the world.** The Markdown folder and the one big file write each player as its link on a line of its own, the caption in italics under it, and the sidebar's under its heading — the form the Markdown importer reads back, so a folder of notes with a YouTube link on its own line comes in as a player. The published site carries the player itself: a YouTube still that plays when clicked (a link to the video for a reader with scripts off), Spotify's card and SoundCloud's bar as they are, in the site's own theme. The LegendKeeper export writes a YouTube player back as LegendKeeper's own YouTube block and a sidebar Spotify player as its Spotify property; a Spotify or SoundCloud player in the writing goes across as a link, and the export window says so.

### Changes

- **The docs stop saying no.** The line "no YouTube, Spotify or map embeds", carried since Phase 18, is retired everywhere it was written, with the date it was lifted and the condition it came with. Maps stay out.

## 2026-09-21 — A player in the sidebar

### Additions

- **Add Block offers Music or Video.** A YouTube, YouTube Music, Spotify or SoundCloud player as a sidebar block — a character's theme in the infobox, a location's ambience beside its description. The block opens on a box for the link; once it has one it draws the same player the page does, at sidebar width, and names itself by what the link is ("Spotify track", "YouTube video") until you rename it. It has everything a sidebar block has — a title, a colour, a place in a template, drag between the sidebar, the page and an infobox — and its own menu gains Open on the service, Copy Link and Fetch Again. Nothing in the sidebar plays until you press play.

## 2026-09-21 — Music and video in the page

### Additions

- **A YouTube, YouTube Music, Spotify or SoundCloud link becomes a player in the page.** Paste the link on an empty line and it turns into the player — a link pasted in the middle of a sentence stays a link, since the sentence is what you were writing. `/YouTube`, `/Spotify`, `/SoundCloud` and `/Embed` in the slash menu put down a box for the link instead, for when it isn't on the clipboard yet; a link from anywhere else is turned away with a line saying which four play here. Every form of link the services hand out works: `youtu.be`, watch, shorts, live and playlist links, YouTube Music, Spotify's tracks, albums, playlists, artists, episodes and shows, and SoundCloud tracks and sets.
- **Each one looks like it belongs.** The player sits in the same frame every block gets, so it takes the theme. A YouTube video is a still until it is played — the video's own picture with its title over it and a play mark — and only a click loads the real player, so a page with five videos doesn't start five players and nothing from YouTube loads into your page until you ask. YouTube Music plays through the same player, since its links share YouTube's ids. Spotify's own card is shown as it is, in its dark look on a dark theme, compact for a track and tall for an album or playlist; SoundCloud's player takes the theme's accent for its buttons and bar. A video is the width of the page; a single track is not, and either can be dragged to another width by its edges, the way a block can.
- **A caption line under each player, the way a picture has** — hover to find it — and a menu on right-click or the `⋯` in the corner: Open on the service, Copy Link, Fetch Again, Remove.
- **A player draws whole with the internet off.** When a link is pasted the service is asked once what it is — the title, who made it, and a thumbnail that goes into the world's library — and that is what the card draws, with a "needs the internet to play" note where the player would be. A link the service wouldn't answer for keeps its address and is asked again the next time the page is opened online.

## 2026-09-21 — Bold, italic and links in a board's text

### Additions

- **Ordinary text on a board takes bold, italic and links.** Writing in a text box, a small toolbar sits over it with Bold, Italic and Link — Ctrl+B, Ctrl+I and Ctrl+K do the same — and puts the mark around the selected words. The marks are Markdown's, in the words themselves: `**bold**`, `*italic*` and `[words](address)` show while writing and are hidden when drawn, so the drawn words come out bold, slanted or underlined, and a box is as wide as the words it draws rather than the stars. Link searches your pages the way a note's does, or takes a web address pasted in; a click on a drawn link opens the page or the address, and a page linked this way is in the page's connections. Sticky notes had all of this already; this is the plain text box catching up.
- **The marks come out in the pictures.** A board's picture in an export, and the drawing's own Save as Image, draw the words the same way.

## 2026-09-20 — A moving GIF moves on a board

### Fixes

- **An animated GIF on a board now plays.** The drawing library draws pictures onto a canvas, which only ever takes an animated picture's first frame, so a GIF stood still; its frames are now decoded and drawn one after the other while it is on screen. Also: a GIF pasted or dropped onto a board used to be quietly re-saved as a still PNG on the way in — it now keeps its file, and its frames.
