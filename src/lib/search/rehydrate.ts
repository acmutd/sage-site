/**
 * Reads message bodies back out of the corpus for conversations that were
 * pruned from the bounded localStorage window.
 */

import type { Message } from "@/types/chat";
import { getMessagesForConversation, isIndexedDBAvailable } from "./db";

/**
 * Returns the conversation's messages from IndexedDB, or null when the corpus
 * has nothing for it — in which case the caller should fall back to the server.
 *
 * Structured email/schedule replies come back as their raw JSON `content`;
 * ChatBot's `hydrateMessages` reconstructs `type` and `variants` from it, so
 * nothing extra needs storing.
 */
export async function rehydrateMessages(convoId: string): Promise<Message[] | null> {
  if (!isIndexedDBAvailable() || !convoId) return null;

  try {
    const records = await getMessagesForConversation(convoId);
    if (records.length === 0) return null;
    return records.map((record) => ({
      role: record.role,
      content: record.text,
      timestamp: record.updatedAt,
    }));
  } catch (err) {
    console.warn("[search] rehydrate failed", err);
    return null;
  }
}
