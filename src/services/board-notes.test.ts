import { describe, expect, it } from "vitest";
import { BOARD_NOTE_LINK } from "../constants/board";
import {
  DEFAULT_NOTE_COLOUR,
  NOTE_COLOURS,
  emptyNote,
  isNote,
  noteColourName,
  noteHtml,
  noteIsEmpty,
  noteLinesFromDom,
  noteLinkAllowed,
  noteOf,
  notePageIds,
  noteText,
  type NodeLike,
  type Note,
} from "./board-notes";

// A DOM small enough to write by hand: `el("DIV", [...children], {href})`
// and `text("...")`. The reader asks for nothing more of the browser's.
function text(value: string): NodeLike {
  return { nodeType: 3, nodeName: "#text", nodeValue: value, childNodes: [] };
}

function el(name: string, children: NodeLike[] = [], attributes: Record<string, string> = {}): NodeLike {
  return { nodeType: 1, nodeName: name, nodeValue: null, childNodes: children, getAttribute: (key) => attributes[key] ?? null };
}

describe("what a note is", () => {
  it("is an embed with the note address, and nothing else", () => {
    expect(isNote({ type: "embeddable", link: BOARD_NOTE_LINK })).toBe(true);
    expect(isNote({ type: "embeddable", link: "anamnesis://page/abc" })).toBe(false);
    expect(isNote({ type: "rectangle", link: BOARD_NOTE_LINK })).toBe(false);
  });

  it("reads its colour and lines off the element, tolerantly", () => {
    const note = noteOf({
      type: "embeddable",
      link: BOARD_NOTE_LINK,
      customData: {
        note: {
          colour: "teal",
          lines: [[{ text: "Hello", bold: true }, { text: " there", link: "javascript:alert(1)" }], "not a line", [{ nope: 1 }, { text: "ok", italic: "yes" }]],
        },
      },
    });
    expect(note).toEqual({ colour: "teal", lines: [[{ text: "Hello", bold: true }, { text: " there" }], [], [{ text: "ok" }]] });
  });

  it("gives a note with no data, or a colour it does not know, the default colour and no words", () => {
    expect(noteOf({ type: "embeddable", link: BOARD_NOTE_LINK })).toEqual({ colour: DEFAULT_NOTE_COLOUR, lines: [] });
    expect(noteOf({ type: "embeddable", link: BOARD_NOTE_LINK, customData: { note: { colour: "mauve", lines: [] } } })?.colour).toBe(DEFAULT_NOTE_COLOUR);
    expect(noteOf({ type: "rectangle" })).toBeNull();
  });

  it("has twelve colours, each with a name for the picker", () => {
    expect(NOTE_COLOURS).toHaveLength(12);
    expect(noteColourName("sky")).toBe("Sky");
    expect(emptyNote("red")).toEqual({ colour: "red", lines: [] });
  });

  it("allows a page link or a web address in its words and nothing else", () => {
    expect(noteLinkAllowed("anamnesis://page/abc")).toBe("anamnesis://page/abc");
    expect(noteLinkAllowed("  https://example.org/x ")).toBe("https://example.org/x");
    expect(noteLinkAllowed("anamnesis://page/")).toBeNull();
    expect(noteLinkAllowed("javascript:alert(1)")).toBeNull();
    expect(noteLinkAllowed("file:///C:/secret")).toBeNull();
    expect(noteLinkAllowed("about")).toBeNull();
  });

  it("names the pages its words link to, once each, and says its plain words", () => {
    const note: Note = {
      colour: "yellow",
      lines: [
        [{ text: "See " }, { text: "Valera", link: "anamnesis://page/v1" }, { text: " and " }, { text: "the site", link: "https://x.org" }],
        [{ text: "Valera again", link: "anamnesis://page/v1" }, { text: "!", bold: true }],
      ],
    };
    expect(notePageIds(note)).toEqual(["v1"]);
    expect(noteText(note)).toBe("See Valera and the site\nValera again!");
    expect(noteIsEmpty(note)).toBe(false);
    expect(noteIsEmpty({ colour: "yellow", lines: [[], [{ text: "" }]] })).toBe(true);
  });
});

