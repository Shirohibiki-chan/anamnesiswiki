# Changelog

## 2026-09-10 — a template you can hand somebody

### Additions

- **Save one of your templates as a file.** Hover a template in the Templates panel and there's a share button beside the delete one. It writes the template and everything inside it to a single `.anpage` file you can send to somebody.
- **Open one you've been sent**, from *Open a template file* at the bottom of the Templates panel. It lands in your world as another template and touches nothing you already have.
- **Pictures come along, and you can turn them off.** The switch says how much they add, because that's the only reason you'd want to know. Off, the template still arrives — just without the images.
- **Opening the same file twice gives you two templates**, not one quietly replacing the other.

### Notes

- **This is not the same thing as a project template.** A `.antpl` is a whole project's shape — folders, and a blank starter page of each kind, with nobody's writing in it — and opens from the start screen. This is one page and its sub-pages, copied whole, prose and properties and pictures included. The extensions are deliberately unalike so they can't be confused in a folder.
- **A file that isn't one says why.** Picking a project template by mistake points you at the start screen; a truncated download, a damaged file, or one made by a newer version of the app each get their own sentence.
- **This finishes Phase 28.** A world can now leave as a LegendKeeper file, a folder of Markdown, one big Markdown file, a JSON zip, a printed page — or, one template at a time, as something you hand to a friend.

## 2026-09-10 — Export as JSON

### Additions

- **Export as JSON (.zip)**, on the project's Export menu. Your writing is already JSON files on disk, so this zips up the folder exactly as it sits rather than converting anything — unzip it anywhere and you have a working world back.
- **It tells you what's in there first**: how many files, how big before squashing, and how much of that is the earlier versions of your pages.
- **Earlier versions come along.** They're the biggest thing in a project folder and the obvious thing to leave out, but they're yours, and because each one is nearly identical to the last they squash down to a fraction of their size.
- **Everything sits inside one folder in the zip**, named after your project, so unzipping doesn't scatter ninety files into whatever folder you were in.

### Notes

- **Two things deliberately don't travel**: the marker saying the world is open right now, which would make a fresh copy look locked by somebody else, and the half-finished rename left behind by an interrupted move, which the app repairs by itself anyway.
- **It's on the project menu only.** There's no such thing as a folder for a single character, so it isn't offered on a page.
- **Internal: the first dependency this app has taken on in a while** — a small MIT-licensed zip library. The compression the app already had can only do one stream at a time and can't make an archive.

## 2026-09-10 — a page you can actually print

### Fixes

- **Ctrl+P prints the page, not the app.** It always opened the print dialog and Windows always offered Print to PDF — what came out was the whole window, rail and tree and side panel included, in dark theme, and only the part of the page that happened to be on screen. Now it's the page's title and its writing, and nothing else.
- **The whole page prints, however long it is.** The rest of it used to be cut off at the bottom of the window; that was the real bug, and the least obvious one.
- **On white, whatever theme you're in.** Every theme but Daylight is dark, and a dark theme on paper is a solid black rectangle. Printing borrows Daylight's colours, which were measured against white when that theme was built.
- **Callouts keep their colour**, because a Secret that prints as a plain paragraph has lost the one thing it was saying. Headings don't get stranded alone at the foot of a sheet, and pictures, tables and quotes aren't split across two.

### Notes

- **This is the nearest thing to a PDF export**, and it costs one stylesheet — Print to PDF in the print dialog does the rest.
- **Untested on Linux.** Print styling is exactly what renders differently on the engine the Linux build uses, so it's built cautiously — plain boxes rather than the flexible ones the screen uses, and the older spelling of the page-break rules alongside the modern one. Worth someone actually trying it there.

## 2026-09-10 — the whole world in one file, and an Export menu

### Additions

