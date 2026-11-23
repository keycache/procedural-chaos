import { Shuffle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { presets } from './editor';
import { selectClass } from './style-controls';
import { useMandalaStore } from './store';

export function WorkspaceControls() {
  const { name, setName, setSeed, seedHistory, applyPreset, projectId } =
    useMandalaStore();
  return (
    <div className="space-y-4 border-b border-border p-5">
      <label className="block space-y-2 text-sm">
        <span>Project name</span>
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
        <span>Composition preset</span>
        <select
          aria-label="Composition preset"
          className={selectClass}
          value=""
          onChange={(event) => applyPreset(event.target.value)}
        >
          <option value="" disabled>
            Choose a starting point
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
        <span>Recent seeds</span>
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
