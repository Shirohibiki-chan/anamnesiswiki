# Changelog

## 2026-09-04 — linking the names you've already written

### Additions

- **`/link page names` turns the page names in your writing into links.** It reads the page you're on, finds every place another page's name is written as plain text, and shows you the list before it touches anything.
- **You pick what gets linked.** One row per page, with the sentences it found the name in, all ticked to start with — untick anything that's a coincidence rather than a reference. Cancel and nothing at all is written.
- **One undo takes the whole lot back**, however many links it made.
- **It won't link the wrong thing.** Whole words only, so a page called *Art* doesn't claim the middle of *particular*; a name two pages share is skipped rather than guessed at; the longer name wins where two overlap; nicknames count; and a page never links to itself.
- **Your wording is kept.** If the sentence says the page's name exactly, the link follows the page if you rename it later. If it says a nickname, or says it in lower case, the link keeps what you wrote instead of quietly retitling your sentence.

### Notes

- **The other half of this — a marker on text that *could* be linked, while you're writing — isn't built.** It turned out to be the harder half rather than the easy one; the list in the dialog covers most of what it was for, since it shows you what could be linked and closing it changes nothing.

## 2026-09-04 — a contents list, and the icons you used last

### Additions

- **A contents list you can drop into a page.** Type `/contents` and you get a list of that page's headings, in order, indented by their level. Click one to jump to it.
- **It's never out of date**, because it isn't a copy — it reads the page every time it's drawn. Rename a heading and the list says the new name; write a new one and it appears; delete one and it's gone.
- **The icon picker keeps the last eight icons you picked** across the top, so the ones a world actually uses are two clicks away instead of a search. They're remembered across projects and across restarts, and the row steps aside while you're searching.

## 2026-09-04 — a copied block becomes a block of its own

### Fixes

- **A block in the writing can no longer end up as two windows onto one thing.** Blocks in a page are shown by pointing at them, so a duplicated pointer meant two boxes drawing the same block — typing in one changed the other. Anything that ends up pointing twice now quietly gets its own copy of the block instead.

### Notes

- **Copying a block out of a page and pasting it elsewhere still loses it**, and that's a separate gap now written down: the editor puts the clipboard together as plain HTML and these blocks have no way to read themselves back out of it, so what you paste arrives without them. Nothing is lost from the page you copied *from* — the block goes back to its sidebar, untouched.

## 2026-09-04 — the infobox gets its own menu

### Additions

- **An infobox has its own `⋯` now**, on the strip at the bottom beside its Add Block. Right-clicking the frame itself opens the same menu. (Right-clicking a block inside still opens that block's menu, as before.)
- **Colour.** The same swatches a sidebar block and a callout use. It lands on the frame's border and tints what's behind the blocks, so a group of stats can be told apart from a group of quotes at a glance.
- **Auto-adapt or fixed width.** Auto-adapt makes the frame as wide as whatever is in it; fixed keeps the width you dragged it to. It won't shrink past a quarter of the page or grow past the whole of it, so a frame holding one short tag doesn't come out the width of the word.
- **Dragging an edge switches a frame back to fixed**, at the width you dragged it to — the handle always does something rather than springing back.
- **Full width and Align centre.** Centre only shows up when the frame is narrower than the page, which is the only time it means anything; the same item then reads *Align left* to put it back.
- **Duplicate**, which copies the frame *and* the blocks in it. The copy is separate: writing in one doesn't change the other.
- **Remove infobox**, in the app's own words, saying what it does — the frame goes and the blocks in it go back to the sidebar. (The Delete on the editor's own hover handle does the same thing and always did; it just never said so.)

### Changes

- **An empty infobox says what it's for** rather than only naming itself: a picture, some stats, a few of the page's fields.

### Notes

- **Two things from the reference's version of this menu aren't built yet**, both because they need a decision rather than an afternoon: text wrapping around a frame (Wrap left / Wrap right), and Pin to top, which has never been pinned down past its name.

## 2026-09-03 — a picture block holds its own picture

### Additions

- **Every picture block holds its own picture now.** Put two on a page and they're two photographs, not the same one drawn twice. Before this, every picture block was a window onto the page's own portrait — so a picture dropped into a block in the middle of the writing quietly became the portrait as well, and a second picture block showed whatever the first one did.
- **One of them is the page's picture, and you pick which.** The block's `⋯` menu says *The page's picture* on the one that has it, and offers *Use as the page's picture* on any other. That's the picture the tree row, the hover preview and the LegendKeeper export use.
- **Picking a different one swaps the two pictures over** rather than overwriting anything, so choosing wrong and choosing again costs you nothing.
- **Duplicating a picture block gives you the picture with it**, instead of an empty frame beside a full one.

