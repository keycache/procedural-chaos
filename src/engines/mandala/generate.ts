import { rotatePoint } from '../../shared/geometry';
import { createRandom } from '../../shared/random';
import { createBoundary, createBoundaryProfile } from './boundaries';
import { mapPath, type GeometryModel, type PathCommand } from './geometry';
import { createMotif } from './motifs';
import { mandalaRecipeSchema } from './recipe';
import { symmetryOperations, transformPath } from './symmetry';

export function generateMandala(input: unknown): GeometryModel {
  const recipe = mandalaRecipeSchema.parse(input);
  const { size } = recipe.canvas;
  const { symmetryOrder: order, symmetryType: type } = recipe.structure;
  const center = { x: size / 2, y: size / 2 };
  const operations = symmetryOperations(type, order);
  const profile = createBoundaryProfile(recipe);
  const model: GeometryModel = {
    size,
    center,
    symmetry: {
      order,
      type,
      ...(type === 'bilateral' || type === 'dihedral'
        ? { mirrorAngle: Math.PI / 2 }
        : {}),
    },
    paths: [],
  };
  const boundaries = new Set<number>();
  const addPath = (id: string, layerId: string, d: PathCommand[]) => {
    model.paths.push({
      id,
      layerId,
      d,
      strokeWidth: recipe.global.strokeWidth,
      drawOrder: model.paths.length,
    });
  };

  for (const layer of recipe.layers) {
    if (!layer.enabled) continue;
    for (const radius of [layer.innerRadius, layer.outerRadius]) {
      if (boundaries.has(radius)) continue;
      boundaries.add(radius);
      addPath(
        `boundary-${radius}`,
        layer.id,
        createBoundary(radius, size, order, profile),
      );
    }
    const random = createRandom(
      `${recipe.seed}:${layer.id}:${layer.seedOffset}`,
    );
    const slots = Math.ceil(layer.count / operations.length);
    const sector = (Math.PI * 2) / operations.length;
    const spacing = sector / slots;
    const inner = (layer.innerRadius * size) / 2;
    const outer = (layer.outerRadius * size) / 2;
    const height = (outer - inner) * layer.scale;
    const middle = (inner + outer) / 2;

    for (let slot = 0; slot < slots; slot += 1) {
      const widthVariation = 1 - recipe.global.irregularity * random() * 0.3;
      const curvature =
        layer.motifParams.curvature *
        (1 - recipe.global.irregularity * random() * 0.3);
      const width =
        Math.min(
          height * 1.5,
          2 * inner * Math.sin(Math.min(spacing, Math.PI) / 2),
        ) *
        layer.motifParams.width *
        widthVariation;
      const angle = (slot + 0.5) * spacing + layer.rotationOffset;
      const template = mapPath(
        createMotif(layer.motif, curvature, layer.motifParams.points),
        (point) => {
          const rotated = rotatePoint(
            {
              x: point.x * width,
              y: -(middle + (point.y - 0.5) * height),
            },
            angle,
          );
          const factor = profile(Math.atan2(rotated.y, rotated.x));
          return {
            x: center.x + rotated.x * factor,
            y: center.y + rotated.y * factor,
          };
        },
      );
      operations.forEach((operation, index) => {
        addPath(
          `${layer.id}-motif-${slot}-${index}`,
          layer.id,
          transformPath(template, operation, center),
        );
      });
    }

    if (recipe.structure.baseGeometry === 'spiral') {
      const guide: PathCommand[] = Array.from({ length: 65 }, (_, index) => {
        const progress = index / 64;
        const angle = -Math.PI / 2 + progress * sector * 0.8;
        const radius = inner + (outer - inner) * progress;
        return {
          type: index === 0 ? 'M' : 'L',
          to: {
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
          },
        };
      });
      operations.forEach((operation, index) => {
        addPath(
          `${layer.id}-spiral-${index}`,
          layer.id,
          transformPath(guide, operation, center),
        );
      });
    }
  }
  return model;
}
