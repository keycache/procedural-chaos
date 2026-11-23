import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Preview } from '../../app/preview';
import { StudioPlaceholder } from '../../app/studio-placeholder';
import { generateMandala } from '../../engines/mandala/generate';
import {
  baseGeometries,
  createStarterRecipe,
  symmetryTypes,
} from '../../engines/mandala/recipe';
import { renderSvg } from '../../engines/mandala/svg';
import { useMandalaStore } from './store';

export function MandalaStudio() {
  const {
    seed,
    setSeed,
    baseGeometry,
    setBaseGeometry,
    symmetryType,
    setSymmetryType,
    symmetryOrder,
    setSymmetryOrder,
  } = useMandalaStore();
  const result = useMemo<
    { ok: true; svg: string; count: number } | { ok: false; error: string }
  >(() => {
    try {
      const model = generateMandala(
        createStarterRecipe(seed, baseGeometry, symmetryType, symmetryOrder),
      );
      return { ok: true, svg: renderSvg(model), count: model.paths.length };
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? error.issues.map((issue) => issue.message).join(' ')
          : error instanceof Error
            ? error.message
            : 'Could not generate the mandala.';
      return { ok: false, error: message };
    }
  }, [seed, baseGeometry, symmetryType, symmetryOrder]);

  useEffect(() => {
    if (!result.ok) {
      console.error('Mandala generation failed:', result.error);
      toast.error(result.error);
    }
  }, [result]);

  const mirroredOnly = symmetryType === 'bilateral' || symmetryType === 'none';
  const selectClass =
    'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50';
  return (
    <StudioPlaceholder
      kind="mandala"
      seed={seed}
      setSeed={setSeed}
      settings={
        <div className="space-y-5 p-5">
          <p className="eyebrow">GEOMETRY & SYMMETRY</p>
          <label htmlFor="base-geometry" className="block space-y-2 text-sm">
            <span>Base geometry</span>
            <select
              id="base-geometry"
              value={baseGeometry}
              className={selectClass}
              onChange={(event) => {
                const value = baseGeometries.find(
                  (geometry) => geometry === event.target.value,
                );
                if (value) setBaseGeometry(value);
              }}
            >
              {baseGeometries.map((geometry) => (
                <option key={geometry} value={geometry}>
                  {geometry}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="symmetry-type" className="block space-y-2 text-sm">
            <span>Symmetry</span>
            <select
              id="symmetry-type"
              value={symmetryType}
              className={selectClass}
              onChange={(event) => {
                const value = symmetryTypes.find(
                  (type) => type === event.target.value,
                );
                if (value) setSymmetryType(value);
              }}
            >
              {symmetryTypes.map((symmetry) => (
                <option key={symmetry} value={symmetry}>
                  {symmetry}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="symmetry-order" className="block space-y-2 text-sm">
            <span>Rotational divisions</span>
            <select
              id="symmetry-order"
              value={mirroredOnly ? 1 : symmetryOrder}
              disabled={mirroredOnly}
              className={selectClass}
              onChange={(event) => setSymmetryOrder(Number(event.target.value))}
            >
              {[1, 4, 6, 8, 12, 16, 24, 48].map((order) => (
                <option key={order} value={order}>
                  {order}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Six starter rings: petals, dots, teardrops, polygons, stars, and
            arcs. Symmetric copies share their seeded variations.
          </p>
          {baseGeometry === 'spiral' && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Spiral guides connect closed circular ring boundaries. More growth
              and distribution systems arrive in Phase 2.
            </p>
          )}
        </div>
      }
      preview={
        !result.ok ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive"
          >
            {result.error}
          </div>
        ) : (
          <Preview label={`GENERATED LINE ART / ${result.count} PATHS`}>
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`}
              alt={`Generated ${baseGeometry} mandala with ${symmetryType} symmetry`}
              draggable={false}
              className="w-full rounded-sm bg-white shadow-xl"
            />
          </Preview>
        )
      }
    />
  );
}
