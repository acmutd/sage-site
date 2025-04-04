import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeftToLineIcon,
  ArrowRightToLineIcon,
  CornerRightUpIcon,
  MessageCirclePlusIcon,
  GraduationCapIcon,
  CalendarSearchIcon,
  MessagesSquare,
  SquareAsterisk,
  PanelLeftDashed,
  Trash2,
  Ellipsis,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import MessageDisplay from "@/components/chatbot/MessageDisplay";

const CACHE_EXPIRATION_TIME = 60 * 60 * 1000;

const ChatBot = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation_id, setconversation_id] = useState<string | null>(null);
  const [conversations, setConversations] = useState<
    { conversation_id: string; user_id: string; messages: any[] }[]
  >([]);
  const [chatHistoryLoad, setChatHistoryLoad] = useState(false);
  const [chatLoad, setChatLoad] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarCollapsedDelayed, setSidebarCollapsedDelayed] = useState(false);
  const [isNewConversation, setIsNewConversation] = useState<boolean>(false);
  const [generateSchedule, setGenerateSchedule] = useState(false);
  const [hovered, setHovered] = useState<"advising" | "schedule" | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRefs = {
    advising: useRef(null),
    schedule: useRef(null),
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [moreOptionsOpenId, setMoreOptionsOpenId] = useState<string | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<
    string | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const conversationListRef = useRef<HTMLUListElement | null>(null);

  const CHAT_API = import.meta.env.VITE_CHAT_API;
  const CRUD_API = import.meta.env.VITE_CRUD_API;

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const toggleSidebar = () => {
    let sidebarDelay = 0;
    setSidebarCollapsed(!sidebarCollapsed);
    if (sidebarCollapsed) {
      sidebarDelay = 80;
    }
    setTimeout(() => {
      setSidebarCollapsedDelayed(!sidebarCollapsed);
    }, sidebarDelay)
  };

  // Check if the cached data is still valid
  const isCacheValid = (timestamp: number, cacheUserId: any): boolean => {
    if (!user?.uid || !timestamp || !cacheUserId) return false;
    const currentTime = Date.now();
    return (
      currentTime - timestamp < CACHE_EXPIRATION_TIME &&
      user.uid === cacheUserId
    );
  };

  const handleOutsideClick = () => {
    setMoreOptionsOpenId(null);
  };

  // Save conversation data with timestamp to localStorage
  const saveConversationsToCache = (conversations: any[]) => {
    localStorage.setItem(
      "chatbot_conversations",
      JSON.stringify({
        data: conversations,
        timestamp: Date.now(),
        userId: user?.uid,
      })
    );
  };

  // Fetch conversation data from Lambda (instead of directly from S3)
  const fetchConversation = async () => {
    // console.log("user.uid: ", user?.uid);

    if (!user?.uid) {
      console.warn("User ID is missing. Cannot fetch conversations.");
      return;
    }

    setChatHistoryLoad(true);
    setError(null);

    try {
      // Check if we have valid cached conversations
      const cachedConversationsString = localStorage.getItem(
        "chatbot_conversations"
      );

      if (cachedConversationsString) {
        const cachedConversations = JSON.parse(cachedConversationsString);

        if (
          cachedConversations.timestamp &&
          cachedConversations.userId &&
          isCacheValid(
            cachedConversations.timestamp,
            cachedConversations.userId
          )
        ) {
          console.log("Using cached conversations data");
          setConversations(
            Array.isArray(cachedConversations.data)
              ? cachedConversations.data
              : []
          );
          setChatHistoryLoad(false);
          return cachedConversations.data;
        }
      }

      if (!CRUD_API) {
        throw new Error("CRUD_API environment variable is missing.");
      }

      // Ensure token is properly fetched
      const token = await user.getIdToken();
      if (!token) {
        throw new Error("Failed to retrieve authentication token.");
      }

      // console.log("token: ", token);

      // If cache is invalid or doesn't exist, fetch fresh data
      console.log("Fetching fresh conversations data");
      const response = await fetch(CRUD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid,
          // userId: "test-user-123",
          action: "getConversations",
          token,
        }),
      });

      console.log("response: ", response);
      // console.log("API Response Status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch conversations: ${response.status} - ${errorText}`
        );
      }
      // console.log("after response");

      const data = await response.json();
      // console.log("data: ", data);
      setConversations(Array.isArray(data) ? data : []);

      // Cache the fetched conversations with a timestamp
      saveConversationsToCache(data || []);

      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch conversations";
      setError(errorMessage);
      console.error("Error fetching conversation:", error);
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

    const conversationToDelete = conversationId;
    console.log("conversationToDelete: ", conversationToDelete);

    try {
      const cachedConversationsString = localStorage.getItem(
        "chatbot_conversations"
      );

      if (cachedConversationsString) {
        const cachedConversation = JSON.parse(cachedConversationsString);

        if (cachedConversation?.data) {
          // Filter out the conversation
          const updatedCache = {
            ...cachedConversation,
            data: cachedConversation.data.filter(
              (item: { conversation_id: string }) =>
                item.conversation_id !== conversationToDelete
            ),
          };
          // Save it back
          localStorage.setItem(
            "chatbot_conversations",
            JSON.stringify(updatedCache)
          );
        }
      } else {
        console.warn("Couldn't find conversation in cache");
      }

      if (!CRUD_API) {
        throw new Error("CRUD_API environment variable is missing.");
      }

      const token = await user.getIdToken();
      if (!token) {
        throw new Error("Failed to retrieve authentication token.");
      }

      const response = await fetch(CRUD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid,
          action: "deleteConversation",
          token,
          conversationId: conversationId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to delete conversation: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      // Remove the deleted conversation from current state
      setConversations((prev) =>
        prev.filter((item) => item.conversation_id !== conversationToDelete)
      );

      // Update localStorage cache too
      const updatedCacheString = localStorage.getItem("chatbot_conversations");
      if (updatedCacheString) {
        const updatedCache = JSON.parse(updatedCacheString);
        const filtered = updatedCache.data.filter(
          (item: { conversation_id: string }) =>
            item.conversation_id !== conversationToDelete
        );
        saveConversationsToCache(filtered);
      }

      if (conversation_id === conversationToDelete) {
        setconversation_id(null);
        setMessages([]);
        localStorage.removeItem("chatbot_conversation");
      }

      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete conversation";
      setError(errorMessage);
      console.error("Error deleting conversation:", error);
    }
  };

  const startNewChat = () => {
    if (messages.length > 0 && conversation_id) {
      setConversations((prevConversations) => {
        if (!Array.isArray(prevConversations)) return [];

        const filteredConversations = prevConversations.filter(
          (conv) => conv.conversation_id !== conversation_id
        );

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

    localStorage.setItem(
      "chatbot_conversation",
      JSON.stringify({
        messages: [],
        conversation_id: newConversationId,
        timeStamp: Date.now(),
        cacheUserId: user?.uid,
      })
    );

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const loadConversation = async (id: string, messages: any[]) => {
    setconversation_id(id);
    setMessages(messages);
    localStorage.setItem(
      "chatbot_conversation",
      JSON.stringify({
        messages,
        conversation_id: id,
        timestamp: Date.now(),
        cacheUserId: user?.uid,
      })
    );
  };

  const initialLoad = async () => {
    if (!user?.uid) return;

    const cachedData = localStorage.getItem("chatbot_conversation");
    console.log(user.uid);

    if (cachedData) {
      const { messages, conversation_id, timestamp, cacheUserId } =
        JSON.parse(cachedData);

      // Check if the cached conversation is still valid
      if (timestamp && cacheUserId && isCacheValid(timestamp, cacheUserId)) {
        console.log("Using cached current conversation");
        setMessages(messages || []);
        setconversation_id(conversation_id || null);

        // Also load the conversations list from cache if available
        const cachedConversationsString = localStorage.getItem(
          "chatbot_conversations"
        );
        if (cachedConversationsString) {
          const cachedConversations = JSON.parse(cachedConversationsString);
          if (
            cachedConversations.timestamp &&
            cachedConversations.userId &&
            isCacheValid(
              cachedConversations.timestamp,
              cachedConversations.userId
            )
          ) {
            setConversations(
              Array.isArray(cachedConversations.data)
                ? cachedConversations.data
                : []
            );
            return;
          }
        }
      } else {
        localStorage.removeItem("chatbot_conversation");
      }
    }

    // If no valid cache or cache expired, fetch fresh data
    const data = await fetchConversation();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn("No valid data returned from fetchConversation");
      return;
    }

    const sorted = [...data].sort((a, b) => {
      const aTime = new Date(
        a.messages?.[a.messages.length - 1]?.timestamp || 0
      ).getTime();
      const bTime = new Date(
        b.messages?.[b.messages.length - 1]?.timestamp || 0
      ).getTime();
      return bTime - aTime; // Most recent first
    });

    const lastConversationData = sorted[0];

    if (lastConversationData) {
      setMessages(lastConversationData.messages || []);
      setconversation_id(lastConversationData.conversation_id || null);

      localStorage.setItem(
        "chatbot_conversation",
        JSON.stringify({
          messages: lastConversationData.messages || [],
          conversation_id: lastConversationData.conversation_id,
          timestamp: Date.now(),
          cacheUserId: user?.uid,
        })
      );
    }
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

    // Check if query is too long
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

    const userMessage = { role: "user", content: query };
    const updatedMessagesWithUser = [...messages, userMessage];
    setMessages(updatedMessagesWithUser);

    localStorage.setItem(
      "chatbot_conversation",
      JSON.stringify({
        messages: updatedMessagesWithUser,
        conversation_id,
        timestamp: Date.now(),
        cacheUserId: user?.uid,
      })
    );

    // console.log("CHAT_API:", CHAT_API);
    if (!CHAT_API) {
      console.error("CHAT_API is missing. Check your .env file.");
      return;
    }

    const requestBody: any = {
      id: user?.uid,
      query: query,
      generate_schedule: generateSchedule,
    };

    if (conversation_id) {
      requestBody.conversation_id = conversation_id;
    }

    setQuery("");

    try {
      const response = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorObj = JSON.parse(errorText);

        if (
          response.status === 401 &&
          errorObj.error === "Daily query limit reached. Try again tomorrow."
        ) {
          setChatError("Daily query limit reached. Try again tomorrow.");
        } else {
          throw new Error(
            `Failed to get chatbot response: ${response.status} - ${errorText}`
          );
        }
        return;
      }

      const data = await response.json();
      if (!data.response) {
        throw new Error("Chatbot API did not return a response.");
      }

      const botMessage = { role: "bot", content: data.response };
      const updatedMessagesWithBot = [...updatedMessagesWithUser, botMessage];

      setMessages(updatedMessagesWithBot);

      const currentConvId = data.conversation_id || conversation_id;

      setconversation_id(currentConvId);

      // Only prepend the conversation to state/cache if it's new
      setConversations((prevConversations) => {
        console.log("Inside update - prevConversations:", prevConversations);
        const filtered = prevConversations.filter(
          (conv) => conv.conversation_id !== currentConvId
        );

        const newConv = {
          conversation_id: currentConvId!,
          user_id: user?.uid || "test-user-123",
          messages: updatedMessagesWithBot,
        };

        const updated = [newConv, ...filtered];

        saveConversationsToCache(updated);

        return updated;
      });

      if (isNewConversation) {
        setIsNewConversation(false);
      }

      // Update local cache
      localStorage.setItem(
        "chatbot_conversation",
        JSON.stringify({
          messages: updatedMessagesWithBot,
          conversation_id: currentConvId,
          timestamp: Date.now(),
          cacheUserId: user?.uid,
        })
      );
    } catch (error) {
      console.error("Error sending query:", error);
      setChatError("Chatbot has encountered an error. Please try again.");
    } finally {
      setChatLoad(false);
    }
  };

  // This is used for testing purposes
  // const clearCache = () => {
  //   setMessages([]);
  //   setconversation_id(null);
  //   localStorage.removeItem("chatbot_conversation");
  //   localStorage.removeItem("chatbot_conversations");
  // };

  useEffect(() => {
    const load = async () => {
      await initialLoad();
    };
    load();
    adjustTextareaHeight();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]); // Runs when messages change

  useEffect(() => {
    const updateTooltipPosition = (
      buttonRef: React.RefObject<HTMLButtonElement>
    ) => {
      if (buttonRef && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setTooltipPosition({
          top: rect.top - 50,
          left: rect.left + rect.width / 2,
        });
      }
    };

    if (hovered === "advising") {
      updateTooltipPosition(buttonRefs.advising);
    } else if (hovered === "schedule") {
      updateTooltipPosition(buttonRefs.schedule);
    }
  }, [hovered]);

  useEffect(() => {
    const reloadChatHistory = async () => {
      if (!conversation_id) return;

      try {
        // Check if we have valid cached conversations
        const cachedConversationsString = localStorage.getItem(
          "chatbot_conversations"
        );

        // console.log("cachedConversationsString: ", cachedConversationsString);

        if (cachedConversationsString) {
          const cachedConversations = JSON.parse(cachedConversationsString);

          if (
            cachedConversations.timestamp &&
            cachedConversations.userId &&
            isCacheValid(
              cachedConversations.timestamp,
              cachedConversations.userId
            )
          ) {
            console.log("Using cached conversations for history");
            const selectedConversation = cachedConversations.data.find(
              (conv: { conversation_id: string; messages: any[] }) =>
                conv.conversation_id === conversation_id
            );

            if (selectedConversation) {
              setMessages(selectedConversation.messages || []);

              localStorage.setItem(
                "chatbot_conversation",
                JSON.stringify({
                  messages: selectedConversation.messages || [],
                  conversation_id,
                  timestamp: Date.now(),
                  cacheUserId: user?.uid,
                })
              );
              return;
            }
          }
        }

        // If no valid cache or selected conversation not found in cache, fetch from server
        const data = await fetchConversation(); // Reuse fetch function

        // Explicitly type conversations
        const selectedConversation = data.find(
          (conv: { conversation_id: string; messages: any[] }) =>
            conv.conversation_id === conversation_id
        );

        if (selectedConversation) {
          setMessages(selectedConversation.messages || []);

          localStorage.setItem(
            "chatbot_conversation",
            JSON.stringify({
              messages: selectedConversation.messages || [],
              conversation_id,
              timestamp: Date.now(),
              cacheUserId: user?.uid,
            })
          );
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };

    reloadChatHistory();
  }, [conversation_id]);

  return (
    <div
      className="flex bg-bglight overflow-hidden py-[4rem] px-6 gap-[2.25rem] mt-[4.2rem] h-[calc(100vh-4.2rem)]"
      onClick={handleOutsideClick}
    >
      {/* Chat History Bar - Expanded or Skinny */}
      <div className={`
        ${sidebarCollapsed
          ? "w-[5.25rem]"
          : "w-[24rem]"
        }
        h-full flex flex-col gap-3 transition-all duration-100`}>
        <div
          className={`
            ${sidebarCollapsed
              ? "rounded-md px-4 cursor-pointer hover:bg-[#F5F7F5]"
              : "rounded-lg px-6"
            }
            transition-all duration-100
            py-8 gap-8 overflow-hidden
            bg-bglight border border-border
            flex flex-col items-center
            w-full h-full
          `}
          onClick={sidebarCollapsed ? toggleSidebar : undefined}
        >
          {/* Elements in the collapsed sidebar */}
          {sidebarCollapsed && (
            <div className="flex flex-col gap-8 h-full">
              <button
                className="transition-all p-2 rounded-sm text-textdark hover:bg-border w-12 h-12 flex items-center justify-center"
                onClick={toggleSidebar}
                aria-label="Expand sidebar"
              >
                <ArrowRightToLineIcon size={24} />
              </button>

              <button
                className="transition-all p-2 rounded-sm text-textdark border border-border bg-bglight hover:bg-border w-12 h-12 flex items-center justify-center"
                onClick={startNewChat}
                aria-label="Start new chat"
              >
                <MessageCirclePlusIcon size={24} className="stroke-textdark" />
              </button>

              <button
                className="transition-all p-2 rounded-sm text-textdark border border-border bg-bglight hover:bg-border w-12 h-12 flex items-center justify-center"
                onClick={toggleSidebar}
                aria-label="Chat History"
              >
                <MessagesSquare size={24} className="stroke-textdark" />
              </button>

              {/* Spacer */}
              <div className="flex flex-grow" />

              <div
                className="w-12 h-12 flex items-center justify-center"
              >
                <PanelLeftDashed size={24} className="stroke-textdark" />
              </div>
            </div>
          )}

          {/* Elements in the expanded sidebar */}
          {!sidebarCollapsed && (
            // Both booleans are in this^ expression for quicker response whenever the navbar is collapsed, since
            // sidebarCollapsedDelayed is changed after slightly more function overhead time
            <div className={`${sidebarCollapsedDelayed ? "opacity-0" : "opacity-100"} flex flex-col w-full overflow-hidden gap-8 transition-all duration-150`}>
              {/* Buttons at the top */}
              <div className="flex gap-3 justify-between">
                <button
                  className="flex transition-all duration-100 items-center space-x-2 py-2 px-6 rounded-3xl bg-accent text-textdark hover:text-gray-700"
                  onClick={startNewChat}
                >
                  <MessageCirclePlusIcon size={24} />
                  <span>Start new chat</span>
                </button>
                <button
                  className="p-2 text-black hover:text-gray-700 min-w-10 min-h-10 flex items-center justify-center"
                  onClick={toggleSidebar}
                  aria-label="Collapse sidebar"
                >
                  <ArrowLeftToLineIcon size={20} />
                </button>
              </div>

              {/* Conversation list */}
              {chatHistoryLoad && (
                <p className="text-textsecondary">Loading conversations...</p>
              )}
              {error && <p className="text-destructive">{error}</p>}

              <ul
                className="flex flex-col gap-2 overflow-y-scroll w-full"
                ref={conversationListRef}
                style={{ scrollbarWidth: "none" }}
              >
                {Array.isArray(conversations) && conversations.length > 0 ? (
                  conversations.map((conv, index) => {
                    // Use the first message to represent the conversation topic
                    const firstMessage =
                      conv.messages?.[0]?.content || "No messages";

                    const listIsOverflowing =
                      conversationListRef.current &&
                      conversationListRef.current.scrollHeight >
                      conversationListRef.current.clientHeight;

                    const isNearBottom =
                      listIsOverflowing && conversations.length - index <= 1;

                    return (
                      <li
                        key={conv.conversation_id}
                        className={`group/conversation flex flex-row gap-2 justify-between items-center w-full p-2 cursor-pointer rounded-sm hover:bg-secondary text-textdark transition-colors overflow-visible
                          ${conversation_id === conv.conversation_id
                          ? "bg-secondary"
                          : "bg-bglight"
                          }`}
                        onClick={() =>
                          loadConversation(conv.conversation_id, conv.messages)
                        }
                      >
                        <div className="flex flex-[1] group-hover/conversation:max-w-[85%] max-w-full">
                          <small className="truncate">
                            {firstMessage}
                          </small>
                        </div>

                        <div className="relative group-hover/conversation:flex hidden h-full">
                          <button
                            className="group/menu px-2 h-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoreOptionsOpenId((prev) =>
                                prev === conv.conversation_id
                                  ? null
                                  : conv.conversation_id
                              );
                            }}
                          >
                            <Ellipsis className="h-[1rem] stroke-textdark group-hover/menu:stroke-textsecondary"/>
                          </button>

                          {moreOptionsOpenId === conv.conversation_id && (
                            <div
                              className={`absolute right-0 z-[9999] w-48 bg-white border border-border shadow-lg rounded-md text-sm overflow-hidden ${isNearBottom ? "bottom-6" : "top-6"
                                }`}
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
                                      setConversationToDelete(
                                        conv.conversation_id
                                      );
                                      setShowDeleteModal(true);
                                      setMoreOptionsOpenId(null);
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-destructive hover:bg-gray-100"
                                  >
                                    Delete conversation
                                    <Trash2
                                      size={16}
                                      className="stroke-red-500"
                                    />
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
        <div className={`${sidebarCollapsed ? "cursor-pointer rounded-md" : "rounded-full"}  bg-textdark w-full py-3 px-6 flex gap-2 justify-center items-center`}
          onClick={!sidebarCollapsed ? undefined : toggleSidebar}>
          <SquareAsterisk size={32} className="stroke-accent" />
          <small className={`${sidebarCollapsedDelayed ? "hidden" : "block"} text-textlight text-xs`}>
            This app is in development. For issues or
            feedback,
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
        <div
          className={`
            max-w-[80rem] duration-300 ease-in-out
            flex flex-col flex-1 relative overflow-visible
            gap-6
          `}
        >
          <div className="flex-grow flex flex-col overflow-hidden">
            <div className="w-full bg-innercontainer rounded-lg border flex flex-col flex-grow overflow-hidden">
              <div
                ref={chatContainerRef}
                className="p-8 overflow-y-auto space-y-2 flex flex-col items-center"
                style={{ scrollbarWidth: "none" }}
              >
                {messages.length === 0 && !chatLoad && !generateSchedule ? (
                  // Case 1: Intro content
                  <div className="w-full max-w-2xl text-left mt-[5rem]">
                    <h1>Hi, I’m Sage.</h1>
                    <h3>What can I help with?</h3>
                    <p className="text-textsecondary mt-8">
                      Here are some example questions that I can help you with:
                    </p>
                    <ul className="list-disc list-inside text-textsecondary text-sm space-y-1 pl-4 font-dmsans">
                      <li>What courses are supported by the CSMC?</li>
                      <li>What are the requirements for graduation?</li>
                      <li>
                        How can I enroll in classes I don't have prereqs for if
                        I plan to take the prereqs over the summer?
                      </li>
                      <li>Tell me about ACM UTD and how I can get involved!</li>
                      <li>
                        What classes should a first-year accounting major
                        take?
                      </li>
                      <li>What do you know about Professor John Cole?</li>
                      <li>What are the GPA cutoffs for the benchmark classes of a prospective CS fast track student?</li>
                    </ul>
                  </div>
                ) : messages.length === 0 && !chatLoad && generateSchedule ? (
                  // Case 2: Custom rendering for generateSchedule = true
                  <div className="w-full max-w-2xl text-left mt-[5rem]">
                    <h1>Hi, I’m Sage.</h1>
                    <h3>Let's start building your schedule!</h3>
                    <p className="text-textsecondary mt-8">
                      Here are some example queries for the schedule generator
                      that I can help you with:
                    </p>
                    <ul className="list-disc list-inside text-textsecondary text-sm space-y-1 pl-4 font-dmsans">
                      <li>
                        Generate a schedule with CS 2305, ECS 2390, CS 2336, CS
                        2340, and PHYS 2325.
                      </li>
                      <li>
                        I work after 4pm on Tuesday and Thursday. Can you avoid
                        classes during that time?
                      </li>
                      <li>
                        My friend is in CS 2336.003, can we make sure to include
                        that class?
                      </li>
                      <li>
                        Swap CS 2336 for CS 3341, and no classes before 10am
                      </li>
                      <li>
                        I want Professor John Cole for CS 3162. Can we only use
                        his sections?
                      </li>
                      <li>
                        I need to enroll for summer classes, please generate a
                        schedule using summer sections.
                      </li>
                      <li>
                        Can you rank the CS2340 classes by professor rating and compare their data?
                      </li>
                    </ul>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    // Case 3: Render chat messages
                    <MessageDisplay key={index} message={msg} />
                  ))
                )}

                {chatLoad && !chatError && (
                  <div className="p-3 rounded-md bg-[#E5E4E4] text-black self-start mr-auto border border-border w-fit max-w-sm">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                )}
                {chatError && (
                  <div className="text-red-500 font-semibold">{chatError}</div>
                )}
              </div>
            </div>
            {/* Query Container */}
            <div className="w-full flex flex-row gap-4 items-center justify-center mt-4">
              {/* Mode Toggle */}
              <div className="flex flex-row gap-2 p-2 bg-innercontainer border rounded-full border-border">
                {/* General Advising Button */}
                <div
                  className="relative"
                  onMouseEnter={() => setHovered("advising")}
                  onMouseLeave={() => setHovered(null)}
                  ref={buttonRefs.advising}
                >
                  <button
                    className={`p-2 rounded-full mr-2 transition-colors duration-200 ${!generateSchedule
                      ? "bg-accent hover:bg-buttonhover"
                      : "bg-secondary hover:bg-[#A9BFB4]"
                      }`}
                    onClick={() => setGenerateSchedule(false)}
                    aria-label="Ask a general advising question"
                  >
                    <GraduationCapIcon size={24} className="text-black" />
                  </button>
                </div>

                {/* Generate Schedule Button */}
                <div
                  className="relative"
                  onMouseEnter={() => setHovered("schedule")}
                  onMouseLeave={() => setHovered(null)}
                  ref={buttonRefs.schedule}
                >
                  <button
                    className={`p-2 rounded-full transition-colors duration-200 ${generateSchedule
                      ? "bg-accent hover:bg-buttonhover"
                      : "bg-secondary hover:bg-[#A9BFB4]"
                      }`}
                    onClick={() => setGenerateSchedule(true)}
                    aria-label="Generate your class schedule"
                  >
                    <CalendarSearchIcon size={24} className="text-black" />
                  </button>
                </div>

                {/* Tooltip popup */}
                {hovered && (
                  <div
                    style={{
                      position: "fixed",
                      top: tooltipPosition.top,
                      left: tooltipPosition.left,
                      transform: "translateX(-50%)",
                      zIndex: 1000,
                    }}
                    className="bg-black text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap"
                  >
                    {hovered === "advising"
                      ? "Ask a general advising question"
                      : "Generate your class schedule"}
                    <div className="absolute left-1/2 -bottom-2 transform -translate-x-3/4 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-black"></div>
                  </div>
                )}
              </div>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Ask a question..."
                aria-label="Chat input field"
                className="w-full py-4 px-8 mr-2 border rounded-lg resize-none overflow-auto-y focus:outline-none h-fit max-h-28"
                style={{ scrollbarWidth: "none" }}
                onChange={(e) => {
                  setQuery(e.target.value);
                  adjustTextareaHeight();
                }}
                onKeyDown={handleEnter}
                value={query}
                disabled={chatHistoryLoad}
              />

              <button
                className="flex h-full max-h-[3rem] justify-center items-center aspect-square bg-accent rounded-full hover:bg-buttonhover transition-colors disabled:opacity-50"
                onClick={() => handleSendQuery()}
                disabled={chatHistoryLoad || !query.trim()}
              >
                <CornerRightUpIcon size={24} />
              </button>
            </div>
          </div>
          <small className="absolute w-full flex justify-center bottom-[-2rem] text-textsecondary">SAGE does not replace official academic advising and may produce incorrect information.</small>
        </div>
      </div>
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleOutsideClick}
        >
          <div
            className="bg-white p-6 rounded-md shadow-lg w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-textdark">
              Are you sure you want to delete this conversation?
            </h3>
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
    </div>
  );
};

export default ChatBot;