import { z } from 'zod';
import { createRandom } from '../../shared/random';
import { seedSchema } from '../../shared/schemas';
import {
  baseGeometries,
  createStarterRecipe,
  distributions,
  mandalaRecipeSchema,
  styleBlendSchema,
  styles,
  symmetryTypes,
} from './recipe';
import type {
  Distribution,
  LayerRecipe,
  MandalaRecipe,
  MotifId,
  Style,
  StyleBlend,
} from './recipe';

const biases: Record<
  Style,
  {
    order: number;
    irregularity: number;
    ornament: number;
    recursion: number;
    twist: number;
    noise: number;
    distortion: number;
    motifs: MotifId[];
    distribution: Distribution[];
  }
> = {
  traditional: {
    order: 8,
    irregularity: 0.15,
    ornament: 0.95,
    recursion: 2,
    twist: 0,
    noise: 0,
    distortion: 0,
    motifs: ['petal', 'teardrop', 'leaf', 'petal'],
    distribution: ['ring', 'ring', 'ring', 'ring'],
  },
  geometric: {
    order: 6,
    irregularity: 0,
    ornament: 0.75,
    recursion: 2,
    twist: 0.15,
    noise: 0,
    distortion: 0,
    motifs: ['star', 'interlocking', 'polygon', 'star'],
    distribution: ['ring', 'tessellation', 'ring', 'grid'],
  },
  organic: {
    order: 6,
    irregularity: 0.65,
    ornament: 0.85,
    recursion: 2,
    twist: 0.2,
    noise: 0.15,
    distortion: 0.3,
    motifs: ['leaf', 'branch', 'leaf', 'spiral'],
    distribution: ['ring', 'branching', 'spiral', 'ring'],
  },
  abstract: {
    order: 1,
    irregularity: 0.6,
    ornament: 0.65,
    recursion: 1,
    twist: 0.6,
    noise: 0.3,
    distortion: 0.4,
    motifs: ['spiral', 'interlocking', 'teardrop', 'star'],
    distribution: ['spiral', 'grid', 'scatter', 'ring'],
  },
};

const optionsSchema = z.strictObject({
  seed: seedSchema,
  blend: styleBlendSchema,
  complexity: z.number().finite().min(0).max(1).default(0.65),
  baseGeometry: z.enum(baseGeometries).optional(),
  symmetryType: z.enum(symmetryTypes).optional(),
  symmetryOrder: z.number().int().min(1).max(48).optional(),
  distribution: z.enum(distributions).optional(),
  centers: z.number().int().min(1).max(4).optional(),
  brokenSymmetry: z.number().finite().min(0).max(1).optional(),
  recursionDepth: z.number().int().min(0).max(3).optional(),
  twist: z.number().finite().min(-1).max(1).optional(),
  noise: z.number().finite().min(0).max(1).optional(),
  distortion: z.number().finite().min(0).max(1).optional(),
});

export type StyleOptions = z.input<typeof optionsSchema>;

export function singleStyle(style: Style): StyleBlend {
  return { traditional: 0, geometric: 0, organic: 0, abstract: 0, [style]: 1 };
}

export function resolveStyle(input: StyleBlend) {
  const blend = styleBlendSchema.parse(input);
  const total = Object.values(blend).reduce((sum, weight) => sum + weight, 0);
  const weights: StyleBlend = {
    traditional: blend.traditional / total,
    geometric: blend.geometric / total,
    organic: blend.organic / total,
    abstract: blend.abstract / total,
  };
  const dominant = styles.reduce(
    (best, style) => (weights[style] > weights[best] ? style : best),
    styles[0],
  );
  function average(
    key:
      | 'irregularity'
      | 'ornament'
      | 'recursion'
      | 'twist'
      | 'noise'
      | 'distortion',
  ) {
    return styles.reduce(
      (sum, style) => sum + weights[style] * biases[style][key],
      0,
    );
  }
  return {
    weights,
    dominant,
    irregularity: average('irregularity'),
    ornament: average('ornament'),
    recursion: average('recursion'),
    twist: average('twist'),
    noise: average('noise'),
    distortion: average('distortion'),
  };
}

