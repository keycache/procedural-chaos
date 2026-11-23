import { closedPolyline, type PathCommand } from './geometry';
import type { MotifId } from './recipe';

const KAPPA = 0.5522847498307936;

export function createMotif(
  motif: MotifId,
  curvature: number,
  points: number,
): PathCommand[] {
  switch (motif) {
    case 'leaf':
      return [
        { type: 'M', to: { x: 0, y: 0 } },
        {
          type: 'C',
          control1: { x: -0.65 * curvature, y: 0.25 },
          control2: { x: -0.5, y: 0.7 },
          to: { x: 0, y: 1 },
        },
        {
          type: 'C',
          control1: { x: 0.5, y: 0.7 },
          control2: { x: 0.65 * curvature, y: 0.25 },
          to: { x: 0, y: 0 },
        },
        { type: 'Z' },
      ];
    case 'spiral': {
      const turns = 1.65;
      const outline = Array.from({ length: 65 }, (_, index) => {
        const t = index / 64;
        const angle = t * Math.PI * 2 * turns;
        const radius = 0.04 + t * 0.43;
        return {
          x: Math.cos(angle) * radius,
          y: 0.5 + Math.sin(angle) * radius,
        };
      });
      const inner = Array.from({ length: 65 }, (_, index) => {
        const t = (64 - index) / 64;
        const angle = t * Math.PI * 2 * turns;
        const radius = Math.max(0.012, 0.04 + t * 0.43 - 0.025);
        return {
          x: Math.cos(angle) * radius,
          y: 0.5 + Math.sin(angle) * radius,
        };
      });
      return closedPolyline([...outline, ...inner]);
    }
    case 'branch': {
      const trunk = closedPolyline([
        { x: -0.018, y: 0 },
        { x: 0.018, y: 0 },
        { x: 0.008, y: 1 },
        { x: -0.008, y: 1 },
      ]);
      const leaves = [0.2, 0.4, 0.6, 0.8].flatMap((height, index) =>
        [-1, 1].flatMap((side): PathCommand[] => [
          { type: 'M', to: { x: 0, y: height - 0.08 } },
          {
            type: 'C',
            control1: { x: side * 0.2, y: height - 0.09 },
            control2: { x: side * (0.4 - index * 0.04), y: height },
            to: { x: side * (0.38 - index * 0.05), y: height + 0.12 },
          },
          {
            type: 'C',
            control1: { x: side * 0.12, y: height + 0.15 },
            control2: { x: side * 0.03, y: height + 0.02 },
            to: { x: 0, y: height - 0.08 },
          },
          { type: 'Z' },
        ]),
      );
      return [...trunk, ...leaves];
    }
    case 'interlocking':
      return [0.3, 0.7].flatMap((centerY) =>
        closedPolyline([
          { x: 0, y: centerY - 0.3 },
          { x: 0.45, y: centerY },
          { x: 0, y: centerY + 0.3 },
          { x: -0.45, y: centerY },
        ]),
      );
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
