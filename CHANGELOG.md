# Changelog

## 2026-09-07 — cards, a board and a list

### Additions

- **A database can be drawn four ways now**, and switching between them is a menu rather than a conversion — nothing is lost either way round, because all four are the same view drawn differently. The button on the left of the settings bar says which one you're looking at.
- **Cards.** A picture and a name each, with whichever columns are showing underneath. This is the one a mixed folder reads best in — a Location among the characters looks like a Location rather than a row of blanks.
- **A board, and you can drag cards between its columns.** Dropping a card somewhere sets the value it's grouped by, exactly as though you'd typed it into the table, and one undo takes it back. Dropping into the *No …* column clears it.
- **A list.** A name a line with its values trailing after, for when you just want to see what's in the folder.
- **Turn into ▸** in the right-click menu now offers all four, instead of only Table.
- **Choosing Board picks a sensible grouping for you** if you haven't set one — a dropdown or a status rather than the template, since a folder of characters grouped by template is a single column.

### Fixes

- **Pictures on cards actually load.** They were showing a broken-image icon.
- **A long summary no longer makes a card enormous.** It's clipped to a few lines on cards and boards; the card opens the page, so the rest is one click away.

## 2026-09-07 — typing straight into a table

### Additions

- **You can change a value without leaving the table.** Text, numbers, dates and dropdowns are edited in the row. Click a cell and type; there's no button to press first.
- **Filling in a cell on a page that doesn't have that property yet gives it one.** The column is there because some other page uses it, so typing into the blank cell adds the property to that page properly — it turns up in that page's own panel too, not only in the table.
- **Dropdowns offer what your other pages already say.** Picking *Alive* on a second character gets the same option, with the same colour, rather than a lookalike. You can type a new value straight into the picker to make one.
- **One press of undo puts a cell back**, including when the edit created the property.
- **A wide table scrolls sideways, and the name column stays put** while the rest slides under it — so you never lose which row you're looking at.
- **Long text, linked pages and pictures still open the page.** They want more room than a column has, and a cramped editor for them would be worse than a click.

### Fixes

- **Columns stop squeezing each other.** With five or more columns the words were breaking mid-phrase to make everything fit. Every column now has a minimum width and the table scrolls instead.

## 2026-09-07 — one column per property

### Fixes

- **A property that several pages carry is one column in a table, not one column per page.** Nine characters each with a Rank made nine columns all called Rank, each filled in on a single row and blank on the other eight. The table now lines them up under one heading, the way the rest of the app already treats two pages using the same property name as using the same property.
- **What was doing it:** behind the scenes each page keeps its own private id for a property you added yourself, and the table was telling them apart by that id instead of by the name on screen.
- **It also quietly protected your filters.** A filter or a hidden column pointed at whichever page happened to have defined that property first, so deleting that page would have taken the setting with it. They now point at the name, which no single page owns.

## 2026-09-07 — setting up a table

### Additions

- **A table can be filtered.** Stack up as many conditions as you like — every one of them has to hold, so *tagged noble* and *name contains kalla* together means both. You can filter on any column, and also on a page's name, its template and its tags, whether or not those are columns.
- **The count tells you what was left out.** A filtered table says **3 of 9 pages**, so a filter hiding six and a folder holding three never look the same.
- **Sorting, as many rungs as you need.** The first decides, the ones under it break ties — status first, then alphabetical inside each status. Click the arrow to turn one round. Blank values always go last, whichever way it's pointing, so reversing a sort doesn't drag forty empty rows to the top.
- **Grouping.** Rows gather into labelled sections with a count each, under a dropdown, a status, or the template. Sections are alphabetical and the pages with no value sit last under a heading that says so.
- **Turning columns off.** Anything you don't want on screen. A row's name always shows — it's the identity, not a property. What's stored is what you turned *off*, so a property added to a template later still turns up instead of staying invisible.
- **All four settings live in one bar above the table**, always in the same place, and a setting that's doing something wears a count so you can see it without opening it.

### Fixes

- **A long page name is readable again.** In a table it was being cut off against the edge with no way to see the rest. It wraps now, and ordinary names still sit on one line.

### Notes

- **Filtering matches on the words, not on hidden ids.** Two pages that both say *Alive* are the same answer even though each page keeps its own copy of that dropdown — so a filter built on one page works across all of them.
- **What isn't here yet:** there's no *any of these* — conditions always all apply — and numbers can't be filtered by greater or less than, only by exact value or emptiness. Grouping is deliberately not offered on tags or multi-selects, because a page carrying three of them would be listed three times.

