// The one thing that stops a crash from being a white window.
//
// **A class component because there is no other kind.** Error boundaries are
// the single React feature with no hook equivalent, so this is not an oversight
// or an old file waiting to be modernised — `getDerivedStateFromError` and
// `componentDidCatch` only exist on a class.
//
// It wraps `<App />` from `main.tsx` rather than sitting inside App, because
// App runs hooks of its own and a boundary cannot catch a throw from the
// component it is written inside.
//
// **What it does not catch**: anything outside the render tree — a timer, an
// event handler that runs after paint, a promise nobody awaited.
// `installCrashHandlers` in `crash-log-service.ts` records those, and
// deliberately does not put this screen up for them.
import { Component, type ErrorInfo, type ReactNode } from "react";
import { CrashScreen } from "./CrashScreen";
import { buildCrash, persistCrash, type CrashRecord } from "../../services/crash-log-service";

type Props = { children: ReactNode };
type State = { record: CrashRecord | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { record: null };

  // Runs first and decides that something has gone wrong, without the
  // component stack — `componentDidCatch` follows immediately with that, and
  // replaces this record before anything is painted.
  static getDerivedStateFromError(error: unknown): State {
    return { record: buildCrash("render", error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    const record = buildCrash("render", error, info.componentStack ?? null);
    this.setState({ record });
    // Fire and forget, and it cannot throw. The screen below is already
    // rendering from the record in memory, so nothing here is on the path
    // between the crash and the person looking at it.
    void persistCrash(record);
  }

  // A reload rather than a relaunch: the renderer is what died, a fresh one is
  // what fixes it, and it is the faster of the two by a wide margin. If the
  // crash happens again during startup the screen simply comes back, which is
  // a legible loop rather than a silent one.
  private restart = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.record) return <CrashScreen record={this.state.record} onRestart={this.restart} />;
    return this.props.children;
  }
}
