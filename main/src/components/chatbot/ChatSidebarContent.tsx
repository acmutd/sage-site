import { MessageCirclePlusIcon, Pencil, Trash2Icon, Ellipsis } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChatbotStore } from "@/stores/chatbotStore";
import { useAuth } from "@/context/AuthContext";
import type { Conversation } from "@/types/chat";

function groupConversationsByDate(convs: Conversation[]) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayChats: Conversation[] = [];
  const pastChats: Conversation[] = [];
  convs.forEach((conv) => {
    const lastMessageTime = conv.messages?.[conv.messages.length - 1]?.timestamp;
    const bucket = lastMessageTime && new Date(lastMessageTime) >= todayStart ? todayChats : pastChats;
    bucket.push(conv);
  });
  return { todayChats, pastChats };
}

interface ChatSidebarContentProps {
  onClose?: () => void;
  onStartNewChat?: () => void;
  layout?: "mobile" | "template";
}

const ChatSidebarContent: React.FC<ChatSidebarContentProps> = ({ onClose, onStartNewChat, layout = "mobile" }) => {
  const { user } = useAuth();
  const {
    conversations,
    activeConversationId,
    error,
    loading,
    setActiveConversationId,
    startNewChat,
    deleteConversation,
    renameConversation,
  } = useChatbotStore();

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [moreOptionsOpenId, setMoreOptionsOpenId] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 });

  const ellipsisButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  useEffect(() => {
    if (moreOptionsOpenId && showContextMenu && contextMenuRef.current) {
      const firstItem = contextMenuRef.current.querySelector<HTMLElement>('[role="menuitem"]');
      firstItem?.focus();
    }
  }, [moreOptionsOpenId, showContextMenu]);

  useEffect(() => { updateContextMenuPosition(); }, [moreOptionsOpenId]);

  useEffect(() => {
    if (!moreOptionsOpenId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node) &&
        ellipsisButtonRefs.current[moreOptionsOpenId] && !ellipsisButtonRefs.current[moreOptionsOpenId]!.contains(e.target as Node)
      ) {
        setMoreOptionsOpenId(null);
        setShowContextMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreOptionsOpenId]);

  function updateContextMenuPosition() {
    if (!moreOptionsOpenId) { setShowContextMenu(false); return; }
    const el = itemRefs.current[moreOptionsOpenId];
    if (el) {
      const rect = el.getBoundingClientRect();
      setContextMenuPosition({ top: rect.top, left: rect.left });
      setShowContextMenu(true);
    } else {
      setShowContextMenu(false);
    }
  }

  const handleContextMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(contextMenuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (!items.length) return;
    const currentIdx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(currentIdx + 1) % items.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(currentIdx - 1 + items.length) % items.length]?.focus(); }
    if (e.key === "Escape") {
      e.preventDefault();
      setMoreOptionsOpenId(null);
      setShowContextMenu(false);
      if (moreOptionsOpenId) ellipsisButtonRefs.current[moreOptionsOpenId]?.focus();
    }
  };

  const renderConversationItem = (conv: Conversation) => {
    const displayName = conv.title || conv.conversation_name || conv.messages?.[0]?.content || "No messages";
    const active = activeConversationId === conv.conversation_id;

    return (
      <li
        key={conv.conversation_id}
        ref={(el) => { itemRefs.current[conv.conversation_id] = el; }}
        className={`group/conversation relative flex items-center w-full rounded-sm transition-colors ${active ? "bg-secondary" : "hover:bg-secondary"}`}
      >
        <button
          className="flex items-center w-full pl-2 pr-8 py-2 text-left bg-transparent border-none outline-none cursor-pointer rounded-sm text-textdark"
          onClick={() => { setActiveConversationId(conv.conversation_id); onClose?.(); }}
          title={displayName}
        >
          <div className="min-w-0 flex-1 overflow-hidden">
            <small className="block truncate">{displayName}</small>
          </div>
        </button>

        <button
          ref={(el) => { ellipsisButtonRefs.current[conv.conversation_id] = el; }}
          aria-label={`More options for ${displayName}`}
          aria-expanded={moreOptionsOpenId === conv.conversation_id}
          aria-haspopup="menu"
          className="group/menu absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded outline-none opacity-0 group-hover/conversation:opacity-100 transition-opacity duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setMoreOptionsOpenId((prev) => prev === conv.conversation_id ? null : conv.conversation_id);
          }}
        >
          <Ellipsis aria-hidden="true" className="h-4 w-4 stroke-textdark group-hover/menu:stroke-textsecondary" />
        </button>

        {moreOptionsOpenId === conv.conversation_id && showContextMenu && (
            <div
              ref={contextMenuRef}
              role="menu"
              aria-label={`Options for ${displayName}`}
              onKeyDown={handleContextMenuKeyDown}
              className="fixed translate-x-[160%] translate-y-[40%] z-[9999] w-52 bg-bglight border border-border shadow-lg rounded-md text-sm overflow-hidden transition-opacity duration-150"
              style={{ top: contextMenuPosition.top, left: contextMenuPosition.left }}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onMouseEnter={(e) => { e.stopPropagation(); e.preventDefault(); }}
            >
              <ul className="py-1" role="presentation">
                <li role="presentation">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setConversationToRename(conv.conversation_id);
                      setNewName(displayName);
                      setShowRenameModal(true);
                      setMoreOptionsOpenId(null);
                    }}
                    className="flex items-center justify-between gap-2 w-full px-4 py-2 text-left text-textdark hover:bg-gray-100"
                  >
                    Rename conversation <Pencil aria-hidden="true" size={16} className="stroke-textdark" />
                  </button>
                </li>
                <li role="presentation">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setConversationToDelete(conv.conversation_id);
                      setShowDeleteModal(true);
                      setMoreOptionsOpenId(null);
                    }}
                    className="flex items-center justify-between gap-2 w-full px-4 py-2 text-left text-destructive hover:bg-gray-100"
                  >
                    Delete conversation <Trash2Icon aria-hidden="true" size={16} className="stroke-destructive" />
                  </button>
                </li>
              </ul>
            </div>
          )}
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
                onClick={() => { setShowRenameModal(false); setConversationToRename(null); setNewName(""); }}
                disabled={renaming}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-accent text-textdark rounded hover:bg-buttonhover disabled:opacity-50"
                onClick={async () => {
                  if (!conversationToRename || !newName.trim() || !user) return;
                  setRenaming(true);
                  try {
                    await renameConversation(conversationToRename, newName.trim(), user);
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
                onClick={() => { setShowDeleteModal(false); setConversationToDelete(null); }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                onClick={async () => {
                  if (!conversationToDelete || !user) return;
                  setDeleting(true);
                  try {
                    await deleteConversation(conversationToDelete, user);
                    if (activeConversationId === conversationToDelete) {
                      startNewChat();
                    }
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
          <div
            className="p-4 space-y-4 overflow-y-auto h-[calc(100%-3.25rem)]"
            style={{ scrollbarWidth: "none" }}
            onScroll={updateContextMenuPosition}
          >
            <button
              className="w-full flex transition-all duration-100 items-center justify-center space-x-2 py-2 px-6 rounded-3xl bg-accent text-textdark hover:text-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                onStartNewChat ? onStartNewChat() : startNewChat();
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
