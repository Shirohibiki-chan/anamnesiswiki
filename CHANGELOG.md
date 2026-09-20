# Changelog

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

## 2026-09-14 — A big graph can be zoomed out to the whole of it

### Fixes

- **The greyed-out Reach on the whole-world graph says why.** It reads "Everything — open a page's graph to count from it" instead of just sitting grey with the reason hidden in a tooltip. Reach counts connections out from a page, and a graph opened from the rail has no page in the middle to count from.
- **A graph no longer flashes at the wrong size for a frame as it opens.** It was drawn once before the window had reported its size and then jumped to fit; it stays hidden for that frame now.
- **The wheel's glide takes the same fifth of a second on every screen.** It was a fixed fraction per frame, which is a slower glide on a faster monitor; it's a fixed length of time now.
- **Zooming in really does zoom toward your pointer now.** It was meant to since yesterday, but each step of the glide was working from numbers a frame or two old, so the page under the pointer slid away as you zoomed — a few hundred pixels in five notches, off the screen by full zoom — and you landed in empty space. Measured now: the page under the pointer moves about ten pixels across the whole zoom range.

- **Clicking Filter or Display while its menu is open closes it.** The press was closing the menu as a click outside it and the click that followed opened it again, so the button could only ever open. Same fix for the table's Filter, Sort and Columns buttons, which behaved the same way.
- **The wheel zooms out far enough to see a whole big world.** The graph used to stop zooming out at a fixed size that happened to fit 835 pages before the ring of lone pages made worlds bigger; a large world couldn't be seen whole at all. The limit follows the world now — half the size the whole picture fits at, so there's air around it — and a small world keeps the old floor.

## 2026-09-13 — The graph learns from Obsidian

### Additions

- **A scene's card says what happens.** Double-click a card on the storyline and write the event into it — what you write is the scene's Summary, the same field on its page, so it's in both places and only lives in one. The card grows to fit however much you write; nothing else on the canvas moves while you type. Enter is a new line, Ctrl+Enter is done, Escape keeps what was there. The strip at the bottom has an *Edit what happens* button for the same thing.
- **Every card has its own open-page button**, top-right corner. Double-clicking a card used to open its page; that's the description now, and the page has a button on the card rather than only at the bottom of the canvas. The strip's *Open this scene* button is gone with it.
- **A scene with a banner shows it on its card**, behind the name, shaded dark near the words so they stay readable. A page with no banner but a picture of its own shows that instead.
- **A character has Family, Friends, Allies, Rivals and Enemies fields by default.** Only Friends shipped before. They're reference fields, so each one is a line on the graph that says what it is.
- **The graph's filter menu lists each relationship by name.** Under *Reference fields*: Friends, Enemies, Leader, Members — whatever the pages on this graph actually use — each one its own tick box.

### Fixes

- **A scene can be renamed on the storyline.** Select it and press *Rename* (or F2), type over the name on the card, and Enter keeps it — Escape keeps the old one. It's the page that gets renamed, the same as in the tree; the card only ever showed the page's name. Before this, the canvas had no way to do it at all: double-clicking a scene opens its page, and the only buttons were *Open this scene* and *Take off the canvas*.
- **Selecting something on the storyline no longer shrinks the whole picture.** The strip of buttons for the selection was a row under the canvas, so every click took its height off the canvas and the picture re-fitted smaller — then grew back when you clicked away. The strip now lies over the bottom edge of the canvas instead; nothing moves. The zoom number and the "can't join those" note moved to the top edge to stay out from under it.
- **Panning the storyline no longer highlights a stretch's name or a note's text as it sweeps across them.**
- **Double-clicking a stretch's label renames it, as the label says.** The double-click was being listened for on the words, but pressing on a stretch grabs the pointer for the stretch as a whole, so the words never heard it. The Rename button worked all along; now both do.
- **Dragging the storyline's background pans it.** It had the graph's pan bug below, copied over before that was found: the step came out as zero, so the canvas sat still under the drag.
- **Dragging the graph's background pans it — for real this time.** The pan was adding up its steps in a way React was free to apply late, and when it did, every step came out as zero. That's why a drag sometimes did nothing at all; it had nothing to do with what was under the pointer.
- **The wheel glides and zooms toward your pointer.** A notch sets a target and the view eases to it over a dozen frames instead of jumping the whole notch at once, and the point under the pointer stays put — Obsidian's feel, both of them.
- **Pointing at dots is precise, and the background is the background.** While the pages are dots there are no clickable boxes at all: the graph works out the nearest dot to the pointer itself — generous for pointing, tight for picking up — and any press anywhere else pans. A box big enough to hover was covering the gaps between dots and grabbing pages on a background drag.
- **Zooming a big graph is smooth.** While the wheel turns, only what's on screen is painted and the filed-under lines are drawn solid; they get their dashes back the moment it stops. Measured on 831 pages: 43ms a frame → 18ms, the same as with no lines at all. Lines also never grow wider than a pixel and a half on screen, however far in you go.
- **Pointing at a page no longer flashes the lines.** The dots still fade and the page's own lines still light up in the accent, but the other lines stay as they are — they only step back when you click a page. Lines can't fade the way dots can, so dimming them on hover made thousands of them flash as the pointer crossed a row of dots.

