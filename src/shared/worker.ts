import { releaseProxy, wrap } from 'comlink';
import { seedSchema } from './schemas';
import type { FoundationWorker, WorkerSample } from './sample';

export async function runWorkerSample(seed: string): Promise<WorkerSample> {
  const validatedSeed = seedSchema.parse(seed);
  const worker = new Worker(
    new URL('../workers/foundation.worker.ts', import.meta.url),
    { type: 'module' },
  );
  const api = wrap<FoundationWorker>(worker);
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await new Promise<WorkerSample>((resolve, reject) => {
      timeout = setTimeout(
        () =>
          reject(new Error('The worker did not respond within 10 seconds.')),
        10_000,
      );
      worker.addEventListener(
        'error',
        (event) => reject(new Error(event.message || 'The worker failed.')),
        { once: true },
      );
      worker.addEventListener(
        'messageerror',
        () => reject(new Error('The worker returned an unreadable message.')),
        { once: true },
      );
      api.sample(validatedSeed).then(resolve, reject);
    });
  } finally {
    clearTimeout(timeout);
    api[releaseProxy]();
    worker.terminate();
  }
}
