import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Redo2, Save, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Preview } from '../../app/preview';
import { StudioPlaceholder } from '../../app/studio-placeholder';
import { Button } from '../../components/ui/button';
import { errorMessage } from '../../shared/errors';
import { editorRecipe, isArtDirectedComposition } from './editor';
import { ExportControls } from './export-controls';
import { LayerControls } from './layer-controls';
import { saveMandalaProject } from './projects';
import { StyleControls } from './style-controls';
import { editorSnapshot, useMandalaStore } from './store';
import { useGeneration } from './use-generation';
import { WorkspaceControls } from './workspace-controls';

export function MandalaStudio() {
  const state = useMandalaStore();
  const {
    seed,
    setSeed,
    mode,
    blend,
    options,
    globals,
    ornament,
    swirl,
    layers,
    name,
    past,
    future,
    undo,
    redo,
    projectId,
    rememberSeed,
  } = state;
  const [saving, setSaving] = useState(false);
  const plan = useMemo(() => {
    try {
      return {
        recipe: editorRecipe({
          name: '',
          seed,
          mode,
          blend,
          options,
          globals,
          ornament,
          swirl,
          layers,
        }),
      };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  }, [seed, mode, blend, options, globals, layers, ornament, swirl]);
  const generation = useGeneration(plan.recipe);
  const ready =
    generation && 'result' in generation ? generation.result : undefined;
  const error =
    plan.error ??
    (generation && 'error' in generation ? generation.error : undefined);

  useEffect(() => {
    if (error) {
      console.error('Mandala generation failed:', error);
      toast.error(error);
    }
  }, [error]);
  useEffect(() => {
    if (ready && plan.recipe) rememberSeed(plan.recipe.seed);
  }, [ready, plan.recipe, rememberSeed]);

  async function save(copy = false) {
    setSaving(true);
    const originalId = projectId;
    try {
      if (!ready || !plan.recipe)
        throw new Error('Wait for a valid preview before saving.');
      const saved = await saveMandalaProject(
        editorSnapshot(useMandalaStore.getState()),
        plan.recipe,
        ready.svg,
        copy ? null : originalId,
      );
      if (useMandalaStore.getState().projectId === originalId)
        useMandalaStore.getState().markSaved(saved.id);
      toast.success(`Saved "${saved.name}" to your local library.`);
    } catch (error) {
      console.error('Could not save mandala:', error);
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <StudioPlaceholder
      kind="mandala"
      seed={seed}
      setSeed={setSeed}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            size="icon"
            variant="outline"
            aria-label="Undo"
            disabled={!past.length}
            onClick={undo}
          >
            <Undo2 />
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Redo"
            disabled={!future.length}
            onClick={redo}
          >
            <Redo2 />
          </Button>
          {projectId && (
            <Button
              variant="outline"
              disabled={!ready || saving}
              onClick={() => void save(true)}
            >
              Save a copy
            </Button>
          )}
          <Button disabled={!ready || saving} onClick={() => void save()}>
            {saving ? <LoaderCircle className="animate-spin" /> : <Save />} Save
            project
          </Button>
        </div>
      }
      workspace={<WorkspaceControls />}
      settings={
        <>
          <StyleControls recipe={plan.recipe} />
          {!isArtDirectedComposition(mode) && (
            <LayerControls layers={layers ?? plan.recipe?.layers ?? []} />
          )}
          <ExportControls
            recipe={ready ? plan.recipe : undefined}
            svg={ready?.svg}
            name={name}
          />
        </>
      }
      preview={
        error ? (
          <div
            role="alert"
            className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive"
          >
            <p>{error}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={!past.length} onClick={undo}>
                Undo edit
              </Button>
              <Button variant="outline" onClick={state.resetOverrides}>
                Restore style defaults
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Preview
              label={
                ready
                  ? `${mode.toUpperCase()} / ${ready.pathCount} ${isArtDirectedComposition(mode) ? 'PATHS' : 'CLOSED PATHS'}`
                  : 'GENERATING IN A WORKER'
              }
            >
              {ready && plan.recipe ? (
                <img
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ready.svg)}`}
                  alt={`Generated ${mode} ${plan.recipe.structure.baseGeometry} mandala`}
                  draggable={false}
                  className="w-full rounded-sm bg-white shadow-xl"
                />
              ) : (
                <div
                  role="status"
                  className="flex aspect-square flex-col items-center justify-center gap-3 rounded-sm bg-white text-sm text-zinc-600"
                >
                  <LoaderCircle className="size-7 animate-spin text-orange-500" />{' '}
                  Updating your design...
                </div>
              )}
            </Preview>
            {plan.recipe && (
              <p
                className="text-xs leading-relaxed text-muted-foreground"
                aria-live="polite"
              >
                {isArtDirectedComposition(mode) ? (
                  <>
                    {mode === 'swirling-paisley'
                      ? 'Flowing paisley wings'
                      : mode === 'ornate-lotus'
                        ? 'Layered lotus crowns'
                        : 'Floral crowns'}{' '}
                    / {plan.recipe.structure.symmetryOrder}-fold rotational
                    symmetry / outlines, decorative strokes & ink accents
                  </>
                ) : (
                  <>
                    {plan.recipe.layers.filter((layer) => layer.enabled).length}{' '}
                    active bands / {plan.recipe.structure.centers}{' '}
                    {plan.recipe.structure.centers === 1 ? 'center' : 'centers'}{' '}
                    /{' '}
                    {plan.recipe.structure.centers > 1 ||
                    plan.recipe.structure.brokenSymmetry > 0
                      ? 'Intentionally broken global symmetry'
                      : `${plan.recipe.structure.symmetryType} symmetry`}
                    {' / '}
                    {layers ? 'Custom layers' : 'Style guided'}
                  </>
                )}
                {' / '}200 ms debounce
                {ready?.ornamentFit && (
                  <>
                    {' '}
                    / Ornament fit: {ready.ornamentFit.omitted} details omitted
                    to preserve clearance (
                    {ready.ornamentFit.clearance.toFixed(1)} design units
                    minimum)
                  </>
                )}
              </p>
            )}
          </div>
        )
      }
    />
  );
}
