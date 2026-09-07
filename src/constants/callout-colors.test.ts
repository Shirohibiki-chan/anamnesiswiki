import { describe, expect, it } from "vitest";
import {
  CALLOUT_ICON_NONE,
  CALLOUT_KINDS,
  CALLOUT_TYPE_ICONS,
  resolveCalloutIcon,
} from "./callout-colors";
import { isGlyph } from "./glyphs";
import { COLOR_PALETTE } from "./palette";

describe("the icon a callout wears", () => {
  it("gives every type one, so no callout is ever blank", () => {
    // The whole reason for the rewrite: an uncoloured callout used to derive
    // nothing, so a page held some boxes with an icon and some without for a
    // reason nobody could see.
    expect(resolveCalloutIcon("info", "")).toEqual({ name: "info", chosen: false });
    expect(resolveCalloutIcon("quote", "")).toEqual({ name: "message-square-quote", chosen: false });
  });

  it("stops using the type's own once she has picked", () => {
    expect(resolveCalloutIcon("info", "sword")).toEqual({ name: "sword", chosen: true });
  });

  it("keeps an emoji as itself", () => {
    expect(resolveCalloutIcon("info", "🗡️")).toEqual({ name: "🗡️", chosen: true });
  });

  it("tells no icon apart from the usual icon", () => {
    // The distinction the sentinel exists for. Taking the icon off a callout
    // has to survive; falling back to the type's would be the app putting back
    // the thing she just removed.
    expect(resolveCalloutIcon("info", CALLOUT_ICON_NONE)).toBeNull();
    expect(resolveCalloutIcon("info", "")).not.toBeNull();
  });

  it("draws every type's own icon out of the catalogue", () => {
    // A default naming a glyph that does not exist is a box that silently
    // wears nothing, which is the bug this whole change is about.
    for (const [variant, name] of Object.entries(CALLOUT_TYPE_ICONS)) {
      expect(isGlyph(name), `${variant} wears ${name}, which is not a glyph`).toBe(true);
    }
  });
});

describe("the kinds the menu offers", () => {
  it("names each one once", () => {
    const titles = CALLOUT_KINDS.map((kind) => kind.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("still offers the four conventions, as things you pick", () => {
    // They were inferred from a colour until 2026-09-06. Losing them was never
    // the point — she asked for them, and this is where they went.
    expect(CALLOUT_KINDS.map((kind) => kind.title)).toEqual([
      "Info",
      "Success",
      "Warning",
      "Danger",
      "Quote",
      "Secret",
    ]);
  });

  it("writes a real glyph and a real palette colour onto every new callout", () => {
    // Both props are written at creation, so a kind naming a colour the palette
    // does not offer would make a callout nothing can recolour back.
    const known = new Set(COLOR_PALETTE.map((color) => color.key));
    for (const kind of CALLOUT_KINDS) {
      if (kind.color) expect(known.has(kind.color), `${kind.title} is ${kind.color}`).toBe(true);
      if (kind.icon) expect(isGlyph(kind.icon), `${kind.title} wears ${kind.icon}`).toBe(true);
    }
  });

  it("gives the three conventions an icon of their own rather than leaving it to the colour", () => {
    // The regression guard. If any of these goes back to an empty icon, the
    // colour is deciding again and recolouring a Warning would take its
    // triangle away.
    for (const title of ["Success", "Warning", "Danger"]) {
      const kind = CALLOUT_KINDS.find((entry) => entry.title === title);
      expect(kind?.icon, `${title} has no icon of its own`).toBeTruthy();
      expect(kind?.color, `${title} has no colour of its own`).toBeTruthy();
    }
  });
});
