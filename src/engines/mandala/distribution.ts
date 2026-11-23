import type { LayerRecipe } from './recipe';

export type Placement = {
  radius: number;
  angle: number;
  width: number;
  height: number;
};

export function distributeMotifs(
  layer: LayerRecipe,
  operationCount: number,
  random: () => number,
): Placement[] {
  const slots = Math.ceil(layer.count / operationCount);
  const sector = (Math.PI * 2) / operationCount;
  const spacing = sector / slots;
  const inner = layer.innerRadius;
  const outer = layer.outerRadius;
  const middle = (inner + outer) / 2;
  const thickness = outer - inner;
  const ringWidth = Math.min(
    thickness * 1.5,
    2 * inner * Math.sin(Math.min(spacing, Math.PI) / 2),
  );
  if (layer.distribution === 'ring') {
    return Array.from({ length: slots }, (_, index) => ({
      radius: middle,
      angle: (index + 0.5) * spacing + layer.rotationOffset,
      width: ringWidth * layer.motifParams.width,
      height: thickness * layer.scale,
    }));
  }
  if (layer.distribution === 'grid' || layer.distribution === 'tessellation') {
    const rows = Math.min(3, Math.max(1, Math.round(Math.sqrt(slots))));
    const minimumColumns = Math.ceil(slots / rows);
    const availableWidth = middle * Math.min(sector, Math.PI / 2);
    const cell = Math.min(
      thickness / (rows + 0.5),
      availableWidth / (minimumColumns + 1),
    );
    const columns = Math.max(minimumColumns, Math.floor(availableWidth / cell));
    const placements: Placement[] = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const stagger =
          layer.distribution === 'tessellation' && row % 2 === 1 ? 0.5 : 0;
        const x = (column - (columns - 1) / 2 + stagger) * cell;
        const y =
          middle +
          (row - (rows - 1) / 2) *
            cell *
            (layer.distribution === 'tessellation' ? Math.sqrt(3) / 2 : 1);
        const radius = Math.hypot(x, y);
        if (radius < inner + cell / 2 || radius > outer - cell / 2) continue;
        placements.push({
          radius,
          angle: sector / 2 + Math.atan2(x, y) + layer.rotationOffset,
          width: cell * layer.scale * 0.9,
          height: cell * layer.scale * 0.9,
        });
      }
    }
    return placements;
  }
  if (layer.distribution === 'branching') {
    const depth = Math.min(3, layer.recursionDepth + 1);
    const placements: Placement[] = [];
    function grow(position: number, level: number, spread: number) {
      const progress = (level + 0.5) / (depth + 1);
      placements.push({
        radius: inner + thickness * progress,
        angle: position * sector + layer.rotationOffset,
        width:
          Math.min(thickness * 0.6, middle * sector * spread) * layer.scale,
        height: (thickness / (depth + 1)) * layer.scale,
      });
      if (level < depth) {
        grow(position - spread / 2, level + 1, spread / 2);
        grow(position + spread / 2, level + 1, spread / 2);
      }
    }
    grow(0.5, 0, 0.42);
    return placements;
  }
  return Array.from({ length: slots }, (_, index) => {
    const progress = (index + 0.5) / slots;
    const spiral = layer.distribution === 'spiral';
    const radius =
      inner +
      thickness * (spiral ? 0.15 + progress * 0.7 : 0.15 + random() * 0.7);
    const angle = spiral
      ? (0.1 + ((progress * 1.61803398875) % 0.8)) * sector
      : (0.08 + random() * 0.84) * sector;
    const size =
      Math.min(
        thickness * 0.38,
        (radius * sector) / Math.max(2, Math.sqrt(slots)),
      ) * layer.scale;
    return {
      radius,
      angle: angle + layer.rotationOffset,
      width: size,
      height: size * (spiral ? 1.3 : 1),
    };
  });
}
