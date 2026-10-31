import type { AdminAuthAdapter } from "@/auth/adminAuth";
import { createMockAdminAccess, type AdminAccess } from "./adminAccess";
import { createApiAdminAccess } from "./apiAdminAccess";
import type { AccessTier } from "./tiers";

export type { AdminAccess } from "./adminAccess";

const MOCK_TIERS: AccessTier[] = ["none", "suggest", "admin"];

// With VITE_ADMIN_AUTH_MOCK set (UI preview without Firebase), VITE_ADMIN_MOCK_TIER picks the tier.
// Otherwise the backend decides.
export function loadAdminAccess(auth: AdminAuthAdapter): AdminAccess {
  if (import.meta.env.VITE_ADMIN_AUTH_MOCK) {
    const tier = MOCK_TIERS.find((t) => t === import.meta.env.VITE_ADMIN_MOCK_TIER);
    return createMockAdminAccess(tier ?? "admin");
  }
  return createApiAdminAccess(() => auth.getIdToken());
}
