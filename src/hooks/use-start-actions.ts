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
import { closeWindow, focusWindowWithProject } from "../services/host-service";
import { pickImageFile, pickTemplateSavePath, revealItem, showFolder } from "../services/dialog-service";
import * as fsService from "../services/filesystem-service";
import { MAX_IMAGE_BYTES } from "../constants/limits";
import { PROJECT_TEMPLATE_EXTENSION } from "../constants/project-template";
import { buildProjectTemplate, serializeProjectTemplate } from "../services/project-template";
import { isReservedWorldName, type ListedWorld } from "../services/world-scan";
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
   * Set instead of a bare error when the only thing standing in the way is
   * another window's claim — which is the one refusal that is routinely
   * wrong. Calling it opens the project regardless.
   *
   * The claim is a *guess* built on a file being fresh, and it guesses wrong
   * in the ordinary cases: the app crashed and came straight back, the machine
   * lost power, a sync client is holding the folder. There is no way for the
   * app to tell those from a real second window, so the honest thing is to say
   * what it thinks and let her overrule it. Absent for every other failure,
   * where "try again anyway" would just fail again.
   */
  openAnyway: (() => Promise<void>) | null;
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
  /**
   * A project renamed — its name and, where it can, its folder. `true` once
   * something changed, so the caller knows to re-scan; a name that won't do
   * resolves `false` with the reason on the error line.
   */
  renameProject: (project: ListedWorld, name: string) => Promise<boolean>;
  /**
   * Deletes a project outright, by sending its folder to the OS recycle bin.
   *
   * Resolves true when the folder actually went, which is the caller's signal
   * to rescan and to unfile it from the archive, its groups and the pins. False
   * means it is still there and `error` says why.
   */
  deleteProject: (project: ListedWorld) => Promise<boolean>;
  /**
   * A project's shape written out as a `.antpl` she can send to someone
   * (Phase 27). Nothing on disk changes here and nothing is re-scanned, so
   * this resolves nothing — success is the file existing where she put it, and
   * a failure lands on the same error line as everything else on this screen.
   */
  exportProjectTemplate: (project: ListedWorld) => Promise<void>;
};

/**
 * The template's own name, taken off the file she just named.
 *
 * The extension goes if it's there and stays if it isn't — a save dialog on a
 * machine with extensions hidden hands back a path that may or may not carry
 * one, and a template called "Starter.antpl" in the picker would be the app
 * showing its filing rather than its contents.
 */
function templateNameFromPath(path: string): string {
  const fileName = fsService.fileNameFromPath(path);
  const suffix = `.${PROJECT_TEMPLATE_EXTENSION}`;
  return fileName.toLowerCase().endsWith(suffix) ? fileName.slice(0, -suffix.length) : fileName;
}

