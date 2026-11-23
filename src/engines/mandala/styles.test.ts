import { describe, expect, it } from 'vitest';
import { createRandom } from '../../shared/random';
import { distributeMotifs } from './distribution';
import { generateMandala } from './generate';
import { mapPath, type PathCommand } from './geometry';
import {
  createStarterRecipe,
  distributions,
  mandalaRecipeSchema,
  styles,
} from './recipe';
import { createStyleRecipe, resolveStyle, singleStyle } from './styles';
import { renderSvg } from './svg';
import { symmetryOperations, transformPath } from './symmetry';
import { closeContours, transformMotif } from './transforms';
import { createMotif } from './motifs';

function assertClosed(path: PathCommand[]) {
  let open = false;
  for (const command of path) {
    if (command.type === 'M') {
      expect(open).toBe(false);
      open = true;
    } else if (command.type === 'Z') {
      expect(open).toBe(true);
      open = false;
    } else {
      expect(open).toBe(true);
    }
  }
  expect(open).toBe(false);
}

describe('style planning', () => {
  it.each(styles)(
    'produces reproducible, closed, bounded %s artwork without mutating its recipe',
    (style) => {
      const recipe = createStyleRecipe({
        seed: 'botanical-study',
        blend: singleStyle(style),
      });
      const original = structuredClone(recipe);
      const model = generateMandala(recipe);
      expect(renderSvg(generateMandala(recipe))).toBe(renderSvg(model));
      expect(recipe).toEqual(original);
      expect(
        renderSvg(
          generateMandala(
            createStyleRecipe({
              seed: 'another-study',
              blend: singleStyle(style),
            }),
          ),
        ),
      ).not.toBe(renderSvg(model));
      for (const path of model.paths) {
        assertClosed(path.d);
        mapPath(path.d, (point) => {
          expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(
            true,
          );
          expect(point.x).toBeGreaterThan(0);
          expect(point.x).toBeLessThan(model.size);
          expect(point.y).toBeGreaterThan(0);
          expect(point.y).toBeLessThan(model.size);
          return point;
        });
      }
      expect(new Set(model.paths.map((path) => path.id)).size).toBe(
        model.paths.length,
      );
      expect(model.paths.map((path) => path.drawOrder)).toEqual(
        model.paths.map((_, index) => index),
      );
    },
  );

  it('uses genuinely different composition rules for the four styles', () => {
    const recipes = styles.map((style) =>
      createStyleRecipe({ seed: 'same-seed', blend: singleStyle(style) }),
    );
    expect(
      new Set(recipes.map((recipe) => JSON.stringify(recipe.layers))).size,
    ).toBe(4);
    expect(
      recipes[0].layers.every((layer) => layer.distribution === 'ring'),
    ).toBe(true);
    expect(
      recipes[1].layers.some((layer) => layer.distribution === 'tessellation'),
    ).toBe(true);
    expect(
      recipes[2].layers.some((layer) => layer.distribution === 'branching'),
    ).toBe(true);
    expect(recipes[3].structure.centers).toBeGreaterThan(1);
    expect(generateMandala(recipes[3]).symmetry.type).toBe('none');
  });

  it('normalizes blend weights and applies continuous numeric influence, not just a dominant-style switch', () => {
    const blend = { traditional: 0.7, geometric: 0.3, organic: 0, abstract: 0 };
    const proportional = {
      traditional: 0.35,
      geometric: 0.15,
      organic: 0,
      abstract: 0,
    };
    expect(resolveStyle(blend)).toEqual(resolveStyle(proportional));
    expect(createStyleRecipe({ seed: 'mix', blend })).toEqual(
      createStyleRecipe({ seed: 'mix', blend: proportional }),
    );
    const subtle = createStyleRecipe({
      seed: 'mix',
      blend: { ...blend, geometric: 0.2 },
    });
    const strong = createStyleRecipe({
      seed: 'mix',
      blend: { ...blend, geometric: 0.6 },
    });
    expect(subtle.layers).not.toEqual(strong.layers);
    expect(subtle.global.irregularity).not.toBe(strong.global.irregularity);
    expect(() =>
      resolveStyle({ traditional: 0, geometric: 0, organic: 0, abstract: 0 }),
    ).toThrow('positive weight');
  });

  it('allows explicit overrides without style restrictions', () => {
    const recipe = createStyleRecipe({
      seed: 'overrides',
      blend: singleStyle('traditional'),
      symmetryType: 'none',
      baseGeometry: 'star',
      centers: 4,
      distribution: 'scatter',
      recursionDepth: 3,
      twist: -0.5,
      noise: 0.6,
      distortion: 0.4,
      brokenSymmetry: 0.8,
    });
    expect(recipe.structure).toMatchObject({
      symmetryType: 'none',
      baseGeometry: 'star',
      centers: 4,
      brokenSymmetry: 0.8,
    });
    expect(
      recipe.layers
        .filter((_, index) => index % 2 === 0)
        .every(
          (layer) =>
            layer.distribution === 'scatter' &&
            layer.recursionDepth === 3 &&
            layer.twist === -0.5,
        ),
    ).toBe(true);
    expect(
      recipe.layers.every(
        (layer) => layer.noise === 0.6 && layer.distortion === 0.4,
      ),
    ).toBe(true);
    const model = generateMandala(recipe);
    expect(model.centers).toHaveLength(4);
    expect(model.symmetry).toEqual({ type: 'none', order: 1 });
  });

  it('makes complexity affect hierarchy and detail instead of only line count', () => {
    const input = { seed: 'complexity', blend: singleStyle('traditional') };
    const simple = createStyleRecipe({ ...input, complexity: 0 });
    const detailed = createStyleRecipe({ ...input, complexity: 1 });
    expect(detailed.layers.length).toBeGreaterThan(simple.layers.length);
    expect(detailed.layers[0].recursionDepth).toBeGreaterThan(
      simple.layers[0].recursionDepth,
    );
    expect(
      new Set(
        detailed.layers.map((layer) =>
          (layer.outerRadius - layer.innerRadius).toFixed(4),
        ),
      ).size,
    ).toBeGreaterThan(3);
  });
});

