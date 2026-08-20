// Everything the start screen can actually do: open a project it listed, open
// a folder she picked, make a new one. Lifted out of the screen when Phase 27
// rebuilt it — the components render, and this holds the part that can fail.
//
// The three share one busy flag and one error line on purpose. They are the
// same thing from her side ("get me into a project"), only one of them can be
// happening at a time, and an error from any of them belongs in one place on
// screen rather than three.
import { useCallback, useState } from "react";
import { extensionForPath } from "../services/asset-urls";
import { pickImageFile, revealItem, showFolder } from "../services/dialog-service";
import * as fsService from "../services/filesystem-service";
import { MAX_IMAGE_BYTES } from "../constants/limits";
import type { ListedWorld } from "../services/world-scan";
import { useAppSettings } from "./use-app-settings";
import { useDialogs } from "./use-dialogs";
import { useOpenFolder } from "./use-open-folder";
import { findBlockingClaim } from "./use-project-claim";
import { useProject } from "./use-project";
import { describeClaimAge } from "../services/project-claim";

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
  /** The rail's Projects folder line. Makes the folder first — same reason
   *  `createProject` calls `prepareNewProjectsDir`, since a fresh install has
   *  a default path nothing has created yet, and handing that to the file
   *  manager opens a level up with nothing there to explain why. */
  openProjectsFolder: () => Promise<void>;
  /**
   * The hover button on a project tile. Native picker rather than the in-app
   * library `PageBanner` uses — that library is the *open* project's own
   * assets, and this runs with nothing open. `true` on success, so the
   * caller knows to re-scan the list; cancelling the picker is not a failure
   * and resolves `false` without touching `error`.
   */
  setProjectCover: (project: ListedWorld) => Promise<boolean>;
  /** What the same hover button does once a cover is set, instead of picking a new one. */
  removeProjectCover: (project: ListedWorld) => Promise<boolean>;
  /**
   * The project's own folder, handed to the file manager with the folder
   * *selected* rather than opened — the same thing the tree's own "Show in
   * …" does for a page, and the right one here: copying a project to fork it
   * is done from the folder sitting highlighted among its neighbours, which
   * is how she already works.
   */
  showProjectInFolder: (project: ListedWorld) => Promise<void>;
  /**
   * A whole project copied, beside the one it came from. `true` on success, so
   * the caller knows to re-scan; a name that won't do resolves `false` with the
   * reason on the error line.
   */
  duplicateProject: (project: ListedWorld, name: string) => Promise<boolean>;
};

