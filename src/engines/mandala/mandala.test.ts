import { describe, expect, it } from 'vitest';
import { rotatePoint } from '../../shared/geometry';
import { generateMandala } from './generate';
import { mapPath, type PathCommand } from './geometry';
import {
  baseGeometries,
  createStarterRecipe,
  mandalaRecipeSchema,
  motifs,
  symmetryTypes,
} from './recipe';
import { renderSvg, serializePath } from './svg';
import { symmetryOperations, transformPath } from './symmetry';
import { createMotif } from './motifs';

const roundedPath = (path: PathCommand[]) =>
  JSON.stringify(
    mapPath(path, (point) => ({
      x: Math.round(point.x * 10000) / 10000,
      y: Math.round(point.y * 10000) / 10000,
    })),
  );

describe('deterministic generation', () => {
  it('renders identical SVGs from identical recipes and changes with the seed', () => {
    const recipe = createStarterRecipe('lotus-001');
    const original = structuredClone(recipe);
    const svg = renderSvg(generateMandala(recipe));
    expect(renderSvg(generateMandala(recipe))).toBe(svg);
    expect(
      renderSvg(generateMandala({ ...recipe, seed: 'lotus-002' })),
    ).not.toBe(svg);
    expect(recipe).toEqual(original);
  });

  it('isolates layer random streams, skips disabled layers and deduplicates shared separators', () => {
    const recipe = createStarterRecipe('layers');
    const original = generateMandala(recipe);
    const changed = structuredClone(recipe);
    changed.layers[0].seedOffset += 1;
    changed.layers[1].enabled = false;
    const result = generateMandala(changed);
    const ring = (model: typeof result, layerId: string) =>
      model.paths.filter((path) => path.id.startsWith(`${layerId}-motif`));
    expect(ring(result, 'ring-1')).not.toEqual(ring(original, 'ring-1'));
    expect(ring(result, 'ring-2')).toEqual([]);
    expect(ring(result, 'ring-3').map((path) => path.d)).toEqual(
      ring(original, 'ring-3').map((path) => path.d),
    );
    expect(
      original.paths.filter((path) => path.id.startsWith('boundary-')),
    ).toHaveLength(7);
    expect(new Set(original.paths.map((path) => path.id)).size).toBe(
      original.paths.length,
    );
    expect(original.paths.map((path) => path.drawOrder)).toEqual(
      original.paths.map((_, index) => index),
    );
  });
});

