import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  CornerRightUpIcon,
  GraduationCapIcon,
  CalendarSearchIcon,
  Trash2,
  Pencil,
  Ellipsis,
  HelpCircle,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import MessageDisplay from "@/components/chatbot/MessageDisplay";
import { chatEventEmitter } from "../utils/chatEventEmitter";
import { useChatbot } from "@/hooks/useChatbot";
import { Message, Conversation } from "@/types/chat";
import { useChatbotTutorial } from "@/hooks/useChatbotTutorial";
import ChatSidebarShell from "@/components/chatbot/ChatSidebarShell";

const CONVERSATIONS_CACHE_EXPIRATION_TIME = 1000 * 60 * 60;

const hydrateMessages = (msgs: Message[]): Message[] =>
  msgs.map((msg) => {
    if (msg.role === "assistant") {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed?.type === "email") {
          return { ...msg, type: "email" as const, variants: parsed.variants, content: "" };
        }
        if (parsed?.type === "schedule") {
          return { ...msg, type: "schedule" as const, variants: parsed.variants, content: "" };
        }
      } catch { /* plain string, leave as is */ }
    }
    return msg;
  });

const ChatBot: React.FC = () => {
  const { user, hasSeenChatbotTutorial } = useAuth();
  const [query, setQuery] = useState("");
  const handleClickQueryFlag = useRef(false);
  const ellipsisButtonRef = useRef<HTMLButtonElement | null>(null);
  const renameModalRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const chatHook = useChatbot();
  const {
    conversations,
    conversation_id,
    error,
    loading,
    setConversations,
    deleteConversation,
    renameConversation,
    fetchConversation,
    setConversationId,
    initialLoad
  } = chatHook;

  const { startTutorial } = useChatbotTutorial({ user, hasSeenTutorial: hasSeenChatbotTutorial });
  
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

  const updateConversationId = (newId: string | null) => {
    setConversationId(newId);
    chatEventEmitter.emit('activeConversationUpdate', newId);
  };

  const [chatLoad, setChatLoad] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarCollapsedDelayed, setSidebarCollapsedDelayed] = useState(false);
  const [isNewConversation, setIsNewConversation] = useState<boolean>(false);
  const [generateSchedule, setGenerateSchedule] = useState(false);

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

  const startNewChat = () => {
    setChatError(null);
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

    const newConversationId = `conversation_${uuidv4()}`;
    loadConversation(newConversationId, []);
    setIsNewConversation(true);

    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }

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

  const sortConversationsByDate = (convs: Conversation[]): Conversation[] => {
    return [...convs].sort((a, b) => {
      const aTime = new Date(a.messages?.[a.messages.length - 1]?.timestamp || 0).getTime();
      const bTime = new Date(b.messages?.[b.messages.length - 1]?.timestamp || 0).getTime();
      return bTime - aTime;
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

    const token = await user?.getIdToken();
    if (!token) throw new Error("Failed to retrieve authentication token.");

    if (!CHAT_API) {
      console.error("CHAT_API is missing. Check your .env file.");
      setChatLoad(false);
      return;
    }

    const requestBody: Record<string, unknown> = {
      id: user?.uid,
      query: query,
      generate_schedule: generateSchedule,
      token: token
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
        } else if (response.status === 404) {
          setChatError("This conversation no longer exists.");
          setConversationId(null);
        } else {
          throw new Error(`Failed to get chatbot response: ${response.status} - ${errorText}`);
        }
        return;
      }

      const data = await response.json();
      if (!data.response) {
        throw new Error("Chatbot API did not return a response.");
      }

      const botMessage: Message =
        data.type === "email"
          ? {
            role: "assistant",
            content: JSON.stringify({ type: "email", variants: data.response.variants }),
            type: "email",
            variants: data.response.variants,
            timestamp: Date.now(),
          }
          : data.type === "schedule"
            ? { role: "assistant", content: JSON.stringify({ type: "schedule", variants: data.response.variants }), type: "schedule", variants: data.response.variants, timestamp: Date.now() }
            : {
              role: "assistant",
              content: data.response,
              timestamp: Date.now(),
            };

      const updatedMessagesWithBot = [...updatedMessagesWithUser, botMessage];
      setMessages(updatedMessagesWithBot);

      const currentConvId: string = data.conversation_id || conversation_id || `conversation_${uuidv4()}`;
      updateConversationId(currentConvId);

      updateConversations((prevConversations) => {
        const filtered = prevConversations.filter((conv) => conv.conversation_id !== currentConvId);
        const existingConv = prevConversations.find((conv) => conv.conversation_id === currentConvId);
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

  // accessibility stuff 
  const deleteModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showRenameModal && renameModalRef.current) {
      renameModalRef.current.focus();
    }
  }, [showRenameModal]);

  useEffect(() => {
    if (showDeleteModal && deleteModalRef.current) {
      deleteModalRef.current.focus();
    }
  }, [showDeleteModal]);

  useEffect(() => {
    if (moreOptionsOpenId && showContextMenu && contextMenuRef.current) {
      const firstItem = contextMenuRef.current.querySelector<HTMLElement>('[role="menuitem"]');
      firstItem?.focus();
    }
  }, [moreOptionsOpenId, showContextMenu]);

  const handleDeleteModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setShowDeleteModal(false);
      setConversationToDelete(null);
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = deleteModalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  const handleRenameModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setShowRenameModal(false);
      setNewName("");
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = renameModalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  const handleContextMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      contextMenuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
    );
    if (!items.length) return;
    const currentIdx = items.indexOf(document.activeElement as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(currentIdx + 1) % items.length]?.focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(currentIdx - 1 + items.length) % items.length]?.focus();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setMoreOptionsOpenId(null);
      setShowContextMenu(false);
      ellipsisButtonRef.current?.focus();
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

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chatbot_conversations' && e.newValue) {
        const cached = JSON.parse(e.newValue);
        if (cached.data) {
          setConversations(cached.data);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setConversations]);

  useEffect(() => {
    const handleStartNewChat = () => { startNewChat(); };
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
              // ---- Hydrate email messages from localStorage cache ----
              const hydratedMessages = hydrateMessages(selectedConversation.messages || []);
              setMessages(hydratedMessages);
              localStorage.setItem(
                "chatbot_conversation",
                JSON.stringify({
                  messages: hydratedMessages,
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
          // ---- Hydrate email messages from S3 ----
          const hydratedMessages = hydrateMessages(selectedConversation.messages || []);
          setMessages(hydratedMessages);
          localStorage.setItem(
            "chatbot_conversation",
            JSON.stringify({
              messages: hydratedMessages,
              conversation_id,
              timestamp: Date.now(),
              cacheUserId: user?.uid ?? null,
            })
          );
        } else {
          setConversationId(null);
          setMessages([]);
          localStorage.removeItem("chatbot_conversation");
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
    <main
      className="flex bg-bglight overflow-hidden py-[4rem] px-6 gap-[2.25rem] mt-[4.2rem] h-[calc(100vh-4.2rem)]"
      onClick={handleOutsideClick}
    >
      <button data-tour="help-button" aria-label="Chatbot Help" onClick={startTutorial} className="fixed bottom-4 right-4 w-7 h-7 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center z-50">
        <HelpCircle size={18} className="text-white" aria-hidden="true" />
      </button>

      {mobileView ? (
        <>
          <div className="flex justify-center h-full w-full">
            <div className="max-w-[80rem] h-full duration-300 ease-in-out flex flex-col flex-1 relative overflow-visible gap-10 bottom-[3rem]">
              <div className="flex flex-col h-full gap-4">
                <div className="flex flex-col flex-grow-[1] min-h-0 w-full bg-innercontainer rounded-lg border border-border">
                  <div
                    ref={chatContainerRef}
                    className="p-8 overflow-y-auto space-y-2 flex flex-col items-center flex-1 min-h-0"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {messages.length === 0 && !chatLoad && !generateSchedule ? (
                      <div className="w-full max-w-2xl text-left mt-[5rem]">
                        <h1 className="text-4xl">Hi, I'm Sage.</h1>
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
                        <h1>Hi, I'm Sage.</h1>
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
                      messages.map((msg, index) => (
                        <MessageDisplay key={index} message={msg} messageIndex={index} conversationId={conversation_id} />
                      ))
                    )}

                    {chatLoad && !chatError && (
                      <div className="p-3 rounded-md bg-[#E5E4E4] text-black self-start mr-auto border border-border w-fit max-w-sm">
                        <span className="animate-pulse">Thinking...</span>
                      </div>
                    )}
                    {chatError && <div className="text-red-500 font-semibold">{chatError}</div>}
                  </div>
                </div>

                <div className="w-full flex flex-row gap-4 items-center justify-center">
                  <div className="relative w-full">
                    <textarea
                      data-tour="chat-input"
                      ref={textareaRef}
                      rows={1}
                      placeholder="Ask a question..."
                      aria-label="Chat input field"
                      className={`w-full py-4 px-8 mr-2 border rounded-lg resize-none overflow-y-auto focus:outline-none h-fit max-h-28 ${query.trim().length >= 400 ? "pb-6" : ""
                        }`}
                      style={{ scrollbarWidth: "none" }}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        if (chatError) setChatError(null);
                      }}
                      onKeyDown={handleEnter}
                      value={query}
                      disabled={loading}
                    />
                    {query.trim().length >= 400 && (
                      <div
                        className={`absolute -bottom-3 right-6 text-xs font-medium pointer-events-none transition-colors duration-150 ${query.trim().length >= 500 ? "text-red-500" : "text-orange-400"
                          }`}
                      >
                        {query.trim().length} / 500
                      </div>
                    )}
                  </div>

                  <button
                    aria-label="Send message"
                    className="flex h-full max-h-[3rem] justify-center items-center aspect-square bg-accent rounded-full hover:bg-buttonhover transition-colors disabled:opacity-50"
                    onClick={handleSendQuery}
                    disabled={loading || !query.trim() || query.trim().length > 500}
                  >
                    <CornerRightUpIcon size={24} aria-hidden="true" />
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
          <ChatSidebarShell
            isCollapsed={sidebarCollapsed}
            sidebarCollapsedDelayed={sidebarCollapsedDelayed}
            onToggleCollapse={toggleSidebar}
            onStartNewChat={startNewChat}
            chatHook={chatHook}
          />

          {/* Main chat area */}
          <div className="flex justify-center h-full w-full">
            <div className="max-w-[80rem] h-full duration-300 ease-in-out flex flex-col flex-1 relative overflow-visible gap-6">
              <div className="flex flex-col h-full gap-4">
                <div className="flex flex-col flex-grow-[1] min-h-0 w-full bg-innercontainer rounded-lg border border-border">
                  <div
                    ref={chatContainerRef}
                    data-clarity-mask="True"
                    className="p-8 overflow-y-auto space-y-2 flex flex-col items-center"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {messages.length === 0 && !chatLoad && !generateSchedule ? (
                      <div className="w-full max-w-2xl text-left mt-[5rem]">
                        <h1>Hi, I'm Sage.</h1>
                        <h3>What can I help with?</h3>
                        <p className="text-textsecondary mt-8">Here are some example questions that I can help you with:</p>
                        <ul className="list-disc list-inside text-textsecondary text-sm space-y-1 pl-4 font-dmsans">
                          {advisingExampleQuestions.map((example) => (
                            <li
                              key={example.question}
                            >
                              <button
                                className="text-textdark hover:text-textsecondary cursor-pointer text-left bg-transparent border-none p-0"
                                onClick={() => {
                                  handleClickQueryFlag.current = true;
                                  setQuery(example.question);
                                }}
                              >
                                {example.question}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : messages.length === 0 && !chatLoad && generateSchedule ? (
                      <div className="w-full max-w-2xl text-left mt-[5rem]">
                        <h1>Hi, I'm Sage.</h1>
                        <h3>Let's start building your schedule!</h3>
                        <p className="text-textsecondary mt-8">Here are some example queries for the schedule generator that I can help you with:</p>
                        <ul className="list-disc list-inside text-textsecondary text-sm space-y-1 pl-4 font-dmsans">
                          {scheduleExampleQuestions.map((example) => (
                            <li
                              key={example.question}
                            >
                              <button
                                className="text-textdark hover:text-textsecondary cursor-pointer text-left bg-transparent border-none p-0"
                                onClick={() => {
                                  handleClickQueryFlag.current = true;
                                  setQuery(example.question);
                                }}
                              >
                                {example.question}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      messages.map((msg, index) => (
                        <MessageDisplay key={index} message={msg} messageIndex={index} conversationId={conversation_id} />
                      ))
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
                  <div data-tour="mode-toggle" className="flex flex-row gap-2 p-2 bg-innercontainer border rounded-full border-border">
                    <div className="relative group/advising">
                      <button
                        className={`p-2 rounded-full mr-2 transition-colors duration-200 ${!generateSchedule ? "bg-accent hover:bg-buttonhover" : "bg-secondary hover:bg-[#A9BFB4]"
                          }`}
                        onClick={() => setGenerateSchedule(false)}
                        aria-label="Ask a general advising question"
                      >
                        <GraduationCapIcon size={24} className="stroke-textdark" aria-hidden="true" />
                      </button>
                      <div className="group-hover/advising:flex hidden flex-col items-center absolute bottom-[125%] translate-x-[-50%] left-[42%]">
                        <div className="bg-bgdark text-textlight text-xs rounded-full px-3 py-2 shadow-lg whitespace-nowrap">Ask a general advising question</div>
                        <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-bgdark" />
                      </div>
                    </div>

                    <div className="relative group/schedule">
                      <button
                        className={`p-2 rounded-full transition-colors duration-200 ${generateSchedule ? "bg-accent hover:bg-buttonhover" : "bg-secondary hover:bg-[#A9BFB4]"
                          }`}
                        onClick={() => setGenerateSchedule(true)}
                        aria-label="Generate your class schedule"
                      >
                        <CalendarSearchIcon size={24} className="stroke-textdark" aria-hidden="true" />
                      </button>
                      <div className="group-hover/schedule:flex hidden flex-col items-center absolute bottom-[125%] translate-x-[-50%] left-1/2">
                        <div className="bg-bgdark text-textlight text-xs rounded-full px-3 py-2 shadow-lg whitespace-nowrap">Generate your class schedule</div>
                        <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-bgdark" />
                      </div>
                    </div>
                  </div>

                  <div className="relative w-full">
                    <textarea
                      data-clarity-mask="True"
                      data-tour="chat-input"
                      ref={textareaRef}
                      rows={1}
                      placeholder="Ask a question..."
                      aria-label="Chat input field"
                      className="w-full py-4 px-8 mr-2 border rounded-lg resize-none overflow-y-auto focus:outline-none h-fit max-h-28"
                      style={{ scrollbarWidth: "none" }}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleEnter}
                      value={query}
                      disabled={loading}
                    />
                    {query.trim().length >= 400 && (
                      <div
                        className={`absolute bottom-3 right-6 text-xs font-medium pointer-events-none transition-colors duration-150 ${query.trim().length >= 500 ? "text-red-500" : "text-orange-400"
                          }`}
                      >
                        {query.trim().length} / 500
                      </div>
                    )}
                  </div>

                  <button
                    className="flex h-full max-h-[3rem] justify-center items-center aspect-square bg-accent rounded-full hover:bg-buttonhover transition-colors disabled:opacity-50"
                    onClick={handleSendQuery}
                    disabled={loading || !query.trim()}
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
          <div
            ref={deleteModalRef}
            tabIndex={-1}
            onKeyDown={handleDeleteModalKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            className="bg-white p-6 rounded-md shadow-lg w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-textdark">Are you sure you want to delete this conversation?</h3>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(false);
                  setTimeout(() => ellipsisButtonRef.current?.focus(), 0);
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

                    setMessages([]);
                    updateConversationId(null);
                    setChatError(null);
                    localStorage.removeItem("chatbot_conversation");

                    setShowDeleteModal(false);
                    setTimeout(() => ellipsisButtonRef.current?.focus(), 0);
                    setConversationToDelete(null);
                  } catch (err) {
                    console.error("Failed to delete:", err);
                    setChatError("Failed to delete conversation. Please try again.");
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
          <div
            ref={renameModalRef}
            tabIndex={-1}
            onKeyDown={handleRenameModalKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-modal-title"
            className="bg-white p-6 rounded-md shadow-lg w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
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
    </main>
  );
};

export default ChatBot;