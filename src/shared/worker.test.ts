import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStarterRecipe } from '../engines/mandala/recipe';
import { renderMandalaInWorker } from './worker';

const mocks = vi.hoisted(() => ({
  render: vi.fn(),
  release: vi.fn(),
  releaseProxy: Symbol('release'),
}));
vi.mock('comlink', () => ({
  wrap: () => ({ render: mocks.render, [mocks.releaseProxy]: mocks.release }),
  releaseProxy: mocks.releaseProxy,
}));

class TestWorker extends EventTarget {
  static instances: TestWorker[] = [];
  terminate = vi.fn();
  constructor() {
    super();
    TestWorker.instances.push(this);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  TestWorker.instances = [];
  vi.stubGlobal('Worker', TestWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('mandala worker lifecycle', () => {
  it('releases successful workers after returning their output', async () => {
    mocks.render.mockResolvedValue({ svg: '<svg/>', pathCount: 12 });
    const recipe = createStarterRecipe('worker');
    expect(
      await renderMandalaInWorker(recipe, new AbortController().signal),
    ).toEqual({ svg: '<svg/>', pathCount: 12 });
    expect(mocks.render).toHaveBeenCalledWith(recipe);
    expect(TestWorker.instances[0].terminate).toHaveBeenCalledOnce();
    expect(mocks.release).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('terminates cancelled work instead of allowing an obsolete generation to complete', async () => {
    mocks.render.mockImplementation(() => new Promise(() => {}));
    const controller = new AbortController();
    const request = renderMandalaInWorker(
      createStarterRecipe('cancel'),
      controller.signal,
    );
    const rejected = expect(request).rejects.toMatchObject({
      name: 'AbortError',
    });
    controller.abort();
    await rejected;
    expect(TestWorker.instances[0].terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('surfaces worker crashes and cleans up the failed request', async () => {
    mocks.render.mockImplementation(() => new Promise(() => {}));
    const request = renderMandalaInWorker(
      createStarterRecipe('crash'),
      new AbortController().signal,
    );
    const rejected = expect(request).rejects.toThrow('worker crashed');
    TestWorker.instances[0].dispatchEvent(
      Object.assign(new Event('error'), { message: 'worker crashed' }),
    );
    await rejected;
    expect(TestWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });

  it('times out a worker that never answers and reports the failure explicitly', async () => {
    mocks.render.mockImplementation(() => new Promise(() => {}));
    const request = renderMandalaInWorker(
      createStarterRecipe('timeout'),
      new AbortController().signal,
    );
    const rejected = expect(request).rejects.toThrow('15 seconds');
    await vi.advanceTimersByTimeAsync(15_000);
    await rejected;
    expect(TestWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });
});