- **Changing a filter or the reach on a big graph no longer freezes the app.** The layout is worked out on a separate thread now; the last picture stays up with a "Working out the picture…" note until the new one is ready, and the window keeps answering meanwhile. On 831 pages that's about a second of waiting instead of a second of frozen window — the same wait the graph had on opening, which is also no longer a freeze.

### Changes

- **Scene cards are wider (220), and Tidy up stacks cards edge to edge with a fixed space between**, since they're no longer all one height. Tidy up also stays quiet when a card is within a few pixels of where it would put it. The example world's storyline is re-spaced to match.
- **The storyline's toolbar is one row, always.** Beside an ordinary sidebar it was wrapping *Tidy up* and the expand corner onto a second line. The four buttons say *Scene*, *Existing page*, *Note* and *Stretch* now (hover for the long version), and when the page column is too narrow even for those they fold into one *Add* menu with the same four rows — words kept, never icons alone. The scene count is gone from the bar; the canvas shows it.
- **Scene cards on the storyline are one row.** Icon and name, 52 tall instead of 84. The bottom third of every card was kept empty for the little icons of who's in the scene, drawn whether or not anyone was — on a new storyline that was a name in a corner over a band of air. The icons now hang off the card's bottom-right corner as a small cluster of dots, and only when there is someone to show. Cards are still one fixed size, so nothing moves when a name is written into a page.
- **A stretch's label is small caps, and a new stretch starts at half the size.** Room for two scenes side by side rather than four cards' worth of dashed box around whatever it landed on.
- **Far out, a page is a dot.** At whole-world zoom a page is a filled dot in its colour rather than a ring with an unreadable icon in it; the ring, icon and name come back as you zoom in. Hundreds of dots are something the eye can take in, and drawing them is cheap enough that zooming repaints crisp on every tick — no more soft picture while the wheel turns.
- **Pages nothing points at sit in a ring around the rest.** A page with no written connections (a mention, a reference field, a manual link) is placed on a band outside the connected pages instead of being mixed in with them — where it's filed doesn't count, since every page is filed somewhere. It's the picture Obsidian's physics happens to produce, done on purpose so it's the same every time.
- **Pointing at a page lights its connections in the accent colour and the rest of the world steps back.** The page, the pages it touches and the lines between them stay at full strength; everything else fades. Clicking keeps it that way while the page is selected.
- **Hubs are bigger dots.** Far out, a page's dot grows with how many lines it has, so the pages everything points at are the ones your eye lands on.
- **The filter menu can switch kinds of line on and off** — mentions in the writing, reference fields, manual links, storylines, boards, and filed-under. On the whole-world graph a filter, a hidden kind or the lone-pages tick hides in place: nothing else moves, and it's instant. On a page's own graph they decide what's walked to, as before.
- **Pointing at a page far out is precise again, and the fade is calmer.** The dot had shrunk its clickable area down to four pixels; it has a proper one back. And the rest of the world fades over about a third of a second rather than flashing as the pointer crosses a row of dots.
- **A *Display* menu on the graph's bar, with a slider for when names appear.** Obsidian's text-fade threshold, in our terms: lower shows names from further out, higher keeps the picture to dots until you are close. It's a preference, like the Lines setting, so it follows you between worlds.
- **The filter menu can hide pages nothing points at.** A tick box beside the filters; the bar counts it as one. Where a page is filed doesn't count as pointing at it.
- **The test-world generator can make a world with hubs** (`--shape hubs`): a few pages most things point at, one home hub per page so the clusters are real, and a quarter of pages nothing points at. The default world still links everything to random other pages, which is the one shape no graph can make readable — judge the graph on the hub one.

## 2026-09-13 — a shape on a board can point at a page

### Additions

- **Link a shape to a page.** Select any shape on a board and a *Link to page* button appears at the top right, beside Expand. Search, pick, done — the shape now points at that page, and the button says its name while the shape is selected (as a tooltip in the page, in full when the board is expanded). *Remove the link* is in the same list.
- **Following the link opens the page.** Click the small link icon a linked shape shows, or the link in the popup that appears when you select it, and you're on the page. A web address typed into the drawing tool's own link box opens in your browser instead, the way links elsewhere in the app do.
- **Typed names work too.** The drawing tool has its own link box (Ctrl+K). Type a page's name or alias in there and it resolves to the page when clicked — by the storyline note's rule, so a name two pages share points at neither, and a name nothing answers to says so rather than doing nothing.
- **Backlinks and the graph see it.** A page a board's shape points at lists the board in its Backlinks, and the graph draws the line, the same as a scene on a storyline.

### Notes

- **Picked links survive renames; typed ones don't.** The picker writes the page's id into the shape; a typed name is looked up when clicked. Rename Greyharbour and the picked link still opens it, the typed one stops and tells you.
- **One wart worth knowing.** When a linked shape is selected, the drawing tool's own popup shows the link as it stores it — `anamnesis://page/…` followed by an id — rather than the page's name. The name is on the button at the top right. Making the popup say the name would mean changing the library, which is not worth it for this.
