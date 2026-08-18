# Changelog

## 2026-08-18

### Fixes

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

## 2026-08-12 — the built-in templates are yours to change

### Additions

- **Click a built-in template — Character, Location, any of them — and you can edit it, the same as one of your own.** Rewrite the prompts, rename a tab, add one, take one out.
- **What you're editing is this world's copy.** Your other worlds keep the original, and the original is always still there underneath.
- **Put back to the original** undoes the whole thing, from the template itself or from the sidebar. It asks first, and it's undoable after that.
- The sidebar marks a built-in template **Edited** once it actually differs from the original — opening one to have a look doesn't count.
- Pages you've already made are never touched, by an edit or by putting it back. Same as with your own templates: making a page from a template gives the page its own copy.

### Worth knowing

- This changes a template's tabs and its name — the headings and prompts a new page starts with. The properties in the right-hand panel aren't part of it yet; that's a separate thing, because changing those would also change what pages you've already written show.

## 2026-08-12 — the Templates tab lists all of them

### Additions

- **The Templates tab now shows the built-in templates as well as your own**, in two sections: the kinds a new page can start as (Character, Location, Faction and the rest), then the ones you've saved yourself. Same order as the screen a new page opens with, so the answer to "what templates have I got" doesn't change shape depending on where you asked it.
- The built-in ones are there to be read, not opened — they come with the app and are the same in every world. Yours are still the ones you click to edit.

### Worth knowing

- **Making the built-in ones editable too is decided and comes next** — see the section above, which is it.

## 2026-08-12 — captioning a picture works

### Fixes

- **You can type a caption on a picture now.** Clicking the caption button opened the box, and then the first letter closed it again and dumped you back into the page — so a caption was only ever one character long, if that. It stays open until you're done with it.
- **The Rename button beside it had the same problem**, for the same reason, and is fixed with it.

## 2026-08-12 — templates can be edited

### Additions

- **Click a template in the Templates tab to open it and edit it.** Its title, its tabs, and everything written in them, in the same editor a page uses. Change a heading, fix a typo, add a tab — it's a page, so it edits like one.
- **Rename a template by clicking its name**, the same way you rename a page.
- **A template you saved with sub-pages lets you edit those too** — open the template, click the arrow, and click whichever sub-page you want.
- **Editing a template doesn't touch pages you already made from it.** That was already true — applying a template gives the page its own copy — but the screen now says so, because "template" reads like a live link and it isn't one.
- **Back to templates** returns you to whatever page you were on. Opening a template doesn't lose your place.

### Fixes

- **Reordering tabs by dragging is stricter about what it accepts.** The old check only counted the tabs, so an order that named the same tab twice would have been written — duplicating one tab and throwing away another, along with everything written in it. Dragging could never produce that, so this was never something you could hit; it's now impossible rather than unreachable.

## 2026-08-12 — your templates have somewhere to live

### Additions

- **The Templates tab at the top of the sidebar works.** It lists every template you've saved with "Save as template", so you can finally see what you've got without starting a page to find out. Until now they only appeared on the screen a brand-new page opens with.
- **Each one shows what kind of page it makes** — Character, Location, Item — next to its name, and a template you saved *with* its sub-pages has a little arrow to show you what's inside it.
- **Delete a template from here too**, with the same check first, and the same undo after. Pages you already made from it aren't affected either way.
- If you haven't saved any yet, the tab tells you how: build a page the way you want that kind of page to start, then right-click it and choose Save as template.

### Worth knowing

- **The Assets tab is still greyed out.** It's the other half of this phase and it's next.
- The tab opens on Project every time you start the app. Which tab you were last looking at isn't remembered on purpose — the tree is the way around your world, and that's what the sidebar should be showing when it opens.

### Additions

- **A + at the end of the tag chips opens every tag in the project.** Search it, tick the ones this page should carry, untick one to take it off. Each tag shows how many pages already use it, so you can tell a real one from something typed once and forgotten.
- **Typing a tag that already exists in a different capitalisation now uses the one you've got.** Type `SEAFARING` where the project has `Seafaring` and you get `Seafaring` — the whole point of being able to see the list is not ending up with three spellings no filter can find at once.
- Typing an entirely new tag still creates it, from the picker or from the box above it as before.

## 2026-08-11 — pictures answer the keyboard

### Additions

- **Resize a picture in a page from the keyboard.** Click a picture (or arrow into it from the line above or below) and press **+** to make it bigger, **−** to make it smaller, **0** to put it back to its own size. Each press is a tenth, so it moves by the same amount whether the picture is a thumbnail or the width of the page, and it stops in exactly the places dragging the edges stops.
- **Enter opens the picture's Upload / Embed panel**, so swapping a picture for another one no longer means reaching for the toolbar. It used to insert an empty line under the picture instead.

### Worth knowing

- **Backspace, and copy and cut, already worked** on a selected picture and are untouched — that was worth checking rather than building over.
- None of this fires while you're typing: it only answers when the picture itself is what's selected, never when the cursor is merely in the line beside it, and never inside the caption box or the panel's own address field.

## 2026-08-11 — the trail sits under the banner properly

### Adjustments

- **The path above a page title moves up under the banner.** It was carrying a full page margin under a cover image that already fades into the page, so the two together left about 70px of nothing between the picture and the trail. Under a cover it's now 8px; on a page with no cover yet, 12px.
- **The trail is brighter.** It was the same grey as a field hint — switched-off looking, for a row of links you're meant to click. Every step is a clear step up from the background now, and the page you're actually on is at full strength.

## 2026-08-11 — the trail above a page title stays on one line

### Fixes

- **The path above a page title no longer wraps into two rows of broken half-names.** Each step now stays on one line and is shortened with a **…** if there isn't room for all of it, and the name of the page you're actually on is the last one to lose letters. **Hover any step to see its full name.**
- **A page buried deep folds the middle of its path away.** Past four steps it shows the top one, then **…**, then the last three; clicking the **…** opens the whole path out. Nothing is lost — every step in a path is still a click away in the sidebar.

### Fixes

- **The `/` menu (and `@`, and `[[`) no longer opens as a sliver when the cursor is near the bottom of the window.** It was being positioned while it was still an empty "loading" strip, then growing downward from a spot picked for something a fraction of its height — so most of it ended up below the bottom edge. With the cursor 85px from the bottom, 498px of the menu was off screen. It now sits above the cursor, whole.
- **"Show whole image" and "Done" on the sidebar picture work.** They never did: starting a reposition grabbed the mouse for the whole picture area, including those two buttons, so pressing either did nothing — and they only appear while repositioning, which is exactly when they were broken. Dragging to reposition is unchanged.
- **A picture in a page opens full size on *double*-click now, not single.** A single click is what selects the picture and brings up its toolbar — where the caption, the resize and Save a copy are — and opening a window on top of that made the toolbar impossible to reach.
  - **The toolbar has an "Open full size" button** next to Save a copy, so it's something you can find rather than a gesture you have to know.

## 2026-08-11 — pictures open full size

### Additions

- **Click a picture in a page and it opens full size**, filling the window over a dark backdrop. Press **Esc** or click anywhere off the picture to close it.
  - **The file name is shown** along the top — the name the file had on your computer when you added it, not the jumble it's stored under.
  - **Arrows move between every picture on the page**, not just the one you clicked, with a count so you know where you are. **←** and **→** work too, and they wrap around, so going back one from the first lands on the last.
  - **Scroll to zoom in**, toward wherever the pointer is, and **drag the picture to move around** once it's bigger than the window. There are **+ / −** buttons and a percentage you can click to go back to fit. **+**, **−** and **0** on the keyboard do the same.
- **The sidebar picture has a fifth button: open it full size.** A button rather than clicking the picture, because dragging the picture is already how you reposition it — one click can't sensibly start a drag and open a window.

### Worth knowing

- **Clicking a picture still selects it as well**, so when you close the full-size view its toolbar is right there — that's where Save a copy and the caption are. Resizing a picture by its edges, and clicking its caption to edit it, both work exactly as before.

## 2026-08-11 — saving a picture, and quieter captions

### Fixes

- **The download button on a picture works now.** It did nothing at all: BlockNote's own version opens the picture in a new browser window, and this app doesn't open browser windows. It's now **Save a copy**, which asks where to put it through the normal Windows save box and writes the file there.
  - On an **embedded** picture — one added by web address — the same button says **Open in browser** instead, because there's no file on your computer to copy. Your browser's own "Save image as" is right there once it opens.
- **Captions are centred and quieter.** They were left-aligned in the same colour and nearly the same size as the paragraph underneath, so a caption read as another line of the page rather than a note about the picture. They now sit centred under the picture in the muted grey, matching how they look on GitBook.

## 2026-08-11 — page names get the whole sidebar back

### Fixes

- **Page names in the tree stop being cut off three-quarters of the way along.** The colour dot, the "..." and the + only appear when you hover a row — but they were still holding their space on every row all the time, invisibly, so every name was truncated to leave room for buttons that weren't on screen. **Names now get the full width of the panel — 60px more at the default width — and only shorten on the one row you're actually pointing at.**
- **Those three buttons can be reached with the keyboard now.** They used to be invisible but still in the tab order, so tabbing through the tree stopped on three buttons nobody could see.
- **A row keeps its buttons while its menu is open**, instead of the name springing back to full width underneath an open menu.

## 2026-08-11 — the URL box comes back

### Fixes

- **Adding a picture by web address works again, alongside uploading one.** The image block now has both tabs: **Upload** for a file off your computer, **Embed** for a link. Removing the second one was the wrong call — it was taken out on the grounds that the app shouldn't fetch anything off the internet, and that's your decision to make, not the app's.
- **The 10MB limit and the "that's not an image" check now cover dragging and pasting too**, not just picking a file through the panel. They were only ever checked on the one route.

### Worth knowing

- **An embedded picture is a link, not a copy.** It loads from that website every time the page is drawn, so it won't show with no internet, and if the site takes it down or moves it, it's gone from your page too. **Upload** copies the file into your project, where nothing outside can touch it. Both are one click apart — worth uploading anything you'd be upset to lose.

## 2026-08-11 — pictures inside a page

### Additions

- **You can put a picture in the middle of a page now.** Drag an image file onto the page, paste one, or use the `/` menu and pick "Image" — then **Choose a picture**. The file is copied into your project's `assets/` folder, the same place the sidebar and cover pictures already live, so it's yours and it works with no internet.
- **The "Enter URL" box is gone.** That was the only way in before, and it didn't add a picture at all — it pointed the page at an address on someone else's website, which the app would have to go and fetch every time it drew the page. It didn't belong in an offline app and it wasn't what anyone wanted anyway.

### Fixes

- **A picture in the middle of a page no longer disappears silently when you export to LegendKeeper.** A `.lk` file can only hold web addresses of pictures already on LegendKeeper's servers, so a file from your computer has nowhere to go — but the export now counts them and says so in the preview, the same way it already did for sidebar pictures, and it keeps the caption you wrote under it.

### Known

- **Removing a picture from a page leaves the file in your project's `assets/` folder.** Nothing is lost and nothing breaks; it's just a file nothing points at any more. The Assets tab in the next phase is where those become visible and removable.

## 2026-08-11 — buttons on the sidebar picture

**Phase 16 starts here.**

### Additions

- **The sidebar picture has its own buttons now**, on a small bar that appears when you hover over it. Four of them:
  - **Change picture** — swap it without having to remove the old one first. Dropping a new file straight onto the picture still works too.
  - **Reposition** — crops the picture to a square and lets you drag it up and down to choose which part shows, the same way the cover image at the top of a page already worked. There's a **Show whole image** button next to it to undo the crop and go back to the full photo, which is still what a picture looks like until you touch this.
  - **Describe** — writes ALT text, the short description of what's in the picture. The button turns teal once there's one, and hovering it shows you what you wrote.
  - **Set as cover** — makes the sidebar picture the page's cover image as well. If the page already has a cover it asks first, because the old one gets thrown away.

### Adjustments

- **The remove × on the sidebar picture only appears when you hover the picture**, matching the cover image at the top of a page. It was sitting on top of the photo permanently.
- **Clicking the picture itself no longer opens the file browser** — that's the change button's job now. It would have fought the reposition drag for the same click. An *empty* slot is still click-anywhere-to-browse.
- **Removing a picture also clears its description and its crop**, so neither carries over onto whatever you upload next.

## 2026-08-11 — move a page by naming where it goes

**Phase 15 finishes here** — the right-click menu now has everything it was meant to have.

### Additions

