# Changelog

## 2026-09-13 — A big world's graph can be read

### Fixes

- **A big graph no longer stutters when you pan, zoom or point at it.** The whole layout was being worked out again from scratch on every mouse move — on eight hundred pages that was three-quarters of a second per pixel, and on a small graph a few milliseconds nobody noticed. Measured on an 831-page world: a pan step went from 770ms to 5ms, a hover from 1.7s to 11ms. The picture is also built once and only moved now, so pointing at a page redraws the dozen things it touches rather than the lot.

- **The controls above a graph, an expanded board, an expanded storyline and a picture's lightbox can be clicked along their whole height.** Each of those covers the window's own title bar, and the strip you drag the window by was still catching clicks through them — so the top half of every button dragged the window and the dropdowns, being short, hardly opened at all.
- **Dragging the graph's background actually pans it.** Each page's clickable area was far wider than its disc — room for a name that wasn't even showing — so on a packed graph most "empty" space was invisible button, and a drag grabbed a page instead. The clickable area is the disc and the name now; and a drag no longer paints every name it crosses as selected text.
- **Panning and zooming a big graph is smooth at every zoom.** The lines are painted on a canvas and, while you're dragging or wheeling, the picture is slid and scaled as it is and painted again crisp when your hand stops. Measured on an 831-page world zoomed all the way in: a drag went from 98ms a frame (with hitches over half a second) to 17ms, which is as fast as the screen refreshes. Your themes still colour the lines.
- **The page under the pointer is a solid disc.** Its hover tint was see-through, so the lines ran through it.
- **A big graph can be zoomed all the way in.** The wheel used to stop at two and a half times the starting size, and on a world of hundreds of pages the starting size is tiny — so it stopped right where the names had just appeared.

### Changes

- **The lines on a big graph step back.** Past a couple of hundred lines they fade in proportion to how many there are, so a world of hundreds of pages drawn all at once shows its pages rather than one solid mesh. A page's own graph, with a handful of lines, looks the same as before.
- **Point at a page and its connections light up.** Its own lines come up to full weight on top of everything else, so what one page is connected to can be seen on a graph of eight hundred. Click it and the rest of the graph steps back to half strength for as long as it stays selected; it's the click that dims, not the pointer, so a picture that dense doesn't flicker as you move across it.
- **The card about a clicked page has a close button.** Clicking empty background still puts it away too, but nobody would guess that.
- **A third *Lines* setting, *Only when pointed at*.** No lines are drawn until a page is pointed at, which on a very big world is the quietest picture there is. *Names when pointed at* is still the default.
- **The name on a line is held back at the same zoom a page's name is.** Pointing at a page while zoomed far out used to write the reasons on its lines at a size that drew as short grey dashes.

## 2026-09-13 — Board, a whiteboard page

### Additions

- **Board, a new template.** Pick it for a new page and the page's body is a whiteboard: rectangles, circles, arrows, freehand lines, text, pictures, in the hand-drawn style — drawn wherever you put them, with the drawing tool's own colours, stroke styles and undo. Expand fills the window; the same button shrinks it back. The drawing is saved on its own inside the page's folder as `_board.json`, the way a storyline's canvas is, so drawing on a board is never an edit to the page.
- **Everything the board needs is inside the app.** The drawing's fonts ship with it and load off your disk, so a board works with no internet.

### Notes

- **This is a first cut — the spike that answers "does a real whiteboard library fit in a page here", and it does.** It is drawn by Excalidraw, which is MIT-licensed like the app. What it deliberately does not do yet: a picture dropped on a board is kept inside `_board.json` rather than in the world's picture library; a shape can't link to a page; a board doesn't appear in the Markdown, website or LegendKeeper exports; and the board's light/dark look is read from your theme when the page opens, not while it's open. The follow-ups are listed in `docs/ideas.md` § Canvas / board / whiteboard.
- **It is the storyline's sibling, not its replacement.** A storyline knows its cards are pages and its arrows are the order of events; a board knows nothing about the world, and that's what it's for.

## 2026-09-13 — a Dashboard template, and the snippet that dresses it

### Additions

- **Dashboard, a new template.** Pick it for a new page and the page arrives built: a Quick capture box across the top, Recently edited and Shortcuts side by side, a *Jump to* row of links you fill in, and a line under it all to write on. Everything on it is an ordinary block — retitle, recolour, drag, or take any of it out — and the page is an ordinary page, so it can be your project home, hold the thoughts it captures, or be saved as a template of your own. It's in the Templates panel like the rest, so this world's copy can be edited and *Put back to the original*.
- **`dashboard.css`, written into your snippets folder once and switched on.** It's what makes a Dashboard page look like one — cards, small-caps headings, rows that light up — and it's a plain file: open it, change it, switch it off in Settings → Snippets, or delete it, and the app won't put it back. It reaches a page through `data-template="dashboard"` and through the style name `dashboard`, so it's also the worked example of both halves of the style-name feature: name any page *dashboard* and it gets the same look.

### Notes

- **This closes Phase 30.** The dashboard proves the four parts meet: the capture box, the per-page style name, the two home-page blocks, and a template that ships with blocks already in its body — the first template to.
- **The snippet is written once, on the first scan after updating.** If you already have a `dashboard.css` of your own, yours is left alone.

## 2026-09-13 — Recently edited and Shortcuts, two blocks for a home page

### Additions

- **Recently edited.** *Add Block ▸ Recently edited*, or `/recent` in the writing: the pages you touched last, newest first. Writing in a page moves it to the top. It never lists the page it sits on — a home page is edited every time its dashboard is rearranged, and a list that opened with *Home* would never say anything — and it leaves universes out for the same reason. Its menu has a *How many* row: 5, 8, 12 or 20.
- **Shortcuts.** *Add Block ▸ Shortcuts*, or `/shortcuts`: the pages you've *Set as shortcut*, in the rail's order. It's the rail's own list drawn as a block, so the two can't disagree — set a shortcut and it's in both; remove it and it's gone from both.
- **Both are the same collection block as Manual links, Subpage index, Tag index and Backlinks**, so they get the same menu, colour, title and drag as the rest, can sit in the page body or an infobox, and both switch to any of the other sources from *Where these come from*.

### Notes

- **They export.** A Recently edited or Shortcuts block writes the same list it shows into a Markdown export or a published website, because the sidebar and the exports now share one resolver for every collection source — an internal tidy-up, nothing visible on the older four.
- **This is step 3 of Phase 30.** Left in the phase: one example dashboard, shipped as a page template with a snippet beside it.

## 2026-09-13 — a style name, so a snippet can skin one page

### Additions

- **Style name, on a page's right-click menu.** Give a page a short name — *Zen Home* saves as `zen-home` and the menu says so — and it lands on that page as `data-style="zen-home"`. A snippet in your snippets folder that starts `[data-style="zen-home"]` now reaches that page and no other. That's the gap between themes and the dashboards in the Obsidian gallery: a theme is the whole app, a skin is one page, and the name is how a stylesheet tells them apart. Names already used anywhere in the world are offered under the box so you pick rather than retype; *Clear* takes it off again.
- **A template can carry one too.** Open a template from the Templates panel and there's a *Style name* chip beside its kind. Every page of that template picks the name up — every Character gets the character-sheet skin — unless the page names its own, which wins. A template with a style name counts as edited, so *Put back to the original* is offered for it. Saving a page as a template keeps its name, and a page made from that template starts with it.
- **Every page also says what kind it is** — `data-template="character"`, `data-template="location"` and so on, on the same root — so a snippet can say "all my locations" without anyone naming a style first. A folder shown as a folder carries both hooks as well, and so does a template while you're editing it, so you can see a skin land while you write it.
- **It travels with a Markdown export** as `style:` in the front matter, and an imported note carrying one gets it back, normalised the same way.

### Notes

- **Only the page's *own* name is exported**, never the one it inherits from its template — that belongs to the template, and writing it into every page would turn an inheritance into a hundred copies on the way back in.
- **Names are lowercase letters, digits and hyphens**, and anything else is dropped rather than kept: a colon or a space in a name is a snippet that silently matches nothing, and "my styles don't work" is a worse day than "it saved as zen-home".
- **This is step 2 of Phase 30.** Next are the two blocks a home page is missing: Recently edited and Pinned.

