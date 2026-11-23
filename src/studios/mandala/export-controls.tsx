import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import type { MandalaRecipe } from '../../engines/mandala/recipe';
import { errorMessage } from '../../shared/errors';
import {
  downloadBlob,
  exportFilename,
  exportPng,
  exportRecipe,
  exportSvg,
  type ExportBackground,
} from './exports';
import { selectClass } from './style-controls';
import { ControlLabel } from '../../components/control-label';

export function ExportControls({
  recipe,
  svg,
  name,
}: {
  recipe?: MandalaRecipe;
  svg?: string;
  name: string;
}) {
  const [size, setSize] = useState(2048);
  const [background, setBackground] = useState<ExportBackground>('white');
  const [busy, setBusy] = useState(false);
  async function save(format: 'svg' | 'png' | 'json') {
    setBusy(true);
    try {
      if (!recipe || !svg)
        throw new Error('Wait for a valid preview before exporting.');
      const blob =
        format === 'png'
          ? await exportPng(svg, size, background)
          : new Blob(
              [
                format === 'svg'
                  ? exportSvg(svg, background)
                  : exportRecipe(recipe),
              ],
              { type: format === 'svg' ? 'image/svg+xml' : 'application/json' },
            );
      downloadBlob(blob, exportFilename(name, format));
      toast.success(`${format.toUpperCase()} download started.`);
    } catch (error) {
      console.error('Could not export mandala:', error);
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4 border-t border-border p-5">
      <p className="eyebrow">EXPORT ARTWORK</p>
      <label className="block space-y-2 text-sm">
        <ControlLabel
          label="Background"
          help="Uses white or transparency behind exported SVG and PNG artwork. The on-screen preview stays white, and JSON recipes are unaffected."
        />
        <select
          aria-label="Export background"
          className={selectClass}
          value={background}
          onChange={(event) => {
            if (
              event.target.value === 'white' ||
              event.target.value === 'transparent'
            )
              setBackground(event.target.value);
          }}
        >
          <option value="white">White</option>
          <option value="transparent">Transparent</option>
        </select>
      </label>
      <label className="block space-y-2 text-sm">
        <ControlLabel
          label="PNG resolution"
          help="Sets the exported PNG's square pixel dimensions, from 1024 to 8192. Larger images contain more pixels and need more memory and encoding time. SVG and JSON are unaffected."
        />
        <select
          aria-label="PNG resolution"
          className={selectClass}
          value={size}
          onChange={(event) => setSize(Number(event.target.value))}
        >
          {[1024, 2048, 4096, 8192].map((resolution) => (
            <option key={resolution} value={resolution}>
              {resolution} × {resolution}
            </option>
          ))}
        </select>
      </label>
      {(['svg', 'png', 'json'] as const).map((format) => (
        <Button
          key={format}
          variant="outline"
          className="w-full"
          disabled={!recipe || !svg || busy}
          onClick={() => void save(format)}
        >
          {busy ? <LoaderCircle className="animate-spin" /> : <Download />}{' '}
          Export {format.toUpperCase()}
        </Button>
      ))}
      <p className="text-xs leading-relaxed text-muted-foreground">
        SVG includes the exact recipe, center, symmetry, and path draw order.
        JSON contains the recipe. PNG size/background do not alter your design.
        Large PNGs need more memory.
      </p>
    </div>
  );
}
