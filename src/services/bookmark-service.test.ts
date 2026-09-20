import { describe, expect, it } from "vitest";
import { bookmarkOf, imageTypeOf, isBookmarkCard, pageSummary, placeholderBookmark, siteOf, webAddressIn } from "./bookmark-service";

describe("webAddressIn", () => {
  it("takes a lone web address, with the whitespace a paste carries", () => {
    expect(webAddressIn("  https://example.com/a-page?x=1#top \n")).toBe("https://example.com/a-page?x=1#top");
    expect(webAddressIn("http://example.com")).toBe("http://example.com/");
  });

  it("leaves anything that is not just an address to the library", () => {
    expect(webAddressIn("see https://example.com for more")).toBeNull();
    expect(webAddressIn("example.com")).toBeNull();
    expect(webAddressIn("ftp://example.com/file")).toBeNull();
    expect(webAddressIn("anamnesis://page/abc")).toBeNull();
    expect(webAddressIn("")).toBeNull();
  });
});

describe("pageSummary", () => {
  const html = `<!doctype html><html><head>
    <title>
      The Plain   Title
    </title>
    <meta property="og:title" content="Valera &amp; the Sword" />
    <meta name="description" content="A plain description">
    <meta property='og:description' content='What the page is about &#x27;really&#x27;'>
    <meta content="Codex Vale" property="og:site_name">
    <meta property="og:image" content="/pictures/valera.jpg?size=large">
    <meta property="og:image" content="https://elsewhere/second.png">
  </head><body></body></html>`;

  it("prefers Open Graph, resolves the picture against the page, and takes the first of each tag", () => {
    expect(pageSummary("https://www.example.com/wiki/valera", html)).toEqual({
      title: "Valera & the Sword",
      description: "What the page is about 'really'",
      site: "Codex Vale",
      image: "https://www.example.com/pictures/valera.jpg?size=large",
    });
  });

  it("falls back to the title tag, the plain description and the host", () => {
    const plain = `<html><head><title>Just a\n  Page</title><meta name="description" content="Plain"></head></html>`;
    expect(pageSummary("https://www.example.com/x", plain)).toEqual({ title: "Just a Page", description: "Plain", site: "example.com", image: null });
  });

  it("uses the host when the page says nothing at all, and refuses a picture that is not a web address", () => {
    expect(pageSummary("https://example.com/x", "<html></html>")).toEqual({ title: "example.com", description: "", site: "example.com", image: null });
    const odd = `<meta property="og:image" content="javascript:alert(1)">`;
    expect(pageSummary("https://example.com/x", odd).image).toBeNull();
  });
});

describe("imageTypeOf", () => {
  it("reads the format off the first bytes, and refuses a page pretending to be a picture", () => {
    expect(imageTypeOf(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(imageTypeOf(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(imageTypeOf(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe("image/gif");
    expect(imageTypeOf(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(imageTypeOf(new TextEncoder().encode('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe("image/svg+xml");
    expect(imageTypeOf(new TextEncoder().encode("<!doctype html><html>not found</html>"))).toBeNull();
    expect(imageTypeOf(new Uint8Array([]))).toBeNull();
  });
});

describe("the bookmark on an element", () => {
  it("reads a card's bookmark and fills what an older card left out", () => {
    const card = { type: "embeddable", link: "https://example.com/x", customData: { bookmark: { url: "https://example.com/x", title: "X" } } };
    expect(bookmarkOf(card)).toEqual({ url: "https://example.com/x", title: "X", description: "", site: "example.com", image: null, fetched: false });
    expect(isBookmarkCard(card)).toBe(true);
  });

  it("is nothing for a page card, a shape, or an embed with no bookmark on it", () => {
    expect(bookmarkOf({ type: "embeddable", link: "anamnesis://page/abc" })).toBeNull();
    expect(bookmarkOf({ type: "rectangle", customData: { bookmark: { url: "https://example.com" } } })).toBeNull();
    expect(bookmarkOf({ type: "embeddable", link: "https://youtube.com/watch?v=1" })).toBeNull();
    expect(bookmarkOf(null)).toBeNull();
  });

  it("starts as the address alone, not yet fetched", () => {
    expect(placeholderBookmark("https://www.example.com/x")).toEqual({
      url: "https://www.example.com/x",
      title: "example.com",
      description: "",
      site: "example.com",
      image: null,
      fetched: false,
    });
    expect(siteOf("not a url")).toBe("not a url");
  });
});
