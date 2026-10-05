import { Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useChatSearchStore } from "@/stores/chatSearchStore";
import ChatSearchResults from "@/components/chatbot/ChatSearchResults";
import type { SearchHit } from "@/lib/search/protocol";

/** True while the search box has text, so a sidebar can swap its list for results. */
export const useChatSearchActive = () =>
    useChatSearchStore((s) => s.query.trim().length > 0);

/**
 * Search box. Renders nothing where search is unsupported or nobody is signed
 * in — the corpus is per user and is not bound until auth resolves.
 *
 * Selectors are deliberately one-per-field: zustand 5 loops forever if a
 * selector returns a fresh object each time.
 */
export function ChatSearchInput() {
    const { user } = useAuth();
    const supported = useChatSearchStore((s) => s.supported);
    const query = useChatSearchStore((s) => s.query);
    const setQuery = useChatSearchStore((s) => s.setQuery);
    const clear = useChatSearchStore((s) => s.clear);

    if (!supported || !user) return null;

    return (
        <div data-tour="chat-search" className="relative w-full">
            <Search
                aria-hidden="true"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 stroke-textsecondary pointer-events-none"
            />
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Escape") clear();
                }}
                placeholder="Search your chats..."
                aria-label="Search your chats"
                data-clarity-mask="True"
                className="w-full pl-9 pr-9 py-2 text-sm rounded-sm border border-border bg-bglight text-textdark placeholder:text-textsecondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {query.trim() && (
                <button
                    type="button"
                    aria-label="Clear search"
                    onClick={clear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded bg-transparent border-none cursor-pointer"
                >
                    <X aria-hidden="true" size={14} className="stroke-textsecondary" />
                </button>
            )}
        </div>
    );
}

/**
 * Results list. `onSelect` only has to open the conversation; this component
 * queues the scroll-to-message request and clears the box afterwards.
 */
export function ChatSearchPanel({ onSelect }: { onSelect: (hit: SearchHit) => void }) {
    const hits = useChatSearchStore((s) => s.hits);
    const searching = useChatSearchStore((s) => s.searching);
    const dispatched = useChatSearchStore((s) => s.dispatched);
    const query = useChatSearchStore((s) => s.query);

    return (
        <ChatSearchResults
            hits={hits}
            searching={searching}
            empty={dispatched && !searching && hits.length === 0}
            query={query}
            onSelect={(hit) => {
                onSelect(hit);
                const store = useChatSearchStore.getState();
                store.requestScrollToMessage(hit.msgId);
                store.clear();
            }}
        />
    );
}