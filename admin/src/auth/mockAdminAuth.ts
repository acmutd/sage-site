import { AdminAccessError, SignInCancelledError, type AdminAuthAdapter } from "./adminAuth";

export type MockAdminAuthMode = "allow" | "reject" | "cancel";

export function createMockAdminAuth(mode: MockAdminAuthMode = "allow", delayMs = 600): AdminAuthAdapter {
  return {
    async signInWithGoogle() {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (mode === "reject") throw new AdminAccessError();
      if (mode === "cancel") throw new SignInCancelledError();
      return { email: "officer@acmutd.co", displayName: "Mock Officer" };
    },
    async resumeSession() {
      return null;
    },
    async signOut() {},
    async getIdToken() {
      return "mock-id-token";
    },
  };
}
