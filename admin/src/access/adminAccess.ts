import type { AccessTier } from "./tiers";

// The only way admin learns what the signed-in user may do. The backend owns the rules.
export interface AdminAccess {
  // Resolves "none" when the backend refuses the account. Rejects on anything else
  // (network, misconfiguration), which must not read as "not allowed".
  getMyTier(): Promise<AccessTier>;
}

// Preview/test stand-in: answers the given tier for whichever account signs in.
export function createMockAdminAccess(tier: AccessTier): AdminAccess {
  return { getMyTier: async () => tier };
}
