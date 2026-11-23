import {
  baseGeometries,
  distributions,
  styles,
  symmetryTypes,
} from '../../engines/mandala/recipe';
import type { MandalaRecipe } from '../../engines/mandala/recipe';
import { Button } from '../../components/ui/button';
import { useMandalaStore } from './store';
import { ControlLabel } from '../../components/control-label';

export const selectClass =
  'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50';
const descriptions = {
  traditional:
    'Layered lotus forms, beaded borders, nested petals, and fine ornamental veins.',
  geometric: 'Stars and interlocking polygons with tiled, grid-based bands.',
  organic:
    'Botanical leaves, recursive branches, curling forms, and gentle irregularity.',
  abstract:
    'Multiple focal points, scattered fragments, spirals, and intentional asymmetry.',
  hybrid:
    'Combine style rules. Weights are normalized; they do not have to add up to 100%.',
};

export function RangeControl({
  label,
  help,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  percent = true,
}: {
  label: string;
  help: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  percent?: boolean;
}) {
  return (
    <label className="block space-y-3 text-sm">
      <span className="flex items-center justify-between gap-2">
        <ControlLabel label={label} help={help} />
        <span className="font-mono text-xs text-muted-foreground">
          {percent ? `${Math.round(value * 100)}%` : value}
        </span>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-primary"
      />
    </label>
  );
}

