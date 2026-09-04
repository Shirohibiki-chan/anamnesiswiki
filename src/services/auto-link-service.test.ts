// The one command in the phase that rewrites writing she has already done, so
// the rules it matches by are the whole of what makes it safe. Every test here
// is a way it could quietly link the wrong thing.
import { describe, expect, it } from "vitest";
import { createNode, type Node } from "../constants/schema";
import { blocksToRelink, findLinkMatches, linkableNames, withLinkedMatches } from "./auto-link-service";

function page(name: string, patch: Partial<Node> = {}): Node {
  return { ...createNode({ parentId: null, templateKey: "character", name }), ...patch };
}

function world(...nodes: Node[]): Record<string, Node> {
  return Object.fromEntries(nodes.map((node) => [node.id, node]));
}

const text = (blockId: string, value: string) => ({
  id: blockId,
  type: "paragraph",
  content: [{ type: "text", text: value, styles: {} }],
});

describe("linkableNames", () => {
  it("offers every page but the one being written on", () => {
    const self = page("Valera");
    const other = page("Quietgate");
    const names = linkableNames(world(self, other), self.id);
    expect(names.map((entry) => entry.name)).toEqual(["Quietgate"]);
  });

  // Same rule `[[ ]]` follows: nothing here can tell which Sable a sentence
  // meant, and guessing is how a bulk pass points half a world at the wrong
  // page.
  it("leaves out a name two pages answer to", () => {
    const names = linkableNames(world(page("Sable"), page("Sable"), page("Quietgate")), "none");
    expect(names.map((entry) => entry.name)).toEqual(["Quietgate"]);
  });

  it("counts an alias, and says which page it belongs to", () => {
    const valera = page("Valera Jiang", { aliases: ["Val"] });
    const names = linkableNames(world(valera), "none");
    expect(names.find((entry) => entry.name === "Val")?.pageName).toBe("Valera Jiang");
  });

  it("leaves out names too short to be anything but noise", () => {
    const names = linkableNames(world(page("Ka"), page("Kal")), "none");
    expect(names.map((entry) => entry.name)).toEqual(["Kal"]);
  });

  it("hands them back longest first, so a long name wins", () => {
    const names = linkableNames(world(page("Valera"), page("Valera Jiang")), "none");
    expect(names[0].name).toBe("Valera Jiang");
  });
});

describe("findLinkMatches", () => {
  const names = linkableNames(world(page("Quietgate"), page("Art")), "none");

  it("finds a name written in prose", () => {
    const found = findLinkMatches([text("b1", "The road to Quietgate is closed.")], names);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ blockId: "b1", text: "Quietgate", start: 12, end: 21 });
  });

  // Without this a page called Art claims the middle of "particular", which is
  // the sort of thing found weeks later in a paragraph nobody was looking at.
  it("only matches whole words", () => {
    expect(findLinkMatches([text("b1", "a particular quietgater")], names)).toEqual([]);
  });

  it("matches whatever case it is written in, and keeps what was written", () => {
    const found = findLinkMatches([text("b1", "we went to quietgate")], names);
    expect(found[0].text).toBe("quietgate");
  });

  // A mention is a different kind of inline item, so the words inside one
  // cannot be matched — which is what stops a second pass linking the links the
  // first pass made.
  it("never looks inside a link that is already there", () => {
    const block = {
      id: "b1",
      type: "paragraph",
      content: [
        { type: "text", text: "off to ", styles: {} },
        { type: "mention", props: { nodeId: "n1", label: "Quietgate", text: "" } },
      ],
    };
    expect(findLinkMatches([block], names)).toEqual([]);
  });

  it("prefers the longer name where two overlap", () => {
    const both = linkableNames(world(page("Valera"), page("Valera Jiang")), "none");
    const found = findLinkMatches([text("b1", "Valera Jiang went south")], both);
    expect(found).toHaveLength(1);
    expect(found[0].text).toBe("Valera Jiang");
  });

  it("finds several in one line, in the order they are written", () => {
    const found = findLinkMatches([text("b1", "Art in Quietgate, and Art again")], names);
    expect(found.map((entry) => entry.text)).toEqual(["Art", "Quietgate", "Art"]);
  });

  it("looks inside nested blocks", () => {
    const nested = { id: "b0", type: "bulletListItem", content: [], children: [text("b1", "Quietgate")] };
    expect(findLinkMatches([nested], names)[0]?.blockId).toBe("b1");
  });

  it("gives the preview the sentence around the name", () => {
    const found = findLinkMatches([text("b1", "The road to Quietgate is closed.")], names);
    expect(found[0].context).toBe("The road to Quietgate is closed.");
  });
});

describe("withLinkedMatches", () => {
  const names = linkableNames(world(page("Quietgate"), page("Art")), "none");

  it("splits the text around the name and puts a link in its place", () => {
    const block = text("b1", "The road to Quietgate is closed.");
    const matches = findLinkMatches([block], names);
    const linked = withLinkedMatches(block.content, matches, "b1") as Record<string, unknown>[];

    expect(linked).toHaveLength(3);
    expect(linked[0]).toMatchObject({ type: "text", text: "The road to " });
    expect(linked[1]).toMatchObject({ type: "mention" });
    expect(linked[2]).toMatchObject({ type: "text", text: " is closed." });
  });

  // Empty link text is what keeps a link following a rename; anything else pins
  // the wording, which is right for an alias and for prose in another case.
  it("leaves the wording open when the prose already says the page's name", () => {
    const block = text("b1", "to Quietgate");
    const linked = withLinkedMatches(block.content, findLinkMatches([block], names), "b1") as {
      props?: { text?: string };
    }[];
    expect(linked[1].props?.text).toBe("");
  });

  it("pins the wording when the prose says something else", () => {
    const block = text("b1", "to quietgate");
    const linked = withLinkedMatches(block.content, findLinkMatches([block], names), "b1") as {
      props?: { text?: string };
    }[];
    expect(linked[1].props?.text).toBe("quietgate");
  });

  it("handles several matches in one line without disturbing the offsets", () => {
    const block = text("b1", "Art in Quietgate, and Art again");
    const linked = withLinkedMatches(block.content, findLinkMatches([block], names), "b1") as {
      type: string;
      text?: string;
    }[];
    expect(linked.map((piece) => piece.type)).toEqual([
      "mention",
      "text",
      "mention",
      "text",
      "mention",
      "text",
    ]);
  });

  it("links only what it was given, so an unticked match is left as prose", () => {
    const block = text("b1", "Art in Quietgate");
    const [first] = findLinkMatches([block], names);
    const linked = withLinkedMatches(block.content, [first], "b1") as { type: string }[];
    expect(linked.filter((piece) => piece.type === "mention")).toHaveLength(1);
  });

  it("hands back the content it was given for a block with nothing to do", () => {
    const block = text("b1", "nothing here");
    expect(withLinkedMatches(block.content, [], "b1")).toBe(block.content);
  });

  it("names the blocks that have to be written", () => {
    const found = findLinkMatches([text("b1", "Quietgate"), text("b2", "Art"), text("b3", "nothing")], names);
    expect(blocksToRelink(found)).toEqual(["b1", "b2"]);
  });
});
