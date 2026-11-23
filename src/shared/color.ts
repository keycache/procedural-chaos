import { clampRgb, converter, formatHex } from 'culori';
import { clamp } from './geometry';

const toOklch = converter('oklch');

export function shadeColor(input: string, lightnessOffset: number): string {
  const color = toOklch(input);
  if (!color || !Number.isFinite(lightnessOffset)) {
    throw new Error('A valid color and finite lightness offset are required.');
  }

  return formatHex(
    clampRgb({ ...color, l: clamp(color.l + lightnessOffset, 0, 1) }),
  );
}
