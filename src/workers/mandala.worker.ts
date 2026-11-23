import { expose } from 'comlink';
import { createMandalaPreview } from '../engines/mandala/render';
import { errorMessage } from '../shared/errors';

expose({
  render(input: unknown) {
    try {
      return createMandalaPreview(input);
    } catch (error) {
      throw new Error(errorMessage(error), { cause: error });
    }
  },
});
