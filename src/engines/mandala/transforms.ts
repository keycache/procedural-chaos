import { mapPath, type PathCommand } from './geometry';
import type { LayerRecipe } from './recipe';

export function transformMotif(
  path: PathCommand[],
  layer: LayerRecipe,
  random: () => number,
  depth: number,
): PathCommand[] {
  const scale = layer.scaling ** depth;
  const phaseX = random() * Math.PI * 2;
  const phaseY = random() * Math.PI * 2;
  const twist = layer.twist * depth * 0.35;
  return mapPath(path, (point) => {
    let x = point.x * scale;
    let y = (point.y - 0.5) * scale;
    const rotatedX = x * Math.cos(twist) - y * Math.sin(twist);
    y = x * Math.sin(twist) + y * Math.cos(twist);
    x = rotatedX;
    // Smooth displacement depends on position, so coincident endpoints stay coincident.
    const bend = layer.distortion * 0.12 * Math.sin(Math.PI * (y + 0.5));
    const dx = layer.noise * 0.035 * Math.sin(y * 6 + phaseX);
    const dy = layer.noise * 0.035 * Math.sin(x * 6 + phaseY);
    return { x: x + bend + dx, y: y + 0.5 + dy };
  });
}

export function closeContours(
  path: PathCommand[],
  tolerance = 0.000001,
): PathCommand[] {
  const result: PathCommand[] = [];
  let start: { x: number; y: number } | undefined;
  let last: { x: number; y: number } | undefined;
  function close() {
    if (!start) return;
    if (last && Math.hypot(start.x - last.x, start.y - last.y) <= tolerance) {
      const command = result[result.length - 1];
      if (command.type !== 'Z')
        result[result.length - 1] = { ...command, to: { ...start } };
    }
    result.push({ type: 'Z' });
    start = undefined;
    last = undefined;
  }
  for (const command of path) {
    if (command.type === 'M') {
      close();
      start = command.to;
    } else if (!start) {
      throw new Error('Contours must begin with a move command.');
    }
    if (command.type === 'Z') {
      close();
    } else {
      const points =
        command.type === 'C'
          ? [command.control1, command.control2, command.to]
          : [command.to];
      if (
        points.some(
          (point) => !Number.isFinite(point.x) || !Number.isFinite(point.y),
        )
      ) {
        throw new Error('Contours must have finite coordinates.');
      }
      result.push(command);
      last = command.to;
    }
  }
  close();
  return result;
}
