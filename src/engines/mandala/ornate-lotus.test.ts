import { describe, expect, it } from 'vitest';
import { createOrnateLotusRecipe } from './ornate-lotus';
import { generateMandala } from './generate';
import { mapPath } from './geometry';
import { mandalaRecipeSchema } from './recipe';
import { renderSvg, serializePath } from './svg';
import { transformPath } from './symmetry';

describe('ornate layered lotus', () => {
  it('reproduces coordinated seeded crowns while detail leaves their silhouettes unchanged', () => {
    const recipe = createOrnateLotusRecipe('lotus-bloom-008');
    const original = structuredClone(recipe);
    const model = generateMandala(recipe);
    expect(generateMandala(recipe)).toEqual(model);
    expect(recipe).toEqual(original);
    const silhouettes = (detail: number, seed = recipe.seed) =>
      generateMandala(createOrnateLotusRecipe(seed, detail))
        .paths.filter((p) => p.occludes)
        .map((p) => p.d);
    expect(silhouettes(0)).toEqual(silhouettes(1));
    expect(silhouettes(1, 'lotus-bloom-009')).not.toEqual(silhouettes(1));
    expect(
      generateMandala(createOrnateLotusRecipe(recipe.seed, 1)).paths.length,
    ).toBeGreaterThan(
      generateMandala(createOrnateLotusRecipe(recipe.seed, 0)).paths.length,
    );
    const primary = model.paths.filter((p) => p.occludes);
    expect(primary.filter((p) => p.layerId === 'lotus-dominant')).toHaveLength(
      8,
    );
    expect(primary.filter((p) => p.layerId === 'lotus-secondary')).toHaveLength(
      16,
    );
    expect(new Set(primary.map((p) => p.layerId)).size).toBe(7);
  });

  it.each([6, 8, 10, 12])(
    'keeps %i-fold crowns finite, bounded, and rotationally consistent at detail extremes',
    (order) => {
      for (const detail of [0, 1]) {
        const recipe = createOrnateLotusRecipe(
          'lotus-bloom-008',
          detail,
          order,
        );
        const model = generateMandala(recipe);
        expect(model.paths.length).toBeLessThan(4000);
        expect(new Set(model.paths.map((p) => p.id)).size).toBe(
          model.paths.length,
        );
        expect(model.paths.map((p) => p.drawOrder)).toEqual(
          model.paths.map((_, i) => i),
        );
        for (const path of model.paths) {
          if (path.role !== 'decoration') expect(path.d.at(-1)?.type).toBe('Z');
          mapPath(path.d, (p) => {
            expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
            expect(Math.min(p.x, p.y)).toBeGreaterThan(0);
            expect(Math.max(p.x, p.y)).toBeLessThan(model.size);
            return p;
          });
        }
        for (const layer of new Set(
          model.paths
            .filter((path) => path.occludes && path.layerId !== 'lotus-heart')
            .map((path) => path.layerId),
        )) {
          const petals = model.paths.filter(
            (p) => p.layerId === layer && p.occludes,
          );
          for (const [index, petal] of petals.entries()) {
            const angle = Math.atan2(
              petal.d[0].type === 'M' ? petal.d[0].to.x - model.center.x : 0,
              petal.d[0].type === 'M' ? model.center.y - petal.d[0].to.y : 1,
            );
            const slope = Math.tan(Math.PI / petals.length) * 0.92;
            mapPath(petal.d, (point) => {
              const dx = point.x - model.center.x;
              const dy = model.center.y - point.y;
              const along = dx * Math.sin(angle) + dy * Math.cos(angle);
              const across = dx * Math.cos(angle) - dy * Math.sin(angle);
              expect(
                Math.abs(across),
                `Sibling crown envelope: ${layer} ${index}`,
              ).toBeLessThanOrEqual(along * slope + 1e-8);
              return point;
            });
          }
          const step = layer === 'lotus-secondary' ? 2 : 1;
          const rotated = transformPath(
            petals[0].d,
            { angle: (Math.PI * 2) / order, mirrored: false },
            model.center,
          );
          const actual: number[] = [];
          const expected: number[] = [];
          mapPath(rotated, (p) => {
            actual.push(p.x, p.y);
            return p;
          });
          mapPath(petals[step].d, (p) => {
            expected.push(p.x, p.y);
            return p;
          });
          actual.forEach((value, i) =>
            expect(value).toBeCloseTo(expected[i], 8),
          );
        }
      }
    },
  );

  it('retains readable crown detail at supported stroke and division limits', () => {
    for (const divisions of [6, 12])
      for (const strokeWidth of [0.25, 4]) {
        const recipe = createOrnateLotusRecipe('lotus-bloom-009', 1, divisions);
        recipe.global.strokeWidth = strokeWidth;
        const model = generateMandala(recipe);
        expect(
          model.paths.some((path) =>
            path.id.startsWith('lotus-dominant-0-ornament-'),
          ),
        ).toBe(true);
        expect(
          model.paths.some((path) =>
            path.id.startsWith('lotus-heart-petals-0-ornament-'),
          ),
        ).toBe(true);
        expect(model.paths.length).toBeLessThan(4000);
      }
  });

  it('subtracts later silhouettes from rear outlines and ornament without white foreground paint', () => {
    const recipe = createOrnateLotusRecipe('lotus-bloom-008');
    const model = generateMandala(recipe);
    const svg = renderSvg(model, recipe);
    const masks = [...svg.matchAll(/<mask[^>]*>(.*?)<\/mask>/g)].map(
      (m) => m[1],
    );
    const inner = model.paths.find(
      (p) => p.layerId === 'lotus-inner' && p.occludes,
    )!;
    expect(masks[0]).toContain(`d="${serializePath(inner.d)}"`);
    expect(masks.at(-1)).not.toContain(`d="${serializePath(inner.d)}"`);
    expect(svg.split('</defs>')[1]).not.toContain('fill="#ffffff"');
    expect(svg).toContain('data-role="decoration"');
    expect(model.ornamentFit).toBeDefined();
  });

  it('rejects unknown versions, ring controls and global ornament overrides', () => {
    const recipe = createOrnateLotusRecipe('validation');
    for (const change of [
      { composition: { ...recipe.composition, version: 2 } },
      {
        composition: {
          ...recipe.composition,
          ornament: { version: 1, treatment: 'botanical', spacing: 0.3 },
        },
      },
      { structure: { ...recipe.structure, symmetryOrder: 7 } },
      { global: { ...recipe.global, density: 1 } },
      { global: { ...recipe.global, strokeWidth: 8 } },
    ])
      expect(
        mandalaRecipeSchema.safeParse({ ...recipe, ...change }).success,
      ).toBe(false);
  });
});
