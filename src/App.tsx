import { AssetPickerDialog } from "./components/shell/AssetPickerDialog";
import { AutoLinkDialog } from "./components/shell/AutoLinkDialog";
import { NewPageLinkDialog } from "./components/shell/NewPageLinkDialog";
import { ConfirmDialog } from "./components/shell/ConfirmDialog";
import { Lightbox } from "./components/shell/Lightbox";
import { NoticeDialog } from "./components/shell/NoticeDialog";
import { PageHistory } from "./components/shell/PageHistory";
import { ProjectHistory } from "./components/shell/ProjectHistory";
import { SaveAsTemplateDialog } from "./components/shell/SaveAsTemplateDialog";
import { ShortcutSheet } from "./components/shell/ShortcutSheet";
import { StartupRouter } from "./components/shell/StartupRouter";
import { TitleBar } from "./components/shell/TitleBar";
import { useDialogFocusTrap } from "./hooks/use-dialog-focus-trap";
import { useDialogs } from "./hooks/use-dialogs";
import { useSaveOnExit } from "./hooks/use-save-on-exit";
import { useShellKeys } from "./hooks/use-shell-keys";
import { useShortcutSheet } from "./hooks/use-shortcut-sheet";
import { useThemeBootstrap } from "./hooks/use-theme";

function App() {
  // Above the router on purpose: the theme applies whether she lands on the
  // start screen, a project, or the recovery notice.
  useThemeBootstrap();
  // Above the router for the same reason the dialogs below are: ConfirmDialog
  // and NoticeDialog can be raised from the start screen as well as from a
  // project, so the thing that keeps Tab inside them has to exist on both.
  useDialogFocusTrap();
  // **At the root, not in AppLayout, and this is the difference between the
  // window closing and not.** Registering a close-requested listener makes
  // Tauri cancel the native close from then on and it never restores it — so
  // once a project had been opened, leaving it for the start screen (which
  // unmounts AppLayout) or reloading the page left the window with nothing
  // able to destroy it. The X did nothing and the app had to be killed from
  // the terminal. Reported 2026-08-21, twice.
  //
  // Mounted here it exists on every screen, so whatever cancelled the native
  // close is always matched by something that can complete it. It needs no
  // project: the flush it guards is autosave's, which is a plain service.
  useSaveOnExit();
  // Above the router for the same reason: reload and fullscreen are keys the
  // window answers, not keys a project answers, and the start screen is one
  // of the places somebody reaches for a reload.
  useShellKeys();
  // Beside useShellKeys for the same reason it is above the router: `?` is a
  // key the window answers, and the start screen is a place somebody can be
  // lost in too.
  const shortcutSheet = useShortcutSheet();
  const { historyNodeId, closeHistory, isProjectHistoryOpen, closeProjectHistory } = useDialogs();
  return (
    <>
      {/* **Above the router, for the same reason `useSaveOnExit` is.** The title
          bar belongs to the window, not to a project — and it lived inside
          AppLayout for a day, which meant the start screen had no title bar at
          all. On a frameless window that is not a cosmetic gap: there is nothing
          to drag the window by and no close button, so the picker could only be
          left through the taskbar. Reported 2026-09-05.

          It also has to stay mounted across the switch between the two screens.
          Rendering one on each would remount it every time she opens or leaves a
          project, and the bar is the one element that should never flicker. */}
      <div className="app-shell">
        <TitleBar />
        <StartupRouter />
      </div>
      {/* Also above the router, and for a reason that cost a hang to find. It
          used to live in AppLayout, which only exists once a project is open —
          so `confirmDestructive` called from the start screen set a pending
          confirm nothing was rendering, and awaited a promise nothing would
          ever resolve. Settings is reachable from that screen, and Settings has
          a delete button in it. It portals to document.body regardless of where
          it sits, so mounting it once at the root costs nothing and means every
          screen can ask a destructive question. */}
      <ConfirmDialog />
      {/* Same placement and the same reasoning as ConfirmDialog above: it
          portals regardless, and a failure worth reporting can happen on
          either screen. */}
      <NoticeDialog />
      {/* Raised from a tree row, which react-arborist renders itself — so there
          are no props to thread a callback down through, the same routing
          reason the export request lives in the dialog store. */}
      <SaveAsTemplateDialog />
      {/* Opened from two places with no props path between them — a picture
          inside the editor and the portrait button in the properties panel —
          and it portals like the three above, so it belongs at the root for
          the same reason they do. */}
      <Lightbox />
      {/* The picture library. Opened from the properties panel and the page
          cover so far, and the list will grow — which is the reason it sits up
          here with the others rather than beside either one of them. */}
      <AssetPickerDialog />
      {/* Make a page and link to it, asked for from inside the editor — which
          is nowhere near the app root, and portals like the rest of these. It
          is opened from two places already (the `/` menu and a `[[Name]]` that
          matches nothing), which is the same reason the picture library sits
          up here. */}
      <NewPageLinkDialog />
      <AutoLinkDialog />
      {/* Raised from a tree row's menu, which react-arborist renders itself —
          the same routing reason as the export request and SaveAsTemplate
          above. Keyed by the page, so pointing it at another one starts its
          list again rather than showing the last page's versions. */}
      {historyNodeId && <PageHistory key={historyNodeId} nodeId={historyNodeId} onClose={closeHistory} />}
      {/* The same dialog pointed at `project.json` — raised from the project
          header's own right-click menu, and here beside its sibling rather
          than inside the tree so both are found in one place. */}
      {isProjectHistoryOpen && <ProjectHistory onClose={closeProjectHistory} />}
      {/* Same reasoning again: it portals, and both screens have keys worth
          looking up. */}
      {shortcutSheet.isOpen && <ShortcutSheet onClose={shortcutSheet.close} />}
    </>
  );
}

export default App;
