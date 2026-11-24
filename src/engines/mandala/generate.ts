import { rotatePoint } from '../../shared/geometry';
import { createRandom } from '../../shared/random';
import { createBoundary, createBoundaryProfile } from './boundaries';
import { distributeMotifs } from './distribution';
import {
  closedPolyline,
  mapPath,
  type GeometryModel,
  type PathCommand,
} from './geometry';
import { createMotif } from './motifs';
import { mandalaRecipeSchema } from './recipe';
import type { MotifId } from './recipe';
import { symmetryOperations, transformPath } from './symmetry';
import { closeContours, transformMotif } from './transforms';
import { generateBoldFloral } from './bold-floral';
import { generateOrnateLotus } from './ornate-lotus';

const MAX_PATHS = 24_000;

function ornaments(motif: MotifId): PathCommand[][] {
  if (motif === 'leaf' || motif === 'petal' || motif === 'teardrop') {
    const vein = closedPolyline([
      { x: -0.008, y: 0.1 },
      { x: 0, y: 0.9 },
      { x: 0.008, y: 0.1 },
    ]);
    return [
      vein,
      ...[0.3, 0.45, 0.6].flatMap((height) =>
        [-1, 1].map((side) =>
          closedPolyline([
            { x: 0, y: height - 0.03 },
            { x: side * 0.22, y: height + 0.08 },
            { x: 0, y: height },
          ]),
        ),
      ),
    ];
  }
  return [];
}

export function generateMandala(input: unknown): GeometryModel {
  const recipe = mandalaRecipeSchema.parse(input);
  if (recipe.composition?.family === 'bold-floral')
    return generateBoldFloral(recipe);
  if (recipe.composition?.family === 'ornate-lotus')
    return generateOrnateLotus(recipe);
  const { size } = recipe.canvas;
  const {
    symmetryOrder: order,
    symmetryType: type,
    centers,
    brokenSymmetry,
  } = recipe.structure;
  const center = { x: size / 2, y: size / 2 };
  const operations = symmetryOperations(type, order);
  const profile = createBoundaryProfile(recipe);
  const exactSymmetry = centers === 1 && brokenSymmetry === 0;
  const focalCenters = Array.from({ length: centers }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / centers;
    return centers === 1
      ? center
      : {
          x: center.x + Math.cos(angle) * size * 0.23,
          y: center.y + Math.sin(angle) * size * 0.23,
        };
  });
  const model: GeometryModel = {
    size,
    center,
    centers: focalCenters,
    symmetry: {
      order: exactSymmetry ? order : 1,
      type: exactSymmetry ? type : 'none',
      ...(exactSymmetry && (type === 'bilateral' || type === 'dihedral')
        ? { mirrorAngle: Math.PI / 2 }
        : {}),
    },
    paths: [],
  };
  const close = recipe.style !== undefined;
  for (const [centerIndex, destination] of focalCenters.entries()) {
    const scale = centers === 1 ? 1 : 0.48;
    const prefix = centers === 1 ? '' : `center-${centerIndex}-`;
    const boundaries = new Set<number>();
    const addPath = (
      id: string,
      layerId: string,
      path: PathCommand[],
      strokeScale = 1,
    ) => {
      if (model.paths.length >= MAX_PATHS) {
        throw new Error(
          'This composition exceeds 24,000 paths. Reduce complexity, recursion, divisions, or centers.',
        );
      }
      const d = mapPath(path, (point) => ({
        x: destination.x + (point.x - center.x) * scale,
        y: destination.y + (point.y - center.y) * scale,
      }));
      model.paths.push({
        id: prefix + id,
        layerId,
        d: close ? closeContours(d) : d,
        strokeWidth: recipe.global.strokeWidth * strokeScale * Math.sqrt(scale),
        drawOrder: model.paths.length,
      });
    };

    for (const original of recipe.layers) {
      const spacing = 1 - recipe.global.negativeSpace * 0.65;
      const layer = {
        ...original,
        count: Math.min(
          192,
          Math.max(
            1,
            Math.round(original.count * (0.5 + recipe.global.density)),
          ),
        ),
        scale: original.scale * spacing,
        motifParams: {
          ...original.motifParams,
          width: original.motifParams.width * spacing,
        },
      };
      if (!layer.enabled) continue;
      for (const radius of [layer.innerRadius, layer.outerRadius]) {
        if (boundaries.has(radius)) continue;
        boundaries.add(radius);
        addPath(
          `boundary-${radius}`,
          layer.id,
          createBoundary(radius, size, order, profile),
          close ? 1.15 : 1,
        );
      }
      const random = createRandom(
        `${recipe.seed}:${layer.id}:${layer.seedOffset}${prefix}`,
      );
      const placements = distributeMotifs(layer, operations.length, random);
      const decoration = layer.ornament > 0.7 ? ornaments(layer.motif) : [];
      placements.forEach((placement, slot) => {
        const widthVariation = 1 - recipe.global.irregularity * random() * 0.3;
        const curvature =
          layer.motifParams.curvature *
          (1 - recipe.global.irregularity * random() * 0.3);
        const templates = Array.from(
          { length: layer.recursionDepth + 1 },
          (_, depth) => ({
            path: transformMotif(
              createMotif(layer.motif, curvature, layer.motifParams.points),
              layer,
              random,
              depth,
            ),
            stroke: depth === 0 ? 1 : 0.65,
          }),
        );
        for (const path of decoration) {
          templates.push({
            path: transformMotif(path, layer, random, 0),
            stroke: 0.5,
          });
        }
        const positioned = templates.map((template) => ({
          ...template,
          path: mapPath(template.path, (point) => {
            const radial =
              ((placement.radius + (point.y - 0.5) * placement.height) * size) /
              2;
            // Ornamental rings follow the annulus instead of shrinking into isolated stamps.
            const angularWidth =
              (Math.PI * 2) / operations.length / placements.length;
            const angle =
              placement.angle +
              point.x *
                angularWidth *
                layer.motifParams.width *
                (layer.motif === 'leaf' ? 1.25 : 0.8) *
                widthVariation;
            const rotated =
              close && layer.ornament > 0 && layer.distribution === 'ring'
                ? {
                    x: Math.sin(angle) * radial,
                    y: -Math.cos(angle) * radial,
                  }
                : rotatePoint(
                    {
                      x:
                        (point.x * placement.width * widthVariation * size) / 2,
                      y: -radial,
                    },
                    placement.angle,
                  );
            const factor = profile(Math.atan2(rotated.y, rotated.x));
            return {
              x: center.x + rotated.x * factor,
              y: center.y + rotated.y * factor,
            };
          }),
        }));
        operations.forEach((operation, index) => {
          const jitter = (random() - 0.5) * brokenSymmetry * 0.3;
          positioned.forEach((template, detail) => {
            addPath(
              `${layer.id}-motif-${slot}-${index}${detail === 0 ? '' : `-detail-${detail}`}`,
              layer.id,
              transformPath(
                template.path,
                { ...operation, angle: operation.angle + jitter },
                center,
              ),
              layer.strokeScale * template.stroke,
            );
          });
        });
      });

      if (recipe.structure.baseGeometry === 'spiral') {
        const sector = (Math.PI * 2) / operations.length;
        const inner = (layer.innerRadius * size) / 2;
        const outer = (layer.outerRadius * size) / 2;
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
            0.65,
          );
        });
      }
    }
  }
  return model;
}
