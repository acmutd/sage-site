import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Conversation } from "@/types/chat"
import {
    conversationDisplayName,
    conversationUpdatedAt,
    sortConversationsByDate,
} from "@/utils/conversation";
import {
    saveConversationsToCache as saveBoundedCache,
    updateCachedConversations,
} from "@/lib/search/localCache";
import {
    pruneCorpusTo,
    queueConversationRemoval,
    queueConversationRename,
    syncConversations,
} from "@/lib/search/corpus";
import { markBackfillComplete } from "@/lib/search/backfill";
import { setSearchUser } from "@/lib/search/client";

const CONVERSATIONS_CACHE_EXPIRATION_TIME = 1000 * 60 * 60;

/** Fills in the display title and last-activity time that pruned entries rely on. */
const normalize = (convs: Conversation[]): Conversation[] =>
    convs.map((conv) => ({
        ...conv,
        title: conversationDisplayName(conv),
        updatedAt: conversationUpdatedAt(conv),
    }));

/**
 * useChatbot is instantiated by ChatBot, ChatBotNavbar and the mobile drawer,
 * and on a cold cache each one fetches. Ingest the list once, not three times.
 */
let ingesting = false;
function ingestFullList(convs: Conversation[], uid: string): void {
    if (ingesting) return;
    ingesting = true;
    void (async () => {
        // The response is the whole list, so anything in the corpus but missing
        // from it was deleted elsewhere.
        await pruneCorpusTo(convs.map((c) => c.conversation_id));
        // Only flag the backfill done once every conversation has landed.
        if (await syncConversations(convs)) await markBackfillComplete(uid);
    })().finally(() => { ingesting = false; });
}

