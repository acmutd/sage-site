import { create } from "zustand";

interface AccountSettingsState {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export const useAccountSettingsStore = create<AccountSettingsState>((set) => ({
    open: false,
    setOpen: (open) => set({ open }),
}));