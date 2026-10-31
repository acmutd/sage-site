import type { AdminAccess } from "./adminAccess";
import type { AccessTier } from "./tiers";

// GET /me answers { tier: 1 | 2 }; 1 = officer (read-only), 2 = lead / director / exec.
const TIER_BY_BACKEND_LEVEL: Record<number, AccessTier> = { 1: "suggest", 2: "admin" };

// UX only: the backend checks the tier again on every request.
export function createApiAdminAccess(
  getIdToken: () => Promise<string>,
  baseUrl: string | undefined = import.meta.env.VITE_ADMIN_API,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): AdminAccess {
  return {
    async getMyTier() {
      if (!baseUrl) throw new Error("VITE_ADMIN_API is not set");
      const token = await getIdToken();
      const response = await fetchImpl(`${baseUrl.replace(/\/+$/, "")}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 403 is the backend refusing this account (no qualifying officer role)
      if (response.status === 403) return "none";
      if (!response.ok) throw new Error(`GET /me failed with ${response.status}`);

      const body: unknown = await response.json();
      const level = typeof body === "object" && body !== null && "tier" in body ? body.tier : undefined;
      return (typeof level === "number" && TIER_BY_BACKEND_LEVEL[level]) || "none";
    },
  };
}
