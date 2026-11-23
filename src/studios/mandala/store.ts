import { create } from 'zustand';
import type { BaseGeometry, SymmetryType } from '../../engines/mandala/recipe';

type MandalaState = {
  seed: string;
  setSeed: (seed: string) => void;
  baseGeometry: BaseGeometry;
  symmetryType: SymmetryType;
  symmetryOrder: number;
  setBaseGeometry: (geometry: BaseGeometry) => void;
  setSymmetryType: (symmetry: SymmetryType) => void;
  setSymmetryOrder: (order: number) => void;
};

export const useMandalaStore = create<MandalaState>((set) => ({
  seed: 'lotus-001',
  setSeed: (seed) => set({ seed }),
  baseGeometry: 'circle',
  symmetryType: 'rotational',
  symmetryOrder: 12,
  setBaseGeometry: (baseGeometry) => set({ baseGeometry }),
  setSymmetryType: (symmetryType) => set({ symmetryType }),
  setSymmetryOrder: (symmetryOrder) => set({ symmetryOrder }),
}));
