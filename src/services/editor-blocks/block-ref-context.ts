// How the component layer hands the editor a way to draw one of the page's own
// blocks. Phase 19.5. See block-ref.tsx for what fills it in and why.
//
// **Its own file so nothing here is a component.** The spec beside it and the
// slot that consumes it are separated on the same grounds the callouts already
// are — see mention-inline-content.tsx and MentionChip.tsx — and a context
// exported from a file that also defines a component costs the whole file its
// fast refresh.
import { createContext, type ComponentType } from "react";

/**
 * Draws the page block named by `blockId`, or nothing if there is no such block.
 *
 * **A component type, not a function to call.** Whatever fills this slot uses
 * hooks — it has to read the page out of the store — so it has to be rendered
 * as an element rather than invoked, or its hooks become the slot's own and
 * React counts them against the wrong component.
 *
 * **And it must be declared at module level.** It is rendered as a type, and
 * React throws away a subtree whose type changed; a component built inside
 * another component is a new type every render, which would reset every field
 * in the block on each keystroke. `PageBlock` is module-level for this reason.
 */
export type BlockRefRenderer = ComponentType<{ blockId: string }>;

/**
 * **Null is a real state, not a missing provider.** BlockNote renders these
 * blocks anywhere it renders a document, and not every one of those places has
 * the app's panel around it. Drawing nothing is the right answer there.
 */
export const BlockRefRenderContext = createContext<BlockRefRenderer | null>(null);
