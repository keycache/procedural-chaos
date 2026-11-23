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
import { ControlLabel } from '../../components/control-label';

function NumberControl({
  label,
  help,
  value,
  min,
  max,
  step = 0.05,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2 text-xs">
      <ControlLabel label={label} help={help} />
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
          help: string;
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
            help: 'Sets the inside edge of this band as a fraction of the canvas radius. Keep it after the previous enabled band and at least 0.02 below its outer edge.',
            key: 'innerRadius',
            min: 0.02,
            max: 0.88,
            step: 0.001,
          },
          {
            label: 'Outer radius',
            help: 'Sets the outside edge of this band as a fraction of the canvas radius. Keep it before the next enabled band, at most 0.9, and at least 0.02 beyond its inner edge.',
            key: 'outerRadius',
            min: 0.04,
            max: 0.9,
            step: 0.001,
          },
          {
            label: 'Repetitions',
            help: 'Requests a motif count before global density and symmetry rounding. Grid layouts use it as a density hint; branching uses recursion depth to determine its placement tree.',
            key: 'count',
            min: 1,
            max: 192,
            step: 1,
          },
          {
            label: 'Size',
            help: 'Changes how much space each motif occupies within its band. Smaller values leave more gaps without moving the band boundaries.',
            key: 'scale',
            min: 0.1,
            max: 1,
          },
          {
            label: 'Rotation (rad)',
            help: 'Offsets motif placements around the center of this band, in radians. Negative values turn the opposite way. Dihedral and bilateral symmetry require zero here to preserve the shared mirror axis.',
            key: 'rotationOffset',
            min: -6.28,
            max: 6.28,
          },
          {
            label: 'Recursion',
            help: 'Adds smaller inset copies of this motif; zero removes the insets. With branching placement, it also increases the depth of the placement fan up to the branching limit.',
            key: 'recursionDepth',
            min: 0,
            max: 3,
            step: 1,
          },
          {
            label: 'Inset scaling',
            help: 'Sets the size multiplier for each recursive inset. For example, 0.62 makes each level 62% of the previous level. It only affects recursive outlines.',
            key: 'scaling',
            min: 0.35,
            max: 0.8,
          },
          {
            label: 'Twist (rad)',
            help: 'Controls recursive inset rotation: each depth turns by this value times depth times 0.35 radians. It needs nonzero recursion; negative values reverse the turn.',
            key: 'twist',
            min: -6.28,
            max: 6.28,
          },
          {
            label: 'Noise',
            help: 'Smoothly displaces motif points using seeded waves. The displacement is applied before symmetry expansion, so matching copies remain consistent.',
            key: 'noise',
            min: 0,
            max: 1,
          },
          {
            label: 'Distortion',
            help: 'Adds a smooth bend to this motif before it is repeated. Higher values produce more warped outlines without changing the band boundaries.',
            key: 'distortion',
            min: 0,
            max: 1,
          },
          {
            label: 'Ornament',
            help: 'Controls ornamental treatment. Positive values let ring motifs follow the annulus; values above 0.7 add fine vein details to petals, leaves, and teardrops.',
            key: 'ornament',
            min: 0,
            max: 1,
          },
          {
            label: 'Stroke multiplier',
            help: 'Multiplies the global line thickness for motifs in this layer. Fine inset/detail strokes remain thinner; separator boundary thickness is controlled globally.',
            key: 'strokeScale',
            min: 0.4,
            max: 2,
          },
          {
            label: 'Seed offset',
            help: 'Changes the random stream for this layer without changing the main seed or reshuffling other layers. Use it to explore alternate details within the same composition.',
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
                    aria-label="Enabled"
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
                  <ControlLabel
                    label="Enabled"
                    help="Includes this band in the generated artwork. Turn it off to hide it without deleting its settings. At least one layer must remain enabled."
                  />
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
                <ControlLabel
                  label="Motif"
                  help="Chooses the shape repeated in this band: petals, arcs, dots, polygons, stars, teardrops, leaves, spirals, branches, or interlocking polygons. Parameter effects depend on the chosen shape."
                />
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
                <ControlLabel
                  label="Placement"
                  help="Chooses how this layer arranges its motifs: ring, Cartesian grid, spiral, branching fan, staggered tessellation, or seeded scatter. Unlike the global override, this edits only this layer."
                />
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
                  help="Controls horizontal spread in placements that use motif width, especially rings. Grid and scatter layouts derive their sizes from their placement cells."
                  value={layer.motifParams.width}
                  min={0.1}
                  max={1}
                  onChange={(width) =>
                    update({ motifParams: { ...layer.motifParams, width } })
                  }
                />
                <NumberControl
                  label="Curvature"
                  help="Changes the curve fullness of petals, teardrops, leaves, and arcs. Other motifs use fixed or polygonal construction and do not use this parameter."
                  value={layer.motifParams.curvature}
                  min={0.1}
                  max={1}
                  onChange={(curvature) =>
                    update({ motifParams: { ...layer.motifParams, curvature } })
                  }
                />
                <NumberControl
                  label="Points"
                  help="Sets the number of corners on a polygon or outer points on a star. It does not change other motifs."
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
