import type { GeometryModel, GeometryPath, PathCommand } from './geometry';
import type { Point } from '../../shared/geometry';
import type { MandalaRecipe } from './recipe';

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

export function renderSvg(
  model: GeometryModel,
  recipe?: MandalaRecipe,
): string {
  const metadata = recipe
    ? `<metadata>${escapeAttribute(
        JSON.stringify({
          recipe,
          center: model.center,
          centers: model.centers,
          symmetry: model.symmetry,
          ...(model.ornamentFit ? { ornamentFit: model.ornamentFit } : {}),
          ...(recipe.composition
            ? {
                drawingRoles: ['region-boundary', 'decoration', 'solid-accent'],
                occlusion: 'foreground-silhouette-masks',
              }
            : {}),
        }),
      )}</metadata>`
    : '';
  const pathSvg = (path: GeometryPath) =>
    `<path id="${escapeAttribute(path.id)}" data-layer="${escapeAttribute(path.layerId)}" data-draw-order="${path.drawOrder}"${path.role ? ` data-role="${path.role}"` : ''}${path.occludes ? ' data-occludes="true"' : ''}${path.role === 'solid-accent' ? ' fill="#000000" stroke="none"' : ''} d="${serializePath(path.d)}" stroke-width="${number(path.strokeWidth)}"/>`;
  let definitions = '';
  let paths: string;
  if (model.paths.some((path) => path.occludes)) {
    const groups: GeometryPath[][] = [];
    for (const path of model.paths) {
      if (groups.at(-1)?.[0].layerId !== path.layerId) groups.push([]);
      groups[groups.length - 1].push(path);
    }
    const masks: string[] = [];
    paths = groups
      .map((group, index) => {
        const foreground = groups
          .slice(index + 1)
          .flat()
          .filter((path) => path.occludes);
        if (!foreground.length) return group.map(pathSvg).join('');
        const id = `foreground-mask-${index}`;
        masks.push(
          `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${number(model.size)}" height="${number(model.size)}" style="mask-type:luminance"><rect width="${number(model.size)}" height="${number(model.size)}" fill="#ffffff"/>${foreground.map((path) => `<path d="${serializePath(path.d)}" fill="#000000" stroke="none"/>`).join('')}</mask>`,
        );
        return `<g mask="url(#${id})">${group.map(pathSvg).join('')}</g>`;
      })
      .join('');
    definitions = `<defs>${masks.join('')}</defs>`;
  } else {
    paths = model.paths.map(pathSvg).join('');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${number(model.size)} ${number(model.size)}" width="${number(model.size)}" height="${number(model.size)}">${metadata}${definitions}<g fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
}
