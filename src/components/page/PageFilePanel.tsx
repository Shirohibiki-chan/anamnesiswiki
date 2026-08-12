// The little panel that opens when a picture block is empty. BlockNote's own,
// with the library added as a third way of filling it.
//
// **Every component in this file is declared at the module level, and that's a
// requirement rather than a style.** `FilePanelController` renders what it's
// given as a *component type*, so a function defined inside a rendering
// component is a new type each time and React rebuilds the subtree instead of
// updating it — which is exactly how the picture caption box lost focus on
// every keystroke (see Editor.tsx's toolbar note). A panel that rebuilds
// mid-interaction is the same bug with a different symptom.
import { useState } from "react";
import { EmbedTab, FilePanel, UploadTab, useBlockNoteEditor, type FilePanelProps } from "@blocknote/react";
import { useAssetRef } from "../../hooks/use-assets";
import { useDialogs } from "../../hooks/use-dialogs";

/**
 * Library first, because it's the one that costs nothing: the picture is
 * already in the project, and choosing it here means one file rather than a
 * second copy of the same bytes. Upload and Embed are BlockNote's own,
 * unchanged — Embed in particular is the paste-a-web-address route, which is a
 * decision the user has already made and which CLAUDE.md's Policy Boundary
 * records; it is not to be quietly dropped while reordering tabs.
 */
export function PageFilePanel(props: FilePanelProps) {
  // BlockNote's UploadTab reports progress through a setter it expects to be
  // given. `FilePanel` owns the `loading` flag it actually renders, so this
  // pair exists to satisfy the tab's contract rather than to drive anything.
  const [, setLoading] = useState(false);

  return (
    <FilePanel
      {...props}
      defaultOpenTab="Library"
      tabs={[
        { name: "Library", tabPanel: <LibraryTab blockId={props.blockId} /> },
        { name: "Upload", tabPanel: <UploadTab {...props} setLoading={setLoading} /> },
        { name: "Embed", tabPanel: <EmbedTab {...props} /> },
      ]}
    />
  );
}

/**
 * Opens the same picture library the portrait and cover slots use, and writes
 * the chosen file into this block.
 *
 * `editor` and `blockId` are both captured before the dialog opens, which is
 * what makes this safe: the file panel is a popover and closes the moment a
 * modal takes focus, so by the time the promise resolves this component is
 * usually gone. Nothing here sets state afterwards — it updates the block and
 * stops.
 */
function LibraryTab({ blockId }: { blockId: string }) {
  const editor = useBlockNoteEditor();
  const { requestAssetPick } = useDialogs();
  const toRef = useAssetRef();

  async function pick() {
    const fileName = await requestAssetPick("Choose a picture for this page");
    if (!fileName) return;
    editor.updateBlock(blockId, { props: { url: toRef(fileName) } });
  }

  return (
    <div className="file-panel-library">
      <p className="file-panel-library-note">Pictures this world already has, including the ones on other pages.</p>
      <button type="button" className="ui-btn ui-btn-primary" onClick={() => void pick()}>
        Browse the library
      </button>
    </div>
  );
}
