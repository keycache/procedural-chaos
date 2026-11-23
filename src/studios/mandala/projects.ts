import { z } from 'zod';
import {
  mandalaRecipeSchema,
  type MandalaRecipe,
} from '../../engines/mandala/recipe';
import { openDatabase, type StoredItem } from '../../shared/storage';
import {
  editorDocumentSchema,
  editorRecipe,
  type EditorDocument,
} from './editor';

const payloadSchema = z
  .strictObject({
    document: editorDocumentSchema,
    recipe: mandalaRecipeSchema,
    svg: z.string().max(20_000_000).startsWith('<svg '),
  })
  .superRefine((payload, context) => {
    if (
      JSON.stringify(editorRecipe(payload.document)) !==
      JSON.stringify(payload.recipe)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The saved editor and recipe do not match.',
      });
    }
  });

export function readMandalaProject(item: StoredItem) {
  if (item.schemaVersion !== 1)
    throw new Error('Unsupported saved mandala version.');
  return { ...item, data: payloadSchema.parse(item.data) };
}
export type MandalaProject = ReturnType<typeof readMandalaProject>;

export async function saveMandalaProject(
  document: EditorDocument,
  recipe: MandalaRecipe,
  svg: string,
  id: string | null,
): Promise<MandalaProject> {
  const data = payloadSchema.parse({ document, recipe, svg });
  const database = await openDatabase();
  try {
    const previous = id ? await database.get('mandalas', id) : undefined;
    if (id && !previous)
      throw new Error(
        'This saved mandala no longer exists. Use Save a copy instead.',
      );
    const now = new Date().toISOString();
    const item = {
      id: id ?? crypto.randomUUID(),
      name: data.document.name,
      schemaVersion: 1,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      data,
    };
    await database.put('mandalas', item);
    return item;
  } finally {
    database.close();
  }
}
