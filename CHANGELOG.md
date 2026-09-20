# Changelog

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

## 2026-09-18 — Pages on a board

### Additions

- **A page can be put on a board.** *Put a Page on It* in the board's top-right corner opens a search box; pick a page and it lands in the middle of the board as a card showing its icon, name and picture. The box stays open for the next one. A page can also be dragged straight out of the sidebar onto the board, and lands where it's dropped — several at once if several rows are selected.
- **A card reads its page rather than copying it.** Rename the page or give it a new picture and the card on the board shows that the next time it's drawn. A card for a page that's since been deleted says so instead of drawing a blank.
- **Resizing a card changes what it shows.** Big, it's the picture with the name across the bottom. Shorter, it's the icon and the name in a row. Narrower still, it's the icon alone with the name in its tooltip. Nothing to set; the size is the setting.
- **Click a card twice to open its page.** The first click selects it, the way any shape on a board is selected; a second click on it opens the page. A card can be moved, resized, locked and grouped like anything else on the board, and it's in the page's connections along with linked shapes.

### Changes

- **The board's link button reads *Link to Page* and the picker's unlink row reads *Remove the Link*,** in Title Case with the rest of the app.

## 2026-09-17 — Tab between a scene's name and its description

### Additions

- **Tab on a storyline card goes from the name to the description, and Shift+Tab goes back.** Double-click a scene's name, type it, press Tab, and the description box opens under it with what you typed already kept — the way two fields on a form work. Shift+Tab from the description reopens the name. Before, Tab only left the box: the card shows one box at a time, so leaving saved it and closed it, and there was nowhere for Tab to go. It still doesn't jump to another card — a canvas has no order for it to follow.

## 2026-09-17 — Title Case, a panel that remembers, and special pages set apart

### Additions

- **Each page remembers whether the properties panel is showing.** Hide it on one page and only that page stays hidden; every other page keeps its own answer. Kept with the world, so it's the same after a restart. A new setting under Settings → Sidebar, *The Properties Panel*, picks what a page does before you've decided there: *Open by Default* or *Closed by Default*.
- **Special pages are set apart from the templates.** On a new page, Storyline, Board, Folder, Dashboard and Note are wide cards under their own heading, each with a line saying what it is; the templates keep their grid below. The Templates panel in the sidebar lists them under *Special Pages* above *Built In* the same way.

### Fixes

- **The text and background colour menu shows its colours.** Every row was a white "A" with nothing to say which colour it was — the colours never reached the menu when it opened from the formatting bar kept at the top of the page. Each row has a coloured tile now: a text colour tints it, a background colour fills it.
- **A callout's colour is on its six-dots menu** — *Callout Colour*, a submenu of the same swatches — instead of only on a dot in the callout's corner that appeared on hover. The dot's still there.
- **A segmented meter's segments line up with its number.** A bar with a maximum of ten is cut into ten segments, so 7 of 10 is seven whole segments — it was cut into however many 13px pieces fit, and a value landed mid-segment every time. The pulsing preview drew a second set of segments out of step with the first, sliding over it; it's cut by the same segments now.

### Changes

- **Every button, menu row, tab and option in the app is Title Case.** *Add a Page*, *New Page Inside*, *Save as Template*, *Check for Updates*, *Choose Where to Save* — about two hundred labels that had drifted into sentence case. Tooltips and explanations stay sentences.

## 2026-09-17 — Canvas pages are the whole page

### Changes

- **A storyline or a board fills the page.** Title and breadcrumb at the top, then the canvas to the bottom edge and out to the column's edges — the way a board fills the window elsewhere — instead of a fixed-height box inside the reading column with empty page around it. Never shorter than 24rem in a short window; the page scrolls then. *Fill the window* still takes the sidebars too.
- **A dashboard uses the full width of the page** rather than the reading column.

## 2026-09-16 — Bubbles resize both ways

### Fixes

- **Dragging a bubble narrower no longer collapses it into a column of single letters on the way.** The narrowest a bubble can be was only enforced when you let go; now it holds while you drag.
- **A bubble made taller keeps its words at the top.** The name was floating halfway down and the description sitting at the bottom, with the empty room split between them.
- **The corner resizes height as well as width.** Drag down to make a bubble taller. A bubble is never shorter than its words — drag up past them and it stays at the words — and dragging back down to the plain one-row size clears the height rather than remembering a number that changes nothing.

## 2026-09-15 — Everything a bubble can do is on the bubble

### Additions

- **Right-click a scene on the storyline for everything you can do with it** — Open Page, Rename, Edit Description, Set Picture…, who's in the scene (each name opens its page), and Take Off the Canvas. The `⋯` in the bubble's corner opens the same menu. Notes, stretches and lines have their own right-click menus (edit or remove; remove). The strip of buttons along the bottom of the canvas is gone — it listed actions for the thing you were looking at somewhere other than the thing.
- **Delete takes whatever's selected off the canvas.** A line, a note, a stretch, or a scene — a scene's page stays in the tree, as always.
- **Give a scene a picture from its menu.** *Set Picture…* opens the picture library; the picture is the page's banner, so it's on the page too. *Remove Picture* clears it.
- **Bubbles can be resized.** Drag the bottom-right corner to make one wider or narrower; the height follows the words. Kept with the canvas.

### Changes

- **Double-click a bubble's name to rename it.** Double-clicking anywhere else on the bubble edits the description, as before; renaming no longer needs a button.
- **Enter finishes a description; Shift+Enter is a new line.** It was the other way round with Ctrl+Enter to finish, which is not what a box that size does anywhere else.
- **The storyline's buttons and menu rows are Title Case** — *Existing Page*, *Tidy Up*, *Open Page*, *Take Off the Canvas*. Buttons and menu items across the app are meant to be Title Case; this is the storyline's share of that, and the rest of the app follows in its own change.

## 2026-09-15 — The wheel stops jumping

### Renames

- **The graph's *Put it back* is *Reset positions*.** It forgets where you dragged pages and lays the graph out again, and the old name didn't say what it put back.

### Fixes

- **Scrolling the graph no longer jumps.** Every notch was taking one small step backwards before gliding forward — the animation's clock can read a few milliseconds earlier than the wheel event's, and the glide treated that as negative progress. The glide also no longer reads the view back from the screen when a notch arrives, which on a slower machine was a frame behind and snapped the picture back before gliding on.
