# Changelog

## 2026-08-26 — a button you couldn't click

### Fixes

- **The button that shows and hides the properties panel couldn't be clicked on a narrow window.** Drag Anamnesis as narrow as it goes and the row of controls along the top ran out of room, so the last one slid underneath the properties panel itself and stopped responding — the button that would have given you the room back was the one you couldn't reach. The row now shortens the Search button to its icon when it's short of space, which frees more than enough; the keyboard shortcut it used to display is on the button's tooltip. Nothing changes at a comfortable window size.
- **This also happens when you drag the panels rather than the window.** The top row is only as wide as the space between the two side panels, so widening those squeezes it exactly the same way — the fix follows the room the row actually has, not the size of the screen, so it holds either way.

## 2026-08-26 — starting up on Linux

### Additions

- **A Test Anamnesis shortcut, beside the other launchers.** Double-click it and the app is built, opened, and driven through a set of checks on a made-up world — pages opened by name, a world too big to see all of, and the awkward names that a filesystem can't store as typed. Windows flash open and shut while it runs; that's the checking, not a fault. **It can't touch your worlds**: every one it opens is invented in a temporary folder and deleted afterwards. Takes about half a minute.
- **Those checks now measure the layout too.** On every screen they open, they look for text cut off with no way to read the rest, anything sticking out past the window, a control with something on top of it, and buttons too small to hit comfortably. Each screen is checked at two window sizes, including the narrowest the app can be dragged to, because that's where this kind of thing hides. What each screen has today is written down, so nothing can quietly get worse.

### Fixes

- **Anamnesis wouldn't start at all on Linux when run from its own source code.** The window simply never appeared, and nothing said why — nothing on screen, nothing in the black console window. The part of the app that checks for updates was being built the instant the app loaded, and on Linux it refused a version number it didn't recognise, which stopped everything before the window was ever made. It's now built at the moment something actually asks about updates, which is the only time it's needed. Windows was never affected by this.
- **A freshly-copied project couldn't run or package the app either.** Setting one up was skipping the step that fetches Electron itself, so there was nothing for the app to run inside — which the "latest code" launchers need. Anyone starting from a clean copy hit it: a second machine, or somebody else's.
- **The three workflows that build your downloads were running an older package manager than the rest of the project.** That version does not understand the setting which tells it to fetch Electron, so it skipped it without saying so — the same gap fixed above for the everyday checks. A full test build of Windows, macOS and Linux passes on the newer one. Whether the older one would have produced a bad download was never established, and now does not need to be.

## 2026-08-26 — a steadier tree

### Additions

- **A Privacy section in Settings, with a switch for usage reporting.** Anamnesis can report which of its features get used — that a page was made, which template it used, which version and operating system it is running on — so the time spent on the app goes to the parts that actually get opened. **Nothing you write is ever part of that**: no page titles, no world names, no tags, no text from the editor, no file paths, and your worlds stay on your own disk exactly as they always have. The section lists everything it covers in full.
- **You get a one-time note about it before anything is ever sent**, with the choice to say no right there. That goes for an installation you have been running for months as well as a fresh one — nobody starts being counted without being told first. Turning it off in Settings stops it there and then; nothing is stored up to be sent later.

### Fixes

- **A folder that already holds pages no longer tells you it's empty.** Opening one showed "Folders hold other pages. Add one to get started." whether it held nothing or two hundred pages. That line is now only there when the folder really is empty. The "Add a page" button stays on both — it's still the quickest way to make a page inside the folder you're looking at.
- **The page tree no longer flickers while you scroll it.** On a big world, the strip you were scrolling into went blank for a moment before the pages appeared in it — going up and going down both, and on every frame of the scroll rather than now and then. The tree now draws about a screenful of pages beyond what you can see, so whatever you scroll into is already drawn. Measured on a 480-row tree: an empty strip on all 25 frames of an ordinary scroll before, none after.

## 2026-08-25 — spectrum meters

### Additions

- **A Spectrum: a meter that is a position between two words rather than a number.** `nonchalant ——●—— emotional`. Add Block → Meters has it under Progress bar, and it works the way every other meter does — drag the marker, or use the arrow keys — except that it prints no number anywhere. Type the two words straight into the ends underneath it; the reading's own name sits above, so one block can hold several axes with their own names.
- **A new spectrum starts in the middle**, ready to be dragged, rather than jammed against the first word.
- **Each one sits on its own card**, so a block holding three of them reads as three things rather than nine rows of words.

