/**
 * Bounded persistence for `chatbot_conversations`.
 *
 * localStorage stays the instant-paint cache for recent conversations, but it
 * is synchronous and ~5MB-capped, so it can no longer hold every message body
 * as history grows. Only the most recent conversations keep their bodies; the
 * rest persist as metadata and rehydrate from IndexedDB (or the server) on open.
 */

import type { Conversation } from "@/types/chat";
import { conversationPreview, conversationUpdatedAt } from "@/utils/conversation";

export const CONVERSATIONS_CACHE_KEY = "chatbot_conversations";

/** Conversations that keep full message bodies in localStorage. */
export const FULL_BODY_WINDOW = 20;

/** Soft ceiling for the serialized payload, well under the ~5MB browser cap. */
export const SOFT_CEILING_BYTES = 2 * 1024 * 1024;

const PREVIEW_LENGTH = 140;

function prune(conv: Conversation): Conversation {
  return {
    conversation_id: conv.conversation_id,
    user_id: conv.user_id,
    messages: [],
    title: conv.title,
    conversation_name: conv.conversation_name,
    updatedAt: conversationUpdatedAt(conv),
    preview: conversationPreview(conv).slice(0, PREVIEW_LENGTH),
  };
}

function withUpdatedAt(conv: Conversation): Conversation {
  return { ...conv, updatedAt: conversationUpdatedAt(conv) };
}

/**
 * Projects the conversation list to a payload that fits the ceiling: the
 * `windowSize` most recently updated keep their bodies, everything else is
 * pruned to metadata. Shrinks the window from the oldest end until it fits.
 */
export function buildBoundedPayload(
  convs: Conversation[],
  windowSize: number = FULL_BODY_WINDOW
): { data: Conversation[]; windowSize: number } {
  const ordered = [...convs].sort((a, b) => conversationUpdatedAt(b) - conversationUpdatedAt(a));

  let size = Math.min(windowSize, ordered.length);
  for (;;) {
    const data = ordered.map((conv, index) => (index < size ? withUpdatedAt(conv) : prune(conv)));
    const serialized = JSON.stringify(data);
    if (serialized.length <= SOFT_CEILING_BYTES || size === 0) {
      return { data, windowSize: size };
    }
    // Trim the oldest body-carrying entry and measure again.
    size -= 1;
  }
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    // Safari private mode reports a bare DOMException code.
    (err as unknown as { code?: number }).code === 22
  );
}

/**
 * Writes the bounded conversation list. On a quota failure it drops the oldest
 * half of the window and retries once, then gives up silently — a stale cache
 * is recoverable, an exception in the send path is not.
 */
export function saveConversationsToCache(convs: Conversation[], userId: string): void {
  const write = (windowSize: number): boolean => {
    const { data } = buildBoundedPayload(convs, windowSize);
    try {
      localStorage.setItem(
        CONVERSATIONS_CACHE_KEY,
        JSON.stringify({ data, timestamp: Date.now(), userId })
      );
      return true;
    } catch (err) {
      if (!isQuotaError(err)) {
        console.warn("[search] conversation cache write failed", err);
        return true; // Not a capacity problem; retrying smaller will not help.
      }
      return false;
    }
  };

  if (write(FULL_BODY_WINDOW)) return;
  if (write(Math.floor(FULL_BODY_WINDOW / 2))) return;
  console.warn("[search] conversation cache write gave up after quota retry");
}

/** Rewrites the cached payload in place, preserving its timestamp and userId. */
export function updateCachedConversations(
  transform: (convs: Conversation[]) => Conversation[]
): void {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.data)) return;
    const { data } = buildBoundedPayload(transform(parsed.data as Conversation[]));
    localStorage.setItem(CONVERSATIONS_CACHE_KEY, JSON.stringify({ ...parsed, data }));
  } catch (err) {
    console.warn("[search] conversation cache update failed", err);
  }
}
