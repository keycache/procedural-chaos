import type { Point } from '../../shared/geometry';
import { createRandom } from '../../shared/random';
import { mapPath, type PathCommand } from './geometry';
import {
  borderClearance,
  ornamentMetrics,
  pathFits,
  pathTravelGuard,
  type OrnamentPath,
} from './ornament-decoration';
import {
  circle,
  close,
  createOrnamentShape,
  cubic,
  curve,
  leaf,
  move,
  sampleContour,
  shapeFromContour,
} from './ornament-shapes';
import { createPetalComposition } from './petal-composition';
import {
  createStarterRecipe,
  defaultSwirlSettings,
  mandalaRecipeSchema,
  type MandalaRecipe,
  type SwirlSettings,
} from './recipe';
import { singleStyle } from './styles';

export function createSwirlingPaisleyRecipe(
  seed: string,
  complexity = 0.7,
  divisions = 8,
  swirl: SwirlSettings = defaultSwirlSettings,
): MandalaRecipe {
  const recipe = createStarterRecipe(seed, 'freeform', 'rotational', divisions);
  return mandalaRecipeSchema.parse({
    ...recipe,
    style: singleStyle('traditional'),
    composition: { family: 'swirling-paisley', version: 1, complexity, swirl },
    global: { ...recipe.global, irregularity: 0, strokeWidth: 2.5 },
    layers: [],
  });
}

function trace(at: (t: number) => Point, steps = 8): PathCommand[] {
  const commands: PathCommand[] = [];
  function tangent(t: number) {
    const a = Math.max(0, t - 0.00001);
    const b = Math.min(1, t + 0.00001);
    const p = at(a);
    const q = at(b);
    return { x: (q.x - p.x) / (b - a), y: (q.y - p.y) / (b - a) };
  }
  for (let index = 0; index < steps; index++) {
    const a = at(index / steps);
    const b = at((index + 1) / steps);
    const da = tangent(index / steps);
    const db = tangent((index + 1) / steps);
    commands.push(
      curve(
        a.x + da.x / (steps * 3),
        a.y + da.y / (steps * 3),
        b.x - db.x / (steps * 3),
        b.y - db.y / (steps * 3),
        b.x,
        b.y,
      ),
    );
  }
  return commands;
}

function follow(
  path: PathCommand[],
  warp: (point: Point) => Point,
): PathCommand[] {
  const result: PathCommand[] = [];
  let current: Point | undefined;
  for (const command of path) {
    if (command.type === 'Z') result.push(close);
    else if (command.type === 'M') {
      current = command.to;
      const p = warp(current);
      result.push(move(p.x, p.y));
    } else if (command.type === 'C' && current) {
      const from = current;
      result.push(
        ...trace(
          (t) =>
            warp(
              cubic(from, command.control1, command.control2, command.to, t),
            ),
          4,
        ),
      );
      current = command.to;
    } else
      throw new Error(
        'Swirling ornament contours require cubic sides and an initial move.',
      );
  }
  return result;
}

