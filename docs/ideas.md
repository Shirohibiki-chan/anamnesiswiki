# Future Features

Ideas parked for later. Nothing here is scheduled — see [plan.md](plan.md) for the active roadmap.

---

**Interactive atlas / maps**

LK's atlas — nested image maps with clickable pins that link to wiki pages — is the single feature Anamnesis intentionally doesn't ship in Phase 1. It's the most complex piece of LK to build well and the piece the user has said they use less than the wiki. If demand shows up (either from the user or from anyone she shares the app with), revisit as its own multi-phase project. Leaflet with custom CRS is the likely implementation.

---

**Timeline visualization (calendar-based)**

A view that lays out Event-template nodes on a chronological axis, with per-event pins that open the underlying page. **Superseded 2026-08-08, not cut.** The user's answer to "what happened when" is now **Phase 25 — Storylines**, which orders events by what leads to what instead of by date. That's a deliberate choice rather than a workaround: she doesn't think in calendar years, and a date field she can't fill is the thing that stops the writing.

The original blocker still stands if a calendar view is ever wanted anyway: Events have no reliable date data. `when` is a free string like "Year 872, Third Age," which nothing can sort, and a real date schema — one that copes with invented calendars — is the design work, not the chart. Storylines are the cheaper answer precisely because they need no such schema. Revisit only if she starts asking for years.

---

**Canvas / board / whiteboard**

Freeform spatial planning surface — LK ships one as "Board." Kept on the list at the user's request 2026-07-31. Nothing else in the plan depends on it, so it can wait indefinitely without blocking anything.

**The "largest single build in this document" estimate is withdrawn 2026-08-10.** It assumed writing a drawing surface from scratch. **Excalidraw** is the answer instead: MIT-licensed, embeds as a React component, works entirely offline, and stores a scene as plain JSON — which is the same promise the rest of the app makes about her files. Obsidian's Excalidraw plugin is the same move. That turns this from the biggest build here into an integration, and the remaining work is where a board *lives* in the tree and how a board links to pages, not the canvas itself. Still unscheduled; it's now cheap enough to schedule whenever she wants it rather than something to be talked out of.

**It is not a prerequisite for Phase 25 — Storylines**, and the two must not be collapsed into one job. They share pan, zoom and drag-a-thing-somewhere, which is the smaller part of either. A storyline's nodes are *pages* and its edges *mean* something ("this leads to that"), so it needs a graph that knows what it's holding; a board deliberately holds anything and knows nothing about it. Building storylines out of a drawing tool would give up the part that makes it useful.

---

**Icons you choose yourself**

Asked for by the user 2026-08-18. Wanted, unscheduled. Today a page's icon is
its template's — every Character gets the same glyph — and the only thing she
can change per page is its colour.

**LegendKeeper does this, and her existing world is already full of her
answers.** Every resource in a `.lk` carries `iconGlyph`, `iconShape` and
`iconColor`; checked against her real export 2026-08-18, the glyphs are Font
Awesome class names (`fas fa-tree-palm`, `fas fa-map-marked-alt`, `fas fa-sun`,
`fas fa-water`, `fas fa-flag`), with a few bare names (`calendar`, `shapes`).
**Our importer reads none of them**, so a world she decorated page by page
arrives wearing eight template glyphs. That makes this an import fix as much as
a feature, and it's the argument for doing it before she re-imports Valeraverse
again rather than after.

**The awkward part is that we don't ship Font Awesome and shouldn't start.**
The app draws with `lucide-react`, which is bundled, offline and already the
source of `constants/icons.ts`. So an imported glyph needs a name-to-name map,
and it will be partial — Lucide has no palm tree. **A page whose glyph doesn't
map keeps its template icon**, which is exactly what it has today, so a missing
entry costs nothing and the map can grow. Don't reach for a Font Awesome
package to close the gap: it's a second icon set in the bundle for a handful of
pages, and the Policy Boundary rules out fetching one.

`iconShape` and `iconColor` are atlas-pin styling — a pin's outline and its
fill on a map. There's no atlas here (see the top of this file), and the colour
is already a per-node thing we have. Read the glyph; leave the other two.

**Half of this is now built.** Phase 18c needed an icon per meter and so it
shipped the picker and the registry underneath it: `constants/glyphs.ts` is a
curated Lucide set with search keywords, `constants/emoji.ts` is the emoji
half, and `components/blocks/IconPicker.tsx` is the control — deliberately
written to take a value and a callback and know nothing about meters, so a
page's icon can use it as-is. **How it's picked is therefore answered**, and
the answer to "~1500 things in a popover" was: don't ship 1500, ship a curated
few hundred grouped and searchable, and add to the list when something is
missing. An unknown stored name degrades to text rather than to a crash, which
is also what makes an emoji storable as itself.

**What's still undecided and needs her, not a guess:** whether a page's icon
replaces the template's or sits beside it, and whether folders get one too.
The LK glyph-name map for import is also still unwritten — that's the part
that makes this an import fix, and `glyphs.ts` is where the target names now
live. Related but separate: the colour control's placement, below in Queued
Adjustments.

