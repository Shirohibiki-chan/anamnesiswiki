# Changelog

## 2026-08-20

### Additions

- **Sort your projects into groups.** There's a row of chips under the start screen's heading now: All to begin with, and one for every group you make. Make a group from the `⋯` button on any project — New group, name it, and that project is in it — or from the New group chip at the end of the row. Filing a project is ticking a name in that same menu, and a project can be in as many groups as you like. Groups live in the app rather than as folders on your disk, so nothing moves and nothing is renamed: a group survives you moving the project or renaming its folder. Click a chip to see only what's in it, click All to come back. The chip that's on shows its name as the heading, so a short list never reads as projects having gone missing. Rename or remove a group from the `⋯` on the chip once you've selected it — removing a group keeps every project in it.
- **Archive the projects you're done with for now.** Archive on a project's `⋯` menu folds it away: out of the grid, out of the pinned row, out of its groups, without touching a single file on disk. An Archived chip appears at the end of the chip row while anything is in there, with everything you've folded away behind it and Bring back on each one. A pin is kept while a project is archived, so bringing it back puts it where it was rather than making you pin it again.
- **Duplicate a whole project**, from its `⋯` menu. It copies everything — pages, pictures, templates, the lot — into a folder beside the original, under whatever name you give it. The box opens with the original's name and "copy" on the end, selected, so typing replaces it. The copy is a project in its own right rather than a folder that looks like one: it gets an identity of its own, and it records which project it was forked from, so the app can tell the two apart no matter how they're named. Nothing about the original changes. If a folder of that name is already there it says so instead of quietly making a second one.
- **Show a project in File Explorer**, from its `⋯` menu. It opens the folder your project sits in with the project itself highlighted, rather than opening it — which is the version that's useful when you're about to copy it. It says Finder on a Mac and file manager on Linux, since that's what they're called there.
- **The `⋯` menu is on covers as well as rows now.** It sits beside the cover button in the corner of a cover, and carries the things that belong to the project rather than to its picture — its groups, and archiving it.
- **List view can set a cover now too.** A small `⋯` beside each row opens a menu with Set cover / Remove cover, the same two actions the grid's hover button already carries — a row's own thumbnail is too small for a button of its own, so it's reached through the menu instead.

### Fixes

- **Opening a project never actually landed on the page you were last on**, even though the tree remembered it — it always opened to "Select a page to begin" instead. Fixed.

### Adjustments

- **The number on a group's chip reads as a number now.** It was a tiny monospaced digit pressed right up against the group's name, which looked more like a typo in the name than a count of what's in it. It's the same size as the name now, with real space in front of it — and a group with nothing in it doesn't show a zero at all.
- **The start screen's rail had less room than it needed.** Recently Opened, Add a Project, and New Releases all sit a little less cramped now.
- **The rail's sections now stand apart from each other.** Twice the gap between Recently Opened, Add a Project and New Releases, with a little more air under each heading, so the three read as separate errands rather than one long list with rules through it. A folder on disk and Import sit a touch further apart too.
- **The pinned covers stopped cutting heads off.** They are taller than they were, and what is left of a portrait after the crop is now taken from above centre rather than the middle — so the part that survives is the part with the face in it, not the feet.

## 2026-08-19

### Additions

