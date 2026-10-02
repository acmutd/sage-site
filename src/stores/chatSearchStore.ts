import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { isSearchSupported, searchMessages } from '@/lib/search/client';
import type { SearchHit } from '@/lib/search/protocol';

/** Keystroke debounce before a query reaches the worker. */
const DEBOUNCE_MS = 120;

/** Result rows, one per conversation — the worker collapses duplicates. */
const RESULT_LIMIT = 25;

/**
 * The debounce lives at module scope rather than in a component effect because
 * ChatSidebarContent mounts twice at once — once in the desktop shell, once in
 * the mobile drawer. Per-component state would give the two search boxes
 * independent queries, run two debounce timers, and let each mount's dispatch
 * mark the other's in-flight query stale, so its results were never applied.
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

interface ChatSearchState {
  query: string;
  hits: SearchHit[];
  searching: boolean;
  /** True once a query has actually run, so "no matches" reads differently from "idle". */
  dispatched: boolean;
  /** Message the chat view should scroll to once its conversation opens. */
  pendingScrollMsgId: string | null;
  /** False where IndexedDB or workers are unavailable; the UI hides itself. */
  supported: boolean;
  setQuery: (text: string) => void;
  clear: () => void;
  requestScrollToMessage: (msgId: string) => void;
  clearPendingScroll: () => void;
}

export const useChatSearchStore = create<ChatSearchState>()(
  immer((set) => ({
    query: '',
    hits: [],
    searching: false,
    dispatched: false,
    pendingScrollMsgId: null,
    supported: isSearchSupported(),

    setQuery: (text: string) => {
      set(state => { state.query = text; });

      if (debounceTimer) clearTimeout(debounceTimer);

      const trimmed = text.trim();
      if (!trimmed) {
        // An empty query clears results without dispatching anything.
        set(state => {
          state.hits = [];
          state.searching = false;
          state.dispatched = false;
        });
        return;
      }

      set(state => { state.searching = true; });

      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void searchMessages(trimmed, RESULT_LIMIT)
          .then(outcome => {
            // A slower earlier keystroke must not overwrite a newer result set.
            if (!outcome.current) return;
            set(state => {
              state.hits = outcome.hits;
              state.searching = false;
              state.dispatched = true;
            });
          })
          .catch(err => {
            console.warn('[search] query failed', err);
            set(state => {
              state.hits = [];
              state.searching = false;
              state.dispatched = true;
            });
          });
      }, DEBOUNCE_MS);
    },

    clear: () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = null;
      set(state => {
        state.query = '';
        state.hits = [];
        state.searching = false;
        state.dispatched = false;
      });
    },

    requestScrollToMessage: (msgId: string) => {
      set(state => { state.pendingScrollMsgId = msgId; });
    },

    clearPendingScroll: () => {
      set(state => { state.pendingScrollMsgId = null; });
    },
  }))
);
