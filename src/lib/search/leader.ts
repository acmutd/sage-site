/**
 * Leader election over BroadcastChannel.
 *
 * Several tabs each running a worker against the same IndexedDB is a real bug
 * class. Only the leader drains `dirty` and writes `indexBlob`; every tab still
 * queries its own in-memory index, which is read-only work.
 *
 * The rule is "lowest live tab id leads". Tabs claim eagerly and step down on
 * hearing from a lower-id peer, so a lone tab starts indexing immediately and a
 * crowd converges within one heartbeat. Writes to `indexBlob` are idempotent
 * last-write-wins, so the brief overlap during a handover costs duplicate work
 * but never correctness.
 */

import { SEARCH_CHANNEL, type ChannelMessage } from "./protocol";

const HEARTBEAT_INTERVAL = 2000;
/** A peer silent for longer than this is considered gone. */
const STALE_AFTER = 5000;

export interface Leadership {
  isLeader(): boolean;
  /** Tells other tabs a conversation needs reindexing. */
  broadcastDirty(convoId: string): void;
  /** Tells other tabs the persisted index moved on. */
  broadcastIndexUpdated(): void;
  stop(): void;
}

export interface LeadershipHandlers {
  onDirty(convoId: string): void;
  onIndexUpdated(): void;
  onBecameLeader(): void;
}

export function startLeadership(handlers: LeadershipHandlers): Leadership {
  const tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(SEARCH_CHANNEL);
  } catch {
    // No BroadcastChannel (older Safari): this tab simply always leads.
  }

  const peers = new Map<string, number>();
  let leader = false;

  const post = (message: ChannelMessage) => {
    try {
      channel?.postMessage(message);
    } catch {
      // A closed channel is not worth failing a search over.
    }
  };

  const evaluate = () => {
    const cutoff = Date.now() - STALE_AFTER;
    for (const [id, seenAt] of peers) {
      if (seenAt < cutoff) peers.delete(id);
    }

    let hasLowerPeer = false;
    for (const id of peers.keys()) {
      if (id < tabId) {
        hasLowerPeer = true;
        break;
      }
    }

    const next = !hasLowerPeer;
    const promoted = next && !leader;
    leader = next;
    if (promoted) handlers.onBecameLeader();
  };

  if (channel) {
    channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
      const message = event.data;
      if (!message) return;

      if (message.type === "heartbeat") {
        if (message.tabId === tabId) return;
        peers.set(message.tabId, Date.now());
        evaluate();
        return;
      }

      if (message.type === "dirty") {
        handlers.onDirty(message.convoId);
        return;
      }

      if (message.type === "indexUpdated") {
        handlers.onIndexUpdated();
      }
    };
  }

  const beat = () => {
    post({ type: "heartbeat", tabId, at: Date.now() });
    evaluate();
  };

  const interval = setInterval(beat, HEARTBEAT_INTERVAL);
  beat();

  return {
    isLeader: () => leader,
    broadcastDirty: (convoId: string) => post({ type: "dirty", convoId }),
    broadcastIndexUpdated: () => post({ type: "indexUpdated", at: Date.now() }),
    stop: () => {
      clearInterval(interval);
      try {
        channel?.close();
      } catch {
        // Already closed.
      }
    },
  };
}