export const useChatbot = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [conversation_id, setConversationId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    const CRUD_API = import.meta.env.VITE_CRUD_API;
  
    const isCacheValid = (timestamp: number, cacheUserId: any, cacheValidFor: number): boolean => {
        if (!user?.uid || !timestamp || !cacheUserId) return false;
        const currentTime = Date.now();
        return currentTime - timestamp < cacheValidFor && user.uid === cacheUserId;
    };


    const initialLoad = async () => {
        if (!user?.uid) return;
    
        const cachedData = localStorage.getItem("chatbot_conversation");
        if (cachedData) {
          const { conversation_id, timestamp, cacheUserId } = JSON.parse(cachedData);
    
          if (timestamp && cacheUserId && isCacheValid(timestamp, cacheUserId, CONVERSATIONS_CACHE_EXPIRATION_TIME)) {
            setConversationId(conversation_id || null);
    
            const cachedConversationsString = localStorage.getItem("chatbot_conversations");
            if (cachedConversationsString) {
              const cachedConversations = JSON.parse(cachedConversationsString);
              if (
                cachedConversations.timestamp &&
                cachedConversations.userId &&
                isCacheValid(
                  cachedConversations.timestamp,
                  cachedConversations.userId,
                  CONVERSATIONS_CACHE_EXPIRATION_TIME
                )
              ) {
                const cached = Array.isArray(cachedConversations.data) ? cachedConversations.data : [];
                const sorted = sortConversationsByDate(normalize(cached));
                setConversations(sorted);
                return;
              }
            }
          } else {
            localStorage.removeItem("chatbot_conversation");
          }
        }
    
        // No valid cache — fetch list (won't auto-load a thread; new chat screen by default)
        await fetchConversation();
    };
    
    /**
     * `forceRefresh` skips the localStorage short-circuit. It is needed when a
     * conversation was pruned out of the bounded cache and neither the cache nor
     * the search corpus can supply its message bodies.
     */
    const fetchConversation = async (forceRefresh = false) => {
        if (!user?.uid) {
        console.warn("User ID is missing. Cannot fetch conversations.");
        return;
        }

        // Bind the corpus to this user before anything can ingest into it.
        setSearchUser(user.uid);

        setLoading(true);
        setError(null);

        try {
        const cachedConversationsString = forceRefresh ? null : localStorage.getItem("chatbot_conversations");

        if (cachedConversationsString) {
            const cachedConversations = JSON.parse(cachedConversationsString);
            if (
            cachedConversations.timestamp &&
            cachedConversations.userId &&
            isCacheValid(
                cachedConversations.timestamp,
                cachedConversations.userId,
                CONVERSATIONS_CACHE_EXPIRATION_TIME
            )
            ) {
            const cached = Array.isArray(cachedConversations.data) ? cachedConversations.data : [];
            const sorted = sortConversationsByDate(normalize(cached));
            setConversations(sorted);
            setLoading(false);
            return cached;
            }
        }

        if (!CRUD_API) throw new Error("CRUD_API environment variable is missing.");

        const token = await user.getIdToken();
        if (!token) throw new Error("Failed to retrieve authentication token.");

        const response = await fetch(CRUD_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            userId: user?.uid,
            action: "getConversations",
            token,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch conversations: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        const convs: Conversation[] = Array.isArray(data) ? normalize(data) : [];

            const sorted = sortConversationsByDate(convs);
            setConversations(sorted);
            saveConversationsToCache(sorted);

            // Only ingest a real array. A non-array response normalizes to an empty
            // list, and pruning the corpus to that would wipe it.
            if (Array.isArray(data)) ingestFullList(sorted, user.uid);

            return sorted;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch conversations";
            setError(errorMessage);
            console.error("Error fetching conversation:", err);
        } finally {
            setLoading(false);
        }
    };


    // localStorage keeps full bodies for only the most recent conversations; the
    // rest are stored as metadata and rehydrated from the search corpus on open.
    const saveConversationsToCache = (convs: Conversation[]) => {
        if (user?.uid) saveBoundedCache(convs, user.uid);
    };

    const deleteConversation = async (conversationId: string) => {
        if (!user?.uid) return;
        setError(null);
      
        // Optimistic cache update
        setConversations((prev) => prev.filter((item) => item.conversation_id !== conversationId));
        updateCachedConversations((convs) => convs.filter((item) => item.conversation_id !== conversationId));
        queueConversationRemoval(conversationId);
      
        if (!CRUD_API) throw new Error("CRUD_API environment variable is missing.");
        const token = await user.getIdToken();
        if (!token) throw new Error("Failed to retrieve authentication token.");
      
        const response = await fetch(CRUD_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid, action: "deleteConversation", token, conversationId }),
        });
      
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to delete conversation: ${response.status} - ${errorText}`);
        }
      
        // Remove from state
        setConversations((prev) => prev.filter((item) => item.conversation_id !== conversationId));
    };

    const renameConversation = async (conversationId: string, newTitle: string) => {
        if (!user?.uid) {
        console.warn("User ID is missing. Cannot rename conversation.");
        return;
        }
        setError(null);

        try {
        // Optimistic state update - same as desktop
        setConversations((prev) => {
            const updated = prev.map((conv) => 
            conv.conversation_id === conversationId 
                ? { ...conv, title: newTitle, conversation_name: newTitle } 
                : conv
            );
            return updated;
        });

        // Update local storage - same as desktop
        updateCachedConversations((convs) =>
            convs.map((item) =>
                item.conversation_id === conversationId
                    ? { ...item, title: newTitle, conversation_name: newTitle }
                    : item
            )
        );
        queueConversationRename(conversationId, newTitle);

        if (!CRUD_API) throw new Error("CRUD_API environment variable is missing.");
        const token = await user.getIdToken();
        if (!token) throw new Error("Failed to retrieve authentication token.");

        const response = await fetch(CRUD_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            userId: user.uid,
            action: "renameConversation",
            token,
            conversationId,
            newName: newTitle,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();

            if (response.status === 404) { // attempted rename of a deleted convo in backend
              // This used to filter by `conversation_id` (the open chat) instead of
              // the conversation being renamed, removing the wrong one.
              setConversations((prev) => prev.filter((item) => item.conversation_id !== conversationId));
              updateCachedConversations((convs) => convs.filter((item) => item.conversation_id !== conversationId));
              queueConversationRemoval(conversationId);
            }

            throw new Error(`Failed to rename conversation: ${response.status} - ${errorText}`);
        }
        
        } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to rename conversation";
        setError(msg);
        console.error("Mobile navbar: Error renaming conversation:", err);
        }
    };

    return {
        conversations,
        conversation_id,
        setConversations,
        loading,
        error,
        fetchConversation,
        deleteConversation,
        renameConversation,
        setConversationId,
        initialLoad
    };
};