import type { Point } from '../../shared/geometry';
import { mapPath, type PathCommand } from './geometry';

export const move = (x: number, y: number): PathCommand => ({
  type: 'M',
  to: { x, y },
});
export const line = (x: number, y: number): PathCommand => ({
  type: 'L',
  to: { x, y },
});
export const curve = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  y: number,
): PathCommand => ({
  type: 'C',
  control1: { x: x1, y: y1 },
  control2: { x: x2, y: y2 },
  to: { x, y },
});
export const close: PathCommand = { type: 'Z' };

export function circle(x: number, y: number, radius: number): PathCommand[] {
  const k = radius * 0.5522847498307936;
  return [
    move(x, y - radius),
    curve(x + k, y - radius, x + radius, y - k, x + radius, y),
    curve(x + radius, y + k, x + k, y + radius, x, y + radius),
    curve(x - k, y + radius, x - radius, y + k, x - radius, y),
    curve(x - radius, y - k, x - k, y - radius, x, y - radius),
    close,
  ];
}

export function leaf(
  base: number,
  tip: number,
  width: number,
  bend = 0,
): PathCommand[] {
  const height = tip - base;
  return [
    move(0, base),
    curve(-width, base + height * 0.2, -width, tip - height * 0.28, bend, tip),
    curve(width, tip - height * 0.28, width, base + height * 0.2, 0, base),
    close,
  ];
}

export function inset(
  path: PathCommand[],
  factor: number,
  anchor: number,
): PathCommand[] {
  return mapPath(path, ({ x, y }) => ({
    x: x * factor,
    y: anchor + (y - anchor) * factor,
  }));
}

export function cubic(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  t: number,
): Point {
  const u = 1 - t;
  return {
    x:
      u ** 3 * a.x + 3 * u ** 2 * t * b.x + 3 * u * t ** 2 * c.x + t ** 3 * d.x,
    y:
      u ** 3 * a.y + 3 * u ** 2 * t * b.y + 3 * u * t ** 2 * c.y + t ** 3 * d.y,
  };
}

export function curl(
  x: number,
  y: number,
  radius: number,
  turns: number,
): PathCommand[] {
  const segments = 20;
  const sweep = turns * Math.PI * 2;
  function sample(t: number) {
    const r = radius * (1 - 0.95 * t);
    const angle = t * sweep;
    return {
      point: { x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) },
      tangent: {
        x: -radius * 0.95 * Math.cos(angle) - r * sweep * Math.sin(angle),
        y: -radius * 0.95 * Math.sin(angle) + r * sweep * Math.cos(angle),
      },
    };
  }
  const commands: PathCommand[] = [move(x + radius, y)];
  for (let index = 0; index < segments; index++) {
    const a = sample(index / segments);
    const b = sample((index + 1) / segments);
    const step = 1 / (segments * 3);
    commands.push(
      curve(
        a.point.x + a.tangent.x * step,
        a.point.y + a.tangent.y * step,
        b.point.x - b.tangent.x * step,
        b.point.y - b.tangent.y * step,
        b.point.x,
        b.point.y,
      ),
    );
  }
  return commands;
}

type CubicSegment = {
  from: Point;
  control1: Point;
  control2: Point;
  to: Point;
};
export type OrnamentKind = 'leaf' | 'lotus-petal' | 'paisley' | 'scallop';
export type OrnamentShape = {
  kind: OrnamentKind;
  contour: PathCommand[];
  interior: Point[];
  spine: PathCommand[];
  attachments: { base: Point; tip: Point; center: Point };
  usableRange: { from: number; to: number };
  samplingError: number;
  at: (along: number, across: number) => Point;
};

export function sampleContour(path: PathCommand[], steps = 24): Point[] {
  if (!Number.isInteger(steps) || steps < 2 || steps > 64 || path.length > 256)
    throw new Error(
      'Ornament sampling exceeds its bounded subdivision limits.',
    );
  const points: Point[] = [];
  let current: Point | undefined;
  let start: Point | undefined;
  for (const command of path) {
    if (command.type === 'Z') {
      if (start) points.push(start);
      current = start;
    } else if (command.type === 'C') {
      if (!current) throw new Error('A contour must start with a move.');
      for (let index = 1; index <= steps; index++)
        points.push(
          cubic(
            current,
            command.control1,
            command.control2,
            command.to,
            index / steps,
          ),
        );
      current = command.to;
    } else {
      if (command.type === 'L' && current)
        for (let index = 1; index < steps; index++)
          points.push(mix(current, command.to, index / steps));
      current = command.to;
      if (command.type === 'M') start = current;
      points.push(current);
    }
  }
  if (points.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y)))
    throw new Error('Ornament coordinates must be finite.');
  return points;
}

