// One FIFO queue that every filesystem mutation in the app goes through.
//
// Nothing here is about throughput — it's about ordering. A node's path is
// *recomputed* from the in-memory graph on every write (see
// filesystem-service's resolveNodePath), so an operation's plan describes the
// disk as it will be once every operation issued before it has landed. Two
// overlapping operations break that assumption: the second one plans a rename
// from a path the first one hasn't written yet, the rename fails with "the
// system cannot find the file specified", and from then on the graph and the
// disk disagree permanently — every later operation on that node re-plans the
// same impossible move and fails identically.
//
// That is not hypothetical. Tauri's fs calls are IPC round-trips to Rust, so
// "make a page, then rename it" is easily two overlapping writes; on
// 2026-08-11 it left three pages with no file of their own and one folder
// unable to save anything at all. The store's writes are deliberately not
// awaited by the UI — that part is right, the interface shouldn't block on a
// disk — but not-awaited must not mean unordered.
//
// Deliberately a plain module-level chain rather than anything cleverer: it
// must survive React re-renders (same reason autosave.ts isn't a hook), and
// per-node queues would reintroduce the bug, since the operations that
// conflict are precisely the ones that touch more than one node.
let tail: Promise<unknown> = Promise.resolve();

/**
 * Runs `work` after everything already queued, whether those succeeded or
 * failed, and hands back its own result so a caller that does want to wait
 * still can.
 *
 * `work` is a function, not a promise: a promise has already started, which
 * is the whole thing being prevented here.
 */
export function enqueueWrite<T>(work: () => Promise<T> | T): Promise<T> {
  // Both handlers, so one failed write doesn't wedge the queue for good.
  const result = tail.then(work, work);
  tail = result.then(
    () => {},
    () => {},
  );
  return result;
}

/** Resolves once the queue has drained. Tests only. */
export function whenWritesSettle(): Promise<void> {
  return tail.then(
    () => {},
    () => {},
  );
}
