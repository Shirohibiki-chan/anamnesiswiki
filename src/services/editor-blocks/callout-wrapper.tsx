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
// **And an icon of its own, which is a third axis again.** The colour still
// implies one — green a tick, amber a caution — and that stays the default;
// picking one is what stops the colour speaking, and taking it off is a third
// answer that neither of the other two can express. See
// `constants/callout-colors.ts` for why that lives in one prop with a
// sentinel rather than in two.
import { createElement, useContext, useRef, useState } from "react";
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
  /** A glyph name, an emoji, `CALLOUT_ICON_NONE`, or empty for the colour's own. */
  icon: string;
  onIcon: (icon: string) => void;
  contentRef: (node: HTMLElement | null) => void;
};

export function CalloutWrapper({ variant, color, onColor, icon, onIcon, contentRef }: CalloutWrapperProps) {
  const hex = getPaletteHex(color);
  const Picker = useContext(IconPickContext);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const slot = useRef<HTMLSpanElement>(null);

  // **The lock stays on a Secret whatever colour it is wearing.** A red Secret
  // is still the block a publish has to strip, and the label is the only thing
  // on screen that says so — which is why the icon below is for the other two.
  const chosen = variant === "secret" ? { kind: "none" as const } : resolveCalloutIcon(color, icon);

  return (
    <div
      className={`editor-callout editor-callout-${variant}${hex ? " editor-callout-colored" : ""}`}
      style={hex ? { ["--callout-accent" as string]: hex } : undefined}
    >
      {variant === "secret" && <span className="editor-callout-secret-label">🔒 SECRET</span>}
      {variant !== "secret" && (
        // **The slot is there even when nothing is in it**, faint until the
        // pointer is over the callout — the same manner as the colour dot. A
        // callout that has had its icon taken off would otherwise have nowhere
        // left to click to put one back.
        <span
          ref={slot}
          className={`editor-callout-icon${chosen.kind === "none" ? " editor-callout-icon-empty" : ""}`}
          role={Picker ? "button" : undefined}
          tabIndex={-1}
          contentEditable={false}
          aria-label={chosen.kind === "derived" ? chosen.label : "Icon on this callout"}
          title="Icon on this callout"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (!Picker) return;
            setRect(slot.current?.getBoundingClientRect() ?? null);
          }}
        >
          {chosen.kind === "derived" &&
            /* `createElement` rather than `<Icon />`: naming a component into a
               local and rendering it is what react-hooks/static-components is
               there to stop, and the icon genuinely does change with the prop. */
            createElement(chosen.icon, { size: 15 })}
          {chosen.kind === "chosen" && <StoredIcon icon={chosen.name} size={15} />}
        </span>
      )}
      {Picker && rect && (
        // eslint-disable-next-line react-hooks/static-components -- the value is a module-level component (EditorIconPicker), which is the invariant IconPickerRenderer states; the rule cannot see across a context
        <Picker
          anchorRect={rect}
          // Only what she actually chose. A derived icon is not a value in the
          // picker — nothing in the grid is "the one green implies" — so the
          // grid shows nothing as selected until she picks something, which is
          // the truth of it.
          value={icon === CALLOUT_ICON_NONE ? undefined : icon || undefined}
          onPick={(picked) => {
            // Cleared means *no icon*, not back to the colour's own — those are
            // two different answers and this is the one the clear button makes.
            onIcon(picked ?? CALLOUT_ICON_NONE);
            setRect(null);
          }}
          defaultAction={{ label: "The usual icon", onPick: () => { onIcon(""); setRect(null); } }}
          onClose={() => setRect(null)}
        />
      )}
      <div className="editor-callout-body" ref={contentRef} />
      <CalloutColorButton value={color} onPick={onColor} />
    </div>
  );
}
