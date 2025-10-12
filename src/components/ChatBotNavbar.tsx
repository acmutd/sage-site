import { Link, useLocation} from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Route, Menu, MessagesSquare, MessageCirclePlusIcon, ArrowLeftFromLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { chatEventEmitter } from "../utils/chatEventEmitter";

interface Message {
  role: "user" | "bot";
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

const ChatBotNavbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [isInWebapp, setIsInWebapp] = useState(false);

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openBtnRef = useRef<HTMLButtonElement | null>(null);

  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<string | null>(null);

  // Mobile navbar state
  const [conversation_id, setconversation_id] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatHistoryLoad, setChatHistoryLoad] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CRUD_API = import.meta.env.VITE_CRUD_API;

  // Helper function to group conversations by date
  const groupConversationsByDate = (convs: Conversation[]) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todayChats: Conversation[] = [];
    const pastChats: Conversation[] = [];
    
    convs.forEach(conv => {
      const lastMessageTime = conv.messages?.[conv.messages.length - 1]?.timestamp;
      if (lastMessageTime) {
        const messageDate = new Date(lastMessageTime);
        if (messageDate >= todayStart) {
          todayChats.push(conv);
        } else {
          pastChats.push(conv);
        }
      } else {
        // If no timestamp, put in past chats
        pastChats.push(conv);
      }
    });
    
    return { todayChats, pastChats };
  };

  // Rename conversation function - matches desktop version exactly
  const renameConversation = async (conversationId: string, newTitle: string) => {
    if (!user?.uid) {
      console.warn("User ID is missing. Cannot rename conversation.");
      return;
    }
    setError(null);

    try {
      console.log('Mobile navbar: Starting rename for conversation:', conversationId, 'to:', newTitle);

      // Optimistic state update - same as desktop
      setConversations((prev) => {
        const updated = prev.map((conv) => 
          conv.conversation_id === conversationId 
            ? { ...conv, title: newTitle, conversation_name: newTitle } 
            : conv
        );
        console.log('Mobile navbar: Updated conversations:', updated.length);
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
          console.log('Mobile navbar: Updated localStorage cache');
        }
      }

      if (!CRUD_API) throw new Error("CRUD_API environment variable is missing.");
      const token = await user.getIdToken();
      if (!token) throw new Error("Failed to retrieve authentication token.");

      console.log('Mobile navbar: Making API call to rename conversation');
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
        console.error('Mobile navbar API Error:', response.status, errorText);
        throw new Error(`Failed to rename conversation: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Mobile navbar: Rename successful:', result);
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to rename conversation";
      setError(msg);
      console.error("Mobile navbar: Error renaming conversation:", err);
    }
  };

  // Helper function to truncate text with ellipsis
  const truncateText = (text: string, maxLength: number = 24) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Render conversation list item
  const renderConversationItem = (conv: Conversation) => {
    const displayName = conv.title || conv.conversation_name || conv.messages?.[0]?.content || "No messages";
    const active = conversation_id === conv.conversation_id;
    const displayText = truncateText(displayName, 32);
    
    return (
      <li key={conv.conversation_id}>
        <div className="flex items-center gap-2">
          <button
            className={`flex-1 text-left rounded-sm px-3 py-2 ${active ? "bg-secondary" : "bg-bglight"} transition-colors`}
            onClick={() => {
              // Update active conversation in mobile navbar
              setconversation_id(conv.conversation_id);
              
              // Emit event to load conversation in main ChatBot component
              chatEventEmitter.emit('loadConversation', {
                conversationId: conv.conversation_id,
                messages: conv.messages,
                userId: user?.uid
              });
              setSidebarOpen(false);
            }}
            title={displayName} // Show full text on hover
          >
            <small className="truncate block">{displayText}</small>
          </button>
          
          {/* Rename button */}
          <button
            className="p-1 rounded text-textsecondary hover:text-textdark hover:bg-gray-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setConversationToRename(conv.conversation_id);
              setNewName(displayName);
              setShowRenameModal(true);
            }}
            aria-label="Rename conversation"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
      </li>
    );
  };

  // ---------- helpers from chatbot.tsx ----------
  const isCacheValid = (timestamp: number, cacheUserId: any, cacheValidFor: number): boolean => {
    if (!user?.uid || !timestamp || !cacheUserId) return false;
    const currentTime = Date.now();
    return currentTime - timestamp < cacheValidFor && user.uid === cacheUserId;
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


  const fetchConversation = async () => {
    if (!user?.uid) {
      console.warn("User ID is missing. Cannot fetch conversations.");
      return;
    }

    setChatHistoryLoad(true);
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
          setChatHistoryLoad(false);
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
      setChatHistoryLoad(false);
    }
  };


  const initialLoad = async () => {
    if (!user?.uid) return;

    const cachedData = localStorage.getItem("chatbot_conversation");
    if (cachedData) {
      const { conversation_id, timestamp, cacheUserId } = JSON.parse(cachedData);

      if (timestamp && cacheUserId && isCacheValid(timestamp, cacheUserId, CONVERSATION_CACHE_EXPIRATION_TIME)) {
        setconversation_id(conversation_id || null);

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
  // ---------- end helpers ----------

  // Route-based style
  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/forgot-password") {
      setIsInWebapp(false);
    } else {
      setIsInWebapp(true);
    }
  }, [location]);

  // ESC to close + no body scroll when open
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setSidebarOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
  }, [sidebarOpen]);

  // Load conversations independently on mount
  useEffect(() => {
    initialLoad();
  }, []); // eslint-disable-line

  // Mobile navbar is now independent - no need to listen for desktop updates

  return (
    <>
      {/* Standard navbar (desktop) */}
      <nav
        className={`
          ${isInWebapp ? "bg-bglight border-b-[1px] shadow-sm" : ""} 
          py-4 px-6 fixed w-full z-10 hidden md:block
        `}
      >
        <div className="flex items-center justify-between w-full">
          <Link to="/" className="ml-0">
            <img src={isInWebapp ? "/Sage_Logo_Dark.svg" : "/Sage_Logo_Light.svg"} alt="SAGE" className="h-8 w-auto" />
          </Link>
          <ul className="flex items-center space-x-6 mr-0">
            <li className="flex-row">
              <Link
                to="/planner"
                className={`${isInWebapp ? "text-textdark hover:text-gray-500" : "text-textlight hover:text-gray-200"} flex items-center gap-2`}
              >
                <Route className="stroke-accent" />
                Plan your degree
              </Link>
            </li>
            <li>
              {user ? (
                <button
                  onClick={logout}
                  className="bg-destructive text-textlight text-base px-6 py-1.5 rounded-full font-semibold hover:bg-red-700 transition duration-300"
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/login"
                  className="bg-accent text-textdark text-base px-8 py-3 rounded-full font-semibold hover:bg-buttonhover transition duration-300"
                >
                  Login
                </Link>
              )}
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile navbar */}
      <nav
        className={`
          ${isInWebapp ? "bg-bglight" : ""} 
          py-4 px-6 fixed w-full h-[4.2rem] z-20 md:hidden block
        `}
      >
        <div className="flex items-center justify-between w-full">
          {/* Open sidebar */}
          <button
            ref={openBtnRef}
            onClick={() => {
              setSidebarOpen(true);
            }}
            aria-label="Open sidebar"
            aria-expanded={sidebarOpen}
            className="p-2 rounded-md outline-none"
          >
            <MessagesSquare className={isInWebapp ? "stroke-textdark" : "stroke-textlight"} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Menu className={isInWebapp ? "stroke-textdark" : "stroke-textlight"} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={`bg-bglight flex flex-col p-2 gap-2 mr-6 items-center rounded-sm`}
            >
              <DropdownMenuItem className="focus:bg-innercontainer w-full">
                <Link
                  to="/planner"
                  className={`text-textdark hover:text-gray-700 flex flex-row w-full justify-start items-center gap-2`}
                >
                  <Route className="stroke-accent" />
                  Plan your degree
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-innercontainer w-full">
                {user ? (
                  <button
                    onClick={logout}
                    className="bg-destructive w-full text-textlight text-base px-6 py-1.5 rounded-full font-semibold hover:bg-red-700 transition duration-300"
                  >
                    Sign Out
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="flex-1 text-center bg-accent text-textdark text-base px-8 py-3 rounded-full font-semibold hover:bg-buttonhover transition duration-300"
                  >
                    Login
                  </Link>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-30 md:hidden transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setSidebarOpen(false)}
        style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
      />

      {/* Sidebar — from LEFT, NO SHADOW */}
      <aside
        role="dialog"
        aria-modal="true"
        className={`
          fixed left-0 top-0 h-full w-[84%] max-w-[22rem] z-40 md:hidden
          ${isInWebapp ? "bg-bglight text-textdark" : "bg-bglight text-textdark"}
          border-r
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="ml-0" onClick={() => setSidebarOpen(false)}>
            <img
              src={isInWebapp ? "/Sage_Logo_Dark.svg" : "/Sage_Logo_Light.svg"}
              alt="SAGE"
              className="h-8 w-auto"
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="p-2 rounded-md outline-none"
          >
            <ArrowLeftFromLine />
          </button>
        </div>

        {/* Sidebar content: New Chat + Conversation list */}
        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-3.25rem)]" style={{ scrollbarWidth: "none" }}>
          <button
            className="w-full flex transition-all duration-100 items-center justify-center space-x-2 py-2 px-6 rounded-3xl bg-accent text-textdark hover:text-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              // Create new conversation and add to mobile navbar's list
              const newConversationId = `conversation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const newConversation: Conversation = {
                conversation_id: newConversationId,
                user_id: user?.uid || "test-user-123",
                messages: [],
                title: "New Chat"
              };
              
              // Add to mobile navbar's conversation list
              setConversations(prev => [newConversation, ...prev]);
              setconversation_id(newConversationId);
              
              // Emit event to trigger new chat in main ChatBot component
              chatEventEmitter.emit('startNewChat');
              setSidebarOpen(false);
            }}
          >
            <MessageCirclePlusIcon size={24} />
            <span>Start new chat</span>
          </button>

          {/* Conversations */}
          {chatHistoryLoad && <p className="text-textsecondary text-sm">Loading conversations...</p>}
          {error && <p className="text-destructive text-sm">{error}</p>}

          {Array.isArray(conversations) && conversations.length > 0 ? (
            (() => {
              const { todayChats, pastChats } = groupConversationsByDate(conversations);
              
              return (
                <div className="space-y-4">
                  {/* Today's Chats */}
                  {todayChats.length > 0 && (
                    <div>
                      <h3 className="text-[22px] mb-4">
                        Today
                      </h3>
                      <ul className="flex flex-col gap-2">
                        {todayChats.map(renderConversationItem)}
                      </ul>
                    </div>
                  )}
                  
                  {/* Past Chats */}
                  {pastChats.length > 0 && (
                    <div>
                      <h3 className="text-[22px] mb-4">
                        Past Chats
                      </h3>
                      <ul className="flex flex-col gap-2">
                        {pastChats.map(renderConversationItem)}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div>
              <small className="text-textsecondary">No conversations yet</small>
            </div>
          )}
        </div>
      </aside>

      {/* Rename Modal */}
      {showRenameModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowRenameModal(false)}
        >
          <div
            className="bg-white p-6 rounded-md shadow-lg w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-textdark">
              Rename Conversation
            </h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent mb-4"
              placeholder="Enter new conversation name..."
              autoFocus
            />
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                onClick={() => {
                  setShowRenameModal(false);
                  setConversationToRename(null);
                  setNewName("");
                }}
                disabled={renaming}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-accent text-textdark rounded hover:bg-buttonhover disabled:opacity-50"
                onClick={async () => {
                  if (!conversationToRename || !newName.trim()) return;
                  setRenaming(true);
                  try {
                    await renameConversation(conversationToRename, newName.trim());
                    setShowRenameModal(false);
                    setConversationToRename(null);
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
    </>
  );
};

export default ChatBotNavbar;
