/**
 * Schema constants and record shapes for the cross-conversational search corpus.
 *
 * SCHEMA_VERSION gates the persisted FlexSearch blob: if it does not match what
 * the worker reads back, the index is rebuilt from `messages` in full. The
 * stemmer is part of that identity — swapping or bumping it changes how tokens
 * encode, so an index built by the old one can no longer be queried correctly.
 */

/**
 * Databases are per user: `sage_search_<uid>`. A shared browser would otherwise
 * serve one student's indexed messages to whoever logs in next, since the
 * records carry no owner and the worker indexes whatever the store holds.
 */
export const DB_NAME_PREFIX = "sage_search";

export function searchDbName(uid: string): string {
  return `${DB_NAME_PREFIX}_${uid}`;
}
export const DB_VERSION = 1;

/** Bumping this forces a full index rebuild on the next worker start. */
export const SCHEMA_VERSION = "3+stemmer@2.0.1+raw+split-title";

export type MessageRole = "user" | "assistant";

export interface MessageRecord {
  /** `${convoId}#${index}` — see makeMsgId in plaintext.ts */
  msgId: string;
  convoId: string;
  role: MessageRole;
  /** Raw message content, exactly as the chat stores it. */
  text: string;
  /** Markdown-stripped projection of `text`. Offsets returned by search point into this. */
  plaintext: string;
  updatedAt: number;
}

export interface ConvoMetaRecord {
  convoId: string;
  title: string;
  updatedAt: number;
  messageCount: number;
}

export interface IndexBlobRecord {
  key: "flexsearch";
  /** FlexSearch export is a set of keyed string chunks, not a single string. */
  blob: Record<string, string>;
  schemaVersion: string;
  builtAt: number;
}

export interface DirtyRecord {
  convoId: string;
  reason: "upsert" | "delete";
  markedAt: number;
  /**
   * Documents to drop from the index. The worker normally finds a conversation's
   * documents through the `by_convo` index, but rows removed by a delete — or by
   * a conversation that shrank — are already gone by the time it drains, so their
   * ids have to be carried here or stale documents linger in the index.
   */
  removedMsgIds?: string[];
}

/** Small key/value store for cross-cutting flags that do not belong on a conversation. */
export interface AppStateRecord {
  key: string;
  value: unknown;
}

export const INDEX_BLOB_KEY = "flexsearch" as const;
export const BACKFILL_STATE_KEY = "backfill";

export interface BackfillState {
  userId: string;
  completedAt: number;
}