- **Keep the projects you actually use at the top.** There's a Pinned row across the top of the start screen now — tall covers with the picture fading up into the background instead of sitting in a box, as many across as the window has room for. Pinning and rearranging both happen in one window behind the Manage pins button: drag the rows into the order you want, and every project you haven't pinned sits underneath as covers, so putting one up there is one click. The row shows a dashed "Pin a project" tile even when nothing is pinned, so it doesn't hide until you already know about it. Nothing is capped — the row pages instead, and a page always holds whole covers rather than half of one.
- **Put the projects in whatever order you want.** There's a pill above the grid, next to the covers-or-rows buttons, that opens a short menu: newest first, oldest first, name A–Z, or name Z–A. Newest first is still what you get and still means whichever happened last — you opening a project, or it changing — so nothing moves unless you ask it to. Oldest first is the one for finding what you haven't touched in months. The app remembers your choice, and picking a new order takes you back to the first page rather than leaving you halfway down a list that just rearranged itself.
- **Every project shows where it lives on disk.** Under its name, on covers and in the list alike. Long paths lose their middle rather than their end, so the folder the project actually sits in is always the part you can still read — which is the part that tells two projects with the same name apart. Covers and rows are both a little taller to carry it.
- **The rail down the side of the start screen can be dragged.** Take hold of the line between it and the projects and pull: the covers get the room you don't give the rail, and the pinned row refits itself to whatever is left. It works the same way the sidebar inside a project does, down to double-clicking the line to put it back where it started, and the arrow keys if you'd rather not drag. Your width is remembered.
- **The rail now tells you what's new.** The three most recent versions, newest tagged **New**, at the bottom of the rail. Click one and it opens Settings straight to that version's patch notes rather than making you go find it.
- **Your projects folder has a button now**, at the very foot of the rail, above the cog. Click it and it opens straight into your file manager — the same thing Settings → Projects already let you find, just one click away instead of a trip through there.
- **Mute project covers**, in Settings → Theme. Desaturates every cover on the start screen — the colours the app makes up and any picture you set yourself alike. Off by default, and on automatically if your system already asks for higher contrast.
- **Set your own cover for a project.** Hover a cover in the grid and a small button appears in the corner — pick a picture from anywhere on disk, and it takes over from the generated colour everywhere that project's cover shows: the grid, the pinned row, the rail's Recently Opened, and the Manage pins window. The same button removes it and hands the project back its colour. Grid view only — a list row's thumbnail is too small for a button of its own, and list is already the view for someone who never sets a cover at all.
- **The Recently Opened list in the rail now names the page you were on**, under the project's own name, so you can see where you'll land before you click.

### Fixes

- **Closing the window sometimes did nothing.** Once anything needed saving on the way out, a rare failure in that path could leave the window unable to close for the rest of the session — no error, no explanation, the X just stopped working. It always finishes the close now, however the save on the way out goes.
- **One project no longer stretches across the whole screen in the list view.** A row put the name at the far left and the date at the far right, so making the window wider only put more nothing between them — about 2000 pixels of it with the window full screen. A row is now two lines: the name with its location under it, and the date beside them, centred. That lets a row be narrow enough for the list to make a second, third or fourth column of them as there's room, instead of stretching one across everything.
- **The pinned covers no longer stretch out of shape on a wide window.** The row was always four across, which is the right number at about the size the app opens at and wrong everywhere else: fullscreen on a wide monitor pulled four covers into long thin bands, and shrinking the window stood them on end and started cutting the names off. It now fits as many as the width has room for — eight across a fullscreen 2560 monitor, two on the narrowest window — and a cover keeps the same shape at every size, so a picture you put on one is always cropped the same way rather than losing its sides on one window and its top and bottom on another.

### Adjustments

- **The Elsewhere marker moved onto the line with the project's location.** It used to sit in the corner of a cover, over the picture. It says the same thing the path under the name says, so it now sits at the front of that line in both views — which also gave the date on a row its right-hand edge back, since the marker had been holding a column open on every row whether or not it was used.
- **Two controls now show which one you picked.** The covers-or-rows toggle drew its icon in exactly the colour of its own highlight, so the side you were on was the side you couldn't see; the sort menu had the same problem on the order it was set to. Both are the bright teal now.

## 2026-08-18

### Additions

