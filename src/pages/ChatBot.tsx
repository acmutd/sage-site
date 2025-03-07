import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeftToLineIcon,
  ArrowRightToLineIcon,
  CornerRightUpIcon,
  MessageCirclePlusIcon,
  RefreshCcwIcon,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid"; // Import UUID generator

const ChatBot = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [conversation_id, setconversation_id] = useState<string | null>(null);
  const [conversations, setConversations] = useState<
    { conversation_id: string; user_id: string; messages: any[] }[]
  >([]);
  const [chatHistoryLoad, setChatHistoryLoad] = useState(false);
  const [chatLoad, setChatLoad] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isNewConversation, setIsNewConversation] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const CHAT_API = import.meta.env.VITE_CHAT_API;
  const GET_CONVERSATIONS_API = import.meta.env.VITE_GET_CONVERSATIONS_API;

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

  // Fetch conversation data from Lambda (instead of directly from S3)
  const fetchConversation = async () => {
    if (!user?.uid) return;
    setChatHistoryLoad(true);
    setError(null);

    try {
      // Call the Lambda function to get conversations
      const response = await fetch(GET_CONVERSATIONS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // userId: user?.uid,

          // This is for testing
          userId: "test-user-123",
          action: "getConversations", // Specify the action to get conversations
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch conversations");

      const data = await response.json();
      setConversations(data || []);

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
      // Save the existing conversation before starting a new one
      setConversations((prevConversations) => {
        // Ensure the conversation isn't duplicated
        const filteredConversations = prevConversations.filter(
          (conv) => conv.conversation_id !== conversation_id
        );

        return [
          ...filteredConversations,
          {
            conversation_id,
            user_id: user?.uid || "test-user-123",
            messages,
          },
        ];
      });
    }

    // Generate a new conversation ID
    const newConversationId = `conversation_${uuidv4()}`;

    loadConversation(newConversationId, []);
    setIsNewConversation(true);

    localStorage.setItem(
      "chatbot_conversation",
      JSON.stringify({ messages: [], conversation_id: newConversationId })
    );
  };

  const loadConversation = async (id: string, messages: any[]) => {
    setconversation_id(id);
    setMessages(messages);
    localStorage.setItem(
      "chatbot_conversation",
      JSON.stringify({ messages, conversation_id: id })
    );
  };

  const initialLoad = async () => {
    if (!user?.uid) return;

    const cachedData = localStorage.getItem("chatbot_conversation");
    if (cachedData) {
      const { messages, conversation_id } = JSON.parse(cachedData);
      setMessages(messages || []);
      setconversation_id(conversation_id || null);
    } else {
      const data = await fetchConversation();
      const lastConversation = data.length - 1;
      const { messages, conversation_id } = data[lastConversation];
      setMessages(messages || []);
      setconversation_id(conversation_id || null);

      localStorage.setItem(
        "chatbot_conversation",
        JSON.stringify({ messages, conversation_id })
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
    if (!query.trim()) return;

    setChatLoad(true);

    const userMessage = { role: "user", content: query };
    setMessages((prev) => {
      const updatedMessages = [...prev, userMessage];

      // Save updated conversation to localStorage
      localStorage.setItem(
        "chatbot_conversation",
        JSON.stringify({ messages: updatedMessages, conversation_id })
      );

      return updatedMessages;
    });

    const requestBody: any = {
      // userId: user?.uid,

      // This is for testing
      id: "test-user-123",
      query: query,
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

      if (!response.ok) throw new Error("Failed to get chatbot response");

      const data = await response.json();
      const botMessage = { role: "bot", content: data.response };

      setMessages((prev) => {
        const updatedMessages = [...prev, botMessage];

        // Save updated conversation to localStorage
        localStorage.setItem(
          "chatbot_conversation",
          JSON.stringify({
            messages: updatedMessages,
            conversation_id: data.conversation_id || conversation_id,
          })
        );

        return updatedMessages;
      });

      // Update the conversation ID if returned by the API
      if (data.conversation_id && data.conversation_id !== conversation_id) {
        setconversation_id(data.conversation_id);
      }

      if (isNewConversation) {
        try {
          await fetchConversation(); // triggers your reloading logic
        } catch (error) {
          console.error(
            "Error fetching conversation after first message:",
            error
          );
        }
        setIsNewConversation(false); // No longer new after the first message
      }

      setChatLoad(false);
    } catch (error) {
      console.error("Error sending query:", error);
    }
  };

  // This is used for testing purposes
  const clearCache = () => {
    setMessages([]);
    setconversation_id(null);
    localStorage.removeItem("chatbot_conversation");
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
            })
          );
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };

    reloadChatHistory();
  }, [conversation_id]); // Runs every time conversation_id changes

  return (
    <div className="flex flex-1 bg-[#F9FBF9] overflow-hidden">
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
              {conversations.map((conv) => (
                <li
                  key={conv.conversation_id}
                  className={`p-2 cursor-pointer rounded hover:bg-blue-400 transition-colors ${
                    conversation_id === conv.conversation_id
                      ? "bg-blue-500 text-black"
                      : "bg-white text-black"
                  }`}
                  onClick={() =>
                    loadConversation(conv.conversation_id, conv.messages)
                  }
                >
                  {conv ? conv.conversation_id : "dne"}
                </li>
              ))}
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
        {/* Chat container */}
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="w-full bg-[#F4F4F4] rounded-xl border flex flex-col flex-grow overflow-hidden">
            <div
              ref={chatContainerRef}
              className="flex-1 p-3 overflow-y-auto space-y-2"
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border border-[#CBD5E1] w-fit max-w-sm ${
                    msg.role === "user"
                      ? "bg-[#F9FBF9] text-black self-end ml-auto"
                      : "bg-[#E5E4E4] text-black self-start mr-auto"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {chatLoad && (
                <div className="p-3 rounded-lg bg-[#E5E4E4] text-black self-start mr-auto border border-[#CBD5E1] w-fit max-w-sm">
                  <span className="animate-pulse">Chatbot is typing...</span>
                </div>
              )}
              {error && (
                <div className="text-red-500 text-center p-2">{error}</div>
              )}
            </div>
          </div>
          {/* Query Container */}
          <div className="w-full flex flex-row items-center justify-center p-3 border-t mt-4">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Ask a question..."
              aria-label="Chat input field"
              className="w-full p-2 mr-4 border rounded-3xl resize-none overflow-auto-y focus:outline-none min-h-0 max-h-28"
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
