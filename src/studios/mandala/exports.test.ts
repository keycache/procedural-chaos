import { describe, expect, it } from 'vitest';
import { createEditorDocument, editorRecipe, presetDocument } from './editor';
import { createMandalaPreview } from '../../engines/mandala/render';
import { generateMandala } from '../../engines/mandala/generate';
import { mandalaRecipeSchema } from '../../engines/mandala/recipe';
import { renderSvg } from '../../engines/mandala/svg';
import { exportPng, exportRecipe, exportSvg } from './exports';

describe('portable mandala output', () => {
  it('rejects PNG sizes outside the supported range before allocating a canvas', async () => {
    await expect(exportPng('<svg />', 1023, 'white')).rejects.toThrow();
    await expect(exportPng('<svg />', 8193, 'white')).rejects.toThrow();
    await expect(exportPng('<svg />', 2048.5, 'white')).rejects.toThrow();
  });
  it.each(['lotus', 'floral', 'floral-botanical'])(
    'round-trips an exact %s JSON recipe into identical artwork',
    (preset) => {
      const recipe = editorRecipe(presetDocument(preset));
      const loaded = mandalaRecipeSchema.parse(
        JSON.parse(exportRecipe(recipe)),
      );
      expect(renderSvg(generateMandala(loaded))).toBe(
        renderSvg(generateMandala(recipe)),
      );
    },
  );

  it('embeds XML-safe recipe and symmetry metadata without altering the drawn geometry', () => {
    const document = createEditorDocument();
    document.seed = 'lotus<&"study';
    const recipe = editorRecipe(document);
    const preview = createMandalaPreview(recipe);
    expect(preview.svg).toContain('<metadata>');
    expect(preview.svg).toContain('&lt;&amp;');
    expect(preview.svg).not.toContain('lotus<&');
    expect(preview.svg).toContain('data-draw-order="0"');
    expect(preview.svg).toContain('&quot;symmetry&quot;');
    expect(exportSvg(preview.svg, 'transparent')).toBe(preview.svg);
    expect(exportSvg(preview.svg, 'white')).toContain(
      '<rect width="100%" height="100%" fill="#ffffff"/>',
    );
  });

  it('makes density and negative space change geometry while preserving exact deterministic output', () => {
    const recipe = editorRecipe(createEditorDocument());
    const dense = { ...recipe, global: { ...recipe.global, density: 1 } };
    const spacious = {
      ...recipe,
      global: { ...recipe.global, negativeSpace: 0.8 },
    };
    expect(generateMandala(dense).paths.length).toBeGreaterThan(
      generateMandala(recipe).paths.length,
    );
    expect(renderSvg(generateMandala(spacious))).not.toBe(
      renderSvg(generateMandala(recipe)),
    );
    expect(renderSvg(generateMandala(spacious))).toBe(
      renderSvg(generateMandala(spacious)),
    );
  });
});
