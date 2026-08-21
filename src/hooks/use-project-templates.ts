// The "Start from a template" side of Phase 27: which templates are on offer,
// opening a file somebody sent, and making a project out of one.
//
// Its own hook rather than three more members on `use-start-actions`. That one
// is the screen's shared busy flag and single error line, and this is a dialog
// with its own — a template file that won't parse is a thing to say *inside*
// the window she is standing in, not on a line behind it that she has to
// dismiss the window to read.
import { useCallback, useState } from "react";
import { DEFAULT_PROJECT_TEMPLATE } from "../constants/default-project-template";
import type { ProjectTemplateFile } from "../constants/project-template";
import { pickTemplateFile } from "../services/dialog-service";
import * as fsService from "../services/filesystem-service";
import { parseProjectTemplate, summarizeTemplate, type TemplateSummary } from "../services/project-template";
import { useAppSettings } from "./use-app-settings";
import { useProject } from "./use-project";

/** The id the built-in template is listed under. Not a path — it has none. */
export const BUILT_IN_TEMPLATE_ID = "built-in";

export type TemplateChoice = {
  /** Stable for the life of the list: the built-in's constant, or the file's path. */
  id: string;
  file: ProjectTemplateFile;
  summary: TemplateSummary;
  /** Where it came from, so the list can say so without inspecting the id. */
  origin: "built-in" | "file";
};

function choiceFor(file: ProjectTemplateFile, id: string, origin: TemplateChoice["origin"]): TemplateChoice {
  return { id, file, summary: summarizeTemplate(file), origin };
}

export type ProjectTemplates = {
  choices: TemplateChoice[];
  isBusy: boolean;
  error: string | null;
  dismissError: () => void;
  /**
   * Native picker, then parse. The parsed template joins `choices` and comes
   * back, so the caller can select what she just opened; a cancelled picker
   * resolves null without touching the error line, and a file that won't parse
   * resolves null with the reason on it.
   */
  openTemplateFile: () => Promise<TemplateChoice | null>;
  /** A new project from one of the choices. `true` once it is made and open. */
  createFrom: (choice: TemplateChoice, name: string) => Promise<boolean>;
};

export function useProjectTemplates(): ProjectTemplates {
  const { createProjectFromTemplate } = useProject();
  const { recordProjectOpened, prepareNewProjectsDir } = useAppSettings();

  // **The list starts with the one that ships and grows as she opens files,
  // and it is not remembered between runs.** Deliberate: a template is a file
  // on her disk, and a remembered list is a second place the same fact lives —
  // one that goes stale the moment she moves or deletes the file, and then has
  // to explain itself. Opening a file again is one click, and it is the click
  // she would be making anyway to find out where it went.
  const [choices, setChoices] = useState<TemplateChoice[]>(() => [
    choiceFor(DEFAULT_PROJECT_TEMPLATE, BUILT_IN_TEMPLATE_ID, "built-in"),
  ]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openTemplateFile = useCallback(async () => {
    // Inside the try for the same reason every other picker on this screen is:
    // the click handler discards this promise, so a dialog that fails to open
    // would leave the button looking dead.
    let path: string | null;
    try {
      path = await pickTemplateFile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the file picker.");
      return null;
    }
    if (!path) return null;

    setIsBusy(true);
    try {
      const parsed = parseProjectTemplate(await fsService.readTextFileAt(path));
      if (!parsed.ok) {
        setError(parsed.error);
        return null;
      }
      const choice = choiceFor(parsed.file, path, "file");
      // Keyed on the path, so opening the same file twice replaces its entry
      // rather than listing it twice — she may well be re-opening it because
      // whoever sent it sent a corrected one.
      setChoices((current) => [...current.filter((entry) => entry.id !== choice.id), choice]);
      setError(null);
      return choice;
    } catch {
      setError("That file couldn't be read. Check it's still where it was and try again.");
      return null;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const createFrom = useCallback(
    async (choice: TemplateChoice, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        setError("Give your project a name.");
        return false;
      }

      setIsBusy(true);
      let result: Awaited<ReturnType<typeof createProjectFromTemplate>>;
      try {
        const parentDir = await prepareNewProjectsDir();
        result = await createProjectFromTemplate(parentDir, trimmed, choice.file);
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
        return false;
      }
      setError(null);
      await recordProjectOpened(result.rootPath, trimmed);
      return true;
    },
    [createProjectFromTemplate, prepareNewProjectsDir, recordProjectOpened],
  );

  return {
    choices,
    isBusy,
    error,
    dismissError: useCallback(() => setError(null), []),
    openTemplateFile,
    createFrom,
  };
}
