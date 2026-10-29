import type { OfficerRecord } from "@/officers/officerDirectory";
import { ADMIN_POSITIONS, PLACEHOLDER_SAGE_TEAM } from "./tierRules";

export type AccessTier = "none" | "suggest" | "admin";

const TIER_RANK: Record<AccessTier, number> = { none: 0, suggest: 1, admin: 2 };

// PLACEHOLDER rules from the plan: admin position, then SAGE team, else deny.
// UX gate only: the backend re-checks the tier once admin APIs exist.
export function resolveTier(record: OfficerRecord | null): AccessTier {
  if (!record) return "none";
  if (ADMIN_POSITIONS.includes(record.position)) return "admin";
  if (record.team === PLACEHOLDER_SAGE_TEAM) return "suggest";
  return "none";
}

export function meetsTier(tier: AccessTier | null, min: AccessTier): boolean {
  return tier !== null && TIER_RANK[tier] >= TIER_RANK[min];
}
