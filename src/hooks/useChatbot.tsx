import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Conversation } from "@/types/chat"

const CONVERSATIONS_CACHE_EXPIRATION_TIME = 1000 * 60 * 60;

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
                const processedConversations = cached.map((conv: Conversation) => ({
                  ...conv,
                  title: conv.title || conv.conversation_name || conv.messages?.[0]?.content || "Untitled Conversation",
                }));
                const sorted = sortConversationsByDate(processedConversations);
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
    
    const fetchConversation = async () => {
        if (!user?.uid) {
        console.warn("User ID is missing. Cannot fetch conversations.");
        return;
        }

        setLoading(true);
        setError(null);

        try {
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
            const processedConversations = cached.map((conv: Conversation) => ({
                ...conv,
                title: conv.title || conv.conversation_name || conv.messages?.[0]?.content || "Untitled Conversation",
            }));
            const sorted = sortConversationsByDate(processedConversations);
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

        const convs: Conversation[] = Array.isArray(data)
            ? data.map((conv: Conversation) => ({
                ...conv,
                title: conv.title || conv.conversation_name || conv.messages?.[0]?.content || "Untitled Conversation",
            }))
            : [];

            const sorted = sortConversationsByDate(convs);
            setConversations(sorted);
            saveConversationsToCache(sorted);
            return sorted;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch conversations";
            setError(errorMessage);
            console.error("Error fetching conversation:", err);
        } finally {
            setLoading(false);
        }
    };


    const saveConversationsToCache = (convs: any[]) => {
        localStorage.setItem(
        "chatbot_conversations",
        JSON.stringify({
            data: convs,
            timestamp: Date.now(),
            userId: user?.uid,
        })
        );
    };

    const sortConversationsByDate = (convs: Conversation[]) => {
        return convs.sort((a: Conversation, b: Conversation) => {
          const aTime = new Date(a.messages?.[a.messages.length - 1]?.timestamp || 0).getTime();
          const bTime = new Date(b.messages?.[b.messages.length - 1]?.timestamp || 0).getTime();
          return bTime - aTime;
        });
    };

    const deleteConversation = async (conversationId: string) => {
        if (!user?.uid) {
          console.warn("User ID is missing. Cannot delete conversation.");
          return;
        }
        setError(null);
    
        try {
          // Optimistically update cache
          const cachedConversationsString = localStorage.getItem("chatbot_conversations");
          if (cachedConversationsString) {
            const cached = JSON.parse(cachedConversationsString);
            if (cached?.data) {
              const updatedCache = {
                ...cached,
                data: cached.data.filter((item: Conversation) => item.conversation_id !== conversationId),
              };
              localStorage.setItem("chatbot_conversations", JSON.stringify(updatedCache));
            }
          }
    
          if (!CRUD_API) throw new Error("CRUD_API environment variable is missing.");
    
          const token = await user.getIdToken();
          if (!token) throw new Error("Failed to retrieve authentication token.");
    
          const response = await fetch(CRUD_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.uid,
              action: "deleteConversation",
              token,
              conversationId,
            }),
          });
    
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to delete conversation: ${response.status} - ${errorText}`);
          }
    
          // Remove in state
          setConversations((prev) => prev.filter((item) => item.conversation_id !== conversationId));
    
          // Update localStorage cache too
          const updatedCacheString = localStorage.getItem("chatbot_conversations");
          if (updatedCacheString) {
            const updatedCache = JSON.parse(updatedCacheString);
            if (updatedCache?.data) {
              const filtered = updatedCache.data.filter(
                (item: Conversation) => item.conversation_id !== conversationId
              );
              saveConversationsToCache(filtered);
            }
          }
    
          if (conversation_id === conversationId) {
            setConversationId(null);
            localStorage.removeItem("chatbot_conversation");
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to delete conversation";
          setError(msg);
          console.error("Error deleting conversation:", err);
        }
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
        const cachedConversationsString = localStorage.getItem("chatbot_conversations");
        if (cachedConversationsString) {
            const cached = JSON.parse(cachedConversationsString);
            if (cached?.data) {
            const updatedCache = {
                ...cached,
                data: cached.data.map((item: Conversation) =>
                item.conversation_id === conversationId ? { ...item, title: newTitle, conversation_name: newTitle } : item
                ),
            };
            localStorage.setItem("chatbot_conversations", JSON.stringify(updatedCache));
            }
        }

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
              setConversations((prev) => prev.filter((item) => item.conversation_id !== conversation_id));
              saveConversationsToCache(conversations.filter((item) => item.conversation_id !== conversation_id));
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