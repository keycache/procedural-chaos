import { createRandom } from '../../shared/random';
import {
  createStarterRecipe,
  mandalaRecipeSchema,
  type MandalaRecipe,
  type OrnamentSettings,
} from './recipe';
import { singleStyle } from './styles';
import {
  circle,
  createOrnamentShape,
  leaf,
  shapeFromContour,
  type OrnamentKind,
} from './ornament-shapes';
import { decorateOrnament } from './ornament-decoration';
import { createPetalComposition } from './petal-composition';
import { mapPath } from './geometry';
import { errorMessage } from '../../shared/errors';

export function createOrnateLotusRecipe(
  seed: string,
  complexity = 0.75,
  divisions = 8,
): MandalaRecipe {
  const recipe = createStarterRecipe(seed, 'freeform', 'rotational', divisions);
  return mandalaRecipeSchema.parse({
    ...recipe,
    style: singleStyle('traditional'),
    composition: { family: 'ornate-lotus', version: 1, complexity },
    global: { ...recipe.global, irregularity: 0, strokeWidth: 2.5 },
    layers: [],
  });
}

export function generateOrnateLotus(recipe: MandalaRecipe) {
  if (recipe.composition?.family !== 'ornate-lotus')
    throw new Error('Expected an ornate-lotus composition.');
  const { model, add, addOrnament } = createPetalComposition(recipe);
  const random = createRandom(`${recipe.seed}:ornate-lotus:1`);
  const order = recipe.structure.symmetryOrder;
  const sector = (Math.PI * 2) / order;
  const fullness = 0.97 + random() * 0.06;
  const height = 0.98 + random() * 0.02;
  const bend = (random() - 0.5) * 0.014;
  const detail = recipe.composition.complexity;
  const crowns: {
    id: string;
    kind: OrnamentKind;
    base: number;
    tip: number;
    width: number;
    count: number;
    offset: number;
    treatment: OrnamentSettings['treatment'];
    spacing: number;
    detail: number;
    weight: number;
    accent?: boolean;
    usableFrom?: number;
  }[] = [
    {
      id: 'lotus-scallops',
      kind: 'scallop',
      base: 0.48,
      tip: 1,
      width: 0.22,
      count: order,
      offset: 0.5,
      treatment: 'contour',
      spacing: 0.35,
      detail: detail * 0.65,
      weight: 1.15,
      accent: true,
    },
    {
      id: 'lotus-dominant',
      kind: 'lotus-petal',
      base: 0.2,
      tip: 0.94,
      width: 0.25,
      count: order,
      offset: 0,
      treatment: 'botanical',
      spacing: 0.25,
      detail,
      weight: 1.4,
      usableFrom: 0.3,
    },
    {
      id: 'lotus-secondary',
      kind: 'leaf',
      base: 0.18,
      tip: 0.79,
      width: 0.115,
      count: order * 2,
      offset: 0.25,
      treatment: 'contour',
      spacing: 0.25,
      detail: detail * 0.8,
      weight: 1,
    },
    {
      id: 'lotus-inner',
      kind: 'lotus-petal',
      base: 0.1,
      tip: 0.57,
      width: 0.18,
      count: order,
      offset: 0.5,
      treatment: 'paisley',
      spacing: 0.2,
      detail,
      weight: 1.3,
    },
    {
      id: 'lotus-rosette',
      kind: 'lotus-petal',
      base: 0.045,
      tip: 0.34,
      width: 0.105,
      count: order,
      offset: 0,
      treatment: 'botanical',
      spacing: 0.15,
      detail: detail * 0.5,
      weight: 1.1,
    },
    {
      id: 'lotus-heart-petals',
      kind: 'leaf',
      base: 0.03,
      tip: 0.24,
      width: 0.075,
      count: order,
      offset: 0.5,
      treatment: 'contour',
      spacing: 0.1,
      detail: 0,
      weight: 0.85,
    },
  ];
  for (const crown of crowns) {
    const raw = createOrnamentShape(crown.kind, {
      base: crown.base * height,
      tip: crown.tip * height,
      width: crown.width * (8 / order) * fullness,
      bend: bend * crown.tip,
    });
    // A convex angular envelope keeps sibling petals disjoint, including their roots.
    const slope = Math.tan(Math.PI / crown.count) * 0.92;
    const shape = shapeFromContour(
      crown.kind,
      mapPath(raw.contour, (point) => ({
        ...point,
        x: Math.max(-point.y * slope, Math.min(point.y * slope, point.x)),
      })),
      { from: crown.usableFrom ?? 0, to: 1 },
    );
    let decoration: ReturnType<typeof decorateOrnament>;
    try {
      decoration = decorateOrnament(
        shape,
        { version: 1, treatment: crown.treatment, spacing: crown.spacing },
        crown.detail,
        recipe.global.strokeWidth,
        `${recipe.seed}:${crown.id}`,
      );
    } catch (error) {
      throw new Error(
        `Could not decorate ${crown.id}: ${errorMessage(error)}`,
        { cause: error },
      );
    }
    for (let index = 0; index < crown.count; index++) {
      const angle = (index / crown.count) * Math.PI * 2 + crown.offset * sector;
      add(
        crown.id,
        `${index}-outline`,
        shape.contour,
        angle,
        'region-boundary',
        crown.weight,
        true,
      );
      addOrnament(crown.id, index, angle, decoration);
      if (crown.accent)
        add(
          crown.id,
          `${index}-ink-tip`,
          mapPath(leaf(0.84, 0.96, 0.14), (p) => shape.at(p.y, p.x)),
          angle,
          'solid-accent',
          0,
        );
    }
  }
  add(
    'lotus-heart',
    'outline',
    circle(0, 0, 0.048),
    0,
    'region-boundary',
    1.2,
    true,
  );
  add('lotus-heart', 'ink', circle(0, 0, 0.018), 0, 'solid-accent', 0);
  for (let index = 0; index < order; index++)
    add(
      'lotus-heart',
      `${index}-bead`,
      circle(0, 0.033, 0.0045),
      index * sector,
      'solid-accent',
      0,
    );
  return model;
}
