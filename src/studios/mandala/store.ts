import { create } from 'zustand';
import { singleStyle, type StyleOptions } from '../../engines/mandala/styles';
import type { Style, StyleBlend } from '../../engines/mandala/recipe';

type MandalaState = {
  seed: string;
  mode: Style | 'hybrid';
  blend: StyleBlend;
  options: Omit<StyleOptions, 'seed' | 'blend'>;
  setSeed: (seed: string) => void;
  setMode: (mode: Style | 'hybrid') => void;
  setWeight: (style: Style, weight: number) => void;
  setOptions: (options: Partial<MandalaState['options']>) => void;
  resetOverrides: () => void;
};

export const useMandalaStore = create<MandalaState>((set) => ({
  seed: 'lotus-001',
  mode: 'traditional',
  blend: singleStyle('traditional'),
  options: { complexity: 0.65 },
  setSeed: (seed) => set({ seed }),
  setMode: (mode) =>
    set((state) => ({
      mode,
      blend:
        mode === 'hybrid'
          ? { traditional: 0.7, geometric: 0.3, organic: 0, abstract: 0 }
          : singleStyle(mode),
      options: { complexity: state.options.complexity },
    })),
  setWeight: (style, weight) =>
    set((state) => ({
      blend: { ...state.blend, [style]: weight },
    })),
  setOptions: (options) =>
    set((state) => ({ options: { ...state.options, ...options } })),
  resetOverrides: () =>
    set((state) => ({
      options: { complexity: state.options.complexity },
      blend: Object.values(state.blend).some((weight) => weight > 0)
        ? state.blend
        : state.mode === 'hybrid'
          ? { traditional: 0.7, geometric: 0.3, organic: 0, abstract: 0 }
          : singleStyle(state.mode),
    })),
}));
