/// <reference lib="webworker" />
/**
 * Search worker.
 *
 * Owns the FlexSearch index and talks to IndexedDB directly — the corpus is
 * never passed over postMessage, since structured-cloning a full chat history
 * is its own main-thread stall.
 *
 * Lifecycle on start:
 *   1. Read `indexBlob`; import it when `schemaVersion` matches the constant.
 *   2. Otherwise rebuild from `messages` in full.
 *   3. Drain `dirty`.
 *   4. Export and write the blob back (leader only).
 */

import { Document } from "flexsearch";
import { configureSearchUser, getSearchDB } from "./db";
import { buildSnippet, encode } from "./encoder";
import { parseMsgId } from "./plaintext";
import { startLeadership, type Leadership } from "./leader";
import { searchChannelName, type SearchHit, type WorkerRequest, type WorkerResponse } from "./protocol";
import {
  INDEX_BLOB_KEY,
  SCHEMA_VERSION,
  type ConvoMetaRecord,
  type MessageRecord,
  type MessageRole,
} from "./schema";

declare const self: DedicatedWorkerGlobalScope;

interface IndexedDoc {
  [key: string]: string;
  msgId: string;
  convoId: string;
  role: MessageRole;
  title: string;
  userText: string;
  botText: string;
}

/**
 * Assistant replies are long and generically phrased. Unweighted they flood
 * results and bury the real match, so field scores are multiplied on merge:
 * title highest, then the student's own messages, then assistant text.
 */
const FIELD_WEIGHT: Record<string, number> = {
  title: 3,
  userText: 2,
  botText: 1,
};

/**
 * Pull more candidates than we return. Results collapse to one row per
 * conversation, so the raw match list has to be several times the row limit to
 * still fill it once duplicates are dropped.
 */
const CANDIDATE_MULTIPLIER = 4;
const CANDIDATE_FLOOR = 50;

/** Debounce for dirty drains, so a burst of rapid sends does not thrash. */
const DRAIN_DEBOUNCE_MS = 300;

function createIndex(): Document<IndexedDoc> {
  return new Document<IndexedDoc>({
    encode,
    tokenize: "forward",
    document: {
      id: "msgId",
      index: [
        { field: "title", tokenize: "forward" },
        { field: "userText", tokenize: "forward" },
        { field: "botText", tokenize: "forward" },
      ],
      store: ["convoId", "role"],
    },
  });
}

let index: Document<IndexedDoc> = createIndex();
let docCount = 0;
let leadership: Leadership | null = null;
let ready: Promise<void> | null = null;
let drainTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Resolves once the main thread has sent `init`. Nothing may touch the corpus
 * before then — the worker has no access to auth and cannot know whose database
 * to open, and guessing would mean indexing another student's messages.
 */
let signedIn: string | null = null;
let resolveSignedIn: (() => void) | null = null;
const awaitingInit = new Promise<void>((resolve) => {
  resolveSignedIn = resolve;
});

function post(message: WorkerResponse): void {
  self.postMessage(message);
}

/**
 * Routes the message text into `userText` or `botText` by role, so the two can
 * carry different weights. The title is denormalized onto every document, which
 * is why a rename marks the whole conversation dirty.
 */
function toDoc(record: MessageRecord, title: string): IndexedDoc {
  return {
    msgId: record.msgId,
    convoId: record.convoId,
    role: record.role,
    title,
    userText: record.role === "user" ? record.plaintext : "",
    botText: record.role === "assistant" ? record.plaintext : "",
  };
}

async function metaMap(): Promise<Map<string, ConvoMetaRecord>> {
  const db = await getSearchDB();
  const rows = await db.getAll("convoMeta");
  return new Map(rows.map((row) => [row.convoId, row] as const));
}

