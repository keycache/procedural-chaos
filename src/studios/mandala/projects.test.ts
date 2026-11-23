import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../shared/storage';
import { createMandalaPreview } from '../../engines/mandala/render';
import { createEditorDocument, editorRecipe } from './editor';
import { readMandalaProject, saveMandalaProject } from './projects';

afterEach(async () => {
  await deleteDB('procedural-chaos');
});

describe('saved mandala projects', () => {
  it('persists exact editor settings and recipe across database connections, then updates instead of duplicating', async () => {
    const document = createEditorDocument();
    const recipe = editorRecipe(document);
    const preview = createMandalaPreview(recipe);
    const saved = await saveMandalaProject(document, recipe, preview.svg, null);
    const database = await openDatabase();
    const item = await database.get('mandalas', saved.id);
    database.close();
    if (!item) throw new Error('The saved project is missing.');
    const loaded = readMandalaProject(item);
    expect(editorRecipe(loaded.data.document)).toEqual(recipe);
    expect(createMandalaPreview(loaded.data.recipe).svg).toBe(preview.svg);
    expect(loaded.data.svg).toBe(preview.svg);
    document.name = 'Renamed study';
    const updated = await saveMandalaProject(
      document,
      recipe,
      preview.svg,
      saved.id,
    );
    expect(updated.createdAt).toBe(saved.createdAt);
    expect(updated.id).toBe(saved.id);
    const reopened = await openDatabase();
    try {
      expect(await reopened.count('mandalas')).toBe(1);
    } finally {
      reopened.close();
    }
  });

  it('rejects invalid names, unsupported versions and mismatched editor/recipe data', async () => {
    const document = createEditorDocument();
    const recipe = editorRecipe(document);
    const svg = createMandalaPreview(recipe).svg;
    await expect(
      saveMandalaProject({ ...document, name: '' }, recipe, svg, null),
    ).rejects.toThrow('project name');
    await expect(
      saveMandalaProject(
        document,
        { ...recipe, seed: 'mismatched' },
        svg,
        null,
      ),
    ).rejects.toThrow('do not match');
    expect(() =>
      readMandalaProject({
        id: 'old',
        name: 'old',
        schemaVersion: 99,
        createdAt: '',
        updatedAt: '',
        data: {},
      }),
    ).toThrow('Unsupported');
  });
});
