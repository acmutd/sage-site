import type { FC } from "react";
import { MessageCirclePlusIcon, SquareAsterisk } from "lucide-react";
import { SidebarTemplate } from "@sage/ui";
import ChatSidebarContent from "@/components/chatbot/ChatSidebarContent";

interface ChatSidebarShellProps {
  isCollapsed: boolean;
  sidebarCollapsedDelayed: boolean;
  onToggleCollapse: () => void;
  onStartNewChat: () => void;
}

const ChatSidebarShell: FC<ChatSidebarShellProps> = ({
  isCollapsed,
  sidebarCollapsedDelayed,
  onToggleCollapse,
  onStartNewChat,
}) => {
  return (
    <aside aria-label="Conversation history" data-tour="sidebar" className="h-full flex flex-col gap-4 transition-all duration-100">
      <SidebarTemplate
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        primaryAction={{
          label: "Start new chat",
          icon: <MessageCirclePlusIcon size={24} aria-hidden="true" />,
          onClick: onStartNewChat,
          dataTour: "new-chat-expanded",
        }}
        collapsedActions={[
          {
            label: "Start new chat",
            icon: <MessageCirclePlusIcon size={24} aria-hidden="true" />,
            onClick: onStartNewChat,
            dataTour: "new-chat-collapsed",
          },
        ]}
        renderExpandedContent={<ChatSidebarContent layout="template" />}
        className="h-full"
        contentClassName="p-6 pt-8"
        expandedWidthClassName="w-[24rem]"
        collapsedWidthClassName="w-[5.25rem]"
        expandedRoundedClassName="rounded-lg"
        collapsedRoundedClassName="rounded-md"
      />

      <div
        className={`${isCollapsed ? "cursor-pointer rounded-md" : "rounded-full"} bg-textdark w-full py-3 px-6 flex gap-2 justify-center items-center`}
        onClick={!isCollapsed ? undefined : onToggleCollapse}
      >
        <SquareAsterisk size={32} className="stroke-accent" aria-hidden="true" />
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
    </aside>
  );
};

export default ChatSidebarShell;