- **The start screen is a library now.** Every project is a cover you can see rather than a line of text, laid out in a grid with the rail down the side holding the three you opened most recently and the ways to start something that isn't already there. A project with no picture gets a colour of its own, made from the project itself, so it looks the same every time you come back and two projects never look alike. "New project" is the one bright button, in the middle. There's a filter box at the top right: type a few letters of a name and the grid narrows, and words in any order work, so "val 3" finds Valeraverse3.
- **Covers or rows, whichever you prefer.** Two small buttons above the grid switch between them, and the app remembers which you picked. Thirty covers is a wall; thirty rows is a list.
- **Pages instead of endless scrolling, and it's a setting.** The project grid comes a page at a time by default, with arrows and dots underneath. A page is however much fits your window, so there are no half-empty rows and the next page is exactly one screenful away. If you'd rather have one long scroll, Settings → Lists switches it, and the switch covers every long list in the app rather than just this one.
- **Every project you have shows up on the start screen, not just the last eight.** The screen used to list the eight you had opened most recently, so a ninth was only reachable through "Open folder" — and a project you had never opened on this computer never appeared at all. The app looks in your projects folder now, including one folder deeper, so a project tidied into a subfolder still turns up. Newest first, going by whichever happened last: you opening it, or it changing. Nothing is trimmed off the end — the list is as long as it needs to be and the screen scrolls. A project living somewhere else, like another drive, sits in the same list with a small "Elsewhere" marker on it.
- **Opening a folder now looks inside it.** Unzipping a world usually gives you a folder with the real one nested inside — `Valeraverse` holding another `Valeraverse` — and picking the outer one used to tell you there was no project in it, which was true and no help at all. It opens the one inside now. If the folder holds several projects, it lists them and lets you pick, rather than guessing.
- **Start a new page from a template without going through the new-page screen.** Every row in the Templates tab has a page-with-a-plus button on hover — the built-in kinds and your own alike. The page arrives at the top of your tree with the template already poured into it, opens with its name ready to type, and the sidebar goes back to the Project tab so you can see where it landed. One press of undo takes the whole thing back.
- **Drag your own templates into the order you want them offered in.** A grip appears on the right of a template's row in the Templates tab when you hover it; drag it up or down and the new-page screen offers them in that order too, since both read the same list. Undoable. The built-in ones don't move — they're the app's own list and the same in every world.

### Adjustments

- **Your pictures come in pages too now.** The pages-or-scroll setting said it applied to every long list in the app, and it only ever reached the start screen. Both grids of pictures — the Assets tab in the sidebar, and the picker you get when you choose a picture for a page — now do what Settings → Lists says. A page is however many fit, so it re-flows when you drag the panel wider or change the text size. Set to one long scroll they behave exactly as they did before. The arrows in the sidebar count the pages instead of showing dots, because a row of dots doesn't fit a column that narrow.
- **The picture picker keeps one size.** It used to grow and shrink with however many pictures were in it, so it changed shape on every letter you typed into its search box. It's one height now, whatever you're looking at.
- **The main button has been rebuilt.** The one bright button — New Project, and the confirm button in every dialog — used to be a light teal with a gradient running across it and near-black text on top. It's now a deep teal lit from the top edge, with **white** text and a soft shine down the face of it. The colour comes from whatever theme you're on, so it's teal on Anamnesis Dark and Midnight, amber on Ember, and so on. The **delete** button in confirm dialogs got the same treatment in red, so the two stop looking like different generations of the app sitting next to each other. Four of the themes that shipped their own version of the old gradient no longer do — theirs were just their own colour said twice — but **Abyssal keeps its violet-to-cyan button**, deepened enough for the white text to hold up.
- **The start screen's section headings are Title Case, and bigger.** "Recently Opened", "Add a Project", "All Projects" — they're headings, and they were shipped looking like sentences at the size of ordinary text. They're 20px now, which is a size the app didn't previously have: it went straight from 18 to 28, and 16 sat too close to the writing around it to read as a heading at all. Everything else on the screen is untouched, and the text-size slider in Settings still moves them along with the rest.
- **The Import line in the rail says project, not world.** Everywhere else on that screen already did.

