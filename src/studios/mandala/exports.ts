import { z } from 'zod';
import {
  mandalaRecipeSchema,
  type MandalaRecipe,
} from '../../engines/mandala/recipe';

export type ExportBackground = 'white' | 'transparent';

export function exportSvg(svg: string, background: ExportBackground): string {
  if (!svg.startsWith('<svg '))
    throw new Error('Expected generated SVG artwork.');
  if (background === 'transparent') return svg;
  const end = svg.indexOf('>') + 1;
  return (
    svg.slice(0, end) +
    '<rect width="100%" height="100%" fill="#ffffff"/>' +
    svg.slice(end)
  );
}

export function exportRecipe(recipe: MandalaRecipe): string {
  return JSON.stringify(mandalaRecipeSchema.parse(recipe), null, 2);
}

export function exportFilename(
  name: string,
  extension: 'svg' | 'png' | 'json',
) {
  const base = name
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'mandala'}.${extension}`;
}

export async function exportPng(
  svg: string,
  size: number,
  background: ExportBackground,
): Promise<Blob> {
  z.number().int().min(1024).max(8192).parse(size);
  const url = URL.createObjectURL(
    new Blob([exportSvg(svg, background)], { type: 'image/svg+xml' }),
  );
  const canvas = document.createElement('canvas');
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error('A Canvas 2D context is required for PNG export.');
    context.drawImage(image, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(
                new Error(
                  'Could not encode the PNG. Try a smaller resolution.',
                ),
              ),
        'image/png',
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 1;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
