import { ReactNode } from "react";

interface MessageDisplayProps {
  message: Message;
}

type StringOrElement = string | ReactNode;

const MessageDisplay = ({ message }: MessageDisplayProps) => {
  const renderMarkdown = (text: string) => {
    // Determine indent
    let indent = 0;
    while (text[indent] === " ") {
      // console.log(text)
      indent++;
    }
    text = text.slice(indent);
    indent += 4;

    text = text.trim();
    // Determine the wrapper element based on the first few characters of the text
    // and remove the wrapper characters from the text
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

    // Parse double asterisks for bold text
    const textBolded: StringOrElement[] = [];
    text.split("**").forEach((chunk, index) => {
      if (index % 2 === 0) {
        textBolded.push(chunk);
      }
      if (index % 2 === 1) {
        textBolded.push(
          <strong key={index}>{chunk}</strong>
        );
      }
    });

    // Parse single asterisks for italic text
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

    // Render the text with the appropriate wrapper
    switch (wrapper) {
      case "li":
        // console.log(indent);
        return <li style={{ marginLeft: `${0.5 * indent}rem` }}>{outText}</li>;
      case "h1":
        return <h1>{outText}</h1>;
      case "h2":
        return <h2>{outText}</h2>;
      default:
        return <p>{outText}</p>;
    }
  };

  return (
    <div className="w-full flex">
      {
        message.role === "user"
          ? <div className="flex flex-[6]" />
          : undefined
      }
      <div
        className={`flex flex-[12] flex-col p-4 gap-2 rounded-md border border-border max-w-fit ${message.role === "user"
          ? "bg-bglight self-end ml-auto"
          : "bg-[#E5E4E4] self-start mr-auto"
          }`}
      >
        {message.content.split("\n").map((line, index) => (
          <div key={index}>
            <small className="text-[15px]">{renderMarkdown(line)}</small>
          </div>
        ))}
      </div>
      {
        message.role !== "user"
          ? <div className="flex flex-[1]" />
          : undefined
      }
    </div>
  );
};

export default MessageDisplay;
