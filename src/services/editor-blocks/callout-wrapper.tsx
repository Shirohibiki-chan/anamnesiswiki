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
import { createElement } from "react";
import { getCalloutIcon, getCalloutIconLabel } from "../../constants/callout-colors";
import { getPaletteHex } from "../../constants/palette";
import { CalloutColorButton } from "./callout-color-button";

type CalloutWrapperProps = {
  variant: "info" | "quote" | "secret";
  /** A palette key, or empty for the type's own colour. */
  color: string;
  onColor: (color: string) => void;
  contentRef: (node: HTMLElement | null) => void;
};

export function CalloutWrapper({ variant, color, onColor, contentRef }: CalloutWrapperProps) {
  const hex = getPaletteHex(color);
  // **The lock stays on a Secret whatever colour it is wearing.** A red Secret
  // is still the block a publish has to strip, and the label is the only thing
  // on screen that says so — which is why the icon below is for the other two.
  const icon = variant === "secret" ? undefined : getCalloutIcon(color);
  const iconLabel = getCalloutIconLabel(color);

  return (
    <div
      className={`editor-callout editor-callout-${variant}${hex ? " editor-callout-colored" : ""}`}
      style={hex ? { ["--callout-accent" as string]: hex } : undefined}
    >
      {variant === "secret" && <span className="editor-callout-secret-label">🔒 SECRET</span>}
      {icon && (
        <span className="editor-callout-icon" aria-label={iconLabel} role="img">
          {/* `createElement` rather than `<Icon />`: naming a component into a
              local and rendering it is what react-hooks/static-components is
              there to stop, and the icon genuinely does change with the prop. */}
          {createElement(icon, { size: 15 })}
        </span>
      )}
      <div className="editor-callout-body" ref={contentRef} />
      <CalloutColorButton value={color} onPick={onColor} />
    </div>
  );
}