---

**Collapsible group headers in the sidebar (GitBook-style)**

Raised by the user 2026-08-11, with a GitBook screenshot: small uppercase muted
labels — GETTING STARTED, BASICS FOR EVERYONE, BASICS FOR CREATORS — with pages
sitting under each one and no indentation, and the section collapsing as a unit.
**Wanted, and the shape is settled** (the user, same day) — not yet scheduled.
Her hierarchy, which is GitBook's: **universe → groups → folders and pages
inside them.**

**How GitBook actually does it**, checked against their docs 2026-08-11 rather
than assumed:

- A **group is top-level only.** A group cannot go inside a group. That single
  constraint is what makes this affordable — it removes every hard case a
  place-a-label-anywhere design would create.
- **Pages nest freely inside a group**, with no hard limit. GitBook suggests
  staying under about three levels; **that is their styling advice for published
  documentation sites and does not carry over here.** The user's own worlds go
  much deeper and always will — do not implement a depth cap, warn about depth,
  or treat deep nesting as a mistake, and **don't reach for the old
  260-character Windows path ceiling as a reason** — it was measured and
  withdrawn (see `constants/limits.ts`), and repeating it is how a limit that
  doesn't exist gets designed around anyway. Phase 22 *removes* two levels from
  every AU path rather than adding any.
- **A group is a label, not a page.** There is nothing to open, so it has no
  content of its own.

**A group is still a directory on disk, and that isn't a contradiction** — it's
only where its pages live. *Folder* in Anamnesis currently fuses two things
GitBook keeps apart: a container for other pages, and a clickable row with its
own page, properties and colour. **A group is the first without the second**, so
it's a flag on a node rather than a new storage shape, and renames, drag and
drop and the ` (2)` collision suffixes all keep working untouched.

What genuinely has to learn about it: selection and routing (it can't be
opened), the properties panel (it has none), `[[wikilinks]]` and search (it
isn't a page and must not be offered as a target), LK export (the format has no
equivalent — its children export as top-level), and Phase 24's graphs.

**Phase 22 — Universes comes first, and her own hierarchy is why:** universes
sit *above* groups in it. Groups don't replace Canon and the AUs — those become
universes; they leave the *tree* for the switcher, and the top level they vacate
is where groups then go. Build groups before that and they're built on rows
that are moving.

**What's shared between universes is a universe, not a group** — already decided
2026-08-08, see Phase 22. A Shared universe stays visible alongside whichever
one is selected, which a group can't do: a group lives inside one universe, so
shared lore held in a group would only be shared with itself. Groups apply
*within* Shared exactly as they do anywhere else.

**Groups are made by hand, and existing folders are never auto-converted** —
the user, 2026-08-11. So a project has no groups at all until she makes one,
which settles the other open question by implication: **a page may sit at the
top level outside any group**, and that's the normal state, not a degraded one.

---

**World Anvil import**

Investigated 2026-07-31 against a real export (`World-Orynthia_ Fragments of Fable-2026-07-31.zip`) and **dropped for now** by the user. Recording the findings so the next look doesn't start cold:

- The export is a zip of one JSON file per entity, keyed by `entityClass` / `templateType` (`Person`, `Article`, `Category`, plus Timeline, Map, Manuscript, VariableCollection). Tree structure comes from categories, which nest via their own `parent`, plus `articleParent` for sub-articles. Template inference is easy — `person` → Character, and the rest line up similarly.
- **Content is BBCode** — `[p]`, `[h3|uuid]`, `[hr]`, `[articletoc]`. This is the expensive part. It shares nothing with the LK importer, which speaks ProseMirror; it's a second parser from scratch.
- **The export is not clean UTF-8.** Real observed damage in the sample: "they're" arrives as `they<?>re`. An importer that doesn't repair this mangles every apostrophe in the world.
- Portraits and covers are URLs on WA's servers, not files in the zip — same fetch-on-import shape the LK importer already uses.
- Manuscripts, maps, timelines and `{{user}}` variables have no home here and would need flagging as skipped in the preview.

**Worth salvaging even though the importer is dropped:** WA's Person template carries ~120 typed fields (age, pronouns, eyes, hair, height, species, family, relations, motivation, vices, quirks…). That list was the source for Phase 13's default property suggestions, mined *selectively* — WA's own reputation for bloat is the cautionary tale, so `constants/property-suggestions.ts` carries about a dozen per template rather than everything imaginable. The same rule applies if the list is mined again for anything else.

---

**Browser version**

The user raised this 2026-07-31 — not for herself, but so people who won't install an unknown `.exe` can still look at a world. **Phase 1.5 (Publish) already covers that need** and needs no re-architecture; check whether it's satisfied before considering anything further.