### Notes

- **Every page you already have opens exactly as it was.** The first picture block on a page holds the page's picture unless you say otherwise, which is what every page with a portrait already looked like — nothing on disk was rewritten to make this work.
- **Removing the block that holds the page's picture doesn't throw the picture away.** If there's another picture block on the page it takes over, and the page's picture becomes whatever that one is showing; if there isn't, the portrait stays on the page for the next picture block you add.
- **The Assets tab counts these.** A photo held only by a picture block in the writing is in use, so it won't turn up in the list of pictures nothing is pointing at. Duplicating a page, saving one as a template and pouring a template into a page all give the copy its own files, the same as the portrait and the cover have always done.

## 2026-09-02 — columns

### Additions

- **Two lanes of writing, side by side.** Type `/columns` (or `/two columns`) and the page splits into two lanes you can write in independently — a portrait or a stat block on one side, prose on the other. `/three columns` gives three.
- **Everything works inside a lane.** They hold ordinary writing, so headings, callouts, pictures, links, the `/` menu and a block dragged in from the sidebar all behave exactly as they do anywhere else on the page.
- **The line between two lanes is draggable.** Take hold of it and pull to give one lane more room; it sticks to a half, a third, two thirds and the quarters on the way past, and is free between them. The arrow keys move it too, five percent a press, if you'd rather not drag.
- **A lane can't be squeezed to nothing** — it stops at about a sixth of the row, which is roughly where a line of text stops being readable.
- **A row keeps its own shape.** Anything that isn't a column can't sit in a row pretending to be one: press Enter in the wrong place, or drag a block in, and it lands on the page under the row instead of turning into a fifth lane.
- **Removing a column keeps what you wrote in it.** The × under a lane hands its writing to the lane beside it; if that leaves a single column, the row comes apart and everything lands back on the page. Nothing disappears.
- **Add a column, or take the row apart.** Two buttons under a row you're pointing at: one more lane, or Ungroup, which turns the whole thing back into ordinary paragraphs with every word kept.

### Fixes

- **Ctrl+A works again on a page with columns on it.** A row anywhere on the page stopped select-all selecting anything at all — the cursor jumped to the end instead, so the Backspace after it took out one character rather than the page. Ctrl+A then Backspace now clears the lot, columns included.
- **Columns don't have stray vertical lines through them any more.** The editor draws a faint line beside anything indented, and a column is indented twice over — so every lane had one line at its edge and another beside its writing. They're gone inside a row, and the writing in a lane now starts exactly where the rest of the page's writing does instead of a couple of dozen pixels in.
- **The formatting bar doesn't turn into an empty strip any more.** Selecting a row of columns — or any block that holds no writing of its own — hides every button in the bar, and the empty box was left sitting there with its border and shadow, reading as something half-loaded. It now keeps its place, at its usual height, and says *Select some writing to format it*. The small blue mark that came with it was the row's selection ring drawn around an invisible marker; it goes around the whole row instead.
- **The `/` menu stopped stacking up headings.** Typing a few letters left the headings of everything you'd filtered past still on screen — `/colum` showed BASIC BLOCKS and three PAGE BLOCKS above the two things that actually matched. The menu is drawn by the app now instead of by the editor library, so it also looks like the rest of the app's menus.

### Notes

- **Ours rather than the ready-made one.** BlockNote sells columns as a separate package that would mean either paying for it or relicensing the whole app, so this is built against its ordinary block API instead. Same feature, no strings.
- **A row you drag stays that way.** The widths are stored with the page, so they're still there when you reopen it.
- **The controls on a row are plain for now** — a × under each lane, and two small buttons under the row. They only appear for the lane you're pointing at, and they're placed to stay out of each other's way rather than designed; that comes later.

## 2026-09-02 — the infobox's Add Block, tidied up

### Fixes

- **Add Block inside an infobox lights up only itself.** The highlight used to run almost the whole way across the frame — and not evenly, since it started a few pixels in on the left and ran off the edge on the right. It is a small rounded button now, as wide as its own words, sitting under whatever the frame is holding. The one in the sidebar still spans its panel, because there it is the last row of a list and reads as one.
- **The infobox menu no longer ends with a Properties heading over nothing.** That section offers the page's own fields that nothing is showing yet, so on a page where every field is already on screen there was a word at the bottom of the menu with an empty space under it, which reads as a list that failed to load. The heading now appears only when there is something under it.

