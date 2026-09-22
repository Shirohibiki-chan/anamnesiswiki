// A boundary round one part of the window, so a crash in it costs that part
// and not the session.
//
// `ErrorBoundary` wraps the whole app and can only offer a restart, since
// nothing is left standing to offer anything else. This one wraps a part
// that can be re-entered — the page, the block panel, one block in it — and
// leaves the rest of the app usable: the tree still works, the other blocks
// still draw, and the block that failed is named, with its own chrome
// intact so it can be removed through its menu. Known Bug until 2026-09-21;
// more pressing since Phase 18a, when a sidebar became an arbitrary list of
// blocks rather than a fixed set of fields.
//
// A class component for the same reason the root one is: there is no hook
// for catching a render error.
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { recordCrash } from "../../services/crash-log-service";

type Props = {
  /** What is inside, in her terms — "this block", "the page". Said in the notice. */
  what: string;
  children: ReactNode;
};
type State = { failed: boolean };

export class PartBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Kept in the same log the whole-window crash writes to, so a bug report
    // sent afterwards carries it — a part that fails quietly every time it is
    // drawn is otherwise a crash nobody can see the trace of.
    recordCrash("render", error, info.componentStack ?? null);
  }

  // Drawing it again is the whole offer: the failure may have been a moment's
  // state, and if it wasn't the notice simply comes back, which is a loop she
  // can see rather than one she can't.
  private retry = (): void => {
    this.setState({ failed: false });
  };

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="part-boundary" role="alert">
        <AlertTriangle size={14} className="part-boundary-icon" aria-hidden="true" />
        <p className="part-boundary-text">
          {this.props.what} couldn't be drawn. The rest of the app is fine, and Settings → Report a Bug has the
          details.
        </p>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={this.retry}>
          <RefreshCw size={13} aria-hidden="true" />
          Try Again
        </button>
      </div>
    );
  }
}
