export type Point = { x: number; y: number };

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function rotatePoint(
  point: Point,
  angle: number,
  center: Point = { x: 0, y: 0 },
): Point {
  const x = point.x - center.x;
  const y = point.y - center.y;
  return {
    x: center.x + x * Math.cos(angle) - y * Math.sin(angle),
    y: center.y + x * Math.sin(angle) + y * Math.cos(angle),
  };
}

export function reflectPoint(point: Point, axisX: number): Point {
  return { x: 2 * axisX - point.x, y: point.y };
}
