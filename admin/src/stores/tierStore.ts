import { create } from "zustand";
import type { AccessTier } from "@/access/tiers";

interface TierStore {
  // null until a sign-in is admitted. Not persisted: the tier is resolved fresh on every load.
  tier: AccessTier | null;
  setTier: (tier: AccessTier) => void;
  clearTier: () => void;
}

export const useTierStore = create<TierStore>()((set) => ({
  tier: null,
  setTier: (tier) => set({ tier }),
  clearTier: () => set({ tier: null }),
}));
