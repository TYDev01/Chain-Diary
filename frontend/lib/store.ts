import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  address: string | null;
  isPremium: boolean;
  freeImageCount: number;
  streak: number;
  lastRewardTimestamp: number;
  volumes: Array<{
    cid: string;
    timestamp: number;
  }>;
  setUser: (data: Partial<Omit<UserState, "setUser" | "clearUser">>) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      address: null,
      isPremium: false,
      freeImageCount: 0,
      streak: 0,
      lastRewardTimestamp: 0,
      volumes: [],
      setUser: (data) => set((state) => ({ ...state, ...data })),
      clearUser: () =>
        set({
          address: null,
          isPremium: false,
          freeImageCount: 0,
          streak: 0,
          lastRewardTimestamp: 0,
          volumes: [],
        }),
    }),
    {
      name: "chain-diary-user",
    }
  )
);

interface DiaryState {
  currentEntry: {
    text: string;
    imageCIDs: string[];
  };
  isCreating: boolean;
  setCurrentEntry: (entry: { text: string; imageCIDs: string[] }) => void;
  addImageCID: (cid: string) => void;
  removeImageCID: (cid: string) => void;
  clearEntry: () => void;
  setIsCreating: (isCreating: boolean) => void;
}

export const useDiaryStore = create<DiaryState>((set) => ({
  currentEntry: {
    text: "",
    imageCIDs: [],
  },
  isCreating: false,
  setCurrentEntry: (entry) => set({ currentEntry: entry }),
  addImageCID: (cid) =>
    set((state) => ({
      currentEntry: {
        ...state.currentEntry,
        imageCIDs: [...state.currentEntry.imageCIDs, cid],
      },
    })),
  removeImageCID: (cid) =>
    set((state) => ({
      currentEntry: {
        ...state.currentEntry,
        imageCIDs: state.currentEntry.imageCIDs.filter((c) => c !== cid),
      },
    })),
  clearEntry: () =>
    set({
      currentEntry: {
        text: "",
        imageCIDs: [],
      },
    }),
  setIsCreating: (isCreating) => set({ isCreating }),
}));
