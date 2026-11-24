import { describe, expect, it } from 'vitest';
import { createSwirlingPaisleyRecipe } from './swirling-paisley';
import { generateMandala } from './generate';
import { mapPath, type PathCommand } from './geometry';
import { borderClearance } from './ornament-decoration';
import { sampleContour } from './ornament-shapes';
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

describe('swirling paisley composition', () => {
  it('reproduces seeded geometry and retains primary flowing outlines across a genuine detail progression', () => {
    const recipe = createSwirlingPaisleyRecipe('paisley-flow-008');
    const original = structuredClone(recipe);
    const model = generateMandala(recipe);
    expect(generateMandala(recipe)).toEqual(model);
    expect(recipe).toEqual(original);
    expect(
      generateMandala(createSwirlingPaisleyRecipe('paisley-flow-009')),
    ).not.toEqual(model);
    const levels = [0, 0.5, 1].map((detail) =>
      generateMandala(createSwirlingPaisleyRecipe(recipe.seed, detail)),
    );
    const wings = (model: (typeof levels)[number]) =>
      model.paths
        .filter((path) => path.layerId === 'paisley-wings' && path.occludes)
        .map(({ id, d }) => ({ id, d }));
    expect(wings(levels[0])).toEqual(wings(levels[2]));
    expect(
      levels[0].paths.filter((path) => path.layerId === 'paisley-wings'),
    ).toHaveLength(8);
    expect(levels[1].paths.some((path) => path.id.includes('feather-'))).toBe(
      true,
    );
    expect(
      levels[2].paths.some((path) => path.id.includes('feather-vein-')),
    ).toBe(true);
    expect(
      levels[2].paths.some((path) => path.id.includes('scalloped-border-')),
    ).toBe(true);
  });

  it.each([6, 8, 10, 12])(
    'keeps %i-fold geometry separated and bounded at swirl/stroke extremes',
    (order) => {
      for (const strength of [0, 1]) {
        const recipe = createSwirlingPaisleyRecipe(
          'paisley-flow-008',
          1,
          order,
          { direction: 'clockwise', strength },
        );
        recipe.global.strokeWidth = strength === 0 ? 0.25 : 4;
        const model = generateMandala(recipe);
        expect(model.paths.length).toBeLessThan(4000);
        expect(new Set(model.paths.map((path) => path.id)).size).toBe(
          model.paths.length,
        );
        expect(model.paths.map((path) => path.drawOrder)).toEqual(
          model.paths.map((_, index) => index),
        );
        for (const path of model.paths) {
          if (path.role !== 'decoration') expect(path.d.at(-1)?.type).toBe('Z');
          for (const value of coordinates(path.d)) {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThan(0);
            expect(value).toBeLessThan(model.size);
          }
        }
        const wings = model.paths.filter(
          (path) => path.layerId === 'paisley-wings' && path.occludes,
        );
        const transformed = coordinates(
          transformPath(
            wings[0].d,
            { angle: (Math.PI * 2) / order, mirrored: false },
            model.center,
          ),
        );
        const expected = coordinates(wings[1].d);
        transformed.forEach((value, index) =>
          expect(value).toBeCloseTo(expected[index], 7),
        );
        const neighbor = sampleContour(wings[1].d, 48);
        for (const point of sampleContour(wings[0].d, 48))
          expect(borderClearance(neighbor, point)).toBeLessThan(
            -recipe.global.strokeWidth,
          );
        const pockets = model.paths
          .filter((path) => path.layerId === 'paisley-pocket-jewels')
          .map((path) => ({ ...path, polygon: sampleContour(path.d, 48) }));
        for (const pocket of pockets.filter((path) =>
          path.id.startsWith('paisley-pocket-jewels-0-'),
        ))
          for (const other of pockets.filter((path) => path.id !== pocket.id))
            for (const point of pocket.polygon)
              expect(
                borderClearance(other.polygon, point),
                `${pocket.id} against ${other.id}`,
              ).toBeLessThan(
                -model.ornamentFit!.clearance -
                  (pocket.strokeWidth + other.strokeWidth) / 2 +
                  0.01,
              );
      }
    },
  );

  it('mirrors the complete wing template when direction reverses and changes curves when strength changes', () => {
    const recipe = createSwirlingPaisleyRecipe('paisley-flow-008', 1);
    const left = generateMandala(
      createSwirlingPaisleyRecipe(recipe.seed, 1, 8, {
        direction: 'counterclockwise',
        strength: 0.7,
      }),
    );
    const right = generateMandala(recipe);
    const template = (model: typeof right) =>
      model.paths.filter((path) => path.id.startsWith('paisley-wings-0-'));
    expect(template(left).map((path) => path.id)).toEqual(
      template(right).map((path) => path.id),
    );
    template(right).forEach((path, index) => {
      const reflected = coordinates(
        mapPath(path.d, (point) => ({ x: 1000 - point.x, y: point.y })),
      );
      const expected = coordinates(template(left)[index].d);
      reflected.forEach((value, i) =>
        expect(value).toBeCloseTo(expected[i], 7),
      );
    });
    expect(
      generateMandala(
        createSwirlingPaisleyRecipe(recipe.seed, 1, 8, {
          direction: 'clockwise',
          strength: 0,
        }),
      ).paths[0].d,
    ).not.toEqual(right.paths[0].d);
  });

  it('fits visible wing details and pocket jewels with measurable clearance, rather than hiding them under foreground forms', () => {
    const recipe = createSwirlingPaisleyRecipe('paisley-flow-008', 1);
    const model = generateMandala(recipe);
    const boundary = model.paths.find(
      (path) => path.id === 'paisley-wings-0-outline',
    )!;
    const polygon = sampleContour(boundary.d, 64);
    const details = model.paths.filter(
      (path) => path.id.startsWith('paisley-wings-0-') && !path.occludes,
    );
    for (const path of details)
      for (const point of sampleContour(path.d, 64))
        expect(borderClearance(polygon, point)).toBeGreaterThanOrEqual(
          model.ornamentFit!.clearance + path.strokeWidth / 2 - 0.01,
        );
    const pockets = model.paths.filter(
      (path) => path.layerId === 'paisley-pocket-jewels',
    );
    expect(pockets.length).toBeGreaterThan(0);
    const wings = model.paths
      .filter((path) => path.layerId === 'paisley-wings' && path.occludes)
      .map((path) => sampleContour(path.d, 48));
    for (const pocket of pockets)
      for (const point of sampleContour(pocket.d, 48))
        for (const wing of wings)
          expect(borderClearance(wing, point)).toBeLessThan(
            -model.ornamentFit!.clearance,
          );
    const svg = renderSvg(model, recipe);
    expect(svg).toContain('<mask ');
    expect(svg.split('</defs>')[1]).not.toContain('fill="#ffffff"');
  });

  it('keeps closed wing ornament free of accidental self-intersections', () => {
    const model = generateMandala(
      createSwirlingPaisleyRecipe('paisley-flow-008', 1),
    );
    for (const path of model.paths.filter(
      (path) =>
        path.id.startsWith('paisley-wings-0-') && path.role !== 'decoration',
    )) {
      const points = sampleContour(path.d, 12).filter(
        (point, index, all) =>
          index === 0 ||
          Math.hypot(point.x - all[index - 1].x, point.y - all[index - 1].y) >
            1e-8,
      );
      if (
        Math.hypot(
          points[0].x - points.at(-1)!.x,
          points[0].y - points.at(-1)!.y,
        ) < 1e-8
      )
        points.pop();
      let crossings = 0;
      const cross = (a: (typeof points)[number], b: typeof a, c: typeof a) =>
        (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      for (let i = 0; i < points.length; i++)
        for (let j = i + 2; j < points.length; j++) {
          if (i === 0 && j === points.length - 1) continue;
          const a = points[i],
            b = points[(i + 1) % points.length],
            c = points[j],
            d = points[(j + 1) % points.length];
          if (
            cross(a, b, c) * cross(a, b, d) < -1e-8 &&
            cross(c, d, a) * cross(c, d, b) < -1e-8
          )
            crossings++;
        }
      expect(crossings, path.id).toBe(0);
    }
  });

  it('rejects unsupported direction, strength, version, layers and appearance settings', () => {
    const recipe = createSwirlingPaisleyRecipe('validation');
    for (const change of [
      {
        composition: {
          ...recipe.composition,
          swirl: { direction: 'up', strength: 0.5 },
        },
      },
      {
        composition: {
          ...recipe.composition,
          swirl: { direction: 'clockwise', strength: 2 },
        },
      },
      { composition: { ...recipe.composition, version: 2 } },
      { global: { ...recipe.global, strokeWidth: 8 } },
      { global: { ...recipe.global, density: 1 } },
      { structure: { ...recipe.structure, centers: 2 } },
    ])
      expect(
        mandalaRecipeSchema.safeParse({ ...recipe, ...change }).success,
      ).toBe(false);
  });
});
