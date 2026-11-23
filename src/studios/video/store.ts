import { create } from 'zustand';

type VideoState = {
  seed: string;
  setSeed: (seed: string) => void;
};

export const useVideoStore = create<VideoState>((set) => ({
  seed: 'color-001',
  setSeed: (seed) => set({ seed }),
}));
