/**
 * IndexedDB access for the search corpus.
 *
 * Imported by both the main thread (ingestion) and the search worker (indexing
 * and querying), so this module must stay free of anything main-thread-only.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  DB_NAME_PREFIX,
  DB_VERSION,
  searchDbName,
  type AppStateRecord,
  type ConvoMetaRecord,
  type DirtyRecord,
  type IndexBlobRecord,
  type MessageRecord,
} from "./schema";

interface SageSearchDB extends DBSchema {
  messages: {
    key: string;
    value: MessageRecord;
    indexes: { by_convo: string };
  };
  convoMeta: {
    key: string;
    value: ConvoMetaRecord;
    indexes: { by_updated: number };
  };
  indexBlob: {
    key: string;
    value: IndexBlobRecord;
  };
  dirty: {
    key: string;
    value: DirtyRecord;
  };
  appState: {
    key: string;
    value: AppStateRecord;
  };
}

export type SearchDB = IDBPDatabase<SageSearchDB>;

let dbPromise: Promise<SearchDB> | null = null;
let activeUserId: string | null = null;

/**
 * Points the corpus at one user's database. Both threads call this before any
 * read or write — the worker on its `init` message, the main thread when auth
 * resolves. Returns true when the user actually changed, so callers can tear
 * down anything bound to the previous one.
 */
export function configureSearchUser(uid: string | null): boolean {
  if (uid === activeUserId) return false;

  const previous = dbPromise;
  dbPromise = null;
  activeUserId = uid;
  // Close the old handle after dropping it, so nothing reuses it mid-switch.
  void previous?.then((d) => d.close()).catch(() => undefined);
  return true;
}

export function getActiveSearchUser(): string | null {
  return activeUserId;
}

/**
 * True when the corpus can be touched at all. Ingestion is fire-and-forget, so
 * callers check this and no-op rather than throwing into the UI path.
 */
export function isSearchReady(): boolean {
  return isIndexedDBAvailable() && activeUserId !== null;
}

/**
 * Deletes every other user's corpus. Signing in on a shared machine should not
 * leave the previous student's messages on disk. Best effort: `databases()` is
 * unimplemented in Firefox, where this is a no-op.
 */
export async function purgeOtherSearchDatabases(currentUid: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    const list = (indexedDB as { databases?: () => Promise<{ name?: string }[]> }).databases;
    if (typeof list !== "function") return;
    const keep = searchDbName(currentUid);
    const found = await list.call(indexedDB);
    await Promise.all(
      found
        .map((entry) => entry.name)
        .filter((name): name is string =>
          Boolean(name) && name!.startsWith(`${DB_NAME_PREFIX}_`) && name !== keep
        )
        .map((name) => indexedDB.deleteDatabase(name))
        .map((request) => new Promise<void>((resolve) => {
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        }))
    );
  } catch (err) {
    console.warn("[search] could not purge other users' corpora", err);
  }
}

export function getSearchDB(): Promise<SearchDB> {
  const uid = activeUserId;
  if (!uid) {
    return Promise.reject(new Error("search user not configured"));
  }
  if (!dbPromise) {
    const opening: Promise<SearchDB> = openDB<SageSearchDB>(searchDbName(uid), DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("messages")) {
          const messages = db.createObjectStore("messages", { keyPath: "msgId" });
          messages.createIndex("by_convo", "convoId");
        }
        if (!db.objectStoreNames.contains("convoMeta")) {
          const convoMeta = db.createObjectStore("convoMeta", { keyPath: "convoId" });
          convoMeta.createIndex("by_updated", "updatedAt");
        }
        if (!db.objectStoreNames.contains("indexBlob")) {
          db.createObjectStore("indexBlob", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("dirty")) {
          db.createObjectStore("dirty", { keyPath: "convoId" });
        }
        if (!db.objectStoreNames.contains("appState")) {
          db.createObjectStore("appState", { keyPath: "key" });
        }
      },
      blocking() {
        // Another tab wants to upgrade: drop our handle so it is not blocked.
        void opening.then((d) => d.close());
        dbPromise = null;
      },
      terminated() {
        dbPromise = null;
      },
    });
    dbPromise = opening;
  }
  return dbPromise;
}

function db(): Promise<SearchDB> {
  return getSearchDB();
}

/** True when IndexedDB is usable at all — private modes and old browsers can refuse it. */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

export async function getMessagesForConversation(convoId: string): Promise<MessageRecord[]> {
  const database = await db();
  const rows = await database.getAllFromIndex("messages", "by_convo", convoId);
  // by_convo gives no ordering guarantee within a conversation; msgId encodes the index.
  return rows.sort((a, b) => messageIndexOf(a.msgId) - messageIndexOf(b.msgId));
}

export async function getConvoMeta(convoId: string): Promise<ConvoMetaRecord | undefined> {
  return (await db()).get("convoMeta", convoId);
}

export async function getAllConvoMeta(): Promise<ConvoMetaRecord[]> {
  return (await db()).getAll("convoMeta");
}

export async function getAppState<T>(key: string): Promise<T | undefined> {
  const row = await (await db()).get("appState", key);
  return row?.value as T | undefined;
}

export async function setAppState(key: string, value: unknown): Promise<void> {
  await (await db()).put("appState", { key, value });
}

function messageIndexOf(msgId: string): number {
  const hash = msgId.lastIndexOf("#");
  if (hash === -1) return 0;
  const parsed = Number(msgId.slice(hash + 1));
  return Number.isFinite(parsed) ? parsed : 0;
}
