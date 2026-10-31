// The backend decides the tier (GET /me). This file only orders the tiers for the UI.
export type AccessTier = "none" | "suggest" | "admin";

const TIER_RANK: Record<AccessTier, number> = { none: 0, suggest: 1, admin: 2 };

export function meetsTier(tier: AccessTier | null, min: AccessTier): boolean {
  return tier !== null && TIER_RANK[tier] >= TIER_RANK[min];
}
