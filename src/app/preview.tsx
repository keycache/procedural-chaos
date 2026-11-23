import { useRef, useState, type ReactNode } from 'react';
import { Maximize, Minus, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { clamp, type Point } from '../shared/geometry';
import { MandalaIllustration } from './mandala-illustration';

export function Preview({
  children,
  label = 'STATIC PREVIEW / NOT GENERATED',
}: {
  children?: ReactNode;
  label?: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const drag = useRef<Point | null>(null);

  return (
    <section
      aria-label="Artwork preview"
      className={`flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card/30 ${children ? '' : 'min-h-120'}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">
          Preview canvas
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Zoom out"
            onClick={() => setZoom((value) => clamp(value - 0.25, 0.5, 2))}
          >
            <Minus />
          </Button>
          <span className="w-10 text-center font-mono text-xs tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Zoom in"
            onClick={() => setZoom((value) => clamp(value + 0.25, 0.5, 2))}
          >
            <Plus />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Reset view"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            <Maximize />
          </Button>
        </div>
      </div>
      <div
        className={`canvas-grid relative flex touch-none items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing ${
          children
            ? 'h-[min(80vw,32rem)] [container-type:size] lg:h-[calc(100dvh-16rem)] lg:min-h-64'
            : 'min-h-110 flex-1'
        }`}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            x: event.clientX - offset.x,
            y: event.clientY - offset.y,
          };
        }}
        onPointerMove={(event) => {
          if (drag.current)
            setOffset({
              x: event.clientX - drag.current.x,
              y: event.clientY - drag.current.y,
            });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div
          className={`shrink-0 text-primary/70 ${
            children
              ? 'w-[min(calc(100cqw-2rem),calc(100cqh-2rem))]'
              : 'w-80 max-w-[80%]'
          }`}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          }}
        >
          {children ?? <MandalaIllustration className="w-full" />}
        </div>
        <span className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-border bg-background/90 px-3 py-2 font-mono text-[10px] tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
    </section>
  );
}
