import { Info } from 'lucide-react';
import { Tooltip } from 'radix-ui';

export function ControlLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span
              role="img"
              tabIndex={0}
              aria-label={`About ${label}`}
              className="inline-flex shrink-0 cursor-help rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              onClick={(event) => event.preventDefault()}
            >
              <Info className="size-3.5" aria-hidden="true" />
            </span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="top"
              sideOffset={8}
              collisionPadding={16}
              className="z-50 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover p-3 text-xs leading-relaxed text-popover-foreground shadow-lg"
            >
              {help}
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </span>
  );
}
