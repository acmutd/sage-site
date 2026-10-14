import { afterEach, vi } from "vitest";
import { useAccountSettingsStore } from "@/stores/accountsettingStore";

vi.mock("@/firebase-config", () => ({
    app: {},
    analytics: {},
    auth: {},
    db: {},
}));

function createMemoryStorage(): Storage {
    let store: Record<string, string> = {};
    return {
        get length() {
            return Object.keys(store).length;
        },
        clear: () => {
            store = {};
        },
        getItem: (key: string) => (key in store ? store[key] : null),
        key: (index: number) => Object.keys(store)[index] ?? null,
        removeItem: (key: string) => {
            delete store[key];
        },
        setItem: (key: string, value: string) => {
            store[key] = String(value);
        },
    } as unknown as Storage;
}

for (const name of ["localStorage", "sessionStorage"] as const) {
    let working = false;
    try {
        working = typeof (globalThis as Record<string, any>)[name]?.clear === "function";
    } catch {
        working = false;
    }
    if (!working) {
        Object.defineProperty(globalThis, name, {
            value: createMemoryStorage(),
            configurable: true,
            writable: true,
        });
    }
}

afterEach(() => {
    useAccountSettingsStore.setState({ open: false });
});