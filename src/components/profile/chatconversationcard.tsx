import { MoveRight } from "lucide-react";
import React from "react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface ChatConversationCardProps {
  title: string;
  timestamp: string;
  messages: Message[];
  active?: boolean;
  onOpen: () => void;
}

const ChatConversationCard: React.FC<ChatConversationCardProps> = ({
  title,
  timestamp,
  messages,
  active = false,
  onOpen,
}) => {
  const preview = messages.slice(0, 3);

  return (
    <div
      onClick={onOpen}
      className={`flex flex-row justify-start items-stretch rounded-3xl py-6 px-6 shadow-sm transition-all duration-300 w-fit min-w-full h-fit max-h-[245px] gap-5 cursor-pointer
        ${active ? "bg-innercontainer border border-green-300" : "bg-innercontainer border border-border"}
      `}
    >
      {/* Left */}
      <div className="flex flex-col gap-3 min-w-0 overflow-hidden">
        <h2 className="text-xl font-semibold text-gray-900 truncate max-w-[240px]">
          {title}
        </h2>
        <p className="text-sm text-gray-400">{timestamp}</p>

        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
          {preview.map((msg, i) => (
            <div
              key={i}
              className={`flex items-center rounded-xl px-3 py-1.5 text-sm gap-2 border
                ${msg.role === "assistant"
                  ? "bg-green-50 border-green-200 text-gray-700"
                  : "bg-white border-border text-gray-700"
                }`}
            >
              <span className="truncate min-w-0 flex-1">{msg.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: white box */}
      <div className="border border-border bg-white rounded-3xl p-6 w-[160px] flex-shrink-0 self-stretch overflow-hidden flex flex-col justify-between">
        <div className="relative bottom-4 left-10">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle className="text-gray-200" strokeWidth="10" stroke="currentColor" fill="transparent" r="36" cx="50" cy="50" />
              <circle className="text-green-400" strokeWidth="10" strokeDasharray={226} strokeDashoffset={0} strokeLinecap="round" stroke="currentColor" fill="transparent" r="36" cx="50" cy="50" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="relative bottom-4 right-2 flex flex-col gap-0.5">
          <p className="text-3xl font-semibold text-gray-900">{messages.length}</p>
          <p className="text-gray-700 text-sm font-medium">Messages</p>
          <p className="text-green-500 text-sm">Continue</p><MoveRight />
        </div>
      </div>
    </div>
  );
};

export default ChatConversationCard;