export function StyleControls({ recipe }: { recipe?: MandalaRecipe }) {
  const {
    mode,
    blend,
    options,
    setMode,
    setWeight,
    setOptions,
    resetOverrides,
    globals,
    setGlobals,
  } = useMandalaStore();
  const total = Object.values(blend).reduce((sum, value) => sum + value, 0);
  return (
    <div className="space-y-5 p-5">
      <p className="eyebrow">STYLE & COMPOSITION</p>
      <label htmlFor="generative-style" className="block space-y-2 text-sm">
        <ControlLabel
          label="Generative style"
          help="Choose the design rules for motifs, placement, and detail, or blend styles with hybrid. Changing style resets structure, appearance overrides, and custom layers; Undo can restore them."
        />
        <select
          id="generative-style"
          aria-label="Generative style"
          className={selectClass}
          value={mode}
          onChange={(event) => {
            const value = [...styles, 'hybrid' as const].find(
              (style) => style === event.target.value,
            );
            if (value) setMode(value);
          }}
        >
          {[...styles, 'hybrid'].map((style) => (
            <option key={style} value={style}>
              {style}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {descriptions[mode]} Selecting a style restores its suggested structure
        and transforms.
      </p>
      {mode === 'hybrid' && (
        <div className="space-y-4 rounded-lg border border-border p-3">
          {styles.map((style) => (
            <RangeControl
              key={style}
              label={`${style} weight`}
              help={`${descriptions[style]} Increase this weight to give those rules more influence. Weights are normalized together; at least one must be positive. Changing weights rebuilds custom layers.`}
              value={blend[style]}
              onChange={(value) => setWeight(style, value)}
            />
          ))}
          <p className="text-xs text-muted-foreground">
            {total > 0
              ? styles
                  .filter((style) => blend[style] > 0)
                  .map(
                    (style) =>
                      `${style} ${Math.round((blend[style] / total) * 100)}%`,
                  )
                  .join(' / ')
              : 'Set at least one weight above zero.'}
          </p>
        </div>
      )}
      <RangeControl
        label="Complexity"
        help="Adds more decorative bands, nested outlines, and outer-band repetitions as it increases. This replans the composition and replaces custom layers; Undo can restore them."
        value={options.complexity ?? 0.65}
        onChange={(complexity) => setOptions({ complexity })}
      />
      <details className="border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-medium">
          Global appearance
        </summary>
        <div className="mt-5 space-y-5">
          <RangeControl
            label="Density"
            help="Requests more or fewer motif repetitions across the design. Counts still round to complete symmetry groups, and branching placement remains depth-driven. Custom layers are preserved."
            value={globals.density ?? recipe?.global.density ?? 0.5}
            onChange={(density) => setGlobals({ density })}
          />
          <RangeControl
            label="Negative space"
            help="Shrinks motifs within their existing bands to leave more breathing room. Separator boundaries stay in place, and custom layers are preserved."
            value={globals.negativeSpace ?? recipe?.global.negativeSpace ?? 0}
            onChange={(negativeSpace) => setGlobals({ negativeSpace })}
          />
          <RangeControl
            label="Irregularity"
            help="Adds seeded variation to motif width and curvature. The variation repeats consistently across symmetry copies unless you also enable broken symmetry."
            value={globals.irregularity ?? recipe?.global.irregularity ?? 0}
            onChange={(irregularity) => setGlobals({ irregularity })}
          />
          <RangeControl
            label="Stroke width"
            help="Sets the overall line thickness in logical artwork units. Per-layer stroke multipliers and fine-detail strokes scale relative to this value."
            value={globals.strokeWidth ?? recipe?.global.strokeWidth ?? 1.8}
            min={0.25}
            max={8}
            step={0.25}
            percent={false}
            onChange={(strokeWidth) => setGlobals({ strokeWidth })}
          />
        </div>
      </details>
      <details className="border-t border-border pt-4" open>
        <summary className="cursor-pointer text-sm font-medium">
          Geometry & placement
        </summary>
        <div className="mt-4 space-y-4">
          <label htmlFor="base-geometry" className="block space-y-2 text-sm">
            <ControlLabel
              label="Base geometry"
              help="Chooses the organizing boundary: circle, polygon, star, spiral, or freeform. Spiral adds guide curves; it is separate from spiral distribution. Style guided uses the selected style's suggestion. Changing this rebuilds custom layers."
            />
            <select
              id="base-geometry"
              aria-label="Base geometry"
              className={selectClass}
              value={options.baseGeometry ?? 'auto'}
              onChange={(event) =>
                setOptions({
                  baseGeometry: baseGeometries.find(
                    (geometry) => geometry === event.target.value,
                  ),
                })
              }
            >
              <option value="auto">
                Style guided
                {recipe ? ` (${recipe.structure.baseGeometry})` : ''}
              </option>
              {baseGeometries.map((geometry) => (
                <option key={geometry} value={geometry}>
                  {geometry}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="symmetry-type" className="block space-y-2 text-sm">
            <ControlLabel
              label="Symmetry"
              help="Rotational repeats around the center; dihedral adds mirrored copies; bilateral uses one vertical mirror; none places motifs without enforced symmetry. Changing this rebuilds custom layers."
            />
            <select
              id="symmetry-type"
              aria-label="Symmetry"
              className={selectClass}
              value={options.symmetryType ?? 'auto'}
              onChange={(event) =>
                setOptions({
                  symmetryType: symmetryTypes.find(
                    (type) => type === event.target.value,
                  ),
                })
              }
            >
              <option value="auto">
                Style guided
                {recipe ? ` (${recipe.structure.symmetryType})` : ''}
              </option>
              {symmetryTypes.map((symmetry) => (
                <option key={symmetry} value={symmetry}>
                  {symmetry}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="symmetry-order" className="block space-y-2 text-sm">
            <ControlLabel
              label="Rotational divisions"
              help="Sets the number of repeated rotational sectors. More sectors make motifs narrower and more repetitive; dihedral also mirrors each sector. This is inactive for bilateral or no symmetry. Changing it rebuilds custom layers."
            />
            <select
              id="symmetry-order"
              aria-label="Rotational divisions"
              className={selectClass}
              value={options.symmetryOrder ?? 'auto'}
              disabled={
                recipe?.structure.symmetryType === 'none' ||
                recipe?.structure.symmetryType === 'bilateral'
              }
              onChange={(event) =>
                setOptions({
                  symmetryOrder:
                    event.target.value === 'auto'
                      ? undefined
                      : Number(event.target.value),
                })
              }
            >
              <option value="auto">
                Style guided
                {recipe ? ` (${recipe.structure.symmetryOrder})` : ''}
              </option>
              {[1, 4, 6, 8, 12, 16, 24, 48].map((order) => (
                <option key={order} value={order}>
                  {order}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="distribution" className="block space-y-2 text-sm">
            <ControlLabel
              label="Distribution"
              help="Places main-band motifs in rings, grids, spirals, branching fans, staggered tessellation cells, or seeded scatter. Narrow ornamental borders stay rings. Style guided mixes placements for you. Changing this rebuilds custom layers."
            />
            <select
              id="distribution"
              aria-label="Distribution"
              className={selectClass}
              value={options.distribution ?? 'auto'}
              onChange={(event) =>
                setOptions({
                  distribution: distributions.find(
                    (distribution) => distribution === event.target.value,
                  ),
                })
              }
            >
              <option value="auto">Style guided</option>
              {distributions.map((distribution) => (
                <option key={distribution} value={distribution}>
                  {distribution}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="centers" className="block space-y-2 text-sm">
            <ControlLabel
              label="Focal centers"
              help="Chooses one to four focal rosettes. Multiple centers use smaller rosettes and no longer claim exact symmetry for the whole image, though each uses your chosen local symmetry. Changing this rebuilds custom layers."
            />
            <select
              id="centers"
              aria-label="Focal centers"
              className={selectClass}
              value={options.centers ?? 'auto'}
              onChange={(event) =>
                setOptions({
                  centers:
                    event.target.value === 'auto'
                      ? undefined
                      : Number(event.target.value),
                })
              }
            >
              <option value="auto">
                Style guided{recipe ? ` (${recipe.structure.centers})` : ''}
              </option>
              {[1, 2, 3, 4].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
      <details className="border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-medium">
          Growth & transformations
        </summary>
        <div className="mt-5 space-y-5">
          <RangeControl
            label="Recursion depth"
            help="Adds successively smaller inset outlines to main-band motifs. Zero removes nested outlines; branching placement also grows deeper as this increases, up to its limit. Changing this rebuilds custom layers."
            value={
              options.recursionDepth ?? recipe?.layers[0].recursionDepth ?? 0
            }
            max={3}
            step={1}
            percent={false}
            onChange={(recursionDepth) => setOptions({ recursionDepth })}
          />
          <RangeControl
            label="Twist"
            help="Rotates each recursive inset relative to the previous one. It needs a nonzero recursion depth to be visible; negative values turn the opposite way. Changing this rebuilds custom layers."
            value={options.twist ?? recipe?.layers[0].twist ?? 0}
            min={-1}
            onChange={(twist) => setOptions({ twist })}
          />
          <RangeControl
            label="Distortion"
            help="Smoothly bends the canonical motif before symmetry copies are made. Higher values produce more warped shapes while retaining exact symmetry unless it is explicitly broken. Changing this rebuilds custom layers."
            value={options.distortion ?? recipe?.layers[0].distortion ?? 0}
            onChange={(distortion) => setOptions({ distortion })}
          />
          <RangeControl
            label="Organic noise"
            help="Adds smooth, seeded displacement to motif points and curve controls for an organic feel. The same seed reproduces the same result. Changing this rebuilds custom layers."
            value={options.noise ?? recipe?.layers[0].noise ?? 0}
            onChange={(noise) => setOptions({ noise })}
          />
          <RangeControl
            label="Broken symmetry"
            help="Perturbs the angles of repeated copies so they no longer align perfectly. Zero keeps exact symmetry where the chosen layout supports it; higher values increase the mismatch. Changing this rebuilds custom layers."
            value={
              options.brokenSymmetry ?? recipe?.structure.brokenSymmetry ?? 0
            }
            onChange={(brokenSymmetry) => setOptions({ brokenSymmetry })}
          />
        </div>
      </details>
      <Button variant="outline" className="w-full" onClick={resetOverrides}>
        Restore style defaults
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Narrow bands stay ornamental borders. Distribution and recursion
        overrides affect the main bands. Style, blend, complexity, and structure
        changes rebuild custom layers; global appearance controls preserve them.
      </p>
    </div>
  );
}
