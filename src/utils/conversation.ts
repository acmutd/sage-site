/**
 * Shared accessors for conversation ordering and labelling.
 *
 * Conversations outside the bounded localStorage window carry no message
 * bodies, so anything that used to read `messages[...]` directly has to go
 * through here or those conversations sort to the bottom and render untitled.
 */

import type { Conversation } from "@/types/chat";

/** Last-activity timestamp, preferring the explicit field pruned entries carry. */
export function conversationUpdatedAt(conv: Conversation): number {
  if (typeof conv.updatedAt === "number" && conv.updatedAt > 0) return conv.updatedAt;
  const last = conv.messages?.[conv.messages.length - 1]?.timestamp;
  return last ? new Date(last).getTime() : 0;
}

/** First-message text used as a fallback label, or the stored preview when pruned. */
export function conversationPreview(conv: Conversation): string {
  return conv.preview || conv.messages?.[0]?.content || "";
}

export function conversationDisplayName(conv: Conversation): string {
  return (
    conv.title ||
    conv.conversation_name ||
    conversationPreview(conv) ||
    "Untitled Conversation"
  );
}

export function sortConversationsByDate(convs: Conversation[]): Conversation[] {
  return [...convs].sort((a, b) => conversationUpdatedAt(b) - conversationUpdatedAt(a));
}
