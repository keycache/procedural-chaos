import { Download, Flower2, Pause, Play, Save, Video } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { Preview } from './preview';

type StudioProps = {
  kind: 'mandala' | 'video';
  seed: string;
  setSeed: (seed: string) => void;
};

export function StudioPlaceholder({ kind, seed, setSeed }: StudioProps) {
  const isVideo = kind === 'video';
  const title = isVideo ? 'Video Studio' : 'Mandala Studio';
  const Icon = isVideo ? Video : Flower2;
  const sections = isVideo
    ? [
        'Import & regions',
        'Coloring strategy',
        'Palette & symmetry',
        'Animation & reveal',
        'Timing & export',
      ]
    : [
        'Style & structure',
        'Symmetry & distribution',
        'Motifs & layers',
        'Appearance',
      ];

  return (
    <main id="main-content" className="mx-auto max-w-360 px-6 py-8 lg:px-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Icon className="size-4 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <Badge variant="outline">Foundation preview</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {isVideo
              ? 'Your artwork. Your coloring recipe. Your reveal.'
              : 'Start with a seed. Shape the possibilities.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled
            title="Project saving arrives with the studio editor."
          >
            <Save /> Save project
          </Button>
          <Button disabled title="Export is not implemented in Phase 0.">
            <Download /> {isVideo ? 'Export video' : 'Export artwork'}
          </Button>
        </div>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[260px_1fr]">
        <aside
          aria-label={`${title} settings`}
          className="overflow-hidden rounded-xl border border-border bg-card/50"
        >
          <div className="p-5">
            <p className="eyebrow mb-3">WORKSPACE</p>
            <label className="block space-y-2 text-sm" htmlFor={`${kind}-seed`}>
              <span>Random seed</span>
              <Input
                id={`${kind}-seed`}
                value={seed}
                maxLength={128}
                onChange={(event) => setSeed(event.target.value)}
                spellCheck={false}
              />
            </label>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Seed state is independent in each studio. Generation is coming in
              a later phase.
            </p>
          </div>
          <Separator />
          {sections.map((section, index) => (
            <details
              key={section}
              className="border-b border-border last:border-0"
              open={index === 0}
            >
              <summary className="cursor-pointer px-5 py-4 text-sm font-medium">
                {section}
              </summary>
              <div className="px-5 pb-4 text-xs leading-relaxed text-muted-foreground">
                {isVideo && index === 0
                  ? 'SVG, PNG, JPG, and WebP import with region correction arrives in Phase 4.'
                  : !isVideo && index === 0
                    ? 'Traditional, geometric, organic, abstract, and hybrid styles arrive in Phases 1-3.'
                    : 'These controls will become available as the engine is built.'}
              </div>
            </details>
          ))}
        </aside>
        <div className="space-y-4">
          <Preview />
          {isVideo ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/50 p-4">
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  disabled
                  aria-label="Play preview"
                  title="Playback arrives in Phase 7."
                >
                  <Play />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled
                  aria-label="Pause preview"
                >
                  <Pause />
                </Button>
                <span className="font-mono text-xs text-muted-foreground">
                  00:00 / 00:00
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                1080 x 1080 / 30 fps / MP4
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Drag to pan, use the buttons to zoom. This illustration is a
              static UI study, not generated output.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