### Fixes

- **On Linux, a spectrum's wrapping words could show one line and hide the rest.** Older Linux systems ship a browser engine that can't grow a text box to fit what's in it, which is what the wrapping relies on. The app now measures and grows those boxes itself where that's missing, so they look the same on every machine.
- **An empty spectrum's Name box was as wide as the card**, with the × for removing the meter sitting on top of it. The box is the width of what's in it now — a short box when it's empty, growing only as you type — and it stops short of the corner the × lives in.
- **A long word at either end of a spectrum was cut short with no way to read the rest of it** — the only way to see the whole thing was to drag the sidebar wider. The end words now wrap onto as many lines as they need and the card grows to fit, so nothing is hidden at any panel width. The reading's name above them does the same. Long words with no space in them break across lines rather than running off the edge.

### Worth knowing

- **It's the same reading underneath as a progress bar.** Switch a spectrum to a bar and the number is there — where the marker sat, out of a hundred. Switch it back and the two end words are still there too; nothing is thrown away by changing shape.
- **Show text still hides the reading's name**, the way it does on every other shape. The two words at the ends aren't the name, so they stay. **Show max isn't offered on a spectrum**, since there's no number for it to hide.
- **Segmented** ticks the line into notches to sit between, if you'd rather it were a five-point scale than a smooth slide.

## 2026-08-22 — pie labels, and a few things in the way

### Additions

- **Every slice big enough to hold one now has its percentage written on it**, in black or white depending on what it's sitting on.
- **A line above the chart names whatever you're pointing at** — its name, its number and its share, at full size. That's the answer for the slivers too thin to hold a label of their own. With nothing under the pointer it shows what the whole chart adds up to.
- **A visible + Add slice under the pie**, and **+ Add meter** under every other meter block. Adding another one lived only in the block's `⋯` menu, which isn't where anyone would look for it.
- **The template prompt can be sent away.** There's an × on it now, and the page remembers — no more being asked about a page that's meant to stay blank. Dismissing it doesn't mark the page as edited.
- **Add Block now offers Apply a template** on a page that hasn't got one, so dismissing the prompt never closes the only door.

### Fixes

- **The template prompt was jammed against the title bar** with no gap above it, since the sidebar's top padding moved onto its blocks. It has room now.
- **Clicking a dial's number opened a text box very nearly as wide as the dial.** The box is the width of what's in it now, and grows only if you type something longer.
- **Enter now finishes naming a meter.** It did nothing at all before, which looked like the name hadn't taken — it always had, since a name saves as you type it. Enter and Escape both step out of the field now, the same as they do on the number.
- **The + on Add slice and Add meter was sitting on its own line above the words.** A bare button lays its icon and its label out as two lines of text if anything squeezes it. Both sit on one line now, centred, on every meter shape.

## 2026-08-21 — pie charts

### Additions

- **A pie chart divides one circle between all its meters.** Put two or more meters in a Pie chart block and they stop being separate pies and become slices of the same one — which is what a pie chart is for. Each slice is sized by its share of what they add up to, and every slice gets its own colour without you picking one.
- **Drag any edge between two slices to move it.** The two slices either side of that edge trade with each other and nothing else on the chart moves, so adjusting two figures never quietly rewrites the rest. Overshoot and the slice you're squeezing collapses to nothing rather than wrapping round.
- **A legend under the chart**, one row per slice: its colour, its icon, its name, its number and its share. Everything is editable there — click a number to type it, exactly as on the other shapes.
- **A pie nobody has filled in yet draws equal slices**, ready to be dragged, instead of an empty circle. The first edge you move writes those numbers down.
- **Segmented is now per meter, not per block.** Right-click one meter and **Segmented (this meter)** ticks off just that one; from the block's own `⋯` menu it still sets all of them. A meter you toggle back into agreement with its block goes back to following it.
- **Segmented on a pie chart** leaves a gap between the slices.

### Worth knowing

- **A Pie chart block holding a single meter is unchanged** — it still fills up against its own maximum, the way it always did, because one number can only be a share of itself. It becomes a slice the moment you add a second meter.
- **A slice ignores its maximum**, since what matters is its size next to the others. The maximum is kept, not thrown away: switch the block to a Circle or a Gauge and every meter reads against it again.
- **On a pie chart, Show max is called Show share** and hides the percentages in the legend.