- **Export as one Markdown file.** Every page as a heading in a single `.md`, nested as deeply as it sits in your tree — so an editor's outline pane shows your world. It's for handing somebody the whole thing to read in one scroll; links between pages jump down the document instead of opening anything.
- **Pictures from your own computer aren't in it**, because one file means one file and there's no folder beside it to put them in. Captions stay, and pictures you added by web address still show. The export says how many were left behind, and the Markdown *folder* export takes them all.
- **All the export formats now sit behind one Export entry**, on both the project menu and a page's right-click menu. Three formats in a menu that long were three lines nobody would read, and there are two more coming.

### Notes

- **Properties come out as a short list under each page's heading**, since a single file can only carry one properties block and it has to be at the very top.

## 2026-09-10 — Export as Markdown

### Additions

- **Export as Markdown**, on the project menu and on any page's right-click menu, beside the LegendKeeper one. It writes your world as a folder of `.md` files you can open as an Obsidian vault, or read in anything else that reads markdown.
- **It says what it's about to do before it does it** — how many pages, how many pictures it will copy, and which blocks come out as plain writing rather than staying live.
- **A new folder every time.** Pick where it goes and it makes a folder named after your project inside it; export twice and the second is *(2)*. It never writes over a folder that's already there, because an export isn't a sync and it has no way of knowing what belongs to the last one.
- **A button to open the folder when it's done**, rather than a path you'd have to type out.

### Notes

- **A picture that won't read is reported, not fatal.** The rest of the export still lands, and the modal says how many were missed — losing one picture is bad, losing the whole export because of one is worse.
- **Nothing is asked of you beyond where to put it.** The LegendKeeper export has a picture switch because that format can't hold pictures; a markdown folder just takes them, because a folder pointing back at your project folder wouldn't be much of a way out.

## 2026-09-10 — a world written out as markdown

### Notes

- **Groundwork, with nothing to press yet.** This is the part that turns your world into a folder of markdown files — what each page becomes, what each file is called, where the pictures go and what every link has to say to find its page. Saving that folder to disk, and the button that starts it, are the next piece; nothing in the app has changed today.
- **A page with pages under it becomes a file beside a folder of the same name**, which is how Obsidian does it too — `Kaine.md` next to a `Kaine` folder holding what is inside her.
- **Your tabs become headings running down the one file**, so a page stays a page. A page with only one tab gets no heading at all, since printing "Main" over every note would say nothing. Headings you wrote inside a tab shift down a level so the note's outline still reads top to bottom.
- **Properties go to the top of the file** in the block Obsidian shows as a note's properties — with the words you chose rather than anything internal, and a link to another page still a link.
- **Blocks that have no markdown come out as plain writing**: a meter becomes a line with its number, an index or a database becomes a list of links, side-by-side columns run one after the other. The export counts these and says so, separately from the handful of things that had nothing to write down at all.
- **Pictures are copied in and every reference is pointed at the copy**, so the folder is complete on its own. A picture you embedded by web address is left exactly as it is.
- **Callouts, checklists and toggles use Obsidian's own syntax**, so they still look like callouts, checklists and toggles over there rather than arriving as plain paragraphs.

## 2026-09-10 — one walk behind every export

### Notes

- **Internal tidy-up, nothing visible in the app.** Exporting to LegendKeeper does exactly what it did before — the file it writes is identical, which was checked by building the same export with the old code and the new one and comparing them line for line.
- **What moved is underneath it.** The part that walks through your pages working out what goes into an export, in what order, and which pictures can travel, now lives in one place of its own instead of being wound through LegendKeeper's file format.
- **This is the groundwork for the rest of Phase 28.** The Markdown export, the one-big-file version and the website publisher all have to walk your pages the same way, and they can now share that instead of each writing it again — which is where the same bug would otherwise have been fixed three times.

## 2026-09-09 — a way back to the tour and the example world

### Additions

- **Settings has a Getting started section.** It holds the two things that only ever turn up once: the tour, and the example world. Both are searchable from the settings search box.
- **Take the tour again.** The same four steps, whenever you want them. It needs a world open, since every step points at part of one — from the start screen it says so rather than doing nothing.
- **Make a fresh copy of the example world.** A new one every time, so a Saltmere you have written all over is never replaced. It tells you which copy it just made.