function chooseStyle(weights: StyleBlend, random: () => number): Style {
  let choice = random();
  let lastPositive: Style = 'traditional';
  for (const style of styles) {
    if (weights[style] > 0) lastPositive = style;
    choice -= weights[style];
    if (choice < 0) return style;
  }
  // Floating-point accumulation can leave a tiny positive remainder.
  return lastPositive;
}

export function createStyleRecipe(input: StyleOptions): MandalaRecipe {
  const options = optionsSchema.parse(input);
  const style = resolveStyle(options.blend);
  const { dominant, weights } = style;
  const abstract = weights.abstract;
  const symmetry =
    options.symmetryType ?? (dominant === 'abstract' ? 'none' : 'rotational');
  const order =
    symmetry === 'none' || symmetry === 'bilateral'
      ? 1
      : (options.symmetryOrder ?? biases[dominant].order);
  const base =
    options.baseGeometry ??
    (dominant === 'organic' || dominant === 'abstract' ? 'freeform' : 'circle');
  const recipe = createStarterRecipe(options.seed, base, symmetry, order);
  recipe.style = weights;
  recipe.structure.centers =
    options.centers ?? (dominant === 'abstract' ? 3 : 1);
  recipe.structure.brokenSymmetry = options.brokenSymmetry ?? abstract * 0.35;
  recipe.global.irregularity = style.irregularity;
  recipe.global.strokeWidth = 1.8;
  const mainBands = 3 + Math.round(options.complexity * 2);
  const planRandom = createRandom(`${options.seed}:composition`);
  const widths = Array.from({ length: mainBands * 2 }, (_, index) =>
    index % 2 === 0 ? 1 + planRandom() * 0.9 : 0.22 + planRandom() * 0.14,
  );
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  let radius = 0.035;
  recipe.layers = widths.map((width, index): LayerRecipe => {
    const band = Math.floor(index / 2);
    const border = index % 2 === 1;
    const random = createRandom(`${options.seed}:design-${index}`);
    const layerStyle = biases[chooseStyle(weights, random)];
    const innerRadius = radius;
    // Reserve the minimum ring width, then distribute the remaining space.
    radius += 0.02 + ((0.865 - widths.length * 0.02) * width) / totalWidth;
    const motif: MotifId = border
      ? index % 4 === 1
        ? 'dot'
        : 'interlocking'
      : layerStyle.motifs[band % layerStyle.motifs.length];
    const distribution = border
      ? 'ring'
      : (options.distribution ??
        layerStyle.distribution[band % layerStyle.distribution.length]);
    const count = border
      ? Math.min(96, (order > 1 ? order : 8) * (4 + band * 2))
      : Math.min(
          192,
          (order > 1 ? order : 7) *
            (distribution === 'grid' || distribution === 'tessellation'
              ? 12
              : distribution === 'spiral' || distribution === 'scatter'
                ? 5
                : band > 1 && options.complexity > 0.7
                  ? 2
                  : 1),
        );
    return {
      id: `band-${index + 1}`,
      enabled: true,
      distribution,
      motif,
      innerRadius,
      outerRadius: Math.min(0.9, radius),
      count,
      scale: border ? 0.65 : 0.95,
      rotationOffset:
        symmetry === 'dihedral' || symmetry === 'bilateral'
          ? 0
          : ((band % 2) * Math.PI) / (order > 1 ? order : count),
      recursionDepth: border
        ? 0
        : (options.recursionDepth ??
          Math.round(style.recursion * options.complexity)),
      scaling: 0.62,
      twist: options.twist ?? style.twist,
      distortion: options.distortion ?? style.distortion,
      noise: options.noise ?? style.noise,
      ornament: border ? 0 : style.ornament,
      strokeScale: border ? 0.75 : 1,
      motifParams: {
        width: border ? 0.85 : 0.95,
        curvature: 0.7 + random() * 0.25,
        points: dominant === 'geometric' ? 6 : 5,
      },
      seedOffset: index,
    };
  });
  return mandalaRecipeSchema.parse(recipe);
}
