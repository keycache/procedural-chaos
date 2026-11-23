import { beforeEach, describe, expect, it } from 'vitest';
import { singleStyle } from '../../engines/mandala/styles';
import { useMandalaStore } from './store';

describe('style editor state', () => {
  beforeEach(() => {
    useMandalaStore.setState(useMandalaStore.getInitialState(), true);
  });

  it('switches styles without carrying stale overrides or changing the seed and complexity', () => {
    const state = useMandalaStore.getState();
    state.setSeed('my-study');
    state.setOptions({
      complexity: 0.4,
      centers: 4,
      symmetryType: 'none',
      noise: 0.8,
    });
    state.setMode('geometric');
    expect(useMandalaStore.getState()).toMatchObject({
      seed: 'my-study',
      blend: singleStyle('geometric'),
      options: { complexity: 0.4 },
    });
    expect(useMandalaStore.getState().options.centers).toBeUndefined();
  });

  it('restores style defaults while preserving a valid custom blend', () => {
    const state = useMandalaStore.getState();
    state.setMode('hybrid');
    state.setWeight('organic', 0.8);
    state.setOptions({ distribution: 'scatter', centers: 4 });
    const blend = useMandalaStore.getState().blend;
    state.resetOverrides();
    expect(useMandalaStore.getState().blend).toEqual(blend);
    expect(useMandalaStore.getState().options).toEqual({ complexity: 0.65 });
  });

  it('recovers from an all-zero hybrid instead of leaving the restore action broken', () => {
    const state = useMandalaStore.getState();
    state.setMode('hybrid');
    state.setWeight('traditional', 0);
    state.setWeight('geometric', 0);
    expect(
      Object.values(useMandalaStore.getState().blend).every(
        (weight) => weight === 0,
      ),
    ).toBe(true);
    state.resetOverrides();
    expect(useMandalaStore.getState().blend).toEqual({
      traditional: 0.7,
      geometric: 0.3,
      organic: 0,
      abstract: 0,
    });
  });
});