## 2026-09-06 — a page can be a table

### Additions

- **Any page can be shown as a table of the pages inside it.** Right-click it in the tree and pick **Turn into a table**. A folder of characters becomes a grid with a row per character and a column per property — nothing is moved, nothing is re-made, and the pages stay exactly where they were.
- **It picks its own columns.** Whatever the pages inside are mostly made of decides which template's properties become the columns, so a Characters folder comes up with the character fields already in place. A page of a different kind still shows up as a row, with those columns left empty rather than being hidden.
- **The table is a way of looking, not a box things go into.** **Stop showing as a table** in the same menu puts the page back, and it takes nothing with it — every page that was a row is still a page, in the same place. That is the promise the whole feature is built on.
- **A page that has writing keeps it.** The table sits between the page's name and its tabs, so the writing underneath is untouched and still there when you scroll past.
- **Clicking a name opens that page**, and **Add a page** puts a new one straight into the table.
- **What is not here yet, and is coming:** the values are read-only for now — changing one means opening the page. Choosing which columns show, filtering, sorting and grouping come next, then editing straight in the row, then the card, board and list layouts.

## 2026-09-06 — the coloured edge on a callout

### Fixes

- **A callout's left edge takes its colour now**, and it never has. Whatever you set, the stripe down the side stayed the same grey as every other border in the app — Info was meant to be blue, Quote warm stone, Secret violet, and a callout you had coloured yourself was meant to match the colour you picked. None of them ever showed.
- **What was doing it:** a rule that repaints every border inside the editor to your border grey, which started reaching the callouts when the page's blocks moved inside the editor. Their own edge lost that argument silently from that day.
- **The edge is a lighter version of the colour rather than the colour itself.** Sitting against a fill mixed from the same colour, the plain one reads as the side of the box instead of as a colour — and the dark end of the palette, the navies and wines and pines, disappeared into it completely. On the light theme it goes darker instead, which is the same fix pointing the other way.
- **The button that adds an icon is a full-sized target** now, the same as everything else you can click.

## 2026-09-06 — putting a callout's icon back

### Fixes

- **Taking a callout's icon off is no longer a one-way door.** When a callout has no icon, an **Add an icon** button appears in its top corner next to the colour dot — the place you already look to change a callout.
- **It was technically possible before and that is not a defence.** The way back was an invisible 15-pixel square in the corner of the box that only showed itself while your pointer was over it. If you didn't know it was there, taking the icon off looked permanent.
- **The ghost square is gone entirely.** A callout with no icon now has nothing invisible in it at all.

## 2026-09-06 — every callout has an icon, and picking the kind picks it

### Changes

- **The kind of callout you want is now a thing you pick.** The slash menu offers **Info**, **Success**, **Warning**, **Danger**, **Quote** and **Secret**. The middle three arrive already coloured and already carrying their mark — a green tick, an amber triangle, a red alert — so the boxes you asked for are one gesture away instead of something you had to assemble.
- **Every callout wears an icon now**, its own kind's, until you pick a different one. No callout is blank unless you deliberately take its icon off.
- **Changing a callout's colour no longer changes its icon.** It used to: four colour families each stood for something, so recolouring a box swapped the mark on it, and any other colour left it wearing nothing. Nothing on screen ever said so, which made it look like some boxes had icons and some didn't for no reason. A Warning you recolour purple is a purple box that still says warning.
- **The icon is easier to hit than it looks.** The mark is 15 pixels; the button around it is 24, which is the size everything else clickable in the app has to be.
- **Picking your own icon, or removing it, works exactly as before** — including "The usual icon", which now means the one its kind wears.

## 2026-09-06 — the icon beside the writing, and a scrollbar that stopped flashing

### Fixes

- **A callout's icon sits beside the writing now**, centred down the left side of the box. It used to sit on a line of its own above the text, which is not what a callout looks like anywhere.
- **And the empty line above your first word is gone.** A callout with no colour has no icon — icons come from the four colour conventions — so the ordinary case was an *invisible* slot holding a line open for nothing. That space read as a mistake, because it was one.
- **The little dashed square for adding an icon moved into the corner**, opposite the colour dot. It appears when your pointer is over the callout, the same as before, but now nothing shifts sideways when it does.
- **Scrollbars don't flash near-white when the pointer crosses them.** The hover colour was borrowed from quiet text, and on 30 August quiet text got lighter in every theme so it would be readable. Nobody thought about the scrollbar. It steps up from your border colour now — and on Daylight it was going nearly black, which is fixed by the same change.