### Renames

- **"New project" is "New Project".** The one bright button on the start screen, now capitalised the same way as the headings around it.
- **"Start Something" is "Add a Project".** It was a mood rather than an errand, and neither thing under it starts anything from scratch — both point the app at a project that already exists, one as a folder and one as a `.lk` file, and both end with it sitting in the list on the left.
- **"Import from LegendKeeper" is just "Import".** It sits in the rail on the start screen and says what it takes — a `.lk` file — rather than naming somebody else's app. The dialog it opens is called "Import a project" for the same reason, and the note about pictures needing the internet no longer names the app they're coming from either. Export still says LegendKeeper, because that file is for that app.

### Fixes

- **The button that starts an import is a button now.** This is the actual reason importing a file did nothing most of the time: "Choose a file" had never been given the app's button styling, so it drew as a plain line of grey text — no fill, no edge, no padding, not even a hand cursor — about 180 pixels wide and 21 tall, sitting directly under a paragraph of the same colour. Hitting that exact line worked; anywhere else was a click on prose. It looks like every other button in the app now.
- **Choosing a file to import tells you what happened instead of doing nothing.** If the file picker failed to open, the button did nothing at all — no picker, no message, nothing to react to. The reason now appears in the dialog. While the picker is up, the dialog says so and points at the taskbar, because the picker is a Windows window that can open behind the app, and there was no way to tell that apart from a button that hadn't worked. Pressing the button again while it's open no longer asks for a second picker, which was its own way of ending up with none. The same treatment went on every other place that opens a file or folder picker: export, the projects folder in Settings, and opening a project from a folder.
- **The import picker will show you any file, not only ones ending in `.lk`.** It still offers `.lk` first, but an export that came out as `world.lk.zip`, or one whose extension Windows is hiding from you, is now selectable instead of invisible in a folder you can plainly see it in. If you pick something it can't read, it says so.
- **The folder dropdown grows a search box once you have eight folders or more.** Type a few letters and the list narrows to what matches; Enter takes the top one. Under eight it stays a plain list, because reading four rows is faster than typing at them. Escape closes the menu.
- **The folders in the Assets tab are a dropdown now.** One line saying which folder you're in, and the list opens over the pictures when you click it. It scrolls itself and doesn't push anything down, so fifty folders works as well as four — where the old block of folders would have been 26 rows deep and shown a fifth of itself at a time. Picking a folder closes it. Dragging a picture onto the line opens it so you can drop the picture into a folder, and renaming a folder turns that line into the name box.
- **Folders in the picture picker are tiles, several to a row.** They were rounded pills meant to sit side by side, and none of them ever did — a folder's name plus its count is wider than half the sidebar, so each one took a row to itself and four folders filled the panel. The tiles put the count under the name and line up in a grid. Long names cut off with a "…" and show in full when you hover.

## 2026-08-14

### Additions

- **Pictures you uploaded yourself can now go to LegendKeeper too.** The export dialog offers to carry them inside the file, and tells you how much bigger that makes it before you decide. Off by default, because a world full of photos turns a tiny file into a large one. Portraits, covers and pictures in the text all come along.
- **A picture that came from LegendKeeper can now go back to LegendKeeper.** Exporting a page with a picture in its text used to leave the picture behind and just keep the caption. If that picture arrived in an import, the app remembers the address it came from and hands it back, so the page comes out whole. Same for a picture you added by pasting a web address.
- Pictures you uploaded from your own computer still can't go into a `.lk` file — it stores addresses of pictures on LegendKeeper's servers, not the pictures themselves. The export summary still tells you when that happens.
- **Only worlds imported from now on get this.** A world imported before today didn't record where its pictures came from, so it would need re-importing to gain it.

### Fixes

