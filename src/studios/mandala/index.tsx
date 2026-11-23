import { StudioPlaceholder } from '../../app/studio-placeholder';
import { useMandalaStore } from './store';

export function MandalaStudio() {
  const seed = useMandalaStore((state) => state.seed);
  const setSeed = useMandalaStore((state) => state.setSeed);
  return <StudioPlaceholder kind="mandala" seed={seed} setSeed={setSeed} />;
}