## 2026-09-13 — capture a thought from anywhere

### Additions

- **Quick capture from anywhere.** Ctrl+Shift+N — one step out from New page, the way All properties sits one step out from Search — opens the capture box over whatever you're doing, and it's on the search palette's footer too. It's the same box as the one on your page, not a second one: the dialog names whose it is (*The box on your home page*, or the page it found one on), files under the same destinations, remembers the same last one, and reads the same code words. Type, capture, Escape, and you're back where you were. The shortcut can be rebound in Settings → Keyboard like every other.
- **It reaches for the home page's box first**, then the first box anywhere in the world — so a world that keeps its box on a `Quick capture` page rather than on home works just as well. A world with no box yet is told so, and if it has a home page, offered a button that puts one there.

### Notes

- **This finishes step 1 of Phase 30.** Next is a style class per page, so a snippet can skin one page.

## 2026-09-13 — a box that files a thought where it belongs

### Additions

- **Quick capture, a new block.** *Add Block ▸ Quick capture*, or `/quick capture` in the writing. Type a thought into the box, press *Capture*, and it becomes a page under the destination the block shows — while you stay on the page you were on. The line under the box says what it was saved as and where, and both are links. Ctrl+Enter captures too; plain Enter is a new line, because a thought is allowed to be more than one.
- **Destinations are pages.** The block files under its own page and the pages directly inside it — a `Quick capture` page with `Magic`, `Story` and `Characters` under it is the whole setup, and *Destinations are pages under…* at the foot of the block points it at a different page if the box lives somewhere else, like a home page. The picker is a box you type into rather than a dropdown: the whole list until you type, narrowing as you do, Enter takes the top match. It offers wherever the last capture went.
- **Code words.** Start the text with a destination's name and a dash — `magic - i love witches!` — and the block picks that destination on its own and drops the word from the title. The control says *code word* while that's in effect, so nothing is routed quietly. A word that matches nothing changes nothing: the text is kept whole and goes where the picker says, so a typo turns up in a page's title where you can see it rather than in a bin.
- **A captured page is a plain page.** Its name is the first line you typed and the rest is its writing, one paragraph per line. It carries a *Captured* field with the date and time in a form that sorts, so a Subpage index under the destination can show newest first. It skips the "what kind of page is this?" grid — it was made to hold three lines, not to be a Character yet — and *Add Block ▸ Apply a template* is still there when it grows up.

### Notes

- **This is the first piece of Phase 30**, Home Dashboards & Quick Capture. Next is the same box opening from anywhere, by shortcut and from the search palette.

## 2026-09-10 — publish a world as a website

### Additions

- **Publish a world as a website.** *Export ▸ As a website*, on the project row or on any page's row, writes a folder of web pages: one page each, in folders that mirror your tree, with the whole tree down the left side, a search box, and pictures copied in. Anyone with the link can read it in a browser without installing anything. The done panel names three free places to put the folder — Netlify, Cloudflare Pages, GitHub Pages — and *Open in browser* shows you the site from your own disk first, which is a fair preview of what a reader gets.
- **It looks the way your world looks here.** The colours are read off whatever theme you have on, and the theme's typefaces come along as files, so the site reads in the same type on every machine rather than falling back to Times. Callouts keep their colour and icon, meters are drawn as bars (or stars and tokens), a page shown as a database is a table with its columns, columns stay side by side, toggles open and close, and a contents block lists the headings on its tab.
- **Hidden means not published.** A hidden page and everything under it stays off the site; a hidden tab stays off its page; a Secret callout is left out of the writing and out of the search index. There is no toggle for any of them — the one thing a reader must never see is the thing you marked private — and the modal counts each kind before you save, so a world you thought had secrets in it that reports none is something you catch before uploading. A link to a hidden page becomes plain words rather than a dead link.
- **Tabs are tabs, and the site works with scripts off.** A page with several tabs gets a tab strip; without JavaScript the tabs run down the page under their own headings, the tree is the browser's own collapsible list, and every link is a real link. Search and tab-switching are what the script adds.
- **Publishing from a page's row publishes that page and everything under it**, the same as the other exports — so "just this part of the world" is a right-click away, and the rest of the tree isn't in the sidebar.

