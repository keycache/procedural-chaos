import { describe, expect, it } from 'vitest';
import { createBoldFloralRecipe } from './bold-floral';
import { generateMandala } from './generate';
import {
  borderClearance,
  createBeadedBorder,
  decorateOrnament,
  ornamentMetrics,
  pathFits,
} from './ornament-decoration';
import {
  createOrnamentShape,
  sampleContour,
  type OrnamentKind,
} from './ornament-shapes';
import {
  mandalaRecipeSchema,
  ornamentTreatments,
  type OrnamentSettings,
} from './recipe';
import { renderSvg } from './svg';

const settings: OrnamentSettings = {
  version: 1,
  treatment: 'botanical',
  spacing: 0.35,
};
const kinds: OrnamentKind[] = ['leaf', 'lotus-petal', 'paisley', 'scallop'];

describe('shape-aware ornament vocabulary', () => {
  it.each(kinds)(
    'fits every treatment into a curved %s with measured stroke-aware clearance and readable closed features',
    (kind) => {
      const shape = createOrnamentShape(kind, { width: 0.28, bend: 0.04 });
      const metrics = ornamentMetrics(settings, 2.5);
      for (const treatment of ornamentTreatments) {
        const decorated = decorateOrnament(
          shape,
          { ...settings, treatment },
          1,
          2.5,
          'vocabulary-008',
        );
        expect(decorated.paths.length).toBeGreaterThan(2);
        expect(decorated.paths.length).toBeLessThanOrEqual(128);
        if (treatment === 'contour')
          expect(
            decorated.paths.filter((path) => path.role === 'solid-accent')
              .length,
          ).toBeGreaterThan(2);
        for (const path of decorated.paths) {
          const sampled = sampleContour(path.d, 64);
          const minimum = metrics.clearance + (2.5 * path.weight) / (465 * 2);
          for (const point of sampled)
            expect(
              borderClearance(shape.interior, point),
            ).toBeGreaterThanOrEqual(minimum - 1e-10);
          if (path.role !== 'decoration') {
            expect(path.d.at(-1)?.type).toBe('Z');
            const width =
              Math.max(...sampled.map((p) => p.x)) -
              Math.min(...sampled.map((p) => p.x));
            const height =
              Math.max(...sampled.map((p) => p.y)) -
              Math.min(...sampled.map((p) => p.y));
            expect(Math.min(width, height)).toBeGreaterThanOrEqual(
              metrics.minimumFeature - 1e-6,
            );
          }
        }
      }
      expect(shape.at(0, 0)).toEqual(shape.attachments.base);
      expect(shape.at(1, 0)).toEqual(shape.attachments.tip);
      expect(shape.spine.some((command) => command.type === 'C')).toBe(true);
    },
  );

  it('measures bead spacing around contours, including across tips and the closed seam', () => {
    const shape = createOrnamentShape('leaf');
    const radius = 0.006;
    const spacing = 0.016;
    const beads = createBeadedBorder(shape, 0.7, radius, spacing, 48);
    expect(beads.length).toBeGreaterThan(10);
    for (let a = 0; a < beads.length; a++)
      for (let b = a + 1; b < beads.length; b++)
        expect(
          Math.hypot(
            beads[a].center.x - beads[b].center.x,
            beads[a].center.y - beads[b].center.y,
          ),
        ).toBeGreaterThanOrEqual(radius * 2 + spacing - 1e-10);
    const wider = createBeadedBorder(shape, 0.7, radius, spacing * 3, 48);
    expect(wider.length).toBeLessThan(beads.length);
  });

  it('retains a readable paisley outline in the actual narrow floral leaf, not just its curl', () => {
    const shape = createOrnamentShape('leaf', {
      base: 0.29,
      tip: 0.8,
      width: 0.175,
    });
    const decorated = decorateOrnament(
      shape,
      { ...settings, treatment: 'paisley' },
      0.65,
      2.5,
      'flourish-008',
    );
    expect(
      decorated.paths.some(
        (path) => path.id === 'paisley' && path.role === 'region-boundary',
      ),
    ).toBe(true);
  });

  it.each(ornamentTreatments)(
    'produces deterministic, bounded %s details without changing the floral silhouette',
    (treatment) => {
      const original = createBoldFloralRecipe('flourish-008', 1, 12);
      const recipe = mandalaRecipeSchema.parse({
        ...original,
        composition: {
          ...original.composition,
          ornament: { ...settings, treatment },
        },
      });
      const model = generateMandala(recipe);
      const outlines = (value: typeof model) =>
        value.paths
          .filter((path) => path.occludes)
          .map((path) => ({ id: path.id, d: path.d }));
      expect(outlines(model)).toEqual(outlines(generateMandala(original)));
      expect(model.paths.length).toBeLessThan(4000);
      expect(model.ornamentFit).toBeDefined();
      expect(renderSvg(generateMandala(recipe), recipe)).toBe(
        renderSvg(model, recipe),
      );
      const sparse = mandalaRecipeSchema.parse({
        ...recipe,
        composition: { ...recipe.composition, complexity: 0 },
      });
      expect(renderSvg(generateMandala(sparse), sparse)).not.toBe(
        renderSvg(model, recipe),
      );
    },
  );

  it('keeps veins and curls open and reports constraints rather than silently accepting invalid or empty detail', () => {
    const shape = createOrnamentShape('leaf');
    const botanical = decorateOrnament(
      shape,
      settings,
      0.65,
      2.5,
      'vocabulary-008',
    );
    expect(
      botanical.paths.some(
        (path) => path.role === 'decoration' && path.d.at(-1)?.type !== 'Z',
      ),
    ).toBe(true);
    expect(() =>
      decorateOrnament(shape, { ...settings, spacing: 2 }, 0.5, 2.5, 'bad'),
    ).toThrow();
    expect(() => decorateOrnament(shape, settings, 2, 2.5, 'bad')).toThrow(
      'detail',
    );
    expect(() =>
      decorateOrnament(
        createOrnamentShape('leaf', { width: 0.001, tip: 0.01 }),
        settings,
        1,
        8,
        'tiny',
      ),
    ).toThrow('no room');
    expect(() => sampleContour(shape.contour, 1000)).toThrow('subdivision');
    expect(() => pathFits([], shape.interior, 0)).toThrow('fitting');
    expect(() => createBeadedBorder(shape, 0.7, NaN, 0.02, 10)).toThrow(
      'Beaded borders',
    );
    const rejected = [
      {
        ...createBoldFloralRecipe('invalid'),
        composition: {
          family: 'bold-floral',
          version: 1,
          complexity: 0.65,
          ornament: { ...settings, version: 2 },
        },
      },
    ];
    for (const recipe of rejected)
      expect(mandalaRecipeSchema.safeParse(recipe).success).toBe(false);
  });
});
