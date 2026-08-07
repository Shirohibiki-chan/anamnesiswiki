import { ConfirmDialog } from "./components/shell/ConfirmDialog";
import { StartupRouter } from "./components/shell/StartupRouter";
import { useThemeBootstrap } from "./hooks/use-theme";

function App() {
  // Above the router on purpose: the theme applies whether she lands on the
  // start screen, a project, or the recovery notice.
  useThemeBootstrap();
  return (
    <>
      <StartupRouter />
      {/* Also above the router, and for a reason that cost a hang to find. It
          used to live in AppLayout, which only exists once a project is open —
          so `confirmDestructive` called from the start screen set a pending
          confirm nothing was rendering, and awaited a promise nothing would
          ever resolve. Settings is reachable from that screen, and Settings has
          a delete button in it. It portals to document.body regardless of where
          it sits, so mounting it once at the root costs nothing and means every
          screen can ask a destructive question. */}
      <ConfirmDialog />
    </>
  );
}

export default App;