## 2026-09-06 — getting rid of a universe

### Fixes

- **You can remove a universe from the switcher now.** It's under **Remove a universe**, next to the **+** that makes them. Turning one back into a folder has been possible since universes existed, but only by right-clicking the universe's row — and that row only exists in the All universes view, so from inside a universe there was no way out of it at all.
- **It says what will happen before you click, not after.** Removing keeps every page inside; the thing just goes back to being an ordinary folder at the top of your world. "Remove" sounds destructive and this is the opposite, so the sentence is on screen while you're choosing rather than in a box you'd learn to click through.
- **Removing the universe you're currently in doesn't strand you.** The tree falls back to All universes rather than showing you an empty sidebar rooted at something that isn't a universe any more.

### Changes

- **Internal, nothing visible: deleting or un-making a universe now clears it from your world's saved settings.** Your world remembers which universe you were in and which one is the shared one. Those were left pointing at pages that had stopped being universes — harmless today, because the app checks before using them, but it meant turning that same page back into a universe later would silently make it your current *and* shared one again.

## 2026-09-06 — a universe for the things that are true everywhere

### Additions

- **One universe can be your shared one** — the pages that are true in every version of your world. A species, a map, a magic system, a language. You make it like any other universe and then say it's the shared one, from the universe switcher (**Shared universe**) or by right-clicking it in the tree.
- **Its pages show under whichever universe you're working in**, in their own labelled section at the bottom of the tree, collapsed until you want them. So shared lore is never something you have to switch away to go and read.
- **The switcher marks which one it is**, so you don't have to visit each in turn to find out.
- **The section is deliberately not styled like a page.** It's a rule, a gap, and a small heading — because the one thing that should never be ambiguous is which universe the page you're typing in belongs to.
- **Nothing is shared until you say so.** A world with no shared universe looks exactly as it did, and picking **None** puts it back.

## 2026-09-06 — a way to actually make a universe

### Fixes

- **The universe bar is always there now, even before you've made one**, and it has a **+** beside it. Yesterday it stayed hidden until a universe existed, which meant the only way to make your first one was a right-click menu item you'd have to already know about — so unless someone told you, universes weren't there at all.
- **The + gives you both ways in.** "New, empty universe" makes a fresh one and opens it so you can name it straight away. Under that is a list of the top-level pages you already have — click one and it becomes a universe, keeping everything inside it. That second one is the one that matters for a world that already exists: your AUs are folders today, and this turns them into universes without moving a single page.
- **That list has a search box and scrolls**, the same as "Move to" does. A world with a long tail of pages at the top level would otherwise put them in one column running off the bottom of the screen, where the ones past the edge can't be reached at all.
- **Opening the switcher in a world with no universes explains what they are** instead of showing a list of nothing.
- **A universe you open says it's a universe.** It used to show "This page doesn't have any tabs yet" with a button offering to add one — which is what a page says, not a container. It now says what a universe is for and offers to add a page inside it.

### Changes

- **The right-click "Turn into a universe" is still there.** It's the shortcut now rather than the way in.

## 2026-09-06 — one universe at a time

### Additions

- **There's a universe switcher under your world's name**, in the sidebar. It only appears once you've made a universe — a world without one looks exactly as it did.
- **Picking a universe shows only that universe's pages**, at the top of the tree. Canon on its own, Demonic AU on its own. The universe stops being a row you have to open, because its contents *are* the tree now; a character that used to be four levels down under AUs / Demonic AU / Characters is two.
- **"All universes" is the top of that list**, and it's where you start. One click, no trip to Settings, and it's the only view where universes show up as rows.
- **The app remembers which one you were in.** It's stored with the world, not with the app, so a world you hand to someone else opens on the universe you left it in.
- **Going to a page that isn't in the universe you're in takes you there.** A search result, a link, the home button — the sidebar follows you instead of quietly not having a row for the page you're now reading. If the page isn't in any universe, you land back in All universes, which is the only view that can show it.
- **The "+" beside your world's name makes the page inside the universe you're in**, and says so when you hover it.

### Changes

