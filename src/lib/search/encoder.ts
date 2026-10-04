/**
 * Tokenizing and stemming for the search index.
 *
 * One encoder serves index time, query time and the snippet highlighter. If
 * they ever diverge, queries silently stop matching.
 *
 * Deliberately precise: lowercase, split, Porter stem. Phonetic charsets were
 * tried for typo tolerance and both were withdrawn. LatinExtra collapsed "fac",
 * "week" and "which" onto one key. LatinBalance encoded "logi" as "loke" and
 * "looking" as "lokemk", whose first four characters are also "loke", so every
 * "looking" matched a search for "logi". Forward tokenizing indexes prefixes,
 * so a lossy encoder does its worst damage on the short prefixes people
 * actually type.
 *
 * They also disabled stemming without it being obvious: the charset runs before
 * `finalize`, so Porter received phonetic keys rather than English words and
 * could not recognise a suffix. Stemming "graduation" and "graduate" to the
 * same key only works on real words.
 *
 * Two encodings are exported because stemming is not monotonic. Typing
 * "requirements" one letter at a time produces stems r, re, req, requ, requi,
 * requir, requir, requirem, … — the key grows past the indexed stem "requir"
 * and stops being a prefix of it, so results vanish mid-word and only return
 * once the word is finished. `encodeRaw` indexes the unstemmed token alongside,
 * where every prefix of a word is by definition a prefix of its key.
 *
 * Stemmed keys are for matching only. `tokenize` records each token's span in
 * the original string so match offsets point into unstemmed text.
 */

import { stemmer } from "stemmer";

export interface Token {
  /** The token exactly as it appears in the source text. */
  raw: string;
  /** Lowercased stem used for matching. */
  stem: string;
  /** Offsets into the unstemmed source string. */
  start: number;
  end: number;
}

/**
 * Words shorter than this are left unstemmed. Aggressive stemming collapses
 * unrelated short words and the precision loss is not worth it — course codes
 * like "CS" are the obvious case.
 */
const MIN_STEM_LENGTH = 4;

const TOKEN_PATTERN = /[a-z0-9]+/gi;

function stemTerm(term: string): string {
  if (term.length < MIN_STEM_LENGTH) return term;
  return stemmer(term) || term;
}

/** Splits text into tokens, each carrying its span in the original string. */
export function tokenize(text: string): Token[] {
  if (!text) return [];
  const tokens: Token[] = [];
  TOKEN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_PATTERN.exec(text)) !== null) {
    const raw = match[0];
    tokens.push({
      raw,
      stem: stemTerm(raw.toLowerCase()),
      start: match.index,
      end: match.index + raw.length,
    });
  }
  return tokens;
}

/**
 * Stemmed encoding, for the fields that carry morphology — a search for
 * "graduate" finds "graduation".
 */
export function encode(text: string): string[] {
  return tokenize(text).map((token) => token.stem);
}

/**
 * Unstemmed encoding, for the companion field that makes as-you-type work.
 * Every prefix of a word encodes to a prefix of that word's key, which is the
 * property stemming breaks.
 */
export function encodeRaw(text: string): string[] {
  return tokenize(text).map((token) => token.raw.toLowerCase());
}

/**
 * Finds where a query first matches inside `plaintext`, as a span in the
 * unstemmed text. Prefix matching mirrors FlexSearch's `tokenize: "forward"`,
 * so the highlight lands on what the index actually matched.
 */
export function findMatchSpan(
  plaintext: string,
  query: string
): { start: number; end: number } | null {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return null;

  const tokens = tokenize(plaintext);
  if (tokens.length === 0) return null;

  // Match on either encoding, mirroring the index: the stemmed fields carry
  // morphology, the raw field carries partial words. Checking only stems left
  // a half-typed query matching rows it could not highlight.
  const hits = (token: Token, queryToken: Token): boolean =>
    token.stem.startsWith(queryToken.stem) ||
    token.raw.toLowerCase().startsWith(queryToken.raw.toLowerCase());

  // Prefer a run covering every query term, so a multi-word query highlights
  // the phrase rather than whichever term happens to appear first.
  if (queryTokens.length > 1) {
    for (let i = 0; i + queryTokens.length <= tokens.length; i += 1) {
      const runMatches = queryTokens.every((queryToken, offset) =>
        hits(tokens[i + offset], queryToken)
      );
      if (runMatches) {
        return { start: tokens[i].start, end: tokens[i + queryTokens.length - 1].end };
      }
    }
  }

  for (const token of tokens) {
    if (queryTokens.some((queryToken) => hits(token, queryToken))) {
      return { start: token.start, end: token.end };
    }
  }
  return null;
}

/** Context kept either side of a match when building the preview snippet. */
const SNIPPET_RADIUS = 90;

/**
 * Builds a preview snippet around the match, clipped to word boundaries.
 * Returned offsets are relative to the returned `snippet`, not to `plaintext`,
 * so the UI can slice it directly.
 */
export function buildSnippet(
  plaintext: string,
  query: string
): { snippet: string; startOffset: number; endOffset: number } {
  const span = findMatchSpan(plaintext, query);

  if (!span) {
    const head = plaintext.slice(0, SNIPPET_RADIUS * 2);
    return {
      snippet: head + (plaintext.length > head.length ? "…" : ""),
      startOffset: 0,
      endOffset: 0,
    };
  }

  let from = Math.max(0, span.start - SNIPPET_RADIUS);
  let to = Math.min(plaintext.length, span.end + SNIPPET_RADIUS);

  // Pull the edges to word boundaries so the snippet does not start or end
  // mid-word, without ever eating into the match itself.
  if (from > 0) {
    const space = plaintext.indexOf(" ", from);
    if (space !== -1 && space < span.start) from = space + 1;
  }
  if (to < plaintext.length) {
    const space = plaintext.lastIndexOf(" ", to);
    if (space !== -1 && space > span.end) to = space;
  }

  const leadingEllipsis = from > 0 ? "…" : "";
  const snippet =
    leadingEllipsis + plaintext.slice(from, to) + (to < plaintext.length ? "…" : "");
  const shift = leadingEllipsis.length - from;

  return {
    snippet,
    startOffset: span.start + shift,
    endOffset: span.end + shift,
  };
}
