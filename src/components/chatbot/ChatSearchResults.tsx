import type { SearchHit } from "@/lib/search/protocol";

interface ChatSearchResultsProps {
  hits: SearchHit[];
  searching: boolean;
  /** A query has run and matched nothing. */
  empty: boolean;
  query: string;
  onSelect: (hit: SearchHit) => void;
}

function formatTimestamp(value: number): string {
  if (!value) return "";
  const date = new Date(value);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return date >= todayStart
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Highlights the matched span inside the snippet.
 *
 * Offsets are relative to the snippet and were computed by the worker against
 * the message's plaintext. Highlighting stops at the snippet by design —
 * reaching into the rendered markdown message costs several times as much and
 * breaks whenever the renderer changes.
 */
function HighlightedSnippet({ hit }: { hit: SearchHit }) {
  const { snippet, startOffset, endOffset } = hit;
  const usable =
    endOffset > startOffset && startOffset >= 0 && endOffset <= snippet.length;

  if (!usable) return <>{snippet}</>;

  return (
    <>
      {snippet.slice(0, startOffset)}
      <mark className="bg-accent/60 text-textdark rounded-sm px-0.5">
        {snippet.slice(startOffset, endOffset)}
      </mark>
      {snippet.slice(endOffset)}
    </>
  );
}

const ChatSearchResults: React.FC<ChatSearchResultsProps> = ({
  hits,
  searching,
  empty,
  query,
  onSelect,
}) => {
  if (searching && hits.length === 0) {
    return <p className="text-textsecondary text-sm">Searching…</p>;
  }

  if (empty) {
    return (
      <p className="text-textsecondary text-sm">
        No messages match &ldquo;{query.trim()}&rdquo;.
      </p>
    );
  }

  return (
    <div className="w-full min-w-0">
      <h3 className="text-[22px] mb-4">
        Results
        <span className="text-textsecondary text-sm font-normal ml-2">
          {hits.length} {hits.length === 1 ? "conversation" : "conversations"}
        </span>
      </h3>

      {/* No inner scroll container: results cap at one row per conversation, so
          the sidebar's own scroller handles them. Nesting a second scroller
          here made the list chain awkwardly against the outer one. */}
      <ul className="w-full list-none p-0 m-0 flex flex-col gap-2">
        {hits.map((hit) => (
          <li key={hit.msgId} className="w-full min-w-0">
            <button
              type="button"
              onClick={() => onSelect(hit)}
              title={hit.title}
              className="flex flex-col gap-1 w-full text-left px-2 py-2 rounded-sm bg-transparent border-none cursor-pointer hover:bg-secondary transition-colors"
            >
              <span className="flex items-baseline justify-between gap-2 w-full">
                <small className="truncate text-textdark font-medium min-w-0">
                  {hit.title}
                </small>
                <small className="text-textsecondary shrink-0 text-xs">
                  {formatTimestamp(hit.updatedAt)}
                </small>
              </span>
              <small className="text-textsecondary text-xs leading-snug line-clamp-3 break-words">
                <HighlightedSnippet hit={hit} />
              </small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatSearchResults;
