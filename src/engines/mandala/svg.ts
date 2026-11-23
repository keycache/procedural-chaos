import type { GeometryModel, PathCommand } from './geometry';
import type { Point } from '../../shared/geometry';

function number(value: number): string {
  if (!Number.isFinite(value))
    throw new Error('SVG coordinates must be finite.');
  return String(Number(value.toFixed(6)));
}

function point(value: Point): string {
  return `${number(value.x)} ${number(value.y)}`;
}

function escapeAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&apos;';
    }
  });
}

export function serializePath(commands: PathCommand[]): string {
  return commands
    .map((command) => {
      switch (command.type) {
        case 'Z':
          return 'Z';
        case 'C':
          return `C${point(command.control1)} ${point(command.control2)} ${point(command.to)}`;
        default:
          return `${command.type}${point(command.to)}`;
      }
    })
    .join(' ');
}

export function renderSvg(model: GeometryModel): string {
  const paths = model.paths
    .map(
      (path) =>
        `<path id="${escapeAttribute(path.id)}" data-layer="${escapeAttribute(path.layerId)}" data-draw-order="${path.drawOrder}" d="${serializePath(path.d)}" stroke-width="${number(path.strokeWidth)}"/>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${number(model.size)} ${number(model.size)}" width="${number(model.size)}" height="${number(model.size)}"><g fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
}
