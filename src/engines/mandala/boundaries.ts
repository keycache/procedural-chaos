import { createRandom } from '../../shared/random';
import { closedPolyline, type PathCommand } from './geometry';
import type { MandalaRecipe } from './recipe';

export function createBoundaryProfile(
  recipe: MandalaRecipe,
): (angle: number) => number {
  const { baseGeometry, symmetryOrder, symmetryType, polygonSides } =
    recipe.structure;
  const radial = symmetryType === 'rotational' || symmetryType === 'dihedral';
  const sides = radial
    ? Math.ceil(polygonSides / symmetryOrder) * symmetryOrder
    : polygonSides;
  const random = createRandom(`${recipe.seed}:boundary`);
  const wave = radial ? symmetryOrder : symmetryType === 'bilateral' ? 2 : 3;
  const phase = symmetryType === 'none' ? random() * Math.PI * 2 : 0;
  const amplitude = 0.05 + random() * 0.05;

  return (angle) => {
    const theta = angle + Math.PI / 2;
    switch (baseGeometry) {
      case 'circle':
      case 'spiral':
        return 1;
      case 'polygon': {
        const step = (Math.PI * 2) / sides;
        const withinEdge = (((theta % step) + step) % step) - step / 2;
        return Math.cos(step / 2) / Math.cos(withinEdge);
      }
      case 'star': {
        const step = Math.PI / sides;
        const position =
          (((theta / step) % (2 * sides)) + 2 * sides) % (2 * sides);
        const index = Math.floor(position);
        const local = (position - index) * step;
        const start = index % 2 === 0 ? 1 : 0.6;
        const end = index % 2 === 0 ? 0.6 : 1;
        return (
          (start * end * Math.sin(step)) /
          (end * Math.sin(step - local) + start * Math.sin(local))
        );
      }
      case 'freeform':
        return (
          0.82 +
          amplitude * Math.cos(wave * theta + phase) +
          0.04 * Math.cos(2 * wave * theta + phase)
        );
    }
  };
}

export function createBoundary(
  radius: number,
  size: number,
  order: number,
  profile: (angle: number) => number,
): PathCommand[] {
  const samples = order * Math.ceil(192 / order);
  return closedPolyline(
    Array.from({ length: samples }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / samples;
      const distance = ((radius * size) / 2) * profile(angle);
      return {
        x: size / 2 + Math.cos(angle) * distance,
        y: size / 2 + Math.sin(angle) * distance,
      };
    }),
  );
}