### Notes

- **This finishes Phase 26.** The example world shows what a world is made of, the tour shows where things are, and this is the way back to either. What it deliberately does not do is wait for you to do something — no step says "now try making a page".
- **Internal: there is now a test that fails when the app moves out from under the tour.** The tour points at four parts of the window, and if one of them is renamed or removed the test says so by name. It cannot check whether the words are still *true*, so there is a note about that where the rules for this project are kept.

## 2026-09-09 — the example world is simply there

### Changes

- **A new install has the example world in its library from the start**, instead of only getting one if you asked for it on the start screen. It is the same world it was — an ordinary project on your disk — it just does not wait to be noticed. If the first thing you do is bring in a world of your own, Saltmere is still sitting there for the evening you wonder what else this thing does.
- **Deleting it means deleting it.** It is not put back on the next launch, ever. The app only ever gives you one, once.
- **Asking for it again still works**, from *The example world* on the start screen — that makes a fresh copy, so a Saltmere you have written all over is never overwritten by a new one.

## 2026-09-09 — a short tour, the first time you open a world

### Additions

- **The app shows you round on its first run.** Four steps — the rail, your world, the page, and the panel on the right — each one lit up while a card beside it says what it is for. It runs once a world is open rather than on the start screen, because none of it exists until then.
- **A way out on every step.** Skip, or press Escape, or walk to the end. However you leave, it does not come back.
- **Left and right arrows walk through it**, and Enter is Next.
- **It skips a step it cannot point at.** Close the right-hand panel and the tour is three steps rather than four — it never draws a highlight round nothing, which is the thing that would make the app look broken rather than the tutorial look old.

### Notes

- **Nothing about whether you have seen it goes anywhere.** It is one setting on your own machine, like every other one.
- **This finishes the pair** (Phase 26): the example world shows what a world is made of, and this shows where things are. What is left is a way back to either of them from Settings.

## 2026-09-09 — a world you can open and look around

### Additions

- **The example world.** A fourth way in on the start screen, under **Add a Project**: *The example world* makes Saltmere — a harbour town the sea is leaving, four people, one guild, and one night that went wrong. It's for anyone opening this app who hasn't watched it get built, and it opens on a page saying what it is.
- **It's a real project, not a locked demo.** Opening it copies a world onto your disk like any other: rename it, write in it, delete it. Nothing you do to it touches anything else.
- **Asking for it again gives you another copy** rather than refusing because the name is taken — the second one is *Saltmere Example 2*.
- **It's small, and it's meant to be read in about ten minutes.** A folder of characters with one properly written and one barely started, a page that lists the places inside it as a table, a guild holding the thing it's fighting over, and a storyline with four scenes that fork and come back together — with a note, a labelled stretch, and every name in the writing a real link.

### Notes

- **This is the first half of Phase 26.** The other half is a short tour of the app itself, which is what teaches where things are — nothing in the example world describes the app on purpose, so it can't go out of date when a later change moves something.

## 2026-09-09 — storylines: pages you already have, and who's in a scene

### Additions

- **Put a page you already have on a storyline.** *Put a page on it* opens a search; pick a page and it goes on the canvas as a scene, pointing at the page rather than copying it. Nothing new is made, and the page keeps living where it lives. Half the scenes in a real storyline are events you've already written, so this is the other half of adding one.
- **The box stays open after you pick.** Type the next name straight away — putting five pages on doesn't mean opening it five times. Click anywhere else, or press Escape, to put it away.
- **It won't offer a page from another universe.** A storyline is one version of events, so a page belonging to a different universe isn't in the list. Pages in the shared universe, and pages that aren't in any universe, are offered as normal.
- **A scene card shows who's in it.** Small icons along the bottom for whatever that scene's page points at — characters, places, things — read from the same reference index Backlinks uses, so it doesn't matter whether you named them in the writing, filled them into a field, or linked them from a block. Select a scene and the strip along the bottom names them, and each one takes you to its page.
- **A page now knows it's on a storyline.** Being a scene counts as a connection, so the storyline turns up on that page's graph alongside everything else that points at it.

