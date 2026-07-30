// Shared shell for the three callout blocks (Info/Quote/Secret) — only the
// color-token group and the Secret-only label chip differ between them. See
// docs/constants-and-theming.md §Callout blocks.
type CalloutWrapperProps = {
  variant: "info" | "quote" | "secret";
  contentRef: (node: HTMLElement | null) => void;
};

export function CalloutWrapper({ variant, contentRef }: CalloutWrapperProps) {
  return (
    <div className={`editor-callout editor-callout-${variant}`}>
      {variant === "secret" && <span className="editor-callout-secret-label">🔒 SECRET</span>}
      <div className="editor-callout-body" ref={contentRef} />
    </div>
  );
}
