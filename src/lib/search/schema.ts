/**
 * Schema constants and record shapes for the cross-conversational search corpus.
 *
 * SCHEMA_VERSION gates the persisted FlexSearch blob: if it does not match what
 * the worker reads back, the index is rebuilt from `messages` in full.
 */

export const DB_NAME = "sage_search";
export const DB_VERSION = 1;

/** Bumping this forces a full index rebuild on the next worker start. */
export const SCHEMA_VERSION = "1";

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