export function generateSwirlingPaisley(recipe: MandalaRecipe) {
  if (recipe.composition?.family !== 'swirling-paisley')
    throw new Error('Expected a swirling-paisley composition.');
  const { model, add } = createPetalComposition(recipe);
  const { complexity: detail, swirl } = recipe.composition;
  const order = recipe.structure.symmetryOrder;
  const sector = (Math.PI * 2) / order;
  const direction = swirl.direction === 'clockwise' ? 1 : -1;
  const random = createRandom(`${recipe.seed}:swirling-paisley:1`);
  const fullness = 0.96 + random() * 0.06;
  const reach = 0.76 + random() * 0.025;
  const field = (point: Point, offset = 0): Point => {
    const radius = 0.17 + point.y * reach;
    const angle =
      direction *
      sector *
      (swirl.strength * 1.55 * (1 - point.y) +
        point.x * 1.3 * fullness +
        offset);
    return { x: radius * Math.sin(angle), y: radius * Math.cos(angle) };
  };
  const shape = shapeFromContour(
    'paisley',
    follow(createOrnamentShape('paisley', { width: 0.27 }).contour, field),
  );
  const metrics = ornamentMetrics(
    { version: 1, treatment: 'paisley', spacing: 0.2 },
    recipe.global.strokeWidth,
  );
  const ornaments: OrnamentPath[] = [];
  let omitted = 0;
  let attempts = 0;
  function fit(
    id: string,
    d: PathCommand[],
    role: OrnamentPath['role'] = 'region-boundary',
    weight = 0.6,
    domain = shape,
  ) {
    if (++attempts > 160 || ornaments.length >= 100)
      throw new Error(
        'Swirling paisley exceeds its fitting budget. Reduce complexity or divisions.',
      );
    const points = sampleContour(d);
    const width =
      Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));
    const height =
      Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));
    const size =
      role === 'decoration'
        ? Math.hypot(width, height)
        : Math.min(width, height);
    if (
      size < metrics.minimumFeature ||
      !pathFits(
        d,
        domain.interior,
        metrics.clearance +
          (recipe.global.strokeWidth * weight) / 930 +
          domain.samplingError,
      )
    ) {
      omitted++;
      return false;
    }
    ornaments.push({ id, d, role, weight });
    return true;
  }
  function nested(from: number, to: number, width: number) {
    const side = (sign: number, t: number) =>
      shape.at(from + (to - from) * t, sign * width * Math.sin(Math.PI * t));
    const start = side(-1, 0);
    return [
      move(start.x, start.y),
      ...trace((t) => side(-1, t)),
      ...trace((t) => side(1, 1 - t)),
      close,
    ];
  }
  let interior = shape;
  if (detail > 0.1) {
    const d = nested(0.13, 0.94, 0.91);
    if (fit('flowing-inset', d, 'region-boundary', 0.8))
      interior = shapeFromContour('paisley', d);
  }
  if (detail > 0.28) {
    const start = shape.at(0.3, 0);
    fit(
      'curved-spine',
      [move(start.x, start.y), ...trace((t) => shape.at(0.3 + t * 0.46, 0))],
      'decoration',
      0.65,
      interior,
    );
    const rows = detail > 0.72 ? 5 : 3;
    for (let row = 0; row < rows; row++) {
      const u = 0.33 + (row / (rows - 1)) * 0.27;
      for (const side of [-1, 1]) {
        const base = shape.at(u, side * 0.04);
        const tip = shape.at(u + 0.1, side * 0.58);
        const dx = tip.x - base.x;
        const dy = tip.y - base.y;
        const length = Math.hypot(dx, dy);
        if (length < metrics.minimumFeature) {
          omitted++;
          continue;
        }
        const width = Math.min(length * 0.55, 0.055);
        const embed = (point: Point) => ({
          x:
            base.x + dx * point.y - direction * (dy / length) * point.x * width,
          y:
            base.y + dy * point.y + direction * (dx / length) * point.x * width,
        });
        const frond = mapPath(
          createOrnamentShape('leaf', { width: 0.4 }).contour,
          embed,
        );
        if (
          fit(
            `feather-${row}-${side}`,
            frond,
            'region-boundary',
            0.6,
            interior,
          ) &&
          detail > 0.82
        ) {
          const a = embed({ x: 0, y: 0.2 });
          fit(
            `feather-vein-${row}-${side}`,
            [
              move(a.x, a.y),
              ...trace((t) => embed({ x: 0, y: 0.2 + t * 0.6 }), 4),
            ],
            'decoration',
            0.4,
            interior,
          );
        }
      }
    }
  }
  if (detail > 0.58) {
    for (const [index, u] of [0.24, 0.78].entries()) {
      const d = follow(
        createOrnamentShape('paisley', { width: 0.22 }).contour,
        (p) => shape.at(u + p.y * 0.12, p.x * 0.8),
      );
      fit(`nested-teardrop-${index}`, d, 'region-boundary', 0.7, interior);
    }
  }
  if (detail > 0.82) {
    for (let index = 0; index < 12; index++) {
      const u = 0.33 + (index / 11) * 0.36;
      const d = follow(circle(0, 0, 1), (p) =>
        shape.at(u + p.y * 0.011, -0.75 + p.x * 0.12),
      );
      fit(`scalloped-border-${index}`, d, 'region-boundary', 0.45);
    }
  }
  // Background ink is separate from foreground masks, so exports retain transparent white space.
  const backing = follow(leaf(0.12, 0.89, 0.045), (p) =>
    field({ x: p.x, y: p.y }, 0.53),
  );
  for (let index = 0; index < order; index++)
    add(
      'paisley-ink-pockets',
      `${index}-ribbon`,
      backing,
      index * sector,
      'solid-accent',
      0,
    );
  for (let index = 0; index < order; index++) {
    add(
      'paisley-wings',
      `${index}-outline`,
      shape.contour,
      index * sector,
      'region-boundary',
      1.3,
      true,
    );
    for (const path of ornaments)
      add(
        'paisley-wings',
        `${index}-${path.id}`,
        path.d,
        index * sector,
        path.role,
        path.weight,
      );
  }
  const rotatedContours = (contour: PathCommand[]) =>
    Array.from({ length: order }, (_, turn) =>
      sampleContour(
        mapPath(contour, (p) => ({
          x: p.x * Math.cos(turn * sector) + p.y * Math.sin(turn * sector),
          y: -p.x * Math.sin(turn * sector) + p.y * Math.cos(turn * sector),
        })),
      ),
    );
  const obstacles = rotatedContours(shape.contour);
  const pockets: ReturnType<typeof shapeFromContour>[] = [];
  const packedPockets: { polygon: Point[]; samplingError: number }[] = [];
  const pocketHalfStroke = (recipe.global.strokeWidth * 0.75) / 930;
  if (detail > 0.45) {
    for (let attempt = 0; attempt < 18; attempt++) {
      const u = 0.23 + Math.floor(attempt / 3) * 0.105;
      const offset = 0.46 + (attempt % 3) * 0.065;
      const d = follow(
        createOrnamentShape('paisley', { width: 0.2 }).contour,
        (p) => field({ x: p.x * 0.21, y: u + p.y * 0.085 }, offset),
      );
      const pocket = shapeFromContour('paisley', d);
      const points = pocket.interior;
      const gap =
        metrics.clearance +
        pocketHalfStroke +
        shape.samplingError +
        pathTravelGuard(d, 24);
      if (
        points.every((point) =>
          obstacles.every((polygon) => borderClearance(polygon, point) < -gap),
        ) &&
        points.every((point) =>
          packedPockets.every(
            (other) =>
              borderClearance(other.polygon, point) <
              -gap - pocketHalfStroke - other.samplingError,
          ),
        ) &&
        packedPockets.every((other) =>
          other.polygon.every(
            (point) =>
              borderClearance(points, point) <
              -gap - pocketHalfStroke - pocket.samplingError,
          ),
        ) &&
        Math.min(
          Math.max(...points.map((p) => p.x)) -
            Math.min(...points.map((p) => p.x)),
          Math.max(...points.map((p) => p.y)) -
            Math.min(...points.map((p) => p.y)),
        ) >= metrics.minimumFeature
      ) {
        pockets.push(pocket);
        packedPockets.push(
          ...rotatedContours(pocket.contour).map((polygon) => ({
            polygon,
            samplingError: pocket.samplingError,
          })),
        );
      } else omitted++;
      if (pockets.length >= (detail > 0.8 ? 4 : 2)) break;
    }
  }
  pockets.forEach((pocket, pocketIndex) => {
    for (let index = 0; index < order; index++)
      add(
        'paisley-pocket-jewels',
        `${index}-${pocketIndex}`,
        pocket.contour,
        index * sector,
        'region-boundary',
        0.75,
        true,
      );
  });
  add(
    'paisley-heart',
    'outline',
    circle(0, 0, 0.145),
    0,
    'region-boundary',
    1,
    true,
  );
  for (let index = 0; index < order; index++) {
    const d = follow(leaf(0, 1, 0.17), (p) => {
      const radius = 0.035 + p.y * 0.092;
      const angle = direction * sector * (0.8 * (1 - p.y) + p.x);
      return { x: radius * Math.sin(angle), y: radius * Math.cos(angle) };
    });
    add(
      'paisley-heart',
      `${index}-curl`,
      d,
      index * sector,
      detail > 0.7 ? 'solid-accent' : 'region-boundary',
      0.75,
    );
  }
  model.ornamentFit = {
    omitted: omitted * order,
    clearance: metrics.clearance * 465,
    minimumFeature: metrics.minimumFeature * 465,
  };
  return model;
}