- **The trashcan is on every picture, and it only affects the library.** It used to appear only on a picture nothing was using, which looked like a broken button rather than a rule. Now it takes the picture out of the Assets tab and leaves your pages completely alone — any page already showing it keeps showing it, exactly as before. Undoable.
- **Pictures you'd placed inside a page's text now come across when you import from LegendKeeper.** They used to vanish — not arrive broken, just not arrive, with the words closed up over the gap and nothing to tell you it had happened. They arrive as real pictures in your project's own `assets/` folder now, at roughly the size and alignment they had before. Your Valeraverse world has none of these, so it was never affected; the other export you sent has 27.
- **A picture, code block or callout tucked inside a bullet point survives the import too.** Only paragraphs and sub-lists were kept before; anything else in a bullet was thrown away silently. Things inside a bullet also stay in the order you wrote them, where sub-lists used to get shuffled to the bottom.
- **The import summary now mentions a picture it couldn't bring across.** If LegendKeeper's export doesn't store an address for one, the preview says so instead of leaving you to find the hole later.

## 2026-08-13

### Fixes

- **The language menu opens dark instead of white.** Picking a language meant a white list flashing up over a dark page, and the names on it were a muted grey that was hard to read at that size. The list is dark now, the names are the same colour as the code, and the language the block is currently set to is picked out in the accent colour so it's findable in a list of fifteen.
- **A code block no longer shows a blank space where its language should be.** Starting a block by typing three backticks lets you name the language after them — but any word that isn't one of the fifteen was kept as-is, and the corner of the block ended up empty. Those blocks say **Plain text** now, which is what they were already behaving as. Picking a real language from the list still works on them.
- **A picture folder no longer looks like it's in the list twice.** Opening one printed its name again just below its own highlighted button, which read as a duplicate folder rather than as a label for the rename and delete buttons beside it — especially with several folders called "New folder (2)", "New folder (3)". The name is gone; the highlighted button is what tells you which folder you're in.

### Adjustments

- **Earlier entries in this file were dated a day or two ahead of when the work actually happened.** Corrected — nothing about the changes themselves moved.

### Worth knowing

- **Three backticks and a space makes a code block**, the same as typing `/code`. It's always worked; nothing said so.

## 2026-08-12 — code blocks get a header, and a copy button

### Additions

- **A code block has a proper header bar now**, with the language on the left and a **Copy** button on the right. Copy takes everything in the block; the button says **Copied** for a moment so you know it worked.

### Fixes

- **The language picker no longer lights up when you're just moving the mouse over the block.** It was appearing as a grey rectangle sitting on top of your writing any time the pointer went near. It reacts to being pointed at itself now, and nothing else does.
- The picker no longer floats over the first line of code — it has its own strip to sit in.

## 2026-08-12 — code blocks

### Additions

- **A code block now looks like one.** Dark box, real border, monospaced text. Type `/code` on an empty line to make one.
- **Syntax colouring**, with a language picker in the block's top right corner. Fifteen languages: plain text, JSON, JSON with comments, YAML, regular expressions, Markdown, XML, HTML, CSS, JavaScript, TypeScript, Python, Shell, SQL and Lua.
- **Long lines wrap** instead of running off the right-hand edge where you can't read them.

### Fixes

- **A code block imported from LegendKeeper used to arrive empty.** The app didn't recognise the block and dropped everything inside it — not the formatting, the actual text. Fixed both ways: importing keeps the code, and exporting writes a real code block back out.

### Worth knowing

- **A code block existed before today** — it just had no colours, no border, no language picker and nothing pointing at it, so there was no reason to think it did. Anything you already put in one is still there and now looks like the rest.
- **Plain text is the default on purpose, and it's never coloured.** Bot prompts have no syntax, and the point of putting one in here is that `{{char}}`, `**asterisks**` and braces stay exactly the characters you typed. Nothing touches them.
- **Code blocks stay dark even if the rest of the app is light.** The colours the code is painted in aren't ours to choose, and they're built for a dark background.
- **If any page in your world came in from LegendKeeper with a code block on it, that page is still missing its code.** Re-importing just those pages would bring it back now.

