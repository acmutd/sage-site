import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useUIStore } from "@/stores/uiStore";
import {
  CornerRightUpIcon,
  GraduationCapIcon,
  CalendarSearchIcon,
  HelpCircle,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import MessageDisplay from "@/components/chatbot/MessageDisplay";
import { useChatbotStore } from "@/stores/chatbotStore";
import type { Message, Conversation } from "@/types/chat";
import { useChatbotTutorial } from "@/hooks/useChatbotTutorial";
import ChatSidebarShell from "@/components/chatbot/ChatSidebarShell";

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
      } catch { /* plain string */ }
    }
    return msg;
  });

const sortConversationsByDate = (convs: Conversation[]): Conversation[] =>
  [...convs].sort((a, b) => {
    const aTime = new Date(a.messages?.[a.messages.length - 1]?.timestamp || 0).getTime();
    const bTime = new Date(b.messages?.[b.messages.length - 1]?.timestamp || 0).getTime();
    return bTime - aTime;
  });

const CHAT_API = import.meta.env.VITE_CHAT_API as string | undefined;

const ChatBot: React.FC = () => {
  const { user, hasSeenChatbotTutorial } = useAuth();
  const {
    conversations,
    activeConversationId,
    loading,
    initialLoad,
    setActiveConversationId,
    startNewChat: storeStartNewChat,
    setActiveMessages,
    setConversations,
  } = useChatbotStore();

  const [query, setQuery] = useState("");
  const handleClickQueryFlag = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => { setActiveMessages(messages); }, [messages, setActiveMessages]);

  const { startTutorial } = useChatbotTutorial({ user, hasSeenTutorial: hasSeenChatbotTutorial });

  const [chatLoad, setChatLoad] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarCollapsedDelayed, setSidebarCollapsedDelayed] = useState(false);
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [generateSchedule, setGenerateSchedule] = useState(false);
  const [mobileView, setMobileView] = useState(false);

  const { chatSidebarWidth, setChatSidebarWidth } = useUIStore();
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

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
    setSidebarCollapsed((prev) => !prev);
    const delay = sidebarCollapsed ? 80 : 0;
    setTimeout(() => setSidebarCollapsedDelayed((prev) => !prev), delay);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    if (sidebarCollapsed) return;
    isResizingRef.current = true;
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = chatSidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.min(480, Math.max(384, startWidth.current + (e.clientX - startX.current)));
      setChatSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (sidebarRef.current) setChatSidebarWidth(sidebarRef.current.offsetWidth);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [setChatSidebarWidth]);

  const handleStartNewChat = () => {
    setChatError(null);
    setMessages([]);
    setIsNewConversation(true);
    storeStartNewChat();

    localStorage.setItem(
      "chatbot_conversation",
      JSON.stringify({
        messages: [],
        conversation_id: null,
        timestamp: Date.now(),
        cacheUserId: user?.uid ?? null,
      })
    );

    if (chatContainerRef.current) chatContainerRef.current.scrollTop = 0;
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  const handleSendQuery = async () => {
    if (!query.trim() || query.trim().length > 500) return;

    setChatLoad(true);
    setChatError(null);

    const userMessage: Message = { role: "user", content: query, timestamp: Date.now() };
    const messagesWithUser = [...messages, userMessage];
    setMessages(messagesWithUser);

    localStorage.setItem(
      "chatbot_conversation",
      JSON.stringify({
        messages: messagesWithUser,
        conversation_id: activeConversationId,
        timestamp: Date.now(),
        cacheUserId: user?.uid ?? null,
      })
    );

    setQuery("");

    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Failed to retrieve authentication token.");
      if (!CHAT_API) throw new Error("CHAT_API is missing.");

      const requestBody: Record<string, unknown> = {
        id: user?.uid,
        query: userMessage.content,
        generate_schedule: generateSchedule,
        token,
      };
      if (activeConversationId) requestBody.conversation_id = activeConversationId;

      const response = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsed: any = null;
        try { parsed = JSON.parse(errorText); } catch { /* ignore */ }
        if (response.status === 401 && parsed?.error === "Daily query limit reached. Try again tomorrow.") {
          setChatError("Daily query limit reached. Try again tomorrow.");
        } else if (response.status === 404) {
          setChatError("This conversation no longer exists.");
          setActiveConversationId(null);
        } else {
          throw new Error(`Chatbot API ${response.status}: ${errorText}`);
        }
        return;
      }

      const data = await response.json();
      if (!data.response) throw new Error("Chatbot API did not return a response.");

      const botMessage: Message =
        data.type === "email"
          ? { role: "assistant", content: JSON.stringify({ type: "email", variants: data.response.variants }), type: "email", variants: data.response.variants, timestamp: Date.now() }
          : data.type === "schedule"
          ? { role: "assistant", content: JSON.stringify({ type: "schedule", variants: data.response.variants }), type: "schedule", variants: data.response.variants, timestamp: Date.now() }
          : { role: "assistant", content: data.response, timestamp: Date.now() };

      const updatedMessages = [...messagesWithUser, botMessage];
      setMessages(updatedMessages);

      const currentConvId: string = data.conversation_id || activeConversationId || `conversation_${uuidv4()}`;
      setActiveConversationId(currentConvId);

      const existingConv = conversations.find((c) => c.conversation_id === currentConvId);
      const newConv: Conversation = {
        conversation_id: currentConvId,
        user_id: user?.uid || "test-user-123",
        messages: updatedMessages,
        title: existingConv?.title || updatedMessages[0]?.content || "Untitled Conversation",
      };
      setConversations(
        sortConversationsByDate([newConv, ...conversations.filter((c) => c.conversation_id !== currentConvId)]),
        user?.uid
      );

      if (isNewConversation) setIsNewConversation(false);

      localStorage.setItem(
        "chatbot_conversation",
        JSON.stringify({
          messages: updatedMessages,
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
    if (user) initialLoad(user);
    adjustTextareaHeight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "chatbot_conversations" && e.newValue) {
        const cached = JSON.parse(e.newValue);
        if (cached.data) setConversations(cached.data);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [setConversations]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [query]);

  useEffect(() => {
    if (handleClickQueryFlag.current) {
      handleSendQuery();
      handleClickQueryFlag.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    const conv = conversations.find((c) => c.conversation_id === activeConversationId);
    if (!conv) return;
    const hydrated = hydrateMessages(conv.messages || []);
    setMessages(hydrated);
    localStorage.setItem(
      "chatbot_conversation",
      JSON.stringify({
        messages: hydrated,
        conversation_id: activeConversationId,
        timestamp: Date.now(),
        cacheUserId: user?.uid ?? null,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, conversations]);

  const emptyStateAdvising = (
    <div className="w-full max-w-2xl text-left mt-[5rem]">
      <h1>Hi, I'm Sage.</h1>
      <h3>What can I help with?</h3>
      <p className="text-textsecondary mt-8">Here are some example questions that I can help you with:</p>
      <ul className="list-disc list-inside text-textsecondary text-sm space-y-1 pl-4 font-dmsans">
        {advisingExampleQuestions.map((example) => (
          <li key={example.question}>
            <button
              className="text-textdark hover:text-textsecondary cursor-pointer text-left bg-transparent border-none p-0"
              onClick={() => { handleClickQueryFlag.current = true; setQuery(example.question); }}
            >
              {example.question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const emptyStateSchedule = (
    <div className="w-full max-w-2xl text-left mt-[5rem]">
      <h1>Hi, I'm Sage.</h1>
      <h3>Let's start building your schedule!</h3>
      <p className="text-textsecondary mt-8">Here are some example queries for the schedule generator that I can help you with:</p>
      <ul className="list-disc list-inside text-textsecondary text-sm space-y-1 pl-4 font-dmsans">
        {scheduleExampleQuestions.map((example) => (
          <li key={example.question}>
            <button
              className="text-textdark hover:text-textsecondary cursor-pointer text-left bg-transparent border-none p-0"
              onClick={() => { handleClickQueryFlag.current = true; setQuery(example.question); }}
            >
              {example.question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const chatArea = (
    <div className="flex flex-col flex-grow-[1] min-h-0 w-full bg-innercontainer rounded-lg border border-border">
      <div
        ref={chatContainerRef}
        data-clarity-mask="True"
        className="p-8 overflow-y-auto space-y-2 flex flex-col items-center flex-1 min-h-0"
        style={{ scrollbarWidth: "none" }}
      >
        {messages.length === 0 && !chatLoad && !generateSchedule && emptyStateAdvising}
        {messages.length === 0 && !chatLoad && generateSchedule && emptyStateSchedule}
        {messages.length > 0 && messages.map((msg, index) => (
          <MessageDisplay key={index} message={msg} messageIndex={index} conversationId={activeConversationId} />
        ))}
        {chatLoad && !chatError && (
          <div className="p-3 rounded-md bg-[#E5E4E4] text-black self-start mr-auto border border-border w-fit max-w-sm">
            <span className="animate-pulse">Thinking...</span>
          </div>
        )}
        {chatError && <div className="text-red-500 font-semibold">{chatError}</div>}
      </div>
    </div>
  );

  const queryInput = (
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
        onChange={(e) => { setQuery(e.target.value); if (chatError) setChatError(null); }}
        onKeyDown={handleEnter}
        value={query}
        disabled={loading}
      />
      {query.trim().length >= 400 && (
        <div className={`absolute bottom-3 right-6 text-xs font-medium pointer-events-none transition-colors duration-150 ${query.trim().length >= 500 ? "text-red-500" : "text-orange-400"}`}>
          {query.trim().length} / 500
        </div>
      )}
    </div>
  );

  const sendButton = (
    <button
      className="flex h-full max-h-[3rem] justify-center items-center aspect-square bg-accent rounded-full hover:bg-buttonhover transition-colors disabled:opacity-50"
      onClick={handleSendQuery}
      disabled={loading || !query.trim() || query.trim().length > 500}
      aria-label="Send message"
    >
      <CornerRightUpIcon size={24} aria-hidden="true" />
    </button>
  );

  return (
    <main className="flex bg-bglight overflow-hidden py-[4rem] px-6 gap-[2.25rem] mt-[4.2rem] h-[calc(100vh-4.2rem)]">
      <button
        data-tour="help-button"
        aria-label="Chatbot Help"
        onClick={startTutorial}
        className="fixed bottom-4 right-4 w-7 h-7 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center z-50"
      >
        <HelpCircle size={18} className="text-white" aria-hidden="true" />
      </button>

      {mobileView ? (
        <div className="flex justify-center h-full w-full">
          <div className="max-w-[80rem] h-full duration-300 ease-in-out flex flex-col flex-1 relative overflow-visible gap-10 bottom-[3rem]">
            <div className="flex flex-col h-full gap-4">
              {chatArea}
              <div className="w-full flex flex-row gap-4 items-center justify-center">
                {queryInput}
                {sendButton}
              </div>
            </div>
            <small className="absolute w-full flex justify-center bottom-[-4rem] text-textsecondary">
              SAGE does not replace official academic advising and may produce incorrect information.
            </small>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={sidebarRef}
            className={`relative h-full flex flex-col ${isResizing ? "transition-none" : "transition-all duration-100"}`}
            style={sidebarCollapsed ? { width: "5.25rem" } : { width: chatSidebarWidth }}
          >
            <ChatSidebarShell
              isCollapsed={sidebarCollapsed}
              sidebarCollapsedDelayed={sidebarCollapsedDelayed}
              onToggleCollapse={toggleSidebar}
              onStartNewChat={handleStartNewChat}
            />
            {!sidebarCollapsed && (
              <div
                role="separator"
                aria-label="Resize sidebar"
                aria-orientation="vertical"
                tabIndex={0}
                className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-col-resize group/grip z-10 translate-x-1/2"
                onMouseDown={handleResizeStart}
                onKeyDown={(e) => {
                  const step = 10;
                  if (e.key === 'ArrowRight') setChatSidebarWidth(Math.min(480, chatSidebarWidth + step));
                  if (e.key === 'ArrowLeft') setChatSidebarWidth(Math.max(384, chatSidebarWidth - step));
                }}
              >
                <div className="w-1.5 h-10 rounded-full bg-gray-300 opacity-30 group-hover/grip:opacity-100 transition-opacity duration-150 flex flex-col items-center justify-center gap-[3px]">
                  <span className="w-[3px] h-[3px] rounded-full bg-gray-500" />
                  <span className="w-[3px] h-[3px] rounded-full bg-gray-500" />
                  <span className="w-[3px] h-[3px] rounded-full bg-gray-500" />
                  <span className="w-[3px] h-[3px] rounded-full bg-gray-500" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center h-full w-full">
            <div className="max-w-[80rem] h-full duration-300 ease-in-out flex flex-col flex-1 relative overflow-visible gap-6">
              <div className="flex flex-col h-full gap-4">
                {chatArea}

                <div className="w-full flex flex-row gap-4 items-center justify-center">
                  <div data-tour="mode-toggle" className="flex flex-row gap-2 p-2 bg-innercontainer border rounded-full border-border">
                    <div className="relative group/advising">
                      <button
                        className={`p-2 rounded-full mr-2 transition-colors duration-200 ${!generateSchedule ? "bg-accent hover:bg-buttonhover" : "bg-secondary hover:bg-[#A9BFB4]"}`}
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
                        className={`p-2 rounded-full transition-colors duration-200 ${generateSchedule ? "bg-accent hover:bg-buttonhover" : "bg-secondary hover:bg-[#A9BFB4]"}`}
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

                  {queryInput}
                  {sendButton}
                </div>
              </div>

              <small className="absolute w-full flex justify-center bottom-[-2rem] text-textsecondary">
                SAGE does not replace official academic advising and may produce incorrect information.
              </small>
            </div>
          </div>
        </>
      )}
    </main>
  );
};

export default ChatBot;