describe('distributions and symmetry', () => {
  it.each(distributions)(
    '%s places deterministic complete orbits with closed output',
    (distribution) => {
      const recipe = createStyleRecipe({
        seed: 'distribution',
        blend: singleStyle('organic'),
        distribution,
        symmetryType: 'dihedral',
        symmetryOrder: 6,
        centers: 1,
        brokenSymmetry: 0,
        complexity: 0.3,
      });
      const layer = recipe.layers[0];
      const first = distributeMotifs(layer, 12, createRandom('placement'));
      expect(first.length).toBeGreaterThan(0);
      expect(distributeMotifs(layer, 12, createRandom('placement'))).toEqual(
        first,
      );
      const model = generateMandala(recipe);
      const rounded = (path: PathCommand[]) =>
        JSON.stringify(
          mapPath(path, (point) => ({
            x: Math.round(point.x * 1e4) / 1e4,
            y: Math.round(point.y * 1e4) / 1e4,
          })),
        );
      const paths = model.paths.filter((path) => path.id.includes('-motif-'));
      const set = new Set(paths.map((path) => rounded(path.d)));
      for (const path of paths) {
        assertClosed(path.d);
        for (const operation of symmetryOperations('dihedral', 6)) {
          expect(
            set.has(rounded(transformPath(path.d, operation, model.center))),
          ).toBe(true);
        }
      }
    },
  );

  it('stops advertising exact symmetry when copies are deliberately perturbed', () => {
    const recipe = createStyleRecipe({
      seed: 'broken',
      blend: singleStyle('traditional'),
      brokenSymmetry: 0.8,
    });
    const broken = generateMandala(recipe);
    const exact = generateMandala({
      ...recipe,
      structure: { ...recipe.structure, brokenSymmetry: 0 },
    });
    expect(broken.symmetry.type).toBe('none');
    expect(exact.symmetry.type).toBe('rotational');
    expect(renderSvg(broken)).not.toBe(renderSvg(exact));
  });
});

describe('transforms and closure', () => {
  it('applies recursion, scale, twist, distortion, and noise reproducibly', () => {
    const recipe = createStarterRecipe('transforms');
    const layer = recipe.layers[0];
    const path = createMotif('leaf', 0.8, 5);
    const original = structuredClone(path);
    const baseline = transformMotif(path, layer, createRandom('detail'), 1);
    for (const change of [
      { scaling: 0.4 },
      { twist: 0.6 },
      { distortion: 0.7 },
      { noise: 0.5 },
    ]) {
      const transformed = transformMotif(
        path,
        { ...layer, ...change },
        createRandom('detail'),
        1,
      );
      expect(transformed).not.toEqual(baseline);
      expect(
        transformMotif(
          path,
          { ...layer, ...change },
          createRandom('detail'),
          1,
        ),
      ).toEqual(transformed);
    }
    expect(path).toEqual(original);
  });

  it('closes every subpath and snaps tiny endpoint gaps without mutating input', () => {
    const path: PathCommand[] = [
      { type: 'M', to: { x: 0, y: 0 } },
      { type: 'L', to: { x: 1, y: 1 } },
      { type: 'L', to: { x: 0.0000001, y: 0 } },
      { type: 'M', to: { x: 3, y: 3 } },
      { type: 'L', to: { x: 4, y: 4 } },
    ];
    const original = structuredClone(path);
    const closed = closeContours(path);
    assertClosed(closed);
    expect(closed[2]).toEqual({ type: 'L', to: { x: 0, y: 0 } });
    expect(closeContours(closed)).toEqual(closed);
    expect(path).toEqual(original);
    expect(() => closeContours([{ type: 'L', to: { x: 0, y: 0 } }])).toThrow(
      'move command',
    );
    expect(() =>
      closeContours([{ type: 'M', to: { x: Infinity, y: 0 } }]),
    ).toThrow('finite');
  });

  it('bounds recursive input and rejects invalid weights rather than exploding the scene', () => {
    const recipe = createStyleRecipe({
      seed: 'bounds',
      blend: singleStyle('organic'),
    });
    expect(
      mandalaRecipeSchema.safeParse({
        ...recipe,
        layers: [{ ...recipe.layers[0], recursionDepth: 99 }],
      }).success,
    ).toBe(false);
    expect(() =>
      createStyleRecipe({
        seed: 'bad',
        blend: { traditional: -1, geometric: 1, organic: 0, abstract: 0 },
      }),
    ).toThrow();
    expect(() =>
      createStyleRecipe({
        seed: 'bad',
        blend: singleStyle('organic'),
        centers: 20,
      }),
    ).toThrow();
  });

  it('fails explicitly when a valid but excessive composition exceeds the path budget', () => {
    const recipe = createStyleRecipe({
      seed: 'dense-study',
      blend: singleStyle('traditional'),
      centers: 4,
      complexity: 1,
      recursionDepth: 3,
      symmetryOrder: 48,
    });
    recipe.layers.forEach((layer) => {
      layer.count = 192;
    });
    expect(() => generateMandala(recipe)).toThrow('exceeds 24,000 paths');
  });
});
