# Changelog

## 2026-08-21 — meters

### Additions

- **Meters — a number drawn as a picture instead of typed as a fact.** How loyal someone is, how far along a war is, how many rations are left. Add Block has a **Meters** group with six of them, and they sit in the sidebar alongside your properties.
- **Four of them measure a proportion:** **Progress bar**, **Circle**, **Semi-circle** and **Gauge**. They read against 100 unless you say otherwise, so typing 75 gives you 75%. Give one a different maximum and it shows the pair instead — 3 of 8.
- **Two of them count whole things:** a **Rating** you click to set a level, and a **Token pool** you click to spend one at a time. Spell charges, favours owed, ammunition, stars out of five. Five to start with, up to twenty if you want them.
- **Clicking a rating's current level clears it**, so a star you didn't mean to click isn't permanent.
- **A meter wears the block's colour.** The swatches in its `⋯` menu are the ones every other block uses, so an influence meter can be purple and a wounded one red.
- **The shape is a setting, not a decision you're stuck with.** Click the shape's name above the meter and pick another one — the number you typed comes with it, and nothing has to be deleted and rebuilt.
- **Lowering a maximum doesn't throw the number away.** Drop a rating from ten stars to three and it shows three; put the ten back and the number you had is still there.
- **Rename a meter to whatever it measures** the same way you rename any block's heading — double-click it. A meter called Meter is just the name it arrives with.

## 2026-08-21 — the X really does close the app now

### Fixes

- **The window closes from every screen, not just from inside a project.** The app takes over closing the window so it can finish writing your last edit first — but it only did that while a project was open. Leave a project for the start screen, or refresh the page, and nothing was left holding the door: the X did nothing at all and the app had to be killed from the terminal. It's handled everywhere now.

## 2026-08-21 — deleting a property you added works again

### Fixes

- **A property you added to a page can be deleted again.** When the sidebar became blocks, removal moved into each block's `⋯` menu — but that menu only had **Remove block**, which takes a field off the panel and keeps what's in it. Nothing anywhere could actually delete a field you'd added, so one made by mistake could only be hidden. There's a **Delete property** beside it now.
- **The two are worded apart on purpose.** Remove block hides a field and keeps the value, and Add Block lists everything you've hidden so you can put it back. Delete property throws the value away and asks first if there's anything in it.
- **Any field can be deleted, including the ones a template gave the page.** A page made from a template is a copy, so its fields are yours. The difference is only what "gone" means, and the question you're asked says which: a field you invented can't be brought back, while one from the template can be added again empty from Add Block.

## 2026-08-21 — the X closes the app again

### Fixes

- **Closing the window works again, and keeps working.** The app holds the window open for a moment while it finishes writing whatever you last typed, then closes it itself. If that last step ever failed, the app quietly decided a close was already underway and refused every attempt after it — so the X did nothing, for the rest of the session, with nothing on screen to say why. A close that doesn't succeed can now simply be tried again, and there's a second way out if the first is refused.


## 2026-08-21 — open it anyway

### Additions

- **When Anamnesis says a project is open in another window, you can now overrule it.** An **Open it anyway** link sits next to the message. The check is a guess — a project says it's open by keeping a note fresh, so a crash, a power cut or a sync client holding the folder all look exactly like a second window from the outside, and the app has no way to tell them apart. It still says what it thinks, and now you get the last word. Renaming a project another window holds is still refused outright, because renaming a folder something else has open is a different kind of risk.

## 2026-08-21 — reloading no longer locks you out of your own project

### Fixes

- **Refreshing the app stopped shutting you out of the project you had open.** A project records that it's open so a second copy of Anamnesis can't save over the first — but the app worked out who it was fresh on every load, so after a refresh it found the note it had written seconds earlier, didn't recognise its own handwriting, and refused to let you back in until the note went stale a couple of minutes later. A window now remembers who it is across a refresh and takes its own project straight back. Two genuinely separate copies are still kept apart, exactly as before.

## 2026-08-21 — Tab picks what the [[ menu is showing

### Fixes

