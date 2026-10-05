/**
 * Ingestion into the search corpus.
 *
 * Everything here is fire-and-forget: the chat UI never awaits these and they
 * never throw into the caller. A corpus that falls behind degrades search;
 * a corpus that throws breaks sending messages.
 */

import type { Conversation } from "@/types/chat";
import { conversationDisplayName, conversationUpdatedAt } from "@/utils/conversation";
import { getSearchDB, isSearchReady } from "./db";
import { makeMsgId, normalizeRole, toPlaintext } from "./plaintext";
import type { DirtyRecord, MessageRecord } from "./schema";

/** Notifies the worker (and other tabs) that the dirty store has new entries. */
type DirtyListener = (convoId: string) => void;
const dirtyListeners = new Set<DirtyListener>();

export function onCorpusDirty(listener: DirtyListener): () => void {
  dirtyListeners.add(listener);
  return () => dirtyListeners.delete(listener);
}

function announceDirty(convoId: string): void {
  dirtyListeners.forEach((listener) => {
    try {
      listener(convoId);
    } catch (err) {
      console.warn("[search] dirty listener failed", err);
    }
  });
}

function swallow(op: string): (err: unknown) => void {
  return (err: unknown) => console.warn(`[search] ${op} failed`, err);
}

type DirtyStore = {
  get(key: string): Promise<DirtyRecord | undefined>;
  put(value: DirtyRecord): Promise<unknown>;
};

/**
 * Marks a conversation dirty, merging with any mark the worker has not drained.
 *
 * Dirty rows are keyed by conversation, so a plain put would lose `removedMsgIds`
 * the worker still needs, and would let a late-completing upsert overwrite a
 * delete — leaving the index holding documents whose rows are gone. The ingestion
 * wrappers are fire-and-forget, so completion order is not guaranteed to match
 * call order; a delete therefore wins regardless of arrival order.
 */
async function markDirty(
  store: DirtyStore,
  convoId: string,
  reason: DirtyRecord["reason"],
  removedMsgIds: string[]
): Promise<void> {
  const existing = await store.get(convoId);
  const merged = new Set([...(existing?.removedMsgIds ?? []), ...removedMsgIds]);
  await store.put({
    convoId,
    reason: existing?.reason === "delete" ? "delete" : reason,
    markedAt: Date.now(),
    removedMsgIds: merged.size > 0 ? [...merged] : undefined,
  });
}

/**
 * Writes a conversation's messages and metadata into the corpus and marks it
 * dirty so the worker reindexes it.
 */
export async function syncConversationToCorpus(conv: Conversation): Promise<void> {
  if (!isSearchReady() || !conv?.conversation_id) return;

  const convoId = conv.conversation_id;
  const messages = conv.messages ?? [];
  // A conversation pruned from the cache arrives with no bodies; it has nothing
  // to contribute and overwriting would wipe what the corpus already holds.
  if (messages.length === 0) return;

  const updatedAt = conversationUpdatedAt(conv);
  const records: MessageRecord[] = messages.map((msg, index) => ({
    msgId: makeMsgId(convoId, index),
    convoId,
    role: normalizeRole(msg.role),
    text: msg.content ?? "",
    plaintext: toPlaintext(msg),
    updatedAt: msg.timestamp ? new Date(msg.timestamp).getTime() : updatedAt,
  }));

  const db = await getSearchDB();
  const tx = db.transaction(["messages", "convoMeta", "dirty"], "readwrite");
  const messageStore = tx.objectStore("messages");

  // msgId is positional, so a conversation that shrank would otherwise leave
  // orphaned rows past the new end.
  const existingKeys = await messageStore.index("by_convo").getAllKeys(convoId);
  const removed = existingKeys.filter((key) => !records.some((r) => r.msgId === key));
  await Promise.all(removed.map((key) => messageStore.delete(key)));

  await Promise.all(records.map((record) => messageStore.put(record)));
  await tx.objectStore("convoMeta").put({
    convoId,
    title: conversationDisplayName(conv),
    updatedAt,
    messageCount: records.length,
  });
  await markDirty(tx.objectStore("dirty"), convoId, "upsert", removed);
  await tx.done;

  announceDirty(convoId);
}

/** Fire-and-forget wrapper for the UI write paths. */
export function queueConversationSync(conv: Conversation): void {
  void syncConversationToCorpus(conv).catch(swallow("sync"));
}

/**
 * Ingests a whole list, reporting whether every conversation landed.
 *
 * Callers use the result to decide whether the corpus is complete — marking it
 * so while this is still running, or after it aborted partway, leaves
 * conversations permanently unindexed because the backfill then skips them.
 *
 * Still never awaited from the UI path; the caller chains off the promise.
 */
export async function syncConversations(convs: Conversation[]): Promise<boolean> {
  try {
    for (const conv of convs) {
      await syncConversationToCorpus(conv);
    }
    return true;
  } catch (err) {
    swallow("bulk sync")(err);
    return false;
  }
}

/**
 * Removes a conversation from the corpus. Without this, search keeps surfacing
 * conversations the student already deleted.
 */
export async function removeConversationFromCorpus(convoId: string): Promise<void> {
  if (!isSearchReady() || !convoId) return;

  const db = await getSearchDB();
  const tx = db.transaction(["messages", "convoMeta", "dirty"], "readwrite");
  const messageStore = tx.objectStore("messages");
  const keys = await messageStore.index("by_convo").getAllKeys(convoId);
  await Promise.all(keys.map((key) => messageStore.delete(key)));
  await tx.objectStore("convoMeta").delete(convoId);
  await markDirty(tx.objectStore("dirty"), convoId, "delete", keys);
  await tx.done;

  announceDirty(convoId);
}

/**
 * Drops corpus entries for conversations the server no longer lists.
 *
 * A conversation deleted on another device otherwise stays indexed forever:
 * search surfaces it, and clicking the row does nothing because the chat is not
 * in the sidebar. Reuses the delete path, so the index drops it too.
 *
 * Only call with a list the server actually returned — an empty list from a
 * failed parse would clear the whole corpus.
 */
export async function pruneCorpusTo(liveConvoIds: Iterable<string>): Promise<number> {
  if (!isSearchReady()) return 0;

  const keep = new Set(liveConvoIds);
  const db = await getSearchDB();
  const stale = (await db.getAll("convoMeta")).filter((meta) => !keep.has(meta.convoId));

  for (const meta of stale) {
    await removeConversationFromCorpus(meta.convoId);
  }
  return stale.length;
}

export function queueConversationRemoval(convoId: string): void {
  void removeConversationFromCorpus(convoId).catch(swallow("remove"));
}

/**
 * Updates a conversation's indexed title. The title is denormalized onto every
 * message document, so this marks the whole conversation for reindex.
 */
export async function renameConversationInCorpus(convoId: string, title: string): Promise<void> {
  if (!isSearchReady() || !convoId) return;

  const db = await getSearchDB();
  const tx = db.transaction(["convoMeta", "dirty"], "readwrite");
  const metaStore = tx.objectStore("convoMeta");
  const existing = await metaStore.get(convoId);
  if (existing) {
    await metaStore.put({ ...existing, title });
    await markDirty(tx.objectStore("dirty"), convoId, "upsert", []);
  }
  await tx.done;

  if (existing) announceDirty(convoId);
}

export function queueConversationRename(convoId: string, title: string): void {
  void renameConversationInCorpus(convoId, title).catch(swallow("rename"));
}
