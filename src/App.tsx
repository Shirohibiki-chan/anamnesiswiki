import { StartupRouter } from "./components/shell/StartupRouter";
import { useThemeBootstrap } from "./hooks/use-theme";

function App() {
  // Above the router on purpose: the theme applies whether she lands on the
  // start screen, a project, or the recovery notice.
  useThemeBootstrap();
  return <StartupRouter />;
}

export default App;