A genuinely editable browser build is a different animal: `filesystem-service.ts` talking to the user's disk through Tauri *is* the storage layer, and a browser can't do that. It would mean either a real backend or a much more limited "your world lives in this browser" mode. Not a build flag. Deferred, and related to Phase 2 below.

---

**Cloud sync (Phase 2)**

Supabase-backed sync for users who want multi-device access without shared-folder tools. Free tier is enough for two people; adds a real backend and auth. Deferred until the shared-folder approach (Dropbox / Syncthing) demonstrably stops meeting the user's needs. Do not scaffold in Phase 1.

---

**Import Word and Google Docs, formatting intact**

Asked for by the user 2026-08-12. Wanted, unscheduled.

**Google Docs is a file import, not an integration, and that isn't a compromise — it's the only version that can exist here.** Reaching Google's API means a third network call *and* an account to authenticate against, and both sit on the wrong side of the Policy Boundary; the account half is Phase 2 territory at best. She exports from Google Docs (File → Download → `.docx`, or `.odt`) and imports the file. That is the same importer, so there is one thing to build rather than two, and it works with no internet.

**`.docx` is a zip of XML and is parseable offline.** `mammoth` (BSD-2) converts it to HTML through an explicit style-mapping table, which is the part that makes formatting survive rather than being guessed at. From HTML the path is HTML → BlockNote blocks — **work Phase 20 needs anyway** for its own HTML import, so build that converter once and let both use it. `.odt` is the same shape (zip + XML) and is the fallback if Google's `.docx` export turns out lossy.

What comes across: headings, bold/italic/underline/strikethrough, nested lists, links, blockquotes, tables, horizontal rules. What has no home here and must be *reported* rather than silently dropped — the LK importer's lossy-list preview is the pattern: page layout and columns, fonts and text colour, comments, tracked changes, text boxes and drawing objects, footnotes (land as trailing text at best).

**Pictures embedded in a `.docx` are inside the zip, and that is one of the very few later moments a picture's real name exists** — the archive stores original media filenames. They extract into `assets/` down the same path an upload takes, and the name goes into `.names.json` at that moment or is lost for good. See handoff §Editor & templates.

**Keep the formatting is only half of it — keep the *characters* is the other half.** A lot of what these documents hold isn't prose, it's prompt text: `{{char}}`, `{{user}}`, square and angle brackets, and whatever syntax the target platform uses. Google Docs also curls quotes and dashes silently as you type, so a prompt can already be subtly wrong before it's exported. The importer must pass text through unchanged — **no smart-quote conversion, no whitespace collapsing, no escaping of braces, no tidying of any kind.** Anything that reads as a "clean up the text" helper is the bug.

---

**Import and paste fidelity — what actually goes wrong**

Notes from botmakers and fic writers describing their current tool, 2026-08-12,
gathered by the user in a chat she was in. Paraphrased; no handles recorded,
because this is a public repo and they were talking to each other rather than
to us. **The complaints were unprompted and specific, which is what makes them
worth keeping** — this is the failure everyone downstream of a document
importer actually hits, and it is not the one you'd design against from
imagination.

What they reported, in the order it hurt:

- **Paragraph spacing is the first casualty and the most-reported one.** Blank
  lines between paragraphs vanish and a carefully spaced document arrives as
  one wall of text. Reported on three separate paths with the same symptom:
  pasting *in*, pasting *out*, and importing a file.
- **Formatting that was never in the source gets added.** Headings that don't
  exist, bold that wasn't bold, doubled spaces. **This is worse than losing
  formatting, and the plan should treat it as worse**: losing it is visible and
  fixable in a minute, inventing it means editing a document you no longer
  recognise, and one of them described re-doing every heading and section by
  hand after each import.
- **Pasting *out* matters as much as importing in.** Their text goes on to
  lorebook builders and other people's editors, so a page that can't leave
  cleanly is as broken as one that can't be filled. One of them named a
  specific round trip — write here, paste into a lorebook tool, watch the line
  breaks die.
- **Hand-repairing the formatting inside the tool made it worse**, which is how
  a formatting bug turns into an abandoned document.
- **The cost isn't annoyance.** One of them said the fight with formatting is
  part of why they stopped finishing their bots. That is the actual stake here:
  not polish, but whether the work gets done at all.

**Anti-goals, written down so nobody has to rediscover them:**

1. **Never invent formatting.** No heading, bold run or emphasis that the source
   didn't have. Where a mapping is ambiguous, emit a plain paragraph — being
   boring is recoverable, being wrong is not.
2. **An empty paragraph is content.** Preserve blank lines exactly; never
   normalise runs of them.
3. **Never touch the characters** — see the `{{char}}` note above.
4. **Round trip is the test, not import.** The acceptance question is "paste it
   out and is it the same", not "does it look right on screen".

**Paste is a different code path from file import and has to be checked
separately.** BlockNote does its own clipboard handling and nothing here has
ever tested it — see Queued Adjustments.

**Two things about the tools they're leaving, both worth not repeating:**