### Notes

- **What changes on the way**, and the modal says so: a round meter (circle, gauge, pie) becomes a bar, and a database in cards or a board becomes a table. Nothing is lost; it just doesn't move. Graphs and storyline canvases aren't drawn — a storyline's scenes are still there as pages under it.
- **Every publish writes a new folder** — `Your World website`, then `(2)`, `(3)` — rather than overwriting, the same rule as the Markdown export. Upload the newest one in place of the last.
- **This finishes Phase 1.5**, the oldest unstarted phase on the plan.

### Changes

- **The Character template's Secret prompt now says what a Secret does.** It used to say a Secret marks the passage and doesn't lock it, which was the whole truth until today; now it also says that a published website leaves it out.

## 2026-09-10 — bring in a folder of notes

### Additions

- **Import a folder of Markdown notes as a new world.** *Import* on the start screen now has *Choose a folder* beside *Choose a file*. Point it at an Obsidian vault, or any folder of `.md` and `.txt` files, and it comes in as a world: a note beside a folder of the same name is one page holding pages, a folder with no such note is a folder page, and everything else is a page where its file was.
- **Or drop it on the window.** A folder, a zip or a single note dragged onto the start screen imports straight away, with no picker. A hint appears at the bottom while you're dragging so you know it's a target. (Inside an open world a dropped picture still means a picture, so that's the one place this doesn't apply.)
- **Zips and single files too.** A `.zip` of a vault unpacks in memory and imports the same way; a lone `.md` or `.txt` becomes a world of one page. The file picker lists everything importable together, and the app reads the file's first bytes rather than trusting its name, so a `.lk` that arrived as `world.lk.zip` still opens as what it is.
- **What it reads.** Headings, paragraphs, bold, italic, strike, underline, code, bullet and numbered lists, task lists, tables, dividers, pictures with captions, links, `[[wikilinks]]` (by note name, by path when names collide, and by alias), Obsidian's `> [!info]` callouts, and `> [!note]-` collapsed sections as toggles. Front matter becomes the page's fields: `title`, `tags`, `aliases`, `template`, `hidden`, a portrait and a banner, and every other key becomes a property — filling a template's own field when the label matches, and a property of its own otherwise.
- **The round trip closes.** A world exported as Markdown (Phase 28) comes back as the same tree with the same tabs, pictures, links and properties. The export now writes the tab names into each note's front matter so the split back into tabs is read rather than guessed — a page whose own writing starts with a `##` heading is no longer ambiguous.
- **Pictures are copied in.** Every picture the notes refer to — relative paths, `![[picture.png]]` embeds, portraits and banners named in front matter — is copied into the new world's `assets/` once, however many pages use it, and every reference points at the copy. Web addresses stay as they are.
- **The preview says what changed.** Links to pages that aren't in the folder became plain text; pictures it couldn't find; a picture in the middle of a sentence (kept as its words); callouts of a kind that doesn't exist here (they come in as Info); Details sections from the export (meters and index lists come back as the plain writing they were exported as, not as live blocks); property values that weren't one of the field's choices.

### Notes

- **Universes come back as folders.** The export gives a universe a folder and no note, and a folder is what that reads as on the way back. Everything inside it is intact; it's a folder page at the top of the tree rather than an entry in the switcher.
- **Pages come back in name order.** A folder of files has no memory of how the tree was arranged; the pages sort by name, numbers counted properly, and you drag them where you want them.
- **A warning callout comes in as a Secret.** That's the word the export uses for one — the one thing a reader has to know about a Secret is that it wasn't meant for them — so it's the word the import reads. An Obsidian user's own warnings come in the same way; a Secret is a callout like the others, only kept out of anything published.
- **A JSON export is refused with directions**, not read: that zip is your project folder as it sits on disk, and the way to bring one back is to unzip it into your projects folder.
- **This finishes Phase 20.** Text & Markdown, Obsidian, folder and zip were one importer wearing four hats, and it's built once.

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