async function rebuildFromCorpus(): Promise<void> {
  const db = await getSearchDB();
  const metas = await metaMap();

  index = createIndex();
  docCount = 0;

  let cursor = await db.transaction("messages").store.openCursor();
  while (cursor) {
    const record = cursor.value;
    index.add(toDoc(record, metas.get(record.convoId)?.title ?? ""));
    docCount += 1;
    cursor = await cursor.continue();
  }
}

async function loadPersistedIndex(): Promise<boolean> {
  const db = await getSearchDB();
  const row = await db.get("indexBlob", INDEX_BLOB_KEY);
  if (!row || row.schemaVersion !== SCHEMA_VERSION) return false;

  try {
    index = createIndex();
    for (const [key, data] of Object.entries(row.blob)) {
      index.import(key, data);
    }
    docCount = await db.count("messages");
    return true;
  } catch (err) {
    console.warn("[search worker] index import failed, rebuilding", err);
    return false;
  }
}

async function persistIndex(): Promise<void> {
  if (!leadership?.isLeader()) return;

  // FlexSearch hands export a series of keyed chunks, not one blob.
  const blob: Record<string, string> = {};
  await index.export((key: string, data: string) => {
    if (data !== undefined) blob[key] = data;
  });

  const db = await getSearchDB();
  await db.put("indexBlob", {
    key: INDEX_BLOB_KEY,
    blob,
    schemaVersion: SCHEMA_VERSION,
    builtAt: Date.now(),
  });
  leadership.broadcastIndexUpdated();
}

/**
 * Applies one conversation's pending changes: drop its existing documents, then
 * re-add them from `messages` unless the conversation was deleted.
 */
async function reindexConversation(convoId: string): Promise<void> {
  const db = await getSearchDB();
  const entry = await db.get("dirty", convoId);

  // Documents whose rows are already gone can only be found through the ids the
  // ingestion path recorded on the dirty entry.
  for (const msgId of entry?.removedMsgIds ?? []) {
    index.remove(msgId);
  }

  const records = await db.getAllFromIndex("messages", "by_convo", convoId);
  for (const record of records) {
    index.remove(record.msgId);
  }

  if (entry?.reason !== "delete") {
    const title = (await db.get("convoMeta", convoId))?.title ?? "";
    for (const record of records) {
      index.add(toDoc(record, title));
    }
  }

  docCount = await db.count("messages");
}

/**
 * Drains the dirty store. Leader-only: if a follower drained too, the two would
 * race for the same rows and whichever lost would silently skip those changes
 * and go stale. Followers pick the work up through `indexUpdated` instead.
 */
async function drainDirty(): Promise<number> {
  if (!(leadership?.isLeader() ?? true)) return 0;

  const db = await getSearchDB();
  const entries = await db.getAll("dirty");
  if (entries.length === 0) return 0;

  for (const entry of entries) {
    await reindexConversation(entry.convoId);
    await db.delete("dirty", entry.convoId);
  }

  await persistIndex();
  return entries.length;
}

/** Follower path: adopt the index the leader just published. */
async function reloadPublishedIndex(): Promise<void> {
  if (leadership?.isLeader()) return;
  const imported = await loadPersistedIndex();
  if (!imported) await rebuildFromCorpus();
  post({ type: "indexReady", count: docCount });
}

/** Batches bursts of marks into a single drain. */
function scheduleDrain(): void {
  if (drainTimer) clearTimeout(drainTimer);
  drainTimer = setTimeout(() => {
    drainTimer = null;
    void drainDirty()
      .then(() => post({ type: "indexReady", count: docCount }))
      .catch((err) => post({ type: "error", message: String(err) }));
  }, DRAIN_DEBOUNCE_MS);
}

async function initialize(): Promise<void> {
  await awaitingInit;
  if (!signedIn) return;

  leadership = startLeadership(searchChannelName(signedIn), {
    onDirty: () => scheduleDrain(),
    onIndexUpdated: () => {
      void reloadPublishedIndex().catch((err) =>
        post({ type: "error", message: `index reload failed: ${String(err)}` })
      );
    },
    onBecameLeader: () => scheduleDrain(),
  });

  const imported = await loadPersistedIndex();
  if (!imported) await rebuildFromCorpus();

  const drained = await drainDirty();

  // A rebuild has to be published even when nothing was dirty. Otherwise the
  // rejected blob survives untouched and every later load rebuilds again.
  if (!imported && drained === 0) await persistIndex();

  post({ type: "indexReady", count: docCount });
}

