import { closedPolyline, type PathCommand } from './geometry';
import type { MotifId } from './recipe';

const KAPPA = 0.5522847498307936;

export function createMotif(
  motif: MotifId,
  curvature: number,
  points: number,
): PathCommand[] {
  switch (motif) {
    case 'petal':
    case 'teardrop': {
      const waist = motif === 'petal' ? 0.25 : 0.05;
      return [
        { type: 'M', to: { x: 0, y: 0 } },
        {
          type: 'C',
          control1: { x: -curvature, y: waist },
          control2: { x: -curvature, y: 0.75 },
          to: { x: 0, y: 1 },
        },
        {
          type: 'C',
          control1: { x: curvature, y: 0.75 },
          control2: { x: curvature, y: waist },
          to: { x: 0, y: 0 },
        },
        { type: 'Z' },
      ];
    }
    case 'arc':
      return [
        { type: 'M', to: { x: -0.5, y: 0.2 } },
        {
          type: 'C',
          control1: { x: -0.5, y: curvature },
          control2: { x: 0.5, y: curvature },
          to: { x: 0.5, y: 0.2 },
        },
      ];
    case 'dot': {
      const k = KAPPA / 2;
      return [
        { type: 'M', to: { x: 0, y: 0 } },
        {
          type: 'C',
          control1: { x: k, y: 0 },
          control2: { x: 0.5, y: 0.5 - k },
          to: { x: 0.5, y: 0.5 },
        },
        {
          type: 'C',
          control1: { x: 0.5, y: 0.5 + k },
          control2: { x: k, y: 1 },
          to: { x: 0, y: 1 },
        },
        {
          type: 'C',
          control1: { x: -k, y: 1 },
          control2: { x: -0.5, y: 0.5 + k },
          to: { x: -0.5, y: 0.5 },
        },
        {
          type: 'C',
          control1: { x: -0.5, y: 0.5 - k },
          control2: { x: -k, y: 0 },
          to: { x: 0, y: 0 },
        },
        { type: 'Z' },
      ];
    }
    case 'polygon':
    case 'star': {
      const count = motif === 'star' ? points * 2 : points;
      return closedPolyline(
        Array.from({ length: count }, (_, index) => {
          const angle = (index * 2 * Math.PI) / count;
          const radius = motif === 'star' && index % 2 === 1 ? 0.22 : 0.5;
          return {
            x: Math.sin(angle) * radius,
            y: 0.5 - Math.cos(angle) * radius,
          };
        }),
      );
    }
  }
}
