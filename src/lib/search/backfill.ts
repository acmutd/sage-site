/**
 * One-time corpus backfill, per user.
 *
 * The spec called for paginating against VITE_CRUD_API, but `getConversations`
 * takes no page or cursor parameter and already returns the full corpus with
 * message bodies. So this fetches once and streams conversations into IndexedDB
 * in small chunks, yielding between them to keep the main thread responsive.
 *
 * Resumability is per conversation rather than per page: a conversation already
 * in `convoMeta` with a matching updatedAt and messageCount is skipped, so an
 * interrupted run picks up roughly where it stopped rather than restarting.
 */

import type { User } from "firebase/auth";
import type { Conversation } from "@/types/chat";
import { conversationUpdatedAt } from "@/utils/conversation";
import { getAllConvoMeta, getAppState, isSearchReady, setAppState } from "./db";
import { pruneCorpusTo, syncConversationToCorpus } from "./corpus";
import { BACKFILL_STATE_KEY, type BackfillState } from "./schema";

const CRUD_API = import.meta.env.VITE_CRUD_API as string | undefined;
const CHUNK_SIZE = 5;

let running = false;

function idle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => resolve(), { timeout: 2000 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

export async function isBackfillComplete(userId: string): Promise<boolean> {
  if (!isSearchReady()) return true;
  try {
    const state = await getAppState<BackfillState>(BACKFILL_STATE_KEY);
    return state?.userId === userId;
  } catch {
    return false;
  }
}

export async function markBackfillComplete(userId: string): Promise<void> {
  if (!isSearchReady()) return;
  try {
    await setAppState(BACKFILL_STATE_KEY, { userId, completedAt: Date.now() } satisfies BackfillState);
  } catch (err) {
    console.warn("[search] could not record backfill completion", err);
  }
}

async function fetchAllConversations(user: User): Promise<Conversation[]> {
  if (!CRUD_API) throw new Error("CRUD_API environment variable is missing.");
  const token = await user.getIdToken();
  const response = await fetch(CRUD_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.uid, action: "getConversations", token }),
  });
  if (!response.ok) {
    throw new Error(`Backfill fetch failed: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? (data as Conversation[]) : [];
}

/**
 * Runs the backfill if it has not completed for this user. Safe to call on every
 * mount — it no-ops once complete, and never throws into the caller.
 */
export async function runBackfill(user: User): Promise<void> {
  if (!isSearchReady() || !user?.uid || running) return;
  if (await isBackfillComplete(user.uid)) return;

  running = true;
  try {
    await idle();

    const conversations = await fetchAllConversations(user);

    // fetchAllConversations returns the full list, so anything in the corpus but
    // not in it was deleted elsewhere. Safe here: a non-array response throws
    // above rather than reaching this point as an empty list.
    await pruneCorpusTo(conversations.map((conv) => conv.conversation_id));

    const existing = new Map(
      (await getAllConvoMeta()).map((meta) => [meta.convoId, meta] as const)
    );

    for (let i = 0; i < conversations.length; i += CHUNK_SIZE) {
      const chunk = conversations.slice(i, i + CHUNK_SIZE);
      for (const conv of chunk) {
        const meta = existing.get(conv.conversation_id);
        const alreadyCurrent =
          meta &&
          meta.updatedAt === conversationUpdatedAt(conv) &&
          meta.messageCount === (conv.messages?.length ?? 0);
        if (alreadyCurrent) continue;
        await syncConversationToCorpus(conv);
      }
      // Yield between chunks so a long history never holds the thread.
      await idle();
    }

    await markBackfillComplete(user.uid);
  } catch (err) {
    // Leaving the flag unset means the next session retries.
    console.warn("[search] backfill did not complete", err);
  } finally {
    running = false;
  }
}

/** Schedules the backfill after first paint rather than during initialLoad. */
export function scheduleBackfill(user: User): void {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => void runBackfill(user), { timeout: 5000 });
  } else {
    setTimeout(() => void runBackfill(user), 1500);
  }
}
