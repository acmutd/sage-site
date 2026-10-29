import { useCallback } from "react";
import { useTierStore } from "@/stores/tierStore";
import type { AccessTier } from "./tiers";

// PLACEHOLDER: the real admin actions aren't defined yet; these stand in for them.
export type AdminAction = "create" | "update" | "delete";

// "suggest" means the action is submitted as a suggestion that waits for approval.
export type Permission = "allowed" | "suggest" | "denied";

// PLACEHOLDER: one row per action, so real actions and rules replace this table only.
export const ACTION_PERMISSIONS: Record<AdminAction, Record<AccessTier, Permission>> = {
  create: { none: "denied", suggest: "suggest", admin: "allowed" },
  update: { none: "denied", suggest: "suggest", admin: "allowed" },
  delete: { none: "denied", suggest: "suggest", admin: "allowed" },
};

// Cosmetic only: the backend checks the tier again on every write.
export function can(tier: AccessTier | null, action: AdminAction): Permission {
  return tier ? ACTION_PERMISSIONS[action][tier] : "denied";
}

// can(action) bound to the signed-in tier.
export function useCan(): (action: AdminAction) => Permission {
  const tier = useTierStore((state) => state.tier);
  return useCallback((action) => can(tier, action), [tier]);
}
