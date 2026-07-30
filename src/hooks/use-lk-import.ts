// The only import path components have into lk-import.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { readRawFile } from "../services/filesystem-service";
import { buildImportPlan, parseLkBytes, type ImportPlan } from "../services/lk-import";
import { useProject } from "./use-project";

export function useLkImport() {
  const { importLkProject } = useProject();

  async function parseLkFile(path: string): Promise<ImportPlan> {
    const bytes = await readRawFile(path);
    const raw = await parseLkBytes(bytes);
    return buildImportPlan(raw);
  }

  return { parseLkFile, importLkProject };
}
