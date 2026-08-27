# Changelog

## 2026-08-27 — a window that tells you what happened

### Additions

- **A crash no longer leaves you looking at a blank window.** If Anamnesis hits a problem it can't carry on from, it now says so on screen: what went wrong, that your worlds on disk weren't touched by it, and a button to start the app up again. The details are there to read rather than hidden, with a button that copies them if you want to send them on to someone.
- **The last few crashes are written down, on your own computer.** They go in a file kept beside your settings, five at a time, and nothing about them is sent anywhere. Settings → Privacy says where the file is and can copy the most recent one — useful for the kind of fault that doesn't take the window down but still goes wrong quietly in the background.

## 2026-08-27 — it doesn't report on you

### Changes

- **Anamnesis no longer reports which features get used, and the switch for it is gone.** It was built so you could turn it off and so it could never carry anything you'd written — but a worldbuilding app you keep your own notes in is a better thing when the answer to "what does it send" is simply nothing, so it's out rather than switched off. Nothing was ever sent from a released build: no version of Anamnesis you could have installed had anywhere to send it to.
- **Settings → Privacy now just tells you where things stand.** What the app collects, which is nothing, and the only two times it uses the internet — fetching pictures during an import, and checking for a new version when you press the button. Both still only happen when you ask for them.

## 2026-08-27 — a project open in another window

### Fixes

- **Anamnesis no longer says a project is open somewhere else when it isn't.** A project carries a small file saying somebody has it open, so two copies of the app can't quietly write over each other. That file was never cleared when you closed the app — only when you left a project from inside it — so closing Anamnesis and opening it again within two minutes met its own leftovers and refused, with "Open it anyway" as the only way past. It's cleared on the way out now, so the ordinary case never comes up.

### Adjustments

- **Opening a project that's already open takes you to it.** Pick it from the front page and the window that has it comes to the front, and the front page closes behind you — the way any app with more than one window behaves. It used to be a refusal you had to click through.
- **Opening Anamnesis while it's already running gives you the front page**, rather than a second copy of the app reopening the same project underneath the first. That was the situation the "open in another window" message existed to catch; now it can't happen in the first place.
- **The warning that's left is the one that's real.** If your projects live in OneDrive or Dropbox and a copy is genuinely open **on another computer**, Anamnesis still can't see that window and still can't be sure — so it says so, and "Open it anyway" is still there. That's now the only time you'll see it.


## 2026-08-26 — names you can finish reading

### Fixes

- **A block's name no longer trails off where you can't finish reading it.** Give a block a long name and the properties panel cut it short with a "…" and no way to see the rest — not by hovering it, not by widening the panel, not anywhere. The name now runs onto as many lines as it needs and the block grows to fit, the same way a spectrum's end words already did. A name with no spaces in it breaks across lines rather than running off the side.

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
