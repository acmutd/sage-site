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
import { buildSnippet, encode, encodeRaw } from "./encoder";
import { accumulate, mergeCandidates, type FieldResult } from "./ranking";
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

interface BodyDoc {
  [key: string]: string;
  msgId: string;
  convoId: string;
  role: MessageRole;
  userText: string;
  botText: string;
  /** Same message text, indexed unstemmed so partial words match as typed. */
  rawText: string;
}

/** One document per conversation, so a title is stored once however long it is. */
interface TitleDoc {
  [key: string]: string;
  convoId: string;
  title: string;
  titleRaw: string;
}

/**
 * Assistant replies are long and generically phrased. Unweighted they flood
 * results and bury the real match, so the student's own messages outrank them.
 */
const BODY_FIELD_WEIGHT: Record<string, number> = {
  userText: 2,
  botText: 1,
  // A recall field, not a ranking signal: it duplicates the message text, so it
  // nudges rather than competing with the role-weighted fields above.
  rawText: 0.5,
};

/** Added once per conversation on top of its best body score. */
const TITLE_FIELD_WEIGHT: Record<string, number> = {
  title: 3,
  titleRaw: 0.5,
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

/** Namespaces the two indexes inside the single persisted blob. */
const BODY_BLOB_PREFIX = "body:";
const TITLE_BLOB_PREFIX = "title:";

function createBodyIndex(): Document<BodyDoc> {
  return new Document<BodyDoc>({
    encode,
    tokenize: "forward",
    document: {
      id: "msgId",
      index: [
        { field: "userText", tokenize: "forward" },
        { field: "botText", tokenize: "forward" },
        { field: "rawText", tokenize: "forward", encode: encodeRaw },
      ],
      store: ["convoId", "role"],
    },
  });
}

function createTitleIndex(): Document<TitleDoc> {
  return new Document<TitleDoc>({
    encode,
    tokenize: "forward",
    document: {
      id: "convoId",
      index: [
        { field: "title", tokenize: "forward" },
        { field: "titleRaw", tokenize: "forward", encode: encodeRaw },
      ],
    },
  });
}

let bodyIndex: Document<BodyDoc> = createBodyIndex();
let titleIndex: Document<TitleDoc> = createTitleIndex();
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
 * carry different weights. Titles live in their own index — copying one onto
 * every message meant an untitled chat, whose title is its whole first message,
 * indexed that string once per message it contained.
 */
function toBodyDoc(record: MessageRecord): BodyDoc {
  return {
    msgId: record.msgId,
    convoId: record.convoId,
    role: record.role,
    userText: record.role === "user" ? record.plaintext : "",
    botText: record.role === "assistant" ? record.plaintext : "",
    rawText: record.plaintext,
  };
}

function toTitleDoc(convoId: string, title: string): TitleDoc {
  return { convoId, title, titleRaw: title };
}

async function metaMap(): Promise<Map<string, ConvoMetaRecord>> {
  const db = await getSearchDB();
  const rows = await db.getAll("convoMeta");
  return new Map(rows.map((row) => [row.convoId, row] as const));
}

async function rebuildFromCorpus(): Promise<void> {
  const db = await getSearchDB();
  const metas = await metaMap();

  bodyIndex = createBodyIndex();
  titleIndex = createTitleIndex();
  docCount = 0;

  let cursor = await db.transaction("messages").store.openCursor();
  while (cursor) {
    bodyIndex.add(toBodyDoc(cursor.value));
    docCount += 1;
    cursor = await cursor.continue();
  }

  for (const meta of metas.values()) {
    if (meta.title) titleIndex.add(toTitleDoc(meta.convoId, meta.title));
  }
}

async function loadPersistedIndex(): Promise<boolean> {
  const db = await getSearchDB();
  const row = await db.get("indexBlob", INDEX_BLOB_KEY);
  if (!row || row.schemaVersion !== SCHEMA_VERSION) return false;

  try {
    bodyIndex = createBodyIndex();
    titleIndex = createTitleIndex();
    for (const [key, data] of Object.entries(row.blob)) {
      if (key.startsWith(BODY_BLOB_PREFIX)) {
        bodyIndex.import(key.slice(BODY_BLOB_PREFIX.length), data);
      } else if (key.startsWith(TITLE_BLOB_PREFIX)) {
        titleIndex.import(key.slice(TITLE_BLOB_PREFIX.length), data);
      }
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

  // FlexSearch hands export a series of keyed chunks, not one blob. Both
  // indexes share one record, namespaced so import can tell them apart.
  const blob: Record<string, string> = {};
  await bodyIndex.export((key: string, data: string) => {
    if (data !== undefined) blob[`${BODY_BLOB_PREFIX}${key}`] = data;
  });
  await titleIndex.export((key: string, data: string) => {
    if (data !== undefined) blob[`${TITLE_BLOB_PREFIX}${key}`] = data;
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
    bodyIndex.remove(msgId);
  }

  const records = await db.getAllFromIndex("messages", "by_convo", convoId);
  for (const record of records) {
    bodyIndex.remove(record.msgId);
  }
  titleIndex.remove(convoId);

  if (entry?.reason !== "delete") {
    for (const record of records) {
      bodyIndex.add(toBodyDoc(record));
    }
    const title = (await db.get("convoMeta", convoId))?.title ?? "";
    if (title) titleIndex.add(toTitleDoc(convoId, title));
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

/** Strict first, relaxing to partial matches only when nothing matches in full. */
async function searchField<D extends Record<string, string>>(
  index: Document<D>,
  query: string,
  limit: number
): Promise<FieldResult[]> {
  let results = await index.searchAsync(query, { limit, suggest: false });
  if (results.length === 0) {
    results = await index.searchAsync(query, { limit, suggest: true });
  }
  return results as FieldResult[];
}

async function runQuery(text: string, limit: number): Promise<SearchHit[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const candidates = Math.max(limit * CANDIDATE_MULTIPLIER, CANDIDATE_FLOOR);

  const [bodyResults, titleResults] = await Promise.all([
    searchField(bodyIndex, trimmed, candidates),
    searchField(titleIndex, trimmed, candidates),
  ]);

  const ranked = mergeCandidates(
    accumulate(bodyResults, BODY_FIELD_WEIGHT),
    accumulate(titleResults, TITLE_FIELD_WEIGHT),
    limit
  );

  const db = await getSearchDB();
  const hits: SearchHit[] = [];

  for (const [convoId, candidate] of ranked) {
    const meta = await db.get("convoMeta", convoId);
    const record = await db.get("messages", candidate.msgId);

    // A title-only match on a conversation whose messages are gone still
    // deserves its row; the title is all there is to show.
    if (!record) {
      if (!candidate.bodyMatched && meta) {
        hits.push({
          convoId,
          msgId: candidate.msgId,
          role: "user",
          score: candidate.score,
          startOffset: 0,
          endOffset: 0,
          snippet: meta.title,
          title: meta.title,
          updatedAt: meta.updatedAt,
        });
      }
      continue;
    }

    // Only a body match has something to highlight. buildSnippet degrades to a
    // leading excerpt with a zero-width span when the query is not in the text.
    const { snippet, startOffset, endOffset } = buildSnippet(record.plaintext, trimmed);
    hits.push({
      convoId,
      msgId: candidate.msgId,
      role: record.role,
      score: candidate.score,
      startOffset: candidate.bodyMatched ? startOffset : 0,
      endOffset: candidate.bodyMatched ? endOffset : 0,
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
