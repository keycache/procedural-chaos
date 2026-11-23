import { create } from 'zustand';

type MandalaState = {
  seed: string;
  setSeed: (seed: string) => void;
};

export const useMandalaStore = create<MandalaState>((set) => ({
  seed: 'lotus-001',
  setSeed: (seed) => set({ seed }),
}));
