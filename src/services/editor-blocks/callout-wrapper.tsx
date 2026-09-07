// Shared shell for the three callout blocks (Info/Quote/Secret) — only the
// color-token group and the Secret-only label chip differ between them. See
// docs/constants-and-theming.md §Callout blocks.
//
// **A callout can be given a colour of its own as of Phase 19.5, and that is
// not the same as giving it a type.** The three types carry behaviour — Secret
// is what a publish must strip, Quote is what a `.lk` blockquote imports as —
// so a colour is a fourth thing about a block rather than a fourth block. An
// uncoloured callout is exactly what it always was: the `--callout-accent`
// override is simply absent, and every rule in `page.css` falls back to the
// type's own tokens.
//
// **And an icon of its own, which is a third axis again.** Every callout wears
// one — its type's, until she picks — and taking it off is a third answer that
// neither of the other two can express. The colour used to decide the icon and
// no longer does; see `constants/callout-colors.ts` for why that was wrong and
// why all three states still live in one prop with a sentinel.
import { useContext, useRef, useState } from "react";
import { SmilePlus } from "lucide-react";
import { CALLOUT_ICON_NONE, resolveCalloutIcon } from "../../constants/callout-colors";
import { getPaletteHex } from "../../constants/palette";
import { CalloutColorButton } from "./callout-color-button";
import { IconPickContext } from "./icon-pick-context";
import { StoredIcon } from "./stored-icon";

type CalloutWrapperProps = {
  variant: "info" | "quote" | "secret";
  /** A palette key, or empty for the type's own colour. */
  color: string;
  onColor: (color: string) => void;
  /** A glyph name, an emoji, `CALLOUT_ICON_NONE`, or empty for the type's own. */
  icon: string;
  onIcon: (icon: string) => void;
  contentRef: (node: HTMLElement | null) => void;
};

export function CalloutWrapper({ variant, color, onColor, icon, onIcon, contentRef }: CalloutWrapperProps) {
  const hex = getPaletteHex(color);
  const Picker = useContext(IconPickContext);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const slot = useRef<HTMLSpanElement>(null);
  const add = useRef<HTMLButtonElement>(null);

  /** Opens the picker under whichever control was pressed. */
  const openPicker = (anchor: HTMLElement | null) => {
    if (!Picker) return;
    setRect(anchor?.getBoundingClientRect() ?? null);
  };

  // **The lock stays on a Secret whatever colour it is wearing.** A red Secret
  // is still the block a publish has to strip, and the label is the only thing
  // on screen that says so — which is why the icon below is for the other two.
  const chosen = variant === "secret" ? null : resolveCalloutIcon(variant, icon);

  return (
    <div
      className={`editor-callout editor-callout-${variant}${hex ? " editor-callout-colored" : ""}`}
      style={hex ? { ["--callout-accent" as string]: hex } : undefined}
    >
      {variant === "secret" && <span className="editor-callout-secret-label">🔒 SECRET</span>}
      {variant !== "secret" && chosen && (
        // The icon itself, and the way to change it. There is no invisible
        // stand-in when the callout has none — that was a 15px ghost in the
        // corner, and "take the icon off and you cannot put one back" is how it
        // read from outside. `Add an icon` in the corner controls is the way
        // back now, and it is a button you can actually see.
        <span
          ref={slot}
          className="editor-callout-icon"
          role={Picker ? "button" : undefined}
          tabIndex={-1}
          contentEditable={false}
          aria-label="Icon on this callout"
          title="Icon on this callout"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => openPicker(slot.current)}
        >
          {/* One path for both the type's icon and one she picked — they are
              the same kind of value now, which is the point of the rewrite. */}
          <StoredIcon icon={chosen.name} size={15} />
        </span>
      )}
      {Picker && rect && (
        // eslint-disable-next-line react-hooks/static-components -- the value is a module-level component (EditorIconPicker), which is the invariant IconPickerRenderer states; the rule cannot see across a context
        <Picker
          anchorRect={rect}
          // Only what she actually chose. The type's own icon is not a choice
          // in the grid, so nothing reads as selected until she makes one —
          // which is the truth of it, and is what "The usual icon" goes back to.
          value={icon === CALLOUT_ICON_NONE ? undefined : icon || undefined}
          onPick={(picked) => {
            // Cleared means *no icon*, not back to the type's own — those are
            // two different answers and this is the one the clear button makes.
            onIcon(picked ?? CALLOUT_ICON_NONE);
            setRect(null);
          }}
          defaultAction={{ label: "The usual icon", onPick: () => { onIcon(""); setRect(null); } }}
          onClose={() => setRect(null)}
        />
      )}
      <div className="editor-callout-body" ref={contentRef} />
      {/* Both hover controls in one corner, so the colour dot people already
          know teaches where the icon lives too. */}
      <span className="editor-callout-tools">
        {variant !== "secret" && !chosen && (
          <button
            ref={add}
            type="button"
            className="editor-callout-icon-add"
            aria-label="Add an icon"
            title="Add an icon"
            contentEditable={false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => openPicker(add.current)}
          >
            <SmilePlus size={12} />
          </button>
        )}
        <CalloutColorButton value={color} onPick={onColor} />
      </span>
    </div>
  );
}
