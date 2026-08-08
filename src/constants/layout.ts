// Layout numbers that more than one file has to agree on.

// How far one level of nesting shifts a sidebar row, in pixels. react-arborist
// takes this as a prop and defaults to 24; `TreeItem` positions its indent
// guide lines from the same number, so the two have to read it from one place
// or the lines drift away from the rows they belong to.
//
// 18 rather than the library's 24: at eight or nine levels deep the difference
// is most of a folder name. The guide lines are what make the tighter spacing
// still readable — don't lower this further without them.
export const TREE_INDENT = 18;
