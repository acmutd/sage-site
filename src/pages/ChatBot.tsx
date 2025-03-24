import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeftToLineIcon,
  ArrowRightToLineIcon,
  CornerRightUpIcon,
  MessageCirclePlusIcon,
  RefreshCcwIcon,
  GraduationCapIcon,
  CalendarSearchIcon,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import MessageDisplay from "@/components/chatbot/MessageDisplay";

const CACHE_EXPIRATION_TIME = 60 * 60 * 1000;

const ChatBot = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>(
    []
  );
  const [conversation_id, setconversation_id] = useState<string | null>(null);
  const [conversations, setConversations] = useState<
    { conversation_id: string; user_id: string; messages: any[] }[]
  >([]);
  const [chatHistoryLoad, setChatHistoryLoad] = useState(false);
  const [chatLoad, setChatLoad] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isNewConversation, setIsNewConversation] = useState<boolean>(false);
  const [generateSchedule, setGenerateSchedule] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

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
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Check if the cached data is still valid
  const isCacheValid = (timestamp: number): boolean => {
    const currentTime = Date.now();
    return currentTime - timestamp < CACHE_EXPIRATION_TIME;
  };

  // Save conversation data with timestamp to localStorage
  const saveConversationsToCache = (conversations: any[]) => {
    localStorage.setItem(
      "chatbot_conversations",
      JSON.stringify({
        data: conversations,
        timestamp: Date.now(),
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

        if (isCacheValid(cachedConversations.timestamp)) {
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
      })
    );
  };

  const loadConversation = async (id: string, messages: any[]) => {
    setconversation_id(id);
    setMessages(messages);
    localStorage.setItem(
      "chatbot_conversation",
      JSON.stringify({ messages, conversation_id: id, timestamp: Date.now() })
    );
  };

  const initialLoad = async () => {
    if (!user?.uid) return;

    const cachedData = localStorage.getItem("chatbot_conversation");

    if (cachedData) {
      const { messages, conversation_id, timestamp } = JSON.parse(cachedData);

      // Check if the cached conversation is still valid
      if (timestamp && isCacheValid(timestamp)) {
        console.log("Using cached current conversation");
        setMessages(messages || []);
        setconversation_id(conversation_id || null);

        // Also load the conversations list from cache if available
        const cachedConversationsString = localStorage.getItem(
          "chatbot_conversations"
        );
        if (cachedConversationsString) {
          const cachedConversations = JSON.parse(cachedConversationsString);
          if (isCacheValid(cachedConversations.timestamp)) {
            setConversations(
              Array.isArray(cachedConversations.data)
                ? cachedConversations.data
                : []
            );
            return;
          }
        }
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
        throw new Error(
          `Failed to get chatbot response: ${response.status} - ${errorText}`
        );
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

      // 👇 Only prepend the conversation to state/cache if it's new
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
  const clearCache = () => {
    setMessages([]);
    setconversation_id(null);
    localStorage.removeItem("chatbot_conversation");
    localStorage.removeItem("chatbot_conversations");
  };

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

          if (isCacheValid(cachedConversations.timestamp)) {
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
    <div className="flex flex-1 bg-[#F9FBF9] overflow-hidden mt-[4.25rem] min-h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)]">
      {/* Chat History Bar - Expanded or Skinny */}
      <div
        className={`
          ${sidebarCollapsed ? "w-20" : "w-1/5"}
          transition-width duration-300 ease-in-out
          p-4 bg-gray-100 rounded-3xl border m-10
          flex flex-col justify-between
          overflow-hidden
        `}
      >
        {/* Top section */}
        <div className="flex flex-col space-y-4">
          {/* Button row when expanded */}
          {!sidebarCollapsed && (
            <div className="flex space-x-2 mb-2">
              <button
                className="flex items-center space-x-2 p-2 px-4 rounded-3xl bg-[#C1E3CB] text-black hover:text-gray-700 text-base font-semibold flex-grow"
                onClick={startNewChat}
              >
                <MessageCirclePlusIcon size={20} />
                <span>Start new chat</span>
              </button>
              <button
                className="p-2 rounded-3xl bg-[#C1E3CB] text-black hover:text-gray-700 min-w-10 min-h-10 flex items-center justify-center"
                onClick={toggleSidebar}
                aria-label="Collapse sidebar"
              >
                <ArrowLeftToLineIcon size={20} />
              </button>
            </div>
          )}

          {/* Button column when collapsed */}
          {sidebarCollapsed && (
            <>
              <button
                className="p-3 rounded-full bg-[#C1E3CB] text-black hover:text-gray-700 mx-auto mb-4 w-12 h-12 flex items-center justify-center"
                onClick={toggleSidebar}
                aria-label="Expand sidebar"
              >
                <ArrowRightToLineIcon size={20} />
              </button>

              <button
                className="p-3 rounded-full bg-[#C1E3CB] text-black hover:text-gray-700 mx-auto w-12 h-12 flex items-center justify-center"
                onClick={startNewChat}
                aria-label="Start new chat"
              >
                <MessageCirclePlusIcon size={20} />
              </button>
            </>
          )}
        </div>

        {/* Middle section - Conversation list (only visible when expanded) */}
        {!sidebarCollapsed && (
          <div className="flex-grow overflow-y-auto my-4">
            {chatHistoryLoad && (
              <p className="text-gray-600">Loading conversations...</p>
            )}
            {error && <p className="text-red-500">{error}</p>}

            <ul className="space-y-2">
              {Array.isArray(conversations) && conversations.length > 0 ? (
                conversations.map((conv) => {
                  // Use the first message to represent the conversation topic
                  const firstMessage =
                    conv.messages?.[0]?.content || "No messages";
                  const truncatedMessage =
                    firstMessage.length > 50
                      ? firstMessage.substring(0, 50) + "..."
                      : firstMessage;

                  return (
                    <li
                      key={conv.conversation_id}
                      className={`p-2 cursor-pointer rounded hover:bg-[#c1d1c7] transition-colors ${
                        conversation_id === conv.conversation_id
                          ? "bg-[#d2e2d8] text-black"
                          : "bg-white text-black"
                      }`}
                      onClick={() =>
                        loadConversation(conv.conversation_id, conv.messages)
                      }
                    >
                      {truncatedMessage}
                    </li>
                  );
                })
              ) : (
                <li className="p-2 text-gray-500">
                  No conversations available
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Bottom section - Reset cache button (only visible when collapsed) */}
        {sidebarCollapsed && (
          <div className="mt-auto pt-4">
            <button
              onClick={clearCache}
              className="p-3 rounded-full bg-[#C1E3CB] text-black hover:text-gray-700 mx-auto w-12 h-12 flex items-center justify-center"
              aria-label="Reset cache"
            >
              <RefreshCcwIcon size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Main chat area */}
      <div
        className={`
          ${sidebarCollapsed ? "w-full pr-24" : "w-3/4"}
          transition-width duration-300 ease-in-out
          flex flex-col flex-1 p-5 relative overflow-hidden
        `}
      >
        <div className="rounded-full bg-[#0F172A] w-full p-3 mt-4 mb-4 flex items-center">
          <img
            src="/ProblemReportIcon.png"
            alt="ProblemReportIcon"
            className="h-6 w-auto pl-2 pr-2"
          />
          <span className="text-white">
            This app is still in development. If you have any issues or
            feedback,
            <a
              href="https://docs.google.com/forms/d/1RX5YAecyJPVdbU_czip_rPm9d3w1LCLwwQVg06hG-dQ/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5AED86] underline ml-1"
            >
              please click here
            </a>
          </span>
        </div>
        {/* Chat container */}
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="w-full bg-[#F4F4F4] rounded-xl border flex flex-col flex-grow overflow-hidden">
            <div
              ref={chatContainerRef}
              className="flex-1 p-3 overflow-y-auto space-y-2 flex flex-col items-center"
            >
              {messages.length === 0 && !chatLoad ? (
                <p className="text-gray-500 text-lg">
                  Please say something to start
                </p>
              ) : (
                messages.map((msg, index) => <MessageDisplay key={index} message={msg} />)
              )}

              {chatLoad && !chatError && (
                <div className="p-3 rounded-lg bg-[#E5E4E4] text-black self-start mr-auto border border-[#CBD5E1] w-fit max-w-sm">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              )}
              {chatError && (
                <div className="text-red-500 font-semibold">{chatError}</div>
              )}
            </div>
          </div>
          {/* Query Container */}
          <div className="w-full flex flex-row items-center justify-center p-3 border-t mt-4">
            <button
              className={`p-3 rounded-full mr-2 ${
                !generateSchedule ? "bg-[#5AED86]" : "bg-[#D3E2D8]"
              }`}
              onClick={() => setGenerateSchedule(false)}
              aria-label="Set to False"
            >
              <GraduationCapIcon size={24} className="text-black" />
            </button>

            <button
              className={`p-3 rounded-full mr-2 ${
                generateSchedule ? "bg-[#5AED86]" : "bg-[#D3E2D8]"
              }`}
              onClick={() => setGenerateSchedule(true)}
              aria-label="Set to True"
            >
              <CalendarSearchIcon size={24} className="text-black" />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Ask a question..."
              aria-label="Chat input field"
              className="w-full p-2 mr-2 border rounded-3xl resize-none overflow-auto-y focus:outline-none min-h-0 max-h-28" // Added right margin (mr-2)
              onChange={(e) => {
                setQuery(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={handleEnter}
              value={query}
              disabled={chatHistoryLoad}
            />

            <button
              className="bg-[#5AED86] text-black p-2 rounded-3xl hover:bg-[#4dca73] transition-colors disabled:opacity-50"
              onClick={() => handleSendQuery()}
              disabled={chatHistoryLoad || !query.trim()}
            >
              <CornerRightUpIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
