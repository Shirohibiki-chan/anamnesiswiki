// The only import path components have into the `.anpage` bundle. See
// CLAUDE.md's layer order — components never import services directly.
import { collectSubtree } from "../services/template-library";
import { listAssetImages, readAssetImage, readRawFile, saveAssetImage, writeRawFile } from "../services/filesystem-service";
import { packPageTemplate, parsePageTemplate, picturesIn, summarizePageTemplate, type PageTemplateSummary } from "../services/page-template";
import { MAX_PAGE_TEMPLATE_BYTES } from "../constants/page-template";
import { useProjectStore } from "../state/project-store";

/** What the export modal shows before she picks a destination. */
export type PageTemplatePlan = {
  rootId: string;
  name: string;
  pages: number;
  /** Filenames of every picture the template points at. */
  pictures: string[];
  /** What those pictures weigh, before the zip squashes them. */
  pictureBytes: number;
};

export function usePageTemplateFile() {
  /**
   * What is in the template, and what its pictures cost.
   *
   * The size comes from the directory listing rather than by opening every
   * file, the same trade `use-lk-export` makes: it labels a switch she has not
   * touched yet.
   */
  async function planTemplate(rootId: string): Promise<PageTemplatePlan | null> {
    const { templates, rootPath } = useProjectStore.getState();
    const nodes = collectSubtree(rootId, templates.nodes, true);
    if (nodes.length === 0 || !rootPath) return null;

    const pictures = picturesIn(nodes);
    const wanted = new Set(pictures);
    const onDisk = await listAssetImages(rootPath);
    const pictureBytes = onDisk.filter((file) => wanted.has(file.fileName)).reduce((total, file) => total + file.size, 0);

    return { rootId, name: nodes.find((node) => node.id === rootId)?.name ?? "Template", pages: nodes.length, pictures, pictureBytes };
  }

  /**
   * Writes the bundle.
   *
   * **A picture that will not read is left out rather than fatal**, and the
   * manifest then lists only what is really inside — see `packPageTemplate`.
   * The person receiving it gets a template with one broken image instead of
   * nobody getting a template.
   */
  async function writeTemplate(plan: PageTemplatePlan, path: string, withPictures: boolean): Promise<{ pictures: number; missing: number }> {
    const { templates, rootPath } = useProjectStore.getState();
    if (!rootPath) return { pictures: 0, missing: 0 };

    const nodes = collectSubtree(plan.rootId, templates.nodes, true);
    const pictures: { fileName: string; bytes: Uint8Array }[] = [];
    let missing = 0;

    if (withPictures) {
      for (const fileName of plan.pictures) {
        try {
          pictures.push({ fileName, bytes: await readAssetImage(rootPath, fileName) });
        } catch {
          missing += 1;
        }
      }
    }

    await writeRawFile(path, await packPageTemplate({ rootId: plan.rootId, nodes, pictures }));
    return { pictures: pictures.length, missing };
  }

  /**
   * Reads a bundle and adds it to this world's templates.
   *
   * **The pictures are written before the nodes go in.** A template in the
   * library pointing at a file that is not there yet is a broken image on
   * screen for however long the writes take; the other order is only ever a
   * few unreferenced files if something fails halfway.
   *
   * **A picture whose filename is already in `assets/` is left alone.** Those
   * names are uuids, so the same name is the same picture — most often because
   * this bundle has been opened twice — and rewriting it would be pointless
   * work on a file that is already correct.
   */
  async function openTemplateFile(path: string): Promise<PageTemplateSummary> {
    const { rootPath, addImportedTemplate } = useProjectStore.getState();
    if (!rootPath) throw new Error("No world is open.");

    const bytes = await readRawFile(path);
    if (bytes.byteLength > MAX_PAGE_TEMPLATE_BYTES) {
      throw new Error("That file is far too big to be a template. It's probably not one.");
    }

    const { file, pictures } = parsePageTemplate(bytes);

    const existing = new Set((await listAssetImages(rootPath)).map((image) => image.fileName));
    for (const [fileName, data] of pictures) {
      if (existing.has(fileName)) continue;
      await saveAssetImage(rootPath, fileName, data);
    }

    if (!addImportedTemplate(file.nodes, file.rootId)) throw new Error("The template couldn't be added to this world.");
    return summarizePageTemplate(file);
  }

  return { planTemplate, writeTemplate, openTemplateFile };
}
