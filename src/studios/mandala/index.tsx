import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Preview } from '../../app/preview';
import { StudioPlaceholder } from '../../app/studio-placeholder';
import { Button } from '../../components/ui/button';
import { generateMandala } from '../../engines/mandala/generate';
import { createStyleRecipe } from '../../engines/mandala/styles';
import { renderSvg } from '../../engines/mandala/svg';
import { StyleControls } from './style-controls';
import { useMandalaStore } from './store';

export function MandalaStudio() {
  const { seed, setSeed, mode, blend, options } = useMandalaStore();
  const result = useMemo(() => {
    try {
      const recipe = createStyleRecipe({ seed, blend, ...options });
      const model = generateMandala(recipe);
      return {
        ok: true as const,
        recipe,
        svg: renderSvg(model),
        count: model.paths.length,
      };
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? error.issues.map((issue) => issue.message).join(' ')
          : error instanceof Error
            ? error.message
            : 'Could not generate the mandala.';
      return { ok: false as const, error: message };
    }
  }, [seed, blend, options]);

  useEffect(() => {
    if (!result.ok) {
      console.error('Mandala generation failed:', result.error);
      toast.error(result.error);
    }
  }, [result]);

  return (
    <StudioPlaceholder
      kind="mandala"
      seed={seed}
      setSeed={setSeed}
      settings={
        <StyleControls recipe={result.ok ? result.recipe : undefined} />
      }
      preview={
        !result.ok ? (
          <div
            role="alert"
            className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive"
          >
            <p>{result.error}</p>
            <Button
              variant="outline"
              onClick={() => useMandalaStore.getState().resetOverrides()}
            >
              Restore style defaults
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Preview
              label={`${mode.toUpperCase()} / ${result.count} CLOSED PATHS`}
            >
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`}
                alt={`Generated ${mode} ${result.recipe.structure.baseGeometry} mandala`}
                draggable={false}
                className="w-full rounded-sm bg-white shadow-xl"
              />
            </Preview>
            <p
              className="text-xs leading-relaxed text-muted-foreground"
              aria-live="polite"
            >
              {result.recipe.layers.length} bands /{' '}
              {result.recipe.structure.centers}{' '}
              {result.recipe.structure.centers === 1 ? 'center' : 'centers'} /{' '}
              {result.recipe.structure.centers > 1 ||
              result.recipe.structure.brokenSymmetry > 0
                ? 'Intentionally broken global symmetry'
                : `${result.recipe.structure.symmetryType} symmetry`}
              {' / '}
              {[
                ...new Set(
                  result.recipe.layers.map((layer) => layer.distribution),
                ),
              ].join(', ')}
            </p>
          </div>
        )
      }
    />
  );
}