## 2026-08-21 — meters

### Additions

- **Meters — a number drawn as a picture instead of typed as a fact.** How loyal someone is, how far along a war is, how many rations are left. Add Block has a **Meters** group with six of them, and they sit in the sidebar alongside your properties.
- **One block holds several meters.** A block is a panel of stats, not a single reading: **Add meter** in the block's `⋯` menu puts another one in, and each carries its own icon, name and numbers. Circles, semi-circles and gauges lay out two across; bars and tokens run full width. **Point at any meter for an × in its corner** to take just that one out — including the last one, which leaves the block waiting for a new one.
- **Every meter has an icon, and there's now an icon picker.** Click the icon slot next to a meter's name for **every icon the app ships — about 1,900 of them** — searchable by name, plus a tab of emoji. The ones worth suggesting for a world are grouped at the top and findable by what you'd call them ("health" finds the heart), and the rest is underneath. Emoji are just characters, so anything your system can draw, you can use.
- **A dial can show its number, its icon, or both**, and can be drawn in **segments** instead of one solid sweep. Both are in the block's menu.
- **Name each meter whatever it measures.** Type straight into the name beside it.
- **Show text** and **Show max** in the block's menu, so a row of dials can be just the dials, and "6/10" can be "6".
- **Five of them measure a proportion:** **Progress bar**, **Circle**, **Semi-circle**, **Gauge** and **Pie chart**. They read against 100 unless you say otherwise, so a bar set to three-quarters says 75%. Give one a different maximum and it shows the pair instead — 3 of 8.
- **Two of them count whole things:** a **Rating** you set a level on, and a **Token pool** you spend one at a time. Spell charges, favours owed, ammunition. They span the whole block, so five stars are five big stars — and seventy-six tokens shrink and wrap into a grid instead. **Pick what they're counted in** with **Rating symbol** in the block's menu: skulls, coins, acorns, an emoji, anything in the picker.
- **Point at a meter and it shows you what you'd get.** The value under your cursor previews as a dimmed, pulsing fill before you commit it, so a click is never a guess — **both ways**: aim above the value and it shows what would be added, aim below and it shows what would be taken away. Click to set it, or press and drag to sweep through values. Sweeping across stars or tokens works the same way.
- **Click a meter's number and type it.** One field, where the number already is: type **62** on a percentage meter and it's 62%, type **4/10** on a counted one and it's four out of ten. Enter to finish, Escape to back out. Dragging moves in whole units; typing is for 62.5 and for "out of 76".
- **Clicking a rating's current level clears it**, so a star you didn't mean to click isn't permanent.
- **They work from the keyboard.** Tab to a meter, then arrow keys to nudge it, Page Up and Page Down for ten at a time, Home and End for empty and full.
- **The shape is a setting, not a decision you're stuck with.** Pick another from the six in the block's menu — your numbers come with it, and the block's heading follows.
- **Pages can have their own icon.** Right-click a page → **Set icon**, and it's the same picker the meters use, glyphs and emoji both. It replaces the icon its template gave it and shows everywhere that page appears — the tree, its title, its breadcrumb. Clearing it puts the template's back. Works on a whole selection at once, like Set color.
- **Far more colours, and any colour you like.** Six are offered in the menu itself, the other eighteen open in place behind the **+**, and under those is a **+** that mixes any colour at all. Picking one doesn't close anything — choose, look, choose again. A colour that isn't one of the six rides on the row's **+**, which stays a **+**. Pages, blocks and meters share one colour control now, so they can't disagree about what's on offer.
- **Colours you mix are kept, and follow you everywhere.** A colour from the system picker joins a row of your own below the palette — available on any page, any block, any meter, in any project. Eight are kept, newest first, and the × on one throws it away. The block recolours live as you move around the picker and stays quick while it does — nothing is written until you close the dialog, and only the colour you settled on is kept.
- **A single meter can have its own colour.** Right-click one for **This meter's colour**, so four dials under one heading can be four colours. Clearing it hands that meter back to the block's colour.
- **Lowering a maximum doesn't throw the number away.** Drop a rating from ten stars to three and it shows three; put the ten back and the number you had is still there.

### Adjustments

- **A block's own menu scrolls** rather than running off the screen.
- **Add Block's headings are readable, and the menu scrolls.** Media, Blocks, Meters and Properties stand out from the things under them and stay put at the top while you scroll their section — and the menu stops growing at a sensible height instead of running off the screen as more block types arrive.