## 2026-09-02 — blocks you can drag narrower

### Additions

- **A block sitting in your page can be dragged narrower.** Take hold of either edge — a small bar appears there when your pointer is over the block — and pull. The block follows, and the number in the corner tells you how much of the page it is taking while you drag.
- **It sticks to the useful widths on the way past.** Half the page, a third, two thirds, a quarter, three quarters: come near one and it clicks onto it, so two blocks meant to match end up matching. Anywhere else it is free, and stops wherever you let go.
- **An infobox resizes exactly the same way**, by the same edges.
- **The width belongs to the block, not to the page it is on.** Drag a block back out to the sidebar and into the page again and it is still the width you made it. The sidebar itself ignores widths — a block squeezed to half of a narrow column would be unusable, so it fills the column there as it always did.
- **Two ways back to full width**: double-click either edge, or put the keyboard on it and press Home. The left and right arrows step it 5% at a time, so the whole thing works without a precise mouse drag.

### Notes

- **A resize is undone by the panel's undo, not by Ctrl+Z in your writing.** The width is stored on the block itself, which is what lets it survive the trip to the sidebar and back — and that puts it on the same undo as everything else about a block.
- **The space beside a narrow block stays empty for now.** Putting a second thing next to it is columns, which is the next piece of this.

## 2026-09-01 — an icon in the middle of a sentence

### Additions

- **Type `:` and a couple of letters to drop an emoji or an icon into a sentence.** `:sm` and you get a list — `:smile:`, `:smiley:`, `:grinning:` — arrow keys to move, Enter or Tab to take one, the way it works in Discord. A bare colon on its own does nothing, so a colon you meant as punctuation stays punctuation.
- **Ctrl+`:` opens the full picker instead**, at your cursor: the search box, both tabs, and every icon and emoji there is to scroll through. That's the one for when you don't know what the thing is called. Holding shift for the colon is optional — Ctrl and the colon key does it either way.
- **They're two halves of the same job.** The first is for when you know the name and don't want to reach for the mouse; the second is for browsing. Neither can do the other's job well, which is why there are two.
- **An icon you place is still clickable afterwards** — click it and the picker opens on it, so you can change your mind without deleting anything. Emoji go in as ordinary characters, the way they always have, so they copy and export as themselves.
- **`/icon` works too**, and drops a heart in for you to change afterwards.
- **A callout's icon is yours to choose.** The tick on a green box and the caution on an amber one are still what you get without doing anything — that convention is worth keeping, and a callout that started blank would need decorating by hand before it said anything at all. But the icon is a button now: click it and pick whatever you like, on any callout, in any colour.
- **And you can take it off entirely.** The picker has two ways out of a callout's icon: **No icon**, which means no icon and stays that way, and **The usual icon**, which puts back the one its colour implies. They're deliberately two different answers — a callout you cleared shouldn't quietly grow its tick back the next time you open the page.

### Notes

- **The picker's Emoji tab is every emoji now — 1870 of them, up from 129.** It used to be a hand-picked list, which is fine right up until you want one nobody thought to pick. They're in the eight groups an emoji keyboard uses, and searching finds them by name, by keyword, or by the `:word:` people type in chat apps. This is everywhere the picker appears, so a page's icon and a meter's markers get the full set too, not just the writing.
- **A callout with no icon still has somewhere to click.** An empty square appears in the corner while your pointer is over the callout, the same way the colour dot does, so an icon you removed can be put back.
- **Icons in your writing don't survive an export to LegendKeeper.** An emoji does — it's a character, so it goes out as itself — but a glyph is a drawing and there's nothing in that format to put it in, so it's dropped rather than exported as the word "sword". Everything else about the page exports as it did.

## 2026-09-01 — page text is Nunito now

### Fixes

- **Menus close when you resize the window instead of floating off on their own.** A dropdown works out where to sit at the moment you open it and then stays put, so making the window bigger while one was open left it stranded in the middle of the screen, attached to nothing — easiest to hit with the typeface menu, but every menu in the app did it. They now close if the window changes size; open it again and it comes up in the right place.

### Changes