describe.each(baseGeometries)('%s boundaries and symmetry', (baseGeometry) => {
  it.each(symmetryTypes)(
    'preserves %s symmetry, including separator boundaries',
    (symmetry) => {
      const recipe = createStarterRecipe('symmetry', baseGeometry, symmetry, 8);
      const model = generateMandala(recipe);
      const operations = symmetryOperations(symmetry, model.symmetry.order);
      const paths = new Set(
        model.paths
          .filter((path) => !path.id.startsWith('boundary-'))
          .map((path) => roundedPath(path.d)),
      );
      for (const path of model.paths) {
        expect(path.d[0].type).toBe('M');
        for (const operation of operations) {
          const transformed = transformPath(path.d, operation, model.center);
          if (path.id.startsWith('boundary-')) {
            expect(path.d.at(-1)?.type).toBe('Z');
            const vertices = new Set(
              path.d
                .filter((command) => command.type !== 'Z')
                .map((command) => roundedPath([{ type: 'M', to: command.to }])),
            );
            for (const command of transformed) {
              if (command.type !== 'Z')
                expect(
                  vertices.has(roundedPath([{ type: 'M', to: command.to }])),
                ).toBe(true);
            }
          } else {
            expect(paths.has(roundedPath(transformed))).toBe(true);
          }
        }
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
    },
  );
});

describe('symmetry expansion', () => {
  it('snaps counts up to complete orbits without overlapping mirror-axis slots', () => {
    const recipe = createStarterRecipe('orbits', 'circle', 'dihedral', 7);
    recipe.layers = [recipe.layers[0]];
    recipe.layers[0].count = 15;
    const model = generateMandala(recipe);
    const motifs = model.paths.filter((path) => path.id.includes('-motif-'));
    expect(motifs).toHaveLength(28);
    const starts = motifs.map((path) => roundedPath([path.d[0]]));
    expect(new Set(starts).size).toBe(starts.length);
  });

  it('transforms cubic control points as well as endpoints around an offset center', () => {
    const path = createMotif('petal', 0.8, 5);
    const before = structuredClone(path);
    const center = { x: 13, y: 29 };
    const angle = Math.PI / 3;
    const transformed = transformPath(path, { angle, mirrored: false }, center);
    expect(transformed).toEqual(
      mapPath(path, (point) => rotatePoint(point, angle, center)),
    );
    expect(path).toEqual(before);
  });
});

describe('motif construction', () => {
  it.each(motifs)(
    '%s produces the intended closed shape or open decorative arc',
    (motif) => {
      const commands = createMotif(motif, 0.8, 5);
      expect(commands[0].type).toBe('M');
      expect(
        commands.some(
          (command) => command.type === 'C' || command.type === 'L',
        ),
      ).toBe(true);
      expect(commands.at(-1)?.type === 'Z').toBe(motif !== 'arc');
    },
  );
});

describe('recipe validation', () => {
  it('rejects unsupported versions, incomplete blends and unknown distributions rather than ignoring them', () => {
    const recipe = createStarterRecipe('validation');
    expect(
      mandalaRecipeSchema.safeParse({ ...recipe, engineVersion: '2.0.0' })
        .success,
    ).toBe(false);
    expect(
      mandalaRecipeSchema.safeParse({ ...recipe, style: { organic: 1 } })
        .success,
    ).toBe(false);
    expect(
      mandalaRecipeSchema.safeParse({
        ...recipe,
        layers: [{ ...recipe.layers[0], distribution: 'voronoi' }],
      }).success,
    ).toBe(false);
  });

  it('rejects bad geometry, overlapping rings, duplicate IDs and empty enabled designs', () => {
    const recipe = createStarterRecipe('validation');
    const cases = [
      { ...recipe, seed: ' ' },
      { ...recipe, canvas: { size: Number.NaN } },
      { ...recipe, structure: { ...recipe.structure, symmetryOrder: 49 } },
      { ...recipe, layers: [{ ...recipe.layers[0], count: 0 }] },
      {
        ...recipe,
        layers: [
          { ...recipe.layers[0], outerRadius: recipe.layers[0].innerRadius },
        ],
      },
      { ...recipe, layers: [recipe.layers[0], recipe.layers[0]] },
      { ...recipe, layers: [recipe.layers[1], recipe.layers[0]] },
      {
        ...recipe,
        layers: recipe.layers.map((layer) => ({ ...layer, enabled: false })),
      },
      {
        ...recipe,
        layers: [
          {
            ...recipe.layers[0],
            motifParams: { ...recipe.layers[0].motifParams, width: Infinity },
          },
        ],
      },
    ];
    for (const invalid of cases)
      expect(() => generateMandala(invalid)).toThrow();
  });

  it('requires consistent mirror axes and rotational order for non-radial symmetry', () => {
    const recipe = createStarterRecipe('mirror', 'circle', 'bilateral');
    expect(recipe.structure.symmetryOrder).toBe(1);
    expect(
      mandalaRecipeSchema.safeParse({
        ...recipe,
        structure: { ...recipe.structure, symmetryOrder: 12 },
      }).success,
    ).toBe(false);
    recipe.layers[0].rotationOffset = 0.1;
    expect(() => generateMandala(recipe)).toThrow('Mirror-symmetric rings');
  });

  it('accepts the minimum ring width despite floating-point subtraction', () => {
    const recipe = createStarterRecipe('thin-ring');
    recipe.layers = [
      { ...recipe.layers[0], innerRadius: 0.04, outerRadius: 0.06 },
    ];
    expect(() => generateMandala(recipe)).not.toThrow();
    recipe.layers[0].outerRadius = 0.059;
    expect(() => generateMandala(recipe)).toThrow('at least 0.02');
  });
});

describe('SVG serialization', () => {
  it('serializes vector commands with stable precision and rejects non-finite coordinates', () => {
    expect(
      serializePath([
        { type: 'M', to: { x: -0.00000001, y: 2 / 3 } },
        {
          type: 'C',
          control1: { x: 1, y: 2 },
          control2: { x: 3, y: 4 },
          to: { x: 5, y: 6 },
        },
        { type: 'Z' },
      ]),
    ).toBe('M0 0.666667 C1 2 3 4 5 6 Z');
    expect(() => serializePath([{ type: 'L', to: { x: NaN, y: 0 } }])).toThrow(
      'finite',
    );
  });

  it('renders black transparent line art, escapes attributes and preserves draw order', () => {
    expect(
      renderSvg({
        size: 100,
        center: { x: 50, y: 50 },
        symmetry: { order: 1, type: 'none' },
        paths: [
          {
            id: 'test"<&',
            layerId: "ring'",
            drawOrder: 0,
            strokeWidth: 1.5,
            d: [
              { type: 'M', to: { x: 10, y: 10 } },
              { type: 'L', to: { x: 90, y: 90 } },
            ],
          },
        ],
      }),
    ).toMatchInlineSnapshot(
      `"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><g fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round"><path id="test&quot;&lt;&amp;" data-layer="ring&apos;" data-draw-order="0" d="M10 10 L90 90" stroke-width="1.5"/></g></svg>"`,
    );
  });
});
