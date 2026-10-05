/**
 * Scoring and merge rules for search results.
 *
 * Kept out of the worker so it can be tested directly — the worker module binds
 * `self.onmessage` on import and cannot be loaded outside a worker context.
 *
 * Bodies and titles are searched as separate indexes and merged here, one row
 * per conversation. A title lifts its conversation once; previously the title
 * was copied onto every message document, so a long title scored repeatedly and
 * could fill the candidate window with one conversation's messages.
 */

import { makeMsgId, parseMsgId } from "./plaintext";

export interface FieldResult {
  field?: unknown;
  result: Array<string | number>;
}

export interface Candidate {
  /**
   * Message to scroll to. A title-only match has no matching message, so this
   * points at the conversation's first one and the row renders unhighlighted.
   */
  msgId: string;
  score: number;
  bodyMatched: boolean;
}

/**
 * Folds FlexSearch's per-field result lists into one score per id, weighting by
 * field and decaying by rank within that field.
 */
export function accumulate(
  results: FieldResult[],
  weights: Record<string, number>
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const group of results) {
    const weight = weights[String(group.field)] ?? 1;
    group.result.forEach((id, rank) => {
      const key = String(id);
      scores.set(key, (scores.get(key) ?? 0) + weight / (1 + rank));
    });
  }
  return scores;
}

/**
 * Collapses message scores to one candidate per conversation, then adds each
 * conversation's title score on top.
 */
export function mergeCandidates(
  bodyScores: Map<string, number>,
  titleScores: Map<string, number>,
  limit: number
): Array<[string, Candidate]> {
  const best = new Map<string, Candidate>();

  for (const [msgId, score] of bodyScores) {
    const { convoId } = parseMsgId(msgId);
    const current = best.get(convoId);
    if (!current || score > current.score) {
      best.set(convoId, { msgId, score, bodyMatched: true });
    }
  }

  for (const [convoId, boost] of titleScores) {
    const current = best.get(convoId);
    if (current) current.score += boost;
    else best.set(convoId, { msgId: makeMsgId(convoId, 0), score: boost, bodyMatched: false });
  }

  return [...best.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, limit);
}
