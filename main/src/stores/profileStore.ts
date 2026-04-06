import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface ProfileCard {
  id: string;
  label: string;
  sublabel: string;
  enabled: boolean;
  editable: boolean;
}

interface ProfileState {
  cards: ProfileCard[];
  profilePictureType: number;

  setCards: (cards: ProfileCard[]) => void;
  toggleCard: (id: string, maxCards?: number) => void;
  reorderCards: (fromIndex: number, toIndex: number) => void;
  saveCardLabel: (id: string, label: string) => void;
  setProfilePictureType: (type: number) => void;
  syncFromCloud: (cloudCards: { id: string; enabled: boolean }[], cloudLabels?: Record<string, string>) => void;
}

export const DEFAULT_CARDS: ProfileCard[] = [
  { id: "undergrad",    label: "0 Credit Hours", sublabel: "Undergraduate",         enabled: true,  editable: false },
  { id: "startdate",   label: "—",              sublabel: "Start Date",             enabled: true,  editable: false },
  { id: "gpaundergrad",label: "—",              sublabel: "GPA Average (Undergrad)", enabled: true,  editable: false },
  { id: "gpagrad",     label: "—",              sublabel: "GPA Average (Grad)",      enabled: false, editable: false },
  { id: "grad",        label: "0 Credit Hours", sublabel: "Graduate",               enabled: false, editable: false },
  { id: "advisor",     label: "Add advisor…",   sublabel: "Advisor",                enabled: false, editable: true  },
  { id: "holds",       label: "No Holds",       sublabel: "Deadlines & Holds",      enabled: false, editable: true  },
  { id: "note",        label: "Add a note…",    sublabel: "Personal Note",          enabled: false, editable: true  },
  { id: "utdid",       label: "—",              sublabel: "UTD ID",                 enabled: false, editable: false },
];

const MAX_CARDS = 3;

export const useProfileStore = create<ProfileState>()(
  persist(
    immer((set) => ({
      cards: DEFAULT_CARDS,
      profilePictureType: 1,

      setCards: (cards) => set((state) => { state.cards = cards; }),

      toggleCard: (id, maxCards = MAX_CARDS) =>
        set((state) => {
          const target = state.cards.find((c) => c.id === id);
          if (!target) return;
          if (!target.enabled && state.cards.filter((c) => c.enabled).length >= maxCards) return;
          target.enabled = !target.enabled;
        }),

      reorderCards: (fromIndex, toIndex) =>
        set((state) => {
          const enabled = state.cards.filter((c) => c.enabled);
          const disabled = state.cards.filter((c) => !c.enabled);
          const [moved] = enabled.splice(fromIndex, 1);
          enabled.splice(toIndex, 0, moved);
          state.cards = [...enabled, ...disabled];
        }),

      saveCardLabel: (id, label) =>
        set((state) => {
          const card = state.cards.find((c) => c.id === id);
          if (card) card.label = label;
        }),

      setProfilePictureType: (type) =>
        set((state) => { state.profilePictureType = type; }),

      syncFromCloud: (cloudCards, cloudLabels = {}) =>
        set((state) => {
          const merged = cloudCards
            .map(({ id, enabled }) => {
              const local = state.cards.find((c) => c.id === id);
              if (!local) return null;
              return {
                ...local,
                enabled,
                label: local.editable && cloudLabels[id] ? cloudLabels[id] : local.label,
              };
            })
            .filter(Boolean) as ProfileCard[];

          const cloudIds = new Set(cloudCards.map((c) => c.id));
          const unsaved = state.cards.filter((c) => !cloudIds.has(c.id));
          state.cards = [...merged, ...unsaved];
        }),
    })),
    {
      name: 'profile-state',
      partialize: (state) => ({
        cards: state.cards,
        profilePictureType: state.profilePictureType,
      }),
    }
  )
);