### Notes

- **This finishes storylines** (Phase 25). What the three parts built is in `docs/shipped.md`.
- A card is a little taller than it was, to make room for the row of who's in the scene. The row is drawn whether or not anyone is in it, so cards stay one size and nothing shifts as you write.

## 2026-09-09 — storylines: notes, labels, and tidying up

### Additions

- **Loose notes, dropped anywhere on a storyline's canvas.** A note is for the thing the picture can't say — a thread that stops here and carries on somewhere else. Add a note and it opens straight into typing; double-click one to change it later.
- **Notes hold links.** Write `[[Greyharbour]]` in a note and it becomes a link to that page, so a branch that ends becomes an exit rather than a dead end. Aliases work the same way they do everywhere else, and a name two pages both answer to isn't guessed at.
- **A name nothing answers to is marked rather than quietly drawn as words.** If you rename the page a note pointed at, the note shows you the link is broken instead of looking finished.
- **Label a stretch of the storyline — "Act 2".** It's drawn behind the scenes as a dashed frame with a name on it, and it starts drawn around everything so you pull it in to the stretch you actually meant. **Dragging one carries the scenes standing on it**, so moving an act moves the act.
- **Tidy up.** One button that lines the scenes up in order — one column per step, forks side by side, and a scene that can be reached the long way round sits after the long way rather than jumping back. It only ever runs when you press it, and Ctrl+Shift+Z puts your own arrangement back.

### Notes

- **Notes and labels are not part of the story, on purpose.** Neither one has lines, neither has a page behind it, and neither is counted in the scene tally. Removing a label removes a label — the scenes it was drawn around stay exactly where they are.
- **Tidying leaves your notes and labels where you put them.** They're anchored to a thought about a place on the canvas and there's no honest way to guess where that thought went.
- **What's left of storylines:** pointing a scene at a page that already exists (right now every scene added makes a new page), and showing who's in a scene. That's the last part — `docs/plan.md` has it.

## 2026-09-09 — storylines, the canvas

### Additions

- **Storyline is a new kind of page, and its body is a canvas.** Make one the way you make any page — it's in the list of kinds a new page offers, next to Scene and Quest. Instead of tabs it opens onto an empty canvas you drag around and zoom with the wheel.
- **Add a scene, and it becomes a real page inside the storyline.** It's a Scene page like any other: it's in the tree, you can open it and write the whole scene in it, and it has its own tabs and properties. The card on the canvas is a view of that page, not a copy of it — rename the page and the card follows.
- **Drag from a scene's handle to another scene to say it leads there.** The line is drawn with an arrow, because a storyline is about what happens next rather than about what's related to what. A scene can lead to several, and several can lead into one, so a thread that splits and comes back together is drawn the way it actually is.
- **Nothing rearranges itself.** Where you put a scene is where it stays — this is not the relationship graph, which works its own layout out for you. Your arrangement is saved beside the scenes and comes back exactly as you left it.
- **The canvas says no, and says why.** It won't join a scene to itself, won't draw a second line between two scenes that are already joined, and won't let the story loop back on itself — each one tells you which it was rather than just not drawing the line.
- **Fill the window** when the arrangement wants more room than the page column has. Escape puts it back.
- **Take a scene off the canvas without deleting anything.** The page keeps existing, in the tree, with everything you wrote in it. Deleting the page is still a separate thing you do from the tree.

### Notes