function ensureReady(): Promise<void> {
  if (!ready) {
    ready = initialize().catch((err) => {
      post({ type: "error", message: `index init failed: ${String(err)}` });
    });
  }
  return ready;
}

async function runQuery(text: string, limit: number): Promise<SearchHit[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const candidates = Math.max(limit * CANDIDATE_MULTIPLIER, CANDIDATE_FLOOR);

  // Strict first: every query term must match, so "12 of those 18" cannot be
  // beaten by a conversation that only contains "of". `suggest` relaxes that to
  // partial matches, which is the right fallback when nothing matches in full
  // but the wrong default — it lets a one-word hit outrank the exact phrase.
  let results = await index.searchAsync(trimmed, { limit: candidates, suggest: false });
  if (results.length === 0) {
    results = await index.searchAsync(trimmed, { limit: candidates, suggest: true });
  }

  // Merge the per-field result lists, weighting by field and by rank.
  const scores = new Map<string, number>();
  for (const group of results) {
    const weight = FIELD_WEIGHT[String(group.field)] ?? 1;
    group.result.forEach((id, rank) => {
      const msgId = String(id);
      scores.set(msgId, (scores.get(msgId) ?? 0) + weight / (1 + rank));
    });
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);

  // One row per conversation. A title match lifts every message in that
  // conversation, so without this a single chat floods the list with near
  // duplicates that all open the same place. Ranked order means the first
  // sighting of a conversation is already its best-scoring message.
  const top: Array<[string, number]> = [];
  const seen = new Set<string>();
  for (const entry of ranked) {
    const { convoId } = parseMsgId(entry[0]);
    if (seen.has(convoId)) continue;
    seen.add(convoId);
    top.push(entry);
    if (top.length >= limit) break;
  }

  const db = await getSearchDB();
  const hits: SearchHit[] = [];

  for (const [msgId, score] of top) {
    const record = await db.get("messages", msgId);
    if (!record) continue; // Deleted since the index last drained.
    const meta = await db.get("convoMeta", record.convoId);
    const { snippet, startOffset, endOffset } = buildSnippet(record.plaintext, trimmed);
    hits.push({
      convoId: record.convoId,
      msgId,
      role: record.role,
      score,
      startOffset,
      endOffset,
      snippet,
      title: meta?.title ?? "Untitled Conversation",
      updatedAt: meta?.updatedAt ?? record.updatedAt,
    });
  }

  return hits;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (!request) return;

  if (request.type === "init") {
    // The client terminates and replaces this worker when the user changes, so
    // a second init with a different uid should never arrive.
    if (signedIn && signedIn !== request.uid) {
      post({ type: "error", message: "worker already bound to another user" });
      return;
    }
    if (!signedIn) {
      signedIn = request.uid;
      configureSearchUser(request.uid);
      resolveSignedIn?.();
    }
    return;
  }

  if (request.type === "query") {
    void ensureReady()
      .then(() => runQuery(request.text, request.limit))
      .then((hits) => post({ type: "results", id: request.id, hits }))
      .catch((err) => post({ type: "error", id: request.id, message: String(err) }));
    return;
  }

  if (request.type === "dirty") {
    // Leadership is established inside initialize(), so broadcasting before it
    // resolves would drop the very first mark.
    void ensureReady().then(() => {
      leadership?.broadcastDirty(request.convoId);
      scheduleDrain();
    });
    return;
  }

  if (request.type === "reindex") {
    void ensureReady().then(() => scheduleDrain());
  }
};

// Deliberately not started here: ensureReady waits on `init`, and the first
// request after it arrives kicks everything off.
