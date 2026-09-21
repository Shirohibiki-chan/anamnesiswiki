// Center-panel router — folder nodes get FolderView, everything else gets a
// title + tab strip + placeholder body, and no selection gets EmptyPageView.
// See docs/plan.md Phase 4.
import { useState } from "react";
import {
  BLANK_TEMPLATE_KEY,
  BOARD_TEMPLATE_KEY,
  FOLDER_TEMPLATE_KEY,
  STORYLINE_TEMPLATE_KEY,
  UNIVERSE_TEMPLATE_KEY,
} from "../../constants/schema";
import { useProject } from "../../hooks/use-project";
import { PageDatabase } from "./PageDatabase";
import { PageStoryline } from "./PageStoryline";
import { PageBoard } from "./PageBoard";
import { Editor } from "./Editor";
import { EmptyPageView } from "./EmptyPageView";
import { FolderView } from "./FolderView";
import { useEffectiveStyleClass } from "../../hooks/use-style-class";
import { useCreatePageIn } from "../../hooks/use-new-page";
import { useFirstTab } from "../../hooks/use-first-tab";
import { NewPageLanding } from "./NewPageLanding";
import { PageBanner } from "./PageBanner";
import { PageTabs } from "./PageTabs";
import { PageTitle } from "./PageTitle";
import { useGraphOverlayActions } from "../../hooks/use-graph-overlay";
import "./page.css";

