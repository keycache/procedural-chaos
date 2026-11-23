import { releaseProxy, wrap, type Remote } from 'comlink';
import { seedSchema } from './schemas';
import type { FoundationWorker, WorkerSample } from './sample';
import type { MandalaRecipe } from '../engines/mandala/recipe';
import type { MandalaPreview, MandalaWorker } from '../engines/mandala/render';

async function workerRequest<Api, Result>(
  worker: Worker,
  invoke: (api: Remote<Api>) => Promise<Result>,
  signal?: AbortSignal,
  timeoutMs = 15_000,
): Promise<Result> {
  const api = wrap<Api>(worker);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  const onError = (event: ErrorEvent) =>
    fail(new Error(event.message || 'The worker failed.'));
  const onMessageError = () =>
    fail(new Error('The worker returned an unreadable message.'));
  let fail: (error: Error) => void;
  try {
    return await new Promise<Result>((resolve, reject) => {
      fail = reject;
      abort = () =>
        reject(new DOMException('Generation cancelled.', 'AbortError'));
      worker.addEventListener('error', onError);
      worker.addEventListener('messageerror', onMessageError);
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) {
        abort();
        return;
      }
      timeout = setTimeout(
        () =>
          reject(
            new Error(
              `The worker did not respond within ${timeoutMs / 1000} seconds.`,
            ),
          ),
        timeoutMs,
      );
      invoke(api).then(resolve, reject);
    });
  } finally {
    clearTimeout(timeout);
    if (abort) signal?.removeEventListener('abort', abort);
    worker.removeEventListener('error', onError);
    worker.removeEventListener('messageerror', onMessageError);
    api[releaseProxy]();
    worker.terminate();
  }
}

export async function runWorkerSample(seed: string): Promise<WorkerSample> {
  const validatedSeed = seedSchema.parse(seed);
  return workerRequest<FoundationWorker, WorkerSample>(
    new Worker(new URL('../workers/foundation.worker.ts', import.meta.url), {
      type: 'module',
    }),
    (api) => api.sample(validatedSeed),
    undefined,
    10_000,
  );
}

export async function renderMandalaInWorker(
  recipe: MandalaRecipe,
  signal: AbortSignal,
): Promise<MandalaPreview> {
  return workerRequest<MandalaWorker, MandalaPreview>(
    new Worker(new URL('../workers/mandala.worker.ts', import.meta.url), {
      type: 'module',
    }),
    (api) => api.render(recipe),
    signal,
  );
}
