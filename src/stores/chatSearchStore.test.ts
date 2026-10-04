import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchHit } from "@/lib/search/protocol";

const searchMessages = vi.fn();

// The store dispatches through the worker client; stub it so these tests stay
// pure and do not need IndexedDB or a Worker.
vi.mock("@/lib/search/client", () => ({
  isSearchSupported: () => true,
  searchMessages: (text: string, limit: number) => searchMessages(text, limit),
}));

const { useChatSearchStore } = await import("./chatSearchStore");

function hit(convoId: string, msgId: string): SearchHit {
  return {
    convoId,
    msgId,
    role: "user",
    score: 1,
    startOffset: 0,
    endOffset: 4,
    snippet: "text",
    title: "A chat",
    updatedAt: 1_000,
  };
}

describe("chatSearchStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchMessages.mockReset();
    useChatSearchStore.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces so a burst of keystrokes dispatches once", async () => {
    searchMessages.mockResolvedValue({ hits: [hit("c1", "c1#0")], current: true });
    const { setQuery } = useChatSearchStore.getState();

    setQuery("g");
    setQuery("gr");
    setQuery("gra");
    setQuery("grad");

    expect(searchMessages).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);

    expect(searchMessages).toHaveBeenCalledTimes(1);
    expect(searchMessages).toHaveBeenCalledWith("grad", expect.any(Number));
    expect(useChatSearchStore.getState().hits).toHaveLength(1);
  });

  it("does not dispatch for an empty query, and clears results", async () => {
    searchMessages.mockResolvedValue({ hits: [hit("c1", "c1#0")], current: true });
    const { setQuery } = useChatSearchStore.getState();

    setQuery("grad");
    await vi.advanceTimersByTimeAsync(200);
    expect(useChatSearchStore.getState().hits).toHaveLength(1);

    searchMessages.mockClear();
    setQuery("   ");
    await vi.advanceTimersByTimeAsync(200);

    expect(searchMessages).not.toHaveBeenCalled();
    const state = useChatSearchStore.getState();
    expect(state.hits).toEqual([]);
    expect(state.searching).toBe(false);
    expect(state.dispatched).toBe(false);
  });

  it("discards a response the client flagged stale", async () => {
    searchMessages.mockResolvedValue({ hits: [hit("c1", "c1#0")], current: false });
    const { setQuery } = useChatSearchStore.getState();

    setQuery("grad");
    await vi.advanceTimersByTimeAsync(200);

    // A newer query superseded this one, so its results must not be applied.
    expect(useChatSearchStore.getState().hits).toEqual([]);
  });

  it("shares one query across every mount, since the sidebar renders twice", async () => {
    searchMessages.mockResolvedValue({ hits: [], current: true });

    // Two component instances read the same store, so a write through one is
    // immediately visible to the other.
    useChatSearchStore.getState().setQuery("shared");
    expect(useChatSearchStore.getState().query).toBe("shared");

    await vi.advanceTimersByTimeAsync(200);
    expect(searchMessages).toHaveBeenCalledTimes(1);
  });

  it("discards a response that lands after the box was cleared", async () => {
    // Pressing Escape while a query is in flight. The client reports current:
    // true because nothing newer was dispatched, so the store has to notice
    // that the query it belongs to is gone.
    let settle: ((value: unknown) => void) | undefined;
    searchMessages.mockReturnValue(new Promise((resolve) => { settle = resolve; }));

    const { setQuery, clear } = useChatSearchStore.getState();
    setQuery("grad");
    await vi.advanceTimersByTimeAsync(200);
    expect(searchMessages).toHaveBeenCalledTimes(1);

    clear();
    settle!({ hits: [hit("c1", "c1#0")], current: true });
    await vi.advanceTimersByTimeAsync(0);

    const state = useChatSearchStore.getState();
    expect(state.hits).toEqual([]);
    expect(state.dispatched).toBe(false);
    expect(state.searching).toBe(false);
  });

  it("discards a response whose query was replaced before it resolved", async () => {
    let settle: ((value: unknown) => void) | undefined;
    searchMessages.mockReturnValueOnce(new Promise((resolve) => { settle = resolve; }));

    const { setQuery } = useChatSearchStore.getState();
    setQuery("grad");
    await vi.advanceTimersByTimeAsync(200);

    setQuery("graduation");
    settle!({ hits: [hit("c1", "c1#0")], current: true });
    await vi.advanceTimersByTimeAsync(0);

    expect(useChatSearchStore.getState().hits).toEqual([]);
  });

  it("clear cancels a pending dispatch", async () => {
    searchMessages.mockResolvedValue({ hits: [], current: true });
    const { setQuery, clear } = useChatSearchStore.getState();

    setQuery("grad");
    clear();
    await vi.advanceTimersByTimeAsync(200);

    expect(searchMessages).not.toHaveBeenCalled();
    expect(useChatSearchStore.getState().query).toBe("");
  });

  it("tracks the pending scroll target", () => {
    const { requestScrollToMessage, clearPendingScroll } = useChatSearchStore.getState();

    requestScrollToMessage("c1#3");
    expect(useChatSearchStore.getState().pendingScrollMsgId).toBe("c1#3");

    clearPendingScroll();
    expect(useChatSearchStore.getState().pendingScrollMsgId).toBeNull();
  });
});
