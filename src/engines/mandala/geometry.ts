import type { Point } from '../../shared/geometry';
import type { SymmetryType } from './recipe';

export type PathCommand =
  | { type: 'M' | 'L'; to: Point }
  | { type: 'C'; control1: Point; control2: Point; to: Point }
  | { type: 'Z' };

export type GeometryPath = {
  id: string;
  layerId: string;
  d: PathCommand[];
  strokeWidth: number;
  drawOrder: number;
};

export type GeometryModel = {
  size: number;
  center: Point;
  centers?: Point[];
  symmetry: { order: number; type: SymmetryType; mirrorAngle?: number };
  paths: GeometryPath[];
};

export function mapPath(
  commands: PathCommand[],
  transform: (point: Point) => Point,
): PathCommand[] {
  return commands.map((command) => {
    switch (command.type) {
      case 'Z':
        return command;
      case 'C':
        return {
          ...command,
          control1: transform(command.control1),
          control2: transform(command.control2),
          to: transform(command.to),
        };
      default:
        return { ...command, to: transform(command.to) };
    }
  });
}

export function closedPolyline(points: Point[]): PathCommand[] {
  return [
    ...points.map((to, index): PathCommand => ({
      type: index === 0 ? 'M' : 'L',
      to,
    })),
    { type: 'Z' },
  ];
}
