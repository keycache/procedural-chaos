import type { Point } from '../../shared/geometry';
import { mapPath, type PathCommand } from './geometry';
import {
  borderClearance,
  createBeadedBorder,
  ornamentMetrics,
  pathTravelGuard,
  type OrnamentFit,
  type OrnamentPath,
} from './ornament-decoration';
import {
  createOrnamentShape,
  curve,
  leaf,
  line,
  move,
  sampleContour,
  shapeFromContour,
  type OrnamentShape,
} from './ornament-shapes';

type Boundary = Pick<OrnamentShape, 'interior' | 'samplingError'>;

function bounds(points: Point[]) {
  return {
    left: Math.min(...points.map((p) => p.x)),
    right: Math.max(...points.map((p) => p.x)),
    bottom: Math.min(...points.map((p) => p.y)),
    top: Math.max(...points.map((p) => p.y)),
  };
}

export function decorateExposedLotus(
  shape: OrnamentShape,
  covered: Boundary[],
  detail: number,
  strokeWidth: number,
  spacing: number,
) {
  if (!Number.isFinite(detail) || detail < 0 || detail > 1)
    throw new Error('Lotus detail must be between zero and one.');
  const metrics = ornamentMetrics(
    { version: 1, treatment: 'botanical', spacing },
    strokeWidth,
  );
  const paths: OrnamentPath[] = [];
  const fit: OrnamentFit = {
    omitted: 0,
    clearance: metrics.clearance * 465,
    minimumFeature: metrics.minimumFeature * 465,
  };
  if (detail <= 0.1) return { paths, fit };
  const parentBounds = bounds(shape.interior);
  const obstacles = covered
    .map((boundary) => ({ ...boundary, bounds: bounds(boundary.interior) }))
    .filter(
      ({ bounds: b, samplingError }) =>
        b.right + samplingError >= parentBounds.left &&
        b.left - samplingError <= parentBounds.right &&
        b.top + samplingError >= parentBounds.bottom &&
        b.bottom - samplingError <= parentBounds.top,
    );
  function exposed(point: Point, gap: number) {
    return (
      borderClearance(shape.interior, point) >= gap + shape.samplingError &&
      obstacles.every(
        ({ interior, samplingError, bounds: b }) =>
          point.x < b.left - gap - samplingError ||
          point.x > b.right + gap + samplingError ||
          point.y < b.bottom - gap - samplingError ||
          point.y > b.top + gap + samplingError ||
          borderClearance(interior, point) <= -gap - samplingError,
      )
    );
  }
  let attempts = 0;
  function add(
    id: string,
    d: PathCommand[],
    role: OrnamentPath['role'] = 'region-boundary',
    weight = 0.6,
    domain?: OrnamentShape,
    neighbors: OrnamentShape[] = [],
  ) {
    if (++attempts > 160 || paths.length >= 100)
      throw new Error(
        'Lotus ornament exceeds its fitting budget. Reduce complexity or divisions.',
      );
    const points = sampleContour(d, 64);
    const b = bounds(points);
    const size =
      role === 'decoration'
        ? Math.hypot(b.right - b.left, b.top - b.bottom)
        : Math.min(b.right - b.left, b.top - b.bottom);
    const travel = pathTravelGuard(d, 64);
    const gap = metrics.clearance + (strokeWidth * weight) / 930 + travel;
    if (
      size + 1e-10 < metrics.minimumFeature ||
      !points.every(
        (point) =>
          exposed(point, gap) &&
          (!domain ||
            borderClearance(domain.interior, point) >=
              (strokeWidth * (weight + 0.75)) / 930 +
                domain.samplingError +
                travel) &&
          neighbors.every(
            (other) =>
              borderClearance(other.interior, point) <=
              -metrics.spacing -
                (strokeWidth * weight) / 465 -
                travel -
                other.samplingError,
          ),
      )
    ) {
      fit.omitted++;
      return false;
    }
    paths.push({ id, d, role, weight });
    return true;
  }

  // Find a usable exposed spine interval before proposing any ornament.
  let start = 0,
    bestStart = 0,
    bestEnd = 0;
  for (let index = 0; index <= 32; index++) {
    const u = 0.04 + index * 0.028;
    if (exposed(shape.at(u, 0), metrics.clearance * 1.5)) {
      if (index - start > bestEnd - bestStart) {
        bestStart = start;
        bestEnd = index;
      }
    } else start = index + 1;
  }
  if (bestEnd - bestStart < 3) {
    fit.omitted++;
    return { paths, fit };
  }
  const from = 0.04 + bestStart * 0.028;
  const to = 0.04 + bestEnd * 0.028;
  const span = to - from;
  const at = (u: number, v = 0) => shape.at(from + span * u, v);
  const embed = (u: number, height: number, width: number) =>
    mapPath(
      createOrnamentShape(
        shape.kind === 'scallop' ? 'scallop' : 'lotus-petal',
        { width },
      ).contour,
      (p) => at(u + p.y * height, p.x),
    );
  let scaffold: OrnamentShape | undefined;
  for (const width of [0.65, 0.5, 0.35]) {
    const d = embed(0, 1, width);
    if (add('exposed-contour', d, 'region-boundary', 0.75)) {
      scaffold = shapeFromContour(shape.kind, d);
      break;
    }
  }

  // Large nested jewels get their own tip zone, separate from the botanical spray.
  if (detail > 0.65)
    for (const [index, width] of [0.5, 0.32, 0.18].entries())
      add(
        `nested-jewel-${index}`,
        embed(0.64 + index * 0.025, 0.3 - index * 0.05, width),
        'region-boundary',
        0.6,
        scaffold,
      );

  if (detail > 0.25) {
    const a = at(0.08),
      b = at(0.25),
      c = at(0.43),
      d = at(0.59);
    add(
      'botanical-spine',
      [move(a.x, a.y), curve(b.x, b.y, c.x, c.y, d.x, d.y)],
      'decoration',
      0.7,
      scaffold,
    );
    const rows = detail > 0.75 ? 6 : 3;
    const foliage: Record<number, OrnamentShape[]> = { [-1]: [], [1]: [] };
    for (let row = 0; row < rows; row++) {
      const u = 0.13 + (row / (rows - 1)) * 0.34;
      for (const side of [-1, 1]) {
        const base = at(u);
        const tip = at(u + 0.12, side * 0.43);
        const dx = tip.x - base.x,
          dy = tip.y - base.y;
        const length = Math.hypot(dx, dy);
        const width = Math.min(
          length * 0.2,
          Math.hypot(at(u, 0.5).x - base.x, at(u, 0.5).y - base.y) * 0.4,
        );
        if (width * 1.5 < metrics.minimumFeature) {
          fit.omitted++;
          continue;
        }
        const frond = mapPath(leaf(0, length, width), (p) => ({
          x: base.x + (dy * p.x + dx * p.y) / length,
          y: base.y + (-dx * p.x + dy * p.y) / length,
        }));
        if (
          add(
            `botanical-leaf-${row}-${side}`,
            frond,
            'region-boundary',
            0.6,
            scaffold,
            foliage[side],
          )
        ) {
          foliage[side].push(shapeFromContour('leaf', frond));
          if (detail <= 0.75) continue;
          const p = { x: base.x + dx * 0.2, y: base.y + dy * 0.2 };
          const q = { x: base.x + dx * 0.8, y: base.y + dy * 0.8 };
          add(
            `leaf-vein-${row}-${side}`,
            [move(p.x, p.y), line(q.x, q.y)],
            'decoration',
            0.4,
            scaffold,
          );
        }
      }
    }
  }
  if (detail > 0.85 && scaffold)
    createBeadedBorder(
      scaffold,
      0.8,
      metrics.minimumFeature / 2,
      metrics.spacing,
      24,
    ).forEach((bead, index) =>
      add(`border-bead-${index}`, bead.d, 'solid-accent', 0, scaffold),
    );
  return { paths, fit };
}
