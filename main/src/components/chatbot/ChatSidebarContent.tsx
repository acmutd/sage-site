import { MessageCirclePlusIcon, Pencil, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useChatbot } from "@/hooks/useChatbot"
import { useAuth } from "@/context/AuthContext";
import { chatEventEmitter } from "@/utils/chatEventEmitter";
import type { Conversation } from "@/types/chat";

interface ChatSidebarContentProps {
  onClose?: () => void;
  layout?: "mobile" | "template";
  chatHook?: any;
}

const ChatSidebarContent: React.FC<ChatSidebarContentProps> = ({ onClose, layout = "mobile", chatHook }) => {
  const { user } = useAuth();
  const chat = chatHook ?? useChatbot();
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
  } = chat;

  // Modal states
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Only run initialLoad when this component owns its hook instance.
    if (!chatHook) initialLoad();
  }, []);
  
  useEffect(() => {
    // Sync conversations from ChatBot when they update
    const handleConversationUpdate = (updatedConversations: Conversation[]) => {
      setConversations(updatedConversations);
    };
  
    // Sync active conversation ID from ChatBot
    const handleActiveConversationUpdate = (newId: string | null) => {
      setConversationId(newId);
    };
  
    chatEventEmitter.on('conversationUpdate', handleConversationUpdate);
    chatEventEmitter.on('activeConversationUpdate', handleActiveConversationUpdate);
    chatEventEmitter.emit('requestConversations'); // Request current state from ChatBot on mount
  
    return () => {
      chatEventEmitter.off('conversationUpdate', handleConversationUpdate);
      chatEventEmitter.off('activeConversationUpdate', handleActiveConversationUpdate);
    };
  }, []);

  const groupConversationsByDate = (convs: Conversation[]) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayChats: Conversation[] = [];
    const pastChats: Conversation[] = [];

    convs.forEach((conv) => {
      const lastMessageTime = conv.messages?.[conv.messages.length - 1]?.timestamp;
      if (lastMessageTime) {
        const messageDate = new Date(lastMessageTime);
        if (messageDate >= todayStart) {
          todayChats.push(conv);
        } else {
          pastChats.push(conv);
        }
      } else {
        pastChats.push(conv);
      }
    });

    return { todayChats, pastChats };
  };

  const truncateText = (text: string, maxLength: number = 24) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

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
              setConversationId(conv.conversation_id);
              chatEventEmitter.emit("loadConversation", {
                conversationId: conv.conversation_id,
                messages: conv.messages,
                userId: user?.uid,
              });
              onClose();
            }}
            title={displayName}
          >
            <small className="truncate block">{displayText}</small>
          </button>

          <div className="flex gap-1">
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
              <Pencil />
            </button>

            <button
              className="p-1 rounded text-textsecondary hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setConversationToDelete(conv.conversation_id);
                setShowDeleteModal(true);
              }}
              aria-label="Delete conversation"
            >
              <Trash2Icon className="stroke-destructive" />
            </button>
          </div>
        </div>
      </li>
    );
  };

  const { todayChats, pastChats } = groupConversationsByDate(conversations);

  const content = (
    <div className="space-y-4">
      {loading && <p className="text-textsecondary text-sm">Loading conversations...</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}

      {Array.isArray(conversations) && conversations.length > 0 ? (
        <div className="space-y-4">
          {todayChats.length > 0 && (
            <div>
              <h3 className="text-[22px] mb-4">Today</h3>
              <ul className="flex flex-col gap-2">{todayChats.map(renderConversationItem)}</ul>
            </div>
          )}

          {pastChats.length > 0 && (
            <div>
              <h3 className="text-[22px] mb-4">Past Chats</h3>
              <ul className="flex flex-col gap-2">{pastChats.map(renderConversationItem)}</ul>
            </div>
          )}
        </div>
      ) : (
        <div>
          <small className="text-textsecondary">No conversations yet</small>
        </div>
      )}
    </div>
  );

  const modals = (
    <>
      {showRenameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowRenameModal(false)}>
          <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-textdark">Rename Conversation</h3>
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

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-textdark">Are you sure you want to delete this conversation?</h3>
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
                    setConversationId(null);
                    chatEventEmitter.emit('startNewChat');
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

  return (
    <>
      {layout === "template" ? (
        <>
          {content}
          {modals}
        </>
      ) : (
        <>
          <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-3.25rem)]" style={{ scrollbarWidth: "none" }}>
            <button
              className="w-full flex transition-all duration-100 items-center justify-center space-x-2 py-2 px-6 rounded-3xl bg-accent text-textdark hover:text-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                const newConversationId = `conversation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const currentTime = Date.now();
                const newConversation: Conversation = {
                  conversation_id: newConversationId,
                  user_id: user?.uid || "test-user-123",
                  messages: [{ role: "user", content: "New Chat", timestamp: currentTime }],
                  title: "New Chat",
                };

                setConversations((prev) => [newConversation, ...prev]);
                setConversationId(newConversationId);
                chatEventEmitter.emit("startNewChat");
                onClose?.();
              }}
            >
              <MessageCirclePlusIcon size={24} />
              <span>Start new chat</span>
            </button>

            {content}
          </div>

          {modals}
        </>
      )}
    </>
  );
};

export default ChatSidebarContent;