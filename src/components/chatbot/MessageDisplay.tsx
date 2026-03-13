import { ReactNode } from "react";
import EmailVariantCard from "./EmailVariantCard";
import type { Message } from "@/types/chat";


interface MessageDisplayProps {
  message: Message;
  messageIndex: number;
  conversationId: string | null;
}

type StringOrElement = string | ReactNode;

const MessageDisplay = ({ message, messageIndex, conversationId }: MessageDisplayProps) => {
  if (message.type === "email" && message.variants) {
    return <EmailVariantCard variants={message.variants} messageIndex={messageIndex} conversationId={conversationId} />;
  }

  {/* Potential weird case to where a student may ask about code...not ideal we may need prompting BUT just in case! */}
  const renderContent = (content: string) => {
    const blocks = content.split(/(```[\s\S]*?```)/g);
    return blocks.map((block, i) => {
      if (block.startsWith("```")) {
        const code = block.replace(/^```\w*\n?/, "").replace(/```$/, "");
        return (
          <pre key={i} className="bg-gray-900 text-green-400 p-3 rounded-md overflow-x-auto text-sm font-mono whitespace-pre">
            {code}
          </pre>
        );
      }
      return block.split("\n").map((line, index) => (
        <div key={`${i}-${index}`} className="flex w-full">
          <small style={{ overflowWrap: "break-word", wordBreak: "break-word" }} className="text-[15px] w-full">
            {renderMarkdown(line)}
          </small>
        </div>
      ));
    });
  };

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
      if (index % 2 === 0) textBolded.push(chunk);
      if (index % 2 === 1) textBolded.push(<strong key={index}>{chunk}</strong>);
    });
    
    const textItalicized: StringOrElement[] = [];
    textBolded.forEach((chunk) => {
      if (typeof chunk === "string") {
        chunk.split("*").forEach((subChunk, subIndex) => {
          if (subIndex % 2 === 0) textItalicized.push(subChunk);
          if (subIndex % 2 === 1) textItalicized.push(<em key={subIndex}>{subChunk}</em>);
        });
      } else {
        textItalicized.push(chunk);
      }
    });
    
    const textLinked: StringOrElement[] = [];
    textItalicized.forEach((chunk) => {
      if (typeof chunk === "string") {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let lastIndex = 0;
        let match;
        while ((match = linkRegex.exec(chunk)) !== null) {
          if (match.index > lastIndex) textLinked.push(chunk.slice(lastIndex, match.index));
          textLinked.push(
            <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              {match[1]}
            </a>
          );
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < chunk.length) textLinked.push(chunk.slice(lastIndex));
      } else {
        textLinked.push(chunk);
      }
    });
    
    const textWithInlineCode: StringOrElement[] = [];
      textLinked.forEach((chunk) => {
        if (typeof chunk === "string") {
          chunk.split("`").forEach((subChunk, subIndex) => {
            if (subIndex % 2 === 0) textWithInlineCode.push(subChunk);
            if (subIndex % 2 === 1) textWithInlineCode.push(
              <code key={subIndex} className="bg-gray-200 text-red-500 px-1 rounded text-sm font-mono">{subChunk}</code>
            );
          });
        } else {
          textWithInlineCode.push(chunk);
        }
      });

    const outText = textWithInlineCode;

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
        {renderContent(content)}
      </div>
    </div>
  );
};

export default MessageDisplay;