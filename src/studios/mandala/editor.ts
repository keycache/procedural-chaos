import { z } from 'zod';
import {
  layerSchema,
  mandalaRecipeSchema,
  styleBlendSchema,
  styles,
  ornamentSettingsSchema,
  type LayerRecipe,
  type MandalaRecipe,
} from '../../engines/mandala/recipe';
import {
  createStyleRecipe,
  singleStyle,
  styleOptionsSchema,
} from '../../engines/mandala/styles';
import { seedSchema } from '../../shared/schemas';
import { createBoldFloralRecipe } from '../../engines/mandala/bold-floral';

export const editorDocumentSchema = z.strictObject({
  name: z.string().trim().min(1, 'Enter a project name.').max(80),
  seed: seedSchema,
  mode: z.enum([...styles, 'hybrid', 'bold-floral']),
  blend: styleBlendSchema,
  options: styleOptionsSchema.omit({ seed: true, blend: true }),
  globals: z.strictObject({
    strokeWidth: z.number().min(0.25).max(8).optional(),
    irregularity: z.number().min(0).max(1).optional(),
    density: z.number().min(0).max(1).optional(),
    negativeSpace: z.number().min(0).max(1).optional(),
  }),
  layers: z.array(layerSchema).min(1).max(12).nullable(),
  ornament: ornamentSettingsSchema.optional(),
});

export type EditorDocument = z.output<typeof editorDocumentSchema>;
export type EditorMode = EditorDocument['mode'];

export function createEditorDocument(): EditorDocument {
  return {
    name: 'Lotus study',
    seed: 'lotus-001',
    mode: 'traditional',
    blend: singleStyle('traditional'),
    options: { complexity: 0.65 },
    globals: {},
    layers: null,
    ornament: undefined,
  };
}

export function editorRecipe(document: EditorDocument): MandalaRecipe {
  if (document.mode === 'bold-floral') {
    if (
      document.layers !== null ||
      Object.entries(document.options).some(
        ([key, value]) =>
          value !== undefined &&
          key !== 'complexity' &&
          key !== 'symmetryOrder',
      ) ||
      Object.entries(document.globals).some(
        ([key, value]) => value !== undefined && key !== 'strokeWidth',
      )
    )
      throw new Error(
        'Bold floral supports complexity, rotational divisions, and stroke width, not ring-layer or style overrides.',
      );
    const planned = createBoldFloralRecipe(
      document.seed,
      document.options.complexity,
      document.options.symmetryOrder,
    );
    return mandalaRecipeSchema.parse({
      ...planned,
      composition: { ...planned.composition, ornament: document.ornament },
      global: { ...planned.global, ...document.globals },
    });
  }
  if (document.ornament)
    throw new Error(
      'Shape-aware ornaments require the bold-floral composition.',
    );
  const planned = createStyleRecipe({
    seed: document.seed,
    blend: document.blend,
    ...document.options,
  });
  return mandalaRecipeSchema.parse({
    ...planned,
    global: { ...planned.global, ...document.globals },
    layers: document.layers ?? planned.layers,
  });
}

export function redistributeLayers(layers: LayerRecipe[]): LayerRecipe[] {
  if (layers.length < 1 || layers.length > 12)
    throw new Error('Use between 1 and 12 layers.');
  const start = 0.035;
  const end = 0.9;
  const weights = layers.map((layer) =>
    Math.max(0.001, layer.outerRadius - layer.innerRadius),
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let radius = start;
  return layers.map((layer, index) => {
    const innerRadius = radius;
    radius +=
      0.02 + ((end - start - layers.length * 0.02) * weights[index]) / total;
    return {
      ...layer,
      innerRadius,
      outerRadius: index === layers.length - 1 ? end : radius,
    };
  });
}

export const presets = [
  {
    id: 'floral',
    name: 'Floral flourish',
    description:
      'Expressive leaves, curling tendrils, pointed crowns, and bold ink accents.',
    style: 'bold-floral',
    seed: 'flourish-008',
    complexity: 0.65,
  },
  {
    id: 'floral-contour',
    name: 'Contour lace',
    description: 'Contour-following beads and nested lotus ornaments.',
    style: 'bold-floral',
    seed: 'flourish-008',
    complexity: 0.65,
    ornament: { version: 1, treatment: 'contour', spacing: 0.35 },
  },
  {
    id: 'floral-botanical',
    name: 'Botanical filigree',
    description: 'Curved veins and nested leaf sprays inside floral forms.',
    style: 'bold-floral',
    seed: 'flourish-008',
    complexity: 0.65,
    ornament: { version: 1, treatment: 'botanical', spacing: 0.35 },
  },
  {
    id: 'floral-paisley',
    name: 'Paisley jewels',
    description: 'Nested curved paisleys, tendrils, and bead accents.',
    style: 'bold-floral',
    seed: 'flourish-008',
    complexity: 0.65,
    ornament: { version: 1, treatment: 'paisley', spacing: 0.35 },
  },
  {
    id: 'lotus',
    name: 'Lotus filigree',
    description: 'Nested petals and beaded borders.',
    style: 'traditional',
    seed: 'lotus-001',
    complexity: 0.65,
  },
  {
    id: 'prism',
    name: 'Prismatic lattice',
    description: 'Stars, tiles, and precise polygon bands.',
    style: 'geometric',
    seed: 'prism-018',
    complexity: 0.8,
  },
  {
    id: 'fern',
    name: 'Fern garden',
    description: 'Branching foliage and curling botanical forms.',
    style: 'organic',
    seed: 'fern-027',
    complexity: 0.6,
  },
  {
    id: 'orbit',
    name: 'Drifting orbits',
    description: 'Three asymmetric focal points.',
    style: 'abstract',
    seed: 'orbit-042',
    complexity: 0.45,
  },
  {
    id: 'woven',
    name: 'Woven lotus',
    description: 'Traditional ornament meets geometric structure.',
    style: 'hybrid',
    seed: 'woven-014',
    complexity: 0.75,
    blend: { traditional: 0.7, geometric: 0.3, organic: 0, abstract: 0 },
  },
  {
    id: 'wild',
    name: 'Wild geometry',
    description: 'A geometric and organic crossover.',
    style: 'hybrid',
    seed: 'wild-031',
    complexity: 0.65,
    blend: { traditional: 0, geometric: 0.45, organic: 0.55, abstract: 0 },
  },
] as const;

export function presetDocument(id: string): EditorDocument {
  const preset = presets.find((item) => item.id === id);
  if (!preset) throw new Error('That preset does not exist.');
  return {
    name: preset.name,
    seed: preset.seed,
    mode: preset.style,
    blend:
      'blend' in preset
        ? { ...preset.blend }
        : singleStyle(
            preset.style === 'bold-floral' ? 'traditional' : preset.style,
          ),
    options: { complexity: preset.complexity },
    globals: {},
    layers: null,
    ornament: 'ornament' in preset ? { ...preset.ornament } : undefined,
  };
}

export function matchingPresetId(document: EditorDocument): string {
  if (
    document.layers !== null ||
    Object.keys(document.globals).length > 0 ||
    Object.keys(document.options).length !== 1
  )
    return '';
  return (
    presets.find((preset) => {
      const expected = presetDocument(preset.id);
      return (
        document.seed === expected.seed &&
        document.mode === expected.mode &&
        document.options.complexity === expected.options.complexity &&
        document.ornament?.treatment === expected.ornament?.treatment &&
        document.ornament?.spacing === expected.ornament?.spacing &&
        styles.every((style) => document.blend[style] === expected.blend[style])
      );
    })?.id ?? ''
  );
}
