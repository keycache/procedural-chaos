import { StudioPlaceholder } from '../../app/studio-placeholder';
import { useVideoStore } from './store';

export function VideoStudio() {
  const seed = useVideoStore((state) => state.seed);
  const setSeed = useVideoStore((state) => state.setSeed);
  return <StudioPlaceholder kind="video" seed={seed} setSeed={setSeed} />;
}
