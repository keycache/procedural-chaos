import { z } from 'zod';

export const seedSchema = z
  .string()
  .trim()
  .min(1, 'Enter a seed before running the test.')
  .max(128, 'Seeds must be 128 characters or fewer.');

export function createRecipeSchema<T extends z.ZodType>(parameters: T) {
  return z.object({
    schemaVersion: z.literal(1),
    engineVersion: z.string().min(1),
    seed: seedSchema,
    parameters,
  });
}