## 2026-08-12 — pictures have names

### Additions

- **Pictures can be named, and the name sits on the picture** — across the bottom of the thumbnail, the way a file manager writes a filename under a thumbnail. Click it to change it. Enter or clicking away saves; Escape puts back what was there. Undo covers it.
- **A picture you add from your computer keeps the name of the file you picked.** "Valera sword.png" arrives called "Valera sword".
- A picture with no name shows a faint **Name this** while you're pointing at its tile, and nothing when you aren't.

### Adjustments

- **The file size under each picture is gone.**
- What's using a picture stays where it was, under the square.

### Worth knowing

- **Pictures you added before today have no name**, and there's no way to work one out — the app has only ever stored them under a generated id, and the name of the file you originally picked was never written down anywhere. You can name them yourself, and once named it sticks.
- **Naming a picture doesn't rename the file on disk.** It can't: every page showing that picture points at it by its filename, so renaming the file would mean rewriting every one of those pages, and a rewrite that stops halfway is a broken picture on a page you weren't looking at. The names live in their own small file next to the pictures. Losing it loses the names and nothing else.

## 2026-08-12 — the Assets tab reads down the middle

### Adjustments

- **Everything in the tab is centred now**, matching the two buttons at the top: the folder pills, the captions under each picture, and the messages the tab shows you.
- The picker dialog keeps its folder pills on the left. It's a wide box rather than a narrow column, and a row of pills floating in the middle of it reads as unfinished.

## 2026-08-12 — the Assets tab loses its count line

### Adjustments

- **"18 pictures · 1 used by nothing" is gone.** The total is already on the All pictures chip, and whether a picture is used is written under the picture — so it was a line repeating what's directly above and below it, and in a narrow sidebar it wrapped onto two lines to do it.

## 2026-08-12 — the Assets tab keeps its buttons where you left them

### Fixes

- **The top of the tab no longer scrolls away.** Adding a picture, the count, and the folder row were inside the same scrolling box as the pictures, so going looking through them took every control off the top of the panel. Only the pictures scroll now.
- **"Add picture" is a button that looks like a button.** It used to be a small icon at the end of the count line, and those icons are invisible until you hover them — which is fine for a control sitting next to the thing it acts on, and useless for the only way into a feature.
- **Making a folder has its own button next to it**, instead of being the last item in the row of folders. It used to sit immediately after a folder called "New folder", so the button that makes folders and a folder named after what it does looked like the same thing.
- **"Unsorted" only appears once you've filed something.** With nothing in folders yet it held every picture you have, so it was a second copy of "All pictures" wearing a different name and the same number.
- **The folder row is hidden until you have a folder.** One chip saying "All pictures" above all your pictures wasn't telling you anything.

## 2026-08-12 — more room to drop a picture on a page

### Fixes

- **The bottom of a page refused pictures.** Dragging one down towards the end of your writing turned the cursor into the no-entry symbol before you got near the bottom of the window — the last 32 pixels are the page's margin, and only the writing itself was accepting drops. That band is the natural place to aim when you mean "put it after everything", so it was the worst possible strip to have switched off.
- **The whole page column takes a drop now**, top to bottom: the margin under your writing, the empty space beside it, the title, and the tab strip.
- **A drop that doesn't land on a line goes next to the nearest line above it**, instead of always going to the very end. Dropping beside the third paragraph of a long page used to send the picture to the bottom, out of sight the moment it arrived.
- **Dropping above your writing** — on the title or the tabs — puts the picture at the top of the page rather than at the end.

### Worth knowing

- The banner still doesn't take a drop. Dropping a picture on a banner looks like it should *become* the banner, and quietly sliding it into your writing instead would be worse than not accepting it.

## 2026-08-12 — clicking a page opens that page again

