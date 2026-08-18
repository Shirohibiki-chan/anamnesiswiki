// Everything the start screen can actually do: open a project it listed, open
// a folder she picked, make a new one. Lifted out of the screen when Phase 27
// rebuilt it — the components render, and this holds the part that can fail.
//
// The three share one busy flag and one error line on purpose. They are the
// same thing from her side ("get me into a project"), only one of them can be
// happening at a time, and an error from any of them belongs in one place on
// screen rather than three.
import { useCallback, useState } from "react";
import { useAppSettings } from "./use-app-settings";
import { useDialogs } from "./use-dialogs";
import { useOpenFolder } from "./use-open-folder";
import { useProject } from "./use-project";

export type StartActions = {
  isBusy: boolean;
  error: string | null;
  dismissError: () => void;
  /**
   * Set when the folder she picked holds several projects and there is no
   * honest way to guess which one she meant. Rendered as a short list.
   */
  choices: string[] | null;
  dismissChoices: () => void;
  /** A project off the list. A failure forgets it, since the list is how she got to it. */
  openListed: (path: string, name: string) => Promise<void>;
  /** A project found by looking in a folder. Nothing to forget — it was never remembered. */
  openFound: (path: string) => Promise<void>;
  pickFolderToOpen: () => Promise<void>;
  createProject: (name: string) => Promise<void>;
};

export function useStartActions(): StartActions {
  const { loadProject, createProjectAt } = useProject();
  const { recordProjectOpened, forgetProject, prepareProjectsDir } = useAppSettings();
  const { pickFolder } = useDialogs();
  const resolveChosenFolder = useOpenFolder();

  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[] | null>(null);

  const openFound = useCallback(
    async (path: string) => {
      setIsBusy(true);
      const result = await loadProject(path).finally(() => setIsBusy(false));
      if (!result) {
        setError("That project's files couldn't be read. Try a different folder, or create a new one instead.");
        return;
      }
      setError(null);
      setChoices(null);
      await recordProjectOpened(path, result.name);
    },
    [loadProject, recordProjectOpened],
  );

  const openListed = useCallback(
    async (path: string, name: string) => {
      setIsBusy(true);
      const result = await loadProject(path).finally(() => setIsBusy(false));
      if (!result) {
        setError(`Couldn't open "${name}" — it may have moved, been deleted, or its files may be damaged.`);
        await forgetProject(path);
        return;
      }
      setError(null);
      await recordProjectOpened(path, result.name);
    },
    [forgetProject, loadProject, recordProjectOpened],
  );

  const pickFolderToOpen = useCallback(async () => {
    const path = await pickFolder({ title: "Open an Anamnesis project" });
    if (!path) return;

    setIsBusy(true);
    const outcome = await resolveChosenFolder(path).finally(() => setIsBusy(false));

    if (outcome.kind === "none") {
      setChoices(null);
      setError(
        "That folder doesn't have an Anamnesis project in it, or its files couldn't be read. Try a different folder, or create a new one instead.",
      );
      return;
    }
    if (outcome.kind === "choose") {
      // Guessing here would open the wrong project silently, which is worse
      // than one more click.
      setError(null);
      setChoices(outcome.paths);
      return;
    }
    setChoices(null);
    await openFound(outcome.path);
  }, [openFound, pickFolder, resolveChosenFolder]);

  const createProject = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        setError("Give your project a name.");
        return;
      }

      setIsBusy(true);
      let result: Awaited<ReturnType<typeof createProjectAt>>;
      try {
        const parentDir = await prepareProjectsDir();
        result = await createProjectAt(parentDir, trimmed);
      } catch {
        result = {
          ok: false,
          error: "Couldn't create the project folder. Check that the location is writable and try again.",
        };
      } finally {
        setIsBusy(false);
      }

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      await recordProjectOpened(result.rootPath, trimmed);
    },
    [createProjectAt, prepareProjectsDir, recordProjectOpened],
  );

  return {
    isBusy,
    error,
    dismissError: useCallback(() => setError(null), []),
    choices,
    dismissChoices: useCallback(() => setChoices(null), []),
    openListed,
    openFound,
    pickFolderToOpen,
    createProject,
  };
}
