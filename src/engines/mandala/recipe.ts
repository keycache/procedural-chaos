import { z } from 'zod';
import { seedSchema } from '../../shared/schemas';

export const ENGINE_VERSION = '0.1.0';
export const baseGeometries = [
  'circle',
  'polygon',
  'star',
  'spiral',
  'freeform',
] as const;
export const symmetryTypes = [
  'rotational',
  'dihedral',
  'bilateral',
  'none',
] as const;
export const motifs = [
  'petal',
  'arc',
  'dot',
  'polygon',
  'star',
  'teardrop',
] as const;

const fraction = z.number().finite().min(0).max(1);
const angle = z
  .number()
  .finite()
  .min(-Math.PI * 2)
  .max(Math.PI * 2);

const layerSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    enabled: z.boolean(),
    distribution: z.literal('ring'),
    motif: z.enum(motifs),
    innerRadius: z.number().finite().min(0.02).max(0.9),
    outerRadius: z.number().finite().min(0.02).max(0.9),
    count: z.number().int().min(1).max(192),
    scale: z.number().finite().min(0.1).max(1),
    rotationOffset: angle,
    motifParams: z.strictObject({
      width: z.number().finite().min(0.1).max(1),
      curvature: z.number().finite().min(0.1).max(1),
      points: z.number().int().min(3).max(16),
    }),
    seedOffset: z.number().int().min(0).max(1_000_000),
  })
  .refine((layer) => layer.outerRadius - layer.innerRadius >= 0.02 - 1e-12, {
    message: 'A ring must be at least 0.02 canvas radii wide.',
    path: ['outerRadius'],
  });

export const mandalaRecipeSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    engineVersion: z.literal(ENGINE_VERSION),
    seed: seedSchema,
    canvas: z.strictObject({ size: z.number().int().min(128).max(4096) }),
    structure: z.strictObject({
      baseGeometry: z.enum(baseGeometries),
      polygonSides: z.number().int().min(3).max(24),
      symmetryOrder: z.number().int().min(1).max(48),
      symmetryType: z.enum(symmetryTypes),
      centers: z.literal(1),
    }),
    global: z.strictObject({
      irregularity: fraction,
      strokeWidth: z.number().finite().min(0.25).max(8),
    }),
    layers: z.array(layerSchema).min(1).max(12),
  })
  .superRefine((recipe, context) => {
    const { symmetryType, symmetryOrder } = recipe.structure;
    if (
      (symmetryType === 'none' || symmetryType === 'bilateral') &&
      symmetryOrder !== 1
    ) {
      context.addIssue({
        code: 'custom',
        path: ['structure', 'symmetryOrder'],
        message: 'Bilateral and no-symmetry recipes use rotational order 1.',
      });
    }
    const ids = new Set<string>();
    let previousOuter = 0;
    recipe.layers.forEach((layer, index) => {
      if (ids.has(layer.id)) {
        context.addIssue({
          code: 'custom',
          path: ['layers', index, 'id'],
          message: 'Layer IDs must be unique.',
        });
      }
      ids.add(layer.id);
      if (!layer.enabled) return;
      if (layer.innerRadius < previousOuter) {
        context.addIssue({
          code: 'custom',
          path: ['layers', index, 'innerRadius'],
          message:
            'Enabled rings must be ordered from inside to outside and must not overlap.',
        });
      }
      previousOuter = layer.outerRadius;
      if (
        (symmetryType === 'dihedral' || symmetryType === 'bilateral') &&
        layer.rotationOffset !== 0
      ) {
        context.addIssue({
          code: 'custom',
          path: ['layers', index, 'rotationOffset'],
          message:
            'Mirror-symmetric rings use zero rotation offset in the geometry core.',
        });
      }
    });
    if (!recipe.layers.some((layer) => layer.enabled)) {
      context.addIssue({
        code: 'custom',
        path: ['layers'],
        message: 'Enable at least one ring.',
      });
    }
  });

export type MandalaRecipe = z.infer<typeof mandalaRecipeSchema>;
export type LayerRecipe = MandalaRecipe['layers'][number];
export type BaseGeometry = MandalaRecipe['structure']['baseGeometry'];
export type SymmetryType = MandalaRecipe['structure']['symmetryType'];
export type MotifId = LayerRecipe['motif'];

export function createStarterRecipe(
  seed: string,
  baseGeometry: BaseGeometry = 'circle',
  symmetryType: SymmetryType = 'rotational',
  symmetryOrder = 12,
): MandalaRecipe {
  const order =
    symmetryType === 'none' || symmetryType === 'bilateral' ? 1 : symmetryOrder;
  const radii = [0.04, 0.16, 0.3, 0.46, 0.62, 0.78, 0.9];
  const ringMotifs: MotifId[] = [
    'petal',
    'dot',
    'teardrop',
    'polygon',
    'star',
    'arc',
  ];
  return {
    schemaVersion: 1,
    engineVersion: ENGINE_VERSION,
    seed,
    canvas: { size: 1000 },
    structure: {
      baseGeometry,
      polygonSides: 6,
      symmetryOrder: order,
      symmetryType,
      centers: 1,
    },
    global: { irregularity: 0.3, strokeWidth: 1.5 },
    layers: ringMotifs.map((motif, index) => ({
      id: `ring-${index + 1}`,
      enabled: true,
      distribution: 'ring',
      motif,
      innerRadius: radii[index],
      outerRadius: radii[index + 1],
      count: index % 2 === 0 ? 12 : 24,
      scale:
        motif === 'dot' || motif === 'polygon' || motif === 'star' ? 0.72 : 1,
      rotationOffset: 0,
      motifParams: { width: 0.85, curvature: 0.8, points: 5 },
      seedOffset: index,
    })),
  };
}
