import { create } from 'zustand';
import { singleStyle } from '../../engines/mandala/styles';
import type { LayerRecipe, Style } from '../../engines/mandala/recipe';
import {
  createEditorDocument,
  editorDocumentSchema,
  editorRecipe,
  presetDocument,
  redistributeLayers,
  type EditorDocument,
} from './editor';

type MandalaState = EditorDocument & {
  projectId: string | null;
  past: EditorDocument[];
  future: EditorDocument[];
  seedHistory: string[];
  setName: (name: string) => void;
  setSeed: (seed: string) => void;
  setMode: (mode: Style | 'hybrid') => void;
  setWeight: (style: Style, weight: number) => void;
  setOptions: (options: Partial<EditorDocument['options']>) => void;
  setGlobals: (globals: EditorDocument['globals']) => void;
  resetOverrides: () => void;
  applyPreset: (id: string) => void;
  editLayer: (id: string, change: Partial<LayerRecipe>) => void;
  addLayer: (duplicateId?: string) => void;
  removeLayer: (id: string) => void;
  moveLayer: (id: string, direction: -1 | 1) => void;
  undo: () => void;
  redo: () => void;
  rememberSeed: (seed: string) => void;
  openProject: (document: unknown, id: string) => void;
  markSaved: (id: string) => void;
};

export function editorSnapshot(state: EditorDocument): EditorDocument {
  const { name, seed, mode, blend, options, globals, layers } = state;
  return { name, seed, mode, blend, options, globals, layers };
}

export const useMandalaStore = create<MandalaState>((set, get) => {
  function commit(change: Partial<EditorDocument>) {
    const before = editorSnapshot(get());
    const after = { ...before, ...change };
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    set({ ...change, past: [...get().past, before].slice(-100), future: [] });
  }
  function layers() {
    return structuredClone(get().layers ?? editorRecipe(get()).layers);
  }
  return {
    ...createEditorDocument(),
    projectId: null,
    past: [],
    future: [],
    seedHistory: [],
    setName: (name) => commit({ name }),
    setSeed: (seed) => commit({ seed }),
    setMode: (mode) =>
      commit({
        mode,
        blend:
          mode === 'hybrid'
            ? { traditional: 0.7, geometric: 0.3, organic: 0, abstract: 0 }
            : singleStyle(mode),
        options: { complexity: get().options.complexity },
        globals: {},
        layers: null,
      }),
    setWeight: (style, weight) =>
      commit({ blend: { ...get().blend, [style]: weight }, layers: null }),
    setOptions: (options) =>
      commit({ options: { ...get().options, ...options }, layers: null }),
    setGlobals: (globals) =>
      commit({ globals: { ...get().globals, ...globals } }),
    resetOverrides: () => {
      const mode = get().mode;
      commit({
        options: { complexity: get().options.complexity },
        globals: {},
        layers: null,
        blend: Object.values(get().blend).some((weight) => weight > 0)
          ? get().blend
          : mode === 'hybrid'
            ? { traditional: 0.7, geometric: 0.3, organic: 0, abstract: 0 }
            : singleStyle(mode),
      });
    },
    applyPreset: (id) => commit(presetDocument(id)),
    editLayer: (id, change) => {
      const current = layers();
      const index = current.findIndex((layer) => layer.id === id);
      if (index < 0) throw new Error('That layer does not exist.');
      current[index] = { ...current[index], ...change, id };
      commit({ layers: current });
    },
    addLayer: (duplicateId) => {
      const current = layers();
      if (current.length >= 12)
        throw new Error('The editor supports at most 12 layers.');
      const source = duplicateId
        ? current.find((layer) => layer.id === duplicateId)
        : current.at(-1);
      if (!source) throw new Error('Choose an existing layer to duplicate.');
      const id = `layer-${crypto.randomUUID()}`;
      const layer: LayerRecipe = {
        ...structuredClone(source),
        id,
        seedOffset: (source.seedOffset + 1) % 1_000_001,
      };
      if (!duplicateId)
        Object.assign(layer, {
          motif: 'petal',
          distribution: 'ring',
          recursionDepth: 0,
        });
      current.splice(
        duplicateId ? current.indexOf(source) + 1 : current.length,
        0,
        layer,
      );
      commit({ layers: redistributeLayers(current) });
    },
    removeLayer: (id) => {
      const current = layers();
      if (!current.some((layer) => layer.id === id))
        throw new Error('That layer does not exist.');
      commit({
        layers: redistributeLayers(current.filter((layer) => layer.id !== id)),
      });
    },
    moveLayer: (id, direction) => {
      const current = layers();
      const index = current.findIndex((layer) => layer.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length)
        throw new Error('Cannot move the layer in that direction.');
      const slots = current.map(({ innerRadius, outerRadius }) => ({
        innerRadius,
        outerRadius,
      }));
      [current[index], current[target]] = [current[target], current[index]];
      commit({
        layers: current.map((layer, position) => ({
          ...layer,
          ...slots[position],
        })),
      });
    },
    undo: () => {
      const previous = get().past.at(-1);
      if (previous)
        set({
          ...previous,
          past: get().past.slice(0, -1),
          future: [editorSnapshot(get()), ...get().future],
        });
    },
    redo: () => {
      const next = get().future[0];
      if (next)
        set({
          ...next,
          past: [...get().past, editorSnapshot(get())],
          future: get().future.slice(1),
        });
    },
    rememberSeed: (seed) =>
      set({
        seedHistory: [
          seed,
          ...get().seedHistory.filter((item) => item !== seed),
        ].slice(0, 12),
      }),
    openProject: (input, projectId) => {
      const document = editorDocumentSchema.parse(input);
      editorRecipe(document);
      set({ ...document, projectId, past: [], future: [] });
    },
    markSaved: (projectId) => set({ projectId }),
  };
});
