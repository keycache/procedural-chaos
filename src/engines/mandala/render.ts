import { generateMandala } from './generate';
import { mandalaRecipeSchema } from './recipe';
import { renderSvg } from './svg';

export function createMandalaPreview(input: unknown) {
  const recipe = mandalaRecipeSchema.parse(input);
  const model = generateMandala(recipe);
  return {
    svg: renderSvg(model, recipe),
    pathCount: model.paths.length,
    ...(model.ornamentFit ? { ornamentFit: model.ornamentFit } : {}),
  };
}

export type MandalaPreview = ReturnType<typeof createMandalaPreview>;
export type MandalaWorker = { render: typeof createMandalaPreview };