- **Tab in the `[[` menu takes the highlighted page**, the way finishing with `]]` already does and the way Tab works in any autocomplete. Before, nothing in the app claimed the key while that menu was open, so it fell through into the editor and rearranged the block you were writing in instead — which is the "it turns into a quote" you kept hitting. The same goes for the `/` menu and `@` mentions, which are the same menu underneath.
- **Tab can no longer reach the editor at all while one of those menus is open.** If the list has nothing in it, Tab now does nothing rather than doing something to your writing.


## 2026-08-21 — Tab stays inside dialogs too

### Fixes

- **Tab no longer walks out of a dialog into the page behind it.** Settings, Import, Export, All properties & tags, the picture picker, Save as template, Manage pins, the template picker and both confirm boxes all keep the cursor inside now, wrapping around at either end — and Tab from outside one steps into it rather than past it. The menus were fixed earlier the same day; dialogs are built separately and were missed, which is why it looked half-fixed.


## 2026-08-21 — menus answer the keyboard

### Fixes

- **Menus can be used from the keyboard now.** Opening one — a right-click menu, a block's `⋯`, Add Block, the colour swatches, a template or page picker — puts the cursor on its first item instead of leaving it behind on the page. **Up and Down** walk the list and wrap around at either end, **Tab** stays inside the menu rather than escaping into whatever is behind it, **Enter** picks, and **Escape** closes. Menus are drawn outside the page they belong to, which is why Tab used to sail straight past them into the rest of the window.
- **Closing a menu puts you back where you were.** Escape, or choosing something, returns the cursor to the button that opened it — so you can add three blocks in a row without reaching for the mouse between them. Clicking somewhere else instead leaves the cursor where you clicked, rather than snatching it back.

## 2026-08-21 — two pages with one name

### Fixes

- **Typing `[[name]]` no longer picks silently between two pages called the same thing.** Finishing a wikilink with `]]` confirms the top suggestion, which is the point of it — but when two pages share the exact name you typed, that was a coin flip, and the link landed on whichever one happened to sort first with nothing on screen saying a choice had been made. Now it holds the menu open with both of them on it and waits for you to pick. Everything else is unchanged: partial names, half-remembered spellings and one clear match all still confirm the moment you type the brackets.
- **A page whose name you typed exactly now wins over a longer one listed above it.** Typing `[[Val]]` reaches a page called Val, not Valera, even when Valera sorted first.


## 2026-08-21 — backlinks, and lists of pages

### Additions

- **Backlinks.** A block on any page that lists every other page pointing at it. A page counts whether it mentioned this one in its writing, named it in a field like Friends, or put it in a hand-made list — and each row says which, so a page in the list is never a mystery. Write `@ragatha` twice on one page and it's still one row.
- **Three more lists, and they're all the same block.** Add Block now offers **Backlinks**, **Subpage index** (the pages inside this one), **Tag index** (pages carrying tags you pick) and **Manual links** (a list you build yourself). They're one block with a source you can change afterwards, so a list you set up as subpages can become backlinks without deleting anything.
- **An empty list tells you why it's empty**, rather than just sitting there. A backlinks block with nothing in it says a backlink appears once another page mentions this one — which is the part that isn't obvious.
- **Aliases.** Give a page other names it answers to — Valera Jiang can be "Val". Then `[[Val]]` links straight to her, and searching "Val" finds her. The search result says **also Val** underneath, so you can see why a page you didn't name showed up.

### Adjustments

- **The link block became Manual links.** Any link block you already made turns into a Manual links list on its own, holding the page it pointed at. Nothing to redo — it just holds more than one page now.
- **`[[Name]]` finds pages by alias too.** A page actually called that name still wins; aliases are only used when nothing carries the name itself.


## 2026-08-21 — the sidebar is blocks now

### Additions

- **The right-hand panel is a canvas you arrange, not a fixed list of fields.** Everything in it is a block — the picture, your tags and every property alike — and you can add, remove, reorder and duplicate any of them. Drag a block by the grip that appears when you hover it, or use Move up / Move down in its `⋯` menu.
- **Every block has its own menu.** Rename its heading, turn the heading off entirely, give it a colour, duplicate it, move it, or remove it. Double-clicking a heading renames it too, and clearing the box puts the original name back.
- **A brand new page starts empty**, with nothing but an **Add Block** button — unless you made it from a template, in which case it starts with what that kind of page needs. Characters, species, locations and items begin with a picture; notes and blank pages begin with nothing.
- **Two new kinds of block: Text block and Link block.** A text block is somewhere to write beside the page rather than in it. A link block points at another page, follows it if you rename that page, and says so plainly if you delete it.
- **Removing a block never deletes what you typed.** Take a property's block off the panel and the value stays on the page — the field is just hidden. Add Block lists everything you've hidden, so you can put it back. Deleting a property for real is still its own thing.

