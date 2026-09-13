// The window's side of the layout worker. Big-world pass, 2026-09-13.
//
// One worker for the app's lifetime, started the first time a layout is
// asked for, and one promise per request matched by id — a reply for a
// request nobody is waiting on any more (a reach changed twice before the
// first picture arrived) is dropped here rather than drawn. Where there is no
// `Worker` at all the layout runs in place, which is what a unit test sees.
import LayoutWorker from "./graph-layout.worker?worker&inline";
import { settleGraph, type GraphPins } from "./graph-layout";
import type { LayoutReply, LayoutRequest } from "./graph-layout.worker";
import type { GraphModel } from "./graph-service";

type Options = { centreId?: string | null; seed?: string };

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, (model: GraphModel) => void>();

function start(): Worker | null {
  if (typeof Worker === "undefined") return null;
  if (worker) return worker;
  worker = new LayoutWorker();
  worker.onmessage = (event: MessageEvent<LayoutReply>) => {
    const resolve = waiting.get(event.data.id);
    waiting.delete(event.data.id);
    resolve?.(event.data.model);
  };
  return worker;
}

/**
 * `settleGraph`, off the window's thread.
 *
 * The same function with the same inputs, so the promise the plan makes —
 * the same world looks the same every time — holds exactly as it did. What
 * changes is only that the window keeps answering while the picture is
 * worked out.
 */
export function settleGraphInWorker(model: GraphModel, pins: GraphPins, options: Options): Promise<GraphModel> {
  const running = start();
  if (!running) return Promise.resolve(settleGraph(model, pins, options));
  const id = nextId++;
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    const request: LayoutRequest = { id, model, pins, options };
    running.postMessage(request);
  });
}
