import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
    plannerSidebarWidth: number;
    chatSidebarWidth: number;
    setPlannerSidebarWidth: (width: number) => void;
    setChatSidebarWidth: (width: number) => void;
}

export const useUIStore = create<UIStore>()(
    persist(
        (set) => ({
            plannerSidebarWidth: 320,
            chatSidebarWidth: 300,
            setPlannerSidebarWidth: (width) => set({ plannerSidebarWidth: width }),
            setChatSidebarWidth: (width) => set({ chatSidebarWidth: width }),
        }),
        { name: 'ui-state' }
    )
);