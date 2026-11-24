import { beforeEach, describe, expect, it } from 'vitest';
import { singleStyle } from '../../engines/mandala/styles';
import { editorSnapshot, useMandalaStore } from './store';
import {
  createEditorDocument,
  editorRecipe,
  matchingPresetId,
  presets,
} from './editor';
import { renderSvg } from '../../engines/mandala/svg';
import { generateMandala } from '../../engines/mandala/generate';

describe('style editor state', () => {
  it('keeps ornament selection, spacing, undo, and old project reopening consistent', () => {
    const state = useMandalaStore.getState();
    state.applyPreset('floral-botanical');
    const botanical = editorSnapshot(useMandalaStore.getState());
    expect(editorRecipe(botanical).composition?.ornament).toEqual({
      version: 1,
      treatment: 'botanical',
      spacing: 0.35,
    });
    state.setOrnament({ version: 1, treatment: 'botanical', spacing: 0.7 });
    expect(matchingPresetId(useMandalaStore.getState())).toBe('');
    state.undo();
    expect(matchingPresetId(useMandalaStore.getState())).toBe(
      'floral-botanical',
    );
    state.applyPreset('floral');
    expect(useMandalaStore.getState().ornament).toBeUndefined();
    state.undo();
    expect(editorSnapshot(useMandalaStore.getState())).toEqual(botanical);
    state.setMode('geometric');
    expect(useMandalaStore.getState().ornament).toBeUndefined();
    state.undo();
    expect(editorSnapshot(useMandalaStore.getState())).toEqual(botanical);
    const legacy = createEditorDocument();
    delete legacy.ornament;
    state.openProject(legacy, 'legacy-project');
    expect(useMandalaStore.getState().ornament).toBeUndefined();
    expect(
      editorRecipe(useMandalaStore.getState()).composition,
    ).toBeUndefined();
  });

  beforeEach(() => {
    useMandalaStore.setState(useMandalaStore.getInitialState(), true);
  });

  it('keeps only the latest 100 edits in undo history', () => {
    const state = useMandalaStore.getState();
    for (let index = 0; index < 110; index++) state.setSeed(`history-${index}`);
    expect(useMandalaStore.getState().past).toHaveLength(100);
    for (let index = 0; index < 100; index++) state.undo();
    expect(useMandalaStore.getState().seed).toBe('history-9');
    expect(useMandalaStore.getState().past).toHaveLength(0);
    state.redo();
    expect(useMandalaStore.getState().seed).toBe('history-10');
  });

  it('enforces twelve-layer and one-layer boundaries without destroying the valid composition', () => {
    const state = useMandalaStore.getState();
    for (let index = 0; index < 4; index++) state.addLayer();
    expect(editorRecipe(useMandalaStore.getState()).layers).toHaveLength(12);
    expect(() => state.addLayer()).toThrow('at most 12');
    for (let index = 0; index < 11; index++)
      state.removeLayer(editorRecipe(useMandalaStore.getState()).layers[0].id);
    const last = editorRecipe(useMandalaStore.getState()).layers[0];
    expect(() => state.removeLayer(last.id)).toThrow('between 1 and 12');
    expect(editorRecipe(useMandalaStore.getState()).layers).toHaveLength(1);
  });

  it('switches styles without carrying stale overrides or changing the seed and complexity', () => {
    const state = useMandalaStore.getState();
    state.setSeed('my-study');
    state.setOptions({
      complexity: 0.4,
      centers: 4,
      symmetryType: 'none',
      noise: 0.8,
    });
    state.setMode('geometric');
    expect(useMandalaStore.getState()).toMatchObject({
      seed: 'my-study',
      blend: singleStyle('geometric'),
      options: { complexity: 0.4 },
    });
    expect(useMandalaStore.getState().options.centers).toBeUndefined();
  });

  it.each(['bold-floral', 'ornate-lotus'] as const)(
    'opts into %s geometry without carrying ring controls and restores custom layers through undo',
    (mode) => {
      const state = useMandalaStore.getState();
      state.addLayer();
      state.setOptions({ centers: 3, noise: 0.4 });
      state.addLayer();
      const original = editorSnapshot(useMandalaStore.getState());
      state.setMode(mode);
      const floral = editorRecipe(useMandalaStore.getState());
      expect(floral.composition?.family).toBe(mode);
      expect(floral.layers).toEqual([]);
      expect(floral.structure.symmetryOrder).toBe(8);
      state.setOptions({ symmetryOrder: 12, complexity: 0.9 });
      state.setGlobals({ strokeWidth: 3 });
      expect(editorRecipe(useMandalaStore.getState())).toMatchObject({
        composition: { complexity: 0.9 },
        structure: { symmetryOrder: 12 },
        global: { strokeWidth: 3 },
      });

      state.undo();
      state.undo();
      state.undo();
      expect(editorSnapshot(useMandalaStore.getState())).toEqual(original);
      state.redo();
      expect(editorRecipe(useMandalaStore.getState())).toEqual(floral);
      state.setMode('geometric');
      expect(
        editorRecipe(useMandalaStore.getState()).composition,
      ).toBeUndefined();
    },
  );

  it('clears floral ornament overrides for the curated lotus and restores them on undo', () => {
    const state = useMandalaStore.getState();
    state.applyPreset('floral-botanical');
    const floral = editorSnapshot(useMandalaStore.getState());
    state.applyPreset('ornate-lotus');
    expect(matchingPresetId(useMandalaStore.getState())).toBe('ornate-lotus');
    expect(useMandalaStore.getState().ornament).toBeUndefined();
    expect(() =>
      editorRecipe({
        ...editorSnapshot(useMandalaStore.getState()),
        ornament: floral.ornament,
      }),
    ).toThrow('curated');
    state.undo();
    expect(editorSnapshot(useMandalaStore.getState())).toEqual(floral);
    state.redo();
    const lotus = editorSnapshot(useMandalaStore.getState());
    state.openProject(lotus, 'lotus-project');
    expect(matchingPresetId(useMandalaStore.getState())).toBe('ornate-lotus');
  });

  it('restores style defaults while preserving a valid custom blend', () => {
    const state = useMandalaStore.getState();
    state.setMode('hybrid');
    state.setWeight('organic', 0.8);
    state.setOptions({ distribution: 'scatter', centers: 4 });
    const blend = useMandalaStore.getState().blend;
    state.resetOverrides();
    expect(useMandalaStore.getState().blend).toEqual(blend);
    expect(useMandalaStore.getState().options).toEqual({ complexity: 0.65 });
  });

  it('recovers from an all-zero hybrid instead of leaving the restore action broken', () => {
    const state = useMandalaStore.getState();
    state.setMode('hybrid');
    state.setWeight('traditional', 0);
    state.setWeight('geometric', 0);
    expect(
      Object.values(useMandalaStore.getState().blend).every(
        (weight) => weight === 0,
      ),
    ).toBe(true);
    state.resetOverrides();
    expect(useMandalaStore.getState().blend).toEqual({
      traditional: 0.7,
      geometric: 0.3,
      organic: 0,
      abstract: 0,
    });
  });

  it('creates valid distinct recipes for every curated starting point', () => {
    const recipes = presets.map((preset) => {
      useMandalaStore.getState().applyPreset(preset.id);
      return editorRecipe(useMandalaStore.getState());
    });
    expect(
      new Set(recipes.map((recipe) => renderSvg(generateMandala(recipe)))).size,
    ).toBe(presets.length);
  });

  it('identifies selected presets and keeps the selection aligned with edits, history, and reopened projects', () => {
    const state = useMandalaStore.getState();
    for (const preset of presets) {
      state.applyPreset(preset.id);
      expect(matchingPresetId(useMandalaStore.getState())).toBe(preset.id);
    }
    state.setName('My renamed project');
    expect(matchingPresetId(useMandalaStore.getState())).toBe('wild');
    const saved = editorSnapshot(useMandalaStore.getState());
    state.setSeed('custom-seed');
    expect(matchingPresetId(useMandalaStore.getState())).toBe('');
    state.undo();
    expect(matchingPresetId(useMandalaStore.getState())).toBe('wild');
    state.redo();
    expect(matchingPresetId(useMandalaStore.getState())).toBe('');
    state.openProject(saved, 'saved-preset');
    expect(matchingPresetId(useMandalaStore.getState())).toBe('wild');
    state.setGlobals({ density: 0.8 });
    expect(matchingPresetId(useMandalaStore.getState())).toBe('');
    state.undo();
    state.setOptions({ twist: 0.3 });
    expect(matchingPresetId(useMandalaStore.getState())).toBe('');
    state.undo();
    state.addLayer();
    expect(matchingPresetId(useMandalaStore.getState())).toBe('');
  });

  it('adds, duplicates, reorders, disables and removes layers without corrupting radial ordering', () => {
    const state = useMandalaStore.getState();
    const original = editorRecipe(state);
    state.addLayer(original.layers[0].id);
    const duplicated = editorRecipe(useMandalaStore.getState());
    expect(duplicated.layers).toHaveLength(original.layers.length + 1);
    expect(duplicated.layers[1].motif).toBe(original.layers[0].motif);
    expect(duplicated.layers[1].id).not.toBe(original.layers[0].id);
    const id = duplicated.layers[1].id;
    state.moveLayer(id, 1);
    expect(editorRecipe(useMandalaStore.getState()).layers[2].id).toBe(id);
    state.editLayer(id, { enabled: false, motif: 'leaf', count: 32 });
    expect(editorRecipe(useMandalaStore.getState()).layers[2]).toMatchObject({
      enabled: false,
      motif: 'leaf',
      count: 32,
    });
    state.removeLayer(id);
    expect(editorRecipe(useMandalaStore.getState()).layers).toHaveLength(
      original.layers.length,
    );
    state.addLayer();
    expect(editorRecipe(useMandalaStore.getState()).layers.at(-1)?.motif).toBe(
      'petal',
    );
  });

  it('restores exact recipes through undo/redo and discards the redo branch after a new edit', () => {
    const state = useMandalaStore.getState();
    const original = editorRecipe(state);
    state.addLayer();
    state.setGlobals({ density: 0.8, negativeSpace: 0.3, strokeWidth: 3 });
    const edited = editorRecipe(useMandalaStore.getState());
    expect(edited.layers.length).toBeGreaterThan(original.layers.length);
    state.undo();
    state.undo();
    expect(editorRecipe(useMandalaStore.getState())).toEqual(original);
    state.redo();
    state.redo();
    expect(editorRecipe(useMandalaStore.getState())).toEqual(edited);
    state.undo();
    state.setSeed('another-branch');
    expect(useMandalaStore.getState().future).toEqual([]);
  });

  it('keeps global edits on custom layers but rebuilds them for structural changes, with undo available', () => {
    const state = useMandalaStore.getState();
    state.addLayer();
    const custom = useMandalaStore.getState().layers;
    state.setGlobals({ density: 0.2 });
    expect(useMandalaStore.getState().layers).toEqual(custom);
    state.setOptions({ symmetryOrder: 12 });
    expect(useMandalaStore.getState().layers).toBeNull();
    state.undo();
    expect(useMandalaStore.getState().layers).toEqual(custom);
  });

  it('keeps unique bounded recent seeds and rejects invalid saved documents before changing the editor', () => {
    const state = useMandalaStore.getState();
    for (let index = 0; index < 15; index++)
      state.rememberSeed(`seed-${index}`);
    state.rememberSeed('seed-14');
    expect(useMandalaStore.getState().seedHistory).toHaveLength(12);
    expect(useMandalaStore.getState().seedHistory[0]).toBe('seed-14');
    expect(() => state.openProject({ bad: true }, 'bad')).toThrow();
    expect(useMandalaStore.getState().projectId).toBeNull();
  });
});