- **An "export to AO3" button is a reason people pick a writing app.** One of
  them said it outright — it's why they use that site. That upgrades the AO3
  entry below from a nice-to-have to a draw.
- **They left Google Docs because it has a length limit and their current tool
  doesn't.** Whatever Anamnesis does, it must not introduce one. Nothing here
  currently does; keep it that way.

---

**Export to AO3**

Asked for by the user 2026-08-12. Wanted, unscheduled.

Raised half as a joke and it shouldn't be taken as one: a competing tool's AO3 export is the stated reason one of the writers above uses that tool at all. See the fidelity entry.

**There is nothing to post to.** AO3 has no public write API, and posting on her behalf would need her account plus a network call — both out. So this produces something she pastes into AO3's rich-text box, or a file she uploads. No host is ever contacted, which keeps it inside the Policy Boundary without an argument.

**The work is the subset, not the export.** AO3 runs everything through a tag whitelist and strips class and style attributes outright, so this emits a narrow HTML dialect — `p`, `br`, `em`, `strong`, `b`, `i`, `u`, `s`, `a`, `blockquote`, `h1`–`h6`, `ul`/`ol`/`li`, `hr`, `table`, `center` — and anything with no equivalent has to **degrade visibly and be listed**, the way LK export already lists what it flattens. The custom Info/Quote/Secret callouts are the obvious case: they become blockquotes and lose their colour, and a Secret callout silently becoming an ordinary quote is a spoiler published by accident.

**Pictures can't come with it, and that's the headline rather than a footnote.** AO3 hosts no images; an `<img>` there must point at a file on someone else's server. Her library is local files with no public URL, so every picture in an exported page is a broken link or an omission. Say which, up front, before the export runs.

`[[wikilinks]]` and mentions have nothing to point at either — they should become plain text rather than links to nothing.

**Open question worth settling before building: what's a work?** One page is the easy answer; a **Phase 25 storyline exported as chapters** maps onto AO3's own chapter model and is probably what she actually wants. That pairing decides the shape, so don't build the single-page version in a way that can't grow chapters.

**Third of a kind.** `lk-export.ts`, Phase 1.5's static publish and this are all "walk BlockNote blocks, emit another format". By the third one the shared walker is worth extracting; it wasn't at the second.

---

**Code blocks — the half that's left**

Asked for by the user 2026-08-12; **styling, syntax highlighting and the LK round trip shipped the same day** (see `docs/shipped.md`). What's still open is the part that has nothing to do with the block itself:

**Discoverability is smaller than it looked, and the claim that `/code` was the only door was wrong.** Typing ` ``` ` and a space makes a code block — BlockNote ships that shortcut, it has always worked here, and it's the door she asked for by name when she requested the feature. She found it on her own the first day. So this isn't "nobody can reach it", it's the narrower question of whether someone who *doesn't* already know markdown would, and that's the same question every other block raises. Still worth solving as one piece across all of them rather than bolting a button onto this one; the formatting toolbar isn't the place, since it only appears over a selection and a code block is inserted at an empty line.

That's the whole of what's left. The question this section used to carry — whether her existing world had code blocks the old importer had emptied — is answered and gone; see `docs/shipped.md`.

---

**The picture library — what LK has that we don't**

Raised by the user 2026-08-13 after comparing directly against LK.

**Nested folders.** Ours are flat labels; LK's nest, with a breadcrumb (`Media / asdasdasda / hjhgkhkjh`). Her words for the flat version were that it feels cheap. `asset-folders.ts` stores a folder as an id and a name and a picture as a folder id, so nesting is a parent id on the folder plus a breadcrumb — the pictures themselves don't move, since a folder is a label and not a location.

**A full-window library manager**, like LK's Project Settings → Assets: a filter box, a grid/list toggle, breadcrumbs, and folders as tiles in the same grid as the pictures. The 180px sidebar can't be this and shouldn't try. The picker dialog is the closest thing we already have and is where this probably grows from. **Fifty folders is the case it has to answer** — she raised that number 2026-08-18, and the sidebar dropdown is the stopgap, not the answer. **Where it opens from is settled: a button in the Assets tab, not a Settings section** — her call 2026-08-18, on the grounds that burying it in settings was always the odd thing about LK’s version. **And it waits for nested folders** rather than being built flat and re-done: they share the breadcrumb, and she chose to hold it until then.

**What we can't take from LK, and it's settled:** the export contains **no asset library at all**. Both of her accounts, checked field by field — no filenames, no folder names, no media section; a picture exists only as a bare CDN URL inside a page, with `attrs.id` empty. So imported pictures can never arrive named or filed, and the names she gives them here are hers alone. See `docs/lk-format.md`.

**Folder shape in the sidebar** is settled and shipped 2026-08-18: a dropdown. One line naming the folder you’re in, the folders themselves in a menu over the pictures. It went chips → tiles → dropdown in a day; her call, and the right one, because it’s the only shape whose cost doesn’t grow with the number of folders. Measured at fifty: the block shape was 26 rows and 1101px, a fifth of it visible at a time. The menu grew its own filter box the same day (#183), which is what makes fifty rows usable rather than merely reachable.

---

**Image gallery — a page of pictures that can be taken back out**

Asked for by the user 2026-08-31. Wanted, unscheduled.

**A tile is a picture. That is the whole definition, and it is also the entire complaint about Notion's.** She went and checked theirs the same day: what they call a gallery is a view of *pages* drawn as cards, where the image on a card is that page's cover. The word promises pictures and hands over documents, and putting thirty images in one means making thirty pages to hang them on. Ours holds pictures. Nothing about a tile is a page.

**The case is one gallery per character, and somebody is doing it today.** The botmaker whose folder plugin is described in `plan.md` uploads the pictures of each bot into a folder belonging to that bot — Damien's, Valera's, one each. That is the shape to serve, and it is worth saying plainly because an earlier reading of this idea treated a per-character picture folder as something our asset library already covers. It does not.

**The library is the wrong home for it, and not narrowly.** A folder there is a flat label, a picture carries exactly one, and the sidebar is a dropdown whose stress case was already fifty folders (see above). One folder per character puts the character count straight into that dropdown, and it puts a character's pictures somewhere other than the character — two places to keep in step, which is the arrangement that goes stale.

**A gallery page gets the grouping for nothing.** The tree already nests and a character is already a page, so Damien's gallery is a child of Damien and there is no second set of folders to keep in order. This is the thing the app's own shape is good at and the library isn't; see `CLAUDE.md` → Data on disk for why any page can hold pages.

**Pictures come from the library or straight off her PC, and that is a difference in the picker rather than in the storage.** `uploadAsset` already takes the bytes, the extension and the file's own name, and anything arriving that way lands in `assets/` like every other upload. So "put this file from my computer in this gallery" is not a second path to build, and a picture dropped into a gallery is in the library by construction rather than as a separate copy.

**The download is the point, and most of it is built.** *Save a copy* has been on a picture in a page since Phase 16: it goes through the OS save dialog, copies the original bytes, and keeps whatever extension the file already had rather than converting anything. It exists because BlockNote's own Download button calls `window.open`, which is not a download in a Tauri window. So a gallery isn't inventing this — it is putting what already works on every tile, plus, presumably, a way to take the whole page at once.

**The suggested filename is what decides whether it feels cheap.** A picture's file is a UUID and the name she typed is a label in `.names.json`, so a gallery that drops `a3f9b2…png` into Downloads is exactly the experience being complained about. The label is load-bearing here, and an unnamed picture needs a fallback that is worth having rather than the id.

**Two kinds of picture behave differently and the grid has to say which is which.** One in the library has its bytes here. An embedded one lives on someone else's server, has no bytes here, and *Save a copy* opens it in the browser instead — deliberately, since fetching it would be the app making a request nobody asked for. In a grid of thirty, a tile that opens a browser instead of saving is a surprise unless it is marked as one.

**Who "people" means decides how much of this can be built now.** Inside the app it is her and one other person, and that half is buildable today. A world handed to anyone else is Phase 1.5 (Publish), where the download is an anchor on an exported page and the export has to actually carry the files — so that half waits for Publish rather than being designed around it now.

**A page type rather than a block was her call and is worth keeping.** `TEMPLATE_KEYS` holds fifteen and adding one is routine; Phase 22 wants another for universes. A block would put a gallery inside some other page's body, which is the arrangement that makes "where are Damien's pictures" a question again.

**She sent a screenshot of one on 2026-08-31 — Rolecraft Vault, somebody else's app — as an example of what an image gallery *is*, not a design to match.** Her correction the same day, and worth keeping at the top of anything read off that picture: their app is a different app, and this should still look like a page here. So take the concept and leave the chrome.

**The concept is tiles that are pictures, each with its own caption, that open bigger when clicked and can be taken back out.** That is the whole of it, and everything below is either already built or a small addition to something built.

**Two anti-goals, both read off Notion's own gallery view, which she screenshotted 2026-08-31.** They are the same failure twice: a thing called a gallery that is not actually about the pictures.

- **You cannot see the pictures.** Every card crops to the same wide rectangle whatever shape the picture is, so a portrait image — which is most character art, and most of hers — has a band taken out of its middle and the rest thrown away. **This makes tile shape a real decision rather than a detail**, and it is undecided: uniform tiles that letterbox instead of cropping, uniform portrait-shaped tiles, or tiles that keep each picture's own proportions and pack around one another. What is already settled is the constraint — a tile shows the picture, so anything wide and fixed is wrong before it starts.
- **Clicking a tile opens a page.** Not the picture. Even the caption is a page title with a document icon beside it, so the label names a document too. Here a tile opens the picture in the lightbox, and the caption names the picture.


**Captions want the name we already keep.** A picture's file is a UUID and its name is a label in `.names.json`, so a tile has something to draw without inventing a second field — and an unnamed picture needs a fallback that isn't the id.

**Click-to-enlarge is built.** The Phase 16 lightbox already shows the filename, arrows through every picture on the page rather than only the one clicked, and zooms and pans. A gallery inherits it rather than needing its own.

**"Original quality" is worth saying on the button, in those words.** Ours already behaves that way — *Save a copy* copies the bytes and refuses to convert — but nobody can see that from a button marked Download, and *just in case* is a promise about fidelity. Theirs says it; that part is worth stealing.

**One picture is already the page's portrait** (`node.image`), and theirs marks that on the tile. Showing it, and setting it from a tile, is close to free and saves a trip to the properties panel.

**Selecting several pictures and acting on them together** is how theirs answers taking the whole page at once, and it is a better shape than a lone Download-all: one control covers one picture or forty. If deleting is ever part of that, it goes through `asset-usage.ts`, which knows all four places a picture can be in use and exists so that a delete button can be trusted.

**What is theirs and not asked for, listed so nobody builds it off a screenshot:** a Small/Medium/Large size toggle, albums *inside* the gallery with their own counts, and the whole thing being a modal with a Close button. The albums one is the one to actually ask about rather than quietly include — a second place to file a picture is precisely what a gallery page was meant to save her from.
**Two things, two words — her split, 2026-08-31, and it is what keeps this from becoming Notion's mess.** The names she landed on: **image gallery** for the pictures, **database** for pages laid out as cards. Notion's whole failure is one word stretched over both, so the rule underneath outlives either name — one name per thing, and no name shared.

**The qualifier goes on the ambiguous word, which is why this beats calling it just "gallery".** Notion has trained a lot of people that a gallery is cards of pages, so the bare word arrives already meaning the wrong thing; *image gallery* cannot. It also settles an objection that killed the alternative: in Notion a gallery is a view **of** a database rather than its sibling, so a plain Gallery sitting next to a Database invites the assumption that one lives inside the other. Spelling out *image* takes the two out of that relationship.

**"Collection" was the other candidate and she ruled it out for a reason worth keeping.** It is too useful a word to spend on UI plumbing — a collection is a thing that exists *inside* a world (a character's inventory, an archive of relics, a set of anything she is writing about), and a feature name eats the word everywhere it appears. Same reasoning that made *gallery* a problem in the first place. The word stays free for her world.

**One caveat on *database*, recorded rather than argued.** In Notion the word carries typed columns, sorts, filters, formulas, rollups and relations; ours is pages gathered by a rule with filtering planned. The name is a promise slightly ahead of the feature, which is a cost she accepted knowingly against her audience already speaking the word fluently.

**The page-side half already mostly exists here.** A collection block pulls pages from manual links, the subpage index, tags or backlinks and draws them as a list; Phase 23 in `plan.md` is currently called Collections. Cards with cover images is a layout on that, not a new feature — **so the rename to Database is a real edit to `plan.md` and the other tracking docs, and belongs in its own change rather than being smuggled into this entry.** Nothing user-facing says "collection" today: a block's heading is its source's name, so the app itself needs no migration.
**The library is the wrong home for it, and not narrowly.** A folder there is a flat label, a picture carries exactly one, and the sidebar is a dropdown whose stress case was already fifty folders (see above). One folder per character puts the character count straight into that dropdown, and it puts a character's pictures somewhere other than the character — two places to keep in step, which is the arrangement that goes stale.

**A gallery page gets the grouping for nothing.** The tree already nests and a character is already a page, so Damien's gallery is a child of Damien and there is no second set of folders to keep in order. This is the thing the app's own shape is good at and the library isn't; see `CLAUDE.md` → Data on disk for why any page can hold pages.

**Pictures come from the library or straight off her PC, and that is a difference in the picker rather than in the storage.** `uploadAsset` already takes the bytes, the extension and the file's own name, and anything arriving that way lands in `assets/` like every other upload. So "put this file from my computer in this gallery" is not a second path to build, and a picture dropped into a gallery is in the library by construction rather than as a separate copy.

**The download is the point, and most of it is built.** *Save a copy* has been on a picture in a page since Phase 16: it goes through the OS save dialog, copies the original bytes, and keeps whatever extension the file already had rather than converting anything. It exists because BlockNote's own Download button calls `window.open`, which is not a download in a Tauri window. So a gallery isn't inventing this — it is putting what already works on every tile, plus, presumably, a way to take the whole page at once.

**The suggested filename is what decides whether it feels cheap.** A picture's file is a UUID and the name she typed is a label in `.names.json`, so a gallery that drops `a3f9b2…png` into Downloads is exactly the experience being complained about. The label is load-bearing here, and an unnamed picture needs a fallback that is worth having rather than the id.

**Two kinds of picture behave differently and the grid has to say which is which.** One in the library has its bytes here. An embedded one lives on someone else's server, has no bytes here, and *Save a copy* opens it in the browser instead — deliberately, since fetching it would be the app making a request nobody asked for. In a grid of thirty, a tile that opens a browser instead of saving is a surprise unless it is marked as one.

**Who "people" means decides how much of this can be built now.** Inside the app it is her and one other person, and that half is buildable today. A world handed to anyone else is Phase 1.5 (Publish), where the download is an anchor on an exported page and the export has to actually carry the files — so that half waits for Publish rather than being designed around it now.

**A page type rather than a block was her call and is worth keeping.** `TEMPLATE_KEYS` holds fifteen and adding one is routine; Phase 22 wants another for universes. A block would put a gallery inside some other page's body, which is the arrangement that makes "where are Damien's pictures" a question again.

**She sent a screenshot of one on 2026-08-31 — Rolecraft Vault, somebody else's app — as an example of what an image gallery *is*, not a design to match.** Her correction the same day, and worth keeping at the top of anything read off that picture: their app is a different app, and this should still look like a page here. So take the concept and leave the chrome.

**The concept is tiles that are pictures, each with its own caption, that open bigger when clicked and can be taken back out.** That is the whole of it, and everything below is either already built or a small addition to something built.

**Two anti-goals, both read off Notion's own gallery view, which she screenshotted 2026-08-31.** They are the same failure twice: a thing called a gallery that is not actually about the pictures.

- **You cannot see the pictures.** Every card crops to the same wide rectangle whatever shape the picture is, so a portrait image — which is most character art, and most of hers — has a band taken out of its middle and the rest thrown away. **This makes tile shape a real decision rather than a detail**, and it is undecided: uniform tiles that letterbox instead of cropping, uniform portrait-shaped tiles, or tiles that keep each picture's own proportions and pack around one another. What is already settled is the constraint — a tile shows the picture, so anything wide and fixed is wrong before it starts.
- **Clicking a tile opens a page.** Not the picture. Even the caption is a page title with a document icon beside it, so the label names a document too. Here a tile opens the picture in the lightbox, and the caption names the picture.


**Captions want the name we already keep.** A picture's file is a UUID and its name is a label in `.names.json`, so a tile has something to draw without inventing a second field — and an unnamed picture needs a fallback that isn't the id.

**Click-to-enlarge is built.** The Phase 16 lightbox already shows the filename, arrows through every picture on the page rather than only the one clicked, and zooms and pans. A gallery inherits it rather than needing its own.

**"Original quality" is worth saying on the button, in those words.** Ours already behaves that way — *Save a copy* copies the bytes and refuses to convert — but nobody can see that from a button marked Download, and *just in case* is a promise about fidelity. Theirs says it; that part is worth stealing.

**One picture is already the page's portrait** (`node.image`), and theirs marks that on the tile. Showing it, and setting it from a tile, is close to free and saves a trip to the properties panel.

**Selecting several pictures and acting on them together** is how theirs answers taking the whole page at once, and it is a better shape than a lone Download-all: one control covers one picture or forty. If deleting is ever part of that, it goes through `asset-usage.ts`, which knows all four places a picture can be in use and exists so that a delete button can be trusted.

**What is theirs and not asked for, listed so nobody builds it off a screenshot:** a Small/Medium/Large size toggle, albums *inside* the gallery with their own counts, and the whole thing being a modal with a Close button. The albums one is the one to actually ask about rather than quietly include — a second place to file a picture is precisely what a gallery page was meant to save her from.
**Two things, two words — her split, 2026-08-31, and it is the one that keeps this from becoming Notion's mess.** A *gallery* holds images. The thing that holds pages laid out as cards is a different feature with a different name, and her proposal for that name is **database**, which is what Notion calls it and therefore the word her audience already arrives knowing. The rule underneath is the part that matters more than either word: **one name per thing, and "gallery" is spent on the images.** Notion's whole failure is one word stretched over both.

**The page-side half already mostly exists here, which is worth knowing before naming it.** A collection block pulls pages from manual links, the subpage index, tags or backlinks and draws them as a list; Phase 23 is called Collections and is scheduled to grow filtering over it. Cards with cover images is a layout on that, not a new feature.

**So the open question is only whether Collections gets renamed to Database, and it needs her.** Keeping both words — Collection in the code and the plan, Database in the UI — is a smaller version of the confusion this split exists to end, so it is worth settling once rather than drifting. Either is fine; having both is not.
**The library is the wrong home for it, and not narrowly.** A folder there is a flat label, a picture carries exactly one, and the sidebar is a dropdown whose stress case was already fifty folders (see above). One folder per character puts the character count straight into that dropdown, and it puts a character's pictures somewhere other than the character — two places to keep in step, which is the arrangement that goes stale.

**A gallery page gets the grouping for nothing.** The tree already nests and a character is already a page, so Damien's gallery is a child of Damien and there is no second set of folders to keep in order. This is the thing the app's own shape is good at and the library isn't; see `CLAUDE.md` → Data on disk for why any page can hold pages.

**Pictures come from the library or straight off her PC, and that is a difference in the picker rather than in the storage.** `uploadAsset` already takes the bytes, the extension and the file's own name, and anything arriving that way lands in `assets/` like every other upload. So "put this file from my computer in this gallery" is not a second path to build, and a picture dropped into a gallery is in the library by construction rather than as a separate copy.

**The download is the point, and most of it is built.** *Save a copy* has been on a picture in a page since Phase 16: it goes through the OS save dialog, copies the original bytes, and keeps whatever extension the file already had rather than converting anything. It exists because BlockNote's own Download button calls `window.open`, which is not a download in a Tauri window. So a gallery isn't inventing this — it is putting what already works on every tile, plus, presumably, a way to take the whole page at once.

**The suggested filename is what decides whether it feels cheap.** A picture's file is a UUID and the name she typed is a label in `.names.json`, so a gallery that drops `a3f9b2…png` into Downloads is exactly the experience being complained about. The label is load-bearing here, and an unnamed picture needs a fallback that is worth having rather than the id.

**Two kinds of picture behave differently and the grid has to say which is which.** One in the library has its bytes here. An embedded one lives on someone else's server, has no bytes here, and *Save a copy* opens it in the browser instead — deliberately, since fetching it would be the app making a request nobody asked for. In a grid of thirty, a tile that opens a browser instead of saving is a surprise unless it is marked as one.

**Who "people" means decides how much of this can be built now.** Inside the app it is her and one other person, and that half is buildable today. A world handed to anyone else is Phase 1.5 (Publish), where the download is an anchor on an exported page and the export has to actually carry the files — so that half waits for Publish rather than being designed around it now.

**A page type rather than a block was her call and is worth keeping.** `TEMPLATE_KEYS` holds fifteen and adding one is routine; Phase 22 wants another for universes. A block would put a gallery inside some other page's body, which is the arrangement that makes "where are Damien's pictures" a question again.

**She sent a screenshot of one on 2026-08-31 — Rolecraft Vault, somebody else's app — as an example of what an image gallery *is*, not a design to match.** Her correction the same day, and worth keeping at the top of anything read off that picture: their app is a different app, and this should still look like a page here. So take the concept and leave the chrome.

**The concept is tiles that are pictures, each with its own caption, that open bigger when clicked and can be taken back out.** That is the whole of it, and everything below is either already built or a small addition to something built.

**Two anti-goals, both read off Notion's own gallery view, which she screenshotted 2026-08-31.** They are the same failure twice: a thing called a gallery that is not actually about the pictures.

- **You cannot see the pictures.** Every card crops to the same wide rectangle whatever shape the picture is, so a portrait image — which is most character art, and most of hers — has a band taken out of its middle and the rest thrown away. **This makes tile shape a real decision rather than a detail**, and it is undecided: uniform tiles that letterbox instead of cropping, uniform portrait-shaped tiles, or tiles that keep each picture's own proportions and pack around one another. What is already settled is the constraint — a tile shows the picture, so anything wide and fixed is wrong before it starts.
- **Clicking a tile opens a page.** Not the picture. Even the caption is a page title with a document icon beside it, so the label names a document too. Here a tile opens the picture in the lightbox, and the caption names the picture.


**Captions want the name we already keep.** A picture's file is a UUID and its name is a label in `.names.json`, so a tile has something to draw without inventing a second field — and an unnamed picture needs a fallback that isn't the id.

**Click-to-enlarge is built.** The Phase 16 lightbox already shows the filename, arrows through every picture on the page rather than only the one clicked, and zooms and pans. A gallery inherits it rather than needing its own.

**"Original quality" is worth saying on the button, in those words.** Ours already behaves that way — *Save a copy* copies the bytes and refuses to convert — but nobody can see that from a button marked Download, and *just in case* is a promise about fidelity. Theirs says it; that part is worth stealing.

**One picture is already the page's portrait** (`node.image`), and theirs marks that on the tile. Showing it, and setting it from a tile, is close to free and saves a trip to the properties panel.

**Selecting several pictures and acting on them together** is how theirs answers taking the whole page at once, and it is a better shape than a lone Download-all: one control covers one picture or forty. If deleting is ever part of that, it goes through `asset-usage.ts`, which knows all four places a picture can be in use and exists so that a delete button can be trusted.

**What is theirs and not asked for, listed so nobody builds it off a screenshot:** a Small/Medium/Large size toggle, albums *inside* the gallery with their own counts, and the whole thing being a modal with a Close button. The albums one is the one to actually ask about rather than quietly include — a second place to file a picture is precisely what a gallery page was meant to save her from.
**A gallery *of pages* is a real thing too, and folding it into this one is the mistake to avoid.** She said as much on 2026-08-31 — she can see the use, it simply isn't what she was asking for. That one is Phase 23 (Collections), which already has the data: a collection block pulls pages from manual links, the subpage index, tags or backlinks, and today draws them as a list. Cards with cover images is a layout on something already built, not a feature of its own. **It should not be called a gallery**, whatever it ends up being called — one word over both is precisely how Notion ended up with the wrong thing wearing the right name.