- **"Move to" on the right-click menu.** Type the name of the page or folder you want, pick it from the list, and everything you'd selected goes there — no dragging a page up eighty rows to a folder you can't see at the same time. Enter takes the top result, so it's three keystrokes if you know where you're going.
  - **It lists the whole world**, so you can also just scroll it. Each destination shows the trail above it — a world with three pages called "Notes" doesn't give you three identical rows to guess between.
  - **It leaves out the places that aren't places**: the pages you're moving, anything inside them (a page can't go inside itself), and the folder they're already in.
  - **Works on a multi-selection**, and gathers a run of pages from different folders into one.
  - **The destination opens as the page lands in it**, along with anything it's nested inside, so you can see where your work went instead of watching it disappear.
  - One Ctrl+Z puts everything back where it was, whether that was one page or nine from three different folders.

## 2026-08-11 — the title stops grabbing the cursor

### Fixes

- **Opening a page you haven't named yet no longer highlights its title for renaming.** A page you made and left as "Untitled" did this every single time you clicked back onto it — the title turned into a text box with everything selected, so the next thing you typed would have replaced the name. It now only happens once, on the page you've *just* made, which is the moment it was meant for. Any other time, the title is click-to-edit like it always was.

## 2026-08-11 — turn a page you like into a template

### Additions

- **"Save as template" on any page's right-click menu.** It copies the page — the writing, the properties and what you've filled into them, the tags, the colour, the pictures — and keeps it as a template for this world. **The page itself doesn't change**; you get a copy to start from, not a page that's been turned into something else.
  - **It asks whether the pages inside should come along too**, so a character with six sub-pages can be a template for that whole arrangement or just for the character. A page with nothing inside it doesn't get asked.
  - **Templates belong to the world, not the app.** Valeraverse's templates are Valeraverse's — saved with it, and they travel with the folder if you sync or share it.

- **Your templates show up when you make a new page**, under the built-in ones as "Or one of this world's own". Picking one fills the new page in the same way the built-in templates do, sub-pages included.
  - **Hover one there and click the × to delete it**, with a confirmation first. Deleting a template doesn't touch any page you already made from it. A proper Templates tab to organise them is still to come.

- Each template gets **its own copies of any pictures**, so replacing a page's portrait later can't take the template's with it.

### Fixes

- **A page named "assets", "project" or ".templates" at the top level no longer collides with the app's own files.** These are names Anamnesis already uses in your project folder, and a page that landed on one could go missing from the sidebar while sitting perfectly intact on disk. Such a page now gets a numbered name — "assets (2)" — the same way two pages with the same name already do. Nothing existing needs fixing; it's the same rule that was already there, applied to a case it was missing.

## 2026-08-11 — duplicate more than one page at a time

### Fixes

- **"Duplicate" works on a multi-selection now.** Select several pages, right-click, and Duplicate — it used to vanish from the menu the moment you had more than one page selected, which looked like copying a group wasn't possible rather than like it hadn't been built yet. Each page gets its copy directly below it, and one Ctrl+Z takes the whole lot back out.
  - **Selecting a folder *and* something inside it copies the folder once**, not the inner page twice. A copy brings everything inside it along, so copying the page on its own as well would leave a spare copy of it sitting inside the new folder.

## 2026-08-11 — put a folder's pages in order, and fold a branch away

**Phase 15 starts here** — the right-click menu getting the rest of the items it was always meant to have.

### Additions

- **"Sort sub-pages" on the right-click menu**, with four orders to pick from: A to Z, Z to A, newest first, oldest first. It sorts the pages directly inside the one you clicked — not everything below it — and it's a one-time tidy-up rather than a setting, so you can still drag things wherever you want afterwards and they'll stay put.
  - **Numbers sort like numbers.** "Chapter 10" comes after "Chapter 2", not between "Chapter 1" and "Chapter 3". Capital letters don't jump to the front either.
  - **Ctrl+Z puts the old order back**, as one step, however many pages moved.
  - It only appears on a page with at least two pages inside it — below that there's nothing to sort.

- **"Expand all inside" and "Collapse all inside."** Opens or folds away everything below a page in the sidebar, however deep it goes, instead of clicking through each arrow. Handy on a big branch you've just come back to, and on one you're done with.
  - **Collapse leaves the page you clicked open** and folds up what's inside it. Its own arrow closes it the rest of the way, and that way you can still see where you are.
  - Both work on a multi-selection, and the app remembers what's open the same way it always has.

## 2026-08-11 — pin the pages you keep coming back to

### Additions

- **Right-click any page and pick "Set as shortcut."** It appears as a small tile in a row under the sidebar search, and clicking it opens the page from wherever you are — no hunting down the tree. This is the last piece of the everyday-navigation work, and **Phase 14 is now finished.**
  - **Icons rather than a list of names.** The pages worth pinning are the handful you open constantly, and for those you already know the name — a list would spend a line of sidebar on each one to tell you something you weren't asking. Hovering a tile shows the name.
  - New shortcuts go on the **end** of the row, not the front, so the ones you've already learned the position of stay where they are.
  - A tile keeps its page's colour, including one inherited from the folder it's in, so a shortcut looks like where it came from.
  - **Middle-click a tile to remove it**, the same way you'd close a browser tab. "Remove shortcut" is on the right-click menu too.
  - Shortcuts belong to the world, not the app — each project keeps its own, and they're saved with it. Deleting a page removes its shortcut.
  - **The row isn't there at all until you pin something.** No empty prompt taking up space above the tree.

## 2026-08-11 — the app no longer decides how deep is too deep

### Fixes

- **Pages stopped saving long before they had to.** The app refused any page whose file path went over 200 characters, and told you to shorten the name or move it. That number came from an old Windows limit of 260, with 60 characters held back just in case — which was never the right check, and only ever meant refusing pages Windows would have written quite happily. Five folders deep with ordinary page names gets you to about 203.

- **A folder that had gone wrong once stayed broken forever.** Once a page's file was missing, every rename and every move afterwards tried the same impossible thing and failed the same way — including after restarting the app, because the app works out where files live from your tree each time rather than remembering. The app now notices there's nothing there to move and just writes the page where it belongs. **Any folder currently stuck like this fixes itself the next time you rename or move something in it.**
  - A rename the system actually refuses — a file OneDrive has open, a full disk — still gets reported the way it always did. Only "there's nothing there" is treated as something to repair.

### Adjustments

- **There's no length limit any more; your computer decides.** The old 260-character Windows limit isn't the limit on modern Windows, and guessing at a replacement number could only be wrong in one of two directions — the direction it was wrong in lost pages. So the app just tries to save, and tells you if the system actually says no. Tested first: a 1021-character path wrote, read back and opened fine, in the app's own file handling and in Windows' own tools.
  - **If a save does fail on a very long path, the message says so and includes what the system said**, instead of the app inventing a rule. Below that length you get the real error untouched, because the length isn't the reason.

- **If a save ever does fail on a long path, the app checks what your computer actually allows before it says anything.** It writes a test file somewhere deliberately too deep and sees whether that works. If your Windows is set to stop at 260 characters, the message says so, since that's a real setting with a real fix. If it isn't, the message says the length probably isn't the reason and shows what the system said instead — no sending you after the wrong thing.
  - It only runs after something has already gone wrong, never when the app starts, and it cleans up after itself.

- **A very long page title gets a shorter filename instead of blocking the save.** Past about 96 characters the name on disk is trimmed. The page keeps its full title: that's stored inside the file rather than being the filename, and the sidebar reads it from there. This one's a real limit — no filesystem allows a single file name past 255 — and nothing you'd call a title comes near 96; the longest across your worlds is 44. It's there so pasting a paragraph into the title can't cost you the page.

## 2026-08-11 — pages that couldn't be saved, and a folder that stayed broken

### Fixes

- **Two things you did at once could leave a page with no file behind it.** Making a page and then renaming it, or making a page and then putting something inside it, sends two writes to disk — and nothing was keeping them in order. The second one would go looking for a file the first hadn't finished writing, fail, and stop. Every write the app makes now goes in a queue and happens in the order you did things. Nothing waits on it; the app is exactly as quick as before.
  - **This is what was behind the red "some changes couldn't be saved" box**, and why the list in it kept getting longer.
  - **Worst case, a page you'd just made was never written at all.** The failure happened before the new page got its turn, so it was in the sidebar and nowhere else until you reopened the project.

- **A folder that had gone wrong once stayed broken forever.** Once a page's file was missing, every rename and every move afterwards tried the same impossible thing and failed the same way — including after restarting the app, because the app works out where files live from your tree each time rather than remembering. The app now notices there's nothing there to move and just writes the page where it belongs. **Any folder currently stuck like this fixes itself the next time you rename or move something in it.**
  - A rename the system actually refuses — a file OneDrive has open, a full disk — still gets reported the way it always did. Only "there's nothing there" is treated as something to repair.

## 2026-08-10 — hovering a link shows you the page without opening it

### Additions

- **Mentions and `[[wikilinks]]` show a preview card when you rest the pointer on them.** The page's name, what kind of page it is, its tags, and the first few lines of writing on it — enough to tell which Valera a link means without leaving the page you're on. Focusing a link with the keyboard shows it too.
  - It waits a moment before appearing, so links you're only passing over on the way somewhere else stay quiet.
  - The excerpt comes from the first tab that actually has writing in it, not the first tab — templates start with several and only some get filled in. **Tabs you've hidden are never used**, so nothing held back shows up in a preview.
## 2026-08-10 — small keyboard friction in the sidebar and the search boxes

### Additions

- **`Ctrl-N` and `Ctrl-P` walk any list of suggestions**, alongside the arrow keys — the quick switcher, the search box in Settings, and the slash, `@` and `[[` menus in the editor. Same keys everywhere, on every platform. They're a shorter reach than the arrows when your hands are already typing, which is where all four of those lists live.

### Adjustments

- **`Escape` out of renaming a page leaves you in the sidebar.** It used to cancel the rename and drop keyboard focus entirely, so the arrow keys stopped working until you clicked back into the tree.
- **`Escape` drops a multi-selection back to the page you're on.** Selecting several pages by accident used to need a click somewhere to undo. It leaves the page you're reading open — the selection and the open page are the same thing here, so clearing it outright would close what you were looking at.

## 2026-08-10 — focus the sidebar on one branch

### Additions

- **Right-click a page or folder → *Focus here*, and the sidebar shows only what's inside it.** Its contents sit at the top of the tree, and a bar above them shows the way back — project name, then each step down to where you are, all clickable. This is the answer to a branch nested deeper than the sidebar can show legibly, where the names have run off the edge and only the indent is left.
  - The bar is always there while you're focused, so the sidebar never quietly shows part of your world with nothing saying so.
  - Opening a page that isn't inside the focused branch — from search, or by following a link — steps back out on its own, rather than leaving the sidebar stuck somewhere you aren't.
  - Dragging a page to the top of a focused tree puts it *in* the folder you're focused on, not out at the project root.
  - It resets when you close the project. Reopening always shows the whole thing.

## 2026-08-10 — double-clicking a page in the sidebar opens it

### Adjustments

- **Double-clicking a page in the sidebar now opens it instead of renaming it.** Renaming on a double-click was never a decision — it's what the tree library does by default — and it's the riskier of the two to set off by accident, on the gesture everyone uses to look inside things. Renaming is still on the right-click menu, where the rest of a row's actions are.

### Additions

- **Settings has a new Sidebar section**, with the switch to put double-click-to-rename back if you prefer it. It's one setting for now; anything else about how the tree behaves will land there rather than being scattered.

## 2026-08-10 — opening a project repairs the nesting it used to quietly flatten

### Fixes

- **Pages that came loose from the page they were nested in get put back on open.** The previous fix stopped new damage, but it couldn't undo what was already on disk — anything nested before it still came back one level out, every single time the project was opened. Opening now spots the two halves and rejoins them, so the nesting you built is the nesting you get. It happens once and stays fixed.
  - Nothing is moved on a guess. A page is only put back where there's something actually sitting inside the folder waiting for it, and the folder is left alone entirely if it's one you made yourself in Explorer.
  - If the repair can't be written for any reason, the page loads exactly as it did before rather than half-repaired, and the next open tries again.

### Additions

- **Opening a project now says what it repaired on the way in.** The notice at the top of the window already reported pages put back after an interrupted move; it now also reports pages put back inside the page they belong to, by name. Repairs happening in silence is what let the last problem go unnoticed long enough to matter.

## 2026-08-10 — fix: making a page inside another page didn't move the parent's file

### Fixes

- **A page put inside another page could leave the outer page's file in the wrong place.** When a page holds nothing, it's a single file on disk; the moment you put something inside it, it's supposed to become a folder with its own file tucked in. Putting the first page inside it did the second half and skipped the first — the new page went into the folder, and the outer page's file stayed sitting outside it.
  - **This is what was behind the red "a change couldn't be saved to disk" message.** Once the two disagreed, the next rename or move went looking for a file that had never been put there.
  - **Nothing was deleted, and nothing is lost.** Everything is still on disk. But pages nested since the last update will come back **one level out** — sitting next to the page they were put in rather than inside it — because that's where the app can safely tell they are. Dragging them back in works normally now.
  - Restarting the app clears the error: it re-reads what's actually on disk instead of what it thought was there.
  - The same gap applied to duplicating a page and to undoing a delete. All three go through the same path now, and it's covered by tests.

## 2026-08-10 — hide a page from anyone you show your world to

### Additions

- **Right-click a page and pick "Hide from readers."** The page stays completely normal for you — it just goes dim and italic in the sidebar, the same way a hidden tab already does, so you can see at a glance what's held back. It's LegendKeeper's own "only admins can see hidden pages", and it's meant for the same things: spoilers, twists, the stuff a co-writer shouldn't hit yet.
  - **Hiding a folder hides everything in it.** Anyone who can't get to the folder can't get to what's inside it, so the pages under it dim too. Un-hide the folder and they all come back — nothing was marked individually.
  - **The page itself says so.** Open a hidden page and there's a "Hidden" chip next to the title, or "Inside a hidden page" if it's a parent doing it. The sidebar isn't where you spend the hour, so it can't be the only place that mentions it.
  - Works on several pages at once, and undo puts them back.
  - Nothing published or shared exists yet, so today this is a marker — but it's the marker the publishing feature will read when it arrives.

### Fixes

- **LegendKeeper's hidden pages import properly now, and export properly too.** Only *tabs* had their hidden setting read; a hidden **page** came across visible, and every page went back out to LK marked visible whatever you'd set here. **If your world had hidden pages in LK, that's worth a re-import** — the setting was never written down, so nothing else brings it back.

## 2026-08-10 — a "..." button on every row in the sidebar

### Additions

- **Hover a page in the sidebar and there's a "..." next to the + now.** It opens the same menu as right-clicking the row — rename, duplicate, colour, show in File Explorer, export, delete. Right-click still works and hasn't changed; this is just the version you can see.
  - It behaves like right-clicking in the one way that matters: if the row you press it on isn't part of the selection, it selects that row first, so the menu never acts on pages you weren't pointing at. Press it inside a multi-selection and the selection is kept.

## 2026-08-10 — new pages start blank, and pick what they are on the page

### Adjustments

- **Making a page no longer asks you what kind it is first.** The **+** button, the right-click item, the folder view's button and the keyboard shortcut all now make an untitled page straight away and open it. What used to be a popover in the way is now the page itself: the title is already waiting to be typed into, and the kinds of page are laid out underneath it.
  - **You can put it off.** "Skip this — just start writing" gives the page somewhere to write and leaves the question open. The properties panel on the right still offers the templates later, whenever you've worked out what the page turned into.
  - **Pages can be made in a run and named afterwards.** Nothing has to be decided at the moment you least want to decide it.
  - Picking a kind adds that kind's headings and properties to the page. Anything already written stays exactly where it is — nothing is replaced.
  - Folders are made the same way, by picking Folder on a new page.

## 2026-08-10 — any page can hold pages now

### Additions

- **Notes, items and events can have pages inside them.** Until now only folders, characters, locations, factions and species could, so putting a page under a note meant making a folder you didn't want. Every page can now hold pages — the **+** button and the right-click menu are on every row, and you can drag a page onto any other page.
  - **Nothing in your project moves.** Everything that was a folder on disk still is. A note stays the single readable file it always was right up until you put something inside it, and only then does it become a folder with the note's own page tucked in. Take the last page back out and it goes back to being one file.
  - **The LegendKeeper importer stops throwing text away.** A page in LK that had both sub-pages *and* its own writing used to be turned into a plain folder so the sub-pages survived — and folders hold no text, so the writing was lost, with a line in the import summary telling you so. It now comes across whole. Worth re-importing for if any of your LK pages were like that.

## 2026-08-10 — "Add child" works again, and is now called something you can read

### Fixes

- **Right-click → make a new page inside something now works.** It has been dead since the tree was first built: clicking it opened the type picker and closed it in the same instant, so nothing appeared. The **+** button that shows when you hover a row was doing the same job correctly the whole time, which is why the feature never looked missing — only that one route to it.

### Renames

- **"Add child" is now "New page inside."** Same thing, described in words rather than in tree jargon. The hover **+** button's tooltip says the same.

## 2026-08-10 — find any page's file on your computer

### Additions

- **Right-click a page and pick "Show in File Explorer"** to open the folder it lives in with the file already highlighted. Your world is plain files on your own disk, and this is the shortest route to them — for backing something up by hand, or just seeing where a page actually is.
  - It shows the right thing depending on the page. A character or a folder has a folder of its own, so that's what gets highlighted, with everything nested under it still inside. An item, event or note is a single file, so that's what you get.
  - Two pages with the same name are told apart properly — the second Valera Jiang points at *her* folder, not the first one's.
  - The menu names whatever your computer calls it, so it reads "Finder" on a Mac and "file manager" on Linux.
  - Single pages only. Picking several rows hides the option rather than opening a pile of windows.
  - **If there's nothing to show, it says so.** A page made seconds ago may not have been written to disk yet, and the app tells you that instead of opening the wrong folder. If your file manager refuses to open at all, you get the path in a message you can read.

## 2026-08-10 — drag the sidebars to whatever width you want

### Additions

- **Both side panels resize.** Grab the line between the tree and the page, or between the page and the properties panel, and drag. The width sticks — it's remembered for the app rather than per project, same as your theme and text size.
  - **Double-click either line to put both back** to the widths they've always been.
  - **They work from the keyboard too.** Tab to a divider and the left and right arrows move it 16px at a time; Home resets. Dragging a 5px line accurately with a mouse isn't something everyone can do.
  - There's a floor and a ceiling on each. The tree won't go below the point where a name at four levels deep stops fitting, and neither panel can be dragged so wide that the page you're writing on has nowhere left to go. Dragging isn't a way to hide a panel — the properties panel still has its button in the top bar for that.

## 2026-08-10 — back, forward and home buttons

### Additions

- **Back and forward, at the top left of the page.** They walk the pages you've opened this session, the way a browser's do — click a mention, read it, press Back and you're where you were. **Alt+←** and **Alt+→** do the same from the keyboard.
  - It follows *where you've been*, not what you've changed. Pressing Back after renaming something takes you to the previous page with the rename still there — undo is still Ctrl+Z and is a separate thing entirely.
  - Every way of getting to a page counts: clicking the tree, clicking a mention or a `[[wikilink]]`, opening a search result, clicking a breadcrumb, or making a new page.
  - Going somewhere new after going back drops the forward trail, same as a browser.
  - It starts empty each time you open the app. Back offering a page you last looked at nine days ago isn't much use, so the trail is only ever this session's.
  - Deleting a page takes it out of the trail too, so Back can never land you on a page that isn't there anymore.
- **A home button beside them**, and **Alt+Home**, going to whatever page you've set as the project's home — the same place the little house in the sidebar goes. If you haven't set one, the button says so when you hover it rather than sitting there greyed out for no reason.
- **All three can be rebound** in Settings → Keyboard like every other shortcut.

### Adjustments

- **Alt with an arrow or another named key is now a legal shortcut** to assign. Shortcuts used to need Ctrl or Cmd (or a function key) so they couldn't fire while you were typing — but Alt+← types nothing, so the rule was stricter than it needed to be and would have refused the very keys Back and Forward arrive on. Alt with a *letter* is still refused, because that does type things on a Mac.

## 2026-08-10 — one place that lists every property and every tag you've used

### Additions

- **A new *All properties & tags* view.** Press **Ctrl+Shift+K**, or click it at the bottom of the search box. It lists every property name and every tag in the world, sorted alphabetically, with how many pages use each and — for properties — how many of those actually have something written in. Clicking a row opens it: every page using it, each one a link that takes you there.
  - **Rename across the whole project from that list.** This is the point of it. Renaming a tag on forty pages one page at a time is why the typo survives instead of getting fixed; here it's one box and one button.
  - **Renaming onto a name that already exists merges the two**, which is usually exactly what you want when you find you've written *pov* and *POV*. It tells you before it does it, and asks a second time. Nothing you've written is ever thrown away — if a page has both filled in with different things, both are kept and it says so, so you can decide which one you meant.
  - **Delete across the whole project**, with the page count named up front and a warning if any of them have something written in that field.
  - **Different capitalisations are listed separately and point at each other.** *pov* and *POV* land next to each other and each says the other exists. They're your words, so nothing merges them behind your back — but you finally get to see that you've been writing both.
  - Anything you can do in here is one press of undo away, however many pages it touched.
- **Properties that come from a template are listed too**, with their counts, so you can see which fields are actually getting filled in and which have been sitting empty on forty pages. Those can't be renamed or deleted yet — they belong to the template, and editing templates comes later.
- **The values inside Select, Multi-select and Status fields are in there too.** Open a chip property in the list and you get every value it uses — *Draft*, *In progress*, whatever you've typed — with how many pages offer it and how many actually have it picked. Rename one across the project, recolour it across the project, or delete it. Renaming onto a name that already exists merges the two, and any page that had the old one ends up on the new one rather than losing its choice.

### Adjustments

- **Chip fields stop making you retype yourself.** Adding a Status to a second character now arrives with the states you already use on your other characters — same names, same colours, same options — instead of a blank list or the four defaults. It only borrows from pages of the same kind, so a location's *Type* (City, Village, Ruin) never turns up on a sword.
- **And when you invent a new value later, the other pages can see it.** Open any chip field's dropdown and there's a *Used elsewhere* section listing values this property has on your other pages of that kind. Picking one brings it over exactly as it is — same colour — rather than making a near-identical copy. Typing the name of one you already use adopts it too, instead of quietly creating a second one that only looks the same.

## 2026-08-09 — properties can be numbers and coloured chips, and you can drag them into the order you want

### Additions

- **Four new kinds of property: Number, Select, Multi-select and Status.** The three chip types work the way you'd hope — click the field, type a value, and it becomes a coloured chip you can pick again on the next page. There's no list to set up first: the options are whatever you've typed, and each one can be renamed or given a different colour from the pencil beside it. Select holds one, Multi-select holds as many as you like, and Status is a Select that arrives already filled in with Draft, In progress, Needs revision and Done, and wears a little dot so it reads differently at a glance. Picking the value that's already set clears it.
  - Renaming an option renames it everywhere it's used on that page, and deleting one takes it off the page rather than leaving a chip pointing at nothing.
  - **Number is for things that really are counts** — a population, a price. Ages are still text on purpose, because "appears 20, actually 400" is a real answer and a number box can't hold it.
- **Every property has a suggested list now.** Open *Add property* and there's a row of names picked for whatever kind of page you're on — a character offers Age, Pronouns, Species, Occupation, Height, Eyes, Hair, Birthplace, Affiliation, Status, Motivation and Quirks; a location offers Population, Government, Ruler, Climate, Founded. Clicking one fills in the name and the kind for you, ready to edit — so *Affiliation* can become *Affiliations* before you press Add. Anything the page already has drops off the list. It's about a dozen per template rather than everything imaginable — the ones people actually fill in.
  - Where a suggestion names something with its own page — Species, Birthplace, Affiliation, Ruler, Allies — it's added as a link rather than as text, so it quietly builds the web of connections instead of a wall of words.
- **Drag any property into the order you want.** A grip appears to the left of a field when you hover it. Template fields and ones you've added yourself sit in one list and can be interleaved freely — Summary no longer has to come before everything. The order is per page, so arranging one character leaves every other character alone, and a page you've never dragged anything on looks exactly as it did.
- **Created and Updated are shown at the bottom of the sidebar.** The app has been recording both for every page since the beginning and has never shown you either. Hover a date for the exact time.

### Adjustments

- **Exporting to LegendKeeper handles the new types.** LegendKeeper only has two kinds of property — text and links — so numbers and chips go across as text, with chips written out by name. They won't come back as chips if you re-import, because there's nothing on LegendKeeper's side to come back from. Worth knowing before you round-trip a page you've put a lot of chips on.

## 2026-08-09 — two fixes to the search boxes that shipped this morning

### Fixes

- **The tree's scope menu now opens where the search box is.** It was landing somewhere else entirely — far enough away to look like the control had never been added, which is exactly how it was reported. Clicking into an empty sidebar search shows the menu under the field, as it was meant to.
- **Ctrl-K no longer draws a green box around itself.** Every text field in the app gets a ring when you click into it, which is right for a field sitting among other things — but the search box fills the whole top of that panel and is already focused the moment it opens, so the ring was permanently on and traced a rectangle that didn't line up with anything. It's gone. The cursor is already in the only field there is.

## 2026-08-09 — you can see what the search is searching, and Settings has a search of its own

### Additions

- **Settings has a search box.** Type what you're after and it finds the setting, whichever of the eight sections it's buried in — then takes you there and flashes the actual row, not just the panel. It's built to answer the question you'd really ask rather than the one you'd ask if you already knew the answer: *"where are my files saved"* finds the Projects folder, *"make the text bigger"* finds the size sliders, *"changelog"* finds the patch notes. Arrow keys walk the results, Enter opens one, and Ctrl-F puts the cursor back in the box from anywhere in the dialog. Escape clears the search first and only closes Settings on the second press.
- **Both search boxes now let you say what you're searching** — everything, names only, tags only, and on Ctrl-K, the text written on pages. It's a menu, not a row of buttons: in the tree it opens when you click into an empty search field, and on Ctrl-K you open it with Tab. Nothing sits on screen when it's closed, except a small chip when you've narrowed it — so you can tell at a glance that the tree is hiding rows on purpose.
  - **Searching names only is new,** and so is searching page text only. Tags-only was always there. Having all of them is what you need when a tag and a folder share a word, and it cuts every way — a `character` tag and folders called Characters couldn't be told apart in any direction before.
  - Typing `#` still works, and now **sets the menu to Tags and disappears from the field** rather than sitting in the text. So the one time you use it, it shows you the menu it stands for.

### Adjustments

- **Both search placeholders say what will actually be searched** rather than always naming everything.

## 2026-08-09 — the quote block is a box again, and the block handles shrink

### Fixes

- **Quote callouts actually look like callouts now, on every theme.** Their background was a 3% wash of flat white while Info and Secret got 12% of their own colour, so on a dark panel a Quote wasn't a faint box — it was no box, and the block read as a stray line of italics. Each theme's Quote now takes a tint of its own edge colour at the same strength the other two use.
- **Midnight — the default theme — had never been given its own callout colours.** It was still wearing the ones tuned for the near-black theme, so its Info was a blue picked against near-black sitting on navy, and its Quote was a neutral grey with nothing to separate it from a navy panel. It now has three of its own: azure, violet, and a warm sand for Quote. (This is the third group of colours Midnight was found to be inheriting, after the outlines and the text shades — and all three were noticed by using the app, so there's now a test that checks every theme's callouts the way the outlines and text are already checked.)
- **Daylight's Quote edge was too pale to see**, at 2.6 against a white panel where its Info and Secret clear 3 comfortably — the same grey, meant for dark panels. It's warm stone now, with the words warmed to match.
- **Themes you've made yourself pick the fix up too.** The white wash wasn't just in the built-in themes — it was written into every theme file the app has ever saved, so no theme could have been given a visible quote box from the Colours panel either. Changing any colour in a theme of yours now replaces that one line; a wash you picked yourself is still left exactly as you set it.

### Adjustments

- **The ＋ and the drag handle beside each block are smaller.** They were rendering at 24px next to 16px prose, which made the two biggest things on the line a pair of handles. They're 16px now, sized to the text they belong to.

## 2026-08-09 — the update button comes before the release notes

### Adjustments

- **Download and install sits at the top of the update panel now**, directly under the headline and the line about your projects being untouched, with the release notes below it under a *What's new* heading. It used to be underneath the whole of the notes — a release's worth of writing between you and the one button you opened the panel to press. The notes have always been a scrolling box rather than an endless wall, so the button was never off the bottom of the screen, but reading past a full set of notes to reach a decision you'd already made is the wrong way round.

## 2026-08-09 — releases carry their own notes

### Fixes

- **The update panel will show the real release notes from now on.** It reads them from `latest.json`, a small file built and uploaded alongside the installers — not from the release description on the web page, which is what everyone including this changelog assumed. The description could be filled in afterwards; `latest.json` couldn't, because its copy is written while the build runs. So the notes it carried were the workflow's placeholder, *See CHANGELOG.md for what changed*, which is both a dead end and the wrong file. The build now reads the version's section out of [RELEASES.md](RELEASES.md) and uses that for both. v0.3.0's was corrected by hand before publishing.
- **A release with no notes written for it stops the build** in the first few seconds, rather than producing installers whose update panel has nothing to say. Same idea as the check that the version files match the tag, and for the same reason — the expensive failures here are the quiet ones.

### Adjustments

- **[docs/releasing.md](docs/releasing.md) no longer says to paste the notes in by hand**, since the draft now arrives with its description already written. It explains what actually feeds the update panel, and records the one-command repair if a release ever goes out with the wrong notes again.

## 2026-08-08 — v0.3.0 release notes cover the fonts change

### Adjustments

- **[RELEASES.md](RELEASES.md) describes what v0.3.0 actually ships.** The fonts-belong-to-the-theme change and the *New theme* button landed after the v0.3.0 notes were written, so the notes named a button that had moved and said nothing about a visible change to how fonts work. Since Settings → Patch Notes reads this file, that gap would have been on screen inside the app it was wrong about.

## 2026-08-08 — fonts belong to themes

### Adjustments

- **A font is part of the theme now, the way its colours are.** Pick one in *Fonts and text* and it's written into the selected theme's `.css` file, alongside its colours — so switching theme switches the fonts with it, and a copy of a theme keeps the faces it had when you copied it. Before, a font was one setting that sat over the top of every theme at once, which is the opposite rule to the one the *Colours* panel next door teaches, with nothing on either screen saying so. The way that showed up was a copy of a theme appearing to have picked up a font change made before the copy existed — the copy was fine; the override was on top of it.
- **A switch at the top of the panel for the other way round.** *Use one set of fonts in every theme* does what fonts used to do: your faces win over every theme, built-in ones included. It's off by default, and on for anyone who already had a font set — nothing changes underfoot on upgrade. Turning it off puts each theme back on its own fonts and remembers yours in case you want them back.
- **Setting a font on a built-in theme now offers you a copy**, exactly as changing its colours does, since the built-ins ship with the app and their files can't be edited. The alternative is the switch above.
- **Font choices per slot are still per slot.** In every-theme mode, leaving one on *whatever the theme uses* still lets that one follow the theme — so a reading face can stay put while titles change with the theme.

### Additions

- **A *New theme* button in Settings → Themes.** It copies the theme you're on into a file of your own and selects it, which is the one way a theme gets made and was previously only reachable from the *Colours* panel — a screen there's no reason to open unless you already have a theme of your own to edit. The named version with a text box is still in *Colours*, and *Fonts and text* offers it too when there's nothing it can edit.

## 2026-08-08 — release notes bullets

### Fixes

- **The bullets in release notes are round dots again**, in Patch Notes and in the update panel alike. They were being typed rather than drawn — the app asked for a standard bullet character and let the theme's own font supply it, so the mark's size, weight and height changed with whichever of the 98 fonts a theme picks. On Midnight's it came out small enough and high enough to read as a stray apostrophe rather than a bullet. It's now a drawn circle, identical in every theme including hand-written ones, and it still grows and shrinks with the Interface text-size slider. Numbered lists keep real numbers — digits look like digits in any font.

## 2026-08-08 — patch notes in Settings

### Additions

- **Settings → Patch Notes.** A permanent screen showing what changed in the last three versions of Anamnesis, each on its own tab with its date. It's the same writing that goes on the releases page — the plain-language version, not the changelog — and each tab has a **Read this on GitHub** link for reading it in a browser or going further back than three.
- **It works offline and opens instantly**, because the notes are built into the app rather than fetched. Nothing new reaches the internet; Anamnesis still makes exactly two network calls, both of which need you to press something first.
- **It shows the versions up to the one you're running**, which is the point of it — it's what's in the copy you have. If there's a *newer* version than yours, that's Settings → Updates, which fetches those notes when you press the button. The two panels answer opposite questions and sit next to each other in the list.

## 2026-08-08 — v0.3.0

### Additions

- **Release notes live in their own file now.** [RELEASES.md](RELEASES.md) is the plain-language version — what changed in each published release, written for someone using Anamnesis rather than building it. It's what goes on the releases page and what the update button shows you before you install. This changelog stays what it's always been: everything, in the order it happened. The release notes are a read of it, not a replacement.
- **v0.3.0 is the first release built for Mac and Linux** as well as Windows. Nothing in the app changed for this — the release automation that landed in July builds all four, and this is the first time it's been used to publish.

### Adjustments

- **Everything since v0.2.1 is in a release now.** The sections below dated 31 July, 4 August and 5 August were marked as living only in the repo, which was true at the time and isn't any more. They say which release carries them instead. The theme sandbox is the exception and still says so — it's a file in the repo you open by double-clicking, not part of the installed app.

## 2026-08-08

### Release notes in the update panel look like release notes now

- **The "what's new" text in Settings → Updates used to arrive as a wall of raw formatting** — `###` and `-` and `**stars**` showing as themselves, the whole release run together in one block. It reads properly now: headings as headings, bullets as bullets, bold as bold.
- **The version heading is skipped if you paste it in**, since the line above it already says which version is available.
- **Long notes scroll inside the panel** rather than pushing *Download and install* down the screen.
- **There's a *Read this on GitHub* link underneath**, if you'd rather read them in a browser window.
- Nothing new goes out over the network. The text was already being fetched as part of checking for updates — it just wasn't readable.

### The sidebar draws lines showing what's inside what

- **Each level of nesting now has a faint vertical line running down it**, so you can follow a row back up to the folder it lives in instead of counting indents by eye.
- The lines sit under the folder's arrow and join up from row to row, the way Obsidian's do.
- **Nesting is also a bit tighter — 18 pixels a level instead of 24.** Eight levels deep that's 48 pixels handed back to the names, which is most of a word. The lines are what make the tighter spacing still easy to read, which is why the two changed together.

### The sidebar doesn't scroll sideways any more

- **Nesting a few folders deep used to give the sidebar a horizontal scrollbar** and push everything wider than the panel. Fixed — the sidebar now stays exactly as wide as it is, however deep the tree goes.
- **Long or deeply nested names shorten with a `…` instead**, the way they do in Obsidian and every other app of this kind. Six levels deep, a row that used to run **413** pixels wide inside a **272** pixel panel now stops at the edge, with the name trimmed to fit.
- **The colour dot and the + button stay reachable on deep rows.** They sit at the right-hand end of a row, so when the row ran off the side of the panel they went with it.

### Hover is the same strength on every surface now, not just on panels

- **Hover was hard to see on the darker background colours**, most obviously after using *Match the others to Panels*, which is what turned this up. Fixed.
- **The cause was that hover was one solid colour worked out from your Panels colour** — but hover doesn't only happen on panels. A page in the sidebar sits on Panels, a settings row sits on Boxes, a menu row sits on Menus. One colour worked out from one of those three is wrong on the other two, and *how* wrong depends on how far apart you've set them. Match the others to Panels deliberately sets them close together, which is exactly when it broke: on a yellow theme, a hovered settings row was a measured **19** away from the box behind it. Near enough to invisible.
- **Hover is now a thin film laid over whatever it's on**, rather than a colour guessed in advance. It darkens or lightens what's actually underneath, so it's the same strength everywhere by construction instead of by luck. Across every built-in theme and every surface it now measures **67–97**, where before it ranged from 11 to 102.
- **This was quietly wrong in the built-in themes too.** Hovering a row in a right-click menu measured 11–16 on Dark, Ember, Grove and Nightbloom — technically not zero, but not something you'd see. Those are fixed by the same change.
- **Where hover already looked right, it still looks the same.** The strength was picked by measuring against the old one on the surfaces where it worked, not chosen by eye.
- **In a search, the row your arrow keys are on now looks different from the row your mouse is over.** They used to be painted identically, so if the pointer happened to be resting in the list you couldn't tell which one Enter would open.
- The two Hover swatches in Settings show the colour a hovered row actually goes on your panel. Rows and buttons is unchanged; the second one is now **Keyboard selection**, because that's what it does.

### One button fills in the other three background colours

- **Settings → Colours → Backgrounds has a *Match the others to Panels* button.** Pick the background colour you want, press it, and Window, Boxes and Menus are filled in as matching shades of it.
- This is the fix for the thing that made a light theme so annoying to build: the app has **four** background colours, and changing only one left you with (say) a pink dialog full of navy boxes. Nothing said there were four, or that they were related.
- **It's a normal edit, not a mode.** It writes ordinary colours you can then change one at a time, and nothing keeps following Panels afterwards. Press it again whenever you want.
- The shades follow the same arrangement the built-in themes use by hand: on a dark theme the window sits below the panel and boxes and menus sit above it; on a light theme everything sits at or below the panel, so menus still read as white. Your panel's colour is kept, so a pink panel gets pink siblings rather than grey ones.

### Hover works on light themes now, and the Hover swatches stop showing the old colour

Two things wrong with this morning's hover change, both found by setting a theme's Panels colour to a pale pink.

- **Hover was still invisible if your theme's text isn't dark.** Hover was worked out by moving your panel colour toward your *text* colour, which is only a sensible direction on a theme that's already finished. Set a pale panel on a theme with pale text and the two cancel out — hover moved by a barely-there amount and looked identical to the box it was on. It's now worked out from the panel colour on its own: light panels get a darker hover, dark panels a lighter one, and nothing else can pull it off course. On the pink theme that took the change from **6 to 43** — from invisible to obvious. Dark themes are unchanged, on purpose.
- **The three Hover swatches in Settings kept showing the previous colour.** Change Panels and the app hovered correctly straight away, but the swatches went on displaying the hover of the colour you'd just replaced. They now keep up.

Hover still keeps your theme's character — a pink panel gets a deeper pink, not a grey.

### Hover now follows your theme, instead of ignoring it

- **The colour things go when you hover them is finally part of the theme.** It never was. Every hover in the app quietly borrowed some other colour — the sidebar took the menu colour, buttons took the top-bar colour, highlighted things took the selected-page tint — so nothing in Settings could change hover, because as far as the app was concerned there was no such thing.
- **On Daylight it wasn't just a wrong shade — it was nothing at all.** That theme uses white for both panels and menus, so hovering a page in the sidebar painted white on white. Measured difference: zero. Every other theme got a hover that happened to work by luck, and the size of the step ranged from barely-there to obvious depending on which theme you were on.
- **Hover is now worked out from your own colours** — your panel colour moved a step toward your text colour. That means it goes lighter on a dark theme and darker on a light one without being told which it is, it's the same *visible* amount of change in every theme, and it keeps your theme's character: Ember's hover stays warm, Grove's stays green, Abyssal's stays blue.
- **It can't fall out of step.** Change your background colours later and hover moves with them. This is true for themes you write by hand in Notepad too — a theme that never mentions hover still gets a correct one.
- **You can still set it yourself.** Settings → Colours → Hover has three swatches: rows and buttons, inside menus, and highlighted things. Pick a colour there and it's yours and stays yours; leave them alone and they keep working themselves out.
- Buttons and coloured sidebar rows are handled too. Those used to brighten on hover, which only knows one direction — on a light theme it walked an already-pale row toward white and the hover disappeared. They now take a film over the top that darkens or lightens depending on the theme.

### The × on your pictures is visible again on light themes

- **The buttons that sit on top of an image** — the banner's hint and its remove ×, and the portrait's remove × — **drew themselves in your theme's text colour**, which on Daylight is nearly black. On a dark photo that was a black × on a dark background. Measured contrast: 1.1 to 1, which is another way of saying invisible.
- They're now always light, because what's behind them is always darkened, whatever theme you're on. The darkening was strengthened slightly at the same time, so they're now easier to see on every kind of picture than they were before — including bright ones, which was the one case that used to work.

### Themes written in modern CSS show their real colours in Settings

- If a theme file used `oklch()` or `color-mix()` — how anyone writing CSS by hand picks colours these days — the colour pickers in Settings showed **black squares** instead of what the theme actually looked like. They now read those properly.

### Reopening a shipped theme in the sandbox gives you the real thing again

- **The sandbox's copies of the built-in themes were out of date.** Picking Midnight, Dark, Ember, Grove, Nightbloom or Daylight as a starting point handed you the *old* quieter greys — the ones from before yesterday's readability pass — so anything you built on top of one started out harder to read than the theme it was named after.
- Only the muted labels and placeholder text were wrong, and Midnight was missing its navy-tinted text as well. Everything else already matched.
- The themes in the app never changed; this was the sandbox alone. Abyssal was already correct.

### A new theme: Abyssal

- **Deep ocean blue, cyan and violet** — a seventh theme in the picker, and the first one that didn't come out of the sandbox. It's your CharSnap palette run through the new importer and then tuned by hand.
- It's a *lit* blue rather than another dark room — nearly three times as bright as Midnight's navy — so it sits apart from the other five darks instead of being a sixth variation on them.
- The Info callout is mint here, because the cyan is already doing the accent's job and two blues side by side wouldn't tell you anything. Same reason Nightbloom's Secret is indigo.
- The buttons and page titles carry the cyan-to-violet gradient the palette already had in it.
- Four things were changed from what the importer produced, all of them because a built-in is held to a tighter standard than the readability floor: the Secret stripe was too dim to see at 3px, the Quote stripe was a touch under, the borders were re-spaced to match Midnight's, and the palette's red was dropped in favour of the app's own — it's a red for light backgrounds and it disappeared on this one.

### Callout text now stays its own colour

- **A fix to the importer, found by looking hard at the theme above.** When a palette was turned into a theme, the writing inside a callout was being tinted toward the theme's body text — so on a theme with pale cyan text, the *violet* Secret callout got pale cyan words. The stripe was the only thing telling the three callouts apart. Their text now stays in the same colour family as their own stripe.
- Only affects themes made by importing a palette; nothing that already exists changes.

### Import a theme, or a palette from another app

- **There's an *Import a theme* button in Settings → Theme.** Point it at a `.css` theme somebody sent you and it copies the file into your themes folder and switches to it. That's the "drag it into a folder" step, done for you.
- **It also takes a `.json` palette** — the list of names and hex codes that palette tools and other apps export. A palette knows it has a colour in it; it doesn't know that colour is a window background, and its names are about the app it came from rather than this one. The importer works the roles out: which one is the window, which is the accent, which is the delete-button red.
- **Every text and border colour is solved for readability rather than guessed.** The quieter greys, the placeholder text and the three line weights are calculated against both the window and the panels, so an imported theme can't come out less readable than the floor the built-in six are held to — whatever the file said.
- **A gradient the palette already had gets used.** If the file has a pair like `somethingStart` / `somethingEnd`, that pair goes on the main buttons and the page title. Two colours someone deliberately put together beat anything the app would pick, and it's one line to delete if you disagree.
- **The guesses are written into the file, in plain English, at the top.** Which key it took the window colour from, which one became the accent, whether it found a gradient. It's a normal theme file after that — open it in Notepad, or keep going in *Colours*.
- Importing the same file twice gives you two themes rather than overwriting the first, and if the file can't be opened, has no colours in it, or won't save, the panel says which of those happened.

### The colour pickers keep up now

- **Dragging a colour or an opacity slider isn't laggy any more.** Every tiny movement of a picker was making the app rebuild your theme file, re-check it, swap the whole stylesheet out, measure the fonts and background back off the screen, and save a copy of the lot — a few dozen times a second. It now just changes the one colour while you're dragging, and does the rest once you stop.
- Nothing about the result changes: the file gets written the same way, still only touching the values you changed.
- One small thing you might notice: the faded versions of a colour — the wash behind a selected page, the tint inside a callout — catch up a moment after you let go rather than tracking your hand. That's deliberate, so the app doesn't overwrite one you've tuned by hand and then snap it back.

### A copied theme keeps its fonts

- **"Make a copy I can edit" no longer changes the fonts.** Midnight is the only theme that picks its own faces — Domine, Lexend and Quicksand — and a copy of it was only carrying the colours across, so it came out in the app's default Inter/Fraunces/Newsreader and didn't look like the theme it was copied from. A copy now writes the faces out too. Copies of the other five are unaffected, since those were already using the defaults.
- The fonts land in the file as three ordinary lines you can change or delete, and picking a font in *Fonts and text* still overrides them the same way it always did.

### Theme files reload themselves

- **Save a theme in a text editor and the window changes with it.** No button, no switching away to another theme and back. The app now watches the themes and snippets folders and picks up anything that appears, changes or disappears in them, so a `.css` file open in Notepad on one monitor and the app on the other behaves the way it looks like it should.
- **Same for snippets** — turning one on, editing it, and saving now shows up straight away.
- **"Check for new ones" is still there.** It's a fallback rather than the way through: watching a folder can be refused, most likely on a network drive, and if that happens the button does the whole job the way it always did.
- Fixed a stray character in the note about where spare copies of theme files are kept — it read `themes` followed by nonsense instead of `themes/backups`.

## 2026-08-07

### Your own CSS survives the colour pickers

- **Editing a colour in the app no longer rewrites your theme file.** If you'd hand-written a theme — your own rules, your own comments, anything beyond the twenty-odd colours the pickers know about — touching a single swatch replaced the whole file with the app's version of it. No warning, no undo, and it looked like it had worked. The pickers now change the values they were asked to change and leave every other byte of the file exactly as it was.
- **A spare copy is kept, just in case.** The first time the app is about to change one of your theme files in a session, it puts a copy of what was there in `themes/backups`. One copy per theme, replaced next time — it's a safety net, not a history.
- **The app no longer bakes its own vetting into your file.** If a theme tried to load something from the internet, the app declines to fetch it — but it was writing that refusal back into your stylesheet the moment you touched a picker. What it won't load and what it's allowed to change are two different things.
- The Colours panel now says all of this up front, rather than leaving you to find out by risking a file.

### Editing a theme file by hand

- **"Check for new ones" applies the whole file now.** If you edited a theme's `.css` by hand and the file named itself something different from what the app had on record — you added a `[data-theme="…"]` line, or pasted in an export from the sandbox — only part of your changes showed up. The app kept using the old name, so every rule written against the new one simply didn't match, and switching to another theme and back was the only thing that fixed it. A rescan now picks up the name out of the file, the same way selecting a theme always did.

### Deleting themes

- **You can delete a theme from inside the app.** Every theme you've made has a bin icon on its row; it asks first, names the file it's about to remove, and then it's gone from the folder. The built-in six don't have one — they ship inside the app and there's no file to remove. If you delete the theme you're currently using, you go back to Midnight.

### Readable grey text, in every theme

- **The small grey text is readable now, in every theme.** The greys used for hints, dates, counts, theme descriptions and the notes under fields were failing the standard contrast check — all six themes, between 3.1 and 3.9 where 4.5 is the bar for text that size. Midnight was the worst of them and it's the one you start on. Every theme's two quietest text colours were re-measured against both the panel and the window background and lifted until they pass.
- **Midnight has its own text colours now**, the same way the other themes do. It had been borrowing the near-black theme's neutral greys, which is why they read as flat grey on the navy rather than as part of it.
- **A delete that can't happen says so.** If a theme's file is locked or the folder isn't reachable, you get a note with the path instead of a button that quietly does nothing.
- **Confirmation prompts work on the start screen.** Anything asking "are you sure?" from the screen you land on before opening a project — including the new delete button — had nothing to draw the question with, so it would have waited forever for an answer it never asked for.

### The settings screen

- **Settings is a proper screen now, not one long column.** It was a narrow dialog with four tabs across the top, and *Appearance* alone held five sections stacked inside it — theme, colours, gradients, fonts, sizes, snippets — so the only way through it was to scroll. The dialog is now wide, the sections are down the left-hand side as their own entries, and each one is a page you can see all of.
- **Appearance is four entries instead of one tab**: **Theme**, **Colours**, **Fonts and text**, and **Snippets**. Nothing moved out of Settings and nothing was taken away — the same controls are behind shorter walks.
- **Everything lays out across the width now.** Themes, colour swatches, gradients and font pickers all sit two across when there's room instead of in one narrow stack, and each section says at the top what it's for.
- **The dialog stays the same size when you switch section**, so the list down the side doesn't shift under the pointer. On a small window it goes back to a strip across the top and everything still fits.
- **"Put everything back to default"** now lives at the bottom of **Theme**, fenced off, and says what it covers — theme, fonts, text size and snippets. Files you've made stay in their folders.
- **"Lines" and "Callouts and warnings" look like things you can open now.** They always were — those colours are folded away because most people never touch them — but they were drawn exactly like the headings above them, so they read as sections that had come up empty. Each one now has a chevron that turns, a border around it, and says how many colours are inside.
- The gradient rows open and shut the same way, so there's one idiom in that panel instead of two.
- **Midnight's outlines are visible now — everywhere, not just in Settings.** It was the only theme still using the near-black theme's greys for its borders, and grey on navy barely registers: the faintest of the three was two points apart from the panel behind it. All three are now navy, and pitched slightly stronger than the other dark themes' rather than matching them. You'll notice this across the whole app — card edges, input outlines, the lines between panels — and that's the point.
- **The rows in Colours are filled in rather than just outlined**, so they hold together as blocks even under a theme whose borders are set to something faint. A gradient that's switched on is now tinted like a selected item too, so you can spot the ones doing something without reading twelve checkboxes.

### Colours and gradients in the app

- **You can change a theme's colours and gradients in the app now.** Settings → Appearance has pickers for twenty colours and all twelve gradients — background, top bar, sidebar, page area, properties panel, dialogs, buttons, selected page, tags, page titles, section headings and the callout wash. Each gradient can be a straight line at any angle or a glow from a point, with a see-through slider on each end. Changes land as you make them; there's nothing to save.
- **"Make a copy I can edit."** The six built-in themes ship with the app and can't be changed, so this takes a copy of whatever you're looking at and drops it in your themes folder as a normal `.css` file. Then everything's editable.
- **It's the same file either way.** A theme you build with the pickers is an ordinary stylesheet you can open in Notepad; a theme you wrote by hand, or exported from the sandbox, opens in the pickers. Nothing is locked to the place you made it. If you've hand-written a gradient too fancy for the controls, they say so and leave it exactly alone rather than mangling it.

### Text size and font names

- **Two text-size sliders instead of one — Writing and Interface.** They were the same control, so getting your pages to a comfortable size dragged the menus down with them. Writing also goes further down now (70%, where the interface stops at 85%), since page text starts bigger.
- **The font pickers now tell you what the theme is using.** "Whatever the theme uses" was true and useless — you couldn't tell what Midnight's titles were set in without hunting down a list of 98. It now says *Whatever the theme uses — Domine*, and follows along when you switch theme. The code slot says "your system's own", because that one deliberately asks your computer for its own best monospace rather than naming a face.

## 2026-08-06 — themes, second pass

### Additions

- **Three more dark themes, and none of them is another grey.** *Ember* is warm charcoal with copper and lamplight. *Grove* is deep forest green with old gold. *Nightbloom* is dark plum with orchid and cyan. Each one has its own callout colours rather than the near-black theme's washed over the top, so Info, Quote and Secret still read as three different things.

### Adjustments

- **Midnight is now the theme you start on**, and *Anamnesis Dark* is the other dark one in the list rather than the default. If you've already picked a theme, nothing changes for you — this only affects a fresh install.

### Fixes

- **The text size slider now moves the writing.** It was resizing every label in the app except the one thing you actually look at: the text on the page. The editor was pinned at 16px and to Inter no matter what, which also meant the **Writing** font picker did nothing. Both now do what they say.
- **The white square in the bottom corner of the page tree is gone.** It was the little patch where the two scrollbars meet, which nothing had ever been told to colour, so it came out white on a dark app.
- **Open themes folder / Open snippets folder work.** They were being refused permission and failing silently, so the buttons did nothing at all. If one ever does fail now, it says so and shows you the path so you can paste it into Explorer.

## 2026-08-06 — after v0.2.1

### Additions

- **Settings → Appearance, and themes you can make yourself.** New tab in Settings. It has a theme picker, a font picker for titles / interface / writing / code, and a text size slider — but the part that matters is that **a theme is just a file**. Build one in the sandbox, press *Show me the CSS*, save it in `Documents\Anamnesis\themes` as any name you like, and it turns up in the list. No editing it first, no asking anyone. There's an **Open themes folder** button so you never have to find it yourself. Delete the file and the theme's gone; that's the whole system.
- **Snippets.** A `.css` file in `Documents\Anamnesis\snippets` gets its own on/off switch and sits on top of whichever theme is on. For changing one thing without making a whole theme.
- **All 98 fonts now ship inside the app.** They used to live only in the sandbox, so a theme that used one would have looked right there and wrong in the real thing. Now anything you pick renders exactly as it does in the sandbox, on any machine, with nothing to install. (Your Windows-only fonts still can't be — those are marked in the sandbox and always have been.)
- **Three themes to start from.** *Anamnesis Dark* is what the app has always looked like and is still what you get. *Midnight* is the one you made — deep navy, teal, Domine and Lexend and Quicksand. *Daylight* is a proper light mode: light background, dark text, and its own callout colours rather than the dark ones washed out.
- **Gradients work in the real app now, on all twelve surfaces** the sandbox offers — background, top bar, sidebar, page area, properties panel, dialogs, buttons, selected page, tags, page titles, section headings and callouts. Whatever you turn on in the sandbox is what you get.
- **Text size slider.** Makes the writing and labels bigger or smaller without inflating the panels and spacing around them.

### Adjustments

- **The sandbox's exported CSS is now a finished theme file** rather than something to send back. Fonts and sizes go inside the theme instead of a separate block, and the file tells you where to save it. Text size comes out as a multiplier, so a theme's size and the Settings slider stack instead of one overriding the other.

### Fixes

- **Themes can't phone home.** A stylesheet can quietly load fonts and images from the internet, which would mean a downloaded theme reporting back every time you opened your wiki. Anything in a theme or snippet that points at the internet is stripped before it's used, and Settings tells you exactly what was removed. Nothing about you or your worlds leaves your machine — that hasn't changed and this is what keeps it true now that themes are files anyone could hand you.

## 2026-08-06 — sandbox

*(Not in a release — these live in the repo and affect this machine only.)*

### Additions

- **98 more fonts in the theme sandbox.** The font pickers used to offer three bundled faces and whatever Windows had lying around. Now there's a proper library sitting inside the sandbox: 23 serifs built for reading, 26 sans-serifs, 29 display faces for titles (Cinzel, Uncial Antiqua, Grenze Gotisch, Bodoni Moda, Pirata One and friends), 10 handwriting faces and 10 monospaces. They're grouped, each name is shown in its own lettering so you can browse the list itself, and every slot has a sample line underneath at a size where you can actually see what the letters are doing. **Every font in those groups is free to ship** — pick one and it's a five-minute job to bundle it for real. The last group is still your Windows fonts, marked `·`, and those can't legally be shipped, so they'd turn into something else on anyone else's computer. The sandbox says which is which, and so does the CSS it hands you.
- **Gradients on twelve things instead of three.** App background, top bar, sidebar, page area, properties panel, dialogs, main buttons, the selected page in the sidebar, tags, page titles, section headings, and a wash over callouts. Each one can be a straight line at any angle *or* a glow spreading from a point you choose, with an optional third colour blended through the middle, and every colour has a see-through slider — drag one end to 0% and the gradient fades out instead of stopping. Tick a box to turn one on, click its name to open its controls, and there's a **Turn them all off** button for when it's got away from you. Switching palette now recolours every gradient to match instead of dragging the old scheme's colours along.

### Fixes

- **The sandbox's "blend a third colour" now visibly does something.** On some gradients the extra colour was being seeded to a colour already in use at one end, so ticking the box changed nothing.

## 2026-08-05 — after v0.2.1

*(Shipped in v0.3.0, apart from the theme sandbox — that's a file in the repo you open by double-clicking, not part of the installed app.)*

### Additions

- **A theme sandbox, for playing with how the app looks without touching the app.** It's a single file — `sandbox/theme-sandbox.html` — that you double-click to open. No install, no internet, nothing to start up. There's a mock of the app on the right and every dial on the left: six complete colour schemes to start from (the dark one it uses today, plus Light, Parchment, Foxian, Belobog and Deep Space), a font picker for titles / interface / your writing / shortcuts, sliders for text size, line spacing, roominess and corner rounding, gradients for the background, buttons and title text, and a box where you can type your own CSS and watch it apply live. It saves as you go, so you can close it and come back to it. When something looks right, **Show me the CSS** hands you a block to send back, and it becomes a real theme you can switch to in the app. **It can't affect your projects or the installed app** — it's a separate file that only knows how to draw a picture of one.

### Renames

- **The app calls a world a "project" everywhere now.** It mostly did already, but not quite: the sidebar's right-click menu said "Export **world** to LegendKeeper" while the start screen right next to it said "Open an Anamnesis **project**", and the import screen said "Writing your world to disk" while the box you type the name into was labelled "Project name". Six places said world; eighty-nine said project. They all say project now — the sidebar export, the import progress messages, Settings → Projects, and the reassurance line on the update screen. Nothing moved and nothing on disk changed; the folder is still `Documents\Anamnesis\YourProjectName`, same as it was.
- **A LegendKeeper import with no clear root is called "Imported Project"** instead of "Imported World". You'd only ever see this on a malformed `.lk`, and you can rename it before confirming either way.

## 2026-08-04 — after v0.2.1

*(Shipped in v0.3.0.)*

### Adjustments

- **All eight templates have new writing prompts.** Every prompt in every template — the little blue intro line, the quote box, the headings, the questions under them — was rewritten. The old ones came straight out of LegendKeeper, word for word, which was the one thing in this project that was genuinely someone else's; now none of it is. They're also just better prompts: shorter, more specific, and they ask for the odd concrete detail instead of a list of attributes. "Physical description; things like eye color, hair color, hair style, physical mannerisms" is now "what do they look like — go for the detail someone would still remember a week later." **Pages you've already made don't change.** Templates only fill in a page when it's first created, so everything you've written stays exactly as it is; this is what *new* pages will start with.
- **The Secret block stops claiming it hides things.** Its placeholder text used to say the contents were "information that only admins can see," which was never true — there are no admins, it's your app, and the purple box is a marker for you, not a lock. It now says what it actually is, and points at hiding the whole tab as the thing that genuinely holds material back.
- **The Map tab lost its leftover note.** New Location pages came with an italic line reading "in the real build, this tab would render an interactive Leaflet map with pins" — a note-to-self from the very first prototype that shipped by accident and described a feature that doesn't exist. Gone; the tab just says to drop an image in, or delete the tab if the place doesn't need a map.
- **The README stops selling the app as a LegendKeeper substitute.** It opened with "the shape of LegendKeeper without the subscription" and later said "if you know LK, you know Anamnesis" — both true, both an invitation for a lawyer's letter, and both making your app sound like a knock-off rather than a thing you built. It now describes what Anamnesis is on its own terms and mentions LK where it's actually relevant: it reads and writes their file format, so your world comes across. The "not affiliated" notice stays, and is still complimentary about them.
- **Titles are in the serif now — the one from the start screen.** Anamnesis has been shipping a second font, Fraunces, since the very first build, and using it for exactly one word: "Anamnesis" on the start screen. Every other title in the app — every page title, every folder title, the heading on every dialog — was Inter, the same font as the buttons and the sidebar and everything else, just larger. That's most of what "the fonts are lame" was pointing at, and it was literally true: the app was a wall of one sans-serif. Page titles, folder titles, and the Import / Export / Settings headings are all in Fraunces now. It's a little lighter than before, because a serif at that size carries a lot more weight than Inter does at the same number and the old setting came out shouting. **Renaming a page keeps the same look** — the title used to change font and size the moment you clicked into it, which nobody would call a feature.
- **Everything has room to breathe.** Text in this app has been sitting at whatever spacing the browser felt like, which is tight — that's why Settings, the properties panel and the import preview all read as cramped and a bit claustrophobic. There's now one setting for it, applied everywhere, and it's roomier. This is the change you'll notice least consciously and most overall.
- **Keyboard shortcuts and file paths are in a typewriter font.** `Ctrl+K` in the top bar, the whole shortcut list in Settings → Keyboard, and the folder paths on the start screen and in Settings → Projects. They were in Inter, which is a font where letters are all different widths — so a column of key combinations never lined up, and a path was just a grey smear. They line up now.
- **The Settings heading matches the other dialogs.** It was the smallest title in the app despite Settings being the biggest dialog: 16px against Import's 18px. All three are the same now.
- **Every button in the app is the same button now.** There were nine slightly different versions of what is really one grey button — different corners, different greys, different padding — because each screen built its own instead of sharing. Same story for the little **×** buttons: seven of them at seven different sizes, from 18 pixels to 32. And every dialog was its own width: six dialogs, six widths, two different amounts of padding. There's now one set of each, so a button in Settings and a button in the import dialog are actually the same button, and dialogs come in three sizes instead of six. The visible effect is small on any one screen and fairly large across all of them — things line up, and hovering anything means the same thing everywhere instead of one of five things depending on where you are.
- **More air, everywhere.** Spacing was typed by hand on every screen — 245 separate measurements across nineteen different values — so nothing quite agreed with anything else. It's now one set of eight sizes. Where a screen had an odd in-between value it moved to the nearest one, and that mostly meant *up*: dialogs, Settings and the properties panel all have a bit more room than they did. This is the second half of the "room to breathe" change above.
- **Borders have a hierarchy.** Every line in the app was the same grey at the same thickness — the divider between the sidebar and the page, the outline of a text box, the underline under a row of tabs, all identical. That's the "the borders are ugly" thing: none of them is ugly on its own, there was just no sense of which lines are the building and which are the furniture. Now there are three weights: the app's frame is slightly brighter, the lines *inside* a panel are slightly dimmer, and everything else sits between. It's subtle on purpose. These will get properly tuned when the themes land.
- **Corners, text sizes and small labels stopped disagreeing.** Under the hood the app had eleven different text sizes and nine different corner roundings written thirteen different ways, so a card, a button and a text box sitting next to each other were often all rounded slightly differently — not enough to name, enough to read as sloppy. There's now one small set of each, and everything picks from it. What actually changed on screen is minor: folder titles went up a touch to match page titles, the search box came down a touch, and the little grey ALL-CAPS labels (on the start screen, in the import preview, above each property) now agree on one size instead of using three.

### Renames

- **The project name is only in one place now.** It was in the top bar *and* in the sidebar header, about fifty pixels apart, saying the same thing twice. The sidebar keeps it — that's the one with the home button and the add-page button next to it, and it's the heading for the tree underneath. The top bar's left side is empty for now, on purpose: back and forward buttons and a breadcrumb are already planned for it, and filling it with something invented in the meantime would just mean removing that later too.

### Fixes

- **The window stops hiding panels on you.** If the window got narrow the properties panel disappeared, and narrower still, the sidebar — no warning, no way to get them back except making the window bigger again. Gone. (It turned out this could never actually happen to you: the window can't be dragged below 900 pixels wide, and these only kicked in below 700. But it was there waiting for the day somebody changed the minimum.)
- **The line under the top bar is straight.** Where the top bar met the sidebar's tabs, the bar underneath them stepped down by seven pixels and then carried on — one horizontal rule across the window, broken, at the exact seam between the two halves of the app. That's the thing that looked wrong in the second screenshot and was hard to name. The two are the same height now.
- **The sidebar tabs stop twitching.** Clicking between Project, Templates and Assets nudged the word you clicked up by a pixel, because the teal underline was being added *to* the tab rather than drawn under it, making the active one slightly taller than its neighbours. The other two tab strips in the app were already doing it the right way; all three now match.

## 2026-07-31 — after v0.2.1

*(Shipped in v0.3.0, apart from the two Desktop shortcuts — those are scripts in the repo for this machine.)*

### Fixes
- **The scroll wheel works again. That one was my fault.** Pinning the window down so it couldn't scroll — from the scrollbar fix below — turned out to break scrolling entirely, and the reason is embarrassing in a useful way: **no part of the app was actually scrolling on its own.** Not the page, not the right-hand panel. The three-column layout had nothing telling it to stop at the height of the window, so a long page just made the whole layout taller than the window and spilled out the bottom — and the thing quietly rescuing that was the *window's own* scrollbar. The ugly scrollbar wasn't decoration. It was doing all the work. So removing it removed the only scrolling in the app. Now the layout is properly told to stop at the window's edge, and the page and the properties panel each scroll inside their own box, which is what should have been happening all along. The start screen scrolls too if your window is short enough to need it — same bug waiting to happen, fixed at the same time.
- **The white box is gone. All of it, this time — not the one you just found.** It's been fixed three times now: the sidebar rows, then the sidebar list, now the import dialog's name field. Same bug every time, killed one hiding place at a time. It's your browser's own "this is the thing the keyboard is pointing at" marker, and it's drawn in white because nothing ever told it otherwise — so it turned up on anything nobody had specifically styled, which was most of the app. There were five boxes left that had no styling of their own at all: the project name when importing, the project name on the start screen, the sidebar's find box, renaming a page in the tree, and the property type dropdown. Rather than do a sixth round of whack-a-mole, the rule is now set once for the whole app: nothing anywhere gets the white ring, and anything you reach *with the keyboard* gets a teal one instead. That last part matters — the marker exists for a reason, and the app has to stay usable without a mouse. So clicking a button doesn't light it up, but tabbing to it does; a text box you've clicked into gets a soft teal ring, because a box holding your cursor should look like it is. Anything that already had its own look — the teal highlight in the sidebar, the Settings tabs — keeps it untouched.
- **Things fade now instead of snapping.** There were five animations in the entire app, four of them progress bars. Every hover everywhere — every button, every row in the sidebar, every tab — changed instantly, which is a surprising amount of why the whole thing felt cheap and unfinished. Hovering now eases over about a tenth of a second. Nothing moves or resizes; it's only colour and fade, so nothing shifts under your cursor.
- **The scrollbars on the tab strips are gone — that was a fourth, separate cause.** The three fixed below were real, but none of them was this one, which is why a bar was still sitting next to your page tabs and next to the Settings tabs afterwards. Both of those strips can scroll sideways, so that tabs you can't fit stay reachable. What nothing warned about is that asking for sideways scrolling silently turns on up-and-down scrolling as well — and the teal underline on the active tab hangs one pixel below the bottom edge of the strip. One pixel of overflow, on a bar 31 pixels tall, is enough to earn a full-height scrollbar. The underline now sits *on* the edge instead of a pixel past it, and both strips are told in as many words that they don't scroll vertically. Looks identical, minus the bar.
- **Recent projects you can actually tell apart.** Three worlds all called "Valeraverse" is normal — importing the same one twice keeps its name both times — but the only thing separating them on the start screen was a sixty-character folder path, set tiny and broken across three lines mid-word. It now shows the folder each one lives *in*, on a single line: `…\Anamnesis\testval2` against `…\Anamnesis\TESTval`. That's the part that actually differs. The full path is still there if you hover.
- **The import progress bar is visible now.** It was being filled with the faint background tint rather than the teal, so on a dark track it came out about one shade off the empty bar — a progress bar you couldn't see the progress on. The download bar in Settings → Updates had it right; the two now match.
- **That scrollbar in Settings, and the ugly one everywhere else.** Three separate things were wrong and all three are fixed. **One:** the app's scrollbars were never actually styled. `index.css` set up a nice thin dark one *and*, on the same line, two properties that make Chromium throw that styling away and use the Windows default instead — the wide one with a little arrow button at each end. That was every scrollbar in Anamnesis, not just this one. **Two:** Settings scrolled as a whole rather than just its contents, so on a short window the title and the tab strip would slide away and leave you scrolling a settings screen with no idea which tab you were on. Only the panel scrolls now, and only when it actually has to. **Three:** nothing was stopping the *window itself* from scrolling. This is a desktop app — the document should never scroll, only the panels inside it — but nothing said so, so anything overflowing by a single pixel drew a bar down the side of the whole app, right next to whatever modal happened to be open. It's nailed down now.
- **An import now tells you it's working, and takes a fraction of the time.** Bringing in a world with pictures meant up to a minute of a window that looked like it had died — no counter, no bar, nothing moving, because the only thing on screen was one line of text that never changed. Two separate reasons, both fixed. The pictures were being fetched from LegendKeeper's servers **strictly one at a time**, so 53 of them meant 53 round trips end to end; six now come down at once, which is most of that minute back. And the screen now counts them — "Fetching pictures — 31 of 53" with a bar that fills — then says when it's writing to disk. Choosing the file says something too: unpacking a big `.lk` holds the window still for a few seconds, and it now warns you that's about to happen instead of just going quiet.
- **A long Summary wraps onto more lines instead of scrolling off sideways.** Summary was built as a strictly one-line box — anything longer than the sidebar is wide just slid out of view to the right, with no way to see the rest of it. It's a proper multi-line box now, on Summary for every kind of page. Nothing you've already written changed; it was always saved in full, just not shown in full.
- **Pages could disappear after moving things around. Fixed, and the ones that already went missing came back.** If a move got interrupted partway — most likely by OneDrive holding a folder open while it synced — Anamnesis stopped halfway through and left some pages under a temporary internal name. They were never deleted; they sat on disk, intact, while the app walked straight past them because the temporary name doesn't end in `.json`. Four things in your `test3434` project were sitting there, and they're all back where they belong. Four things now stop this happening again: a move that can't finish puts everything back where it started rather than abandoning it; anything already left in that state is found and restored the next time you open the project, and told to you rather than done behind your back; **any** failed save now shows you the red warning, which is the real reason this was able to bite — the app knew the move had failed and said nothing; and the warning covers every kind of change now, not just typing.
- **A page dropped onto a page that can't hold pages no longer vanishes.** Some pages are containers (folders, characters, locations, factions, species) and some aren't (notes, items, events, blanks). Dragging a page onto one of the second kind used to look like it worked, and then the page was gone from the tree the next time you opened the project. It's now refused at the point of dropping. This had already happened once in Valeraverse: **Xuěhuā** had been dropped onto **Valera Jiang**, who's a note. She's back, sitting next to Valera Jiang rather than underneath her — if you want her nested there, Valera Jiang needs to be a Character rather than a Note first.
- **Opening a project reads one less folder**, since the `assets` folder never holds pages and no longer gets looked through.
- **The white box around the whole sidebar list is gone too.** Same cause as the one below, on a different piece: the list itself can hold the keyboard's attention as well as the individual rows can, and removing the outline from the rows left the one around the list. There were exactly two things in the sidebar that could show that outline, and now neither does. Nothing is lost by hiding it — the moment the list takes focus it hands it straight to a row, so the row marker was always the one doing the actual work.
- **The white box around the page you last clicked in the sidebar is gone.** That was your browser's own "this is the focused thing" outline, drawn in its default white because nothing had told it otherwise. It was always there — it only became obvious once you could select several pages at once, because the outline and the teal highlight stopped being the same row. Now the teal highlight does the job on its own, and a page that's focused *without* being selected (which happens when you're moving around with the arrow keys) gets a quiet teal outline instead of a white one.
- **No more white flash when Anamnesis opens.** Starting the app meant a few hundred milliseconds of blank white before the dark theme appeared — which, on a dark app at night, is a camera flash to the face. Three separate things caused it, and all three are fixed: the window itself was painting white before anything was drawn in it, the page was white before the stylesheet loaded, and the window appeared before either had happened. The window now stays hidden until there's something to show, and everything behind it is already dark. It also has two independent ways to appear, so it can't get stuck invisible.
- **The window is called "Anamnesis" now**, not "Tauri + React + Typescript" — the placeholder title from the very first scaffold, still there eight phases later.

### Additions
- **Importing from LegendKeeper stops making you go and find a folder.** Pressing Import used to open a folder browser with nowhere in particular in mind, so it opened wherever Windows was last — which, since you'd just fished the `.lk` out of Downloads, was Downloads. Every single import meant clicking your way back to Documents before anything happened. Now it doesn't ask. The preview screen tells you where the world is about to land, and pressing **Import** puts it there. If you want *this one* somewhere else there's a **Change** next to the folder — that's a one-off and doesn't move where everything else goes. There's a new **Settings → Projects** for that: it shows the folder new and imported worlds get saved into, with a **Change folder** button and a **Reset to default** if you want `Documents\Anamnesis` back. Worlds you already have don't move — this only decides where the next one lands. **New project** on the start screen was already skipping the folder browser and quietly using `Documents\Anamnesis`; it now uses whatever you've set here too, so the two finally agree. **And the folder gets made for you.** `Documents\Anamnesis` was only ever a name the app had in mind — nothing actually created it, so on a fresh install a folder browser pointed at it opened one level up in Documents and left you to right-click → New folder your way out. It's created before anything needs it now.
- **Ctrl+Z undoes what you did to the sidebar.** Deleted the wrong page, dragged something into the wrong folder, renamed something and immediately regretted it — **Ctrl+Z** puts it back, and **Ctrl+Y** does it again if you undid one too many. It covers adding a page, deleting pages, renaming, moving, duplicating, colouring, and setting your home page, including when you did any of those to several pages at once. It goes back **25 steps**, and it starts fresh each time you open a world. **Deleting a page brings its picture back too** — the file is kept aside when you delete, not thrown away, so undo restores the whole page rather than a version of it with a hole where the portrait was. The top bar tells you what happened ("Undid deleting 2 pages"), including when there's nothing left to undo, so the key never just silently does nothing. **The one thing to know:** while your cursor is in a page's writing, Ctrl+Z belongs to the writing — same as it always did, and the same as in any other app. Click into the sidebar, or anywhere that isn't a text box, and Ctrl+Z goes back to being about pages. Both keys can be changed in Settings → Keyboard like the others. What it *doesn't* cover yet: properties in the right-hand panel, tags, and tabs. Those are still one-way.
- **You can change any keyboard shortcut, in Settings → Keyboard.** Every shortcut Anamnesis has is listed with the keys it's on and a button showing them — click it, press whatever you'd rather use, done. The little arrow next to each one puts it back, and there's a **Reset all to defaults** if you'd rather start over. The whole screen works without a mouse: Tab reaches everything, Escape backs out of setting a key without closing Settings. **One rule worth knowing, and it's a deliberate compromise.** A shortcut has to have **Ctrl** held down — a plain letter would fire every time you typed it, and this app is mostly a text box. But two-key combinations are exactly the thing that's awkward if your hands don't like them, so **the function keys F1 to F12 are allowed on their own**. Those don't collide with typing, so they're the one-key option if you want one. Anamnesis will also turn down a key that's already doing something: if it belongs to another shortcut it says which one, and if the editor uses it while you're writing (Ctrl+Z and friends) it says that instead of quietly stealing your undo. It'll keep listening after it refuses, so you can just try another key rather than starting again.
- **Two more shortcuts: Ctrl+N makes a page, Ctrl+S saves.** **Ctrl+N** opens a small **New page** box asking which template you want, and puts the new page *next to* the one you're on — same folder, same level — then opens it. That's the half the sidebar couldn't do from the keyboard: the **+** on a row has always meant "put one *inside* this", and there was no way to say "another one alongside this" without the mouse. Nothing selected means it goes at the top level. The template list is focused the moment the box opens, so you can Tab to what you want and hit Enter, and Escape backs out. **Ctrl+S** is a bit of a formality — Anamnesis already saves as you type, about a third of a second after you stop — but it writes anything still waiting *right now* and flashes **Saved** in the top bar so you can see it happened. If a save fails it stays quiet and lets the red warning speak instead, rather than telling you two different things at once. Both keys can be changed; that's coming next.
- **You can search everything you've written, not just page names.** Press **Ctrl+K** anywhere — or click the new **Search** button in the top bar, which has the shortcut written on it — and type. It looks through every page's name, its tags, *and* the actual text on every one of its tabs, which the sidebar's find box never did. Results show which folder each page lives in and, when the match was in the writing rather than the title, the sentence it found with your words picked out in teal and the tab it came from. Pick one and it opens that page **on that tab**, so a match buried in Backstory doesn't dump you on Overview to go hunting. Arrow keys move down the list, Enter opens, Escape closes, and starting with `#` searches tags only — the same way the sidebar box already works. Two things worth knowing about how it matches: page names are forgiving, so a half-remembered spelling still finds them, but the text on pages is matched exactly as you type it. That's deliberate — being loose across thousands of words finds a scattering of letters in unrelated paragraphs and calls it a hit, which is worse than finding nothing. And it does search tabs you've hidden, since hidden means hidden from the page, not from you; those results say "(hidden)" next to the tab name so it's never a surprise.
- **You can send your world back out to LegendKeeper.** Right-click any page and choose **Export to LegendKeeper** — you get a `.lk` file, the same kind you imported from, which LegendKeeper can read. Right-click your world's name at the top of the sidebar instead and it takes everything. Exporting a page always brings the pages underneath it too, and there's nothing to tick or configure, because LegendKeeper's own `.lk` export works exactly that way — no subpage option, no picture option, nothing. Before it writes anything you get a screen showing what's about to go and anything that won't survive the trip, so nothing disappears without being named. **Pictures are the one real limit, and it's LegendKeeper's, not ours.** A `.lk` file doesn't actually contain your pictures — it contains web addresses pointing at LegendKeeper's own servers. So a picture that *came from* LegendKeeper goes home fine, because Anamnesis now remembers where it came from; a picture you added here has no address to give, and gets left out with a count telling you how many. Your Valeraverse was imported before that remembering existed, so it'd need importing once more to pick it up — which it needs anyway, for the home page (see above). One re-import covers both. Tested with your real Valeraverse: all 75 pages out and back with the tree, templates, tabs and tags identical, and all 33 pictures and 20 banners intact. Worth knowing where the testing stops, though: that's Anamnesis reading its own file back. Nobody has yet fed one of these to real LegendKeeper, because that needs an account with a live world to import into.
- **You can select more than one page at a time.** Ctrl-click to add pages to a selection one by one, shift-click to take everything between two of them — the way file explorers have always worked, and the way the sidebar should have from the start. Once you've got a few: drag them somewhere new all at once, colour them in one go, or delete the lot with a single "are you sure" instead of one per page. Right-clicking inside your selection keeps it and the menu tells you how many pages it's about to act on; right-clicking anywhere else drops the selection and acts on just that page. The things that only make sense one at a time — renaming, duplicating, adding a child page, setting the project home — quietly step out of the menu while several are selected rather than sitting there doing something surprising. The page on screen follows whichever row you touched last, so you can still read one page while gathering up others.
- **Your world can have a home page.** Right-click any page and choose **Set as project home** — it gets a little house next to its name in the tree, a "Home" tag beside its title, and the house icon at the top of the sidebar becomes a button that takes you straight back to it from anywhere. It's the LegendKeeper arrangement: home isn't a separate kind of thing you fill in, it's whichever page you point at, and you can point somewhere else whenever you like. Right-click the current one and the option reads **Remove as project home** instead. The page stays exactly where it lives in the tree, nested wherever you put it, and deleting it just means your world has no home page again — nothing else breaks.
- **Importing from LegendKeeper now brings your home page with it.** LK's own project home used to half-vanish on the way in: its name became your project's name, and its text either arrived as a stray page called "Home" or didn't arrive at all. Now it comes across as a real page, already set as your project home, sitting at the top of the tree. Two things fall out of that. **Cross-references that pointed at your project home work again** — there were 15 of them in Valeraverse, and they'd been arriving as plain text with nothing to link to, because the thing they pointed at didn't exist yet. And if your LK home page still has their stock "Welcome to LegendKeeper" tutorial on it, **that doesn't come across** — you get an empty home page to write on instead of their onboarding text and links to their demo world, and the import preview tells you that's what happened. To pick any of this up in Valeraverse you'd need to import it again; the copy you have was brought in before this existed.
- **Two shortcuts on the Desktop, so opening the current version doesn't need anyone else.** Until now the only Anamnesis you could open by yourself was the one in your Start menu, and that only changes when a release gets published — which is meant to be occasional. So the copy you could reach was always behind, and the up-to-date one needed a terminal. **Anamnesis (latest code)** fixes that: double-click it and the app opens running the newest code, no release involved. It leaves a black window open while it runs — that window is the app, so closing it closes Anamnesis. **Update installed Anamnesis** does the other version: it rebuilds and installs over your Start-menu copy, taking a few minutes but leaving you with the ordinary app, up to date, with nothing to keep open. Releases go back to being only about *other people's* copies finding an update, which is all they were ever for.

### Adjustments
- **Phase 10 is finished, which means Anamnesis is done being a work in progress and is now just an app.** You added the signing key, which was the last piece and the only one nothing in the project was allowed to do for you. Everything a person needs to actually use this exists: they can install it, it tells them when there's a newer version and installs it for them, and their world never leaves their computer. The docs have been squared up to match — the plan no longer lists Phase 10, `docs/shipped.md` has the full record of what it delivered, and the README stopped claiming two things that weren't true. It said the app makes no network calls at all, which stopped being right the day the update button shipped; it now says the honest version, which is that there are exactly two and both need you to press something. And it advertised hover previews on `[[wikilinks]]`, which have never existed — that's Phase 14, and the README will get to say it once it does. Also added to the feature list: search, changeable shortcuts, and sidebar undo, all of which shipped today and none of which the README mentioned.
- **Releasing a new version is three commands now, and it builds for Mac and Linux too.** It used to be a careful half-hour: change the version number in three separate files without missing one, remember to set an environment variable before building or the update gets rejected by everyone as unsigned, then hand-write a small file with a signature pasted into it — and repeat the whole thing per platform, which in practice meant Windows only. So `latest.json` never mentioned Mac or Linux, and a Mac looking for an update would have found no entry for itself at all. Now it's `node scripts/set-version.mjs 0.3.0`, commit, push a tag. GitHub builds all four (Windows, Mac Intel, Mac Apple Silicon, Linux), signs them, writes that file properly, and leaves a **draft** release for you to look over and press Publish on — nobody's update button sees it until you do. If the tag and the version files disagree it says so in about ten seconds rather than after twenty minutes of building. **One thing needs you before the first one works:** the signing key has to be copied into GitHub's secrets, which only you can do, since nothing in the repo is allowed near it. [docs/releasing.md](docs/releasing.md) has the steps and it's about a two-minute job.
- **Settings is split into tabs instead of one long list.** It had two sections stacked on top of each other and was about to get more, so **Keyboard** and **Updates** are now tabs across the top — you see one thing at a time and the rest stays out of the way. Adding the next section is one line, so this doesn't go back to being a pile. It works from the keyboard the way tabs are supposed to: Tab gets you to the strip, then the **left and right arrows** move between tabs — you don't have to Tab past every section name to reach the one you want. Setting a shortcut still swallows the arrow keys while it's listening, so pressing one there tries to bind it rather than sliding you onto another tab.
- **The next thirteen phases are written down.** Nothing about the app changed yet — this is the plan for everything after Phase 10, worked out from your list of wants and your LegendKeeper screenshots. In order: **making it ours** (your own wording in the templates, so nothing in the app is anyone else's writing), **themes** (the switcher first, deliberately, so trying a look and hating it costs nothing — gradients included), **property types** (number, select, multi-select, status, and finally showing Created and Updated, which were already being saved and never shown), **everyday navigation** (back/forward/home, double-click to expand, resizable sidebars, hover previews, bookmarks), **the full right-click menu**, **image and tag buttons**, **the Templates and Assets tabs**, **sidebar blocks** (meters, gauges, ratings, backlinks — the big one), **a safety net** (version history and snapshots), **markdown import**, **the shell rework** (left rail, splittable columns), **collections**, and **graphs**. Timelines are parked until dates are a real thing rather than free text, the whiteboard is on the someday list, and World Anvil import is dropped — its export turned out to be a whole second language to parse, with broken apostrophes to repair on top, and you decided it wasn't worth it. Its enormous list of character fields gets raided for property suggestions anyway. [docs/plan.md](docs/plan.md) has all of it, with the reasoning.
- **`CLAUDE.md` lost 19 lines it didn't need.** Nothing about the app changed — this is the file Claude reads at the start of every session working in this repo, so anything in it that's already stated elsewhere costs budget on every single session for nothing. Three bullets under "Don't Do This" were word-for-word repeats of rules stated further up the same file; the naming table described what a look at `src/` already shows, so the one part of it that *isn't* guessable (no barrel files, no `utils`/`misc`/`helpers`/`common`) moved up to join the other architecture rules; and the deployment section listed the installer types Tauri produces by default, keeping only the part that's an actual decision (no CI/CD in Phase 1).

## 2026-07-31 — v0.2.1

### Additions
- **The settings cog reaches an installed copy.** It landed in the code just after v0.2.0 was built, so it existed in the project but in no version you could actually run. This release is the one that carries it. If you're on 0.2.0, the update check will now find this — which also makes it the first time the download-and-install path has run for real rather than only in tests.

## 2026-07-31 — v0.2.0

### Additions
- **First published release.** Anamnesis is now downloadable from the project's [releases page](https://github.com/Shirohibiki-chan/anamnesiswiki/releases/tag/v0.2.0) rather than only existing on the machine it was built on. This is version 0.2.0; the version number is what the update check compares against, so from here on newer releases will be found when you press the button.
- **A settings cog.** There's now a settings panel, reachable from a cog in the top-right of the start-up screen and from the top bar once you're inside a world. Right now it holds one thing — the update check — but it's a real settings screen with room to grow, rather than a button bolted onto a corner. Escape or a click outside closes it.
- **"Check for updates", inside settings.** Anamnesis can now tell you when a newer version exists, and install it for you. It's the Obsidian arrangement: nothing happens on its own — you press the button, it asks whether there's a newer version, and if there is you get the version number, what changed in it, and a **Download and install** button. It downloads, installs, and offers to restart. If you'd rather not, **Not now** and it forgets about it. If you're offline it just says so and shrugs; nothing about the app stops working, since it never needed the internet in the first place. Worth saying plainly: this sends nothing about you. It's a request for one small public file on the Anamnesis releases page — no account, no identifier, nothing about your worlds, and nothing at all unless you press the button. And updating only ever replaces the app itself; your project folders aren't touched.

### Adjustments
- **Written down why the update system has a signing key**, so it doesn't get quietly "tidied away" later by someone who doesn't know what it's for. The key is what lets the app confirm an update really came from you before it installs it. The alternative — dropping the install half so the button only checks and then opens the download page — was weighed and turned down; that's now recorded alongside the reason, including why the tempting middle option (install updates but skip the check) is the one thing that must never ship.
- **The "no internet, ever" rule is now written as what it actually means.** The project's own rules said the app must make no network calls at all, which lumped four unrelated things together — analytics, crash reporting, downloading fonts, and checking for updates — and banned them as one. Three of those deserve banning: they either send your data somewhere or make the app depend on a connection to work. Checking for updates does neither. The rule now says the real thing: nothing about you or your worlds ever leaves your computer, the app must stay completely usable offline, and any connection at all only ever happens because you pressed a button that asks for one. There are exactly two of those, both of which show you what they're doing: importing pictures during a LegendKeeper import, and this update check.

## 2026-07-30

### Additions
- **Anamnesis is now a real app you can install.** Up to this point it only ran from a developer terminal, which meant you couldn't open it yourself. There's now a proper Windows installer — run it once and Anamnesis lands in your Start menu like any other program, with its own icon, no terminal involved. Windows will show a blue "Windows protected your PC" box the first time; click **More info** then **Run anyway**. That's because the installer isn't code-signed (the certificates cost a few hundred a year and this is a hobby tool) — it isn't a sign anything's wrong, and it only asks once. Installing a newer version later just goes over the top; your worlds live in your own folder and are never touched by it.
- **Phase 8 — import from LegendKeeper:** there's now an "Import from LegendKeeper" button on the project picker screen. Pick your `.lk` export, and it shows you a preview first — how many pages it found, what type it guessed each one is, a little tree to eyeball the structure, and a plain-language list of anything that won't come across 100% perfectly. Confirm, pick a name and a folder, and it builds the whole thing as a brand-new project: every page, every tab, text formatting, cross-reference links between pages, sidebar fields like Summary/Friends/Homeland, and pictures (fetched once from LegendKeeper's own servers during this one action — nowhere else in the app talks to the internet). LegendKeeper's collapsible sections come in as real collapsible sections here too, not flattened. Pages now also support a full-width banner image at the top (separate from the small picture in the sidebar) — drag on it to reposition, on any page, not just imported ones.
- **Phase 7 — real templates:** every template (Character, Location, Faction, Item, Event, Species, plus Folder and Note) now comes pre-filled with its actual starter tabs and prompts instead of one empty "Main" tab. There's also a new "Blank" option for starting a page with nothing on it — you can apply a template later from the sidebar whenever you want one, and it'll only add what's missing rather than touch anything you've already written. Pages can now have tabs added, renamed, deleted, and dragged into whatever order you like. And you can add your own one-off fields to a single page's sidebar (pick Text, Long text, References, or Date, give it a name) beyond whatever its template normally shows.
- **Phase 6 — properties panel:** every page (except folders) now has a right sidebar with real fields instead of an empty placeholder. Drop a picture at the top (or click to browse) — it shows at its own size, no forced square crop. Below that, whatever fields that page's type comes with: a Summary line, and cross-references to other pages like Friends, Leader, Members, Owner, Where, Participants, or Homeland depending on the page type — type a name to search, click to add, click the × to remove. Tags always sit at the bottom, same add-and-remove pattern. The breadcrumb trail at the top of a page (ProjectName › Folder › Page) is now clickable too — click any part of it to jump straight there.
- **Phase 5 — real writing editor:** pages now use a real block-based editor instead of a plain text box. Type `/` for a menu of blocks — headings, bullet/numbered lists, quotes, code blocks, and more — plus three custom highlight blocks: **Info** (blue), **Quote** (grey, italic), and **Secret** (purple, tagged 🔒 SECRET). Type `@` to pull up a list of every page in your project and drop in a clickable link to one — the link always shows that page's current name, even after a rename, and greys itself out if the page gets deleted. Type `[[` for the same picker Obsidian-style, narrowing as you type; finish with `]]` to grab the top match, or press Enter/click one directly. If you type out a full, unique page name in double brackets it links automatically — if more than one page shares that name, it's left as plain text rather than guessing which one you meant.
- **Phase 4 — page view:** clicking a page in the tree now shows a real page instead of an empty placeholder — a breadcrumb trail, a title you can click to rename, a tab strip (with an eye icon to hide/show each tab, dimmed and italic when hidden), and a text box to write in. Clicking a folder shows its name and an "Add a page" button instead. New pages start with one "Main" tab for now — real template-defined tabs (Overview, Backstory, and so on) come with Phase 7. Writing in a page still autosaves the same way everything else does; the text box itself is a stand-in until Phase 5 brings the real rich-text editor.
- **Phase 3 — tree:** the left sidebar is a real tree now. Create folders and pages with the "+" buttons, rename by double-clicking a name, drag a page or folder onto another folder to move it there, right-click for Rename / Duplicate / Set color / Delete / Add child, and search by name or `#tag` at the top. Color a folder and everything inside it inherits that color until something further down sets its own — folders get a full tinted row, pages just get a tinted icon so they don't compete with their folder's color. Dragging now shows a highlight on whatever folder you're about to drop into. Deleting something asks for confirmation first. The page area in the center is still empty — that's Phase 4 next.
- **Phase 2 — app shell:** the app now opens to a real project picker instead of a placeholder. Pick a recent project, open any project folder from anywhere on your computer, or start a brand-new one (just give it a name and it sets up starter folders for you: Canon, AUs, Characters, Locations, Factions, Worldbuilding). Whatever you had open last reloads automatically next time you launch the app. Once inside a project, you get the three-panel layout the app will live in going forward — tree on the left, page area in the middle, properties on the right — with a toggle to hide/show the right panel, a folder-icon button to head back to the picker without closing the app, and a little "Saved" flash whenever your changes land on disk. The tree and page area are still empty for now (that's Phases 3 and 4); this phase is the frame they'll sit in.
- **Phase 1 — data layer:** the app can now load a project folder from disk, hold it in memory, and write changes back as real JSON files, matching the tree-mirroring layout described in `docs/spec.md`. Creating, renaming, moving, and deleting a page or folder all persist correctly, including same-name collisions (` (2)`, ` (3)`...) and nested folders. Content edits will autosave 300ms after you stop typing once the editor lands in Phase 5. No tree or page view yet — this phase is purely the plumbing underneath them. The placeholder screen now creates/loads a real test project so this can be verified end to end.

### Fixes
- **Two pages named the same thing apart from capitals could overwrite each other.** Windows and Mac both treat `Ruins` and `ruins` as the same filename, but the app treated them as different — so neither got the usual `(2)` on the end, both were filed to the same place, and whichever you edited second quietly replaced the first. They're now recognised as a clash and numbered properly. Your page names keep the capitals you typed; only the behind-the-scenes filename check ignores them.
- **A change that failed to save did so completely silently.** Saving happens a moment after you stop typing, with nothing left watching to catch a problem — so if a save failed for any reason at all, nothing said so. The text was still on screen and the last successful save had already flashed "Saved", so there was no way to tell. Anything that can't be written to disk now raises a red notice at the top of the window telling you what failed and why, so you can rescue the text before closing the app.
- **Pages buried very deep with very long names could hit a Windows limit and fail to save.** Windows refuses file paths over about 260 characters. The app now checks before writing and tells you which page is affected and what to do about it, rather than letting the save quietly fail. It deliberately doesn't rename your pages to make them fit — being told is better than finding your page silently renamed.
- **Opening a project is faster, especially a big one.** Every page the app opened meant several separate trips out to the filesystem just to work out where that page lived, plus two extra questions per folder asking whether it was a real page folder — all of which had to finish before the project appeared. It now works those answers out in one pass. On a project the size of Valeraverse that's 309 trips to disk down to 112.
- **Saving a whole project at once no longer slows down as the project grows.** Working out a page's filename means checking it against its siblings for same-name clashes, and the app was redoing that check from scratch for every single page — so a project twice the size took four times as long to write out. It's now worked out once and reused, which mainly shows up where the app writes everything at once: finishing a LegendKeeper import, and duplicating a folder full of pages.
- **The search box no longer stutters as you type.** Each letter typed into the sidebar search was rebuilding the entire search index from every page name and tag in the project before it could show a result. The index is now built once and kept until your pages actually change.
- **Deleting or duplicating a large folder is quicker**, for the same reason — gathering up everything inside a folder used to re-read the whole project once per level of nesting.
- **An edit could very occasionally be saved to the wrong filename.** Edits are written a moment after you stop typing. If, in that moment, you renamed or deleted a *different* page that happened to share a name with the one you were editing, the app could write your text to where that page used to live. It now checks where the page actually lives at the moment it saves, rather than where it lived when you stopped typing. Hard to trigger on purpose, but it was a real way to lose a paragraph.
- **The app now opens at a sensible size.** It was starting at 800×600, which is cramped for a three-column layout — it opens at 1280×800 now, and won't let itself be dragged smaller than the layout can handle.
- **Page banners flickered when switching pages**, briefly flashing the empty "Add banner" prompt while the picture was still being read from disk. They now hold their space instead. If a picture's file has gone missing, the sidebar slot and the banner both say so rather than just looking empty.
- **Typing got slower as a project grew.** Every keystroke was redrawing the whole window — every row in the sidebar, every cross-reference link in the page, the properties panel, the lot — even though only the page you're typing in had actually changed. Each part of the app now only redraws when something it actually shows has changed, so typing stays responsive on a project the size of Valeraverse.
- **Pages couldn't be reordered inside a folder.** Dragging a page up or down within a folder looked like it worked and then snapped straight back — only top-level items remembered their order, everything else was locked to the order it was created in. Now every folder remembers the order you put its pages in, and duplicating a page drops the copy directly below the original instead of at the bottom of the list. Folders you've never reordered stay exactly as they are.
- **One damaged file could stop the whole project from opening.** Your project is plain JSON files on your own disk, so a file can get mangled by a sync conflict, a crash mid-save, or a stray hand-edit. Any of those used to leave the app sitting on "Loading..." forever, with no message and no way past it. Now a page it can't read is skipped, the rest of your project opens normally, and a dismissible note at the top tells you exactly which files were left out — nothing gets deleted, and a damaged folder's sub-pages still come through rather than disappearing with it. The project picker and the LegendKeeper importer no longer get stuck either; they show a real error you can act on.
- **Edits made in the last moment before closing the app could be lost.** Changes are saved a fraction of a second after you stop typing, which meant whatever you'd just done was still only in memory if the app closed right then. Your work is now written out whenever you switch away from the window, and the app finishes saving before it closes.
- **Two pages with the same name under the same folder could end up duplicating themselves.** When two sibling pages share a name, the second one is stored on disk as `Name (2)` — but that numbering is worked out fresh every time. Rename or delete the first one and the second's expected spot silently shifts to `Name`, while its actual folder stays put at `Name (2)`. The next edit to that page then wrote it to the new spot, leaving two folders holding the same page — so it'd show up twice in the sidebar after a reload, with your edits split across the two copies. Renaming, moving, or deleting a page now also shuffles any same-named siblings into place on disk, so what's stored always matches what the app expects to find.
- **Importing from LegendKeeper could silently lose sub-pages.** The app guesses each page's type from its tab names, and it was matching that list exactly — so a character page with an extra tab you'd added yourself (say Overview, Gallery, Backstory) wasn't recognized as a character and fell back to a plain Note. Notes can't hold sub-pages, so anything filed underneath such a page disappeared from the sidebar and was gone for good the next time the project loaded, with nothing in the import preview to warn you. Tab names are now matched loosely, so an extra tab of your own doesn't throw the guess off, and as a backstop any page that has sub-pages is always given a type that can actually hold them. In your own Valeraverse export this affected one page — "Valera Jiang", who now correctly comes in as a Character with her Gallery tab intact, and her sub-page along with her.
- **Importing from LegendKeeper could show the same sidebar field (Summary, Friends, etc.) twice** — once empty, once with the real imported text — instead of filling in the page's own existing field. Fixed.
- **The page content column was never actually centered** — it sat flush against the left edge with all the leftover space piling up on the right, which only became obvious running the app at true fullscreen on a large monitor. Now centered, and a bit wider (768px → 960px) with more breathing room.
- **Delete confirmations popped up as plain Windows dialog boxes** instead of matching the app's own look. They're now themed pop-ups inside the app itself.
- **Dragging a tab to reorder it felt stiff and imprecise, and only worked if you grabbed a tiny handle icon just right.** Reworked so you can grab a tab from anywhere on it, and the other tabs now smoothly slide out of the way as you drag, instead of just flashing a highlight.
- **A longer tab name could wrap onto two lines and knock the little eye icon out of place** once there were enough tabs to crowd the strip. Tab names now stay on one line, and the strip scrolls sideways instead of squeezing everything together.
- **Deleting a page with an image left the picture behind on disk forever, and duplicating a page with an image made the copy share the exact same picture file as the original** — meaning removing or replacing the photo on either one would've deleted it out from under the other. Found during a pre-release check, not something you'd hit day-to-day, but fixed: deleting now cleans up the image too, and duplicating now gives the copy its own picture file.
- **Renaming or moving a page right after typing in it could occasionally lose the rename, or leave a stray duplicate behind** — two related timing bugs in how edits and renames/moves land on disk. Fixed.
- **Jumping to a page via a mention or wikilink click didn't move the sidebar's highlight to match** — the page in the middle changed, but the tree still looked like you were somewhere else. Fixed; the sidebar now follows along and opens whatever folders it needs to, no matter how you navigate there.
- **Clicking the empty space below a short page's text did nothing** — you had to click exactly on the last line. Now clicking anywhere in the page area places your cursor there, like any normal text box.
- **The slash/mention/wikilink menus had no hover highlight or pointer cursor, and the top item's highlight was too bright to read** — both fixed; menu rows now match the rest of the app's subtle highlight style.
- **Pages nested under a Character/Location/Faction/Species could vanish after reloading** — this was a real, serious bug (present since Phase 1, only just found): those pages' files were always safely on disk, but the app wasn't reliably finding them again on reload. Fixed for good — nested pages now persist correctly across reloads and app restarts.
- **Adding a Note appeared to do nothing** — depending on where you opened the "+" menu from, its last option (Note) could end up positioned below the visible window, out of reach. It now always keeps itself fully on-screen.
- **Left sidebar scrollbar flashing during window resize** — a leftover style from Phase 2 had the sidebar and the tree inside it both trying to manage scrolling at the same time, which very briefly disagreed with each other while the window was actively being resized. Fixed by letting the tree own its own scrolling, like it already does everywhere else.
- **Scrollbars didn't match the dark theme** — they were rendering as your browser's plain default. Every scrollbar in the app is now themed to match.

### Adjustments
- **Final internal doc tidying, again nothing visible in the app:** the notes file Claude keeps had grown to over 500 lines, more than half of it written in the last two days, and it's one of the files it opens most sessions — so its length was costing you every time. It's now split by whether something still matters: the reasoning that governs how the code works stays in the file that gets read, and the record of what was done and how it was tested moved to a file nothing opens unless asked. The rule for which goes where is now written down, so it doesn't quietly drift back.
- **More internal doc tidying, still nothing visible in the app:** the build spec had drifted out of date in a few places — it described pages being stored on disk in a way the app stopped using months of work ago, listed the wrong number of templates, and still had the LegendKeeper import rule we replaced last night. Corrected. The plan document now only covers what's still to come, with the finished phases moved to their own file, and the summary doc kept for pasting into a fresh chat no longer claims the app hasn't been built yet. Two possible problems turned up while checking and are now written down: two pages named the same thing apart from capitalisation could overwrite each other on Windows, and the promised warning about very long file paths was never actually built.
- **Internal tidy-up, nothing visible in the app:** the instructions file Claude reads at the start of every session had grown to where a chunk of it said the same thing three times over. Trimmed by about a third with no rules removed — purely duplication. It also pointed at a reference doc that doesn't exist and missed three that do, which is now fixed.

## 2026-07-29

### Additions
- **Docs organized under `docs/`:** build spec, plan, handoff, glossary, components reference, theming reference, and the reference prototype are all in place, cleaned up from the earlier scattered/duplicate drafts.
- **Phase 0 project scaffold:** Tauri v2 desktop app shell with React 19 + TypeScript. Dark theme CSS tokens and self-hosted fonts (Inter, Newsreader, Fraunces) wired in, folder skeleton built per `CLAUDE.md`'s layer order, ESLint configured. App opens to a placeholder screen — no worldbuilding features yet, that starts in Phase 1.
