import type { Point } from '../../shared/geometry';
import { createRandom } from '../../shared/random';
import { mapPath, type GeometryPath, type PathCommand } from './geometry';
import { ornamentSettingsSchema, type OrnamentSettings } from './recipe';
import {
  circle,
  createOrnamentShape,
  curl,
  curve,
  move,
  sampleContour,
  shapeFromContour,
  type OrnamentShape,
} from './ornament-shapes';

export type OrnamentPath = {
  id: string;
  d: PathCommand[];
  role: NonNullable<GeometryPath['role']>;
  weight: number;
};
export type OrnamentFit = {
  omitted: number;
  clearance: number;
  minimumFeature: number;
};
const DESIGN_RADIUS = 465;

function segmentDistance(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t =
    length === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length),
        );
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}

export function borderClearance(polygon: Point[], point: Point): number {
  let inside = false;
  let distance = Infinity;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index++
  ) {
    const a = polygon[previous];
    const b = polygon[index];
    distance = Math.min(distance, segmentDistance(point, a, b));
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside ? distance : -distance;
}

export function ornamentMetrics(
  settings: OrnamentSettings,
  strokeWidth: number,
) {
  ornamentSettingsSchema.parse(settings);
  if (!Number.isFinite(strokeWidth) || strokeWidth < 0.25 || strokeWidth > 8)
    throw new Error('Ornament stroke width must be between 0.25 and 8.');
  return {
    clearance:
      (2.5 + settings.spacing * 5.5 + (strokeWidth * 1.35) / 2) / DESIGN_RADIUS,
    minimumFeature: (2.6 + strokeWidth * 0.3) / DESIGN_RADIUS,
    spacing: (2.5 + settings.spacing * 6) / DESIGN_RADIUS,
  };
}

// The derivative bound covers the unsampled portions of each cubic, not only its vertices.
export function pathFits(
  path: PathCommand[],
  polygon: Point[],
  clearance: number,
): boolean {
  if (
    !path.length ||
    polygon.length < 3 ||
    !Number.isFinite(clearance) ||
    clearance < 0
  )
    throw new Error(
      'Ornament fitting needs a path, a usable boundary, and finite nonnegative clearance.',
    );
  const steps = 24;
  let current: Point | undefined;
  let guard = 0;
  for (const command of path) {
    if (command.type === 'M') current = command.to;
    else if (command.type === 'L') {
      if (!current) throw new Error('An ornament path must start with a move.');
      guard = Math.max(
        guard,
        Math.hypot(command.to.x - current.x, command.to.y - current.y) /
          (steps * 2),
      );
      current = command.to;
    } else if (command.type === 'C') {
      if (!current) throw new Error('An ornament path must start with a move.');
      guard = Math.max(
        guard,
        (3 *
          Math.max(
            Math.hypot(
              command.control1.x - current.x,
              command.control1.y - current.y,
            ),
            Math.hypot(
              command.control2.x - command.control1.x,
              command.control2.y - command.control1.y,
            ),
            Math.hypot(
              command.to.x - command.control2.x,
              command.to.y - command.control2.y,
            ),
          )) /
          (steps * 2),
      );
      current = command.to;
    }
  }
  return sampleContour(path, steps).every(
    (point) => borderClearance(polygon, point) >= clearance + guard,
  );
}

function scaledContour(shape: OrnamentShape, factor: number) {
  const center = shape.attachments.center;
  return mapPath(shape.contour, (point) => ({
    x: center.x + (point.x - center.x) * factor,
    y: center.y + (point.y - center.y) * factor,
  }));
}

export function createBeadedBorder(
  shape: OrnamentShape,
  factor: number,
  radius: number,
  spacing: number,
  count: number,
) {
  if (
    ![factor, radius, spacing].every(Number.isFinite) ||
    factor <= 0 ||
    factor >= 1 ||
    radius <= 0 ||
    spacing <= 0 ||
    count < 0 ||
    count > 48 ||
    !Number.isInteger(count)
  )
    throw new Error(
      'Beaded borders require positive sizes and at most 48 beads.',
    );
  const border = sampleContour(scaledContour(shape, factor));
  const lengths = border
    .slice(1)
    .map((point, index) =>
      Math.hypot(point.x - border[index].x, point.y - border[index].y),
    );
  const length = lengths.reduce((sum, value) => sum + value, 0);
  const number = Math.min(count, Math.floor(length / (radius * 2 + spacing)));
  const centers: Point[] = [];
  for (let index = 0; index < number; index++) {
    let remaining = ((index + 0.5) * length) / number;
    let segment = 0;
    while (segment < lengths.length - 1 && remaining > lengths[segment])
      remaining -= lengths[segment++];
    const a = border[segment];
    const b = border[segment + 1];
    const t = lengths[segment] === 0 ? 0 : remaining / lengths[segment];
    const center = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    if (
      centers.every(
        (point) =>
          Math.hypot(point.x - center.x, point.y - center.y) >=
          radius * 2 + spacing,
      )
    )
      centers.push(center);
  }
  return centers.map((center) => ({
    center,
    radius,
    d: circle(center.x, center.y, radius),
  }));
}