export function useStartActions(): StartActions {
  const { loadProject, createProjectAt } = useProject();
  const { recordProjectOpened, forgetProject, prepareNewProjectsDir } = useAppSettings();
  const { pickFolder } = useDialogs();
  const resolveChosenFolder = useOpenFolder();

  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[] | null>(null);

  // Checked on every open and not only at startup, or the picker is still a
  // way onto files another copy of the app is writing to. Said with the age in
  // it, because "a few seconds ago" means switch windows and "about two
  // minutes ago" means the other copy is probably gone and the wait is nearly
  // over — a refusal with no number in it is a wall.
  const refuseIfHeldElsewhere = useCallback(async (path: string, name: string) => {
    const claim = await findBlockingClaim(path);
    if (!claim) return false;
    setError(`"${name}" is open in another window — it was last active there ${describeClaimAge(claim, Date.now())}.`);
    return true;
  }, []);

  const openFound = useCallback(
    async (path: string) => {
      if (await refuseIfHeldElsewhere(path, fsService.fileNameFromPath(path))) return;
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
    [loadProject, recordProjectOpened, refuseIfHeldElsewhere],
  );

  const openListed = useCallback(
    async (path: string, name: string) => {
      if (await refuseIfHeldElsewhere(path, name)) return;
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
    [forgetProject, loadProject, recordProjectOpened, refuseIfHeldElsewhere],
  );

  const pickFolderToOpen = useCallback(async () => {
    // The picker is inside the try for the same reason as the import modal's:
    // this promise is discarded by the click handler, so a dialog that fails
    // to open would otherwise leave the button looking dead.
    let path: string | null;
    try {
      path = await pickFolder({ title: "Open an Anamnesis project" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the folder picker.");
      return;
    }
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
        const parentDir = await prepareNewProjectsDir();
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
    [createProjectAt, prepareNewProjectsDir, recordProjectOpened],
  );

  const openProjectsFolder = useCallback(async () => {
    setIsBusy(true);
    try {
      const dir = await prepareNewProjectsDir();
      // Named the same way use-reveal.ts falls back for a file: the path
      // itself, so a refusal still tells her where to go by hand rather than
      // just saying no. One line, not two — `start-error` is a plain `<p>`
      // with no `white-space: pre-line` to make a literal newline visible,
      // unlike the dialog-store notice use-reveal reports through.
      await showFolder(dir).then(
        () => setError(null),
        () => setError(`Couldn't open your file manager. Your projects are in: ${dir}`),
      );
    } catch {
      setError("Couldn't find your projects folder.");
    } finally {
      setIsBusy(false);
    }
  }, [prepareNewProjectsDir]);

  const setProjectCover = useCallback(async (project: ListedWorld) => {
    // Outside the busy/error machinery below: cancelling a native dialog is
    // an ordinary outcome, not a failure with something to say about it, and
    // it must not flip the screen busy while it's up — she's meant to be able
    // to do anything else while the OS's own window is on screen.
    let path: string | null;
    try {
      path = await pickImageFile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the picture picker.");
      return false;
    }
    if (!path) return false;

    setIsBusy(true);
    try {
      const bytes = await fsService.readFileBytesAt(path);
      if (bytes.byteLength > MAX_IMAGE_BYTES) {
        setError("That picture is too large (10MB max).");
        return false;
      }
      // Fresh UUID, same convention setNodeImage uses in project-store.ts —
      // it lands in *this* world's own assets/, which may not be the open
      // project's, so it can't go through that store action.
      const fileName = `${crypto.randomUUID()}.${extensionForPath(path)}`;
      await fsService.saveAssetImage(project.path, fileName, bytes);
      await fsService.setProjectCoverImage(project.path, fileName);
      setError(null);
      return true;
    } catch {
      setError(`Couldn't set a cover for "${project.name}".`);
      return false;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const removeProjectCover = useCallback(async (project: ListedWorld) => {
    setIsBusy(true);
    try {
      await fsService.setProjectCoverImage(project.path, null);
      setError(null);
      return true;
    } catch {
      setError(`Couldn't remove the cover from "${project.name}".`);
      return false;
    } finally {
      setIsBusy(false);
    }
  }, []);

  // No busy flag: nothing is read or written and there is nothing to wait on,
  // so disabling the screen for it would only make the tiles flicker. The
  // failure still has to land somewhere — an OS call that can be refused and
  // isn't reported is a menu item that does nothing on the machine where it
  // matters — so it goes to the same one error line as everything else here,
  // naming the path so a refusal still tells her where to go by hand.
  const showProjectInFolder = useCallback(async (project: ListedWorld) => {
    await revealItem(project.path).then(
      () => setError(null),
      () => setError(`Couldn't open your file manager. That project is in: ${project.path}`),
    );
  }, []);

  // Forking in the app rather than in File Explorer, which is how she does it
  // today. The copy lands beside the original — where a copy made in a file
  // manager would land, and so where she will look for it — and refuses a name
  // that already exists there rather than quietly making `Valeraverse (2)`:
  // a fork is named for what it is *for*, and a suffix chosen by the app is a
  // name she then has to fix.
  const duplicateProject = useCallback(async (project: ListedWorld, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the copy a name.");
      return false;
    }
    const destPath = fsService.siblingProjectPath(project.path, trimmed);
    if (!destPath) {
      setError("Couldn't work out where that project lives.");
      return false;
    }
    setIsBusy(true);
    try {
      if (await fsService.pathExists(destPath)) {
        setError("A folder with that name already exists there.");
        return false;
      }
      await fsService.duplicateProject(project.path, destPath, trimmed);
      setError(null);
      return true;
    } catch {
      // No cleanup of a half-written copy, deliberately: a folder with some of
      // her project in it is worth more than a tidy failure, and it is hers to
      // look at and delete. Saying where it is, is the part that matters.
      setError(`Couldn't finish copying that project. Check ${destPath} — it may be half made.`);
      return false;
    } finally {
      setIsBusy(false);
    }
  }, []);

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
    openProjectsFolder,
    setProjectCover,
    removeProjectCover,
    showProjectInFolder,
    duplicateProject,
  };
}
