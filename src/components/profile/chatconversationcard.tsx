import React from "react";
import { useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "bot";
  text: string;
}

interface ChatConversationCardProps {
  id: string;
  title: string;
  timestamp: string;
  tag?: string;
  messages: Message[];
  active?: boolean;
}


const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  GeneralAdvising: { bg: "bg-green-100",  text: "text-green-600" },
  ScheduleGeneration: { bg: "bg-purple-100", text: "text-purple-600" },
};

const ChatConversationCard: React.FC<ChatConversationCardProps> = ({
  id,
  title,
  timestamp,
  tag,
  messages,
  active = false,
}) => {
  const navigate = useNavigate();
  const preview = messages.slice(0, 3); // show up to 3 messages in preview

  const tagStyle = tag ? TAG_COLORS[tag] ?? { bg: "bg-gray-100", text: "text-gray-500" } : null;

  return (
    <div
      onClick={() => navigate(`/chat/${id}`)}
      className={`flex flex-row justify-start items-stretch rounded-3xl py-6 px-6 shadow-sm transition-all duration-300 w-fit min-w-full h-fit gap-5 cursor-pointer
        hover:shadow-md hover:scale-[1.01] active:scale-[0.99]
        ${active
          ? "bg-innercontainer border border-green-300"
          : "bg-innercontainer border border-border"
        }
      `}
    >
      {/* Left: Title + timestamp + message preview */}
      <div className="flex flex-col gap-3 min-w-0 overflow-hidden flex-1">

        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-gray-900 truncate max-w-[220px]">
            {title}
          </h2>
          {tagStyle && tag && (
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${tagStyle.bg} ${tagStyle.text}`}>
              {tag}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-sm text-gray-400">{timestamp}</p>

        {/* Message preview bubbles */}
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {preview.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} text={msg.text} />
          ))}
        </div>
      </div>

      {/* Right: Continue button box (mirrors the white progress box) */}
      <div className="border border-border bg-white rounded-3xl p-5 w-[120px] flex-shrink-0 self-stretch overflow-hidden flex flex-col justify-between items-center">
        {/* Chat icon */}
        <div className="flex flex-col items-center gap-1 pt-2">
          <div className="w-10 h-10 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
            <ChatIcon />
          </div>
          <p className="text-xs text-gray-400 text-center mt-1">
            {messages.length} messages
          </p>
        </div>

        {/* Continue CTA */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
            <ArrowIcon />
          </div>
          <p className="text-xs text-green-500 font-medium text-center">Continue</p>
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

interface MessageBubbleProps {
  role: "user" | "bot";
  text: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ role, text }) => {
  const isUser = role === "user";
  return (
    <div className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar dot */}
      <div
        className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5
          ${isUser ? "bg-gray-300" : "bg-green-400"}
        `}
      />
      {/* Bubble */}
      <div
        className={`flex justify-between items-center rounded-xl px-3 py-1.5 text-sm text-gray-700 gap-2 max-w-[90%]
          bg-white border border-border
        `}
      >
        <span className="truncate min-w-0 flex-1 text-xs text-gray-600">{text}</span>
      </div>
    </div>
  );
};

const ChatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export default ChatConversationCard;