export function decorateOrnament(
  shape: OrnamentShape,
  input: OrnamentSettings,
  detail: number,
  strokeWidth: number,
  seed: string,
) {
  const settings = ornamentSettingsSchema.parse(input);
  if (!Number.isFinite(detail) || detail < 0 || detail > 1)
    throw new Error('Ornament detail must be between zero and one.');
  const metrics = ornamentMetrics(settings, strokeWidth);
  const at = (u: number, v: number) =>
    shape.at(
      shape.usableRange.from +
        u * (shape.usableRange.to - shape.usableRange.from),
      v,
    );
  const paths: OrnamentPath[] = [];
  const fit: OrnamentFit = {
    omitted: 0,
    clearance: metrics.clearance * DESIGN_RADIUS,
    minimumFeature: metrics.minimumFeature * DESIGN_RADIUS,
  };
  let attempts = 0;
  function add(
    id: string,
    d: PathCommand[],
    role: OrnamentPath['role'] = 'decoration',
    weight = 0.55,
    domain = shape,
  ) {
    if (++attempts > 256 || paths.length >= 128)
      throw new Error(
        'Ornament detail exceeds the per-shape budget. Reduce detail or increase spacing.',
      );
    const points = sampleContour(d);
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    const size =
      role === 'decoration'
        ? Math.hypot(width, height)
        : Math.min(width, height);
    const clearance =
      metrics.clearance + (strokeWidth * weight) / (DESIGN_RADIUS * 2);
    if (
      size + 1e-10 < metrics.minimumFeature ||
      !pathFits(d, domain.interior, clearance + domain.samplingError)
    ) {
      fit.omitted++;
      return false;
    }
    paths.push({ id, d, role, weight });
    return true;
  }
  let inner = shape;
  let insetFactor = 0.84 - settings.spacing * 0.14;
  for (let attempt = 0; attempt < 4; attempt++, insetFactor -= 0.08) {
    const d = scaledContour(shape, insetFactor);
    if (
      pathFits(
        d,
        shape.interior,
        metrics.clearance +
          (strokeWidth * 0.75) / (DESIGN_RADIUS * 2) +
          shape.samplingError,
      )
    ) {
      add('inset', d, 'region-boundary', 0.75);
      inner = shapeFromContour(shape.kind, d);
      break;
    }
  }
  if (inner === shape) fit.omitted++;

  const embed = (
    kind: Parameters<typeof createOrnamentShape>[0],
    u: number,
    height: number,
    across: number,
    spread: number,
  ) =>
    mapPath(createOrnamentShape(kind).contour, (point) =>
      at(u + point.y * height, across + point.x * spread),
    );
  const domain = inner;
  if (settings.treatment === 'contour') {
    if (detail > 0.25)
      add(
        'nested-lotus',
        embed('lotus-petal', 0.22, 0.57, 0, 1.25),
        'region-boundary',
        0.7,
        domain,
      );
    if (detail > 0.7)
      add(
        'nested-scallop',
        embed('scallop', 0.36, 0.31, 0, 0.65),
        'region-boundary',
        0.55,
        domain,
      );
    const beads = createBeadedBorder(
      shape,
      Math.max(0.35, insetFactor - 0.15),
      metrics.minimumFeature / 2,
      metrics.spacing,
      10 + Math.round(detail * 30),
    );
    beads.forEach((bead, index) =>
      add(`bead-${index}`, bead.d, 'solid-accent', 0),
    );
  } else if (settings.treatment === 'botanical') {
    const a = at(0.23, 0);
    const b = at(0.43, 0);
    const c = at(0.62, 0);
    const d = at(0.78, 0);
    add(
      'vein',
      [move(a.x, a.y), curve(b.x, b.y, c.x, c.y, d.x, d.y)],
      'decoration',
      0.65,
      domain,
    );
    const rows = Math.max(
      2,
      Math.min(
        3 + Math.round(detail * 2),
        Math.floor(0.5 / (0.12 + settings.spacing * 0.05)),
      ),
    );
    for (let row = 0; row < rows; row++) {
      const u = 0.28 + (row / (rows - 1)) * 0.37;
      for (const side of [-1, 1]) {
        const d = mapPath(createOrnamentShape('leaf').contour, (point) =>
          at(
            u + point.y * 0.12,
            side * (0.08 + point.y * 0.28 + point.x * 0.8),
          ),
        );
        add(`leaf-${row}-${side}`, d, 'region-boundary', 0.55, domain);
      }
    }
    if (detail > 0.5)
      add(
        'bud',
        embed('lotus-petal', 0.71, 0.17, 0, 0.6),
        'region-boundary',
        0.6,
        domain,
      );
  } else {
    const random = createRandom(`${seed}:ornament-scrolls:1`);
    const paisley = embed('paisley', 0.3, 0.42, -0.06, 1.15);
    add('paisley', paisley, 'region-boundary', 0.75, domain);
    if (detail > 0.2) {
      const scroll = mapPath(
        curl(0, 0.55, 0.12, 1.05 + random() * 0.2),
        (point) => at(0.3 + point.y * 0.42, -0.06 + point.x * 1.15),
      );
      add('curl', scroll, 'decoration', 0.65, domain);
    }
    if (detail > 0.6) {
      const beads = createBeadedBorder(
        shape,
        Math.max(0.35, insetFactor - 0.15),
        metrics.minimumFeature / 2,
        metrics.spacing * 1.4,
        12 + Math.round(detail * 14),
      );
      beads.forEach((bead, index) =>
        add(`bead-${index}`, bead.d, 'solid-accent', 0),
      );
    }
  }
  if (!paths.length)
    throw new Error(
      'This ornament has no room for readable detail. Reduce spacing or stroke width, or use fewer floral divisions.',
    );
  return { paths, fit };
}