- **This is the first part of storylines, not all of it.** Loose notes you can drop anywhere on the canvas, labels for a group of scenes ("Act 2"), pointing a scene at a page that already exists, and a tidy-up button are the next parts. `docs/plan.md` has the rest.
- **The canvas is its own file** — `_storyline.json`, sitting inside the storyline page's folder alongside the scenes. Moving or renaming the storyline carries it along, and moving a scene an inch doesn't count as editing any page, so it stays out of version history and out of whatever syncs your folder.

## 2026-09-08 — the graph, finished off

### Additions

- **A folder can open its graph now.** It's on the folder's own card, next to *Add a page* — folders are drawn as that centred card rather than as a page with a name row, so they had no way in at all and the graph quietly didn't apply to them.

### Fixes

- **Opening the world graph from the rail and widening a page's graph all the way now draw the same picture.** They always showed the same pages, but they laid them out slightly differently — enough that one could be far enough out to stop writing the names while the other still wrote them. The page you opened from is marked rather than moved now, so both routes settle identically.
- **Tidying that picture counts once, whichever way you got to it.** Dragging pages around the whole-universe graph is remembered against the universe rather than against whichever page you happened to open it from, so arranging it from a page and arranging it from the rail are the same arrangement.

### Notes

- **How long the graph takes to lay out, measured rather than guessed:** roughly a millisecond a page, worked out once when the graph opens. A 75-page world takes about a twentieth of a second; 500 pages take about half a second; 2000 take a couple of seconds. Nothing to notice at the size of your world, and now written down so it isn't a surprise later.

## 2026-09-08 — the whole world as a graph

### Additions

- **A Graph button in the rail, under Search, draws your whole universe at once.** Every page in it, however it is joined up — and pages that are joined to nothing are drawn too, which is the thing a picture of a whole world is most useful for saying.
- **A page's own graph can be widened all the way.** Reach has a fourth setting, *Everything*, and choosing it gives the same picture with the page you were on still marked in the middle. The rail's button and the page's are two ways into one thing, not two features.
- **It draws whichever universe you are in.** Opened from the rail, that is whichever the switcher says; opened from a page, it is the universe that page lives in, even if the tree is showing a different one. With All universes selected it draws the whole world.
- **A whole-universe graph remembers its own arrangement**, kept apart from every page's, so tidying it leaves each page's graph exactly as you left it.

### Adjustments

- **Zoomed far enough out, the names stop being drawn.** A whole world does not fit on a screen at a size names can be read at, and unreadable ones sit exactly where the shape you are looking at should be. Hovering a page still shows its name, and clicking one still names it in full in the card beside the graph.
- **The graph now says which world it is of by name**, rather than calling it "this world".

## 2026-09-08 — changes made right after opening a page now stick

### Fixes

- **Setting a page as a shortcut could be lost when you restarted.** It appeared in the strip above the tree straight away and was gone the next time the app opened. The same went for removing one.
- **Anything else changed in the moment after opening a page could be lost the same way** — the home page, an arrangement restored from an earlier version, a graph's layout, and the order of pages after a move, a delete or a duplicate.
- **The cause was one thing, and it is fixed in one place.** Opening a page schedules a save of the file that holds your page order, your shortcuts and which folders are open. That save was writing the file as it looked when you opened the page, so anything you changed in the next third of a second was written over. It now writes the file as it actually is at the moment it saves, so nothing can be overtaken.

### Notes

- **Nothing you have on disk needs fixing** — this only ever affected a change made within a few hundred milliseconds of opening a page, and only until you made another change to the same file. Anything currently in your world is what it says it is.
- Found through the graph's **Put it back** the day before, which is simply the easiest way to hit it: that button sits inches from the page you just opened.

## 2026-09-07 — steering the graph, and it remembers how you left it

### Additions