### Adjustments

- **Your existing pages look exactly as they did.** Every page written before today works out its own layout the first time you open it — picture on top, your properties in the order you'd already dragged them into, tags at the bottom. Nothing is rewritten until you actually change something, so opening a world doesn't touch a single file.
- **Dragging properties into order is now dragging blocks into order.** Same gesture, except it can move the picture and the tags too, which it never could before.

## 2026-08-21

### Fixes

- **Your pinned projects are back to four across.** Making the whole start screen scroll put a scrollbar on the column, which took 8 pixels off the row above it — and at a 1280-wide window that row fitted *exactly* four cards with nothing to spare, so it dropped to three fat ones. The row now lets a card come in a shade under its ideal width rather than losing a whole card, and the space for the scrollbar is reserved whether or not it's showing, so the count can't change as you filter.


### Additions

- **Rename a project from inside the app.** It's on the `⋯` menu on any project, and it changes the name *and* the folder together, so the two can't drift apart. The box opens with the current name in it, selected, since most renames are a fix to part of a name rather than a whole new one. Nothing inside the project changes, and its pins, groups and archive state all follow it. If the folder can't be renamed — something else has it open, or your sync client is mid-copy — the name still changes and it tells you where the folder still is.

### Adjustments

- **The top bar and the page arrows stay put while you scroll.** Making the whole start screen scroll took New Project and the filter box off the screen as soon as you moved, and left the page arrows at the end of a list that can be a screen and a half long — so turning a page meant scrolling down to find them, and then doing it again, because turning a page puts you back at the top. Both are pinned now: the bar to the top, the arrows to the bottom. Nothing moved at rest; they only hold position once there's something to scroll.

## 2026-08-20

### Additions

- **Start a project from a template.** New in the start screen's rail, under Add a Project: a window listing the templates you have, with the folder tree each one would build shown beside it, and a name box at the bottom. One template ships with the app — Canon with Characters, Locations, Factions, Species and Events under it, each holding a blank page of that kind, plus an empty AUs folder and somewhere for worldbuilding notes.
- **Send somebody your project's shape.** Export as template on a project's `⋯` menu writes a small `.antpl` file wherever you point it — attach it to a message and whoever gets it opens it with Open a template file in that same window. **None of your writing goes in it.** It carries your folders (with their colours), what nests in what, and one blank page of each kind you keep in each folder — so a Characters folder holding forty characters becomes a Characters folder holding one blank Character. No page names, no prose, no properties, no pictures, and nothing hidden. The file is plain text, so you can open it in Notepad and read the folder list if you ever want to check.

