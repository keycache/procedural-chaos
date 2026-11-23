import { createRandom } from '../../shared/random';
import type { Point } from '../../shared/geometry';
import {
  mapPath,
  type GeometryModel,
  type GeometryPath,
  type PathCommand,
} from './geometry';
import {
  createStarterRecipe,
  mandalaRecipeSchema,
  type MandalaRecipe,
} from './recipe';
import { singleStyle } from './styles';

const move = (x: number, y: number): PathCommand => ({
  type: 'M',
  to: { x, y },
});
const line = (x: number, y: number): PathCommand => ({
  type: 'L',
  to: { x, y },
});
const curve = (
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
const close: PathCommand = { type: 'Z' };

function circle(x: number, y: number, radius: number): PathCommand[] {
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

function leaf(
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

function inset(
  path: PathCommand[],
  factor: number,
  anchor: number,
): PathCommand[] {
  return mapPath(path, ({ x, y }) => ({
    x: x * factor,
    y: anchor + (y - anchor) * factor,
  }));
}

function cubic(a: Point, b: Point, c: Point, d: Point, t: number): Point {
  const u = 1 - t;
  return {
    x:
      u ** 3 * a.x + 3 * u ** 2 * t * b.x + 3 * u * t ** 2 * c.x + t ** 3 * d.x,
    y:
      u ** 3 * a.y + 3 * u ** 2 * t * b.y + 3 * u * t ** 2 * c.y + t ** 3 * d.y,
  };
}

function curl(
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

export function createBoldFloralRecipe(
  seed: string,
  complexity = 0.65,
  divisions = 8,
): MandalaRecipe {
  const recipe = createStarterRecipe(seed, 'freeform', 'rotational', divisions);
  return mandalaRecipeSchema.parse({
    ...recipe,
    style: singleStyle('traditional'),
    composition: { family: 'bold-floral', version: 1, complexity },
    global: { ...recipe.global, irregularity: 0, strokeWidth: 2.5 },
    layers: [],
  });
}

export function generateBoldFloral(recipe: MandalaRecipe): GeometryModel {
  if (!recipe.composition)
    throw new Error('Expected a bold-floral composition.');
  const { size } = recipe.canvas;
  const center = { x: size / 2, y: size / 2 };
  const order = recipe.structure.symmetryOrder;
  const sector = (2 * Math.PI) / order;
  const radius = size * 0.465;
  const random = createRandom(`${recipe.seed}:bold-floral:1`);
  const fullness = 0.93 + random() * 0.13;
  const tip = 0.965 + random() * 0.025;
  const leafTip = 0.77 + random() * 0.045;
  const bend = (random() - 0.5) * 0.035;
  const turns = 1.15 + random() * 0.2;
  const detail = recipe.composition.complexity;
  const width = (8 / order) * fullness;
  const model: GeometryModel = {
    size,
    center,
    centers: [center],
    symmetry: { order, type: 'rotational' },
    paths: [],
  };

  function add(
    layerId: string,
    name: string,
    path: PathCommand[],
    angle: number,
    role: NonNullable<GeometryPath['role']> = 'decoration',
    weight = 1,
    occludes = false,
  ) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    model.paths.push({
      id: `${layerId}-${name}`,
      layerId,
      drawOrder: model.paths.length,
      role,
      occludes,
      strokeWidth: (recipe.global.strokeWidth * weight * size) / 1000,
      d: mapPath(path, ({ x, y }) => ({
        x: center.x + radius * (x * cos + y * sin),
        y: center.y + radius * (x * sin - y * cos),
      })),
    });
  }

  // Whole crowns cross radial bands; only foreground silhouettes occlude earlier groups.
  for (let index = 0; index < order; index++) {
    const angle = (index + 0.5) * sector;
    const crown = [
      move(0, 0.24),
      curve(-0.04 * width, 0.43, -0.15 * width, 0.55, -0.19 * width, 0.7),
      curve(-0.22 * width, 0.78, -0.16 * width, 0.82, -0.17 * width, 0.87),
      curve(-0.08 * width, 0.86, -0.035 * width, 0.92, 0, tip),
      curve(0.035 * width, 0.92, 0.08 * width, 0.86, 0.17 * width, 0.87),
      curve(0.16 * width, 0.82, 0.22 * width, 0.78, 0.19 * width, 0.7),
      curve(0.15 * width, 0.55, 0.04 * width, 0.43, 0, 0.24),
      close,
    ];
    add(
      'outer-crown',
      `${index}-outline`,
      crown,
      angle,
      'region-boundary',
      1.3,
      true,
    );
    add(
      'outer-crown',
      `${index}-inset`,
      inset(crown, 0.88, 0.59),
      angle,
      'region-boundary',
      0.7,
    );
    if (detail > 0.25)
      add(
        'outer-crown',
        `${index}-inner`,
        inset(crown, 0.76, 0.59),
        angle,
        'region-boundary',
        0.6,
      );
  }

  for (let index = 0; index < order; index++) {
    const angle = index * sector;
    const crown = [
      move(0, 0.15),
      curve(-0.045 * width, 0.37, -0.09 * width, 0.5, -0.15 * width, 0.65),
      curve(-0.225 * width, 0.81, -0.12 * width, 0.9, -0.065 * width, 0.91),
      curve(-0.025 * width, 0.94, -0.012 * width, 0.985, 0, 1),
      curve(0.012 * width, 0.985, 0.025 * width, 0.94, 0.065 * width, 0.91),
      curve(0.12 * width, 0.9, 0.225 * width, 0.81, 0.15 * width, 0.65),
      curve(0.09 * width, 0.5, 0.045 * width, 0.37, 0, 0.15),
      close,
    ];
    add(
      'pointed-crown',
      `${index}-outline`,
      crown,
      angle,
      'region-boundary',
      1.4,
      true,
    );
    add(
      'pointed-crown',
      `${index}-inset`,
      inset(crown, 0.92, 0.58),
      angle,
      'region-boundary',
      0.6,
    );
    for (const side of [-1, 1]) {
      const scroll = mapPath(
        curl(0.07 * width, 0.805, 0.045 * width, 1.1),
        ({ x, y }) => ({ x: x * side, y }),
      );
      add(
        'pointed-crown',
        `${index}-head-curl-${side}`,
        scroll,
        angle,
        'decoration',
        0.9,
      );
      const beads = 3 + Math.round(detail * 5);
      for (let bead = 0; bead < beads; bead++) {
        const t = bead / (beads - 1);
        add(
          'pointed-crown',
          `${index}-bead-${side}-${bead}`,
          circle(
            side * width * (0.055 + Math.sin(t * Math.PI) * 0.07),
            0.87 - t * 0.16,
            0.0055,
          ),
          angle,
          'solid-accent',
          0,
        );
      }
    }
    add(
      'pointed-crown',
      `${index}-tip`,
      [
        move(0, 1.012),
        curve(-0.012 * width, 0.988, -0.011 * width, 0.966, 0, 0.952),
        curve(0.011 * width, 0.966, 0.012 * width, 0.988, 0, 1.012),
        close,
      ],
      angle,
      'solid-accent',
      0,
    );
  }

  for (let index = 0; index < order; index++) {
    const angle = index * sector;
    add(
      'tendrils',
      `${index}-spear`,
      [
        move(0, 0.075),
        curve(-0.012 * width, 0.25, -0.04 * width, 0.53, 0, 0.74),
        curve(0.04 * width, 0.53, 0.012 * width, 0.25, 0, 0.075),
        close,
      ],
      angle,
      'solid-accent',
      0,
    );
    for (const side of [-1, 1]) {
      const scroll = curl(0.065 * width, 0.6, 0.041 * width, turns);
      const stem = [
        move(0, 0.15),
        curve(0.025 * width, 0.3, 0.112 * width, 0.49, 0.106 * width, 0.6),
        ...scroll.slice(1),
      ];
      add(
        'tendrils',
        `${index}-scroll-${side}`,
        mapPath(stem, ({ x, y }) => ({ x: x * side, y })),
        angle,
        'decoration',
        1.2,
      );
      if (detail > 0.5) {
        const small = curl(0.048 * width, 0.66, 0.027 * width, 1.05);
        add(
          'tendrils',
          `${index}-bud-${side}`,
          mapPath(small, ({ x, y }) => ({ x: x * side, y })),
          angle,
          'decoration',
          0.75,
        );
      }
    }
  }

  for (let index = 0; index < order; index++) {
    const angle = (index + 0.5) * sector;
    const outline = leaf(0.29, leafTip, 0.175 * width, bend * width);
    const anchor = (0.29 + leafTip) / 2;
    add(
      'leaves',
      `${index}-outline`,
      outline,
      angle,
      'region-boundary',
      1.35,
      true,
    );
    add(
      'leaves',
      `${index}-border`,
      inset(outline, 0.81, anchor),
      angle,
      'region-boundary',
      0.8,
    );
    add(
      'leaves',
      `${index}-inner`,
      inset(outline, 0.61, anchor),
      angle,
      'region-boundary',
      0.8,
    );
    add(
      'leaves',
      `${index}-vein`,
      [
        move(0, 0.39),
        curve(
          0.025 * width,
          0.51,
          bend * width,
          leafTip - 0.1,
          bend * width,
          leafTip - 0.065,
        ),
      ],
      angle,
      'decoration',
      0.65,
    );
    const hatches = 8 + Math.round(detail * 16);
    for (const [part, command] of outline.entries()) {
      if (command.type !== 'C') continue;
      const start = outline[part - 1];
      if (start.type === 'Z') continue;
      for (let hatch = 1; hatch < hatches; hatch++) {
        const t = hatch / hatches;
        const a = cubic(
          start.to,
          command.control1,
          command.control2,
          command.to,
          t,
        );
        const b = { x: a.x * 0.81, y: anchor + (a.y - anchor) * 0.81 };
        add(
          'leaves',
          `${index}-hatch-${part}-${hatch}`,
          [move(a.x, a.y), line(b.x, b.y)],
          angle,
          'decoration',
          0.5,
        );
      }
    }
  }

  for (let index = 0; index < order; index++) {
    const angle = (index + 0.5) * sector;
    const petal = leaf(0.025, 0.265, 0.048 * width);
    add(
      'rosette-back',
      `${index}-outline`,
      petal,
      angle,
      'region-boundary',
      0.9,
      true,
    );
    add(
      'rosette-back',
      `${index}-inner`,
      inset(petal, 0.62, 0.13),
      angle,
      'region-boundary',
      0.5,
    );
  }
  for (let index = 0; index < order; index++) {
    const petal = leaf(0.025, 0.215, 0.043 * width);
    add(
      'rosette-front',
      `${index}-outline`,
      petal,
      index * sector,
      'region-boundary',
      0.9,
      true,
    );
    add(
      'rosette-front',
      `${index}-inner`,
      inset(petal, 0.62, 0.12),
      index * sector,
      'region-boundary',
      0.5,
    );
  }
  for (let index = 0; index < order; index++) {
    add(
      'heart-petals',
      `${index}`,
      leaf(0.018, 0.1, 0.025 * width),
      index * sector,
      'region-boundary',
      0.75,
      true,
    );
  }
  add('heart', 'outline', circle(0, 0, 0.027), 0, 'region-boundary', 1, true);
  add('heart', 'ink', circle(0, 0, 0.011), 0, 'solid-accent', 0);
  return model;
}
