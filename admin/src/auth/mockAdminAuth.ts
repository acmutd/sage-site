import { AdminAccessError, type AdminAuthAdapter } from "./adminAuth";

// Set VITE_ADMIN_AUTH_MOCK=reject to preview the rejection toast.
const MOCK_MODE = import.meta.env.VITE_ADMIN_AUTH_MOCK === "reject" ? "reject" : "allow";

export function createMockAdminAuth(mode: "allow" | "reject" = MOCK_MODE, delayMs = 600): AdminAuthAdapter {
  return {
    async signInWithGoogle() {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (mode === "reject") throw new AdminAccessError();
      return { email: "officer@acmutd.co", displayName: "Mock Officer" };
    },
  };
}
