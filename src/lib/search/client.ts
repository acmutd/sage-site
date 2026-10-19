/**
 * Main-thread client for the search worker.
 *
 * Every query carries a monotonic id, and a response is flagged stale unless its
 * id is the latest dispatched — otherwise a slow earlier keystroke lands after a
 * newer one and overwrites the fresher result set.
 */

import { onCorpusDirty } from "./corpus";
import { configureSearchUser, isIndexedDBAvailable, purgeOtherSearchDatabases } from "./db";
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
let detachLifecycle: (() => void) | null = null;
let workerUid: string | null = null;
let nextQueryId = 1;
let latestQueryId = 0;
const pending = new Map<number, Pending>();

export function isSearchSupported(): boolean {
  return isIndexedDBAvailable() && typeof Worker !== "undefined";
}

/** True once a user is bound, so the UI can hide itself until then. */
export function isSearchActive(): boolean {
  return isSearchSupported() && workerUid !== null;
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

/**
 * Binds search to one user. Everything the corpus touches is per user — the
 * database, the worker and the leader-election channel — so a change here tears
 * the worker down rather than letting it keep serving the previous student.
 *
 * Call with null on sign-out. Safe to call repeatedly with the same uid.
 */
export function setSearchUser(uid: string | null): void {
  if (uid === workerUid) return;

  stopSearchWorker();
  workerUid = uid;
  configureSearchUser(uid);

  if (uid) {
    // Signing in on a shared machine should not leave the previous student's
    // corpus on disk.
    void purgeOtherSearchDatabases(uid);
  }
}

function getWorker(): Worker | null {
  if (!isSearchSupported() || !workerUid) return null;
  if (worker) return worker;

  try {
    worker = new Worker(new URL("./searchWorker.ts", import.meta.url), { type: "module" });
  } catch (err) {
    console.warn("[search] worker could not start", err);
    return null;
  }

  worker.onmessage = handleMessage;
  worker.onerror = (event) => console.warn("[search] worker error", event.message);

  // Must be the first message: the worker cannot see auth and will not open a
  // database until it knows whose corpus to use.
  worker.postMessage({ type: "init", uid: workerUid } satisfies WorkerRequest);

  // Ingestion runs on the main thread, so the worker has to be told that the
  // dirty store has new entries to drain.
  unsubscribeDirty = onCorpusDirty((convoId) => {
    send({ type: "dirty", convoId });
  });

  attachLifecycle();
  return worker;
}

/**
 * Index writes are debounced in the worker, which cannot see `document`. Tell it
 * to flush as the page goes away, or a tab closed inside the debounce window
 * loses that work and the next load pays to rebuild it.
 */
function attachLifecycle(): void {
  if (detachLifecycle || typeof document === "undefined") return;

  const onHidden = () => {
    if (document.visibilityState === "hidden") worker?.postMessage({ type: "flush" });
  };
  // pagehide covers iOS Safari, where a backgrounded tab may never fire
  // visibilitychange before it is frozen.
  const onPageHide = () => worker?.postMessage({ type: "flush" });

  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("pagehide", onPageHide);

  detachLifecycle = () => {
    document.removeEventListener("visibilitychange", onHidden);
    window.removeEventListener("pagehide", onPageHide);
  };
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
  // No flush here: terminate would abort before the worker could handle it.
  // Anything still debounced is recoverable — its dirty rows are only cleared
  // once a write succeeds, so the next session replays them.
  detachLifecycle?.();
  detachLifecycle = null;
  unsubscribeDirty?.();
  unsubscribeDirty = null;
  worker?.terminate();
  worker = null;
  pending.clear();
  latestQueryId = 0;
}
