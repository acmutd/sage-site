import { createMockAdminAuth } from "./mockAdminAuth";

export * from "./adminAuth";

// Phase 2 replaces this with the Firebase adapter.
export const adminAuth = createMockAdminAuth();
