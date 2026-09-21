import { describe, expect, it } from "vitest";
import { slashMenuCatalogue } from "./slash-menu";

describe("slashMenuCatalogue", () => {
  const commands = slashMenuCatalogue();

  it("lists the menu's commands with their words", () => {
    const titles = commands.map((command) => command.title);
    // Ours and BlockNote's, side by side — a callout, a page block, a player,
    // and one of the built-ins.
    expect(titles).toContain("Info");
    expect(titles).toContain("Heading 1");
    expect(titles).toContain("YouTube");
    for (const command of commands) {
      expect(command.title).not.toBe("");
      expect(command.group).not.toBe("");
    }
  });

  it("carries the one removal the menu makes: BlockNote's own Quote", () => {
    expect(commands.filter((command) => command.title === "Quote")).toHaveLength(1);
  });

  it("names no command twice", () => {
    const titles = commands.map((command) => command.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("gives each command a short form no earlier one already has", () => {
    const shorts = commands.map((command) => command.short.toLowerCase());
    expect(new Set(shorts).size).toBe(shorts.length);
    // Bullet List and Check List both answer to "ul"; only the first gets it.
    const bullet = commands.find((command) => command.title === "Bullet List");
    const check = commands.find((command) => command.title === "Check List");
    expect(bullet?.short).toBe("ul");
    expect(check?.short).not.toBe("ul");
  });

  it("is built once", () => {
    expect(slashMenuCatalogue()).toBe(commands);
  });
});
