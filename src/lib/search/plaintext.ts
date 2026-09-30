/**
 * Projection from stored message content to the `plaintext` that gets indexed.
 *
 * Every match offset the worker returns points into this string, so the
 * projection has to be deterministic and computed once at write time — never
 * recomputed at query time, or offsets drift against what was indexed.
 */

import type { EmailVariant, Message, ScheduleVariant } from "@/types/chat";
import type { MessageRole } from "./schema";

/**
 * Messages carry no server-assigned id, so identity is the conversation plus the
 * message's position in it. The send flow only ever appends, so a given index
 * keeps pointing at the same message, and MessageDisplay already renders by the
 * same index — which is what scroll-to-match needs.
 */
export function makeMsgId(convoId: string, index: number): string {
  return `${convoId}#${index}`;
}

export function parseMsgId(msgId: string): { convoId: string; index: number } {
  const hash = msgId.lastIndexOf("#");
  if (hash === -1) return { convoId: msgId, index: 0 };
  const index = Number(msgId.slice(hash + 1));
  return {
    convoId: msgId.slice(0, hash),
    index: Number.isFinite(index) ? index : 0,
  };
}

/**
 * Strips the markdown subset that MessageDisplay actually renders: fenced and
 * inline code, headings, bullets, numbered items, bold, italic and links.
 * Whitespace runs collapse to single spaces so snippets read as one line.
 */
export function stripMarkdown(raw: string): string {
  if (!raw) return "";

  // Keep fenced code bodies — a student may well be searching for something
  // inside one — but drop the fence markers and language tag.
  let text = raw.replace(/```[a-zA-Z0-9]*\n?([\s\S]*?)```/g, "$1");

  text = text
    .split("\n")
    .map((line) => {
      let out = line.replace(/^\s+/, "");
      out = out.replace(/^>\s?/, "");
      out = out.replace(/^#{1,6}\s+/, "");
      out = out.replace(/^[*-]\s+/, "");
      out = out.replace(/^\d+\.\s+/, "");
      return out;
    })
    .join("\n");

  // [label](url) -> label
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  // **bold** / *italic* / `code` -> inner text
  text = text.replace(/\*\*/g, "");
  text = text.replace(/\*/g, "");
  text = text.replace(/`/g, "");

  return text.replace(/\s+/g, " ").trim();
}

interface StructuredPayload {
  type?: string;
  variants?: unknown;
}

function parseStructured(content: string): StructuredPayload | null {
  if (!content || content[0] !== "{") return null;
  try {
    const parsed = JSON.parse(content) as StructuredPayload;
    if (parsed && (parsed.type === "email" || parsed.type === "schedule")) return parsed;
  } catch {
    // Plain markdown message.
  }
  return null;
}

function projectEmailVariants(variants: EmailVariant[]): string {
  return variants
    .map((v) => [v?.label, v?.subject, v?.body].filter(Boolean).join(". "))
    .filter(Boolean)
    .join(" ");
}

function projectScheduleVariants(variants: ScheduleVariant[]): string {
  return variants
    .map((v) => {
      const blocks = (v?.blocks ?? [])
        .map((b) => [b?.course, b?.section, b?.prof, b?.room].filter(Boolean).join(" "))
        .filter(Boolean)
        .join(" ");
      return [v?.label, v?.reason, blocks].filter(Boolean).join(". ");
    })
    .filter(Boolean)
    .join(" ");
}

/**
 * Email and schedule replies store a JSON envelope in `content`. Indexing that
 * raw would match structural keys like "variants" and render JSON in snippets,
 * so pull out the fields a student would actually search for instead.
 */
export function toPlaintext(message: Pick<Message, "content" | "type" | "variants">): string {
  const structured = parseStructured(message.content);

  if (structured || message.type === "email" || message.type === "schedule") {
    const type = structured?.type ?? message.type;
    const variants = (structured?.variants ?? message.variants) as unknown;
    if (!Array.isArray(variants)) return "";
    const projected =
      type === "email"
        ? projectEmailVariants(variants as EmailVariant[])
        : projectScheduleVariants(variants as ScheduleVariant[]);
    return stripMarkdown(projected);
  }

  return stripMarkdown(message.content);
}

export function normalizeRole(role: string): MessageRole {
  return role === "assistant" ? "assistant" : "user";
}
