import { describe, expect, it } from "vitest";
import { imageDisplayName } from "./page-images";

// Only the naming is covered here. The rest of page-images.ts is a DOM query,
// and the test environment is node with no DOM (see vitest.config.ts and
// CLAUDE.md — services are the tested layer precisely because they're the ones
// that can be tested without one). The pure half was split out for that reason.
describe("imageDisplayName", () => {
  it("prefers the name the file arrived with", () => {
    expect(imageDisplayName("valera-portrait.png", "blob:http://localhost/9f8c-4d1a")).toBe("valera-portrait.png");
  });

  it("falls back to the last path segment of a web address", () => {
    expect(imageDisplayName("", "https://example.com/art/portraits/valera.png")).toBe("valera.png");
  });

  it("un-escapes a name that was percent-encoded in the address", () => {
    expect(imageDisplayName("", "https://example.com/her%20sword.png")).toBe("her sword.png");
  });

  it("ignores a query string, which isn't part of the name", () => {
    expect(imageDisplayName("", "https://example.com/valera.png?width=800")).toBe("valera.png");
  });

  // A blob URL's last segment is the object URL's UUID — it was never a file
  // name and reads as noise, so an uploaded picture with no name shows none.
  it("offers nothing for a blob URL", () => {
    expect(imageDisplayName("", "blob:http://localhost/9f8c-4d1a")).toBe("");
  });

  it("offers nothing for a stored asset reference", () => {
    expect(imageDisplayName("", "anamnesis-asset:9f8c-4d1a.png")).toBe("");
  });

  it("offers nothing rather than throwing on an unparseable address", () => {
    expect(imageDisplayName("", "https://")).toBe("");
  });

  it("copes with an address that ends in a slash", () => {
    expect(imageDisplayName("", "https://example.com/gallery/")).toBe("");
  });
});
