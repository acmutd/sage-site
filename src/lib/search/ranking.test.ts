import { describe, expect, it } from "vitest";
import { accumulate, mergeCandidates, type FieldResult } from "./ranking";

const BODY_WEIGHTS = { userText: 2, botText: 1, rawText: 0.5 };

describe("accumulate", () => {
  it("weights by field and decays by rank", () => {
    const results: FieldResult[] = [
      { field: "userText", result: ["a", "b"] },
      { field: "botText", result: ["b"] },
    ];
    const scores = accumulate(results, BODY_WEIGHTS);
    expect(scores.get("a")).toBe(2); // 2 / (1 + 0)
    expect(scores.get("b")).toBe(2); // 2 / (1 + 1) + 1 / (1 + 0)
  });

  it("falls back to weight 1 for an unknown field", () => {
    expect(accumulate([{ field: "mystery", result: ["a"] }], BODY_WEIGHTS).get("a")).toBe(1);
  });

  it("scores a title once per conversation", () => {
    const titles = accumulate([{ field: "title", result: ["c1", "c2"] }], { title: 3, titleRaw: 0.5 });
    expect(titles.get("c1")).toBe(3);
    expect(titles.get("c2")).toBe(1.5);
  });
});

describe("mergeCandidates", () => {
  it("keeps only each conversation's best-scoring message", () => {
    // One chat must not fill the list with near duplicates that all open the
    // same place.
    const body = new Map([
      ["c1#0", 1],
      ["c1#4", 5],
      ["c1#9", 2],
    ]);
    const ranked = mergeCandidates(body, new Map(), 10);

    expect(ranked).toHaveLength(1);
    expect(ranked[0][0]).toBe("c1");
    expect(ranked[0][1].msgId).toBe("c1#4");
    expect(ranked[0][1].score).toBe(5);
  });

  it("adds a title score once per conversation, not once per message", () => {
    const body = new Map([
      ["c1#0", 1],
      ["c1#1", 1],
      ["c1#2", 1],
    ]);
    const ranked = mergeCandidates(body, new Map([["c1", 3]]), 10);

    // Best body score 1 plus a single title boost of 3 — not 3 per message.
    expect(ranked[0][1].score).toBe(4);
  });

  it("surfaces a title-only match pointing at the first message, unhighlighted", () => {
    const ranked = mergeCandidates(new Map(), new Map([["c2", 3]]), 10);

    expect(ranked[0][1]).toEqual({ msgId: "c2#0", score: 3, bodyMatched: false });
  });

  it("marks body matches so the row can be highlighted", () => {
    const ranked = mergeCandidates(new Map([["c1#2", 4]]), new Map(), 10);
    expect(ranked[0][1].bodyMatched).toBe(true);
  });

  it("ranks by combined score and honours the limit", () => {
    const body = new Map([
      ["c1#0", 1],
      ["c2#0", 2],
      ["c3#0", 3],
    ]);
    // c1 is weakest on body but its title matches, which should lift it top.
    const ranked = mergeCandidates(body, new Map([["c1", 5]]), 2);

    expect(ranked.map(([convoId]) => convoId)).toEqual(["c1", "c3"]);
  });
});