- **The trail above a focused folder starts at the universe**, not at your world, when you're in one — so the first step of it is the button that takes you back to where clicking it actually goes.
- **Finding a page by name in the sidebar searches the universe you're in.** The Search button on the left rail still looks across the whole world, and going to one of its results moves you to wherever that page lives.

**What this doesn't do yet:** there's no Shared universe for the pages that are true everywhere — a species, a map, a language. That's the next piece, and until it's built a page like that has to live in one universe or outside all of them.

## 2026-09-05 — universes, the first piece

### Additions

- **You can turn a top-level page into a universe.** Right-click any page sitting at the top of the tree and pick "Turn into a universe" — Canon, Demonic AU, Merfolk AU, one for each version of the world. Nothing already in it moves, and everything written on that page stays exactly where it was.
- **A universe can only sit at the top.** You can't drag one into a folder, and "Move to" on one says so instead of offering you somewhere to put it. That's the whole difference between a universe and a folder: a folder can end up anywhere, which is how the AUs folder got four levels deep in the first place.
- **"Turn back into a folder" is in the same menu**, on anything that's already a universe. Nothing about this is one-way.

### Changes

- **A universe isn't in any of the template lists.** It isn't a kind of page — it has no tabs of its own and nothing to fill in — so the New Page screen, the properties panel's picker and the Templates rail all leave it out. Turning a top-level page into one is the only way to make one.

**What this doesn't do yet:** the tree still shows everything at once. The switcher that puts one universe on screen at a time, the Shared section and the "All universes" view are the next pieces — so for now making one is a label and a rule, not a change to what you're looking at.

### Fixes

- **Turning a folder into anything else used to quietly undo itself.** A folder keeps its own data in a file called `_folder.json` and every other kind of page uses `_page.json`, and changing what a folder was left the old file sitting there. The app reads that one first, so the next time you opened the world the page was a folder again and everything you'd done to it was in the file next to it, unread. This has been possible for as long as folders could be given a template; it's fixed, and the file is renamed properly now.

## 2026-09-05 — the bar above the page is gone

### Changes

- **The strip across the top of the page has been removed.** It held six things and none of them needed a band of their own.
- **Home, back and forward are in a row at the bottom of the sidebar now** — the wide column with your pages in it, under the tree. Icons only, no words: a house and two arrows don't need explaining the way the rail's do. Back and forward walk the pages you've visited, the way a browser does — they're not undo. Undo is still Ctrl+Z.
- **The show/hide button for the properties panel sits on the page itself**, top right, with nothing drawn around it. The "Saved" marker and the "Undid deleting 2 pages" message are up there beside it.
- **Assets is called Library, and it's moved.** The rail reads Project, Library, Templates now. Nothing on disk changed — your `assets` folder is still called that and still holds the same files.

## 2026-09-05 — the formatting bar looks like the app

### Fixes

- **The formatting bar was never wearing your theme, and now it is.** The strip with bold and italic in it — the one set to stay at the top of the page — was drawing itself in the editor library's own colours: a purple-grey panel that appears in no theme here, outlined in near-white. It wasn't a styling choice anyone made; the bar gets moved out of the editor to sit above the page, and every colour the app hands the editor was being left behind when it moved. It uses the same surface and the same border as every other panel now.

### Changes

- **Its buttons are centred instead of pushed to the left.** They take about two thirds of the strip, so left-aligning them left a third of it empty and the bar read as unfinished.
- **The buttons are grouped, with a hairline between each group** — the block type, then bold and its neighbours, then alignment, then colour, then indent, then the link button. Nine buttons in one undivided row is a row you have to read every time.

## 2026-09-05 — an actual title bar

### Changes

- **The window has a real title bar again, and this time it's the app's own.** One band straight across the top, edge to edge, in your theme's colour, with the app's name in the middle of it. Yesterday's version had no bar at all — it switched the window's frame off and let four different parts of the app stand in for one, which is where the mismatched colours, the lines between them and the odd-coloured buttons on the right came from. That's gone.
- **The minimise, maximise and close buttons sit in that bar and match it.** Still Windows' own buttons, so hovering maximise still gives you the snap layouts, but they're tinted to the one colour the bar is painted rather than to whichever piece of the app they happened to be sitting over.
- **Every button on the left rail says what it is.** Project, Templates, Assets, Search, Switch project and Settings each have their word under the icon now, instead of only telling you if you hovered and waited. The rail is wider to fit them.
- **The properties panel's header row is gone again.** It only ever existed to have window buttons sitting on top of it, and they don't any more.

