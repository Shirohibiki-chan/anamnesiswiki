# Changelog

## 2026-09-01 — an icon in the middle of a sentence

### Additions

- **You can put an icon in a line of writing, and click it to change it.** Type a colon mid-sentence — `:swo`, then pick the sword — the same way `@` works for linking to a page. It stays an icon after it lands, which is the difference between this and dropping an emoji in: an emoji is a letter the moment it exists and the only way to change one is to delete it and start again. Clicking it opens the picker you already know: the search box, all fifteen hundred glyphs, and the emoji tab.
- **A colon you meant as a colon is still a colon.** The menu only opens where a colon couldn't be punctuation — at the start of a line, or after a space. `Note:`, `Chapter 4:` and `10:30` all leave it shut.
- **The colon key does more than it did.** It used to open the editor's built-in emoji grid; it now opens a menu with both — every glyph in the library and the same full set of emoji as before, searched together. An emoji still goes in as a plain character, exactly as it always did. A glyph goes in as an icon you can click. A bare `:` shows glyphs; the emoji appear once you've typed something to match them against. It's laid out as a grid of icons, the same as the picker — a menu of pictures one-per-row is a menu you can't scan.
- **`/icon` works too**, and drops a heart in for you to change afterwards. It's the second way in rather than the first, because `/` only means a command at the start of an empty line — which is exactly where an icon is least useful.
- **A callout's icon is yours to choose.** The tick on a green box and the caution on an amber one are still what you get without doing anything — that convention is worth keeping, and a callout that started blank would need decorating by hand before it said anything at all. But the icon is a button now: click it and pick whatever you like, on any callout, in any colour.
- **And you can take it off entirely.** The picker has two ways out of a callout's icon: **No icon**, which means no icon and stays that way, and **The usual icon**, which puts back the one its colour implies. They're deliberately two different answers — a callout you cleared shouldn't quietly grow its tick back the next time you open the page.

### Notes

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

## 2026-08-28 — a tidy-up under the floor

### Changes

- **Internal tidy-up, nothing visible in the app:** the code that decides what happens when you move, delete or duplicate a page has been lifted out of the big file it was buried in and given tests of its own — 43 of them. It had none before. That code works out things like which pages go with a folder you delete, where a copy lands in the list, and what happens to the home button or a shortcut when the page it pointed at is gone. It all worked; it just couldn't be checked without launching the whole app, so nothing was checking it very often.
- **Moving and deleting a page are now tested against the real app too**, which they never were — the only test that mentioned deleting was about deleting a whole project. The new one files a page into a folder, deletes one, and pins one and deletes it, closing and reopening the window each time. That last part is the point: a move or a delete that only happened on screen looks exactly like one that worked, right up until you next open Anamnesis.
- **One thing you could just about trip over is fixed.** Dropping a page into a folder that stopped existing while you were mid-drag is now refused outright rather than filed somewhere unfindable. You'd have to delete the folder in the second between picking a page up and letting go, so this is closing a gap rather than fixing something you've hit.
- **The picture on a project's tile is drawn by one piece of code now** instead of five near-identical copies — the big pinned card, the tile, the little square in the side list and both thumbnails in the Pinned Projects window. They all agreed, but nothing was making them, so changing how a cover looks meant finding four files and hoping that was all of them.

### Adjustments

- **A rule in Claude's instructions file has been removed**, because it was never yours and never followed. It said no part of the on-screen code was allowed to call a piece of shared logic directly — it arrived in the very first commit, in the same batch as the network rule you got rid of in August, and it had no reason written next to it. 22 of the app's 103 screen components broke it, almost all for harmless things like working out how long ago something was. The rule above it, the one about how the app's memory is reached, is real and stays.

## 2026-08-28 — the slash menu, tidied

### Fixes