### Fixes

- **A template stayed on screen after you'd gone back to your project.** Open a template, switch back to the Project tab, click a page — and nothing happened. The sidebar highlighted the page you clicked and the properties panel on the right filled in with its details, but the middle of the window carried on showing the template, so the app looked like it was ignoring you.
- **Going anywhere now closes an open template**: clicking a page in the tree, following a link inside your writing, a search result, a bookmark, and the back, forward and home buttons. Switching back to the Project tab closes it too, so the sidebar and the page you're reading never disagree about where you are.

### Worth knowing

- Switching to the **Assets** tab deliberately leaves a template open. That tab is somewhere you go to fetch a picture for whatever you're working on, and a template can hold pictures like any other page.
- Nothing you'd written into the template is affected — templates save as you type. Reopening one is a click in the Templates tab.

## 2026-08-12 — folders in the picture library

### Additions

- **Folders, in the Assets tab and in the picker.** Make one with the folder button, name it, and drag pictures onto its name to file them. Clicking a folder shows just what's in it; **All pictures** and **Unsorted** are always there beside your own. Adding a picture while a folder is open puts it straight in that folder.
- **The picker has the same folders**, so choosing a portrait can start from "the map ones" rather than from everything you've ever uploaded.
- **Rename and delete a folder** with the two buttons that appear under the row when you've opened one.

### Worth knowing

- **A folder is a label, not a place.** Your pictures all stay in one `assets/` folder on disk and nothing moves when you file one — which is what makes moving a picture between folders safe. If it worked the other way, every page showing that picture would have to be rewritten to point at its new home, and a rewrite that stops halfway is a broken picture.
- **Deleting a folder never deletes a picture.** Everything in it goes back to Unsorted, and the delete is undoable anyway.
- Pictures can only be dragged into folders from the Assets tab. The picker is open because something's waiting on an answer, so it lets you make and rename folders but not reorganise the library.

## 2026-08-12 — the Assets tab does things

### Additions

- **An add-a-picture button, right there in the tab.** Pictures used to only get into the project at the moment you wanted one somewhere — as a portrait, a cover, or in a page. Now you can put one in the library first and decide where it goes later. The button is in the tab's header and stays there when the tab is empty, which is when you most need it.
- **Drag a picture from the tab onto a page.** It drops in after whatever you're pointing at, or at the end if you let go below your writing. It points at the file that's already there rather than making a second copy, so one map on six pages is still one file.

### Worth knowing

- Clicking a picture still opens it full size rather than dropping it into your page. Dragging is the version of that gesture you can't do by accident, which is why it's the one that edits your writing.
- A picture that won't load can't be dragged — the page would just get an empty box, and you'd have to come back here to work out why.

## 2026-08-12 — the Assets tab stops calling pictures unused when they aren't

### Fixes

- **Portraits and covers that are plainly in use were being listed as "used by nothing".** The pictures were never the problem. A page can end up with two files on disk claiming to be the same page — it happens when a page changes shape in your folder, usually because it gained something inside it or you gave it a different template, and the file didn't get carried across. The app can only keep one of the two, and the one it dropped took its portrait and cover out of the count with it. Which mattered more than the wrong number, because those pictures were then sitting under a delete button.
- **Opening a project now spots that and repairs it.** The version with your most recent work is the one kept. The older file is renamed with `.old-copy` on the end and left next to it in your project folder, so nothing is thrown away, and you get told which page it was.
- **And saving no longer leaves one behind in the first place** — a page written into its own folder now clears out its own leftover copy beside it.
- **The delete buttons in the Assets tab switch off when a page won't open.** "Nothing is using this" is a claim about every page you have, so one page the app can't read makes it a guess — and that's not something to hang a delete on. The tab says so instead of quietly guessing.
- **The trashcan no longer vanishes when you delete a picture.** It used to only appear while your mouse was over a tile, and deleting one shuffles the rest, so the button would disappear from tiles the pointer was still sitting on. It's just always there now, on the pictures nothing is using.
- **A deleted picture actually leaves the tab.** The list was being re-read a moment before the delete finished, so the picture you'd just removed drew itself straight back in and stayed until you left the tab.

