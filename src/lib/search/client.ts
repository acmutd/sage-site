/**
 * Main-thread client for the search worker.
 *
 * Every query carries a monotonic id, and a response is flagged stale unless its
 * id is the latest dispatched — otherwise a slow earlier keystroke lands after a
 * newer one and overwrites the fresher result set.
 */

import { onCorpusDirty } from "./corpus";
import { isIndexedDBAvailable } from "./db";
import type { SearchHit, WorkerRequest, WorkerResponse } from "./protocol";

export interface QueryOutcome {
  hits: SearchHit[];
  /** False when a newer query was dispatched before this response arrived. */
  current: boolean;
}

interface Pending {
  resolve: (outcome: QueryOutcome) => void;
  reject: (err: Error) => void;
}

let worker: Worker | null = null;
let unsubscribeDirty: (() => void) | null = null;
let nextQueryId = 1;
let latestQueryId = 0;
const pending = new Map<number, Pending>();

export function isSearchSupported(): boolean {
  return isIndexedDBAvailable() && typeof Worker !== "undefined";
}

function handleMessage(event: MessageEvent<WorkerResponse>): void {
  const message = event.data;
  if (!message) return;

  if (message.type === "results") {
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    entry.resolve({ hits: message.hits, current: message.id === latestQueryId });
    return;
  }

  if (message.type === "error") {
    if (message.id !== undefined) {
      const entry = pending.get(message.id);
      if (entry) {
        pending.delete(message.id);
        entry.reject(new Error(message.message));
      }
      return;
    }
    console.warn("[search] worker error", message.message);
  }
}

function getWorker(): Worker | null {
  if (!isSearchSupported()) return null;
  if (worker) return worker;

  try {
    worker = new Worker(new URL("./searchWorker.ts", import.meta.url), { type: "module" });
  } catch (err) {
    console.warn("[search] worker could not start", err);
    return null;
  }

  worker.onmessage = handleMessage;
  worker.onerror = (event) => console.warn("[search] worker error", event.message);

  // Ingestion runs on the main thread, so the worker has to be told that the
  // dirty store has new entries to drain.
  unsubscribeDirty = onCorpusDirty((convoId) => {
    send({ type: "dirty", convoId });
  });

  return worker;
}

function send(request: WorkerRequest): void {
  getWorker()?.postMessage(request);
}

/**
 * Starts the worker so it can load or rebuild its index before the first query.
 * Safe to call repeatedly — the worker is a module singleton.
 */
export function primeSearch(): void {
  getWorker();
}

export function searchMessages(text: string, limit = 25): Promise<QueryOutcome> {
  const instance = getWorker();
  if (!instance) return Promise.resolve({ hits: [], current: true });

  const id = nextQueryId++;
  latestQueryId = id;

  return new Promise<QueryOutcome>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    instance.postMessage({ type: "query", id, text, limit } satisfies WorkerRequest);
  });
}

export function requestReindex(): void {
  send({ type: "reindex" });
}

/** Tears the worker down. For tests and teardown, not used in the UI path. */
export function stopSearchWorker(): void {
  unsubscribeDirty?.();
  unsubscribeDirty = null;
  worker?.terminate();
  worker = null;
  pending.clear();
  latestQueryId = 0;
}
