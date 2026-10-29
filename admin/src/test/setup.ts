import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { useTierStore } from "@/stores/tierStore";

// Testing Library only auto-cleans when vitest globals are on
afterEach(cleanup);
// The store is a module singleton, so reset it between tests
afterEach(() => useTierStore.getState().clearTier());
