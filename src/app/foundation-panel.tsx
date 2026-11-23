import { useEffect, useState } from 'react';
import { Cpu, HardDrive, LoaderCircle, MousePointer2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { seedSchema } from '../shared/schemas';
import { readSetting, saveSetting } from '../shared/storage';
import { runWorkerSample } from '../shared/worker';
import type { WorkerSample } from '../shared/sample';
import type { ShellContext } from './context';

export function FoundationPanel() {
  const { capabilities, storageStatus } = useOutletContext<ShellContext>();
  const [seed, setSeed] = useState('hello-chaos');
  const [sample, setSample] = useState<WorkerSample | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (storageStatus !== 'ready') return;
    let active = true;
    readSetting('foundation-seed')
      .then((saved) => {
        if (saved === undefined) return;
        const validated = seedSchema.parse(saved);
        if (active) setSeed(validated);
      })
      .catch((error: unknown) => {
        console.error('Could not restore the foundation seed.', error);
        if (active) toast.error('Could not restore the saved test seed.');
      });
    return () => {
      active = false;
    };
  }, [storageStatus]);

  async function runSample() {
    setBusy(true);
    setErrorMessage(null);
    try {
      setSample(await runWorkerSample(seed));
    } catch (error) {
      console.error('Foundation worker test failed.', error);
      const message =
        error instanceof Error ? error.message : 'The worker test failed.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSeed() {
    setSaving(true);
    try {
      await saveSetting('foundation-seed', seedSchema.parse(seed));
      toast.success('Test seed saved on this browser.');
    } catch (error) {
      console.error('Could not save the test seed.', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not save the test seed.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="foundation-heading" className="mt-14">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">THE FIRST BUILDING BLOCKS</p>
          <h2 id="foundation-heading" className="text-xl font-semibold">
            A small test. A solid foundation.
          </h2>
        </div>
        <Badge variant="outline">Live smoke test</Badge>
      </div>
      <Card className="border border-border bg-card/70">
        <CardHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Cpu className="size-4 text-primary" />
            Seeded randomness, running in a worker
          </div>
          <p className="text-sm text-muted-foreground">
            Run the same seed twice. The numbers stay the same; the UI stays
            responsive.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6 px-6 py-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <label className="block space-y-2 text-sm" htmlFor="test-seed">
              <span className="text-muted-foreground">Random seed</span>
              <Input
                id="test-seed"
                value={seed}
                onChange={(event) => setSeed(event.target.value)}
                maxLength={128}
                spellCheck={false}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={runSample}
                disabled={busy || !capabilities.workers}
                className="h-9"
              >
                {busy ? <LoaderCircle className="animate-spin" /> : <Cpu />}
                {busy ? 'Running worker...' : 'Run worker test'}
              </Button>
              <Button
                variant="outline"
                onClick={saveSeed}
                disabled={saving || storageStatus !== 'ready'}
                className="h-9"
              >
                {saving ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <HardDrive />
                )}
                Save seed locally
              </Button>
            </div>
            {errorMessage && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage}
              </p>
            )}
          </div>
          <div className="flex flex-col justify-between gap-4">
            <output aria-live="polite" className="block">
              <p className="mb-2 text-xs text-muted-foreground">
                {sample
                  ? `Result for "${sample.seed}"`
                  : 'Six deterministic values will appear here'}
              </p>
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <span
                    key={index}
                    className="flex h-12 items-center justify-center rounded-lg border border-border bg-background font-mono text-sm tabular-nums text-primary"
                  >
                    {sample ? sample.values[index] : '\u2014'}
                  </span>
                ))}
              </div>
            </output>
            <Button
              variant="ghost"
              className="justify-start px-0 text-muted-foreground"
              onClick={() => setClicks((count) => count + 1)}
            >
              <MousePointer2 /> Test interaction: {clicks}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
