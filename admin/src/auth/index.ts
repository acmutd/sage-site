import type { AdminAuthAdapter } from "./adminAuth";
import { createMockAdminAuth, type MockAdminAuthMode } from "./mockAdminAuth";

export * from "./adminAuth";

const MOCK_MODES: MockAdminAuthMode[] = ["allow", "reject", "cancel"];
const mockMode = MOCK_MODES.find((mode) => mode === import.meta.env.VITE_ADMIN_AUTH_MOCK);

// Set VITE_ADMIN_AUTH_MOCK=allow|reject|cancel to preview the UI without Firebase.
// Firebase is imported lazily so mock mode needs no Firebase env.
export async function loadAdminAuth(): Promise<AdminAuthAdapter> {
  if (mockMode) return createMockAdminAuth(mockMode);
  const [{ auth }, { createFirebaseAdminAuth }] = await Promise.all([
    import("@sage/firebase"),
    import("./firebaseAdminAuth"),
  ]);
  return createFirebaseAdminAuth(auth);
}
