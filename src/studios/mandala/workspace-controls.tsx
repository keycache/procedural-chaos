import { Shuffle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { matchingPresetId, presets } from './editor';
import { selectClass } from './style-controls';
import { useMandalaStore } from './store';
import { ControlLabel } from '../../components/control-label';

export function WorkspaceControls() {
  const state = useMandalaStore();
  const { name, setName, setSeed, seedHistory, applyPreset, projectId } = state;
  const presetId = matchingPresetId(state);
  return (
    <div className="space-y-4 border-b border-border p-5">
      <label className="block space-y-2 text-sm">
        <ControlLabel
          label="Project name"
          help="Names the saved Library item and exported files. Renaming does not change the artwork; save the project to keep the new name."
        />
        <Input
          aria-label="Project name"
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        {projectId
          ? 'Editing a saved project. Save updates it; Save a copy creates another.'
          : 'Not saved yet. Your edits stay in this tab until you save.'}
      </p>
      <label className="block space-y-2 text-sm">
        <ControlLabel
          label="Composition preset"
          help="Loads a curated starting composition, including its name, seed, style, and appearance. It replaces custom layers; Undo can restore your previous edits."
        />
        <select
          aria-label="Composition preset"
          className={selectClass}
          value={presetId}
          onChange={(event) => applyPreset(event.target.value)}
        >
          <option value="" disabled>
            Custom composition
          </option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Presets replace the composition, seed, and appearance. Undo can restore
        your edits.
      </p>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setSeed(`mandala-${crypto.randomUUID().slice(0, 8)}`)}
      >
        <Shuffle /> Randomize seed
      </Button>
      <label className="block space-y-2 text-sm">
        <ControlLabel
          label="Recent seeds"
          help="Reuses one of the last 12 successfully generated seeds in this tab. Only the seed changes, not your other settings. This history is cleared on refresh."
        />
        <select
          aria-label="Recent seeds"
          className={selectClass}
          value=""
          disabled={!seedHistory.length}
          onChange={(event) => setSeed(event.target.value)}
        >
          <option value="" disabled>
            {seedHistory.length ? 'Reuse a seed' : 'Generate a design first'}
          </option>
          {seedHistory.map((seed) => (
            <option key={seed} value={seed}>
              {seed}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