- **You can move pages around a graph and they stay where you put them.** Drag a page, and next time you open that graph it is where you left it — including after closing the app. Each page's graph remembers its own arrangement, so tidying one leaves every other one exactly as it was.
- **Put it back** lays a graph out again from scratch and forgets everything you moved on it. It sits in the bar and is greyed out until there is something to undo.
- **Reach** chooses how far out the graph looks: one connection, two, or three. One is the default, and it stays that way each time you open a graph.
- **Filter by what a page is** — its template, or its tags. The same filters the database views use, so there is nothing new to learn. The bar counts what is left against what there was, so a filter hiding everything never looks like a page connected to nothing.
- **Lines** chooses when a line writes what it is. *Names when pointed at* only labels the lines touching whatever you are hovering; *Names always* labels every line that has a name. This is a preference, so it follows you between worlds.

### Fixes

- **Clearing a graph's arrangement right after opening a page could quietly fail.** It looked cleared on screen, but the file on disk still held it, so it came back the next time the app started. A save left over from opening the page was landing on top and putting it back.
- **The graph's filter menu could not be clicked.** It drew in the right place, but every click went through it to the graph behind.
- **The close button no longer drops onto a second line** when the window is at its narrowest and the controls wrap.

### Notes

- **The reach and the filters are forgotten when you close the graph**, on purpose — a graph reopened days later still hiding half of what it is connected to, with nothing on screen saying why, would look broken. What you moved is kept; what you were asking is not.
- **A filtered-out page takes its lines with it**, so at two or three connections out, anything only reachable through it goes too. The filter menu says so.
- **Only reference fields have a name to write on a line** — Friends, Enemies, and so on. A mention you wrote in a sentence, a link you added by hand, and a page nested inside another have no name to give, so most lines stay bare in either mode.

## 2026-09-07 — see what a page is connected to

### Additions

- **Every page has a picture of what it is connected to.** The button beside a page’s name opens it over the page; Escape or the X closes it and puts you back where you were reading.
- **The page you were on sits in the middle**, with everything one connection away from it around the outside — pages you mentioned while writing, pages that mentioned this one, anything in a reference field like Friends, and anything you linked by hand.
- **Pages look like they do in your tree**, carrying their template’s icon and their colour, rather than every page being the same grey dot.
- **Where a page is filed counts as a connection too**, so a sword nested under its owner is joined to it. Those lines are drawn as quiet dashes, because where you filed something and what you wrote about it aren’t the same claim.
- **Clicking a page shows a card about it beside the graph** — its name, what kind of page it is, its tags and the start of what’s written on it. Going there is a second click on **Open this page**, so a look never costs you the graph.
- **You can drag pages around and move the picture.** Drag a page to move it, drag the background to move everything, and scroll to zoom.
- **The same world always looks the same.** The arrangement is worked out the same way every time, so pages stay roughly where you last saw them instead of scattering differently on each visit.

### Notes

- **Positions you drag aren’t kept yet** — they last as long as the graph is open. Remembering them comes with the next piece, along with filters and a control for how far out it reaches.
- **Folders don’t have the button.** A folder is drawn as its own landing card with no name row to put it on; every other kind of page has it.
- **Long page names wrap under their circle rather than being cut off**, so a name is always readable in full.

## 2026-09-07 — Subpage index and Tag index become databases

### Additions

- **Your Subpage index and Tag index blocks are databases now.** Add Block looks exactly as it did — all four names are still there — but those two can be shown as a table, cards, a board or a list, using the control at the top of the block.
- **Nothing looks different until you change it.** A block you already have draws as a list, which is what it always was.
- **You can type into them.** The same cells you can edit in a page-level table are editable inside a block.
- **Manual links and Backlinks are untouched.** A hand-picked list and "pages that mention this one" aren't sets a database can describe, so they stay exactly as they are.
- **The block still decides which pages it's about.** The tag picker on a Tag index works as before; the layout is a separate question from which pages.

### Notes

- **A table inside the narrow sidebar is cramped** — three columns in that width means a lot of wrapping and some sideways scrolling. List and Cards suit the sidebar better; a block dragged into the page body has room for a table.
- **Filtering, sorting, grouping and column-hiding aren't on blocks yet.** Those five menus are still page-only; the layout switcher is what blocks have for now.