### Changes

- **The window's minimise, maximise and close are the app's own now.** They were Windows' until today, and Windows draws them at a fixed 46 pixels wide with no say in it, which is why they looked like three grey slabs dropped into the bar. Ours are slimmer, take the theme, and the close one goes red when you're about to press it.
- **What that costs is snap layouts** — the little grid of window arrangements that appeared if you hovered the old maximise button and waited. Dragging a window to the edge of the screen still snaps it, and Win+arrow still works. It was the only thing keeping the old buttons and you said you'd never found it.

### Fixes

- **The start screen has a title bar.** It had none at all — the bar was being drawn by the project shell, so the screen you pick a project from didn't get one. With the old Windows bar gone that left nothing to drag the window by and no close button on that screen, so the only way out of it was the taskbar. The bar is drawn for the whole window now, whichever screen you're on.
- **The line under the title bar runs the whole way across again.** Windows paints its own buttons over the top-right corner of the page, and it was painting over the last 137 pixels of that line — so the rule across the top of the window stopped just short of the right edge. The buttons now sit one pixel higher and the line runs underneath them.

### Notes

- **The window opens a bit wider and a bit taller than yesterday, and won't be dragged quite as small.** The rail grew to fit its labels and the title bar takes a strip off the top, and both of those are frame rather than page — so the numbers move with them and the writing keeps exactly the room it had.
- On a Mac the round window buttons move up into the title bar too, at its left end.

## 2026-09-05 — the window wears the theme

### Changes

- **The bar across the top of the window is the app's now, not Windows'.** It takes the colour of whatever theme you're on and changes with it, including a theme you wrote yourself — so on a dark theme the app stops looking like it's sitting inside somebody else's grey frame.
- **The minimise, maximise and close buttons are still Windows' own.** That's deliberate rather than lazy: they're what Windows 11's snap layouts appear over when you hover them, and drawing our own three buttons would have taken that off you to gain a colour. They get tinted to match instead.
- **You can drag the window by the whole strip across its top** — the rail, the row above the page, the sidebar's header, all of it. Anything you can click in that strip still just does its job.
- **The properties panel gained a header row**, so the line across the top of the window now runs the whole way instead of stopping where that panel starts.

### Notes

- On a Mac the buttons stay where a Mac puts them, shifted in so they don't land on the rail. Nothing changes on that front for you.

## 2026-09-05 — a rail down the left

### Changes

- **The buttons that used to sit above the page are now a rail down the left of the window.** Project, Templates and Assets moved into it out of the strip that used to sit over the sidebar, and search, switching project and settings moved into it out of the bar above the page.
- **The sidebar now says which panel it is showing.** The rail is icons only, so the words Templates and Assets are written over the panel itself. The tree still heads itself with the world's name, the way it always did.
- **What stayed above the page is what belongs to the page** — back and forward, the saved and history markers, and the button that shows and hides the properties panel. When pages can sit side by side, that is the row each of them will want its own copy of.

### Notes

- **The window opens a little wider than it used to, and won't be dragged quite as narrow.** Both by the width of the rail. The rail is chrome, so leaving the numbers alone would have taken its width out of the page instead — and at the old minimum it did exactly that, squeezing the tree until the world's name and two page names went to "…". The page has the same room it always had.
- **The search button no longer shows its keyboard shortcut.** It is still on the tooltip when you hover it, but that button was the only place in the app the shortcut was written down — say if you want it somewhere visible again.

## 2026-09-04 — the writing goes round an infobox

### Additions

- **An infobox can sit to one side with your writing flowing around it.** Its `⋯` menu has **Wrap left** and **Wrap right** beside Full width and Align centre — pick a side and the paragraphs after it fill the space beside it instead of starting below it.
- **Picking a side gives it half the page** if it was the full width, since there would be nothing to wrap around otherwise. A frame you have already made narrower keeps the width you gave it, and you can still drag its edges afterwards.
- **Picking the same side again puts it back** on a line of its own. Align centre and Full width also switch wrapping off, since a frame cannot be in two places.

### Notes

- **This was written down as impossible, and it wasn't.** The docs said the editor could not float a block, three times, and nobody had tried it. Asked why the reference manages it, the answer turned out to be that ours manages it too.
