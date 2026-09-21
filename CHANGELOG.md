# Changelog

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

## 2026-09-20 — A board follows the theme

### Fixes

- **Switching the theme with a board open now switches the board too.** A board used to read light or dark once, when it was opened, so a theme picked while one was on screen only reached it on the next visit. It follows at once now — the drawing's own toolbar, panels and canvas included — and follows a theme edited in the Colours panel as well.

## 2026-09-20 — Boards in the exports

### Additions

- **A board goes into the exports as a picture.** The Markdown folder and the website carry a PNG of each board — the drawing as it looks, with page cards, notes, bookmarks and videos drawn in as labelled boxes, in their places — and the board's page shows it. The one big Markdown file carries the picture inside itself. The export window says how many boards went in as pictures. The LegendKeeper export can't carry a drawing, so it says a board goes across as an empty page and the board stays here as it is. A board with nothing on it gets no picture.

## 2026-09-20 — A Layers panel on the board

### Additions

- **A Layers panel:** a **Layers** button at the top right of every board opens a list on the board's right of everything on it, top to bottom, each named — a page card by its page, a text or a note by its words, a video by its file, anything else by what it is (Rectangle, Arrow, Drawing, Highlight…). A shape with words on it takes the words as its name, and a frame's shapes are listed under the frame's row. Click a row to select the shape (Shift+click to add it to the selection); the board scrolls to it if none of it was on screen. Drag a row up or down to change what is in front of what — the move is undoable like any other. The eye on a row hides a shape (see-through and locked, so nothing can bump it) and shows it again as it was; the lock locks and unlocks it. The panel stays on the right whether the board is in the page or expanded.

## 2026-09-20 — Boards inside a board, as tabs

### Additions

- **A strip of tabs along the bottom of every board:** the board itself and the boards inside it, like sheets in a workbook, with a **+** that makes another. Click a tab to open that board; the strip reads the same from any of them. The new boards are ordinary pages inside the first one — they show up in the tree, and renaming one there (or by its title) renames its tab. Nothing new is stored: the tabs are the tree, read the boards' way.

## 2026-09-20 — Video on a board

### Additions

- **Drop a video file on a board and it plays there.** The file goes into *Library* like a picture would, the board only points at it, and it lands where you dropped it as a wide-screen box showing its first frame with a play mark. Click the mark and it plays with the usual controls; when it is paused or finished it is a still again, which is when it moves, resizes and locks like any shape. MP4, WebM, MOV, M4V and Ogg.
- **A video in Library can be dragged onto a board** like a picture, with no second copy of the file made. Library shows a video's first frame on its tile and counts a board using it, so it cannot be deleted from under the board.

### Adjustments

- Internal: the drawing library's patch now also keeps its link icon off a video box, as it does off a sticky note. **After updating, restart the launcher rather than reloading the window.**

## 2026-09-20 — A highlighter for boards

### Additions

- **A *Highlighter* button in the board's top-right row, and Shift+P.** It is the pen with a marker's settings — wide, half see-through, yellow to start with — so it is a tool you pick, not three settings to remember. Each stroke goes *under* everything already drawn, so a highlight over words or a shape leaves them readable. It stays in hand for the next stroke; Escape or any other tool puts it down, and the pen gets its own colour, width and opacity back. Pick a different colour from the styles panel while it is in hand and the highlighter remembers it.

## 2026-09-20 — View a page beside the board

### Additions

- **A *View* button for a selected page card.** It opens the card's page in a panel on the left of the board — the page's own view, title, tabs and writing, editable — so a page can be read and written without leaving the board. *Open* in the panel's bar goes to the page in full; the × closes it. The panel is the same size in the same place whether the board is in the page or expanded to the window.
- While a page is viewed beside the board, its opened box on the board stays drawn rather than written in, and follows what is typed in the panel as you type. One page, one editor.
- A board or a storyline is not viewed beside a board — a drawing inside a drawing — the panel says so and offers Open.

### Fixes

