export function getBrowserCapabilities() {
  return {
    workers: typeof Worker !== 'undefined',
    localStorage: typeof indexedDB !== 'undefined',
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    videoEncoder: 'VideoEncoder' in globalThis,
    secureContext: globalThis.isSecureContext,
  };
}
