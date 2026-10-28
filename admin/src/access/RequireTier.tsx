import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAdminSession } from "@/auth/AdminSession";
import { useTierStore } from "@/stores/tierStore";
import { meetsTier, type AccessTier } from "./tiers";

// Wraps admin routes. "none" never gets past login, since admission signs it out.
export function RequireTier({ min, children }: { min: Exclude<AccessTier, "none">; children: ReactNode }) {
  const { status } = useAdminSession();
  const tier = useTierStore((state) => state.tier);

  if (status === "checking") return null;
  if (status === "signedOut" || tier === null) return <Navigate to="/login" replace />;
  // Signed in, but this route needs a higher tier
  if (!meetsTier(tier, min)) return <Navigate to="/" replace />;
  return children;
}
