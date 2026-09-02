import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { User } from 'firebase/auth';
import type { Conversation, Message } from '@/types/chat';

const CACHE_TTL = 1000 * 60 * 60;
const CRUD_API = import.meta.env.VITE_CRUD_API as string | undefined;

function isCacheValid(timestamp: number, cacheUserId: string, currentUserId: string, ttl: number): boolean {
  if (!currentUserId || !timestamp || !cacheUserId) return false;
  return Date.now() - timestamp < ttl && currentUserId === cacheUserId;
}

function sortByDate(convs: Conversation[]): Conversation[] {
  return [...convs].sort((a, b) => {
    const aTime = new Date(a.messages?.[a.messages.length - 1]?.timestamp || 0).getTime();
    const bTime = new Date(b.messages?.[b.messages.length - 1]?.timestamp || 0).getTime();
    return bTime - aTime;
  });
}

function normalizeConversations(convs: Conversation[]): Conversation[] {
  return convs.map(conv => ({
    ...conv,
    title: conv.title || conv.conversation_name || conv.messages?.[0]?.content || 'Untitled Conversation',
  }));
}

function saveListToCache(convs: Conversation[], userId: string): void {
  localStorage.setItem('chatbot_conversations', JSON.stringify({ data: convs, timestamp: Date.now(), userId }));
}

interface ChatbotState {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeMessages: Message[];
  currentUserId: string | null;
  loading: boolean;
  error: string | null;
  initialLoad: (user: User) => Promise<void>;
  fetchConversations: (user: User) => Promise<Conversation[] | undefined>;
  setActiveConversationId: (id: string | null) => void;
  startNewChat: () => void;
  setActiveMessages: (messages: Message[]) => void;
  setConversations: (convs: Conversation[], userId?: string) => void;
  deleteConversation: (id: string, user: User) => Promise<void>;
  renameConversation: (id: string, newTitle: string, user: User) => Promise<void>;
}

export const useChatbotStore = create<ChatbotState>()(
  immer((set, get) => ({
    conversations: [],
    activeConversationId: null,
    activeMessages: [],
    currentUserId: null,
    loading: false,
    error: null,

    initialLoad: async (user: User) => {
      if (!user?.uid || get().loading) return;
      set(state => { state.currentUserId = user.uid; });

      const cachedSession = localStorage.getItem('chatbot_conversation');
      if (cachedSession) {
        const { conversation_id, timestamp, cacheUserId } = JSON.parse(cachedSession);
        if (isCacheValid(timestamp, cacheUserId, user.uid, CACHE_TTL)) {
          set(state => { state.activeConversationId = conversation_id || null; });

          const cachedList = localStorage.getItem('chatbot_conversations');
          if (cachedList) {
            const parsed = JSON.parse(cachedList);
            if (isCacheValid(parsed.timestamp, parsed.userId, user.uid, CACHE_TTL)) {
              const convs = Array.isArray(parsed.data) ? parsed.data : [];
              set(state => { state.conversations = sortByDate(normalizeConversations(convs)); });
              return;
            }
          }
        } else {
          localStorage.removeItem('chatbot_conversation');
        }
      }

      await get().fetchConversations(user);
    },

    fetchConversations: async (user: User) => {
      if (!user?.uid) return;
      set(state => { state.loading = true; state.error = null; });

      try {
        const cachedList = localStorage.getItem('chatbot_conversations');
        if (cachedList) {
          const parsed = JSON.parse(cachedList);
          if (isCacheValid(parsed.timestamp, parsed.userId, user.uid, CACHE_TTL)) {
            const convs = Array.isArray(parsed.data) ? parsed.data : [];
            const sorted = sortByDate(normalizeConversations(convs));
            set(state => { state.conversations = sorted; });
            return sorted;
          }
        }

        if (!CRUD_API) throw new Error('CRUD_API environment variable is missing.');
        const token = await user.getIdToken();

        const response = await fetch(CRUD_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, action: 'getConversations', token }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch conversations: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const convs = Array.isArray(data) ? normalizeConversations(data) : [];
        const sorted = sortByDate(convs);
        set(state => { state.conversations = sorted; });
        saveListToCache(sorted, user.uid);
        return sorted;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch conversations';
        set(state => { state.error = msg; });
        console.error('Error fetching conversations:', err);
      } finally {
        set(state => { state.loading = false; });
      }
    },

    setActiveConversationId: (id: string | null) => {
      set(state => { state.activeConversationId = id; });
    },

    startNewChat: () => {
      const { activeMessages, activeConversationId, conversations, currentUserId } = get();
      set(state => {
        if (activeMessages.length > 0 && activeConversationId) {
          const existing = conversations.find(c => c.conversation_id === activeConversationId);
          const updated = sortByDate(normalizeConversations([
            {
              conversation_id: activeConversationId,
              user_id: existing?.user_id || currentUserId || '',
              messages: activeMessages,
              title: existing?.title || activeMessages[0]?.content || 'Untitled Conversation',
            },
            ...conversations.filter(c => c.conversation_id !== activeConversationId),
          ]));
          state.conversations = updated;
          if (currentUserId) saveListToCache(updated, currentUserId);
        }
        state.activeConversationId = null;
        state.activeMessages = [];
      });
    },

    setActiveMessages: (messages: Message[]) => {
      set(state => { state.activeMessages = messages; });
    },

    setConversations: (convs: Conversation[], userId?: string) => {
      set(state => { state.conversations = convs; });
      if (userId) saveListToCache(convs, userId);
    },

    deleteConversation: async (id: string, user: User) => {
      if (!user?.uid) return;

      set(state => { state.conversations = state.conversations.filter(c => c.conversation_id !== id); });

      const cachedList = localStorage.getItem('chatbot_conversations');
      if (cachedList) {
        const parsed = JSON.parse(cachedList);
        if (parsed?.data) {
          localStorage.setItem('chatbot_conversations', JSON.stringify({
            ...parsed,
            data: parsed.data.filter((c: Conversation) => c.conversation_id !== id),
          }));
        }
      }

      if (!CRUD_API) throw new Error('CRUD_API environment variable is missing.');
      const token = await user.getIdToken();
      const response = await fetch(CRUD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, action: 'deleteConversation', token, conversationId: id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete conversation: ${response.status} - ${errorText}`);
      }
    },

    renameConversation: async (id: string, newTitle: string, user: User) => {
      if (!user?.uid) return;

      set(state => {
        const conv = state.conversations.find(c => c.conversation_id === id);
        if (conv) { conv.title = newTitle; conv.conversation_name = newTitle; }
      });

      const cachedList = localStorage.getItem('chatbot_conversations');
      if (cachedList) {
        const parsed = JSON.parse(cachedList);
        if (parsed?.data) {
          localStorage.setItem('chatbot_conversations', JSON.stringify({
            ...parsed,
            data: parsed.data.map((c: Conversation) =>
              c.conversation_id === id ? { ...c, title: newTitle, conversation_name: newTitle } : c
            ),
          }));
        }
      }

      if (!CRUD_API) throw new Error('CRUD_API environment variable is missing.');
      const token = await user.getIdToken();
      const response = await fetch(CRUD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, action: 'renameConversation', token, conversationId: id, newName: newTitle }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404) {
          set(state => { state.conversations = state.conversations.filter(c => c.conversation_id !== id); });
        }
        throw new Error(`Failed to rename conversation: ${response.status} - ${errorText}`);
      }
    },
  }))
);
