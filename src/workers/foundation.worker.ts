import { expose } from 'comlink';
import { createSeededSample } from '../shared/sample';
import type { FoundationWorker } from '../shared/sample';

const api: FoundationWorker = { sample: createSeededSample };
expose(api);