- **Settings is a panel down the right-hand side now, on every section, and it never moves.** It used to slide over to the right on Theme, Colours, Fonts and Snippets and slide back to the middle for everything else, which meant it sat somewhere different depending on which part of it you were in. Now it's always in the same place: full height, against the right edge, with the sidebar and most of your page still visible beside it. The app there stays undimmed and clickable on every section too, so you can walk to another page and watch a theme land on it while you're still picking. Escape and the × close it; clicking the app no longer does, because that would shut the panel every time you went to look at something.
- **Pages are written in Nunito instead of Quicksand.** Same rounded, friendly shape, but with a taller lowercase and less gap between letters, so a full page of it reads more settled and takes up a touch less room. Only the writing on a page changed — headings and the rest of the app are the same faces as before, and this is the starting point, so if you'd already picked your own face for writing in Settings, nothing moved.

## 2026-08-30 — the font picker

### Additions

- **21 new typefaces**, bringing the library to 119. Nunito, Comfortaa, Fredoka and Righteous by request; Fira Sans, PT Sans and Signika for the Trebuchet MS shape; Atkinson Hyperlegible, which was drawn specifically to be easy to read; Lato and Open Sans; Crimson Text, Noto Serif and Andada Pro for reading; Marcellus SC and Alegreya SC for titles; Handlee, Delius and Neucha at the readable end of handwriting; and Noto Sans Mono, Anonymous Pro and Cousine for code.
- **The typeface menu is the app's own now, not Windows'.** Category headings are proper headings that stay pinned to the top while their own fonts scroll underneath, so you can always see which group you're in. Every name is still written in its own face.
- **There's a search box in it.** Type a few letters to jump straight to a face rather than scrolling 119 of them.

### Changes

- **Every slot offers every font.** Monospace used to be reachable only from Code, and Handwriting was hidden from Interface. Both slots now list everything, just in a sensible order — Interface still opens on the sans-serifs, Code still opens on the monospaces.

### Notes

- **Two you asked for aren't here.** Morpheus is free for personal use only and can't be shipped in an app that other people download; the closest thing already in the list is Metamorphous. Trebuchet MS is Microsoft's, and Ubuntu — the usual substitute — ships under a licence the library doesn't accept, so it got three lookalikes instead.
- **Cinzel was already there**, under Titles.

## 2026-08-30 — Settings gets out of the way while you pick colours

### Fixes

- **The Settings window becomes a panel down the right-hand side on Theme, Colours, Fonts and Snippets.** Full height, flush to the edge, instead of a box filling the middle of the window — so the sidebar, the page and most of what you're changing stay in view while you change it.
- **The font pickers aren't cut off down their left edge any more.** Clicking or tabbing into one drew a highlight around it with the left side sliced flat off, because the panel they sit in was trimming anything that reached past its edge. Older than this change, and it happened at any window size; it just got easier to see.
- **The app behind it isn't dimmed any more on those four sections.** It was under a flat 50% black wash, which meant the strip you could see wasn't showing the colour you'd just picked — it was showing that colour at half brightness. Picking colours through it was guesswork.
- **You can click the app while it's open.** Walk to another page, open a folder, look at a different screen — the window stays where it is instead of closing. Escape and the × still close it.
- **The other sections are unchanged**, and so is everything on a window narrower than about 1150px, where moving the dialog aside wouldn't leave enough room to see anything.

## 2026-08-30 — the writing starts a little smaller

### Changes

- **The text on a page is 15px by default instead of 16.** It's a small step down on purpose, but headings are sized off the body text and come with it, so it buys more room than it sounds like: on a 1150x780 window a four-line callout becomes three, and a paragraph that ran off the bottom of the pane now fits. Nothing else in the app changed size.
- **The Writing slider still reaches exactly as far in both directions.** Its ends moved to match the new starting point, so the smallest and largest the writing can be are the same sizes they always were.
- **If you'd already moved that slider, your pages will still get slightly smaller.** The slider is a percentage of the starting size and the starting size is what changed, so whatever you'd set is now 6% smaller than it was. Nudge it up one step if you liked where it was.

## 2026-08-30 — the quiet text is brighter

### Fixes

- **Quiet text is brighter in all seven themes.** Hints under fields, dates, counts, the notes in the theme picker, the labels on properties, placeholder text in an empty box — everything that isn't the main body text has come up several steps. The main text hasn't moved; it didn't need to.
- **The steps are spread out now.** There are four levels of text, and three of them used to be bunched at the dim end, so almost everything that wasn't a heading looked about equally faint. They're evenly spaced.
- **Menus, dropdowns and chips get the same treatment.** They sit on the lightest surface a theme has, which is exactly where dim text is hardest to read, and it was the one surface nobody had ever checked. It was the worst place in the app for this and now it's held to the same standard as everywhere else.
- **A hidden page's name in the sidebar, and a hidden tab's label, are readable.** Both were dimmed on top of being italic. The italic still says hidden; the dimming is much lighter.
- **Abyssal's menus are a shade deeper.** Its dropdown background was lighter than every other theme's, light enough that no text colour could sit on it clearly, so it was the one theme where the fix above needed the background to move too.
- **Links in Daylight are darker.** The teal used for links and the selected page was too pale against white to read comfortably at normal size. Buttons in that theme moved with it.

