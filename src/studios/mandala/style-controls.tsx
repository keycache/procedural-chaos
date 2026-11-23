import {
  baseGeometries,
  distributions,
  styles,
  symmetryTypes,
} from '../../engines/mandala/recipe';
import type { MandalaRecipe } from '../../engines/mandala/recipe';
import { Button } from '../../components/ui/button';
import { useMandalaStore } from './store';

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
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  percent = true,
}: {
  label: string;
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
        <span>{label}</span>
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
        <span>Generative style</span>
        <select
          id="generative-style"
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
            value={globals.density ?? recipe?.global.density ?? 0.5}
            onChange={(density) => setGlobals({ density })}
          />
          <RangeControl
            label="Negative space"
            value={globals.negativeSpace ?? recipe?.global.negativeSpace ?? 0}
            onChange={(negativeSpace) => setGlobals({ negativeSpace })}
          />
          <RangeControl
            label="Irregularity"
            value={globals.irregularity ?? recipe?.global.irregularity ?? 0}
            onChange={(irregularity) => setGlobals({ irregularity })}
          />
          <RangeControl
            label="Stroke width"
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
            <span>Base geometry</span>
            <select
              id="base-geometry"
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
            <span>Symmetry</span>
            <select
              id="symmetry-type"
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
            <span>Rotational divisions</span>
            <select
              id="symmetry-order"
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
            <span>Distribution</span>
            <select
              id="distribution"
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
            <span>Focal centers</span>
            <select
              id="centers"
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
            value={options.twist ?? recipe?.layers[0].twist ?? 0}
            min={-1}
            onChange={(twist) => setOptions({ twist })}
          />
          <RangeControl
            label="Distortion"
            value={options.distortion ?? recipe?.layers[0].distortion ?? 0}
            onChange={(distortion) => setOptions({ distortion })}
          />
          <RangeControl
            label="Organic noise"
            value={options.noise ?? recipe?.layers[0].noise ?? 0}
            onChange={(noise) => setOptions({ noise })}
          />
          <RangeControl
            label="Broken symmetry"
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