const mix = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export function shapeFromContour(
  kind: OrnamentKind,
  contour: PathCommand[],
  usableRange = { from: 0, to: 1 },
): OrnamentShape {
  if (
    !Number.isFinite(usableRange.from) ||
    !Number.isFinite(usableRange.to) ||
    usableRange.from < 0 ||
    usableRange.to > 1 ||
    usableRange.from >= usableRange.to
  )
    throw new Error(
      'An ornament usable range must stay between its base and tip.',
    );
  const start = contour[0];
  if (!start || start.type !== 'M' || contour.at(-1)?.type !== 'Z')
    throw new Error('An ornament shape needs a single closed cubic contour.');
  const segments: CubicSegment[] = [];
  let from = start.to;
  for (const command of contour.slice(1, -1)) {
    if (command.type !== 'C')
      throw new Error('Ornament sides must use cubic curves.');
    segments.push({ from, ...command });
    from = command.to;
  }
  if (
    !segments.length ||
    segments.length % 2 !== 0 ||
    Math.hypot(from.x - start.to.x, from.y - start.to.y) > 1e-10
  )
    throw new Error(
      'An ornament shape needs paired sides returning to its base.',
    );
  const left = segments.slice(0, segments.length / 2);
  const right = segments
    .slice(segments.length / 2)
    .reverse()
    .map((segment) => ({
      from: segment.to,
      control1: segment.control2,
      control2: segment.control1,
      to: segment.from,
    }));
  function sidePoint(side: CubicSegment[], along: number) {
    const index = Math.min(side.length - 1, Math.floor(along * side.length));
    const segment = side[index];
    return cubic(
      segment.from,
      segment.control1,
      segment.control2,
      segment.to,
      along * side.length - index,
    );
  }
  const at = (along: number, across: number) => {
    if (
      !Number.isFinite(along) ||
      along < 0 ||
      along > 1 ||
      !Number.isFinite(across) ||
      Math.abs(across) > 1
    )
      throw new Error(
        'Ornament-local coordinates must stay within the usable parameter domain.',
      );
    return mix(
      sidePoint(left, along),
      sidePoint(right, along),
      (across + 1) / 2,
    );
  };
  const spine = [
    move(start.to.x, start.to.y),
    ...left.map((segment, index) => {
      const a = mix(segment.control1, right[index].control1, 0.5);
      const b = mix(segment.control2, right[index].control2, 0.5);
      const tip = mix(segment.to, right[index].to, 0.5);
      return curve(a.x, a.y, b.x, b.y, tip.x, tip.y);
    }),
  ];
  return {
    kind,
    contour,
    interior: sampleContour(contour),
    spine,
    at,
    usableRange,
    samplingError:
      Math.max(
        ...segments.map(
          (segment) =>
            6 *
            Math.max(
              Math.hypot(
                segment.control2.x - 2 * segment.control1.x + segment.from.x,
                segment.control2.y - 2 * segment.control1.y + segment.from.y,
              ),
              Math.hypot(
                segment.to.x - 2 * segment.control2.x + segment.control1.x,
                segment.to.y - 2 * segment.control2.y + segment.control1.y,
              ),
            ),
        ),
      ) /
      (8 * 24 ** 2),
    attachments: { base: at(0, 0), tip: at(1, 0), center: at(0.5, 0) },
  };
}

export function createOrnamentShape(
  kind: OrnamentKind,
  {
    base = 0,
    tip = 1,
    width = 0.25,
    bend = 0,
  }: { base?: number; tip?: number; width?: number; bend?: number } = {},
): OrnamentShape {
  if (
    ![base, tip, width, bend].every(Number.isFinite) ||
    tip <= base ||
    width <= 0 ||
    Math.abs(bend) > width * 2
  )
    throw new Error(
      'Use finite ornament dimensions, a positive height/width, and a bounded bend.',
    );
  const height = tip - base;
  let contour: PathCommand[];
  switch (kind) {
    case 'leaf':
      contour = leaf(base, tip, width, bend);
      break;
    case 'lotus-petal':
      contour = [
        move(0, base),
        curve(
          -width * 1.15,
          base + height * 0.08,
          -width * 1.25,
          base + height * 0.78,
          bend,
          tip,
        ),
        curve(
          width * 1.25,
          base + height * 0.78,
          width * 1.15,
          base + height * 0.08,
          0,
          base,
        ),
        close,
      ];
      break;
    case 'paisley':
      contour = [
        move(0, base),
        curve(
          -width * 1.2,
          base + height * 0.12,
          -width,
          tip + height * 0.06,
          bend + width * 0.6,
          tip,
        ),
        curve(
          bend + width * 1.6,
          tip - height * 0.16,
          width * 1.3,
          base + height * 0.15,
          0,
          base,
        ),
        close,
      ];
      break;
    case 'scallop':
      contour = [
        move(0, base),
        curve(-width * 1.3, base + height * 0.2, -width * 1.1, tip, bend, tip),
        curve(width * 1.1, tip, width * 1.3, base + height * 0.2, 0, base),
        close,
      ];
      break;
  }
  return shapeFromContour(kind, contour);
}