// Rendered with `key={node.id}` by AppLayout, so activeTabId's initial value
// (the page's first tab) is recomputed fresh on every node switch without
// needing an effect to reset it. The same remount is what lets a search jump
// land on a specific tab: `pendingFocus` only has to be right at mount, and
// it's matched against this node's id so a leftover from an earlier jump
// can't open the wrong tab on the next page opened.
//
// **Given a `nodeId`, it shows that page instead of the selected one** — the
// board's View panel (Phase 32, step 6) is the one caller, showing a page
// beside the board it is pinned to. Everything else is the same view, so
// there is one page view to keep right; only the pending rename and the
// pending focus are the selected page's, and they match on id anyway.
export function PageView({ nodeId }: { nodeId?: string } = {}) {
  const {
    contentRevisions,
    project,
    nodes,
    pendingFocus,
    pendingRenameId,
    updateTabContent,
    toggleTabHidden,
    addTab,
    renameTab,
    deleteTab,
    reorderTabs,
  } = useProject();
  const createPageIn = useCreatePageIn();
  const { openPageGraph } = useGraphOverlayActions();
  const shownId = nodeId ?? project?.selectedId ?? null;
  const node = shownId ? nodes[shownId] : undefined;
  // The tab a blank page is written into before it has one — see the hook.
  const { draftTab, ensureFirstTab, onDraftChange } = useFirstTab(shownId);
  // What a snippet aims at — see `styleClass` on Node. Read here, above the
  // early returns, because it is a hook.
  const styleClass = useEffectiveStyleClass(node);

  const focusedTabId = pendingFocus && pendingFocus.nodeId === node?.id ? pendingFocus.tabId : undefined;
  const [activeTabId, setActiveTabId] = useState<string | null>(focusedTabId ?? node?.tabs[0]?.id ?? null);

  // The initial value above covers a jump to a *different* page, with no frame
  // spent on the wrong tab. This covers the case the remount can't see: a
  // search hit on the page already open, where selectedId never changes and so
  // nothing remounts. React's documented alternative to a syncing effect —
  // adjust during render, keyed on the value that changed. `pendingFocus` is a
  // fresh object per jump, so asking for the same tab twice still lands.
  const [appliedFocus, setAppliedFocus] = useState(pendingFocus);
  if (pendingFocus !== appliedFocus) {
    setAppliedFocus(pendingFocus);
    if (focusedTabId) setActiveTabId(focusedTabId);
  }

  if (!node) return <EmptyPageView />;
  // A folder being shown as a database comes through the page shell instead,
  // for the same reason a universe does: the title above is editable and
  // FolderView's own centred name is not. The view is a lens over the page, so
  // whatever the page had underneath — tabs, writing — is still drawn below it.
  if (node.templateKey === FOLDER_TEMPLATE_KEY && !node.view) return <FolderView node={node} />;

  const activeTab = node.tabs.find((tab) => tab.id === activeTabId) ?? node.tabs[0];

  // A storyline has no tabs of its own — the canvas is its body, and what gets
  // written goes on the scenes, which are ordinary pages. So the "this page
  // has no tabs yet" offer below would be the wrong prompt on the one page
  // where having none is the point.
  const isStoryline = node.templateKey === STORYLINE_TEMPLATE_KEY;
  // A board is the same case: the drawing is the body (Board spike).
  const isCanvasPage = isStoryline || node.templateKey === BOARD_TEMPLATE_KEY;

  // A page nobody has answered anything about yet: created blank, and nothing
  // written in it since. Both halves matter — a blank page *with* tabs is one
  // that deliberately skipped the templates and is being written in, and
  // shoving the grid back in front of that would undo the choice every time
  // the page was reopened. Picking a template adds that template's tabs, and
  // the first word typed makes the first tab (see useFirstTab), so either
  // answer moves the page out of this state on its own.
  //
  // Unstarted is the wider state: blank and tabless, whether or not the grid
  // has been sent away. Such a page draws a first tab and an editor it does
  // not have yet, so there is always somewhere to write — with the grid under
  // them until it is answered or dismissed. Before this the sidebar's "don't
  // ask again" left the grid standing in the middle of the page.
  const isUnstarted = node.templateKey === BLANK_TEMPLATE_KEY && node.tabs.length === 0;
  const isUnanswered = isUnstarted && !node.hideTemplatePrompt;

  function handleAddTab() {
    ensureFirstTab();
    const tab = addTab(node!.id, "New Tab");
    setActiveTabId(tab.id);
  }

  // The tab strip is drawn from the draft while the page has no tabs, and
  // every control on it makes the tab real before acting on it. That is what
  // keeps the page from moving under her when she starts to type: the strip,
  // the editor and its key are all already in place, so the first word
  // changes what the store holds and nothing about what is on screen.
  const shownTabs = isUnstarted ? [draftTab] : node.tabs;
  const shownActiveTab = isUnstarted ? draftTab : activeTab;

  return (
    // `data-template` beside `data-style`: the page's kind is a fact worth a
    // hook of its own, so a snippet can say "every Character page" without
    // anybody naming a style first. Both are on the page's root and not the
    // window's — a skin describes a page, not the app around it.
    <div className="page-view-shell" data-style={styleClass} data-template={node.templateKey}>
      <PageBanner node={node} />
      {/* `page-view-unstarted` shrinks the editor from filling the page to a
          few lines, so the offer under it is in view rather than a screen
          down. Its top edge is where it stays either way. */}
      <div className={isUnanswered ? "page-view page-view-unstarted" : "page-view"}>
        {/* The one page whose name is worth interrupting for: it was created a
            second ago called "Untitled", and the user is the only one who
            knows what it should be. Everywhere else — including coming back to
            this same page later, before it's been named — the title is
            click-to-edit and stays out of the way. See the store's
            pendingRenameId for why that distinction is the whole fix. */}
        <PageTitle
          node={node}
          startEditing={pendingRenameId === node.id}
          onOpenGraph={() => openPageGraph(node.id)}
        />
        {/* Above the tabs rather than inside one, and always in the same
            place. A view is something the page is being shown *as*, so it
            belongs between the name and the writing — and a panel that sat
            somewhere different depending on what the page held would be the
            thing that reads as chaos. */}
        {node.view && <PageDatabase node={node} />}
        {/* A storyline's canvas sits exactly where a database view does, and
            for the same reason: it is what the page is being shown *as*, so it
            belongs between the name and the writing and always in the same
            place. A page whose body appeared somewhere different depending on
            what kind of page it was is the thing that reads as the app moving
            under her. */}
        {isStoryline && <PageStoryline node={node} />}
        {node.templateKey === BOARD_TEMPLATE_KEY && <PageBoard node={node} />}
        {isCanvasPage || (node.view && node.tabs.length === 0) ? null : node.tabs.length === 0 && !isUnstarted ? (
          // A universe is a container, not a page you write in, so the offer
          // is a page inside it rather than a tab on it. It still comes
          // through the page shell rather than FolderView, because the title
          // above is what asks a universe made a second ago what it is called
          // — FolderView draws its own name and has no way to be edited.
          node.templateKey === UNIVERSE_TEMPLATE_KEY ? (
            <div className="page-view-no-tabs">
              <p>A universe holds one version of your world. Put pages in it, or drag some in from the tree.</p>
              <button
                type="button"
                className="ui-btn ui-btn-lg ui-btn-secondary"
                onClick={() => createPageIn(node!.id)}
              >
                Add a Page
              </button>
            </div>
          ) : (
            <div className="page-view-no-tabs">
              <p>This page doesn't have any tabs yet.</p>
              <button type="button" className="ui-btn ui-btn-lg ui-btn-secondary" onClick={handleAddTab}>
                Add a Tab
              </button>
            </div>
          )
        ) : (
          <>
            <PageTabs
              tabs={shownTabs}
              activeTabId={shownActiveTab?.id ?? null}
              onSelect={setActiveTabId}
              onToggleHidden={(tabId) => toggleTabHidden(node.id, isUnstarted ? ensureFirstTab() : tabId)}
              onAdd={handleAddTab}
              onRename={(tabId, label) => renameTab(node.id, isUnstarted ? ensureFirstTab() : tabId, label)}
              onDelete={(tabId) => deleteTab(node.id, isUnstarted ? ensureFirstTab() : tabId)}
              onReorder={(orderedTabIds) => reorderTabs(node.id, orderedTabIds)}
            />
            {shownActiveTab && (
              <Editor
                // The revision is in the key so that replacing this page's
                // writing from outside the editor — restoring an earlier
                // version — remounts it with the restored words. Without it
                // the editor keeps showing what it read when it mounted, and
                // the next keystroke saves that back over the restore. It is
                // deliberately not `updatedAt`, which changes on every
                // keystroke and would remount the editor on each one.
                key={`${shownActiveTab.id}:${contentRevisions[node.id] ?? 0}`}
                nodeId={node.id}
                tabId={shownActiveTab.id}
                content={shownActiveTab.content}
                onContentChange={
                  isUnstarted ? onDraftChange : (content) => updateTabContent(node.id, shownActiveTab.id, content)
                }
              />
            )}
            {/* Under the writing, not instead of it: the page can be typed
                into with the offer still up, and the first word takes the
                offer away. The link at its foot does the same without the
                word. */}
            {isUnanswered && <NewPageLanding node={node} onSkip={ensureFirstTab} />}
          </>
        )}
      </div>
    </div>
  );
}
