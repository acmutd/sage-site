import { ReactNode } from "react";
import EmailVariantCard from "./EmailVariantCard";

type Role = "user" | "assistant";

interface Message {
  role: Role;
  content: string;
  timestamp: number;
  type?: "email";
  variants?: { label: string; subject: string; body: string }[];
}

interface MessageDisplayProps {
  message: Message;
  messageIndex: number;
  conversationId: string | null;
}

type StringOrElement = string | ReactNode;

const MessageDisplay = ({ message, messageIndex, conversationId }: MessageDisplayProps) => {
  console.log("MessageDisplay rendering:", message.role, message.type, message.content?.slice(0, 50));
  if (message.type === "email" && message.variants) {
    return <EmailVariantCard variants={message.variants} messageIndex={messageIndex} conversationId={conversationId} />;
  }

  const renderMarkdown = (text: string) => {
    let indent = 0;
    while (text[indent] === " ") {
      indent++;
    }
    text = text.slice(indent);
    indent += 4;

    text = text.trim();

    let wrapper = "p";
    if (text.indexOf("* ") === 0) {
      wrapper = "li";
      text = text.slice(2);
    } else if (text.indexOf("# ") === 0) {
      wrapper = "h1";
      text = text.slice(2);
    } else if (text.indexOf("## ") === 0) {
      wrapper = "h2";
      text = text.slice(3);
    }

    const textBolded: StringOrElement[] = [];
    text.split("**").forEach((chunk, index) => {
      if (index % 2 === 0) {
        textBolded.push(chunk);
      }
      if (index % 2 === 1) {
        textBolded.push(<strong key={index}>{chunk}</strong>);
      }
    });

    const textItalicized: StringOrElement[] = [];
    textBolded.forEach((chunk) => {
      if (typeof chunk === "string") {
        chunk.split("*").forEach((subChunk, subIndex) => {
          if (subIndex % 2 === 0) {
            textItalicized.push(subChunk);
          }
          if (subIndex % 2 === 1) {
            textItalicized.push(<em key={subIndex}>{subChunk}</em>);
          }
        });
      } else {
        textItalicized.push(chunk);
      }
    });

    const outText = textItalicized;

    switch (wrapper) {
      case "li":
        return <li style={{ marginLeft: `${0.5 * indent}rem` }}>{outText}</li>;
      case "h1":
        return <h1>{outText}</h1>;
      case "h2":
        return <h2>{outText}</h2>;
      default:
        return <p>{outText}</p>;
    }
  };

  const content = typeof message.content === "string" ? message.content : "";

  return (
    <div className="w-full flex">
      <div
        className={`flex flex-col p-4 gap-2 rounded-md border border-border max-w-fit ${
          message.role === "user"
            ? "bg-bglight self-end ml-auto w-2/3"
            : "bg-[#E5E4E4] self-start mr-auto w-[92%]"
        }`}
      >
        {content.split("\n").map((line, index) => (
          <div key={index} className="flex w-full">
            <small
              key={index}
              style={{ overflowWrap: "break-word", wordWrap: "break-word", wordBreak: "break-word" }}
              className="text-[15px] w-full"
            >
              {renderMarkdown(line)}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessageDisplay;