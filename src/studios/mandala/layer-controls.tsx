import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import {
  distributions,
  motifs,
  type LayerRecipe,
} from '../../engines/mandala/recipe';
import { errorMessage } from '../../shared/errors';
import { useMandalaStore } from './store';
import { selectClass } from './style-controls';

function NumberControl({
  label,
  value,
  min,
  max,
  step = 0.05,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2 text-xs">
      <span>{label}</span>
      <input
        type="number"
        aria-label={label}
        className={selectClass}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function LayerControls({ layers }: { layers: LayerRecipe[] }) {
  const { editLayer, addLayer, removeLayer, moveLayer } = useMandalaStore();
  function act(action: () => void) {
    try {
      action();
    } catch (error) {
      console.error('Could not edit layers:', error);
      toast.error(errorMessage(error));
    }
  }
  return (
    <div className="space-y-4 border-t border-border p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">LAYERS / {layers.length}</p>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Add layer"
          disabled={layers.length >= 12 || !layers.length}
          onClick={() => act(() => addLayer())}
        >
          <Plus />
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Inside to outside. Moving swaps radial slots; adding or removing
        redistributes band widths. Undo restores changes. Repetitions are
        requested counts before density and symmetry rounding.
      </p>
      {layers.map((layer, index) => {
        const update = (change: Partial<LayerRecipe>) =>
          act(() => editLayer(layer.id, change));
        const numbers: {
          label: string;
          key:
            | 'innerRadius'
            | 'outerRadius'
            | 'count'
            | 'scale'
            | 'rotationOffset'
            | 'recursionDepth'
            | 'scaling'
            | 'twist'
            | 'noise'
            | 'distortion'
            | 'ornament'
            | 'strokeScale'
            | 'seedOffset';
          min: number;
          max: number;
          step?: number;
        }[] = [
          {
            label: 'Inner radius',
            key: 'innerRadius',
            min: 0.02,
            max: 0.88,
            step: 0.001,
          },
          {
            label: 'Outer radius',
            key: 'outerRadius',
            min: 0.04,
            max: 0.9,
            step: 0.001,
          },
          { label: 'Repetitions', key: 'count', min: 1, max: 192, step: 1 },
          { label: 'Size', key: 'scale', min: 0.1, max: 1 },
          {
            label: 'Rotation (rad)',
            key: 'rotationOffset',
            min: -6.28,
            max: 6.28,
          },
          {
            label: 'Recursion',
            key: 'recursionDepth',
            min: 0,
            max: 3,
            step: 1,
          },
          { label: 'Inset scaling', key: 'scaling', min: 0.35, max: 0.8 },
          { label: 'Twist (rad)', key: 'twist', min: -6.28, max: 6.28 },
          { label: 'Noise', key: 'noise', min: 0, max: 1 },
          { label: 'Distortion', key: 'distortion', min: 0, max: 1 },
          { label: 'Ornament', key: 'ornament', min: 0, max: 1 },
          { label: 'Stroke multiplier', key: 'strokeScale', min: 0.4, max: 2 },
          {
            label: 'Seed offset',
            key: 'seedOffset',
            min: 0,
            max: 1_000_000,
            step: 1,
          },
        ];
        return (
          <details
            key={layer.id}
            className="rounded-lg border border-border bg-background/30"
            open={index === 0}
          >
            <summary className="cursor-pointer px-3 py-3 text-sm font-medium">
              {index + 1}. {layer.motif}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                {layer.enabled ? '' : '(off)'}
              </span>
            </summary>
            <fieldset
              aria-label={`Layer ${index + 1}`}
              className="space-y-4 border-t border-border p-3"
            >
              <div className="flex items-center justify-between gap-1">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={layer.enabled}
                    disabled={
                      layer.enabled &&
                      layers.filter((item) => item.enabled).length === 1
                    }
                    onChange={(event) =>
                      update({ enabled: event.target.checked })
                    }
                  />
                  Enabled
                </label>
                <div className="flex">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Move layer ${index + 1} inward`}
                    disabled={index === 0}
                    onClick={() => act(() => moveLayer(layer.id, -1))}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Move layer ${index + 1} outward`}
                    disabled={index === layers.length - 1}
                    onClick={() => act(() => moveLayer(layer.id, 1))}
                  >
                    <ArrowDown />
                  </Button>
                </div>
              </div>
              <label className="block space-y-2 text-xs">
                <span>Motif</span>
                <select
                  aria-label="Motif"
                  className={selectClass}
                  value={layer.motif}
                  onChange={(event) => {
                    const motif = motifs.find(
                      (item) => item === event.target.value,
                    );
                    if (motif) update({ motif });
                  }}
                >
                  {motifs.map((motif) => (
                    <option key={motif}>{motif}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-xs">
                <span>Placement</span>
                <select
                  aria-label="Placement"
                  className={selectClass}
                  value={layer.distribution}
                  onChange={(event) => {
                    const distribution = distributions.find(
                      (item) => item === event.target.value,
                    );
                    if (distribution) update({ distribution });
                  }}
                >
                  {distributions.map((distribution) => (
                    <option key={distribution}>{distribution}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {numbers.map(({ key, ...field }) => (
                  <NumberControl
                    key={key}
                    {...field}
                    value={layer[key]}
                    onChange={(value) => update({ [key]: value })}
                  />
                ))}
                <NumberControl
                  label="Width"
                  value={layer.motifParams.width}
                  min={0.1}
                  max={1}
                  onChange={(width) =>
                    update({ motifParams: { ...layer.motifParams, width } })
                  }
                />
                <NumberControl
                  label="Curvature"
                  value={layer.motifParams.curvature}
                  min={0.1}
                  max={1}
                  onChange={(curvature) =>
                    update({ motifParams: { ...layer.motifParams, curvature } })
                  }
                />
                <NumberControl
                  label="Points"
                  value={layer.motifParams.points}
                  min={3}
                  max={16}
                  step={1}
                  onChange={(points) =>
                    update({ motifParams: { ...layer.motifParams, points } })
                  }
                />
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Radial bounds must stay ordered with at least 0.02 width. Mirror
                symmetry requires zero rotation. Invalid edits show an error and
                can be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={layers.length >= 12}
                  onClick={() => act(() => addLayer(layer.id))}
                >
                  <Copy /> Duplicate
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove layer ${index + 1}`}
                  disabled={layers.length === 1}
                  onClick={() => act(() => removeLayer(layer.id))}
                >
                  <Trash2 />
                </Button>
              </div>
            </fieldset>
          </details>
        );
      })}
    </div>
  );
}
