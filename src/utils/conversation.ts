/**
 * Shared accessors for conversation ordering and labelling.
 *
 * Conversations outside the bounded localStorage window carry no message
 * bodies, so anything that used to read `messages[...]` directly has to go
 * through here or those conversations sort to the bottom and render untitled.
 */

import type { Conversation } from "@/types/chat";

/**
 * Last-activity timestamp: the later of the stamped field and the newest
 * message.
 *
 * Pruned entries carry only the field, and conversations fresh from the server
 * carry only messages. Preferring the field outright meant that appending to an
 * already-stamped conversation left it ordered by the older value, so it failed
 * to rise to the top of the sidebar.
 */
export function conversationUpdatedAt(conv: Conversation): number {
  const stamped = typeof conv.updatedAt === "number" && conv.updatedAt > 0 ? conv.updatedAt : 0;
  const last = conv.messages?.[conv.messages.length - 1]?.timestamp;
  const newestMessage = last ? new Date(last).getTime() : 0;
  return Math.max(stamped, newestMessage);
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
