import { createRandom } from './random';
import { seedSchema } from './schemas';

export function createSeededSample(seed: string) {
  const validatedSeed = seedSchema.parse(seed);
  const random = createRandom(validatedSeed);
  return {
    seed: validatedSeed,
    values: Array.from({ length: 6 }, () => Math.floor(random() * 1000)),
  };
}

export type WorkerSample = ReturnType<typeof createSeededSample>;
export type FoundationWorker = { sample: typeof createSeededSample };
