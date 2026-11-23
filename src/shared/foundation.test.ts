import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { shadeColor } from './color';
import { reflectPoint, rotatePoint } from './geometry';
import { createRandom } from './random';
import { createSeededSample } from './sample';
import { createRecipeSchema } from './schemas';

describe('seeded randomness', () => {
  it('reproduces independent streams without sharing mutable state', () => {
    const first = createRandom('mandala:3');
    const second = createRandom('mandala:3');
    const different = createRandom('mandala:4');
    const sequence = Array.from({ length: 100 }, first);
    expect(Array.from({ length: 100 }, second)).toEqual(sequence);
    expect(Array.from({ length: 100 }, different)).not.toEqual(sequence);
    expect(sequence.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('validates worker seeds and produces repeatable samples', () => {
    expect(createSeededSample(' seed ')).toEqual(createSeededSample('seed'));
    expect(() => createSeededSample('  ')).toThrow('Enter a seed');
  });
});

describe('geometry transforms', () => {
  it('rotates around an offset center and reverses the rotation', () => {
    const point = { x: 15, y: 20 };
    const center = { x: 10, y: 20 };
    const rotated = rotatePoint(point, Math.PI / 2, center);
    expect(rotated.x).toBeCloseTo(10);
    expect(rotated.y).toBeCloseTo(25);
    const restored = rotatePoint(rotated, -Math.PI / 2, center);
    expect(restored.x).toBeCloseTo(point.x);
    expect(restored.y).toBeCloseTo(point.y);
  });

  it('reflects around an offset axis while preserving height', () => {
    const point = { x: 120, y: 80 };
    const reflected = reflectPoint(point, 250);
    expect(reflected).toEqual({ x: 380, y: 80 });
    expect(reflectPoint(reflected, 250)).toEqual(point);
  });
});

describe('color shades', () => {
  it('clamps extreme lightness offsets and rejects invalid input', () => {
    expect(shadeColor('#808080', -2)).toBe('#000000');
    expect(shadeColor('#808080', 2)).toBe('#ffffff');
    expect(() => shadeColor('not-a-color', 0.1)).toThrow('valid color');
    expect(() => shadeColor('#ffffff', Number.NaN)).toThrow('finite');
  });
});

describe('recipe schemas', () => {
  it('validates both the versioned envelope and its parameters', () => {
    const schema = createRecipeSchema(z.object({ layers: z.number().min(1) }));
    const recipe = {
      schemaVersion: 1,
      engineVersion: '0.0.0',
      seed: 'test',
      parameters: { layers: 3 },
    };
    expect(schema.parse(recipe)).toEqual(recipe);
    expect(schema.safeParse({ ...recipe, schemaVersion: 2 }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({ ...recipe, parameters: { layers: 0 } }).success,
    ).toBe(false);
  });
});
