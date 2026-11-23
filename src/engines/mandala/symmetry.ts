import { reflectPoint, rotatePoint, type Point } from '../../shared/geometry';
import { mapPath, type PathCommand } from './geometry';
import type { SymmetryType } from './recipe';

export type SymmetryOperation = { angle: number; mirrored: boolean };

export function symmetryOperations(
  type: SymmetryType,
  order: number,
): SymmetryOperation[] {
  const rotations = type === 'rotational' || type === 'dihedral' ? order : 1;
  const mirrors = type === 'dihedral' || type === 'bilateral';
  return Array.from({ length: rotations }, (_, index) => {
    const angle = (index * 2 * Math.PI) / rotations;
    return mirrors
      ? [
          { angle, mirrored: false },
          { angle, mirrored: true },
        ]
      : [{ angle, mirrored: false }];
  }).flat();
}

export function transformPath(
  path: PathCommand[],
  operation: SymmetryOperation,
  center: Point,
): PathCommand[] {
  return mapPath(path, (point) =>
    rotatePoint(
      operation.mirrored ? reflectPoint(point, center.x) : point,
      operation.angle,
      center,
    ),
  );
}
