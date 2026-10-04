/**
 * RPC contract between the main thread and the search worker.
 *
 * The corpus is never sent over postMessage — the worker opens IndexedDB
 * directly. Structured-cloning a full chat history is its own main-thread stall.
 */

import type { MessageRole } from "./schema";

/** A single match. Compact by design: message bodies stay in IndexedDB. */
export interface SearchHit {
  convoId: string;
  msgId: string;
  role: MessageRole;
  score: number;
  /** Offsets into `snippet`, ready to slice for highlighting. */
  startOffset: number;
  endOffset: number;
  snippet: string;
  title: string;
  updatedAt: number;
}

export type WorkerRequest =
  /** Always sent first: binds the worker to one user's corpus and channel. */
  | { type: "init"; uid: string }
  | { type: "query"; id: number; text: string; limit: number }
  | { type: "reindex" }
  /** Persist now rather than waiting out the debounce — sent as the page hides. */
  | { type: "flush" }
  | { type: "dirty"; convoId: string };

export type WorkerResponse =
  | { type: "results"; id: number; hits: SearchHit[] }
  | { type: "indexReady"; count: number }
  | { type: "error"; id?: number; message: string };

const SEARCH_CHANNEL_PREFIX = "sage_search";

/** Channels are per user, so two students' tabs never elect a leader together. */
export function searchChannelName(uid: string): string {
  return `${SEARCH_CHANNEL_PREFIX}_${uid}`;
}

/** Messages exchanged between tabs for leader election and dirty propagation. */
export type ChannelMessage =
  | { type: "heartbeat"; tabId: string; at: number }
  | { type: "dirty"; convoId: string }
  | { type: "indexUpdated"; at: number };
