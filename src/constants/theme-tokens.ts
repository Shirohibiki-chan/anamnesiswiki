// What Settings → Appearance lets you point a colour picker at, and the twelve
// gradient slots it can fill.
//
// This is a *subset* of the token system in `src/index.css` on purpose. A theme
// file can set any token it likes — that's what hand-written CSS is for — but a
// panel offering all forty would be a wall of swatches nobody could navigate,
// and most of them are derived or structural. What's here is the set that
// actually changes how the app looks.
//
// Three tokens are deliberately *not* here and are computed instead: the two
// accent tints and the three callout tints are alpha versions of a colour
// that's already in the list, and asking someone to keep `--color-accent-faint`
// in step with `--color-accent-light` by hand is asking them to ship a theme
// where the buttons don't match. See `deriveTokens` in services/theme-editor.ts.

export type ColorToken = {
  token: string;
  label: string;
  /** Shown under the label. Says where you'll see it, not what it's called. */
  hint: string;
};

export type ColorGroup = {
  key: string;
  label: string;
  /** Collapsed by default. The two you rarely need are; the rest aren't. */
  advanced?: boolean;
  tokens: readonly ColorToken[];
};

export const COLOR_GROUPS: readonly ColorGroup[] = [
  {
    key: "surfaces",
    label: "Backgrounds",
    tokens: [
      { token: "--color-bg", label: "Window", hint: "behind everything" },
      { token: "--color-panel", label: "Panels", hint: "sidebar, properties, dialogs" },
      { token: "--color-panel-alt", label: "Panels, second shade", hint: "the top bar, inputs" },
      { token: "--color-panel-edge", label: "Menus", hint: "popovers and dropdowns" },
    ],
  },
  {
    key: "text",
    label: "Text",
    tokens: [
      { token: "--color-text-primary", label: "Main", hint: "what you read" },
      { token: "--color-text-secondary", label: "Quieter", hint: "labels and notes" },
      { token: "--color-text-muted", label: "Quietest", hint: "counts, dates, hints" },
      { token: "--color-text-placeholder", label: "Placeholder", hint: "empty fields" },
    ],
  },
  {
    key: "accent",
    label: "Accent",
    tokens: [
      { token: "--color-accent-light", label: "Bright", hint: "links, the selected page, focus rings" },
      { token: "--color-accent-dark", label: "Deep", hint: "the darker half of buttons" },
    ],
  },
  {
    key: "lines",
    label: "Lines",
    advanced: true,
    tokens: [
      { token: "--color-border-strong", label: "Structure", hint: "the window's own divisions" },
      { token: "--color-border", label: "Containers", hint: "cards, inputs, chips" },
      { token: "--color-border-subtle", label: "Inside a container", hint: "tab strip baselines" },
    ],
  },
  {
    key: "callouts",
    label: "Callouts and warnings",
    advanced: true,
    tokens: [
      { token: "--color-callout-info", label: "Info edge", hint: "the stripe and the icon" },
      { token: "--color-callout-info-text", label: "Info text", hint: "" },
      { token: "--color-callout-quote", label: "Quote edge", hint: "" },
      { token: "--color-callout-quote-text", label: "Quote text", hint: "" },
      { token: "--color-callout-secret", label: "Secret edge", hint: "" },
      { token: "--color-callout-secret-text", label: "Secret text", hint: "" },
      { token: "--color-destructive", label: "Danger", hint: "delete buttons and their warnings" },
    ],
  },
];

/** Every token a picker writes, flat. */
export const COLOR_TOKENS: readonly string[] = COLOR_GROUPS.flatMap((group) => group.tokens.map((t) => t.token));

export type GradientSlot = {
  key: string;
  label: string;
  hint: string;
  /**
   * Text gradients punch the letters out of the image rather than sitting
   * behind them, which takes two more tokens — see the §Gradients note in
   * index.css. Flagged here so the serializer emits the pair.
   */
  text?: boolean;
  /** Tokens the two stops start from when the slot is first switched on. */
  from: string;
  to: string;
  /** Starting alpha per stop. Absent means opaque. */
  fromAlpha?: number;
  toAlpha?: number;
  angle: number;
};

/**
 * The same twelve the sandbox offers, in the same order and seeded from the
 * same tokens — a gradient built in one has to look the same in the other or
 * the two stop being the same feature.
 */
export const GRADIENT_SLOTS: readonly GradientSlot[] = [
  { key: "bg", label: "App background", hint: "behind the whole window", from: "--color-bg", to: "--color-panel-alt", angle: 160 },
  { key: "topbar", label: "Top bar", hint: "search and the project path", from: "--color-panel-alt", to: "--color-panel", angle: 90 },
  { key: "sidebar", label: "Sidebar", hint: "behind the page tree", from: "--color-panel", to: "--color-bg", angle: 180 },
  { key: "page", label: "Page area", hint: "behind your writing", from: "--color-bg", to: "--color-panel", angle: 180 },
  { key: "props", label: "Properties panel", hint: "the right-hand column", from: "--color-panel", to: "--color-bg", angle: 180 },
  { key: "modal", label: "Dialogs", hint: "settings, import, confirms", from: "--color-panel", to: "--color-panel-alt", angle: 160 },
  { key: "accent", label: "Main buttons", hint: "the one button that matters", from: "--color-accent-dark", to: "--color-accent-light", angle: 100 },
  {
    key: "sel",
    label: "Selected page",
    hint: "the sidebar highlight",
    from: "--color-accent-light",
    fromAlpha: 0.3,
    to: "--color-accent-light",
    toAlpha: 0.03,
    angle: 90,
  },
  {
    key: "tag",
    label: "Tags",
    hint: "the little pills",
    from: "--color-accent-light",
    fromAlpha: 0.24,
    to: "--color-accent-light",
    toAlpha: 0.06,
    angle: 120,
  },
  {
    key: "title",
    label: "Page title",
    hint: "the letters themselves",
    text: true,
    from: "--color-text-primary",
    to: "--color-accent-light",
    angle: 95,
  },
  {
    key: "heading",
    label: "Section headings",
    hint: "the letters themselves",
    text: true,
    from: "--color-text-primary",
    to: "--color-accent-light",
    angle: 95,
  },
  {
    key: "callout",
    label: "Callout wash",
    hint: "sits over the callout's own colour — keep it faint",
    from: "--color-text-primary",
    fromAlpha: 0.08,
    to: "--color-text-primary",
    toAlpha: 0,
    angle: 100,
  },
];

/** Where a radial gradient's glow comes from. */
export const RADIAL_ORIGINS = [
  { value: "center", label: "Centre" },
  { value: "top", label: "Top" },
  { value: "top right", label: "Top right" },
  { value: "right", label: "Right" },
  { value: "bottom right", label: "Bottom right" },
  { value: "bottom", label: "Bottom" },
  { value: "bottom left", label: "Bottom left" },
  { value: "left", label: "Left" },
  { value: "top left", label: "Top left" },
] as const;