- **Sort your projects into groups.** There's a row of chips under the start screen's heading now: All to begin with, and one for every group you make. Make a group from the `⋯` button on any project — New group, name it, and that project is in it — or from the New group chip at the end of the row. Filing a project is ticking a name in that same menu, and a project can be in as many groups as you like. Groups live in the app rather than as folders on your disk, so nothing moves and nothing is renamed: a group survives you moving the project or renaming its folder. Click a chip to see only what's in it, click All to come back. The chip that's on shows its name as the heading, so a short list never reads as projects having gone missing. Rename or remove a group from the `⋯` on the chip once you've selected it — removing a group keeps every project in it.
- **Archive the projects you're done with for now.** Archive on a project's `⋯` menu folds it away: out of the grid, out of the pinned row, out of its groups, without touching a single file on disk. An Archived chip appears at the end of the chip row while anything is in there, with everything you've folded away behind it and Bring back on each one. A pin is kept while a project is archived, so bringing it back puts it where it was rather than making you pin it again.
- **Jump straight to a page.** Under the projects on the start screen, and under the pictures in the sidebar and the picker, the page counter is a box you can type a number into — with arrows either side of it that go all the way to the front and all the way to the back. Enter takes you there, a number past the end lands on the last page, and Escape puts the box back if you change your mind. The pinned row at the top keeps its dots, since it's a handful of covers to flick through rather than a list you arrive at knowing where you're going.
- **New projects go in a Projects folder of their own.** Inside the folder you picked, beside `themes` and `snippets` rather than mixed in with them — so what's yours and what's the app's are no longer the same pile. **Nothing moves**: every project you already have stays exactly where it is, opens the same way, and still shows up on the start screen. The button at the foot of the start screen opens the new folder, and Settings → Projects still points at the folder holding all of it. "Projects", "themes" and "snippets" are no longer accepted as project names, since a project with one of those names could hide every project inside it.
- **Two copies of Anamnesis can't open the same project any more.** Both used to auto-open whatever you had open last, so launching the app twice quietly put two windows on the same files, each saving over the other. A project now says it's open while it is, so the second copy lands on the start screen instead, marks that project **Open**, and tells you when the other window was last active there if you click it anyway. If the app ever dies without cleaning up, the project frees itself a couple of minutes later — no file to delete by hand.
- **A copy says what it was copied from.** On the line under a project's name, beside where it lives on disk: a small fork mark and the name of the project it came from — whether you made the copy in the app or in File Explorer. Hover it for the whole sentence. It only appears when the original is still in your library, since naming a project that isn't there any more would say less than nothing.
- **A project you copied in File Explorer stops claiming to be the original.** The app gives every project a hidden identity of its own, and copying the folder copies that too — so two projects end up insisting they're the same one, which is how a pin or a group ends up on the wrong project. The start screen now spots that on its own: the copy is given an identity of its own and quietly records which project it was made from, and the one you've actually been working in keeps what it had. Nothing else about either project changes, and it only happens the once.
- **Duplicate a whole project**, from its `⋯` menu. It copies everything — pages, pictures, templates, the lot — into a folder beside the original, under whatever name you give it. The box opens with the original's name and "copy" on the end, selected, so typing replaces it. The copy is a project in its own right rather than a folder that looks like one: it gets an identity of its own, and it records which project it was forked from, so the app can tell the two apart no matter how they're named. Nothing about the original changes. If a folder of that name is already there it says so instead of quietly making a second one.
- **Show a project in File Explorer**, from its `⋯` menu. It opens the folder your project sits in with the project itself highlighted, rather than opening it — which is the version that's useful when you're about to copy it. It says Finder on a Mac and file manager on Linux, since that's what they're called there.
- **The `⋯` menu is on covers as well as rows now.** It sits beside the cover button in the corner of a cover, and carries the things that belong to the project rather than to its picture — its groups, and archiving it.
- **List view can set a cover now too.** A small `⋯` beside each row opens a menu with Set cover / Remove cover, the same two actions the grid's hover button already carries — a row's own thumbnail is too small for a button of its own, so it's reached through the menu instead.

### Adjustments

- **Twenty projects to a page, not eight.** A page used to hold exactly as many as fitted the window, which on a normal window was about eight — small enough that a page break stopped meaning anything. A page now holds a number you choose, and **Settings → Lists** has the choice: 20, 40, 60 or 100. It's one number for the projects on the start screen and the pictures in both grids. A page taller than your window scrolls, which is what you'd expect — that was never the same thing as a list with no end to it.
- **The whole start screen scrolls now, from anywhere on it.** The wheel only used to work with the pointer over the covers — on the heading, the New Project row or your pinned projects it did nothing, because only the grid was scrolling. Everything scrolls together, the way a page should. The page arrows sit at the end of the list rather than pinned to the bottom of the window.
- **Turning the page puts you back at the top of it.** Necessary now that a page can be taller than the window.
- **Covers and rows page the same way.** They used to break at different places, because a row is shorter so more of them fitted — switching between the two now keeps you on the same projects.

### Fixes

- **The slash menu offered "Quote" twice.** One made the Quote callout, the other made the editor library's own quote block — and now that they look identical there was nothing to tell them apart while typing. There's one Quote now, and it's ours.
- **Quotes on imported pages looked like nothing.** Every quote in a world brought over from LegendKeeper is a different kind of block from the Quote callout you get by typing `/quote`, and that kind had never been styled — so it arrived wearing the editor library's own default: thin grey bar, grey text, no fill, square corners, sitting right under a callout that has all four. They're drawn the same now, in the same colours from the same theme, so a quote looks like a quote wherever it came from.
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
