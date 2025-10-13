import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeftToLineIcon,
  ArrowRightToLineIcon,
  CornerRightUpIcon,
  MessageCirclePlusIcon,
  GraduationCapIcon,
  CalendarSearchIcon,
  SquareAsterisk,
  PanelLeftDashed,
  Trash2,
  Pencil,
  Ellipsis,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import MessageDisplay from "@/components/chatbot/MessageDisplay";
import { chatEventEmitter } from "../utils/chatEventEmitter";

// ---- Added: Strong types ----
type Role = "user" | "bot";

interface Message {
  role: Role;
  content: string;
  timestamp: number;
}

interface Conversation {
  conversation_id: string;
  user_id: string;
  messages: Message[];
  title?: string;
  conversation_name?: string;
}

// These are in milliseconds
const CONVERSATIONS_CACHE_EXPIRATION_TIME = 1000 * 60 * 60;
const CONVERSATION_CACHE_EXPIRATION_TIME = 1000 * 60 * 60;

const ChatBot: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const handleClickQueryFlag = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation_id, setconversation_id] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  // Wrapper function to update conversations and notify mobile navbar
  const updateConversations = (newConversations: Conversation[] | ((prev: Conversation[]) => Conversation[])) => {
    if (typeof newConversations === 'function') {
      setConversations((prevConversations) => {
        const updatedList = newConversations(prevConversations);
        console.log('ChatBot emitting conversation update:', updatedList.length, 'conversations');
        chatEventEmitter.emit('conversationUpdate', updatedList);
        return updatedList;
      });
    } else {
      setConversations(newConversations);
      console.log('ChatBot emitting conversation update:', newConversations.length, 'conversations');
      chatEventEmitter.emit('conversationUpdate', newConversations);
    }
  };

  // Wrapper function to update conversation ID and notify mobile navbar
  const updateConversationId = (newId: string | null) => {
    setconversation_id(newId);
    // Emit event to update mobile navbar's active conversation
    chatEventEmitter.emit('activeConversationUpdate', newId);
  };

  const [chatHistoryLoad, setChatHistoryLoad] = useState(false);
  const [chatLoad, setChatLoad] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarCollapsedDelayed, setSidebarCollapsedDelayed] = useState(false);
  const [isNewConversation, setIsNewConversation] = useState<boolean>(false);
  const [generateSchedule, setGenerateSchedule] = useState(false);

  // Context menu helpers
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 });
  const contextButtonRefs = useRef<(HTMLLIElement | null)[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [moreOptionsOpenId, setMoreOptionsOpenId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<string | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const conversationListRef = useRef<HTMLUListElement | null>(null);

  const CHAT_API = import.meta.env.VITE_CHAT_API as string | undefined;
  const CRUD_API = import.meta.env.VITE_CRUD_API as string | undefined;

  const [mobileView, setMobileView] = useState(false);

  const advisingExampleQuestions = [
    { question: "What courses are supported by the CSMC?" },
    { question: "What are the requirements for graduation?" },
    { question: "How can I enroll in classes I don't have prereqs for if I plan to take the prereqs over the summer?" },
    { question: "Tell me about ACM UTD and how I can get involved!" },
    { question: "What classes should a first-year accounting major take?" },
    { question: "What do you know about Professor John Cole?" },
    { question: "What are the GPA cutoffs for the benchmark classes of a prospective CS fast track student?" },
  ];

  const scheduleExampleQuestions = [
    { question: "Generate a schedule with CS 2305, ECS 2390, CS 2336, CS 2340, and PHYS 2325." },
    { question: "I work after 4pm on Tuesday and Thursday. Can you avoid classes during that time?" },
    { question: "My friend is in CS 2336.003, can we make sure to include that class?" },
    { question: "Swap CS 2336 for CS 3341, and no classes before 10am." },
    { question: "I want Professor John Cole for CS 3162. Can we only use his sections?" },
    { question: "I need to enroll for summer classes, please generate a schedule using summer sections." },
    { question: "Can you rank the CS2340 classes by professor rating and compare their data?" },
  ];

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const toggleSidebar = () => {
    let sidebarDelay = 0;
    setSidebarCollapsed((prev) => !prev);
    if (sidebarCollapsed) {
      sidebarDelay = 80;
    }
    setTimeout(() => {
      setSidebarCollapsedDelayed((prev) => !prev);
    }, sidebarDelay);
  };

  // Check if the cached data is still valid
  const isCacheValid = (
    timestamp: number | null | undefined,
    cacheUserId: string | null | undefined,
    cacheValidFor: number
  ): boolean => {
    if (!user?.uid || !timestamp || !cacheUserId) return false;
    const currentTime = Date.now();
    return currentTime - timestamp < cacheValidFor && user.uid === cacheUserId;
  };

  const handleOutsideClick = () => {
    setMoreOptionsOpenId(null);
    setShowContextMenu(false);
  };

  // Save conversation data with timestamp to localStorage
  const saveConversationsToCache = (convs: Conversation[]) => {
    localStorage.setItem(
      "chatbot_conversations",
      JSON.stringify({
        data: convs,
        timestamp: Date.now(),
        userId: user?.uid ?? null,
      })
    );
  };

  // Fetch conversation data from Lambda (instead of directly from S3)
  const fetchConversation = async (): Promise<Conversation[] | undefined> => {
    if (!user?.uid) {
      console.warn("User ID is missing. Cannot fetch conversations.");
      return;
    }

    setChatHistoryLoad(true);
    setError(null);

    try {
      // Check cache
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
          console.log("Using cached conversations data");
          updateConversations(sortConversationsByDate([...cached]));
          setChatHistoryLoad(false);
          return cached;
        }
      }

      if (!CRUD_API) throw new Error("CRUD_API environment variable is missing.");
      const token = await user.getIdToken();
      if (!token) throw new Error("Failed to retrieve authentication token.");

      console.log("Fetching fresh conversations data");
      const response = await fetch(CRUD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
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
      updateConversations(sorted);
      saveConversationsToCache(sorted);
      return sorted;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch conversations";
      setError(msg);
      console.error("Error fetching conversation:", err);
    } finally {
      setChatHistoryLoad(false);
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    if (!user?.uid) {
      console.warn("User ID is missing. Cannot fetch conversations.");
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
      updateConversations((prev) => prev.filter((item) => item.conversation_id !== conversationId));

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
        updateConversationId(null);
        setMessages([]);
        localStorage.removeItem("chatbot_conversation");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete conversation";
      setError(msg);
      console.error("Error deleting conversation:", err);
    }
  };

  // rename conversation
  const renameConversation = async (conversationId: string, newTitle: string) => {
    if (!user?.uid) {
      console.warn("User ID is missing. Cannot rename conversation.");
      return;
    }
    setError(null);

    try {
      console.log('Starting rename for conversation:', conversationId, 'to:', newTitle);

      // Optimistic state update
      updateConversations((prev) => {
        const updated = prev.map((conv) => 
          conv.conversation_id === conversationId 
            ? { ...conv, title: newTitle } 
            : conv
        );
        console.log('Updated conversations:', updated.length);
        return updated;
      });

      // Update local storage
      const cachedConversationsString = localStorage.getItem("chatbot_conversations");
      if (cachedConversationsString) {
        const cached = JSON.parse(cachedConversationsString);
        if (cached?.data) {
          const updatedCache = {
            ...cached,
            data: cached.data.map((item: Conversation) =>
              item.conversation_id === conversationId ? { ...item, title: newTitle } : item
            ),
          };
          localStorage.setItem("chatbot_conversations", JSON.stringify(updatedCache));
          console.log('Updated localStorage cache');
        }
      }

      if (!CRUD_API) throw new Error("CRUD_API environment variable is missing.");
      const token = await user.getIdToken();
      if (!token) throw new Error("Failed to retrieve authentication token.");

      console.log('Making API call to rename conversation');
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
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to rename conversation: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Rename successful:', result);
      
      // Emit event to notify mobile navbar
      chatEventEmitter.emit('conversationRenamed', {
        conversationId: conversationId,
        newTitle: newTitle
      });
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to rename conversation";
      setError(msg);
      console.error("Error renaming conversation:", err);
    }
  };

  const startNewChat = () => {
    if (messages.length > 0 && conversation_id) {
      updateConversations((prevConversations) => {
        if (!Array.isArray(prevConversations)) return [];
        const filteredConversations = prevConversations.filter((conv) => conv.conversation_id !== conversation_id);
        return [
          {
            conversation_id,
            user_id: user?.uid || "test-user-123",
            messages,
          },
          ...filteredConversations,
        ];
      });
    }

    // Generate a new conversation ID
    const newConversationId = `conversation_${uuidv4()}`;

    loadConversation(newConversationId, []);
    setIsNewConversation(true);

    // ---- Fixed: use `timestamp` not `timeStamp`
    localStorage.setItem(
      "chatbot_conversation",
      JSON.stringify({
        messages: [],
        conversation_id: newConversationId,
        timestamp: Date.now(),
        cacheUserId: user?.uid ?? null,
      })
    );

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  // Sort the list of conversations by date instead of by the default conversation_id
  const sortConversationsByDate = (convs: Conversation[]): Conversation[] => {
    return [...convs].sort((a, b) => {
      const aTime = new Date(a.messages?.[a.messages.length - 1]?.timestamp || 0).getTime();
      const bTime = new Date(b.messages?.[b.messages.length - 1]?.timestamp || 0).getTime();
      return bTime - aTime; // Most recent first
    });
  };

  const loadConversation = async (id: string, convMessages: Message[]) => {
    updateConversationId(id);
    setMessages(convMessages);
    localStorage.setItem(
      "chatbot_conversation",
      JSON.stringify({
        messages: convMessages,
        conversation_id: id,
        timestamp: Date.now(),
        cacheUserId: user?.uid ?? null,
      })
    );
  };

  const initialLoad = async () => {
    if (!user?.uid) return;

    const cachedData = localStorage.getItem("chatbot_conversation");
    console.log("user id: ", user.uid);

    if (cachedData) {
      const { messages: cachedMsgs, conversation_id: cachedId, timestamp, cacheUserId } = JSON.parse(cachedData);

      if (timestamp && cacheUserId && isCacheValid(timestamp, cacheUserId, CONVERSATION_CACHE_EXPIRATION_TIME)) {
        console.log("Using cached current conversation");
        setMessages(cachedMsgs || []);
        updateConversationId(cachedId || null);

        // Also load the conversations list from cache if available
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
            const list: Conversation[] = Array.isArray(cachedConversations.data)
              ? cachedConversations.data.map((conv: Conversation) => ({
                  ...conv,
                  title: conv.title || conv.conversation_name || conv.messages?.[0]?.content || "Untitled Conversation",
                }))
              : [];

            updateConversations(sortConversationsByDate(list));
            return;
          }
        }
      } else {
        localStorage.removeItem("chatbot_conversation");
      }
    }

    // If no valid cache or cache expired, fetch fresh data
    await fetchConversation();
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  const handleSendQuery = async () => {
    if (!query.trim()) {
      console.warn("Query is empty, aborting request.");
      return;
    }

    if (query.trim().length > 500) {
      setChatError(`Query uses ${query.trim().length}/500 characters. Please shorten your query.`);
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
      return;
    }

    console.log("Sending query:", query);

    setChatLoad(true);
    setChatError(null);

    const userMessage: Message = { role: "user", content: query, timestamp: Date.now() };
    const updatedMessagesWithUser = [...messages, userMessage];
    setMessages(updatedMessagesWithUser);

    localStorage.setItem(
      "chatbot_conversation",
      JSON.stringify({
        messages: updatedMessagesWithUser,
        conversation_id,
        timestamp: Date.now(),
        cacheUserId: user?.uid ?? null,
      })
    );

    if (!CHAT_API) {
      console.error("CHAT_API is missing. Check your .env file.");
      setChatLoad(false);
      return;
    }

    const requestBody: Record<string, unknown> = {
      id: user?.uid,
      query: query,
      generate_schedule: generateSchedule,
    };

    if (conversation_id) requestBody.conversation_id = conversation_id;

    setQuery("");

    try {
      const response = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(errorText);
        } catch {
          // ignore parse error
        }
        if (response.status === 401 && parsed?.error === "Daily query limit reached. Try again tomorrow.") {
          setChatError("Daily query limit reached. Try again tomorrow.");
        } else {
          throw new Error(`Failed to get chatbot response: ${response.status} - ${errorText}`);
        }
        return;
      }

      const data = await response.json();
      if (!data.response) {
        throw new Error("Chatbot API did not return a response.");
      }

      const botMessage: Message = { role: "bot", content: data.response, timestamp: Date.now() };
      const updatedMessagesWithBot = [...updatedMessagesWithUser, botMessage];

      setMessages(updatedMessagesWithBot);

      const currentConvId: string = data.conversation_id || conversation_id || `conversation_${uuidv4()}`;
      updateConversationId(currentConvId);

      // Only prepend the conversation to state/cache if it's new
      updateConversations((prevConversations) => {
        const filtered = prevConversations.filter((conv) => conv.conversation_id !== currentConvId);

        const existingConv = prevConversations.find(
          (conv) => conv.conversation_id === currentConvId
        );

        const newConv = {
          conversation_id: currentConvId!,
          user_id: user?.uid || "test-user-123",
          messages: updatedMessagesWithBot,
          title: existingConv?.title || updatedMessagesWithBot[0]?.content || "Untitled Conversation",
        };

        const updated = sortConversationsByDate([newConv, ...filtered]);
        saveConversationsToCache(updated);
        return updated;
      });

      if (isNewConversation) setIsNewConversation(false);

      // Update local cache
      localStorage.setItem(
        "chatbot_conversation",
        JSON.stringify({
          messages: updatedMessagesWithBot,
          conversation_id: currentConvId,
          timestamp: Date.now(),
          cacheUserId: user?.uid ?? null,
        })
      );
    } catch (err) {
      console.error("Error sending query:", err);
      setChatError("Chatbot has encountered an error. Please try again.");
    } finally {
      setChatLoad(false);
    }
  };


  useEffect(() => {
    if (window.innerWidth < 768) setMobileView(true);

    (async () => {
      await initialLoad();
    })();

    adjustTextareaHeight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for events from mobile navbar
  useEffect(() => {
    const handleStartNewChat = () => {
      startNewChat();
    };

    const handleLoadConversation = (data: { conversationId: string; messages: Message[]; userId?: string }) => {
      loadConversation(data.conversationId, data.messages);
    };

    const handleConversationRenamed = (data: { conversationId: string; newTitle: string }) => {
      updateConversations((prev) =>
        prev.map((conv) => (conv.conversation_id === data.conversationId ? { ...conv, title: data.newTitle } : conv))
      );
    };

    const handleRequestConversations = () => {
      console.log('ChatBot received request for conversations, sending:', conversations.length, 'conversations');
      chatEventEmitter.emit('conversationUpdate', conversations);
    };

    chatEventEmitter.on('startNewChat', handleStartNewChat);
    chatEventEmitter.on('loadConversation', handleLoadConversation);
    chatEventEmitter.on('conversationRenamed', handleConversationRenamed);
    chatEventEmitter.on('requestConversations', handleRequestConversations);

    return () => {
      chatEventEmitter.off('startNewChat', handleStartNewChat);
      chatEventEmitter.off('loadConversation', handleLoadConversation);
      chatEventEmitter.off('conversationRenamed', handleConversationRenamed);
      chatEventEmitter.off('requestConversations', handleRequestConversations);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // ---- Fixed: actually call the function on query change ----
  useEffect(() => {
    adjustTextareaHeight();
  }, [query]);

  useEffect(() => {
    updateScrollPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moreOptionsOpenId]);

  function updateScrollPosition() {
    if (!conversations?.length) return;
    const idx = conversations.findIndex((c) => c.conversation_id === moreOptionsOpenId);
    if (idx < 0) {
      setShowContextMenu(false);
      return;
    }
    const activeContextRef = contextButtonRefs.current[idx];
    if (activeContextRef) {
      const rect = activeContextRef.getBoundingClientRect();
      setContextMenuPosition({ top: rect.top, left: rect.left });
      setShowContextMenu(true);
    } else {
      setShowContextMenu(false);
    }
  }

  useEffect(() => {
    const reloadChatHistory = async () => {
      if (!conversation_id) return;

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
            console.log("Using cached conversations for history");
            const selectedConversation: Conversation | undefined = cachedConversations.data.find(
              (conv: Conversation) => conv.conversation_id === conversation_id
            );

            if (selectedConversation) {
              setMessages(selectedConversation.messages || []);
              localStorage.setItem(
                "chatbot_conversation",
                JSON.stringify({
                  messages: selectedConversation.messages || [],
                  conversation_id,
                  timestamp: Date.now(),
                  cacheUserId: user?.uid ?? null,
                })
              );
              return;
            }
          }
        }

        const data = await fetchConversation();
        if (!Array.isArray(data)) return;

        const selectedConversation = data.find((conv) => conv.conversation_id === conversation_id);
        if (selectedConversation) {
          setMessages(selectedConversation.messages || []);
          localStorage.setItem(
            "chatbot_conversation",
            JSON.stringify({
              messages: selectedConversation.messages || [],
              conversation_id,
              timestamp: Date.now(),
              cacheUserId: user?.uid ?? null,
            })
          );
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      }
    };

    reloadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation_id]);

  useEffect(() => {
    if (handleClickQueryFlag.current === true) {
      handleSendQuery();
      handleClickQueryFlag.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div
      className="flex bg-bglight overflow-hidden py-[4rem] px-6 gap-[2.25rem] mt-[4.2rem] h-[calc(100vh-4.2rem)]"
      onClick={handleOutsideClick}
    >
      {mobileView ? (
        <>
        <div className="flex justify-center h-full w-full">
            <div className="max-w-[80rem] h-full duration-300 ease-in-out flex flex-col flex-1 relative overflow-visible gap-10 bottom-[3rem]">
              <div className="flex flex-col h-full gap-4">
                <div className="flex flex-col flex-grow-[1] min-h-0 w-full bg-innercontainer rounded-lg border border-border">
                  <div
                    ref={chatContainerRef}
                    className="p-8 overflow-y-auto space-y-2 flex flex-col items-center"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {messages.length === 0 && !chatLoad && !generateSchedule ? (
                      <div className="w-full max-w-2xl text-left mt-[5rem]">
                        <h1 className="text-4xl">Hi, I’m Sage.</h1>
                        <h3 className="text-2xl">What can I help with?</h3>
                        <p className="text-textsecondary mt-8">Here are some example questions that I can help you with:</p>
                        <ul className="list-disc list-inside text-textsecondary text-sm space-y-1 pl-4 font-dmsans">
                          {advisingExampleQuestions.map((example) => (
                            <li
                              key={example.question}
                              className="text-textdark hover:text-textsecondary cursor-pointer"
                              onClick={() => {
                                handleClickQueryFlag.current = true;
                                setQuery(example.question);
                              }}
                            >
                              {example.question}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : messages.length === 0 && !chatLoad && generateSchedule ? (
                      <div className="w-full max-w-2xl text-left mt-[5rem]">
                        <h1>Hi, I’m Sage.</h1>
                        <h3>Let's start building your schedule!</h3>
                        <p className="text-textsecondary mt-8">Here are some example queries for the schedule generator that I can help you with:</p>
                        <ul className="list-disc list-inside text-textsecondary text-sm space-y-1 pl-4 font-dmsans">
                          {scheduleExampleQuestions.map((example) => (
                            <li
                              key={example.question}
                              className="text-textdark hover:text-textsecondary cursor-pointer"
                              onClick={() => {
                                handleClickQueryFlag.current = true;
                                setQuery(example.question);
                              }}
                            >
                              {example.question}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      messages.map((msg, index) => <MessageDisplay key={index} message={msg} />)
                    )}

                    {chatLoad && !chatError && (
                      <div className="p-3 rounded-md bg-[#E5E4E4] text-black self-start mr-auto border border-border w-fit max-w-sm">
                        <span className="animate-pulse">Thinking...</span>
                      </div>
                    )}
                    {chatError && <div className="text-red-500 font-semibold">{chatError}</div>}
                  </div>
                </div>

                {/* Query Container */}
                <div className="w-full flex flex-row gap-4 items-center justify-center">
                  {/* Mode Toggle */}
                  {/* <div className="flex flex-row gap-2 p-2 bg-innercontainer border rounded-full border-border">
                    <div className="relative group/advising">
                      <button
                        className={`p-2 rounded-full mr-2 transition-colors duration-200 ${
                          !generateSchedule ? "bg-accent hover:bg-buttonhover" : "bg-secondary hover:bg-[#A9BFB4]"
                        }`}
                        onClick={() => setGenerateSchedule(false)}
                        aria-label="Ask a general advising question"
                      >
                        <GraduationCapIcon size={24} className="stroke-textdark" />
                      </button>
                      <div className="group-hover/advising:flex hidden flex-col items-center absolute bottom-[125%] translate-x-[-50%] left-[42%]">
                        <div className="bg-bgdark text-textlight text-xs rounded-full px-3 py-2 shadow-lg whitespace-nowrap">Ask a general advising question</div>
                        <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-bgdark" />
                      </div>
                    </div>

                    <div className="relative group/schedule">
                      <button
                        className={`p-2 rounded-full transition-colors duration-200 ${
                          generateSchedule ? "bg-accent hover:bg-buttonhover" : "bg-secondary hover:bg-[#A9BFB4]"
                        }`}
                        onClick={() => setGenerateSchedule(true)}
                        aria-label="Generate your class schedule"
                      >
                        <CalendarSearchIcon size={24} className="stroke-textdark" />
                      </button>
                      <div className="group-hover/schedule:flex hidden flex-col items-center absolute bottom-[125%] translate-x-[-50%] left-1/2">
                        <div className=" bg-bgdark text-textlight text-xs rounded-full px-3 py-2 shadow-lg whitespace-nowrap">Generate your class schedule</div>
                        <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-bgdark" />
                      </div>
                    </div>
                  </div> */}

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    placeholder="Ask a question..."
                    aria-label="Chat input field"
                    className="w-full py-4 px-8 mr-2 border rounded-lg resize-none overflow-y-auto focus:outline-none h-fit max-h-28"
                    style={{ scrollbarWidth: "none" }}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleEnter}
                    value={query}
                    disabled={chatHistoryLoad}
                  />

                  <button
                    className="flex h-full max-h-[3rem] justify-center items-center aspect-square bg-accent rounded-full hover:bg-buttonhover transition-colors disabled:opacity-50"
                    onClick={handleSendQuery}
                    disabled={chatHistoryLoad || !query.trim()}
                  >
                    <CornerRightUpIcon size={24} />
                  </button>
                </div>
              </div>

              <small className="absolute w-full flex justify-center bottom-[-4rem] text-textsecondary">
                SAGE does not replace official academic advising and may produce incorrect information.
              </small>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Chat History Bar */}
          <div className={`${sidebarCollapsed ? "w-[5.25rem]" : "w-[24rem]"} h-full flex flex-col gap-4 transition-all duration-100`}>
            <div
              className={`${
                sidebarCollapsed ? "rounded-md px-4 cursor-pointer hover:bg-[#F5F7F5]" : "rounded-lg px-6"
              } transition-all duration-100 group/sidebar pt-8 pb-4 gap-8 overflow-hidden bg-bglight border border-border flex flex-col items-center w-full h-full`}
              onClick={sidebarCollapsed ? toggleSidebar : undefined}
            >
              {/* Collapsed */}
              {sidebarCollapsed && (
                <div className="flex flex-col gap-8 h-full">
                  <button
                    className="transition-all p-2 rounded-sm text-textdark hover:bg-border w-12 h-12 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSidebar();
                    }}
                    aria-label="Expand sidebar"
                  >
                    <ArrowRightToLineIcon size={24} />
                  </button>

                  <button
                    className="transition-all p-2 rounded-sm text-textdark border border-border bg-bglight hover:bg-border w-12 h-12 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      startNewChat();
                    }}
                    aria-label="Start new chat"
                  >
                    <MessageCirclePlusIcon size={24} className="stroke-textdark" />
                  </button>

                  <div className="flex flex-grow" />

                  <div className="w-12 h-12 flex items-center justify-center">
                    <PanelLeftDashed size={24} className="stroke-[#bbbbbb] group-hover/sidebar:stroke-[#dddddd] transition-colors duration-150" />
                  </div>
                </div>
              )}

              {/* Expanded */}
              {!sidebarCollapsed && (
                <div className={`${sidebarCollapsedDelayed ? "opacity-0" : "opacity-100"} flex flex-col w-full overflow-hidden gap-8 transition-all duration-150`}>
                  <div className="flex gap-3 justify-between items-center">
                    <button className="flex transition-all duration-100 items-center space-x-2 py-2 px-6 rounded-3xl bg-accent text-textdark hover:text-gray-700" onClick={startNewChat}>
                      <MessageCirclePlusIcon size={24} />
                      <span>Start new chat</span>
                    </button>
                    <button className="group p-2 text-black hover:text-gray-700 min-w-10 min-h-10 flex items-center justify-center" onClick={toggleSidebar} aria-label="Collapse sidebar">
                      <ArrowLeftToLineIcon className="stroke-textdark group-hover:stroke-textsecondary transition-colors duration-150" size={20} />
                    </button>
                  </div>

                  {chatHistoryLoad && <p className="text-textsecondary">Loading conversations...</p>}
                  {error && <p className="text-destructive">{error}</p>}

                  <ul className="flex flex-col gap-2 overflow-y-scroll w-full" ref={conversationListRef} style={{ scrollbarWidth: "none" }} onScroll={updateScrollPosition}>
                    {Array.isArray(conversations) && conversations.length > 0 ? (
                      conversations.map((conv, index) => {
                        const displayName = conv.title || conv.messages?.[0]?.content || "No messages";
                        return (
                          <li
                            key={conv.conversation_id}
                            className={`group/conversation flex flex-row gap-2 justify-between items-center w-full p-2 cursor-pointer rounded-sm hover:bg-secondary text-textdark transition-colors overflow-visible ${
                              conversation_id === conv.conversation_id ? "bg-secondary" : "bg-bglight"
                            }`}
                            onClick={() => loadConversation(conv.conversation_id, conv.messages)}
                            ref={(el) => (contextButtonRefs.current[index] = el)}
                          >
                            <div className="relative flex flex-[1] group-hover/conversation:max-w-[85%] max-w-full">
                              <div className="opacity-0 group-hover/conversation:opacity-100 absolute left-[calc(100%-2rem)] w-[2rem] h-full bg-gradient-to-r from-secondary/0 to-secondary transition-all duration-150" />
                              <small className="truncate">{displayName}</small>
                            </div>

                            <div className="relative flex h-full">
                              <button
                                className="group/menu px-2 h-full group-hover/conversation:opacity-100 opacity-0 "
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMoreOptionsOpenId((prev) => (prev === conv.conversation_id ? null : conv.conversation_id));
                                }}
                              >
                                <Ellipsis className="h-[1rem] stroke-textdark group-hover/menu:stroke-textsecondary" />
                              </button>

                              {/* Context Menu */}
                              {moreOptionsOpenId === conv.conversation_id && showContextMenu && (
                                <div
                                  className="fixed translate-x-[160%] translate-y-[40%] z-[9999] w-50 bg-bglight border border-border shadow-lg rounded-md text-sm overflow-hidden transition-opacity duration-150"
                                  style={{ top: contextMenuPosition.top, left: contextMenuPosition.left }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                  onMouseEnter={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <ul className="py-1">
                                    <li>
                                      <button
                                        onClick={() => {
                                          setConversationToRename(conv.conversation_id);
                                          setNewName(conv.title || conv.messages?.[0]?.content || "");
                                          setShowRenameModal(true);
                                          setMoreOptionsOpenId(null);
                                        }}
                                        className="flex items-center justify-between gap-2 w-full px-4 py-2 text-left text-textdark hover:bg-gray-100"
                                      >
                                        Rename conversation
                                        <Pencil size={16} className="stroke-textdark" />
                                      </button>
                                    </li>
                                    <li>
                                      <button
                                        onClick={() => {
                                          setConversationToDelete(conv.conversation_id);
                                          setShowDeleteModal(true);
                                          setMoreOptionsOpenId(null);
                                        }}
                                        className="flex items-center justify-between gap-2 w-full px-4 py-2 text-left text-destructive hover:bg-gray-100"
                                      >
                                        Delete conversation
                                        <Trash2 size={16} className="stroke-destructive" />
                                      </button>
                                    </li>
                                  </ul>
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })
                    ) : (
                      <li className="p-2">
                        <small className="text-textsecondary">No conversations available</small>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Beta Disclaimer */}
            <div className={`${sidebarCollapsed ? "cursor-pointer rounded-md" : "rounded-full"}  bg-textdark w-full py-3 px-6 flex gap-2 justify-center items-center`} onClick={!sidebarCollapsed ? undefined : toggleSidebar}>
              <SquareAsterisk size={32} className="stroke-accent" />
              <small className={`${sidebarCollapsedDelayed ? "hidden" : "block"} text-textlight text-xs`}>
                This app is in development. For issues or feedback,
                <a
                  href="https://docs.google.com/forms/d/1RX5YAecyJPVdbU_czip_rPm9d3w1LCLwwQVg06hG-dQ/edit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline ml-1"
                >
                  click here.
                </a>
              </small>
            </div>
          </div>

          {/* Main chat area */}
          <div className="flex justify-center h-full w-full">
            <div className="max-w-[80rem] h-full duration-300 ease-in-out flex flex-col flex-1 relative overflow-visible gap-6">
              <div className="flex flex-col h-full gap-4">
                <div className="flex flex-col flex-grow-[1] min-h-0 w-full bg-innercontainer rounded-lg border border-border">
                  <div
                    ref={chatContainerRef}
                    className="p-8 overflow-y-auto space-y-2 flex flex-col items-center"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {messages.length === 0 && !chatLoad && !generateSchedule ? (
                      <div className="w-full max-w-2xl text-left mt-[5rem]">
                        <h1>Hi, I’m Sage.</h1>
                        <h3>What can I help with?</h3>
                        <p className="text-textsecondary mt-8">Here are some example questions that I can help you with:</p>
                        <ul className="list-disc list-inside text-textsecondary text-sm space-y-1 pl-4 font-dmsans">
                          {advisingExampleQuestions.map((example) => (
                            <li
                              key={example.question}
                              className="text-textdark hover:text-textsecondary cursor-pointer"
                              onClick={() => {
                                handleClickQueryFlag.current = true;
                                setQuery(example.question);
                              }}
                            >
                              {example.question}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : messages.length === 0 && !chatLoad && generateSchedule ? (
                      <div className="w-full max-w-2xl text-left mt-[5rem]">
                        <h1>Hi, I’m Sage.</h1>
                        <h3>Let's start building your schedule!</h3>
                        <p className="text-textsecondary mt-8">Here are some example queries for the schedule generator that I can help you with:</p>
                        <ul className="list-disc list-inside text-textsecondary text-sm space-y-1 pl-4 font-dmsans">
                          {scheduleExampleQuestions.map((example) => (
                            <li
                              key={example.question}
                              className="text-textdark hover:text-textsecondary cursor-pointer"
                              onClick={() => {
                                handleClickQueryFlag.current = true;
                                setQuery(example.question);
                              }}
                            >
                              {example.question}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      messages.map((msg, index) => <MessageDisplay key={index} message={msg} />)
                    )}

                    {chatLoad && !chatError && (
                      <div className="p-3 rounded-md bg-[#E5E4E4] text-black self-start mr-auto border border-border w-fit max-w-sm">
                        <span className="animate-pulse">Thinking...</span>
                      </div>
                    )}
                    {chatError && <div className="text-red-500 font-semibold">{chatError}</div>}
                  </div>
                </div>

                {/* Query Container */}
                <div className="w-full flex flex-row gap-4 items-center justify-center">
                  {/* Mode Toggle */}
                  <div className="flex flex-row gap-2 p-2 bg-innercontainer border rounded-full border-border">
                    <div className="relative group/advising">
                      <button
                        className={`p-2 rounded-full mr-2 transition-colors duration-200 ${
                          !generateSchedule ? "bg-accent hover:bg-buttonhover" : "bg-secondary hover:bg-[#A9BFB4]"
                        }`}
                        onClick={() => setGenerateSchedule(false)}
                        aria-label="Ask a general advising question"
                      >
                        <GraduationCapIcon size={24} className="stroke-textdark" />
                      </button>
                      <div className="group-hover/advising:flex hidden flex-col items-center absolute bottom-[125%] translate-x-[-50%] left-[42%]">
                        <div className="bg-bgdark text-textlight text-xs rounded-full px-3 py-2 shadow-lg whitespace-nowrap">Ask a general advising question</div>
                        <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-bgdark" />
                      </div>
                    </div>

                    <div className="relative group/schedule">
                      <button
                        className={`p-2 rounded-full transition-colors duration-200 ${
                          generateSchedule ? "bg-accent hover:bg-buttonhover" : "bg-secondary hover:bg-[#A9BFB4]"
                        }`}
                        onClick={() => setGenerateSchedule(true)}
                        aria-label="Generate your class schedule"
                      >
                        <CalendarSearchIcon size={24} className="stroke-textdark" />
                      </button>
                      <div className="group-hover/schedule:flex hidden flex-col items-center absolute bottom-[125%] translate-x-[-50%] left-1/2">
                        <div className=" bg-bgdark text-textlight text-xs rounded-full px-3 py-2 shadow-lg whitespace-nowrap">Generate your class schedule</div>
                        <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-bgdark" />
                      </div>
                    </div>
                  </div>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    placeholder="Ask a question..."
                    aria-label="Chat input field"
                    className="w-full py-4 px-8 mr-2 border rounded-lg resize-none overflow-y-auto focus:outline-none h-fit max-h-28"
                    style={{ scrollbarWidth: "none" }}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleEnter}
                    value={query}
                    disabled={chatHistoryLoad}
                  />

                  <button
                    className="flex h-full max-h-[3rem] justify-center items-center aspect-square bg-accent rounded-full hover:bg-buttonhover transition-colors disabled:opacity-50"
                    onClick={handleSendQuery}
                    disabled={chatHistoryLoad || !query.trim()}
                  >
                    <CornerRightUpIcon size={24} />
                  </button>
                </div>
              </div>

              <small className="absolute w-full flex justify-center bottom-[-2rem] text-textsecondary">
                SAGE does not replace official academic advising and may produce incorrect information.
              </small>
            </div>
          </div>
        </>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleOutsideClick}>
          <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-textdark">Are you sure you want to delete this conversation?</h3>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(false);
                  setConversationToDelete(null);
                }}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 text-sm bg-destructive text-white rounded hover:bg-red-700 disabled:opacity-50"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!conversationToDelete) return;
                  setDeleting(true);
                  try {
                    await deleteConversation(conversationToDelete);
                    setShowDeleteModal(false);
                    setConversationToDelete(null);
                  } catch (err) {
                    console.error("Failed to delete:", err);
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleOutsideClick}>
          <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-textdark">Rename Chat</h3>

            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              className="w-full px-3 py-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />

            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRenameModal(false);
                  setNewName("");
                }}
                disabled={renaming}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 text-sm bg-accent text-textdark rounded hover:text-gray-700 disabled:opacity-50"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!newName.trim() || !conversationToRename) return;
                  setRenaming(true);
                  try {
                    await renameConversation(conversationToRename, newName.trim());
                    setShowRenameModal(false);
                    setNewName("");
                  } catch (err) {
                    console.error("Failed to rename:", err);
                  } finally {
                    setRenaming(false);
                  }
                }}
                disabled={renaming || !newName.trim()}
              >
                {renaming ? "Renaming..." : "Rename"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;