## 2026-08-29 — the ring around a selected block

### Fixes

- **Clicking a block or an infobox in the page no longer wraps it in a thick blue band.** That outline was BlockNote's own, hardcoded four pixels of bright blue for its picture blocks, and it landed on ours because they're selected by a single click. It's now the same thin ring the rest of the app uses when something is selected, sitting just outside the frame instead of on top of its border.
- **A lone block in the page draws the border it was meant to.** A rule that keeps the editor's menus from drawing a white outline was also overriding our own blocks, so the frame around a block in the page has been a shade heavier than intended since it shipped. Nothing looked broken; it just wasn't the line it was written to be.

## 2026-08-28 — the infobox

### Additions

- **`/infobox` puts a framed group of blocks in the page.** It arrives empty with its own **Add Block**, which offers the same things the sidebar's does — a text block, a picture, tags, an alias, the indexes, any of the meters, or a field the page already has. Everything you put in it is grouped inside one border, which is what tells a reader those blocks belong together.
- **The blocks in it are the page's own blocks, not copies.** One goes into the infobox and leaves the sidebar, exactly as a block placed loose in the page does. Its `⋯` menu, its title, its colour and its fields all work the way they always have.
- **The frame keeps its own order.** Drag a block inside an infobox and it moves within that group; the sidebar's order is untouched.
- **Deleting the frame gives the blocks back.** Hover it, use the handle beside it, Delete — every block it held returns to the sidebar. Nothing in an infobox can be lost by getting rid of the box.

## 2026-08-28 — the fourth pinned project is back

### Fixes

- **The pinned row shows four projects again instead of three.** The width a card aims for was measured against a row that has since given space to the panel beside it and to a scrollbar, so the fourth card needed a wider window than the one you use — and it quietly dropped to three rather than saying anything. It now fits four down to a much narrower window, with room to spare.
- **On a very wide window you may now see five across** where you saw four. Same rule, just reaching the next step sooner.

## 2026-08-28 — the slash menu stays on the screen

### Fixes

- **The `/` menu no longer runs off the edge of the window.** Depending on where your cursor was on the page, the command list could hang off the bottom — or, when it opened upwards instead, off the top, with its first rows above the window entirely. It now fits the room it actually has, wherever the cursor is.
- **It still won't be enormous.** On a tall window it stops at about eight rows rather than filling the screen, which is what the old rule was reaching for; the difference is that the limit can no longer make the menu *bigger* than the space it has to fit in.

## 2026-08-28 — blocks can live in the page

### Additions

- **A block can now sit in the middle of a page instead of in the sidebar.** Type `/` and you'll find a new **Page blocks** group — text block, picture, tags, alias, the three indexes and backlinks — plus all eight meters. Pick one and it's placed where you're writing, at the full width of the page rather than squeezed into a 340px column. This is what the sidebar could never do: a row of gauges has room to spread out.
- **It's the same block, not a copy.** A block you put in the page leaves the sidebar, because there is only ever one of it. Everything works exactly as it did — the `⋯` menu, the title, the colour, the fields — since the page and the sidebar draw blocks through the same code.
- **Take it out and it goes back to the sidebar.** Hover the block, click the handle beside it, and Delete. Nothing is lost: the block returns to the panel it came from. Deleting it for good is still **Remove** in the block's own `⋯` menu.

### Fixes

- **A block deleted from its `⋯` menu no longer leaves a gap in the page.** It draws nothing straight away, and the leftover reference is tidied out of the page the next time you open it.

## 2026-08-28 — the formatting bar can stay put

### Additions

- **Settings → Writing, a new section**, for how the editor behaves while you're writing in it rather than what it looks like.
- **The formatting bar can stay at the top of the page.** The strip with bold, italic and the rest normally appears over your text when you select some and goes away again; now you can have it always there instead, above what you're writing. The buttons do exactly the same thing either way — this is only about where the strip lives.
- **It appears-on-selection by default**, the way it always has, so nothing changes unless you go and change it.
