// "Callout Colour" on a block's drag-handle menu, for the three callouts.
//
// **The corner dot was not found.** A callout's colour lived only on a dot in
// its top-right corner that appeared on hover — her verdict on 2026-09-17 was
// that nobody would ever see it, and that a colour is a thing the six dots
// beside the block should offer like everything else. So it is here, as a
// submenu of the same swatches, and the dot stays for whoever already knows
// it. The block's own colour, not BlockNote's text/background colours, which
// are the *Colors* item beside this one.
import { SideMenuExtension } from "@blocknote/core/extensions";
import { useBlockNoteEditor, useComponentsContext, useExtensionState } from "@blocknote/react";
import { Check, X } from "lucide-react";
import { COLOR_PALETTE } from "../../constants/palette";

const CALLOUT_TYPES = new Set(["calloutInfo", "calloutQuote", "calloutSecret"]);

export function CalloutColorMenuItem() {
  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor();
  const block = useExtensionState(SideMenuExtension, { editor, selector: (state) => state?.block });

  if (!block || !CALLOUT_TYPES.has(block.type)) return null;
  const current = typeof block.props.color === "string" ? block.props.color : "";
  const pick = (color: string) => editor.updateBlock(block, { props: { color } });

  return (
    <Components.Generic.Menu.Root position="right" sub>
      <Components.Generic.Menu.Trigger sub>
        <Components.Generic.Menu.Item className="bn-menu-item" subTrigger>
          Callout Colour
        </Components.Generic.Menu.Item>
      </Components.Generic.Menu.Trigger>
      <Components.Generic.Menu.Dropdown sub className="bn-menu-dropdown editor-callout-menu-swatches">
        {/* The palette's own shape — light over mid over deep, a hue per
            column — the same grid the corner dot opens. */}
        <span className="editor-callout-swatch-grid">
          {COLOR_PALETTE.filter((color) => color.hex).map((color) => (
            <button
              key={color.key}
              type="button"
              className="editor-callout-swatch"
              aria-label={color.name}
              title={color.name}
              style={{ background: color.hex ?? undefined }}
              onClick={() => pick(color.key)}
            >
              {color.key === current && <Check size={11} />}
            </button>
          ))}
        </span>
        <button type="button" className="editor-callout-swatch-clear" onClick={() => pick("")}>
          <X size={11} /> The Usual Colour
        </button>
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
}