## 2026-08-12 — the library reaches pictures in a page, and the Assets tab does something

### Additions

- **Pictures inside a page can come from your library now.** Add a picture block and it opens on **Library** — everything the world already has — with Upload and the paste-a-web-address option still there beside it. Putting the same map on six pages is one file, the same as portraits and covers.
- **Clicking a thumbnail in the Assets tab opens it full size**, in the same viewer you get double-clicking a picture in a page. Until now the tab was the one place you could see all your pictures and not actually look at any of them.

### Worth knowing

- Clicking a thumbnail deliberately doesn't drop it into whatever page you're on. They're small and there are a lot of them, and the gesture for "what is this one" shouldn't be the one that edits your writing. The picture block's Library tab is where you've already said where it goes.
- Dragging a picture from the tab onto a page isn't in yet.

## 2026-08-12 — a picture library

### Additions

- **Every place that takes a picture now offers the ones you already have.** Click a page's portrait or its cover and you get your library — every picture in the world, with what's using each one — instead of straight to a file browser. Adding one from your computer is a button inside it, so it's still one click away.
- **Using the same picture twice stops making a second copy of it.** One map on six pages is one file now. Change your mind about the map and you're replacing one thing, not hunting six.
- **Search by what a picture's used for** — type a page's name and you get its pictures. Filenames here are gibberish by design, so searching them was never going to help.
- **"Set as cover" stopped duplicating the picture too.** It now points at the same file as the portrait instead of writing a second copy of it.

### Fixes

- **Replacing a page's picture no longer leaves the old one's web address attached to the new one.** Only affected pages imported from LegendKeeper, and only showed up on export — where the wrong address would have gone out with the new picture.

### Worth knowing

- Deleting a picture from one page won't remove the file while another page is still using it. That's the point of sharing, but it does mean the Assets tab is the place to go when you actually want a picture gone.
- Unsplash and Pinterest, which LegendKeeper offers alongside your own files, aren't here and aren't planned. Both would mean the app talking to someone else's server.

## 2026-08-12 — the Assets tab is a grid

### Adjustments

- **The Assets tab shows your pictures as a grid of thumbnails**, not a single column of little ones. Two across normally, three when you widen the sidebar, and the thumbnails grow as you widen it rather than staying small and multiplying.
- **The pictures are big enough to recognise now** — from 44px to between 77px and 129px depending on how wide you've pulled the sidebar. What a picture is called is a UUID and no help to anyone, so being able to see it is the whole point.
- What's using it still sits under each one, and the delete button moved onto the picture's corner.

## 2026-08-12 — the Assets tab

### Additions

- **The Assets tab works.** Every picture in the project, with a thumbnail, how big it is, and what's actually using it — "3 pages · 1 template", or "Not used anywhere". Until now nothing in the app could even see that folder, so a portrait you replaced six times left five files you had no way of finding.
- **Pictures nothing is using come first**, because those are the ones you can do something about.
- **Delete a picture nothing is using**, with a check first and undo after — the file itself comes back, not just a reference to it.
- Hovering a row tells you which pages by name.

### Worth knowing

- **A picture that *is* being used has no delete button yet.** That's on purpose: deleting one would leave the page pointing at a file that's gone and showing an empty box, with nothing to say why. **Remove from every page** — which clears it off everything at once and makes it deletable — is the next piece.
- Pictures used only by a template count as in use. A template and the page it came from can genuinely share a picture, and deleting it would empty the template.
- Pictures inside hidden tabs count too, and so do ones tucked inside a bullet list.

---

Older entries: [docs/changelog-archive.md](docs/changelog-archive.md).
