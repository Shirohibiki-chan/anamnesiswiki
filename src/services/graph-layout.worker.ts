// The layout, run off the window's thread. Big-world pass, 2026-09-13.
//
// **Why a worker.** `settleGraph` ticks d3-force 300 times and is synchronous
// by design (see graph-layout.ts — no half-settled state to catch, no idle
// loop). On 831 pages that is about 800ms, and while it ran the window was
// frozen: the graph opened with a stall, and every filter change or reach
// change stalled again. This file is the same function on another thread, so
// the picture arrives when it is ready and the app answers in the meantime.
//
// **Bundled inline, not fetched.** The built app is loaded from `file://`,
// where Chromium refuses to start a worker from a separate script; Vite's
// `?worker&inline` import (see graph-layout-worker.ts) packs this file and
// d3-force into a blob the page creates itself, which works wherever the
// page does. Nothing in here may touch the DOM or the stores — there is no
// DOM here and the stores are on the other thread.
import { settleGraph, type GraphPins } from "./graph-layout";
import type { GraphModel } from "./graph-service";

export type LayoutRequest = {
  id: number;
  model: GraphModel;
  pins: GraphPins;
  options: { centreId?: string | null; seed?: string };
};

export type LayoutReply = { id: number; model: GraphModel };

self.onmessage = (event: MessageEvent<LayoutRequest>) => {
  const { id, model, pins, options } = event.data;
  const reply: LayoutReply = { id, model: settleGraph(model, pins, options) };
  self.postMessage(reply);
};