- **Clicking back onto a line with a `/` at the front brings the menu back.** It used to sit there dead — the only way on was to delete the slash and type it again. It comes back with whatever you'd typed after the slash still in it. Same for an unfinished `[[`, which already worked.
- **A `/` only opens the menu at the start of a line now.** It used to open for *any* slash you typed — mid-word in `and/or`, straight after a full stop — which put the command list over your writing several times a paragraph. Everywhere else a slash is just a slash.
- **It won't wrongly come back either.** Clicking onto a line that starts with `/` brings the menu back; moving the cursor through `and/or`, a date or a path leaves it shut. The rule for coming back is the same as the rule for typing, so the two can't disagree.

### Changes

- **The menu had a white outline.** Not a choice — the outline colour was never set, so it fell back to the colour of the text, which is nearly white. It's the same quiet line every other panel in the app uses now, and the menu has a proper shadow instead of none at all.
- **The text is smaller and the rows are tighter**, matching the menus everywhere else in the app rather than being a size of their own. About nine options fit where five did, which is most of why it felt cramped.
- **It can't be squashed to a sliver any more.** Open it near the bottom of a page and it used to collapse to a row and a half; it now keeps a usable height and scrolls.
- **The group headings** (*Headings*, *Basic blocks*) read as headings now, in the same small caps the rest of the app uses for labels.

## 2026-08-28 — the link text box actually does something

### Fixes

- **Link text in the New page window did nothing.** Whatever you typed there was thrown away and the link came out reading as the page's name. The box works now: type *the bell* for a page called *Ninefold Bell* and that's what the link says, while still pointing at the right page and still showing up in the tree under its real name.
- **A link with no wording of its own still follows a rename**, which is why this took a moment to get right. Links look their page up as you read them, so renaming a page updates every link to it — the fix keeps that, and only pins the wording when you deliberately typed some.

## 2026-08-28 — callouts can be any colour

### Additions

- **A callout can be any colour you like.** Hover one and a small dot appears in its top right; click it for the palette. Info, Quote and Secret all take a colour, and *The usual colour* puts one back to how its kind normally looks.
- **Four colours also get an icon, because everyone already knows what they mean** — a tick on green, a triangle on amber, an exclamation on red, an *i* on blue. Any green does it, not just one: emerald, sage, teal and pine all read as a tick. Every other colour just recolours the box, and a colour you mix yourself never gets an icon, since there's no meaning to read off it.
- **Colouring a callout doesn't change what it is.** A red Secret is still a secret and still gets stripped when a page is shared; it keeps its 🔒 label whatever colour it's wearing.

### Fixes

- **Warnings imported from a `.lk` file were being turned into secrets.** There were only three kinds of callout and no colours, so warning and error panels were given the nearest-looking one — but Secret is the box that gets stripped out when a page is shared, so every warning in an imported world was quietly marked don't-show-anyone, with nothing on screen saying so. They now come in as a callout coloured amber or red, and a success panel comes in green. **Pages you've already imported keep whatever they were brought in as** — this changes what a new import does, not what's already on your disk.
- **Those colours survive going back out to a `.lk` file** — an amber callout leaves as a warning, red as an error, green as a success. Other colours are ours alone and leave as a plain info panel.

## 2026-08-28 — make a page without leaving the one you're writing

### Additions

- **You can make a page from inside the editor.** Type `/` and pick *New page*. A small window asks four things — what it's called, what the link should say if that's different, where it goes, and whether it's hidden — then makes the page and drops a link to it where your cursor was. You stay where you are; nothing opens the new page or takes you to it.
- **Where it goes defaults to the page you're on**, and you can search for somewhere else or clear it with the × to put it at the top of the tree.
- **Writing `[[Something]]` for a page that doesn't exist now offers to make it.** It used to sit there as plain text with brackets showing, and the only way on was to go and make the page yourself somewhere else. Now the same window opens with the name already filled in, and the brackets turn into a link once the page exists.
- **Backing out costs nothing.** What you typed stays exactly as you typed it, brackets and all, and you're put back where you were so you can keep going. It won't ask about that name again.

## 2026-08-28 — projects can be deleted

### Additions

