import { describe, expect, it } from 'vitest';
import { createBoldFloralRecipe } from './bold-floral';
import { generateMandala } from './generate';
import { mapPath, type PathCommand } from './geometry';
import { mandalaRecipeSchema } from './recipe';
import { renderSvg } from './svg';
import { transformPath } from './symmetry';

function coordinates(path: PathCommand[]) {
  const result: number[] = [];
  mapPath(path, (point) => {
    result.push(point.x, point.y);
    return point;
  });
  return result;
}

describe('bold floral compositions', () => {
  it('preserves the original floral SVG when no ornament treatment is requested', async () => {
    const recipe = createBoldFloralRecipe('flourish-008');
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(renderSvg(generateMandala(recipe), recipe)),
    );
    expect(
      Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join(''),
    ).toBe('28c08b349d3c8ab076a998080cffd57595e12f26bfcba15cb8ba9591b77060e3');
  });

  it('reproduces seeded geometry without mutating recipes, with detail subordinate to the same silhouette', () => {
    const recipe = createBoldFloralRecipe('flourish-008');
    const before = structuredClone(recipe);
    const model = generateMandala(recipe);
    expect(generateMandala(recipe)).toEqual(model);
    expect(generateMandala(createBoldFloralRecipe('flourish-009'))).not.toEqual(
      model,
    );
    expect(recipe).toEqual(before);
    const sparse = generateMandala(createBoldFloralRecipe(recipe.seed, 0));
    const dense = generateMandala(createBoldFloralRecipe(recipe.seed, 1));
    const silhouettes = (value: typeof model) =>
      value.paths
        .filter((path) => path.occludes)
        .map(({ id, d }) => ({ id, d }));
    expect(silhouettes(sparse)).toEqual(silhouettes(dense));
    expect(dense.paths.length).toBeGreaterThan(sparse.paths.length);
  });

  it.each([6, 8, 10, 12])(
    'keeps %i-fold geometry symmetric, bounded, and semantically classified at maximum detail',
    (divisions) => {
      const recipe = createBoldFloralRecipe('flourish-008', 1, divisions);
      const model = generateMandala(recipe);
      const paths = new Map(model.paths.map((path) => [path.id, path]));
      expect(model.paths.length).toBeLessThan(1500);
      expect(new Set(model.paths.map((path) => path.id)).size).toBe(
        model.paths.length,
      );
      expect(model.paths.map((path) => path.drawOrder)).toEqual(
        model.paths.map((_, index) => index),
      );
      for (const path of model.paths) {
        // Central circles have a fixed path start, unlike the repeated sector paths.
        if (path.layerId !== 'heart') {
          const [index, ...suffix] = path.id
            .slice(path.layerId.length + 1)
            .split('-');
          const next = paths.get(
            `${path.layerId}-${[(Number(index) + 1) % divisions, ...suffix].join('-')}`,
          );
          if (!next) throw new Error(`Missing symmetry copy for ${path.id}.`);
          const transformed = coordinates(
            transformPath(
              path.d,
              { angle: (2 * Math.PI) / divisions, mirrored: false },
              model.center,
            ),
          );
          const expected = coordinates(next.d);
          expect(transformed.length).toBe(expected.length);
          transformed.forEach((value, index) =>
            expect(value).toBeCloseTo(expected[index], 8),
          );
        }
        if (path.role !== 'decoration') expect(path.d.at(-1)?.type).toBe('Z');
        if (path.occludes) expect(path.role).toBe('region-boundary');
        mapPath(path.d, (point) => {
          expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(
            true,
          );
          expect(point.x).toBeGreaterThan(0);
          expect(point.y).toBeGreaterThan(0);
          expect(point.x).toBeLessThan(model.size);
          expect(point.y).toBeLessThan(model.size);
          return point;
        });
      }
      expect(
        model.paths.some(
          (path) => path.role === 'decoration' && path.d.at(-1)?.type !== 'Z',
        ),
      ).toBe(true);
      expect(model.paths.some((path) => path.role === 'solid-accent')).toBe(
        true,
      );
    },
  );

  it('exports foreground silhouette masks and drawing roles without painting white into transparent interiors', () => {
    const recipe = createBoldFloralRecipe('flourish-008');
    const svg = renderSvg(generateMandala(recipe), recipe);
    expect(svg).toContain('<mask ');
    expect(svg).toContain('mask="url(#foreground-mask-');
    expect(svg).toContain('data-role="decoration"');
    expect(svg).toContain('data-role="region-boundary" data-occludes="true"');
    expect(svg).toContain(
      'data-role="solid-accent" fill="#000000" stroke="none"',
    );
    expect(svg.split('</defs>')[1]).not.toContain('fill="#ffffff"');
    const maskIds = [...svg.matchAll(/<mask id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    for (const match of svg.matchAll(/mask="url\(#([^)]+)\)"/g))
      expect(maskIds).toContain(match[1]);
  });

  it('rejects unsupported composition versions and incompatible ring or appearance settings explicitly', () => {
    const recipe = createBoldFloralRecipe('validation');
    for (const change of [
      { composition: { ...recipe.composition, version: 2 } },
      { structure: { ...recipe.structure, symmetryOrder: 48 } },
      { structure: { ...recipe.structure, centers: 2 } },
      { global: { ...recipe.global, density: 1 } },
      { composition: undefined },
    ])
      expect(
        mandalaRecipeSchema.safeParse({ ...recipe, ...change }).success,
      ).toBe(false);
  });
});