- On an expanded board, the *Note* and *View* buttons in the top-right row were squeezed to their first letter, and with a card selected the row ran off the edge of the window. The buttons take their width and the row wraps.

## 2026-09-20 — A page on a board can be written in

### Additions

- **A page opened on a board takes typing.** Double-click it, or click it again once it is selected, and the box becomes the page's real editor — the same one as the page's own tab, with the slash menu, mentions, callouts, columns and the formatting bar — and what you type is saved to the page as it would be there. Escape or a click elsewhere puts the page back to being drawn. Undo inside the box is the page's; outside it, the board's. Earlier today the box was read-only; now it is where the page is written, and *Open* is still the way to the page in full.

### Changes

- A locked opened page is open for writing from the start rather than for reading, since a locked page cannot be moved anyway.

## 2026-09-20 — A page opened on a board

### Additions

- **Stretch a page card and it opens as the page.** Drag a card on a board past about twice its starting size in both directions and it stops being a card: its name goes across the top, its tabs beside it if it has more than one, and its writing fills the box — the page as it is now, drawn the way its own view draws it, callouts, columns, pictures and infobox included. Shrink it back and it is a picture card again; nothing about this is stored, so a card is only ever its size.
- **Read it in place.** Double-click the opened page, or click it again once it is selected, and it takes the wheel and the keyboard: scroll it, select its words, follow a mention or a link in it. Escape, or a click elsewhere, hands the board back. Locked, it reads without any of that — a locked page cannot be moved, so the box is yours from the start.
- **An *Open* button on it takes you to the page in full.** That is where the writing is done: the page on the board is for reading, this time round. Whether it should take typing as well is the question this step was built to ask.

## 2026-09-20 — Sticky notes on a board

### Additions

- **A board has sticky notes.** The new *Note* button beside *Put a Page on It* offers twelve colours; pick one and a square note lands mid-view, ready to type into. Press **N** for another in the same colour. A note grows taller as you write and never cuts your words off — make it wider and the words need less height, but it never shrinks on its own.
- **A note's words take bold, italic and links.** Ctrl+B and Ctrl+I while writing; Ctrl+K, or the *Link to Page* button, puts a link at the cursor — a page of yours by name, or a web address pasted into the box. Click a link on a note to follow it. Before, a "note" was a filled rectangle with plain text in it.
- **Writing in a note is the library's own rhythm:** double-click it, or click a selected note again, or press Enter with it selected; Escape or a click elsewhere finishes. The whole edit is one undo step. A selected note shows a *Colour* button in the top-right row to recolour it, and several selected notes recolour together.
- Notes keep their colour between the light and dark looks — the dark one dims the paper rather than swapping it — and their words are in the board's own hand.

## 2026-09-20 — Bookmark cards on a board

### Additions

- **Paste a web address onto a board and it becomes a card.** The card fills in with the page's title, description, picture and site name a moment later, and it lands where the mouse is. Click a card twice to open the address in your browser — the first click selects it, like any shape — or lock the card and one click does it. Before, a pasted address was a line of text with a link on it.
- **The card keeps what it fetched.** Title, words and picture are stored on the board, and the picture goes into *Library* like any other, so the card draws the same with no internet, and in a world you hand to someone else. A page that will not answer, or says nothing about itself, gives a card with just the address on it.
- Only a lone address becomes a card; a sentence with an address in it is still pasted as text.

## 2026-09-19 — A board's pictures live in the Library

### Changes

- **A picture on a board is now a picture in the world's Library, like a page's portrait.** Paste one onto a board, drop a file on it, or add one with the picture tool, and it goes into *Library* and the board only points at it. Before, the picture's bytes were written into the board's own file: three photos made a three-megabyte board, and the Library could not see them. Boards drawn before this move their pictures across the first time they are opened, on their own.
- **Drag a picture from the Library onto a board.** It lands where it was dropped, at its own size — a big photograph scaled to fit — with no second copy made: one picture on six boards is one file.
- **The Library counts a board's pictures as in use.** A picture that is only on a board says so on its tile and cannot be deleted out from under the board.