export function useStartActions(): StartActions {
  const { loadProject, createProjectAt } = useProject();
  const {
    recordProjectOpened,
    forgetProject,
    getLastOpenedProject,
    clearLastOpenedProject,
    renameRememberedProject,
    prepareNewProjectsDir,
  } = useAppSettings();
  const { pickFolder } = useDialogs();
  const resolveChosenFolder = useOpenFolder();

  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openAnyway, setOpenAnyway] = useState<(() => Promise<void>) | null>(null);
  const [choices, setChoices] = useState<string[] | null>(null);

  // Checked on every open and not only at startup, or the picker is still a
  // way onto files another copy of the app is writing to. Said with the age in
  // it, because "a few seconds ago" means switch windows and "about two
  // minutes ago" means the other copy is probably gone and the wait is nearly
  // over — a refusal with no number in it is a wall.
  // `force` is optional, and its absence is meaningful: renaming a project
  // another window holds is refused with no way past it, because renaming a
  // folder a live process has open is a different and worse problem than
  // reading one. Only opening offers the override.
  const refuseIfHeldElsewhere = useCallback(async (path: string, name: string, force?: () => Promise<void>) => {
    // **A window of this app already has it: go there.** Asked before the
    // marker rather than after it, because this answer is certain and the
    // marker's is a guess — the host can see its own windows, while the marker
    // can only say when somebody last wrote to a file. Whichever window this
    // is then has nothing left to show, so it closes behind itself, which is
    // what every app with a picker and a window per project does.
    //
    // False on a shell that cannot manage two windows, and false when the
    // other copy is on another machine behind a synced folder — the one case
    // the marker still exists for, and the one where a warning is honest.
    if (await focusWindowWithProject(path).catch(() => false)) {
      await closeWindow().catch(() => {});
      return true;
    }

    const claim = await findBlockingClaim(path);
    if (!claim) return false;
    setError(`"${name}" is open in another window — it was last active there ${describeClaimAge(claim, Date.now())}.`);
    // Stored as a thunk, not called: `useState` runs a function it is handed,
    // so a setter given a callback would invoke it and open the project
    // immediately, which is the opposite of asking.
    setOpenAnyway(force ? () => force : null);
    return true;
  }, []);

  // Split from the check so "open it anyway" has something to call that skips
  // it — one path that actually opens, reachable with or without the guard.
  const load = useCallback(
    async (path: string, onFailure: (name: string) => Promise<void> | void) => {
      setIsBusy(true);
      const result = await loadProject(path).finally(() => setIsBusy(false));
      if (!result) {
        await onFailure(fsService.fileNameFromPath(path));
        return;
      }
      setError(null);
      setOpenAnyway(null);
      setChoices(null);
      await recordProjectOpened(path, result.name);
    },
    [loadProject, recordProjectOpened],
  );

  const openFound = useCallback(
    async (path: string) => {
      const force = () =>
        load(path, () => {
          setError("That project's files couldn't be read. Try a different folder, or create a new one instead.");
          setOpenAnyway(null);
        });
      if (await refuseIfHeldElsewhere(path, fsService.fileNameFromPath(path), force)) return;
      await force();
    },
    [load, refuseIfHeldElsewhere],
  );

  const openListed = useCallback(
    async (path: string, name: string) => {
      const force = () =>
        load(path, async () => {
          setError(`Couldn't open "${name}" — it may have moved, been deleted, or its files may be damaged.`);
          setOpenAnyway(null);
          await forgetProject(path);
        });
      if (await refuseIfHeldElsewhere(path, name, force)) return;
      await force();
    },
    [forgetProject, load, refuseIfHeldElsewhere],
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

  // Renaming, which until now could only be done by editing `project.json` by
  // hand — which is why her Explorer copy still calls itself "test" and reads
  // as "test, copied from test".
  //
  // **Refused while another window holds it**, the same check opening makes:
  // the folder moves out from under whatever is writing to it otherwise, and
  // every save that copy makes afterwards lands somewhere that is no longer
  // the project.
  //
  // The folder failing to move is reported *without* failing the rename,
  // because by then the name has already changed and saying otherwise would be
  // untrue. Naming the folder is the useful half of that message — she can
  // finish the job in her file manager, and "Show in ..." is right there.
  const renameProject = useCallback(
    async (project: ListedWorld, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        setError("Give the project a name.");
        return false;
      }
      if (trimmed === project.name) return false;
      if (isReservedWorldName(trimmed)) {
        setError("That name belongs to one of the app's own folders. Try another.");
        return false;
      }
      if (await refuseIfHeldElsewhere(project.path, project.name)) return false;

      setIsBusy(true);
      try {
        const result = await fsService.renameProject(project.path, trimmed);
        await renameRememberedProject(project.path, result.path, trimmed);
        setError(null);
        return true;
      } catch (e) {
        // The name is written before the folder moves, so anything thrown here
        // left the name changed — hence `true`, and hence a message about the
        // folder rather than about the rename.
        setError(
          e instanceof Error && e.message
            ? `Renamed, but the folder stayed put: ${e.message}`
            : `Renamed, but the folder couldn't be renamed. It is still at ${project.path}.`,
        );
        await renameRememberedProject(project.path, project.path, trimmed);
        return true;
      } finally {
        setIsBusy(false);
      }
    },
    [refuseIfHeldElsewhere, renameRememberedProject],
  );

  /**
   * Deletes a project, folder and all, by sending it to the recycle bin.
   *
   * **Held-elsewhere is checked first and refuses**, exactly as rename does. A
   * folder pulled out from under an open window is the one way this could cost
   * writing that was never saved, and it is the only case where the recycle
   * bin doesn't help.
   *
   * The app's own pointers at it are cleared here — the recents list, and
   * `lastOpenedProject` if it was this one. That last matters more than it
   * reads: without it the next launch tries to open a folder that isn't there
   * any more. What this deliberately does *not* touch is the archive, the
   * groups and the pins, which live on the start screen and are cleaned up by
   * the caller — `healRefs` keeps a ref whose project it can't currently see,
   * on purpose, because a project on an unplugged drive must not be quietly
   * unfiled.
   */
  const deleteProject = useCallback(
    async (project: ListedWorld) => {
      if (await refuseIfHeldElsewhere(project.path, project.name)) return false;

      setIsBusy(true);
      try {
        await fsService.deleteProject(project.path);
        await forgetProject(project.path);
        if ((await getLastOpenedProject()) === project.path) await clearLastOpenedProject();
        setError(null);
        return true;
      } catch (e) {
        setError(
          e instanceof Error && e.message
            ? `Couldn't delete "${project.name}": ${e.message}`
            : `Couldn't delete "${project.name}".`,
        );
        return false;
      } finally {
        setIsBusy(false);
      }
    },
    [clearLastOpenedProject, forgetProject, getLastOpenedProject, refuseIfHeldElsewhere],
  );

  // The other half of "start from a template": making one out of a project she
  // already has. Nothing about *her* project changes — this only reads it.
  //
  // **The picker comes first, before the project is read.** A project is a
  // walk of every file in it, and doing that work before finding out she meant
  // to cancel is a pause with nothing on the other side of it.
  //
  // **The template's name is the name she gave the file.** There is no second
  // form asking for one, because the save dialog is already a naming step and
  // a template called something other than its own filename is a thing she
  // then has to keep track of twice.
  const exportProjectTemplate = useCallback(async (project: ListedWorld) => {
    let path: string | null;
    try {
      path = await pickTemplateSavePath(`${project.name} Template`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the save dialog.");
      return;
    }
    if (!path) return;

    setIsBusy(true);
    try {
      // Reading a project she hasn't opened mints it an id if it hasn't got
      // one and writes that back — `loadProject`'s doing, not this action's,
      // and the same write duplicating already accepts. It is one field, once
      // per project, and it is what opening the project would have done
      // anyway; the alternative is a second way to read a project off disk.
      const loaded = await fsService.loadProject(project.path);
      if (!loaded) {
        setError(`Couldn't read "${project.name}" — it may have moved, or its files may be damaged.`);
        return;
      }
      const file = buildProjectTemplate({
        name: templateNameFromPath(path),
        description: "",
        nodes: loaded.nodes,
        rootOrder: loaded.project.rootOrder,
        childOrder: loaded.project.childOrder,
      });
      await fsService.writeTextFileAt(path, serializeProjectTemplate(file));
      setError(null);
    } catch {
      setError(`Couldn't write the template. Check that ${path} is somewhere you can save to.`);
    } finally {
      setIsBusy(false);
    }
  }, []);

  return {
    isBusy,
    error,
    dismissError: useCallback(() => {
      setError(null);
      setOpenAnyway(null);
    }, []),
    openAnyway,
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
    renameProject,
    deleteProject,
    exportProjectTemplate,
  };
}