describe("the editor's DOM, read back into lines", () => {
  it("reads the first line as bare text and each Enter as a div", () => {
    const root = el("DIV", [text("first"), el("DIV", [text("second")]), el("DIV", [text("third")])]);
    expect(noteLinesFromDom(root)).toEqual([[{ text: "first" }], [{ text: "second" }], [{ text: "third" }]]);
  });

  it("keeps an empty line, which the editor writes as a div holding a br", () => {
    const root = el("DIV", [el("DIV", [text("a")]), el("DIV", [el("BR")]), el("DIV", [text("c")])]);
    expect(noteLinesFromDom(root)).toEqual([[{ text: "a" }], [], [{ text: "c" }]]);
  });

  it("keeps the empty line Enter just made at the end", () => {
    const root = el("DIV", [el("DIV", [text("a")]), el("DIV", [el("BR")])]);
    expect(noteLinesFromDom(root)).toEqual([[{ text: "a" }], []]);
  });

  it("takes a br between words as a line break, and a trailing one as nothing", () => {
    expect(noteLinesFromDom(el("DIV", [text("a"), el("BR"), text("b")]))).toEqual([[{ text: "a" }], [{ text: "b" }]]);
    expect(noteLinesFromDom(el("DIV", [text("a"), el("BR")]))).toEqual([[{ text: "a" }]]);
    expect(noteLinesFromDom(el("DIV", [el("DIV", [text("a"), el("BR")]), el("DIV", [text("b")])]))).toEqual([[{ text: "a" }], [{ text: "b" }]]);
  });

  it("reads bold and italic from the elements and from pasted styles, merging runs alike", () => {
    const root = el("DIV", [
      text("plain "),
      el("B", [text("bold")]),
      el("STRONG", [text(" still")]),
      el("SPAN", [text(" styled")], { style: "font-weight: 700; color: red" }),
      el("EM", [el("I", [text(" it")])]),
      el("SPAN", [text(" both")], { style: "font-style:italic;font-weight:bold" }),
      el("U", [text(" under")]),
    ]);
    expect(noteLinesFromDom(root)).toEqual([
      [
        { text: "plain " },
        { text: "bold still styled", bold: true },
        { text: " it", italic: true },
        { text: " both", bold: true, italic: true },
        { text: " under" },
      ],
    ]);
  });

  it("keeps a page link and a web link, and drops a link it does not allow", () => {
    const root = el("DIV", [
      el("A", [text("Valera")], { href: "anamnesis://page/v1" }),
      text(" "),
      el("A", [el("B", [text("site")])], { href: "https://x.org/" }),
      text(" "),
      el("A", [text("bad")], { href: "javascript:alert(1)" }),
    ]);
    expect(noteLinesFromDom(root)).toEqual([
      [{ text: "Valera", link: "anamnesis://page/v1" }, { text: " " }, { text: "site", bold: true, link: "https://x.org/" }, { text: " bad" }],
    ]);
  });

  it("turns the editor's hard spaces back into spaces and skips scripts and styles", () => {
    const root = el("DIV", [text("a\u00a0b"), el("STYLE", [text(".x{}")]), el("SCRIPT", [text("alert(1)")]), text("\n")]);
    expect(noteLinesFromDom(root)).toEqual([[{ text: "a b" }]]);
  });

  it("flattens nested blocks to their lines", () => {
    const root = el("DIV", [el("DIV", [el("DIV", [text("a")])]), el("P", [text("b")])]);
    expect(noteLinesFromDom(root)).toEqual([[{ text: "a" }], [{ text: "b" }]]);
  });

  it("reads an empty editor as no lines at all", () => {
    expect(noteLinesFromDom(el("DIV"))).toEqual([]);
    expect(noteLinesFromDom(el("DIV", [el("DIV", [el("BR")])]))).toEqual([]);
    expect(noteLinesFromDom(el("DIV", [el("BR")]))).toEqual([]);
  });
});

describe("lines written as the editor's HTML", () => {
  it("writes a div per line, the marks as their elements, and escapes the words", () => {
    const html = noteHtml([
      [{ text: "a <b> & \"c\"" }, { text: "bold", bold: true }, { text: "both", bold: true, italic: true }],
      [],
      [{ text: "site", link: 'https://x.org/?q="1"' }],
    ]);
    expect(html).toBe(
      '<div>a &lt;b&gt; &amp; &quot;c&quot;<strong>bold</strong><strong><em>both</em></strong></div><div><br></div><div><a href="https://x.org/?q=&quot;1&quot;">site</a></div>',
    );
  });

  it("reads back what it wrote", () => {
    const lines = [[{ text: "one " }, { text: "two", bold: true as const }], [], [{ text: "three", italic: true as const, link: "anamnesis://page/p" }]];
    // The reader is handed the same shape the browser would parse the HTML into.
    const root = el("DIV", [
      el("DIV", [text("one "), el("STRONG", [text("two")])]),
      el("DIV", [el("BR")]),
      el("DIV", [el("A", [el("EM", [text("three")])], { href: "anamnesis://page/p" })]),
    ]);
    expect(noteHtml(lines)).toContain("<div>one <strong>two</strong></div>");
    expect(noteLinesFromDom(root)).toEqual(lines);
  });
});
