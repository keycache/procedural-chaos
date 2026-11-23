import { useEffect, useState } from 'react';
import type { MandalaRecipe } from '../../engines/mandala/recipe';
import type { MandalaPreview } from '../../engines/mandala/render';
import { errorMessage } from '../../shared/errors';
import { renderMandalaInWorker } from '../../shared/worker';

type Generation =
  { key: string; result: MandalaPreview } | { key: string; error: string };

export function useGeneration(recipe: MandalaRecipe | undefined) {
  const key = recipe ? JSON.stringify(recipe) : '';
  const [generation, setGeneration] = useState<Generation>();
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const input: MandalaRecipe = JSON.parse(key);
      renderMandalaInWorker(input, controller.signal).then(
        (result) => {
          if (!controller.signal.aborted) setGeneration({ key, result });
        },
        (error: unknown) => {
          if (!controller.signal.aborted) {
            console.error('Mandala worker failed:', error);
            setGeneration({ key, error: errorMessage(error) });
          }
        },
      );
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);
  return generation?.key === key ? generation : undefined;
}
