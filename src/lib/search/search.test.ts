import { beforeEach, describe, expect, it } from "vitest";
import { makeMsgId, parseMsgId, stripMarkdown, toPlaintext } from "./plaintext";
import {
  FULL_BODY_WINDOW,
  SOFT_CEILING_BYTES,
  buildBoundedPayload,
  saveConversationsToCache,
  CONVERSATIONS_CACHE_KEY,
} from "./localCache";
import { conversationDisplayName, conversationUpdatedAt, sortConversationsByDate } from "@/utils/conversation";
import type { Conversation } from "@/types/chat";

describe("msgId", () => {
  it("round-trips a conversation id and index", () => {
    const id = makeMsgId("conversation_abc-123", 7);
    expect(parseMsgId(id)).toEqual({ convoId: "conversation_abc-123", index: 7 });
  });

  it("survives conversation ids that contain a hash", () => {
    const id = makeMsgId("conv#weird", 2);
    expect(parseMsgId(id)).toEqual({ convoId: "conv#weird", index: 2 });
  });
});

describe("stripMarkdown", () => {
  it("removes the markdown the renderer supports", () => {
    const raw = "## Heading\n* **bold** item\n1. *italic* item\n[link](https://x.com) and `code`";
    expect(stripMarkdown(raw)).toBe("Heading bold item italic item link and code");
  });

  it("keeps fenced code bodies but drops the fences", () => {
    expect(stripMarkdown("before\n```js\nconst CS2336 = 1;\n```\nafter")).toBe(
      "before const CS2336 = 1; after"
    );
  });

  it("collapses whitespace so snippets read as one line", () => {
    expect(stripMarkdown("a\n\n   b\t\tc")).toBe("a b c");
  });
});

describe("toPlaintext", () => {
  it("projects email variants to their readable fields", () => {
    const content = JSON.stringify({
      type: "email",
      variants: [{ label: "Formal", subject: "Internship inquiry", body: "Dear Professor Cole," }],
    });
    const out = toPlaintext({ content, type: "email" });
    expect(out).toContain("Internship inquiry");
    expect(out).toContain("Dear Professor Cole");
    // Structural keys must not leak into the corpus.
    expect(out).not.toContain("variants");
    expect(out).not.toContain("subject");
  });

  it("projects schedule variants including course and professor", () => {
    const content = JSON.stringify({
      type: "schedule",
      variants: [
        {
          label: "Option A",
          reason: "No early classes",
          blocks: [{ course: "CS 2336", section: "003", prof: "John Cole", room: "ECSS 2.410" }],
        },
      ],
    });
    const out = toPlaintext({ content, type: "schedule" });
    expect(out).toContain("CS 2336");
    expect(out).toContain("John Cole");
    expect(out).not.toContain("blocks");
  });

  it("treats a plain message that starts with a brace as markdown", () => {
    expect(toPlaintext({ content: "{not json after all" })).toBe("{not json after all");
  });
});

function makeConversation(id: string, updatedAt: number, messageCount = 2): Conversation {
  return {
    conversation_id: id,
    user_id: "u1",
    title: `Conversation ${id}`,
    messages: Array.from({ length: messageCount }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `message ${i} in ${id}`,
      timestamp: updatedAt - (messageCount - i),
    })),
  };
}

describe("bounded localStorage payload", () => {
  it("keeps bodies only for the most recent window", () => {
    const convs = Array.from({ length: FULL_BODY_WINDOW + 10 }, (_, i) =>
      makeConversation(`c${i}`, 1_000 + i)
    );
    const { data } = buildBoundedPayload(convs);

    const withBodies = data.filter((c) => c.messages.length > 0);
    expect(withBodies).toHaveLength(FULL_BODY_WINDOW);
    // The newest conversations are the ones that keep their bodies.
    expect(withBodies[0].conversation_id).toBe(`c${FULL_BODY_WINDOW + 9}`);
  });

  it("gives pruned entries the fields ordering and labelling need", () => {
    const convs = Array.from({ length: FULL_BODY_WINDOW + 3 }, (_, i) =>
      makeConversation(`c${i}`, 1_000 + i)
    );
    const { data } = buildBoundedPayload(convs);
    const pruned = data.filter((c) => c.messages.length === 0);

    expect(pruned.length).toBeGreaterThan(0);
    for (const conv of pruned) {
      expect(conv.updatedAt).toBeGreaterThan(0);
      expect(conv.preview).toBeTruthy();
      // Still sorts and labels correctly without any message bodies.
      expect(conversationUpdatedAt(conv)).toBe(conv.updatedAt);
      expect(conversationDisplayName(conv)).toBe(conv.title);
    }
  });

  it("stays under the soft ceiling as history grows", () => {
    // Each conversation carries roughly 200KB of message text.
    const fat = Array.from({ length: 40 }, (_, i) => {
      const conv = makeConversation(`c${i}`, 1_000 + i, 1);
      conv.messages[0].content = "x".repeat(200_000);
      return conv;
    });

    const { data, windowSize } = buildBoundedPayload(fat);
    expect(JSON.stringify(data).length).toBeLessThanOrEqual(SOFT_CEILING_BYTES);
    // The window had to shrink below the nominal 20 to fit.
    expect(windowSize).toBeLessThan(FULL_BODY_WINDOW);
  });
});

describe("conversation ordering with pruned entries", () => {
  it("orders a pruned conversation by updatedAt, not by its missing messages", () => {
    const recentButPruned: Conversation = {
      conversation_id: "pruned",
      user_id: "u1",
      title: "Pruned but recent",
      messages: [],
      updatedAt: 9_000,
      preview: "hello",
    };
    const olderWithBodies = makeConversation("full", 1_000);

    const sorted = sortConversationsByDate([olderWithBodies, recentButPruned]);
    expect(sorted[0].conversation_id).toBe("pruned");
  });
});

describe("saveConversationsToCache", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
      },
    });
  });

  it("writes a bounded payload under the cache key", () => {
    const convs = Array.from({ length: FULL_BODY_WINDOW + 5 }, (_, i) =>
      makeConversation(`c${i}`, 1_000 + i)
    );
    saveConversationsToCache(convs, "user-1");

    const parsed = JSON.parse(localStorage.getItem(CONVERSATIONS_CACHE_KEY)!);
    expect(parsed.userId).toBe("user-1");
    expect(parsed.data).toHaveLength(FULL_BODY_WINDOW + 5);
    expect(parsed.data.filter((c: Conversation) => c.messages.length > 0)).toHaveLength(
      FULL_BODY_WINDOW
    );
  });

  it("gives up silently rather than throwing when the quota is exhausted", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          const err = new Error("quota");
          err.name = "QuotaExceededError";
          throw err;
        },
        removeItem: () => {},
        clear: () => {},
      },
    });

    expect(() => saveConversationsToCache([makeConversation("c0", 1)], "user-1")).not.toThrow();
  });
});
