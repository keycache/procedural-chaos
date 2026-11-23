import type { getBrowserCapabilities } from '../shared/capabilities';

export type ShellContext = {
  capabilities: ReturnType<typeof getBrowserCapabilities>;
  storageStatus: 'loading' | 'ready' | 'unavailable';
};
