// "Show in system explorer" — hands a tree row's file to the OS file manager.
//
// A hook rather than a project-store action because it needs three things that
// live in three places (where the project is, where the node resolves to, and
// somewhere to report a failure), and a hook is the layer allowed to hold all
// three without one store reaching into another.
import { useCallback } from "react";
import { fileManagerName, revealItem } from "../services/dialog-service";
import { findNodeOnDisk } from "../services/filesystem-service";
import { useDialogStore } from "../state/dialog-store";
import { useProjectStore } from "../state/project-store";

/** The OS's own name for its file manager, for the menu label. */
export function useFileManagerName(): string {
  return fileManagerName();
}

export function useRevealNode(): (id: string) => Promise<void> {
  // `getState()` rather than subscribing, the same call this makes as
  // use-new-page and use-lk-export. This hook is called from TreeItem, which
  // renders once per visible row — subscribing to `nodes` here would re-run
  // every row on every keystroke typed into the editor, which is the exact
  // cost that file's own comment warns about. Nothing here renders, so a
  // snapshot taken at click time is all it ever needed.
  return useCallback(async (id: string) => {
    const { rootPath, nodes } = useProjectStore.getState();
    const node = nodes[id];
    if (!rootPath || !node) return;

    const { showNotice } = useDialogStore.getState();
    const path = await findNodeOnDisk(rootPath, node, Object.values(nodes)).catch(() => null);
    if (!path) {
      // Two different causes, one sentence, because from where she's sitting
      // they're the same event and neither is hers to fix by hand: the page
      // was made moments ago and its save hasn't landed, or the project folder
      // moved since it opened.
      showNotice(`There's no file for "${node.name}" on disk yet. Give it a moment, or reopen the project.`);
      return;
    }

    // The failure Phase 12 taught: an OS call that can be refused needs its
    // rejection going somewhere, or the menu item is a button that does
    // nothing on a machine where the file manager won't answer.
    await revealItem(path).catch(() => {
      showNotice("Couldn't open your file manager. The file is at:\n\n" + path);
    });
  }, []);
}
