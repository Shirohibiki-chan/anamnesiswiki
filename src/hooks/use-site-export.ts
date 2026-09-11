// The only import path components have into the published site (Phase 1.5).
// See CLAUDE.md's layer order — components never import services directly.
import type { LucideIcon } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assetPath, writeFileTree, type FileTreeResult } from "../services/filesystem-service";
import { planSite, type SitePlan, type SiteTheme } from "../services/site-plan";
import { readSiteTheme } from "../services/site-theme";
import { useProjectStore } from "../state/project-store";
import { readExportWorld } from "./use-export-world";

export function useSiteExport() {
  /**
   * The theme as it is on screen, fonts included.
   *
   * Async because the fonts are fetched, and separate from the plan so the
   * modal can show the page count at once and the theme can catch up — a
   * world of three pages should not wait on six font files to say "3 pages".
   */
  function readTheme(): Promise<SiteTheme> {
    return readSiteTheme();
  }

  /**
   * A Lucide icon as the SVG the app itself draws.
   *
   * Here rather than in the planner because an icon is a React component
   * and its path data is not reachable from plain TypeScript; React's static
   * renderer is the one honest way to get the markup, and hooks are the
   * lowest layer allowed to import React.
   */
  function renderIcon(Icon: LucideIcon, className: string): string {
    return renderToStaticMarkup(createElement(Icon, { className, size: "1em", "aria-hidden": true }));
  }

  function plan(rootIds: string[], theme: SiteTheme): SitePlan | null {
    const world = readExportWorld();
    if (!world) return null;
    return planSite({ ...world, rootIds, projectName: world.project.name, homeNodeId: world.project.homeNodeId, theme, renderIcon });
  }

  /**
   * Writes the site into a new folder inside the one she picked, named after
   * the world — the same shape as the vault, for the same reason: a site is
   * a hundred files, and loose in Documents is not what anybody means.
   */
  async function write(site: SitePlan, parentDir: string): Promise<FileTreeResult> {
    const { project, rootPath } = useProjectStore.getState();
    return writeFileTree(parentDir, `${project?.name || "World"} website`, {
      folders: site.folders,
      files: site.files,
      binaries: site.binaries,
      copies: rootPath ? site.assets.map((asset) => ({ from: assetPath(rootPath, asset.fileName), to: asset.path })) : [],
    });
  }

  return { readTheme, plan, write };
}
