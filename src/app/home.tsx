import { ArrowRight, Flower2, LockKeyhole, Shuffle, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { FoundationPanel } from './foundation-panel';
import { MandalaIllustration } from './mandala-illustration';

export function Home() {
  return (
    <main
      id="main-content"
      className="mx-auto max-w-340 px-6 py-10 lg:px-10 lg:py-14"
    >
      <section className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Badge variant="outline" className="mb-6 gap-2 py-1 text-xs">
            <span className="size-1.5 rounded-full bg-primary" />A browser-only
            creative playground
          </Badge>
          <h1 className="max-w-2xl text-5xl leading-[1.08] font-semibold tracking-[-0.04em] lg:text-7xl">
            Hello <span className="block text-primary">Procedural Chaos</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            A little structure. A little randomness. Create intricate mandalas,
            then turn artwork into satisfying coloring videos.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Two independent studios. One place to experiment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="h-11 px-5">
              <Link to="/mandala">
                Explore Mandala Studio <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-5">
              <Link to="/video">
                <Video /> Explore Video Studio
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <LockKeyhole className="size-3.5" /> All on your device
            </span>
            <span className="flex items-center gap-2">
              <Shuffle className="size-3.5" /> Repeatable by seed
            </span>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40">
          <div className="canvas-grid absolute inset-0 opacity-50" />
          <div className="absolute inset-12 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative flex items-center justify-center p-6 lg:p-9">
            <MandalaIllustration className="w-full max-w-100 text-primary" />
          </div>
          <div className="relative flex items-center justify-between border-t border-border px-5 py-3 font-mono text-[10px] tracking-wider text-muted-foreground">
            <span>STRUCTURE + REPETITION + POSSIBILITY</span>
            <span>STATIC STUDY / 001</span>
          </div>
        </div>
      </section>

      <section
        aria-label="Choose a studio"
        className="mt-12 grid gap-4 md:grid-cols-2"
      >
        {[
          {
            to: '/mandala',
            icon: Flower2,
            number: '01',
            title: 'Make the pattern',
            text: 'A parametric playground for traditional, geometric, organic, and abstract mandalas.',
            detail: 'Mandala generation starts in Phase 1',
          },
          {
            to: '/video',
            icon: Video,
            number: '02',
            title: 'Bring it to life',
            text: 'Import your own artwork or a generated mandala. Choose colors, motion, and the final reveal.',
            detail: 'Video creation starts in Phase 4',
          },
        ].map(({ to, icon: Icon, number, title, text, detail }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Card className="h-full border border-border bg-card/50 transition-colors group-hover:border-primary/40 group-hover:bg-card">
              <CardContent className="flex gap-4 p-6">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <Icon className="size-5 text-primary" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">{title}</h2>
                    <span className="font-mono text-xs text-muted-foreground">
                      {number}
                    </span>
                  </div>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                  <p className="mt-4 flex items-center gap-2 text-xs text-primary">
                    {detail}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
      <FoundationPanel />
    </main>
  );
}
