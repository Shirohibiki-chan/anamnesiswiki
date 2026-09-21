# Changelog

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

## 2026-09-19 — Frames inside frames, and frames that turn

### Additions

- **A frame can hold a frame.** Draw a frame inside a frame and it is part of it: move the outer one and the inner one comes along with everything in it, duplicate it and the whole set is copied, delete it and everything inside goes too. Drag a frame into another frame to put it there, and out to take it back. Anything sticking out of an inner frame is cut off at the inner frame's edge, and at the outer's too. *Wrap Selection in Frame* now works when a frame is among what you selected.
- **A frame can be turned.** Select one and it has the same rotation handle as any shape. Turning it turns everything in it round the frame's middle — a straight frame inside a turned one is a matter of turning the inner one back — and the frame's name goes round with it. The frame cuts off its contents at its turned edges, so a frame at forty-five degrees is a diamond, and a shape dropped into a turned frame lands inside its turned shape, not the box around it.

### Changes

- **Deleting a frame deletes what it holds.** It used to keep the contents and quietly leave them selected, which is not what the eraser did with a frame, and not what Canva does. Put things outside a frame first if they should stay.

## 2026-09-19 — The board's menus and panels look like the app

### Changes

- **The board's toolbar, styles panel, menus and popups wear the app's own colours and type.** They were the drawing library's stock look — its own greys, its own blue, its own font — sitting inside a window that is otherwise all one theme. They now take the panel colour, the accent and the UI font from whatever theme is on, including ones you write yourself. The drawing itself is untouched.
- **The right-click menu is drawn like the app's other menus** — same surface, same row spacing, same hover — with the keyboard shortcut as a quiet key on the right, and every row in Title Case: *Send to Back*, *Copy Styles*, *Wrap Selection in Frame*. The styles panel's headings are Title Case too (*Stroke Width*, *Font Family*).
- **Two rows are gone from that menu:** the library's *Stats for nerds* readout, and, on a page card, *Edit embeddable link*, which would have shown the card's raw address — a card's page is changed from the *Link to Page* button instead.

## 2026-09-19 — A locked card is a button

### Additions

- **Lock a card or a linked shape and it opens with one click.** Select it, press Ctrl+Shift+L (or *Lock* in the right-click menu), and from then on a single click anywhere on it goes to its page — or its website, for a shape linked to one. The mouse turns into a hand over it so you can tell before clicking. Unlocked, a card still takes two clicks: the first selects, the second opens. A locked card lying on top of other shapes still wins the click.

## 2026-09-19 — Click inside a shape to pick it up

### Fixes

- **Clicking anywhere inside a shape on a board selects it, filled or not.** An empty rectangle, diamond or ellipse could only be picked up by clicking exactly on its outline; a click in the middle went straight through to the board. Now it selects, and dragging from inside moves it — the way Canva behaves. Lines, arrows and scribbles still take the click on the stroke itself. Like the selection box the day before, this is a change to the drawing library, kept as a patch.

## 2026-09-18 — A selection box takes what it touches

### Fixes

- **Dragging a selection box on a board selects everything the box touches.** It used to take only what the box swallowed whole — a box drawn across five things picked up the one that fitted inside it. Now a shape is selected the moment the box crosses its outline, a line or arrow where the box crosses it or holds one of its points, and text, pictures and cards wherever the box overlaps them. A box drawn *inside* a big empty rectangle still leaves the rectangle alone, so things inside one can be picked out on their own. This is a change to the drawing library itself, kept as a patch in the repo.

## 2026-09-18 — Dots on the board, and cards that select like anything else

### Additions

- **Boards have a dotted background.** On for every board, old ones included, and it moves with the drawing as you pan and zoom rather than sitting still behind it; zoomed far out, every other dot drops away so it never turns into a haze. *Hide the Dots* and *Show the Dots* are in the board's menu (the ☰ in the bottom-left corner), and each board remembers its own answer. A board's canvas is see-through now so the dots show; picking a canvas colour from the same menu still works and covers them.

### Fixes

- **Selecting on a board with page cards on it works properly.** Clicking the middle of a card used to "wake" it the way the drawing library wakes a web embed, and a woken card swallowed every click after that — it couldn't be dragged, a selection box couldn't be drawn through it, and clicking it did nothing. A card never takes the mouse now: click to select, click again to open, drag to move, and a box drawn around cards selects them like any other shape.
