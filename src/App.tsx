import { useEffect, useState } from "react";
import { documentDir, join } from "@tauri-apps/api/path";
import "./App.css";
import { useProject } from "./hooks/use-project";
import { FOLDER_TEMPLATE_KEY } from "./constants/schema";

// Temporary Phase 1 test harness for the data layer — proves load/create/save
// round-trip through a real project folder on disk. Replaced by the real
// project picker + tree UI in Phase 2/3.
function App() {
  const { rootPath, project, nodes, loadProject, initializeProject, addNode } = useProject();
  const [status, setStatus] = useState("Loading test project...");

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const testPath = await join(await documentDir(), "Anamnesis", "TestWorld");
      const found = await loadProject(testPath);
      if (cancelled) return;
      if (!found) {
        await initializeProject(testPath, "Test World");
        addNode({ parentId: null, templateKey: FOLDER_TEMPLATE_KEY, name: "Canon" });
        setStatus("Created a fresh test project.");
      } else {
        setStatus("Loaded existing test project from disk.");
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
    // Only ever runs once on mount — this is a one-shot dev harness, not a
    // reactive data flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nodeList = Object.values(nodes);

  return (
    <main className="placeholder">
      <h1>Anamnesis</h1>
      <p>{status}</p>
      {rootPath && (
        <div className="dev-panel">
          <p className="dev-path">{rootPath}</p>
          <p>
            Project: <strong>{project?.name}</strong> · {nodeList.length} node{nodeList.length === 1 ? "" : "s"}
          </p>
          <ul>
            {nodeList.map((node) => (
              <li key={node.id}>
                {node.templateKey === FOLDER_TEMPLATE_KEY ? "📁" : "📄"} {node.name}
              </li>
            ))}
          </ul>
          <button
            onClick={() =>
              addNode({
                parentId: null,
                templateKey: "note",
                name: `Test Page ${nodeList.length + 1}`,
              })
            }
          >
            Add test page
          </button>
        </div>
      )}
    </main>
  );
}

export default App;
