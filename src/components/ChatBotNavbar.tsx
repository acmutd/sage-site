import { Link, useLocation} from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Route, Menu, MessagesSquare, MessageCirclePlusIcon, ArrowLeftFromLine, Pencil, Trash2Icon, MessageCirclePlus, UserRound} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { chatEventEmitter } from "../utils/chatEventEmitter";
import { useChatbot } from "../hooks/useChatbot";

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

// check environment
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT as string | undefined;

const ChatBotNavbar = () => {
  const { user, logout  } = useAuth();
  const location = useLocation();

  const { 
    conversations, 
    conversation_id, 
    error, 
    loading,
    setConversations,
    deleteConversation,
    renameConversation,
    setConversationId,
    initialLoad
  } = useChatbot();



  const [isInWebapp, setIsInWebapp] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string>("");

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openBtnRef = useRef<HTMLButtonElement | null>(null);

  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<string | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    initialLoad();
  }, []);

  // check pfp 
  useEffect(() => {
    const updateProfilePicture = () => {
      const cachedType = localStorage.getItem('profilePictureType');
      if (cachedType) {
        const type = parseInt(cachedType);
        if (type === 0 && user?.photoURL) {
          setProfilePicture(user.photoURL);
        } else {
          setProfilePicture(`/assets/profile_pics/${type}.png`);
        }
      } else if (user?.photoURL) {
        setProfilePicture(user.photoURL);
      }
    };
  
    updateProfilePicture();
    window.addEventListener('storage', updateProfilePicture);
    
    return () => window.removeEventListener('storage', updateProfilePicture);
  }, [user?.photoURL]);
  
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

  // Helper function to truncate text with ellipsis
  const truncateText = (text: string, maxLength: number = 24) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Render conversation list item
  const renderConversationItem = (conv: Conversation) => {
    const displayName = conv.title || conv.conversation_name || conv.messages?.[0]?.content || "No messages";
    const active = conversation_id === conv.conversation_id;
    const displayText = truncateText(displayName, 20);
    
    return (
      <li key={conv.conversation_id}>
        <div className="flex items-center gap-2">
          <button
            className={`flex-1 text-left rounded-sm px-3 py-2 ${active ? "bg-secondary" : "bg-bglight"} transition-colors`}
            onClick={() => {
              // Update active conversation in mobile navbar
              setConversationId(conv.conversation_id);
              
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
          
          {/* Action buttons */}
          <div className="flex gap-1">
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
              <Pencil/>
            </button>
            
            {/* Delete button */}
            <button
              className="p-1 rounded text-textsecondary hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setConversationToDelete(conv.conversation_id);
                setShowDeleteModal(true);
              }}
              aria-label="Delete conversation"
            >
              <Trash2Icon className="stroke-destructive"/>
            </button>
          </div>
        </div>
      </li>
    );
  };

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
      <>
        {ENVIRONMENT === 'development' && (
              <div className="fixed top-0 left-0 right-0 h-4 bg-purple-600 text-white text-center text-xs font-medium z-[200] shadow-sm flex items-center justify-center">
                Dev Environment
              </div>
        )}

        <nav className={`
                  ${isInWebapp ? "bg-bglight border-b-[1px] shadow-sm" : undefined} 
                  py-2.5 px-6 fixed w-full z-10 hidden md:block
                  ${ENVIRONMENT === 'development' ? 'top-4' : 'top-0'}
        `}>
                <div className="flex items-center justify-between w-full">
                  <Link to="/" className="ml-0">
                    <img src={isInWebapp ? "/Sage_Logo_Dark.svg" : "/Sage_Logo_Light.svg"} alt="SAGE" className="h-8 w-auto" />
                  </Link>
                  <ul className="flex items-center space-x-6 mr-0">
                    <li className="flex-row">
                      <Link
                        to="/planner"
                        className={`${isInWebapp ? "text-textdark hover:text-gray-500" : "text-textlight hover:text-gray-200"}
                        flex items-center gap-2`}
                      >
                        <Route className="stroke-accent" />
                        Plan your degree
                      </Link>
                    </li>
                    <li className="flex-row">
                      <Link
                        to="/chatbot"
                        className={`${isInWebapp ? "text-textdark hover:text-gray-500" : "text-textlight hover:text-gray-200"}
                        flex items-center gap-2 hover:text-gray-200"`}
                      >
                        <MessageCirclePlus className="stroke-accent" />
                        Start a chat
                      </Link>
                    </li>
                    <li>
                      {user ? (
                        // If user is logged in, show Sign Out button
                        // <button
                        //   onClick={logout} // Calls logout function
                        //   className="bg-destructive text-textlight text-base px-6 py-1.5 rounded-full font-semibold hover:bg-red-700 transition duration-300"
                        // >
                        //   Sign Out
                        // </button>
                        
                        //if user is loggin in, show menu icon
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <div className="${!profilePicture ? 'bg-secondary' : ''} p-2 rounded-full">
                            {profilePicture ? (
                              <img 
                                src={profilePicture} 
                                alt="Profile" 
                                className="w-9 h-9 rounded-full object-cover justify-center"
                              />
                            ) : (
                              <UserRound className="stroke-textdark"/>
                            )}
                            </div>
                          </DropdownMenuTrigger>
                            <DropdownMenuContent
                              className={`bg-bglight flex flex-col p-2 gap-2 mr-6 items-center rounded-sm`}
                            >
                              <DropdownMenuItem className="focus:bg-innercontainer w-full">
                              <Link
                              to="/profile"
                              className={`text-textdark hover:text-gray-700 flex flex-row w-full justify-start items-center gap-2`}
                              >
                              <UserRound className="stroke-accent" />
                              Your Profile
                            </Link>
                              </DropdownMenuItem>

                              <DropdownMenuItem className="focus:bg-innercontainer w-full">
                                <button
                                  onClick={logout} // Calls logout function
                                  className="bg-destructive text-textlight text-base px-6 py-1.5 rounded-full font-semibold hover:bg-red-700 transition duration-300"
                                >
                                  Sign Out
                                </button>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        // If no user, show Login button
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
      </>

      {/* Mobile navbar */}
      <nav className={`
        ${isInWebapp ? "bg-bglight border-b-[1px] shadow-sm" : undefined} 
        py-4 px-6 fixed w-full h-[4.2rem] z-10 md:hidden block
        ${ENVIRONMENT === 'development' ? 'top-4' : 'top-0'}
      `}>
        
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
                <Link
                  to="/chatbot"
                  className={`
                    ${isInWebapp
                      ? "text-textdark hover:text-gray-700"
                      : "text-textdark hover:text-gray-700"}
                flex flex-row w-full justify-start items-center gap-2 hover:text-gray-200 `}
                >
                  <MessageCirclePlus className="stroke-accent" />
                  Start a chat
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem className="focus:bg-innercontainer w-full">
                      <Link
                      to="/profile"
                      className={`text-textdark hover:text-gray-700 flex flex-row w-full justify-start items-center gap-2`}
                      >
                      <UserRound className="stroke-accent" />
                      Your Profile
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
              const currentTime = Date.now();
              const newConversation: Conversation = {
                conversation_id: newConversationId,
                user_id: user?.uid || "test-user-123",
                messages: [{
                  role: "user",
                  content: "New Chat",
                  timestamp: currentTime
                }],
                title: "New Chat"
              };
              
              // Add to mobile navbar's conversation list
              setConversations(prev => [newConversation, ...prev]);
              setConversationId(newConversationId);
              
              // Emit event to trigger new chat in main ChatBot component
              chatEventEmitter.emit('startNewChat');
              setSidebarOpen(false);
            }}
          >
            <MessageCirclePlusIcon size={24} />
            <span>Start new chat</span>
          </button>

          {/* Conversations */}
          {loading && <p className="text-textsecondary text-sm">Loading conversations...</p>}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white p-6 rounded-md shadow-lg w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-textdark">
              Are you sure you want to delete this conversation?
            </h3>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                onClick={() => {
                  setShowDeleteModal(false);
                  setConversationToDelete(null);
                }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                onClick={async () => {
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
    </>
  );
};

export default ChatBotNavbar;