- **A block's colour now colours the block.** It used to be a thin line down the left edge; it washes the whole block from edge to edge of the sidebar and tints its heading, so a purple block reads as purple. Same swatches, in the same `⋯` menu.
- **Right-clicking a block opens its menu**, which is what right-clicking anything should do. It was doing nothing before, so you got whatever menu happened to be underneath. Right-clicking a particular meter inside a block also offers to duplicate or delete that one, and right-clicking the empty space under the blocks offers Add Block.
- **The block menu got shorter.** The colour row is a grid of swatches rather than a long strip, and the shape picker is six small tiles.
- **Every block has one name.** They used to show a heading and then repeat themselves underneath — METER with PROGRESS BAR under it, BACKLINKS with BACKLINKS under it, IMAGE with IMAGE under it. The heading says what the block is, in the top left, and renaming it still wins.
- **A list of pages says where it comes from in its menu**, with a tick on the one it's using, instead of on a label under its own heading. A **Tag index** is called a Tag index there — it used to call itself "Tagged", which is a different word for a different thing.
- **Click a page's icon to change it.** The icon beside the page's name opens the picker. Right-click → Set icon still works for changing several at once.
- **Blocks line up with each other.** The drag handle moved out of the heading's way, so every heading starts at the same edge as the block under it.

### Fixes

- **Tokens and stars respond to every click now.** About half of them did nothing: the pip you pressed and the pip that got told about it could disagree, so the tap was swallowed. Pressing sets the value the moment you press, the way the bars and dials already did.
- **A lone dial is centred.** One circle in a block sat hard against the left edge, because the layout was built for two side by side.
- **Lowering a dial no longer draws a ragged second outline over it** — the preview sits at the end of the fill instead of being painted on top of it.
- **A meter block has room to breathe.** A progress bar block was heading, hairline, caption, done — it read as a squashed strip. The bar itself is the same thin track it always was; the block around it isn't cramped any more.
- **A dial showing its icon doesn't repeat it beside the name**, and the icon inside a dial is the button that changes it.
- **The three dial faces actually look different now.** Asking for the icon on a meter that hasn't got one used to quietly show the number instead, so all three choices looked identical — it shows an empty icon slot you can click.
- **Pages in a list are readable.** They were painted in a colour that's almost the background — the same near-invisible tint that made the import progress bar disappear once before.
- **A long meter name no longer wrecks the layout.** It used to stretch its dial's column and shove everything off-centre; it's capped and trimmed now.
- **A dial's name and number stack under it**, both centred on the shape, instead of sitting side by side where neither could line up with it. The name box is as wide as the name rather than as wide as the column.
- **Meters light up when you point at them**, so a panel of four reads as four things — and so it's clear which one the × in the corner belongs to.
- **Dials sit closer together**, three across a normal-width panel, with the highlight hugging each one rather than filling the space between them.
- **A dial's icon lives inside the dial or nowhere.** It used to also sit beside the name, which ate the width in the narrowest part of the panel. Switch a block to Icon or Both to bring it back.
- **Stars and tokens are a fixed size.** They used to stretch to fill their row, so the last few tokens of a big pool came out enormous while the rest stayed small.
- **A token pool is drawn in tokens, not in stars.** They were coming out at a rating's size — seventy-six of those filled the panel. They're small now: 76 tokens sit in six rows.
- **Tokens and stars are coloured again.** A filled one was being painted in the empty colour, so a pool was grey however full it was. Filled ones take the block's colour; empty ones are a faint version of the same colour rather than grey.
- **The tag and page pickers look like menus.** Their rows had no styling at all and rendered as oversized plain text in a box. Tags show as tags, pages show with their icon, and the box is narrower.
- **Pages in a list look like pages.** They were bare text; now each row carries that page's icon and lights up as you point at it, the way a tree row does.
- **A dial's number is printed once.** It was in the middle of the dial *and* under the name. It's in the middle, and clicking it there is how you set it — the field opens in place rather than dropping a pair of boxes underneath.
- **Right-clicking a page no longer drags you onto it.** You can right-click any page in the tree to reach its menu while staying on the page you're reading. The menu still acts on the page you clicked.
- **A meter's number boxes no longer sit on top of the meter above them.** They inherited the sidebar's field styling, which deliberately pulls its box outwards to line text up in a column — in a tight row that put the box over its neighbour.

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
