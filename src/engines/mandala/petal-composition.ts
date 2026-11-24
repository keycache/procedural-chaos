import {
  mapPath,
  type GeometryModel,
  type GeometryPath,
  type PathCommand,
} from './geometry';
import type { MandalaRecipe } from './recipe';
import type { decorateOrnament } from './ornament-decoration';

export function createPetalComposition(recipe: MandalaRecipe) {
  const { size } = recipe.canvas;
  const center = { x: size / 2, y: size / 2 };
  const radius = size * 0.465;
  const model: GeometryModel = {
    size,
    center,
    centers: [center],
    symmetry: { order: recipe.structure.symmetryOrder, type: 'rotational' },
    paths: [],
  };
  // Contiguous crown groups share a mask subtracting all later foreground crowns.
  function add(
    layerId: string,
    name: string,
    path: PathCommand[],
    angle: number,
    role: NonNullable<GeometryPath['role']> = 'decoration',
    weight = 1,
    occludes = false,
  ) {
    if (model.paths.length >= 4000)
      throw new Error(
        'This petal composition exceeds 4,000 paths. Reduce complexity or divisions.',
      );
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    model.paths.push({
      id: `${layerId}-${name}`,
      layerId,
      drawOrder: model.paths.length,
      role,
      occludes,
      strokeWidth: (recipe.global.strokeWidth * weight * size) / 1000,
      d: mapPath(path, ({ x, y }) => ({
        x: center.x + radius * (x * cos + y * sin),
        y: center.y + radius * (x * sin - y * cos),
      })),
    });
  }
  function addOrnament(
    layer: string,
    index: number,
    angle: number,
    result: ReturnType<typeof decorateOrnament>,
  ) {
    for (const path of result.paths)
      add(
        layer,
        `${index}-ornament-${path.id}`,
        path.d,
        angle,
        path.role,
        path.weight,
      );
    model.ornamentFit = {
      ...result.fit,
      omitted: (model.ornamentFit?.omitted ?? 0) + result.fit.omitted,
    };
  }
  return { model, add, addOrnament };
}
