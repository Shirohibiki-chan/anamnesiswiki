// Everything the Assets tab needs: what's in `assets/`, what uses it, and
// getting rid of one that nothing does.
//
// The listing is read on demand rather than held in the store, and that's the
// choice worth explaining. `assets/` is a directory on disk, not app state —
// the store has never modelled it, and a copy of it kept in memory would be one
// more thing to invalidate on every upload, delete, page duplicate and template
// save. Reading it when the tab opens is a `readDir` and a `stat` per file, on
// a panel the user has just chosen to look at.
//
// The *usage* half is the opposite: it's derived from records the store already
// holds, so it recomputes with them and needs no refreshing at all.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { assetFileName, assetRef } from "../services/asset-urls";
import { buildAssetEntries, indexAssetUsage, type AssetEntry, type AssetFile } from "../services/asset-usage";
import { readImageFile } from "../services/image-file";
import { useProjectStore } from "../state/project-store";

export type { AssetEntry, AssetUse } from "../services/asset-usage";
export { describeSize, describeUses } from "../services/asset-usage";

export function useAssets(): {
  entries: AssetEntry[];
  isLoading: boolean;
  /** Re-reads the directory. Called after anything that changes what's in it. */
  refresh: () => void;
} {
  const { nodes, templates, listAssets } = useProjectStore(
    useShallow((state) => ({ nodes: state.nodes, templates: state.templates, listAssets: state.listAssets })),
  );

  const [files, setFiles] = useState<AssetFile[] | null>(null);
  // Bumped to ask for another read. A counter rather than a boolean so two
  // refreshes in a row are two reads — with a flag, the second would be
  // swallowed while the first was still in flight.
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void listAssets().then((found) => {
      if (!cancelled) setFiles(found);
    });
    return () => {
      cancelled = true;
    };
  }, [listAssets, reloads]);

  const usage = useMemo(() => indexAssetUsage(nodes, templates), [nodes, templates]);
  const entries = useMemo(() => buildAssetEntries(files ?? [], usage), [files, usage]);

  return {
    entries,
    // Null until the first read lands, so the tab shows "reading" rather than
    // "no pictures yet" for the moment before the answer arrives.
    isLoading: files === null,
    refresh: useCallback(() => setReloads((count) => count + 1), []),
  };
}

export function useAssetActions() {
  return useProjectStore(useShallow((state) => ({ deleteAsset: state.deleteAsset })));
}

/**
 * Add a picture to the project and get back its filename in `assets/`.
 *
 * The one upload path for anything that then *points* at the file — the picker
 * and the portrait slot both. `uploadAsset` hands back an
 * `anamnesis-asset:` reference because the editor writes that straight into a
 * block; a slot stores the bare filename, so it's unwrapped here rather than at
 * each call site.
 *
 * Throws with a showable sentence — see services/image-file.ts.
 */
export function useUploadPicture(): (file: File) => Promise<string> {
  const uploadAsset = useProjectStore((state) => state.uploadAsset);
  return useCallback(
    async (file: File) => {
      const { bytes, extension } = await readImageFile(file);
      return assetFileName(await uploadAsset(bytes, extension)) ?? "";
    },
    [uploadAsset],
  );
}

/**
 * A library filename turned into the reference an image block holds.
 *
 * A hook around one pure function, purely so components don't import the
 * service — CLAUDE.md's layer order. The alternative was a component building
 * the `anamnesis-asset:` string itself, which is how a prefix ends up written
 * out by hand in two places and typo'd in one.
 */
export function useAssetRef(): (fileName: string) => string {
  return assetRef;
}
