// The one template that ships with the app, so "Start from a template" works
// on a machine nobody has ever sent a file to.
//
// **One, not a menu.** The feature is people handing each other a setup they
// worked out — her framing, 2026-08-19, from how Obsidian folder structures get
// passed around. A rank of authored templates would make that the app's opinion
// instead of hers, and it is also the shape that grows into a gallery, which
// the Policy Boundary rules out (nothing is fetched, ever).
//
// It is deliberately *not* the same as what New Project makes. New Project's
// six flat folders are a floor; this is what the entry beside it is for —
// nesting worked out, and a starter page in each folder showing what belongs
// there. If the two were identical the third rail entry would be a second
// button for the first one.
//
// Ids are readable strings rather than UUIDs because they are only wiring
// inside this file, and every one of them is thrown away and re-minted the
// moment the template is used. Reading the tree in this literal should not
// require decoding.
import type { ProjectTemplateFile, ProjectTemplateNode } from "./project-template";
import { PROJECT_TEMPLATE_FORMAT, PROJECT_TEMPLATE_VERSION } from "./project-template";

function folder(id: string, name: string, parentId: string | null = null): ProjectTemplateNode {
  return { id, parentId, templateKey: "folder", name };
}

/**
 * A blank page of some kind, sitting in a folder to show what goes there.
 *
 * Named for its template on purpose — the page *is* a blank Character, and
 * saying so is more use than a cute label. It is also the first thing anyone
 * renames, which makes it a decent way to start rather than a thing to delete.
 */
function starter(id: string, templateKey: string, name: string, parentId: string): ProjectTemplateNode {
  return { id, parentId, templateKey, name };
}

export const DEFAULT_PROJECT_TEMPLATE: ProjectTemplateFile = {
  format: PROJECT_TEMPLATE_FORMAT,
  version: PROJECT_TEMPLATE_VERSION,
  name: "Worldbuilding Starter",
  description: "Canon and its alternate universes, with a blank page of each kind where it belongs.",
  // Fixed rather than Date.now(): this is a literal in the build, not something
  // made at a moment, and a "created" date that moves every time the app starts
  // would be a lie the picker then displays.
  createdAt: 0,
  nodes: [
    folder("canon", "Canon"),
    folder("canon-characters", "Characters", "canon"),
    starter("canon-character", "character", "Character", "canon-characters"),
    folder("canon-locations", "Locations", "canon"),
    starter("canon-location", "location", "Location", "canon-locations"),
    folder("canon-factions", "Factions", "canon"),
    starter("canon-faction", "faction", "Faction", "canon-factions"),
    folder("canon-species", "Species", "canon"),
    starter("canon-species-page", "species", "Species", "canon-species"),
    folder("canon-events", "Events", "canon"),
    starter("canon-event", "event", "Event", "canon-events"),

    // Empty on purpose. An AU is named for what it is — Demonic AU, Merfolk AU
    // — so a starter page in here would be a page called "Alternate Universe"
    // that nobody wants. The folder existing is the whole hint.
    folder("aus", "AUs"),

    folder("worldbuilding", "Worldbuilding"),
    starter("worldbuilding-note", "note", "Note", "worldbuilding"),
  ],
};