- **A project can be deleted.** It's on the tile's ••• menu, under Archive. Until now Archive was the only way to get a project out of the list, and all that does is hide the tile — the folder stayed on your disk with no way to get rid of it except doing it yourself in File Explorer.
- **It goes to the recycle bin, not into thin air.** The whole project folder is moved there, so if you delete the wrong one you can put it back. You're asked first, and the warning names the project and says the whole folder is what goes.
- **It tidies up after itself.** A deleted project leaves the archive, any groups you'd filed it under, your pins and the recently-opened list, so nothing is left pointing at a folder that isn't there. If it happened to be the last project you had open, the app won't try to reopen it next time it starts.
- **It says so afterwards.** A small panel slides up at the bottom of the window — *Deleted "Orynthia". The folder is in your recycle bin.* — and fades on its own after a few seconds. The tile disappearing tells you something happened; this tells you where it went, which is the thing worth knowing if you deleted the wrong one.
- **A project another window has open won't be deleted**, the same as renaming one — you're told to go to that window instead.

## 2026-08-28 — five new kinds of page, and Species is now Race

### Additions

- **Country.** A nation isn't somewhere you can stand, so it stopped sharing a template with Location. Territory, peoples and economy on the first tab, a map tab, a *Rule* tab for government, law, what it can put in the field and who it borders, and a hidden *Past* for founding, wars and the last few years.
- **Creature.** Animals, monsters, the thing in the woods. Appearance, behaviour and habitat, then an *Encounters* tab for the signs one is near, what it can actually do to a person, and how people deal with them.
- **Technology.** Inventions and machinery, magical or otherwise — what it looks like, how it works, what it was for. Then who has it, what it costs, what it made obsolete, and who's building a better one.
- **Scene.** One moment as a piece of writing rather than a piece of history: setting, who's present, and what's different by the end. A hidden *Drafting* tab holds beats, lines you don't want to lose, and what isn't working yet.
- **Quest.** Objective, who's asking, stakes and payment, with a hidden *Running It* tab for the steps, the obstacles and the twists. Written with a table in mind, but a plot thread works the same way.

### Renames

- **Species is now Race.** With Creature taking the animals, the old name was pointing at the wrong half — "Species" reads as the non-sentient one, which is the opposite of what that template was for. **Pages you already made are fine and nothing on disk was rewritten**; they keep their icon, their fields and their writing, and simply show up as Race.

### Changes

- **Importing recognises Country and Technology pages** rather than bringing them in as plain notes. Kinds we haven't seen an example of still import as notes with all their tabs and writing intact, as before.

## 2026-08-28 — the templates are laid out our way now

### Changes

- **Every template has been rebuilt from the shape up.** The words were rewritten a while back, but the layout under them hadn't changed at all — the same tabs in the same order, the same headings, and the same run of blocks repeated identically on every tab of every template. That's all been redesigned.
- **The sections are named differently, and every one still explains itself.** A Character page goes Appearance, Manner, Motivations; an Item goes Appearance, Abilities, Limits; an Event goes In brief, Causes, Aftermath. Each heading has a line under it saying what belongs there, the way it always did.
- **The tabs are named for what's in them.** No more "Overview" on everything: a Character opens on *Who They Are* with *Ties* beside it, a Location on *The Place*, an Item on *The Thing Itself*.
- **Character has a Ties tab.** Somewhere to put who they're closest to, who they're at odds with, and who owes whom — with a reminder that @ links a page that already exists.
- **Species is three tabs instead of five.** Five on an empty page read as homework. Beliefs and Relations are now sections inside *Living*.
- **Faction splits into what they want, who's inside, and what everyone else thinks** — the last one hidden until you want it.
- **Each template opens differently.** The prompt at the top asks for something now rather than telling you what a character or a location is, and the quote and secret blocks turn up where they're actually useful instead of on every single tab.

**Pages you've already made are untouched.** This only changes what a *new* page starts with. If you've customised a built-in template yourself, your version still wins.
